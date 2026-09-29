/**
 * "Llévese todo": exportación completa de los datos de la empresa.
 *
 * Existe por una objeción concreta de Kaiser, y es una objeción legítima: la
 * gerencia y contabilidad prefieren un ERP de escritorio porque *"si dejamos de
 * contratar el servicio o migramos a otro ERP, como todo está en la nube no
 * podríamos acceder a nuestra información"*.
 *
 * Tenían razón. El ERP tenía doce exportaciones sueltas —kardex, arqueo,
 * comisiones, conciliación— y ninguna que sacara TODO. Discutir esa objeción con
 * argumentos se pierde; se gana con un botón que el cliente pulsa cuando quiera.
 *
 * El formato es Excel a propósito, una pestaña por tipo de información: quien hace
 * esta pregunta es contabilidad, y contabilidad abre Excel. El volcado técnico
 * (CSV por tabla) es la otra mitad, para quien tenga que cargarlo en otro sistema.
 *
 * Simetría deliberada con `src/migracion/`: entramos leyendo un Excel por hojas y
 * se sale igual. Lo que entra, sale.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

/** Un bloque de la exportación: una pestaña del Excel. */
interface Bloque {
  hoja: string;
  titulo: string;
  filas: () => Promise<Record<string, any>[]>;
}

@Injectable()
export class ExportacionTotalService {
  private readonly logger = new Logger(ExportacionTotalService.name);

  constructor(private prisma: PrismaService) {}

  /** Fecha legible, sin hora, para que el Excel se lea de un vistazo. */
  private fecha(d: Date | null | undefined): string {
    return d ? new Date(d).toLocaleDateString('es-PE', { timeZone: 'America/Lima' }) : '';
  }
  private num(n: any): number {
    return n == null ? 0 : Number(n);
  }

  private bloques(empresaId: number): Bloque[] {
    const p = this.prisma;
    return [
      {
        hoja: 'CLIENTES',
        titulo: 'Clientes y proveedores',
        filas: async () =>
          (await p.cliente.findMany({
            where: { empresaId },
            orderBy: { id: 'asc' },
            include: {
              tipoDocumento: { select: { codigo: true, descripcion: true } },
              // El padrón es uno solo: el rol se deduce de si se le ha comprado.
              _count: { select: { compras: true, comprobantes: true } },
            },
          })).map((c: any) => {
            const compra = c._count.compras > 0;
            const vende = c._count.comprobantes > 0;
            return {
              tipo_doc: c.tipoDocumento?.descripcion ?? c.tipoDocumento?.codigo ?? '',
              num_doc: c.nroDoc, nombre: c.nombre,
              rol: compra && vende ? 'AMBOS' : compra ? 'PROVEEDOR' : 'CLIENTE',
              direccion: c.direccion ?? '', ubigeo: c.ubigeo ?? '',
              departamento: c.departamento ?? '', provincia: c.provincia ?? '',
              distrito: c.distrito ?? '', sector: c.sector ?? '',
              email: c.email ?? '', telefono: c.telefono ?? '',
              contacto: c.contactoNombre ?? '',
            };
          }),
      },
      {
        hoja: 'PRODUCTOS',
        titulo: 'Catálogo',
        filas: async () =>
          (await p.producto.findMany({
            where: { empresaId },
            orderBy: { codigo: 'asc' },
            include: { categoria: true, unidadMedida: true },
          })).map((x: any) => ({
            codigo: x.codigo, descripcion: x.descripcion,
            unidad: x.unidadMedida?.codigo ?? '', categoria: x.categoria?.nombre ?? '',
            precio_venta: this.num(x.precioUnitario), costo: this.num(x.costoPromedio),
            stock_total: this.num(x.stock), codigo_barras: x.codigoBarras ?? '',
          })),
      },
      {
        hoja: 'INVENTARIO',
        titulo: 'Stock por almacén',
        filas: async () =>
          (await p.productoStock.findMany({
            where: { producto: { empresaId } },
            include: { producto: { select: { codigo: true, descripcion: true, costoPromedio: true } }, sede: true },
            orderBy: [{ productoId: 'asc' }, { sedeId: 'asc' }],
          })).map((s: any) => ({
            codigo_producto: s.producto.codigo, descripcion: s.producto.descripcion,
            almacen: s.sede?.nombre ?? '', cantidad: this.num(s.stock),
            costo_unitario: this.num(s.producto.costoPromedio),
            valorizado: this.num(s.stock) * this.num(s.producto.costoPromedio),
          })),
      },
      {
        hoja: 'KARDEX',
        titulo: 'Movimientos de almacén',
        filas: async () =>
          (await p.movimientoKardex.findMany({
            where: { empresaId },
            orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
            include: {
              producto: { select: { codigo: true } },
              sede: { select: { nombre: true } },
              usuario: { select: { nombre: true } },
            },
          })).map((m: any) => ({
            fecha: this.fecha(m.fecha), codigo_producto: m.producto?.codigo ?? '',
            almacen: m.sede?.nombre ?? '', tipo: m.tipoMovimiento, concepto: m.concepto,
            cantidad: this.num(m.cantidad), saldo_anterior: this.num(m.stockAnterior),
            saldo: this.num(m.stockActual), costo_unitario: this.num(m.costoUnitario),
            valor_total: this.num(m.valorTotal), registrado_por: m.usuario?.nombre ?? '',
            observacion: m.observacion ?? '',
          })),
      },
      {
        hoja: 'VENTAS',
        titulo: 'Comprobantes emitidos',
        filas: async () =>
          (await p.comprobante.findMany({
            where: { empresaId },
            orderBy: [{ fechaEmision: 'asc' }, { id: 'asc' }],
            include: {
              cliente: { select: { nroDoc: true, nombre: true } },
              sede: { select: { nombre: true } },
              usuario: { select: { email: true } },
            },
          })).map((c: any) => ({
            tipo_doc: c.tipoDoc, serie: c.serie, numero: c.correlativo,
            fecha_emision: this.fecha(c.fechaEmision),
            cliente_doc: c.cliente?.nroDoc ?? '', cliente: c.cliente?.nombre ?? '',
            moneda: c.tipoMoneda, tipo_cambio: this.num(c.tipoCambio),
            gravado: this.num(c.mtoOperGravadas), igv: this.num(c.mtoIGV),
            total: this.num(c.mtoImpVenta), saldo_pendiente: this.num(c.saldo),
            estado_pago: c.estadoPago, estado_sunat: c.estadoEnvioSunat,
            almacen: c.sede?.nombre ?? '', vendedor_email: c.usuario?.email ?? '',
            observaciones: c.observaciones ?? '',
          })),
      },
      {
        hoja: 'VENTAS_DETALLE',
        titulo: 'Líneas de las ventas',
        filas: async () =>
          (await p.detalleComprobante.findMany({
            where: { comprobante: { empresaId } },
            orderBy: { id: 'asc' },
            include: {
              comprobante: { select: { tipoDoc: true, serie: true, correlativo: true } },
              producto: { select: { codigo: true } },
            },
          })).map((d: any) => ({
            tipo_doc: d.comprobante.tipoDoc, serie: d.comprobante.serie,
            numero: d.comprobante.correlativo, codigo_producto: d.producto?.codigo ?? '',
            descripcion: d.descripcion, cantidad: this.num(d.cantidad),
            precio_unitario: this.num(d.mtoPrecioUnitario), total: this.num(d.mtoValorVenta),
          })),
      },
      {
        hoja: 'COMPRAS',
        titulo: 'Facturas de proveedor',
        filas: async () =>
          (await p.compra.findMany({
            where: { empresaId },
            orderBy: [{ fechaEmision: 'asc' }, { id: 'asc' }],
            include: {
              proveedor: { select: { nroDoc: true, nombre: true } },
              sede: { select: { nombre: true } },
            },
          })).map((c: any) => ({
            proveedor_doc: c.proveedor?.nroDoc ?? '', proveedor: c.proveedor?.nombre ?? '',
            serie: c.serie, numero: c.numero,
            fecha_emision: this.fecha(c.fechaEmision),
            fecha_vencimiento: this.fecha(c.fechaVencimiento),
            moneda: c.moneda, tipo_cambio: this.num(c.tipoCambio),
            subtotal: this.num(c.subtotal), igv: this.num(c.igv), total: this.num(c.total),
            saldo_pendiente: this.num(c.saldo), estado_pago: c.estadoPago,
            almacen: c.sede?.nombre ?? '', observaciones: c.observaciones ?? '',
          })),
      },
      {
        hoja: 'COMPRAS_DETALLE',
        titulo: 'Líneas de las compras',
        filas: async () =>
          (await p.detalleCompra.findMany({
            where: { compra: { empresaId } },
            orderBy: { id: 'asc' },
            include: {
              compra: {
                select: { serie: true, numero: true, proveedor: { select: { nroDoc: true } } },
              },
              producto: { select: { codigo: true } },
            },
          })).map((d: any) => ({
            proveedor_doc: d.compra.proveedor?.nroDoc ?? '',
            serie: d.compra.serie, numero: d.compra.numero,
            codigo_producto: d.producto?.codigo ?? '', descripcion: d.descripcion,
            cantidad: this.num(d.cantidad), precio_unitario: this.num(d.precioUnitario),
            subtotal: this.num(d.subtotal), igv: this.num(d.igv), total: this.num(d.total),
          })),
      },
      {
        hoja: 'PAGOS_RECIBIDOS',
        titulo: 'Cobros a clientes',
        filas: async () =>
          (await p.pago.findMany({
            where: { comprobante: { empresaId } },
            orderBy: { id: 'asc' },
            include: {
              comprobante: {
                select: {
                  tipoDoc: true, serie: true, correlativo: true,
                  cliente: { select: { nroDoc: true, nombre: true } },
                },
              },
            },
          })).map((x: any) => ({
            fecha: this.fecha(x.fecha ?? x.creadoEn),
            cliente_doc: x.comprobante?.cliente?.nroDoc ?? '',
            cliente: x.comprobante?.cliente?.nombre ?? '',
            documento: `${x.comprobante?.serie ?? ''}-${x.comprobante?.correlativo ?? ''}`,
            monto: this.num(x.monto), medio: x.medioPago ?? '',
            referencia: x.referencia ?? '',
          })),
      },
      {
        hoja: 'PRODUCCION',
        titulo: 'Órdenes de fabricación',
        filas: async () =>
          (await p.ordenProduccion.findMany({
            where: { empresaId },
            orderBy: { id: 'asc' },
            include: { productoFinal: { select: { codigo: true, descripcion: true } } },
          })).map((o: any) => ({
            orden: o.loteProduccion ?? String(o.id), fecha: this.fecha(o.fechaInicio ?? o.creadoEn),
            producto: o.productoFinal?.codigo ?? '',
            descripcion: o.productoFinal?.descripcion ?? '',
            cantidad_objetivo: this.num(o.cantidadObjetivo),
            cantidad_producida: this.num(o.cantidadProducida),
            merma: this.num(o.mermaTotal), estado: o.estado,
            costo_consumo: this.num(o.costoConsumo), costo_merma: this.num(o.costoMerma),
            costo_produccion: this.num(o.costoProduccion),
          })),
      },
      {
        hoja: 'RECETAS',
        titulo: 'Recetas de fabricación',
        filas: async () =>
          (await p.recetaComponente.findMany({
            where: { receta: { empresaId } },
            orderBy: { id: 'asc' },
            include: {
              receta: { include: { productoFinal: { select: { codigo: true } } } },
              productoInsumo: { select: { codigo: true, descripcion: true } },
            },
          })).map((r: any) => ({
            producto_final: r.receta?.productoFinal?.codigo ?? '',
            receta: r.receta?.nombre ?? '',
            insumo: r.productoInsumo?.codigo ?? '',
            descripcion_insumo: r.productoInsumo?.descripcion ?? '',
            cantidad: this.num(r.cantidadBase), unidad: r.unidadBase ?? '',
            merma_esperada_pct: this.num(r.mermaEsperadaPorcentaje),
          })),
      },
      {
        hoja: 'SEDES',
        titulo: 'Almacenes y puntos de venta',
        filas: async () =>
          (await p.sede.findMany({ where: { empresaId }, orderBy: { id: 'asc' } })).map(
            (s: any) => ({
              nombre: s.nombre, direccion: s.direccion ?? '',
              codigo: s.codigo ?? '', tipo: s.tipo ?? '',
              principal: s.esPrincipal ? 'Sí' : 'No',
              factura: s.permiteFacturacion === false ? 'No' : 'Sí',
            }),
          ),
      },
      {
        hoja: 'USUARIOS',
        titulo: 'Usuarios y permisos',
        filas: async () =>
          (await p.usuario.findMany({
            where: { empresaId },
            orderBy: { id: 'asc' },
            // `select` explícito: sin contraseñas, ni siquiera el hash. No es dato
            // que el cliente necesite llevarse y sí es dato que no debe acabar en
            // un Excel que va a circular por correo.
            select: {
              nombre: true, email: true, rol: true, permisos: true,
              estado: true, dni: true, celular: true,
            },
          })).map((u: any) => ({
            nombre: u.nombre, email: u.email, rol: u.rol,
            // `permisos` es JSON, no un arreglo: viene como array, como texto o
            // como null según cómo se haya guardado. Se normaliza aquí.
            permisos: Array.isArray(u.permisos)
              ? u.permisos.join(', ')
              : typeof u.permisos === 'string'
                ? u.permisos
                : u.permisos
                  ? JSON.stringify(u.permisos)
                  : '',
            estado: u.estado ?? '', dni: u.dni ?? '', celular: u.celular ?? '',
          })),
      },
    ];
  }

  /**
   * Genera el libro Excel completo. Devuelve el buffer y un resumen de cuántas
   * filas salió cada pestaña, que es lo que se le enseña al cliente para que vea
   * que no falta nada.
   */
  async exportarExcel(empresaId: number): Promise<{
    buffer: Buffer;
    resumen: { hoja: string; titulo: string; filas: number }[];
    nombre: string;
  }> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId }, select: { razonSocial: true, ruc: true },
    });
    const libro = XLSX.utils.book_new();
    const resumen: { hoja: string; titulo: string; filas: number }[] = [];

    // La portada primero: quien abra el archivo tiene que entender qué es sin
    // que nadie se lo explique.
    const portada: any[][] = [
      ['EXPORTACIÓN COMPLETA DE DATOS'],
      [empresa?.razonSocial ?? '', empresa?.ruc ?? ''],
      ['Generado el', new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })],
      [],
      ['Este archivo contiene toda la información de la empresa registrada en el'],
      ['sistema, una pestaña por tipo de información. Es suyo: puede guardarlo,'],
      ['abrirlo en Excel o cargarlo en otro sistema sin depender de nadie.'],
      [],
      ['Pestaña', 'Contenido', 'Registros'],
    ];

    for (const b of this.bloques(empresaId)) {
      let filas: Record<string, any>[] = [];
      try {
        filas = await b.filas();
      } catch (e: any) {
        // Una pestaña que falle no puede tumbar la exportación entera: el cliente
        // se queda sin nada justo cuando le prometimos que se lo lleva todo.
        this.logger.error(`No se pudo exportar ${b.hoja}: ${e.message}`);
        filas = [{ error: `No se pudo exportar: ${e.message}` }];
      }
      const ws = filas.length
        ? XLSX.utils.json_to_sheet(filas)
        : XLSX.utils.aoa_to_sheet([['(sin registros)']]);
      XLSX.utils.book_append_sheet(libro, ws, b.hoja);
      resumen.push({ hoja: b.hoja, titulo: b.titulo, filas: filas.length });
      portada.push([b.hoja, b.titulo, filas.length]);
    }

    const wsPortada = XLSX.utils.aoa_to_sheet(portada);
    wsPortada['!cols'] = [{ wch: 22 }, { wch: 46 }, { wch: 12 }];
    // La portada va la primera, así que se inserta y se reordena.
    XLSX.utils.book_append_sheet(libro, wsPortada, 'RESUMEN');
    libro.SheetNames = ['RESUMEN', ...libro.SheetNames.filter((n) => n !== 'RESUMEN')];

    const buffer = XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
    return {
      buffer,
      resumen,
      nombre: `Datos-${(empresa?.razonSocial ?? 'empresa').replace(/[^\w]+/g, '-')}-${hoy}.xlsx`,
    };
  }
}
