/**
 * Qué mueve en el kardex una guía de remisión, según su motivo de traslado
 * (catálogo SUNAT N° 20).
 *
 * El problema que resuelve: la mercadería que sale o entra SOLO con guía
 * —traslados entre almacenes, consignaciones, devoluciones— no dejaba ningún
 * rastro en la tarjeta de stock. Almacén lo reportó así: "en la base de ventas
 * sí figuran los movimientos de ventas, pero no los que se movieron solo a
 * través de las guías".
 *
 * El criterio es: la guía mueve stock SOLO cuando no hay otro documento que ya
 * lo haya movido. Una guía por venta acompaña a una factura que ya descontó el
 * stock; volver a descontarlo dejaría el inventario en negativo.
 */

export type EfectoKardex = 'SALIDA' | 'INGRESO' | 'TRANSFERENCIA' | 'NINGUNO';

interface Motivo {
  efecto: EfectoKardex;
  /** Por qué, para que el concepto del movimiento se explique solo. */
  concepto: string;
}

const MOTIVOS: Record<string, Motivo> = {
  // Ya lo movió otro documento: la factura, la boleta o la compra.
  '01': { efecto: 'NINGUNO', concepto: 'Venta' },
  '02': { efecto: 'NINGUNO', concepto: 'Compra' },
  '03': { efecto: 'NINGUNO', concepto: 'Venta con entrega a terceros' },
  '08': { efecto: 'NINGUNO', concepto: 'Importación' },
  '09': { efecto: 'NINGUNO', concepto: 'Exportación' },
  '14': { efecto: 'NINGUNO', concepto: 'Venta sujeta a confirmación' },

  // La mercadería cambia de almacén dentro de la empresa.
  '04': {
    efecto: 'TRANSFERENCIA',
    concepto: 'Traslado entre establecimientos',
  },

  // Sale del almacén sin que haya venta todavía.
  '05': { efecto: 'SALIDA', concepto: 'Consignación' },
  '17': { efecto: 'SALIDA', concepto: 'Traslado para transformación' },
  '18': { efecto: 'SALIDA', concepto: 'Traslado por emisor itinerante' },

  // Vuelve al almacén.
  '06': { efecto: 'INGRESO', concepto: 'Devolución' },
  '07': { efecto: 'INGRESO', concepto: 'Recojo de bienes transformados' },

  // Ambiguos: no se toca el stock solo, porque la dirección no se puede
  // deducir del código. Si hace falta, el almacenero registra el ajuste.
  '13': { efecto: 'NINGUNO', concepto: 'Otros' },
  '19': { efecto: 'NINGUNO', concepto: 'Traslado de mercancía extranjera' },
};

export function efectoDeMotivo(
  tipoTraslado: string | null | undefined,
): Motivo {
  return (
    MOTIVOS[String(tipoTraslado ?? '').trim()] ?? {
      efecto: 'NINGUNO',
      concepto: `Motivo ${tipoTraslado ?? '—'}`,
    }
  );
}

/** Texto del concepto que se guarda en cada movimiento de kardex. */
export function conceptoMovimiento(
  tipoTraslado: string | null | undefined,
  serie: string,
  correlativo: number,
  sufijo?: string,
): string {
  const { concepto } = efectoDeMotivo(tipoTraslado);
  const doc = `${serie}-${String(correlativo).padStart(8, '0')}`;
  return `GUÍA ${doc} · ${concepto}${sufijo ? ` (${sufijo})` : ''}`;
}
