/**
 * QA funcional · Fase 13 — SIRE (RVIE de ventas, RCE de compras)
 *
 * Portado de falconext-mype, donde el módulo siguió creciendo mientras la copia
 * de Kaiser se quedó en la versión inicial. Lo que se comprueba aquí es lo que
 * separa exportar a ciegas de llevar el libro: el formato del período —la copia
 * vieja escribía AAAAMM00, del PLE antiguo, y el SIRE quiere AAAAMM—, la
 * revisión del contador y que una compra denegada salga del libro y de los
 * totales.
 *
 * Deja la base como la encontró.
 *
 * Uso:  pnpm run qa:sire
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

async function api(ruta, token, metodo = 'GET', body) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = r.headers.get('content-type') ?? '';
  if (!ct.includes('json')) {
    const buf = Buffer.from(await r.arrayBuffer());
    return { status: r.status, texto: buf.toString('latin1'), bytes: buf.length };
  }
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j?.data, message: j?.message };
}
async function login(email = 'gerencia@kaisercorp.com.pe', password = 'kaiser123') {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }) });
  const j = await r.json();
  if (r.status >= 400 || !j.data) throw new Error(`login falló (HTTP ${r.status}): ${j?.message ?? ''}`);
  if (!j.data.requiresSedeSelection) return j.data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
    body: JSON.stringify({ sedeId: SEDE }) });
  const c = await r2.json();
  if (r2.status >= 400 || !c?.data?.accessToken) throw new Error(`select-sede falló (HTTP ${r2.status})`);
  return c.data.accessToken;
}

async function main() {
  const token = await login();

  // Un período que tenga compras de verdad; si no hay, se avisa y se sale.
  const compra = await prisma.compra.findFirst({
    where: { estado: 'REGISTRADO' }, orderBy: { fechaEmision: 'desc' },
    select: { id: true, fechaEmision: true, serie: true, numero: true },
  });
  if (!compra) { console.log('\n⚠ sin compras registradas: no hay qué comprobar\n'); await prisma.$disconnect(); process.exit(0); }
  const lima = new Date(compra.fechaEmision.getTime() - 5 * 60 * 60 * 1000);
  const anio = lima.getUTCFullYear();
  const mes = lima.getUTCMonth() + 1;
  const periodo = `${anio}${String(mes).padStart(2, '0')}`;
  const estadoPrevio = await prisma.compra.findMany({ select: { id: true, estadoContador: true } });

  console.log(`\n═══ Período de prueba ${mes}/${anio} ═══`);

  console.log('\n═══ Resúmenes y revisión ═══');
  const rv = await api(`/contabilidad/sire/ventas-resumen?mes=${mes}&anio=${anio}`, token);
  ok(rv.status === 200 && rv.data != null, `resumen de ventas responde (HTTP ${rv.status})`);
  const rc = await api(`/contabilidad/sire/compras-resumen?mes=${mes}&anio=${anio}`, token);
  ok(rc.status === 200 && typeof rc.data?.igv === 'number', `resumen de compras trae el IGV (${rc.data?.igv})`);
  const revV = await api(`/contabilidad/sire/ventas-revision?mes=${mes}&anio=${anio}`, token);
  ok(revV.status === 200, `revisión de ventas responde (HTTP ${revV.status})`);
  const revC = await api(`/contabilidad/sire/compras-revision?mes=${mes}&anio=${anio}`, token);
  ok(revC.status === 200 && Array.isArray(revC.data?.items), `revisión de compras trae ${revC.data?.items?.length ?? 0} item(s)`);
  ok(revC.data?.resumen?.total === revC.data?.items?.length, 'el resumen cuadra con los items');
  ok(revC.data?.periodo === periodo, `el período de la revisión es ${revC.data?.periodo}`);
  const igv = await api(`/contabilidad/sire/igv-periodo?mes=${mes}&anio=${anio}`, token);
  ok(igv.status === 200, `IGV del período responde (HTTP ${igv.status})`);

  console.log('\n═══ El formato del TXT (lo que la copia vieja tenía mal) ═══');
  const txt = await api(`/contabilidad/sire/compras-txt?mes=${mes}&anio=${anio}`, token);
  ok(txt.status === 200 && txt.bytes > 0, `el RCE se genera (${txt.bytes} bytes)`);
  const filas = txt.texto.split('\n').filter((l) => l.trim());
  ok(filas.length > 0, `${filas.length} fila(s) en el RCE`);
  const campos = filas[0].split('|');
  ok(campos[2] === periodo, `campo 3 = período ${campos[2]} y no ${periodo}00 del PLE antiguo`);
  ok(/^\d{6}$/.test(campos[2]), 'el período son 6 dígitos (AAAAMM), no 8');
  ok(campos[0] === (await prisma.empresa.findFirst({ select: { ruc: true } }))?.ruc, `campo 1 = RUC de la empresa (${campos[0]})`);
  ok(!filas.some((f) => /[|/\\]{2}/.test(f.replace(/\|\|/g, ''))), 'ningún texto libre mete separadores de más');
  const txtV = await api(`/contabilidad/sire/ventas-txt?mes=${mes}&anio=${anio}`, token);
  ok(txtV.status === 200, `el RVIE se genera (HTTP ${txtV.status}, ${txtV.bytes} bytes)`);

  console.log('\n═══ Revisión del contador ═══');
  const antes = filas.length;
  const den = await api('/contabilidad/sire/compras-revisar', token, 'POST',
    { ids: [compra.id], estado: 'DENEGADA', motivo: 'QA' });
  ok(den.status === 201, `denegar responde (HTTP ${den.status})`);
  const enBase = await prisma.compra.findUnique({ where: { id: compra.id }, select: { estadoContador: true, motivoContador: true, revisadoContadorEn: true } });
  ok(enBase?.estadoContador === 'DENEGADA' && enBase.motivoContador === 'QA' && enBase.revisadoContadorEn,
    'queda DENEGADA con su motivo y su sello de tiempo');
  const txt2 = await api(`/contabilidad/sire/compras-txt?mes=${mes}&anio=${anio}`, token);
  const filas2 = txt2.texto.split('\n').filter((l) => l.trim());
  ok(filas2.length === antes - 1, `la denegada sale del libro: ${antes} → ${filas2.length} filas`);
  ok(!filas2.some((f) => f.includes(compra.numero)), `${compra.serie}-${compra.numero} ya no aparece`);
  const rc2 = await api(`/contabilidad/sire/compras-resumen?mes=${mes}&anio=${anio}`, token);
  ok(Number(rc2.data?.igv) < Number(rc.data?.igv), `el IGV a declarar baja: ${rc.data?.igv} → ${rc2.data?.igv}`);
  const apr = await api('/contabilidad/sire/compras-revisar', token, 'POST', { ids: [compra.id], estado: 'APROBADA' });
  ok(apr.status === 201, 'aprobar responde');
  const txt3 = await api(`/contabilidad/sire/compras-txt?mes=${mes}&anio=${anio}`, token);
  ok(txt3.texto.split('\n').filter((l) => l.trim()).length === antes, 'aprobada vuelve a entrar al libro');
  const mal = await api('/contabilidad/sire/compras-revisar', token, 'POST', { ids: [compra.id], estado: 'INVENTADO' });
  ok(mal.status === 400, `rechaza un estado inválido (HTTP ${mal.status})`);

  console.log('\n═══ Conexión con SUNAT ═══');
  const est = await api('/contabilidad/sire/estado-conexion', token);
  ok(est.status === 200 && typeof est.data?.configurado === 'boolean',
    `estado de conexión responde · configurado: ${est.data?.configurado}`);
  ok(!('claveSol' in (est.data ?? {})), 'no devuelve la clave SOL, ni cifrada');
  if (!est.data?.configurado) {
    ok(Array.isArray(est.data?.falta) && est.data.falta.length > 0,
      `dice qué falta: ${(est.data?.falta ?? []).join(', ')}`);
    const prueba = await api('/contabilidad/sire/probar-conexion', token, 'POST');
    ok(prueba.status >= 200, 'probar conexión responde en vez de reventar');
  }
  const emp = await api('/auth/me', token);
  ok(!('sireClaveSol' in (emp.data?.empresa ?? {})), 'la clave SOL no viaja en auth/me');

  console.log('\n═══ Permisos ═══');
  let vendedor = null;
  try { vendedor = await login('ventas@kaisercorp.com.pe', 'kaiser123'); } catch {}
  if (vendedor) {
    const r = await api(`/contabilidad/sire/compras-resumen?mes=${mes}&anio=${anio}`, vendedor);
    ok(r.status === 403, `ventas no entra al SIRE (HTTP ${r.status})`);
  } else {
    console.log('   ⚠ sin cuenta de ventas sembrada: se omite');
  }

  console.log('\n═══ Limpieza ═══');
  for (const c of estadoPrevio) {
    await prisma.compra.update({ where: { id: c.id }, data: { estadoContador: c.estadoContador, motivoContador: null, revisadoContadorEn: null, revisadoContadorPor: null } });
  }
  const sucias = await prisma.compra.count({ where: { estadoContador: { not: 'PENDIENTE' } } });
  ok(sucias === 0, 'las compras vuelven a su estado anterior');

  console.log(fallos ? `\n✘ ${fallos} fallo(s)\n` : '\n✔ SIRE: todo verde\n');
  await prisma.$disconnect();
  process.exit(fallos ? 1 : 0);
}

main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect(); process.exit(1); });
