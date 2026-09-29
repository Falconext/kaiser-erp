/**
 * QA funcional · los bordes de los filtros por fecha
 *
 * Perú está en UTC-5, así que `new Date('2026-09-30')` es medianoche UTC: las 19:00
 * del 29 en Lima. Un rango construido así queda corrido cinco horas, y según dónde
 * caiga el corte pierde el último día completo o se cuela el anterior.
 *
 * Pasó en cuatro sitios. En guías de remisión, pedir «setiembre» devolvía del 31 de
 * agosto a las 19:00 al 29 de setiembre a las 19:00: se perdía el último día y medio
 * del mes, justo en el cierre, que es cuando se mira.
 *
 * Aquí se prueba el borde: un documento a las 23:00 del último día del rango tiene
 * que entrar, y uno del día siguiente no. Es el caso que se escapa.
 *
 * Crea sus propios documentos y los borra.
 */
import { PrismaClient } from '@prisma/client';

/** Fecha de hoy en Lima (no en UTC): entre las 19:00 y medianoche no son la misma. */
const hoyLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
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
const lista = (d) => (Array.isArray(d) ? d : (d?.items ?? d?.data ?? d?.movimientos ?? d?.guias ?? []));

async function main() {
  const tk = await token();
  const get = async (ruta) => {
    const r = await fetch(API + ruta, { headers: { Authorization: `Bearer ${tk}` } });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, items: lista(j?.data) };
  };

  // Un mes cerrado y tranquilo, con sus bordes: el último día a las 23:00 (Lima) y
  // el primero del mes siguiente a las 00:30.
  const DIA_FIN = '2026-07-31';
  const DIA_SIG = '2026-08-01';
  const dentro = new Date('2026-07-31T23:00:00-05:00');
  const fuera = new Date('2026-08-01T00:30:00-05:00');
  const creados = { compras: [], guias: [] };
  const prov = await prisma.cliente.findFirst({ where: { persona: 'PROVEEDOR' }, select: { id: true } })
    ?? await prisma.cliente.findFirst({ select: { id: true } });
  const emp = await prisma.empresa.findFirst({ select: { id: true } });

  try {
    console.log(`Rango de prueba: 2026-07-01 a ${DIA_FIN}`);
    console.log(`  · un documento del ${DIA_FIN} a las 23:00 de Lima debe ENTRAR`);
    console.log(`  · uno del ${DIA_SIG} a las 00:30 NO\n`);

    // ── Compras ───────────────────────────────────────────────────────────
    console.log('1) Listado de compras');
    for (const [etiqueta, fecha] of [['borde', dentro], ['siguiente', fuera]]) {
      const c = await prisma.compra.create({
        data: { empresaId: emp.id, proveedorId: prov.id, tipoDoc: 'FACTURA', serie: 'QRF',
          numero: `${etiqueta}${Date.now().toString().slice(-6)}`, fechaEmision: fecha,
          moneda: 'PEN', total: 100, saldo: 100, sedeId: SEDE,
          observaciones: `[QA-RF] ${etiqueta}` } });
      creados.compras.push(c.id);
    }
    const compras = await get(`/compras?fechaInicio=2026-07-01&fechaFin=${DIA_FIN}&limit=200`);
    ok(compras.status === 200, `responde (HTTP ${compras.status})`);
    const idsC = compras.items.map((x) => x.id);
    ok(idsC.includes(creados.compras[0]),
      `la compra del ${DIA_FIN} a las 23:00 está en el rango`);
    ok(!idsC.includes(creados.compras[1]),
      `y la del ${DIA_SIG} no`);

    // ── Guías de remisión ─────────────────────────────────────────────────
    console.log('\n2) Listado de guías de remisión');
    const empresa = await prisma.empresa.findFirst({
      select: { ruc: true, razonSocial: true, direccion: true } });
    const cliente = await prisma.cliente.findFirst({
      select: { nroDoc: true, nombre: true, tipoDocumento: { select: { codigo: true } } } });
    for (const [etiqueta, fecha] of [['borde', dentro], ['siguiente', fuera]]) {
      const g = await prisma.guiaRemision.create({
        data: {
          empresaId: emp.id, serie: 'TQRF',
          correlativo: Number(String(Date.now()).slice(-7)) + (etiqueta === 'borde' ? 0 : 1),
          fechaEmision: fecha, fechaInicioTraslado: fecha, tipoDocumento: '09',
          remitenteRuc: empresa.ruc, remitenteRazonSocial: empresa.razonSocial,
          remitenteDireccion: empresa.direccion ?? 'Sin dirección',
          destinatarioTipoDoc: cliente.tipoDocumento?.codigo ?? '6',
          destinatarioNumDoc: cliente.nroDoc, destinatarioRazonSocial: cliente.nombre,
          tipoTraslado: '01', modoTransporte: '02', pesoTotal: 1,
          partidaUbigeo: '150115', partidaDireccion: 'Almacén de prueba',
          llegadaUbigeo: '150115', llegadaDireccion: 'Destino de prueba',
          observaciones: `[QA-RF] ${etiqueta}`, sedeId: SEDE,
        },
      }).catch((e) => { console.log(`      (no se pudo crear la guía ${etiqueta}: ${String(e.message).split('\n').pop()?.slice(0, 90)})`); return null; });
      if (g) creados.guias.push(g.id);
    }
    if (creados.guias.length === 2) {
      const guias = await get(`/guia-remision?fechaInicio=2026-07-01&fechaFin=${DIA_FIN}&limit=200`);
      ok(guias.status === 200, `responde (HTTP ${guias.status})`);
      const idsG = guias.items.map((x) => x.id);
      ok(idsG.includes(creados.guias[0]),
        `la guía del ${DIA_FIN} a las 23:00 está en el rango`);
      ok(!idsG.includes(creados.guias[1]), `y la del ${DIA_SIG} no`);
    } else {
      ok(false, `no se pudieron crear las guías de prueba (${creados.guias.length}/2)`);
    }

    // ── Consolidado de kardex, que ya se corrigió en la Fase 3 ────────────
    console.log('\n3) Consolidado de kardex (ya corregido en la Fase 3, se vigila)');
    const hoy = hoyLima();
    const cons = await get(`/kardex/consolidado?tipo=TODOS&desde=${hoy}&hasta=${hoy}`);
    ok(cons.status === 200, `responde para hoy (HTTP ${cons.status})`);
    const consAyer = await get(`/kardex/consolidado?tipo=TODOS&desde=2026-07-01&hasta=${DIA_FIN}`);
    ok(consAyer.status === 200, `y para un mes cerrado (HTTP ${consAyer.status})`);
  } finally {
    console.log('\n4) Limpieza');
    await prisma.guiaRemision.deleteMany({ where: { id: { in: creados.guias } } });
    await prisma.compra.deleteMany({ where: { id: { in: creados.compras } } });
    const quedan = (await prisma.compra.count({ where: { serie: 'QRF' } }))
      + (await prisma.guiaRemision.count({ where: { serie: 'TQRF' } }));
    ok(quedan === 0, `documentos de prueba eliminados (quedan ${quedan})`);
    await prisma.$disconnect();
  }

  console.log(fallos === 0 ? '\n✔ RANGOS DE FECHA: los bordes entran donde deben' : `\n✘ ${fallos} comprobaciones fallidas`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
