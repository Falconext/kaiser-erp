import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, post } from '@/utils/fetch';
import { useAuthStore } from '@/zustand/auth';
import { useSedesStore } from '@/zustand/sedes';
import useAlertStore from '@/zustand/alert';
import { usePuedeEscribir } from '@/hooks/usePuedeEscribir';

export interface Cuenta {
  id: number;
  codigo: string;
  denominacion: string;
  nivel: number;
  naturaleza: 'DEUDORA' | 'ACREEDORA';
  imputable: boolean;
  padreId: number | null;
}

export interface DetalleAsiento {
  id: number;
  orden: number;
  debe: number;
  haber: number;
  glosa: string | null;
  tipoDocSunat: string | null;
  serie: string | null;
  numero: string | null;
  cuenta: { codigo: string; denominacion: string };
}

export interface Asiento {
  id: number;
  cuo: string;
  correlativo: number;
  fecha: string;
  glosa: string;
  origen: string;
  origenId: number | null;
  estado: 'REGISTRADO' | 'EXTORNADO';
  moneda: string;
  totalDebe: number;
  totalHaber: number;
  sede: { id: number; nombre: string } | null;
  creadoPor: { id: number; nombre: string } | null;
  extornaA: { id: number; cuo: string } | null;
  extornadoPor: { id: number; cuo: string } | null;
  detalles: DetalleAsiento[];
}

export interface Diario {
  periodo: { id: number; anio: number; mes: number; estado: 'ABIERTO' | 'CERRADO'; cerradoEn: string | null } | null;
  asientos: Asiento[];
  totales: { debe: number; haber: number; asientos: number };
}

export const ORIGENES: Record<string, string> = {
  MANUAL: 'Manual',
  VENTA: 'Venta',
  COMPRA: 'Compra',
  COBRO: 'Cobro',
  PAGO: 'Pago',
  CAJA: 'Caja',
  GASTO: 'Gasto',
  INGRESO: 'Ingreso',
  PLANILLA: 'Planilla',
  EXTORNO: 'Extorno',
};

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export const soles = (n: number) =>
  `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface LineaForm {
  cuenta: string;
  debe: string;
  haber: string;
  glosa: string;
}

const lineaVacia = (): LineaForm => ({ cuenta: '', debe: '', haber: '', glosa: '' });
const hoyISO = () => {
  // Fecha local de Lima, no UTC: a las 8 de la noche todavía es hoy.
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const centimos = (v: string | number) => Math.round((Number(v) || 0) * 100);

export type Confirmacion =
  | { tipo: 'extornar'; asiento: Asiento }
  | { tipo: 'cerrar' }
  | { tipo: 'reabrir' };

export const useLibroDiarioViewModel = () => {
  const { auth, sedeActiva } = useAuthStore();
  const { sedes, listarSedes } = useSedesStore();
  const { alert } = useAlertStore();
  const puedeEscribir = usePuedeEscribir('contabilidad');
  const isAdmin = auth?.rol === 'ADMIN_EMPRESA';
  const esPrincipal = !sedeActiva || sedeActiva.esPrincipal === true;

  const ahora = new Date();
  const [anio, setAnio] = useState(ahora.getFullYear());
  const [mes, setMes] = useState(ahora.getMonth() + 1);
  const [sedeId, setSedeId] = useState<number | null>(null);
  const [origen, setOrigen] = useState('');
  const effectiveSedeId = esPrincipal ? sedeId : (sedeActiva?.id ?? null);

  const [diario, setDiario] = useState<Diario | null>(null);
  const [cargando, setCargando] = useState(false);
  const [plan, setPlan] = useState<Cuenta[]>([]);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());

  const [modalNuevo, setModalNuevo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [fecha, setFecha] = useState(hoyISO());
  const [glosa, setGlosa] = useState('');
  const [lineas, setLineas] = useState<LineaForm[]>([lineaVacia(), lineaVacia()]);

  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const qs = new URLSearchParams({ anio: String(anio), mes: String(mes) });
    if (effectiveSedeId) qs.set('sedeId', String(effectiveSedeId));
    if (origen) qs.set('origen', origen);
    const r = await get<Diario>(`contabilidad/asientos?${qs.toString()}`);
    if (r.success && r.data) setDiario(r.data);
    else alert(r.error || 'No se pudo cargar el Libro Diario', 'error');
    setCargando(false);
  }, [anio, mes, effectiveSedeId, origen]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    get<Cuenta[]>('contabilidad/plan-cuentas?imputables=true').then((r) => {
      if (r.success && r.data) setPlan(r.data);
    });
  }, []);

  useEffect(() => {
    if (isAdmin && esPrincipal) listarSedes();
  }, [isAdmin, esPrincipal]);

  const periodoCerrado = diario?.periodo?.estado === 'CERRADO';

  const mesAnterior = () => {
    if (mes === 1) { setMes(12); setAnio(anio - 1); } else setMes(mes - 1);
  };
  const mesSiguiente = () => {
    if (mes === 12) { setMes(1); setAnio(anio + 1); } else setMes(mes + 1);
  };

  const toggleExpandido = (id: number) => {
    setExpandidos((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  // ── Asiento manual ──
  const abrirNuevo = () => {
    setFecha(hoyISO());
    setGlosa('');
    setLineas([lineaVacia(), lineaVacia()]);
    setModalNuevo(true);
  };
  const setLinea = (i: number, campo: keyof LineaForm, valor: string) => {
    setLineas((prev) => prev.map((l, idx) => {
      if (idx !== i) return l;
      const n = { ...l, [campo]: valor };
      // Una línea va al debe o al haber: escribir en uno limpia el otro.
      if (campo === 'debe' && valor) n.haber = '';
      if (campo === 'haber' && valor) n.debe = '';
      return n;
    }));
  };
  const agregarLinea = () => setLineas((prev) => [...prev, lineaVacia()]);
  const quitarLinea = (i: number) =>
    setLineas((prev) => (prev.length <= 2 ? prev : prev.filter((_, idx) => idx !== i)));

  const cuadre = useMemo(() => {
    const debe = lineas.reduce((s, l) => s + centimos(l.debe), 0) / 100;
    const haber = lineas.reduce((s, l) => s + centimos(l.haber), 0) / 100;
    const diferencia = Math.round((debe - haber) * 100) / 100;
    const completas = lineas.every((l) => l.cuenta && (centimos(l.debe) > 0 || centimos(l.haber) > 0));
    return { debe, haber, diferencia, cuadra: diferencia === 0 && debe > 0, completas };
  }, [lineas]);

  const puedeGuardar = cuadre.cuadra && cuadre.completas && glosa.trim().length > 0 && !guardando;

  const guardarAsiento = async () => {
    if (!puedeGuardar) return;
    setGuardando(true);
    const r = await post<Asiento>('contabilidad/asientos', {
      fecha: `${fecha}T12:00:00.000-05:00`,
      glosa: glosa.trim(),
      ...(effectiveSedeId ? { sedeId: effectiveSedeId } : {}),
      lineas: lineas.map((l) => ({
        cuenta: l.cuenta,
        debe: centimos(l.debe) / 100,
        haber: centimos(l.haber) / 100,
        ...(l.glosa.trim() ? { glosa: l.glosa.trim() } : {}),
      })),
    });
    setGuardando(false);
    if (r.success && r.data) {
      alert(`Asiento ${r.data.cuo} registrado`, 'success');
      setModalNuevo(false);
      // Si el asiento cayó en otro mes, vamos a verlo allí.
      const f = new Date(`${fecha}T12:00:00`);
      if (f.getFullYear() !== anio || f.getMonth() + 1 !== mes) {
        setAnio(f.getFullYear());
        setMes(f.getMonth() + 1);
      } else {
        cargar();
      }
    } else {
      alert(r.error || 'No se pudo registrar el asiento', 'error');
    }
  };

  // ── Extornar / cerrar / reabrir ──
  const confirmar = async () => {
    if (!confirmacion) return;
    setConfirmando(true);
    let r;
    if (confirmacion.tipo === 'extornar') {
      r = await post<Asiento>(`contabilidad/asientos/${confirmacion.asiento.id}/extornar`, {});
    } else if (confirmacion.tipo === 'cerrar') {
      r = await post(`contabilidad/periodos/${anio}/${mes}/cerrar`, {});
    } else {
      r = await post(`contabilidad/periodos/${anio}/${mes}/reabrir`, {});
    }
    setConfirmando(false);
    if (r.success) {
      const msg =
        confirmacion.tipo === 'extornar'
          ? `Extorno registrado: ${(r.data as Asiento | undefined)?.cuo ?? ''}`
          : confirmacion.tipo === 'cerrar'
            ? `Período ${MESES[mes - 1]} ${anio} cerrado`
            : `Período ${MESES[mes - 1]} ${anio} reabierto`;
      alert(msg, 'success');
      setConfirmacion(null);
      cargar();
    } else {
      alert(r.error || 'No se pudo completar la operación', 'error');
    }
  };

  const sedesOptions = [
    { id: 0, value: 'Todas las sedes' },
    ...sedes.map((s) => ({ id: s.id, value: s.nombre })),
  ];

  return {
    // filtros
    anio, mes, setAnio, setMes, mesAnterior, mesSiguiente,
    sedeId, setSedeId, origen, setOrigen, sedesOptions, isAdmin, esPrincipal,
    // datos
    diario, cargando, plan, periodoCerrado, puedeEscribir,
    expandidos, toggleExpandido,
    // nuevo asiento
    modalNuevo, setModalNuevo, abrirNuevo, guardando,
    fecha, setFecha, glosa, setGlosa, lineas, setLinea, agregarLinea, quitarLinea,
    cuadre, puedeGuardar, guardarAsiento,
    // confirmaciones
    confirmacion, setConfirmacion, confirmando, confirmar,
  };
};
