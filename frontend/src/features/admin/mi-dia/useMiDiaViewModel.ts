import { useCallback, useEffect, useState } from 'react';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';

export interface CotizacionMia {
  id: number;
  documento: string;
  cliente: string;
  clienteId: number | null;
  importe: number;
  fechaEmision: string;
  venceEn: string;
  diasParaVencer: number;
  vencida: boolean;
}

export interface PedidoMio {
  id: number;
  documento: string;
  cliente: string;
  importe: number;
  fechaEmision: string;
  estado: string | null;
  retenidoPorCredito: boolean;
  diasEsperando: number;
}

export interface DespachoMio {
  comprobanteId: number;
  documento: string;
  cliente: { id: number; nombre: string } | null;
  estado: 'SIN_DESPACHAR' | 'PARCIAL' | 'COMPLETO';
  unidadesPendientes: number;
  porcentajeDespachado: number;
  diasDesdeEmision: number;
  detalle: { codigo: string; descripcion: string; pendiente: number; unidad: string | null }[];
}

export interface CobroMio {
  id: number;
  documento: string;
  cliente: string;
  clienteId: number | null;
  saldo: number;
  fechaVencimiento: string | null;
  diasVencido: number;
}

export interface MiDia {
  cotizaciones: { total: number; importe: number; porVencer: CotizacionMia[]; todas: CotizacionMia[] };
  pedidos: { total: number; esperandoVoBo: PedidoMio[]; retenidos: PedidoMio[]; autorizados: PedidoMio[] };
  despachos: { filas: DespachoMio[] };
  porCobrar: { total: number; vencidos: CobroMio[]; todos: CobroMio[] };
  comisiones: { total: number; pendiente: number; documentos: number };
  ventasMes: { importe: number; documentos: number };
  pendientesTotal: number;
}

export const soles = (n: number | null | undefined) =>
  `S/ ${Number(n ?? 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const useMiDiaViewModel = () => {
  const { load } = useAlertStore();
  const auth = useAuthStore((s: any) => s.auth);
  const [datos, setDatos] = useState<MiDia | null>(null);
  const [cargado, setCargado] = useState(false);
  // Gerencia puede mirar el consolidado del equipo; a los demás el backend les
  // ignora el parámetro, así que el interruptor solo se muestra a quien aplica.
  const esGerencia = auth?.rol === 'ADMIN_EMPRESA';
  const [todos, setTodos] = useState(false);

  const cargar = useCallback(async () => {
    load(true);
    try {
      const r = await get<MiDia>(`ventas/mi-dia${todos ? '?todos=true' : ''}`);
      setDatos(r.data ?? null);
    } finally {
      load(false);
      setCargado(true);
    }
  }, [load, todos]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return {
    datos,
    cargado,
    esGerencia,
    todos,
    setTodos,
    recargar: cargar,
    nombre: auth?.nombre || auth?.email?.split('@')[0] || '',
  };
};

/** Saludo por hora de Lima. Pequeño, pero es lo que hace que sea "su" pantalla. */
export const saludo = () => {
  const h = Number(
    new Intl.DateTimeFormat('es-PE', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'America/Lima',
    }).format(new Date()),
  );
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
};
