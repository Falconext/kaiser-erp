import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  PrecioModulo,
  calcularPrecioModulo,
  explotarCantidad,
  factorExplosion,
} from './produccion-calculo';

/**
 * El precio de un módulo: peso × precio por kilo × factor.
 *
 * Así cotiza Kaiser de verdad. El precio de catálogo de un módulo envejece en
 * cuanto se mueve el acero; el peso no cambia, y el factor es lo que se
 * negocia con el cliente.
 *
 * Vive aparte de `ProduccionService` porque lo usa el COTIZADOR, no planta:
 * meterlo ahí obligaría a ventas a arrastrar medio módulo de producción para
 * poner un precio.
 */
@Injectable()
export class PrecioModuloService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El peso de un módulo, sacado de su receta.
   *
   * ⚠ Devuelve `null` en cuanto UN componente no tiene peso, y la lista de
   * cuáles. Un peso parcial sería peor que ninguno: daría un precio que parece
   * calculado y que es más bajo de lo que debe, y nadie lo notaría hasta
   * comparar con la competencia.
   *
   * Los componentes POR_LOTE NO entran en el peso de una unidad: son gasto de
   * tanda, y sumarlos haría que un módulo pesara distinto según el tamaño del
   * lote que se fabrique.
   */
  async pesoDeModulo(empresaId: number, productoId: number) {
    const receta = await this.prisma.recetaProduccion.findFirst({
      where: { empresaId, productoFinalId: productoId, activo: true },
      orderBy: { version: 'desc' },
      include: {
        componentes: {
          include: {
            productoInsumo: {
              select: { codigo: true, pesoGramos: true },
            },
          },
        },
      },
    });
    if (!receta) return { pesoKg: null, sinPeso: [], receta: null };

    const factor = factorExplosion(1, Number(receta.rendimientoObjetivo));
    const sinPeso: string[] = [];
    let gramos = 0;

    for (const comp of receta.componentes) {
      if (comp.tipoCantidad === 'POR_LOTE') continue;
      const peso = Number(comp.productoInsumo.pesoGramos ?? 0);
      if (!peso) {
        sinPeso.push(comp.productoInsumo.codigo);
        continue;
      }
      gramos +=
        peso *
        explotarCantidad(
          Number(comp.cantidadBase),
          comp.tipoCantidad,
          factor,
        );
    }

    return {
      pesoKg: sinPeso.length ? null : gramos / 1000,
      sinPeso,
      receta: { id: receta.id, codigo: receta.codigo },
    };
  }

  /**
   * Resuelve el precio de un módulo.
   *
   * `factor` opcional: sin él se usa el de la empresa. Si viene por debajo del
   * mínimo hay que autorizarlo — y eso lo decide el llamador, no esto: aquí
   * solo se dice si está por debajo.
   */
  async calcular(
    empresaId: number,
    productoId: number,
    factorPedido?: number,
  ): Promise<
    PrecioModulo & {
      productoId: number;
      esModulo: boolean;
      factorMinimo: number | null;
      bajoMinimo: boolean;
    }
  > {
    const producto = await this.prisma.producto.findFirst({
      where: { id: productoId, empresaId },
      select: { id: true, esModulo: true, precioUnitario: true },
    });
    if (!producto) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        precioBaseKg: true,
        factorPrecioDefault: true,
        factorPrecioMinimo: true,
      },
    });

    const { pesoKg, sinPeso } = await this.pesoDeModulo(empresaId, productoId);
    const factor =
      factorPedido !== undefined && factorPedido !== null
        ? Number(factorPedido)
        : empresa?.factorPrecioDefault != null
          ? Number(empresa.factorPrecioDefault)
          : null;
    const factorMinimo =
      empresa?.factorPrecioMinimo != null
        ? Number(empresa.factorPrecioMinimo)
        : null;

    const precio = calcularPrecioModulo({
      pesoKg,
      precioBaseKg:
        empresa?.precioBaseKg != null ? Number(empresa.precioBaseKg) : null,
      factor,
      precioCatalogo: Number(producto.precioUnitario ?? 0),
      componentesSinPeso: sinPeso,
    });

    return {
      ...precio,
      productoId: producto.id,
      esModulo: producto.esModulo,
      factorMinimo,
      // Solo tiene sentido comparar si hay los dos números.
      bajoMinimo:
        factor !== null && factorMinimo !== null && factor < factorMinimo,
    };
  }

  /**
   * La misma comprobación que necesita el cotizador antes de guardar: un
   * factor por debajo del mínimo se rechaza salvo que venga autorizado.
   *
   * ⚠ `autorizarFactorBajoMinimo` tiene que estar declarado en el DTO del
   * comprobante: el ValidationPipe global va con `whitelist: true` y borra del
   * body lo que el DTO no declare, sin avisar. Es la misma trampa que ya
   * documentó el límite de crédito.
   */
  asegurarFactorPermitido(entrada: {
    factor: number | null;
    factorMinimo: number | null;
    autorizado?: boolean;
    esAdminEmpresa: boolean;
  }) {
    const { factor, factorMinimo, autorizado, esAdminEmpresa } = entrada;
    if (factor === null || factorMinimo === null) return;
    if (factor >= factorMinimo) return;

    if (!autorizado) {
      throw new BadRequestException(
        `El factor ${factor} está por debajo del mínimo (${factorMinimo}). ` +
          'Gerencia puede autorizarlo marcando la casilla.',
      );
    }
    if (!esAdminEmpresa) {
      throw new BadRequestException(
        `El factor ${factor} está por debajo del mínimo (${factorMinimo}) y ` +
          'solo gerencia puede autorizarlo.',
      );
    }
  }
}
