import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KardexService } from '../kardex/kardex.service';
import { ProductoLoteService } from '../producto/producto-lote.service';
import { S3Service } from '../s3/s3.service';
import { GeminiService } from '../gemini/gemini.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { Prisma } from '@prisma/client';
import { XMLParser } from 'fast-xml-parser';
import { parseFechaSoloDia } from '../common/utils/fecha';
import { parseFechaEmision } from '../common/utils/fecha';
import { inicioDelDiaLima, finDelDiaLima } from '../common/utils/fecha';

@Injectable()
export class ComprasService {
  constructor(
    private prisma: PrismaService,
    private kardexService: KardexService,
    private productoLoteService: ProductoLoteService,
    private s3: S3Service,
    private geminiService: GeminiService,
  ) {}

  private readonly saldoTolerance = 0.01;

  private roundMoney(value: number) {
    return parseFloat((Number(value) || 0).toFixed(2));
  }

  // Normaliza y deduplica las series/IMEI de una línea (trim + mayúsculas),
  // descartando vacíos. Devuelve [] si no hay series válidas.
  private normalizarNumerosSerie(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    const vistos = new Set<string>();
    const result: string[] = [];
    for (const raw of value) {
      const normalized = String(raw ?? '')
        .trim()
        .toUpperCase();
      if (!normalized || vistos.has(normalized)) continue;
      vistos.add(normalized);
      result.push(normalized);
    }
    return result;
  }

  // Calcula la fecha límite de garantía a partir de los meses indicados.
  private calcularGarantiaHasta(garantiaMeses: unknown): Date | null {
    if (garantiaMeses == null || garantiaMeses === '') return null;
    const meses = Number(garantiaMeses);
    if (!Number.isInteger(meses) || meses <= 0) return null;
    const hasta = new Date();
    hasta.setMonth(hasta.getMonth() + meses);
    return hasta;
  }

  private normalizeEstadoPagoBySaldo(total: number, saldo: number) {
    const safeTotal = this.roundMoney(total);
    const safeSaldo = Math.max(0, this.roundMoney(saldo));
    if (safeSaldo <= this.saldoTolerance) return 'COMPLETADO';
    if (safeSaldo < safeTotal - this.saldoTolerance) return 'PAGO_PARCIAL';
    return 'PENDIENTE_PAGO';
  }

  private normalizeCompraForResponse<
    T extends { total: any; saldo: any; estadoPago: any },
  >(compra: T): T {
    const saldo = Math.max(0, this.roundMoney(Number(compra.saldo ?? 0)));
    return {
      ...compra,
      saldo,
      estadoPago: this.normalizeEstadoPagoBySaldo(
        Number(compra.total ?? 0),
        saldo,
      ) as any,
    };
  }

  /**
   * ¿La línea lleva IGV? Se mira la afectación del PRODUCTO (Catálogo 07):
   * 10-17 gravado, 20 exonerado, 30 inafecto, 40 exportación.
   *
   * Sin esto se aplicaba 18 % a TODAS las líneas de compra: a un insumo
   * exonerado se le inventaba un IGV que la factura no trae, y ese importe
   * entraba al crédito fiscal. No es un descuadre de pantalla — va al registro
   * de compras y al SIRE, y es un reparo si SUNAT lo mira.
   */
  private esAfectacionGravada(tipoAfectacionIGV?: string | null): boolean {
    const cod = String(tipoAfectacionIGV ?? '10').trim();
    return cod === '' || cod.startsWith('1');
  }

  /**
   * Afectación de cada producto de la compra, en UNA consulta. Los ítems libres
   * (sin productoId) no están aquí: su afectación la declara la propia línea, y
   * si no dice nada se asume gravada, que es el caso normal.
   */
  private async afectacionGravadaPorProducto(
    empresaId: number,
    detalles: Array<{ productoId?: number | null }>,
  ): Promise<Map<number, boolean>> {
    const ids = [
      ...new Set(
        (detalles || [])
          .map((d) => Number(d.productoId))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
    const gravado = new Map<number, boolean>();
    if (!ids.length) return gravado;
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: ids }, empresaId },
      select: { id: true, tipoAfectacionIGV: true },
    });
    for (const prod of productos) {
      gravado.set(prod.id, this.esAfectacionGravada(prod.tipoAfectacionIGV));
    }
    return gravado;
  }

  /**
   * Montos de una línea según su afectación. `precioUnitario` es lo tecleado:
   * con `incluyeIgv` trae el IGV embebido, y eso solo tiene sentido en gravados
   * — a un exonerado no se le puede "extraer" un IGV que no lleva.
   */
  private montosLinea(
    item: {
      precioUnitario: number | string;
      cantidad: number | string;
      incluyeIgv?: boolean;
    },
    gravado: boolean,
  ) {
    const precioIngresado = Number(item.precioUnitario) || 0;
    const cantidad = Number(item.cantidad) || 0;
    const costoNeto =
      gravado && item.incluyeIgv
        ? parseFloat((precioIngresado / 1.18).toFixed(4))
        : precioIngresado;
    const igvItem = gravado ? parseFloat((costoNeto * 0.18).toFixed(4)) : 0;
    const sub = costoNeto * cantidad;
    const totalLinea = !gravado
      ? sub
      : item.incluyeIgv
        ? precioIngresado * cantidad
        : (costoNeto + igvItem) * cantidad;
    return { costoNeto, igvItem, sub, totalLinea };
  }

  /**
   * Maker-checker: una compra queda PENDIENTE_APROBACION solo si la empresa
   * encendió `requiereAprobacionCompras` Y quien la registra es USUARIO_EMPRESA.
   * Gerencia (ADMIN_EMPRESA) no se pide permiso a sí misma.
   *
   * En ese estado NO ingresa stock y NO acepta pagos: todo se difiere hasta la
   * aprobación, para que rechazarla no obligue a deshacer nada.
   */
  private async requiereAprobacionCompra(
    empresaId: number,
    usuarioRol?: string,
  ): Promise<boolean> {
    if (String(usuarioRol || '').toUpperCase() !== 'USUARIO_EMPRESA') {
      return false;
    }
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { requiereAprobacionCompras: true },
    });
    return Boolean(empresa?.requiereAprobacionCompras);
  }

  async crear(
    empresaId: number,
    usuarioId: number,
    data: CrearCompraDto,
    reqSedeId?: number,
    usuarioRol?: string,
  ) {
    const esPendiente = await this.requiereAprobacionCompra(
      empresaId,
      usuarioRol,
    );

    // Consumo propio: explícito desde el formulario, o inferido cuando NINGUNA
    // línea apunta al catálogo (todas son ítems libres). Se calcula una sola vez
    // porque decide DOS cosas: que la compra pese como gasto del mes y que no
    // entre al inventario. Una boleta de restaurante o de gasolina cae aquí.
    const esConsumoPropio =
      typeof (data as any).esGasto === 'boolean'
        ? (data as any).esGasto
        : data.detalles.length > 0 && data.detalles.every((d) => !d.productoId);
    const duplicado = await this.prisma.compra.findFirst({
      where: { empresaId, serie: data.serie, numero: data.numero },
      select: { id: true },
    });
    if (duplicado) {
      throw new BadRequestException(
        `Ya existe una compra registrada con la serie ${data.serie} y número ${data.numero}.`,
      );
    }

    // Series / IMEI: normalizar y validar unicidad ANTES de crear la compra,
    // para no dejar la compra registrada con series a medias.
    const seriesPorLinea = data.detalles.map((item) =>
      this.normalizarNumerosSerie(item.numerosSerie),
    );
    const todasLasSeries = seriesPorLinea.flat();
    if (todasLasSeries.length) {
      // Duplicados dentro del mismo payload
      const vistos = new Set<string>();
      for (const s of todasLasSeries) {
        if (vistos.has(s)) {
          throw new BadRequestException(
            `La serie "${s}" está repetida en la compra.`,
          );
        }
        vistos.add(s);
      }
      // Duplicados contra series ya registradas en la empresa
      const existentes = await this.prisma.productoSerie.findMany({
        where: { empresaId, numeroSerie: { in: todasLasSeries } },
        select: { numeroSerie: true },
      });
      if (existentes.length) {
        throw new BadRequestException(
          `La(s) serie(s) ${existentes
            .map((e) => e.numeroSerie)
            .join(', ')} ya están registradas en el sistema.`,
        );
      }
    }

    let subtotal = 0;
    let totalLineas = 0;

    // Usar la sede del token; si el usuario es admin sin sede asignada, usar la sede principal
    let sedeId = reqSedeId;
    if (!sedeId) {
      const principal = await this.prisma.sede.findFirst({
        where: { empresaId, esPrincipal: true, activo: true },
        select: { id: true },
      });
      if (!principal) {
        throw new BadRequestException(
          'No se pudo determinar la sede. Asigne una sede al usuario o configure una sede principal.',
        );
      }
      sedeId = principal.id;
    }

    // Prepare detail data and calculate totals from items to be safe
    const detallesData: any[] = [];

    // Afectación de los productos de la compra, en una sola consulta.
    const gravadoPorProducto = await this.afectacionGravadaPorProducto(
      empresaId,
      data.detalles,
    );

    for (const item of data.detalles) {
      // Un producto exonerado o inafecto NO lleva IGV. Para los ítems libres
      // manda lo que declare la línea (`tipoAfectacionIGV`), y a falta de dato
      // se asume gravado.
      const gravado =
        item.productoId != null
          ? (gravadoPorProducto.get(Number(item.productoId)) ?? true)
          : this.esAfectacionGravada((item as any).tipoAfectacionIGV);
      const { costoNeto, sub, totalLinea } = this.montosLinea(item, gravado);

      subtotal += sub;
      totalLineas += totalLinea;

      detallesData.push({
        productoId: item.productoId,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: costoNeto, // siempre neto en DB
        subtotal: sub,
        igv: totalLinea - sub,
        total: totalLinea,
        lote: item.lote,
        fechaVencimiento: item.fechaVencimiento
          ? parseFechaSoloDia(item.fechaVencimiento)
          : null,
      });
    }

    // Calculate final totals
    const subtotalTotal = this.roundMoney(subtotal);
    const total = this.roundMoney(
      data.total !== undefined ? Number(data.total) : totalLineas,
    );
    const igvTotal = this.roundMoney(
      data.igv !== undefined ? Number(data.igv) : total - subtotalTotal,
    );
    const montoPagadoInicial = Math.max(
      0,
      this.roundMoney(Number(data.montoPagadoInicial) || 0),
    );
    const saldoInicial = Math.max(
      0,
      this.roundMoney(total - montoPagadoInicial),
    );
    const estadoPagoInicial = this.normalizeEstadoPagoBySaldo(
      total,
      saldoInicial,
    );

    // Create Purchase Transaction
    const compra = await this.prisma.$transaction(async (tx) => {
      return await tx.compra.create({
        include: { detalles: { orderBy: { id: 'asc' } } },
        data: {
          empresaId,
          proveedorId: data.proveedorId,
          usuarioId,
          tipoDoc: data.tipoDoc || 'FACTURA',
          serie: data.serie,
          numero: data.numero,
          fechaEmision: parseFechaSoloDia(data.fechaEmision),
          fechaVencimiento: data.fechaVencimiento
            ? parseFechaSoloDia(data.fechaVencimiento)
            : null,
          moneda: data.moneda || 'PEN',
          tipoCambio: data.tipoCambio,
          subtotal: subtotalTotal,
          igv: igvTotal,
          total,
          saldo: saldoInicial,
          estado: esPendiente ? 'PENDIENTE_APROBACION' : 'REGISTRADO',
          // Evidencia de la factura leída por IA (opcional).
          fotoUrl: (data as any).fotoUrl ?? null,
          esGasto: esConsumoPropio,
          estadoPago: estadoPagoInicial as any,
          observaciones: data.observaciones,
          // Save installments
          cuotas: data.cuotas ? JSON.stringify(data.cuotas) : undefined,
          detalles: {
            create: detallesData,
          },
          sedeId: sedeId, // Guardar la sede a nivel de la cabecera de la compra
          pagos:
            montoPagadoInicial > 0
              ? {
                  create: {
                    empresaId,
                    usuarioId,
                    monto: montoPagadoInicial,
                    metodoPago: data.metodoPagoInicial || 'EFECTIVO',
                    // Pago por banco: N° de operación + cuenta bancaria usada.
                    referencia: data.referenciaInicial || undefined,
                    cuentaBancariaId: data.cuentaBancariaIdInicial || undefined,
                    fecha: new Date(),
                  },
                }
              : undefined,
        },
      });
    });

    // Un consumo propio no es mercadería: no entra al inventario ni mueve
    // kardex. Su costo pesa entero en el mes, no cuando se venda algo.
    if (esConsumoPropio) {
      return {
        success: true,
        message:
          'Compra de consumo propio registrada (no ingresa al inventario).',
        data: compra,
      };
    }

    // Una compra pendiente de visto bueno no toca inventario: el stock entra
    // en `aprobarCompra`. Si entrara aquí, rechazarla obligaría a revertir
    // movimientos de kardex ya valorizados.
    if (esPendiente) {
      return {
        success: true,
        message:
          'Compra registrada y enviada a aprobación. El stock ingresará cuando se apruebe.',
        data: compra,
      };
    }

    // Update Inventory (Kardex)
    // We do this outside the transaction because KardexService manages its own logic.
    // In a production system, we might want to wrap this in the transaction or use a saga.
    // El kardex y costoPromedio siempre se valorizan en PEN: si la compra es en
    // otra moneda se convierte con el tipo de cambio de la compra.
    const factorPen = factorConversionPen(data.moneda, data.tipoCambio);
    for (const item of data.detalles) {
      if (item.productoId) {
        try {
          // costoPromedio siempre se actualiza con el precio NETO (sin IGV)
          const costoNetoKardex = parseFloat(
            (
              (item.incluyeIgv
                ? Number(item.precioUnitario) / 1.18
                : Number(item.precioUnitario)) * factorPen
            ).toFixed(4),
          );
          const movimiento = await this.kardexService.registrarMovimiento({
            empresaId,
            productoId: item.productoId,
            tipoMovimiento: 'INGRESO',
            concepto: `COMPRA ${compra.serie}-${compra.numero}`,
            cantidad: Number(item.cantidad),
            costoUnitario: costoNetoKardex,
            compraId: compra.id,
            usuarioId,
            sedeId,
            lote: item.lote,
            fechaVencimiento: item.fechaVencimiento
              ? parseFechaSoloDia(item.fechaVencimiento)
              : undefined,
          });

          // Sincronizar ProductoLote para FEFO (sin double-contar stock global)
          if (item.lote && item.fechaVencimiento) {
            await this.productoLoteService
              .sincronizarLoteDesdeIngreso({
                productoId: item.productoId,
                empresaId,
                lote: item.lote,
                fechaVencimiento: parseFechaSoloDia(item.fechaVencimiento),
                cantidad: Number(item.cantidad),
                costoUnitario: costoNetoKardex,
                movimientoKardexId: movimiento.id,
              })
              .catch((err) => {
                throw new Error(
                  `Error sincronizando lote "${item.lote}" del producto "${item.descripcion ?? item.productoId}": ${err.message}`,
                );
              });
          }
        } catch (error) {
          console.error(
            `Error updating kardex for product ${item.productoId}:`,
            error,
          );
          // Continue with other items, or flag warning?
        }
      }
    }

    // Registrar series / IMEI de la compra como ProductoSerie DISPONIBLE.
    // Se enlazan a la compra y a su línea; las series son opcionales (pueden
    // completarse luego desde Kardex → Series y Garantías).
    if (todasLasSeries.length) {
      const detallesCreados = (compra as any).detalles ?? [];
      const seriesData: Prisma.ProductoSerieCreateManyInput[] = [];
      for (let i = 0; i < data.detalles.length; i++) {
        const series = seriesPorLinea[i];
        if (!series.length) continue;
        const item = data.detalles[i];
        const detalle = detallesCreados[i];
        if (!item.productoId || !detalle) continue;
        const garantiaHasta = this.calcularGarantiaHasta(item.garantiaMeses);
        for (const numeroSerie of series) {
          seriesData.push({
            empresaId,
            productoId: Number(item.productoId),
            sedeId: sedeId ?? null,
            numeroSerie,
            estado: 'DISPONIBLE',
            garantiaMeses:
              item.garantiaMeses != null ? Number(item.garantiaMeses) : null,
            garantiaHasta,
            compraId: compra.id,
            compraDetalleId: detalle.id,
          });
        }
      }
      if (seriesData.length) {
        try {
          await this.prisma.productoSerie.createMany({ data: seriesData });
        } catch (error) {
          console.error(
            'No se pudieron registrar las series de la compra:',
            error,
          );
        }
      }
    }

    // Guardar/actualizar equivalencias de productos importados desde XML por proveedor.
    // Esto permite autovincular próximas importaciones del mismo proveedor.
    try {
      const proveedor = await this.prisma.cliente.findFirst({
        where: { id: data.proveedorId, empresaId },
        select: { nroDoc: true },
      });
      const proveedorRuc = this.normalizarCodigoXml(proveedor?.nroDoc || '');
      if (proveedorRuc) {
        const vinculables = data.detalles
          .filter((d: any) => d.productoId && d.codigoXml)
          .map((d: any) => ({
            productoId: Number(d.productoId),
            codigoXml: this.normalizarCodigoXml(d.codigoXml),
            descripcion: String(d.descripcion || '').trim() || null,
          }))
          .filter((d: any) => d.codigoXml);

        if (vinculables.length) {
          await this.prisma.$transaction(
            vinculables.map((v: any) =>
              this.prisma.vinculoProductoProveedorXml.upsert({
                where: {
                  empresaId_proveedorRuc_codigoXml: {
                    empresaId,
                    proveedorRuc,
                    codigoXml: v.codigoXml,
                  },
                },
                create: {
                  empresaId,
                  proveedorRuc,
                  codigoXml: v.codigoXml,
                  productoId: v.productoId,
                  descripcionXml: v.descripcion,
                },
                update: {
                  productoId: v.productoId,
                  descripcionXml: v.descripcion,
                },
              }),
            ),
          );
        }
      }
    } catch (error) {
      // No bloquear la compra si falla el guardado de equivalencias.
      console.error(
        'No se pudo guardar equivalencias XML de proveedor:',
        error,
      );
    }

    return this.normalizeCompraForResponse(compra);
  }

  // Resuelve la sede/almacén destino del stock: prioriza la sede indicada en el
  // payload (validada contra la empresa), luego un fallback (sesión), y por
  // último la sede principal. Igual criterio que `crear`.
  private async resolverSedeDestino(
    empresaId: number,
    dataSedeId?: number,
    fallbackSedeId?: number,
  ): Promise<number> {
    let sedeId = fallbackSedeId;
    if (dataSedeId) {
      const destino = await this.prisma.sede.findFirst({
        where: { id: Number(dataSedeId), empresaId, activo: true },
        select: { id: true },
      });
      if (!destino) {
        throw new BadRequestException(
          'La sede/almacén destino no es válida o no pertenece a la empresa.',
        );
      }
      sedeId = destino.id;
    }
    if (!sedeId) {
      const principal = await this.prisma.sede.findFirst({
        where: { empresaId, esPrincipal: true, activo: true },
        select: { id: true },
      });
      if (!principal) {
        throw new BadRequestException(
          'No se pudo determinar la sede. Asigne una sede al usuario o configure una sede principal.',
        );
      }
      sedeId = principal.id;
    }
    return sedeId;
  }

  // Impide anular/editar una compra cuando alguna de sus series/IMEI ya no está
  // DISPONIBLE (fue vendida o asignada). Revertir el ingreso en ese caso dejaría
  // inconsistencias graves, así que se bloquea con un mensaje claro.
  private async assertSinSeriesUsadas(compraId: number, empresaId: number) {
    const usadas = await this.prisma.productoSerie.count({
      where: {
        compraId,
        empresaId,
        estado: { not: 'DISPONIBLE' as any },
      },
    });
    if (usadas > 0) {
      throw new BadRequestException(
        'No se puede modificar/anular esta compra: tiene series/IMEI que ya fueron vendidas o asignadas. Revierte esas ventas primero.',
      );
    }
  }

  // Revierte el inventario ingresado por una compra: por cada detalle con
  // producto registra un movimiento de kardex compensatorio (SALIDA) que baja el
  // stock, y descuenta el lote FEFO correspondiente. Best-effort: los fallos no
  // bloquean, se acumulan como avisos.
  private async revertirInventarioCompra(
    compra: {
      id: number;
      serie: string;
      numero: string;
      sedeId: number | null;
      moneda?: string | null;
      tipoCambio?: any;
      detalles: {
        productoId: number | null;
        cantidad: any;
        precioUnitario: any;
        lote: string | null;
        fechaVencimiento: Date | null;
        descripcion: string | null;
      }[];
    },
    empresaId: number,
    usuarioId: number,
    conceptoPrefix: string,
  ): Promise<string[]> {
    const warnings: string[] = [];
    const sedeId =
      compra.sedeId ??
      (await this.resolverSedeDestino(empresaId, undefined, undefined));

    // El kardex de Kaiser está en soles. El ingreso de la compra se valorizó con
    // el tipo de cambio del documento, así que la salida compensatoria tiene que
    // usar el mismo factor: si sale en dólares tratados como soles, se retira
    // menos valor del que entró y el costo promedio del producto queda inflado
    // para siempre, aunque la cantidad cuadre.
    const factorPen = factorConversionPen(
      compra.moneda,
      compra.tipoCambio == null ? undefined : Number(compra.tipoCambio),
    );

    for (const det of compra.detalles) {
      if (!det.productoId) continue;
      const cantidad = Number(det.cantidad) || 0;
      if (cantidad <= 0) continue;
      const nombreItem = det.descripcion ?? `producto ${det.productoId}`;
      try {
        const movimiento = await this.kardexService.registrarMovimiento({
          empresaId,
          productoId: det.productoId,
          tipoMovimiento: 'SALIDA',
          concepto: `${conceptoPrefix} ${compra.serie}-${compra.numero}`,
          cantidad,
          costoUnitario: (Number(det.precioUnitario) || 0) * factorPen,
          compraId: compra.id,
          usuarioId,
          sedeId,
        });

        // Revertir el lote FEFO ingresado por esta línea (si aplicaba).
        if (det.lote && det.fechaVencimiento) {
          const lote = await this.prisma.productoLote.findUnique({
            where: {
              productoId_lote: { productoId: det.productoId, lote: det.lote },
            },
            select: { id: true },
          });
          if (lote) {
            await this.productoLoteService.descontarStockLote(
              det.productoId,
              cantidad,
              movimiento.id,
              lote.id,
            );
          }
        }
      } catch (error) {
        console.error(
          `Error revirtiendo stock del producto ${det.productoId} (compra ${compra.id}):`,
          error,
        );
        warnings.push(
          `No se pudo revertir el stock de "${nombreItem}": ${
            error?.message ?? 'error desconocido'
          }. Revisa/ajusta el stock manualmente.`,
        );
      }
    }
    return warnings;
  }

  // Anulación lógica de una compra: revierte el inventario, libera las series
  // DISPONIBLE, marca estado=ANULADO y deja saldo en 0. No borra el registro ni
  // los pagos (auditoría). Las compras ANULADO se excluyen del listado.
  async anular(
    empresaId: number,
    usuarioId: number,
    id: number,
    _sedeId?: number,
  ) {
    const compra = await this.prisma.compra.findFirst({
      where: { id, empresaId },
      include: { detalles: { orderBy: { id: 'asc' } } },
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    if (compra.estado === ('ANULADO' as any)) {
      throw new BadRequestException('La compra ya está anulada.');
    }
    await this.assertSinSeriesUsadas(id, empresaId);

    const stockWarnings = await this.revertirInventarioCompra(
      compra as any,
      empresaId,
      usuarioId,
      'ANULACION COMPRA',
    );

    // Liberar (borrar) las series DISPONIBLE registradas por esta compra: el
    // ingreso ya no existe. Best-effort.
    try {
      await this.prisma.productoSerie.deleteMany({
        where: { compraId: id, empresaId, estado: 'DISPONIBLE' as any },
      });
    } catch (error) {
      console.error('No se pudieron liberar las series de la compra:', error);
    }

    await this.prisma.compra.update({
      where: { id },
      data: { estado: 'ANULADO' as any, saldo: 0 },
    });

    return {
      success: true,
      message: 'Compra anulada y stock revertido correctamente.',
      ...(stockWarnings.length ? { stockWarnings } : {}),
    };
  }

  // Edición completa de una compra: revierte los efectos de inventario previos y
  // re-aplica los nuevos a partir del payload (mismos cálculos que `crear`). No
  // toca los pagos ya registrados; sí recalcula el saldo según el nuevo total.
  async actualizar(
    empresaId: number,
    usuarioId: number,
    id: number,
    data: CrearCompraDto,
    reqSedeId?: number,
  ) {
    const existente = await this.prisma.compra.findFirst({
      where: { id, empresaId },
      include: {
        detalles: { orderBy: { id: 'asc' } },
        pagos: {
          select: { id: true, monto: true },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!existente) throw new NotFoundException('Compra no encontrada');
    if (existente.estado === ('ANULADO' as any)) {
      throw new BadRequestException('No se puede editar una compra anulada.');
    }
    await this.assertSinSeriesUsadas(id, empresaId);

    // Duplicado serie+numero excluyendo la propia compra.
    const duplicado = await this.prisma.compra.findFirst({
      where: {
        empresaId,
        serie: data.serie,
        numero: data.numero,
        id: { not: id },
      },
      select: { id: true },
    });
    if (duplicado) {
      throw new BadRequestException(
        `Ya existe otra compra registrada con la serie ${data.serie} y número ${data.numero}.`,
      );
    }

    // Series / IMEI: validar unicidad ANTES de tocar nada, excluyendo las de
    // esta misma compra (que se reemplazan).
    const seriesPorLinea = data.detalles.map((item) =>
      this.normalizarNumerosSerie(item.numerosSerie),
    );
    const todasLasSeries = seriesPorLinea.flat();
    if (todasLasSeries.length) {
      const vistos = new Set<string>();
      for (const s of todasLasSeries) {
        if (vistos.has(s)) {
          throw new BadRequestException(
            `La serie "${s}" está repetida en la compra.`,
          );
        }
        vistos.add(s);
      }
      const existentes = await this.prisma.productoSerie.findMany({
        where: {
          empresaId,
          numeroSerie: { in: todasLasSeries },
          compraId: { not: id },
        },
        select: { numeroSerie: true },
      });
      if (existentes.length) {
        throw new BadRequestException(
          `La(s) serie(s) ${existentes
            .map((e) => e.numeroSerie)
            .join(', ')} ya están registradas en el sistema.`,
        );
      }
    }

    const sedeId = await this.resolverSedeDestino(
      empresaId,
      data.sedeId,
      existente.sedeId ?? reqSedeId,
    );

    // 1) Revertir el inventario de la versión anterior.
    const warningsRevertir = await this.revertirInventarioCompra(
      existente as any,
      empresaId,
      usuarioId,
      'AJUSTE EDICION COMPRA',
    );
    // Liberar las series previas (se re-crearán las nuevas del payload).
    try {
      await this.prisma.productoSerie.deleteMany({
        where: { compraId: id, empresaId, estado: 'DISPONIBLE' as any },
      });
    } catch (error) {
      console.error('No se pudieron liberar las series previas:', error);
    }

    // 2) Recalcular detalles y totales (idéntico criterio que `crear`).
    let subtotal = 0;
    let totalLineas = 0;
    const detallesData: any[] = [];
    // Afectación de los productos de la compra, en una sola consulta.
    const gravadoPorProducto = await this.afectacionGravadaPorProducto(
      empresaId,
      data.detalles,
    );
    for (const item of data.detalles) {
      // Un producto exonerado o inafecto NO lleva IGV. Para los ítems libres
      // manda lo que declare la línea (`tipoAfectacionIGV`), y a falta de dato
      // se asume gravado.
      const gravado =
        item.productoId != null
          ? (gravadoPorProducto.get(Number(item.productoId)) ?? true)
          : this.esAfectacionGravada((item as any).tipoAfectacionIGV);
      const { costoNeto, sub, totalLinea } = this.montosLinea(item, gravado);
      subtotal += sub;
      totalLineas += totalLinea;
      detallesData.push({
        productoId: item.productoId,
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        precioUnitario: costoNeto,
        subtotal: sub,
        igv: totalLinea - sub,
        total: totalLinea,
        lote: item.lote,
        fechaVencimiento: item.fechaVencimiento
          ? parseFechaSoloDia(item.fechaVencimiento)
          : null,
      });
    }
    const subtotalTotal = this.roundMoney(subtotal);
    const total = this.roundMoney(
      data.total !== undefined ? Number(data.total) : totalLineas,
    );
    const igvTotal = this.roundMoney(
      data.igv !== undefined ? Number(data.igv) : total - subtotalTotal,
    );
    // Saldo recalculado con los pagos YA registrados (no se tocan).
    const totalPagado = existente.pagos.reduce(
      (acc, p) => acc + Number(p.monto),
      0,
    );
    const nuevoSaldo = Math.max(0, this.roundMoney(total - totalPagado));
    const nuevoEstadoPago = this.normalizeEstadoPagoBySaldo(total, nuevoSaldo);

    // Pago inicial a corregir: el primer pago registrado (el que muestra el
    // modal de edición). Permite cambiar el N° de operación / método / cuenta
    // de una compra ya inscrita sin tener que anularla y volver a crearla.
    const pagoInicial = existente.pagos[0];
    const debeActualizarPagoInicial =
      !!pagoInicial &&
      (data.referenciaInicial !== undefined ||
        data.metodoPagoInicial !== undefined ||
        data.cuentaBancariaIdInicial !== undefined);

    // 3) Reemplazar cabecera + detalles en una transacción.
    const compra = await this.prisma.$transaction(async (tx) => {
      await tx.detalleCompra.deleteMany({ where: { compraId: id } });
      if (debeActualizarPagoInicial) {
        await tx.pagoCompra.update({
          where: { id: pagoInicial.id },
          data: {
            referencia: data.referenciaInicial || null,
            ...(data.metodoPagoInicial
              ? { metodoPago: data.metodoPagoInicial }
              : {}),
            cuentaBancariaId:
              data.metodoPagoInicial === 'TRANSFERENCIA'
                ? data.cuentaBancariaIdInicial || null
                : null,
          },
        });
      }
      return tx.compra.update({
        where: { id },
        include: { detalles: { orderBy: { id: 'asc' } } },
        data: {
          proveedorId: data.proveedorId,
          tipoDoc: data.tipoDoc || existente.tipoDoc,
          serie: data.serie,
          numero: data.numero,
          fechaEmision: parseFechaSoloDia(data.fechaEmision),
          fechaVencimiento: data.fechaVencimiento
            ? parseFechaSoloDia(data.fechaVencimiento)
            : null,
          moneda: data.moneda || existente.moneda,
          tipoCambio: data.tipoCambio,
          subtotal: subtotalTotal,
          igv: igvTotal,
          total,
          saldo: nuevoSaldo,
          estadoPago: nuevoEstadoPago as any,
          observaciones: data.observaciones,
          cuotas: data.cuotas ? JSON.stringify(data.cuotas) : undefined,
          sedeId,
          detalles: { create: detallesData },
        },
      });
    });

    // 4) Re-aplicar el inventario nuevo (INGRESO + lotes FEFO).
    const warningsAplicar: string[] = [];
    const factorPen = factorConversionPen(data.moneda, data.tipoCambio);
    for (const item of data.detalles) {
      if (!item.productoId) continue;
      try {
        const costoNetoKardex = parseFloat(
          (
            (item.incluyeIgv
              ? Number(item.precioUnitario) / 1.18
              : Number(item.precioUnitario)) * factorPen
          ).toFixed(4),
        );
        const movimiento = await this.kardexService.registrarMovimiento({
          empresaId,
          productoId: item.productoId,
          tipoMovimiento: 'INGRESO',
          concepto: `COMPRA ${compra.serie}-${compra.numero}`,
          cantidad: Number(item.cantidad),
          costoUnitario: costoNetoKardex,
          compraId: compra.id,
          usuarioId,
          sedeId,
          lote: item.lote,
          fechaVencimiento: item.fechaVencimiento
            ? parseFechaSoloDia(item.fechaVencimiento)
            : undefined,
        });
        if (item.lote && item.fechaVencimiento) {
          await this.productoLoteService.sincronizarLoteDesdeIngreso({
            productoId: item.productoId,
            empresaId,
            lote: item.lote,
            fechaVencimiento: parseFechaSoloDia(item.fechaVencimiento),
            cantidad: Number(item.cantidad),
            costoUnitario: costoNetoKardex,
            movimientoKardexId: movimiento.id,
          });
        }
      } catch (error) {
        console.error(
          `Error re-aplicando kardex del producto ${item.productoId}:`,
          error,
        );
        const nombreItem = item.descripcion ?? `producto ${item.productoId}`;
        warningsAplicar.push(
          `No se pudo actualizar el stock de "${nombreItem}": ${
            error?.message ?? 'error desconocido'
          }. Revisa/ajusta el stock manualmente.`,
        );
      }
    }

    // 5) Re-crear las series/IMEI del payload.
    if (todasLasSeries.length) {
      const detallesCreados = (compra as any).detalles ?? [];
      const seriesData: Prisma.ProductoSerieCreateManyInput[] = [];
      for (let i = 0; i < data.detalles.length; i++) {
        const series = seriesPorLinea[i];
        if (!series.length) continue;
        const item = data.detalles[i];
        const detalle = detallesCreados[i];
        if (!item.productoId || !detalle) continue;
        const garantiaHasta = this.calcularGarantiaHasta(item.garantiaMeses);
        for (const numeroSerie of series) {
          seriesData.push({
            empresaId,
            productoId: Number(item.productoId),
            sedeId: sedeId ?? null,
            numeroSerie,
            estado: 'DISPONIBLE',
            garantiaMeses:
              item.garantiaMeses != null ? Number(item.garantiaMeses) : null,
            garantiaHasta,
            compraId: compra.id,
            compraDetalleId: detalle.id,
          });
        }
      }
      if (seriesData.length) {
        try {
          await this.prisma.productoSerie.createMany({ data: seriesData });
        } catch (error) {
          console.error(
            'No se pudieron registrar las series de la compra:',
            error,
          );
        }
      }
    }

    const respuesta = this.normalizeCompraForResponse(compra);
    const stockWarnings = [...warningsRevertir, ...warningsAplicar];
    return stockWarnings.length ? { ...respuesta, stockWarnings } : respuesta;
  }

  async listar(empresaId: number, query: any, sedeId?: number) {
    const {
      page = 1,
      limit = 10,
      search,
      estadoPago,
      fechaInicio,
      fechaFin,
    } = query;
    const skip = (Number(page) - 1) * Number(limit);
    const estadoPagoFiltro =
      estadoPago === 'PAGADO'
        ? 'COMPLETADO'
        : estadoPago === 'PARCIAL'
          ? 'PAGO_PARCIAL'
          : estadoPago === 'PENDIENTE'
            ? 'PENDIENTE_PAGO'
            : estadoPago;

    // Principal sede: include legacy records with sedeId=null (created before JWT sedeId fix)
    let sedeFilter: any = {};
    if (sedeId) {
      const esPrincipal = await this.prisma.sede.findFirst({
        where: { empresaId, id: sedeId, esPrincipal: true },
        select: { id: true },
      });
      if (esPrincipal) {
        sedeFilter = { AND: [{ OR: [{ sedeId }, { sedeId: null }] }] };
      } else {
        sedeFilter = { sedeId };
      }
    }

    const where: Prisma.CompraWhereInput = {
      empresaId,
      ...sedeFilter,
      // Las compras anuladas no se listan (borrado lógico).
      estado: { not: 'ANULADO' as any },
      ...(estadoPagoFiltro ? { estadoPago: estadoPagoFiltro } : {}),
      ...(fechaInicio
        ? {
            fechaEmision: {
              // El `gte` sin desplazamiento arrancaba cinco horas antes: colaba
              // la tarde del día anterior al rango.
              gte: inicioDelDiaLima(fechaInicio),
              ...(fechaFin ? { lte: finDelDiaLima(fechaFin) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { serie: { contains: search, mode: 'insensitive' } },
              { numero: { contains: search, mode: 'insensitive' } },
              {
                proveedor: {
                  nombre: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    await this.prisma.compra.updateMany({
      where: {
        empresaId,
        ...sedeFilter,
        estado: { not: 'ANULADO' as any },
        saldo: { lte: new Prisma.Decimal(this.saldoTolerance) },
        estadoPago: { in: ['PENDIENTE_PAGO', 'PAGO_PARCIAL'] as any },
      },
      data: {
        saldo: 0,
        estadoPago: 'COMPLETADO' as any,
      },
    });

    const [data, total] = await Promise.all([
      this.prisma.compra.findMany({
        where,
        skip,
        take: Number(limit),
        include: { proveedor: true },
        orderBy: { fechaEmision: 'desc' },
      }),
      this.prisma.compra.count({ where }),
    ]);

    return {
      data: data.map((compra) => this.normalizeCompraForResponse(compra)),
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }

  /**
   * Devuelve el último precio de compra (neto, sin IGV) por producto, tomado del
   * DetalleCompra más reciente por fecha de emisión. Se usa para avisar al
   * comprador cuando el costo ingresado difiere del de la última compra.
   * Respuesta: { [productoId]: { precioUnitario, fecha, numero } }.
   */
  async ultimoPrecioCompra(empresaId: number, productoIds: number[]) {
    const resultado: Record<
      number,
      { precioUnitario: number; fecha: string; numero: string }
    > = {};
    if (!productoIds || productoIds.length === 0) return resultado;

    for (const productoId of productoIds) {
      const detalle = await this.prisma.detalleCompra.findFirst({
        where: {
          productoId,
          compra: { empresaId, estado: { not: 'ANULADO' as any } },
        },
        orderBy: { compra: { fechaEmision: 'desc' } },
        select: {
          precioUnitario: true,
          compra: {
            select: {
              fechaEmision: true,
              serie: true,
              numero: true,
              moneda: true,
              tipoCambio: true,
            },
          },
        },
      });
      if (detalle) {
        // Normalizado a PEN para que la comparación sea válida aunque la
        // compra anterior haya sido en dólares.
        const factor = factorConversionPen(
          detalle.compra.moneda,
          detalle.compra.tipoCambio
            ? Number(detalle.compra.tipoCambio)
            : undefined,
        );
        resultado[productoId] = {
          precioUnitario: parseFloat(
            (Number(detalle.precioUnitario) * factor).toFixed(4),
          ),
          fecha: detalle.compra.fechaEmision.toISOString().slice(0, 10),
          numero: `${detalle.compra.serie}-${detalle.compra.numero}`,
        };
      }
    }
    return resultado;
  }

  async obtenerPorId(empresaId: number, id: number, sedeId?: number) {
    const compra = await this.prisma.compra.findFirst({
      where: { id, empresaId, ...(sedeId ? { sedeId } : {}) },
      include: {
        proveedor: true,
        detalles: {
          include: {
            producto: true,
            seriesGarantias: {
              select: { numeroSerie: true, garantiaMeses: true, estado: true },
            },
          },
        },
        pagos: true,
        usuario: true,
      },
    });

    if (!compra) throw new NotFoundException('Compra no encontrada');
    return this.normalizeCompraForResponse(compra);
  }

  async registrarPago(
    empresaId: number,
    usuarioId: number,
    compraId: number,
    data: any,
    sedeId?: number,
  ) {
    const compra = await this.prisma.compra.findFirst({
      where: { id: compraId, empresaId, ...(sedeId ? { sedeId } : {}) },
    });

    if (!compra) throw new NotFoundException('Compra no encontrada');
    // Una compra sin visto bueno todavía no existe para efectos de dinero: si
    // admitiera pagos y luego se rechazara, habría que devolver un abono de algo
    // que nunca llegó a comprarse.
    if (compra.estado === ('PENDIENTE_APROBACION' as any)) {
      throw new BadRequestException(
        'La compra está pendiente de aprobación: no admite pagos hasta que se apruebe.',
      );
    }
    if (compra.estado === ('RECHAZADA' as any)) {
      throw new BadRequestException('La compra fue rechazada.');
    }

    // `Number(undefined)` es NaN, y NaN no es `<= 0` ni `>` nada: se colaba por
    // las dos comprobaciones de abajo y llegaba hasta Prisma como un 500. El DTO
    // ya lo filtra, pero el servicio no debe fiarse de su llamador.
    const monto = Number(data.monto);
    if (!Number.isFinite(monto) || monto <= 0)
      throw new BadRequestException('El monto debe ser un número mayor a 0');
    if (monto > Number(compra.saldo) + 0.1)
      throw new BadRequestException('El monto excede el saldo pendiente');

    const nuevoSaldo = Math.max(
      0,
      this.roundMoney(Number(compra.saldo) - monto),
    );
    const nuevoEstadoPago = this.normalizeEstadoPagoBySaldo(
      Number(compra.total),
      nuevoSaldo,
    );

    // Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create Pago
      const pago = await tx.pagoCompra.create({
        data: {
          empresaId,
          usuarioId,
          compraId,
          monto,
          metodoPago: data.medioPago || 'EFECTIVO', // el frontend manda `medioPago`; la columna es `metodoPago`
          referencia: data.referencia,
          observacion: data.observacion ?? null,
          ...(data.fecha ? { fecha: parseFechaEmision(data.fecha) } : {}),
          ...(data.cuentaBancariaId
            ? { cuentaBancariaId: Number(data.cuentaBancariaId) }
            : {}),
        },
      });

      // Update Compra
      const compraUpdated = await tx.compra.update({
        where: { id: compraId },
        data: {
          saldo: nuevoSaldo,
          estadoPago: nuevoEstadoPago,
        },
      });

      const normalized = this.normalizeCompraForResponse(compraUpdated);
      return {
        pago,
        nuevoSaldo: Number(normalized.saldo),
        nuevoEstado: normalized.estadoPago,
      };
    });

    return { success: true, ...result };
  }

  async parseXmlSunat(empresaId: number, buffer: Buffer) {
    const sniff = buffer
      .toString('ascii', 0, Math.min(buffer.length, 300))
      .toLowerCase();
    const isLatin1 =
      sniff.includes('encoding="iso-8859-1"') ||
      sniff.includes("encoding='iso-8859-1'");
    const xmlText = isLatin1
      ? buffer.toString('latin1')
      : buffer.toString('utf-8');

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      removeNSPrefix: true,
      parseTagValue: true,
      parseAttributeValue: false,
      isArray: (tagName: string) =>
        [
          'InvoiceLine',
          'CreditNoteLine',
          'DebitNoteLine',
          'TaxTotal',
          'TaxSubtotal',
        ].includes(tagName),
    });

    let parsed: any;
    try {
      parsed = parser.parse(xmlText);
    } catch {
      throw new BadRequestException('El archivo no es un XML válido');
    }

    const doc = parsed.Invoice ?? parsed.CreditNote ?? parsed.DebitNote;
    if (!doc) {
      throw new BadRequestException(
        'El XML no corresponde a una Factura, Boleta o Nota de Crédito/Débito SUNAT',
      );
    }

    // Helpers para extraer valor de tags con o sin atributos
    const tv = (v: any): string => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'object' && '#text' in v) return String(v['#text']);
      return String(v);
    };
    const tn = (v: any): number => parseFloat(tv(v)) || 0;

    // Cabecera
    const docId = tv(doc.ID);
    const dashIdx = docId.lastIndexOf('-');
    const serie = dashIdx > 0 ? docId.substring(0, dashIdx) : docId;
    const numero = dashIdx > 0 ? docId.substring(dashIdx + 1) : '';

    const typeCode = tv(doc.InvoiceTypeCode ?? doc.ResponseCode ?? '01');
    const tipoDocMap: Record<string, string> = {
      '01': 'FACTURA',
      '03': 'BOLETA',
      '07': 'NOTA_CREDITO',
      '08': 'NOTA_DEBITO',
    };
    const tipoDoc = tipoDocMap[typeCode] ?? 'FACTURA';

    const fechaEmision = tv(doc.IssueDate);
    const moneda = tv(doc.DocumentCurrencyCode) || 'PEN';

    // Proveedor desde el XML
    const supplierParty = doc.AccountingSupplierParty?.Party ?? {};
    const proveedorRuc = tv(supplierParty.PartyIdentification?.ID).trim();
    const proveedorRucNorm = this.normalizarCodigoXml(proveedorRuc);
    const proveedorNombreXml = tv(
      supplierParty.PartyLegalEntity?.RegistrationName ??
        supplierParty.PartyName?.Name ??
        '',
    ).trim();

    // Buscar proveedor en DB por RUC
    let proveedorId: number | null = null;
    let proveedorNombre: string = proveedorNombreXml;
    if (proveedorRuc) {
      const found = await this.prisma.cliente.findFirst({
        where: { empresaId, nroDoc: proveedorRuc, estado: 'ACTIVO' },
        select: { id: true, nombre: true },
      });
      if (found) {
        proveedorId = found.id;
        proveedorNombre = found.nombre;
      }
    }

    // Totales
    const legalTotal = doc.LegalMonetaryTotal ?? {};
    const subtotal = tn(legalTotal.LineExtensionAmount);
    const total = tn(legalTotal.PayableAmount ?? legalTotal.TaxInclusiveAmount);
    const taxTotals: any[] = doc.TaxTotal ?? [];
    const igv = taxTotals.reduce(
      (sum: number, t: any) => sum + tn(t.TaxAmount),
      0,
    );

    // Líneas de detalle
    const lines: any[] =
      doc.InvoiceLine ?? doc.CreditNoteLine ?? doc.DebitNoteLine ?? [];

    const items = await Promise.all(
      lines.map(async (line: any) => {
        const descripcion = tv(line.Item?.Description)
          .replace(/\s+/g, ' ')
          .trim();
        const codigo = tv(
          line.Item?.SellersItemIdentification?.ID ?? '',
        ).trim();
        const cantidad = tn(line.InvoicedQuantity);
        const unidad = tv(line.InvoicedQuantity?.['@_unitCode'] ?? 'NIU');

        let precioUnitario = tn(line.Price?.PriceAmount);
        if (!precioUnitario && cantidad > 0) {
          precioUnitario = tn(line.LineExtensionAmount) / cantidad;
        }

        const freeOfCharge =
          String(line.FreeOfChargeIndicator ?? '').toLowerCase() === 'true';
        const subtotalLinea = freeOfCharge ? 0 : tn(line.LineExtensionAmount);
        const lineaTaxTotals: any[] = line.TaxTotal ?? [];
        const igvLinea = lineaTaxTotals.reduce(
          (s: number, t: any) => s + tn(t.TaxAmount),
          0,
        );
        const descripcionUpper = descripcion.toUpperCase();
        const esBonificacion =
          freeOfCharge ||
          descripcionUpper.includes('BONIFICACION') ||
          descripcionUpper.includes('BONIFICACIÓN');

        // Intentar vincular producto por código
        let productoId: number | null = null;
        let productoDescripcion: string | null = null;
        if (codigo && empresaId) {
          const prod = await this.prisma.producto.findFirst({
            where: { empresaId, codigo, estado: 'ACTIVO' },
            select: { id: true, descripcion: true },
          });
          if (prod) {
            productoId = prod.id;
            productoDescripcion = prod.descripcion;
          } else if (proveedorRucNorm) {
            try {
              const vinculo =
                await this.prisma.vinculoProductoProveedorXml.findUnique({
                  where: {
                    empresaId_proveedorRuc_codigoXml: {
                      empresaId,
                      proveedorRuc: proveedorRucNorm,
                      codigoXml: this.normalizarCodigoXml(codigo),
                    },
                  },
                  select: {
                    productoId: true,
                    producto: { select: { descripcion: true, estado: true } },
                  },
                });
              if (vinculo?.producto && vinculo.producto.estado === 'ACTIVO') {
                productoId = vinculo.productoId;
                productoDescripcion = vinculo.producto.descripcion;
              }
            } catch (error) {
              // Si aún no se aplicó la migración de vínculos XML, continuar sin bloquear importación.
              console.warn(
                'Vínculo XML proveedor-producto no disponible aún:',
                error?.message || error,
              );
            }
          }
        }

        return {
          descripcion,
          codigo,
          cantidad,
          unidad,
          precioUnitario: parseFloat(
            (esBonificacion ? 0 : precioUnitario).toFixed(4),
          ),
          subtotal: parseFloat(subtotalLinea.toFixed(2)),
          igv: parseFloat((esBonificacion ? 0 : igvLinea).toFixed(2)),
          esBonificacion,
          freeOfCharge,
          productoId,
          productoDescripcion,
        };
      }),
    );

    return {
      tipoDoc,
      serie,
      numero,
      fechaEmision,
      moneda,
      proveedorRuc,
      proveedorNombre,
      proveedorId,
      subtotal: parseFloat(subtotal.toFixed(2)),
      igv: parseFloat(igv.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      items,
    };
  }

  private normalizarCodigoXml(valor: string): string {
    return String(valor || '')
      .replace(/\s+/g, '')
      .toUpperCase();
  }

  /**
   * Anula un abono ya registrado de una compra: lo borra, devuelve el saldo y
   * repone el estado de pago. Si el abono fue en EFECTIVO, desactiva además su
   * egreso de caja — si no, el arqueo seguiría contando una salida de dinero
   * que ya no existe.
   *
   * No se "corrige" el pago editándolo: se anula y se vuelve a registrar. Un
   * abono editado deja el historial mintiendo sobre lo que pasó ese día.
   */
  /**
   * Anula un abono ya registrado: lo borra, devuelve el saldo a la compra y
   * repone su estado de pago.
   *
   * No se "corrige" un pago editándolo: se anula y se vuelve a registrar. Un
   * abono editado deja el historial mintiendo sobre lo que pasó ese día.
   *
   * Diferencia con falconext-mype, de donde viene: allí el abono en efectivo
   * genera un egreso de caja y al anularlo hay que desactivarlo. En Kaiser los
   * pagos de compra NO tocan caja —`registrarPago` no crea movimiento alguno—,
   * así que no hay nada que revertir ahí. Si algún día se enlazan, este método
   * tiene que desactivar también ese egreso o el arqueo contará una salida de
   * dinero que ya no existe.
   */
  /**
   * Lee una foto de factura/boleta con IA y devuelve los datos listos para
   * precargar el formulario de compra: proveedor (creándolo si el RUC es válido
   * y no existe), fecha, moneda, totales y líneas emparejadas con el catálogo.
   *
   * No registra nada: el usuario revisa y confirma. La IA se equivoca, y una
   * compra que entra sola al kardex con un importe mal leído es peor que
   * teclearla.
   */
  async parseImagenFactura(
    empresaId: number,
    buffer: Buffer,
    mimeType: string,
  ) {
    const base64 = buffer.toString('base64');
    const data = await this.geminiService.extraerFacturaDesdeImagen(
      base64,
      mimeType,
    );

    // Guardar la foto en S3 para que quede como evidencia y se muestre en el
    // detalle de la compra. Best-effort: si S3 falla, se sigue sin foto (la
    // lectura por IA no debe romperse por un problema de almacenamiento).
    let fotoUrl: string | null = null;
    try {
      const key = this.s3.generateCompraFotoKey(empresaId, mimeType);
      fotoUrl = await this.s3.uploadImage(buffer, key, mimeType);
    } catch (e) {
      fotoUrl = null;
    }

    // Proveedor: match por RUC contra los clientes tipo proveedor.
    const proveedorRuc = String(data?.proveedorRuc ?? '').trim();
    let proveedorId: number | null = null;
    let proveedorNombre: string = String(data?.proveedorNombre ?? '').trim();
    let proveedorCreado = false;
    if (proveedorRuc) {
      const found = await this.prisma.cliente.findFirst({
        where: { empresaId, nroDoc: proveedorRuc, estado: 'ACTIVO' },
        select: { id: true, nombre: true },
      });
      if (found) {
        proveedorId = found.id;
        proveedorNombre = found.nombre;
      } else if (/^\d{11}$/.test(proveedorRuc) && proveedorNombre) {
        // No existe y el RUC es válido (11 dígitos) → crear el proveedor
        // automáticamente con los datos de la factura y dejarlo seteado.
        const tipoDocRuc = await this.prisma.tipoDocumento.findFirst({
          where: { codigo: '6' },
          select: { id: true },
        });
        const nuevo = await this.prisma.cliente.create({
          data: {
            empresaId,
            nombre: proveedorNombre,
            nroDoc: proveedorRuc,
            persona: 'PROVEEDOR',
            estado: 'ACTIVO',
            tipoDocumentoId: tipoDocRuc?.id ?? null,
          },
          select: { id: true, nombre: true },
        });
        proveedorId = nuevo.id;
        proveedorNombre = nuevo.nombre;
        proveedorCreado = true;
      }
    }

    const itemsRaw: any[] = Array.isArray(data?.items) ? data.items : [];
    const items = await Promise.all(
      itemsRaw.map(async (it) => {
        const descripcion = String(it?.descripcion ?? '').trim();
        const codigo = String(it?.codigo ?? '').trim();
        const cantidad = Number(it?.cantidad) || 0;
        // El TOTAL de línea impreso es la fuente de verdad (la boleta lo calcula
        // con el precio de más decimales y lo redondea). Si viene, el precio
        // unitario se deriva de él (total/cantidad) para que precio×cantidad
        // cuadre exacto con la boleta. Si no viene, se usa el precio impreso.
        const totalLinea = Number(it?.totalLinea) || 0;
        const precioImpreso = Number(it?.precioUnitario) || 0;
        const precioUnitario =
          totalLinea > 0 && cantidad > 0
            ? parseFloat((totalLinea / cantidad).toFixed(4))
            : parseFloat(precioImpreso.toFixed(4));
        const subtotalLinea =
          totalLinea > 0
            ? parseFloat(totalLinea.toFixed(2))
            : parseFloat((precioUnitario * cantidad).toFixed(2));

        // Matcheo del producto: 1) por código exacto, 2) por descripción
        // exacta (case-insensitive), 3) por descripción que contiene.
        let productoId: number | null = null;
        let productoDescripcion: string | null = null;
        if (codigo && empresaId) {
          const p = await this.prisma.producto.findFirst({
            where: { empresaId, codigo, estado: 'ACTIVO' },
            select: { id: true, descripcion: true },
          });
          if (p) {
            productoId = p.id;
            productoDescripcion = p.descripcion;
          }
        }
        if (!productoId && descripcion && empresaId) {
          const exacto = await this.prisma.producto.findFirst({
            where: {
              empresaId,
              estado: 'ACTIVO',
              descripcion: { equals: descripcion, mode: 'insensitive' },
            },
            select: { id: true, descripcion: true },
          });
          const aprox =
            exacto ??
            (await this.prisma.producto.findFirst({
              where: {
                empresaId,
                estado: 'ACTIVO',
                descripcion: { contains: descripcion, mode: 'insensitive' },
              },
              select: { id: true, descripcion: true },
            }));
          if (aprox) {
            productoId = aprox.id;
            productoDescripcion = aprox.descripcion;
          }
        }

        return {
          descripcion,
          codigo,
          cantidad,
          unidad: '',
          precioUnitario,
          subtotal: subtotalLinea,
          igv: 0,
          esBonificacion: false,
          freeOfCharge: false,
          productoId,
          productoDescripcion,
        };
      }),
    );

    // ¿Los precios ya incluyen IGV? Se detecta comparando el TOTAL de la boleta
    // con la suma de las líneas: si el total ≈ suma de líneas, el precio mostrado
    // ya es el final (boleta/nota de venta); si el total ≈ suma + 18%, son netos
    // (factura con IGV desglosado). Sin total confiable, se asume precio final
    // (el caso más común al fotografiar una boleta).
    const sumLineas = items.reduce((s, it) => s + it.subtotal, 0);
    const totalExtraido = Number(data?.total) || 0;
    const incluyeIgv =
      totalExtraido > 0 && sumLineas > 0
        ? Math.abs(totalExtraido - sumLineas) <=
          Math.abs(totalExtraido - sumLineas * 1.18)
        : true;

    return {
      tipoDoc: String(data?.tipoDoc ?? '') || 'FACTURA',
      serie: String(data?.serie ?? ''),
      numero: String(data?.numero ?? ''),
      fechaEmision: String(data?.fechaEmision ?? ''),
      moneda: String(data?.moneda ?? 'PEN') === 'USD' ? 'USD' : 'PEN',
      proveedorRuc,
      proveedorNombre,
      proveedorId,
      proveedorCreado,
      subtotal: parseFloat((Number(data?.subtotal) || 0).toFixed(2)),
      igv: parseFloat((Number(data?.igv) || 0).toFixed(2)),
      total: parseFloat((Number(data?.total) || 0).toFixed(2)),
      incluyeIgv,
      fotoUrl,
      items,
    };
  }

  /**
   * Aprueba una compra PENDIENTE_APROBACION: RECIÉN AQUÍ entra el stock al
   * kardex y se sincronizan los lotes FEFO. Mientras estaba pendiente no movió
   * nada, así que rechazarla no obliga a deshacer movimientos ya contabilizados.
   *
   * Hace exactamente lo mismo que el ingreso de `crear()` —mismo cálculo de
   * costo neto en PEN, mismo concepto, mismos lotes—: si los dos caminos
   * valorizaran distinto, el costo promedio del producto dependería de si la
   * empresa tiene la aprobación encendida, que no tiene ningún sentido.
   *
   * Los fallos de stock NO tumban la aprobación: se devuelven en `stockWarnings`.
   * La compra ya existe y el proveedor ya cobró; dejarla pendiente para siempre
   * por un lote mal formado sería peor que aprobarla y avisar.
   */
  async aprobarCompra(empresaId: number, adminId: number, id: number) {
    const compra = await this.prisma.compra.findFirst({
      where: { id, empresaId, estado: 'PENDIENTE_APROBACION' as any },
      include: { detalles: { orderBy: { id: 'asc' } } },
    });
    if (!compra) {
      throw new NotFoundException(
        'La compra no existe, no pertenece a tu empresa o no está pendiente de aprobación.',
      );
    }

    const sedeId = await this.resolverSedeDestino(
      empresaId,
      compra.sedeId ?? undefined,
    );
    const stockWarnings: string[] = [];
    const factorPen = factorConversionPen(
      compra.moneda as any,
      compra.tipoCambio != null ? Number(compra.tipoCambio) : undefined,
    );

    // Un gasto no tiene mercadería que ingresar.
    for (const detalle of compra.esGasto ? [] : compra.detalles) {
      if (!detalle.productoId) continue;
      try {
        // `DetalleCompra.precioUnitario` ya se guarda NETO (sin IGV), así que
        // aquí solo falta llevarlo a soles.
        const costoNetoKardex = parseFloat(
          (Number(detalle.precioUnitario) * factorPen).toFixed(4),
        );
        const movimiento = await this.kardexService.registrarMovimiento({
          empresaId,
          productoId: detalle.productoId,
          tipoMovimiento: 'INGRESO',
          concepto: `COMPRA ${compra.serie}-${compra.numero}`,
          cantidad: Number(detalle.cantidad),
          costoUnitario: costoNetoKardex,
          compraId: compra.id,
          usuarioId: adminId,
          // En Kaiser el destino va en la cabecera: `DetalleCompra` no tiene
          // sede propia, así que todas las líneas entran a la misma.
          sedeId,
          lote: detalle.lote ?? undefined,
          fechaVencimiento: detalle.fechaVencimiento ?? undefined,
        });

        if (detalle.lote && detalle.fechaVencimiento) {
          await this.productoLoteService.sincronizarLoteDesdeIngreso({
            productoId: detalle.productoId,
            empresaId,
            lote: detalle.lote,
            fechaVencimiento: detalle.fechaVencimiento,
            cantidad: Number(detalle.cantidad),
            costoUnitario: costoNetoKardex,
            movimientoKardexId: movimiento.id,
          });
        }
      } catch (error: any) {
        stockWarnings.push(
          `No se pudo ingresar el stock de "${detalle.descripcion ?? detalle.productoId}": ${error?.message ?? error}`,
        );
      }
    }

    const actualizada = await this.prisma.compra.update({
      where: { id },
      data: {
        estado: 'REGISTRADO' as any,
        aprobadoPorUsuarioId: adminId,
        motivoRechazo: null,
      },
      include: { detalles: { orderBy: { id: 'asc' } }, proveedor: true },
    });

    return {
      success: true,
      message: 'Compra aprobada: el stock ya ingresó al inventario.',
      data: actualizada,
      ...(stockWarnings.length ? { stockWarnings } : {}),
    };
  }

  /**
   * Rechaza una compra PENDIENTE_APROBACION. Es terminal y nunca llegó a tener
   * efectos: no hay stock que sacar ni pagos que devolver. Se guarda el motivo
   * para que quien la registró sepa qué corregir antes de volver a intentarlo.
   */
  async rechazarCompra(
    empresaId: number,
    adminId: number,
    id: number,
    motivo?: string,
  ) {
    const compra = await this.prisma.compra.findFirst({
      where: { id, empresaId, estado: 'PENDIENTE_APROBACION' as any },
      select: { id: true },
    });
    if (!compra) {
      throw new NotFoundException(
        'La compra no existe, no pertenece a tu empresa o no está pendiente de aprobación.',
      );
    }
    const actualizada = await this.prisma.compra.update({
      where: { id },
      data: {
        estado: 'RECHAZADA' as any,
        aprobadoPorUsuarioId: adminId,
        motivoRechazo: motivo?.trim() || null,
        saldo: 0,
      },
    });
    return { success: true, message: 'Compra rechazada.', data: actualizada };
  }

  async anularPago(
    empresaId: number,
    // Se recibe para que el controlador no tenga que saber si se usa o no, y
    // para el día que este módulo registre quién anuló cada abono.
    _usuarioId: number,
    compraId: number,
    pagoId: number,
  ) {
    const compra = await this.prisma.compra.findFirst({
      where: { id: compraId, empresaId },
      select: {
        id: true,
        total: true,
        saldo: true,
        estado: true,
        serie: true,
        numero: true,
      },
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    if (compra.estado === ('ANULADO' as any)) {
      throw new BadRequestException('La compra está anulada.');
    }
    const pago = await this.prisma.pagoCompra.findFirst({
      where: { id: pagoId, compraId, empresaId },
    });
    if (!pago) throw new NotFoundException('El abono no existe.');

    // El saldo nunca puede pasar del total: si por un descuadre previo la suma
    // diera de más, se corta ahí en vez de dejar una compra debiendo más de lo
    // que costó.
    const nuevoSaldo = Math.min(
      Number(compra.total),
      this.roundMoney(Number(compra.saldo) + Number(pago.monto)),
    );
    const nuevoEstadoPago = this.normalizeEstadoPagoBySaldo(
      Number(compra.total),
      nuevoSaldo,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.pagoCompra.delete({ where: { id: pago.id } });
      await tx.compra.update({
        where: { id: compraId },
        data: { saldo: nuevoSaldo, estadoPago: nuevoEstadoPago as any },
      });
    });

    return {
      success: true,
      nuevoSaldo,
      nuevoEstado: nuevoEstadoPago,
      message: 'Abono anulado. El saldo de la compra fue restablecido.',
    };
  }

  async getHistorialPagos(
    empresaId: number,
    compraId: number,
    sedeId?: number,
  ) {
    const compra = await this.prisma.compra.findFirst({
      where: { id: compraId, empresaId, ...(sedeId ? { sedeId } : {}) },
    });
    if (!compra) return { success: true, data: [], totalPagado: 0 }; // Filtrar pagos si no es su sede

    const pagos = await this.prisma.pagoCompra.findMany({
      where: { compraId, empresaId },
      orderBy: { fecha: 'desc' },
    });

    const totalPagado = pagos.reduce(
      (acc, curr) => acc + Number(curr.monto),
      0,
    );

    return { success: true, data: pagos, totalPagado };
  }

  // ── Documentos de la recepción ──────────────────────────────────────────
  //
  // Almacén revisa "orden de compra, packing list, factura, guía u otros
  // documentos" al recibir, y pidió poder subirlos "a fin de alimentar un
  // archivo digital". Antes esos papeles solo existían en una carpeta física.

  private static readonly TIPOS_DOCUMENTO = new Set([
    'PACKING_LIST',
    'FACTURA',
    'GUIA_REMISION',
    'ORDEN_COMPRA',
    'INCIDENCIA',
    'OTRO',
  ]);

  private async asegurarCompraDeEmpresa(compraId: number, empresaId: number) {
    const compra = await this.prisma.compra.findFirst({
      where: { id: compraId, empresaId },
      select: { id: true, serie: true, numero: true },
    });
    if (!compra) throw new NotFoundException('Compra no encontrada');
    return compra;
  }

  async listarDocumentos(empresaId: number, compraId: number) {
    await this.asegurarCompraDeEmpresa(compraId, empresaId);
    return this.prisma.compraDocumento.findMany({
      where: { compraId },
      orderBy: { creadoEn: 'desc' },
      include: { usuario: { select: { id: true, nombre: true } } },
    });
  }

  async subirDocumento(
    empresaId: number,
    compraId: number,
    file: {
      buffer: Buffer;
      mimetype?: string;
      originalname?: string;
      size?: number;
    },
    body: { tipo?: string; nombre?: string; observacion?: string },
    usuarioId?: number,
  ) {
    await this.asegurarCompraDeEmpresa(compraId, empresaId);
    if (!file?.buffer)
      throw new BadRequestException('Archivo no proporcionado');
    if (!this.s3.isEnabled()) {
      throw new BadRequestException(
        'S3 no configurado: no es posible almacenar documentos',
      );
    }

    const tipoPedido = String(body?.tipo ?? '')
      .trim()
      .toUpperCase();
    const tipo = ComprasService.TIPOS_DOCUMENTO.has(tipoPedido)
      ? tipoPedido
      : 'OTRO';

    const contentType = file.mimetype || 'application/pdf';
    const nombreArchivo = String(file.originalname || 'documento.pdf');
    const nombre =
      String(body?.nombre ?? '').trim() ||
      nombreArchivo.replace(/\.[^.]+$/, '') ||
      'Documento';

    const key = this.s3.generateCompraDocumentoKey(
      empresaId,
      compraId,
      nombreArchivo,
      contentType,
    );
    const url = await this.s3.uploadPDF(file.buffer, key, contentType);

    return this.prisma.compraDocumento.create({
      data: {
        compraId,
        tipo,
        nombre: nombre.slice(0, 200),
        url,
        key,
        mimeType: contentType,
        tamano: Number(file.size ?? file.buffer.length) || null,
        observacion: String(body?.observacion ?? '').trim() || null,
        usuarioId: usuarioId ?? null,
      },
    });
  }

  async eliminarDocumento(
    empresaId: number,
    compraId: number,
    documentoId: number,
  ) {
    await this.asegurarCompraDeEmpresa(compraId, empresaId);
    const doc = await this.prisma.compraDocumento.findFirst({
      where: { id: documentoId, compraId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    // Primero la fila: si el borrado en S3 falla, el documento ya no aparece
    // en el expediente y el archivo huérfano no molesta a nadie.
    await this.prisma.compraDocumento.delete({ where: { id: documentoId } });
    if (doc.key) {
      await this.s3
        .deleteFile(doc.key)
        .catch((e) =>
          console.error(`No se pudo borrar ${doc.key} de S3 —`, e?.message),
        );
    }
    return { message: 'Documento eliminado' };
  }
}

/**
 * Factor para llevar un importe de la moneda de la compra a PEN.
 * PEN (o sin moneda) → 1. Otra moneda → tipoCambio (si no viene o es inválido, 1).
 */
function factorConversionPen(
  moneda?: string | null,
  tipoCambio?: number | null,
) {
  if (!moneda || moneda.toUpperCase() === 'PEN') return 1;
  const tc = Number(tipoCambio);
  return Number.isFinite(tc) && tc > 0 ? tc : 1;
}
