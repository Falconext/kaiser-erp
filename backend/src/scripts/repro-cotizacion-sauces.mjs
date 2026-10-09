#!/usr/bin/env node
/**
 * Reproduce en el sistema la cotización REAL de Granja Los Sauces (12-may-2026)
 * y escupe el PDF, para poder ponerlo al lado del suyo.
 *
 * Es la prueba de aceptación que este proyecto se puso: «que el sistema dé un
 * documento que Astrid quiera usar» en vez de redactarlo en Word. Todo lo
 * demás da igual si esa respuesta es no.
 *
 * ⚠ La cotización se INSERTA con una serie que no existe en `Serie` y se borra
 * al terminar: emitirla por la API consumiría correlativos de COT1, y borrarlos
 * después dejaría huecos que `qa:series` caza con razón.
 *
 * Los precios son los SUYOS, sacados del PDF: no se inventa nada ni se depende
 * de `precioBaseKg`, que es justo el dato que falta.
 */
import { NestFactory } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'node:fs';
import { AppModule } from '../../dist/src/app.module.js';
import { ComprobanteService } from '../../dist/src/comprobante/comprobante.service.js';

const prisma = new PrismaClient();
const SALIDA = process.argv[2] || '/tmp/cotizacion-sauces-kaiser.pdf';

const NOTAS = {
  capacidadTotal:
    'Capacidad para 96 aves por módulo, capacidad 12 aves por espacio, capacidad total 40,320 aves',
  incluye:
    'Instalación. El cliente corre con gastos de alimentación y estadía de (2) operarios.\nCoordinaremos con Zenia Tarazona sobre los alimentos.',
  especificaciones:
    'Piso en malla de 2” x 1/2” en alambre III capa de zinc.\nCada módulo incluye bebederos, comederos, tubos, grapas y un soporte.',
  observaciones:
    'El piso del galpón debe estar nivelado.\nConfirmar si tiene palos centrales en galpón, soportes centrales (los más anchos).',
  formaPago: 'Contado 50% y saldo 3 días antes de recoger en fábrica.',
  plazos:
    'Puesto el adelanto, 2 semanas para recoger el pedido.\n1er. Galpón: puesto el adelanto, 2 semanas para su recojo.\n2do. Galpón: 4 semanas después de entregar el primer galpón.',
};

async function main() {
  const modulo = await prisma.producto.findFirst({
    where: { codigo: '10460GALI0002' },
    select: { id: true, descripcion: true, unidadMedidaId: true, tipoAfectacionIGV: true },
  });
  const soporte = await prisma.producto.findFirst({
    where: { codigo: '10461IMPL0028' },
    select: { id: true, descripcion: true },
  });
  const empresa = await prisma.empresa.findFirst({ select: { id: true } });
  const cliente = await prisma.cliente.findFirst({ where: { empresaId: empresa.id }, select: { id: true } });

  // Los números de SU cotización, tal cual.
  const L = [
    { productoId: modulo.id, desc: 'Módulos de Levante de 1 piso', cant: 420, pu: 242.6 },
    { productoId: soporte.id, desc: 'Soportes galvanizado (para final de c/ fila)', cant: 24, pu: 30.0 },
  ];
  const valorVenta = L.reduce((a, x) => a + x.cant * x.pu, 0);
  const igv = Math.round(valorVenta * 0.18 * 100) / 100;

  const cot = await prisma.comprobante.create({
    data: {
      empresaId: empresa.id, sedeId: 1, clienteId: cliente?.id ?? null,
      tipoDoc: 'COT', serie: 'ZSAU', correlativo: 1,
      fechaEmision: new Date('2026-05-12T12:00:00Z'),
      tipoMoneda: 'USD', tipoCambio: 3.453,
      formaPagoTipo: 'CONTADO', formaPagoMoneda: 'USD',
      mtoOperGravadas: valorVenta, mtoIGV: igv, valorVenta,
      totalImpuestos: igv, subTotal: valorVenta + igv, mtoImpVenta: valorVenta + igv,
      saldo: valorVenta + igv, estadoEnvioSunat: 'NO_APLICA',
      cotizNotas: NOTAS,
      cotizVigencia: 15,
      cotizFirmante: 'Astrid Pretel I.',
      detalles: {
        create: L.map((x) => ({
          productoId: x.productoId, unidad: 'NIU', descripcion: x.desc, cantidad: x.cant,
          mtoValorUnitario: x.pu, mtoValorVenta: x.cant * x.pu, mtoBaseIgv: x.cant * x.pu,
          porcentajeIgv: 18, igv: Math.round(x.cant * x.pu * 0.18 * 100) / 100,
          tipAfeIgv: 10, totalImpuestos: Math.round(x.cant * x.pu * 0.18 * 100) / 100,
          mtoPrecioUnitario: Math.round(x.pu * 1.18 * 100) / 100,
        })),
      },
    },
    select: { id: true },
  });

  console.log(`\n📄  Cotización de prueba creada (serie ZSAU, no consume correlativo) · id ${cot.id}`);
  console.log(`    Sub total  US$ ${valorVenta.toFixed(2)}   (el suyo: 102,612.00)`);
  console.log(`    IGV        US$ ${igv.toFixed(2)}   (el suyo: 18,470.16)`);
  console.log(`    TOTAL      US$ ${(valorVenta + igv).toFixed(2)}   (el suyo: 121,082.16)`);

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const svc = app.get(ComprobanteService);
    const { buffer } = await svc.generarBufferPdf(cot.id);
    writeFileSync(SALIDA, buffer);
    console.log(`\n✔ PDF escrito en ${SALIDA} (${(buffer.length / 1024).toFixed(0)} KB)`);
  } finally {
    await app.close();
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: cot.id } });
    await prisma.comprobante.delete({ where: { id: cot.id } });
    console.log('  (cotización de prueba borrada)');
    await prisma.$disconnect();
  }
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
