import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KardexService } from '../kardex/kardex.service';

/**
 * Recepción física de la mercadería que vuelve por una nota de crédito.
 *
 * El flujo que pidió almacén, tal como lo describió en su ficha:
 *   1. Contabilidad emite la nota de crédito.
 *   2. Se abre aquí una devolución PENDIENTE con lo que la nota dice.
 *   3. Almacén cuenta lo que llegó de verdad y da el visto bueno.
 *   4. Solo entonces vuelve al stock, y solo lo que vino en buen estado.
 *   5. Comercial ve la incidencia y lo que almacén anotó, sin preguntar.
 */
@Injectable()
export class DevolucionesService {
  constructor(
    private prisma: PrismaService,
    private kardexService: KardexService,
  ) {}

  async listar(
    empresaId: number,
    filtros: { estado?: string; page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, Number(filtros.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(filtros.limit) || 50));
    const where: any = { empresaId };
    if (filtros.estado) where.estado = filtros.estado;

    const [items, total] = await Promise.all([
      this.prisma.devolucionMercaderia.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          detalles: true,
          sede: { select: { id: true, nombre: true } },
          usuarioConfirma: { select: { id: true, nombre: true } },
          comprobante: {
            select: {
              id: true, serie: true, correlativo: true, fechaEmision: true,
              tipDocAfectado: true, numDocAfectado: true,
              cliente: { select: { id: true, nombre: true, nroDoc: true } },
            },
          },
        },
      }),
      this.prisma.devolucionMercaderia.count({ where }),
    ]);

    return { devoluciones: items, total, page, limit };
  }

  async obtener(id: number, empresaId: number) {
    const dev = await this.prisma.devolucionMercaderia.findFirst({
      where: { id, empresaId },
      include: {
        detalles: { include: { producto: { select: { id: true, codigo: true } } } },
        comprobante: {
          select: {
            serie: true, correlativo: true, numDocAfectado: true,
            cliente: { select: { nombre: true, nroDoc: true } },
          },
        },
      },
    });
    if (!dev) throw new NotFoundException('Devolución no encontrada');
    return dev;
  }

  /**
   * Almacén da el visto bueno. Por cada línea indica cuánto llegó y cuánto de
   * eso vino inservible; al stock vuelve solo la diferencia.
   */
  async confirmar(
    id: number,
    empresaId: number,
    usuarioId: number,
    dto: {
      observaciones?: string;
      lineas: {
        detalleId: number;
        cantidadRecibida: number;
        cantidadDanada?: number;
        observacion?: string;
      }[];
    },
  ) {
    const dev = await this.prisma.devolucionMercaderia.findFirst({
      where: { id, empresaId },
      include: { detalles: true, comprobante: { select: { serie: true, correlativo: true } } },
    });
    if (!dev) throw new NotFoundException('Devolución no encontrada');
    if (dev.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        `La devolución ya está ${dev.estado.toLowerCase()}.`,
      );
    }
    if (!dto?.lineas?.length) {
      throw new BadRequestException('Indica qué se recibió de cada producto.');
    }

    const porId = new Map(dev.detalles.map((d) => [d.id, d]));
    for (const l of dto.lineas) {
      const det = porId.get(Number(l.detalleId));
      if (!det) {
        throw new BadRequestException(`La línea ${l.detalleId} no es de esta devolución.`);
      }
      const recibida = Number(l.cantidadRecibida);
      const danada = Number(l.cantidadDanada ?? 0);
      if (!isFinite(recibida) || recibida < 0) {
        throw new BadRequestException(`Cantidad recibida inválida en "${det.descripcion}".`);
      }
      if (danada < 0 || danada > recibida) {
        throw new BadRequestException(
          `Lo dañado no puede superar lo recibido en "${det.descripcion}".`,
        );
      }
      if (recibida > Number(det.cantidadEsperada)) {
        throw new BadRequestException(
          `En "${det.descripcion}" se recibieron ${recibida} y la nota dice ${det.cantidadEsperada}. ` +
            'Corrige la nota de crédito antes de confirmar.',
        );
      }
    }

    const sedeId = dev.sedeId;
    const doc = `${dev.comprobante.serie}-${String(dev.comprobante.correlativo).padStart(8, '0')}`;
    let movimientos = 0;

    for (const l of dto.lineas) {
      const det = porId.get(Number(l.detalleId))!;
      const recibida = Number(l.cantidadRecibida);
      const danada = Number(l.cantidadDanada ?? 0);
      const util = recibida - danada;

      await this.prisma.detalleDevolucionMercaderia.update({
        where: { id: det.id },
        data: {
          cantidadRecibida: recibida,
          cantidadDanada: danada,
          observacion: l.observacion ?? null,
        },
      });

      // Al kardex solo entra lo aprovechable. Lo dañado queda registrado en la
      // devolución —para que comercial y contabilidad lo vean— pero no infla
      // el stock con mercadería que no se puede vender.
      if (util > 0 && det.productoId && sedeId) {
        await this.kardexService.registrarMovimiento({
          productoId: det.productoId,
          empresaId,
          sedeId,
          tipoMovimiento: 'INGRESO',
          cantidad: util,
          concepto:
            `DEVOLUCIÓN NC ${doc}` + (danada > 0 ? ` · ${danada} dañada(s) no reingresada(s)` : ''),
          comprobanteId: dev.comprobanteId,
          usuarioId,
          observacion: l.observacion ?? undefined,
        } as any);
        movimientos++;
      }
    }

    const actualizada = await this.prisma.devolucionMercaderia.update({
      where: { id },
      data: {
        estado: 'CONFIRMADA',
        observaciones: dto.observaciones ?? null,
        confirmadoEn: new Date(),
        usuarioConfirmaId: usuarioId,
      },
      include: { detalles: true },
    });

    return { devolucion: actualizada, movimientosKardex: movimientos };
  }

  /** La mercadería nunca llegó, o llegó y no se acepta. No mueve stock. */
  async rechazar(
    id: number,
    empresaId: number,
    usuarioId: number,
    motivo: string,
  ) {
    const dev = await this.prisma.devolucionMercaderia.findFirst({
      where: { id, empresaId },
    });
    if (!dev) throw new NotFoundException('Devolución no encontrada');
    if (dev.estado !== 'PENDIENTE') {
      throw new BadRequestException(`La devolución ya está ${dev.estado.toLowerCase()}.`);
    }
    const limpio = String(motivo ?? '').trim();
    if (limpio.length < 5) {
      throw new BadRequestException('Indica por qué se rechaza (al menos 5 caracteres).');
    }

    return this.prisma.devolucionMercaderia.update({
      where: { id },
      data: {
        estado: 'RECHAZADA',
        observaciones: limpio,
        confirmadoEn: new Date(),
        usuarioConfirmaId: usuarioId,
      },
    });
  }
}
