import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { get, del } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { usePuedeEscribir } from '@/hooks/usePuedeEscribir';

export interface TotalesPlanilla {
  trabajadores: number;
  basico: number; asignacionFamiliar: number; horasExtras: number; comisiones: number;
  bonificaciones: number; gratificacion: number; vacaciones: number; cts: number;
  totalIngresos: number; afp: number; onp: number; rentaQuinta: number;
  otrosDescuentos: number; totalDescuentos: number; neto: number; essalud: number;
}

export interface FilaPlanilla {
  fila: number; dni: string | null; nombres: string;
  totalIngresos: number; totalDescuentos: number; neto: number; essalud: number;
}

export interface VistaPrevia {
  anio: number; mes: number; simulado: boolean;
  filas: FilaPlanilla[];
  errores: string[]; avisos: string[];
  columnasReconocidas: string[]; columnasIgnoradas: string[];
  totales: TotalesPlanilla;
  yaImportada: { id: number; trabajadores: number; asientoId: number | null; creadoEn: string } | null;
  planillaId: number | null; gastoId: number | null;
  asiento: { id: number; cuo: string; totalDebe: number } | null;
}

export interface PlanillaHistorial {
  id: number; anio: number; mes: number; trabajadores: number;
  totalIngresos: number; totalDescuentos: number; totalNeto: number; totalEssalud: number;
  costoEmpresa: number; archivoNombre: string | null; importadoPor: string | null; creadoEn: string;
  gastoId: number | null;
  asiento: { id: number; cuo: string; estado: string; totalDebe: number } | null;
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const soles = (n: number) =>
  `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const usePlanillaViewModel = () => {
  const { alert } = useAlertStore();
  const puedeEscribir = usePuedeEscribir('contabilidad');
  const inputArchivo = useRef<HTMLInputElement | null>(null);

  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<VistaPrevia | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [historial, setHistorial] = useState<PlanillaHistorial[]>([]);

  const cargarHistorial = useCallback(async () => {
    const r = await get<PlanillaHistorial[]>('contabilidad/planilla');
    if (r.success && r.data) setHistorial(r.data);
  }, []);
  useEffect(() => { void cargarHistorial(); }, [cargarHistorial]);

  const descargarPlantilla = async () => {
    try {
      const r = await apiClient.get('contabilidad/planilla/plantilla', { responseType: 'blob' });
      const url = URL.createObjectURL(r.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Plantilla-planilla.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('No se pudo descargar la plantilla', 'error');
    }
  };

  /** Siempre se simula primero: nadie escribe una planilla sin verla antes. */
  const elegirArchivo = async (f: File | null) => {
    setArchivo(f);
    setPrevia(null);
    if (!f) return;
    setTrabajando(true);
    const fd = new FormData();
    fd.append('file', f);
    fd.append('anio', String(anio));
    fd.append('mes', String(mes));
    try {
      const r = await apiClient.post('contabilidad/planilla/importar?simular=true', fd);
      setPrevia((r.data as { data: VistaPrevia }).data);
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'No se pudo leer el archivo', 'error');
      setArchivo(null);
      if (inputArchivo.current) inputArchivo.current.value = '';
    } finally {
      setTrabajando(false);
    }
  };

  const confirmar = async () => {
    if (!archivo || !previa || previa.errores.length) return;
    setTrabajando(true);
    const fd = new FormData();
    fd.append('file', archivo);
    fd.append('anio', String(anio));
    fd.append('mes', String(mes));
    try {
      const r = await apiClient.post('contabilidad/planilla/importar', fd);
      const d = (r.data as { data: VistaPrevia }).data;
      alert(`Planilla importada · asiento ${d.asiento?.cuo ?? ''}`, 'success');
      setArchivo(null);
      setPrevia(null);
      if (inputArchivo.current) inputArchivo.current.value = '';
      void cargarHistorial();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(msg || 'No se pudo importar', 'error');
    } finally {
      setTrabajando(false);
    }
  };

  const eliminar = async (id: number) => {
    const r = await del<{ message: string }>(`contabilidad/planilla/${id}`);
    if (r.success) {
      alert((r.data as { message?: string })?.message ?? 'Planilla eliminada', 'success');
      void cargarHistorial();
    } else {
      alert(r.error || 'No se pudo eliminar', 'error');
    }
  };

  return {
    anio, setAnio, mes, setMes, archivo, previa, trabajando, historial,
    puedeEscribir, inputArchivo,
    descargarPlantilla, elegirArchivo, confirmar, eliminar,
  };
};
