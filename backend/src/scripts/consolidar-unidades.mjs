/**
 * Consolida las unidades de medida REPETIDAS: mismo nombre, códigos distintos.
 *
 * Pasó porque dos sitios siembran la misma tabla y el upsert va por código:
 * `init-db.ts` crea las 14 del Catálogo 03 de SUNAT (NIU, KGM, LTR, MTK, BOX…)
 * y `import-kaiser-catalog.ts` crea las del negocio (UND, KG, LT, M2, CJ, RLL,
 * PZ, PQ). Cinco conceptos acabaron con dos filas: UNIDAD, KILOGRAMO, LITRO,
 * METRO CUADRADO y CAJA. El selector de producto las pinta por nombre, así que
 * el usuario veía dos opciones idénticas sin forma de distinguirlas.
 *
 * Con SUNAT no había problema —`sunat-unidades.ts` traduce los códigos internos
 * al Catálogo 03 antes de armar el XML— pero el catálogo maestro mentía.
 *
 * GANA la fila que ya usan los productos; si ninguna se usa, la de código
 * oficial de SUNAT. Los productos de la perdedora se mueven a la ganadora antes
 * de borrarla, así que no queda ningún producto sin unidad.
 *
 *   pnpm run unidades:consolidar             → reporta
 *   pnpm run unidades:consolidar -- --aplicar → escribe
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');

// Códigos del Catálogo 03 de SUNAT: desempatan cuando ninguna fila se usa.
const OFICIALES = new Set([
  'NIU', 'KGM', 'LTR', 'MTR', 'MTK', 'MTQ', 'GRM', 'TNE',
  'GLN', 'BOX', 'DZN', 'PAR', 'SET', 'ZZ',
]);

const norm = (s) => String(s ?? '').trim().toUpperCase();

async function main() {
  console.log(
    `\n${APLICAR ? '✍️  MODO ESCRITURA' : '👀 SOLO LECTURA (agrega -- --aplicar para escribir)'}`,
  );
  console.log('═'.repeat(62));

  const unidades = await prisma.unidadMedida.findMany({ orderBy: { id: 'asc' } });
  const usos = new Map();
  for (const u of unidades) {
    usos.set(u.id, await prisma.producto.count({ where: { unidadMedidaId: u.id } }));
  }

  const porNombre = new Map();
  for (const u of unidades) {
    const n = norm(u.nombre);
    porNombre.set(n, [...(porNombre.get(n) ?? []), u]);
  }
  const repetidas = [...porNombre.entries()].filter(([, v]) => v.length > 1);

  if (repetidas.length === 0) {
    console.log('\n✅ No hay unidades repetidas por nombre.\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`\nUnidades repetidas: ${repetidas.length}\n`);
  const plan = [];
  for (const [nombre, filas] of repetidas) {
    // Gana la más usada; a cero productos, la oficial de SUNAT; si siguen
    // empatadas, la más antigua (id menor), que es la que ya estaba.
    const orden = [...filas].sort((a, b) => {
      const porUso = (usos.get(b.id) ?? 0) - (usos.get(a.id) ?? 0);
      if (porUso !== 0) return porUso;
      const oficial = Number(OFICIALES.has(norm(b.codigo))) - Number(OFICIALES.has(norm(a.codigo)));
      if (oficial !== 0) return oficial;
      return a.id - b.id;
    });
    const [gana, ...pierden] = orden;
    const motivo = (usos.get(gana.id) ?? 0) > 0
      ? `la usan ${usos.get(gana.id)} productos`
      : OFICIALES.has(norm(gana.codigo))
        ? 'código oficial de SUNAT y ninguna se usa'
        : 'es la más antigua';
    console.log(`  ${nombre}`);
    console.log(`     ✔ se queda  ${gana.codigo.padEnd(4)} (id ${gana.id}, ${usos.get(gana.id)} productos) — ${motivo}`);
    for (const p of pierden) {
      console.log(`     ✘ se borra  ${p.codigo.padEnd(4)} (id ${p.id}, ${usos.get(p.id)} productos)`);
      plan.push({ nombre, ganaId: gana.id, pierdeId: p.id, pierdeCodigo: p.codigo, productos: usos.get(p.id) ?? 0 });
    }
  }

  const aMover = plan.reduce((s, x) => s + x.productos, 0);
  console.log(`\n   Filas a borrar: ${plan.length}  ·  productos a reasignar: ${aMover}`);

  if (!APLICAR) {
    console.log('\n   Nada se escribió. Volver a correr con -- --aplicar.\n');
    await prisma.$disconnect();
    return;
  }

  for (const x of plan) {
    if (x.productos > 0) {
      await prisma.producto.updateMany({
        where: { unidadMedidaId: x.pierdeId },
        data: { unidadMedidaId: x.ganaId },
      });
    }
    await prisma.unidadMedida.delete({ where: { id: x.pierdeId } });
    console.log(`   ✔ ${x.pierdeCodigo}: ${x.productos} producto(s) movidos y fila borrada`);
  }

  // Comprobación: ningún producto perdió su unidad y no quedan repetidos.
  // `unidadMedidaId` NO es nullable, así que no se puede filtrar por null: se
  // comprueba que la suma por unidad siga cubriendo todo el catálogo.
  const quedan = await prisma.unidadMedida.findMany({ select: { id: true, nombre: true } });
  let conUnidad = 0;
  for (const u of quedan) {
    conUnidad += await prisma.producto.count({ where: { unidadMedidaId: u.id } });
  }
  const totalProductos = await prisma.producto.count();
  const nombres = quedan.map((u) => norm(u.nombre));
  const aunRepetidos = nombres.filter((n, i) => nombres.indexOf(n) !== i);
  console.log(`\n   Productos con unidad: ${conUnidad} de ${totalProductos}`);
  console.log(`   Nombres aún repetidos: ${aunRepetidos.length ? aunRepetidos.join(', ') : 'ninguno'}`);
  console.log(`\n✅ Catálogo consolidado: ${quedan.length} unidades.\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
