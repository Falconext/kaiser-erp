/**
 * QA funcional · el stock solo se mueve por el kardex
 *
 * Esta es la invariante que sostiene todo el inventario, y la que reclamaba la jefa
 * de almacén: si el stock cambia sin dejar movimiento, la tarjeta de stock miente y
 * no hay forma de explicar dónde fue la mercadería.
 *
 * Se prueban los caminos que escriben `ProductoStock` desde fuera del kardex:
 *   · editar el stock de un producto desde la pantalla de inventario;
 *   · reclasificar un producto con existencias como SERVICIO, que pone su stock a
 *     cero —antes de golpe, sin movimiento: 400 unidades a S/ 25 eran S/ 10.000 de
 *     inventario borrados sin rastro, con el kardex siguiendo en 400.
 *
 * Crea sus propios productos y los borra.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const S = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  const creados = [];

  const nuevo = async (sufijo, stock, costo) => {
    const N = Date.now().toString().slice(-8);
    const p = await prisma.producto.create({
      data: { codigo: `QSK${N}${sufijo}`, descripcion: `[QA-SK] ${sufijo}`, precioUnitario: 100, valorUnitario: 100,
        stock, costoPromedio: costo, empresaId: ref.empresaId, unidadMedidaId: ref.unidadMedidaId,
        tipoAfectacionIGV: '10', factorConversion: 1 } });
    await prisma.productoStock.create({ data: { productoId: p.id, sedeId: SEDE, stock } });
    await prisma.movimientoKardex.create({
      data: { productoId: p.id, empresaId: ref.empresaId, sedeId: SEDE, tipoMovimiento: 'INGRESO',
        concepto: '[QA-SK] inventario inicial', cantidad: stock, costoUnitario: costo,
        valorTotal: stock * costo, stockAnterior: 0, stockActual: stock } });
    creados.push(p.id);
    return p;
  };
  const estado = async (id) => ({
    sede: Number((await prisma.productoStock.findFirst({ where: { productoId: id, sedeId: SEDE }, select: { stock: true } }))?.stock ?? 0),
    global: Number((await prisma.producto.findUnique({ where: { id }, select: { stock: true } }))?.stock ?? 0),
    movs: await prisma.movimientoKardex.count({ where: { productoId: id } }),
    saldo: Number((await prisma.movimientoKardex.findFirst({ where: { productoId: id, sedeId: SEDE }, orderBy: [{ fecha: 'desc' }, { id: 'desc' }], select: { stockActual: true } }))?.stockActual ?? 0),
  });

  try {
    // ── 1. Editar el stock desde inventario ───────────────────────────────
    console.log('1) Cambiar el stock editando el producto');
    const p1 = await nuevo('A', 100, 10);
    const a1 = await estado(p1.id);
    const r1 = await fetch(`${API}/productos/${p1.id}`, { method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
      body: JSON.stringify({ stock: 130, sedeId: SEDE }) });
    ok(r1.status < 300, `editado a 130 (HTTP ${r1.status})`);
    const d1 = await estado(p1.id);
    ok(d1.sede === 130, `el stock quedó en ${d1.sede}`);
    ok(d1.movs === a1.movs + 1, `dejó un movimiento de kardex (${a1.movs} → ${d1.movs})`);
    ok(d1.saldo === d1.sede, `y el saldo del kardex coincide con el stock (${d1.saldo})`);
    ok(d1.global === d1.sede, `y el global también (${d1.global})`);

    // ── 2. Reclasificar a servicio un producto con existencias ────────────
    console.log('\n2) Reclasificar como SERVICIO un producto con inventario');
    const p2 = await nuevo('B', 400, 25);
    const a2 = await estado(p2.id);
    console.log(`   parte con ${a2.sede} unidades a ${S(25)} = ${S(a2.sede * 25)} de inventario`);
    const r2 = await fetch(`${API}/productos/${p2.id}`, { method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
      body: JSON.stringify({ atributosTecnicos: { tipoProducto: 'SERVICIO' } }) });
    ok(r2.status < 300, `reclasificado (HTTP ${r2.status})`);
    const d2 = await estado(p2.id);
    ok(d2.sede === 0, `el stock queda en ${d2.sede}`);
    // Lo que importa: la mercadería salió POR el kardex, no se borró.
    ok(d2.movs === a2.movs + 1, `la baja dejó su movimiento (${a2.movs} → ${d2.movs})`);
    ok(d2.saldo === 0, `el kardex también dice 0 (decía ${a2.saldo})`);
    ok(d2.global === 0, `y el stock global (${d2.global})`);
    const baja = await prisma.movimientoKardex.findFirst({
      where: { productoId: p2.id, tipoMovimiento: 'SALIDA' },
      select: { cantidad: true, valorTotal: true, concepto: true } });
    ok(!!baja && Number(baja.cantidad) === a2.sede,
      `por las ${baja?.cantidad} unidades que había`);
    ok(Math.abs(Number(baja?.valorTotal ?? 0) - a2.sede * 25) < 0.05,
      `valorizada en ${S(baja?.valorTotal)}: se puede explicar dónde fue el inventario`);
    ok(/servicio/i.test(String(baja?.concepto)), `y el motivo lo dice: "${baja?.concepto}"`);
  } finally {
    console.log('\n3) Limpieza');
    for (const id of creados) {
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoLote.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.deleteMany({ where: { id } });
    }
    const quedan = await prisma.producto.count({ where: { codigo: { startsWith: 'QSK' } } });
    ok(quedan === 0, `${creados.length} productos de prueba eliminados (quedan ${quedan})`);
    await prisma.$disconnect();
  }

  console.log(fallos === 0 ? '\n✔ EL STOCK SOLO SE MUEVE POR EL KARDEX' : `\n✘ ${fallos} comprobaciones fallidas`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
