// Definición de los elementos configurables del formato de cotización.
// Compartido entre el modal de configuración y el componente de impresión.

export interface ElemDef {
  key: string;
  label: string;
  /** Si el elemento se puede mostrar/ocultar. */
  hasVisible: boolean;
  /** Tamaño por defecto (px de fuente, o px de ancho para el logo). */
  defaultSize: number;
  /**
   * Tamaño histórico del elemento en el ticket de 80mm (px). Por defecto 16, que
   * es la base de la fuente térmica.
   */
  ticketBase?: number;
  min: number;
  max: number;
  unit?: string;
  /** Visibilidad cuando no hay nada guardado. Por defecto, visible. */
  defaultVisible?: boolean;
  grupo: 'Encabezado' | 'Cuerpo' | 'Pie';
}

export const COTIZ_ELEMENTOS: ElemDef[] = [
  { key: 'logo', label: 'Logo', hasVisible: true, defaultSize: 150, min: 40, max: 220, unit: 'px', grupo: 'Encabezado' },
  { key: 'nombreComercial', label: 'Nombre comercial', hasVisible: true, defaultSize: 20, min: 10, max: 32, grupo: 'Encabezado' },
  { key: 'direccion', label: 'Dirección', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'rubro', label: 'Rubro / actividad', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'razonSocial', label: 'Razón social', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'celular', label: 'Celular', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'email', label: 'Email', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'web', label: 'Página web', hasVisible: true, defaultSize: 12, min: 8, max: 18, grupo: 'Encabezado' },
  { key: 'datosCliente', label: 'Datos del cliente', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'datosCotizacion', label: 'Datos de la cotización', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'productos', label: 'Tabla de productos', hasVisible: false, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'obsProducto', label: 'Observación por producto', hasVisible: true, defaultSize: 10, min: 7, max: 14, grupo: 'Cuerpo' },
  { key: 'sonTexto', label: 'Total en letras (SON:)', hasVisible: true, defaultSize: 18, min: 10, max: 24, grupo: 'Cuerpo' },
  { key: 'observaciones', label: 'Observaciones', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'detraccion', label: 'Detracción', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opGravadas', label: 'Op. gravadas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opExoneradas', label: 'Op. exoneradas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opInafectas', label: 'Op. inafectas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'opGratuitas', label: 'Op. gratuitas', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'subTotal', label: 'Sub total', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'descuentos', label: 'Descuentos', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'igv', label: 'IGV', hasVisible: true, defaultSize: 12, min: 8, max: 16, grupo: 'Cuerpo' },
  { key: 'montoTotal', label: 'Monto total', hasVisible: true, defaultSize: 18, min: 10, max: 24, grupo: 'Cuerpo' },
  // NOTA: MyPE tiene aquí un modo "precios unitarios sin IGV" y un QR de Yape/Plin.
  // Ninguno se trajo: la cotización A4 de Kaiser YA imprime VALOR UNIT y VALOR
  // VENTA sin IGV de forma permanente —su diseño está construido sobre eso—, así
  // que el interruptor sugeriría que se puede apagar; y el QR de billetera es de
  // mostrador: Kaiser cotiza a empresas y ya imprime sus cuentas bancarias.
  { key: 'cuentas', label: 'Cuentas bancarias', hasVisible: true, defaultSize: 10, min: 7, max: 16, grupo: 'Pie' },
  // El texto del mensaje se edita en el bloque "Textos del documento", que es
  // donde Kaiser guarda los suyos; aquí solo se controla si sale y de qué tamaño.
  { key: 'gracias', label: 'Mensaje de agradecimiento', hasVisible: true, defaultSize: 10, min: 7, max: 16, grupo: 'Pie', ticketBase: 15 },
];

/**
 * Formatos que pueden llevar un tamaño PROPIO, desvinculado del general.
 *
 * A4 es el tamaño general; A5 y Ticket lo siguen salvo que se desvincule ese
 * elemento. Hace falta porque el ticket se imprime con fuente térmica a 16px de
 * base mientras el modal piensa en A4 (10-12px): sin esto, subir un título en A4
 * lo dejaba ilegible en el ticket.
 */
export type FormatoOverride = 'a5' | 'ticket';
export type FormatoImpresionKey = 'A4' | 'A5' | 'TICKET';

export const OVERRIDE_POR_FORMATO: Record<FormatoImpresionKey, FormatoOverride | null> = {
  A4: null,
  A5: 'a5',
  TICKET: 'ticket',
};

export type CotizConfig = Record<
  string,
  {
    visible?: boolean;
    size?: number;
    /** Tamaño propio en A5 (px). Ausente = sigue al general. */
    a5?: { size?: number };
    /** Tamaño propio en ticket (px reales del ticket). Ausente = general escalado. */
    ticket?: { size?: number };
  }
>;

/** Tamaño propio guardado para un formato, o `undefined` si sigue al general. */
export function sizeOverride(
  config: CotizConfig | undefined | null,
  key: string,
  formato: FormatoImpresionKey,
): number | undefined {
  const ov = OVERRIDE_POR_FORMATO[formato];
  if (!ov) return undefined;
  const n = Number((config || {})[key]?.[ov]?.size);
  return n > 0 ? n : undefined;
}

/** Lee visibilidad, tamaño y texto propio de un elemento con sus valores por defecto. */
export function elemCfg(
  config: CotizConfig | undefined | null,
  key: string,
  formato?: FormatoImpresionKey,
) {
  const def = COTIZ_ELEMENTOS.find((e) => e.key === key);
  const c = (config || {})[key] || {};
  // A5 con tamaño propio manda sobre el general. El ticket se resuelve en
  // `ticketPx`, porque además escala respecto a la fuente térmica.
  const propioA5 = formato === 'A5' ? sizeOverride(config, key, 'A5') : undefined;
  return {
    // Sin valor guardado se usa `defaultVisible` del elemento (por defecto, sí).
    visible: c.visible !== undefined ? c.visible : (def?.defaultVisible ?? true),
    size: propioA5 ?? c.size ?? def?.defaultSize ?? 12,
  };
}

/**
 * Tamaño efectivo (px) de un elemento en el TICKET de 80mm.
 *
 * El ticket usa fuente VT323 a 16px de base, mientras que los tamaños del modal
 * están pensados para A4. Por eso el valor configurado no se aplica tal cual: se
 * escala respecto a su propio default, de modo que sin configurar nada el ticket
 * sale exactamente como siempre y cada «+»/«−» lo agranda o achica en proporción.
 * `base` permite escalar líneas secundarias con el mismo factor.
 */
export function ticketPx(
  config: CotizConfig | undefined | null,
  key: string,
  base?: number,
): number {
  const def = COTIZ_ELEMENTOS.find((e) => e.key === key);
  const defaultSize = def?.defaultSize ?? 12;
  const tb = def?.ticketBase ?? 16;
  const b = base ?? tb;
  const propio = sizeOverride(config, key, 'TICKET');
  if (propio) return Math.max(8, Math.round((b * propio) / tb));
  return Math.max(8, Math.round((b * elemCfg(config, key).size) / defaultSize));
}

