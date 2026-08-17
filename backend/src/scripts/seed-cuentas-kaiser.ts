/**
 * Siembra las cuentas bancarias oficiales de Kaiser Corporation S.A. para que
 * aparezcan en el bloque "DATOS BANCARIOS" de las cotizaciones (dos columnas:
 * CUENTA DÓLARES / CUENTA SOLES, cada cuenta con su CCI).
 *
 * Idempotente: hace upsert por (empresaId + banco + numeroCuenta); re-ejecutar
 * es seguro (actualiza el CCI/titular sin duplicar).
 *
 * Uso:  npx ts-node -r tsconfig-paths/register src/scripts/seed-cuentas-kaiser.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CUENTAS = [
  // ── DÓLARES ──────────────────────────────────────────────
  {
    banco: 'BCP',
    numeroCuenta: '191-1755411-1-33',
    cci: '002-191-001755411133-50',
    moneda: 'USD',
    tipoCuenta: 'CORRIENTE',
  },
  {
    banco: 'BBVA',
    numeroCuenta: '0011-0377-01-00029473',
    cci: '011-377-000100029473-94',
    moneda: 'USD',
    tipoCuenta: 'CORRIENTE',
  },
  // ── SOLES ────────────────────────────────────────────────
  {
    banco: 'BCP',
    numeroCuenta: '191-1748198-0-64',
    cci: '002-191-001748198064-51',
    moneda: 'PEN',
    tipoCuenta: 'CORRIENTE',
  },
  {
    banco: 'BBVA',
    numeroCuenta: '0011-0377-01-00029457',
    cci: '011-377-000100029457-97',
    moneda: 'PEN',
    tipoCuenta: 'CORRIENTE',
  },
];

async function main() {
  const empresa = await prisma.empresa.findFirst({
    where: { razonSocial: { contains: 'KAISER', mode: 'insensitive' } },
    orderBy: { id: 'asc' },
  });
  if (!empresa) {
    throw new Error('No se encontró la empresa KAISER. Corre el seed primero.');
  }

  const titular = empresa.razonSocial;
  let creadas = 0;
  let actualizadas = 0;

  for (const c of CUENTAS) {
    const existente = await prisma.cuentaBancaria.findFirst({
      where: {
        empresaId: empresa.id,
        banco: c.banco,
        numeroCuenta: c.numeroCuenta,
      },
    });

    if (existente) {
      await prisma.cuentaBancaria.update({
        where: { id: existente.id },
        data: {
          cci: c.cci,
          moneda: c.moneda,
          tipoCuenta: c.tipoCuenta,
          titular,
          activo: true,
          mostrarEnCotizacion: true,
        },
      });
      actualizadas += 1;
    } else {
      await prisma.cuentaBancaria.create({
        data: {
          empresaId: empresa.id,
          banco: c.banco,
          numeroCuenta: c.numeroCuenta,
          cci: c.cci,
          moneda: c.moneda,
          tipoCuenta: c.tipoCuenta,
          titular,
          activo: true,
          mostrarEnCotizacion: true,
        },
      });
      creadas += 1;
    }
  }

  console.log(
    `✅ Cuentas Kaiser (empresa #${empresa.id} "${empresa.razonSocial}"): ${creadas} creadas, ${actualizadas} actualizadas.`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Error sembrando cuentas Kaiser:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
