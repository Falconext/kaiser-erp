import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Genealogía de un producto: de qué está hecho y a dónde fue.
 *
 * El kardex ya contaba la línea de tiempo de un producto (`/kardex/trazabilidad`),
 * pero nadie respondía la pregunta que hace almacén y que hace el cliente cuando
 * reclama: **"esta malla, ¿con qué se fabricó y de qué compra salió cada cosa?"**.
 *
 * Se lee en dos direcciones:
 *
 *   HACIA ATRÁS   receta (lo que debería llevar)
 *                 → órdenes que lo fabricaron (lo que llevó de verdad, con su merma)
 *                 → compras de las que entró cada insumo
 *
 *   HACIA ADELANTE ventas en las que salió
 *                  recetas de otros productos donde este se usa como insumo
 *
 * Nada de esto añade tablas: todo estaba guardado y sin conectar.
 */

const n = (v: unknown) => Number(v ?? 0);
const r2 = (v: unknown) => Math.round(n(v) * 100) / 100;

@Injectable()
export class GenealogiaService {
  constructor(private readonly prisma: PrismaService) {}

  private async buscarProducto(empresaId: number, idOcodigo: string) {
    const comoId = Number(idOcodigo);
    const producto = await this.prisma.producto.findFirst({
      where: {
        empresaId,
        ...(Number.isInteger(comoId) && comoId > 0
          ? { id: comoId }
          : { codigo: { equals: idOcodigo, mode: 'insensitive' } }),
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        stock: true,
        costoPromedio: true,
        unidadMedida: { select: { codigo: true, nombre: true } },
      },
    });
    if (!producto) {
      throw new NotFoundException(
        `No hay ningún producto con código o id "${idOcodigo}".`,
      );
    }
    return producto;
  }

  async genealogia(empresaId: number, idOcodigo: string) {
    const producto = await this.buscarProducto(empresaId, idOcodigo);

    const [recetas, ordenes, seUsaEn] = await Promise.all([
      // Lo que DEBERÍA llevar.
      this.prisma.recetaProduccion.findMany({
        where: { empresaId, productoFinalId: producto.id },
        orderBy: [{ activo: 'desc' }, { version: 'desc' }],
        include: {
          componentes: {
            orderBy: { orden: 'asc' },
            include: {
              productoInsumo: {
                select: {
                  id: true,
                  codigo: true,
                  descripcion: true,
                  costoPromedio: true,
                },
              },
            },
          },
        },
      }),
      // Lo que LLEVÓ de verdad, orden por orden.
      this.prisma.ordenProduccion.findMany({
        where: { empresaId, productoFinalId: producto.id },
        orderBy: { id: 'desc' },
        take: 50,
        include: {
          usuarioResponsable: { select: { nombre: true } },
          componentes: {
            include: {
              productoInsumo: {
                select: { id: true, codigo: true, descripcion: true },
              },
            },
          },
          movimientos: {
            select: {
              movimientoKardexId: true,
              tipoMovimiento: true,
              productoId: true,
            },
          },
        },
      }),
      // Hacia adelante: en qué otros productos entra este como insumo.
      this.prisma.recetaComponente.findMany({
        where: { productoInsumoId: producto.id, receta: { empresaId } },
        include: {
          receta: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              activo: true,
              productoFinal: {
                select: { id: true, codigo: true, descripcion: true },
              },
            },
          },
        },
      }),
    ]);

    // ── De qué compras entró cada insumo ────────────────────────────────────
    // El enlace real está en el kardex: los INGRESO de ese insumo que llevan
    // `compraId`. Es lo que permite decir "este lote se hizo con alambre de la
    // factura F001-402 de Aceros del Pacífico".
    const idsInsumos = [
      ...new Set([
        ...recetas.flatMap((r) => r.componentes.map((c) => c.productoInsumoId)),
        ...ordenes.flatMap((o) => o.componentes.map((c) => c.productoInsumoId)),
      ]),
    ];
    const entradas = idsInsumos.length
      ? await this.prisma.movimientoKardex.findMany({
          where: {
            empresaId,
            productoId: { in: idsInsumos },
            tipoMovimiento: 'INGRESO',
            compraId: { not: null },
          },
          orderBy: { fecha: 'desc' },
          take: 300,
          select: {
            productoId: true,
            cantidad: true,
            costoUnitario: true,
            fecha: true,
            compra: {
              select: {
                id: true,
                tipoDoc: true,
                serie: true,
                numero: true,
                fechaEmision: true,
                proveedor: { select: { nombre: true } },
              },
            },
          },
        })
      : [];
    const comprasPorInsumo = new Map<number, Array<Record<string, unknown>>>();
    for (const e of entradas) {
      if (!e.compra) continue;
      const lista = comprasPorInsumo.get(e.productoId) ?? [];
      // Como mucho tres por insumo: la pregunta es "de dónde vino", no el kardex
      // entero, que ya se ve en Trazabilidad.
      if (lista.length < 3) {
        lista.push({
          compraId: e.compra.id,
          documento: `${e.compra.serie}-${e.compra.numero}`,
          proveedor: e.compra.proveedor?.nombre ?? null,
          fecha: e.compra.fechaEmision,
          cantidad: r2(e.cantidad),
          costoUnitario: r2(e.costoUnitario),
        });
        comprasPorInsumo.set(e.productoId, lista);
      }
    }

    // ── A qué ventas fue el producto ────────────────────────────────────────
    const salidas = await this.prisma.movimientoKardex.findMany({
      where: {
        empresaId,
        productoId: producto.id,
        comprobanteId: { not: null },
      },
      orderBy: { fecha: 'desc' },
      take: 20,
      select: {
        cantidad: true,
        fecha: true,
        valorTotal: true,
        comprobante: {
          select: {
            id: true,
            tipoDoc: true,
            serie: true,
            correlativo: true,
            fechaEmision: true,
            cliente: { select: { nombre: true } },
          },
        },
      },
    });

    const recetaActiva = recetas.find((r) => r.activo) ?? recetas[0] ?? null;

    return {
      producto: {
        id: producto.id,
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        unidad: producto.unidadMedida?.codigo ?? null,
        stock: r2(producto.stock),
        costoPromedio: r2(producto.costoPromedio),
      },
      /** Si no tiene receta, es un producto que se compra, no se fabrica. */
      esFabricado: recetas.length > 0,

      receta: recetaActiva
        ? {
            id: recetaActiva.id,
            codigo: recetaActiva.codigo,
            nombre: recetaActiva.nombre,
            version: recetaActiva.version,
            activo: recetaActiva.activo,
            rendimiento: r2(recetaActiva.rendimientoObjetivo),
            unidadRendimiento: recetaActiva.unidadRendimiento,
            mermaObjetivoPorcentaje:
              recetaActiva.mermaObjetivoPorcentaje == null
                ? null
                : r2(recetaActiva.mermaObjetivoPorcentaje),
            componentes: recetaActiva.componentes.map((c) => ({
              productoId: c.productoInsumoId,
              codigo: c.productoInsumo.codigo,
              descripcion: c.productoInsumo.descripcion,
              cantidadBase: r2(c.cantidadBase),
              unidad: c.unidadBase,
              mermaEsperadaPorcentaje:
                c.mermaEsperadaPorcentaje == null
                  ? null
                  : r2(c.mermaEsperadaPorcentaje),
              esOpcional: c.esOpcional,
              costoPromedio: r2(c.productoInsumo.costoPromedio),
              vinoDe: comprasPorInsumo.get(c.productoInsumoId) ?? [],
            })),
          }
        : null,
      versionesDeReceta: recetas.length,

      ordenes: ordenes.map((o) => {
        const teorico = o.componentes.reduce(
          (s, c) => s + n(c.cantidadTeorica),
          0,
        );
        const consumido = o.componentes.reduce(
          (s, c) => s + n(c.cantidadConsumida),
          0,
        );
        return {
          id: o.id,
          lote: o.loteProduccion,
          estado: o.estado,
          fechaInicio: o.fechaInicio,
          fechaFin: o.fechaFin,
          responsable: o.usuarioResponsable?.nombre ?? null,
          cantidadObjetivo: r2(o.cantidadObjetivo),
          cantidadProducida: r2(o.cantidadProducida),
          mermaTotal: r2(o.mermaTotal),
          costoConsumo: r2(o.costoConsumo),
          costoMerma: r2(o.costoMerma),
          costoProduccion: r2(o.costoProduccion),
          /** Lo que cuesta cada unidad fabricada en este lote concreto. */
          costoUnitario:
            n(o.cantidadProducida) > 0
              ? r2(n(o.costoProduccion) / n(o.cantidadProducida))
              : null,
          /** Cuánto se pasó del consumo teórico, en porcentaje. */
          desviacionPorcentaje:
            teorico > 0 ? r2(((consumido - teorico) / teorico) * 100) : null,
          componentes: o.componentes.map((c) => ({
            productoId: c.productoInsumoId,
            codigo: c.productoInsumo.codigo,
            descripcion: c.productoInsumo.descripcion,
            unidad: c.unidad,
            cantidadTeorica: r2(c.cantidadTeorica),
            cantidadConsumida: r2(c.cantidadConsumida),
            mermaCantidad: r2(c.mermaCantidad),
            costoUnitario: r2(c.costoUnitario),
            costoTotal: r2(c.costoTotal),
            vinoDe: comprasPorInsumo.get(c.productoInsumoId) ?? [],
          })),
        };
      }),

      salidas: salidas
        .filter((s) => s.comprobante)
        .map((s) => ({
          comprobanteId: s.comprobante!.id,
          documento: `${s.comprobante!.serie}-${s.comprobante!.correlativo}`,
          tipoDoc: s.comprobante!.tipoDoc,
          cliente: s.comprobante!.cliente?.nombre ?? null,
          fecha: s.comprobante!.fechaEmision,
          cantidad: r2(s.cantidad),
          costo: r2(s.valorTotal),
        })),

      /** Hacia adelante: dónde se usa este producto como insumo de otro. */
      seUsaEn: seUsaEn.map((c) => ({
        recetaId: c.receta.id,
        recetaCodigo: c.receta.codigo,
        recetaNombre: c.receta.nombre,
        activa: c.receta.activo,
        productoFinalId: c.receta.productoFinal.id,
        productoFinalCodigo: c.receta.productoFinal.codigo,
        productoFinalDescripcion: c.receta.productoFinal.descripcion,
        cantidadPorUnidad: r2(c.cantidadBase),
        unidad: c.unidadBase,
      })),
    };
  }
}
