/**
 * Repara las fechas de agenda del seguimiento guardadas ANTES del arreglo de
 * zona horaria.
 *
 * El controlador hacía `new Date('2026-10-03')`, que es medianoche UTC: en Lima
 * son las 19:00 del día 2, así que la pantalla mostraba el día anterior al que
 * eligió el vendedor. Ya corregido para lo nuevo (`parseFechaSoloDia`), pero lo
 * guardado se sigue viendo torcido: hay que reanclarlo.
 *
 * Se reconocen por su huella exacta —00:00:00.000 UTC—, que la vía nueva no
 * puede producir porque ancla al mediodía. El día que quería el vendedor es el
 * día en UTC del valor guardado, no el de Lima.
 *
 *   npx ts-node -r tsconfig-paths/register src/scripts/corregir-fechas-seguimiento.ts
 *   ... --aplicar   para escribir
 */
import { PrismaClient } from '@prisma/client';
import { parseFechaSoloDia } from '../common/utils/fecha';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');

const enLima = (d: Date) =>
  new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    dateStyle: 'short',
    timeStyle: 'short',
    hour12: false,
  }).format(d);

async function main() {
  const filas = await prisma.seguimientoCotizacion.findMany({
    where: { proximaAccionEn: { not: null } },
    select: { id: true, proximaAccion: true, proximaAccionEn: true },
    orderBy: { id: 'asc' },
  });

  const afectadas = filas.filter((f) => {
    const d = f.proximaAccionEn as Date;
    return (
      d.getUTCHours() === 0 &&
      d.getUTCMinutes() === 0 &&
      d.getUTCSeconds() === 0 &&
      d.getUTCMilliseconds() === 0
    );
  });

  console.log(`\nAgendas con fecha: ${filas.length}`);
  console.log(`Con el desfase de un día: ${afectadas.length}\n`);

  for (const f of afectadas) {
    const antes = f.proximaAccionEn as Date;
    const despues = parseFechaSoloDia(antes);
    console.log(
      `  #${String(f.id).padEnd(4)} ${enLima(antes).padEnd(18)} → ${enLima(despues).padEnd(18)} ${f.proximaAccion ?? '(sin nota)'}`,
    );
  }

  if (!afectadas.length) {
    console.log('  Nada que corregir.\n');
  } else if (!APLICAR) {
    console.log('\nEn seco. Repite con --aplicar para escribir.\n');
  } else {
    for (const f of afectadas) {
      await prisma.seguimientoCotizacion.update({
        where: { id: f.id },
        data: { proximaAccionEn: parseFechaSoloDia(f.proximaAccionEn as Date) },
      });
    }
    console.log(`\n${afectadas.length} fecha(s) corregida(s).\n`);
  }

  await prisma.$disconnect();
}

void main();
