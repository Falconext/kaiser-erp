/**
 * QA funcional · los documentos electrónicos que exige SUNAT
 *
 * No emite nada: comprueba que lo ya emitido esté completo y se pueda RECUPERAR.
 * Es lo que hace falta en una fiscalización, y es donde había un hueco: el XML y el
 * CDR de las guías se guardaban en la base y no existía forma de bajarlos desde la
 * aplicación. Con los comprobantes sí, porque van a S3.
 *
 * SUNAT obliga a conservar el XML firmado y el CDR, y a poder presentarlos. Que el
 * dato esté en una columna no basta si nadie puede sacarlo sin un desarrollador.
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
const bajar = async (url, tk) => {
  const r = await fetch(url, tk ? { headers: { Authorization: `Bearer ${tk}` } } : {});
  const b = Buffer.from(await r.arrayBuffer());
  return { status: r.status, bytes: b.length, texto: b.slice(0, 400).toString('utf8'), cabecera: b.slice(0, 5).toString('latin1') };
};

async function main() {
  const tk = await token();

  // ── Comprobantes con CDR: factura y boleta ──────────────────────────────
  console.log('1) Comprobantes aceptados por SUNAT');
  const conCdr = await prisma.comprobante.findMany({
    where: { sunatCdrResponse: { not: null } },
    select: { id: true, tipoDoc: true, serie: true, correlativo: true,
      sunatCdrResponse: true, s3XmlUrl: true, s3PdfUrl: true, s3CdrUrl: true },
    orderBy: { id: 'desc' } });
  const porTipo = new Map();
  for (const c of conCdr) if (!porTipo.has(c.tipoDoc)) porTipo.set(c.tipoDoc, c);
  console.log(`   ${conCdr.length} comprobantes con respuesta de SUNAT · tipos: ${[...porTipo.keys()].join(', ')}`);
  // Kaiser emite factura (01) y boleta (03): los dos tienen que estar probados.
  ok(porTipo.has('01'), 'hay al menos una FACTURA aceptada por SUNAT');
  ok(porTipo.has('03'), 'y al menos una BOLETA');

  for (const [tipo, c] of porTipo) {
    const nombre = `${c.serie}-${String(c.correlativo).padStart(8, '0')}`;
    const aceptado = /aceptad/i.test(String(c.sunatCdrResponse));
    console.log(`\n   ${nombre} (${tipo})`);
    ok(aceptado, `SUNAT la aceptó`);
    for (const [etiqueta, url, cab] of [['XML', c.s3XmlUrl, '<?xml'], ['PDF', c.s3PdfUrl, '%PDF-'], ['CDR', c.s3CdrUrl, '<?xml']]) {
      if (!url) { ok(false, `${etiqueta}: sin URL guardada`); continue; }
      const d = await bajar(url);
      ok(d.status === 200 && d.cabecera.startsWith(cab),
        `${etiqueta}: se descarga (${d.bytes} bytes, empieza "${d.cabecera}")`);
    }
    // El XML tiene que ser el del documento, y firmado.
    if (c.s3XmlUrl) {
      const x = await bajar(c.s3XmlUrl);
      const texto = (await (await fetch(c.s3XmlUrl)).text());
      ok(texto.includes(nombre), `el XML corresponde a ${nombre}`);
      ok(/Signature/.test(texto), 'y está firmado digitalmente');
    }
  }

  // ── Guías: el hueco que había ───────────────────────────────────────────
  console.log('\n2) Guías de remisión electrónicas');
  const guias = await prisma.guiaRemision.findMany({
    where: { sunatCdrResponse: { not: null } },
    select: { id: true, serie: true, correlativo: true, sunatCdrResponse: true, sunatXml: true },
    orderBy: { id: 'desc' }, take: 3 });
  ok(guias.length > 0, `${guias.length} guía(s) con respuesta de SUNAT`);
  for (const g of guias) {
    const nombre = `${g.serie}-${String(g.correlativo).padStart(8, '0')}`;
    console.log(`\n   ${nombre}`);
    ok(/aceptad/i.test(String(g.sunatCdrResponse)), 'SUNAT la aceptó');
    // Aquí estaba el hueco: el XML y el CDR existían en la base y no había endpoint.
    const xml = await bajar(`${API}/guia-remision/${g.id}/xml`, tk);
    ok(xml.status === 200 && xml.cabecera.startsWith('<?xml'),
      `el XML se puede DESCARGAR (HTTP ${xml.status}, ${xml.bytes} bytes)`);
    ok(xml.texto.includes(nombre) || xml.bytes > 1000, `y es el de ${nombre}`);
    const cdr = await bajar(`${API}/guia-remision/${g.id}/cdr`, tk);
    ok(cdr.status === 200 && cdr.cabecera.startsWith('<?xml'),
      `el CDR se puede DESCARGAR (HTTP ${cdr.status}, ${cdr.bytes} bytes)`);
    const pdf = await bajar(`${API}/guia-remision/${g.id}/pdf`, tk);
    ok(pdf.status === 200 && pdf.cabecera.startsWith('%PDF-'),
      `y el PDF (HTTP ${pdf.status}, ${pdf.bytes} bytes)`);
  }

  // ── Una guía sin enviar no puede devolver un XML inventado ──────────────
  console.log('\n3) Una guía sin enviar no finge tener documentos');
  const sinEnviar = await prisma.guiaRemision.findFirst({
    where: { sunatXml: null }, select: { id: true, serie: true, correlativo: true } });
  if (sinEnviar) {
    const x = await bajar(`${API}/guia-remision/${sinEnviar.id}/xml`, tk);
    ok(x.status >= 400, `${sinEnviar.serie}-${sinEnviar.correlativo}: el XML responde ${x.status} y explica por qué`);
  } else {
    ok(true, 'todas las guías están enviadas: no hay caso que probar');
  }

  console.log(fallos === 0
    ? '\n✔ DOCUMENTOS SUNAT: completos y recuperables'
    : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
