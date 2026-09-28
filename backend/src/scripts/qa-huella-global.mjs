/**
 * Huella de TODAS las tablas de la base.
 *
 * Existe por una lección concreta: la huella a mano (`qa-huella.mjs`) vigilaba 19
 * campos que yo había elegido, y decía "intacta" diez pasadas seguidas. Al contar
 * las 110 tablas apareció lo que no estaba mirando: `RefreshToken` crecía diez
 * filas por pasada y nadie purgaba las caducadas.
 *
 * Una huella parcial solo confirma lo que ya sospechabas. Esta no elige.
 *
 * Uso:
 *   node src/scripts/qa-huella-global.mjs                 → imprime el JSON
 *   node src/scripts/qa-huella-global.mjs base.json       → compara contra ese
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
const prisma = new PrismaClient();

/**
 * Diferencias que son consecuencia normal de correr el QA, no residuo.
 * Cada una con su motivo: si algo entra aquí sin explicación, deja de ser útil.
 */
const ESPERADAS = {
  RefreshToken:
    'cada login crea una sesión; el QA entra varias veces y no cierra sesión. ' +
    'Las caducadas las recoge el job diario `PurgarTokensExpiradosService`.',
};

async function contarTodo() {
  const tablas = await prisma.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  const out = {};
  for (const { tablename } of tablas) {
    const r = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int n FROM "${tablename}"`);
    out[tablename] = r[0].n;
  }
  return out;
}

async function main() {
  const ahora = await contarTodo();
  const base = process.argv[2];

  if (!base) {
    console.log(JSON.stringify(ahora, null, 2));
    await prisma.$disconnect();
    return;
  }

  const antes = JSON.parse(readFileSync(base, 'utf8'));
  const claves = new Set([...Object.keys(antes), ...Object.keys(ahora)]);
  const inesperadas = [];
  const explicadas = [];
  for (const k of [...claves].sort()) {
    const a = antes[k] ?? 0, b = ahora[k] ?? 0;
    if (a === b) continue;
    (ESPERADAS[k] ? explicadas : inesperadas).push([k, a, b]);
  }

  console.log(`${claves.size} tablas comparadas contra ${base}\n`);
  for (const [k, a, b] of explicadas) {
    console.log(`   · ${k}: ${a} → ${b} (${b - a > 0 ? '+' : ''}${b - a})`);
    console.log(`     esperado: ${ESPERADAS[k]}`);
  }
  for (const [k, a, b] of inesperadas) {
    console.log(`   ✘ ${k}: ${a} → ${b} (${b - a > 0 ? '+' : ''}${b - a}) — SIN EXPLICAR`);
  }
  console.log(inesperadas.length === 0
    ? '\n✔ Ninguna tabla cambió sin explicación: el QA no deja residuo.'
    : `\n✘ ${inesperadas.length} tablas cambiaron sin explicación.`);
  await prisma.$disconnect();
  process.exit(inesperadas.length === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('✘', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
