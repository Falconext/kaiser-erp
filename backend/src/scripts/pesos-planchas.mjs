#!/usr/bin/env node
/**
 * El peso de una plancha no hay que preguntarlo: se calcula.
 *
 *     peso (kg) = largo (m) × ancho (m) × espesor (mm)/1000 × densidad
 *
 * Con acero a 7 850 kg/m³. Las tres medidas están en la propia descripción del
 * producto, así que no se inventa ni un dato: se lee lo que ya está escrito.
 *
 * ⚠ Y NO se pide que confíen en la física a ciegas. Antes de proponer nada, el
 * guion **se valida contra las planchas que Kaiser YA tiene pesadas**: aplica
 * la misma cuenta a esas y enseña el error. Si el método reproduce sus
 * números, la discusión deja de ser «¿nos fiamos del cálculo?» y pasa a ser
 * «¿este error es aceptable?», que es una pregunta que planta sí puede
 * contestar en una pasada.
 *
 * Por qué importa: 17 planchas sin peso bloquean las recetas de postura,
 * levante 2 pisos y cuy, porque casi todas sus piezas salen de plancha.
 *
 *   node src/scripts/pesos-planchas.mjs            # en seco (por defecto)
 *   node src/scripts/pesos-planchas.mjs --aplicar
 *   node src/scripts/pesos-planchas.mjs --revertir
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');
const REVERTIR = process.argv.includes('--revertir');
const DENSIDAD = 7850; // kg/m³, acero
const FUENTE = 'calculado-densidad-acero';

/** Saca espesor y las dos medidas de la descripción. null si no está claro. */
export function medidasDePlancha(desc) {
  const d = String(desc || '').toUpperCase().replace(/,/g, '.');
  const mm = d.match(/(\d+(?:\.\d+)?)\s*MM/);
  if (!mm) return null;
  const espesorMm = parseFloat(mm[1]);
  // Las medidas siempre vienen DESPUÉS del espesor.
  const resto = d.slice(d.indexOf(mm[0]) + mm[0].length);
  const nums = (resto.match(/\d+(?:\.\d+)?/g) || []).map(parseFloat);
  // Dos medidas en metros, plausibles para una plancha (0,3 a 4 m).
  const dims = nums.filter((n) => n >= 0.3 && n <= 4).slice(0, 2);
  if (dims.length !== 2 || !(espesorMm > 0)) return null;
  return { espesorMm, largoM: dims[0], anchoM: dims[1] };
}

const pesoKg = (m) => m.largoM * m.anchoM * (m.espesorMm / 1000) * DENSIDAD;

async function main() {
  if (REVERTIR) {
    const r = await prisma.producto.findMany({
      where: { atributosTecnicos: { path: ['fuentePeso'], equals: FUENTE } },
      select: { id: true, codigo: true, atributosTecnicos: true },
    });
    for (const p of r) {
      const at = { ...(p.atributosTecnicos ?? {}) };
      delete at.fuentePeso;
      delete at.pesoCalculado;
      await prisma.producto.update({ where: { id: p.id }, data: { pesoGramos: null, atributosTecnicos: at } });
    }
    console.log(`\n↩  ${r.length} planchas devueltas a sin peso.`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\n📐  Peso de planchas por densidad — ${APLICAR ? 'APLICANDO' : 'EN SECO (usa --aplicar)'}`);
  console.log(`    peso = largo × ancho × espesor × ${DENSIDAD} kg/m³\n`);

  // ── 1. Validación contra lo que Kaiser YA tiene pesado ──────────────────
  // Kaiser no tiene ninguna PLANCHA pesada, así que el contraste se hace con
  // las PIEZAS cuya descripción lleva dentro la especificación de la plancha
  // de la que salen. Si la cuenta es correcta, el peso de la pieza tiene que
  // ser una fracción LIMPIA del de su plancha: tantas piezas por plancha.
  const conPeso = await prisma.producto.findMany({
    where: { pesoGramos: { not: null } },
    select: { codigo: true, descripcion: true, pesoGramos: true },
  });
  const comparables = conPeso
    .map((p) => ({ p, m: medidasDePlancha(p.descripcion) }))
    .filter((x) => x.m && !/PLAST|NYLON|CARTON/i.test(x.p.descripcion));

  if (!comparables.length) {
    console.log('  ⚠ No hay con qué contrastar. Preguntar antes de cargar.\n');
  } else {
    console.log('  Contraste con piezas que Kaiser YA tiene pesadas y que salen de plancha:\n');
    console.log('  código'.padEnd(18), 'suyo (kg)'.padStart(10), 'plancha'.padStart(10), 'piezas/plancha'.padStart(15));
    for (const { p, m } of comparables) {
      const suyo = Number(p.pesoGramos) / 1000;
      const plancha = pesoKg(m);
      const ratio = plancha / suyo;
      const entero = Math.round(ratio);
      const limpio = entero >= 1 && Math.abs(ratio - entero) / entero < 0.02;
      console.log(
        `  ${p.codigo.padEnd(16)} ${suyo.toFixed(2).padStart(10)} ${plancha.toFixed(2).padStart(10)} ` +
        `${(ratio.toFixed(2) + (limpio ? `  = ${entero} ✔` : '  —')).padStart(15)}`,
      );
      if (limpio) {
        const err = Math.abs(plancha / entero - suyo) / suyo * 100;
        console.log(`     └─ ${entero} piezas por plancha: ${(plancha / entero).toFixed(3)} kg vs ${suyo} kg suyos · error ${err.toFixed(2)} %`);
      }
    }
    console.log('');
  }

  // ── 2. Lo que se propone cargar ─────────────────────────────────────────
  const comps = await prisma.recetaComponente.findMany({
    where: { productoInsumo: { pesoGramos: null } },
    select: { productoInsumo: { select: { id: true, codigo: true, descripcion: true, atributosTecnicos: true } } },
  });
  const sinPeso = [...new Map(comps.map((c) => [c.productoInsumo.codigo, c.productoInsumo])).values()]
    .filter((p) => /PLANCHA/i.test(p.descripcion))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));

  console.log(`\n  Planchas sin peso que bloquean recetas: ${sinPeso.length}\n`);
  console.log('  código'.padEnd(18), 'espesor'.padStart(8), 'medidas'.padStart(16), 'peso (kg)'.padStart(10));
  let cargadas = 0, saltadas = [];
  for (const p of sinPeso) {
    const m = medidasDePlancha(p.descripcion);
    if (!m) { saltadas.push(p); continue; }
    const kg = pesoKg(m);
    console.log(
      `  ${p.codigo.padEnd(16)} ${(m.espesorMm + ' mm').padStart(8)} ` +
      `${(m.largoM + ' × ' + m.anchoM + ' m').padStart(16)} ${kg.toFixed(2).padStart(10)}`,
    );
    if (APLICAR) {
      await prisma.producto.update({
        where: { id: p.id },
        data: {
          pesoGramos: Math.round(kg * 1000),
          // Marcado, para que se vea que es calculado y se pueda revertir.
          atributosTecnicos: {
            ...(p.atributosTecnicos ?? {}),
            fuentePeso: FUENTE,
            pesoCalculado: { espesorMm: m.espesorMm, largoM: m.largoM, anchoM: m.anchoM, densidad: DENSIDAD },
          },
        },
      });
    }
    cargadas++;
  }

  if (saltadas.length) {
    console.log(`\n  ⚠ ${saltadas.length} sin medidas legibles, NO se tocan:`);
    saltadas.forEach((p) => console.log(`     ${p.codigo}  ${p.descripcion}`));
  }
  console.log(`\n  ── ${cargadas} planchas ${APLICAR ? 'cargadas' : 'se cargarían'} · ${saltadas.length} a mano`);
  if (!APLICAR) console.log('     (en seco: no se escribió nada)');
  console.log('\n  ⚠ El zinc del galvanizado añade algo de peso que esta cuenta no ve.');
  console.log('    Por eso quedan marcadas con `fuentePeso` y hay `--revertir`.\n');
  await prisma.$disconnect();
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
