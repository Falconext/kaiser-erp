/**
 * QA funcional · Qué ve cada rol en el panel
 *
 * `/analisis-financiero/pnl` y `/finanzas/resumen` están cerrados con permiso, y
 * está bien. Pero `/dashboard/overview` devolvía el bloque `financiero` a
 * cualquiera: compras, gastos, ganancias y margen de la empresa. Era una puerta
 * lateral que rodeaba esos dos 403 — un vendedor veía el gasto mensual y la
 * utilidad que el permiso le niega en la ruta de al lado.
 *
 * Lo que se fija aquí:
 *   · gerencia y contabilidad SÍ ven compras, gastos, ganancias y margen
 *   · ventas, almacén y producción NO
 *   · pero todos siguen viendo `ingresos`: las ventas de la empresa se comparten a
 *     propósito, el ranking de vendedores vive de eso. La línea es cuánto ENTRA
 *     sí, cuánto cuesta y cuánto queda no
 *   · y las dos rutas financieras siguen dando 403 a quien no le toca
 *
 * No escribe nada: son todas lecturas.
 *
 * Uso:  pnpm run qa:panel-permisos
 */
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

const CON_FINANZAS = ['gerencia', 'contabilidad'];
const SIN_FINANZAS = ['ventas', 'almacen', 'produccion'];
const SENSIBLES = ['compras', 'gastos', 'ganancias', 'margen'];

async function login(usuario) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${usuario}@kaisercorp.com.pe`, password: 'kaiser123' }),
  });
  const j = await r.json();
  if (!j.data) throw new Error(`login de ${usuario} falló: ${j?.message}`);
  if (!j.data.requiresSedeSelection) return j.data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
    body: JSON.stringify({ sedeId: SEDE }),
  });
  return (await r2.json()).data.accessToken;
}
async function api(ruta, token) {
  const r = await fetch(API + ruta, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j?.data };
}

const OVERVIEW = '/dashboard/overview?fechaInicio=2026-09-01&fechaFin=2026-09-30';

async function main() {
  console.log(`\nQA · Qué ve cada rol en el panel\n${'═'.repeat(50)}`);

  console.log('\n1) Quién SÍ ve las finanzas de la empresa');
  for (const u of CON_FINANZAS) {
    const t = await login(u);
    const r = await api(OVERVIEW, t);
    const f = r.data?.financiero ?? {};
    const tiene = SENSIBLES.filter((k) => k in f);
    ok(r.status === 200, `${u}: el panel responde (HTTP ${r.status})`);
    ok(tiene.length === SENSIBLES.length, `${u}: ve ${tiene.join(', ') || 'nada'}`);
  }

  console.log('\n2) Quién NO, y que el panel no sea la puerta de atrás');
  for (const u of SIN_FINANZAS) {
    const t = await login(u);
    const r = await api(OVERVIEW, t);
    const f = r.data?.financiero ?? {};
    const filtrados = SENSIBLES.filter((k) => k in f);
    ok(r.status === 200, `${u}: el panel sigue abriéndose (HTTP ${r.status})`);
    ok(filtrados.length === 0, `${u}: no recibe ${SENSIBLES.join('/')}${filtrados.length ? ` — se filtró ${filtrados.join(', ')}` : ''}`);
    ok('ingresos' in f, `${u}: pero sí las ventas de la empresa (el ranking vive de eso)`);

    const pnl = await api('/analisis-financiero/pnl?mes=9&anio=2026', t);
    ok(pnl.status === 403, `${u}: el P&L le da 403`);
    const fin = await api('/finanzas/resumen', t);
    ok(fin.status === 403, `${u}: y Finanzas también`);
  }

  console.log('\n3) El panel operativo sigue completo para todos');
  const tv = await login('ventas');
  const r = await api(OVERVIEW, tv);
  for (const k of ['kpis', 'chartVentas', 'topProductos', 'alertas']) {
    ok(r.data?.[k] != null, `ventas recibe ${k}`);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(fallos ? `✘ PANEL: ${fallos} problema(s)` : '✔ PANEL: cada rol ve lo suyo');
}

main()
  .catch((e) => { console.error('\n✘ error:', e.message); fallos++; })
  .finally(() => process.exit(fallos ? 1 : 0));
