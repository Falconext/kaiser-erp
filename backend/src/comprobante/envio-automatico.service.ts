import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Envío automático del comprobante al cliente cuando SUNAT lo acepta.
 *
 * El envío por correo ya existía, pero solo a mano: alguien tenía que abrir el
 * comprobante y pulsar el botón, uno por uno. Esto lo hace solo, y con cuatro
 * reglas que conviene entender antes de tocarlo:
 *
 * 1. **Apagado por defecto** (`Empresa.enviarComprobanteEmail`). Encenderlo manda
 *    correo a clientes reales: es una decisión de la empresa, no un valor por
 *    defecto que se active solo al desplegar.
 *
 * 2. **Nunca rompe la emisión.** Se llama sin `await` desde el flujo de SUNAT y
 *    se traga sus propios errores. Facturar no puede fallar porque el servidor de
 *    correo esté caído, igual que no puede fallar porque la contabilidad esté mal
 *    configurada.
 *
 * 3. **Solo una vez.** `emailEnviadoEn` deja constancia; un reintento de SUNAT o
 *    una consulta de estado no vuelven a mandarlo.
 *
 * 4. **Solo comprobantes formales aceptados.** Una cotización o una nota de venta
 *    no se envían solas: esas las manda el vendedor cuando decide, con lo que
 *    quiera escribir en el correo.
 */
@Injectable()
export class EnvioAutomaticoService {
  private readonly log = new Logger(EnvioAutomaticoService.name);

  /** Lo que SUNAT acepta y el cliente espera recibir. */
  private readonly TIPOS = ['01', '03', '07', '08'];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Decide y envía. Devuelve por qué NO se envió cuando corresponde, para que el
   * log diga algo útil en vez de callar.
   *
   * `enviar` se recibe como función para no atar este servicio a
   * `ComprobanteService` (que ya es enorme y tiene dependencias circulares).
   */
  async alAceptarSunat(
    comprobanteId: number,
    enviar: (id: number, destinatario: string) => Promise<void>,
  ): Promise<{ enviado: boolean; motivo?: string; destinatario?: string }> {
    const comp = await this.prisma.comprobante.findUnique({
      where: { id: comprobanteId },
      select: {
        id: true,
        empresaId: true,
        tipoDoc: true,
        serie: true,
        correlativo: true,
        estadoEnvioSunat: true,
        emailEnviadoEn: true,
        cliente: {
          select: { nombre: true, email: true, contactoEmail: true },
        },
        empresa: { select: { enviarComprobanteEmail: true } },
      },
    });

    if (!comp) return { enviado: false, motivo: 'el comprobante no existe' };
    if (!comp.empresa?.enviarComprobanteEmail)
      return { enviado: false, motivo: 'el envío automático está apagado' };
    if (!this.TIPOS.includes(comp.tipoDoc))
      return { enviado: false, motivo: `${comp.tipoDoc} no se envía solo` };
    if (comp.estadoEnvioSunat !== 'EMITIDO')
      return { enviado: false, motivo: 'SUNAT todavía no lo aceptó' };
    if (comp.emailEnviadoEn)
      return { enviado: false, motivo: 'ya se había enviado' };

    // El correo del cliente, o el de su persona de contacto. Sin ninguno no hay
    // nada que hacer: no es un error, es un dato que falta en la ficha.
    const destinatario = (comp.cliente?.email || comp.cliente?.contactoEmail || '').trim();
    if (!destinatario || !destinatario.includes('@'))
      return { enviado: false, motivo: 'el cliente no tiene correo en su ficha' };

    const doc = `${comp.serie}-${String(comp.correlativo).padStart(8, '0')}`;
    try {
      await enviar(comp.id, destinatario);
      await this.prisma.comprobante.update({
        where: { id: comp.id },
        data: { emailEnviadoEn: new Date(), emailEnviadoA: destinatario },
      });
      this.log.log(`📧 ${doc} enviado a ${destinatario}`);
      return { enviado: true, destinatario };
    } catch (e) {
      // Se registra y se sigue: el comprobante está emitido y aceptado, que es lo
      // que importa. El botón de enviar a mano sigue estando para reintentar.
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`No se pudo enviar ${doc} a ${destinatario}: ${msg}`);
      return { enviado: false, motivo: msg, destinatario };
    }
  }
}
