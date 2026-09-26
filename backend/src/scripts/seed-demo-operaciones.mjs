/**
 * Datos de demostración para el ciclo operativo de Kaiser.
 *
 * Complementa a `seed-demo-presentacion.mjs` y `seed-demo-ventas.mjs`, que ya
 * dejan catálogo, clientes, producción e importaciones. Aquí se llenan los
 * módulos que quedaban vacíos y por eso no se podían mostrar:
 *
 *   · Facturas y boletas a los clientes industriales (con su vendedor)
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

/** Marca que identifica lo insertado por este script. */
const OBS_DEMO = '[demo-operaciones]';
const IGV = 0.18;
const ANIO = 2026;
const MES = 9;

const d = (dia, hora = 10) => new Date(Date.UTC(ANIO, MES - 1, dia, hora + 5, 0, 0));
const r2 = (n) => Math.round(n * 100) / 100;

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
];

/** Gastos fijos y variables típicos de una planta en Lima. */
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
    where: { empresaId, observaciones: { contains: OBS_DEMO } },
    select: { id: true },
  });
  const ids = previos.map((c) => c.id);

  if (ids.length) {
    await prisma.comisionVendedor.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.pago.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.leyenda.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.comprobante.deleteMany({ where: { id: { in: ids } } });
  }

  const guias = await prisma.guiaRemision.findMany({
    where: { empresaId, observaciones: { contains: OBS_DEMO } },
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

  const borrado = await limpiarDemoPrevia(empresa.id);
  if (borrado.comprobantes || borrado.guias) {
    console.log(`↺ Limpieza previa: ${borrado.comprobantes} comprobante(s), ${borrado.guias} guía(s).`);
  }

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
  for (const venta of VENTAS) {
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
        observaciones: OBS_DEMO,
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

    emitidos.push({ comprobante, venta, cliente, detalles, total });
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
        observaciones: `${OBS_DEMO} Traslado por venta ${e.venta.serie}-${String(e.comprobante.correlativo).padStart(8, '0')}`,
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
  for (const t of turnos) {
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
  for (const g of GASTOS) {
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
