/**
 * QA funcional · ventas simultáneas del mismo producto
 *
 * Dos ventas a la vez del mismo producto pasan las dos, y es deliberado: la
 * validación de stock ocurre ANTES de crear el comprobante, y bloquear en el
 * movimiento dejaría una factura ya emitida —posiblemente ya en SUNAT— sin
 * movimiento de inventario. Eso es peor que la sobreventa. Y en un fabricante
 * contra pedido, vender lo que se va a producir es legítimo.
 *
 * Lo que NO es aceptable es que pase en silencio, y eso es lo que se comprueba:
 *
 *   1. El dato queda coherente: el stock es exactamente lo que dicen sus
 *      movimientos. Antes no: el escritor recortaba a cero y el stock decía 0
 *      mientras el kardex decía −6.
 *   2. La sobreventa se VE, como stock negativo y no como cero.
 *   3. Se avisa a almacén, y con el mensaje correcto: «stock comprometido de más»
 *      con las unidades que faltan, no «producto agotado» —que manda a hacer la
 *      tarea equivocada.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

async function token() {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gerencia@kaisercorp.com.pe', password: 'kaiser123' }) });
  const j = await r.json();
  if (r.status >= 400 || !j.data) throw new Error(`login falló (HTTP ${r.status}): ${j?.message ?? ''}`);
  if (!j.data.requiresSedeSelection) return j.data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
    body: JSON.stringify({ sedeId: SEDE }) });
  const c = await r2.json();
  if (r2.status >= 400 || !c?.data?.accessToken) throw new Error(`select-sede falló (HTTP ${r2.status}): ${c?.message ?? ''}`);
  return c.data.accessToken;
}

async function main() {
  const tk = await token();
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true } });
  const N = Date.now().toString().slice(-8);
  const STOCK = 10, POR_VENTA = 8;

  const prod = await prisma.producto.create({
    data: { codigo: `QVT${N}`, descripcion: '[QA-VENTA] simultáneas', precioUnitario: 100, valorUnitario: 100,
      stock: STOCK, costoPromedio: 50, empresaId: ref.empresaId, unidadMedidaId: ref.unidadMedidaId,
      tipoAfectacionIGV: '10', factorConversion: 1 } });
  await prisma.productoStock.create({ data: { productoId: prod.id, sedeId: SEDE, stock: STOCK } });
  const desde = new Date();

  const nota = () => ({ sedeId: SEDE, tipoOperacionId: 1, tipoDoc: 'NV', fechaEmision: new Date().toISOString(),
    formaPagoTipo: 'Contado', formaPagoMoneda: 'PEN', tipoMoneda: 'PEN', clienteId: 1, clienteName: 'VARIOS',
    leyenda: '[QA-VENTA]', medioPago: 'EFECTIVO',
    detalles: [{ productoId: prod.id, cantidad: POR_VENTA, nuevoValorUnitario: 100 }] });

  console.log(`Producto con ${STOCK} unidades. Dos notas de venta de ${POR_VENTA} a la vez.\n`);
  const res = await Promise.all([1, 2].map(() =>
    fetch(`${API}/comprobante/informal`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` }, body: JSON.stringify(nota()) })
      .then(async (x) => ({ s: x.status, b: await x.json().catch(() => ({})) }))));
  res.forEach((x, i) => console.log(`   venta ${i + 1}: HTTP ${x.s}${x.s >= 400 ? ' · ' + String(x.b?.message).slice(0, 70) : ''}`));

  const movs = await prisma.movimientoKardex.findMany({ where: { productoId: prod.id },
    orderBy: { id: 'asc' }, select: { cantidad: true, stockAnterior: true, stockActual: true } });
  const stock = Number((await prisma.productoStock.findFirst({ where: { productoId: prod.id, sedeId: SEDE }, select: { stock: true } }))?.stock ?? 0);
  const vendido = movs.reduce((a, m) => a + Number(m.cantidad), 0);
  const aceptadas = res.filter((x) => x.s < 300).length;

  console.log(`\n   movimientos: ${movs.map((m) => `${m.stockAnterior}→${m.stockActual}`).join(' · ')}`);
  console.log(`   aceptadas ${aceptadas}/2 · vendido ${vendido} de ${STOCK}`);

  // 1. Coherencia: es la parte que era un bug de integridad.
  ok(stock === STOCK - vendido,
    `el stock (${stock}) es exactamente lo que dicen sus movimientos: ${STOCK} − ${vendido}`);
  const partidas = movs.map((m) => Number(m.stockAnterior));
  ok(new Set(partidas).size === partidas.length,
    `cada movimiento parte de un saldo distinto (${partidas.join(', ')}): no se pierde ningún descuento`);

  // 2. Si hubo sobreventa, tiene que verse como negativo y no maquillarse a cero.
  if (vendido > STOCK) {
    ok(stock < 0, `la sobreventa se ve: stock ${stock}, no recortado a 0`);
  } else {
    ok(true, `no hubo sobreventa en esta pasada (vendido ${vendido})`);
  }

  // 3. Y alguien tiene que enterarse, con el mensaje correcto.
  const avisos = await prisma.notificacion.findMany({
    where: { creadoEn: { gte: desde }, tipo: 'CRITICAL' },
    select: { titulo: true, mensaje: true } });
  const sobrevendido = avisos.filter((a) => /comprometido de más/i.test(a.titulo));
  const agotado = avisos.filter((a) => /agotado/i.test(a.titulo));
  if (stock < 0) {
    ok(sobrevendido.length > 0, `se avisa de stock comprometido de más (${sobrevendido.length} avisos)`);
    ok(agotado.length === 0, `y NO se avisa de "agotado", que mandaría a hacer otra cosa (${agotado.length})`);
    ok(sobrevendido.some((a) => a.mensaje.includes(String(Math.abs(stock)))),
      `el aviso dice cuántas unidades faltan (${Math.abs(stock)})`);
  } else {
    ok(true, 'sin stock negativo, no aplica el aviso de sobreventa');
  }

  // Limpieza
  const ids = res.filter((x) => x.s < 300).map((x) => x.b?.data?.id).filter(Boolean);
  for (const id of ids) {
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: id } });
    await prisma.leyenda.deleteMany({ where: { comprobanteId: id } });
    await prisma.movimientoKardex.deleteMany({ where: { comprobanteId: id } });
    await prisma.comprobante.deleteMany({ where: { id } });
  }
  await prisma.notificacion.deleteMany({ where: { creadoEn: { gte: desde } } });
  await prisma.movimientoKardex.deleteMany({ where: { productoId: prod.id } });
  await prisma.productoLote.deleteMany({ where: { productoId: prod.id } });
  await prisma.productoStock.deleteMany({ where: { productoId: prod.id } });
  await prisma.producto.delete({ where: { id: prod.id } });

  console.log(fallos === 0 ? '\n✔ VENTAS SIMULTÁNEAS: coherente y avisado' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('✘', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
