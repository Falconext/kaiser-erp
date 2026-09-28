/**
 * Consolidado de movimientos de almacén.
 *
 * Almacén lo pidió en tres puntos de su ficha —ingresos, salidas y traslados—
 * y son la misma pregunta con distinto filtro: qué se movió, de qué documento
 * vino y quién lo registró.
 */

export type TipoConsolidado = 'TODOS' | 'INGRESOS' | 'SALIDAS' | 'TRASLADOS';

export interface FilaConsolidado {
  id: number;
  fecha: string;
  registradoEn: string;
  tipoMovimiento: 'INGRESO' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA';
  concepto: string;
  documentoTipo: string;
  documentoNumero: string | null;
  documentoFecha: string | null;
  /** Cliente de la venta, proveedor de la compra o destinatario de la guía. */
  contraparte: string | null;
  productoId: number | null;
  codigo: string | null;
  descripcion: string | null;
  unidad: string | null;
  cantidad: number;
  costoUnitario: number | null;
  valorTotal: number | null;
  stockAnterior: number;
  stockActual: number;
  lote: string | null;
  sede: string | null;
  usuario: string | null;
  observacion: string | null;
}

export interface Consolidado {
  filtros: { tipo: TipoConsolidado; desde?: string; hasta?: string };
  resumen: {
    movimientos: number;
    valorTotal: number;
    porTipo: {
      tipoMovimiento: string;
      movimientos: number;
      cantidad: number;
      valor: number;
    }[];
  };
  movimientos: FilaConsolidado[];
}

/** Vocabulario de almacén, el mismo de Ingresos y salidas. */
export const ETIQUETA_MOVIMIENTO: Record<string, string> = {
  INGRESO: 'Nota de ingreso',
  SALIDA: 'Nota de salida',
  AJUSTE: 'Ajuste',
  TRANSFERENCIA: 'Traslado',
};

export const PESTANAS: { valor: TipoConsolidado; etiqueta: string; icono: string }[] = [
  { valor: 'TODOS', etiqueta: 'Todo', icono: 'solar:list-bold-duotone' },
  { valor: 'INGRESOS', etiqueta: 'Notas de ingreso', icono: 'solar:download-minimalistic-bold-duotone' },
  { valor: 'SALIDAS', etiqueta: 'Notas de salida', icono: 'solar:upload-minimalistic-bold-duotone' },
  { valor: 'TRASLADOS', etiqueta: 'Traslados', icono: 'solar:transfer-horizontal-bold-duotone' },
];
