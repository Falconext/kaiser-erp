import { useCallback, useEffect, useState } from 'react';
import { get, post } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';

export type TipoSeguimiento =
  | 'CREADA' | 'ENVIADA' | 'LLAMADA' | 'CORREO' | 'WHATSAPP'
  | 'VISITA' | 'NOTA' | 'VERSION' | 'GANADA' | 'PERDIDA';

export type ResultadoSeguimiento =
  | 'SIN_RESPUESTA' | 'INTERESADO' | 'PIDIO_DESCUENTO' | 'PIDIO_PLAZO'
  | 'PIDIO_CAMBIOS' | 'EN_EVALUACION' | 'RECHAZO' | 'OTRO';

export type MotivoPerdida =
  | 'PRECIO' | 'PLAZO_ENTREGA' | 'SIN_STOCK' | 'COMPETENCIA'
  | 'PRESUPUESTO' | 'CLIENTE_APLAZO' | 'SIN_RESPUESTA' | 'OTRO';

export interface EntradaBitacora {
  id: number;
  tipo: TipoSeguimiento;
  resultado: ResultadoSeguimiento | null;
  detalle: string | null;
  proximaAccion: string | null;
  proximaAccionEn: string | null;
  cumplidaEn: string | null;
  creadoEn: string;
  usuario: string | null;
  automatico: boolean;
}

export interface Bitacora {
  cotizacion: {
    id: number; documento: string; importe: number;
    cliente: { id: number; nombre: string } | null;
    vendedor: { id: number; nombre: string } | null;
    fechaEmision: string; venceEn: string; diasParaVencer: number;
    estado: string | null;
    motivoPerdida: MotivoPerdida | null;
    motivoPerdidaDetalle: string | null;
    motivoPerdidaEn: string | null;
  };
  proximaAccion: { que: string | null; cuando: string | null; vencida: boolean } | null;
  entradas: EntradaBitacora[];
}

/** Qué se puede anotar a mano. Lo automático lo escribe el sistema. */
export const TIPOS_MANUALES: { value: TipoSeguimiento; label: string; icon: string }[] = [
  { value: 'LLAMADA', label: 'Llamada', icon: 'solar:phone-calling-rounded-bold-duotone' },
  { value: 'CORREO', label: 'Correo', icon: 'solar:letter-bold-duotone' },
  { value: 'WHATSAPP', label: 'WhatsApp', icon: 'solar:chat-round-dots-bold-duotone' },
  { value: 'VISITA', label: 'Visita', icon: 'solar:map-point-bold-duotone' },
  { value: 'NOTA', label: 'Nota', icon: 'solar:notes-bold-duotone' },
];

export const RESULTADOS: { value: ResultadoSeguimiento; label: string }[] = [
  { value: 'INTERESADO', label: 'Interesado' },
  { value: 'PIDIO_DESCUENTO', label: 'Pidió descuento' },
  { value: 'PIDIO_PLAZO', label: 'Pidió otro plazo' },
  { value: 'PIDIO_CAMBIOS', label: 'Pidió cambios' },
  { value: 'EN_EVALUACION', label: 'En evaluación' },
  { value: 'SIN_RESPUESTA', label: 'No contestó' },
  { value: 'RECHAZO', label: 'Rechazó' },
  { value: 'OTRO', label: 'Otro' },
];

export const MOTIVOS_PERDIDA: { value: MotivoPerdida; label: string; ayuda: string }[] = [
  { value: 'PRECIO', label: 'Precio', ayuda: 'Nos ganaron por precio' },
  { value: 'PLAZO_ENTREGA', label: 'Plazo de entrega', ayuda: 'No llegábamos a tiempo' },
  { value: 'SIN_STOCK', label: 'Sin stock', ayuda: 'No teníamos la mercadería' },
  { value: 'COMPETENCIA', label: 'Se fue con la competencia', ayuda: 'Sin decir por qué' },
  { value: 'PRESUPUESTO', label: 'No le aprobaron el presupuesto', ayuda: 'Decisión interna del cliente' },
  { value: 'CLIENTE_APLAZO', label: 'El cliente aplazó', ayuda: 'El proyecto se movió; puede volver' },
  { value: 'SIN_RESPUESTA', label: 'Dejó de contestar', ayuda: 'Se perdió el contacto' },
  { value: 'OTRO', label: 'Otro', ayuda: 'Explícalo en la nota' },
];

export const ETIQUETA_TIPO: Record<TipoSeguimiento, { label: string; icon: string; tono: string }> = {
  CREADA:   { label: 'Cotización emitida', icon: 'solar:document-add-bold-duotone', tono: 'text-slate-500' },
  ENVIADA:  { label: 'Enviada al cliente', icon: 'solar:plain-bold-duotone', tono: 'text-sky-600 dark:text-sky-400' },
  LLAMADA:  { label: 'Llamada', icon: 'solar:phone-calling-rounded-bold-duotone', tono: 'text-violet-600 dark:text-violet-400' },
  CORREO:   { label: 'Correo', icon: 'solar:letter-bold-duotone', tono: 'text-sky-600 dark:text-sky-400' },
  WHATSAPP: { label: 'WhatsApp', icon: 'solar:chat-round-dots-bold-duotone', tono: 'text-emerald-600 dark:text-emerald-400' },
  VISITA:   { label: 'Visita', icon: 'solar:map-point-bold-duotone', tono: 'text-amber-600 dark:text-amber-400' },
  NOTA:     { label: 'Nota', icon: 'solar:notes-bold-duotone', tono: 'text-slate-500' },
  VERSION:  { label: 'Versión nueva', icon: 'solar:copy-bold-duotone', tono: 'text-violet-600 dark:text-violet-400' },
  GANADA:   { label: 'Ganada', icon: 'solar:check-circle-bold-duotone', tono: 'text-emerald-600 dark:text-emerald-400' },
  PERDIDA:  { label: 'Perdida', icon: 'solar:close-circle-bold-duotone', tono: 'text-rose-600 dark:text-rose-400' },
};

export const soles = (n: number | null | undefined) =>
  `S/ ${Number(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const useSeguimientoViewModel = (comprobanteId: number | null, onCambio?: () => void) => {
  const { load, alert } = useAlertStore();
  const [datos, setDatos] = useState<Bitacora | null>(null);
  const [cargado, setCargado] = useState(false);

  // Formulario de contacto
  const [tipo, setTipo] = useState<TipoSeguimiento>('LLAMADA');
  const [resultado, setResultado] = useState<ResultadoSeguimiento | ''>('');
  const [detalle, setDetalle] = useState('');
  const [proximaAccion, setProximaAccion] = useState('');
  const [proximaAccionEn, setProximaAccionEn] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Marcar como perdida
  const [perdiendo, setPerdiendo] = useState(false);
  const [motivo, setMotivo] = useState<MotivoPerdida | ''>('');
  const [motivoDetalle, setMotivoDetalle] = useState('');

  const cargar = useCallback(async () => {
    if (!comprobanteId) return;
    load(true);
    try {
      const r = await get<Bitacora>(`cotizaciones/seguimiento/${comprobanteId}`);
      setDatos(r.data ?? null);
    } finally {
      load(false);
      setCargado(true);
    }
  }, [comprobanteId, load]);

  useEffect(() => { void cargar(); }, [cargar]);

  const registrar = async () => {
    if (!comprobanteId) return;
    if (!detalle.trim()) { alert('Escribe qué pasó', 'warning'); return; }
    setGuardando(true);
    try {
      const r = await post(`cotizaciones/seguimiento/${comprobanteId}`, {
        tipo,
        resultado: resultado || undefined,
        detalle: detalle.trim(),
        proximaAccion: proximaAccion.trim() || undefined,
        proximaAccionEn: proximaAccionEn || undefined,
      });
      if (!r.success) { alert(r.error ?? 'No se pudo registrar', 'error'); return; }
      setDetalle(''); setProximaAccion(''); setProximaAccionEn(''); setResultado('');
      await cargar();
      onCambio?.();
    } finally {
      setGuardando(false);
    }
  };

  const marcarPerdida = async () => {
    if (!comprobanteId || !motivo) { alert('Elige el motivo', 'warning'); return; }
    setGuardando(true);
    try {
      const r = await post(`cotizaciones/seguimiento/${comprobanteId}/perdida`, {
        motivo, detalle: motivoDetalle.trim() || undefined,
      });
      if (!r.success) { alert(r.error ?? 'No se pudo marcar como perdida', 'error'); return; }
      alert('Cotización marcada como perdida', 'success');
      setPerdiendo(false); setMotivo(''); setMotivoDetalle('');
      await cargar();
      onCambio?.();
    } finally {
      setGuardando(false);
    }
  };

  return {
    datos, cargado, recargar: cargar,
    tipo, setTipo, resultado, setResultado, detalle, setDetalle,
    proximaAccion, setProximaAccion, proximaAccionEn, setProximaAccionEn,
    guardando, registrar,
    perdiendo, setPerdiendo, motivo, setMotivo, motivoDetalle, setMotivoDetalle,
    marcarPerdida,
  };
};
