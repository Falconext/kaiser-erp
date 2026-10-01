/**
 * QA del VENDEDOR DE CAMPO: el ciclo completo de quien vende en la calle.
 *
 *   1. Se le apunta la venta (`Comprobante.vendedorCampoId`).
 *   2. Cuando SUNAT la acepta, cobra su comisión — **también cuando la
 *      aceptación llega por conciliación** (SUNAT 1033: "ya registrado" y el
 *      CDR nunca llegó). Ese era el agujero: la rama de conciliación no pasa
 *      por el punto donde se generan las comisiones, así que la venta quedaba
 *      EMITIDA y el vendedor no cobraba nunca.
 *   3. Cobra en efectivo donde está el cliente, y el panel de ventas dice a
 *      qué bolsillo entró el dinero (`Pago.dirigidoA`).
 *
 * No emite nada a SUNAT ni consume correlativos: inserta los comprobantes con
 * una serie de QA que no existe en `Serie` y los borra al terminar.
 *
 *   pnpm run qa:vendedor-campo
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { EnviarSunatService } from '../comprobante/enviar-sunat.service';
import { ComprobanteService } from '../comprobante/comprobante.service';
import { VentasService } from '../ventas/ventas.service';

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

const SERIE_QA = 'FQA9';
const creados: number[] = [];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error'],
  });
  const prisma = app.get(PrismaService);
  const enviarSunat = app.get(EnviarSunatService);
  const comprobanteService = app.get(ComprobanteService);
  const ventasService = app.get(VentasService);

  console.log('\nQA · Vendedor de campo');
  console.log('═'.repeat(58));

  const empresa = await prisma.empresa.findFirst({
    select: { id: true, cobranzaCampo: true },
  });
  if (!empresa) throw new Error('No hay empresa en la base.');
  const sede = await prisma.sede.findFirst({
    where: { empresaId: empresa.id },
    select: { id: true },
  });
  const cliente = await prisma.cliente.findFirst({
    where: { empresaId: empresa.id },
    select: { id: true },
  });
  if (!sede || !cliente) throw new Error('Falta sede o cliente.');

  // Dos usuarios distintos: quien digita la factura y quien la vendió en la calle.
  const usuarios = await prisma.usuario.findMany({
    where: { empresaId: empresa.id },
    select: { id: true, nombre: true, comisionGlobal: true },
    orderBy: { id: 'asc' },
    take: 2,
  });
  if (usuarios.length < 2)
    throw new Error(
      'Hacen falta 2 usuarios para distinguir emisor de vendedor.',
    );
  const [emisor, vendedorCampo] = usuarios;

  // Un producto con comisión configurada, o la comisión sale 0 y no se crea nada.
  const producto = await prisma.producto.findFirst({
    where: { empresaId: empresa.id },
    select: {
      id: true,
      descripcion: true,
      comisionPorcentaje: true,
      comisionPorVenta: true,
    },
  });
  if (!producto) throw new Error('No hay productos.');

  // ── Semilla reversible de la configuración de comisión ────────────────────
  const comisionPrevia = {
    producto: {
      comisionPorcentaje: producto.comisionPorcentaje,
      comisionPorVenta: producto.comisionPorVenta,
    },
    vendedor: { comisionGlobal: vendedorCampo.comisionGlobal },
  };
  await prisma.producto.update({
    where: { id: producto.id },
    data: { comisionPorcentaje: 5, comisionPorVenta: null },
  });

  const nuevoComprobante = async (
    correlativo: number,
    extra: Record<string, unknown> = {},
  ) => {
    const c = await prisma.comprobante.create({
      data: {
        empresaId: empresa.id,
        sedeId: sede.id,
        clienteId: cliente.id,
        usuarioId: emisor.id,
        tipoDoc: '01',
        serie: SERIE_QA,
        correlativo,
        fechaEmision: new Date(),
        tipoMoneda: 'PEN',
        mtoOperGravadas: 100,
        mtoIGV: 18,
        totalImpuestos: 18,
        valorVenta: 100,
        subTotal: 118,
        mtoImpVenta: 118,
        saldo: 118,
        estadoEnvioSunat: 'PENDIENTE_CONCILIACION' as any,
        estadoPago: 'PENDIENTE_PAGO',
        formaPagoTipo: 'CONTADO',
        formaPagoMoneda: 'PEN',
        sunatErrorMsg: 'QA: SUNAT 1033 simulado.',
        detalles: {
          create: [
            {
              productoId: producto.id,
              descripcion: producto.descripcion,
              cantidad: 1,
              mtoValorUnitario: 100,
              mtoPrecioUnitario: 118,
              mtoValorVenta: 100,
              mtoBaseIgv: 100,
              igv: 18,
              totalImpuestos: 18,
              unidad: 'NIU',
              tipAfeIgv: 10,
              porcentajeIgv: 18,
            },
          ],
        },
        ...extra,
      },
      select: { id: true },
    });
    creados.push(c.id);
    return c.id;
  };

  try {
    // ── 1. Conciliar paga la comisión ────────────────────────────────────────
    console.log('\n1) Conciliar (SUNAT 1033) le paga la comisión al vendedor');
    const id1 = await nuevoComprobante(99000001, {
      vendedorCampoId: vendedorCampo.id,
      vendedorCampoNombre: vendedorCampo.nombre,
    });
    const antes = await prisma.comisionVendedor.count({
      where: { comprobanteId: id1 },
    });
    ok(antes === 0, 'nace sin comisión (el CDR nunca llegó)', `había ${antes}`);

    await comprobanteService.conciliarComprobante(id1, empresa.id);
    const estado1 = await prisma.comprobante.findUnique({
      where: { id: id1 },
      select: { estadoEnvioSunat: true },
    });
    ok(
      String(estado1?.estadoEnvioSunat) === 'EMITIDO',
      'queda EMITIDO',
      `está ${estado1?.estadoEnvioSunat}`,
    );

    const comis1 = await prisma.comisionVendedor.findMany({
      where: { comprobanteId: id1 },
    });
    ok(
      comis1.length > 0,
      'la conciliación generó la comisión',
      'no se generó ninguna — el vendedor no cobraría',
    );
    ok(
      comis1.every((c) => c.vendedorId === vendedorCampo.id),
      'la comisión es del vendedor de campo, no del que digitó',
      `vendedorId=${comis1.map((c) => c.vendedorId).join(',')} (campo=${vendedorCampo.id}, emisor=${emisor.id})`,
    );
    const monto1 = comis1.reduce((s, c) => s + Number(c.montoComision), 0);
    ok(
      Math.abs(monto1 - 5.9) < 0.01,
      '5 % de S/ 118 = S/ 5.90',
      `salió S/ ${monto1.toFixed(2)}`,
    );

    // ── 2. Idempotencia ──────────────────────────────────────────────────────
    console.log('\n2) Volver a pasar por el helper no duplica la comisión');
    const conDetalles = await prisma.comprobante.findUnique({
      where: { id: id1 },
      include: { detalles: true },
    });
    await enviarSunat.registrarComisionesAlAceptar(conDetalles);
    await enviarSunat.registrarComisionesAlAceptar(conDetalles);
    const comis1b = await prisma.comisionVendedor.count({
      where: { comprobanteId: id1 },
    });
    ok(
      comis1b === comis1.length,
      'sigue habiendo las mismas comisiones',
      `pasó de ${comis1.length} a ${comis1b}`,
    );

    // ── 3. Conciliar dos veces está prohibido ────────────────────────────────
    console.log('\n3) Un comprobante ya conciliado no se vuelve a conciliar');
    let rechazo = '';
    try {
      await comprobanteService.conciliarComprobante(id1, empresa.id);
    } catch (e: any) {
      rechazo = String(e?.message ?? '');
    }
    ok(
      rechazo.includes('PENDIENTE_CONCILIACION'),
      'se rechaza por estado',
      rechazo || 'no lanzó nada',
    );

    // ── 4. Sin vendedor de campo, cobra el emisor ────────────────────────────
    console.log('\n4) Sin vendedor apuntado, la comisión cae en quien emitió');
    const id2 = await nuevoComprobante(99000002);
    await comprobanteService.conciliarComprobante(id2, empresa.id);
    const comis2 = await prisma.comisionVendedor.findMany({
      where: { comprobanteId: id2 },
    });
    ok(comis2.length > 0, 'también se genera', 'no se generó');
    ok(
      comis2.every((c) => c.vendedorId === emisor.id),
      'es del emisor',
      `vendedorId=${comis2.map((c) => c.vendedorId).join(',')}`,
    );

    // ── 5. El panel dice a qué bolsillo entró el dinero ──────────────────────
    console.log(
      '\n5) El panel de ventas muestra a quién se le entregó el cobro',
    );
    const pago = await prisma.pago.create({
      data: {
        comprobanteId: id1,
        empresaId: empresa.id,
        monto: 50,
        medioPago: 'EFECTIVO',
        fecha: new Date(),
        dirigidoA: 'VENDEDOR',
        vendedorNombre: vendedorCampo.nombre,
        usuarioId: emisor.id,
      },
      select: { id: true },
    });
    // El panel es de un día: el de hoy en Lima, que es la fecha de emisión del QA.
    const hoyLima = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    // Sin `usuarioId`: gerencia ve todo. Con él, el panel filtra por vendedor
    // efectivo y esta venta es del vendedor de campo, no del emisor.
    const panel = await ventasService.panelVentas({
      empresaId: empresa.id,
      fecha: hoyLima,
    });
    const fila: any = (panel.data ?? []).find(
      (i: any) => i.comprobanteId === id1,
    );
    ok(!!fila, 'el comprobante aparece en el panel', 'no apareció');
    ok(
      String(fila?.dirigidoA ?? '').includes(vendedorCampo.nombre),
      `la columna dice "Vendedor: ${vendedorCampo.nombre}"`,
      `dice "${fila?.dirigidoA}"`,
    );
    ok(
      Array.isArray(fila?.cobros) && fila.cobros.length === 1,
      'el detalle del cobro viaja para el modal',
      `cobros=${JSON.stringify(fila?.cobros)}`,
    );
    ok(
      Array.isArray(fila?.comprobantesPago),
      'comprobantesPago es un arreglo aunque esté vacío',
      `${JSON.stringify(fila?.comprobantesPago)}`,
    );
    await prisma.pago.delete({ where: { id: pago.id } });

    // ── 6. Notas de crédito y débito no comisionan ───────────────────────────
    console.log('\n6) Una nota de crédito no genera comisión positiva');
    const id3 = await nuevoComprobante(99000003, {
      tipoDoc: '07',
      vendedorCampoId: vendedorCampo.id,
    });
    const nc = await prisma.comprobante.findUnique({
      where: { id: id3 },
      include: { detalles: true },
    });
    await enviarSunat.registrarComisionesAlAceptar(nc);
    const comis3 = await prisma.comisionVendedor.count({
      where: { comprobanteId: id3 },
    });
    ok(comis3 === 0, 'la nota de crédito no comisiona', `generó ${comis3}`);

    // ── 7. Anti-doble cobro desde un informal ────────────────────────────────
    console.log(
      '\n7) Si el informal ya comisionó, la factura que lo formaliza no vuelve a pagar',
    );
    const idInformal = await nuevoComprobante(99000004, {
      tipoDoc: 'NV',
      vendedorCampoId: vendedorCampo.id,
    });
    await prisma.comisionVendedor.create({
      data: {
        vendedorId: vendedorCampo.id,
        comprobanteId: idInformal,
        productoId: producto.id,
        empresaId: empresa.id,
        mes: new Date().getMonth() + 1,
        anio: new Date().getFullYear(),
        cantidad: 1,
        montoComision: 5.9,
        estado: 'PENDIENTE',
      },
    });
    const idFormal = await nuevoComprobante(99000005, {
      vendedorCampoId: vendedorCampo.id,
      comprobanteOrigenId: idInformal,
    });
    const formal = await prisma.comprobante.findUnique({
      where: { id: idFormal },
      include: { detalles: true },
    });
    await enviarSunat.registrarComisionesAlAceptar(formal);
    const comis5 = await prisma.comisionVendedor.count({
      where: { comprobanteId: idFormal },
    });
    ok(
      comis5 === 0,
      'no se paga dos veces la misma venta',
      `generó ${comis5} comisiones de más`,
    );

    // ── 8. El backfill ve lo que quedó atrás ─────────────────────────────────
    console.log(
      '\n8) El backfill detecta las ventas en conciliación sin comisión',
    );
    const id6 = await nuevoComprobante(99000006, {
      vendedorCampoId: vendedorCampo.id,
    });
    const atascadas = await prisma.comprobante.count({
      where: {
        estadoEnvioSunat: 'PENDIENTE_CONCILIACION' as any,
        tipoDoc: { in: ['01', '03'] },
      },
    });
    ok(
      atascadas >= 1,
      'hay al menos una para reparar',
      `encontró ${atascadas}`,
    );
    const sinComision = await prisma.comprobante.findMany({
      where: {
        estadoEnvioSunat: 'PENDIENTE_CONCILIACION' as any,
        tipoDoc: { in: ['01', '03'] },
      },
      include: { detalles: true },
    });
    for (const c of sinComision) {
      if (
        (await prisma.comisionVendedor.count({
          where: { comprobanteId: c.id },
        })) === 0
      ) {
        await enviarSunat.registrarComisionesAlAceptar(c);
      }
    }
    const comis6 = await prisma.comisionVendedor.count({
      where: { comprobanteId: id6 },
    });
    ok(
      comis6 > 0,
      'el backfill le paga la comisión atrasada',
      'quedó sin comisión',
    );

    // ── 9. El interruptor de la cobranza en campo ────────────────────────────
    console.log('\n9) Estado del interruptor de cobranza en campo');
    ok(
      typeof empresa.cobranzaCampo === 'boolean',
      `Empresa.cobranzaCampo = ${empresa.cobranzaCampo} (si está en false, la UI no ofrece el selector)`,
    );
  } catch (e: any) {
    // Sin esto el `finally` cerraba el proceso con un ✅ engañoso y el error
    // de un bloque a medias se perdía.
    fallos++;
    console.log(`\n   ✘ el QA se cortó: ${e?.message}`);
    console.log(e?.stack?.split('\n').slice(1, 4).join('\n'));
  } finally {
    // ── Limpieza ─────────────────────────────────────────────────────────────
    await prisma.comisionVendedor.deleteMany({
      where: { comprobanteId: { in: creados } },
    });
    await prisma.pago.deleteMany({ where: { comprobanteId: { in: creados } } });
    await prisma.detalleComprobante.deleteMany({
      where: { comprobanteId: { in: creados } },
    });
    await prisma.comprobante.updateMany({
      where: { id: { in: creados } },
      data: { comprobanteOrigenId: null },
    });
    await prisma.comprobante.deleteMany({ where: { id: { in: creados } } });
    await prisma.producto.update({
      where: { id: producto.id },
      data: comisionPrevia.producto,
    });
    const quedan = await prisma.comprobante.count({
      where: { serie: SERIE_QA },
    });
    console.log(
      `\n   🧹 Limpieza: ${creados.length} comprobantes de QA borrados (quedan ${quedan} con serie ${SERIE_QA})`,
    );

    console.log('\n' + '═'.repeat(58));
    console.log(
      `${fallos === 0 ? '✅' : '❌'} ${pruebas - fallos}/${pruebas} comprobaciones\n`,
    );
    await app.close();
    process.exit(fallos === 0 ? 0 : 1);
  }
}

main().catch((e) => {
  console.error('❌ Error:', e);
  process.exit(1);
});
