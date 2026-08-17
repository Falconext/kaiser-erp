import { get, post, del } from '../fetch';
import type {
  IResultadoConciliacion,
  IPlantillaExcel,
  IConciliacionGuardadaItem,
  IConciliacionGuardadaDetalle,
} from '@/features/admin/finanzas/conciliacion/ConciliacionModel';

const BASE = '/finanzas';

// ── Conciliación bancaria ──────────────────────────────────────────────────
export const getPlantillaConciliacion = () =>
  get<IPlantillaExcel>(`${BASE}/conciliacion/plantilla`);

export const importarConciliacion = (
  archivoBase64: string,
  fechaInicio?: string,
  fechaFin?: string,
) =>
  post<IResultadoConciliacion>(`${BASE}/conciliacion/importar`, {
    archivoBase64,
    fechaInicio,
    fechaFin,
  });

export const exportarConciliacionExcel = (
  resultado: IResultadoConciliacion,
  observaciones?: string,
) =>
  post<IPlantillaExcel>(`${BASE}/conciliacion/exportar-excel`, {
    resultado,
    observaciones,
  });

// ── Historial de conciliaciones guardadas ──────────────────────────────────
export const guardarConciliacion = (
  resultado: IResultadoConciliacion,
  observaciones?: string,
  fechaInicio?: string,
  fechaFin?: string,
) =>
  post<{ id: number; creadoEn: string }>(`${BASE}/conciliacion/guardar`, {
    resultado,
    observaciones,
    fechaInicio,
    fechaFin,
  });

export const listarConciliacionesGuardadas = () =>
  get<IConciliacionGuardadaItem[]>(`${BASE}/conciliacion/guardadas`);

export const obtenerConciliacionGuardada = (id: number) =>
  get<IConciliacionGuardadaDetalle>(`${BASE}/conciliacion/guardadas/${id}`);

export const eliminarConciliacionGuardada = (id: number) =>
  del<{ id: number; eliminado: boolean }>(
    `${BASE}/conciliacion/guardadas/${id}`,
  );
