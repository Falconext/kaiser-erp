/**
 * Importa los COSTOS reales de Kaiser desde "Copia de Almacenes.xlsx".
 *
 * El archivo es el reporte "SALDOS ALMACENES" con costo unitario por producto
 * (columnas: CODIGO, DESCRIPCION, U.M., CANTIDAD, UNITARIO=costo, TOTAL).
 *
 * Qué hace por cada producto que matchea (por código):
 *   1. Guarda el costo real en `costoPromedio` y `costoFijo` (dato duro).
 *   2. Recalcula el precio de venta como costo × (1 + MARGEN), IGV incluido, y lo
 *      marca `atributosTecnicos.precioDemo = true` (sigue siendo estimado hasta
 *      tener la lista de precios real, pero ahora basado en el costo real, no
 *      aleatorio). Se puede desactivar con --solo-costos.
 *
 * Uso:  npx ts-node -r tsconfig-paths/register src/scripts/import-costos-kaiser.ts [ruta_excel] [--solo-costos] [--margen=0.35]
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { existsSync } from 'fs';
import { join } from 'path';
import * as os from 'os';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const EXCEL_PATH =
  args.find((a) => !a.startsWith('--')) ||
  join(os.homedir(), 'Downloads', 'Copia de Almacenes.xlsx');
const SOLO_COSTOS = args.includes('--solo-costos');
const MARGEN = Number(
  (args.find((a) => a.startsWith('--margen=')) || '--margen=0.35').split('=')[1],
);
const IGV = 1.18;

const CODE_RE = /^[0-9]{5}[A-Za-z]{4}[0-9]{3,4}$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  console.log(`\n💵 Importando COSTOS de Kaiser desde:\n   ${EXCEL_PATH}`);
  console.log(`   Margen de venta: ${(MARGEN * 100).toFixed(0)}% ${SOLO_COSTOS ? '(--solo-costos: NO recalcula precios)' : ''}\n`);
  if (!existsSync(EXCEL_PATH)) throw new Error(`No se encontró el archivo: ${EXCEL_PATH}`);

  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  // Fila de datos: col0=codigo, col3=descripcion, col4=UM, col5=cantidad, col6=unitario(costo)
  const costos = new Map<string, number>();
  for (const r of rows) {
    const code = String(r?.[0] ?? '').trim().toUpperCase();
    if (!CODE_RE.test(code)) continue;
    const unit = Number(r?.[6]);
    if (!isNaN(unit) && unit > 0) costos.set(code, unit); // último gana
  }
  console.log(`   📄 ${costos.size} productos con costo en el archivo.`);

  const empresa = await prisma.empresa.findFirst({
    where: { razonSocial: { contains: 'KAISER', mode: 'insensitive' } },
    orderBy: { id: 'asc' },
  });
  if (!empresa) throw new Error('No se encontró la empresa KAISER.');

  let conCosto = 0, sinMatch = 0, preciosRecalc = 0;
  for (const [code, costo] of costos) {
    const prod = await prisma.producto.findFirst({
      where: { empresaId: empresa.id, codigo: { equals: code, mode: 'insensitive' } },
      select: { id: true, atributosTecnicos: true },
    });
    if (!prod) { sinMatch++; continue; }

    const data: any = {
      costoPromedio: new Prisma.Decimal(round2(costo)),
      costoFijo: new Prisma.Decimal(round2(costo)),
    };

    if (!SOLO_COSTOS) {
      const valor = round2(costo * (1 + MARGEN)); // valor de venta (sin IGV)
      const precio = round2(valor * IGV);          // precio con IGV
      data.valorUnitario = new Prisma.Decimal(valor);
      data.precioUnitario = new Prisma.Decimal(precio);
      const attrs = (prod.atributosTecnicos as any) || {};
      data.atributosTecnicos = { ...attrs, precioDemo: true, precioDesdeCosto: true };
      preciosRecalc++;
    }

    await prisma.producto.update({ where: { id: prod.id }, data });
    conCosto++;
  }

  console.log(`\n✅ Costos importados:`);
  console.log(`   • ${conCosto} productos con costo real cargado`);
  if (!SOLO_COSTOS) console.log(`   • ${preciosRecalc} precios recalculados = costo × ${(1 + MARGEN).toFixed(2)} + IGV`);
  console.log(`   • ${sinMatch} costos sin producto en el catálogo (ignorados)\n`);
  console.log(`⚠️  Precios siguen marcados como DEMO (basados en costo real + ${(MARGEN * 100).toFixed(0)}% margen). Reemplazar por la lista de precios oficial cuando Kaiser la entregue.\n`);
}

main()
  .catch((e) => { console.error('❌ Error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
