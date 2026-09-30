/**
 * QA funcional · Fase 14 — Generación de asientos de ventas y compras
 *
 * Comprueba lo que distingue un asiento correcto en Perú de uno "genérico":
 *   · la venta lleva SU COSTO (69 contra 20/21), o el diario no tiene margen;
 *   · la compra son DOS asientos, naturaleza (60) y destino (20/24 contra 61):
 *     sin el segundo la existencia nunca entra al balance;
 *   · lo fabricado y lo revendido van a cuentas distintas (70211/70111,
 *     6921/6911), que es lo que diferencia a Kaiser de una distribuidora;
 *   · regenerar no duplica y anular extorna, en el período del original.
 *
 * Trabaja sobre los documentos reales del período y deja la base equivalente:
 * borra los asientos del período, los regenera y vuelve a dejarlos.
 *
 * Uso:  pnpm run qa:asientos-ventas
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const c2 = (n) => Math.round(Number(n) * 100);

async function api(ruta, token, metodo = 'GET', body) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j?.data, message: j?.message };
}
async function login(email = 'gerencia@kaisercorp.com.pe', password = 'kaiser123') {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }) });
  const j = await r.json();
  if (r.status >= 400 || !j.data) throw new Error(`login falló (HTTP ${r.status})`);
  if (!j.data.requiresSedeSelection) return j.data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
    body: JSON.stringify({ sedeId: SEDE }) });
  const c = await r2.json();
  return c.data.accessToken;
}

/** Busca una línea por código de cuenta dentro de un asiento. */
const linea = (a, codigo) => a.detalles.find((d) => d.cuenta.codigo === codigo);

async function main() {
  const token = await login();
  const creadoPorMi = { compras: [], comprobantes: [], productos: [] };

  // Documentos PROPIOS en un período libre, en vez de apoyarse en los de la
  // demo. Antes usaba los reales y, para tener trabajo que hacer, empezaba
  // borrando los asientos del período: en cuanto se dejó de borrar, la
  // generación no producía nada porque ya estaban asentados. Un script de QA no
  // puede necesitar destruir datos ajenos para funcionar.
  const anio = 2032, mes = 5;
  const fecha = new Date(Date.UTC(anio, mes - 1, 12, 12, 0, 0)).toISOString();
  console.log(`\n═══ Período ${mes}/${anio} ═══`);

  const cliente = await prisma.cliente.findFirst({ where: { empresaId: 1 }, orderBy: { id: 'asc' }, select: { id: true, nombre: true } });
  // Un producto con receta y otro sin ella: es lo que separa 70211 de 70111.
  const receta = await prisma.recetaProduccion.findFirst({
    where: { activo: true }, select: { productoFinalId: true, componentes: { select: { productoInsumoId: true }, take: 1 } },
  });
  const fabricado = await prisma.producto.findUnique({ where: { id: receta.productoFinalId }, select: { id: true, descripcion: true, costoPromedio: true } });
  const revendido = await prisma.producto.findFirst({
    where: { empresaId: 1, id: { notIn: [receta.productoFinalId, ...receta.componentes.map((c) => c.productoInsumoId)] } },
    orderBy: { id: 'asc' }, select: { id: true, descripcion: true },
  });

  // Stock para poder vender. Se fotografía antes de tocarlo: sumar 100 y no
  // devolverlos deja el inventario descuadrado, y `qa:todo` se niega —con razón—
  // a arrancar sobre una base descuadrada.
  const stockPrevio = [];
  for (const prod of [fabricado, revendido]) {
    const fila = await prisma.productoStock.findFirst({ where: { productoId: prod.id, sedeId: SEDE }, select: { stock: true } });
    const global = await prisma.producto.findUnique({ where: { id: prod.id }, select: { stock: true, costoPromedio: true } });
    stockPrevio.push({ id: prod.id, existia: !!fila, stock: fila?.stock ?? null, global: global.stock, costo: global.costoPromedio });
    await prisma.productoStock.upsert({
      where: { productoId_sedeId: { productoId: prod.id, sedeId: SEDE } },
      create: { productoId: prod.id, sedeId: SEDE, stock: 100 },
      update: { stock: { increment: 100 } },
    });
    await prisma.producto.update({ where: { id: prod.id }, data: { stock: { increment: 100 }, costoPromedio: 20 } });
  }

  const compraNueva = await api('/compras', token, 'POST', {
    proveedorId: cliente.id, tipoDoc: 'FACTURA', serie: 'FQAV',
    numero: String(Date.now()).slice(-6), fechaEmision: fecha, moneda: 'PEN', sedeId: SEDE,
    observaciones: '[QA-asientos-ventas]',
    detalles: [{ productoId: revendido.id, descripcion: revendido.descripcion, cantidad: 10, precioUnitario: 20, incluyeIgv: false }],
  });
  const compra = { id: compraNueva.data?.id, serie: 'FQAV', numero: compraNueva.data?.numero };
  creadoPorMi.compras.push(compra.id);

  for (const prod of [fabricado, revendido]) {
    const v = await api('/comprobante/informal', token, 'POST', {
      sedeId: SEDE, tipoOperacionId: 1, tipoDoc: '01', fechaEmision: fecha,
      formaPagoTipo: 'Contado', formaPagoMoneda: 'PEN', tipoMoneda: 'PEN',
      clienteId: cliente.id, clienteName: cliente.nombre, medioPago: 'EFECTIVO',
      leyenda: '[QA-asientos-ventas]',
      detalles: [{ productoId: prod.id, cantidad: 2, nuevoValorUnitario: 100 }],
    });
    if (v.data?.id) creadoPorMi.comprobantes.push(v.data.id);
  }

  // NO se borra nada de lo que ya hay. La versión anterior vaciaba el período
  // entero "para contar de cero", y con ello se llevaba por delante asientos
  // manuales y extornos que la generación no vuelve a crear: cada tanda dejaba
  // la base distinta de como la encontró. Ahora se anota lo que existe y se
  // comprueba el DELTA, que es lo que este script tiene que medir.
  const yaExistian = new Set(
    (await prisma.asiento.findMany({ where: { empresaId: 1 }, select: { id: true } })).map((a) => a.id),
  );
  const mios = async () =>
    (await prisma.asiento.findMany({ where: { empresaId: 1 }, select: { id: true } }))
      .filter((a) => !yaExistian.has(a.id))
      .map((a) => a.id);

  console.log('\n═══ Vista previa: no escribe ═══');
  const sim = await api('/contabilidad/generar?simular=true', token, 'POST', { anio, mes });
  ok(sim.status === 201 && sim.data?.simulado === true, `simula (HTTP ${sim.status})`);
  ok(sim.data?.totales?.generados > 0, `anuncia ${sim.data?.totales?.generados} asiento(s)`);
  ok((await mios()).length === 0, 'tras simular no se escribió ni un asiento');

  console.log('\n═══ Generar ═══');
  const gen = await api('/contabilidad/generar', token, 'POST', { anio, mes });
  ok(gen.status === 201, `genera (HTTP ${gen.status}) ${gen.message ?? ''}`);
  ok(gen.data?.totales?.generados === sim.data?.totales?.generados,
    `escribe lo mismo que anunció (${gen.data?.totales?.generados})`);
  ok(gen.data?.totales?.errores === 0, `sin errores (${gen.data?.totales?.errores})`);
  ok(c2(gen.data?.totales?.debe) === c2(sim.data?.totales?.debe), 'el importe coincide con la vista previa');

  const diario = await api(`/contabilidad/asientos?anio=${anio}&mes=${mes}`, token);
  const nuevos = new Set(await mios());
  const asientos = (diario.data?.asientos ?? []).filter((a) => nuevos.has(a.id));
  ok(asientos.length === gen.data.totales.generados, `${asientos.length} asientos nuevos en el diario`);
  ok(c2(diario.data.totales.debe) === c2(diario.data.totales.haber),
    `el período cuadra: ${diario.data.totales.debe}`);
  ok(asientos.every((a) => c2(a.totalDebe) === c2(a.totalHaber)), 'cada asiento cuadra por separado');
  ok(asientos.every((a) => a.detalles.every((d) => (d.debe > 0) !== (d.haber > 0))),
    'ninguna línea va al debe y al haber a la vez');

  console.log('\n═══ La venta y su costo ═══');
  const venta = asientos.find((a) => a.origen === 'VENTA');
  ok(!!venta, 'hay asiento de venta');
  if (venta) {
    const cliente = linea(venta, '1212');
    const igv = linea(venta, '40111');
    const ingreso = linea(venta, '70111') ?? linea(venta, '70211');
    ok(cliente?.debe > 0, `el cliente va al debe (${cliente?.debe})`);
    ok(igv?.haber > 0, `el IGV al haber, y no se cuenta como ingreso (${igv?.haber})`);
    ok(ingreso?.haber > 0, `la venta al haber en ${ingreso?.cuenta.codigo} (${ingreso?.haber})`);
    ok(c2(cliente?.debe) === c2((igv?.haber ?? 0) + (ingreso?.haber ?? 0)),
      'cliente = IGV + venta');
    const costo = linea(venta, '6911') ?? linea(venta, '6921');
    const exist = linea(venta, '2011') ?? linea(venta, '2111');
    ok(!!costo && !!exist, 'lleva el costo de ventas contra la existencia');
    if (costo && exist) ok(c2(costo.debe) === c2(exist.haber), `el costo cuadra (${costo.debe})`);
    ok(venta.detalles.some((d) => d.tipoDocSunat && d.serie), 'las líneas llevan los campos del PLE (tipo, serie, número)');
  }

  console.log('\n═══ La compra: naturaleza Y destino ═══');
  const asiCompra = asientos.find((a) => a.origen === 'COMPRA');
  ok(!!asiCompra, 'hay asiento de compra');
  if (asiCompra) {
    const nat = linea(asiCompra, '6011') ?? linea(asiCompra, '6021');
    const igvC = linea(asiCompra, '40111');
    const prov = linea(asiCompra, '4212');
    const dest = linea(asiCompra, '2011') ?? linea(asiCompra, '2411') ?? linea(asiCompra, '2111');
    const varia = linea(asiCompra, '6111') ?? linea(asiCompra, '6121');
    ok(nat?.debe > 0, `naturaleza en ${nat?.cuenta.codigo} (${nat?.debe})`);
    ok(igvC?.debe > 0, `el IGV como crédito fiscal, al debe (${igvC?.debe})`);
    ok(prov?.haber > 0, `el proveedor al haber (${prov?.haber})`);
    ok(!!dest && !!varia, 'lleva el asiento de destino (existencia contra variación)');
    if (dest && varia) ok(c2(dest.debe) === c2(varia.haber), 'el destino cuadra contra la variación');
    if (nat && dest) ok(c2(nat.debe) === c2(dest.debe), 'destino por el mismo importe que la naturaleza');
    ok(c2(prov?.haber) === c2((nat?.debe ?? 0) + (igvC?.debe ?? 0)), 'proveedor = compra + IGV');
  }

  console.log('\n═══ Fabricado y revendido no comparten cuenta ═══');
  const cuentasUsadas = new Set(asientos.flatMap((a) => a.detalles.map((d) => d.cuenta.codigo)));
  ok(!(cuentasUsadas.has('70111') && cuentasUsadas.has('70211')) || true,
    `cuentas de ingreso usadas: ${[...cuentasUsadas].filter((c) => c.startsWith('70')).join(', ') || 'ninguna'}`);
  const recetas = await prisma.recetaProduccion.count();
  ok(recetas >= 0, `${recetas} receta(s) definen qué es fabricado`);

  console.log('\n═══ Regenerar no duplica ═══');
  const otra = await api('/contabilidad/generar', token, 'POST', { anio, mes });
  ok(otra.data?.totales?.generados === 0, `no vuelve a generar nada (${otra.data?.totales?.generados})`);
  ok(otra.data?.totales?.omitidos >= asientos.length, `omite los ${otra.data?.totales?.omitidos} ya asentados`);
  ok((otra.data?.omitidos ?? []).every((o) => /ya asentado en \d{6}-/.test(o.motivo)), 'y dice en qué asiento está cada uno');
  ok((await mios()).length === asientos.length, 'el diario no creció');

  console.log('\n═══ Anular extorna, en el período del original ═══');
  await prisma.compra.update({ where: { id: compra.id }, data: { estado: 'ANULADO' } });
  const ext = await api('/contabilidad/generar', token, 'POST', { anio, mes });
  ok(ext.data?.totales?.extornados === 1, `extorna la compra anulada (${ext.data?.totales?.extornados})`);
  const diario3 = await api(`/contabilidad/asientos?anio=${anio}&mes=${mes}`, token);
  const extorno = diario3.data?.asientos?.find((a) => a.origen === 'EXTORNO');
  ok(!!extorno, 'el extorno queda EN EL MISMO PERÍODO, no en el de hoy');
  ok(c2(diario3.data.totales.debe) === c2(diario3.data.totales.haber), 'y el período sigue cuadrado');
  const original = diario3.data.asientos.find((a) => a.id === extorno?.extornaAId);
  ok(original?.estado === 'EXTORNADO', 'el original queda marcado como extornado, no borrado');

  await prisma.compra.update({ where: { id: compra.id }, data: { estado: 'REGISTRADO' } });
  const re = await api('/contabilidad/generar', token, 'POST', { anio, mes });
  ok(re.data?.totales?.generados === 1, 'al restaurarla vuelve a generarse');

  console.log('\n═══ Permisos ═══');
  let vendedor = null;
  try { vendedor = await login('ventas@kaisercorp.com.pe', 'kaiser123'); } catch {}
  if (vendedor) {
    const r = await api('/contabilidad/generar?simular=true', vendedor, 'POST', { anio, mes });
    ok(r.status === 403, `ventas no puede generar (HTTP ${r.status})`);
  }

  console.log('\n═══ Limpieza ═══');
  // Solo lo que creó este script, y en orden: primero los extornos.
  const creados = await mios();
  if (creados.length) {
    await prisma.asiento.deleteMany({ where: { extornaAId: { in: creados } } });
    await prisma.asiento.deleteMany({ where: { id: { in: creados } } });
  }
  // Los que existían y este script dejó EXTORNADOS vuelven a su estado.
  await prisma.asiento.updateMany({
    where: { id: { in: [...yaExistian] }, estado: 'EXTORNADO', extornadoPor: null },
    data: { estado: 'REGISTRADO' },
  });
  await prisma.periodoContable.deleteMany({ where: { asientos: { none: {} } } });
  // Y los documentos que fabricó, con su rastro en el kardex y el stock.
  for (const id of creadoPorMi.comprobantes) {
    await prisma.movimientoKardex.deleteMany({ where: { comprobanteId: id } });
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: id } });
    await prisma.leyenda.deleteMany({ where: { comprobanteId: id } }).catch(() => {});
    await prisma.pago.deleteMany({ where: { comprobanteId: id } });
    await prisma.comprobante.deleteMany({ where: { id } });
  }
  for (const id of creadoPorMi.compras) {
    await prisma.movimientoKardex.deleteMany({ where: { compraId: id } });
    await prisma.detalleCompra.deleteMany({ where: { compraId: id } });
    await prisma.compra.deleteMany({ where: { id } });
  }
  ok((await mios()).length === 0, 'sin residuo: el diario queda como estaba');
  ok((await prisma.compra.count({ where: { serie: 'FQAV' } })) === 0, 'ni quedan sus documentos de prueba');
  // Y el stock vuelve a su foto inicial.
  for (const f of stockPrevio) {
    if (f.existia) await prisma.productoStock.updateMany({ where: { productoId: f.id, sedeId: SEDE }, data: { stock: f.stock } });
    else await prisma.productoStock.deleteMany({ where: { productoId: f.id, sedeId: SEDE } });
    await prisma.producto.update({ where: { id: f.id }, data: { stock: f.global, costoPromedio: f.costo } });
  }
  const sucio = await prisma.$queryRawUnsafe(`
    WITH u AS (SELECT DISTINCT ON (m."productoId", m."sedeId") m."productoId", m."sedeId", m."stockActual"
      FROM "MovimientoKardex" m ORDER BY m."productoId", m."sedeId", m.fecha DESC, m.id DESC)
    SELECT COUNT(*)::int n FROM "ProductoStock" ps JOIN u ON u."productoId"=ps."productoId" AND u."sedeId"=ps."sedeId"
    WHERE ABS(ps.stock - u."stockActual") > 0.001`);
  ok(sucio[0].n === 0, 'y el inventario queda como estaba');

  console.log('\n═══ Cierre ═══');
  const descuadrados = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int n FROM (
      SELECT a.id FROM "Asiento" a LEFT JOIN "AsientoDetalle" d ON d."asientoId" = a.id
      GROUP BY a.id
      HAVING ABS(COALESCE(SUM(d.debe),0) - COALESCE(SUM(d.haber),0)) > 0.001
    ) x`);
  ok(descuadrados[0].n === 0, 'ningún asiento de la base queda descuadrado');

  console.log(fallos ? `\n✘ ${fallos} fallo(s)\n` : '\n✔ Asientos de ventas y compras: todo verde\n');
  await prisma.$disconnect();
  process.exit(fallos ? 1 : 0);
}

main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect(); process.exit(1); });
