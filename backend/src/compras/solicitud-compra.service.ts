import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdenCompraService } from './orden-compra.service';
import {
  ActualizarCotizacionProveedorDto,
  ActualizarSolicitudCompraDto,
  CambiarEstadoSolicitudDto,
  CrearCotizacionProveedorDto,
  CrearSolicitudCompraDto,
  SeleccionarCotizacionDto,
} from './dto/solicitud-compra.dto';

const IGV_RATE = 0.18;

/**
 * Solicitud de compra (requerimiento interno) → cotizaciones de proveedores
 * A/B/C → comparativo → selección → Orden de Compra.
 */
@Injectable()
export class SolicitudCompraService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordenCompraService: OrdenCompraService,
  ) {}

  // ---------------------------------------------------------------------
  // Solicitudes
  // ---------------------------------------------------------------------

  async crear(
    empresaId: number,
    usuarioId: number,
    dto: CrearSolicitudCompraDto,
    reqSedeId?: number,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException(
        'La solicitud debe tener al menos un ítem',
      );
    }

    const ultimas = await this.prisma.solicitudCompra.findMany({
      where: { empresaId },
      select: { numero: true },
    });
    const maxNum = ultimas.reduce((max, s) => {
      const n = Number(String(s.numero).replace(/\D/g, ''));
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    const numero = `SC-${String(maxNum + 1).padStart(6, '0')}`;

    return this.prisma.solicitudCompra.create({
      data: {
        empresaId,
        sedeId: dto.sedeId ?? reqSedeId ?? null,
        solicitanteId: usuarioId,
        numero,
        area: dto.area || null,
        motivo: dto.motivo || null,
        fechaRequerida: dto.fechaRequerida
          ? new Date(dto.fechaRequerida)
          : null,
        observaciones: dto.observaciones || null,
        items: {
          create: dto.items.map((i) => ({
            productoId: i.productoId ?? null,
            descripcion: i.descripcion,
            cantidad: i.cantidad,
            unidad: i.unidad || 'UND',
            observacion: i.observacion || null,
          })),
        },
      },
      include: { items: true },
    });
  }

  async listar(
    empresaId: number,
    query: { search?: string; estado?: string },
  ) {
    const where: any = { empresaId };
    if (query.estado && query.estado !== 'TODOS') where.estado = query.estado;
    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { numero: { contains: s, mode: 'insensitive' } },
        { area: { contains: s, mode: 'insensitive' } },
        { motivo: { contains: s, mode: 'insensitive' } },
      ];
    }

    const solicitudes = await this.prisma.solicitudCompra.findMany({
      where,
      orderBy: { creadoEn: 'desc' },
      include: {
        solicitante: { select: { nombre: true } },
        sede: { select: { nombre: true } },
        _count: { select: { items: true, cotizaciones: true } },
        cotizaciones: {
          select: { id: true, totalPen: true, estado: true },
        },
      },
    });

    return solicitudes.map((s) => {
      const cotizacionesActivas = s.cotizaciones.filter(
        (c) => c.estado !== 'DESCARTADA',
      );
      const mejorTotal = cotizacionesActivas.length
        ? Math.min(...cotizacionesActivas.map((c) => Number(c.totalPen)))
        : null;
      const { cotizaciones, ...rest } = s;
      return {
        ...rest,
        nItems: s._count.items,
        nCotizaciones: s._count.cotizaciones,
        mejorTotal,
      };
    });
  }

  async obtener(empresaId: number, id: number) {
    const solicitud = await this.prisma.solicitudCompra.findFirst({
      where: { id, empresaId },
      include: {
        solicitante: { select: { nombre: true } },
        sede: { select: { nombre: true } },
        items: {
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                costoPromedio: true,
                stock: true,
              },
            },
          },
        },
        cotizaciones: {
          orderBy: { creadoEn: 'asc' },
          include: {
            proveedor: {
              select: { id: true, nombre: true, nroDoc: true },
            },
            items: true,
          },
        },
        ordenesCompra: {
          select: { id: true, numero: true, estado: true },
        },
      },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    return {
      ...solicitud,
      ordenesCompra: solicitud.ordenesCompra.map((o) => ({
        ...o,
        numeroFormato: OrdenCompraService.formatNumero(o.numero),
      })),
    };
  }

  private async requireSolicitud(empresaId: number, id: number) {
    const solicitud = await this.prisma.solicitudCompra.findFirst({
      where: { id, empresaId },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    return solicitud;
  }

  async actualizar(
    empresaId: number,
    id: number,
    dto: ActualizarSolicitudCompraDto,
  ) {
    const solicitud = await this.requireSolicitud(empresaId, id);
    if (!['PENDIENTE', 'EN_COTIZACION'].includes(solicitud.estado)) {
      throw new BadRequestException(
        'Solo se puede editar una solicitud pendiente o en cotización',
      );
    }
    if (!dto.items?.length) {
      throw new BadRequestException(
        'La solicitud debe tener al menos un ítem',
      );
    }

    await this.prisma.solicitudCompraItem.deleteMany({
      where: { solicitudId: id },
    });

    return this.prisma.solicitudCompra.update({
      where: { id },
      data: {
        sedeId: dto.sedeId ?? solicitud.sedeId,
        area: dto.area || null,
        motivo: dto.motivo || null,
        fechaRequerida: dto.fechaRequerida
          ? new Date(dto.fechaRequerida)
          : null,
        observaciones: dto.observaciones || null,
        items: {
          create: dto.items.map((i) => ({
            productoId: i.productoId ?? null,
            descripcion: i.descripcion,
            cantidad: i.cantidad,
            unidad: i.unidad || 'UND',
            observacion: i.observacion || null,
          })),
        },
      },
      include: { items: true },
    });
  }

  async cambiarEstado(
    empresaId: number,
    id: number,
    dto: CambiarEstadoSolicitudDto,
  ) {
    const solicitud = await this.requireSolicitud(empresaId, id);
    if (solicitud.estado === 'CONVERTIDA') {
      throw new BadRequestException(
        'La solicitud ya fue convertida en orden de compra',
      );
    }
    return this.prisma.solicitudCompra.update({
      where: { id },
      data: { estado: dto.estado },
    });
  }

  // ---------------------------------------------------------------------
  // Cotizaciones de proveedores
  // ---------------------------------------------------------------------

  private calcularTotalesCotizacion(
    items: { cantidad: number; precioUnitario: number }[],
    incluyeIgv: boolean,
    tipoCambio: number,
  ) {
    const base = items.reduce(
      (s, it) => s + Number(it.cantidad) * Number(it.precioUnitario),
      0,
    );
    // Si el precio ya incluye IGV, el "subtotal" es la base sin IGV.
    const subtotal = incluyeIgv ? base / (1 + IGV_RATE) : base;
    const total = incluyeIgv ? base : base * (1 + IGV_RATE);
    return {
      subtotal: Number(subtotal.toFixed(2)),
      total: Number(total.toFixed(2)),
      totalPen: Number((total * tipoCambio).toFixed(2)),
    };
  }

  async agregarCotizacion(
    empresaId: number,
    id: number,
    dto: CrearCotizacionProveedorDto,
  ) {
    const solicitud = await this.requireSolicitud(empresaId, id);
    if (!['PENDIENTE', 'EN_COTIZACION'].includes(solicitud.estado)) {
      throw new BadRequestException(
        'No se pueden agregar cotizaciones a esta solicitud',
      );
    }
    if (!dto.items?.length) {
      throw new BadRequestException(
        'La cotización debe tener al menos un ítem',
      );
    }
    const proveedor = await this.prisma.cliente.findFirst({
      where: { id: dto.proveedorId, empresaId },
      select: { id: true },
    });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');

    const itemsSolicitud = await this.prisma.solicitudCompraItem.findMany({
      where: { solicitudId: id },
      select: { id: true, cantidad: true },
    });
    const cantidadPorItem = new Map(
      itemsSolicitud.map((i) => [i.id, Number(i.cantidad)]),
    );
    for (const it of dto.items) {
      if (!cantidadPorItem.has(it.solicitudItemId)) {
        throw new BadRequestException(
          `El ítem ${it.solicitudItemId} no pertenece a esta solicitud`,
        );
      }
    }

    const incluyeIgv = dto.incluyeIgv ?? false;
    const tipoCambio = dto.tipoCambio ?? 1;
    const totales = this.calcularTotalesCotizacion(
      dto.items.map((it) => ({
        cantidad: it.cantidad ?? cantidadPorItem.get(it.solicitudItemId)!,
        precioUnitario: it.precioUnitario,
      })),
      incluyeIgv,
      tipoCambio,
    );

    const cotizacion = await this.prisma.cotizacionProveedor.create({
      data: {
        empresaId,
        solicitudId: id,
        proveedorId: dto.proveedorId,
        referencia: dto.referencia || null,
        fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
        moneda: dto.moneda || 'PEN',
        tipoCambio,
        plazoEntregaDias: dto.plazoEntregaDias ?? null,
        condicionesPago: dto.condicionesPago || null,
        validezDias: dto.validezDias ?? null,
        incluyeIgv,
        observaciones: dto.observaciones || null,
        ...totales,
        items: {
          create: dto.items.map((it) => ({
            solicitudItemId: it.solicitudItemId,
            precioUnitario: it.precioUnitario,
            cantidad: it.cantidad ?? null,
            marca: it.marca || null,
            plazoEntregaDias: it.plazoEntregaDias ?? null,
            observacion: it.observacion || null,
          })),
        },
      },
      include: { items: true, proveedor: true },
    });

    if (solicitud.estado === 'PENDIENTE') {
      await this.prisma.solicitudCompra.update({
        where: { id },
        data: { estado: 'EN_COTIZACION' },
      });
    }

    return cotizacion;
  }

  private async requireCotizacion(
    empresaId: number,
    solicitudId: number,
    cotId: number,
  ) {
    const cotizacion = await this.prisma.cotizacionProveedor.findFirst({
      where: { id: cotId, solicitudId, empresaId },
    });
    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');
    return cotizacion;
  }

  async actualizarCotizacion(
    empresaId: number,
    id: number,
    cotId: number,
    dto: ActualizarCotizacionProveedorDto,
  ) {
    const cotizacion = await this.requireCotizacion(empresaId, id, cotId);
    if (cotizacion.estado !== 'RECIBIDA') {
      throw new BadRequestException(
        'Solo se puede editar una cotización en estado recibida',
      );
    }
    if (!dto.items?.length) {
      throw new BadRequestException(
        'La cotización debe tener al menos un ítem',
      );
    }

    const itemsSolicitud = await this.prisma.solicitudCompraItem.findMany({
      where: { solicitudId: id },
      select: { id: true, cantidad: true },
    });
    const cantidadPorItem = new Map(
      itemsSolicitud.map((i) => [i.id, Number(i.cantidad)]),
    );

    const incluyeIgv = dto.incluyeIgv ?? false;
    const tipoCambio = dto.tipoCambio ?? 1;
    const totales = this.calcularTotalesCotizacion(
      dto.items.map((it) => ({
        cantidad: it.cantidad ?? cantidadPorItem.get(it.solicitudItemId)!,
        precioUnitario: it.precioUnitario,
      })),
      incluyeIgv,
      tipoCambio,
    );

    await this.prisma.cotizacionProveedorItem.deleteMany({
      where: { cotizacionId: cotId },
    });

    return this.prisma.cotizacionProveedor.update({
      where: { id: cotId },
      data: {
        proveedorId: dto.proveedorId,
        referencia: dto.referencia || null,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        moneda: dto.moneda || 'PEN',
        tipoCambio,
        plazoEntregaDias: dto.plazoEntregaDias ?? null,
        condicionesPago: dto.condicionesPago || null,
        validezDias: dto.validezDias ?? null,
        incluyeIgv,
        observaciones: dto.observaciones || null,
        ...totales,
        items: {
          create: dto.items.map((it) => ({
            solicitudItemId: it.solicitudItemId,
            precioUnitario: it.precioUnitario,
            cantidad: it.cantidad ?? null,
            marca: it.marca || null,
            plazoEntregaDias: it.plazoEntregaDias ?? null,
            observacion: it.observacion || null,
          })),
        },
      },
      include: { items: true, proveedor: true },
    });
  }

  async actualizarArchivoCotizacion(
    empresaId: number,
    id: number,
    cotId: number,
    archivoUrl: string,
  ) {
    await this.requireCotizacion(empresaId, id, cotId);
    return this.prisma.cotizacionProveedor.update({
      where: { id: cotId },
      data: { archivoUrl },
    });
  }

  async eliminarCotizacion(empresaId: number, id: number, cotId: number) {
    const cotizacion = await this.requireCotizacion(empresaId, id, cotId);
    if (cotizacion.estado === 'SELECCIONADA') {
      throw new BadRequestException(
        'No se puede eliminar la cotización seleccionada (fue convertida en OC)',
      );
    }
    await this.prisma.cotizacionProveedor.delete({ where: { id: cotId } });
    return { success: true };
  }

  // ---------------------------------------------------------------------
  // Comparativo
  // ---------------------------------------------------------------------

  async comparativo(empresaId: number, id: number) {
    const solicitud = await this.prisma.solicitudCompra.findFirst({
      where: { id, empresaId },
      include: {
        items: {
          include: {
            producto: {
              select: { costoPromedio: true },
            },
          },
        },
        cotizaciones: {
          where: { estado: { not: 'DESCARTADA' } },
          orderBy: { creadoEn: 'asc' },
          include: {
            proveedor: { select: { id: true, nombre: true, nroDoc: true } },
            items: true,
          },
        },
      },
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');

    const totalesPorCotizacion = new Map<number, number>();
    for (const cot of solicitud.cotizaciones) {
      totalesPorCotizacion.set(cot.id, Number(cot.totalPen));
    }
    const mejorTotalPen = solicitud.cotizaciones.length
      ? Math.min(...Array.from(totalesPorCotizacion.values()))
      : null;
    const peorTotalPen = solicitud.cotizaciones.length
      ? Math.max(...Array.from(totalesPorCotizacion.values()))
      : null;

    const proveedores = solicitud.cotizaciones.map((cot) => ({
      cotizacionId: cot.id,
      proveedor: cot.proveedor,
      moneda: cot.moneda,
      tipoCambio: Number(cot.tipoCambio),
      plazoEntregaDias: cot.plazoEntregaDias,
      condicionesPago: cot.condicionesPago,
      referencia: cot.referencia,
      totalPen: Number(cot.totalPen),
      esMejorTotal:
        mejorTotalPen !== null && Number(cot.totalPen) === mejorTotalPen,
    }));

    const filas = solicitud.items.map((item) => {
      const precios = solicitud.cotizaciones.map((cot) => {
        const cotItem = cot.items.find(
          (ci) => ci.solicitudItemId === item.id,
        );
        if (!cotItem) {
          return {
            cotizacionId: cot.id,
            precioUnitario: null,
            precioUnitarioPen: null,
            subtotalPen: null,
            esMejor: false,
          };
        }
        const precioUnitarioPen =
          Number(cotItem.precioUnitario) * Number(cot.tipoCambio);
        return {
          cotizacionId: cot.id,
          precioUnitario: Number(cotItem.precioUnitario),
          precioUnitarioPen,
          subtotalPen: Number(
            (precioUnitarioPen * Number(cotItem.cantidad ?? item.cantidad)).toFixed(2),
          ),
          esMejor: false,
        };
      });
      const preciosValidos = precios.filter(
        (p) => p.precioUnitarioPen !== null,
      );
      const mejorPrecio = preciosValidos.length
        ? Math.min(...preciosValidos.map((p) => p.precioUnitarioPen!))
        : null;
      precios.forEach((p) => {
        if (
          mejorPrecio !== null &&
          p.precioUnitarioPen !== null &&
          p.precioUnitarioPen === mejorPrecio
        ) {
          p.esMejor = true;
        }
      });
      const mejorCotizacionId =
        precios.find((p) => p.esMejor)?.cotizacionId ?? null;

      return {
        solicitudItemId: item.id,
        descripcion: item.descripcion,
        cantidad: Number(item.cantidad),
        unidad: item.unidad,
        costoPromedioActual: item.producto?.costoPromedio
          ? Number(item.producto.costoPromedio)
          : null,
        precios,
        mejorCotizacionId,
      };
    });

    let recomendacion = 'Aún no hay cotizaciones para comparar.';
    let mejorProveedorNombre: string | null = null;
    let ahorroVsMasCaro: number | null = null;
    let ahorroPct: number | null = null;

    if (proveedores.length) {
      const mejor = proveedores.find((p) => p.esMejorTotal)!;
      mejorProveedorNombre = mejor.proveedor.nombre;
      if (mejorTotalPen !== null && peorTotalPen !== null) {
        ahorroVsMasCaro = Number((peorTotalPen - mejorTotalPen).toFixed(2));
        ahorroPct =
          peorTotalPen > 0
            ? Number(((ahorroVsMasCaro / peorTotalPen) * 100).toFixed(1))
            : 0;
      }
      if (proveedores.length === 1) {
        recomendacion = `${mejor.proveedor.nombre} es el único proveedor cotizado (S/ ${mejorTotalPen!.toFixed(2)}), entrega en ${mejor.plazoEntregaDias ?? '—'} días.`;
      } else if (ahorroPct && ahorroPct > 0) {
        recomendacion = `${mejor.proveedor.nombre} es el más económico (S/ ${mejorTotalPen!.toFixed(2)}), ${ahorroPct}% menos que el más caro, entrega en ${mejor.plazoEntregaDias ?? '—'} días.`;
      } else {
        recomendacion = `${mejor.proveedor.nombre} ofrece el mejor total (S/ ${mejorTotalPen!.toFixed(2)}), entrega en ${mejor.plazoEntregaDias ?? '—'} días.`;
      }
    }

    return {
      solicitud: {
        id: solicitud.id,
        numero: solicitud.numero,
        area: solicitud.area,
        motivo: solicitud.motivo,
        estado: solicitud.estado,
        fechaRequerida: solicitud.fechaRequerida,
      },
      proveedores,
      filas,
      resumen: {
        ahorroVsMasCaro,
        ahorroPct,
        mejorProveedor: mejorProveedorNombre,
        recomendacion,
      },
    };
  }

  // ---------------------------------------------------------------------
  // Selección → Orden de Compra
  // ---------------------------------------------------------------------

  async seleccionar(
    empresaId: number,
    usuarioId: number,
    id: number,
    dto: SeleccionarCotizacionDto,
    reqSedeId?: number,
  ) {
    const solicitud = await this.requireSolicitud(empresaId, id);
    if (solicitud.estado === 'CONVERTIDA') {
      throw new BadRequestException(
        'Esta solicitud ya fue convertida en orden de compra',
      );
    }
    if (solicitud.estado === 'ANULADA') {
      throw new BadRequestException('Esta solicitud está anulada');
    }

    const cotizacion = await this.prisma.cotizacionProveedor.findFirst({
      where: { id: dto.cotizacionId, solicitudId: id, empresaId },
      include: {
        items: { include: { solicitudItem: true } },
        proveedor: true,
      },
    });
    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');
    if (cotizacion.estado === 'SELECCIONADA') {
      throw new BadRequestException('Esta cotización ya fue seleccionada');
    }

    const detalles = cotizacion.items.map((it) => ({
      productoId: it.solicitudItem.productoId ?? undefined,
      descripcion:
        it.solicitudItem.descripcion +
        (it.marca ? ` - Marca: ${it.marca}` : ''),
      cantidad: Number(it.cantidad ?? it.solicitudItem.cantidad),
      precioUnitario: Number(it.precioUnitario),
    }));

    const orden = await this.ordenCompraService.crear(
      empresaId,
      usuarioId,
      {
        proveedorId: cotizacion.proveedorId,
        sedeId: solicitud.sedeId ?? undefined,
        fechaEntrega: dto.fechaEntrega,
        moneda: cotizacion.moneda,
        tipoCambio: Number(cotizacion.tipoCambio),
        aplicaIgv: !cotizacion.incluyeIgv,
        observaciones:
          dto.observaciones ||
          `Generada desde la solicitud de compra ${solicitud.numero}`,
        condicionesPago: cotizacion.condicionesPago ?? undefined,
        lugarEntrega: dto.lugarEntrega,
        estado: 'EMITIDA',
        detalles,
      } as any,
      reqSedeId,
    );

    await this.prisma.$transaction([
      this.prisma.cotizacionProveedor.update({
        where: { id: cotizacion.id },
        data: { estado: 'SELECCIONADA' },
      }),
      this.prisma.cotizacionProveedor.updateMany({
        where: { solicitudId: id, id: { not: cotizacion.id } },
        data: { estado: 'DESCARTADA' },
      }),
      this.prisma.ordenCompra.update({
        where: { id: (orden as any).id },
        data: {
          solicitudCompraId: id,
          cotizacionProveedorId: cotizacion.id,
        },
      }),
      this.prisma.solicitudCompra.update({
        where: { id },
        data: { estado: 'CONVERTIDA' },
      }),
    ]);

    return this.ordenCompraService.obtener(empresaId, (orden as any).id);
  }
}
