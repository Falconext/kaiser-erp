import { useCallback, useEffect, useState } from 'react';
import { get } from '@/utils/fetch';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';
import { MESES, soles } from './useLibroDiarioViewModel';

export { MESES, soles };

export interface FilaBalance {
  cuentaId: number; codigo: string; denominacion: string;
  naturaleza: 'DEUDORA' | 'ACREEDORA';
  saldoInicial: number; debe: number; haber: number; saldoFinal: number; clase: string;
}

export interface Balance {
  periodo: { anio: number; mes: number };
  filas: FilaBalance[];
  totales: { debe: number; haber: number; cuentas: number };
  cuadra: boolean;
}

export interface LineaMayor {
  asientoId: number; cuo: string; fecha: string; glosa: string;
  origen: string; sede: string | null; documento: string | null;
  debe: number; haber: number; saldo: number;
}

export interface Mayor {
  cuenta: { codigo: string; denominacion: string; naturaleza: 'DEUDORA' | 'ACREEDORA' };
  saldoInicial: number;
  totales: { debe: number; haber: number; movimientos: number };
  saldoFinal: number;
  naturalezaSaldo: 'DEUDORA' | 'ACREEDORA';
  lineas: LineaMayor[];
}

/** Cómo se llama cada clase del PCGE, para agrupar el balance como lo lee un contador. */
export const CLASES: Record<string, string> = {
  '1': 'Activo disponible y exigible',
  '2': 'Activo realizable',
  '3': 'Activo inmovilizado',
  '4': 'Pasivo',
  '5': 'Patrimonio',
  '6': 'Gastos por naturaleza',
  '7': 'Ingresos',
  '8': 'Saldos intermediarios',
  '9': 'Costos de producción y gastos por función',
};

export const useLibroMayorViewModel = () => {
  const { alert } = useAlertStore();
  const { auth, sedeActiva } = useAuthStore();
  const isAdmin = auth?.rol === 'ADMIN_EMPRESA';
  const esPrincipal = !sedeActiva || sedeActiva.esPrincipal === true;
  const sedeId = esPrincipal ? null : (sedeActiva?.id ?? null);

  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [cargando, setCargando] = useState(false);
  const [cuenta, setCuenta] = useState<string | null>(null);
  const [mayor, setMayor] = useState<Mayor | null>(null);

  const qs = useCallback(() => {
    const p = new URLSearchParams({ anio: String(anio), mes: String(mes) });
    if (sedeId) p.set('sedeId', String(sedeId));
    return p.toString();
  }, [anio, mes, sedeId]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setMayor(null);
    setCuenta(null);
    const r = await get<Balance>(`contabilidad/mayor/balance?${qs()}`);
    setCargando(false);
    if (r.success && r.data) setBalance(r.data);
    else alert(r.error || 'No se pudo cargar el balance', 'error');
  }, [qs]);
  useEffect(() => { void cargar(); }, [cargar]);

  const abrirCuenta = async (codigo: string) => {
    setCuenta(codigo);
    const r = await get<Mayor>(`contabilidad/mayor?cuenta=${encodeURIComponent(codigo)}&${qs()}`);
    if (r.success && r.data) setMayor(r.data);
    else { alert(r.error || 'No se pudo cargar la cuenta', 'error'); setCuenta(null); }
  };

  const descargar = async (ruta: string, nombrePorDefecto: string) => {
    try {
      const r = await apiClient.get(`${ruta}?${qs()}`, { responseType: 'blob' });
      const cd = String(r.headers?.['content-disposition'] ?? '');
      const nombre = /filename="?([^"]+)"?/.exec(cd)?.[1] ?? nombrePorDefecto;
      const url = URL.createObjectURL(r.data as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = nombre; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('No se pudo descargar el archivo', 'error');
    }
  };

  const mesAnterior = () => (mes === 1 ? (setMes(12), setAnio(anio - 1)) : setMes(mes - 1));
  const mesSiguiente = () => (mes === 12 ? (setMes(1), setAnio(anio + 1)) : setMes(mes + 1));

  return {
    anio, setAnio, mes, setMes, mesAnterior, mesSiguiente,
    balance, cargando, cuenta, mayor, abrirCuenta, cerrarCuenta: () => { setCuenta(null); setMayor(null); },
    descargar, isAdmin,
  };
};
