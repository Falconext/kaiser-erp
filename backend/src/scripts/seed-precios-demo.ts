/**
 * Precios de DEMO para Kaiser — a reemplazar por los precios reales.
 *
 * El Excel de stock no traía precios (todos quedaron en 0). Este script asigna
 * precios de demostración por categoría + unidad, con rangos realistas del rubro
 * industrial peruano y una pequeña variación por producto (para que no salgan
 * todos idénticos). Sirve para que el flujo comercial (cotización → factura →
 * cobranza) se vea con montos creíbles en la demo.
 *
 * Marca de demo: cada producto queda con atributosTecnicos.precioDemo = true, y
 * su `precioUnitario` calculado como valorUnitario + IGV (18%, gravado '10').
 *
 * Solo toca productos con precio 0 (idempotente-ish: re-ejecutar no pisa precios
 * ya cargados manualmente, salvo que sigan en 0).
 *
 * Uso:  npx ts-node -r tsconfig-paths/register src/scripts/seed-precios-demo.ts [--force]
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const FORCE = process.argv.includes('--force'); // recalcula incluso los que ya tienen precio

// Precio base (VALOR de venta, sin IGV) por categoría + unidad de venta.
// El precioUnitario final = valor * 1.18 (IGV 18%).
const PRECIO_BASE: Record<string, Record<string, number>> = {
  'Alambres y derivados':  { KG: 6.5,  PZ: 12,  UND: 12,  RLL: 180 },
  'Malla metálica':        { RLL: 240, M2: 28,  PZ: 85 },
  'Malla plástica':        { RLL: 190, M2: 14,  PZ: 40 },
  'Reja de acero':         { PZ: 95,   UND: 60 },
  'Otros y accesorios':    { UND: 8,   PZ: 10,  KG: 9,  RLL: 120, CJ: 45, PQ: 25, LT: 30 },
  'Componentes e insumos': { UND: 5 },
  'Productos fabricados':  { UND: 320 }, // módulos / kits de fabricación
};
const FALLBACK: Record<string, number> = { KG: 7, PZ: 15, UND: 10, RLL: 180, M2: 20, CJ: 45, PQ: 25, LT: 30 };

// Variación determinística ±12% a partir del id (estable entre corridas).
const factorVar = (id: number) => 1 + (((id * 37) % 25) - 12) / 100;
const round2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  console.log(`\n💰 Cargando precios de DEMO${FORCE ? ' (--force: recalcula todos)' : ' (solo precio 0)'}…\n`);

  const productos = await prisma.producto.findMany({
    where: FORCE ? {} : { precioUnitario: 0 },
    include: { categoria: { select: { nombre: true } }, unidadMedida: { select: { codigo: true } } },
  });

  let actualizados = 0;
  const porCat: Record<string, number> = {};

  for (const p of productos) {
    const cat = p.categoria?.nombre || 'Otros y accesorios';
    const uni = p.unidadMedida?.codigo || 'UND';
    const base = PRECIO_BASE[cat]?.[uni] ?? FALLBACK[uni] ?? 10;
    const valor = round2(base * factorVar(p.id));          // valor de venta (sin IGV)
    const precio = round2(valor * 1.18);                    // precio con IGV (gravado)

    const attrs = (p.atributosTecnicos as any) || {};
    await prisma.producto.update({
      where: { id: p.id },
      data: {
        valorUnitario: new Prisma.Decimal(valor),
        precioUnitario: new Prisma.Decimal(precio),
        atributosTecnicos: { ...attrs, precioDemo: true },
      },
    });
    actualizados++;
    porCat[cat] = (porCat[cat] || 0) + 1;
  }

  console.log(`✅ ${actualizados} productos con precio de demo.\n`);
  for (const [c, n] of Object.entries(porCat)) console.log(`   • ${c}: ${n}`);
  console.log('\n⚠️  Son precios de DEMO (atributosTecnicos.precioDemo = true). Reemplazar por los reales.\n');
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
