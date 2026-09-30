/**
 * Datos de demostración para el ciclo operativo de Kaiser.
 *
 * Complementa a `seed-demo-presentacion.mjs` y `seed-demo-ventas.mjs`, que ya
 * dejan catálogo, clientes, producción e importaciones. Aquí se llenan los
 * módulos que quedaban vacíos y por eso no se podían mostrar:
 *
 *   · Facturas y boletas a los clientes industriales (con su vendedor)
 *   · Cotizaciones del mes en sus tres estados (ganada, en curso, perdida)
 *   · Guías de remisión remitente (GRE-R) de esas ventas
 *   · Turnos de caja con apertura, movimientos y cierre
 *   · Comisiones de vendedor sobre las ventas emitidas
 *   · Gastos operativos del mes (el P&L mostraba "Gastos op. S/ 0.00")
 *
 * IMPORTANTE — los comprobantes que crea este script NO se enviaron a SUNAT.
 * Se marcan como EMITIDO y se dejan sin XML ni CDR a propósito: fabricar una
 * respuesta de SUNAT sería falsificar un documento oficial. Para enseñar el
 * ciclo real (XML, CDR y QR) emite una factura en vivo contra el sandbox QPSE.
 *
 * Es idempotente: todo lo que inserta lleva la marca OBS_DEMO y se borra al
 * volver a ejecutarlo, así que no duplica ni toca datos previos.
 *
 *   node src/scripts/seed-demo-operaciones.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Marca que identifica lo insertado por este script. Va en el campo
 * `origenDato`, NO en `observaciones`: las observaciones son texto del cliente
 * y se imprimen en el PDF del comprobante.
 */
/**
 * `--agregar` no borra lo sembrado antes: solo crea las ventas que todavía no
 * están (y sus guías, cobros, comisiones y kardex). Existe porque los
 * correlativos de una serie no se pueden reordenar: borrar los comprobantes
 * de la demo y volver a emitirlos los renumera y deja un hueco que la serie
 * no puede explicar. En una base nueva corre sin la bandera.
 */
const AGREGAR = process.argv.includes('--agregar');

const OBS_DEMO = '[demo-operaciones]';
const IGV = 0.18;
const ANIO = 2026;
const MES = 9;

const d = (dia, hora = 10) => new Date(Date.UTC(ANIO, MES - 1, dia, hora + 5, 0, 0));
const r2 = (n) => Math.round(n * 100) / 100;
const r3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Ventas del mes. Cada una usa productos que el cliente de ese sector
 * realmente compraría: cortavientos y cubresuelo para agroexportación,
 * comederos para avícola, postes y malla ganadera para pecuario.
 */
const VENTAS = [
  {
    dia: 2, tipoDoc: '01', serie: 'F0A1', clienteCod: '20600998877', vendedor: 'ventas',
    medioPago: 'Transferencia', guia: true, placa: 'BTK-842', conductor: ['Luis', 'Quispe Mamani', '41258963', 'Q41258963'],
    items: [
      { cod: '22530COVI0001', cant: 40 },
      { cod: '22030CSUE0002', cant: 25 },
    ],
  },
  {
    dia: 4, tipoDoc: '01', serie: 'F0A1', clienteCod: '20481122334', vendedor: 'ventas',
    medioPago: 'Transferencia', guia: true, placa: 'AXG-119', conductor: ['Marco', 'Ríos Alvarado', '09874521', 'R09874521'],
    items: [
      { cod: '10461IMPL0097', cant: 120 },
      { cod: '20110PUAS0001', cant: 30 },
    ],
  },
  {
    dia: 9, tipoDoc: '01', serie: 'F0A1', clienteCod: '20455667788', vendedor: 'ventas',
    medioPago: 'Credito', guia: true, placa: 'CQW-703', conductor: ['Julio', 'Ccama Huanca', '44127856', 'C44127856'],
    items: [
      { cod: '10490POSG0001', cant: 260 },
      { cod: '20120GANA0008', cant: 18 },
      { cod: '20110PUAS0001', cant: 45 },
    ],
  },
  {
    dia: 15, tipoDoc: '01', serie: 'F0A1', clienteCod: '20530012345', vendedor: 'gerencia',
    medioPago: 'Transferencia', guia: false,
    items: [
      { cod: '10490PARR0001', cant: 22 },
      { cod: '20110PUAS0001', cant: 60 },
    ],
  },
  {
    dia: 18, tipoDoc: '03', serie: 'B0A1', clienteCod: '20612255963', vendedor: 'ventas',
    medioPago: 'Efectivo', guia: false,
    items: [
      { cod: '10780VARI0010', cant: 40 },
      { cod: '22130RASC0001', cant: 15 },
    ],
  },
  {
    dia: 23, tipoDoc: '01', serie: 'F0A1', clienteCod: '20600998877', vendedor: 'ventas',
    medioPago: 'Transferencia', guia: true, placa: 'BTK-842', conductor: ['Luis', 'Quispe Mamani', '41258963', 'Q41258963'],
    items: [
      { cod: '20630DIAM0001', cant: 30 },
      { cod: '22130RASC0002', cant: 24 },
    ],
  },

  // Las nueve siguientes existen para que el mes esté COMPLETO. Con solo las
  // seis de arriba, septiembre tenía ventas en 6 días de 30 y el P&L comparaba
  // un mes entero de alquiler, servicios y planilla contra dos semanas de
  // facturación: daba pérdida por un desfase de calendario, no por el negocio.
  // Cada una usa productos que ese cliente compraría en su campaña.
  {
    dia: 3, tipoDoc: '01', serie: 'F0A1', clienteCod: '20530012345', vendedor: 'ventas',
    medioPago: 'Transferencia', guia: true, placa: 'DVT-556', conductor: ['Pedro', 'Chávez Núñez', '40125478', 'C40125478'],
    items: [
      { cod: '22630MTER0002', cant: 8 },
      { cod: '20840FAGR0012', cant: 5 },
    ],
  },
  {
    dia: 7, tipoDoc: '01', serie: 'F0A1', clienteCod: '20455667788', vendedor: 'ventas',
    medioPago: 'Credito', guia: true, placa: 'CQW-703', conductor: ['Julio', 'Ccama Huanca', '44127856', 'C44127856'],
    items: [
      { cod: '20120GANA0008', cant: 45 },
      { cod: '20110PUAS0001', cant: 120 },
      { cod: '20590TENS0001', cant: 400 },
    ],
  },
  {
    dia: 11, tipoDoc: '01', serie: 'F0A1', clienteCod: '20556677889', vendedor: 'ventas',
    medioPago: 'Transferencia', guia: false,
    items: [
      { cod: '10210GTRZ0011', cant: 1200 },
      { cod: '20510TREN0003', cant: 900 },
    ],
  },
  {
    dia: 16, tipoDoc: '01', serie: 'F0A1', clienteCod: '20600998877', vendedor: 'gerencia',
    medioPago: 'Transferencia', guia: true, placa: 'EGM-231', conductor: ['Óscar', 'Salazar Pinto', '43218765', 'S43218765'],
    items: [
      { cod: '21830ALUM0001', cant: 6 },
      { cod: '22030CSUE0002', cant: 10 },
    ],
  },
  {
    dia: 19, tipoDoc: '01', serie: 'F0A1', clienteCod: '20481122334', vendedor: 'ventas',
    medioPago: 'Credito', guia: true, placa: 'AXG-119', conductor: ['Marco', 'Ríos Alvarado', '09874521', 'R09874521'],
    items: [
      { cod: '20630DIAM0001', cant: 30 },
      { cod: '20630DIAM0003', cant: 15 },
    ],
  },
  {
    dia: 21, tipoDoc: '03', serie: 'B0A1', clienteCod: '20612255963', vendedor: 'ventas',
    medioPago: 'Efectivo', guia: false,
    items: [
      { cod: '20590TENS0001', cant: 150 },
      { cod: '22440FAGR0010', cant: 200 },
    ],
  },
  {
    dia: 25, tipoDoc: '01', serie: 'F0A1', clienteCod: '20530012345', vendedor: 'ventas',
    medioPago: 'Transferencia', guia: true, placa: 'DVT-556', conductor: ['Pedro', 'Chávez Núñez', '40125478', 'C40125478'],
    items: [
      { cod: '22530COVI0001', cant: 14 },
      { cod: '20840FAGR0014', cant: 6 },
    ],
  },
  {
    dia: 26, tipoDoc: '01', serie: 'F0A1', clienteCod: '20487654321', vendedor: 'ventas',
    medioPago: 'Transferencia', guia: false,
    items: [
      { cod: '20110GACC0002', cant: 1100 },
      { cod: '10210GTRZ0008', cant: 800 },
      { cod: '20510GACC0003', cant: 700 },
    ],
  },
  {
    dia: 29, tipoDoc: '01', serie: 'F0A1', clienteCod: '20600998877', vendedor: 'gerencia',
    medioPago: 'Credito', guia: true, placa: 'FJH-908', conductor: ['Iván', 'Tello Ramos', '45987412', 'T45987412'],
    items: [
      { cod: '22630MTER0002', cant: 10 },
      { cod: '21830ALUM0002', cant: 12 },
    ],
  },
];

/** Gastos fijos y variables típicos de una planta en Lima. */
/**
 * Cotizaciones del mes. Es el punto 5 del pliego (cotización → venta), así que
 * la pantalla tiene que enseñar el embudo completo, no solo presupuestos
 * sueltos: dos ya ganadas —las que se convirtieron en las facturas del día 2 y
 * del 9—, dos aún en la mesa del cliente y una que se perdió.
 *
 * `estadoPedido` es lo que pinta el estado en el listado.
 */
const COTIZACIONES = [
  {
    dia: 1, clienteCod: '20600998877', vendedor: 'ventas', pago: 'COMPLETADO', pedido: 'FACTURADO',
    vigencia: 15, nota: 'Convertida en F0A1-00000005.',
    items: [{ cod: '22530COVI0001', cant: 40 }, { cod: '22030CSUE0002', cant: 25 }],
  },
  {
    dia: 5, clienteCod: '20455667788', vendedor: 'ventas', pago: 'COMPLETADO', pedido: 'FACTURADO',
    vigencia: 15, nota: 'Convertida en F0A1-00000007.',
    items: [{ cod: '10461IMPL0035', cant: 60 }],
  },
  {
    dia: 11, clienteCod: '20530012345', vendedor: 'gerencia', pago: 'PENDIENTE_PAGO', pedido: 'PENDIENTE',
    vigencia: 20, nota: 'A la espera de la orden de compra del cliente.',
    items: [{ cod: '22530COVI0001', cant: 80 }, { cod: '20110PUAS0001', cant: 40 }],
  },
  {
    dia: 17, clienteCod: '20481122334', vendedor: 'ventas', pago: 'PENDIENTE_PAGO', pedido: 'PENDIENTE',
    vigencia: 20, nota: 'Ampliación de galpones — pendiente de visita técnica.',
    items: [{ cod: '10461IMPL0097', cant: 200 }],
  },
  {
    dia: 19, clienteCod: '20612255963', vendedor: 'ventas', pago: 'ANULADO', pedido: 'ANULADO',
    vigencia: 10, nota: 'El cliente aplazó el proyecto.',
    // Perder una cotización guarda POR QUÉ. Sin esto, el panel "Por qué perdemos"
    // sale vacío aunque la demo tenga una cotización perdida.
    motivoPerdida: 'CLIENTE_APLAZO',
    motivoPerdidaDetalle: 'La obra se movió al primer trimestre del año siguiente.',
    items: [{ cod: '20510GACC0003', cant: 150 }],
  },
];

const GASTOS = [
  { dia: 2,  categoria: 'ALQUILER', etiqueta: 'Alquiler de planta y almacén', monto: 9800,  proveedor: 'Inmobiliaria Francia S.A.C.', medioPago: 'Transferencia' },
  { dia: 5,  categoria: 'OTROS',    etiqueta: 'Energía eléctrica — planta',   monto: 4320.5, proveedor: 'Luz del Sur',                 medioPago: 'Transferencia' },
  { dia: 5,  categoria: 'OTROS',    etiqueta: 'Agua y alcantarillado',        monto: 615.8,  proveedor: 'Sedapal',                     medioPago: 'Transferencia' },
  { dia: 10, categoria: 'ENVIOS',   etiqueta: 'Flete de despachos a provincia', monto: 3150, proveedor: 'Transportes Roca',            medioPago: 'Transferencia' },
  { dia: 12, categoria: 'OTROS',    etiqueta: 'Mantenimiento de trefiladora', monto: 2480,   proveedor: 'Servicios Industriales JR',   medioPago: 'Transferencia' },
  { dia: 15, categoria: 'SUELDOS',  etiqueta: 'Planilla quincena — producción', monto: 18600, proveedor: null,                         medioPago: 'Transferencia' },
  { dia: 20, categoria: 'PUBLICIDAD', etiqueta: 'Campaña agro — redes',       monto: 1250,   proveedor: 'Meta Platforms',              medioPago: 'Tarjeta' },
  { dia: 22, categoria: 'OTROS',    etiqueta: 'EPP y seguridad de planta',    monto: 1740.3, proveedor: 'Segurindustria',              medioPago: 'Efectivo' },
];

async function limpiarDemoPrevia(empresaId) {
  const previos = await prisma.comprobante.findMany({
    where: { empresaId, origenDato: OBS_DEMO },
    select: { id: true },
  });
  const ids = previos.map((c) => c.id);

  if (ids.length) {
    // Devolver al stock lo que estas ventas habían descontado, antes de borrar
    // sus movimientos: si no, cada pasada del seed dejaría el inventario más
    // bajo que la anterior.
    const movs = await prisma.movimientoKardex.findMany({
      where: { comprobanteId: { in: ids } },
      select: { productoId: true, sedeId: true, cantidad: true, tipoMovimiento: true },
    });
    for (const m of movs) {
      if (!m.sedeId) continue;
      const signo = m.tipoMovimiento === 'SALIDA' ? 1 : -1;
      await prisma.productoStock.updateMany({
        where: { productoId: m.productoId, sedeId: m.sedeId },
        data: { stock: { increment: signo * Number(m.cantidad) } },
      });
    }
    await prisma.movimientoKardex.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.comisionVendedor.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.pago.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.leyenda.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.comprobante.deleteMany({ where: { id: { in: ids } } });
  }

  const guias = await prisma.guiaRemision.findMany({
    where: { empresaId, origenDato: OBS_DEMO },
    select: { id: true },
  });
  if (guias.length) {
    await prisma.detalleGuiaRemision.deleteMany({ where: { guiaRemisionId: { in: guias.map((g) => g.id) } } });
    await prisma.guiaRemision.deleteMany({ where: { id: { in: guias.map((g) => g.id) } } });
  }

  await prisma.movimientoCaja.deleteMany({ where: { empresaId, observaciones: { contains: OBS_DEMO } } });
  await prisma.gastoOperativo.deleteMany({ where: { empresaId, descripcion: { contains: OBS_DEMO } } });

  return { comprobantes: ids.length, guias: guias.length };
}

async function main() {
  const empresa = await prisma.empresa.findFirst();
  if (!empresa) throw new Error('No hay empresa. Corre primero el arranque del backend (initializeDatabase).');
  const sede = await prisma.sede.findFirst({ where: { empresaId: empresa.id } });

  const usuarios = await prisma.usuario.findMany({ where: { empresaId: empresa.id } });
  const uVentas = usuarios.find((u) => u.email?.startsWith('ventas@')) || usuarios[0];
  const uGerencia = usuarios.find((u) => u.rol === 'ADMIN_EMPRESA') || usuarios[0];
  const porRol = { ventas: uVentas, gerencia: uGerencia };

  const borrado = AGREGAR ? { comprobantes: 0, guias: 0 } : await limpiarDemoPrevia(empresa.id);
  if (borrado.comprobantes || borrado.guias) {
    console.log(`↺ Limpieza previa: ${borrado.comprobantes} comprobante(s), ${borrado.guias} guía(s).`);
  }
  if (AGREGAR) console.log('→ Modo agregar: no se borra nada, solo se crea lo que falta.');

  // ── Comprobantes ──────────────────────────────────────────────────────────
  const correlativos = {};
  for (const { serie } of VENTAS) {
    if (correlativos[serie] != null) continue;
    const ultimo = await prisma.comprobante.findFirst({
      where: { empresaId: empresa.id, serie }, orderBy: { correlativo: 'desc' }, select: { correlativo: true },
    });
    correlativos[serie] = ultimo?.correlativo ?? 0;
  }

  const emitidos = [];
  /** producto:sede que tocó alguna venta, para recomponer su saldo al final. */
  const tocados = new Set();
  for (const venta of VENTAS) {
    if (AGREGAR) {
      // Por DÍA, no por instante: cada venta se emite a una hora distinta, así
      // que comparar el timestamp exacto no reconocía ninguna y las duplicaba
      // todas.
      const ya = await prisma.comprobante.findFirst({
        where: {
          empresaId: empresa.id,
          serie: venta.serie,
          fechaEmision: { gte: d(venta.dia, 0), lt: d(venta.dia + 1, 0) },
        },
        select: { correlativo: true },
      });
      if (ya) { console.log(`· ${venta.serie}-${String(ya.correlativo).padStart(8, '0')} (día ${venta.dia}) ya existe, se deja como está.`); continue; }
    }
    const cliente = await prisma.cliente.findFirst({ where: { empresaId: empresa.id, nroDoc: venta.clienteCod } });
    if (!cliente) { console.log(`⚠ Cliente ${venta.clienteCod} no existe, se omite la venta del ${venta.dia}.`); continue; }

    const detalles = [];
    for (const it of venta.items) {
      const prod = await prisma.producto.findFirst({ where: { empresaId: empresa.id, codigo: it.cod } });
      if (!prod) { console.log(`⚠ Producto ${it.cod} no existe, se omite del comprobante.`); continue; }
      const precioUnit = Number(prod.precioUnitario);
      const valorUnit = r2(precioUnit / (1 + IGV));
      const valorVenta = r2(valorUnit * it.cant);
      detalles.push({
        productoId: prod.id,
        unidad: prod.unidadVenta || 'NIU',
        descripcion: prod.descripcion,
        cantidad: it.cant,
        mtoValorUnitario: valorUnit,
        mtoValorVenta: valorVenta,
        mtoBaseIgv: valorVenta,
        porcentajeIgv: 18,
        igv: r2(valorVenta * IGV),
        tipAfeIgv: 10,
        totalImpuestos: r2(valorVenta * IGV),
        mtoPrecioUnitario: precioUnit,
        mtoDescuento: 0,
      });
    }
    if (!detalles.length) continue;

    const gravadas = r2(detalles.reduce((a, x) => a + x.mtoValorVenta, 0));
    const igv = r2(gravadas * IGV);
    const total = r2(gravadas + igv);
    const correlativo = ++correlativos[venta.serie];
    const vendedor = porRol[venta.vendedor] || uVentas;
    const alCredito = venta.medioPago === 'Credito';

    const comprobante = await prisma.comprobante.create({
      data: {
        empresaId: empresa.id,
        sedeId: sede?.id ?? null,
        clienteId: cliente.id,
        usuarioId: vendedor.id,
        tipoDoc: venta.tipoDoc,
        serie: venta.serie,
        correlativo,
        fechaEmision: d(venta.dia, 9 + (venta.dia % 6)),
        tipoMoneda: 'PEN',
        tipoCambio: 1,
        formaPagoMoneda: 'PEN',
        formaPagoTipo: alCredito ? 'Credito' : 'Contado',
        paymentDetails: {
          mode: 'SIMPLE',
          amount: total,
          method: venta.medioPago.toUpperCase(),
          cuentaBancariaId: null,
        },
        tipoOperacionId: 1,
        mtoOperGravadas: gravadas,
        mtoOperInafectas: 0,
        mtoOperExoneradas: 0,
        mtoOperExportacion: 0,
        mtoDescuentoGlobal: 0,
        mtoAnticipos: 0,
        mtoIGV: igv,
        valorVenta: gravadas,
        totalImpuestos: igv,
        subTotal: total,
        mtoImpVenta: total,
        // Sin envío real a SUNAT: se deja sin XML ni CDR a propósito.
        estadoEnvioSunat: 'EMITIDO',
        medioPago: venta.medioPago,
        estadoPago: alCredito ? 'PENDIENTE_PAGO' : 'COMPLETADO',
        saldo: alCredito ? total : 0,
        origenDato: OBS_DEMO,
        detalles: { create: detalles },
      },
    });

    if (!alCredito) {
      await prisma.pago.create({
        data: {
          empresaId: empresa.id,
          comprobanteId: comprobante.id,
          monto: total,
          fecha: d(venta.dia, 12),
          medioPago: venta.medioPago,
          observacion: OBS_DEMO,
        },
      });
    }

    // Comisión del vendedor: 2% del valor de venta, como en el resto del seed.
    await prisma.comisionVendedor.create({
      data: {
        empresaId: empresa.id,
        vendedorId: vendedor.id,
        comprobanteId: comprobante.id,
        mes: MES,
        anio: ANIO,
        cantidad: detalles.reduce((a, x) => a + Number(x.cantidad), 0),
        montoComision: r2(gravadas * 0.02),
        descripcion: `Comisión 2% — ${venta.serie}-${String(correlativo).padStart(8, '0')}`,
        motivo: 'VENTA',
        estado: venta.dia <= 15 ? 'PAGADO' : 'PENDIENTE',
      },
    });

    // Movimiento de kardex por la venta.
    //
    // Sin esto, la tarjeta de stock no enseñaba ninguna de estas ventas, que es
    // exactamente lo que almacén reporta como su problema principal en el
    // sistema actual ("hay ventas que no figuran en la tarjeta de stock"). La
    // demo no puede reproducir el defecto que viene a resolver.
    //
    // Se escribe directo, no por KardexService, porque este script corre fuera
    // de Nest; el cálculo es el mismo: stock anterior → stock actual por sede.
    for (const linea of detalles) {
      const ps = await prisma.productoStock.findUnique({
        where: { productoId_sedeId: { productoId: linea.productoId, sedeId: sede.id } },
        select: { stock: true },
      });
      const anterior = Number(ps?.stock ?? 0);
      const cantidad = Number(linea.cantidad);
      const actual = r3(anterior - cantidad);

      // El COSTO de la salida es lo que costó la mercadería, no lo que se cobró
      // por ella. Aquí se escribía `linea.mtoValorUnitario` —el precio de venta
      // sin IGV—, y con eso el costo de ventas del P&L salía casi igual a la
      // venta: margen bruto del 10 % donde los productos tienen 26 %, y un
      // dashboard reportando PÉRDIDA sobre un negocio rentable. El costo sale del
      // producto, que es de donde lo toma el kardex de verdad.
      const costoReal = Number(
        (
          await prisma.producto.findUnique({
            where: { id: linea.productoId },
            select: { costoPromedio: true },
          })
        )?.costoPromedio ?? 0,
      );
      
      await prisma.movimientoKardex.create({
        data: {
          productoId: linea.productoId,
          empresaId: empresa.id,
          sedeId: sede.id,
          tipoMovimiento: 'SALIDA',
          concepto: `Venta ${venta.tipoDoc === '03' ? 'Boleta' : 'Factura'} ${venta.serie}-${String(correlativo).padStart(8, '0')}`,
          cantidad,
          stockAnterior: anterior,
          stockActual: actual,
          costoUnitario: costoReal,
          valorTotal: r2(costoReal * cantidad),
          comprobanteId: comprobante.id,
          usuarioId: vendedor.id,
          fecha: d(venta.dia, 11),
        },
      });

      await prisma.productoStock.upsert({
        where: { productoId_sedeId: { productoId: linea.productoId, sedeId: sede.id } },
        create: { productoId: linea.productoId, sedeId: sede.id, stock: actual, stockMinimo: 0 },
        update: { stock: actual },
      });
      tocados.add(`${linea.productoId}:${sede.id}`);
    }

    emitidos.push({ comprobante, venta, cliente, detalles, total });
  }

  // ── Recomponer el saldo corrido del kardex ────────────────────────────────
  // Estas ventas se insertan con FECHA PASADA, y casi siempre hay movimientos
  // posteriores ya grabados: al meter una venta el día 7 cuando ya existe otra
  // el día 23, el `stockAnterior`/`stockActual` de la del 23 se queda con el
  // saldo de antes y la cadena se rompe. El saldo de un kardex es el orden
  // cronológico, no el orden de inserción, así que se recalcula entero para
  // cada producto/sede que se tocó, partiendo del primer movimiento —que es
  // historia y no se discute— y rodando hacia adelante.
  let recompuestos = 0;
  for (const clave of tocados) {
    const [productoId, sedeId] = clave.split(':').map(Number);
    const movs = await prisma.movimientoKardex.findMany({
      where: { productoId, sedeId },
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
      select: { id: true, tipoMovimiento: true, cantidad: true, stockAnterior: true, stockActual: true },
    });
    if (!movs.length) continue;
    let saldo = Number(movs[0].stockAnterior ?? 0);
    for (const m of movs) {
      const cant = Number(m.cantidad);
      const anterior = saldo;
      saldo = r3(m.tipoMovimiento === 'SALIDA' ? saldo - cant : saldo + cant);
      if (Number(m.stockAnterior) !== anterior || Number(m.stockActual) !== saldo) {
        await prisma.movimientoKardex.update({ where: { id: m.id }, data: { stockAnterior: anterior, stockActual: saldo } });
        recompuestos += 1;
      }
    }
    await prisma.productoStock.update({ where: { productoId_sedeId: { productoId, sedeId } }, data: { stock: saldo } });
  }

  // Y el stock global es la SUMA de las sedes, no el de la sede que se tocó.
  for (const clave of tocados) {
    const productoId = Number(clave.split(':')[0]);
    const g = await prisma.productoStock.aggregate({ where: { productoId }, _sum: { stock: true } });
    await prisma.producto.update({ where: { id: productoId }, data: { stock: Number(g._sum.stock ?? 0) } });
  }
  if (recompuestos) console.log(`↻ Saldo corrido recompuesto en ${recompuestos} movimiento(s) de ${tocados.size} producto/sede.`);

  // ── Cotizaciones ──────────────────────────────────────────────────────────
  // Se emiten después de las ventas para que el correlativo de COT1 continúe
  // donde estuviera, sin pisar nada que ya exista.
  const ultimaCot = await prisma.comprobante.findFirst({
    where: { empresaId: empresa.id, serie: 'COT1' },
    orderBy: { correlativo: 'desc' }, select: { correlativo: true },
  });
  let correlativoCot = ultimaCot?.correlativo ?? 0;
  let cotsCreadas = 0;

  for (const cot of AGREGAR ? [] : COTIZACIONES) {
    const cliente = await prisma.cliente.findFirst({ where: { empresaId: empresa.id, nroDoc: cot.clienteCod } });
    if (!cliente) { console.log(`⚠ Cliente ${cot.clienteCod} no existe, se omite la cotización del ${cot.dia}.`); continue; }

    const detalles = [];
    for (const it of cot.items) {
      const prod = await prisma.producto.findFirst({ where: { empresaId: empresa.id, codigo: it.cod } });
      if (!prod) { console.log(`⚠ Producto ${it.cod} no existe, se omite de la cotización.`); continue; }
      const precioUnit = Number(prod.precioUnitario);
      const valorUnit = r2(precioUnit / (1 + IGV));
      const valorVenta = r2(valorUnit * it.cant);
      detalles.push({
        productoId: prod.id,
        unidad: prod.unidadVenta || 'NIU',
        descripcion: prod.descripcion,
        cantidad: it.cant,
        mtoValorUnitario: valorUnit,
        mtoValorVenta: valorVenta,
        mtoBaseIgv: valorVenta,
        porcentajeIgv: 18,
        igv: r2(valorVenta * IGV),
        tipAfeIgv: 10,
        totalImpuestos: r2(valorVenta * IGV),
        mtoPrecioUnitario: precioUnit,
        mtoDescuento: 0,
      });
    }
    if (!detalles.length) continue;

    const gravadas = r2(detalles.reduce((a, x) => a + x.mtoValorVenta, 0));
    const igv = r2(gravadas * IGV);
    const total = r2(gravadas + igv);
    const vendedor = porRol[cot.vendedor] || uVentas;

    await prisma.comprobante.create({
      data: {
        empresaId: empresa.id,
        sedeId: sede.id,
        clienteId: cliente.id,
        usuarioId: vendedor.id,
        tipoDoc: 'COT',
        serie: 'COT1',
        correlativo: ++correlativoCot,
        fechaEmision: d(cot.dia, 9),
        ublVersion: '2.1',
        tipoMoneda: 'PEN',
        tipoCambio: 1,
        formaPagoTipo: 'Contado',
        formaPagoMoneda: 'PEN',
        tipoOperacionId: 1,
        mtoOperGravadas: gravadas,
        mtoOperInafectas: 0,
        mtoOperExoneradas: 0,
        mtoOperExportacion: 0,
        mtoDescuentoGlobal: 0,
        mtoAnticipos: 0,
        mtoIGV: igv,
        valorVenta: gravadas,
        totalImpuestos: igv,
        subTotal: total,
        mtoImpVenta: total,
        // Una cotización no es un comprobante electrónico: no va a SUNAT.
        estadoEnvioSunat: 'NO_APLICA',
        // La pantalla de Cotizaciones pinta la columna Estado con `estadoPago`
        // (ver CotizacionesView); `estadoPedido` guarda el estado del flujo.
        estadoPago: cot.pago,
        estadoPedido: cot.pedido,
        saldo: cot.pago === 'COMPLETADO' ? 0 : total,
        cotizVigencia: cot.vigencia,
        cotizTipoPago: 'CONTADO',
        cotizMoneda: 'PEN',
        cotizIncluirImagenes: true,
        observaciones: cot.nota,
        origenDato: OBS_DEMO,
        detalles: { create: detalles },
        ...(cot.motivoPerdida
          ? {
              motivoPerdida: cot.motivoPerdida,
              motivoPerdidaDetalle: cot.motivoPerdidaDetalle ?? null,
              motivoPerdidaEn: d(cot.dia, 16),
            }
          : {}),
      },
    });
    cotsCreadas++;
  }

  // ── Guías de remisión remitente (GRE-R) ───────────────────────────────────
  const ultimaGuia = await prisma.guiaRemision.findFirst({
    where: { empresaId: empresa.id, serie: 'T001' }, orderBy: { correlativo: 'desc' }, select: { correlativo: true },
  });
  let corrGuia = ultimaGuia?.correlativo ?? 0;

  let guiasCreadas = 0;
  for (const e of emitidos.filter((x) => x.venta.guia)) {
    const [nombre, apellidos, dni, licencia] = e.venta.conductor;
    const guia = await prisma.guiaRemision.create({
      data: {
        empresaId: empresa.id,
        sedeId: sede?.id ?? null,
        usuarioId: uVentas.id,
        clienteId: e.cliente.id,
        tipoGuia: 'REMITENTE',
        tipoDocumento: '09',
        serie: 'T001',
        correlativo: ++corrGuia,
        fechaEmision: d(e.venta.dia, 15),
        horaEmision: '15:20:00',
        remitenteRuc: empresa.ruc,
        remitenteRazonSocial: empresa.razonSocial,
        remitenteDireccion: sede?.direccion || 'Jr. Francia 1028, La Victoria, Lima',
        destinatarioTipoDoc: '6',
        destinatarioNumDoc: e.cliente.nroDoc,
        destinatarioRazonSocial: e.cliente.nombre,
        tipoTraslado: '01', // Venta
        modoTransporte: '02', // Transporte privado
        pesoTotal: r2(e.detalles.reduce((a, x) => a + Number(x.cantidad) * 12.5, 0)),
        unidadPeso: 'KGM',
        conductorTipoDoc: '1',
        conductorNumDoc: dni,
        conductorNombre: nombre,
        conductorApellidos: apellidos,
        conductorLicencia: licencia,
        vehiculoPlaca: e.venta.placa,
        partidaUbigeo: '150115', // La Victoria, Lima
        partidaDireccion: sede?.direccion || 'Jr. Francia 1028, La Victoria, Lima',
        llegadaUbigeo: e.cliente.ubigeo || '150101',
        llegadaDireccion: e.cliente.direccion || 'Dirección del cliente',
        fechaInicioTraslado: d(e.venta.dia + 1, 7),
        estadoSunat: 'EMITIDO',
        observaciones: `Traslado por venta ${e.venta.serie}-${String(e.comprobante.correlativo).padStart(8, '0')}`,
        origenDato: OBS_DEMO,
        detalles: {
          create: e.detalles.map((x, i) => ({
            numeroOrden: i + 1,
            productoId: x.productoId,
            codigoProducto: e.venta.items[i]?.cod || '',
            descripcion: x.descripcion,
            cantidad: x.cantidad,
            unidadMedida: x.unidad || 'NIU',
          })),
        },
      },
    });
    guiasCreadas += guia ? 1 : 0;
  }

  // ── Turnos de caja ────────────────────────────────────────────────────────
  // Dos turnos cerrados y uno abierto hoy, para que la pantalla tenga historial
  // y a la vez se pueda mostrar el arqueo en vivo.
  const turnos = [
    { dia: 18, inicial: 500, efectivo: 2860.4, transferencia: 0, gastos: [{ cat: 'Movilidad', desc: 'Taxi a despacho Callao', monto: 45 }] },
    { dia: 23, inicial: 500, efectivo: 1320.0, transferencia: 0, gastos: [{ cat: 'Suministros', desc: 'Materiales de embalaje', monto: 128.5 }] },
  ];
  let movsCaja = 0;
  for (const t of AGREGAR ? [] : turnos) {
    const totalGastos = t.gastos.reduce((a, g) => a + g.monto, 0);
    await prisma.movimientoCaja.create({
      data: {
        empresaId: empresa.id, sedeId: sede?.id ?? null, usuarioId: uVentas.id,
        tipoMovimiento: 'APERTURA', fecha: d(t.dia, 8), montoInicial: t.inicial,
        turno: 'Mañana', estado: 'INACTIVO', observaciones: `${OBS_DEMO} Apertura de turno`,
      },
    });
    movsCaja++;
    for (const g of t.gastos) {
      await prisma.movimientoCaja.create({
        data: {
          empresaId: empresa.id, sedeId: sede?.id ?? null, usuarioId: uVentas.id,
          tipoMovimiento: 'EGRESO', fecha: d(t.dia, 13), monto: g.monto,
          categoriaGasto: g.cat, descripcionGasto: g.desc, metodoPago: 'Efectivo',
          estado: 'INACTIVO', observaciones: `${OBS_DEMO} Gasto de caja chica`,
        },
      });
      movsCaja++;
    }
    await prisma.movimientoCaja.create({
      data: {
        empresaId: empresa.id, sedeId: sede?.id ?? null, usuarioId: uVentas.id,
        tipoMovimiento: 'CIERRE', fecha: d(t.dia, 18),
        montoInicial: t.inicial,
        montoFinal: r2(t.inicial + t.efectivo - totalGastos),
        montoEfectivo: t.efectivo, montoTransferencia: t.transferencia,
        totalVentas: t.efectivo, totalIngresos: t.efectivo, diferencia: 0,
        turno: 'Mañana', estado: 'INACTIVO', fechaCierre: d(t.dia, 18),
        observaciones: `${OBS_DEMO} Cierre de turno — arqueo sin diferencia`,
      },
    });
    movsCaja++;
  }

  // ── Gastos operativos del mes ─────────────────────────────────────────────
  for (const g of AGREGAR ? [] : GASTOS) {
    await prisma.gastoOperativo.create({
      data: {
        empresaId: empresa.id, sedeId: sede?.id ?? null,
        mes: MES, anio: ANIO, fecha: d(g.dia, 11),
        categoria: g.categoria, etiqueta: g.etiqueta,
        monto: g.monto, moneda: 'PEN',
        medioPago: g.medioPago, proveedor: g.proveedor,
        descripcion: OBS_DEMO, recurrenteDiario: false,
      },
    });
  }

  const totalVentas = emitidos.reduce((a, e) => a + e.total, 0);
  const totalGastos = GASTOS.reduce((a, g) => a + g.monto, 0);

  console.log('');
  console.log('✔ Datos de demostración creados');
  console.log(`  Comprobantes ............ ${emitidos.length}  (S/ ${totalVentas.toLocaleString('es-PE', { minimumFractionDigits: 2 })})`);
  console.log(`  Cotizaciones ............ ${cotsCreadas}`);
  console.log(`  Guías de remisión ....... ${guiasCreadas}`);
  console.log(`  Comisiones .............. ${emitidos.length}`);
  console.log(`  Movimientos de caja ..... ${movsCaja}`);
  console.log(`  Gastos operativos ....... ${GASTOS.length}  (S/ ${totalGastos.toLocaleString('es-PE', { minimumFractionDigits: 2 })})`);
  console.log('');
  console.log('  Los comprobantes NO se enviaron a SUNAT (sin XML ni CDR).');
  console.log('  Para el ciclo real, emite una factura contra el sandbox QPSE.');
}

main()
  .catch((e) => { console.error('✖', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
