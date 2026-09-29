/**
 * Marca como histórico las notas de venta que se cargaron antes de que el
 * importador escribiera `origenDato`.
 *
 * Por qué existe: `importar-nota-venta.service.ts` carga notas de venta del
 * sistema anterior y **no toca el kardex a propósito** —esas salidas ya las
 * declaró el sistema viejo—. Pero hasta hoy no dejaba marca, así que
 * `cuadres:corregir` las veía como "ventas sin salida de almacén" y les
 * inventaba movimientos, descontando stock real. Ya pasó en la base de la demo:
 * 43 movimientos con la marca `[cuadre]` colgando de 28 notas de venta.
 *
 * Solo toca comprobantes que cumplen las tres condiciones a la vez:
 *   · `tipoDoc = 'NV'`
 *   · `origenDato` vacío
 *   · sin ningún movimiento de kardex
 * Una NV creada de verdad en el ERP descuenta stock al emitirse, así que la
 * tercera condición deja fuera cualquier venta real.
 *
 * Uso:  pnpm run marcar:nv                 (en seco, no escribe)
 *       pnpm run marcar:nv -- --aplicar    (escribe)
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');
const MARCA = 'importacion-nv';

async function main() {
  const host = (process.env.DATABASE_URL ?? '').replace(/^.*@([^/:]+).*$/, '$1');
  console.log(`\nMarcar notas de venta importadas · host ${host || '(desconocido)'}`);
  console.log(APLICAR ? 'MODO ESCRITURA\n' : 'En seco: no escribe nada. Con --aplicar escribe.\n');

  const candidatas = await prisma.comprobante.findMany({
    where: { tipoDoc: 'NV', origenDato: null, movimientosKardex: { none: {} } },
    select: { id: true, serie: true, correlativo: true, fechaEmision: true },
    orderBy: { id: 'asc' },
  });

  const conKardex = await prisma.comprobante.count({
    where: { tipoDoc: 'NV', origenDato: null, movimientosKardex: { some: {} } },
  });

  console.log(`   ${candidatas.length} nota(s) de venta sin marca y sin kardex → se marcarían como '${MARCA}'`);
  if (candidatas.length) {
    const desde = candidatas[0].fechaEmision.toISOString().slice(0, 10);
    const hasta = candidatas[candidatas.length - 1].fechaEmision.toISOString().slice(0, 10);
    console.log(`   rango: ${desde} → ${hasta}`);
  }
  if (conKardex) {
    console.log(`\n   ⚠ ${conKardex} nota(s) de venta sin marca pero CON kardex: no se tocan.`);
    console.log('     O son ventas reales del ERP, o ya recibieron movimientos inventados por');
    console.log('     `cuadres:corregir` (los suyos llevan la marca "[cuadre]" en la observación).');
    console.log('     Revísalas a mano antes de decidir: quitar un movimiento cambia el stock.');
  }

  if (APLICAR && candidatas.length) {
    const r = await prisma.comprobante.updateMany({
      where: { id: { in: candidatas.map((c) => c.id) } },
      data: { origenDato: MARCA },
    });
    console.log(`\n   ✔ ${r.count} marcada(s). \`cuadres:corregir\` ya no les inventará salidas.`);
  } else if (candidatas.length) {
    console.log('\n   (en seco: no se escribió nada · añade --aplicar)');
  }

  console.log('');
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect(); process.exit(1); });
