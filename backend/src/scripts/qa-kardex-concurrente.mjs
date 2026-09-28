/**
 * QA funcional · movimientos de kardex simultáneos (el camino compartido)
 *
 * `registrarMovimiento` lo usan ventas, compras, guías de remisión, devoluciones,
 * importaciones y los ajustes: es el punto por donde pasa casi todo el inventario.
 *
 * Leer el saldo y escribir el nuevo eran dos pasos sin transacción, así que se
 * perdían actualizaciones. Cuatro ajustes de −20 a la vez sobre 100 unidades
 * dejaban tres movimientos idénticos «100 → 80» y el stock en 60, cuando las
 * cantidades sumaban −80. Cuarenta unidades de inventario fantasma.
 *
 * Y no se veía venir: el escritor hacía `Math.max(0, nuevoStock)`, así que el
 * stock nunca bajaba de cero. Nunca salía en negativo; simplemente dejaba de
 * corresponder con sus propios movimientos.
 *
 * La comprobación que importa: el stock final tiene que ser explicable sumando
 * las cantidades del kardex. Si no lo es, hay inventario inventado.
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

async function caso(tk, { nombre, inicial, tipo, cantidad, veces }) {
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true } });
  const prod = await prisma.producto.create({
    data: { codigo: `QKC${Date.now().toString().slice(-8)}`, descripcion: '[QA-KC] simultáneos',
      precioUnitario: 1, valorUnitario: 1, stock: inicial, costoPromedio: 1,
      empresaId: ref.empresaId, unidadMedidaId: ref.unidadMedidaId, tipoAfectacionIGV: '10', factorConversion: 1 } });
  await prisma.productoStock.create({ data: { productoId: prod.id, sedeId: SEDE, stock: inicial } });

  const res = await Promise.all(Array.from({ length: veces }, (_, n) =>
    fetch(`${API}/kardex/ajuste`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
      body: JSON.stringify({ productoId: prod.id, sedeId: SEDE, tipoAjuste: tipo, cantidad, motivo: `[QA-KC] ${n + 1}` }) })
      .then((x) => x.status)));

  const movs = await prisma.movimientoKardex.findMany({ where: { productoId: prod.id },
    orderBy: { id: 'asc' }, select: { cantidad: true, stockAnterior: true, stockActual: true } });
  const stock = Number((await prisma.productoStock.findFirst({ where: { productoId: prod.id, sedeId: SEDE }, select: { stock: true } }))?.stock ?? 0);
  const suma = movs.reduce((a, m) => a + Number(m.cantidad), 0);
  const aceptados = res.filter((x) => x < 300).length;

  console.log(`\n${nombre}`);
  console.log(`   ${veces} ajustes ${tipo} de ${cantidad} sobre ${inicial} · aceptados ${aceptados}`);
  console.log(`   movimientos: ${movs.map((m) => `${m.stockAnterior}→${m.stockActual}`).join(' · ') || 'ninguno'}`);
  ok(stock === inicial + suma,
    `el stock (${stock}) lo explican los movimientos: ${inicial} ${suma >= 0 ? '+' : ''}${suma} = ${inicial + suma}`);
  const partidas = movs.map((m) => Number(m.stockAnterior));
  ok(new Set(partidas).size === partidas.length,
    `cada movimiento parte de un saldo distinto (${partidas.join(', ')})`);
  ok(stock >= 0, `el stock no queda en negativo (${stock})`);
  ok(movs.length === aceptados, `hay un movimiento por ajuste aceptado (${movs.length} y ${aceptados})`);

  await prisma.movimientoKardex.deleteMany({ where: { productoId: prod.id } });
  await prisma.productoStock.deleteMany({ where: { productoId: prod.id } });
  await prisma.producto.delete({ where: { id: prod.id } });
}

async function main() {
  const tk = await token();
  await caso(tk, { nombre: '1) Cuatro salidas a la vez, con stock de sobra', inicial: 100, tipo: 'NEGATIVO', cantidad: 20, veces: 4 });
  await caso(tk, { nombre: '2) Cuatro salidas a la vez, y solo caben dos', inicial: 50, tipo: 'NEGATIVO', cantidad: 20, veces: 4 });
  await caso(tk, { nombre: '3) Seis entradas a la vez', inicial: 0, tipo: 'POSITIVO', cantidad: 15, veces: 6 });
  console.log(fallos === 0 ? '\n✔ KARDEX SIMULTÁNEO: todo correcto' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('✘', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
