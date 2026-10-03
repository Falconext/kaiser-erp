/**
 * QA funcional · Fase 5 — Ciclo comercial
 *
 * Cotización, nota de pedido, nota de venta, su PDF, la moneda extranjera y la
 * máquina de estados del pedido.
 *
 * La invariante central de la fase es cuándo se toca el inventario. Está escrita
 * en el código y aquí se comprueba que se cumple:
 *   · COT (cotización): NUNCA descuenta. Es una propuesta, no una venta.
 *   · NP (nota de pedido): no descuenta salvo que se marque expresamente.
 *   · NV y el resto de informales: descuentan siempre.
 * Cotizar mercadería y verla desaparecer del almacén sería un desastre, y al
 * revés —vender sin descontar— también.
 *
 * No se emite nada a SUNAT: todo va por el camino informal.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const S = (n) => `S/ ${Number(n).toFixed(2)}`;

async function api(ruta, { token, ...init } = {}) {
  const r = await fetch(API + ruta, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const t = await r.text();
  let j = {}; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 160) }; }
  return { status: r.status, body: j, data: j?.data };
}
async function login(email = 'gerencia@kaisercorp.com.pe') {
  const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'kaiser123' }) });
  if (r.status >= 400 || !r.data) throw new Error(`login de ${email} falló (HTTP ${r.status}): ${r.body?.message ?? ''}`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const sel = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  if (sel.status >= 400 || !sel.data?.accessToken) throw new Error(`select-sede falló (HTTP ${sel.status}): ${sel.body?.message ?? ''}`);
  return sel.data.accessToken;
}
const stock = async (productoId) => {
  const ps = await prisma.productoStock.findFirst({ where: { productoId, sedeId: SEDE }, select: { stock: true } });
  return ps ? Number(ps.stock) : 0;
};

async function main() {
  const token = await login();
  const N = Date.now().toString().slice(-8);
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true } });
  const creado = { comprobantes: [], productos: [], autorizadores: [] };

  const prod = await prisma.producto.create({
    data: { codigo: `QCM${N}`, descripcion: '[QA-F5] producto', precioUnitario: 118, valorUnitario: 100,
      stock: 100, costoPromedio: 60, empresaId: ref.empresaId, unidadMedidaId: ref.unidadMedidaId,
      tipoAfectacionIGV: '10', factorConversion: 1 } });
  await prisma.productoStock.create({ data: { productoId: prod.id, sedeId: SEDE, stock: 100 } });
  creado.productos.push(prod.id);

  const doc = (tipoDoc, extra = {}) => ({
    sedeId: SEDE, tipoOperacionId: 1, tipoDoc, fechaEmision: new Date().toISOString(),
    formaPagoTipo: 'Contado', formaPagoMoneda: 'PEN', tipoMoneda: 'PEN',
    clienteId: 1, clienteName: 'VARIOS', leyenda: `[QA-F5] ${tipoDoc}`, medioPago: 'EFECTIVO',
    detalles: [{ productoId: prod.id, cantidad: 10, nuevoValorUnitario: 100 }],
    ...extra,
  });
  const crear = async (tipoDoc, extra) => {
    const r = await api('/comprobante/informal', { token, method: 'POST', body: JSON.stringify(doc(tipoDoc, extra)) });
    if (r.data?.id) creado.comprobantes.push(r.data.id);
    return r;
  };
  const movimientosDe = (id) => prisma.movimientoKardex.count({ where: { comprobanteId: id } });

  try {
    // ── 1. Cuándo se toca el inventario ───────────────────────────────────
    console.log('1) Qué documentos mueven el almacén y cuáles no');
    let antes = await stock(prod.id);
    const cot = await crear('COT');
    ok(cot.status < 300, `cotización creada (HTTP ${cot.status})`);
    ok(await stock(prod.id) === antes, `la cotización NO descuenta stock (sigue en ${antes})`);
    ok(await movimientosDe(cot.data?.id) === 0, 'y no deja movimiento de kardex');

    const np = await crear('NP');
    ok(np.status < 300, `nota de pedido creada (HTTP ${np.status})`);
    ok(await stock(prod.id) === antes, `la nota de pedido tampoco descuenta por defecto (${antes})`);

    const npDesc = await crear('NP', { descontarStock: true });
    ok(npDesc.status < 300, `nota de pedido con "descontar ahora" (HTTP ${npDesc.status})`);
    ok(await stock(prod.id) === antes - 10, `esa SÍ descuenta: ${antes} → ${await stock(prod.id)}`);

    antes = await stock(prod.id);
    const nv = await crear('NV');
    ok(nv.status < 300, `nota de venta creada (HTTP ${nv.status})`);
    ok(await stock(prod.id) === antes - 10, `la nota de venta descuenta: ${antes} → ${await stock(prod.id)}`);
    ok(await movimientosDe(nv.data?.id) === 1, 'con un movimiento de kardex asociado');

    // ── 2. Moneda extranjera ──────────────────────────────────────────────
    console.log('\n2) Moneda extranjera');
    // La cotización lleva su moneda en `cotizMoneda`, que es de presentación: cambia
    // el símbolo del PDF y no convierte nada. Es el campo que usa la pantalla.
    const TC = 3.78;
    const cotUsd = await crear('COT', { cotizMoneda: 'USD' });
    ok(cotUsd.status < 300, `cotización en dólares creada (HTTP ${cotUsd.status})`);
    const guardada = await prisma.comprobante.findUnique({ where: { id: cotUsd.data?.id },
      select: { cotizMoneda: true, mtoImpVenta: true } });
    ok(guardada?.cotizMoneda === 'USD', `queda marcada en ${guardada?.cotizMoneda}`);
    ok(Number(guardada?.mtoImpVenta) > 0, `con su importe ${Number(guardada?.mtoImpVenta).toFixed(2)}`);

    // El comprobante formal sí convierte, y ahí el tipo de cambio es obligatorio:
    // guardarlo como 1 sería decir que un dólar vale un sol. SUNAT lo exige en el
    // XML, y cualquier reporte en soles quedaría corrido casi cuatro veces.
    const formalSinTc = await api('/comprobante/boleta', { token, method: 'POST',
      body: JSON.stringify({ ...doc('03'), tipoMoneda: 'USD', formaPagoMoneda: 'USD' }) });
    ok(formalSinTc.status === 400,
      `un comprobante formal en dólares SIN tipo de cambio se rechaza (HTTP ${formalSinTc.status})`);
    ok(/tipo de cambio/i.test(String(formalSinTc.body?.message)),
      `y el mensaje lo explica: "${String(formalSinTc.body?.message).slice(0, 78)}"`);
    if (formalSinTc.data?.id) creado.comprobantes.push(formalSinTc.data.id);
    const formalTcUno = await api('/comprobante/boleta', { token, method: 'POST',
      body: JSON.stringify({ ...doc('03'), tipoMoneda: 'USD', formaPagoMoneda: 'USD', tipoCambio: 1 }) });
    ok(formalTcUno.status === 400, `y con tipo de cambio 1 también (HTTP ${formalTcUno.status})`);
    if (formalTcUno.data?.id) creado.comprobantes.push(formalTcUno.data.id);
    // Y en soles, claro, no hace falta ningún tipo de cambio.
    const cotPen = await crear('NV');
    ok(cotPen.status < 300, `en soles no se pide tipo de cambio (HTTP ${cotPen.status})`);

    // ── 3. PDF ────────────────────────────────────────────────────────────
    console.log('\n3) PDF de la cotización');
    const pdf = await api(`/comprobante/${cot.data?.id}/generar-pdf`, { token, method: 'POST', body: '{}' });
    ok(pdf.status < 300, `se genera (HTTP ${pdf.status})`);
    const url = pdf.data?.pdfUrl;
    ok(typeof url === 'string' && url.endsWith('.pdf'), `sube el PDF y devuelve su URL: …${String(url).slice(-34)}`);
    // No basta con que devuelva una URL: el fichero tiene que estar ahí y ser un PDF.
    if (url) {
      const bajado = await fetch(url);
      const bytes = await bajado.arrayBuffer();
      const cabecera = Buffer.from(bytes.slice(0, 5)).toString('latin1');
      ok(bajado.status === 200, `el fichero se descarga (HTTP ${bajado.status})`);
      ok(cabecera.startsWith('%PDF-'), `y es un PDF de verdad (${bytes.byteLength} bytes, cabecera "${cabecera}")`);
    }

    // ── 4. La máquina de estados del pedido ───────────────────────────────
    console.log('\n4) Estados del pedido: lo que no debe poder saltarse');
    const aut = await api('/flujo-comercial/autorizadores', { token, method: 'POST',
      body: JSON.stringify({ nombre: `[QA-F5] Autorizador ${N}`, email: `qa${N}@kaisercorp.com.pe` }) });
    ok(aut.status < 300, `autorizador registrado (HTTP ${aut.status})`);
    if (aut.data?.id) creado.autorizadores.push(aut.data.id);

    // Un pedido nuevo para recorrer los estados.
    const ped = await crear('NP');
    const pedId = ped.data?.id;
    const estado = async () => (await prisma.comprobante.findUnique({ where: { id: pedId }, select: { estadoPedido: true } }))?.estadoPedido;
    ok(await estado() === 'PENDIENTE', `nace en ${await estado()}`);

    // PENDIENTE solo admite AUTORIZADO o ANULADO: entregar o facturar debe fallar.
    const entregarAntes = await api(`/flujo-comercial/pedidos/${pedId}/entregar`, { token, method: 'POST', body: '{}' });
    ok(entregarAntes.status === 400, `no se puede entregar sin autorizar (HTTP ${entregarAntes.status})`);
    const facturarAntes = await api(`/flujo-comercial/pedidos/${pedId}/facturar`, { token, method: 'POST', body: '{}' });
    ok(facturarAntes.status === 400, `ni facturar sin autorizar (HTTP ${facturarAntes.status})`);
    ok(await estado() === 'PENDIENTE', 'y el pedido sigue pendiente tras los rechazos');

    const autInexistente = await api(`/flujo-comercial/pedidos/${pedId}/autorizar`, { token, method: 'POST',
      body: JSON.stringify({ autorizadoPorId: 999999 }) });
    ok(autInexistente.status >= 400, `autorizar con un autorizador que no existe se rechaza (HTTP ${autInexistente.status})`);

    const autorizar = await api(`/flujo-comercial/pedidos/${pedId}/autorizar`, { token, method: 'POST',
      body: JSON.stringify({ autorizadoPorId: creado.autorizadores[0] }) });
    ok(autorizar.status < 300, `autorizado (HTTP ${autorizar.status})`);
    ok(await estado() === 'AUTORIZADO', `queda en ${await estado()}`);
    const reAutorizar = await api(`/flujo-comercial/pedidos/${pedId}/autorizar`, { token, method: 'POST',
      body: JSON.stringify({ autorizadoPorId: creado.autorizadores[0] }) });
    ok(reAutorizar.status === 400, `autorizar dos veces se rechaza (HTTP ${reAutorizar.status})`);

    const entregar = await api(`/flujo-comercial/pedidos/${pedId}/entregar`, { token, method: 'POST', body: '{}' });
    ok(entregar.status < 300 && await estado() === 'ENTREGADO', `entregado (HTTP ${entregar.status}, ${await estado()})`);
    const facturar = await api(`/flujo-comercial/pedidos/${pedId}/facturar`, { token, method: 'POST', body: '{}' });
    ok(facturar.status < 300 && await estado() === 'FACTURADO', `facturado (HTTP ${facturar.status}, ${await estado()})`);

    // FACTURADO es terminal: nada más debe entrar.
    for (const accion of ['autorizar', 'entregar', 'facturar', 'anular']) {
      const r = await api(`/flujo-comercial/pedidos/${pedId}/${accion}`, { token, method: 'POST',
        body: JSON.stringify({ autorizadoPorId: creado.autorizadores[0] }) });
      ok(r.status === 400, `facturado → ${accion} se rechaza (HTTP ${r.status})`);
    }
    ok(await estado() === 'FACTURADO', 'y sigue facturado');

    // ── La cotización se cierra sola al convertirla ───────────────────────
    console.log('\n4b) La cotización que origina una venta se cierra sola');
    const estadoDe = async (id) => (await prisma.comprobante.findUnique({
      where: { id }, select: { estadoPedido: true } }))?.estadoPedido;
    const ganadasDe = (id) => prisma.seguimientoCotizacion.count({
      where: { comprobanteId: id, tipo: 'GANADA' } });

    const cotAbierta = await crear('COT');
    ok(await estadoDe(cotAbierta.data.id) === 'PENDIENTE',
      `nace en PENDIENTE (${await estadoDe(cotAbierta.data.id)})`);

    const venta = await crear('NV', { comprobanteOrigenId: cotAbierta.data.id });
    ok(venta.status < 300, `convertida a nota de venta (HTTP ${venta.status})`);
    ok(venta.data?.comprobanteOrigenId === cotAbierta.data.id,
      'la venta guarda el enlace con su cotización');
    ok(await estadoDe(cotAbierta.data.id) === 'FACTURADO',
      `y la cotización pasa sola a FACTURADO (${await estadoDe(cotAbierta.data.id)}) — sin que nadie lo marque`);
    ok(await ganadasDe(cotAbierta.data.id) === 1,
      'con una sola entrada GANADA en su bitácora');

    // Convertirla otra vez no duplica la bitácora.
    await crear('NV', { comprobanteOrigenId: cotAbierta.data.id });
    ok(await ganadasDe(cotAbierta.data.id) === 1,
      'una segunda conversión no vuelve a anotarla');

    // Una cotización anulada no se resucita.
    const cotAnulada = await crear('COT');
    await prisma.comprobante.update({
      where: { id: cotAnulada.data.id }, data: { estadoPedido: 'ANULADO' } });
    await crear('NV', { comprobanteOrigenId: cotAnulada.data.id });
    ok(await estadoDe(cotAnulada.data.id) === 'ANULADO',
      `una cotización anulada sigue anulada (${await estadoDe(cotAnulada.data.id)})`);
    ok(await ganadasDe(cotAnulada.data.id) === 0, 'y no se le anota nada');

    // Un origen que NO es cotización no toca ningún estado de pedido.
    const nvOrigen = await crear('NV');
    const facturaDeNv = await crear('NV', { comprobanteOrigenId: nvOrigen.data.id });
    ok(facturaDeNv.status < 300, 'convertir desde una nota de venta sigue funcionando');
    ok(await ganadasDe(nvOrigen.data.id) === 0,
      'y no escribe bitácora de cotización en un documento que no lo es');

    // Un pedido anulado también es terminal.
    const ped2 = await crear('NP');
    const anular = await api(`/flujo-comercial/pedidos/${ped2.data?.id}/anular`, { token, method: 'POST', body: '{}' });
    ok(anular.status < 300, `un pedido pendiente se puede anular (HTTP ${anular.status})`);
    const tras = await api(`/flujo-comercial/pedidos/${ped2.data?.id}/autorizar`, { token, method: 'POST',
      body: JSON.stringify({ autorizadoPorId: creado.autorizadores[0] }) });
    ok(tras.status === 400, `y luego no se puede autorizar (HTTP ${tras.status})`);
  } finally {
    console.log('\n5) Limpieza');
    // Dos pasadas: PRIMERO todo lo que cuelga de cada comprobante, DESPUÉS los
    // comprobantes. Antes se hacía documento a documento y bastaba con que uno
    // apuntara a otro (una venta convertida desde su cotización) para que el
    // borrado del primero chocara con los detalles del segundo, que todavía
    // existían. Y el enlace se deshace en vez de borrar al derivado: el derivado
    // ya está en esta misma lista.
    for (const id of creado.comprobantes) {
      await prisma.movimientoKardex.deleteMany({ where: { comprobanteId: id } });
      await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: id } });
      await prisma.leyenda.deleteMany({ where: { comprobanteId: id } });
      await prisma.seguimientoCotizacion.deleteMany({ where: { comprobanteId: id } });
      await prisma.comprobante.updateMany({
        where: { comprobanteOrigenId: id }, data: { comprobanteOrigenId: null } });
    }
    for (const id of creado.comprobantes) {
      await prisma.comprobante.deleteMany({ where: { id } });
    }
    for (const id of creado.autorizadores) await prisma.autorizadorPedido.deleteMany({ where: { id } });
    for (const id of creado.productos) {
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoLote.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.deleteMany({ where: { id } });
    }
    const quedan = await prisma.comprobante.count({ where: { leyendas: { some: { descripcion: { contains: '[QA-F5]' } } } } }).catch(() => 0);
    ok(quedan === 0, `sin comprobantes de prueba sueltos (${quedan})`);
    await prisma.$disconnect();
  }

  console.log(fallos === 0 ? '\n✔ FASE 5 COMPLETA: todo correcto' : `\n✘ FASE 5: ${fallos} comprobaciones fallidas`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
