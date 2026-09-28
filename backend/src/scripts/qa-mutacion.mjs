/**
 * Control negativo del QA de maestros.
 *
 * Un script de QA que siempre dice "todo correcto" es indistinguible de uno que
 * no comprueba nada. Aquí se hace lo contrario: se rompe la base a propósito, una
 * cosa a la vez, y se exige que la comprobación correspondiente FALLE. Si no
 * falla, la comprobación es decorativa.
 *
 * Cada mutación se revierte en su `finally`, y al terminar se compara una huella
 * de las tablas tocadas contra la de antes de empezar.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

let cazadas = 0, ciegas = 0;

/** Huella de las tablas que este script toca, para probar que no deja residuo. */
async function huella() {
  const [p, ps, c, s] = await Promise.all([
    prisma.$queryRawUnsafe(`SELECT COUNT(*)::int n, COALESCE(SUM("precioUnitario"),0)::text s FROM "Producto"`),
    prisma.$queryRawUnsafe(`SELECT COUNT(*)::int n, COALESCE(SUM(stock),0)::text s FROM "ProductoStock"`),
    prisma.$queryRawUnsafe(`SELECT COUNT(*)::int n FROM "Cliente"`),
    prisma.$queryRawUnsafe(`SELECT COUNT(*)::int n, COUNT(*) FILTER (WHERE "esPrincipal")::int p FROM "Sede"`),
  ]);
  return JSON.stringify({ p: p[0], ps: ps[0], c: c[0], s: s[0] });
}

/**
 * @param nombre   qué defecto se inyecta
 * @param romper   lo introduce y devuelve la función que lo deshace
 * @param detecta  la comprobación del QA; debe devolver false con el defecto puesto
 */
async function mutar(nombre, romper, detecta) {
  // Antes de nada: la comprobación debe estar en verde, o no probamos nada.
  if (!(await detecta())) {
    console.log(`  ⚠ ${nombre}: la comprobación ya estaba en rojo, no se puede medir`);
    return;
  }
  let deshacer = null;
  try {
    deshacer = await romper();
    const sigueVerde = await detecta();
    if (sigueVerde) {
      console.log(`  ✘ CIEGA  ${nombre} → el QA no se dio cuenta`);
      ciegas++;
    } else {
      console.log(`  ✔ cazada  ${nombre}`);
      cazadas++;
    }
  } finally {
    if (deshacer) await deshacer();
  }
  if (!(await detecta())) {
    console.log(`  ✘ ¡la reversión de "${nombre}" no restauró el estado!`);
    ciegas++;
  }
}

// ── Las comprobaciones, copiadas tal cual de qa-maestros.mjs ───────────────
const sinDuplicados = async () => {
  const d = await prisma.$queryRawUnsafe(
    `SELECT codigo FROM "Producto" WHERE codigo IS NOT NULL GROUP BY codigo HAVING COUNT(*) > 1 LIMIT 5`);
  return d.length === 0;
};
const sinPrecioCero = async () =>
  (await prisma.producto.count({ where: { precioUnitario: { lte: 0 } } })) === 0;
const sinStockNegativo = async () => {
  const n = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int n FROM "ProductoStock" WHERE stock < 0`);
  return n[0].n === 0;
};
const unaSolaPrincipal = async () =>
  (await prisma.sede.findMany({ select: { esPrincipal: true } })).filter((s) => s.esPrincipal).length === 1;
const documentosValidos = async () => {
  const m = await prisma.$queryRawUnsafe(
    `SELECT c."nroDoc" FROM "Cliente" c JOIN "TipoDocumento" td ON td.id = c."tipoDocumentoId"
     WHERE (td.codigo = '6' AND c."nroDoc" !~ '^[0-9]{11}$')
        OR (td.codigo = '1' AND c."nroDoc" !~ '^[0-9]{8}$') LIMIT 5`);
  return m.length === 0;
};

async function main() {
  const antes = await huella();
  console.log('Control negativo: se rompe la base a propósito y se exige que el QA lo cace.\n');

  const refP = await prisma.producto.findFirst();
  const refS = await prisma.sede.findFirst({ where: { esPrincipal: false } });
  const refC = await prisma.cliente.findFirst({ where: { tipoDocumento: { codigo: '6' } } });

  // 1. El código duplicado: resulta que la base ni lo permite. Se comprueba la
  //    constraint en vez de la mutación — una invariante impuesta por el motor
  //    es más fuerte que una comprobación de QA, que se puede olvidar de correr.
  try {
    await prisma.producto.create({
      data: {
        codigo: refP.codigo, descripcion: '[QA-MUTACION] clon', precioUnitario: 1,
        valorUnitario: 1, empresaId: refP.empresaId,
        tipoAfectacionIGV: refP.tipoAfectacionIGV ?? '10', unidadMedidaId: refP.unidadMedidaId,
      },
    });
    console.log('  ✘ CIEGA  código de producto duplicado → la base lo aceptó');
    ciegas++;
    await prisma.producto.deleteMany({ where: { descripcion: '[QA-MUTACION] clon' } });
  } catch (e) {
    const esUnique = e.code === 'P2002';
    console.log(`  ${esUnique ? '✔ cazada ' : '✘ CIEGA  '} código duplicado → ${esUnique ? 'la base lo rechaza (unique empresaId+codigo)' : e.code}`);
    esUnique ? cazadas++ : ciegas++;
  }

  // 2. Un producto a precio cero: se vendería regalado.
  await mutar('producto con precio 0', async () => {
    const previo = refP.precioUnitario;
    await prisma.producto.update({ where: { id: refP.id }, data: { precioUnitario: 0 } });
    return () => prisma.producto.update({ where: { id: refP.id }, data: { precioUnitario: previo } });
  }, sinPrecioCero);

  // 3. Stock negativo: el kardex descuadrado.
  await mutar('stock negativo en una sede', async () => {
    const ps = await prisma.productoStock.findFirst();
    const previo = ps.stock;
    await prisma.productoStock.update({ where: { id: ps.id }, data: { stock: -5 } });
    return () => prisma.productoStock.update({ where: { id: ps.id }, data: { stock: previo } });
  }, sinStockNegativo);

  // 4. Dos sedes principales: las series de comprobantes dejarían de ser únicas.
  await mutar('dos sedes principales', async () => {
    await prisma.sede.update({ where: { id: refS.id }, data: { esPrincipal: true } });
    return () => prisma.sede.update({ where: { id: refS.id }, data: { esPrincipal: false } });
  }, unaSolaPrincipal);

  // 5. Un RUC de 8 dígitos escrito directo en base, sin pasar por la API.
  await mutar('RUC con formato inválido', async () => {
    const previo = refC.nroDoc;
    await prisma.cliente.update({ where: { id: refC.id }, data: { nroDoc: '12345678' } });
    return () => prisma.cliente.update({ where: { id: refC.id }, data: { nroDoc: previo } });
  }, documentosValidos);

  const despues = await huella();
  console.log(`\nHuella de las tablas tocadas: ${antes === despues ? '✔ idéntica, no queda residuo' : '✘ CAMBIÓ'}`);
  if (antes !== despues) { console.log(`  antes:   ${antes}`); console.log(`  después: ${despues}`); }
  console.log(`\n${cazadas} defectos cazados · ${ciegas} puntos ciegos`);
  await prisma.$disconnect();
  process.exit(ciegas === 0 && antes === despues ? 0 : 1);
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
