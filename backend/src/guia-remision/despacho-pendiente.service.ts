import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

/**
 * Aviso de despacho pendiente.
 *
 * Ari lo preguntó en la reunión —"si despacho 4 de 10, ¿el sistema me avisa de
 * las 6 que faltan?"— y STARSOFT contestó que no: *"no te envía alertas, sino que
 * genera el reporte y analizas nuestra información"*. Es la oportunidad más limpia
 * de esa reunión: una necesidad declarada que el competidor rechazó delante de
 * ellos.
 *
 * Lo que hacía falta para poder contestarla era un dato que no existía: la guía
 * de remisión no apuntaba al comprobante que despacha. El vínculo era una frase en
 * `observaciones` ("Traslado por venta F0A1-00000005"), que sirve para que lo lea
 * una persona y para nada más. Ahora `GuiaRemision.comprobanteId` lo dice, y
 * `pnpm run enlazar:guias` recupera el de las guías viejas leyendo esa frase.
 *
 * Una salvedad importante: quedan fuera los documentos IMPORTADOS del sistema
 * anterior (`origenDato` con 'migracion'). Se despacharon de verdad, pero no por
 * aquí, así que aparecerían todos como pendientes y el aviso nacería inservible.
 */
@Injectable()
export class DespachoPendienteService {
  private readonly log = new Logger(DespachoPendienteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /**
   * Tipos que mueven mercadería por aquí y por tanto se siguen.
   *
   * Las NOTAS DE VENTA quedan fuera, con el mismo criterio que ya sigue el Libro
   * Diario: son histórico importado del sistema anterior. Se despacharon de
   * verdad, pero no por este ERP, así que aparecerían las 28 como pendientes y el
   * aviso nacería inservible —era exactamente lo que pasaba antes de excluirlas.
   */
  private readonly TIPOS = ['01', '03', 'NP'];

  /**
   * Qué queda por despachar, documento por documento y línea por línea.
   *
   * `soloPendientes` en true (el defecto) devuelve solo lo que falta; en false
   * devuelve también lo ya completo, que es lo que necesita una pantalla de
   * seguimiento.
   */
  async pendientes(
    empresaId: number,
    opts?: { sedeId?: number; desde?: Date; soloPendientes?: boolean },
  ) {
    const soloPendientes = opts?.soloPendientes !== false;

    const comprobantes = await this.prisma.comprobante.findMany({
      where: {
        empresaId,
        ...(opts?.sedeId ? { sedeId: opts.sedeId } : {}),
        tipoDoc: { in: this.TIPOS },
        estadoEnvioSunat: { notIn: ['ANULADO', 'RECHAZADO'] },
        ...(opts?.desde ? { fechaEmision: { gte: opts.desde } } : {}),
        // Y de lo que queda, lo que entró por una importación tampoco.
        //
        // El `origenDato: null` explícito NO es redundante: en SQL,
        // `NOT (campo LIKE '%x%')` con el campo en NULL da NULL, no TRUE, y la
        // fila se descarta. Sin esa primera rama desaparecía todo lo emitido a
        // mano —que es la mayoría— y la lista salía vacía sin decir por qué.
        OR: [
          { origenDato: null },
          {
            AND: [
              { origenDato: { not: { contains: 'migracion' } } },
              { origenDato: { not: { contains: 'importacion' } } },
            ],
          },
        ],
      },
      select: {
        id: true,
        tipoDoc: true,
        serie: true,
        correlativo: true,
        fechaEmision: true,
        estadoPedido: true,
        cliente: { select: { id: true, nombre: true, nroDoc: true } },
        detalles: {
          select: {
            productoId: true,
            descripcion: true,
            cantidad: true,
            unidad: true,
            producto: { select: { codigo: true } },
          },
        },
        guiasRemision: {
          where: { estadoSunat: { not: 'ANULADO' } },
          select: {
            id: true,
            serie: true,
            correlativo: true,
            fechaEmision: true,
            detalles: { select: { productoId: true, cantidad: true } },
          },
        },
      },
      orderBy: { fechaEmision: 'desc' },
    });

    type Fila = {
      comprobanteId: number;
      documento: string;
      tipoDoc: string;
      fechaEmision: Date;
      estadoPedido: string | null;
      cliente: { id: number; nombre: string; nroDoc: string } | null;
      guias: { id: number; documento: string; fechaEmision: Date }[];
      estado: 'SIN_DESPACHAR' | 'PARCIAL' | 'COMPLETO';
      unidadesVendidas: number;
      unidadesPendientes: number;
      porcentajeDespachado: number;
      diasDesdeEmision: number;
      detalle: {
        productoId: number;
        codigo: string;
        descripcion: string;
        unidad: string | null;
        vendida: number;
        despachada: number;
        pendiente: number;
        deMas: number;
      }[];
      conExceso: boolean;
    };
    const filas: Fila[] = [];
    for (const c of comprobantes) {
      // Una línea sin producto no se puede seguir: no hay nada que comparar
      // contra la guía. (El catálogo de Kaiser no distingue servicios: no hay
      // marca en `Producto`, así que todo lo que tiene producto se despacha.)
      const lineas = c.detalles.filter((d) => d.productoId != null);
      if (!lineas.length) continue;

      const despachado = new Map<number, number>();
      for (const g of c.guiasRemision) {
        for (const d of g.detalles) {
          if (d.productoId == null) continue;
          despachado.set(
            d.productoId,
            (despachado.get(d.productoId) ?? 0) + Number(d.cantidad),
          );
        }
      }

      const detalle = lineas.map((l) => {
        const vendida = Number(l.cantidad);
        const ya = despachado.get(l.productoId as number) ?? 0;
        return {
          productoId: l.productoId as number,
          codigo: l.producto?.codigo ?? '',
          descripcion: l.descripcion,
          unidad: l.unidad,
          vendida: r3(vendida),
          despachada: r3(ya),
          // Nunca negativo: despachar de más es otro problema, y se ve aparte.
          pendiente: r3(Math.max(0, vendida - ya)),
          deMas: r3(Math.max(0, ya - vendida)),
        };
      });

      const pendiente = detalle.reduce((a, d) => a + d.pendiente, 0);
      const vendido = detalle.reduce((a, d) => a + d.vendida, 0);
      const despachadoTotal = detalle.reduce((a, d) => a + d.despachada, 0);
      const completo = pendiente <= 0.0001;
      if (soloPendientes && completo) continue;

      filas.push({
        comprobanteId: c.id,
        documento: `${c.serie}-${String(c.correlativo).padStart(8, '0')}`,
        tipoDoc: c.tipoDoc,
        fechaEmision: c.fechaEmision,
        estadoPedido: c.estadoPedido,
        cliente: c.cliente,
        guias: c.guiasRemision.map((g) => ({
          id: g.id,
          documento: `${g.serie}-${String(g.correlativo).padStart(8, '0')}`,
          fechaEmision: g.fechaEmision,
        })),
        // "sin despachar" y "a medias" se separan porque son dos situaciones
        // distintas para almacén: una está por empezar, la otra está a medio
        // hacer y alguien la dejó así.
        //
        // Lo decide lo DESPACHADO, no la existencia de una guía. Una guía enlazada
        // que no mueve ninguna de estas líneas —porque va de otros productos, o
        // porque se quedó sin líneas— dejaba el documento como "a medias" al 0 %,
        // que es una contradicción: si no salió nada, está sin despachar.
        estado:
          despachadoTotal <= 0.0001
            ? 'SIN_DESPACHAR'
            : completo
              ? 'COMPLETO'
              : 'PARCIAL',
        unidadesVendidas: r3(vendido),
        unidadesPendientes: r3(pendiente),
        porcentajeDespachado:
          vendido > 0 ? r2(((vendido - pendiente) / vendido) * 100) : 100,
        diasDesdeEmision: Math.floor(
          (Date.now() - c.fechaEmision.getTime()) / 86_400_000,
        ),
        detalle,
        conExceso: detalle.some((d) => d.deMas > 0),
      });
    }

    return {
      total: filas.length,
      sinDespachar: filas.filter((f) => f.estado === 'SIN_DESPACHAR').length,
      parciales: filas.filter((f) => f.estado === 'PARCIAL').length,
      filas,
    };
  }

  /** Lo pendiente de un solo comprobante, para el detalle de la venta. */
  async deComprobante(empresaId: number, comprobanteId: number) {
    const r = await this.pendientes(empresaId, { soloPendientes: false });
    return r.filas.find((f) => f.comprobanteId === comprobanteId) ?? null;
  }

  /**
   * Genera la notificación de lo que sigue pendiente. La llama el scheduler una
   * vez al día.
   *
   * Solo avisa de lo que lleva `diasGracia` días o más sin completarse: un pedido
   * facturado esta mañana y aún sin guía no es una alerta, es el curso normal del
   * día. Un aviso que salta siempre no se lee.
   */
  async avisar(empresaId: number, diasGracia = 1) {
    const { filas } = await this.pendientes(empresaId);
    const tarde = filas.filter((f) => f.diasDesdeEmision >= diasGracia);
    if (!tarde.length) return { avisados: 0, documentos: [] as string[] };

    const parciales = tarde.filter((f) => f.estado === 'PARCIAL');
    const sin = tarde.filter((f) => f.estado === 'SIN_DESPACHAR');

    const partes: string[] = [];
    if (parciales.length) {
      partes.push(
        `${parciales.length} ${parciales.length === 1 ? 'venta despachada a medias' : 'ventas despachadas a medias'}`,
      );
    }
    if (sin.length) {
      partes.push(
        `${sin.length} ${sin.length === 1 ? 'sin guía todavía' : 'sin guía todavía'}`,
      );
    }

    // El ejemplo concreto es lo que hace útil el aviso: "4 de 10 unidades"
    // dice qué hacer; "tienes pendientes" no.
    const muestra = parciales[0] ?? sin[0];
    const linea = muestra.detalle.find((d) => d.pendiente > 0);
    const ejemplo = linea
      ? ` Por ejemplo ${muestra.documento} (${muestra.cliente?.nombre ?? 'sin cliente'}): ` +
        `de ${linea.vendida} ${linea.unidad ?? 'und'} de ${linea.codigo} ` +
        `se despacharon ${linea.despachada} y faltan ${linea.pendiente}.`
      : '';

    // Dedup: si ya hay un aviso sin leer de las últimas 20 horas, no se repite.
    // Un aviso diario que se acumula sin leer deja de ser un aviso.
    const hace20h = new Date(Date.now() - 20 * 60 * 60 * 1000);
    const yaHay = await this.prisma.notificacion.findFirst({
      where: {
        empresaId,
        titulo: TITULO,
        leida: false,
        creadoEn: { gte: hace20h },
      },
      select: { id: true },
    });
    if (yaHay) return { avisados: 0, yaAvisado: true, documentos: [] as string[] };

    // A quién le importa: gerencia y quien despacha. Notificar solo a los
    // administradores dejaría fuera justo a almacén, que es quien tiene que
    // sacar la mercadería.
    const destinatarios = await this.prisma.usuario.findMany({
      where: {
        empresaId,
        estado: 'ACTIVO',
        OR: [
          { rol: 'ADMIN_EMPRESA' },
          // `Usuario.permisos` es un JSON guardado como TEXTO, no un array de
          // Postgres, así que no hay operador `has`. Se busca el nombre entre
          // comillas para no confundir 'kardex' con 'kardex:escribir'.
          { permisos: { contains: '"guias-remision"' } },
          { permisos: { contains: '"kardex:escribir"' } },
          { permisos: { contains: '"*"' } },
        ],
      },
      select: { id: true },
    });

    const meta = {
      tipo: 'DESPACHO_PENDIENTE',
      total: tarde.length,
      parciales: parciales.length,
      sinDespachar: sin.length,
      documentos: tarde.slice(0, 20).map((f) => f.documento),
    };

    for (const u of destinatarios) {
      const notif = await this.prisma.notificacion.create({
        data: {
          usuarioId: u.id,
          empresaId,
          tipo: parciales.length ? 'WARNING' : 'INFO',
          titulo: TITULO,
          mensaje: `${partes.join(' y ')}.${ejemplo}`,
          leida: false,
          metaData: meta,
        },
      });
      this.notificaciones.emitirNotificacionEnTiempoReal(u.id, notif);
    }

    this.log.log(
      `Aviso de despacho pendiente: ${tarde.length} documento(s) (${parciales.length} a medias, ${sin.length} sin guía)`,
    );
    return {
      avisados: tarde.length,
      destinatarios: destinatarios.length,
      parciales: parciales.length,
      sinDespachar: sin.length,
      documentos: tarde.map((f) => f.documento),
    };
  }
}

const TITULO = 'Despachos pendientes';
const r2 = (n: number) => Math.round(n * 100) / 100;
const r3 = (n: number) => Math.round(n * 1000) / 1000;
