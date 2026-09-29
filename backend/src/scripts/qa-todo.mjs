/**
 * Corre TODA la batería de QA y, después de cada script, comprueba que no haya
 * dejado el inventario descuadrado.
 *
 * Existe porque esa segunda mitad es la que faltaba. Cada script comprobaba lo
 * suyo y terminaba en verde, pero dos de ellos dejaban residuo que solo se veía
 * al correr `qa:cuadres` después — y nadie lo corría entre medias:
 *
 *   · `qa:flujo` asignaba el stock del insumo de forma absoluta para poder
 *     fabricar (2 148 unidades pasaban a 14) y su limpieza borraba los
 *     movimientos de kardex sin devolver la tabla.
 *   · `qa:devoluciones` revertía `ProductoStock` pero no `Producto.stock`, y su
 *     propia aserción final solo leía la mitad que sí había restaurado.
 *
 * Los dos daban verde. El descuadre aparecía en los datos de la demo.
 *
 * Las tres invariantes que se vigilan entre scripts:
 *   1. el stock de cada sede es el último saldo de su kardex;
 *   2. el `stock` global del producto es la suma de sus sedes;
 *   3. cada asiento contable cuadra (Σ debe = Σ haber) y sus totales coinciden
 *      con sus líneas.
 *
 * Uso:  pnpm run qa:todo
 *       pnpm run qa:todo -- --seguir    (no se detiene en el primero que falla)
 */
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();
const SEGUIR = process.argv.includes('--seguir');

/** Los que solo imprimen datos (huellas): no llevan marcas de comprobación. */
const SIN_CHECKS = new Set(['qa:huella', 'qa:huella-global']);

async function descuadres() {
  const porSede = await prisma.$queryRawUnsafe(`
    WITH u AS (
      SELECT DISTINCT ON (m."productoId", m."sedeId")
             m."productoId", m."sedeId", m."stockActual"
      FROM "MovimientoKardex" m
      ORDER BY m."productoId", m."sedeId", m.fecha DESC, m.id DESC
    )
    SELECT pr.codigo, ps."sedeId", ps.stock::float tabla, u."stockActual"::float kardex
    FROM "ProductoStock" ps
    JOIN u ON u."productoId" = ps."productoId" AND u."sedeId" = ps."sedeId"
    JOIN "Producto" pr ON pr.id = ps."productoId"
    WHERE ABS(ps.stock - u."stockActual") > 0.001`);
  const globales = await prisma.$queryRawUnsafe(`
    SELECT pr.codigo, pr.stock::float global, COALESCE(t.s, 0)::float sedes
    FROM "Producto" pr
    LEFT JOIN (SELECT "productoId", SUM(stock) s FROM "ProductoStock" GROUP BY 1) t
      ON t."productoId" = pr.id
    WHERE ABS(pr.stock - COALESCE(t.s, 0)) > 0.001`);
  const contables = await prisma.$queryRawUnsafe(`
    SELECT a.cuo, a."totalDebe"::float td, a."totalHaber"::float th,
           COALESCE(SUM(d.debe), 0)::float debe, COALESCE(SUM(d.haber), 0)::float haber
    FROM "Asiento" a LEFT JOIN "AsientoDetalle" d ON d."asientoId" = a.id
    GROUP BY a.id
    HAVING ABS(COALESCE(SUM(d.debe), 0) - COALESCE(SUM(d.haber), 0)) > 0.001
        OR ABS(a."totalDebe" - COALESCE(SUM(d.debe), 0)) > 0.001
        OR ABS(a."totalHaber" - COALESCE(SUM(d.haber), 0)) > 0.001`);
  return [
    ...porSede.map((d) => `sede: ${d.codigo} sede ${d.sedeId}: tabla ${d.tabla} · kardex ${d.kardex}`),
    ...globales.map((d) => `global: ${d.codigo}: global ${d.global} · suma de sedes ${d.sedes}`),
    ...contables.map((d) => `asiento ${d.cuo}: debe ${d.debe} · haber ${d.haber} (totales ${d.td}/${d.th})`),
  ];
}

async function main() {
  const scripts = Object.keys(JSON.parse(readFileSync('package.json', 'utf8')).scripts)
    .filter((k) => k.startsWith('qa:') && k !== 'qa:todo');

  const sucio = await descuadres();
  if (sucio.length) {
    console.log('\n⚠ La base YA viene descuadrada antes de empezar:');
    sucio.forEach((d) => console.log(`   ${d}`));
    console.log('  Corre `pnpm run cuadres:corregir -- --aplicar` primero.\n');
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(`\n═══ QA completo · ${scripts.length} scripts ═══\n`);
  let checks = 0, rojos = 0, ensucian = 0;

  for (const s of scripts) {
    process.stdout.write(`  ${s.padEnd(26)} `);
    let salida = '';
    let revento = false;
    try {
      salida = execSync(`pnpm run -s ${s}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      salida = (e.stdout || '') + (e.stderr || '');
      revento = true;
    }
    const n = (salida.match(/[✔✅]/g) || []).length;
    checks += n;
    const falla = revento || /✘|fallo\(s\)/.test(salida);
    const vacio = n === 0 && !SIN_CHECKS.has(s);

    const sucios = await descuadres();
    const linea = [];
    if (falla) { linea.push('✘ ROJO'); rojos++; }
    else if (vacio) { linea.push('⚠ sin salida'); rojos++; }
    else linea.push(`✔ ${n}`);
    if (sucios.length) { linea.push('· ENSUCIA EL INVENTARIO'); ensucian++; }
    console.log(linea.join(' '));

    if (falla || vacio) {
      salida.split('\n').filter((l) => /✘/.test(l)).slice(0, 3)
        .forEach((l) => console.log(`        ${l.trim()}`));
    }
    sucios.forEach((d) => console.log(`        ${d}`));

    if (sucios.length || falla || vacio) {
      if (!SEGUIR) {
        console.log(`\n✘ Detenido en ${s}. Con --seguir continúa con el resto.`);
        console.log('  Si ensució el inventario: `pnpm run cuadres:corregir -- --aplicar`.\n');
        await prisma.$disconnect();
        process.exit(1);
      }
      // Para no arrastrar el descuadre al siguiente script y culparlo a él.
      if (sucios.length) execSync('pnpm run -s cuadres:corregir -- --aplicar', { stdio: 'ignore' });
    }
  }

  console.log(`\n  ═══ ${checks} comprobaciones · ${rojos} en rojo · ${ensucian} ensucian el inventario ═══`);
  console.log(rojos === 0 && ensucian === 0
    ? '\n✔ TODO VERDE y el inventario intacto después de cada script\n'
    : '\n✘ Hay trabajo pendiente\n');
  await prisma.$disconnect();
  process.exit(rojos || ensucian ? 1 : 0);
}

main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect(); process.exit(1); });
