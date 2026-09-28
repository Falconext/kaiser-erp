/**
 * QA funcional · concurrencia de numeración
 *
 * Dos personas creando el mismo tipo de documento a la vez es un caso normal en
 * Kaiser, y los dos sitios que numeran con "el último + 1" son una carrera: ambas
 * leen el mismo máximo. Aquí se lanzan N en paralelo y se exige que TODAS salgan
 * y que ningún número se repita.
 *
 * El correlativo del comprobante se comprueba contra la base directamente, sin
 * emitir a SUNAT: se trata de la numeración, no del envío.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const N = 6;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

async function login() {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'gerencia@kaisercorp.com.pe', password: 'kaiser123' }) });
  const { data } = await r.json();
  if (!data?.requiresSedeSelection) return data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.tempToken}` }, body: JSON.stringify({ sedeId: 1 }) });
  const cuerpo = await r2.json();
  if (r2.status >= 400 || !cuerpo?.data?.accessToken) {
    throw new Error(`select-sede falló (HTTP ${r2.status}): ${cuerpo?.message ?? 'sin mensaje'}`);
  }
  return cuerpo.data.accessToken;
}

async function main() {
  const token = await login();
  const prov = await prisma.cliente.findFirst({ where: { persona: 'PROVEEDOR' }, select: { id: true } })
    ?? await prisma.cliente.findFirst({ select: { id: true } });

  // ── 1. Órdenes de compra simultáneas ───────────────────────────────────
  console.log(`1) ${N} órdenes de compra a la vez`);
  const res = await Promise.all(Array.from({ length: N }, (_, i) =>
    fetch(`${API}/compras/ordenes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        proveedorId: prov.id, sedeId: 1, moneda: 'PEN',
        observaciones: `[QA-CONC] simultánea ${i + 1}`,
        detalles: [{ descripcion: `concurrencia ${i + 1}`, cantidad: 1, precioUnitario: 10 }],
      }),
    }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }))
  ));
  const oks = res.filter((r) => r.status < 300);
  const errs = res.filter((r) => r.status >= 300);
  ok(oks.length === N, `se crearon ${oks.length} de ${N}`);
  for (const e of errs) console.log(`      ✘ HTTP ${e.status}: ${String(e.body?.message).slice(0, 90)}`);
  const nums = oks.map((r) => r.body?.data?.numero).filter((n) => n != null);
  ok(new Set(nums).size === nums.length, `números sin repetir: ${JSON.stringify(nums.sort((a, b) => a - b))}`);
  ok(nums.length === N && Math.max(...nums) - Math.min(...nums) === N - 1,
    'los números salen consecutivos, sin huecos');

  // ── 2. El correlativo del comprobante no admite duplicado ──────────────
  console.log('\n2) La numeración del comprobante no admite dos iguales');
  const ref = await prisma.comprobante.findFirst({ orderBy: { id: 'desc' } });
  if (!ref) { ok(false, 'no hay comprobantes con los que probar'); }
  else {
    const { id, creadoEn, actualizadoEn, ...resto } = ref;
    let rechazado = false, clonId = null;
    try {
      const clon = await prisma.comprobante.create({ data: { ...resto, origenDato: '[QA-DUP]' } });
      clonId = clon.id;
    } catch (e) { rechazado = e.code === 'P2002'; }
    if (clonId) await prisma.comprobante.delete({ where: { id: clonId } });
    ok(rechazado,
      `la base rechaza un segundo ${ref.serie}-${String(ref.correlativo).padStart(8, '0')}`);
  }
  // Sin la restricción, el reintento por P2002 que ya existía no podía actuar.
  const idx = await prisma.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes WHERE tablename='Comprobante' AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%correlativo%'`);
  ok(idx.length === 1, `existe el índice único del correlativo (${idx.map((i) => i.indexname).join(', ') || 'ninguno'})`);

  // ── 3. Entrar varias veces seguidas no debe chocar ─────────────────────
  console.log('\n3) Entrar 12 veces seguidas (Kaiser es multi-sede: todo pasa por select-sede)');
  // El refresh token era un JWT sobre {sub, sedeId} y su `iat`/`exp` tienen
  // resolución de un segundo: dos entradas del mismo usuario en el mismo segundo
  // generaban un token idéntico y la segunda moría con un 409 por el índice único.
  // Salía ~7 de cada 10 veces, con un mensaje que no decía nada al usuario.
  const refresh = new Set();
  let entradasOk = 0, entradasMal = 0;
  for (let i = 0; i < 12; i++) {
    const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gerencia@kaisercorp.com.pe', password: 'kaiser123' }) });
    const j = await r.json();
    if (!j.data?.requiresSedeSelection) { if (j.data?.refreshToken) refresh.add(j.data.refreshToken); entradasOk++; continue; }
    const r2 = await fetch(`${API}/auth/select-sede`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
      body: JSON.stringify({ sedeId: 1 }) });
    const j2 = await r2.json();
    if (r2.status < 300 && j2.data?.accessToken) { entradasOk++; refresh.add(j2.data.refreshToken); }
    else { entradasMal++; if (entradasMal === 1) console.log(`      ✘ HTTP ${r2.status}: ${String(j2?.message).slice(0, 90)}`); }
  }
  ok(entradasMal === 0, `las 12 entradas funcionaron (${entradasOk} ok, ${entradasMal} con error)`);
  ok(refresh.size === entradasOk, `cada sesión recibió un refresh token distinto (${refresh.size} de ${entradasOk})`);

  // ── Limpieza ───────────────────────────────────────────────────────────
  console.log('\n4) Limpieza');
  const creadas = await prisma.ordenCompra.findMany({ where: { observaciones: { contains: '[QA-CONC]' } }, select: { id: true } });
  await prisma.detalleOrdenCompra.deleteMany({ where: { ordenCompraId: { in: creadas.map((o) => o.id) } } });
  await prisma.ordenCompra.deleteMany({ where: { id: { in: creadas.map((o) => o.id) } } });
  const quedan = await prisma.ordenCompra.count({ where: { observaciones: { contains: '[QA-CONC]' } } });
  const dupsQA = await prisma.comprobante.count({ where: { origenDato: '[QA-DUP]' } });
  ok(quedan === 0 && dupsQA === 0, `${creadas.length} órdenes de prueba eliminadas, sin comprobantes de prueba`);

  console.log(fallos === 0 ? '\n✔ CONCURRENCIA: todo correcto' : `\n✘ CONCURRENCIA: ${fallos} fallos`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('✘', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
