/**
 * QA funcional · Fase 16 — Planilla importada
 *
 * El ERP no calcula la planilla: la recibe. Lo que se comprueba es que la reciba
 * bien y que el asiento de provisión salga correcto, porque ahí es donde el
 * error se paga caro.
 *
 * Fabrica sus propios Excel con `xlsx`, incluidos los que están mal a propósito,
 * y deja la base como la encontró.
 *
 * Uso:  pnpm run qa:planilla
 */
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const SEDE = 1;
const MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ANIO = 2033, MES = 4;   // período libre: no pisa datos de la demo
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
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j?.data, message: j?.message };
}
/** Sube un Excel construido en memoria. */
async function subir(token, filas, { anio = ANIO, mes = MES, simular = false, hoja = 'PLANILLA' } = {}) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), hoja);
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: MIME }), 'planilla.xlsx');
  fd.append('anio', String(anio));
  fd.append('mes', String(mes));
  const r = await fetch(`${API}/contabilidad/planilla/importar${simular ? '?simular=true' : ''}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j?.data, message: j?.message };
}

/** Un trabajador coherente: ingresos − descuentos = neto. */
const trabajador = (i, extra = {}) => {
  const basico = 1500 + i * 100, asig = 113, extras = i * 30;
  const ing = basico + asig + extras;
  const afp = Math.round(ing * 0.1298 * 100) / 100;
  const renta = i === 0 ? 0 : 40;
  const desc = Math.round((afp + renta) * 100) / 100;
  return {
    DNI: String(40000000 + i), NOMBRES: `TRABAJADOR QA ${i + 1}`,
    BASICO: basico, ASIGNACION_FAMILIAR: asig, HORAS_EXTRAS: extras, COMISIONES: 0,
    BONIFICACIONES: 0, GRATIFICACION: 0, VACACIONES: 0, CTS: 0, TOTAL_INGRESOS: ing,
    AFP: afp, ONP: 0, RENTA_5TA: renta, OTROS_DESCUENTOS: 0, TOTAL_DESCUENTOS: desc,
    NETO: Math.round((ing - desc) * 100) / 100, ESSALUD: Math.round(ing * 0.09 * 100) / 100,
    ...extra,
  };
};

const linea = (a, codigo) => a.detalles.find((d) => d.cuenta.codigo === codigo);

async function limpiar() {
  const ps = await prisma.planillaImportada.findMany({ where: { anio: ANIO }, select: { id: true, gastoId: true, asientoId: true } });
  for (const p of ps) {
    if (p.asientoId) {
      const a = await prisma.asiento.findUnique({ where: { id: p.asientoId }, select: { periodoId: true } });
      await prisma.asiento.deleteMany({ where: { OR: [{ id: p.asientoId }, { extornaAId: p.asientoId }] } });
      if (a) await prisma.periodoContable.deleteMany({ where: { id: a.periodoId, asientos: { none: {} } } });
    }
    if (p.gastoId) await prisma.gastoOperativo.deleteMany({ where: { id: p.gastoId } });
    await prisma.planillaImportada.delete({ where: { id: p.id } }).catch(() => {});
  }
  await prisma.periodoContable.deleteMany({ where: { anio: ANIO, asientos: { none: {} } } });
}

async function main() {
  const token = await login();
  await limpiar();

  try {
    console.log('\n═══ La plantilla que se descarga ═══');
    const r = await fetch(`${API}/contabilidad/planilla/plantilla`, { headers: { Authorization: `Bearer ${token}` } });
    const buf = Buffer.from(await r.arrayBuffer());
    ok(r.status === 200 && buf.length > 0, `se descarga (HTTP ${r.status}, ${buf.length} bytes)`);
    const wb = XLSX.read(buf, { type: 'buffer' });
    ok(wb.SheetNames.includes('PLANILLA'), `trae la hoja PLANILLA (${wb.SheetNames.join(', ')})`);
    ok(wb.SheetNames.includes('INSTRUCCIONES'), 'y una hoja de instrucciones');
    const cols = Object.keys(XLSX.utils.sheet_to_json(wb.Sheets.PLANILLA)[0] ?? {});
    ok(cols.length === 18, `con sus ${cols.length} columnas`);
    ok(cols.includes('ESSALUD') && cols.includes('NETO'), 'incluidas ESSALUD y NETO');

    console.log('\n═══ Vista previa: lee y no escribe ═══');
    const filas = [trabajador(0), trabajador(1), trabajador(2)];
    const sim = await subir(token, filas, { simular: true });
    ok(sim.status === 201, `simula (HTTP ${sim.status}) ${sim.message ?? ''}`);
    ok(sim.data?.simulado === true, 'se declara simulación');
    ok(sim.data?.totales?.trabajadores === 3, `lee ${sim.data?.totales?.trabajadores} trabajadores`);
    ok(sim.data?.errores?.length === 0, 'sin errores');
    ok(sim.data?.filas?.length === 3, 'devuelve el detalle para la vista previa');
    ok((await prisma.planillaImportada.count({ where: { anio: ANIO } })) === 0,
      'y no escribió NADA en la base');

    console.log('\n═══ Lo que está mal, se rechaza ═══');
    const malNeto = await subir(token, [trabajador(0), { ...trabajador(1), NETO: 999 }], { simular: true });
    ok(malNeto.data?.errores?.length === 1, `una fila con el neto descuadrado da 1 error (${malNeto.data?.errores?.length})`);
    ok(/NETO dice 999/.test(malNeto.data?.errores?.[0] ?? ''), `y dice exactamente qué pasa: "${(malNeto.data?.errores?.[0] ?? '').slice(0, 80)}"`);
    ok(malNeto.data?.totales?.trabajadores === 1, 'la fila mala no cuenta, la buena sí');

    const sinNombre = await subir(token, [{ ...trabajador(0), NOMBRES: '' }], { simular: true });
    ok((sinNombre.data?.errores ?? []).some((e) => /nombre/i.test(e)), 'una fila sin nombre se rechaza');

    const sinColumna = await subir(token, [{ DNI: '1', BASICO: 100 }], { simular: true });
    ok((sinColumna.data?.errores ?? []).some((e) => /Falta la columna/i.test(e)),
      `si falta una columna obligatoria lo dice: "${(sinColumna.data?.errores ?? [])[0]?.slice(0, 60)}"`);

    console.log('\n═══ Columnas con otro nombre y columnas de más ═══');
    const otroNombre = filas.map((f) => ({
      'Documento': f.DNI, 'Apellidos y Nombres': f.NOMBRES, 'Sueldo Básico': f.BASICO,
      'Asig. Familiar': f.ASIGNACION_FAMILIAR, 'Sobretiempo': f.HORAS_EXTRAS,
      'Total Haberes': f.TOTAL_INGRESOS, 'Descuento AFP': f.AFP, 'Renta Quinta': f.RENTA_5TA,
      'Total Descuentos': f.TOTAL_DESCUENTOS, 'Neto a Pagar': f.NETO, 'Aporte EsSalud': f.ESSALUD,
      'CENTRO DE COSTO': 'PLANTA',
    }));
    const otro = await subir(token, otroNombre, { simular: true });
    ok(otro.data?.totales?.trabajadores === 3, 'reconoce las columnas aunque el software las llame de otra forma');
    ok(otro.data?.columnasIgnoradas?.includes('CENTRO DE COSTO'), 'y avisa de la columna que no usa');

    console.log('\n═══ Importar de verdad ═══');
    const imp = await subir(token, filas);
    ok(imp.status === 201, `importa (HTTP ${imp.status}) ${imp.message ?? ''}`);
    ok(imp.data?.planillaId > 0, `guarda la planilla (id ${imp.data?.planillaId})`);
    ok(imp.data?.gastoId > 0, 'crea el gasto del mes');
    ok(!!imp.data?.asiento?.cuo, `y su asiento ${imp.data?.asiento?.cuo}`);

    const gasto = await prisma.gastoOperativo.findUnique({ where: { id: imp.data.gastoId } });
    ok(gasto?.categoria === 'SUELDOS', `el gasto va a la categoría ${gasto?.categoria}`);
    const t = sim.data.totales;
    ok(c2(gasto?.monto) === c2(t.totalIngresos + t.essalud),
      `por el COSTO DE EMPRESA (ingresos + EsSalud = ${S(t.totalIngresos + t.essalud)}), no por el neto`);

    const detalles = await prisma.planillaImportadaDetalle.count({ where: { planillaId: imp.data.planillaId } });
    ok(detalles === 3, `guarda el detalle por trabajador (${detalles} filas) para poder auditarlo`);

    console.log('\n═══ El asiento de provisión ═══');
    const diario = await api(`/contabilidad/asientos?anio=${ANIO}&mes=${MES}&origen=PLANILLA`, token);
    const a = diario.data?.asientos?.[0];
    ok(!!a, 'el asiento está en el Libro Diario');
    ok(c2(a?.totalDebe) === c2(a?.totalHaber), `cuadra: ${S(a?.totalDebe)}`);
    const sueldos = linea(a, '6211'), essaludGasto = linea(a, '6271');
    const neto = linea(a, '4111'), afp = linea(a, '407'), renta = linea(a, '40173'), essaludPagar = linea(a, '4031');
    ok(sueldos?.debe > 0, `6211 sueldos al debe: ${S(sueldos?.debe)}`);
    ok(c2(essaludGasto?.debe) === c2(t.essalud), `6271 EsSalud del empleador al debe: ${S(essaludGasto?.debe)}`);
    ok(c2(neto?.haber) === c2(t.neto), `4111 neto por pagar: ${S(neto?.haber)}`);
    ok(c2(afp?.haber) === c2(t.afp), `407 AFP retenida: ${S(afp?.haber)}`);
    ok(c2(renta?.haber) === c2(t.rentaQuinta), `40173 renta de 5ta: ${S(renta?.haber)}`);
    ok(c2(essaludPagar?.haber) === c2(t.essalud), 'el EsSalud aparece DOS veces: gasto al debe y deuda al haber');
    ok(c2(sueldos?.debe + essaludGasto?.debe) === c2(t.totalIngresos + t.essalud),
      'el debe total es lo que le cuesta a la empresa');

    console.log('\n═══ El mismo mes no se importa dos veces ═══');
    const dup = await subir(token, filas);
    ok(dup.status === 400 && /ya se importó/.test(dup.message ?? ''),
      `se rechaza y explica qué hacer: "${(dup.message ?? '').slice(0, 70)}"`);
    const dupSim = await subir(token, filas, { simular: true });
    ok(!!dupSim.data?.yaImportada, 'y la vista previa avisa antes de intentarlo');

    console.log('\n═══ Historial y detalle ═══');
    const hist = await api('/contabilidad/planilla', token);
    const h = (hist.data ?? []).find((x) => x.anio === ANIO && x.mes === MES);
    ok(!!h, 'aparece en el historial');
    ok(h?.asiento?.cuo === imp.data.asiento.cuo, 'con su asiento enlazado');
    ok(c2(h?.costoEmpresa) === c2(t.totalIngresos + t.essalud), `y el costo de empresa: ${S(h?.costoEmpresa)}`);
    const det = await api(`/contabilidad/planilla/${imp.data.planillaId}`, token);
    ok(det.data?.detalles?.length === 3, 'el detalle por trabajador se puede consultar');
    ok(det.data?.detalles?.[0]?.nombres?.startsWith('TRABAJADOR QA'), 'con su nombre');

    console.log('\n═══ No se borra con el asiento vigente ═══');
    const borrar = await api(`/contabilidad/planilla/${imp.data.planillaId}`, token, 'DELETE');
    ok(borrar.status === 400 && /[Ee]xt[óo]rnalo/.test(borrar.message ?? ''),
      `primero se deshace la contabilidad: "${(borrar.message ?? '').slice(0, 70)}"`);
    await api(`/contabilidad/asientos/${imp.data.asiento.id}/extornar`, token, 'POST', { motivo: 'QA' });
    const borrar2 = await api(`/contabilidad/planilla/${imp.data.planillaId}`, token, 'DELETE');
    ok(borrar2.status < 300, 'extornado el asiento, ya se puede borrar');
    ok((await prisma.gastoOperativo.count({ where: { id: imp.data.gastoId } })) === 0,
      'y se lleva su gasto: no quedan gastos huérfanos');

    console.log('\n═══ Permisos ═══');
    let vendedor = null;
    try { vendedor = await login('ventas@kaisercorp.com.pe'); } catch {}
    if (vendedor) {
      const lee = await api('/contabilidad/planilla', vendedor);
      ok(lee.status === 403, `ventas NO ve las planillas (HTTP ${lee.status}): llevan el sueldo de cada persona`);
      const sube = await subir(vendedor, filas, { simular: true });
      ok(sube.status === 403, `ni puede subirlas (HTTP ${sube.status})`);
    }
  } finally {
    console.log('\n═══ Limpieza ═══');
    await limpiar();
    const quedan = await prisma.planillaImportada.count({ where: { anio: ANIO } });
    ok(quedan === 0, 'sin residuo: planillas, gastos y asientos de prueba borrados');
  }

  console.log(fallos ? `\n✘ ${fallos} fallo(s)\n` : '\n✔ Planilla importada: el ERP la recibe y la contabiliza\n');
  await prisma.$disconnect();
  process.exit(fallos ? 1 : 0);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect(); process.exit(1); });
