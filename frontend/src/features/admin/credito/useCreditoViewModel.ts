import { useCallback, useEffect, useState } from 'react';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';

export interface FilaCredito {
  clienteId: number;
  nombre: string;
  nroDoc: string;
  limiteCredito: number;
  deuda: number;
  deudaVencida: number;
  disponible: number;
  excedido: boolean;
}

export interface PedidoRetenido {
  id: number;
  documento: string;
  tipoDoc: string;
  fechaEmision: string;
  importe: number;
  cliente: { id: number; nombre: string; nroDoc: string } | null;
  deudaAlEmitir: number;
  limiteAlEmitir: number;
  excesoAlEmitir: number;
}

export const soles = (n: number | null | undefined) =>
  `S/ ${Number(n ?? 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const useCreditoViewModel = () => {
  const { load } = useAlertStore();
  const [filas, setFilas] = useState<FilaCredito[]>([]);
  const [retenidos, setRetenidos] = useState<PedidoRetenido[]>([]);
  const [soloExcedidos, setSoloExcedidos] = useState(true);
  const [cargado, setCargado] = useState(false);

  const cargar = useCallback(async () => {
    load(true);
    try {
      const [panel, bandeja] = await Promise.all([
        get<{ excedidos: FilaCredito[]; todos: FilaCredito[] }>('credito/excedidos'),
        get<PedidoRetenido[]>('credito/pedidos-retenidos'),
      ]);
      // `get` envuelve en { success, data }: el contenido va en `data`.
      setFilas(panel.data?.todos ?? []);
      setRetenidos(bandeja.data ?? []);
    } finally {
      load(false);
      setCargado(true);
    }
  }, [load]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const visibles = soloExcedidos ? filas.filter((f) => f.excedido) : filas;

  return {
    filas,
    visibles,
    retenidos,
    soloExcedidos,
    setSoloExcedidos,
    cargado,
    recargar: cargar,
    // Cuántos clientes tienen límite puesto: si es 0, la pantalla tiene que
    // explicar que el control existe pero nadie lo activó todavía, en vez de
    // enseñar una tabla vacía que parece un error.
    conLimite: filas.length,
  };
};
