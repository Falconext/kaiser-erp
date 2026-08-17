import { useState, useEffect, useCallback } from 'react';
import { get } from '@/utils/fetch';
import { ResumenEcommerceResponse } from './ResumenModel';
import moment from 'moment';

export function useResumenViewModel() {
  const [fechaInicio, setFechaInicio] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [fechaFin, setFechaFin] = useState(moment().endOf('month').format('YYYY-MM-DD'));
  const [sedeId, setSedeId] = useState<string>('');
  
  const [data, setData] = useState<ResumenEcommerceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fechaInicio', fechaInicio);
      if (fechaFin) params.append('fechaFin', fechaFin);
      if (sedeId) params.append('sedeId', sedeId);

      const res = await get<ResumenEcommerceResponse>(`/finanzas/ecommerce?${params.toString()}`);
      setData(res.data ?? null);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [fechaInicio, fechaFin, sedeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { 
    fechaInicio, setFechaInicio, 
    fechaFin, setFechaFin, 
    sedeId, setSedeId, 
    data, isLoading 
  };
}
