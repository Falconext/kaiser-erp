import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  MotivoPerdida,
  ResultadoSeguimiento,
  TipoSeguimiento,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { finDelDiaLima } from '../common/utils/fecha';

/**
 * Seguimiento de cotizaciones.
 *
 * Antes existía el ESTADO de una cotización (pendiente / facturada / anulada) y su
 * vigencia, pero no la GESTIÓN: no había dónde anotar «llamé el martes, pidió un
 * 5 %, vuelve el viernes», ni cuándo tocaba volver a llamar, ni por qué se perdió.
 * Peor: perder una cotización era BORRARLA, así que la pregunta «¿por qué
 * perdemos?» no tenía respuesta en ninguna parte.
 *
 * Tres piezas:
 *
 * 1. **Bitácora** (`SeguimientoCotizacion`) — una línea por contacto o suceso, en
 *    orden, con quién y cuándo. No se edita ni se borra: lo que se registró mal se
 *    corrige con otra entrada. Una bitácora retocable no sirve para contestar qué
 *    le dijimos al cliente hace seis semanas.
 *
 * 2. **Próxima acción** — qué toca hacer y cuándo. La vigencia dice cuándo caduca
 *    el precio; esto dice cuándo hay que llamar, que no es lo mismo: una
 *    cotización de S/ 65.000 con 20 días de vigencia no se toca sola en 20 días.
 *
 * 3. **Motivo de pérdida** — perder pasa a ser un estado con su razón, contable y
 *    agregable, en vez de un documento que desaparece.
 *
 * Lo que el sistema sabe lo escribe el sistema: creada, enviada, versionada,
 * ganada y perdida se registran solas. El vendedor solo anota lo que pasó fuera.
 */
/**
 * Una tarea agendada está vencida cuando ya pasó su día completo. Con la
 * comparación directa contra `Date.now()`, lo agendado para HOY salía vencido
 * desde primera hora de la mañana —la fecha se guarda anclada al mediodía UTC,
 * que en Lima son las 07:00— y el vendedor veía en rojo lo que todavía tenía
 * todo el día para hacer.
 */
function estaVencida(cuando: Date | null | undefined): boolean {
  if (!cuando) return false;
  return finDelDiaLima(cuando).getTime() < Date.now();
}

@Injectable()
export class SeguimientoCotizacionService {
  private readonly log = new Logger(SeguimientoCotizacionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una entrada. Los automáticos (`auto`) no fallan hacia afuera: que no
   * se pueda anotar en la bitácora no puede impedir emitir ni enviar nada.
   */
  async registrar(
    empresaId: number,
    comprobanteId: number,
    datos: {
      usuarioId?: number | null;
      tipo: TipoSeguimiento;
      resultado?: ResultadoSeguimiento | null;
      detalle?: string | null;
      proximaAccion?: string | null;
      proximaAccionEn?: Date | null;
    },
    opts?: { auto?: boolean },
  ) {
    try {
      // Una entrada nueva cierra la próxima acción que estuviera abierta: si el
      // vendedor vuelve a registrar algo, es que ya hizo lo que tenía pendiente.
      await this.prisma.seguimientoCotizacion.updateMany({
        where: {
          comprobanteId,
          proximaAccionEn: { not: null },
          cumplidaEn: null,
        },
        data: { cumplidaEn: new Date() },
      });

      return await this.prisma.seguimientoCotizacion.create({
        data: {
          empresaId,
          comprobanteId,
          usuarioId: datos.usuarioId ?? null,
          tipo: datos.tipo,
          resultado: datos.resultado ?? null,
          detalle: datos.detalle?.trim() || null,
          proximaAccion: datos.proximaAccion?.trim() || null,
          proximaAccionEn: datos.proximaAccionEn ?? null,
        },
      });
    } catch (e) {
      if (!opts?.auto) throw e;
      this.log.warn(
        `No se pudo registrar el seguimiento automático de ${comprobanteId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
      return null;
    }
  }

  /** La bitácora de una cotización, del suceso más reciente al más antiguo. */
  async bitacora(empresaId: number, comprobanteId: number) {
    const comp = await this.prisma.comprobante.findFirst({
      where: { id: comprobanteId, empresaId },
      select: {
        id: true,
        serie: true,
        correlativo: true,
        tipoDoc: true,
        fechaEmision: true,
        cotizVigencia: true,
        estadoPedido: true,
        mtoImpVenta: true,
        motivoPerdida: true,
        motivoPerdidaDetalle: true,
        motivoPerdidaEn: true,
        cliente: { select: { id: true, nombre: true } },
        usuario: { select: { id: true, nombre: true } },
      },
    });
    if (!comp) throw new NotFoundException('La cotización no existe');

    const entradas = await this.prisma.seguimientoCotizacion.findMany({
      where: { empresaId, comprobanteId },
      orderBy: [{ creadoEn: 'desc' }, { id: 'desc' }],
      include: { usuario: { select: { id: true, nombre: true } } },
    });

    const dias = comp.cotizVigencia ?? 7;
    const vence = new Date(comp.fechaEmision);
    vence.setDate(vence.getDate() + dias);

    // La próxima acción viva: la más reciente que aún no se ha cumplido.
    const pendiente = entradas.find((e) => e.proximaAccionEn && !e.cumplidaEn);

    return {
      cotizacion: {
        id: comp.id,
        documento: `${comp.serie}-${String(comp.correlativo).padStart(8, '0')}`,
        cliente: comp.cliente,
        vendedor: comp.usuario,
        importe: Number(comp.mtoImpVenta),
        fechaEmision: comp.fechaEmision,
        venceEn: vence,
        diasParaVencer: Math.ceil((vence.getTime() - Date.now()) / 86_400_000),
        estado: comp.estadoPedido,
        motivoPerdida: comp.motivoPerdida,
        motivoPerdidaDetalle: comp.motivoPerdidaDetalle,
        motivoPerdidaEn: comp.motivoPerdidaEn,
      },
      proximaAccion: pendiente
        ? {
            que: pendiente.proximaAccion,
            cuando: pendiente.proximaAccionEn,
            // Vence al ACABAR el día, no al empezarlo: comparar contra `Date.now()`
            // marcaba en rojo a las 7 de la mañana una llamada agendada para hoy.
            vencida: estaVencida(pendiente.proximaAccionEn),
          }
        : null,
      entradas: entradas.map((e) => ({
        id: e.id,
        tipo: e.tipo,
        resultado: e.resultado,
        detalle: e.detalle,
        proximaAccion: e.proximaAccion,
        proximaAccionEn: e.proximaAccionEn,
        cumplidaEn: e.cumplidaEn,
        creadoEn: e.creadoEn,
        // Sin usuario = lo escribió el sistema.
        usuario: e.usuario?.nombre ?? null,
        automatico: e.usuarioId === null,
      })),
    };
  }

  /**
   * Marca la cotización como PERDIDA con su motivo. Es lo que sustituye a
   * borrarla: el documento se queda, deja de contar como oportunidad abierta y
   * suma al reporte de por qué perdemos.
   */
  async marcarPerdida(
    empresaId: number,
    comprobanteId: number,
    usuarioId: number,
    datos: { motivo: MotivoPerdida; detalle?: string },
  ) {
    const comp = await this.prisma.comprobante.findFirst({
      where: { id: comprobanteId, empresaId, tipoDoc: 'COT' },
      select: { id: true, estadoPedido: true, serie: true, correlativo: true },
    });
    if (!comp) throw new NotFoundException('La cotización no existe');
    if (comp.estadoPedido === 'FACTURADO')
      throw new BadRequestException(
        'Esa cotización ya se facturó: no se puede marcar como perdida.',
      );

    await this.prisma.comprobante.update({
      where: { id: comprobanteId },
      data: {
        estadoPedido: 'ANULADO',
        // También `estadoPago`: es el que pinta la columna Estado del listado de
        // cotizaciones (las no fiscales no tienen estado SUNAT). Sin esto la
        // cotización quedaba marcada como perdida por dentro pero seguía
        // luciendo "Completado" en la lista, que es justo lo contrario.
        estadoPago: 'ANULADO',
        motivoPerdida: datos.motivo,
        motivoPerdidaDetalle: datos.detalle?.trim() || null,
        motivoPerdidaEn: new Date(),
        motivoPerdidaPorId: usuarioId,
      },
    });

    await this.registrar(empresaId, comprobanteId, {
      usuarioId,
      tipo: 'PERDIDA',
      detalle: `Marcada como perdida — ${ETIQUETA_MOTIVO[datos.motivo]}${
        datos.detalle?.trim() ? `: ${datos.detalle.trim()}` : ''
      }`,
    });

    return { id: comprobanteId, motivo: datos.motivo };
  }

  /**
   * Por qué perdemos: cuántas y cuánto dinero por motivo.
   *
   * El importe importa tanto como la cuenta: perder diez cotizaciones de S/ 500
   * por precio no es lo mismo que perder una de S/ 80.000 por plazo de entrega, y
   * contarlas por separado lleva a la decisión equivocada.
   */
  async porQuePerdemos(
    empresaId: number,
    rango?: { desde?: Date; hasta?: Date },
  ) {
    const perdidas = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        tipoDoc: 'COT',
        motivoPerdida: { not: null },
        ...(rango?.desde || rango?.hasta
          ? {
              fechaEmision: {
                ...(rango.desde ? { gte: rango.desde } : {}),
                ...(rango.hasta ? { lte: rango.hasta } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        serie: true,
        correlativo: true,
        fechaEmision: true,
        motivoPerdida: true,
        motivoPerdidaDetalle: true,
        motivoPerdidaEn: true,
        mtoImpVenta: true,
        cliente: { select: { nombre: true } },
      },
      orderBy: { mtoImpVenta: 'desc' },
    });

    const ganadas = await this.prisma.comprobante.count({
      where: {
        empresaId,
        tipoDoc: 'COT',
        // Ganada = existe el comprobante que salió de ella, O quedó marcada como
        // FACTURADO. Las dos señales, no solo la segunda: `estadoPedido` es un
        // campo que alguien tiene que acordarse de actualizar, y si una vía de
        // conversión no lo hace, la cotización se convirtió de verdad pero la
        // tasa de cierre sale peor de lo que es. `comprobantesDerivados` es el
        // hecho consumado y no depende de que nadie marque nada.
        OR: [
          { estadoPedido: 'FACTURADO' },
          { comprobantesDerivados: { some: {} } },
        ],
        ...(rango?.desde || rango?.hasta
          ? {
              fechaEmision: {
                ...(rango.desde ? { gte: rango.desde } : {}),
                ...(rango.hasta ? { lte: rango.hasta } : {}),
              },
            }
          : {}),
      },
    });

    // Se guarda también QUÉ cotizaciones componen cada motivo. Un motivo con tres
    // cotizaciones y S/ 1.341 no dice qué hacer: si las tres son del mismo cliente
    // el problema es ese cliente, y si son de tres distintos es el precio o el
    // plazo. Sin los nombres, el informe describe pero no permite actuar.
    type Detalle = {
      id: number;
      documento: string;
      cliente: string;
      importe: number;
      fecha: Date;
      nota: string | null;
    };
    const porMotivo = new Map<
      string,
      { cantidad: number; importe: number; cotizaciones: Detalle[] }
    >();
    for (const p of perdidas) {
      const k = String(p.motivoPerdida);
      const a = porMotivo.get(k) ?? {
        cantidad: 0,
        importe: 0,
        cotizaciones: [],
      };
      a.cantidad += 1;
      a.importe += Number(p.mtoImpVenta);
      a.cotizaciones.push({
        id: p.id,
        documento: `${p.serie}-${String(p.correlativo).padStart(8, '0')}`,
        cliente: p.cliente?.nombre ?? 'Sin cliente',
        importe: r2(Number(p.mtoImpVenta)),
        fecha: p.motivoPerdidaEn ?? p.fechaEmision,
        nota: p.motivoPerdidaDetalle,
      });
      porMotivo.set(k, a);
    }

    const filas = [...porMotivo.entries()]
      .map(([motivo, v]) => ({
        motivo,
        etiqueta: ETIQUETA_MOTIVO[motivo as MotivoPerdida] ?? motivo,
        cantidad: v.cantidad,
        importe: r2(v.importe),
        cotizaciones: v.cotizaciones,
      }))
      .sort((a, b) => b.importe - a.importe);

    const totalPerdido = r2(filas.reduce((a, f) => a + f.importe, 0));
    const cerradas = perdidas.length + ganadas;
    const abiertas = await this.prisma.comprobante.count({
      where: {
        empresaId,
        tipoDoc: 'COT',
        motivoPerdida: null,
        estadoPedido: { not: 'FACTURADO' },
        comprobantesDerivados: { none: {} },
        ...(rango?.desde || rango?.hasta
          ? {
              fechaEmision: {
                ...(rango.desde ? { gte: rango.desde } : {}),
                ...(rango.hasta ? { lte: rango.hasta } : {}),
              },
            }
          : {}),
      },
    });

    return {
      ganadas,
      perdidas: perdidas.length,
      /** Ni ganadas ni perdidas: siguen vivas. No entran en la tasa de cierre. */
      abiertas,
      // Solo sobre cotizaciones CERRADAS: incluir las que siguen abiertas daría
      // una tasa que empeora sola cada vez que se cotiza.
      tasaCierre: cerradas > 0 ? r2((ganadas / cerradas) * 100) : null,
      totalPerdido,
      filas,
    };
  }

  /**
   * Lo que toca hacer: próximas acciones vencidas o de hoy, y cotizaciones que
   * caducan. Acotado al vendedor salvo que se pida el consolidado.
   */
  async agenda(
    empresaId: number,
    opts?: { usuarioId?: number; dias?: number },
  ) {
    const limite = new Date();
    limite.setDate(limite.getDate() + (opts?.dias ?? 0));
    limite.setHours(23, 59, 59, 999);

    const acciones = await this.prisma.seguimientoCotizacion.findMany({
      where: {
        empresaId,
        proximaAccionEn: { not: null, lte: limite },
        cumplidaEn: null,
        comprobante: {
          tipoDoc: 'COT',
          estadoPedido: { notIn: ['ANULADO', 'FACTURADO'] },
          ...(opts?.usuarioId ? { usuarioId: opts.usuarioId } : {}),
        },
      },
      orderBy: { proximaAccionEn: 'asc' },
      include: {
        comprobante: {
          select: {
            id: true,
            serie: true,
            correlativo: true,
            mtoImpVenta: true,
            cliente: { select: { nombre: true } },
          },
        },
      },
    });

    return acciones.map((a) => ({
      seguimientoId: a.id,
      comprobanteId: a.comprobante.id,
      documento: `${a.comprobante.serie}-${String(a.comprobante.correlativo).padStart(8, '0')}`,
      cliente: a.comprobante.cliente?.nombre ?? 'Sin cliente',
      importe: Number(a.comprobante.mtoImpVenta),
      que: a.proximaAccion,
      cuando: a.proximaAccionEn,
      vencida: estaVencida(a.proximaAccionEn),
      diasVencida: a.proximaAccionEn
        ? Math.max(
            0,
            Math.floor(
              (Date.now() - finDelDiaLima(a.proximaAccionEn).getTime()) /
                86_400_000,
            ) + 1,
          )
        : 0,
    }));
  }
  /**
   * Aviso diario a cada vendedor con LO SUYO: lo que prometió hacer y no ha hecho,
   * y las cotizaciones que se le vencen. Una por vendedor, no una por cotización:
   * cinco avisos a las 7:50 no se leen.
   */
  async avisar(empresaId: number) {
    const hoy = new Date();
    const en3dias = new Date(hoy.getTime() + 3 * 86_400_000);

    const abiertas = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        tipoDoc: 'COT',
        estadoPedido: { notIn: ['ANULADO', 'FACTURADO'] },
      },
      select: {
        id: true,
        serie: true,
        correlativo: true,
        fechaEmision: true,
        cotizVigencia: true,
        mtoImpVenta: true,
        usuarioId: true,
        cliente: { select: { nombre: true } },
        seguimientos: {
          where: { proximaAccionEn: { not: null }, cumplidaEn: null },
          orderBy: { proximaAccionEn: 'asc' },
          take: 1,
          select: { proximaAccion: true, proximaAccionEn: true },
        },
      },
    });

    // Por vendedor: quién tiene que hacer qué.
    const porVendedor = new Map<
      number,
      { vencen: string[]; acciones: string[] }
    >();

    for (const c of abiertas) {
      if (!c.usuarioId) continue;
      const doc = `${c.serie}-${String(c.correlativo).padStart(8, '0')}`;
      const quien = c.cliente?.nombre ?? 'sin cliente';
      const bolsa = porVendedor.get(c.usuarioId) ?? {
        vencen: [],
        acciones: [],
      };

      const vence = new Date(c.fechaEmision);
      vence.setDate(vence.getDate() + (c.cotizVigencia ?? 7));
      if (vence <= en3dias) {
        const dias = Math.ceil((vence.getTime() - hoy.getTime()) / 86_400_000);
        bolsa.vencen.push(
          `${doc} (${quien}) ${dias < 0 ? `venció hace ${Math.abs(dias)} d` : dias === 0 ? 'vence hoy' : `vence en ${dias} d`}`,
        );
      }

      const acc = c.seguimientos[0];
      if (acc?.proximaAccionEn && acc.proximaAccionEn <= hoy) {
        bolsa.acciones.push(`${doc} (${quien}): ${acc.proximaAccion}`);
      }
      porVendedor.set(c.usuarioId, bolsa);
    }

    let avisados = 0;
    let vendedores = 0;
    for (const [usuarioId, b] of porVendedor) {
      if (!b.vencen.length && !b.acciones.length) continue;
      const partes: string[] = [];
      if (b.acciones.length)
        partes.push(
          `${b.acciones.length} ${b.acciones.length === 1 ? 'gestión pendiente' : 'gestiones pendientes'}`,
        );
      if (b.vencen.length)
        partes.push(
          `${b.vencen.length} ${b.vencen.length === 1 ? 'cotización por vencer' : 'cotizaciones por vencer'}`,
        );

      // El ejemplo concreto es lo que hace que el aviso sirva.
      const ejemplo = b.acciones[0] ?? b.vencen[0];
      await this.prisma.notificacion.create({
        data: {
          usuarioId,
          empresaId,
          tipo: b.acciones.length ? 'WARNING' : 'INFO',
          titulo: 'Tus cotizaciones',
          mensaje: `${partes.join(' y ')}. Por ejemplo ${ejemplo}.`,
          leida: false,
          metaData: {
            tipo: 'AGENDA_COTIZACIONES',
            acciones: b.acciones.length,
            porVencer: b.vencen.length,
          },
        },
      });
      avisados += b.acciones.length + b.vencen.length;
      vendedores += 1;
    }

    return { avisados, vendedores };
  }
}

export const ETIQUETA_MOTIVO: Record<MotivoPerdida, string> = {
  PRECIO: 'Precio',
  PLAZO_ENTREGA: 'Plazo de entrega',
  SIN_STOCK: 'Sin stock',
  COMPETENCIA: 'Se fue con la competencia',
  PRESUPUESTO: 'No le aprobaron el presupuesto',
  CLIENTE_APLAZO: 'El cliente aplazó el proyecto',
  SIN_RESPUESTA: 'Dejó de contestar',
  OTRO: 'Otro',
};

const r2 = (n: number) => Math.round(n * 100) / 100;
