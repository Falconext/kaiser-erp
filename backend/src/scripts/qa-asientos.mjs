/**
 * QA funcional · Fase 12 — Libro Diario (Fase 0 de CONTABILIDAD-ASIENTOS.md)
 *
 * Recorre por la API lo que la contadora haría a mano: mira el plan de cuentas,
 * registra un asiento, intenta colar uno descuadrado y uno contra una cuenta de
 * título, lo extorna, cierra el período, comprueba que el período cerrado no
 * admite nada, lo reabre y deja la base como estaba.
 *
 * Uso:  pnpm run qa:asientos
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// El runbook manda correrlo contra producción: sin esto apuntaba siempre a
// localhost y cruzaba datos de una base con la API de otra.
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
  if (r2.status >= 400 || !c?.data?.accessToken) throw new Error(`select-sede falló (HTTP ${r2.status}): ${c?.message ?? ''}`);
  return c.data.accessToken;
}

async function main() {
  const token = await login();
  // Un período que nadie usa, para no chocar con el mes real de la demo.
  const anio = 2031, mes = 3;
  const fecha = `${anio}-0${mes}-15T12:00:00.000-05:00`;
  const creados = [];

  console.log('\n═══ Plan de cuentas ═══');
  const plan = await api('/contabilidad/plan-cuentas', token);
  ok(plan.status === 200 && plan.data.length >= 100, `el plan tiene ${plan.data?.length ?? 0} cuentas (≥ 100)`);
  const por = Object.fromEntries((plan.data ?? []).map((c) => [c.codigo, c]));
  ok(por['70111']?.imputable === true, '70111 Mercaderías – Terceros es imputable');
  ok(por['70211']?.imputable === true, '70211 Productos manufacturados – Terceros es imputable');
  ok(por['70']?.imputable === false, '70 Ventas es de título: no recibe movimientos');
  ok(por['61']?.naturaleza === 'ACREEDORA', '61 Variación de existencias es acreedora');
  ok(por['709']?.naturaleza === 'DEUDORA', '709 Devoluciones sobre ventas es deudora');
  ok(por['40111']?.padreId === por['4011']?.id, '40111 cuelga de 4011');
  const imputables = await api('/contabilidad/plan-cuentas?imputables=true', token);
  ok(imputables.data.every((c) => c.imputable), 'imputables=true solo devuelve imputables');

  console.log('\n═══ Registrar ═══');
  const venta = await api('/contabilidad/asientos', token, 'POST', {
    fecha, glosa: 'QA · venta F001-1 a cliente',
    lineas: [
      { cuenta: '1212', debe: 1180, haber: 0, tipoDocSunat: '01', serie: 'F001', numero: '1' },
      { cuenta: '40111', debe: 0, haber: 180 },
      { cuenta: '70111', debe: 0, haber: 1000 },
    ],
  });
  ok(venta.status === 201, `registra un asiento de venta (HTTP ${venta.status}) ${venta.message ?? ''}`);
  if (venta.data) creados.push(venta.data.id);
  ok(venta.data?.cuo === `${anio}0${mes}-000001`, `CUO ${venta.data?.cuo} = ${anio}0${mes}-000001`);
  ok(venta.data?.totalDebe === 1180 && venta.data?.totalHaber === 1180, 'totales 1180 / 1180');
  ok(venta.data?.detalles?.length === 3 && venta.data.detalles[0].cuenta.codigo === '1212', 'tres líneas con su cuenta');
  ok(venta.data?.sedeId === SEDE, `lleva la sede del usuario (${venta.data?.sedeId})`);

  const segundo = await api('/contabilidad/asientos', token, 'POST', {
    fecha, glosa: 'QA · cobro', lineas: [{ cuenta: '1041', debe: 1180 }, { cuenta: '1212', haber: 1180 }],
  });
  if (segundo.data) creados.push(segundo.data.id);
  ok(segundo.data?.correlativo === 2, `el siguiente toma el correlativo 2 (${segundo.data?.correlativo})`);

  console.log('\n═══ Lo que no debe entrar ═══');
  const descuadrado = await api('/contabilidad/asientos', token, 'POST', {
    fecha, glosa: 'QA · descuadrado', lineas: [{ cuenta: '1212', debe: 1180 }, { cuenta: '70111', haber: 1000 }],
  });
  ok(descuadrado.status === 400 && /no cuadra/.test(descuadrado.message ?? ''), `rechaza el descuadre: "${descuadrado.message}"`);
  const titulo = await api('/contabilidad/asientos', token, 'POST', {
    fecha, glosa: 'QA · cuenta de título', lineas: [{ cuenta: '70', haber: 100 }, { cuenta: '1011', debe: 100 }],
  });
  ok(titulo.status === 400 && /no recibe movimientos/.test(titulo.message ?? ''), `rechaza la cuenta de título: "${titulo.message}"`);
  const inexistente = await api('/contabilidad/asientos', token, 'POST', {
    fecha, glosa: 'QA · cuenta inventada', lineas: [{ cuenta: '99999', haber: 100 }, { cuenta: '1011', debe: 100 }],
  });
  ok(inexistente.status === 400 && /no existe/.test(inexistente.message ?? ''), `rechaza la cuenta inexistente: "${inexistente.message}"`);
  const unaLinea = await api('/contabilidad/asientos', token, 'POST', {
    fecha, glosa: 'QA · una línea', lineas: [{ cuenta: '1011', debe: 100 }],
  });
  ok(unaLinea.status === 400, `rechaza una sola línea (HTTP ${unaLinea.status})`);

  console.log('\n═══ Listar ═══');
  const diario = await api(`/contabilidad/asientos?anio=${anio}&mes=${mes}`, token);
  ok(diario.status === 200 && diario.data.asientos.length === 2, `el diario del período trae 2 asientos (${diario.data?.asientos?.length})`);
  ok(diario.data?.totales?.debe === 2360 && diario.data?.totales?.haber === 2360, `totales del período 2360 / 2360 (${diario.data?.totales?.debe} / ${diario.data?.totales?.haber})`);
  ok(diario.data?.periodo?.estado === 'ABIERTO', 'el período se abrió solo y está ABIERTO');
  const otraSede = await api(`/contabilidad/asientos?anio=${anio}&mes=${mes}&sedeId=999999`, token);
  ok(otraSede.data?.asientos?.length === 0, 'filtrar por otra sede no trae nada');
  const uno = await api(`/contabilidad/asientos/${venta.data.id}`, token);
  ok(uno.status === 200 && uno.data.cuo === venta.data.cuo, 'obtener uno por id');

  console.log('\n═══ Extornar ═══');
  const ext = await api(`/contabilidad/asientos/${venta.data.id}/extornar`, token, 'POST', { fecha, motivo: 'QA' });
  ok(ext.status === 201, `extorna (HTTP ${ext.status}) ${ext.message ?? ''}`);
  if (ext.data) creados.push(ext.data.id);
  ok(ext.data?.origen === 'EXTORNO' && ext.data?.extornaAId === venta.data.id, 'el extorno apunta al original');
  ok(ext.data?.detalles?.[0]?.cuenta.codigo === '1212' && ext.data.detalles[0].haber === 1180, 'las líneas van invertidas (1212 al haber)');
  const original = await api(`/contabilidad/asientos/${venta.data.id}`, token);
  ok(original.data?.estado === 'EXTORNADO', 'el original queda EXTORNADO');
  const dosVeces = await api(`/contabilidad/asientos/${venta.data.id}/extornar`, token, 'POST', {});
  ok(dosVeces.status === 400, 'no se extorna dos veces');
  const extDeExt = await api(`/contabilidad/asientos/${ext.data.id}/extornar`, token, 'POST', {});
  ok(extDeExt.status === 400 && /no se extorna/.test(extDeExt.message ?? ''), 'un extorno no se extorna');
  const tras = await api(`/contabilidad/asientos?anio=${anio}&mes=${mes}`, token);
  ok(tras.data?.totales?.debe === tras.data?.totales?.haber, 'el período sigue cuadrado después del extorno');

  console.log('\n═══ Cerrar y reabrir ═══');
  const cierre = await api(`/contabilidad/periodos/${anio}/${mes}/cerrar`, token, 'POST');
  ok(cierre.status === 201 && cierre.data?.estado === 'CERRADO', `cierra el período (HTTP ${cierre.status})`);
  const enCerrado = await api('/contabilidad/asientos', token, 'POST', {
    fecha, glosa: 'QA · en período cerrado', lineas: [{ cuenta: '1011', debe: 10 }, { cuenta: '7599', haber: 10 }],
  });
  ok(enCerrado.status === 400 && /cerrado/.test(enCerrado.message ?? ''), `no admite asientos en período cerrado: "${enCerrado.message}"`);
  const extEnCerrado = await api(`/contabilidad/asientos/${segundo.data.id}/extornar`, token, 'POST', { fecha });
  ok(extEnCerrado.status === 400, 'tampoco extornos con fecha en período cerrado');
  const periodos = await api('/contabilidad/periodos', token);
  const p = periodos.data?.find((x) => x.anio === anio && x.mes === mes);
  ok(p?.estado === 'CERRADO' && p?.asientos === 3 && p?.cerradoPor, `el listado de períodos lo enseña cerrado, con 3 asientos, por ${p?.cerradoPor}`);
  const reabre = await api(`/contabilidad/periodos/${anio}/${mes}/reabrir`, token, 'POST');
  ok(reabre.status === 201 && reabre.data?.estado === 'ABIERTO', 'gerencia lo reabre');

  console.log('\n═══ Permisos ═══');
  let vendedor = null;
  try { vendedor = await login('ventas@kaisercorp.com.pe', 'kaiser123'); } catch {}
  if (vendedor) {
    const lee = await api(`/contabilidad/asientos?anio=${anio}&mes=${mes}`, vendedor);
    ok(lee.status === 200, 'ventas puede LEER el diario (las lecturas están abiertas)');
    const escribe = await api('/contabilidad/asientos', vendedor, 'POST', {
      fecha, glosa: 'QA · ventas intenta', lineas: [{ cuenta: '1011', debe: 10 }, { cuenta: '7599', haber: 10 }],
    });
    ok(escribe.status === 403, `ventas NO puede registrar (HTTP ${escribe.status})`);
  } else {
    console.log('   ⚠ sin cuenta de ventas sembrada: se omite la prueba de permisos');
  }

  console.log('\n═══ Limpieza ═══');
  await prisma.asiento.deleteMany({ where: { id: { in: creados } } });
  await prisma.periodoContable.deleteMany({ where: { anio, mes } });
  const quedan = await prisma.asiento.count({ where: { id: { in: creados } } });
  ok(quedan === 0, 'sin residuo: asientos y período de QA borrados');

  console.log(fallos ? `\n✘ ${fallos} fallo(s)\n` : '\n✔ Libro Diario: todo verde\n');
  await prisma.$disconnect();
  process.exit(fallos ? 1 : 0);
}

main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect(); process.exit(1); });
