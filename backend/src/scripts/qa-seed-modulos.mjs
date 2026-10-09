#!/usr/bin/env node
/**
 * QA de `seed:modulos` — el guion que enciende el cotizador de módulos.
 *
 * Escribe sobre productos REALES del catálogo, así que lo primero y lo último
 * que hace este QA es fotografiar y restaurar el estado exacto de los ocho
 * productos que toca y de los factores de la empresa. Si falla a la mitad, el
 * `finally` restaura igual.
 *
 * Lo que fija, y por qué cada cosa:
 *  · en seco no escribe NADA (es el modo por defecto);
 *  · no inventa capacidades: solo las dos documentadas;
 *  · no toca `precioBaseKg` ni con `--factores`;
 *  · es idempotente;
 *  · `--revertir` deja los productos como estaban antes de existir el seed;
 *  · NO marca el duplicado `10461GALI0002`.
 */
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
const prisma = new PrismaClient();

let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

const CODIGOS = [
  '10460GALI0002', '10460GALI0016', '10460GALI0001', '10461GALI0009',
  '10460GALI0003', '10460GALI0024', '10460CUYE0001',
  '10461GALI0002', // el duplicado: tiene que quedarse FUERA
];
const seed = (...args) =>
  execFileSync('node', ['src/scripts/seed-modulos.mjs', ...args], { encoding: 'utf8' });

// ⚠ Las dos consultas van con `orderBy` y NO es decorativo: las dos
// comparaciones de este QA son `JSON.stringify` del resultado, y un
// `findMany` sin orden explícito devuelve las filas como le venga a
// Postgres. Sin esto el guion fallaba una de cada cinco corridas, en una
// comprobación distinta cada vez — lo cazaron las 10 rondas, no la primera.
const foto = async () => {
  const p = await prisma.producto.findMany({
    where: { codigo: { in: CODIGOS } },
    orderBy: { codigo: 'asc' },
    select: { id: true, codigo: true, esModulo: true, capacidadAves: true, productoAdicionalPorFilaId: true },
  });
  const e = await prisma.empresa.findFirst({
    select: { id: true, precioBaseKg: true, factorPrecioDefault: true, factorPrecioMinimo: true },
  });
  return { p, e };
};
const porCodigo = async () =>
  Object.fromEntries((await prisma.producto.findMany({
    where: { codigo: { in: CODIGOS } },
    orderBy: { codigo: 'asc' },
    select: { codigo: true, esModulo: true, capacidadAves: true, productoAdicionalPorFilaId: true },
  })).map((x) => [x.codigo, x]));

async function main() {
  console.log('\n🪺  QA · seed:modulos\n');
  const inicial = await foto();

  try {
    // ── 1. En seco no escribe nada ────────────────────────────────────────
    console.log('1) El modo por defecto es EN SECO');
    await prisma.producto.updateMany({ where: { codigo: { in: CODIGOS } }, data: { esModulo: false, capacidadAves: null, productoAdicionalPorFilaId: null } });
    const salida = seed();
    const tras = await porCodigo();
    ok(Object.values(tras).every((x) => x.esModulo === false), 'sin --aplicar no marca ningún producto');
    ok(Object.values(tras).every((x) => x.capacidadAves === null), 'ni escribe capacidades');
    ok(/EN SECO/.test(salida), 'y lo dice en la salida');

    // ── 2. Lo que marca, y lo que NO ──────────────────────────────────────
    console.log('\n2) Qué marca');
    seed('--aplicar');
    const m = await porCodigo();
    ok(m['10460GALI0002'].esModulo === true, 'marca el levante 1 piso de la hoja de planta');
    ok(m['10460GALI0016'].esModulo === true, 'y la postura 3 pisos');
    ok(
      CODIGOS.slice(0, 7).every((c) => m[c].esModulo === true),
      'los siete módulos quedan marcados',
    );
    // ⚠ El duplicado se queda fuera: con los dos marcados el vendedor vería
    // dos opciones de nombre idéntico, y la de 5 componentes da otro peso.
    ok(
      m['10461GALI0002'].esModulo === false,
      'y el DUPLICADO 10461GALI0002 NO se marca (receta de 5 componentes)',
    );

    // ── 3. No inventa capacidades ─────────────────────────────────────────
    console.log('\n3) Las capacidades, solo donde están documentadas');
    ok(m['10460GALI0002'].capacidadAves === 96, `levante 1 piso = 96 aves (${m['10460GALI0002'].capacidadAves})`);
    ok(m['10460GALI0016'].capacidadAves === 168, `postura 3 pisos = 168 aves (${m['10460GALI0016'].capacidadAves})`);
    const sinDato = ['10460GALI0001', '10461GALI0009', '10460GALI0003', '10460GALI0024', '10460CUYE0001'];
    ok(
      sinDato.every((c) => m[c].capacidadAves === null),
      'y los otros cinco quedan en NULL, no en 0 ni en un número inventado',
    );

    // ── 4. El soporte de final de fila ────────────────────────────────────
    console.log('\n4) El soporte que cierra cada fila');
    const sop = await prisma.producto.findFirst({ where: { codigo: '10461IMPL0028' }, select: { id: true } });
    ok(
      m['10460GALI0002'].productoAdicionalPorFilaId === sop?.id,
      'el levante 1 piso apunta al SOPORTE LEVANTE 1 PISO ESTANDAR',
    );
    ok(
      m['10460GALI0003'].productoAdicionalPorFilaId === null,
      'y un módulo sin soporte conocido queda sin enlazar, no enlazado a cualquiera',
    );

    // ── 5. El precio por kilo NO se toca ──────────────────────────────────
    console.log('\n5) El precio por kilo es de Estefany, no del seed');
    const antes = await prisma.empresa.findFirst({ select: { precioBaseKg: true } });
    seed('--aplicar', '--factores');
    const desp = await prisma.empresa.findFirst({ select: { precioBaseKg: true, factorPrecioDefault: true, factorPrecioMinimo: true } });
    ok(
      String(desp.precioBaseKg ?? null) === String(antes.precioBaseKg ?? null),
      'ni con --factores se toca precioBaseKg',
    );
    ok(Number(desp.factorPrecioDefault) === 2.8, `el factor habitual queda en 2.8 (${Number(desp.factorPrecioDefault)})`);
    ok(Number(desp.factorPrecioMinimo) === 2.6, `y el mínimo en 2.6 (${Number(desp.factorPrecioMinimo)})`);
    ok(
      Number(desp.factorPrecioMinimo) <= Number(desp.factorPrecioDefault),
      'con el mínimo por debajo del habitual, o toda cotización pediría autorización',
    );

    // ── 6. Idempotente ────────────────────────────────────────────────────
    console.log('\n6) Correrlo dos veces no cambia nada');
    const unaVez = JSON.stringify(await porCodigo());
    seed('--aplicar');
    ok(JSON.stringify(await porCodigo()) === unaVez, 'el segundo pase deja exactamente lo mismo');

    // ── 7. --revertir ─────────────────────────────────────────────────────
    console.log('\n7) --revertir');
    seed('--revertir');
    const r = await porCodigo();
    ok(CODIGOS.slice(0, 7).every((c) => r[c].esModulo === false), 'desmarca los siete');
    ok(CODIGOS.slice(0, 7).every((c) => r[c].capacidadAves === null), 'y les quita la capacidad');
    ok(CODIGOS.slice(0, 7).every((c) => r[c].productoAdicionalPorFilaId === null), 'y el soporte enlazado');
    const trasRev = await prisma.empresa.findFirst({ select: { factorPrecioDefault: true } });
    ok(
      Number(trasRev.factorPrecioDefault) === 2.8,
      'pero NO toca los factores: revertir el marcado no es deshacer la configuración de precio',
    );
  } finally {
    // ── 8. Restaurar el catálogo tal como estaba ────────────────────────────
    console.log('\n8) Restaurar');
    for (const x of inicial.p) {
      await prisma.producto.update({
        where: { id: x.id },
        data: { esModulo: x.esModulo, capacidadAves: x.capacidadAves, productoAdicionalPorFilaId: x.productoAdicionalPorFilaId },
      });
    }
    await prisma.empresa.update({
      where: { id: inicial.e.id },
      data: {
        precioBaseKg: inicial.e.precioBaseKg,
        factorPrecioDefault: inicial.e.factorPrecioDefault,
        factorPrecioMinimo: inicial.e.factorPrecioMinimo,
      },
    });
    const fin = await foto();
    ok(
      JSON.stringify(fin) === JSON.stringify(inicial),
      'el catálogo y los factores quedan exactamente como estaban',
    );
  }

  console.log(fallos === 0 ? '\n✔ seed:modulos: todo correcto' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
