// Definición de los elementos configurables del formato de cotización.
// Compartido entre el modal de configuración y el componente de impresión.

export interface ElemDef {
  key: string;
  label: string;
  /** Si el elemento se puede mostrar/ocultar. */
  hasVisible: boolean;
  /** Tamaño por defecto (px de fuente, o px de ancho para el logo). */
  defaultSize: number;
  min: number;
  max: number;
  unit?: string;
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
  { key: 'cuentas', label: 'Cuentas bancarias', hasVisible: true, defaultSize: 10, min: 7, max: 16, grupo: 'Pie' },
  { key: 'gracias', label: 'Mensaje de agradecimiento', hasVisible: true, defaultSize: 10, min: 7, max: 16, grupo: 'Pie' },
];

export type CotizConfig = Record<string, { visible?: boolean; size?: number }>;

/** Lee visibilidad y tamaño de un elemento con sus valores por defecto. */
export function elemCfg(config: CotizConfig | undefined | null, key: string) {
  const def = COTIZ_ELEMENTOS.find((e) => e.key === key);
  const c = (config || {})[key] || {};
  return {
    visible: c.visible !== false,
    size: c.size ?? def?.defaultSize ?? 12,
  };
}
