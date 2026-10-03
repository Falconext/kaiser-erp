/**
 * Recupera el enlace entre un movimiento de kardex y la importación que lo
 * originó, leyendo el número del propio concepto ("IMPORTACIÓN IMP-000002 DUA …").
 *
 * Hace falta porque hasta el 2-oct-2026 el ingreso por nacionalización se
 * registraba SIN `importacionId`: el origen quedaba dentro del texto, que sirve
 * para que lo lea una persona y para nada más. Sin el enlace, ese ingreso sale
 * en el consolidado y en la trazabilidad sin proveedor y como "Ajuste manual"
 * —justo la columna en blanco de la que se queja almacén—.
 *
 * Mismo criterio que `enlazar:guias`: EN SECO por defecto, `-- --aplicar` escribe.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const aplicar = process.argv.includes('--aplicar');

const main = async () => {
  console.log(`\n🔗 Enlazar movimientos de kardex con su importación ${aplicar ? '(APLICANDO)' : '(en seco)'}\n`);

  const huerfanos = await prisma.movimientoKardex.findMany({
    where: { importacionId: null, concepto: { startsWith: 'IMPORTACIÓN' } },
    select: { id: true, empresaId: true, concepto: true, fecha: true, cantidad: true },
    orderBy: { id: 'asc' },
  });

  if (huerfanos.length === 0) {
    console.log('   No hay movimientos de importación sin enlazar.\n');
    return;
  }
  console.log(`   ${huerfanos.length} movimiento(s) sin enlace\n`);

  // Cachea las importaciones por empresa+número para no consultar una por fila.
  const porNumero = new Map();
  for (const imp of await prisma.importacion.findMany({
    select: { id: true, empresaId: true, numero: true, numeroDua: true,
              proveedor: { select: { nombre: true } } },
  })) {
    porNumero.set(`${imp.empresaId}|${imp.numero}`, imp);
  }

  let enlazados = 0, sinPareja = 0;
  for (const m of huerfanos) {
    // "IMPORTACIÓN IMP-000002 DUA 235-…" → IMP-000002
    const nro = m.concepto.match(/IMPORTACI[ÓO]N\s+(\S+)/i)?.[1];
    const imp = nro ? porNumero.get(`${m.empresaId}|${nro}`) : null;

    if (!imp) {
      console.log(`   ⚠  mov ${m.id}: no encuentro la importación · "${m.concepto}"`);
      sinPareja++;
      continue;
    }
    console.log(
      `   ✔  mov ${m.id} → ${imp.numero}` +
      `${imp.numeroDua ? ` (DUA ${imp.numeroDua})` : ' (sin DUA)'}` +
      ` · ${imp.proveedor?.nombre ?? 'sin proveedor'}`,
    );
    if (aplicar) {
      await prisma.movimientoKardex.update({
        where: { id: m.id }, data: { importacionId: imp.id },
      });
    }
    enlazados++;
  }

  console.log(
    `\n   ${enlazados} enlazado(s)${sinPareja ? `, ${sinPareja} sin pareja` : ''}` +
    `${aplicar ? '' : '  ← en seco: vuelve a correrlo con  -- --aplicar'}\n`,
  );
};

main()
  .catch((e) => { console.error('\n✘', e.message, '\n'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
