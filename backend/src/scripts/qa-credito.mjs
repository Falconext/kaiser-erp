/**
 * QA funcional · Límite de crédito por cliente
 *
 * Es el hueco 1 frente a STARSOFT: ellos lo enseñaron funcionando y aquí no
 * existía ni el campo. Lo que se comprueba:
 *
 *   · sin límite puesto (NULL, que es lo que tienen todos los clientes de hoy)
 *     no pasa absolutamente nada — el control es opt-in y no puede empezar a
 *     rechazar ventas el día del despliegue
 *   · la deuda que calcula sale del `saldo` de los comprobantes, la misma fuente
 *     que cuentas por cobrar: si divergiera, el vendedor vería una deuda y el
 *     contador otra
 *   · una FACTURA al crédito que se pasa del límite se BLOQUEA, y el mensaje dice
 *     cuánto se pasa, no un "no se puede"
 *   · con `autorizarExcesoCredito` sí entra, y queda escrito en el documento
 *     cuánto debía y cuál era el límite ese día
 *   · un PEDIDO que se pasa NO se bloquea: se guarda marcado y en PENDIENTE,
 *     esperando el V°B° que ya existía
 *   · una COTIZACIÓN nunca se frena — cotizar no compromete crédito
 *   · un límite de CERO es un límite ("a este no se le vende al crédito"), no
 *     un "sin límite"
 *   · al contado no se mira el crédito
 *
 * Crea su cliente y sus documentos, y los borra al terminar.
 *
 * Uso:  pnpm run qa:credito
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const SEDE = 1;
const MARCA = '[QA-CREDITO]';
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const S = (n) => `S/ ${Number(n).toFixed(2)}`;
const cerca = (a, b, tol = 0.02) => Math.abs(Number(a) - Number(b)) <= tol;

async function login(email = 'gerencia@kaisercorp.com.pe') {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'kaiser123' }) });
  const j = await r.json();
  if (!j.data) throw new Error(`login falló: ${j?.message}`);
  if (!j.data.requiresSedeSelection) return j.data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
    body: JSON.stringify({ sedeId: SEDE }) });
  return (await r2.json()).data.accessToken;
}
async function api(ruta, token, metodo = 'GET', body) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j?.data, message: j?.message };
}

const creado = { comprobantes: [], clienteId: null };

async function limpiar() {
  // Por CLIENTE, no por la lista que fue apuntando el script: si una petición
  // creó un documento y devolvió otra forma de respuesta, ese id no está en la
  // lista y el cliente se queda sin poder borrarse (clave ajena). El cliente es
  // exclusivo de esta prueba, así que todo lo suyo es residuo.
  if (creado.clienteId) {
    const ids = (
      await prisma.comprobante.findMany({
        where: { clienteId: creado.clienteId },
        select: { id: true },
      })
    ).map((c) => c.id);
    // Devolver al stock lo que estas ventas descontaron, antes de borrar el
    // kardex: sin esto cada pasada del QA dejaría el inventario más bajo.
    const movs = await prisma.movimientoKardex.findMany({
      where: { comprobanteId: { in: ids } },
      select: { productoId: true, sedeId: true, cantidad: true, tipoMovimiento: true },
    });
    for (const m of movs) {
      if (!m.sedeId) continue;
      const signo = m.tipoMovimiento === 'SALIDA' ? 1 : -1;
      await prisma.productoStock.updateMany({
        where: { productoId: m.productoId, sedeId: m.sedeId },
        data: { stock: { increment: signo * Number(m.cantidad) } },
      });
      await prisma.producto.update({
        where: { id: m.productoId },
        data: { stock: { increment: signo * Number(m.cantidad) } },
      });
    }
    await prisma.movimientoKardex.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.comisionVendedor.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.pago.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.leyenda.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.comprobante.deleteMany({ where: { id: { in: ids } } });
    await prisma.cliente.deleteMany({ where: { id: creado.clienteId } });
  }
}

async function main() {
  console.log(`\nQA · Límite de crédito por cliente\n${'═'.repeat(50)}`);
  const token = await login();
  const empresa = await prisma.empresa.findFirst();

  const prod = await prisma.producto.findFirst({
    where: { empresaId: empresa.id, precioUnitario: { gt: 0 }, stock: { gt: 200 } },
    orderBy: { stock: 'desc' },
    select: { id: true, codigo: true, precioUnitario: true },
  });
  if (!prod) throw new Error('no hay producto con stock y precio para la prueba');

  // Un cliente propio, sin límite: el estado de partida de todos.
  const cli = await api('/clientes', token, 'POST', {
    nombre: `${MARCA} CONSTRUCTORA DE PRUEBA S.A.C.`,
    tipoDoc: 'RUC', nroDoc: '20777000111',
    persona: 'CLIENTE',
    ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA',
    direccion: 'Av. de Prueba 100',
  });
  ok(cli.status < 300, `cliente de prueba creado (HTTP ${cli.status})`);
  creado.clienteId = cli.data?.id;
  if (!creado.clienteId) throw new Error('sin cliente no se puede seguir');

  // El valor unitario va SIN IGV, que es lo que pide el DTO de detalles.
  const valorUnit = Math.round((Number(prod.precioUnitario) / 1.18) * 100) / 100;
  const venta = (cant) => ({
    sedeId: SEDE, tipoOperacionId: 1, fechaEmision: new Date().toISOString(),
    formaPagoTipo: 'Credito', formaPagoMoneda: 'PEN', tipoMoneda: 'PEN',
    clienteId: creado.clienteId, clienteName: `${MARCA} CONSTRUCTORA DE PRUEBA S.A.C.`,
    leyenda: MARCA, medioPago: 'TRANSFERENCIA',
    detalles: [{ productoId: prod.id, cantidad: cant, nuevoValorUnitario: valorUnit }],
  });

  // ── 1. Sin límite, nada cambia ────────────────────────────────────────────
  console.log('\n1) Sin límite puesto (NULL), el control no existe');
  const est0 = await api(`/clientes/${creado.clienteId}/credito`, token);
  ok(est0.status === 200, `el panel de crédito responde (HTTP ${est0.status})`);
  ok(est0.data?.limiteCredito === null, 'el límite nace en NULL');
  ok(est0.data?.disponible === null, 'y sin límite no hay "disponible" que calcular');
  ok(est0.data?.deuda === 0, `la deuda arranca en cero (${S(est0.data?.deuda ?? -1)})`);

  const ev0 = await api(`/clientes/${creado.clienteId}/credito/evaluar?importe=999999`, token);
  ok(ev0.data?.aplica === false, 'evaluar un millón sin límite: no aplica');
  ok(ev0.data?.excede === false, 'y no excede nada');

  const v1 = await api('/comprobante/informal', token, 'POST', { ...venta(3), tipoDoc: 'NV' });
  ok(v1.status < 300, `una venta al crédito sin límite entra (HTTP ${v1.status})`);
  if (v1.data?.id) creado.comprobantes.push(v1.data.id);
  const deudaV1 = Number(v1.data?.mtoImpVenta ?? 0);

  // ── 2. La deuda sale del saldo de los comprobantes ────────────────────────
  console.log('\n2) La deuda es el saldo de sus comprobantes, no otra cuenta');
  const est1 = await api(`/clientes/${creado.clienteId}/credito`, token);
  ok(cerca(est1.data?.deuda, deudaV1), `la deuda es la venta al crédito (${S(est1.data?.deuda)} vs ${S(deudaV1)})`);
  const suma = (est1.data?.documentos ?? []).reduce((a, d) => a + d.saldo, 0);
  ok(cerca(suma, est1.data?.deuda), `los documentos del detalle suman el total (${S(suma)})`);

  // ── 3. Un límite por debajo de la deuda ───────────────────────────────────
  console.log('\n3) Se le pone un límite POR DEBAJO de lo que ya debe');
  const limite = Math.floor(deudaV1 * 0.5);
  const up = await api(`/clientes/${creado.clienteId}`, token, 'PUT', { limiteCredito: limite, diasCredito: 30 });
  ok(up.status < 300, `límite de ${S(limite)} guardado (HTTP ${up.status})`);
  const est2 = await api(`/clientes/${creado.clienteId}/credito`, token);
  ok(cerca(est2.data?.limiteCredito, limite), `el panel lee el límite (${S(est2.data?.limiteCredito)})`);
  ok(est2.data?.excedido === true, 'y dice que está excedido');
  ok(est2.data?.disponible < 0, `el disponible sale negativo (${S(est2.data?.disponible)})`);

  // ── 4. La factura al crédito se bloquea ───────────────────────────────────
  console.log('\n4) Una FACTURA al crédito por encima del límite se bloquea');
  const f1 = await api('/comprobante/factura', token, 'POST', { ...venta(2), tipoDoc: '01' });
  ok(f1.status === 400, `rechazada (HTTP ${f1.status})`);
  const msg = String(f1.message ?? '');
  ok(/límite de crédito/i.test(msg), 'el mensaje nombra el límite de crédito');
  ok(/por encima del límite/i.test(msg), 'y dice cuánto se pasa, no solo que no se puede');
  console.log(`      «${msg.slice(0, 150)}${msg.length > 150 ? '…' : ''}»`);

  // ── 5. Al contado no se mira el crédito ───────────────────────────────────
  console.log('\n5) Al contado no se mira el crédito (no hay crédito que mirar)');
  const contado = await api('/comprobante/informal', token, 'POST', {
    ...venta(1), tipoDoc: 'NV', formaPagoTipo: 'Contado', medioPago: 'EFECTIVO',
  });
  ok(contado.status < 300, `venta al contado al mismo cliente excedido (HTTP ${contado.status})`);
  if (contado.data?.id) creado.comprobantes.push(contado.data.id);

  // ── 6. La cotización nunca se frena ───────────────────────────────────────
  console.log('\n6) Una COTIZACIÓN nunca se frena: ofertar no compromete crédito');
  const cot = await api('/comprobante/informal', token, 'POST', {
    ...venta(5), tipoDoc: 'COT', cotizTipoPago: 'CREDITO',
  });
  ok(cot.status < 300, `cotización emitida al cliente excedido (HTTP ${cot.status})`);
  if (cot.data?.id) creado.comprobantes.push(cot.data.id);

  // ── 7. El pedido se marca, no se bloquea ──────────────────────────────────
  console.log('\n7) Un PEDIDO por encima del límite se guarda marcado y PENDIENTE');
  const np = await api('/comprobante/informal', token, 'POST', { ...venta(2), tipoDoc: 'NP' });
  ok(np.status < 300, `el pedido entra (HTTP ${np.status})`);
  if (np.data?.id) creado.comprobantes.push(np.data.id);
  if (np.data?.id) {
    const guardado = await prisma.comprobante.findUnique({
      where: { id: np.data.id },
      select: { excedeLimiteCredito: true, estadoPedido: true, deudaAlEmitir: true, limiteAlEmitir: true },
    });
    ok(guardado?.excedeLimiteCredito === true, 'queda marcado como excedido');
    ok(guardado?.estadoPedido === 'PENDIENTE', 'y en PENDIENTE, esperando el V°B°');
    ok(cerca(Number(guardado?.limiteAlEmitir), limite), `guarda el límite de ese día (${S(guardado?.limiteAlEmitir)})`);
    ok(Number(guardado?.deudaAlEmitir) > 0, `y la deuda de ese día (${S(guardado?.deudaAlEmitir)})`);
  }

  const bandeja = await api('/credito/pedidos-retenidos', token);
  ok(bandeja.status === 200, `la bandeja del autorizador responde (HTTP ${bandeja.status})`);
  ok((bandeja.data ?? []).some((p) => p.id === np.data?.id), 'y el pedido retenido aparece en ella');

  // ── 8. La autorización levanta el bloqueo ─────────────────────────────────
  // No se emite la factura A PROPÓSITO: emitirla consumiría un correlativo de la
  // serie real F0A1 de Kaiser, y borrarla después dejaría un hueco de numeración
  // que `qa:series` caza con razón —un número emitido y desaparecido sin
  // explicación es exactamente lo que ese control busca—.
  //
  // Lo que se comprueba es más fino y no ensucia nada: la MISMA petición, con y
  // sin autorización, tiene que fallar por motivos DISTINTOS. Sin autorización
  // muere en el control de crédito; con autorización lo pasa y muere más
  // adelante, en la validación del vencimiento. Si el rechazo cambia de motivo,
  // la autorización funcionó.
  console.log('\n8) La autorización levanta el bloqueo (sin emitir: no se toca la serie)');
  const sinAut = await api('/comprobante/factura', token, 'POST', { ...venta(2), tipoDoc: '01' });
  ok(sinAut.status === 400, `sin autorización: rechazada (HTTP ${sinAut.status})`);
  ok(/límite de crédito/i.test(String(sinAut.message)), 'y muere en el control de crédito');

  const conAut = await api('/comprobante/factura', token, 'POST', {
    ...venta(2), tipoDoc: '01', autorizarExcesoCredito: true,
  });
  ok(conAut.status === 400, `con autorización: también se rechaza (HTTP ${conAut.status})`);
  ok(
    !/límite de crédito/i.test(String(conAut.message)),
    'pero YA NO por el crédito: la autorización pasó el control',
  );
  ok(
    /vencimiento|cuotas/i.test(String(conAut.message)),
    `muere en la siguiente validación, la del vencimiento — «${String(conAut.message).slice(0, 80)}»`,
  );

  // Que el rastro se GUARDE se comprueba en el pedido, que sí se emite (paso 7).

  // ── 9. Cero es un límite ──────────────────────────────────────────────────
  console.log('\n9) Un límite de CERO es un límite, no un "sin límite"');
  await api(`/clientes/${creado.clienteId}`, token, 'PUT', { limiteCredito: 0 });
  const evCero = await api(`/clientes/${creado.clienteId}/credito/evaluar?importe=1`, token);
  ok(evCero.data?.aplica === true, 'con límite 0 el control SÍ aplica');
  ok(evCero.data?.excede === true, 'y un sol ya lo excede');

  // ── 10. Volver a NULL lo desactiva ────────────────────────────────────────
  console.log('\n10) Vaciar el límite lo devuelve a "sin control"');
  await prisma.cliente.update({ where: { id: creado.clienteId }, data: { limiteCredito: null } });
  const evNull = await api(`/clientes/${creado.clienteId}/credito/evaluar?importe=999999`, token);
  ok(evNull.data?.aplica === false, 'sin límite, no aplica');
  const sinLimite = await api('/comprobante/factura', token, 'POST', { ...venta(2), tipoDoc: '01' });
  ok(
    sinLimite.status === 400 && !/límite de crédito/i.test(String(sinLimite.message)),
    'y la factura al crédito ya no tropieza con el crédito',
  );
  const np2 = await api('/comprobante/informal', token, 'POST', { ...venta(2), tipoDoc: 'NP' });
  ok(np2.status < 300, `un pedido al crédito vuelve a entrar sin marca (HTTP ${np2.status})`);
  if (np2.data?.id) {
    creado.comprobantes.push(np2.data.id);
    const g2 = await prisma.comprobante.findUnique({
      where: { id: np2.data.id },
      select: { excedeLimiteCredito: true, limiteAlEmitir: true },
    });
    ok(g2?.excedeLimiteCredito === false, 'sin marca de exceso');
    ok(g2?.limiteAlEmitir === null, 'y sin límite guardado, porque no había');
  }

  // ── 11. Lecturas abiertas ─────────────────────────────────────────────────
  console.log('\n11) Permisos: el vendedor puede consultar el crédito antes de cotizar');
  const tv = await login('ventas@kaisercorp.com.pe');
  const vv = await api(`/clientes/${creado.clienteId}/credito`, tv);
  ok(vv.status === 200, `ventas LEE el crédito (HTTP ${vv.status}): enterarse por un 403 al guardar no es enterarse`);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(fallos ? `✘ CRÉDITO: ${fallos} problema(s)` : '✔ CRÉDITO: todo verde');
}

main()
  .catch((e) => { console.error('\n✘ error:', e.message); fallos++; })
  .finally(async () => {
    await limpiar();
    console.log('   ↺ limpieza: cliente y documentos de prueba borrados');
    await prisma.$disconnect();
    process.exit(fallos ? 1 : 0);
  });
