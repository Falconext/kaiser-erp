import { useCallback, useEffect, useState } from 'react';
import { get, post } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';

export interface LineaDespacho {
  productoId: number;
  codigo: string;
  descripcion: string;
  unidad: string | null;
  vendida: number;
  despachada: number;
  pendiente: number;
  deMas: number;
}

export interface FilaDespacho {
  comprobanteId: number;
  documento: string;
  tipoDoc: string;
  fechaEmision: string;
  estadoPedido: string | null;
  cliente: { id: number; nombre: string; nroDoc: string } | null;
  guias: { id: number; documento: string; fechaEmision: string }[];
  estado: 'SIN_DESPACHAR' | 'PARCIAL' | 'COMPLETO';
  unidadesVendidas: number;
  unidadesPendientes: number;
  porcentajeDespachado: number;
  diasDesdeEmision: number;
  detalle: LineaDespacho[];
  conExceso: boolean;
}

interface Respuesta {
  total: number;
  sinDespachar: number;
  parciales: number;
  filas: FilaDespacho[];
}

export const useDespachosViewModel = () => {
  const { load, alert } = useAlertStore();
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [incluirCompletos, setIncluirCompletos] = useState(false);
  const [abierta, setAbierta] = useState<number | null>(null);
  const [cargado, setCargado] = useState(false);

  const cargar = useCallback(async () => {
    load(true);
    try {
      const r = await get<Respuesta>(
        `despachos/pendientes${incluirCompletos ? '?incluirCompletos=true' : ''}`,
      );
      setDatos(r.data ?? null);
    } finally {
      load(false);
      setCargado(true);
    }
  }, [load, incluirCompletos]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /**
   * Dispara el aviso a mano. El scheduler lo hace a las 7:45 cada mañana; esto
   * está para la demo y para cuando alguien quiere avisar en el momento.
   */
  const avisar = async () => {
    const r = await post<{ avisados: number; yaAvisado?: boolean; destinatarios?: number }>(
      'despachos/avisar?diasGracia=0',
      {},
    );
    if (!r.success) {
      alert(r.error ?? 'No se pudo generar el aviso', 'error');
      return;
    }
    if (r.data?.yaAvisado) {
      alert('Ya hay un aviso sin leer de las últimas horas; no se repite.', 'info');
      return;
    }
    alert(
      `Aviso enviado a ${r.data?.destinatarios ?? 0} persona(s) por ${r.data?.avisados ?? 0} documento(s).`,
      'success',
    );
  };

  return {
    datos,
    cargado,
    incluirCompletos,
    setIncluirCompletos,
    abierta,
    alternar: (id: number) => setAbierta((a) => (a === id ? null : id)),
    recargar: cargar,
    avisar,
  };
};

export const ETIQUETA_TIPO: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta',
  NP: 'Pedido',
};
