#!/usr/bin/env node
/**
 * Reproduce el pedido REAL de piezas sueltas PE20-00003384 (Granja Avícola La
 * Yema, 25-sep-2026) — el otro formato que Kaiser usa, además del de módulos.
 *
 * Sirve para contestar una pregunta concreta: **¿puede Astrid emitir hoy este
 * documento en el sistema?** La respuesta tiene dos mitades, y el guion las
 * separa: lo que falla por falta de producto en el catálogo, y lo que el
 * sistema sí resuelve.
 */
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';
import { AppModule } from '../../dist/src/app.module.js';
import { ComprobanteService } from '../../dist/src/comprobante/comprobante.service.js';

const prisma = new PrismaClient();
const SALIDA = process.argv[2] || '/tmp/pedido-piezas-kaiser.pdf';

/** Las ocho líneas de su pedido, tal cual. */
const LINEAS = [
  ['10461IMPL0031', 'PISO LEVANTE GALV III ZINC -2 X 1/2 (2 PISOS)', 62, 10.0],
  ['10461IMPL0116', 'COBERTURA LEVANTE 2 PISOS CIR GALV III ZINC', 62, 31.0],
  ['10461IMPL0074', 'PUERTA LEVANTE GALV III ZINC', 124, 0.5],
  ['10461IMPL0062', 'SOPORTE DE PUERTAS POSTURA M.AMERICANO', 124, 0.04],
  ['10461IMPL0117', 'DIVISION LEVANTE 2 PISOS CIR GALV III ZINC 2.5', 260, 2.0],
  ['10461IMPL0102', 'CORTINAS GALVANIZADAS LEVANTE', 248, 1.0],
  ['90090GRAP0005', 'GRAPAS PARA PISTOLA NEUMATICA DE 1/2"', 1, 34.0],
  ['10470INST0002', 'SERVICIO DE INSTALACION', 1, 187.5],
];

async function main() {
  console.log('\n🔩  Pedido de piezas PE20-00003384 · Granja Avícola La Yema\n');
  const empresa = await prisma.empresa.findFirst({ select: { id: true } });
  const cliente = await prisma.cliente.findFirst({ where: { empresaId: empresa.id }, select: { id: true } });

  const resueltas = [];
  const faltantes = [];
  for (const [cod, desc, cant, pu] of LINEAS) {
    const prod = await prisma.producto.findFirst({ where: { codigo: cod }, select: { id: true, descripcion: true } });
    if (prod) resueltas.push({ prod, cod, desc, cant, pu, catalogo: prod.descripcion });
    else faltantes.push({ cod, desc, cant, pu });
  }

  console.log(`  ${resueltas.length} de ${LINEAS.length} líneas tienen producto en el catálogo.`);
  if (faltantes.length) {
    console.log(`\n  ✘ ${faltantes.length} NO existen — y el catálogo salió de un archivo de STOCK,`);
    console.log('    así que lo que no tenía existencias ese día no está (los servicios, ninguno):');
    faltantes.forEach((f) => console.log(`     ${f.cod}  ${f.desc}`));
  }
  const distintas = resueltas.filter(
    (r) => r.catalogo.toUpperCase().slice(0, 16) !== r.desc.toUpperCase().slice(0, 16),
  );
  if (distintas.length) {
    console.log(`\n  ⚠ ${distintas.length} existe(n) pero con OTRA descripción — mismo código, otro producto:`);
    distintas.forEach((d) => console.log(`     ${d.cod}\n        su pedido: ${d.desc}\n        catálogo:  ${d.catalogo}`));
  }

  // ── Lo que el sistema SÍ resuelve: las que faltan entran como ÍTEM LIBRE ──
  // No tienen `productoId`, así que no tocan stock ni despachos pendientes.
  // Es el mismo mecanismo con el que ya viaja el flete.
  console.log('\n  Emitiendo con las que faltan como ÍTEM LIBRE (sin productoId)…');
  const todas = [
    ...resueltas.map((r) => ({ productoId: r.prod.id, ...r })),
    ...faltantes.map((f) => ({ productoId: null, ...f })),
  ];
  const valorVenta = todas.reduce((a, x) => a + x.cant * x.pu, 0);
  const igv = Math.round(valorVenta * 0.18 * 100) / 100;

  const cot = await prisma.comprobante.create({
    data: {
      empresaId: empresa.id, sedeId: 1, clienteId: cliente?.id ?? null,
      tipoDoc: 'COT', serie: 'ZPZA', correlativo: 1,
      fechaEmision: new Date('2026-09-25T12:00:00Z'),
      tipoMoneda: 'USD', tipoCambio: 3.453,
      formaPagoTipo: 'CONTADO', formaPagoMoneda: 'USD',
      mtoOperGravadas: valorVenta, mtoIGV: igv, valorVenta,
      totalImpuestos: igv, subTotal: valorVenta + igv, mtoImpVenta: valorVenta + igv,
      saldo: valorVenta + igv, estadoEnvioSunat: 'NO_APLICA',
      cotizFirmante: 'Astrid Pretel I.',
      detalles: {
        create: todas.map((x) => ({
          productoId: x.productoId, unidad: x.cod === '10470INST0002' ? 'ZZ' : 'NIU',
          descripcion: x.desc, cantidad: x.cant,
          mtoValorUnitario: x.pu, mtoValorVenta: x.cant * x.pu, mtoBaseIgv: x.cant * x.pu,
          porcentajeIgv: 18, igv: Math.round(x.cant * x.pu * 0.18 * 100) / 100,
          tipAfeIgv: 10, totalImpuestos: Math.round(x.cant * x.pu * 0.18 * 100) / 100,
          mtoPrecioUnitario: Math.round(x.pu * 1.18 * 100) / 100,
        })),
      },
    },
    select: { id: true },
  });

  console.log(`\n  Valor venta  US$ ${valorVenta.toFixed(2)}   (el suyo: 3,598.46)`);
  console.log(`  Precio venta US$ ${(valorVenta + igv).toFixed(2)}   (el suyo: 4,246.18)`);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const { buffer } = await app.get(ComprobanteService).generarBufferPdf(cot.id);
    writeFileSync(SALIDA, buffer);
    console.log(`\n  ✔ PDF en ${SALIDA} (${(buffer.length / 1024).toFixed(0)} KB)`);
  } finally {
    await app.close();
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: cot.id } });
    await prisma.comprobante.delete({ where: { id: cot.id } });
    await prisma.$disconnect();
  }
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
