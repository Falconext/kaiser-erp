/**
 * Completa el peso de los productos que no lo traen, para que la programación
 * de despachos pueda sumar kilos y decir cuánto falta para que salga el camión.
 *
 * ── De dónde sale cada peso ───────────────────────────────────────────────
 * 1. REAL, de la hoja de planta (2-oct-2026): los componentes de fabricación
 *    traen su peso unitario en una columna. Esos no se estiman, se copian.
 * 2. DERIVADO de los 177 productos de Kaiser que SÍ traen peso: para los demás
 *    se toma la MEDIANA de su propia familia (malla con mallas, alambre con
 *    alambres). No es un número inventado: es el peso típico de ese tipo de
 *    producto según su propio catálogo.
 *
 * ── Por qué aquí sí y con el costo no ─────────────────────────────────────
 * El costo alimenta el inventario valorizado, el margen y el P&L —lo que la
 * contadora está auditando—, y un costo inventado parece calculado. El peso
 * del producto es un dato interno: NO llega a SUNAT (el pesoTotal de la guía de
 * remisión se teclea aparte) y solo sirve para saber cuánto carga el camión.
 * Ahí un valor aproximado es útil y uno ausente no sirve de nada.
 *
 * Todo lo estimado queda MARCADO (`atributosTecnicos.pesoEstimado`) para poder
 * listarlo, corregirlo cuando almacén dé los suyos, y revertirlo entero.
 *
 *   pnpm run seed:pesos                 → en seco
 *   pnpm run seed:pesos -- --aplicar    → escribe
 *   pnpm run seed:pesos -- --revertir   → borra SOLO los estimados
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const aplicar = process.argv.includes('--aplicar');
const revertir = process.argv.includes('--revertir');

/** Pesos unitarios REALES, de la hoja de planta. En kilos. */
const PESOS_REALES_HOJA = {
  '10461IMPL0072': 7.65,  // PISO LEVANTE
  '10461IMPL0013': 5,     // TECHO LEVANTE FRENTE
  '10461IMPL0019': 0.65,  // DIVISION LEVANTE
  '10461IMPL0031': 2.3,   // MEDIANERA LEVANTE
  '10461IMPL0078': 4.6,   // COMEDERO LEVANTE
  '10461IMPL0079': 0.25,  // UNION DE COMEDERO
  '10461IMPL0028': 6.8,   // SOPORTE PARA JAULA
  '10461IMPL0076': 0.011, // SOPORTE DE COMEDERO
  '10461IMPL0009': 1,     // SUJETADOR TIPO W
  '10461IMPL0010': 0.1,   // TAPA DE COMEDERO
  '90061IMPL0015': 1.3,   // GUILLOTINA
  '10780VARI0010': 1,     // TUBO DE PVC 3/4
  '90061BBDR0002': 0.02,  // BEBEDERO CORTI
  '90090VARI0005': 4,     // DRIZA DE NYLON (por kg)
};

const familia = (descripcion) =>
  String(descripcion || '').split(/[ .]/)[0].toUpperCase();

const mediana = (nums) => {
  const v = [...nums].sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : null;
};

const log = (s = '') => console.log(s);

const main = async () => {
  const empresa = await prisma.empresa.findFirst({ select: { id: true } });
  const empresaId = empresa.id;

  log(`\n⚖  Peso de los productos · ${revertir ? 'REVERTIR' : 'COMPLETAR'} · ${aplicar ? 'APLICANDO' : 'en seco'}\n`);

  // ── Reversión ─────────────────────────────────────────────────────────────
  if (revertir) {
    const estimados = await prisma.producto.findMany({
      where: { empresaId },
      select: { id: true, codigo: true, atributosTecnicos: true },
    });
    const mios = estimados.filter((p) => p.atributosTecnicos?.pesoEstimado);
    log(`   ${mios.length} producto(s) con peso estimado por este script`);
    if (aplicar) {
      for (const p of mios) {
        const { pesoEstimado, pesoEstimadoDe, ...resto } = p.atributosTecnicos;
        await prisma.producto.update({
          where: { id: p.id },
          data: {
            pesoGramos: null,
            atributosTecnicos: Object.keys(resto).length ? resto : undefined,
          },
        });
      }
      log('   ✔ peso borrado y marca quitada');
    }
    return;
  }

  // ── Referencia: los pesos REALES que ya tiene el catálogo ─────────────────
  const conPeso = await prisma.producto.findMany({
    where: { empresaId, pesoGramos: { gt: 0 } },
    select: { descripcion: true, pesoGramos: true },
  });
  const porFamilia = {};
  for (const p of conPeso) {
    const f = familia(p.descripcion);
    (porFamilia[f] = porFamilia[f] || []).push(Number(p.pesoGramos) / 1000);
  }
  const medianaFamilia = Object.fromEntries(
    Object.entries(porFamilia).map(([f, v]) => [f, mediana(v)]),
  );
  // Suelo general: si una familia no tiene ninguna referencia, no se inventa un
  // número de la nada — se deja sin peso y se informa.
  log(`   referencia: ${conPeso.length} productos con peso real, ${Object.keys(medianaFamilia).length} familias\n`);

  const sinPeso = await prisma.producto.findMany({
    where: { empresaId, OR: [{ pesoGramos: null }, { pesoGramos: 0 }] },
    select: { id: true, codigo: true, descripcion: true, atributosTecnicos: true },
  });

  let reales = 0, derivados = 0, sinReferencia = 0;
  const faltan = {};

  for (const p of sinPeso) {
    const real = PESOS_REALES_HOJA[p.codigo];
    const f = familia(p.descripcion);
    const kg = real ?? medianaFamilia[f] ?? null;

    if (kg == null) {
      sinReferencia++;
      faltan[f] = (faltan[f] || 0) + 1;
      continue;
    }

    if (real != null) reales++; else derivados++;

    if (aplicar) {
      await prisma.producto.update({
        where: { id: p.id },
        data: {
          pesoGramos: Math.round(kg * 1000),
          atributosTecnicos: {
            ...(p.atributosTecnicos ?? {}),
            // Solo se marca lo DERIVADO. Lo que viene de la hoja de planta es
            // dato del cliente y no debe tratarse como estimación.
            ...(real != null
              ? { pesoFuente: 'hoja de planta 2-oct-2026' }
              : { pesoEstimado: true, pesoEstimadoDe: `mediana de ${f}` }),
          },
        },
      });
    }
  }

  log(`   ${String(reales).padStart(4)} con peso REAL de la hoja de planta`);
  log(`   ${String(derivados).padStart(4)} derivados de la mediana de su familia  ← quedan marcados`);
  log(`   ${String(sinReferencia).padStart(4)} sin referencia: se quedan sin peso`);
  if (sinReferencia) {
    log('\n   familias sin ninguna referencia (hay que preguntárselas a almacén):');
    Object.entries(faltan).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .forEach(([f, n]) => log(`      ${String(n).padStart(3)}  ${f}`));
  }

  log(aplicar ? '\n✔ listo\n' : '\n   ← en seco. Añade  -- --aplicar  para escribir.\n');
};

main()
  .catch((e) => { console.error('\n✘', e.message, '\n'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
