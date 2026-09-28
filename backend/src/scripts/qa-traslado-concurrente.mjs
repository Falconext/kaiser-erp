/**
 * QA funcional · traslados simultáneos del mismo producto
 *
 * Dos personas en almacén trasladando el mismo producto a la vez es un escenario
 * normal, y era el que rompía el inventario: comprobar el stock y descontarlo
 * eran dos pasos separados, así que tres traslados de 6 sobre un almacén con 10
 * unidades devolvían 201 los tres y dejaban el origen en −8. El total se
 * conservaba —no se perdía mercadería— pero una sede en negativo envenena el
 * inventario valorizado, la cadena del kardex y el detector de descuadres.
 *
 * Se prueban los dos escenarios, porque el primero enmascaraba al segundo: con la
 * fila de stock del destino sin crear, los perdedores morían antes por el índice
 * único de ProductoStock y el fallo de verdad no se veía.
 *
 * Crea su propio producto y lo borra.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
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
    body: JSON.stringify({ sedeId: 1 }) });
  const c = await r2.json();
  if (r2.status >= 400 || !c?.data?.accessToken) throw new Error(`select-sede falló (HTTP ${r2.status}): ${c?.message ?? ''}`);
  return c.data.accessToken;
}

async function escenario(tk, { crearFilaDestino }) {
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true, tipoAfectacionIGV: true } });
  const codigo = `QATR${Date.now().toString().slice(-8)}${crearFilaDestino ? 'B' : 'A'}`;
  const prod = await prisma.producto.create({
    data: { codigo, descripcion: '[QA-TRAS] carrera', precioUnitario: 1, valorUnitario: 1, stock: 10,
      empresaId: ref.empresaId, unidadMedidaId: ref.unidadMedidaId, tipoAfectacionIGV: ref.tipoAfectacionIGV ?? '10' } });
  await prisma.productoStock.create({ data: { productoId: prod.id, sedeId: 1, stock: 10 } });
  if (crearFilaDestino) await prisma.productoStock.create({ data: { productoId: prod.id, sedeId: 3, stock: 0 } });

  const res = await Promise.all([1, 2, 3].map((n) =>
    fetch(`${API}/kardex/traslado`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
      body: JSON.stringify({ sedeOrigenId: 1, sedeDestinoId: 3, observacion: `[QA-TRAS] ${n}`,
        items: [{ productoId: prod.id, cantidad: 6 }] }) })
      .then(async (x) => ({ s: x.status, b: await x.json().catch(() => ({})) }))));

  const leer = async (sedeId) =>
    Number((await prisma.productoStock.findFirst({ where: { productoId: prod.id, sedeId }, select: { stock: true } }))?.stock ?? 0);
  const origen = await leer(1), destino = await leer(3);
  const aceptados = res.filter((x) => x.s < 300).length;
  const rechazos = res.filter((x) => x.s >= 400);

  await prisma.movimientoKardex.deleteMany({ where: { productoId: prod.id } });
  await prisma.productoStock.deleteMany({ where: { productoId: prod.id } });
  await prisma.producto.delete({ where: { id: prod.id } });
  return { origen, destino, aceptados, rechazos };
}

async function main() {
  const tk = await token();

  for (const crearFilaDestino of [true, false]) {
    console.log(crearFilaDestino
      ? '1) Con la fila de stock del destino ya creada (aísla la carrera real)'
      : '\n2) Con el destino sin fila de stock (así se enmascaraba el fallo)');
    const r = await escenario(tk, { crearFilaDestino });
    console.log(`   10 unidades en el origen, 3 traslados de 6 a la vez · aceptados: ${r.aceptados}`);
    ok(r.origen >= 0, `el origen no queda en negativo (${r.origen})`);
    ok(r.origen + r.destino === 10, `el total se conserva: ${r.origen} + ${r.destino} = ${r.origen + r.destino}`);
    ok(r.aceptados === 1, `solo pasa uno de los tres (${r.aceptados})`);
    // Y que el que se queda fuera reciba un motivo entendible, no un choque de índice.
    const utiles = r.rechazos.filter((x) => /stock insuficiente/i.test(String(x.b?.message)));
    ok(utiles.length === r.rechazos.length,
      `los rechazados explican por qué: ${r.rechazos.map((x) => `${x.s} "${String(x.b?.message).slice(0, 46)}"`).join(' · ') || 'ninguno'}`);
  }

  console.log(fallos === 0 ? '\n✔ TRASLADOS SIMULTÁNEOS: todo correcto' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('✘', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
