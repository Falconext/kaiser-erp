/**
 * QA funcional · ejecuciones de producción simultáneas
 *
 * Dos órdenes que consumen el mismo insumo, ejecutadas a la vez. Era el peor
 * fallo de inventario que apareció: leer el stock y escribir el nuevo eran dos
 * pasos, así que las dos leían 10 y las dos escribían 4. El kardex quedaba con
 * DOS movimientos idénticos «10 → 4»: se consumían 12 unidades y solo se
 * descontaban 6.
 *
 * Eso es inventario fantasma —el sistema dice que hay mercadería que no existe—,
 * dos productos terminados fabricados con insumos que nunca se descontaron, y la
 * cadena de saldos del kardex partida. Es peor que quedarse en negativo.
 *
 * La comprobación que importa: la suma de las cantidades del kardex tiene que
 * explicar exactamente el stock resultante.
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
  const call = (ruta, body) => fetch(`${API}${ruta}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` }, body: JSON.stringify(body) })
    .then(async (x) => ({ s: x.status, b: await x.json().catch(() => ({})) }));

  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true } });
  const N = Date.now().toString().slice(-7);
  const crear = async (sufijo, stock, costo) => {
    const x = await prisma.producto.create({
      data: { codigo: `QPX${N}${sufijo}`, descripcion: `[QA-PROD-CONC] ${sufijo}`, precioUnitario: 1, valorUnitario: 1,
        stock, costoPromedio: costo, empresaId: ref.empresaId, unidadMedidaId: ref.unidadMedidaId,
        tipoAfectacionIGV: '10', factorConversion: 1 } });
    await prisma.productoStock.create({ data: { productoId: x.id, sedeId: SEDE, stock } });
    return x;
  };

  const STOCK = 10, POR_ORDEN = 6, ORDENES = 3;
  const ins = await crear('I', STOCK, 3);
  const fin = await crear('F', 0, 0);
  const rec = await call('/produccion/recetas', { productoFinalId: fin.id, codigo: `QPX-${N}`, nombre: '[QA-PROD-CONC]',
    rendimientoObjetivo: 1, unidadRendimiento: 'UN', componentes: [{ productoInsumoId: ins.id, cantidadBase: POR_ORDEN, unidadBase: 'KGM' }] });
  const recetaId = rec.b?.data?.id;
  const ordenes = [];
  for (let i = 1; i <= ORDENES; i++) {
    const o = await call('/produccion/ordenes', { recetaId, loteProduccion: `QPX-${N}-${i}`, cantidadObjetivo: 1 });
    if (o.b?.data?.id) ordenes.push(o.b.data.id);
  }

  console.log(`Insumo con ${STOCK} unidades · ${ORDENES} órdenes de ${POR_ORDEN}, ejecutadas a la vez.`);
  console.log(`Solo cabe ${Math.floor(STOCK / POR_ORDEN)}.\n`);
  const res = await Promise.all(ordenes.map((id) =>
    call(`/produccion/ordenes/${id}/ejecutar`, { cantidadProducida: 1, componentes: [{ productoInsumoId: ins.id, cantidadConsumida: POR_ORDEN }] })));
  res.forEach((x, i) => console.log(`   orden ${i + 1}: HTTP ${x.s}${x.s >= 400 ? ' · ' + String(x.b?.message).slice(0, 58) : ''}`));

  const movs = await prisma.movimientoKardex.findMany({ where: { productoId: ins.id },
    orderBy: { id: 'asc' }, select: { cantidad: true, stockAnterior: true, stockActual: true } });
  const leer = async (id) => Number((await prisma.productoStock.findFirst({ where: { productoId: id, sedeId: SEDE }, select: { stock: true } }))?.stock ?? 0);
  const stockIns = await leer(ins.id), stockFin = await leer(fin.id);
  const consumidoKardex = movs.reduce((a, m) => a + Number(m.cantidad), 0);
  const aceptadas = res.filter((x) => x.s < 300).length;

  console.log('');
  console.log(`   movimientos: ${movs.map((m) => `${m.stockAnterior}→${m.stockActual}`).join(' · ') || 'ninguno'}`);
  ok(stockIns >= 0, `el insumo no queda en negativo (${stockIns})`);
  ok(stockIns === STOCK - consumidoKardex,
    `el stock (${stockIns}) lo explican los movimientos: ${STOCK} − ${consumidoKardex} = ${STOCK - consumidoKardex}`);
  ok(aceptadas === Math.floor(STOCK / POR_ORDEN), `solo se ejecutan las que caben (${aceptadas})`);
  ok(stockFin === aceptadas, `se fabricó una unidad por orden ejecutada (${stockFin})`);
  ok(consumidoKardex === aceptadas * POR_ORDEN,
    `y se consumió exactamente lo de las órdenes ejecutadas (${consumidoKardex} = ${aceptadas}×${POR_ORDEN})`);
  // Ningún movimiento puede repetir el saldo de partida de otro.
  const partidas = movs.map((m) => Number(m.stockAnterior));
  ok(new Set(partidas).size === partidas.length,
    `ningún par de movimientos parte del mismo saldo (${partidas.join(', ')})`);

  for (const id of ordenes) {
    await prisma.movimientoProduccion.deleteMany({ where: { ordenProduccionId: id } });
    await prisma.ordenProduccionComponente.deleteMany({ where: { ordenProduccionId: id } });
    await prisma.ordenProduccion.deleteMany({ where: { id } });
  }
  if (recetaId) {
    await prisma.recetaComponente.deleteMany({ where: { recetaId } });
    await prisma.recetaProduccion.deleteMany({ where: { id: recetaId } });
  }
  for (const x of [ins, fin]) {
    await prisma.movimientoKardex.deleteMany({ where: { productoId: x.id } });
    await prisma.productoLote.deleteMany({ where: { productoId: x.id } });
    await prisma.productoStock.deleteMany({ where: { productoId: x.id } });
    await prisma.producto.deleteMany({ where: { id: x.id } });
  }
  console.log(fallos === 0 ? '\n✔ PRODUCCIÓN SIMULTÁNEA: todo correcto' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('✘', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
