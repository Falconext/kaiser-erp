/**
 * QA funcional · continuidad de las series de comprobantes
 *
 * SUNAT espera que una serie sea continua. Un hueco no es ilegal por sí solo
 * —un documento rechazado no está emitido—, pero un hueco que nadie sabe
 * explicar es un hallazgo en una fiscalización.
 *
 * Aquí se listan los huecos de cada serie y se cruzan con `ComprobanteDescartado`.
 * La comprobación que importa: CERO huecos sin explicación.
 *
 * Y de paso, lo que nunca debe pasar: dos documentos con el mismo número.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const n8 = (n) => String(n).padStart(8, '0');

async function main() {
  console.log('1) Ningún número repetido');
  const dups = await prisma.$queryRawUnsafe(
    `SELECT "empresaId","tipoDoc",serie,correlativo,COUNT(*)::int n FROM "Comprobante"
     GROUP BY 1,2,3,4 HAVING COUNT(*) > 1 ORDER BY n DESC LIMIT 10`);
  ok(dups.length === 0, `duplicados de (empresa, tipo, serie, correlativo): ${dups.length}`);
  for (const d of dups) console.log(`      ✘ ${d.serie}-${n8(d.correlativo)} aparece ${d.n} veces`);
  const idx = await prisma.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes WHERE tablename='Comprobante'
     AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%correlativo%'`);
  ok(idx.length === 1, 'el índice único que lo impide está puesto');

  console.log('\n2) Continuidad de cada serie');
  const series = await prisma.$queryRawUnsafe(
    `SELECT "empresaId","tipoDoc",serie, COUNT(*)::int n, MIN(correlativo)::int lo, MAX(correlativo)::int hi
     FROM "Comprobante" GROUP BY 1,2,3 ORDER BY serie`);
  const descartados = await prisma.comprobanteDescartado.findMany();
  const clave = (e, t, s, c) => `${e}|${t}|${s}|${c}`;
  const mapaDescartes = new Map(descartados.map((d) => [clave(d.empresaId, d.tipoDoc, d.serie, d.correlativo), d]));

  let huecosSinExplicar = 0;
  console.log('   serie  tipo  emitidos  rango          huecos');
  for (const s of series) {
    const presentes = new Set(
      (await prisma.comprobante.findMany({
        where: { empresaId: s.empresaId, tipoDoc: s.tipoDoc, serie: s.serie },
        select: { correlativo: true },
      })).map((c) => c.correlativo));
    const huecos = [];
    for (let i = s.lo; i <= s.hi; i++) if (!presentes.has(i)) huecos.push(i);
    console.log(`   ${s.serie.padEnd(6)} ${s.tipoDoc.padEnd(5)} ${String(s.n).padStart(8)}  ${n8(s.lo)}-${n8(s.hi)}  ${huecos.length}`);
    for (const h of huecos) {
      const d = mapaDescartes.get(clave(s.empresaId, s.tipoDoc, s.serie, h));
      if (d) {
        console.log(`      · ${s.serie}-${n8(h)} → ${d.motivo}`);
        if (d.errorSunat) console.log(`        SUNAT: ${String(d.errorSunat).slice(0, 110)}`);
      } else {
        console.log(`      ✘ ${s.serie}-${n8(h)} → SIN EXPLICACIÓN`);
        huecosSinExplicar++;
      }
    }
  }
  ok(huecosSinExplicar === 0, `huecos sin explicación: ${huecosSinExplicar}`);

  console.log('\n3) El rastro de descartes');
  ok(true, `números descartados registrados: ${descartados.length}`);
  // Un número registrado como descartado no puede existir a la vez como emitido.
  let contradicciones = 0;
  for (const d of descartados) {
    const existe = await prisma.comprobante.count({
      where: { empresaId: d.empresaId, tipoDoc: d.tipoDoc, serie: d.serie, correlativo: d.correlativo } });
    if (existe) { console.log(`      ✘ ${d.serie}-${n8(d.correlativo)} está marcado como descartado pero existe emitido`); contradicciones++; }
  }
  ok(contradicciones === 0, `sin contradicciones entre emitidos y descartados (${contradicciones})`);

  console.log(fallos === 0 ? '\n✔ SERIES: continuas y con todo hueco explicado' : `\n✘ SERIES: ${fallos} problemas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('✘', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
