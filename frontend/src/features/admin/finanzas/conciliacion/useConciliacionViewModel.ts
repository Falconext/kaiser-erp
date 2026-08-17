import React, { useEffect, useMemo, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';
import * as api from '@/utils/api/finanzas';
import { ConciliacionReportPDF } from './ConciliacionReportPDF';
import type {
  IResultadoConciliacion,
  IPlantillaExcel,
  IConciliacionGuardadaItem,
} from './ConciliacionModel';

const leerBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export type FiltroEstado = 'TODOS' | 'CONCILIADO' | 'PENDIENTE';

export function useConciliacionViewModel() {
  const alertStore = useAlertStore();
  const { auth } = useAuthStore();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [resultado, setResultado] = useState<IResultadoConciliacion | null>(
    null,
  );
  const [cargando, setCargando] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [generandoExcel, setGenerandoExcel] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [filtro, setFiltro] = useState<FiltroEstado>('TODOS');
  const [guardando, setGuardando] = useState(false);
  const [guardadas, setGuardadas] = useState<IConciliacionGuardadaItem[]>([]);
  const [cargandoGuardadas, setCargandoGuardadas] = useState(false);
  const [guardadaActivaId, setGuardadaActivaId] = useState<number | null>(null);

  const empresa = useMemo(
    () =>
      auth?.empresa
        ? {
            nombre: auth.empresa.razonSocial || auth.empresa.nombre,
            ruc: auth.empresa.ruc,
            direccion: auth.empresa.direccion,
          }
        : null,
    [auth?.empresa],
  );

  const conciliar = async () => {
    if (!archivo) {
      alertStore.alert('Selecciona el Excel del banco primero', 'error');
      return;
    }
    setCargando(true);
    setResultado(null);
    try {
      const base64 = await leerBase64(archivo);
      const res = await api.importarConciliacion(
        base64,
        fechaInicio || undefined,
        fechaFin || undefined,
      );
      if (res.success && res.data) {
        setResultado(res.data as IResultadoConciliacion);
        const r = (res.data as IResultadoConciliacion).resumen;
        alertStore.alert(
          `Conciliación lista: ${r.conciliados} conciliados, ${r.pendientesBanco} pendientes`,
          'success',
        );
      } else {
        alertStore.alert(res.error || 'No se pudo conciliar', 'error');
      }
    } catch (e: any) {
      alertStore.alert(e.message || 'Error al conciliar', 'error');
    } finally {
      setCargando(false);
    }
  };

  const descargarPlantilla = async () => {
    try {
      const res = await api.getPlantillaConciliacion();
      if (res.success && res.data) {
        const { nombreArchivo, base64 } = res.data as IPlantillaExcel;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      alertStore.alert(e.message || 'Error al descargar plantilla', 'error');
    }
  };

  const descargarPdf = async () => {
    if (!resultado) {
      alertStore.alert('Primero ejecuta la conciliación', 'error');
      return;
    }
    setGenerandoPdf(true);
    try {
      const blob = await pdf(
        React.createElement(ConciliacionReportPDF, {
          data: resultado,
          empresa,
          rango: { desde: fechaInicio || undefined, hasta: fechaFin || undefined },
          observaciones: observaciones.trim() || undefined,
        }) as any,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const hoy = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `conciliacion-bancaria-${hoy}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alertStore.alert(e.message || 'No se pudo generar el PDF', 'error');
    } finally {
      setGenerandoPdf(false);
    }
  };

  const descargarExcel = async () => {
    if (!resultado) {
      alertStore.alert('Primero ejecuta la conciliación', 'error');
      return;
    }
    setGenerandoExcel(true);
    try {
      const res = await api.exportarConciliacionExcel(
        resultado,
        observaciones.trim() || undefined,
      );
      if (res.success && res.data) {
        const { nombreArchivo, base64 } = res.data as IPlantillaExcel;
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alertStore.alert(res.error || 'No se pudo generar el Excel', 'error');
      }
    } catch (e: any) {
      alertStore.alert(e.message || 'No se pudo generar el Excel', 'error');
    } finally {
      setGenerandoExcel(false);
    }
  };

  // ── Historial (persistencia) ──────────────────────────────────────────────
  const cargarGuardadas = async () => {
    setCargandoGuardadas(true);
    try {
      const res = await api.listarConciliacionesGuardadas();
      if (res.success && res.data) {
        setGuardadas(res.data as IConciliacionGuardadaItem[]);
      }
    } catch (e: any) {
      alertStore.alert(e.message || 'Error al cargar el historial', 'error');
    } finally {
      setCargandoGuardadas(false);
    }
  };

  const guardarConciliacion = async () => {
    if (!resultado) {
      alertStore.alert('Primero ejecuta la conciliación', 'error');
      return;
    }
    setGuardando(true);
    try {
      const res = await api.guardarConciliacion(
        resultado,
        observaciones.trim() || undefined,
        fechaInicio || undefined,
        fechaFin || undefined,
      );
      if (res.success && res.data) {
        alertStore.alert('Conciliación guardada correctamente', 'success');
        await cargarGuardadas();
      } else {
        alertStore.alert(res.error || 'No se pudo guardar', 'error');
      }
    } catch (e: any) {
      alertStore.alert(e.message || 'No se pudo guardar la conciliación', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const verGuardada = async (id: number) => {
    try {
      const res = await api.obtenerConciliacionGuardada(id);
      if (res.success && res.data) {
        const det = res.data;
        setResultado(det.resultado as IResultadoConciliacion);
        setObservaciones(det.observaciones || '');
        setFechaInicio(det.fechaInicio || '');
        setFechaFin(det.fechaFin || '');
        setGuardadaActivaId(det.id);
        setFiltro('TODOS');
        alertStore.alert('Conciliación cargada', 'success');
      } else {
        alertStore.alert(res.error || 'No se pudo cargar', 'error');
      }
    } catch (e: any) {
      alertStore.alert(e.message || 'No se pudo cargar la conciliación', 'error');
    }
  };

  const eliminarGuardada = async (id: number) => {
    try {
      const res = await api.eliminarConciliacionGuardada(id);
      if (res.success) {
        alertStore.alert('Conciliación eliminada', 'success');
        if (guardadaActivaId === id) setGuardadaActivaId(null);
        setGuardadas((prev) => prev.filter((g) => g.id !== id));
      } else {
        alertStore.alert(res.error || 'No se pudo eliminar', 'error');
      }
    } catch (e: any) {
      alertStore.alert(e.message || 'No se pudo eliminar la conciliación', 'error');
    }
  };

  useEffect(() => {
    cargarGuardadas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const movimientosFiltrados =
    resultado?.movimientos.filter((m) =>
      filtro === 'TODOS' ? true : m.estado === filtro,
    ) ?? [];

  return {
    archivo,
    setArchivo,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    resultado,
    cargando,
    generandoPdf,
    generandoExcel,
    observaciones,
    setObservaciones,
    filtro,
    setFiltro,
    movimientosFiltrados,
    conciliar,
    descargarPlantilla,
    descargarPdf,
    descargarExcel,
    // Historial
    guardando,
    guardadas,
    cargandoGuardadas,
    guardadaActivaId,
    guardarConciliacion,
    cargarGuardadas,
    verGuardada,
    eliminarGuardada,
  };
}
