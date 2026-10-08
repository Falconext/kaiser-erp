import { num, round3 } from '../common/utils/stock';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecetaDto } from './dto/create-receta.dto';
import { UpdateRecetaDto } from './dto/update-receta.dto';
import { CreateOrdenProduccionDto } from './dto/create-orden-produccion.dto';
import { RegistrarEjecucionOrdenDto } from './dto/registrar-ejecucion-orden.dto';
import { UpdateEstadoOrdenDto } from './dto/update-estado-orden.dto';
import { UpdateMetodoSalidaDto } from './dto/update-metodo-salida.dto';
import { Prisma } from '@prisma/client';
import { ProductoService } from '../producto/producto.service';
import { Decimal } from '@prisma/client/runtime/library';
import * as XLSX from 'xlsx';
// xlsx-js-style y no xlsx para el export de la liquidación: la edición
// community de SheetJS descarta `cell.s` al escribir y la hoja saldría sin
// formato. El `xlsx` de arriba se queda para leer la plantilla de carga.
import * as XLSXStyle from 'xlsx-js-style';
import { inicioDelDiaLima, finDelDiaLima } from '../common/utils/fecha';

@Injectable()
export class ProduccionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productoService: ProductoService,
  ) {}

  private validarEmpresaId(empresaId?: number) {
    if (!empresaId) {
      throw new BadRequestException(
        'No se encontró empresa activa en el token.',
      );
    }
  }

  private async validarProductoEmpresa(
    empresaId: number,
    productoId: number,
    etiqueta = 'producto',
  ) {
    const producto = await this.prisma.producto.findFirst({
      where: { id: productoId, empresaId },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        costoPromedio: true,
        factorConversion: true,
      },
    });
    if (!producto) {
      throw new BadRequestException(
        `El ${etiqueta} ${productoId} no pertenece a la empresa.`,
      );
    }
    return producto;
  }

  private async obtenerRecetaEmpresa(empresaId: number, recetaId: number) {
    const receta = await this.prisma.recetaProduccion.findFirst({
      where: { id: recetaId, empresaId },
      include: {
        componentes: {
          orderBy: { orden: 'asc' },
        },
      },
    });
    if (!receta) {
      throw new NotFoundException('Receta no encontrada.');
    }
    return receta;
  }

  private esRubroFabricacion(nombreRubro?: string | null) {
    if (!nombreRubro) return false;
    const nombre = nombreRubro.toLowerCase();
    return (
      nombre.includes('fabricación') ||
      nombre.includes('fabricacion') ||
      nombre.includes('manufactura') ||
      nombre.includes('industria') ||
      nombre.includes('producción') ||
      nombre.includes('produccion')
    );
  }

  private async asegurarRubroFabricacion(empresaId: number) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        rubro: {
          select: { nombre: true },
        },
      },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    if (!this.esRubroFabricacion(empresa.rubro?.nombre)) {
      throw new ForbiddenException(
        'El módulo de producción está habilitado solo para rubros de fabricación/manufactura.',
      );
    }
  }

  private async resolverSedeIdProduccion(empresaId: number, sedeId?: number) {
    if (sedeId) {
      const sede = await this.prisma.sede.findFirst({
        where: { id: sedeId, empresaId, activo: true },
        select: { id: true },
      });
      if (sede) return sede.id;
    }

    const principal = await this.prisma.sede.findFirst({
      where: { empresaId, esPrincipal: true, activo: true },
      select: { id: true },
    });

    if (!principal) {
      throw new BadRequestException(
        'No se encontró sede activa para registrar movimientos de producción.',
      );
    }

    return principal.id;
  }

  private convertirAUnidadesStock(
    cantidad: number,
    factorConversion: number,
    contexto: string,
  ) {
    if (!Number.isFinite(cantidad) || cantidad < 0) {
      throw new BadRequestException(`Cantidad inválida para ${contexto}.`);
    }
    if (!Number.isFinite(factorConversion) || factorConversion <= 0) {
      throw new BadRequestException(
        `Factor de conversión inválido en ${contexto}. Configura factorConversion del producto.`,
      );
    }

    // El stock del kardex se guarda con 3 decimales (kilos de alambre, metros
    // de malla, etc.), así que se permite hasta milésimas; sólo se rechaza si
    // la conversión pierde precisión más allá de eso.
    const valorEscalado = cantidad * factorConversion;
    const unidades = Math.round(valorEscalado * 1000) / 1000;
    const diferencia = Math.abs(valorEscalado - unidades);
    if (diferencia > 0.0005) {
      throw new BadRequestException(
        `La cantidad ${cantidad} no se puede convertir de forma exacta a unidades de stock (máx. 3 decimales) para ${contexto}. Ajusta factorConversion.`,
      );
    }

    return unidades;
  }

  private normalizarMetodoSalidaLotes(
    value?: string | null,
  ): 'FEFO' | 'FIFO' | 'LIFO' {
    const raw = String(value ?? '')
      .trim()
      .toUpperCase();
    if (raw === 'FEFO' || raw === 'FIFO' || raw === 'LIFO') return raw;
    return 'LIFO';
  }

  private async obtenerMetodoSalidaLotes(
    empresaId: number,
    tx?: Prisma.TransactionClient,
  ): Promise<'FEFO' | 'FIFO' | 'LIFO'> {
    const db = tx ?? this.prisma;
    const empresa = await db.empresa.findUnique({
      where: { id: empresaId },
      select: { metodoSalidaLotes: true },
    });
    if (empresa?.metodoSalidaLotes) {
      return this.normalizarMetodoSalidaLotes(empresa.metodoSalidaLotes);
    }
    return this.normalizarMetodoSalidaLotes(
      process.env.PRODUCCION_LOTES_SALIDA ?? 'LIFO',
    );
  }

  private async distribuirSalidaEnLotesEnTx(
    tx: Prisma.TransactionClient,
    productoId: number,
    cantidad: number,
    metodoSalida: 'FEFO' | 'FIFO' | 'LIFO',
  ) {
    if (cantidad <= 0) return [];

    let orderBy: Prisma.ProductoLoteOrderByWithRelationInput[] = [];
    if (metodoSalida === 'FEFO') {
      orderBy = [{ fechaVencimiento: 'asc' }, { fechaIngreso: 'asc' }];
    } else if (metodoSalida === 'FIFO') {
      orderBy = [{ fechaIngreso: 'asc' }];
    } else {
      orderBy = [{ fechaIngreso: 'desc' }];
    }

    const lotesDisponibles = await tx.productoLote.findMany({
      where: {
        productoId,
        activo: true,
        stockActual: { gt: 0 },
      },
      orderBy,
      select: {
        id: true,
        lote: true,
        stockActual: true,
      },
    });

    if (!lotesDisponibles.length) {
      return [];
    }

    const stockTotalLotes = lotesDisponibles.reduce(
      (acc, item) => acc + Number(item.stockActual),
      0,
    );
    if (stockTotalLotes < cantidad) {
      const producto = await tx.producto.findUnique({
        where: { id: productoId },
        select: { codigo: true, descripcion: true },
      });
      const etiquetaProducto = producto
        ? `${producto.codigo} - ${producto.descripcion}`
        : `ID ${productoId}`;
      throw new BadRequestException(
        `Stock insuficiente en lotes para ${etiquetaProducto}. Solicitado: ${cantidad}, Disponible en lotes: ${stockTotalLotes}.`,
      );
    }

    let restante = cantidad;
    const distribucion: Array<{
      loteId: number;
      lote: string;
      cantidad: number;
      stockAnterior: number;
      stockActual: number;
    }> = [];

    for (const lote of lotesDisponibles) {
      if (restante <= 0) break;
      const stockActual = Number(lote.stockActual);
      const cantidadUsada = Math.min(stockActual, restante);
      distribucion.push({
        loteId: lote.id,
        lote: lote.lote,
        cantidad: cantidadUsada,
        stockAnterior: stockActual,
        stockActual: stockActual - cantidadUsada,
      });
      restante -= cantidadUsada;
    }

    return distribucion;
  }

  /// La sede donde va a parar la merma, o null si la empresa no tiene ninguna.
  ///
  /// Devuelve null en vez de fallar a propósito: una empresa que todavía no creó
  /// su almacén de mermas tiene que poder seguir cerrando órdenes. Facturar y
  /// producir no pueden depender de una configuración opcional —mismo criterio
  /// que los asientos contables y el envío de comprobantes por correo.
  private async resolverAlmacenMermaEnTx(
    tx: Prisma.TransactionClient,
    empresaId: number,
  ) {
    const sede = await tx.sede.findFirst({
      where: { empresaId, tipo: 'ALMACEN_MERMA', activo: true },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    return sede?.id ?? null;
  }

  /// El producto con el que entra el retazo de un insumo al almacén de mermas.
  /// Se crea la primera vez que ese insumo genera merma y se reutiliza después.
  ///
  /// Lleva código propio (`<código>-RET`) y NO el del insumo. Con el del insumo,
  /// el stock de alambre #12 pasaría a incluir retazos y una venta podría
  /// despacharlos como si fueran rollos enteros: el retazo es otra cosa, con
  /// otro uso y otro precio.
  private async resolverProductoRetazoEnTx(
    tx: Prisma.TransactionClient,
    empresaId: number,
    insumo: {
      id: number;
      codigo: string;
      descripcion: string;
      unidadMedidaId: number;
      costoPromedio: unknown;
      factorConversion: number;
      tipoAfectacionIGV: string;
      moneda: string;
    },
    porcentajeRecuperacion: number,
    clase: 'RET' | 'DESC',
  ) {
    const codigo = `${insumo.codigo}-${clase}`;
    const existente = await tx.producto.findFirst({
      where: { empresaId, esRetazo: true, productoOrigenId: insumo.id, codigo },
      select: { id: true },
    });
    if (existente) return existente.id;

    // El descarte vale cero por definición: su costo ya se quedó capitalizado
    // en el producto terminado. Y va en PRODUCTO APARTE del retazo, no en el
    // mismo: mezclarlos daría un costo promedio ponderado entre algo que vale y
    // algo que no, abaratando el retazo y mintiendo en la siguiente orden que
    // lo use. Además planta pidió «ver si hay reutilizables o no», y dos líneas
    // en el almacén es lo que responde esa pregunta.
    const costoInsumo =
      clase === 'DESC' ? 0 : Number(insumo.costoPromedio ?? 0);
    const creado = await tx.producto.create({
      data: {
        empresaId,
        codigo,
        descripcion: (clase === 'DESC'
          ? `DESCARTE DE ${insumo.descripcion}`
          : `RETAZO DE ${insumo.descripcion}`
        ).slice(0, 250),
        unidadMedidaId: insumo.unidadMedidaId,
        tipoAfectacionIGV: insumo.tipoAfectacionIGV,
        moneda: insumo.moneda,
        factorConversion: insumo.factorConversion,
        // Precio en 0: un retazo no se vende por catálogo. Si algún día se
        // vende, alguien le pone precio a mano y se ve que lo hizo.
        precioUnitario: 0,
        valorUnitario: 0,
        stock: 0,
        // Lo único que hereda del insumo es la parte del costo que Kaiser diga
        // que el retazo conserva. Con el porcentaje en 0 —el defecto— nace sin
        // costo, que es lo mismo que pasa hoy.
        costoPromedio: costoInsumo * porcentajeRecuperacion,
        esRetazo: true,
        productoOrigenId: insumo.id,
        publicarEnTienda: false,
      },
      select: { id: true },
    });
    return creado.id;
  }

  private async registrarMovimientoKardexEnTx(
    tx: Prisma.TransactionClient,
    data: {
      productoId: number;
      empresaId: number;
      sedeId: number;
      usuarioId: number;
      tipoMovimiento: 'INGRESO' | 'SALIDA';
      concepto: string;
      cantidad: number;
      costoUnitario?: number;
      observacion?: string;
      fecha?: Date;
    },
  ) {
    if (data.cantidad <= 0) return null;

    // Bloquear la fila de stock antes de leerla, hasta el final de la transacción.
    //
    // Sin esto, leer el stock y escribir el nuevo son dos pasos y se pierde una
    // actualización. Comprobado: dos órdenes consumiendo 6 de un insumo con 10
    // unidades, ejecutadas a la vez, dejaban DOS movimientos de kardex idénticos
    // «10 → 4». Se consumían 12 según el kardex y solo se descontaban 6: seis
    // unidades de inventario fantasma, dos productos terminados fabricados con
    // insumos que nunca se descontaron, y la cadena de saldos del kardex partida.
    // Peor que quedarse en negativo, porque el sistema dice que hay mercadería que
    // no existe.
    await tx.$queryRaw`
      SELECT id FROM "ProductoStock"
      WHERE "productoId" = ${data.productoId} AND "sedeId" = ${data.sedeId}
      FOR UPDATE
    `;

    let productoStock = await tx.productoStock.findUnique({
      where: {
        productoId_sedeId: {
          productoId: data.productoId,
          sedeId: data.sedeId,
        },
      },
      include: {
        producto: {
          select: {
            costoPromedio: true,
          },
        },
      },
    });

    if (!productoStock) {
      const productoBase = await tx.producto.findUnique({
        where: { id: data.productoId },
        select: { stock: true, costoPromedio: true },
      });

      await tx.productoStock.create({
        data: {
          productoId: data.productoId,
          sedeId: data.sedeId,
          stock: productoBase?.stock ?? 0,
          stockMinimo: 0,
        },
      });

      productoStock = await tx.productoStock.findUnique({
        where: {
          productoId_sedeId: {
            productoId: data.productoId,
            sedeId: data.sedeId,
          },
        },
        include: {
          producto: {
            select: {
              costoPromedio: true,
            },
          },
        },
      });
    }

    if (!productoStock) {
      throw new NotFoundException(
        'No se pudo inicializar el stock del producto para producción.',
      );
    }

    const stockAnterior = num(productoStock.stock);
    let stockActual = stockAnterior;
    if (data.tipoMovimiento === 'INGRESO') {
      stockActual += num(data.cantidad);
    } else {
      stockActual -= num(data.cantidad);
    }
    stockActual = round3(stockActual);

    if (stockActual < 0) {
      const producto = await tx.producto.findUnique({
        where: { id: data.productoId },
        select: { codigo: true, descripcion: true },
      });
      const etiquetaProducto = producto
        ? `${producto.codigo} - ${producto.descripcion}`
        : `ID ${data.productoId}`;
      throw new BadRequestException(
        `Stock insuficiente para ${data.concepto}. Producto: ${etiquetaProducto}.`,
      );
    }

    const costoUnitario =
      data.costoUnitario ?? Number(productoStock.producto.costoPromedio) ?? 0;
    const valorTotal = costoUnitario * data.cantidad;

    const movimiento = await tx.movimientoKardex.create({
      data: {
        productoId: data.productoId,
        empresaId: data.empresaId,
        tipoMovimiento: data.tipoMovimiento,
        concepto: data.concepto,
        cantidad: data.cantidad,
        stockAnterior,
        stockActual,
        costoUnitario,
        valorTotal,
        fecha: data.fecha ?? new Date(),
        usuarioId: data.usuarioId,
        observacion: data.observacion,
        sedeId: data.sedeId,
      },
    });

    await tx.productoStock.update({
      where: {
        productoId_sedeId: {
          productoId: data.productoId,
          sedeId: data.sedeId,
        },
      },
      data: {
        stock: stockActual,
      },
    });

    const totalStock = await tx.productoStock.aggregate({
      where: { productoId: data.productoId },
      _sum: { stock: true },
    });

    await tx.producto.update({
      where: { id: data.productoId },
      data: {
        stock: totalStock._sum.stock ?? 0,
      },
    });

    if (data.tipoMovimiento === 'INGRESO' && data.costoUnitario !== undefined) {
      const producto = await tx.producto.findUnique({
        where: { id: data.productoId },
        select: { costoPromedio: true },
      });

      const stockActualGlobal = num(totalStock._sum.stock);
      const stockAnteriorGlobal = stockActualGlobal - num(data.cantidad);
      const costoAnterior = Number(producto?.costoPromedio ?? 0);
      const valorAnterior = stockAnteriorGlobal * costoAnterior;
      const valorNuevo = num(data.cantidad) * data.costoUnitario;

      if (stockActualGlobal > 0) {
        const nuevoCostoPromedio =
          (valorAnterior + valorNuevo) / stockActualGlobal;
        await tx.producto.update({
          where: { id: data.productoId },
          data: { costoPromedio: nuevoCostoPromedio },
        });
      }
    }

    return movimiento;
  }

  async crearReceta(empresaId: number, dto: CreateRecetaDto) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);

    if (!dto.componentes?.length) {
      throw new BadRequestException('La receta debe tener al menos un insumo.');
    }

    if (dto.rendimientoObjetivo <= 0) {
      throw new BadRequestException(
        'El rendimiento objetivo debe ser mayor a 0.',
      );
    }

    await this.validarProductoEmpresa(
      empresaId,
      dto.productoFinalId,
      'producto final',
    );

    const componentes = await Promise.all(
      dto.componentes.map(async (item, index) => {
        if (item.cantidadBase <= 0) {
          throw new BadRequestException(
            `La cantidad base del componente en posición ${index + 1} debe ser mayor a 0.`,
          );
        }
        if (item.productoInsumoId === dto.productoFinalId) {
          throw new BadRequestException(
            'El producto final no puede ser también insumo de la misma receta.',
          );
        }

        await this.validarProductoEmpresa(
          empresaId,
          item.productoInsumoId,
          'insumo',
        );

        return {
          productoInsumoId: item.productoInsumoId,
          cantidadBase: item.cantidadBase,
          unidadBase: item.unidadBase,
          tipoCantidad: item.tipoCantidad ?? 'POR_UNIDAD',
          mermaEsperadaPorcentaje: item.mermaEsperadaPorcentaje ?? 0,
          esOpcional: item.esOpcional ?? false,
          orden: item.orden ?? index + 1,
        };
      }),
    );

    try {
      return await this.prisma.recetaProduccion.create({
        data: {
          empresaId,
          productoFinalId: dto.productoFinalId,
          codigo: dto.codigo.trim().toUpperCase(),
          nombre: dto.nombre.trim(),
          version: dto.version ?? 1,
          rendimientoObjetivo: dto.rendimientoObjetivo,
          unidadRendimiento: dto.unidadRendimiento.trim(),
          mermaObjetivoPorcentaje: dto.mermaObjetivoPorcentaje ?? 0,
          activo: dto.activo ?? true,
          observaciones: dto.observaciones?.trim(),
          componentes: {
            create: componentes,
          },
        },
        include: {
          productoFinal: {
            select: { id: true, codigo: true, descripcion: true },
          },
          componentes: {
            include: {
              productoInsumo: {
                select: { id: true, codigo: true, descripcion: true },
              },
            },
            orderBy: { orden: 'asc' },
          },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe una receta con ese código y versión.',
        );
      }
      throw error;
    }
  }

  async obtenerConfiguracionProduccion(empresaId: number) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { metodoSalidaLotes: true },
    });
    return {
      metodoSalidaLotes: this.normalizarMetodoSalidaLotes(
        empresa?.metodoSalidaLotes ?? process.env.PRODUCCION_LOTES_SALIDA,
      ),
    };
  }

  async actualizarConfiguracionProduccion(
    empresaId: number,
    dto: UpdateMetodoSalidaDto,
    usuarioId?: number,
  ) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);
    const configActual = await this.obtenerConfiguracionProduccion(empresaId);
    const metodoSalidaLotes = this.normalizarMetodoSalidaLotes(
      dto.metodoSalidaLotes,
    );
    if (configActual.metodoSalidaLotes === metodoSalidaLotes) {
      return { metodoSalidaLotes };
    }

    await this.prisma.empresa.update({
      where: { id: empresaId },
      data: { metodoSalidaLotes },
      select: { id: true },
    });

    const autor = usuarioId
      ? await this.prisma.usuario.findUnique({
          where: { id: usuarioId },
          select: { nombre: true, email: true },
        })
      : null;

    await this.prisma.empresaLog.create({
      data: {
        empresaId,
        accion: 'PRODUCCION_METODO_SALIDA_ACTUALIZADO',
        detalle: `Método de salida cambiado de ${configActual.metodoSalidaLotes} a ${metodoSalidaLotes}`,
        autorNombre: autor?.nombre ?? 'Sistema',
        autorEmail: autor?.email ?? 'sistema@vendify.pe',
      },
    });

    return { metodoSalidaLotes };
  }

  async listarHistorialConfiguracionProduccion(empresaId: number, limit = 8) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);
    const safeLimit = Math.max(1, Math.min(Number(limit) || 8, 30));
    return this.prisma.empresaLog.findMany({
      where: {
        empresaId,
        accion: 'PRODUCCION_METODO_SALIDA_ACTUALIZADO',
      },
      orderBy: { creadoEn: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        accion: true,
        detalle: true,
        autorNombre: true,
        autorEmail: true,
        creadoEn: true,
      },
    });
  }

  async listarRecetas(empresaId: number, activo?: string) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);
    const filtroActivo =
      activo === undefined
        ? undefined
        : String(activo).toLowerCase() === 'true';

    return this.prisma.recetaProduccion.findMany({
      where: {
        empresaId,
        ...(filtroActivo === undefined ? {} : { activo: filtroActivo }),
      },
      include: {
        productoFinal: {
          select: { id: true, codigo: true, descripcion: true },
        },
        _count: { select: { componentes: true, ordenes: true } },
      },
      orderBy: [{ activo: 'desc' }, { creadoEn: 'desc' }],
    });
  }

  async obtenerReceta(empresaId: number, recetaId: number) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);
    const receta = await this.prisma.recetaProduccion.findFirst({
      where: { id: recetaId, empresaId },
      include: {
        productoFinal: {
          select: { id: true, codigo: true, descripcion: true },
        },
        componentes: {
          include: {
            productoInsumo: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                stock: true,
                pesoGramos: true,
                costoPromedio: true,
              },
            },
          },
          orderBy: { orden: 'asc' },
        },
      },
    });

    if (!receta) {
      throw new NotFoundException('Receta no encontrada.');
    }

    return { ...receta, diagnostico: this.diagnosticarReceta(receta) };
  }

  /// Qué le falta a una receta para poder costear y para poder cotizar por peso.
  /// No bloquea nada: informa. Un componente sin costo hace que el producto
  /// fabricado salga barato y el margen inflado; uno sin peso impide el precio
  /// por peso × factor, que es como Kaiser cotiza los módulos.
  ///
  /// El peso se devuelve en DOS cifras y no en una: lo POR_UNIDAD escala con la
  /// cantidad y lo POR_LOTE no, así que sumarlos daría un peso por módulo que
  /// cambia según el tamaño del lote.
  private diagnosticarReceta(receta: {
    componentes: {
      cantidadBase: unknown;
      tipoCantidad: string;
      productoInsumo: {
        id: number;
        codigo: string;
        descripcion: string;
        pesoGramos: unknown;
        costoPromedio: unknown;
      };
    }[];
  }) {
    const sinPeso: { id: number; codigo: string; descripcion: string }[] = [];
    const sinCosto: { id: number; codigo: string; descripcion: string }[] = [];
    let pesoGramosPorUnidad = 0;
    let pesoGramosPorLote = 0;
    let costoPorUnidad = 0;
    let costoPorLote = 0;

    for (const comp of receta.componentes) {
      const insumo = comp.productoInsumo;
      const ficha = {
        id: insumo.id,
        codigo: insumo.codigo,
        descripcion: insumo.descripcion,
      };
      const cantidad = Number(comp.cantidadBase ?? 0);
      const peso = Number(insumo.pesoGramos ?? 0);
      const costo = Number(insumo.costoPromedio ?? 0);
      const porLote = comp.tipoCantidad === 'POR_LOTE';

      if (!peso) sinPeso.push(ficha);
      else if (porLote) pesoGramosPorLote += cantidad * peso;
      else pesoGramosPorUnidad += cantidad * peso;

      if (!costo) sinCosto.push(ficha);
      else if (porLote) costoPorLote += cantidad * costo;
      else costoPorUnidad += cantidad * costo;
    }

    return {
      componentes: receta.componentes.length,
      sinPeso,
      sinCosto,
      // null, no 0: "no se puede calcular" y "pesa cero" no son lo mismo.
      pesoKgPorUnidad: sinPeso.length ? null : pesoGramosPorUnidad / 1000,
      pesoKgPorLote: sinPeso.length ? null : pesoGramosPorLote / 1000,
      costoPorUnidad: sinCosto.length ? null : costoPorUnidad,
      costoPorLote: sinCosto.length ? null : costoPorLote,
      // Lo que se puede sumar hoy, aunque falten piezas: sirve para ver cuánto
      // falta, no para poner precio.
      pesoKgParcialPorUnidad: pesoGramosPorUnidad / 1000,
      costoParcialPorUnidad: costoPorUnidad,
    };
  }

  async actualizarReceta(
    empresaId: number,
    recetaId: number,
    dto: UpdateRecetaDto,
  ) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);
    await this.obtenerRecetaEmpresa(empresaId, recetaId);

    if (dto.productoFinalId) {
      await this.validarProductoEmpresa(
        empresaId,
        dto.productoFinalId,
        'producto final',
      );
    }

    let componentes: any[] | null = null;
    if (dto.componentes) {
      if (!dto.componentes.length) {
        throw new BadRequestException(
          'La receta no puede quedarse sin componentes.',
        );
      }

      // Qué tipo de cantidad tiene HOY cada insumo de esta receta. Actualizar
      // borra los componentes y los recrea, así que un cliente que no conozca
      // `tipoCantidad` —la pantalla de recetas lo fue durante un tiempo, y
      // cualquier Excel con el formato viejo lo sigue siendo— devolvería todos
      // los POR_LOTE a POR_UNIDAD sin que nadie se entere, y el consumo
      // teórico de la siguiente orden saldría multiplicado por el tamaño del
      // lote.
      //
      // Así que omitirlo CONSERVA lo que había; para cambiarlo hay que
      // mandarlo. Es la diferencia entre "no me consta" y "ponlo en
      // POR_UNIDAD", y el defecto del modelo solo aplica a un insumo nuevo.
      const tipoActual = new Map(
        (
          await this.prisma.recetaComponente.findMany({
            where: { recetaId },
            select: { productoInsumoId: true, tipoCantidad: true },
          })
        ).map((c) => [c.productoInsumoId, c.tipoCantidad]),
      );

      componentes = await Promise.all(
        dto.componentes.map(async (item, index) => {
          if (item.cantidadBase <= 0) {
            throw new BadRequestException(
              `La cantidad base del componente en posición ${index + 1} debe ser mayor a 0.`,
            );
          }
          await this.validarProductoEmpresa(
            empresaId,
            item.productoInsumoId,
            'insumo',
          );

          return {
            productoInsumoId: item.productoInsumoId,
            cantidadBase: item.cantidadBase,
            unidadBase: item.unidadBase,
            tipoCantidad:
              item.tipoCantidad ??
              tipoActual.get(item.productoInsumoId) ??
              'POR_UNIDAD',
            mermaEsperadaPorcentaje: item.mermaEsperadaPorcentaje ?? 0,
            esOpcional: item.esOpcional ?? false,
            orden: item.orden ?? index + 1,
          };
        }),
      );
    }

    const data: Prisma.RecetaProduccionUpdateInput = {
      ...(dto.productoFinalId !== undefined
        ? { productoFinal: { connect: { id: dto.productoFinalId } } }
        : {}),
      ...(dto.codigo !== undefined
        ? { codigo: dto.codigo.trim().toUpperCase() }
        : {}),
      ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
      ...(dto.version !== undefined ? { version: dto.version } : {}),
      ...(dto.rendimientoObjetivo !== undefined
        ? { rendimientoObjetivo: dto.rendimientoObjetivo }
        : {}),
      ...(dto.unidadRendimiento !== undefined
        ? { unidadRendimiento: dto.unidadRendimiento.trim() }
        : {}),
      ...(dto.mermaObjetivoPorcentaje !== undefined
        ? { mermaObjetivoPorcentaje: dto.mermaObjetivoPorcentaje }
        : {}),
      ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      ...(dto.observaciones !== undefined
        ? { observaciones: dto.observaciones?.trim() || null }
        : {}),
      ...(componentes
        ? {
            componentes: {
              deleteMany: {},
              create: componentes,
            },
          }
        : {}),
    };

    try {
      return await this.prisma.recetaProduccion.update({
        where: { id: recetaId },
        data,
        include: {
          productoFinal: {
            select: { id: true, codigo: true, descripcion: true },
          },
          componentes: {
            include: {
              productoInsumo: {
                select: { id: true, codigo: true, descripcion: true },
              },
            },
            orderBy: { orden: 'asc' },
          },
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe una receta con ese código y versión.',
        );
      }
      throw error;
    }
  }

  async crearOrden(empresaId: number, dto: CreateOrdenProduccionDto) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);

    // Dónde se fabrica, fijado al crear. Si no llega, queda en null y la
    // ejecución sigue cayendo a la sede del usuario — el comportamiento que
    // tienen todas las órdenes que ya existen.
    let sedeOrdenId: number | null = null;
    if (dto.sedeId) {
      const sede = await this.prisma.sede.findFirst({
        where: { id: dto.sedeId, empresaId, activo: true },
        select: { id: true },
      });
      if (!sede) {
        throw new BadRequestException(
          'La sede de fabricación no pertenece a la empresa o está inactiva.',
        );
      }
      sedeOrdenId = sede.id;
    }

    // El pedido que la origina. De él salen producto y cantidad cuando no
    // vienen en el body: quien abre una orden desde un pedido no debería tener
    // que volver a teclear lo que el pedido ya dice.
    let comprobanteOrigen: {
      id: number;
      serie: string;
      correlativo: number;
      detalles: { productoId: number | null; cantidad: unknown }[];
    } | null = null;
    if (dto.comprobanteId) {
      comprobanteOrigen = await this.prisma.comprobante.findFirst({
        where: { id: dto.comprobanteId, empresaId },
        select: {
          id: true,
          serie: true,
          correlativo: true,
          detalles: {
            select: { productoId: true, cantidad: true },
            orderBy: { id: 'asc' },
          },
        },
      });
      if (!comprobanteOrigen) {
        throw new BadRequestException(
          'El comprobante de origen no pertenece a la empresa.',
        );
      }
      const linea = comprobanteOrigen.detalles.find((d) => d.productoId);
      if (linea) {
        if (!dto.recetaId && !dto.productoFinalId) {
          dto.productoFinalId = linea.productoId ?? undefined;
        }
        if (!dto.cantidadObjetivo) {
          dto.cantidadObjetivo = Number(linea.cantidad);
        }
      }
    }

    if (!dto.recetaId && !dto.productoFinalId) {
      throw new BadRequestException(
        'Debes enviar recetaId o productoFinalId para crear la orden.',
      );
    }
    // Se comprueba DESPUÉS del prellenado desde el pedido: si no vino en el
    // body y el comprobante no la pudo dar, aquí es donde falla.
    if (!dto.cantidadObjetivo || dto.cantidadObjetivo <= 0) {
      throw new BadRequestException('La cantidad objetivo debe ser mayor a 0.');
    }

    let receta: Awaited<ReturnType<typeof this.obtenerRecetaEmpresa>> | null =
      null;
    if (dto.recetaId) {
      receta = await this.obtenerRecetaEmpresa(empresaId, dto.recetaId);
    }

    const productoFinalId = dto.productoFinalId ?? receta?.productoFinalId;
    if (!productoFinalId) {
      throw new BadRequestException(
        'No se pudo determinar el producto final para la orden.',
      );
    }

    await this.validarProductoEmpresa(
      empresaId,
      productoFinalId,
      'producto final',
    );

    if (dto.usuarioResponsableId) {
      const usuario = await this.prisma.usuario.findFirst({
        where: { id: dto.usuarioResponsableId, empresaId },
        select: { id: true },
      });
      if (!usuario) {
        throw new BadRequestException(
          'El usuario responsable no pertenece a la empresa.',
        );
      }
    }

    let componentesOrden: Array<{
      productoInsumoId: number;
      cantidadTeorica: number;
      cantidadConsumida: number;
      mermaCantidad: number;
      unidad: string;
      costoUnitario: number;
      costoTotal: number;
      observacion: string | null;
    }> = [];

    if (dto.componentes?.length) {
      componentesOrden = await Promise.all(
        dto.componentes.map(async (item) => {
          if (item.cantidadTeorica <= 0) {
            throw new BadRequestException(
              'Cada componente manual debe tener cantidad teórica mayor a 0.',
            );
          }
          const insumo = await this.validarProductoEmpresa(
            empresaId,
            item.productoInsumoId,
            'insumo',
          );
          const costoUnitario = Number(
            item.costoUnitario ?? insumo.costoPromedio ?? 0,
          );
          return {
            productoInsumoId: item.productoInsumoId,
            cantidadTeorica: item.cantidadTeorica,
            cantidadConsumida: 0,
            mermaCantidad: 0,
            unidad: item.unidad,
            costoUnitario,
            costoTotal: Number(item.cantidadTeorica) * costoUnitario,
            observacion: item.observacion?.trim() || null,
          };
        }),
      );
    } else if (receta) {
      const factor =
        Number(dto.cantidadObjetivo) / Number(receta.rendimientoObjetivo);
      componentesOrden = await Promise.all(
        receta.componentes.map(async (item) => {
          const insumo = await this.validarProductoEmpresa(
            empresaId,
            item.productoInsumoId,
            'insumo',
          );
          // POR_LOTE entra tal cual: 8.5 kg de sujetador son 8.5 para la orden
          // entera, se fabriquen 10 módulos o 210. Solo POR_UNIDAD escala.
          const cantidadTeorica =
            item.tipoCantidad === 'POR_LOTE'
              ? Number(item.cantidadBase)
              : Number(item.cantidadBase) * factor;
          const costoUnitario = Number(insumo.costoPromedio ?? 0);
          return {
            productoInsumoId: item.productoInsumoId,
            cantidadTeorica,
            cantidadConsumida: 0,
            mermaCantidad: 0,
            unidad: item.unidadBase,
            costoUnitario,
            costoTotal: cantidadTeorica * costoUnitario,
            observacion: null,
          };
        }),
      );
    } else {
      throw new BadRequestException(
        'Si no envías receta, debes enviar componentes manuales.',
      );
    }

    if (!componentesOrden.length) {
      throw new BadRequestException(
        'La orden debe tener al menos un componente.',
      );
    }

    try {
      const orden = await this.prisma.ordenProduccion.create({
        data: {
          empresaId,
          recetaId: receta?.id ?? null,
          productoFinalId,
          loteProduccion: dto.loteProduccion.trim().toUpperCase(),
          fechaProgramada: dto.fechaProgramada
            ? new Date(dto.fechaProgramada)
            : null,
          cantidadObjetivo: dto.cantidadObjetivo,
          estado: 'PLANIFICADA',
          observaciones: dto.observaciones?.trim(),
          usuarioResponsableId: dto.usuarioResponsableId,
          sedeId: sedeOrdenId,
          comprobanteId: comprobanteOrigen?.id ?? null,
          maquina: dto.maquina?.trim() || null,
          encargadoNombre: dto.encargadoNombre?.trim() || null,
          componentes: {
            create: componentesOrden,
          },
        },
        include: {
          receta: {
            select: { id: true, codigo: true, nombre: true, version: true },
          },
          productoFinal: {
            select: { id: true, codigo: true, descripcion: true, stock: true },
          },
          componentes: {
            include: {
              productoInsumo: {
                select: {
                  id: true,
                  codigo: true,
                  descripcion: true,
                  stock: true,
                },
              },
            },
            orderBy: { id: 'asc' },
          },
          sede: { select: { id: true, nombre: true } },
          comprobante: { select: { id: true, serie: true, correlativo: true } },
        },
      });

      // Queda anotado en la bitácora del pedido: quien mira el pedido ve que
      // ya se abrió la orden y con qué lote, sin tener que buscarla.
      //
      // No bloquea, con el mismo criterio que las comisiones y los asientos:
      // abrir una orden de producción no puede fallar porque no se pudo
      // escribir una línea de seguimiento.
      if (comprobanteOrigen) {
        try {
          await this.prisma.seguimientoCotizacion.create({
            data: {
              empresaId,
              comprobanteId: comprobanteOrigen.id,
              tipo: 'PRODUCCION',
              detalle:
                `Orden de producción ${orden.loteProduccion}: ` +
                `${Number(orden.cantidadObjetivo)} de ${orden.productoFinal?.descripcion ?? 'producto'}`,
            },
          });
        } catch {
          // una bitácora que no se pudo escribir no deshace la orden
        }
      }

      return orden;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(
          'Ya existe una orden con ese lote de producción.',
        );
      }
      throw error;
    }
  }

  async listarOrdenes(empresaId: number, query: any) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);
    const {
      estado,
      productoFinalId,
      fechaDesde,
      fechaHasta,
      page = 1,
      limit = 20,
    } = query || {};

    const where: Prisma.OrdenProduccionWhereInput = {
      empresaId,
      ...(estado ? { estado } : {}),
      ...(productoFinalId ? { productoFinalId: Number(productoFinalId) } : {}),
      ...(fechaDesde || fechaHasta
        ? {
            creadoEn: {
              // Mismo motivo: sin anclar, el rango arranca la tarde anterior.
              ...(fechaDesde ? { gte: inicioDelDiaLima(fechaDesde) } : {}),
              ...(fechaHasta ? { lte: finDelDiaLima(fechaHasta) } : {}),
            },
          }
        : {}),
    };

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.max(Number(limit) || 20, 1);
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.prisma.ordenProduccion.findMany({
        where,
        include: {
          // Sede y pedido en la LISTA, no solo en el detalle: son las dos
          // columnas por las que planta busca una orden ("la del pedido de
          // Granja Los Andes", "las de Chacra Cerro").
          sede: { select: { id: true, nombre: true } },
          comprobante: { select: { id: true, serie: true, correlativo: true } },
          receta: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              mermaObjetivoPorcentaje: true,
            },
          },
          productoFinal: {
            select: { id: true, codigo: true, descripcion: true },
          },
          usuarioResponsable: {
            select: { id: true, nombre: true, email: true },
          },
          componentes: {
            select: {
              mermaCantidad: true,
              costoUnitario: true,
            },
          },
          _count: { select: { componentes: true, movimientos: true } },
        },
        orderBy: [{ creadoEn: 'desc' }],
        skip,
        take: safeLimit,
      }),
      this.prisma.ordenProduccion.count({ where }),
    ]);

    const data = items.map((item) => {
      const mermaValorizada = item.componentes.reduce((acc, comp) => {
        const mermaCantidad = Number(comp.mermaCantidad || 0);
        const costoUnitario = Number(comp.costoUnitario || 0);
        return acc + mermaCantidad * costoUnitario;
      }, 0);

      return {
        ...item,
        mermaValorizada,
      };
    });

    return {
      data,
      total,
      page: safePage,
      limit: safeLimit,
    };
  }

  async obtenerOrden(empresaId: number, ordenId: number) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);

    const orden = await this.prisma.ordenProduccion.findFirst({
      where: { id: ordenId, empresaId },
      include: {
        sede: { select: { id: true, nombre: true } },
        comprobante: { select: { id: true, serie: true, correlativo: true } },
        receta: {
          select: { id: true, codigo: true, nombre: true, version: true },
        },
        productoFinal: {
          select: { id: true, codigo: true, descripcion: true, stock: true },
        },
        usuarioResponsable: {
          select: { id: true, nombre: true, email: true },
        },
        componentes: {
          include: {
            productoInsumo: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                stock: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
        movimientos: {
          include: {
            producto: {
              select: { id: true, codigo: true, descripcion: true },
            },
            usuario: { select: { id: true, nombre: true } },
          },
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException('Orden de producción no encontrada.');
    }

    return orden;
  }

  async actualizarEstadoOrden(
    empresaId: number,
    ordenId: number,
    dto: UpdateEstadoOrdenDto,
  ) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);

    const orden = await this.prisma.ordenProduccion.findFirst({
      where: { id: ordenId, empresaId },
      select: { id: true, estado: true, fechaInicio: true, fechaFin: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden de producción no encontrada.');
    }

    if (orden.estado === 'FINALIZADA') {
      throw new BadRequestException(
        'La orden ya está FINALIZADA. No puede cambiarse su estado.',
      );
    }

    const data: Prisma.OrdenProduccionUpdateInput = {
      estado: dto.estado,
      ...(dto.estado === 'EN_PROCESO' && !orden.fechaInicio
        ? { fechaInicio: new Date() }
        : {}),
      ...(dto.estado === 'ANULADA' && !orden.fechaFin
        ? { fechaFin: new Date() }
        : {}),
    };

    return this.prisma.ordenProduccion.update({
      where: { id: ordenId },
      data,
    });
  }

  async registrarEjecucionOrden(
    empresaId: number,
    ordenId: number,
    usuarioId: number,
    dto: RegistrarEjecucionOrdenDto,
    sedeId?: number,
  ) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);

    if (!dto.componentes?.length) {
      throw new BadRequestException(
        'Debes enviar al menos un componente ejecutado.',
      );
    }
    if (dto.cantidadProducida <= 0) {
      throw new BadRequestException(
        'La cantidad producida debe ser mayor a 0.',
      );
    }

    const orden = await this.prisma.ordenProduccion.findFirst({
      where: { id: ordenId, empresaId },
      include: {
        componentes: true,
      },
    });

    if (!orden) {
      throw new NotFoundException('Orden de producción no encontrada.');
    }

    // Manda la sede de la ORDEN, no la del usuario que la cierra. Antes la
    // sede se resolvía solo con el token: la misma orden consumía de un
    // almacén o de otro según quién pulsara "Finalizar", y en una empresa con
    // dos almacenes eso es stock descontado del sitio equivocado. Las órdenes
    // sin sede —todas las de antes— siguen cayendo a la del usuario.
    const sedeIdProduccion = await this.resolverSedeIdProduccion(
      empresaId,
      orden.sedeId ?? sedeId,
    );

    if (orden.estado === 'ANULADA') {
      throw new BadRequestException('No se puede ejecutar una orden ANULADA.');
    }
    if (orden.estado === 'FINALIZADA') {
      throw new BadRequestException('La orden ya fue finalizada.');
    }

    const componentesOrdenMap = new Map(
      orden.componentes.map((item) => [item.productoInsumoId, item]),
    );
    const idsProductosInvolucrados = Array.from(
      new Set([
        ...dto.componentes.map((item) => item.productoInsumoId),
        orden.productoFinalId,
      ]),
    );
    const productosInvolucrados = await this.prisma.producto.findMany({
      where: {
        empresaId,
        id: { in: idsProductosInvolucrados },
      },
      select: {
        id: true,
        codigo: true,
        descripcion: true,
        factorConversion: true,
        costoPromedio: true,
        // Los necesita `resolverProductoRetazoEnTx` para crear el retazo con la
        // misma unidad y afectación que su insumo de origen.
        unidadMedidaId: true,
        tipoAfectacionIGV: true,
        moneda: true,
      },
    });
    const productosMap = new Map(
      productosInvolucrados.map((item) => [item.id, item]),
    );

    const updatesComponentes: Array<{
      id: number;
      cantidadConsumida: number;
      mermaCantidad: number;
      mermaReutilizableCantidad: number;
      sobranteCantidad: number;
      costoUnitario: number;
      costoTotal: number;
      observacion?: string | null;
    }> = [];

    const movimientos: Prisma.MovimientoProduccionCreateManyInput[] = [];
    const salidasKardex: Array<{
      productoId: number;
      cantidadStock: number;
      costoUnitarioStock: number;
      observacion: string;
    }> = [];
    /// Lo que hay que meter al almacén de mermas al cerrar la transacción.
    const ingresosMerma: Array<{
      insumoId: number;
      unidad: string;
      reutilizable: number;
      descarte: number;
      costoUnitarioRetazo: number;
      factorInsumo: number;
    }> = [];
    const empresaMerma = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { mermaPorcentajeRecuperacion: true },
    });
    // Acotado a [0, 1]: un porcentaje mal puesto no puede hacer que el retazo
    // valga más que el insumo del que salió.
    const porcentajeRecuperacionMerma = Math.min(
      1,
      Math.max(0, Number(empresaMerma?.mermaPorcentajeRecuperacion ?? 0)),
    );
    /// Lo que no se pudo hacer pero no justifica tumbar la ejecución. Viaja en
    /// la respuesta para que la pantalla lo diga en vez de callarlo.
    const avisos: string[] = [];
    let mermaAcumulada = 0;
    let costoTotalConsumido = 0;
    let costoTotalMerma = 0;

    for (const item of dto.componentes) {
      const componenteOrden = componentesOrdenMap.get(item.productoInsumoId);
      if (!componenteOrden) {
        throw new BadRequestException(
          `El insumo ${item.productoInsumoId} no pertenece a esta orden.`,
        );
      }

      if (item.cantidadConsumida < 0) {
        throw new BadRequestException(
          `La cantidad consumida del insumo ${item.productoInsumoId} no puede ser negativa.`,
        );
      }
      if ((item.mermaCantidad ?? 0) < 0) {
        throw new BadRequestException(
          `La merma del insumo ${item.productoInsumoId} no puede ser negativa.`,
        );
      }
      if ((item.mermaReutilizableCantidad ?? 0) < 0) {
        throw new BadRequestException(
          `La merma reutilizable del insumo ${item.productoInsumoId} no puede ser negativa.`,
        );
      }
      if ((item.sobranteCantidad ?? 0) < 0) {
        throw new BadRequestException(
          `El sobrante del insumo ${item.productoInsumoId} no puede ser negativo.`,
        );
      }
      if (
        Number(item.mermaReutilizableCantidad ?? 0) >
        Number(item.mermaCantidad ?? 0)
      ) {
        throw new BadRequestException(
          `La merma reutilizable del insumo ${item.productoInsumoId} no puede superar a la merma total.`,
        );
      }

      const merma = Number(item.mermaCantidad ?? 0);
      const mermaReutilizable = Number(item.mermaReutilizableCantidad ?? 0);
      const mermaDescarte = merma - mermaReutilizable;
      const sobrante = Number(item.sobranteCantidad ?? 0);
      const costoUnitario = Number(componenteOrden.costoUnitario ?? 0);
      const costoConsumo = Number(item.cantidadConsumida) * costoUnitario;
      // La merma también sale del inventario, así que su valor tiene que ir a
      // algún sitio. Antes no iba a ninguno: salían 20 soles de insumos y el
      // terminado se valorizaba en 18. Esos 2 soles no quedaban en inventario, ni
      // en el costo del producto, ni en un gasto: desaparecían. El terminado salía
      // barato, el margen inflado y el P&L con más beneficio del real.
      // La parte recuperada se va con el retazo al almacén de mermas; solo el
      // resto se capitaliza en el producto terminado. Con el porcentaje en 0
      // —el defecto— esto es idéntico a lo de siempre: la merma entera.
      const costoMermaRecuperado =
        mermaReutilizable * costoUnitario * porcentajeRecuperacionMerma;
      const costoMermaItem = merma * costoUnitario - costoMermaRecuperado;
      const productoInsumo = productosMap.get(item.productoInsumoId);
      if (!productoInsumo) {
        throw new BadRequestException(
          `No se encontró configuración del insumo ${item.productoInsumoId}.`,
        );
      }
      const factorInsumo = Number(productoInsumo.factorConversion ?? 1);
      const cantidadSalidaDecimal = Number(item.cantidadConsumida) + merma;
      const cantidadSalidaStock = this.convertirAUnidadesStock(
        cantidadSalidaDecimal,
        factorInsumo,
        `insumo ${productoInsumo.codigo} - ${productoInsumo.descripcion}`,
      );
      const costoUnitarioStock =
        factorInsumo > 0 ? costoUnitario / factorInsumo : 0;

      updatesComponentes.push({
        id: componenteOrden.id,
        cantidadConsumida: Number(item.cantidadConsumida),
        mermaCantidad: merma,
        mermaReutilizableCantidad: mermaReutilizable,
        sobranteCantidad: sobrante,
        costoUnitario,
        // Lo que de verdad costó este insumo en esta orden: lo consumido más su
        // merma. Antes usaba `cantidadTeorica`, así que el detalle de la orden
        // mostraba el costo planificado y no el real: si se consumía más de lo
        // previsto, el componente seguía diciendo el importe del plan.
        costoTotal: (Number(item.cantidadConsumida) + merma) * costoUnitario,
        observacion: item.observacion?.trim() || null,
      });

      if (item.cantidadConsumida > 0) {
        movimientos.push({
          ordenProduccionId: orden.id,
          empresaId,
          productoId: item.productoInsumoId,
          tipoMovimiento: 'CONSUMO_INSUMO',
          cantidad: item.cantidadConsumida,
          unidad: componenteOrden.unidad,
          costoUnitario,
          costoTotal: costoConsumo,
          mermaCantidad: 0,
          fecha: dto.fechaFin ? new Date(dto.fechaFin) : new Date(),
          usuarioId,
          observacion: item.observacion?.trim(),
        });
      }

      if (merma > 0) {
        movimientos.push({
          ordenProduccionId: orden.id,
          empresaId,
          productoId: item.productoInsumoId,
          tipoMovimiento: 'MERMA',
          cantidad: merma,
          unidad: componenteOrden.unidad,
          costoUnitario,
          costoTotal: merma * costoUnitario,
          mermaCantidad: merma,
          fecha: dto.fechaFin ? new Date(dto.fechaFin) : new Date(),
          usuarioId,
          observacion: item.observacion?.trim(),
        });
      }

      // El sobrante se REGISTRA pero NO toca el kardex, y es deliberado: la
      // salida de arriba es `consumido + merma`, no lo teórico, así que lo que
      // no se usó nunca llegó a salir del almacén. Ingresarlo aquí inventaría
      // existencias que ya estaban.
      //
      // Para que el sobrante sea un movimiento de verdad primero hay que
      // modelar la ENTREGA de material a planta —que en la vida real existe:
      // «ya está la orden, por favor entregar los 180 kilos»— y que esa entrega
      // sea la que saca lo teórico. Mientras tanto queda como dato de la
      // liquidación, que es para lo que planta lo pidió.
      if (sobrante > 0) {
        movimientos.push({
          ordenProduccionId: orden.id,
          empresaId,
          productoId: item.productoInsumoId,
          tipoMovimiento: 'DEVOLUCION_SOBRANTE',
          cantidad: sobrante,
          unidad: componenteOrden.unidad,
          costoUnitario,
          costoTotal: sobrante * costoUnitario,
          mermaCantidad: 0,
          fecha: dto.fechaFin ? new Date(dto.fechaFin) : new Date(),
          usuarioId,
          observacion: 'No se llegó a consumir; sigue en el almacén de origen.',
        });
      }

      // La merma SÍ salió del almacén, así que ingresarla como retazo no duplica
      // nada: es una transformación —sale alambre, entra retazo—.
      if (mermaReutilizable > 0 || mermaDescarte > 0) {
        ingresosMerma.push({
          insumoId: item.productoInsumoId,
          unidad: componenteOrden.unidad,
          reutilizable: mermaReutilizable,
          descarte: mermaDescarte,
          costoUnitarioRetazo: costoUnitario * porcentajeRecuperacionMerma,
          factorInsumo,
        });
      }

      salidasKardex.push({
        productoId: item.productoInsumoId,
        cantidadStock: cantidadSalidaStock,
        costoUnitarioStock,
        observacion: `Consumo: ${item.cantidadConsumida} | Merma: ${merma}`,
      });

      mermaAcumulada += merma;
      costoTotalConsumido += costoConsumo;
      costoTotalMerma += costoMermaItem;
    }

    const mermaTotal = dto.mermaTotal ?? mermaAcumulada;
    // El costo de producción es todo lo que salió del almacén para fabricar:
    // consumo más merma. Repartido entre lo producido, da el costo unitario.
    const costoProduccion = costoTotalConsumido + costoTotalMerma;
    const costoUnitarioFinal =
      dto.cantidadProducida > 0 ? costoProduccion / dto.cantidadProducida : 0;
    const productoFinal = productosMap.get(orden.productoFinalId);
    if (!productoFinal) {
      throw new BadRequestException(
        'No se encontró configuración del producto final.',
      );
    }
    const factorProductoFinal = Number(productoFinal.factorConversion ?? 1);
    const cantidadIngresoStock = this.convertirAUnidadesStock(
      Number(dto.cantidadProducida),
      factorProductoFinal,
      `producto final ${productoFinal.codigo} - ${productoFinal.descripcion}`,
    );
    const costoUnitarioFinalStock =
      factorProductoFinal > 0 ? costoUnitarioFinal / factorProductoFinal : 0;

    movimientos.push({
      ordenProduccionId: orden.id,
      empresaId,
      productoId: orden.productoFinalId,
      tipoMovimiento: 'INGRESO_PRODUCTO_FINAL',
      cantidad: dto.cantidadProducida,
      unidad: 'UN',
      costoUnitario: costoUnitarioFinal,
      costoTotal: costoUnitarioFinal * dto.cantidadProducida,
      mermaCantidad: 0,
      fecha: dto.fechaFin ? new Date(dto.fechaFin) : new Date(),
      usuarioId,
      observacion: dto.observaciones?.trim(),
    });

    await this.prisma.$transaction(async (tx) => {
      const metodoSalidaLotes = await this.obtenerMetodoSalidaLotes(
        empresaId,
        tx,
      );

      for (const componente of updatesComponentes) {
        await tx.ordenProduccionComponente.update({
          where: { id: componente.id },
          data: {
            cantidadConsumida: componente.cantidadConsumida,
            mermaCantidad: componente.mermaCantidad,
            mermaReutilizableCantidad: componente.mermaReutilizableCantidad,
            sobranteCantidad: componente.sobranteCantidad,
            costoUnitario: componente.costoUnitario,
            costoTotal: componente.costoTotal,
            observacion: componente.observacion,
          },
        });
      }

      // Ordenado por productoId a propósito: dos ejecuciones simultáneas que
      // comparten insumos toman los bloqueos en el mismo orden y no se bloquean
      // mutuamente. Sin esto, una orden que pide A y luego B, y otra que pide B y
      // luego A, se quedarían esperándose.
      salidasKardex.sort((a, b) => a.productoId - b.productoId);
      for (const salida of salidasKardex) {
        const distribucionLotes = await this.distribuirSalidaEnLotesEnTx(
          tx,
          salida.productoId,
          salida.cantidadStock,
          metodoSalidaLotes,
        );

        if (!distribucionLotes.length) {
          await this.registrarMovimientoKardexEnTx(tx, {
            productoId: salida.productoId,
            empresaId,
            sedeId: sedeIdProduccion,
            usuarioId,
            tipoMovimiento: 'SALIDA',
            concepto: `PRODUCCIÓN ${orden.loteProduccion} - CONSUMO`,
            cantidad: salida.cantidadStock,
            costoUnitario: salida.costoUnitarioStock,
            observacion: salida.observacion,
          });
          continue;
        }

        for (const bloque of distribucionLotes) {
          const movimiento = await this.registrarMovimientoKardexEnTx(tx, {
            productoId: salida.productoId,
            empresaId,
            sedeId: sedeIdProduccion,
            usuarioId,
            tipoMovimiento: 'SALIDA',
            concepto: `PRODUCCIÓN ${orden.loteProduccion} - CONSUMO`,
            cantidad: bloque.cantidad,
            costoUnitario: salida.costoUnitarioStock,
            observacion: `${salida.observacion} | Lote: ${bloque.lote}`,
          });

          if (!movimiento) continue;

          await tx.productoLote.update({
            where: { id: bloque.loteId },
            data: { stockActual: { decrement: bloque.cantidad } },
          });

          await tx.movimientoKardexLote.create({
            data: {
              productoLoteId: bloque.loteId,
              movimientoId: movimiento.id,
              cantidad: bloque.cantidad,
              stockAnterior: bloque.stockAnterior,
              stockActual: bloque.stockActual,
            },
          });
        }
      }

      await this.registrarMovimientoKardexEnTx(tx, {
        productoId: orden.productoFinalId,
        empresaId,
        sedeId: sedeIdProduccion,
        usuarioId,
        tipoMovimiento: 'INGRESO',
        concepto: `PRODUCCIÓN ${orden.loteProduccion} - PRODUCTO FINAL`,
        cantidad: cantidadIngresoStock,
        costoUnitario: costoUnitarioFinalStock,
        observacion: `Producción final: ${dto.cantidadProducida}`,
      });

      // El retazo y el descarte entran al almacén de mermas. Si la empresa no
      // tiene uno, la orden se cierra igual y queda el aviso: una configuración
      // que falta no puede impedir que planta registre lo que ya fabricó.
      if (ingresosMerma.length) {
        const sedeMermaId = await this.resolverAlmacenMermaEnTx(tx, empresaId);
        if (!sedeMermaId) {
          avisos.push(
            'No hay almacén de mermas configurado: la merma quedó registrada pero el retazo no entró a ningún almacén.',
          );
        } else {
          // Mismo criterio que las salidas: ordenado por producto para que dos
          // ejecuciones simultáneas tomen los bloqueos en el mismo orden.
          ingresosMerma.sort((a, b) => a.insumoId - b.insumoId);
          for (const ingreso of ingresosMerma) {
            const insumo = productosMap.get(ingreso.insumoId);
            if (!insumo) continue;
            if (ingreso.reutilizable > 0) {
              const productoRetazoId = await this.resolverProductoRetazoEnTx(
                tx,
                empresaId,
                insumo,
                porcentajeRecuperacionMerma,
                'RET',
              );
              // Se guarda el movimiento de kardex que devuelve: de ahí sale el
              // ALMACÉN en el que acabó el retazo, que es lo que mira almacén
              // en la lista de mermas. El consumo no lo guarda porque con
              // lotes genera VARIOS movimientos para un mismo componente y un
              // solo id no los representaría.
              const kardexRetazo = await this.registrarMovimientoKardexEnTx(tx, {
                productoId: productoRetazoId,
                empresaId,
                sedeId: sedeMermaId,
                usuarioId,
                tipoMovimiento: 'INGRESO',
                concepto: `PRODUCCIÓN ${orden.loteProduccion} - MERMA REUTILIZABLE`,
                cantidad: this.convertirAUnidadesStock(
                  ingreso.reutilizable,
                  ingreso.factorInsumo,
                  `retazo de ${insumo.codigo}`,
                ),
                costoUnitario:
                  ingreso.factorInsumo > 0
                    ? ingreso.costoUnitarioRetazo / ingreso.factorInsumo
                    : 0,
                observacion: `Retazo aprovechable de ${insumo.codigo}`,
              });
              movimientos.push({
                ordenProduccionId: orden.id,
                empresaId,
                productoId: productoRetazoId,
                tipoMovimiento: 'INGRESO_MERMA_REUTILIZABLE',
                cantidad: ingreso.reutilizable,
                unidad: ingreso.unidad,
                costoUnitario: ingreso.costoUnitarioRetazo,
                costoTotal: ingreso.reutilizable * ingreso.costoUnitarioRetazo,
                mermaCantidad: ingreso.reutilizable,
                fecha: dto.fechaFin ? new Date(dto.fechaFin) : new Date(),
                usuarioId,
                observacion: `Retazo aprovechable de ${insumo.codigo}`,
                movimientoKardexId: kardexRetazo?.id ?? null,
              });
            }

            // El descarte entra a costo CERO: su valor ya se quedó capitalizado
            // en el producto terminado. Entra igual porque físicamente está ahí
            // y almacén lo pesa para venderlo como chatarra o darlo de baja.
            if (ingreso.descarte > 0) {
              const productoDescarteId = await this.resolverProductoRetazoEnTx(
                tx,
                empresaId,
                insumo,
                0,
                'DESC',
              );
              const kardexDescarte = await this.registrarMovimientoKardexEnTx(
                tx,
                {
                productoId: productoDescarteId,
                empresaId,
                sedeId: sedeMermaId,
                usuarioId,
                tipoMovimiento: 'INGRESO',
                concepto: `PRODUCCIÓN ${orden.loteProduccion} - MERMA DESCARTE`,
                cantidad: this.convertirAUnidadesStock(
                  ingreso.descarte,
                  ingreso.factorInsumo,
                  `descarte de ${insumo.codigo}`,
                ),
                costoUnitario: 0,
                observacion: `Descarte de ${insumo.codigo}`,
                },
              );
              movimientos.push({
                ordenProduccionId: orden.id,
                empresaId,
                productoId: productoDescarteId,
                tipoMovimiento: 'INGRESO_MERMA_DESCARTE',
                cantidad: ingreso.descarte,
                unidad: ingreso.unidad,
                costoUnitario: 0,
                costoTotal: 0,
                mermaCantidad: ingreso.descarte,
                fecha: dto.fechaFin ? new Date(dto.fechaFin) : new Date(),
                usuarioId,
                observacion: `Descarte de ${insumo.codigo}`,
                movimientoKardexId: kardexDescarte?.id ?? null,
              });
            }
          }
        }
      }

      // Se crean al final: los de merma se arman dentro del bloque de arriba.
      if (movimientos.length) {
        await tx.movimientoProduccion.createMany({ data: movimientos });
      }

      await tx.ordenProduccion.update({
        where: { id: orden.id },
        data: {
          fechaInicio: dto.fechaInicio
            ? new Date(dto.fechaInicio)
            : (orden.fechaInicio ?? new Date()),
          fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : new Date(),
          cantidadProducida: dto.cantidadProducida,
          mermaTotal,
          // El costeo queda guardado, con la merma separada: es la cifra que le
          // interesa a un fabricante y antes no se registraba en ninguna parte.
          costoConsumo: costoTotalConsumido,
          costoMerma: costoTotalMerma,
          costoProduccion,
          observaciones: dto.observaciones ?? orden.observaciones,
          // Máquina, encargado y medidas del rollo: planta los sabe al
          // terminar, no al planificar. Lo que no llegue conserva lo que
          // tuviera la orden; no se borra nada por omitirlo.
          maquina: dto.maquina?.trim() || orden.maquina,
          encargadoNombre: dto.encargadoNombre?.trim() || orden.encargadoNombre,
          pesoRefRollo: dto.pesoRefRollo ?? orden.pesoRefRollo,
          diametroCm: dto.diametroCm ?? orden.diametroCm,
          alturaRolloM: dto.alturaRolloM ?? orden.alturaRolloM,
          estado: 'FINALIZADA',
        },
      });
    });

    const ordenFinal = await this.obtenerOrden(empresaId, orden.id);
    return avisos.length ? { ...ordenFinal, avisos } : ordenFinal;
  }

  async resumenMaterialesOrden(empresaId: number, ordenId: number) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);
    const orden = await this.prisma.ordenProduccion.findFirst({
      where: { id: ordenId, empresaId },
      include: {
        componentes: {
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
          orderBy: { id: 'asc' },
        },
        // La receta es el PRIMER nivel de la liquidación. Álvaro lo dijo así:
        // «una cosa es la receta, que es el cálculo teórico, y otra lo que
        // realmente se usa de material». Sin ella solo se puede comparar la
        // orden con lo real, y no se ve si el estándar está bien calibrado.
        receta: {
          include: { componentes: true },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException('Orden de producción no encontrada.');
    }

    // Cuánto pedía la receta para ESTA cantidad. POR_LOTE no escala.
    const factorReceta = orden.receta
      ? Number(orden.cantidadObjetivo) /
        (Number(orden.receta.rendimientoObjetivo) || 1)
      : null;
    const recetaPorInsumo = new Map<number, number>();
    const tipoPorInsumo = new Map<number, string>();
    for (const comp of orden.receta?.componentes ?? []) {
      recetaPorInsumo.set(
        comp.productoInsumoId,
        comp.tipoCantidad === 'POR_LOTE'
          ? Number(comp.cantidadBase)
          : Number(comp.cantidadBase) * (factorReceta ?? 0),
      );
      tipoPorInsumo.set(comp.productoInsumoId, comp.tipoCantidad);
    }

    const detalle = orden.componentes.map((comp) => {
      const teorica = Number(comp.cantidadTeorica);
      const consumida = Number(comp.cantidadConsumida);
      const merma = Number(comp.mermaCantidad);
      const mermaReutilizable = Number(comp.mermaReutilizableCantidad ?? 0);
      const mermaDescarte = merma - mermaReutilizable;
      const costoUnitario = Number(comp.costoUnitario || 0);
      // `sobranteRegistrado` es lo que planta pesó y devolvió; `sobrante` es lo
      // que sobró del PLAN. No son lo mismo: el primero es un hecho, el segundo
      // una resta. Van los dos porque responden preguntas distintas.
      const sobranteRegistrado = Number(comp.sobranteCantidad ?? 0);
      const sobrante = teorica - consumida;
      const excesoConsumo = consumida > teorica ? consumida - teorica : 0;
      const mermaPct = consumida > 0 ? (merma / consumida) * 100 : 0;
      const mermaValorizada = merma * costoUnitario;
      // Los TRES niveles. `cantidadReceta` en null —no 0— cuando la orden no
      // nace de una receta o el insumo no está en ella: "no hay con qué
      // comparar" no es lo mismo que "la receta pedía cero".
      const cantidadReceta = orden.receta
        ? (recetaPorInsumo.get(comp.productoInsumoId) ?? null)
        : null;
      const pct = (parte: number, base: number) =>
        base > 0 ? (parte / base) * 100 : null;

      return {
        componenteId: comp.id,
        productoInsumoId: comp.productoInsumoId,
        codigo: comp.productoInsumo.codigo,
        descripcion: comp.productoInsumo.descripcion,
        unidad: comp.unidad,
        tipoCantidad: tipoPorInsumo.get(comp.productoInsumoId) ?? null,
        // Nivel 1: lo que dice el estándar.
        cantidadReceta,
        // Nivel 2: lo que se planificó para esta orden.
        cantidadTeorica: teorica,
        // Nivel 3: lo que de verdad pasó.
        cantidadConsumida: consumida,
        cantidadSobrante: sobrante > 0 ? sobrante : 0,
        sobranteRegistrado,
        excesoConsumo,
        mermaCantidad: merma,
        mermaReutilizable,
        mermaDescarte,
        mermaPorcentajeReal: mermaPct,
        // Las dos desviaciones que interesan, cada una con su pregunta:
        // ¿se planificó según el estándar? ¿se cumplió lo planificado?
        desvioOrdenVsReceta:
          cantidadReceta === null ? null : teorica - cantidadReceta,
        desvioOrdenVsRecetaPct:
          cantidadReceta === null ? null : pct(teorica - cantidadReceta, cantidadReceta),
        desvioRealVsOrden: consumida + merma - teorica,
        desvioRealVsOrdenPct: pct(consumida + merma - teorica, teorica),
        // `null` cuando el insumo no tiene costo: una celda en 0.00 se lee como
        // "es gratis" y es justo lo que miente del inventario valorizado.
        costoUnitario: costoUnitario || null,
        mermaValorizada: costoUnitario ? mermaValorizada : null,
        sinCosto: !costoUnitario,
      };
    });

    return {
      ordenId: orden.id,
      estado: orden.estado,
      componentes: detalle,
      totales: {
        teorico: detalle.reduce((acc, item) => acc + item.cantidadTeorica, 0),
        consumido: detalle.reduce(
          (acc, item) => acc + item.cantidadConsumida,
          0,
        ),
        merma: detalle.reduce((acc, item) => acc + item.mermaCantidad, 0),
        mermaReutilizable: detalle.reduce(
          (acc, item) => acc + item.mermaReutilizable,
          0,
        ),
        mermaDescarte: detalle.reduce(
          (acc, item) => acc + item.mermaDescarte,
          0,
        ),
        sobranteRegistrado: detalle.reduce(
          (acc, item) => acc + item.sobranteRegistrado,
          0,
        ),
        mermaValorizada: detalle.reduce(
          (acc, item) => acc + (item.mermaValorizada ?? 0),
          0,
        ),
        // Cuántos componentes no se pueden valorizar. Si hay alguno, la merma
        // valorizada de arriba está INCOMPLETA y la pantalla tiene que decirlo
        // en vez de presentarla como si fuera el total.
        sinCosto: detalle.filter((item) => item.sinCosto).length,
      },
      // El «kilo por metro cuadrado» de Álvaro: su estándar frente a lo que
      // salió de verdad. Es la cifra con la que se recalibra una receta, y la
      // razón por la que la liquidación necesita el nivel de receta.
      rendimiento: this.rendimientoDeOrden(orden, detalle, recetaPorInsumo),
    };
  }

  /// Insumo principal = el de mayor consumo valorizado; si ninguno tiene costo,
  /// el de mayor cantidad. Es el que define el estándar que planta reconoce
  /// («1.80 kg de alambre por metro cuadrado de malla»).
  private rendimientoDeOrden(
    orden: { cantidadProducida: unknown; cantidadObjetivo: unknown; recetaId: number | null },
    detalle: {
      productoInsumoId: number;
      codigo: string;
      unidad: string;
      cantidadConsumida: number;
      mermaCantidad: number;
      costoUnitario: number | null;
      tipoCantidad: string | null;
    }[],
    recetaPorInsumo: Map<number, number>,
  ) {
    const producida = Number(orden.cantidadProducida ?? 0);
    if (!detalle.length || producida <= 0) return null;

    // Los componentes POR_LOTE quedan FUERA de la elección: son gasto de tanda
    // —6 cajas de grapas cueste lo que cueste—, no el material cuyo rendimiento
    // define el estándar. Sin este filtro, un insumo de lote caro se lleva el
    // puesto: 6 cajas a S/ 50 pesan más que 22 kg de alambre a S/ 4, y el
    // «kilo por metro cuadrado» saldría de las grapas.
    const candidatos = detalle.filter((d) => d.tipoCantidad !== 'POR_LOTE');
    if (!candidatos.length) return null;

    const principal = [...candidatos].sort((a, b) => {
      const va = (a.cantidadConsumida + a.mermaCantidad) * (a.costoUnitario ?? 0);
      const vb = (b.cantidadConsumida + b.mermaCantidad) * (b.costoUnitario ?? 0);
      if (vb !== va) return vb - va;
      return (
        b.cantidadConsumida + b.mermaCantidad - (a.cantidadConsumida + a.mermaCantidad)
      );
    })[0];

    const salidaReal = principal.cantidadConsumida + principal.mermaCantidad;
    const objetivo = Number(orden.cantidadObjetivo ?? 0);
    const recetaCantidad = recetaPorInsumo.get(principal.productoInsumoId);
    const estandar =
      orden.recetaId && recetaCantidad != null && objetivo > 0
        ? recetaCantidad / objetivo
        : null;
    const real = salidaReal / producida;

    return {
      insumoPrincipal: principal.codigo,
      unidad: principal.unidad,
      estandar,
      real,
      desvioPct: estandar ? ((real - estandar) / estandar) * 100 : null,
    };
  }

  /// Los ingresos al almacén de mermas, en una sola lista. Es lo segundo que
  /// pidió planta —«en esa merma tiene que verse si hay artículos reutilizables
  /// o no»—: sin esta pantalla el retazo solo se ve orden por orden, y nadie
  /// recorre cien órdenes para saber cuánto alambre reaprovechable hay.
  ///
  /// Sale del `MovimientoProduccion`, no del kardex, porque es ahí donde está
  /// la ORDEN que lo generó y el insumo del que salió: el apunte de kardex solo
  /// sabe que entró un producto `-RET` a un almacén.
  async listarMermasProduccion(
    empresaId: number,
    filtros: {
      tipo?: string;
      insumoId?: number;
      desde?: string;
      hasta?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    this.validarEmpresaId(empresaId);

    const tipos: ('INGRESO_MERMA_REUTILIZABLE' | 'INGRESO_MERMA_DESCARTE')[] =
      filtros.tipo === 'REUTILIZABLE'
        ? ['INGRESO_MERMA_REUTILIZABLE']
        : filtros.tipo === 'DESCARTE'
          ? ['INGRESO_MERMA_DESCARTE']
          : ['INGRESO_MERMA_REUTILIZABLE', 'INGRESO_MERMA_DESCARTE'];

    const where: Prisma.MovimientoProduccionWhereInput = {
      empresaId,
      tipoMovimiento: { in: tipos },
    };

    // Filtrar «por insumo» es filtrar por el ORIGEN del retazo, no por el
    // retazo: quien busca pregunta por el alambre #12, no por `ALA12-RET`. Se
    // acepta igualmente el id del propio retazo, que es lo que devuelve esta
    // misma lista al pinchar una fila.
    if (filtros.insumoId) {
      where.OR = [
        { productoId: filtros.insumoId },
        { producto: { productoOrigenId: filtros.insumoId } },
      ];
    }
    if (filtros.desde || filtros.hasta) {
      where.fecha = {
        ...(filtros.desde ? { gte: inicioDelDiaLima(filtros.desde) } : {}),
        ...(filtros.hasta ? { lte: finDelDiaLima(filtros.hasta) } : {}),
      };
    }

    const limit = Math.min(Math.max(Number(filtros.limit ?? 100), 1), 500);
    const offset = Math.max(Number(filtros.offset ?? 0), 0);

    const [movimientos, total, agregados] = await Promise.all([
      this.prisma.movimientoProduccion.findMany({
        where,
        orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
        include: {
          ordenProduccion: {
            select: {
              id: true,
              loteProduccion: true,
              productoFinal: { select: { codigo: true, descripcion: true } },
            },
          },
          producto: {
            select: {
              id: true,
              codigo: true,
              descripcion: true,
              esRetazo: true,
              productoOrigen: {
                select: { id: true, codigo: true, descripcion: true },
              },
            },
          },
          usuario: { select: { id: true, nombre: true } },
          movimientoKardex: {
            select: { id: true, sede: { select: { id: true, nombre: true } } },
          },
        },
      }),
      this.prisma.movimientoProduccion.count({ where }),
      this.prisma.movimientoProduccion.groupBy({
        by: ['tipoMovimiento'],
        where,
        _sum: { cantidad: true, costoTotal: true },
      }),
    ]);

    const sumaDe = (tipo: string) =>
      agregados.find((a) => a.tipoMovimiento === tipo);
    const reutilizable = sumaDe('INGRESO_MERMA_REUTILIZABLE');
    const descarte = sumaDe('INGRESO_MERMA_DESCARTE');

    return {
      total,
      limit,
      offset,
      movimientos: movimientos.map((mov) => ({
        id: mov.id,
        fecha: mov.fecha,
        tipo:
          mov.tipoMovimiento === 'INGRESO_MERMA_REUTILIZABLE'
            ? 'REUTILIZABLE'
            : 'DESCARTE',
        orden: {
          id: mov.ordenProduccion.id,
          lote: mov.ordenProduccion.loteProduccion,
          productoFinal: mov.ordenProduccion.productoFinal?.descripcion ?? null,
        },
        producto: {
          id: mov.producto.id,
          codigo: mov.producto.codigo,
          descripcion: mov.producto.descripcion,
        },
        // De qué insumo salió. En null solo si alguien creó el producto de
        // merma a mano sin enlazarlo a su origen.
        insumoOrigen: mov.producto.productoOrigen
          ? {
              id: mov.producto.productoOrigen.id,
              codigo: mov.producto.productoOrigen.codigo,
              descripcion: mov.producto.productoOrigen.descripcion,
            }
          : null,
        cantidad: num(mov.cantidad),
        unidad: mov.unidad,
        // El descarte entra a costo CERO y eso es una DECISIÓN, no un dato que
        // falte: su valor ya se quedó capitalizado en el producto terminado.
        // Por eso aquí va 0 y no `null`, al contrario que en la liquidación.
        costoUnitario: num(mov.costoUnitario),
        costoTotal: num(mov.costoTotal),
        sede: mov.movimientoKardex?.sede
          ? {
              id: mov.movimientoKardex.sede.id,
              nombre: mov.movimientoKardex.sede.nombre,
            }
          : null,
        usuario: mov.usuario?.nombre ?? null,
        observacion: mov.observacion,
      })),
      totales: {
        cantidadReutilizable: num(reutilizable?._sum.cantidad ?? 0),
        cantidadDescarte: num(descarte?._sum.cantidad ?? 0),
        // Lo recuperado es SOLO el retazo: el descarte vale cero por diseño y
        // sumarlo aquí daría la impresión de que se recuperó más de lo que se
        // recuperó.
        valorRecuperado: num(reutilizable?._sum.costoTotal ?? 0),
      },
    };
  }

  /// La liquidación en Excel: una fila por componente, con los tres niveles y
  /// las dos desviaciones en el mismo orden que la pantalla.
  ///
  /// ⚠ Lo que no se puede calcular va en BLANCO, nunca en 0. Una celda en 0.00
  /// se lee como «es gratis» —es justo lo que miente del inventario
  /// valorizado— y en una hoja de cálculo es peor que en pantalla: entra en la
  /// siguiente suma que alguien escriba al lado.
  async exportarLiquidacionOrden(empresaId: number, ordenId: number) {
    const resumen = await this.resumenMaterialesOrden(empresaId, ordenId);
    const orden = await this.prisma.ordenProduccion.findFirst({
      where: { id: ordenId, empresaId },
      select: {
        loteProduccion: true,
        cantidadObjetivo: true,
        cantidadProducida: true,
        fechaFin: true,
        productoFinal: { select: { codigo: true, descripcion: true } },
      },
    });
    if (!orden) {
      throw new NotFoundException('Orden de producción no encontrada.');
    }

    // `null` y no `''`: con null la celda NO SE CREA en la hoja. Una celda con
    // cadena vacía existe, y al arrastrar una fórmula por la columna entra en
    // el rango como si fuera un valor. Lo que no se puede calcular no debe
    // tener celda, igual que en la API no tiene número.
    const nada = (valor: number | null | undefined) =>
      valor === null || valor === undefined ? null : valor;
    const etiquetaTipo = (tipo: string | null) =>
      tipo === 'POR_LOTE'
        ? 'Por lote'
        : tipo === 'POR_UNIDAD'
          ? 'Por unidad'
          : '';

    type Col = {
      header: string;
      wch: number;
      get: (c: (typeof resumen.componentes)[number]) => string | number | null;
      total?: (acc: number, c: (typeof resumen.componentes)[number]) => number;
    };
    const columnas: Col[] = [
      { header: 'Código', wch: 18, get: (c) => c.codigo },
      { header: 'Descripción', wch: 40, get: (c) => c.descripcion },
      { header: 'Unidad', wch: 9, get: (c) => c.unidad },
      { header: 'Cantidad', wch: 11, get: (c) => etiquetaTipo(c.tipoCantidad) },
      { header: 'Receta', wch: 12, get: (c) => nada(c.cantidadReceta) },
      {
        header: 'Orden',
        wch: 12,
        get: (c) => c.cantidadTeorica,
        total: (acc, c) => acc + c.cantidadTeorica,
      },
      {
        header: 'Consumido',
        wch: 12,
        get: (c) => c.cantidadConsumida,
        total: (acc, c) => acc + c.cantidadConsumida,
      },
      {
        header: 'Merma',
        wch: 11,
        get: (c) => c.mermaCantidad,
        total: (acc, c) => acc + c.mermaCantidad,
      },
      {
        header: 'Reutilizable',
        wch: 12,
        get: (c) => c.mermaReutilizable,
        total: (acc, c) => acc + c.mermaReutilizable,
      },
      {
        header: 'Descarte',
        wch: 11,
        get: (c) => c.mermaDescarte,
        total: (acc, c) => acc + c.mermaDescarte,
      },
      {
        header: 'Sobrante devuelto',
        wch: 15,
        get: (c) => c.sobranteRegistrado,
        total: (acc, c) => acc + c.sobranteRegistrado,
      },
      {
        header: 'Desvío orden vs receta',
        wch: 18,
        get: (c) => nada(c.desvioOrdenVsReceta),
      },
      {
        header: '%',
        wch: 9,
        get: (c) =>
          c.desvioOrdenVsRecetaPct === null
            ? null
            : Number(c.desvioOrdenVsRecetaPct.toFixed(2)),
      },
      {
        header: 'Desvío real vs orden',
        wch: 17,
        get: (c) => c.desvioRealVsOrden,
      },
      {
        header: '%',
        wch: 9,
        get: (c) =>
          c.desvioRealVsOrdenPct === null
            ? null
            : Number(c.desvioRealVsOrdenPct.toFixed(2)),
      },
      {
        header: 'Costo unit.',
        wch: 12,
        // Sin costo la celda queda VACÍA y la columna «Sin costo» lo dice. Un
        // 0.00 aquí convertiría un dato que falta en un precio.
        get: (c) => nada(c.costoUnitario),
      },
      {
        header: 'Merma S/',
        wch: 12,
        get: (c) => nada(c.mermaValorizada),
        total: (acc, c) => acc + (c.mermaValorizada ?? 0),
      },
      {
        header: 'Sin costo',
        wch: 10,
        get: (c) => (c.sinCosto ? 'Sí' : null),
      },
    ];

    const filas = resumen.componentes.map((c) =>
      columnas.map((col) => col.get(c)),
    );
    const filaTotales: (string | number | null)[] = columnas.map((col) =>
      col.total
        ? Number(resumen.componentes.reduce(col.total, 0).toFixed(4))
        : null,
    );
    filaTotales[0] = 'TOTAL';

    const rend = resumen.rendimiento;
    const cabecera = `Liquidación de materiales · Orden ${orden.loteProduccion} · ${orden.productoFinal?.codigo ?? ''} ${orden.productoFinal?.descripcion ?? ''}`;
    const linea2 = `Objetivo: ${num(orden.cantidadObjetivo)} · Producido: ${num(orden.cantidadProducida)} · Estado: ${resumen.estado}`;
    const linea3 = rend
      ? `Rendimiento (${rend.insumoPrincipal}, ${rend.unidad} por unidad producida): estándar ${rend.estandar === null ? 'sin receta' : rend.estandar.toFixed(4)} · real ${rend.real.toFixed(4)}${rend.desvioPct === null ? '' : ` · desvío ${rend.desvioPct.toFixed(2)} %`}`
      : 'Rendimiento: no se puede calcular (la orden no registra producción).';
    const linea4 = resumen.totales.sinCosto
      ? `⚠ ${resumen.totales.sinCosto} componente(s) sin costo: la merma valorizada está INCOMPLETA. Las celdas en blanco son datos que faltan, no ceros.`
      : '';

    const aoa: (string | number | null)[][] = [
      [cabecera],
      [linea2],
      [linea3],
      ...(linea4 ? [[linea4]] : []),
      [],
      columnas.map((c) => c.header),
      ...filas,
      [],
      filaTotales,
    ];

    // xlsx-js-style y no xlsx: la edición community descarta `cell.s` al
    // escribir, y aquí hace falta negrita en la cabecera y en los totales.
    const ws = XLSXStyle.utils.aoa_to_sheet(aoa);
    ws['!cols'] = columnas.map((c) => ({ wch: c.wch }));
    const filaCabeceras = linea4 ? 5 : 4;
    const filaTotalesIdx = aoa.length - 1;
    for (const r of [0, filaCabeceras, filaTotalesIdx]) {
      for (let c = 0; c < columnas.length; c += 1) {
        const celda = ws[XLSXStyle.utils.encode_cell({ r, c })];
        if (celda) celda.s = { font: { bold: true } };
      }
    }
    const wb = XLSXStyle.utils.book_new();
    XLSXStyle.utils.book_append_sheet(wb, ws, 'Liquidación');
    const buffer = XLSXStyle.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;

    return {
      buffer,
      filename: `liquidacion_${orden.loteProduccion.replace(/[^A-Za-z0-9_-]/g, '_')}.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private textoPlano(value: unknown): string {
    return String(value ?? '').trim();
  }

  private resolverUmbSunat(raw: string | undefined): string {
    const alias: Record<string, string> = {
      KG: 'KGM',
      KGS: 'KGM',
      KILO: 'KGM',
      KILOGRAMO: 'KGM',
      UN: 'NIU',
      UND: 'NIU',
      UNID: 'NIU',
      UNIDAD: 'NIU',
      ETIQ: 'NIU',
      PZA: 'NIU',
      PZ: 'NIU',
      LT: 'LTR',
      LTS: 'LTR',
      LITRO: 'LTR',
      MT: 'MTR',
      MTS: 'MTR',
      METRO: 'MTR',
    };
    if (!raw) return 'NIU';
    const key = raw.trim().toUpperCase();
    return alias[key] ?? key;
  }

  private clavePlano(value: unknown): string {
    return this.textoPlano(value)
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private numeroSeguro(value: unknown, fallback = 0): number {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private fechaExcelAISO(value: unknown): string | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number' && Number.isFinite(value)) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const parsed = new Date(excelEpoch.getTime() + value * 86400000);
      if (Number.isNaN(parsed.getTime())) return undefined;
      return parsed.toISOString().slice(0, 10);
    }
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString().slice(0, 10);
  }

  private valorFila(row: Record<string, any>, keys: string[]) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
    }
    return undefined;
  }

  private resolverUnidadId(
    unidadRaw: string,
    unidadMap: Map<string, number>,
  ): number | undefined {
    const key = this.clavePlano(unidadRaw);
    if (!key) return undefined;

    const direct = unidadMap.get(key);
    if (direct) return direct;

    const aliases: Record<string, string[]> = {
      KG: ['KGM', 'KILO', 'KILOGRAMO', 'KILOGRAMOS'],
      KGS: ['KGM', 'KG', 'KILO', 'KILOGRAMO', 'KILOGRAMOS'],
      GR: ['GRM', 'GRAMO', 'GRAMOS'],
      G: ['GRM', 'GR', 'GRAMO', 'GRAMOS'],
      LT: ['LTR', 'LITRO', 'LITROS'],
      LTS: ['LTR', 'LT', 'LITRO', 'LITROS'],
      L: ['LTR', 'LT', 'LITRO', 'LITROS'],
      ML: ['MLT', 'MILILITRO', 'MILILITROS'],
      MLS: ['MLT', 'ML', 'MILILITRO', 'MILILITROS'],
      UN: ['NIU', 'UNIDAD', 'UNIDADES'],
      UND: ['NIU', 'UN', 'UNIDAD', 'UNIDADES'],
      U: ['NIU', 'UN', 'UNIDAD', 'UNIDADES'],
    };

    const candidates = aliases[key] || [];
    for (const candidate of candidates) {
      const found = unidadMap.get(this.clavePlano(candidate));
      if (found) return found;
    }

    return undefined;
  }

  async generarPlantillaCargaMasiva(empresaId: number): Promise<Buffer> {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);

    const wb = XLSX.utils.book_new();
    const unidades = await this.prisma.unidadMedida.findMany({
      select: { codigo: true, nombre: true },
      orderBy: { codigo: 'asc' },
    });

    const infoAoa = [
      ['VENDIFY - Plantilla Fabricación y Producción'],
      [''],
      [
        'SHEET PRODUCTOS -> Catálogo de insumos, envases, semielaborados y productos terminados.',
      ],
      ['SHEET RECETAS -> Una fila por componente de receta.'],
      [
        'SHEET ORDENES -> Opcional, crea órdenes en BORRADOR desde recetas existentes.',
      ],
      [''],
      ['Reglas importantes'],
      ['1) No cambies nombres de columnas.'],
      ['2) CODIGO debe ser único por empresa.'],
      ['3) UMB usa código de la hoja UNIDADES (GR, ML, KG, LT, UN, etc).'],
      ['4) AFECTACION usa 10, 20, 30 o 40.'],
      [
        '5) En RECETAS, cada componente va en una fila con mismo RECETA_CODIGO/RECETA_VERSION.',
      ],
      [
        '6) TIPO_CANTIDAD: POR_UNIDAD (por cada unidad que se fabrica) o POR_LOTE (una vez por orden, no escala).',
      ],
      [
        '   Ejemplo de POR_LOTE: "6 cajas de grapas para toda la tanda". Si lo dejas vacío, se asume POR_UNIDAD.',
      ],
      [
        '   ⚠ No pongas un POR_LOTE dividido entre el tamaño del lote para que "cuadre": al cambiar el tamaño de',
      ],
      [
        '   la orden, ese número da un consumo que planta no reconoce. Para eso está esta columna.',
      ],
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(infoAoa);
    wsInfo['!cols'] = [{ wch: 120 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'LEEME');

    const wsUnidades = XLSX.utils.json_to_sheet(
      unidades.map((u) => ({ CODIGO: u.codigo, NOMBRE: u.nombre })),
    );
    wsUnidades['!cols'] = [{ wch: 12 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(wb, wsUnidades, 'UNIDADES');

    const productosHeaders = [
      // INSUMOS BASE
      {
        TIPO: 'INSUMO',
        CODIGO: '2001004',
        DESCRIPCION: 'TEXAPON 70% (DETERGENTE)',
        UMB: 'KG',
        COSTO_UNITARIO: 22.5,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 120,
        CATEGORIA: 'INSUMOS',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'INSUMO',
        CODIGO: '2001002',
        DESCRIPCION: 'BETAINA 35% (ESPUMANTE)',
        UMB: 'KG',
        COSTO_UNITARIO: 19.8,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 90,
        CATEGORIA: 'INSUMOS',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'INSUMO',
        CODIGO: '2001001',
        DESCRIPCION: 'COMPERLAND KD (ESPESANTE)',
        UMB: 'KG',
        COSTO_UNITARIO: 28.4,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 40,
        CATEGORIA: 'INSUMOS',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'INSUMO',
        CODIGO: '3001001',
        DESCRIPCION: 'AGUA DESIONISADA O AGUA POTABLE',
        UMB: 'LT',
        COSTO_UNITARIO: 0.85,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 1200,
        CATEGORIA: 'INSUMOS',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'INSUMO',
        CODIGO: '1004013',
        DESCRIPCION: 'ESENCIA DE AROMA TUTIFRUTI',
        UMB: 'ML',
        COSTO_UNITARIO: 0.03,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 10000,
        CATEGORIA: 'INSUMOS',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'INSUMO',
        CODIGO: '2001005',
        DESCRIPCION: 'CLORURO DE SODIO (SAL)',
        UMB: 'GR',
        COSTO_UNITARIO: 0.01,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 50000,
        CATEGORIA: 'INSUMOS',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      // ENVASES Y ETIQUETAS
      {
        TIPO: 'ENVASE',
        CODIGO: '7001026',
        DESCRIPCION: 'CAQUETA GALONERA 1LT',
        UMB: 'UN',
        COSTO_UNITARIO: 1.45,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 500,
        CATEGORIA: 'ENVASES',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'ENVASE',
        CODIGO: 'ETIQ011.SHCE1',
        DESCRIPCION: 'ETIQUETA SHAMPOO CERA GAL 1LT',
        UMB: 'UN',
        COSTO_UNITARIO: 0.18,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 500,
        CATEGORIA: 'ETIQUETAS',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'ENVASE',
        CODIGO: '7001002',
        DESCRIPCION: 'ENVASE 3.8LT',
        UMB: 'UN',
        COSTO_UNITARIO: 2.9,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 200,
        CATEGORIA: 'ENVASES',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'ENVASE',
        CODIGO: 'ETIQ011.SHCE3.8',
        DESCRIPCION: 'ETIQUETA SHAMPOO CERA GAL 3.8LT',
        UMB: 'UN',
        COSTO_UNITARIO: 0.24,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 200,
        CATEGORIA: 'ETIQUETAS',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'ENVASE',
        CODIGO: '7001004',
        DESCRIPCION: 'ENVASE 20LT',
        UMB: 'UN',
        COSTO_UNITARIO: 8.5,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 100,
        CATEGORIA: 'ENVASES',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'ENVASE',
        CODIGO: 'ETIQ011.SHCE20',
        DESCRIPCION: 'ETIQUETA SHAMPOO CERA 20LT',
        UMB: 'UN',
        COSTO_UNITARIO: 0.35,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 100,
        CATEGORIA: 'ETIQUETAS',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      // SEMIELABORADOS
      {
        TIPO: 'SEMIELABORADO',
        CODIGO: 'GRANEL.SHCE',
        DESCRIPCION: 'SHAMPOO CERA GRANEL',
        UMB: 'LT',
        COSTO_UNITARIO: 0,
        PRECIO_VENTA: 0,
        STOCK_INICIAL: 0,
        CATEGORIA: 'SEMIELABORADO',
        MARCA: '',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      // PRODUCTOS TERMINADOS
      {
        TIPO: 'PRODUCTO_FINAL',
        CODIGO: '011.SHCE1',
        DESCRIPCION: 'SHAMPOO CERA GAL 1LT',
        UMB: 'UN',
        COSTO_UNITARIO: 4.5,
        PRECIO_VENTA: 8,
        STOCK_INICIAL: 0,
        CATEGORIA: 'PRODUCTO_TERMINADO',
        MARCA: 'MR.BULLDOG',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'PRODUCTO_FINAL',
        CODIGO: '011.SHCE3.8',
        DESCRIPCION: 'SHAMPOO CERA GAL 3.8LT',
        UMB: 'UN',
        COSTO_UNITARIO: 11.5,
        PRECIO_VENTA: 18.9,
        STOCK_INICIAL: 0,
        CATEGORIA: 'PRODUCTO_TERMINADO',
        MARCA: 'MR.BULLDOG',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
      {
        TIPO: 'PRODUCTO_FINAL',
        CODIGO: '011.SHCE20',
        DESCRIPCION: 'SHAMPOO CERA 20LT',
        UMB: 'UN',
        COSTO_UNITARIO: 38,
        PRECIO_VENTA: 55,
        STOCK_INICIAL: 0,
        CATEGORIA: 'PRODUCTO_TERMINADO',
        MARCA: 'MR.BULLDOG',
        AFECTACION: '10',
        CODIGO_BARRAS: '',
      },
    ];
    const wsProductos = XLSX.utils.json_to_sheet(productosHeaders);
    wsProductos['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 55 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 12 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsProductos, 'PRODUCTOS');

    const recetasHeaders = [
      // RECETA 1: FABRICACIÓN GRANEL
      {
        RECETA_CODIGO: 'RC-SHCE-GRANEL',
        RECETA_NOMBRE: 'Fabricación granel Shampoo Cera',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: 'GRANEL.SHCE',
        RENDIMIENTO_OBJETIVO: 100,
        UMB_RENDIMIENTO: 'LT',
        MERMA_OBJETIVO_PORCENTAJE: 2,
        INSUMO_CODIGO: '2001004',
        CANTIDAD_BASE: 10,
        UMB_BASE: 'KG',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 1,
      },
      {
        RECETA_CODIGO: 'RC-SHCE-GRANEL',
        RECETA_NOMBRE: 'Fabricación granel Shampoo Cera',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: 'GRANEL.SHCE',
        RENDIMIENTO_OBJETIVO: 100,
        UMB_RENDIMIENTO: 'LT',
        MERMA_OBJETIVO_PORCENTAJE: 2,
        INSUMO_CODIGO: '2001002',
        CANTIDAD_BASE: 8,
        UMB_BASE: 'KG',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 2,
      },
      {
        RECETA_CODIGO: 'RC-SHCE-GRANEL',
        RECETA_NOMBRE: 'Fabricación granel Shampoo Cera',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: 'GRANEL.SHCE',
        RENDIMIENTO_OBJETIVO: 100,
        UMB_RENDIMIENTO: 'LT',
        MERMA_OBJETIVO_PORCENTAJE: 2,
        INSUMO_CODIGO: '2001001',
        CANTIDAD_BASE: 2.5,
        UMB_BASE: 'KG',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 3,
      },
      {
        RECETA_CODIGO: 'RC-SHCE-GRANEL',
        RECETA_NOMBRE: 'Fabricación granel Shampoo Cera',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: 'GRANEL.SHCE',
        RENDIMIENTO_OBJETIVO: 100,
        UMB_RENDIMIENTO: 'LT',
        MERMA_OBJETIVO_PORCENTAJE: 2,
        INSUMO_CODIGO: '3001001',
        CANTIDAD_BASE: 77.698,
        UMB_BASE: 'LT',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 4,
      },
      {
        RECETA_CODIGO: 'RC-SHCE-GRANEL',
        RECETA_NOMBRE: 'Fabricación granel Shampoo Cera',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: 'GRANEL.SHCE',
        RENDIMIENTO_OBJETIVO: 100,
        UMB_RENDIMIENTO: 'LT',
        MERMA_OBJETIVO_PORCENTAJE: 2,
        INSUMO_CODIGO: '1004013',
        CANTIDAD_BASE: 200,
        UMB_BASE: 'ML',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 5,
      },
      {
        RECETA_CODIGO: 'RC-SHCE-GRANEL',
        RECETA_NOMBRE: 'Fabricación granel Shampoo Cera',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: 'GRANEL.SHCE',
        RENDIMIENTO_OBJETIVO: 100,
        UMB_RENDIMIENTO: 'LT',
        MERMA_OBJETIVO_PORCENTAJE: 2,
        INSUMO_CODIGO: '2001005',
        CANTIDAD_BASE: 500,
        UMB_BASE: 'GR',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 6,
      },
      // RECETA 2: ENVASADO 1LT
      {
        RECETA_CODIGO: 'RC-SHCE1-ENV',
        RECETA_NOMBRE: 'Envasado Shampoo Cera 1LT',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: '011.SHCE1',
        RENDIMIENTO_OBJETIVO: 1,
        UMB_RENDIMIENTO: 'UN',
        MERMA_OBJETIVO_PORCENTAJE: 0,
        INSUMO_CODIGO: 'GRANEL.SHCE',
        CANTIDAD_BASE: 1,
        UMB_BASE: 'LT',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 1,
      },
      {
        RECETA_CODIGO: 'RC-SHCE1-ENV',
        RECETA_NOMBRE: 'Envasado Shampoo Cera 1LT',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: '011.SHCE1',
        RENDIMIENTO_OBJETIVO: 1,
        UMB_RENDIMIENTO: 'UN',
        MERMA_OBJETIVO_PORCENTAJE: 0.5,
        INSUMO_CODIGO: '7001026',
        CANTIDAD_BASE: 1,
        UMB_BASE: 'UN',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 2,
      },
      {
        RECETA_CODIGO: 'RC-SHCE1-ENV',
        RECETA_NOMBRE: 'Envasado Shampoo Cera 1LT',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: '011.SHCE1',
        RENDIMIENTO_OBJETIVO: 1,
        UMB_RENDIMIENTO: 'UN',
        MERMA_OBJETIVO_PORCENTAJE: 0.5,
        INSUMO_CODIGO: 'ETIQ011.SHCE1',
        CANTIDAD_BASE: 1,
        UMB_BASE: 'UN',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 3,
      },
      // RECETA 3: ENVASADO 3.8LT
      {
        RECETA_CODIGO: 'RC-SHCE38-ENV',
        RECETA_NOMBRE: 'Envasado Shampoo Cera 3.8LT',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: '011.SHCE3.8',
        RENDIMIENTO_OBJETIVO: 1,
        UMB_RENDIMIENTO: 'UN',
        MERMA_OBJETIVO_PORCENTAJE: 0.5,
        INSUMO_CODIGO: 'GRANEL.SHCE',
        CANTIDAD_BASE: 3.8,
        UMB_BASE: 'LT',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 1,
      },
      {
        RECETA_CODIGO: 'RC-SHCE38-ENV',
        RECETA_NOMBRE: 'Envasado Shampoo Cera 3.8LT',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: '011.SHCE3.8',
        RENDIMIENTO_OBJETIVO: 1,
        UMB_RENDIMIENTO: 'UN',
        MERMA_OBJETIVO_PORCENTAJE: 0.5,
        INSUMO_CODIGO: '7001002',
        CANTIDAD_BASE: 1,
        UMB_BASE: 'UN',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 2,
      },
      {
        RECETA_CODIGO: 'RC-SHCE38-ENV',
        RECETA_NOMBRE: 'Envasado Shampoo Cera 3.8LT',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: '011.SHCE3.8',
        RENDIMIENTO_OBJETIVO: 1,
        UMB_RENDIMIENTO: 'UN',
        MERMA_OBJETIVO_PORCENTAJE: 0.5,
        INSUMO_CODIGO: 'ETIQ011.SHCE3.8',
        CANTIDAD_BASE: 1,
        UMB_BASE: 'UN',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 3,
      },
      // RECETA 4: ENVASADO 20LT
      {
        RECETA_CODIGO: 'RC-SHCE20-ENV',
        RECETA_NOMBRE: 'Envasado Shampoo Cera 20LT',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: '011.SHCE20',
        RENDIMIENTO_OBJETIVO: 1,
        UMB_RENDIMIENTO: 'UN',
        MERMA_OBJETIVO_PORCENTAJE: 0.5,
        INSUMO_CODIGO: 'GRANEL.SHCE',
        CANTIDAD_BASE: 20,
        UMB_BASE: 'LT',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 1,
      },
      {
        RECETA_CODIGO: 'RC-SHCE20-ENV',
        RECETA_NOMBRE: 'Envasado Shampoo Cera 20LT',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: '011.SHCE20',
        RENDIMIENTO_OBJETIVO: 1,
        UMB_RENDIMIENTO: 'UN',
        MERMA_OBJETIVO_PORCENTAJE: 0.5,
        INSUMO_CODIGO: '7001004',
        CANTIDAD_BASE: 1,
        UMB_BASE: 'UN',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 2,
      },
      {
        RECETA_CODIGO: 'RC-SHCE20-ENV',
        RECETA_NOMBRE: 'Envasado Shampoo Cera 20LT',
        RECETA_VERSION: 1,
        PRODUCTO_FINAL_CODIGO: '011.SHCE20',
        RENDIMIENTO_OBJETIVO: 1,
        UMB_RENDIMIENTO: 'UN',
        MERMA_OBJETIVO_PORCENTAJE: 0.5,
        INSUMO_CODIGO: 'ETIQ011.SHCE20',
        CANTIDAD_BASE: 1,
        UMB_BASE: 'UN',
        TIPO_CANTIDAD: 'POR_UNIDAD',
        ORDEN: 3,
      },
    ];
    const wsRecetas = XLSX.utils.json_to_sheet(recetasHeaders);
    wsRecetas['!cols'] = [
      { wch: 22 },
      { wch: 45 },
      { wch: 14 },
      { wch: 24 },
      { wch: 20 },
      { wch: 16 },
      { wch: 26 },
      { wch: 22 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsRecetas, 'RECETAS');

    const ordenesHeaders = [
      {
        LOTE_PRODUCCION: 'V052027',
        RECETA_CODIGO: 'RC-SHCE-GRANEL',
        RECETA_VERSION: 1,
        CANTIDAD_OBJETIVO: 100,
        FECHA_PROGRAMADA: '2026-05-16',
        OBSERVACIONES: 'Lote de prueba granel',
      },
      {
        LOTE_PRODUCCION: 'V052027-ENV1',
        RECETA_CODIGO: 'RC-SHCE1-ENV',
        RECETA_VERSION: 1,
        CANTIDAD_OBJETIVO: 19,
        FECHA_PROGRAMADA: '2026-05-16',
        OBSERVACIONES: 'Envasado 1LT',
      },
      {
        LOTE_PRODUCCION: 'V052028',
        RECETA_CODIGO: 'RC-SHCE-GRANEL',
        RECETA_VERSION: 1,
        CANTIDAD_OBJETIVO: 200,
        FECHA_PROGRAMADA: '2026-05-18',
        OBSERVACIONES: 'Lote granel ampliado',
      },
      {
        LOTE_PRODUCCION: 'V052028-ENV38',
        RECETA_CODIGO: 'RC-SHCE38-ENV',
        RECETA_VERSION: 1,
        CANTIDAD_OBJETIVO: 25,
        FECHA_PROGRAMADA: '2026-05-18',
        OBSERVACIONES: 'Envasado 3.8LT',
      },
      {
        LOTE_PRODUCCION: 'V052028-ENV20',
        RECETA_CODIGO: 'RC-SHCE20-ENV',
        RECETA_VERSION: 1,
        CANTIDAD_OBJETIVO: 8,
        FECHA_PROGRAMADA: '2026-05-18',
        OBSERVACIONES: 'Envasado 20LT',
      },
    ];
    const wsOrdenes = XLSX.utils.json_to_sheet(ordenesHeaders);
    wsOrdenes['!cols'] = [
      { wch: 24 },
      { wch: 22 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 40 },
    ];
    XLSX.utils.book_append_sheet(wb, wsOrdenes, 'ORDENES');

    return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  }

  private leerProductosFormatoPersonalizado(
    workbook: XLSX.WorkBook,
  ): Record<string, any>[] {
    const productos: Record<string, any>[] = [];

    const buscarFilaHeaders = (filas: any[][], marcas: string[]): number => {
      for (let i = 0; i < Math.min(filas.length, 5); i++) {
        if (marcas.some((m) => filas[i].includes(m))) return i;
      }
      return -1;
    };

    // INV.INSUM. → INSUMO (fila 0 es título, fila 1 son headers reales)
    const sheetInsumos = workbook.Sheets['INV.INSUM.'];
    if (sheetInsumos) {
      const filas = XLSX.utils.sheet_to_json(sheetInsumos, {
        header: 1,
      }) as any[][];
      const hIdx = buscarFilaHeaders(filas, ['SKU', 'NOMBRES']);
      if (hIdx >= 0) {
        const headers: any[] = filas[hIdx];
        const skuIdx = headers.indexOf('SKU');
        const nombreIdx = headers.indexOf('NOMBRES');
        const precioKgIdx = headers.indexOf('Precio x kg');
        const costoIdx = headers.indexOf('Costo sin igv');
        const invIdx = headers.indexOf('Inventario');
        const familiaIdx = headers.findIndex(
          (h: any) => h && String(h).toUpperCase() === 'FAMILIA',
        );
        for (let i = hIdx + 1; i < filas.length; i++) {
          const f = filas[i];
          if (!f[skuIdx] || !f[nombreIdx]) continue;
          productos.push({
            CODIGO: String(f[skuIdx]),
            DESCRIPCION: String(f[nombreIdx]),
            UMB: 'KGM',
            COSTO_UNITARIO: costoIdx >= 0 ? (f[costoIdx] ?? 0) : 0,
            PRECIO_VENTA:
              precioKgIdx >= 0
                ? (f[precioKgIdx] ?? 0)
                : costoIdx >= 0
                  ? (f[costoIdx] ?? 0)
                  : 0,
            STOCK_INICIAL: invIdx >= 0 ? (f[invIdx] ?? 0) : 0,
            CATEGORIA:
              familiaIdx >= 0 && f[familiaIdx]
                ? String(f[familiaIdx])
                : 'INSUMOS',
            AFECTACION: '10',
          });
        }
      }
    }

    // INV. ETIQ. → ENVASE (fila 0 es título "ETIQUETAS", fila 1 son headers)
    const sheetEtiq = workbook.Sheets['INV. ETIQ.'];
    if (sheetEtiq) {
      const filas = XLSX.utils.sheet_to_json(sheetEtiq, {
        header: 1,
      }) as any[][];
      const hIdx = buscarFilaHeaders(filas, ['COD.', 'NOMBRES']);
      if (hIdx >= 0) {
        const headers: any[] = filas[hIdx];
        const codIdx = headers.indexOf('COD.');
        const nombreIdx = headers.indexOf('NOMBRES');
        const costoSinIgvIdx = headers.indexOf('COSTO SIN IGV');
        const precioIdx = headers.indexOf('PRECIO');
        const umbIdx = headers.indexOf('UMB');
        const invIdx = headers.findIndex(
          (h: any) => h && String(h).toLowerCase().startsWith('inventario'),
        );
        for (let i = hIdx + 1; i < filas.length; i++) {
          const f = filas[i];
          if (!f[codIdx] || !f[nombreIdx]) continue;
          const umbRaw =
            umbIdx >= 0 && f[umbIdx]
              ? String(f[umbIdx]).toUpperCase()
              : undefined;
          productos.push({
            CODIGO: String(f[codIdx]),
            DESCRIPCION: String(f[nombreIdx]),
            UMB: this.resolverUmbSunat(umbRaw),
            COSTO_UNITARIO: costoSinIgvIdx >= 0 ? (f[costoSinIgvIdx] ?? 0) : 0,
            PRECIO_VENTA: precioIdx >= 0 ? (f[precioIdx] ?? 0) : 0,
            STOCK_INICIAL: invIdx >= 0 ? (f[invIdx] ?? 0) : 0,
            CATEGORIA: 'ETIQUETAS',
            AFECTACION: '10',
          });
        }
      }
    }

    // INVE. PT → PRODUCTO_FINAL (fila 0 es título, fila 1 son headers)
    const sheetPT = workbook.Sheets['INVE. PT'];
    if (sheetPT) {
      const filas = XLSX.utils.sheet_to_json(sheetPT, {
        header: 1,
      }) as any[][];
      const hIdx = buscarFilaHeaders(filas, ['COD.', 'NOMBRES']);
      if (hIdx >= 0) {
        const headers: any[] = filas[hIdx];
        const codIdx = headers.indexOf('COD.');
        const nombreIdx = headers.indexOf('NOMBRES');
        const costoUniIdx = headers.indexOf('COSTO UNI.');
        const costoIdx = headers.indexOf('COSTO');
        const umbIdx = headers.indexOf('UMB');
        const invIdx = headers.indexOf('Inventario');
        for (let i = hIdx + 1; i < filas.length; i++) {
          const f = filas[i];
          if (!f[codIdx] || !f[nombreIdx]) continue;
          const umbRaw =
            umbIdx >= 0 && f[umbIdx]
              ? String(f[umbIdx]).toUpperCase()
              : undefined;
          productos.push({
            CODIGO: String(f[codIdx]),
            DESCRIPCION: String(f[nombreIdx]),
            UMB: this.resolverUmbSunat(umbRaw),
            COSTO_UNITARIO: costoUniIdx >= 0 ? (f[costoUniIdx] ?? 0) : 0,
            PRECIO_VENTA: costoIdx >= 0 ? (f[costoIdx] ?? 0) : 0,
            STOCK_INICIAL: invIdx >= 0 ? (f[invIdx] ?? 0) : 0,
            CATEGORIA: 'PRODUCTO_TERMINADO',
            AFECTACION: '10',
          });
        }
      }
    }

    const seen = new Set<string>();
    return productos.filter((p) => {
      const cod = String(p['CODIGO'] ?? '').trim();
      if (!cod || seen.has(cod)) return false;
      seen.add(cod);
      return true;
    });
  }

  async importarPlantillaFabricacion(
    fileBuffer: Buffer,
    empresaId: number,
    usuarioId: number,
    sedeId?: number,
  ) {
    this.validarEmpresaId(empresaId);
    await this.asegurarRubroFabricacion(empresaId);

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetProductos = workbook.Sheets['PRODUCTOS'];
    const sheetRecetas = workbook.Sheets['RECETAS'];
    const sheetOrdenes = workbook.Sheets['ORDENES'];

    let productosRows: Record<string, any>[];
    let recetasRows: Record<string, any>[];
    let ordenesRows: Record<string, any>[];

    if (sheetProductos && sheetRecetas) {
      productosRows = XLSX.utils.sheet_to_json(sheetProductos, {
        defval: null,
      });
      recetasRows = XLSX.utils.sheet_to_json(sheetRecetas, { defval: null });
      ordenesRows = sheetOrdenes
        ? XLSX.utils.sheet_to_json(sheetOrdenes, { defval: null })
        : [];
    } else if (
      workbook.Sheets['INV.INSUM.'] ||
      workbook.Sheets['INV. ETIQ.'] ||
      workbook.Sheets['INVE. PT']
    ) {
      productosRows = this.leerProductosFormatoPersonalizado(workbook);
      recetasRows = [];
      ordenesRows = [];
    } else {
      throw new BadRequestException(
        'La plantilla debe contener las hojas PRODUCTOS y RECETAS (plantilla oficial) o las hojas INV.INSUM., INV. ETIQ. e INVE. PT.',
      );
    }

    const resumen = {
      productos: {
        total: productosRows.length,
        creados: 0,
        actualizados: 0,
        fallidos: 0,
        errores: [] as string[],
      },
      recetas: {
        total: 0,
        creadas: 0,
        actualizadas: 0,
        fallidas: 0,
        errores: [] as string[],
      },
      ordenes: {
        total: ordenesRows.length,
        creadas: 0,
        fallidas: 0,
        errores: [] as string[],
      },
    };

    const unidades = await this.prisma.unidadMedida.findMany({
      select: { id: true, codigo: true, nombre: true },
    });
    const unidadMap = new Map<string, number>();
    for (const unidad of unidades) {
      unidadMap.set(this.clavePlano(unidad.codigo), unidad.id);
      unidadMap.set(this.clavePlano(unidad.nombre), unidad.id);
    }

    const categoriasIniciales = await this.prisma.categoria.findMany({
      where: { empresaId },
      select: { id: true, nombre: true },
    });
    const categoriaMap = new Map<string, number>();
    for (const cat of categoriasIniciales) {
      categoriaMap.set(this.clavePlano(cat.nombre), cat.id);
    }

    const marcasIniciales = await this.prisma.marca.findMany({
      where: { empresaId },
      select: { id: true, nombre: true },
    });
    const marcaMap = new Map<string, number>();
    for (const marca of marcasIniciales) {
      marcaMap.set(this.clavePlano(marca.nombre), marca.id);
    }

    const resolverCategoriaId = async (nombre: string) => {
      const key = this.clavePlano(nombre);
      if (!key) return undefined;
      const existing = categoriaMap.get(key);
      if (existing) return existing;
      const creada = await this.prisma.categoria.create({
        data: { nombre: this.textoPlano(nombre), empresaId },
        select: { id: true, nombre: true },
      });
      categoriaMap.set(this.clavePlano(creada.nombre), creada.id);
      return creada.id;
    };

    const resolverMarcaId = async (nombre: string) => {
      const key = this.clavePlano(nombre);
      if (!key) return undefined;
      const existing = marcaMap.get(key);
      if (existing) return existing;
      const creada = await this.prisma.marca.create({
        data: { nombre: this.textoPlano(nombre), empresaId },
        select: { id: true, nombre: true },
      });
      marcaMap.set(this.clavePlano(creada.nombre), creada.id);
      return creada.id;
    };

    const tiposAfectacion = new Set(['10', '20', '30', '40']);

    for (let index = 0; index < productosRows.length; index++) {
      const row = productosRows[index];
      const fila = index + 2;
      try {
        const codigo = this.textoPlano(
          this.valorFila(row, ['CODIGO', 'Código', 'codigo']),
        );
        const descripcion = this.textoPlano(
          this.valorFila(row, ['DESCRIPCION', 'Descripción', 'descripcion']),
        );
        const unidadRaw = this.textoPlano(
          this.valorFila(row, ['UMB', 'UNIDAD_MEDIDA', 'Unidad', 'U.M']),
        );
        if (!codigo || !descripcion || !unidadRaw) {
          throw new BadRequestException(
            `Fila PRODUCTOS ${fila}: CODIGO, DESCRIPCION y UMB son obligatorios.`,
          );
        }

        const unidadId = this.resolverUnidadId(unidadRaw, unidadMap);
        if (!unidadId) {
          throw new BadRequestException(
            `Fila PRODUCTOS ${fila}: unidad ${unidadRaw} no existe en catálogo.`,
          );
        }

        const categoriaNombre = this.textoPlano(
          this.valorFila(row, ['CATEGORIA', 'Categoría', 'categoria']),
        );
        const marcaNombre = this.textoPlano(
          this.valorFila(row, ['MARCA', 'Marca', 'marca']),
        );
        const categoriaId = categoriaNombre
          ? await resolverCategoriaId(categoriaNombre)
          : undefined;
        const marcaId = marcaNombre
          ? await resolverMarcaId(marcaNombre)
          : undefined;

        const precioVenta = this.numeroSeguro(
          this.valorFila(row, ['PRECIO_VENTA', 'PRECIO', 'Precio']),
          0,
        );
        const costoUnitario = this.numeroSeguro(
          this.valorFila(row, ['COSTO_UNITARIO', 'COSTO', 'Costo']),
          0,
        );
        const stockInicial = Math.max(
          0,
          Math.round(
            this.numeroSeguro(
              this.valorFila(row, ['STOCK_INICIAL', 'STOCK', 'Inventario']),
              0,
            ),
          ),
        );
        const tipoAfectacionRaw = this.textoPlano(
          this.valorFila(row, ['AFECTACION', 'AFECT', 'IGV']),
        );
        const tipoAfectacion = tiposAfectacion.has(tipoAfectacionRaw)
          ? tipoAfectacionRaw
          : '10';
        const codigoBarras = this.textoPlano(
          this.valorFila(row, ['CODIGO_BARRAS', 'CODIGOBARRAS', 'BARRAS']),
        );

        const productoExistente = await this.prisma.producto.findFirst({
          where: { empresaId, codigo },
          select: { id: true, estado: true },
        });

        if (productoExistente && productoExistente.estado !== 'PLACEHOLDER') {
          await this.prisma.producto.update({
            where: { id: productoExistente.id },
            data: {
              descripcion,
              unidadMedidaId: unidadId,
              tipoAfectacionIGV: tipoAfectacion,
              precioUnitario: new Decimal(precioVenta),
              valorUnitario: new Decimal(
                Number((precioVenta / 1.18).toFixed(2)),
              ),
              costoPromedio: new Decimal(costoUnitario),
              categoriaId: categoriaId ?? null,
              marcaId: marcaId ?? null,
              codigoBarras: codigoBarras || null,
            },
          });
          resumen.productos.actualizados += 1;
          continue;
        }

        const creado = await this.productoService.crear(
          {
            codigo,
            descripcion,
            unidadMedidaId: unidadId,
            tipoAfectacionIGV: tipoAfectacion,
            precioUnitario: precioVenta,
            stock: stockInicial,
            categoriaId,
            marcaId,
            codigoBarras: codigoBarras || undefined,
          },
          empresaId,
          sedeId,
        );

        if (costoUnitario > 0) {
          await this.prisma.producto.update({
            where: { id: creado.id },
            data: { costoPromedio: new Decimal(costoUnitario) },
          });
        }

        resumen.productos.creados += 1;
      } catch (error: any) {
        resumen.productos.fallidos += 1;
        resumen.productos.errores.push(
          error?.response?.message || error?.message || `Error en fila ${fila}`,
        );
      }
    }

    const recetasAgrupadas = new Map<
      string,
      {
        codigo: string;
        nombre: string;
        version: number;
        productoFinalCodigo: string;
        rendimientoObjetivo: number;
        unidadRendimiento: string;
        mermaObjetivoPorcentaje: number;
        componentes: Array<{
          insumoCodigo: string;
          cantidadBase: number;
          unidadBase: string;
          tipoCantidad: 'POR_UNIDAD' | 'POR_LOTE';
          orden: number;
        }>;
      }
    >();

    for (let index = 0; index < recetasRows.length; index++) {
      const row = recetasRows[index];
      const fila = index + 2;
      const recetaCodigo = this.textoPlano(
        this.valorFila(row, ['RECETA_CODIGO', 'CODIGO_RECETA', 'RECETA']),
      );
      const productoFinalCodigo = this.textoPlano(
        this.valorFila(row, ['PRODUCTO_FINAL_CODIGO', 'PRODUCTO_FINAL']),
      );
      const insumoCodigo = this.textoPlano(
        this.valorFila(row, ['INSUMO_CODIGO', 'COMPONENTE_CODIGO', 'INSUMO']),
      );
      const cantidadBase = this.numeroSeguro(
        this.valorFila(row, ['CANTIDAD_BASE', 'CANTIDAD', 'BASE']),
        0,
      );

      if (
        !recetaCodigo &&
        !productoFinalCodigo &&
        !insumoCodigo &&
        !cantidadBase
      ) {
        continue;
      }
      if (
        !recetaCodigo ||
        !productoFinalCodigo ||
        !insumoCodigo ||
        cantidadBase <= 0
      ) {
        resumen.recetas.fallidas += 1;
        resumen.recetas.errores.push(
          `Fila RECETAS ${fila}: RECETA_CODIGO, PRODUCTO_FINAL_CODIGO, INSUMO_CODIGO y CANTIDAD_BASE son obligatorios.`,
        );
        continue;
      }

      // Un producto no se fabrica consigo mismo. `crearReceta` ya lo rechaza,
      // pero esta puerta no lo comprobaba: por aquí entró a la base una receta
      // de ANCLAJE cuyo primer componente era el propio anclaje. Una receta así
      // muerde su propia cola al explotar materiales y cuenta el costo dos veces.
      if (insumoCodigo === productoFinalCodigo) {
        resumen.recetas.fallidas += 1;
        resumen.recetas.errores.push(
          `Fila RECETAS ${fila}: el insumo ${insumoCodigo} es el propio producto final. Un producto no puede ser componente de sí mismo.`,
        );
        continue;
      }

      const version = Math.max(
        1,
        Math.round(
          this.numeroSeguro(
            this.valorFila(row, ['RECETA_VERSION', 'VERSION']),
            1,
          ),
        ),
      );
      const key = `${recetaCodigo}__${version}`;
      const existente = recetasAgrupadas.get(key);
      if (!existente) {
        recetasAgrupadas.set(key, {
          codigo: recetaCodigo,
          nombre:
            this.textoPlano(
              this.valorFila(row, ['RECETA_NOMBRE', 'NOMBRE_RECETA', 'NOMBRE']),
            ) || recetaCodigo,
          version,
          productoFinalCodigo,
          rendimientoObjetivo: this.numeroSeguro(
            this.valorFila(row, ['RENDIMIENTO_OBJETIVO', 'RENDIMIENTO']),
            1,
          ),
          unidadRendimiento:
            this.textoPlano(
              this.valorFila(row, ['UMB_RENDIMIENTO', 'UNIDAD_RENDIMIENTO']),
            ) || 'UN',
          mermaObjetivoPorcentaje: this.numeroSeguro(
            this.valorFila(row, ['MERMA_OBJETIVO_PORCENTAJE', 'MERMA_%']),
            0,
          ),
          componentes: [],
        });
      }

      const receta = recetasAgrupadas.get(key)!;
      // POR_LOTE o POR_UNIDAD. Vacío o desconocido cae a POR_UNIDAD, que es el
      // defecto del modelo: una plantilla vieja, sin esta columna, se importa
      // igual y con el mismo resultado que antes.
      const tipoCantidadFila = this.textoPlano(
        this.valorFila(row, ['TIPO_CANTIDAD', 'TIPO CANTIDAD', 'TIPO']),
      )
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

      receta.componentes.push({
        insumoCodigo,
        cantidadBase,
        tipoCantidad:
          tipoCantidadFila === 'POR_LOTE' ? 'POR_LOTE' : 'POR_UNIDAD',
        unidadBase:
          this.textoPlano(this.valorFila(row, ['UMB_BASE', 'UNIDAD_BASE'])) ||
          'UN',
        orden: Math.max(
          1,
          Math.round(
            this.numeroSeguro(
              this.valorFila(row, ['ORDEN']),
              receta.componentes.length + 1,
            ),
          ),
        ),
      });
    }

    resumen.recetas.total = recetasAgrupadas.size;

    if (recetasAgrupadas.size > 0) {
      const codigosProductos = new Set<string>();
      recetasAgrupadas.forEach((receta) => {
        codigosProductos.add(receta.productoFinalCodigo);
        receta.componentes.forEach((comp) =>
          codigosProductos.add(comp.insumoCodigo),
        );
      });

      const productosLookup = await this.prisma.producto.findMany({
        where: {
          empresaId,
          codigo: { in: Array.from(codigosProductos) },
          estado: { not: 'PLACEHOLDER' as any },
        },
        select: { id: true, codigo: true },
      });
      const productoPorCodigo = new Map<string, number>();
      for (const p of productosLookup) {
        productoPorCodigo.set(this.clavePlano(p.codigo), p.id);
      }

      for (const receta of recetasAgrupadas.values()) {
        try {
          const productoFinalId = productoPorCodigo.get(
            this.clavePlano(receta.productoFinalCodigo),
          );
          if (!productoFinalId) {
            throw new BadRequestException(
              `Receta ${receta.codigo}: producto final ${receta.productoFinalCodigo} no existe.`,
            );
          }

          const componentesDto = receta.componentes.map((comp) => {
            const productoInsumoId = productoPorCodigo.get(
              this.clavePlano(comp.insumoCodigo),
            );
            if (!productoInsumoId) {
              throw new BadRequestException(
                `Receta ${receta.codigo}: insumo ${comp.insumoCodigo} no existe.`,
              );
            }
            return {
              productoInsumoId,
              cantidadBase: comp.cantidadBase,
              unidadBase: comp.unidadBase,
              tipoCantidad: comp.tipoCantidad,
              orden: comp.orden,
            };
          });

          const dto = {
            productoFinalId,
            codigo: receta.codigo,
            nombre: receta.nombre,
            version: receta.version,
            rendimientoObjetivo: receta.rendimientoObjetivo,
            unidadRendimiento: receta.unidadRendimiento,
            mermaObjetivoPorcentaje: receta.mermaObjetivoPorcentaje,
            componentes: componentesDto,
          };

          const recetaExistente = await this.prisma.recetaProduccion.findFirst({
            where: {
              empresaId,
              codigo: receta.codigo,
              version: receta.version,
            },
            select: { id: true },
          });

          if (recetaExistente) {
            await this.actualizarReceta(empresaId, recetaExistente.id, dto);
            resumen.recetas.actualizadas += 1;
          } else {
            await this.crearReceta(empresaId, dto);
            resumen.recetas.creadas += 1;
          }
        } catch (error: any) {
          resumen.recetas.fallidas += 1;
          resumen.recetas.errores.push(
            error?.response?.message ||
              error?.message ||
              `Error en receta ${receta.codigo}`,
          );
        }
      }
    }

    if (ordenesRows.length > 0) {
      const recetasDisponibles = await this.prisma.recetaProduccion.findMany({
        where: { empresaId, activo: true },
        select: { id: true, codigo: true, version: true },
      });
      const recetaPorCodigoVersion = new Map<string, number>();
      for (const receta of recetasDisponibles) {
        recetaPorCodigoVersion.set(
          `${this.clavePlano(receta.codigo)}__${receta.version}`,
          receta.id,
        );
      }

      for (let index = 0; index < ordenesRows.length; index++) {
        const row = ordenesRows[index];
        const fila = index + 2;
        try {
          const loteProduccion = this.textoPlano(
            this.valorFila(row, ['LOTE_PRODUCCION', 'LOTE']),
          );
          const recetaCodigo = this.textoPlano(
            this.valorFila(row, ['RECETA_CODIGO', 'RECETA']),
          );
          const recetaVersion = Math.max(
            1,
            Math.round(
              this.numeroSeguro(
                this.valorFila(row, ['RECETA_VERSION', 'VERSION']),
                1,
              ),
            ),
          );
          const cantidadObjetivo = this.numeroSeguro(
            this.valorFila(row, ['CANTIDAD_OBJETIVO', 'CANTIDAD']),
            0,
          );
          const fechaProgramada = this.fechaExcelAISO(
            this.valorFila(row, ['FECHA_PROGRAMADA', 'FECHA']),
          );
          const observaciones = this.textoPlano(
            this.valorFila(row, ['OBSERVACIONES', 'OBS']),
          );

          if (!loteProduccion && !recetaCodigo && !cantidadObjetivo) continue;
          if (!loteProduccion || !recetaCodigo || cantidadObjetivo <= 0) {
            throw new BadRequestException(
              `Fila ORDENES ${fila}: LOTE_PRODUCCION, RECETA_CODIGO y CANTIDAD_OBJETIVO son obligatorios.`,
            );
          }

          const recetaId = recetaPorCodigoVersion.get(
            `${this.clavePlano(recetaCodigo)}__${recetaVersion}`,
          );
          if (!recetaId) {
            throw new BadRequestException(
              `Fila ORDENES ${fila}: receta ${recetaCodigo} v${recetaVersion} no encontrada.`,
            );
          }

          await this.crearOrden(empresaId, {
            recetaId,
            loteProduccion,
            cantidadObjetivo,
            fechaProgramada,
            observaciones: observaciones || undefined,
            usuarioResponsableId: usuarioId,
          } as any);
          resumen.ordenes.creadas += 1;
        } catch (error: any) {
          resumen.ordenes.fallidas += 1;
          resumen.ordenes.errores.push(
            error?.response?.message ||
              error?.message ||
              `Error en orden fila ${fila}`,
          );
        }
      }
    }

    return resumen;
  }
}
