import { useCallback, useEffect, useState } from 'react';
import moment from 'moment';
import { get } from '@/utils/fetch';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useSedesStore } from '@/zustand/sedes';
import type { Consolidado, TipoConsolidado } from './ConsolidadoModel';

export function useConsolidadoViewModel() {
  const { alert } = useAlertStore();
  const { sedes, listarSedes } = useSedesStore();

  const [tipo, setTipo] = useState<TipoConsolidado>('TODOS');
  // Igual que el resto de listados: el mes en curso, no solo hoy.
  const [desde, setDesde] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [hasta, setHasta] = useState(moment().format('YYYY-MM-DD'));
  const [sedeId, setSedeId] = useState<string>('');

  const [datos, setDatos] = useState<Consolidado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    listarSedes?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const query = useCallback(() => {
    const p = new URLSearchParams({ tipo, desde, hasta });
    if (sedeId) p.set('sedeId', sedeId);
    return p.toString();
  }, [tipo, desde, hasta, sedeId]);

  const consultar = useCallback(async () => {
    setCargando(true);
    try {
      const resp: any = await get(`kardex/consolidado?${query()}`);
      setDatos(resp?.data ?? resp ?? null);
    } catch (e: any) {
      setDatos(null);
      alert(e?.response?.data?.message ?? 'No se pudo cargar el consolidado', 'error');
    } finally {
      setCargando(false);
    }
  }, [query, alert]);

  useEffect(() => {
    consultar();
  }, [tipo, desde, hasta, sedeId]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Descarga el Excel. Va por apiClient con responseType blob porque el
   * endpoint devuelve el archivo, no JSON, y hace falta el token.
   */
  const descargarExcel = useCallback(async () => {
    setDescargando(true);
    try {
      const resp = await apiClient.get(`kardex/consolidado?${query()}&formato=excel`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(
        new Blob([resp.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `consolidado-${tipo.toLowerCase()}-${desde}_a_${hasta}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('No se pudo descargar el consolidado', 'error');
    } finally {
      setDescargando(false);
    }
  }, [query, tipo, desde, hasta, alert]);

  return {
    tipo, setTipo,
    desde, setDesde,
    hasta, setHasta,
    sedeId, setSedeId,
    sedes: sedes ?? [],
    datos, cargando, descargando,
    actions: { consultar, descargarExcel },
  };
}
