import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Límite de crédito por cliente.
 *
 * Es el hueco 1 frente a STARSOFT: ellos lo enseñaron funcionando —un pedido que
 * excede el límite del cliente queda pendiente de aprobación y un responsable lo
 * autoriza— y aquí no existía ni el campo.
 *
 * Dos decisiones que conviene entender antes de tocar esto:
 *
 * 1. `Cliente.limiteCredito` en NULL significa SIN LÍMITE, y es el valor de todos
 *    los clientes que ya existen. El control no hace nada hasta que Kaiser pone
 *    un número, cliente por cliente. Un límite puesto por defecto habría
 *    empezado a rechazar ventas el día del despliegue.
 *
 * 2. Un límite de cero SÍ es un límite: "a este cliente no se le vende al
 *    crédito". Por eso la comprobación es `limite === null`, no `!limite`.
 */
@Injectable()
export class CreditoClienteService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * La deuda viva del cliente: lo que se le facturó al crédito y todavía no ha
   * pagado. Sale del `saldo` de sus comprobantes, que es la misma fuente que
   * usan el panel de cuentas por cobrar y finanzas —si divergiera, el vendedor
   * vería una deuda y el contador otra.
   *
   * Quedan fuera los anulados y las cotizaciones: una cotización no es deuda,
   * es una oferta.
   */
  async deuda(empresaId: number, clienteId: number) {
    const docs = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        clienteId,
        tipoDoc: { notIn: ['COT', '07'] },
        estadoEnvioSunat: { not: 'ANULADO' },
        estadoPago: { notIn: ['ANULADO', 'COMPLETADO'] },
        saldo: { gt: 0 },
      },
      select: {
        id: true,
        tipoDoc: true,
        serie: true,
        correlativo: true,
        fechaEmision: true,
        fechaVencimientoCredito: true,
        mtoImpVenta: true,
        saldo: true,
        estadoPago: true,
      },
      orderBy: { fechaEmision: 'asc' },
    });

    const hoy = new Date();
    const documentos = docs.map((d) => {
      const vence = d.fechaVencimientoCredito;
      const diasVencido = vence
        ? Math.floor((hoy.getTime() - vence.getTime()) / 86_400_000)
        : null;
      return {
        id: d.id,
        documento: `${d.serie}-${String(d.correlativo).padStart(8, '0')}`,
        tipoDoc: d.tipoDoc,
        fechaEmision: d.fechaEmision,
        fechaVencimiento: vence,
        total: Number(d.mtoImpVenta),
        saldo: Number(d.saldo ?? 0),
        estadoPago: d.estadoPago,
        vencido: diasVencido !== null && diasVencido > 0,
        diasVencido: diasVencido !== null && diasVencido > 0 ? diasVencido : 0,
      };
    });

    const total = documentos.reduce((a, d) => a + d.saldo, 0);
    const vencido = documentos
      .filter((d) => d.vencido)
      .reduce((a, d) => a + d.saldo, 0);

    return { total: r2(total), vencido: r2(vencido), documentos };
  }

  /**
   * El estado de crédito de un cliente, tal como lo necesita la pantalla antes
   * de cotizar: cuánto se le concede, cuánto debe y cuánto le queda.
   */
  async estado(empresaId: number, clienteId: number) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId },
      select: {
        id: true,
        nombre: true,
        nroDoc: true,
        limiteCredito: true,
        diasCredito: true,
      },
    });
    if (!cliente) throw new NotFoundException('El cliente no existe');

    const limite =
      cliente.limiteCredito === null ? null : Number(cliente.limiteCredito);
    const { total, vencido, documentos } = await this.deuda(
      empresaId,
      clienteId,
    );

    return {
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        nroDoc: cliente.nroDoc,
      },
      limiteCredito: limite,
      diasCredito: cliente.diasCredito,
      deuda: total,
      deudaVencida: vencido,
      // Sin límite no hay "disponible": no se puede restar de un infinito.
      disponible: limite === null ? null : r2(limite - total),
      excedido: limite !== null && total > limite,
      documentos,
    };
  }

  /**
   * ¿Cabe una venta más al crédito? Devuelve el veredicto y los números con los
   * que se tomó, para que el mensaje al vendedor diga cuánto se pasa y no un
   * "no se puede" a secas.
   *
   * `importe` va con IGV, que es lo que el cliente termina debiendo.
   */
  async evaluar(empresaId: number, clienteId: number, importe: number) {
    const est = await this.estado(empresaId, clienteId);
    const limite = est.limiteCredito;

    if (limite === null) {
      return {
        aplica: false,
        excede: false,
        limite: null,
        deuda: est.deuda,
        importe: r2(importe),
        exceso: 0,
        mensaje: null as string | null,
      };
    }

    const nuevaDeuda = r2(est.deuda + importe);
    const excede = nuevaDeuda > limite + 0.005;
    const exceso = excede ? r2(nuevaDeuda - limite) : 0;

    return {
      aplica: true,
      excede,
      limite,
      deuda: est.deuda,
      importe: r2(importe),
      exceso,
      mensaje: excede
        ? `${est.cliente.nombre} tiene un límite de crédito de ${S(limite)} y ` +
          `debe ${S(est.deuda)}. Esta venta de ${S(importe)} lo dejaría en ` +
          `${S(nuevaDeuda)}, ${S(exceso)} por encima del límite.` +
          (est.deudaVencida > 0
            ? ` Del saldo actual, ${S(est.deudaVencida)} ya está vencido.`
            : '')
        : null,
    };
  }

  /**
   * Pedidos que se tomaron por encima del límite y siguen esperando V°B°. Es la
   * bandeja del autorizador: sin esta lista, un pedido marcado se queda marcado
   * y nadie se entera hasta que el cliente llama preguntando por su mercadería.
   */
  async pedidosRetenidos(empresaId: number) {
    const pedidos = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        excedeLimiteCredito: true,
        estadoPedido: 'PENDIENTE',
        estadoEnvioSunat: { not: 'ANULADO' },
      },
      select: {
        id: true,
        tipoDoc: true,
        serie: true,
        correlativo: true,
        fechaEmision: true,
        mtoImpVenta: true,
        deudaAlEmitir: true,
        limiteAlEmitir: true,
        cliente: { select: { id: true, nombre: true, nroDoc: true } },
      },
      orderBy: { fechaEmision: 'desc' },
    });

    return pedidos.map((p) => {
      const deuda = p.deudaAlEmitir === null ? 0 : Number(p.deudaAlEmitir);
      const limite = p.limiteAlEmitir === null ? 0 : Number(p.limiteAlEmitir);
      return {
        id: p.id,
        documento: `${p.serie}-${String(p.correlativo).padStart(8, '0')}`,
        tipoDoc: p.tipoDoc,
        fechaEmision: p.fechaEmision,
        importe: Number(p.mtoImpVenta),
        cliente: p.cliente,
        deudaAlEmitir: deuda,
        limiteAlEmitir: limite,
        excesoAlEmitir: r2(deuda + Number(p.mtoImpVenta) - limite),
      };
    });
  }

  /** Los clientes que hoy se pasan de su límite, para el panel de cobranzas. */
  async excedidos(empresaId: number) {
    const clientes = await this.prisma.cliente.findMany({
      where: { empresaId, limiteCredito: { not: null } },
      select: { id: true, nombre: true, nroDoc: true, limiteCredito: true },
    });

    const filas: {
      clienteId: number;
      nombre: string;
      nroDoc: string;
      limiteCredito: number;
      deuda: number;
      deudaVencida: number;
      disponible: number;
      excedido: boolean;
    }[] = [];
    for (const c of clientes) {
      const { total, vencido } = await this.deuda(empresaId, c.id);
      const limite = Number(c.limiteCredito);
      filas.push({
        clienteId: c.id,
        nombre: c.nombre,
        nroDoc: c.nroDoc,
        limiteCredito: limite,
        deuda: total,
        deudaVencida: vencido,
        disponible: r2(limite - total),
        excedido: total > limite,
      });
    }

    return {
      excedidos: filas
        .filter((f) => f.excedido)
        .sort((a, b) => a.disponible - b.disponible),
      todos: filas.sort((a, b) => a.disponible - b.disponible),
    };
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const S = (n: number) =>
  `S/ ${Number(n).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
