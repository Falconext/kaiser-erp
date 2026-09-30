import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Libro Mayor y balance de comprobación.
 *
 * El Diario cuenta los hechos en orden de fecha; el Mayor los cuenta por cuenta,
 * que es como se mira una contabilidad para saber **cuánto debe un cliente** o
 * **cuánto IGV hay que pagar**. Y el balance de comprobación —todas las cuentas
 * con su saldo— es lo que la contadora revisa antes de cerrar el mes.
 *
 * Todo sale de `Asiento` y `AsientoDetalle`: no hay saldos guardados que puedan
 * desincronizarse. Un saldo que se calcula siempre es un saldo que no miente.
 */

const r2 = (v: unknown) => Math.round(Number(v ?? 0) * 100) / 100;

/**
 * En un libro contable NO se excluye nada.
 *
 * Estas consultas filtraban por `estado: 'REGISTRADO'`, y eso restaba dos veces:
 * al extornar un asiento se dejaba fuera el original PERO se seguía contando su
 * reverso. Un extorno no borra el asiento, le pone al lado su contrario; los dos
 * pertenecen al libro y se anulan entre sí. Sin el filtro, la suma es la correcta
 * y además el Mayor cuadra con el Diario, que tampoco esconde los extornados.
 */

/** Rango de un mes en hora de Lima (UTC-5, sin horario de verano). */
function rangoMes(anio: number, mes: number) {
  return {
    desde: new Date(Date.UTC(anio, mes - 1, 1, 5, 0, 0)),
    hasta: new Date(Date.UTC(anio, mes, 1, 5, 0, 0)),
  };
}

@Injectable()
export class LibroMayorService {
  constructor(private readonly prisma: PrismaService) {}

  private validar(anio: number, mes: number) {
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100)
      throw new BadRequestException('Año inválido');
    if (!Number.isInteger(mes) || mes < 1 || mes > 12)
      throw new BadRequestException('Mes inválido');
  }

  /**
   * El mayor de UNA cuenta: de qué saldo venía, qué la movió y en qué queda.
   *
   * El saldo inicial es el acumulado desde el 1 de enero, no desde siempre: en
   * Perú el ejercicio cierra en diciembre y arrastrar más allá mezclaría años.
   */
  async mayorDeCuenta(
    empresaId: number,
    codigo: string,
    anio: number,
    mes: number,
    sedeId?: number,
  ) {
    this.validar(anio, mes);
    const cuenta = await this.prisma.cuentaContable.findFirst({
      where: { empresaId, codigo },
      select: {
        id: true,
        codigo: true,
        denominacion: true,
        naturaleza: true,
        imputable: true,
      },
    });
    if (!cuenta)
      throw new BadRequestException(
        `La cuenta ${codigo} no existe en el plan.`,
      );

    const { desde, hasta } = rangoMes(anio, mes);
    const inicioAnio = new Date(Date.UTC(anio, 0, 1, 5, 0, 0));
    const filtroSede = sedeId ? { sedeId } : {};

    const [previo, movimientos] = await Promise.all([
      this.prisma.asientoDetalle.aggregate({
        where: {
          cuentaId: cuenta.id,
          asiento: {
            empresaId,
            fecha: { gte: inicioAnio, lt: desde },
            ...filtroSede,
          },
        },
        _sum: { debe: true, haber: true },
      }),
      this.prisma.asientoDetalle.findMany({
        where: {
          cuentaId: cuenta.id,
          asiento: {
            empresaId,
            fecha: { gte: desde, lt: hasta },
            ...filtroSede,
          },
        },
        orderBy: [
          { asiento: { fecha: 'asc' } },
          { asiento: { correlativo: 'asc' } },
          { orden: 'asc' },
        ],
        select: {
          debe: true,
          haber: true,
          glosa: true,
          tipoDocSunat: true,
          serie: true,
          numero: true,
          asiento: {
            select: {
              id: true,
              cuo: true,
              fecha: true,
              glosa: true,
              origen: true,
              origenId: true,
              sede: { select: { nombre: true } },
            },
          },
        },
      }),
    ]);

    const inicialDebe = r2(previo._sum.debe);
    const inicialHaber = r2(previo._sum.haber);
    // El saldo se expresa en la naturaleza de la cuenta: una cuenta deudora con
    // saldo positivo tiene saldo deudor. Así la contadora no lee signos al revés.
    const signo = cuenta.naturaleza === 'DEUDORA' ? 1 : -1;
    let saldo = r2((inicialDebe - inicialHaber) * signo);
    const saldoInicial = saldo;

    const lineas = movimientos.map((m) => {
      const debe = r2(m.debe);
      const haber = r2(m.haber);
      saldo = r2(saldo + (debe - haber) * signo);
      return {
        asientoId: m.asiento.id,
        cuo: m.asiento.cuo,
        fecha: m.asiento.fecha,
        glosa: m.glosa ?? m.asiento.glosa,
        origen: m.asiento.origen,
        origenId: m.asiento.origenId,
        sede: m.asiento.sede?.nombre ?? null,
        documento: m.serie && m.numero ? `${m.serie}-${m.numero}` : null,
        tipoDocSunat: m.tipoDocSunat,
        debe,
        haber,
        saldo,
      };
    });

    return {
      cuenta,
      periodo: { anio, mes },
      saldoInicial,
      totales: {
        debe: r2(lineas.reduce((s, l) => s + l.debe, 0)),
        haber: r2(lineas.reduce((s, l) => s + l.haber, 0)),
        movimientos: lineas.length,
      },
      saldoFinal: saldo,
      /** Cómo se lee el saldo: DEUDOR o ACREEDOR, sin signos. */
      naturalezaSaldo:
        saldo >= 0
          ? cuenta.naturaleza
          : cuenta.naturaleza === 'DEUDORA'
            ? 'ACREEDORA'
            : 'DEUDORA',
      lineas,
    };
  }

  /**
   * Balance de comprobación: todas las cuentas con movimiento en el período, con
   * lo que traían, lo que se movió y en qué quedan. La suma del debe tiene que
   * igualar la del haber; si no, hay un asiento roto y se dice.
   */
  async balance(empresaId: number, anio: number, mes: number, sedeId?: number) {
    this.validar(anio, mes);
    const { desde, hasta } = rangoMes(anio, mes);
    const inicioAnio = new Date(Date.UTC(anio, 0, 1, 5, 0, 0));
    const filtroSede = sedeId ? { sedeId } : {};

    const [previos, delMes, cuentas] = await Promise.all([
      this.prisma.asientoDetalle.groupBy({
        by: ['cuentaId'],
        where: {
          asiento: {
            empresaId,
            fecha: { gte: inicioAnio, lt: desde },
            ...filtroSede,
          },
        },
        _sum: { debe: true, haber: true },
      }),
      this.prisma.asientoDetalle.groupBy({
        by: ['cuentaId'],
        where: {
          asiento: {
            empresaId,
            fecha: { gte: desde, lt: hasta },
            ...filtroSede,
          },
        },
        _sum: { debe: true, haber: true },
      }),
      this.prisma.cuentaContable.findMany({
        where: { empresaId },
        select: {
          id: true,
          codigo: true,
          denominacion: true,
          naturaleza: true,
        },
      }),
    ]);

    const porCuenta = new Map(cuentas.map((c) => [c.id, c]));
    const antes = new Map(previos.map((p) => [p.cuentaId, p._sum]));
    const ahora = new Map(delMes.map((p) => [p.cuentaId, p._sum]));
    const ids = new Set([...antes.keys(), ...ahora.keys()]);

    const filas = [...ids]
      .map((id) => {
        const c = porCuenta.get(id);
        if (!c) return null;
        const signo = c.naturaleza === 'DEUDORA' ? 1 : -1;
        const inicial = r2(
          (Number(antes.get(id)?.debe ?? 0) -
            Number(antes.get(id)?.haber ?? 0)) *
            signo,
        );
        const debe = r2(ahora.get(id)?.debe);
        const haber = r2(ahora.get(id)?.haber);
        const final = r2(inicial + (debe - haber) * signo);
        return {
          cuentaId: id,
          codigo: c.codigo,
          denominacion: c.denominacion,
          naturaleza: c.naturaleza,
          saldoInicial: inicial,
          debe,
          haber,
          saldoFinal: final,
          /** La clase del PCGE: agrupa el balance como lo lee un contador. */
          clase: c.codigo.slice(0, 1),
        };
      })
      .filter(
        (f): f is NonNullable<typeof f> =>
          f !== null && (f.debe !== 0 || f.haber !== 0 || f.saldoInicial !== 0),
      )
      .sort((a, b) => a.codigo.localeCompare(b.codigo));

    const totales = {
      debe: r2(filas.reduce((s, f) => s + f.debe, 0)),
      haber: r2(filas.reduce((s, f) => s + f.haber, 0)),
      cuentas: filas.length,
    };

    return {
      periodo: { anio, mes },
      filas,
      totales,
      /** Si esto es false, hay un asiento roto: el Diario no cuadra. */
      cuadra:
        Math.round(totales.debe * 100) === Math.round(totales.haber * 100),
    };
  }

  /**
   * Los asientos del período en una fila por línea, para el sistema contable de
   * la contadora. Es el equivalente a lo que el competidor exporta a su
   * "SISTCONT": no hay integración en vivo con ningún sistema, hay un archivo.
   */
  async exportar(
    empresaId: number,
    anio: number,
    mes: number,
    sedeId?: number,
  ) {
    this.validar(anio, mes);
    const { desde, hasta } = rangoMes(anio, mes);
    const detalles = await this.prisma.asientoDetalle.findMany({
      where: {
        asiento: {
          empresaId,
          fecha: { gte: desde, lt: hasta },
          ...(sedeId ? { sedeId } : {}),
        },
      },
      orderBy: [{ asiento: { correlativo: 'asc' } }, { orden: 'asc' }],
      select: {
        debe: true,
        haber: true,
        glosa: true,
        tipoDocSunat: true,
        serie: true,
        numero: true,
        fechaVencimiento: true,
        cuenta: { select: { codigo: true, denominacion: true } },
        asiento: {
          select: {
            cuo: true,
            correlativo: true,
            fecha: true,
            glosa: true,
            origen: true,
            moneda: true,
            tipoCambio: true,
            sede: { select: { nombre: true } },
          },
        },
      },
    });

    return detalles.map((d) => ({
      periodo: `${anio}${String(mes).padStart(2, '0')}`,
      cuo: d.asiento.cuo,
      asiento: d.asiento.correlativo,
      fecha: d.asiento.fecha,
      cuenta: d.cuenta.codigo,
      denominacion: d.cuenta.denominacion,
      glosa: d.glosa ?? d.asiento.glosa,
      origen: d.asiento.origen,
      tipoDoc: d.tipoDocSunat,
      documento: d.serie && d.numero ? `${d.serie}-${d.numero}` : null,
      fechaVencimiento: d.fechaVencimiento,
      moneda: d.asiento.moneda,
      tipoCambio:
        d.asiento.tipoCambio == null ? null : Number(d.asiento.tipoCambio),
      sede: d.asiento.sede?.nombre ?? null,
      debe: r2(d.debe),
      haber: r2(d.haber),
    }));
  }

  /**
   * El CUO del asiento de cada comprobante y de cada compra del período.
   *
   * El TXT del SIRE lleva una columna «Correlativo asiento» que hasta ahora
   * salía vacía porque no había asientos que poner. Se devuelve en un mapa para
   * que `sire.service` lo rellene con UNA consulta, no una por fila.
   */
  async cuoPorDocumento(empresaId: number, anio: number, mes: number) {
    const { desde, hasta } = rangoMes(anio, mes);
    const asientos = await this.prisma.asiento.findMany({
      where: {
        empresaId,
        origen: { in: ['VENTA', 'COMPRA'] },
        origenId: { not: null },
        fecha: { gte: desde, lt: hasta },
      },
      select: { origen: true, origenId: true, cuo: true, correlativo: true },
    });
    const mapa = new Map<string, { cuo: string; correlativo: number }>();
    for (const a of asientos) {
      mapa.set(`${a.origen}|${a.origenId}`, {
        cuo: a.cuo,
        correlativo: a.correlativo,
      });
    }
    return mapa;
  }
}

export type BalanceComprobacion = Prisma.PromiseReturnType<
  LibroMayorService['balance']
>;
