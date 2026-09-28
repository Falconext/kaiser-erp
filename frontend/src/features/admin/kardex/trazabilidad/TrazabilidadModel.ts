/**
 * Trazabilidad de un código: qué le pasó, quién lo registró y qué no cuadra.
 *
 * Lo pidió la jefa de almacén para poder auditar: "no hay forma de auditar
 * quién modificó el inventario, lo que debilita la transparencia de la gestión
 * de esta jefatura".
 */

export interface DocumentoTraza {
  tipo: string;
  numero: string | null;
  fecha: string | null;
}

export interface MovimientoTraza {
  id: number;
  fecha: string;
  /** Cuándo se tecleó en el sistema (sello de tiempo). */
  registradoEn: string;
  /** Días entre la fecha del documento y el registro. Null si no se puede saber. */
  diasDeDesfase: number | null;
  tipoMovimiento: 'INGRESO' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA';
  concepto: string;
  documento: DocumentoTraza;
  cantidad: number;
  stockAnterior: number;
  stockActual: number;
  costoUnitario: number | null;
  valorTotal: number | null;
  lote: string | null;
  observacion: string | null;
  sede: { id: number; nombre: string } | null;
  usuario: { id: number; nombre: string; email: string } | null;
}

export interface ResumenTraza {
  movimientos: number;
  primerMovimiento: string | null;
  ultimoMovimiento: string | null;
  stockActual: number;
  /** Movimientos tecleados más de un día después de la fecha del documento. */
  registradosTarde: number;
  mayorDesfaseEnDias: number;
  descuadres: number;
}

export interface Descuadre {
  despuesDelMovimiento: number;
  esperado: number;
  encontrado: number;
}

export interface ResumenPorUsuario {
  usuario: string;
  movimientos: number;
  ingresos: number;
  salidas: number;
}

export interface Trazabilidad {
  producto: {
    id: number;
    codigo: string;
    descripcion: string;
    unidadVenta: string | null;
    costoPromedio: unknown;
  };
  resumen: ResumenTraza;
  lineaDeTiempo: MovimientoTraza[];
  porUsuario: ResumenPorUsuario[];
  descuadres: Descuadre[];
}

/** Etiquetas con el vocabulario de almacén, igual que en Ingresos y salidas. */
export const ETIQUETA_MOVIMIENTO: Record<string, string> = {
  INGRESO: 'Nota de ingreso',
  SALIDA: 'Nota de salida',
  AJUSTE: 'Ajuste',
  TRANSFERENCIA: 'Traslado',
};
