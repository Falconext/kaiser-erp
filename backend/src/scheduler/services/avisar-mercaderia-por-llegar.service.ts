import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacionesService } from '../../notificaciones/notificaciones.service';

/**
 * Avisa a almacén de las órdenes de compra que están por llegar o ya vencieron
 * su fecha de entrega.
 *
 * Lo pidió la jefa de almacén: "no puedo recibir la alerta en el ERP sobre la
 * mercadería que está por llegar". La orden de compra ya guarda `fechaEntrega`;
 * lo único que faltaba era mirarla.
 *
 * Se avisa a quien recibe la mercadería: los usuarios con permiso `compras`
 * —que es lo que distingue a almacén de producción, porque producción mueve
 * stock pero no recibe compras— y la gerencia.
 */

/** Días de antelación con los que se avisa. */
const DIAS_AVISO = 3;

@Injectable()
export class AvisarMercaderiaPorLlegarService {
  private readonly logger = new Logger(AvisarMercaderiaPorLlegarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /**
   * @param ahora inyectable para poder probarlo sin depender del reloj.
   */
  async ejecutar(ahora: Date = new Date()): Promise<{
    ordenes: number;
    notificaciones: number;
  }> {
    const hoy = new Date(ahora);
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + DIAS_AVISO);
    limite.setHours(23, 59, 59, 999);

    // Solo las emitidas: una orden en borrador no trae nada, y una recibida o
    // anulada ya no está en camino.
    const ordenes = await this.prisma.ordenCompra.findMany({
      where: {
        estado: 'EMITIDA',
        fechaEntrega: { not: null, lte: limite },
      },
      select: {
        id: true,
        numero: true,
        empresaId: true,
        fechaEntrega: true,
        proveedor: { select: { nombre: true } },
      },
      orderBy: { fechaEntrega: 'asc' },
    });

    if (!ordenes.length) return { ordenes: 0, notificaciones: 0 };

    // Destinatarios por empresa, resueltos una vez.
    const porEmpresa = new Map<number, number[]>();
    let enviadas = 0;

    for (const orden of ordenes) {
      let destinatarios = porEmpresa.get(orden.empresaId);
      if (!destinatarios) {
        destinatarios = await this.destinatariosDeAlmacen(orden.empresaId);
        porEmpresa.set(orden.empresaId, destinatarios);
      }
      if (!destinatarios.length) continue;

      const entrega = new Date(orden.fechaEntrega as Date);
      const dias = Math.round(
        (new Date(entrega.getFullYear(), entrega.getMonth(), entrega.getDate()).getTime() -
          hoy.getTime()) /
          86_400_000,
      );

      const numero = `OC-${String(orden.numero).padStart(6, '0')}`;
      const cuando =
        dias < 0
          ? `venció hace ${Math.abs(dias)} día(s)`
          : dias === 0
            ? 'llega hoy'
            : `llega en ${dias} día(s)`;

      const titulo = dias < 0 ? `${numero} con entrega vencida` : `${numero} por llegar`;
      const mensaje =
        `${orden.proveedor?.nombre ?? 'Proveedor'} · ${cuando} ` +
        `(${entrega.toLocaleDateString('es-PE')}). Prepara la recepción.`;

      for (const usuarioId of destinatarios) {
        // Sin repetir: si ya hay un aviso sin leer de esta orden, no se insiste.
        const yaAvisado = await this.prisma.notificacion.findFirst({
          where: {
            usuarioId,
            empresaId: orden.empresaId,
            leida: false,
            titulo,
          },
          select: { id: true },
        });
        if (yaAvisado) continue;

        await this.notificaciones.crearNotificacion({
          usuarioId,
          empresaId: orden.empresaId,
          tipo: dias < 0 ? 'WARNING' : 'INFO',
          titulo,
          mensaje,
          metaData: { ordenCompraId: orden.id, tipo: 'ORDEN_COMPRA_POR_LLEGAR' } as any,
        });
        enviadas++;
      }
    }

    if (enviadas) {
      this.logger.log(
        `Mercadería por llegar: ${ordenes.length} orden(es), ${enviadas} aviso(s).`,
      );
    }
    return { ordenes: ordenes.length, notificaciones: enviadas };
  }

  /**
   * Quien recibe mercadería: almacén y gerencia.
   *
   * El filtro va por `compras` y no por `kardex:escribir` a propósito:
   * producción también escribe kardex (consume materiales, ingresa producto
   * terminado) pero no recibe órdenes de compra, y avisarle sería ruido.
   */
  private async destinatariosDeAlmacen(empresaId: number): Promise<number[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { empresaId, estado: 'ACTIVO' },
      select: { id: true, rol: true, permisos: true },
    });

    return usuarios
      .filter((u) => {
        if (u.rol === 'ADMIN_EMPRESA') return true;
        const permisos = String(u.permisos ?? '');
        return permisos.includes('"compras"') || permisos.includes('"*"');
      })
      .map((u) => u.id);
  }
}
