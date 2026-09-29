import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrigenAsiento, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { totalesCuadre, validarCuadre } from './asiento-cuadre';
import { CrearAsientoDto, ExtornarAsientoDto } from './dto/asiento.dto';

export interface LineaAsiento {
  cuenta: string;
  debe: number;
  haber: number;
  glosa?: string | null;
  tipoDocSunat?: string | null;
  serie?: string | null;
  numero?: string | null;
  fechaVencimiento?: Date | string | null;
}

/** Lo que necesita `registrar()`; lo usan el asiento manual y los generados. */
export interface NuevoAsiento {
  fecha: Date;
  glosa: string;
  origen: OrigenAsiento;
  origenId?: number | null;
  sedeId?: number | null;
  moneda?: string;
  tipoCambio?: number | null;
  lineas: LineaAsiento[];
  extornaAId?: number | null;
}

const INCLUIR = {
  detalles: {
    orderBy: { orden: 'asc' as const },
    include: { cuenta: { select: { codigo: true, denominacion: true } } },
  },
  sede: { select: { id: true, nombre: true } },
  creadoPor: { select: { id: true, nombre: true } },
  extornaA: { select: { id: true, cuo: true } },
  extornadoPor: { select: { id: true, cuo: true } },
} satisfies Prisma.AsientoInclude;

type AsientoCompleto = Prisma.AsientoGetPayload<{ include: typeof INCLUIR }>;

@Injectable()
export class LibroDiarioService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────── Plan de cuentas ─────────────────────────

  async planCuentas(empresaId: number, soloImputables = false) {
    return this.prisma.cuentaContable.findMany({
      where: {
        empresaId,
        activa: true,
        ...(soloImputables ? { imputable: true } : {}),
      },
      orderBy: { codigo: 'asc' },
      select: {
        id: true,
        codigo: true,
        denominacion: true,
        nivel: true,
        naturaleza: true,
        imputable: true,
        padreId: true,
      },
    });
  }

  // ───────────────────────── Períodos ─────────────────────────

  /** Año y mes en hora de Lima (UTC-5, sin horario de verano). */
  periodoDe(fecha: Date) {
    const lima = new Date(fecha.getTime() - 5 * 60 * 60 * 1000);
    return { anio: lima.getUTCFullYear(), mes: lima.getUTCMonth() + 1 };
  }

  async listarPeriodos(empresaId: number) {
    const periodos = await this.prisma.periodoContable.findMany({
      where: { empresaId },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      include: {
        _count: { select: { asientos: true } },
        cerradoPor: { select: { nombre: true } },
      },
    });
    const sumas = await this.prisma.asiento.groupBy({
      by: ['periodoId'],
      where: { empresaId },
      _sum: { totalDebe: true, totalHaber: true },
    });
    const porPeriodo = new Map(sumas.map((s) => [s.periodoId, s._sum]));
    return periodos.map((p) => ({
      id: p.id,
      anio: p.anio,
      mes: p.mes,
      estado: p.estado,
      cerradoEn: p.cerradoEn,
      cerradoPor: p.cerradoPor?.nombre ?? null,
      asientos: p._count.asientos,
      totalDebe: Number(porPeriodo.get(p.id)?.totalDebe ?? 0),
      totalHaber: Number(porPeriodo.get(p.id)?.totalHaber ?? 0),
    }));
  }

  private validarPeriodo(anio: number, mes: number) {
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100)
      throw new BadRequestException('Año inválido');
    if (!Number.isInteger(mes) || mes < 1 || mes > 12)
      throw new BadRequestException('Mes inválido');
  }

  async obtenerOAbrirPeriodo(empresaId: number, anio: number, mes: number) {
    this.validarPeriodo(anio, mes);
    return this.prisma.periodoContable.upsert({
      where: { empresaId_anio_mes: { empresaId, anio, mes } },
      update: {},
      create: { empresaId, anio, mes },
    });
  }

  async cerrarPeriodo(
    empresaId: number,
    anio: number,
    mes: number,
    usuarioId: number,
  ) {
    const periodo = await this.obtenerOAbrirPeriodo(empresaId, anio, mes);
    if (periodo.estado === 'CERRADO')
      throw new BadRequestException(
        `El período ${mes}/${anio} ya está cerrado`,
      );
    return this.prisma.periodoContable.update({
      where: { id: periodo.id },
      data: {
        estado: 'CERRADO',
        cerradoEn: new Date(),
        cerradoPorId: usuarioId,
      },
    });
  }

  async reabrirPeriodo(empresaId: number, anio: number, mes: number) {
    this.validarPeriodo(anio, mes);
    const periodo = await this.prisma.periodoContable.findUnique({
      where: { empresaId_anio_mes: { empresaId, anio, mes } },
    });
    if (!periodo || periodo.estado === 'ABIERTO')
      throw new BadRequestException(
        `El período ${mes}/${anio} no está cerrado`,
      );
    return this.prisma.periodoContable.update({
      where: { id: periodo.id },
      data: { estado: 'ABIERTO', cerradoEn: null, cerradoPorId: null },
    });
  }

  // ───────────────────────── Asientos ─────────────────────────

  private serializar(a: AsientoCompleto) {
    return {
      ...a,
      tipoCambio: a.tipoCambio == null ? null : Number(a.tipoCambio),
      totalDebe: Number(a.totalDebe),
      totalHaber: Number(a.totalHaber),
      detalles: a.detalles.map((d) => ({
        ...d,
        debe: Number(d.debe),
        haber: Number(d.haber),
      })),
    };
  }

  /**
   * El único camino para que un asiento entre a la base. Valida el cuadre, que
   * el período esté abierto y que las cuentas existan y sean imputables; asigna
   * el correlativo dentro del período y el CUO. Reintenta si dos asientos
   * compiten por el mismo correlativo.
   */
  async registrar(
    empresaId: number,
    usuarioId: number | null,
    datos: NuevoAsiento,
  ) {
    const errores = validarCuadre(datos.lineas);
    if (errores.length) throw new BadRequestException(errores.join(' · '));

    const fecha = new Date(datos.fecha);
    if (Number.isNaN(fecha.getTime()))
      throw new BadRequestException('Fecha inválida');
    const { anio, mes } = this.periodoDe(fecha);
    const periodo = await this.obtenerOAbrirPeriodo(empresaId, anio, mes);
    if (periodo.estado === 'CERRADO') {
      throw new BadRequestException(
        `El período ${String(mes).padStart(2, '0')}/${anio} está cerrado: reábrelo antes de registrar`,
      );
    }

    const codigos = [
      ...new Set(datos.lineas.map((l) => String(l.cuenta).trim())),
    ];
    const cuentas = await this.prisma.cuentaContable.findMany({
      where: { empresaId, codigo: { in: codigos } },
      select: {
        id: true,
        codigo: true,
        denominacion: true,
        activa: true,
        imputable: true,
      },
    });
    const porCodigo = new Map(cuentas.map((c) => [c.codigo, c]));
    for (const codigo of codigos) {
      const c = porCodigo.get(codigo);
      if (!c)
        throw new BadRequestException(
          `La cuenta ${codigo} no existe en el plan`,
        );
      if (!c.activa)
        throw new BadRequestException(`La cuenta ${codigo} está inactiva`);
      if (!c.imputable) {
        throw new BadRequestException(
          `La cuenta ${codigo} ${c.denominacion} no recibe movimientos: usa una de último nivel`,
        );
      }
    }

    if (datos.origenId != null) {
      const previo = await this.prisma.asiento.findFirst({
        where: {
          empresaId,
          origen: datos.origen,
          origenId: datos.origenId,
          estado: 'REGISTRADO',
        },
        select: { cuo: true },
      });
      if (previo) {
        throw new ConflictException(
          `Este documento ya tiene el asiento ${previo.cuo}; extórnalo antes de volver a generarlo`,
        );
      }
    }

    if (datos.sedeId != null) {
      const sede = await this.prisma.sede.findFirst({
        where: { id: datos.sedeId, empresaId },
        select: { id: true },
      });
      if (!sede)
        throw new BadRequestException('La sede no pertenece a la empresa');
    }

    const { debe, haber } = totalesCuadre(datos.lineas);
    const detalles = datos.lineas.map((l, i) => ({
      orden: i + 1,
      cuentaId: porCodigo.get(String(l.cuenta).trim())!.id,
      debe: Number(l.debe ?? 0),
      haber: Number(l.haber ?? 0),
      glosa: l.glosa?.trim() || null,
      tipoDocSunat: l.tipoDocSunat ?? null,
      serie: l.serie ?? null,
      numero: l.numero ?? null,
      fechaVencimiento: l.fechaVencimiento
        ? new Date(l.fechaVencimiento)
        : null,
    }));

    for (let intento = 1; ; intento++) {
      try {
        const creado = await this.prisma.$transaction(async (tx) => {
          const ultimo = await tx.asiento.aggregate({
            where: { periodoId: periodo.id },
            _max: { correlativo: true },
          });
          const correlativo = (ultimo._max.correlativo ?? 0) + 1;
          const cuo = `${anio}${String(mes).padStart(2, '0')}-${String(correlativo).padStart(6, '0')}`;
          return tx.asiento.create({
            data: {
              empresaId,
              sedeId: datos.sedeId ?? null,
              periodoId: periodo.id,
              correlativo,
              cuo,
              fecha,
              glosa: datos.glosa.trim(),
              origen: datos.origen,
              origenId: datos.origenId ?? null,
              moneda: datos.moneda ?? 'PEN',
              tipoCambio: datos.tipoCambio ?? null,
              totalDebe: debe,
              totalHaber: haber,
              extornaAId: datos.extornaAId ?? null,
              creadoPorId: usuarioId,
              detalles: { create: detalles },
            },
            include: INCLUIR,
          });
        });
        return this.serializar(creado);
      } catch (e) {
        // Otro asiento se llevó el correlativo entre el aggregate y el create.
        const choque =
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002';
        if (!choque || intento >= 3) throw e;
      }
    }
  }

  async registrarManual(
    empresaId: number,
    usuarioId: number,
    sedeUsuario: number | null,
    dto: CrearAsientoDto,
  ) {
    return this.registrar(empresaId, usuarioId, {
      fecha: new Date(dto.fecha),
      glosa: dto.glosa,
      origen: 'MANUAL',
      sedeId: dto.sedeId ?? sedeUsuario ?? null,
      moneda: dto.moneda,
      tipoCambio: dto.tipoCambio,
      lineas: dto.lineas,
    });
  }

  async listar(
    empresaId: number,
    anio: number,
    mes: number,
    filtros: { sedeId?: number; origen?: OrigenAsiento } = {},
  ) {
    this.validarPeriodo(anio, mes);
    const periodo = await this.prisma.periodoContable.findUnique({
      where: { empresaId_anio_mes: { empresaId, anio, mes } },
    });
    if (!periodo) {
      return {
        periodo: null,
        asientos: [],
        totales: { debe: 0, haber: 0, asientos: 0 },
      };
    }
    const asientos = await this.prisma.asiento.findMany({
      where: {
        periodoId: periodo.id,
        ...(filtros.sedeId ? { sedeId: filtros.sedeId } : {}),
        ...(filtros.origen ? { origen: filtros.origen } : {}),
      },
      orderBy: { correlativo: 'asc' },
      include: INCLUIR,
    });
    const lista = asientos.map((a) => this.serializar(a));
    const totales = lista.reduce(
      (t, a) => ({
        debe: Math.round((t.debe + a.totalDebe) * 100) / 100,
        haber: Math.round((t.haber + a.totalHaber) * 100) / 100,
        asientos: t.asientos + 1,
      }),
      { debe: 0, haber: 0, asientos: 0 },
    );
    return {
      periodo: {
        id: periodo.id,
        anio,
        mes,
        estado: periodo.estado,
        cerradoEn: periodo.cerradoEn,
      },
      asientos: lista,
      totales,
    };
  }

  async obtener(empresaId: number, id: number) {
    const a = await this.prisma.asiento.findFirst({
      where: { id, empresaId },
      include: INCLUIR,
    });
    if (!a) throw new NotFoundException('Asiento no encontrado');
    return this.serializar(a);
  }

  /**
   * En contabilidad no se borra: se extorna. El asiento inverso queda en el
   * período abierto de la fecha indicada (hoy, por defecto) y el original pasa
   * a EXTORNADO, con lo que su documento puede volver a generarse.
   */
  async extornar(
    empresaId: number,
    usuarioId: number,
    id: number,
    dto: ExtornarAsientoDto,
  ) {
    const original = await this.obtener(empresaId, id);
    if (original.estado === 'EXTORNADO')
      throw new BadRequestException(
        `El asiento ${original.cuo} ya fue extornado`,
      );
    if (original.origen === 'EXTORNO')
      throw new BadRequestException(
        'Un extorno no se extorna: registra el asiento de nuevo',
      );

    const nuevo = await this.registrar(empresaId, usuarioId, {
      fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
      glosa: `Extorno de ${original.cuo}${dto.motivo ? `: ${dto.motivo}` : ` — ${original.glosa}`}`,
      origen: 'EXTORNO',
      origenId: original.id,
      sedeId: original.sedeId,
      moneda: original.moneda,
      tipoCambio: original.tipoCambio,
      extornaAId: original.id,
      lineas: original.detalles.map((d) => ({
        cuenta: d.cuenta.codigo,
        debe: d.haber,
        haber: d.debe,
        glosa: d.glosa,
        tipoDocSunat: d.tipoDocSunat,
        serie: d.serie,
        numero: d.numero,
        fechaVencimiento: d.fechaVencimiento,
      })),
    });
    await this.prisma.asiento.update({
      where: { id: original.id },
      data: { estado: 'EXTORNADO' },
    });
    return nuevo;
  }
}
