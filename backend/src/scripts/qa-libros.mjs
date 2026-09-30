/**
 * QA funcional · Fase 17 — Libro Mayor, balance de comprobación y salida
 *
 * El Diario cuenta los hechos por fecha; el Mayor los cuenta por cuenta, que es
 * como se mira una contabilidad para saber cuánto debe un cliente o cuánto IGV
 * hay que pagar. Lo que se comprueba aquí es que los saldos SALGAN DE LOS
 * ASIENTOS y no de un acumulado guardado que pueda desincronizarse.
 *
 * Monta sus propios asientos manuales en un período libre y los borra al acabar.
 *
 * Uso:  pnpm run qa:libros
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const SEDE = 1;
const ANIO = 2034;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const c2 = (n) => Math.round(Number(n) * 100);
const S = (n) => `S/ ${Number(n).toFixed(2)}`;

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
  const ct = r.headers.get('content-type') ?? '';
  if (!ct.includes('json')) {
    const buf = Buffer.from(await r.arrayBuffer());
    return { status: r.status, texto: buf.toString('latin1'), bytes: buf.length,
      nombre: /filename="?([^"]+)"?/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? null };
  }
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j?.data, message: j?.message };
}

async function limpiar() {
  const per = await prisma.periodoContable.findMany({ where: { anio: ANIO }, select: { id: true } });
  for (const p of per) {
    const ids = (await prisma.asiento.findMany({ where: { periodoId: p.id }, select: { id: true } })).map((a) => a.id);
    if (ids.length) {
      await prisma.asiento.deleteMany({ where: { extornaAId: { in: ids } } });
      await prisma.asiento.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.periodoContable.deleteMany({ where: { id: p.id } });
  }
}

async function main() {
  const token = await login();
  await limpiar();

  try {
    // Dos meses: uno para dejar saldo de arrastre y otro para medirlo.
    const asiento = (mes, dia, lineas, glosa) =>
      api('/contabilidad/asientos', token, 'POST', {
        fecha: `${ANIO}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T12:00:00.000-05:00`,
        glosa, lineas,
      });

    console.log('\n═══ Enero deja saldo; febrero es el que se mide ═══');
    const a1 = await asiento(1, 15, [
      { cuenta: '1212', debe: 1000 }, { cuenta: '70111', haber: 1000 },
    ], 'QA-libros · venta de enero');
    ok(a1.status === 201, `asiento de enero (HTTP ${a1.status}) ${a1.message ?? ''}`);
    const a2 = await asiento(2, 10, [
      { cuenta: '1212', debe: 500 }, { cuenta: '70111', haber: 500 },
    ], 'QA-libros · venta de febrero');
    const a3 = await asiento(2, 20, [
      { cuenta: '1041', debe: 300 }, { cuenta: '1212', haber: 300 },
    ], 'QA-libros · cobro de febrero');
    ok(a2.status === 201 && a3.status === 201, 'dos asientos de febrero');

    console.log('\n═══ El mayor de una cuenta ═══');
    const m = await api(`/contabilidad/mayor?cuenta=1212&anio=${ANIO}&mes=2`, token);
    ok(m.status === 200, `responde (HTTP ${m.status})`);
    ok(c2(m.data?.saldoInicial) === c2(1000), `arrastra el saldo de enero: ${S(m.data?.saldoInicial)}`);
    ok(m.data?.lineas?.length === 2, `${m.data?.lineas?.length} movimientos en febrero`);
    ok(c2(m.data?.totales?.debe) === c2(500) && c2(m.data?.totales?.haber) === c2(300),
      `debe ${S(m.data?.totales?.debe)} · haber ${S(m.data?.totales?.haber)}`);
    ok(c2(m.data?.saldoFinal) === c2(1200), `saldo final 1000 + 500 − 300 = ${S(m.data?.saldoFinal)}`);
    ok(m.data?.naturalezaSaldo === 'DEUDORA', 'y se lee como saldo DEUDOR, sin signos');
    const saldos = m.data.lineas.map((l) => l.saldo);
    ok(c2(saldos[0]) === c2(1500) && c2(saldos[1]) === c2(1200), `el saldo va corriendo: ${saldos.join(' → ')}`);

    console.log('\n═══ Una cuenta acreedora se lee al revés ═══');
    const mv = await api(`/contabilidad/mayor?cuenta=70111&anio=${ANIO}&mes=2`, token);
    ok(c2(mv.data?.saldoInicial) === c2(1000), `70111 arrastra ${S(mv.data?.saldoInicial)} de enero`);
    ok(c2(mv.data?.saldoFinal) === c2(1500) && mv.data?.naturalezaSaldo === 'ACREEDORA',
      `y queda en ${S(mv.data?.saldoFinal)} ACREEDOR, no en negativo`);

    console.log('\n═══ Balance de comprobación ═══');
    const b = await api(`/contabilidad/mayor/balance?anio=${ANIO}&mes=2`, token);
    ok(b.status === 200 && b.data?.cuadra === true, `cuadra: debe ${S(b.data?.totales?.debe)} = haber ${S(b.data?.totales?.haber)}`);
    const f1212 = b.data.filas.find((f) => f.codigo === '1212');
    ok(!!f1212, 'la 1212 está en el balance');
    ok(c2(f1212?.saldoInicial) === c2(1000) && c2(f1212?.saldoFinal) === c2(1200),
      `con su inicial ${S(f1212?.saldoInicial)} y su final ${S(f1212?.saldoFinal)}`);
    ok(b.data.filas.every((f) => f.debe !== 0 || f.haber !== 0 || f.saldoInicial !== 0),
      'no lista cuentas que no se movieron ni traían saldo');
    ok(b.data.filas.some((f) => f.clase === '1') && b.data.filas.some((f) => f.clase === '7'),
      'agrupa por clase del PCGE');

    console.log('\n═══ Los saldos salen de los asientos, no de un acumulado ═══');
    const extra = await asiento(2, 25, [{ cuenta: '1212', debe: 77 }, { cuenta: '70111', haber: 77 }], 'QA-libros · uno más');
    const m2 = await api(`/contabilidad/mayor?cuenta=1212&anio=${ANIO}&mes=2`, token);
    ok(c2(m2.data?.saldoFinal) === c2(1277), `un asiento nuevo cambia el saldo al instante: ${S(m2.data?.saldoFinal)}`);
    await api(`/contabilidad/asientos/${extra.data.id}/extornar`, token, 'POST', { fecha: `${ANIO}-02-26T12:00:00.000-05:00`, motivo: 'QA' });
    const m3 = await api(`/contabilidad/mayor?cuenta=1212&anio=${ANIO}&mes=2`, token);
    ok(c2(m3.data?.saldoFinal) === c2(1200), `y al extornarlo vuelve a ${S(m3.data?.saldoFinal)}: nada quedó cacheado`);

    console.log('\n═══ Enero no ve lo de febrero ═══');
    const mEne = await api(`/contabilidad/mayor?cuenta=1212&anio=${ANIO}&mes=1`, token);
    ok(c2(mEne.data?.saldoInicial) === c2(0), 'enero arranca de cero: no arrastra de otro año');
    ok(c2(mEne.data?.saldoFinal) === c2(1000), `y cierra en ${S(mEne.data?.saldoFinal)}`);

    console.log('\n═══ Los archivos ═══');
    const ple = await api(`/contabilidad/ple/diario?anio=${ANIO}&mes=2`, token);
    ok(ple.status === 200 && ple.bytes > 0, `el PLE 5.1 se genera (${ple.bytes} bytes)`);
    const filas = ple.texto.split('\r\n').filter(Boolean);
    ok(filas.every((f) => f.split('|').length === 21), `las ${filas.length} líneas llevan 21 campos`);
    ok(filas[0].startsWith(`${ANIO}0200|`), `el período va como AAAAMM00: ${filas[0].split('|')[0]}`);
    ok(/^M\d{6}$/.test(filas[0].split('|')[2]), `el correlativo del asiento va como M000001: ${filas[0].split('|')[2]}`);
    ok(filas[0].split('|')[20] === '1', 'y el indicador de estado en 1');
    ok(/^LE\d{11}\d{8}050100/.test(ple.nombre ?? ''), `el nombre sigue la máscara del PLE: ${ple.nombre}`);
    const sumaDebe = filas.reduce((a, f) => a + Number(f.split('|')[17]), 0);
    const sumaHaber = filas.reduce((a, f) => a + Number(f.split('|')[18]), 0);
    ok(c2(sumaDebe) === c2(sumaHaber), `y el archivo cuadra: ${S(sumaDebe)} = ${S(sumaHaber)}`);

    const pleM = await api(`/contabilidad/ple/mayor?anio=${ANIO}&mes=2`, token);
    ok(pleM.status === 200 && pleM.texto.split('\r\n').filter(Boolean).every((f) => f.split('|').length === 7),
      'el PLE 6.1 sale con 7 campos');
    ok(/060100/.test(pleM.nombre ?? ''), `con su identificador de libro: ${pleM.nombre}`);

    const xls = await api(`/contabilidad/asientos/exportar?anio=${ANIO}&mes=2`, token);
    ok(xls.status === 200 && xls.bytes > 0, `el Excel para la contadora se descarga (${xls.bytes} bytes)`);
    ok(/Asientos-${ANIO}02/.test(xls.nombre ?? '') || (xls.nombre ?? '').includes(String(ANIO)), `con su nombre: ${xls.nombre}`);

    console.log('\n═══ Lo que no existe, falla ═══');
    const mala = await api(`/contabilidad/mayor?cuenta=99999&anio=${ANIO}&mes=2`, token);
    ok(mala.status === 400 && /no existe/.test(mala.message ?? ''), `una cuenta inventada se rechaza: "${mala.message}"`);
    const sinCuenta = await api(`/contabilidad/mayor?anio=${ANIO}&mes=2`, token);
    ok(sinCuenta.status === 400, 'sin cuenta, también');
    const libroMalo = await api(`/contabilidad/ple/inventado?anio=${ANIO}&mes=2`, token);
    ok(libroMalo.status === 400, 'un libro que no es diario ni mayor, también');

    console.log('\n═══ Permisos ═══');
    let vendedor = null;
    try { vendedor = await login('ventas@kaisercorp.com.pe'); } catch {}
    if (vendedor) {
      const r = await api(`/contabilidad/mayor/balance?anio=${ANIO}&mes=2`, vendedor);
      ok(r.status === 200, `ventas puede LEER el balance (HTTP ${r.status}): las lecturas están abiertas`);
    }
  } finally {
    console.log('\n═══ Limpieza ═══');
    await limpiar();
    const quedan = await prisma.asiento.count({ where: { periodo: { anio: ANIO } } });
    ok(quedan === 0, 'sin residuo: los asientos de prueba ya no están');
  }

  console.log(fallos ? `\n✘ ${fallos} fallo(s)\n` : '\n✔ Libro Mayor, balance y salida: todo verde\n');
  await prisma.$disconnect();
  process.exit(fallos ? 1 : 0);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect(); process.exit(1); });
