/**
 * QA del seguimiento de cotizaciones: la fecha que elige el vendedor tiene que
 * ser la que se guarda, la que se lee y la que se ve — sin corrimientos.
 *
 * El fallo que motivó esto: el vendedor agendaba el 03/10 y el sistema mostraba
 * 02/10. `new Date('2026-10-03')` es medianoche UTC y Lima va cinco horas por
 * detrás, así que la fecha caía en las 19:00 del día anterior.
 *
 *   pnpm run qa:seguimiento
 */
import { PrismaClient } from '@prisma/client';
import {
  parseFechaSoloDia,
  inicioDelDiaLima,
  finDelDiaLima,
} from '../common/utils/fecha';

const prisma = new PrismaClient();
let fallos = 0;
let pruebas = 0;

const ok = (cond: boolean, titulo: string, detalle = '') => {
  pruebas++;
  if (cond) console.log(`   ✔ ${titulo}`);
  else {
    fallos++;
    console.log(`   ✘ ${titulo}${detalle ? `\n       ${detalle}` : ''}`);
  }
};

/** El día calendario tal como lo ve Lima. */
const diaEnLima = (d: Date) =>
  new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);

console.log('\nQA · Fechas del seguimiento de cotizaciones');
console.log('═'.repeat(50));

console.log('\n1) La fecha elegida sobrevive al viaje de ida y vuelta');
for (const elegida of [
  '2026-10-03',
  '2026-01-01',
  '2026-12-31',
  '2026-02-28',
  '2028-02-29',
]) {
  const guardada = parseFechaSoloDia(elegida);
  const vista = diaEnLima(guardada);
  const esperada = elegida.split('-').reverse().join('/');
  ok(
    vista === esperada,
    `${elegida} se ve como ${esperada}`,
    `se vio ${vista} (guardado ${guardada.toISOString()})`,
  );
}

// El helper ancla al mediodía UTC: quedan 12 h de margen hacia atrás y 11 h 59
// hacia delante, así que el día calendario aguanta de UTC-12 a UTC+11:59. Más
// allá —Fiyi (+12), Auckland en verano (+13), Kiritimati (+14)— el ancla se
// pasa de medianoche y cae al día siguiente. No se prueban a propósito: Kaiser
// factura en Lima, y correr el ancla para cubrirlas rompería el otro extremo.
console.log(
  '\n2) Y también en zonas horarias lejanas (por si se abre fuera de Perú)',
);
for (const tz of [
  'America/Lima',
  'Pacific/Midway',
  'Asia/Tokyo',
  'Europe/Madrid',
  'Asia/Kolkata',
]) {
  const g = parseFechaSoloDia('2026-10-03');
  const visto = new Intl.DateTimeFormat('es-PE', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(g);
  ok(visto === '03/10/2026', `${tz.padEnd(20)} ve 03/10/2026`, `vio ${visto}`);
}

console.log('\n3) El rango del informe incluye los días de los extremos');
const desde = inicioDelDiaLima('2026-09-01');
const hasta = finDelDiaLima('2026-09-30');
ok(
  diaEnLima(desde) === '01/09/2026',
  'desde = 01/09 a las 00:00 de Lima',
  `dio ${diaEnLima(desde)} ${desde.toISOString()}`,
);
ok(
  diaEnLima(hasta) === '30/09/2026',
  'hasta = 30/09 al final del día',
  `dio ${diaEnLima(hasta)} ${hasta.toISOString()}`,
);
// Un evento a las 23:30 del último día del rango tiene que entrar.
const tarde = new Date('2026-09-30T23:30:00-05:00');
ok(
  tarde >= desde && tarde <= hasta,
  'un evento del 30/09 a las 23:30 entra en el rango',
);
const anterior = new Date('2026-08-31T23:30:00-05:00');
ok(!(anterior >= desde), 'y uno del 31/08 a las 23:30 se queda fuera');

console.log('\n4) "Vencida" solo cuando el día ya terminó');
const estaVencida = (c: Date) => finDelDiaLima(c).getTime() < Date.now();
const hoy = new Date();
const claveHoy = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
}).format(hoy);
const maniana = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
}).format(new Date(Date.now() + 86_400_000));
const ayer = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
}).format(new Date(Date.now() - 86_400_000));
ok(
  !estaVencida(parseFechaSoloDia(claveHoy)),
  'lo agendado para HOY no está vencido',
);
ok(!estaVencida(parseFechaSoloDia(maniana)), 'lo de mañana tampoco');
ok(estaVencida(parseFechaSoloDia(ayer)), 'lo de ayer sí está vencido');

async function main() {
  console.log('\n5) Lo que hay guardado en la base');
  const filas = await prisma.seguimientoCotizacion.findMany({
    where: { proximaAccionEn: { not: null } },
    select: {
      id: true,
      proximaAccion: true,
      proximaAccionEn: true,
      creadoEn: true,
    },
    orderBy: { id: 'desc' },
    take: 10,
  });
  if (!filas.length) console.log('   · sin agenda registrada todavía');
  for (const f of filas) {
    const cuando = f.proximaAccionEn as Date;
    const hora = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(cuando);
    // Medianoche UTC (19:00 en Lima) es la huella del bug antiguo.
    const sospechosa = hora === '19:00';
    ok(
      !sospechosa,
      `#${f.id} ${diaEnLima(cuando)} ${hora} — ${f.proximaAccion ?? '(sin nota)'}`,
      'guardada a medianoche UTC: registro anterior al arreglo, se ve un día antes',
    );
  }

  console.log('\n' + '═'.repeat(50));
  console.log(
    fallos
      ? `✘ ${fallos} de ${pruebas} comprobaciones fallaron\n`
      : `✔ ${pruebas} comprobaciones, todo correcto\n`,
  );
  await prisma.$disconnect();
  process.exitCode = fallos ? 1 : 0;
}

void main();
