import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KardexService } from '../kardex/kardex.service';
import {
  ActualizarGastoImportacionDto,
  ActualizarImportacionDto,
  CrearGastoImportacionDto,
  CrearImportacionDto,
  NacionalizarImportacionDto,
} from './dto/importacion.dto';

// Gastos que representan crédito fiscal (IGV, percepción) NO capitalizan al
// costo del producto — se recuperan vía SUNAT, no forman parte del costo.
const TIPOS_NO_CAPITALIZAN = new Set(['IGV_IMPORTACION', 'IPM', 'PERCEPCION']);

type ItemCalc = {
  id: number;
  productoId: number;
  cantidad: number;
  pesoKg: number;
  volumenM3: number;
  adValoremPorcentaje: number | null;
  costoFobPen: number;
  gastosAsignados: number;
};

/**
 * Importaciones: expediente de importación (proveedor extranjero) →
 * gastos asociados (flete, seguro, ad valorem, IGV, agencia, almacén...) →
 * liquidación (prorrateo de gastos entre ítems) → nacionalización
 * (ingreso a almacén vía Kardex con el costo unitario ya nacionalizado).
 */
@Injectable()
export class ImportacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kardexService: KardexService,
  ) {}

  static formatNumero(numero: number): string {
    return `IMP-${String(numero).padStart(6, '0')}`;
  }

  private defaultAfectaCosto(tipo: string): boolean {
    return !TIPOS_NO_CAPITALIZAN.has(tipo);
  }

  private async generarNumero(empresaId: number): Promise<string> {
    const ultimo = await this.prisma.importacion.findFirst({
      where: { empresaId },
      orderBy: { id: 'desc' },
      select: { numero: true },
    });
    let siguiente = 1;
    const match = ultimo?.numero?.match(/(\d+)\s*$/);
    if (match) siguiente = parseInt(match[1], 10) + 1;
    return ImportacionesService.formatNumero(siguiente);
  }

  private async validarProveedorYProductos(
    empresaId: number,
    proveedorId: number,
    productoIds: number[],
  ) {
    const proveedor = await this.prisma.cliente.findFirst({
      where: { id: proveedorId, empresaId },
      select: { id: true },
    });
    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');

    const idsUnicos = [...new Set(productoIds)];
    const productos = await this.prisma.producto.findMany({
      where: { id: { in: idsUnicos }, empresaId },
      select: { id: true, descripcion: true },
    });
    if (productos.length !== idsUnicos.length) {
      throw new BadRequestException(
        'Uno o más productos no pertenecen a la empresa',
      );
    }
    return new Map(productos.map((p) => [p.id, p]));
  }

  async crear(
    empresaId: number,
    usuarioId: number,
    dto: CrearImportacionDto,
    reqSedeId?: number,
  ) {
    if (!dto.items?.length) {
      throw new BadRequestException(
        'La importación debe tener al menos un ítem',
      );
    }
    const productosMap = await this.validarProveedorYProductos(
      empresaId,
      dto.proveedorId,
      dto.items.map((i) => i.productoId),
    );

    const numero = await this.generarNumero(empresaId);

    return this.prisma.importacion.create({
      data: {
        empresaId,
        sedeId: dto.sedeId ?? reqSedeId ?? null,
        usuarioId,
        proveedorId: dto.proveedorId,
        numero,
        descripcion: dto.descripcion,
        numeroFactura: dto.numeroFactura,
        numeroDua: dto.numeroDua,
        incoterm: dto.incoterm || 'FOB',
        moneda: dto.moneda || 'USD',
        tipoCambio: dto.tipoCambio ?? 1,
        fechaEmbarque: dto.fechaEmbarque ? new Date(dto.fechaEmbarque) : undefined,
        fechaLlegada: dto.fechaLlegada ? new Date(dto.fechaLlegada) : undefined,
        observaciones: dto.observaciones,
        items: {
          create: dto.items.map((item) => ({
            productoId: item.productoId,
            descripcion:
              item.descripcion || productosMap.get(item.productoId)?.descripcion || '',
            cantidad: item.cantidad,
            unidad: item.unidad || 'UND',
            precioFobUnitario: item.precioFobUnitario,
            pesoKg: item.pesoKg,
            volumenM3: item.volumenM3,
            partidaArancelaria: item.partidaArancelaria,
            adValoremPorcentaje: item.adValoremPorcentaje,
          })),
        },
      },
      include: {
        items: { include: { producto: { select: { codigo: true, descripcion: true } } } },
      },
    });
  }

  async listar(empresaId: number, query: any) {
    const where: any = { empresaId };
    if (query?.estado) where.estado = query.estado;
    if (query?.search) {
      const search = String(query.search);
      where.OR = [
        { numero: { contains: search, mode: 'insensitive' } },
        { numeroFactura: { contains: search, mode: 'insensitive' } },
        { numeroDua: { contains: search, mode: 'insensitive' } },
        { proveedor: { nombre: { contains: search, mode: 'insensitive' } } },
      ];
    }
    return this.prisma.importacion.findMany({
      where,
      include: {
        proveedor: { select: { id: true, nombre: true, nroDoc: true } },
        _count: { select: { items: true, gastos: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async obtener(empresaId: number, id: number) {
    const importacion = await this.prisma.importacion.findFirst({
      where: { id, empresaId },
      include: {
        proveedor: {
          select: { id: true, nombre: true, nroDoc: true, direccion: true, email: true },
        },
        sede: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
        items: {
          include: {
            producto: {
              select: { id: true, codigo: true, descripcion: true, costoPromedio: true, stock: true },
            },
          },
        },
        gastos: { orderBy: { creadoEn: 'asc' } },
      },
    });
    if (!importacion) throw new NotFoundException('Importación no encontrada');
    return importacion;
  }

  private async obtenerParaEditar(empresaId: number, id: number) {
    const importacion = await this.prisma.importacion.findFirst({ where: { id, empresaId } });
    if (!importacion) throw new NotFoundException('Importación no encontrada');
    return importacion;
  }

  async actualizar(empresaId: number, id: number, dto: ActualizarImportacionDto) {
    const importacion = await this.obtenerParaEditar(empresaId, id);
    if (importacion.estado === 'NACIONALIZADA') {
      throw new BadRequestException(
        'No se puede editar una importación ya nacionalizada',
      );
    }
    if (!dto.items?.length) {
      throw new BadRequestException(
        'La importación debe tener al menos un ítem',
      );
    }
    const productosMap = await this.validarProveedorYProductos(
      empresaId,
      dto.proveedorId,
      dto.items.map((i) => i.productoId),
    );

    await this.prisma.$transaction([
      this.prisma.importacionItem.deleteMany({ where: { importacionId: id } }),
      this.prisma.importacion.update({
        where: { id },
        data: {
          proveedorId: dto.proveedorId,
          sedeId: dto.sedeId ?? importacion.sedeId,
          moneda: dto.moneda || importacion.moneda,
          tipoCambio: dto.tipoCambio ?? importacion.tipoCambio,
          incoterm: dto.incoterm || importacion.incoterm,
          numeroFactura: dto.numeroFactura,
          numeroDua: dto.numeroDua,
          descripcion: dto.descripcion,
          fechaEmbarque: dto.fechaEmbarque ? new Date(dto.fechaEmbarque) : null,
          fechaLlegada: dto.fechaLlegada ? new Date(dto.fechaLlegada) : null,
          observaciones: dto.observaciones,
          items: {
            create: dto.items.map((item) => ({
              productoId: item.productoId,
              descripcion:
                item.descripcion || productosMap.get(item.productoId)?.descripcion || '',
              cantidad: item.cantidad,
              unidad: item.unidad || 'UND',
              precioFobUnitario: item.precioFobUnitario,
              pesoKg: item.pesoKg,
              volumenM3: item.volumenM3,
              partidaArancelaria: item.partidaArancelaria,
              adValoremPorcentaje: item.adValoremPorcentaje,
            })),
          },
        },
      }),
    ]);

    return this.obtener(empresaId, id);
  }

  async cambiarEstado(
    empresaId: number,
    id: number,
    estado: 'EN_TRANSITO' | 'EN_ADUANA' | 'ANULADA',
  ) {
    const importacion = await this.obtenerParaEditar(empresaId, id);
    if (importacion.estado === 'NACIONALIZADA') {
      throw new BadRequestException(
        'No se puede cambiar el estado de una importación ya nacionalizada',
      );
    }
    return this.prisma.importacion.update({ where: { id }, data: { estado } });
  }

  // ── Gastos asociados ────────────────────────────────────────────────────

  async agregarGasto(empresaId: number, id: number, dto: CrearGastoImportacionDto) {
    const importacion = await this.obtenerParaEditar(empresaId, id);
    if (importacion.estado === 'NACIONALIZADA') {
      throw new BadRequestException(
        'No se pueden modificar gastos de una importación ya nacionalizada',
      );
    }
    const moneda = dto.moneda || 'PEN';
    const tipoCambio =
      dto.tipoCambio ?? (moneda === 'PEN' ? 1 : Number(importacion.tipoCambio));
    const montoPen =
      moneda === 'PEN' ? dto.monto : Number((dto.monto * tipoCambio).toFixed(2));

    return this.prisma.importacionGasto.create({
      data: {
        importacionId: id,
        tipo: dto.tipo,
        descripcion: dto.descripcion,
        proveedorNombre: dto.proveedorNombre,
        numeroDocumento: dto.numeroDocumento,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        moneda,
        tipoCambio,
        monto: dto.monto,
        montoPen,
        afectaCosto: dto.afectaCosto ?? this.defaultAfectaCosto(dto.tipo),
        baseProrrateo: dto.baseProrrateo || 'VALOR',
      },
    });
  }

  private async obtenerGasto(empresaId: number, id: number, gastoId: number) {
    const gasto = await this.prisma.importacionGasto.findFirst({
      where: { id: gastoId, importacionId: id, importacion: { empresaId } },
      include: { importacion: { select: { estado: true, tipoCambio: true } } },
    });
    if (!gasto) throw new NotFoundException('Gasto no encontrado');
    return gasto;
  }

  async actualizarGasto(
    empresaId: number,
    id: number,
    gastoId: number,
    dto: ActualizarGastoImportacionDto,
  ) {
    const gasto = await this.obtenerGasto(empresaId, id, gastoId);
    if (gasto.importacion.estado === 'NACIONALIZADA') {
      throw new BadRequestException(
        'No se pueden modificar gastos de una importación ya nacionalizada',
      );
    }
    const moneda = dto.moneda || 'PEN';
    const tipoCambio =
      dto.tipoCambio ?? (moneda === 'PEN' ? 1 : Number(gasto.importacion.tipoCambio));
    const montoPen =
      moneda === 'PEN' ? dto.monto : Number((dto.monto * tipoCambio).toFixed(2));

    return this.prisma.importacionGasto.update({
      where: { id: gastoId },
      data: {
        tipo: dto.tipo,
        descripcion: dto.descripcion,
        proveedorNombre: dto.proveedorNombre,
        numeroDocumento: dto.numeroDocumento,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
        moneda,
        tipoCambio,
        monto: dto.monto,
        montoPen,
        afectaCosto: dto.afectaCosto ?? this.defaultAfectaCosto(dto.tipo),
        baseProrrateo: dto.baseProrrateo || 'VALOR',
      },
    });
  }

  async eliminarGasto(empresaId: number, id: number, gastoId: number) {
    const gasto = await this.obtenerGasto(empresaId, id, gastoId);
    if (gasto.importacion.estado === 'NACIONALIZADA') {
      throw new BadRequestException(
        'No se pueden modificar gastos de una importación ya nacionalizada',
      );
    }
    await this.prisma.importacionGasto.delete({ where: { id: gastoId } });
    return { ok: true };
  }

  // ── Liquidación ──────────────────────────────────────────────────────────

  private distribuirBasis(baseProrrateo: string, items: ItemCalc[]): number[] {
    switch (baseProrrateo) {
      case 'PESO':
        return items.map((i) => i.pesoKg * i.cantidad);
      case 'VOLUMEN':
        return items.map((i) => i.volumenM3 * i.cantidad);
      case 'CANTIDAD':
        return items.map((i) => i.cantidad);
      case 'VALOR':
      default:
        return items.map((i) => i.costoFobPen);
    }
  }

  private asignarProrrateo(
    montoPen: number,
    basis: number[],
    items: ItemCalc[],
  ): number[] {
    const total = basis.reduce((s, b) => s + b, 0);
    if (total > 0) return basis.map((b) => (montoPen * b) / total);
    // Fallback: si la base elegida no tiene datos (ej. sin peso/volumen), se
    // reparte proporcional al valor FOB; si tampoco hay valor, en partes iguales.
    const valorBasis = items.map((i) => i.costoFobPen);
    const totalValor = valorBasis.reduce((s, b) => s + b, 0);
    if (totalValor > 0) return valorBasis.map((v) => (montoPen * v) / totalValor);
    const n = items.length || 1;
    return items.map(() => montoPen / n);
  }

  async liquidar(empresaId: number, id: number) {
    const importacion = await this.prisma.importacion.findFirst({
      where: { id, empresaId },
      include: { items: true, gastos: true },
    });
    if (!importacion) throw new NotFoundException('Importación no encontrada');
    if (importacion.estado === 'NACIONALIZADA') {
      throw new BadRequestException(
        'La importación ya fue nacionalizada; no se puede re-liquidar',
      );
    }
    if (importacion.estado === 'ANULADA') {
      throw new BadRequestException('La importación está anulada');
    }
    if (!importacion.items.length) {
      throw new BadRequestException('La importación no tiene ítems');
    }

    const tipoCambio = Number(importacion.tipoCambio) || 1;
    const esPen = (importacion.moneda || 'USD').toUpperCase() === 'PEN';
    const factorFobPen = esPen ? 1 : tipoCambio;

    // 1) Costo FOB en PEN por ítem + totales
    const itemsCalc: ItemCalc[] = importacion.items.map((item) => {
      const cantidad = Number(item.cantidad);
      const precioFobUnitario = Number(item.precioFobUnitario);
      const costoFobPen = Number((cantidad * precioFobUnitario * factorFobPen).toFixed(2));
      return {
        id: item.id,
        productoId: item.productoId,
        cantidad,
        pesoKg: Number(item.pesoKg || 0),
        volumenM3: Number(item.volumenM3 || 0),
        adValoremPorcentaje:
          item.adValoremPorcentaje != null ? Number(item.adValoremPorcentaje) : null,
        costoFobPen,
        gastosAsignados: 0,
      };
    });
    const valorFob = Number(
      importacion.items
        .reduce((s, i) => s + Number(i.cantidad) * Number(i.precioFobUnitario), 0)
        .toFixed(2),
    );
    const valorFobPen = Number(itemsCalc.reduce((s, i) => s + i.costoFobPen, 0).toFixed(2));

    // Los gastos "AD_VALOREM / Calculado" de una liquidación previa se recalculan
    // desde cero; el resto de gastos ingresados manualmente se respeta tal cual.
    const gastosManuales = importacion.gastos.filter(
      (g) => !(g.tipo === 'AD_VALOREM' && g.descripcion === 'Calculado'),
    );

    // 2) Base CIF (FOB + flete + seguro) por ítem, para el ad valorem automático
    const fleteSeguroShare = itemsCalc.map(() => 0);
    for (const gasto of gastosManuales) {
      if (!gasto.afectaCosto) continue;
      if (gasto.tipo !== 'FLETE_INTERNACIONAL' && gasto.tipo !== 'SEGURO') continue;
      const basis = this.distribuirBasis(gasto.baseProrrateo, itemsCalc);
      const asignado = this.asignarProrrateo(Number(gasto.montoPen), basis, itemsCalc);
      asignado.forEach((v, idx) => (fleteSeguroShare[idx] += v));
    }

    // 3) Ad valorem: usar el gasto manual si existe; si no, calcularlo por ítem
    // a partir de adValoremPorcentaje sobre el valor CIF.
    const gastoAdValoremManual = gastosManuales.find((g) => g.tipo === 'AD_VALOREM');
    const adValoremDirecto = itemsCalc.map(() => 0);
    let totalAdValoremCalculado = 0;

    if (!gastoAdValoremManual) {
      const tienePorcentaje = itemsCalc.some(
        (i) => i.adValoremPorcentaje != null && i.adValoremPorcentaje > 0,
      );
      if (tienePorcentaje) {
        itemsCalc.forEach((item, idx) => {
          const pct = item.adValoremPorcentaje || 0;
          const cif = item.costoFobPen + fleteSeguroShare[idx];
          const monto = Number((cif * (pct / 100)).toFixed(2));
          adValoremDirecto[idx] = monto;
          totalAdValoremCalculado += monto;
        });
        totalAdValoremCalculado = Number(totalAdValoremCalculado.toFixed(2));
      }
    }

    // 4) Persistir el gasto AD_VALOREM autocalculado (crear/actualizar/eliminar)
    const gastoCalculadoPrevio = importacion.gastos.find(
      (g) => g.tipo === 'AD_VALOREM' && g.descripcion === 'Calculado',
    );
    if (totalAdValoremCalculado > 0) {
      if (gastoCalculadoPrevio) {
        await this.prisma.importacionGasto.update({
          where: { id: gastoCalculadoPrevio.id },
          data: {
            monto: totalAdValoremCalculado,
            montoPen: totalAdValoremCalculado,
            moneda: 'PEN',
            tipoCambio: 1,
            afectaCosto: true,
            baseProrrateo: 'VALOR',
          },
        });
      } else {
        await this.prisma.importacionGasto.create({
          data: {
            importacionId: id,
            tipo: 'AD_VALOREM',
            descripcion: 'Calculado',
            moneda: 'PEN',
            tipoCambio: 1,
            monto: totalAdValoremCalculado,
            montoPen: totalAdValoremCalculado,
            afectaCosto: true,
            baseProrrateo: 'VALOR',
          },
        });
      }
    } else if (gastoCalculadoPrevio) {
      await this.prisma.importacionGasto.delete({ where: { id: gastoCalculadoPrevio.id } });
    }

    // 5) Distribuir todos los gastos que capitalizan (el ad valorem autocalculado
    // ya viene asignado directo por ítem, no se vuelve a prorratear).
    for (const gasto of gastosManuales) {
      if (!gasto.afectaCosto) continue;
      const basis = this.distribuirBasis(gasto.baseProrrateo, itemsCalc);
      const asignado = this.asignarProrrateo(Number(gasto.montoPen), basis, itemsCalc);
      asignado.forEach((v, idx) => (itemsCalc[idx].gastosAsignados += v));
    }
    adValoremDirecto.forEach((v, idx) => (itemsCalc[idx].gastosAsignados += v));

    // 6) Totales de cabecera
    let totalGastosCosto = 0;
    let totalGastosNoCosto = 0;
    for (const gasto of gastosManuales) {
      if (gasto.afectaCosto) totalGastosCosto += Number(gasto.montoPen);
      else totalGastosNoCosto += Number(gasto.montoPen);
    }
    totalGastosCosto = Number((totalGastosCosto + totalAdValoremCalculado).toFixed(2));
    totalGastosNoCosto = Number(totalGastosNoCosto.toFixed(2));

    const costoTotalNacionalizado = Number((valorFobPen + totalGastosCosto).toFixed(2));
    const factorCosto =
      valorFobPen > 0 ? Number((costoTotalNacionalizado / valorFobPen).toFixed(6)) : 1;

    // 7) Persistir ítems + cabecera
    await this.prisma.$transaction([
      ...itemsCalc.map((item) => {
        const gastosAsignados = Number(item.gastosAsignados.toFixed(2));
        const costoTotalPen = Number((item.costoFobPen + gastosAsignados).toFixed(2));
        const costoUnitarioFinal =
          item.cantidad > 0 ? Number((costoTotalPen / item.cantidad).toFixed(4)) : 0;
        return this.prisma.importacionItem.update({
          where: { id: item.id },
          data: { costoFobPen: item.costoFobPen, gastosAsignados, costoTotalPen, costoUnitarioFinal },
        });
      }),
      this.prisma.importacion.update({
        where: { id },
        data: {
          valorFob,
          valorFobPen,
          totalGastosCosto,
          totalGastosNoCosto,
          costoTotalNacionalizado,
          factorCosto,
          estado: 'LIQUIDADA',
        },
      }),
    ]);

    const detalle: any = await this.obtener(empresaId, id);
    detalle.items = detalle.items.map((item: any) => {
      const costoPromedioActual = Number(item.producto?.costoPromedio || 0);
      const costoUnitarioFinal = Number(item.costoUnitarioFinal || 0);
      const variacionPorcentaje =
        costoPromedioActual > 0
          ? Number((((costoUnitarioFinal - costoPromedioActual) / costoPromedioActual) * 100).toFixed(2))
          : null;
      return { ...item, costoPromedioActual, variacionPorcentaje };
    });
    return detalle;
  }

  // ── Nacionalización (ingreso a almacén vía Kardex) ─────────────────────

  async nacionalizar(
    empresaId: number,
    usuarioId: number,
    id: number,
    dto: NacionalizarImportacionDto,
    reqSedeId?: number,
  ) {
    const importacion = await this.prisma.importacion.findFirst({
      where: { id, empresaId },
      include: { items: true },
    });
    if (!importacion) throw new NotFoundException('Importación no encontrada');
    if (importacion.estado === 'NACIONALIZADA') {
      throw new BadRequestException('La importación ya fue nacionalizada');
    }
    if (importacion.estado !== 'LIQUIDADA') {
      throw new BadRequestException(
        'Debe liquidar la importación antes de nacionalizarla',
      );
    }

    const sedeId = dto.sedeId ?? importacion.sedeId ?? reqSedeId;
    if (!sedeId) {
      throw new BadRequestException('Debe indicar la sede donde ingresará la mercadería');
    }

    for (const item of importacion.items) {
      await this.kardexService.registrarMovimiento({
        empresaId,
        productoId: item.productoId,
        tipoMovimiento: 'INGRESO',
        concepto: `IMPORTACIÓN ${importacion.numero} DUA ${importacion.numeroDua || '-'}`,
        cantidad: Number(item.cantidad),
        costoUnitario: Number(item.costoUnitarioFinal),
        sedeId,
        usuarioId,
      });
    }

    return this.prisma.importacion.update({
      where: { id },
      data: {
        estado: 'NACIONALIZADA',
        sedeId,
        fechaNacionalizacion: dto.fechaNacionalizacion
          ? new Date(dto.fechaNacionalizacion)
          : new Date(),
      },
    });
  }
}
