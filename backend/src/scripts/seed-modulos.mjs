#!/usr/bin/env node
/**
 * Enciende el cotizador de módulos con los datos REALES de Kaiser.
 *
 * Todo lo que construyeron las secciones 5 y 6 —cotizar por aves, precio por
 * peso × factor, el soporte que cierra cada fila— es opt-in y hoy está
 * apagado: cero productos marcados `esModulo`. Este guion lo enciende.
 *
 * ⚠ ESTRUCTURA SÍ, NÚMEROS NO, igual que `seed:receta-levante`:
 *
 * · `esModulo` es un hecho estructural: estos productos SON módulos de jaula.
 *   Se marcan todos.
 * · `capacidadAves` solo se pone donde está DOCUMENTADO, y son dos casos:
 *     - Levante 1 piso = 96. De la cotización real a Granja Los Sauces
 *       («capacidad para 96 aves por módulo … capacidad total 40,320 aves»),
 *       y cuadra: 420 × 96 = 40 320.
 *     - Postura/Americano 3 pisos = 168. Dicho por Astrid en la reunión del
 *       7-oct: «ponedoras de tres pisos, capacidad 168 aves», y el ejercicio
 *       que hizo en pantalla, 20 000 ÷ 168 = 120 módulos.
 *   Los demás quedan en NULL. No es un olvido: nadie dio esas cifras, y una
 *   capacidad inventada hace que el vendedor cotice de menos o de más en la
 *   granja de un cliente. Con NULL el modal simplemente pide la cantidad a
 *   mano en vez de deducirla de las aves.
 * · `precioBaseKg` NO se toca. Lo mueve Estefany cuando sube el acero y nadie
 *   dijo el número. Los factores tampoco: ver `--factores`.
 *
 * Uso:
 *   node src/scripts/seed-modulos.mjs              # en seco, no escribe nada
 *   node src/scripts/seed-modulos.mjs --aplicar
 *   node src/scripts/seed-modulos.mjs --aplicar --factores   # + 2.8 / 2.6
 *   node src/scripts/seed-modulos.mjs --revertir
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const APLICAR = process.argv.includes('--aplicar');
const REVERTIR = process.argv.includes('--revertir');
const FACTORES = process.argv.includes('--factores');

/**
 * ⚠ `10461GALI0002` queda FUERA a propósito.
 *
 * Hay dos «MÓDULO MODELO LEVANTE 1 PISO» en el catálogo: `10460GALI0002`,
 * que es el que usa la hoja de planta y el que tiene la receta completa de 19
 * componentes, y `10461GALI0002`, que vino del inventario de almacén con una
 * receta de 5. Marcar los dos dejaría al vendedor con dos opciones de nombre
 * idéntico y sin forma de distinguirlas —el mismo problema que las unidades
 * de medida duplicadas—, y la de 5 componentes daría un peso que no es.
 *
 * Ninguno de los dos tiene movimientos ni ventas, así que se puede decidir sin
 * romper nada. PREGUNTA ABIERTA para Kaiser: ¿cuál de los dos códigos es el
 * bueno, y se puede dar de baja el otro?
 */
const MODULOS = [
  { codigo: '10460GALI0002', capacidadAves: 96,   soporte: '10461IMPL0028' },
  { codigo: '10460GALI0016', capacidadAves: 168,  soporte: '10461IMPL0027' },
  { codigo: '10460GALI0001', capacidadAves: null, soporte: '10461IMPL0026' },
  { codigo: '10461GALI0009', capacidadAves: null, soporte: '10461IMPL0046' },
  { codigo: '10460GALI0003', capacidadAves: null, soporte: null },
  { codigo: '10460GALI0024', capacidadAves: null, soporte: null },
  { codigo: '10460CUYE0001', capacidadAves: null, soporte: null },
];

async function main() {
  if (REVERTIR) {
    const codigos = MODULOS.map((m) => m.codigo);
    if (!APLICAR && !REVERTIR) return;
    const r = await prisma.producto.updateMany({
      where: { codigo: { in: codigos } },
      data: { esModulo: false, capacidadAves: null, productoAdicionalPorFilaId: null },
    });
    console.log(`\n↩  Revertido: ${r.count} productos desmarcados.`);
    console.log('   (el precio por kilo y los factores NO se tocan aquí)');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n🪺  Módulos de jaula — ${APLICAR ? 'APLICANDO' : 'EN SECO (usa --aplicar)'}\n`);
  let marcados = 0, sinCapacidad = 0, sinSoporte = 0, noExiste = 0;

  for (const m of MODULOS) {
    const prod = await prisma.producto.findFirst({
      where: { codigo: m.codigo },
      select: { id: true, codigo: true, descripcion: true, esModulo: true, capacidadAves: true },
    });
    if (!prod) {
      console.log(`  ✘ ${m.codigo}  NO EXISTE en el catálogo`);
      noExiste++;
      continue;
    }

    // El soporte que cierra cada fila. Solo se enlaza si el producto existe:
    // un FK a algo que no está rompería el alta.
    let soporteId = null;
    if (m.soporte) {
      const s = await prisma.producto.findFirst({ where: { codigo: m.soporte }, select: { id: true } });
      if (s) soporteId = s.id;
      else { console.log(`     ⚠ soporte ${m.soporte} no existe; se deja sin enlazar`); sinSoporte++; }
    } else sinSoporte++;

    if (m.capacidadAves === null) sinCapacidad++;

    if (APLICAR) {
      await prisma.producto.update({
        where: { id: prod.id },
        data: {
          esModulo: true,
          capacidadAves: m.capacidadAves,
          productoAdicionalPorFilaId: soporteId,
        },
      });
    }
    marcados++;
    console.log(
      `  ✔ ${prod.codigo}  ${String(prod.descripcion).slice(0, 44).padEnd(44)}` +
      `  aves=${m.capacidadAves ?? '—'}`.padEnd(12) +
      `  soporte=${soporteId ? m.soporte : '—'}`,
    );
  }

  if (FACTORES) {
    // Los números que Kaiser maneja de verdad, dichos en la reunión del 7-oct:
    // «si me ponen el factor tres, no sale mi venta; dos punto ocho
    // probablemente sí, y si el cliente pide descuento, dos punto seis».
    // El precio por kilo NO se toca: ese lo pone Estefany.
    const emp = await prisma.empresa.findFirst({ select: { id: true, precioBaseKg: true } });
    if (APLICAR) {
      await prisma.empresa.update({
        where: { id: emp.id },
        data: { factorPrecioDefault: 2.8, factorPrecioMinimo: 2.6 },
      });
    }
    console.log(`\n  ✔ factor habitual 2.8, mínimo 2.6`);
    if (emp?.precioBaseKg == null) {
      console.log('    ⚠ precioBaseKg sigue en NULL: hasta que Estefany lo ponga,');
      console.log('      el cotizador usa el precio de catálogo y lo avisa.');
    }
  }

  console.log(`\n  ── ${marcados} módulos marcados · ${sinCapacidad} sin capacidad en aves · ${sinSoporte} sin soporte enlazado${noExiste ? ` · ${noExiste} no existen` : ''}`);
  if (sinCapacidad) {
    console.log('     Sin capacidad el modal pide la cantidad a mano, que es lo correcto:');
    console.log('     nadie dio esas cifras y una inventada se nota en la granja del cliente.');
  }
  if (!APLICAR) console.log('\n  (en seco: no se escribió nada)');
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
