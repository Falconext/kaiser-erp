/**
 * Pone costo a los productos de la DEMO que no lo tienen.
 *
 * ⚠ SOLO PARA DATOS DE DEMOSTRACIÓN. No correr contra la base de Kaiser:
 * un costo deducido del precio no es el costo real, y el costo real es la base
 * del costo de ventas, del margen y del valor del inventario en el balance. Lo
 * que Kaiser tiene que hacer es cargar sus costos con `pnpm run import:costos`.
 *
 * EL PROBLEMA. La importación del catálogo dejó 72 productos con precio y sin
 * `costoPromedio`. 43 de ellos además tienen existencias. Eso rompe tres cosas:
 *   · el costo de ventas: una salida de kardex vale 0 y el margen sale del 100 %
 *   · el balance: esas existencias valen 0 en el asiento de apertura, así que
 *     cada venta descarga un almacén contablemente vacío y la 20/21 se va en
 *     negativo
 *   · y donde el sembrador de la demo escribía el precio como costo (un fallo ya
 *     corregido), no se pudo corregir porque no había costo con qué sustituirlo
 *
 * LA REGLA. El catálogo de Kaiser tiene un margen uniforme: de los 335 productos
 * con costo y precio, la relación (precio sin IGV) / costo tiene mediana 1,35.
 * Así que el costo que falta se deduce de ahí:
 *
 *     costo = (precioUnitario / 1.18) / 1.35
 *
 * Una regla sola para todos, no un número inventado producto por producto. Los
 * productos fabricados NO se calculan por receta a propósito: sus recetas también
 * tienen componentes sin costo, así que saldría un costo incompleto —el KIT
 * PARRON daba S/ 51,20 con 3 de sus 6 componentes en cero— y un costo incompleto
 * miente peor que uno deducido, porque parece calculado.
 *
 *   node src/scripts/seed-costos-faltantes-demo.mjs            # en seco
 *   node src/scripts/seed-costos-faltantes-demo.mjs --aplicar
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');
const IGV = 1.18;
const MARGEN = 1.35;
const r2 = (n) => Math.round(n * 100) / 100;
const S = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function main() {
  const sinCosto = await prisma.producto.findMany({
    where: { OR: [{ costoPromedio: 0 }, { costoPromedio: null }] },
    select: { id: true, codigo: true, descripcion: true, precioUnitario: true },
    orderBy: { codigo: 'asc' },
  });

  const conPrecio = sinCosto.filter((p) => Number(p.precioUnitario) > 0);
  const sinNada = sinCosto.filter((p) => !(Number(p.precioUnitario) > 0));

  console.log(`\nProductos sin costo: ${sinCosto.length}`);
  console.log(`  con precio (se deducen): ${conPrecio.length}`);
  console.log(`  sin precio (no se toca): ${sinNada.length}`);
  if (sinNada.length) console.log(`    ${sinNada.map((p) => p.codigo).join(', ')}`);

  let valorInventario = 0;
  for (const p of conPrecio) {
    const costo = r2(Number(p.precioUnitario) / IGV / MARGEN);
    const stock = await prisma.productoStock.aggregate({ where: { productoId: p.id }, _sum: { stock: true } });
    valorInventario += costo * Number(stock._sum.stock ?? 0);
    if (APLICAR) await prisma.producto.update({ where: { id: p.id }, data: { costoPromedio: costo } });
  }
  console.log(`\nValor de inventario que estas existencias pasan a tener: ${S(valorInventario)}`);

  // Los movimientos de salida de esos productos quedaron con costo 0 —o, en un
  // caso, con el precio de venta— y el costo de ventas del P&L sale de ahí.
  const movs = await prisma.movimientoKardex.findMany({
    where: { productoId: { in: conPrecio.map((p) => p.id) }, tipoMovimiento: 'SALIDA' },
    select: { id: true, productoId: true, cantidad: true, costoUnitario: true, concepto: true },
  });
  const costoNuevo = new Map(conPrecio.map((p) => [p.id, r2(Number(p.precioUnitario) / IGV / MARGEN)]));
  let corregidos = 0;
  let deltaCosto = 0;
  for (const m of movs) {
    const nuevo = costoNuevo.get(m.productoId);
    const antes = Number(m.costoUnitario ?? 0);
    if (antes === nuevo) continue;
    deltaCosto += (nuevo - antes) * Number(m.cantidad);
    corregidos += 1;
    if (antes > nuevo * 1.2) {
      console.log(`  ⚠ mov #${m.id} traía ${S(antes)} (el precio de venta) → ${S(nuevo)} · ${m.concepto}`);
    }
    if (APLICAR) {
      await prisma.movimientoKardex.update({
        where: { id: m.id },
        data: { costoUnitario: nuevo, valorTotal: r2(nuevo * Number(m.cantidad)) },
      });
    }
  }
  console.log(`\nMovimientos de salida a corregir: ${corregidos} · el costo de ventas cambia en ${S(deltaCosto)}`);
  console.log(APLICAR ? '\n✔ Aplicado.' : '\n(en seco — añade --aplicar para escribir)');
  console.log('⚠ Después de aplicar hay que EXTORNAR y volver a generar el asiento de apertura,\n  porque el inventario pasa a valer más, y regenerar los asientos del período.\n');
}

main().finally(() => prisma.$disconnect());
