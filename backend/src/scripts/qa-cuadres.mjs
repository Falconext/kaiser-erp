/**
 * QA de `corregir-cuadres`: fija las reglas que decidan QUÉ es un descuadre,
 * porque equivocarse aquí se escribe en el inventario.
 *
 * La que motivó este QA: el paso 2 (“comprobantes que no registraron la
 * salida”) excluía COT y notas de crédito pero NO las notas de pedido ni las
 * órdenes de trabajo. Un NP es un compromiso, no una salida: la mercadería
 * sigue en estantería hasta que se despacha. El corrector proponía descontarla,
 * y con `--aplicar` habría dejado el stock por debajo de lo real.
 *
 * Ejecuta el script REAL en seco y lee lo que propone: así el QA falla si
 * alguien vuelve a tocar el filtro, no solo si se rompe una copia de la lógica.
 *
 *   pnpm run qa:cuadres
 */
import { PrismaClient } from '@prisma/client';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const ejecutar = promisify(execFile);
const prisma = new PrismaClient();
let fallos = 0, pruebas = 0;
const creados = [];

const ok = (cond, titulo, detalle = '') => {
  pruebas++;
  if (cond) console.log(`   ✔ ${titulo}`);
  else { fallos++; console.log(`   ✘ ${titulo}${detalle ? `\n       ${detalle}` : ''}`); }
};

/** Corre el corrector EN SECO y devuelve cuántos propone en cada paso. */
async function propuesta() {
  const { stdout } = await ejecutar('node', ['src/scripts/corregir-cuadres.mjs']);
  const num = (re) => {
    const m = stdout.match(re);
    return m ? Number(m[1]) : -1;
  };
  return {
    sedes: num(/(\d+) a ajustar/),
    documentos: num(/(\d+) documentos sin movimiento/),
    globales: num(/(\d+) productos a recalcular/),
    salida: stdout,
  };
}

/** Comprobante mínimo con una línea de producto y SIN movimiento de kardex. */
async function comprobanteSinSalida(tipoDoc, serie, empresaId, sedeId, clienteId, productoId) {
  const c = await prisma.comprobante.create({
    data: {
      empresaId, sedeId, clienteId, tipoDoc, serie,
      correlativo: 900000 + Math.floor(Math.random() * 9000),
      fechaEmision: new Date(), tipoMoneda: 'PEN', formaPagoTipo: 'CONTADO', formaPagoMoneda: 'PEN',
      mtoOperGravadas: 100, mtoIGV: 18, valorVenta: 100,
      totalImpuestos: 18, subTotal: 118, mtoImpVenta: 118, saldo: 118,
      estadoEnvioSunat: 'EMITIDO',
      detalles: {
        create: [{
          productoId, unidad: 'NIU', descripcion: 'QA cuadres', cantidad: 1,
          mtoValorUnitario: 100, mtoValorVenta: 100, mtoBaseIgv: 100,
          porcentajeIgv: 18, igv: 18, tipAfeIgv: 10, totalImpuestos: 18,
          mtoPrecioUnitario: 118,
        }],
      },
    },
    select: { id: true },
  });
  creados.push(c.id);
  return c.id;
}

async function main() {
  console.log('\nQA · Reglas del corrector de cuadres');
  console.log('═'.repeat(52));

  const emp = await prisma.empresa.findFirst({ select: { id: true } });
  const sede = await prisma.sede.findFirst({ where: { empresaId: emp.id }, select: { id: true } });
  const cli = await prisma.cliente.findFirst({ where: { empresaId: emp.id }, select: { id: true } });
  const prod = await prisma.producto.findFirst({ where: { empresaId: emp.id }, select: { id: true, codigo: true } });

  console.log('\n1) Punto de partida');
  const base = await propuesta();
  ok(base.sedes >= 0 && base.documentos >= 0, 'el corrector se ejecuta y su salida se puede leer');
  console.log(`   · propone hoy: ${base.sedes} sede(s), ${base.documentos} documento(s), ${base.globales} global(es)`);

  console.log('\n2) Los documentos de PRE-VENTA no son salidas de stock');
  for (const [tipoDoc, nombre] of [['NP', 'nota de pedido'], ['OT', 'orden de trabajo'], ['COT', 'cotización']]) {
    await comprobanteSinSalida(tipoDoc, tipoDoc + '99', emp.id, sede.id, cli.id, prod.id);
    const p = await propuesta();
    ok(p.documentos === base.documentos,
       `una ${nombre} (${tipoDoc}) sin movimiento NO se propone descontar`,
       `pasó de ${base.documentos} a ${p.documentos}: descontaría stock de mercadería que sigue en almacén`);
  }

  console.log('\n3) Una venta de verdad SÍ es un descuadre');
  await comprobanteSinSalida('01', 'FQA9', emp.id, sede.id, cli.id, prod.id);
  const conFactura = await propuesta();
  ok(conFactura.documentos === base.documentos + 1,
     'una FACTURA sin movimiento sí se detecta',
     `esperaba ${base.documentos + 1}, dio ${conFactura.documentos}`);

  await comprobanteSinSalida('03', 'BQA9', emp.id, sede.id, cli.id, prod.id);
  const conBoleta = await propuesta();
  ok(conBoleta.documentos === base.documentos + 2, 'y una BOLETA también');

  console.log('\n4) La nota de crédito nunca descuenta (devuelve, no saca)');
  await comprobanteSinSalida('07', 'NCQ9', emp.id, sede.id, cli.id, prod.id);
  const conNC = await propuesta();
  ok(conNC.documentos === base.documentos + 2, 'una nota de crédito (07) no se propone');

  console.log('\n5) Invariante: el stock global es la suma de sus sedes');
  const productos = await prisma.producto.findMany({ where: { empresaId: emp.id }, select: { id: true, codigo: true, stock: true } });
  let descuadrados = 0;
  for (const pr of productos) {
    const filas = await prisma.productoStock.findMany({ where: { productoId: pr.id }, select: { stock: true } });
    const suma = filas.reduce((a, f) => a + Number(f.stock), 0);
    if (Math.abs(Number(pr.stock) - suma) > 0.001) descuadrados++;
  }
  ok(descuadrados === 0, `los ${productos.length} productos cuadran con sus sedes`,
     `${descuadrados} descuadrado(s): corre \`pnpm run cuadres:corregir -- --aplicar\``);

  console.log('\n6) Limpieza');
  for (const id of creados) {
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: id } }).catch(() => {});
    await prisma.comprobante.delete({ where: { id } }).catch(() => {});
  }
  const final = await propuesta();
  ok(final.documentos === base.documentos, `se borraron los ${creados.length} documentos de prueba`);

  console.log('\n' + '═'.repeat(52));
  console.log(fallos ? `✘ ${fallos} de ${pruebas} comprobaciones fallaron\n` : `✔ ${pruebas} comprobaciones, todo correcto\n`);
  await prisma.$disconnect();
  process.exitCode = fallos ? 1 : 0;
}

main().catch(async (e) => {
  console.error('\n✘', e.message, '\n');
  for (const id of creados) {
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: id } }).catch(() => {});
    await prisma.comprobante.delete({ where: { id } }).catch(() => {});
  }
  await prisma.$disconnect();
  process.exitCode = 1;
});
