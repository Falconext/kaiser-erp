import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';
import { detectarFuncionesRubro } from '@/utils/rubro-features';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';
import DataTable from '@/components/Datatable';
import Pagination from '@/components/Pagination';
import Select from '@/components/Select';
import { useDebounce } from '@/hooks/useDebounce';
import ModalConfirm from '@/components/ModalConfirm';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

type EstadoSerie = 'TODOS' | 'DISPONIBLE' | 'VENDIDO' | 'RESERVADO' | 'BAJA';
type EstadoGarantia = 'TODOS' | 'VIGENTE' | 'VENCIDA' | 'SIN_GARANTIA';
type EstadoReclamo = 'ABIERTO' | 'EN_PROCESO' | 'RESUELTO' | 'CERRADO';

interface SerieGarantia {
  id: number;
  numeroSerie: string;
  estado: Exclude<EstadoSerie, 'TODOS'>;
  garantiaMeses?: number | null;
  garantiaHasta?: string | null;
  estadoGarantia: Exclude<EstadoGarantia, 'TODOS'>;
  observacion?: string | null;
  compraId?: number | null;
  producto: { id: number; codigo: string; descripcion: string; marca?: { nombre: string } | null };
  sede?: { id: number; nombre: string } | null;
  comprobante?: {
    id: number; tipoDoc: string; numero: string; fechaEmision: string;
    cliente: { id: number; nombre: string; nroDoc: string; telefono?: string | null; email?: string | null };
  } | null;
}

interface Reclamo {
  id: number;
  descripcion: string;
  estadoReclamo: EstadoReclamo;
  tecnico?: string | null;
  resolucion?: string | null;
  fechaReclamo: string;
  fechaResolucion?: string | null;
}

interface SeriesResponse {
  data: SerieGarantia[];
  resumen: { total: number; estados: Record<string, number>; garantias: Record<string, number> };
  paginacion: { page: number; limit: number; total: number; totalPages: number };
}

interface ApiEnvelope<T> { code: number; message: string; data: T }

const fmt = (v?: string | null) =>
  !v ? '—' : new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(v));

const daysUntil = (v?: string | null) =>
  !v ? null : Math.ceil((new Date(v).getTime() - Date.now()) / 86400000);

// Pills CRM claro — fondo pastel + punto de color
const serieBadge: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
  VENDIDO: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300',
  RESERVADO: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
  BAJA: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};
const serieDot: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-500',
  VENDIDO: 'bg-indigo-500',
  RESERVADO: 'bg-amber-500',
  BAJA: 'bg-slate-400',
};

const garantiaBadge: Record<string, string> = {
  VIGENTE: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
  VENCIDA: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300',
  SIN_GARANTIA: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};
const garantiaDot: Record<string, string> = {
  VIGENTE: 'bg-emerald-500',
  VENCIDA: 'bg-rose-500',
  SIN_GARANTIA: 'bg-slate-400',
};

const reclamoBadge: Record<string, string> = {
  ABIERTO: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300',
  EN_PROCESO: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
  RESUELTO: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
  CERRADO: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

const estadoOptions = [
  { id: 'TODOS', value: 'Todos los estados' },
  { id: 'DISPONIBLE', value: 'Disponible' },
  { id: 'VENDIDO', value: 'Vendido' },
  { id: 'RESERVADO', value: 'Reservado' },
  { id: 'BAJA', value: 'Baja' },
];

const garantiaOptions = [
  { id: 'TODOS', value: 'Todas las garantías' },
  { id: 'VIGENTE', value: 'Vigentes' },
  { id: 'VENCIDA', value: 'Vencidas' },
  { id: 'SIN_GARANTIA', value: 'Sin garantía' },
];

const estadoReclamoOptions = [
  { id: 'ABIERTO', value: 'Abierto' },
  { id: 'EN_PROCESO', value: 'En proceso' },
  { id: 'RESUELTO', value: 'Resuelto' },
  { id: 'CERRADO', value: 'Cerrado' },
];

interface ProductoOption { id: number; descripcion: string; codigo: string; }

const EMPTY_FORM = { productoId: '', numeroSerie: '', garantiaMeses: '', observacion: '' };
const EMPTY_RECLAMO = { descripcion: '', tecnico: '', estadoReclamo: 'ABIERTO' as EstadoReclamo };

export default function SeriesGarantias() {
  const sidebarColor = useThemeStore((s) => s.sidebarColor);
  const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
  const { auth } = useAuthStore();
  const { alert } = useAlertStore();
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState<EstadoSerie>('TODOS');
  const [garantia, setGarantia] = useState<EstadoGarantia>('TODOS');
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [response, setResponse] = useState<SeriesResponse>({
    data: [],
    resumen: { total: 0, estados: { DISPONIBLE: 0, VENDIDO: 0, RESERVADO: 0, BAJA: 0 }, garantias: { VIGENTE: 0, VENCIDA: 0, SIN_GARANTIA: 0 } },
    paginacion: { page: 1, limit: 20, total: 0, totalPages: 1 },
  });

  // Modal nueva/editar serie
  const [showModal, setShowModal] = useState(false);
  const [editSerie, setEditSerie] = useState<SerieGarantia | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Confirm delete modal
  const [serieToDelete, setSerieToDelete] = useState<SerieGarantia | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reclamoToDelete, setReclamoToDelete] = useState<Reclamo | null>(null);
  const [deletingReclamo, setDeletingReclamo] = useState(false);

  // Panel de detalle / reclamos
  const [selectedSerie, setSelectedSerie] = useState<SerieGarantia | null>(null);
  const [reclamos, setReclamos] = useState<Reclamo[]>([]);
  const [loadingReclamos, setLoadingReclamos] = useState(false);
  const [showReclamoForm, setShowReclamoForm] = useState(false);
  const [reclamoForm, setReclamoForm] = useState(EMPTY_RECLAMO);
  const [editReclamo, setEditReclamo] = useState<Reclamo | null>(null);
  const [savingReclamo, setSavingReclamo] = useState(false);
  const [generatingConstanciaId, setGeneratingConstanciaId] = useState<number | null>(null);

  const canUse = detectarFuncionesRubro(auth?.empresa?.rubro).controlSeriesGarantia;

  // Product search for new-serie modal
  const [productoSearch, setProductoSearch] = useState('');
  const [productoOptions, setProductoOptions] = useState<ProductoOption[]>([]);
  const [productoSelected, setProductoSelected] = useState<ProductoOption | null>(null);
  const [showProductoDropdown, setShowProductoDropdown] = useState(false);
  const [bulkSeries, setBulkSeries] = useState('');
  const productoSearchDebounced = useDebounce(productoSearch, 300);
  const productoDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!productoSearchDebounced.trim() || productoSelected) { setProductoOptions([]); return; }
    apiClient.get('/productos', { params: { search: productoSearchDebounced, limit: 10 } })
      .then((r: any) => {
        const lista = Array.isArray(r.data?.data?.productos) ? r.data.data.productos : [];
        setProductoOptions(lista.map((p: any) => ({ id: p.id, descripcion: p.descripcion, codigo: p.codigo || '' })));
        setShowProductoDropdown(lista.length > 0);
      })
      .catch(() => setProductoOptions([]));
  }, [productoSearchDebounced]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (productoDropdownRef.current && !productoDropdownRef.current.contains(e.target as Node)) {
        setShowProductoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const cargar = async () => {
    if (!canUse) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const { data } = await apiClient.get<ApiEnvelope<SeriesResponse>>('/kardex/series-garantias', {
        params: { search, estado, garantia, page, limit: itemsPerPage },
      });
      setResponse(data.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'No se pudo cargar series y garantías');
    } finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [search, estado, garantia, page, itemsPerPage, canUse]);
  useEffect(() => { setPage(1); }, [search, estado, garantia, itemsPerPage]);

  const abrirNueva = () => {
    setEditSerie(null);
    setForm(EMPTY_FORM);
    setProductoSelected(null);
    setProductoSearch('');
    setBulkSeries('');
    setShowModal(true);
  };
  const abrirEditar = (s: SerieGarantia) => {
    setEditSerie(s);
    setForm({ productoId: String(s.producto.id), numeroSerie: s.numeroSerie, garantiaMeses: String(s.garantiaMeses ?? ''), observacion: s.observacion ?? '' });
    setShowModal(true);
  };

  const guardarSerie = async () => {
    setSaving(true);
    try {
      if (editSerie) {
        await apiClient.patch(`/kardex/series-garantias/${editSerie.id}`, {
          estado: (form as any).estado,
          garantiaMeses: form.garantiaMeses ? Number(form.garantiaMeses) : null,
          observacion: form.observacion,
        });
        alert('Serie actualizada', 'success');
      } else {
        if (!productoSelected) { alert('Selecciona un producto', 'warning'); setSaving(false); return; }
        const seriesList = bulkSeries
          .split(/[\n,]+/)
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
        if (seriesList.length === 0) { alert('Ingresa al menos un número de serie', 'warning'); setSaving(false); return; }
        let ok = 0; let fail = 0;
        for (const numeroSerie of seriesList) {
          try {
            await apiClient.post('/kardex/series-garantias', {
              productoId: productoSelected.id,
              numeroSerie,
              garantiaMeses: form.garantiaMeses ? Number(form.garantiaMeses) : null,
              observacion: form.observacion,
            });
            ok++;
          } catch { fail++; }
        }
        alert(
          fail === 0
            ? `${ok} serie${ok > 1 ? 's' : ''} registrada${ok > 1 ? 's' : ''} correctamente`
            : `${ok} registrada${ok > 1 ? 's' : ''}, ${fail} con error (ya existen o datos inválidos)`,
          fail === 0 ? 'success' : 'warning',
        );
      }
      setShowModal(false);
      cargar();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error al guardar', 'error');
    } finally { setSaving(false); }
  };

  const confirmarEliminar = (s: SerieGarantia) => setSerieToDelete(s);

  const eliminarSerie = async () => {
    if (!serieToDelete) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/kardex/series-garantias/${serieToDelete.id}`);
      alert('Serie eliminada', 'success');
      if (selectedSerie?.id === serieToDelete.id) setSelectedSerie(null);
      setSerieToDelete(null);
      cargar();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error al eliminar', 'error');
    } finally { setDeleting(false); }
  };

  const abrirDetalle = async (s: SerieGarantia) => {
    setSelectedSerie(s);
    setShowReclamoForm(false);
    setEditReclamo(null);
    setLoadingReclamos(true);
    try {
      const { data } = await apiClient.get<ApiEnvelope<Reclamo[]>>(`/kardex/series-garantias/${s.id}/reclamos`);
      setReclamos(data.data);
    } catch { setReclamos([]); } finally { setLoadingReclamos(false); }
  };

  const guardarReclamo = async () => {
    if (!reclamoForm.descripcion.trim()) { alert('La descripción es requerida', 'warning'); return; }
    if (!selectedSerie) return;
    setSavingReclamo(true);
    try {
      if (editReclamo) {
        await apiClient.patch(`/kardex/reclamos-garantia/${editReclamo.id}`, reclamoForm);
        alert('Reclamo actualizado', 'success');
      } else {
        await apiClient.post(`/kardex/series-garantias/${selectedSerie.id}/reclamos`, reclamoForm);
        alert('Reclamo registrado', 'success');
      }
      setShowReclamoForm(false); setEditReclamo(null); setReclamoForm(EMPTY_RECLAMO);
      const { data } = await apiClient.get<ApiEnvelope<Reclamo[]>>(`/kardex/series-garantias/${selectedSerie.id}/reclamos`);
      setReclamos(data.data);
    } catch (e: any) { alert(e?.response?.data?.message || 'Error', 'error'); }
    finally { setSavingReclamo(false); }
  };

  const eliminarReclamo = async () => {
    if (!reclamoToDelete) return;
    setDeletingReclamo(true);
    try {
      await apiClient.delete(`/kardex/reclamos-garantia/${reclamoToDelete.id}`);
      setReclamos((prev) => prev.filter((x) => x.id !== reclamoToDelete.id));
      alert('Reclamo eliminado', 'success');
      setReclamoToDelete(null);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error', 'error');
    } finally { setDeletingReclamo(false); }
  };

  const abrirConstancia = async (serie: SerieGarantia) => {
    try {
      setGeneratingConstanciaId(serie.id);
      const response = await apiClient.get<Blob>(`/kardex/series-garantias/${serie.id}/constancia`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'No se pudo generar la constancia', 'error');
    } finally {
      setGeneratingConstanciaId(null);
    }
  };

  const cards = useMemo(() => [
    { label: 'Series registradas', value: response.resumen.total, icon: 'solar:hashtag-square-bold-duotone', chip: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300' },
    { label: 'Garantías vigentes', value: response.resumen.garantias.VIGENTE ?? 0, icon: 'solar:shield-check-bold-duotone', chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300' },
    { label: 'Garantías vencidas', value: response.resumen.garantias.VENCIDA ?? 0, icon: 'solar:shield-cross-bold-duotone', chip: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300' },
    { label: 'Vendidos con serie', value: response.resumen.estados.VENDIDO ?? 0, icon: 'solar:cart-check-bold-duotone', chip: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300' },
  ], [response.resumen]);

  const seriesTable = useMemo(() => response.data.map((item) => {
    const dias = daysUntil(item.garantiaHasta);
    const garantiaLabel = item.estadoGarantia === 'SIN_GARANTIA' ? 'Sin garantía'
      : item.estadoGarantia === 'VENCIDA' ? `Venció hace ${Math.abs(dias ?? 0)} d`
      : `${dias ?? 0} días restantes`;

    return {
      serie: (
        <div>
          <div className="font-mono text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">{item.numeroSerie}</div>
          <div className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${serieBadge[item.estado]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${serieDot[item.estado]}`} />{item.estado}
          </div>
          {item.compraId && <div className="mt-0.5 text-[10px] text-slate-400">Ingresado por compra</div>}
        </div>
      ),
      producto: (
        <div>
          <div className="max-w-[260px] truncate text-sm font-semibold text-slate-700 dark:text-slate-200" title={item.producto.descripcion}>{item.producto.descripcion}</div>
          <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{item.producto.codigo}</div>
        </div>
      ),
      cliente: (
        <div className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-xs font-bold text-white">
            {(item.comprobante?.cliente.nombre ?? '—').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="max-w-[180px] truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{item.comprobante?.cliente.nombre ?? 'Sin venta'}</div>
            <div className="mt-0.5 text-[11px] text-slate-400">{item.comprobante?.cliente.nroDoc ?? '—'}</div>
          </div>
        </div>
      ),
      garantiaBadge: (
        <div>
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${garantiaBadge[item.estadoGarantia]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${garantiaDot[item.estadoGarantia]}`} />{garantiaLabel}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Hasta: {fmt(item.garantiaHasta)}</div>
        </div>
      ),
      acciones: (
        <div className="flex gap-1.5">
          <button onClick={() => abrirDetalle(item)} title="Ver detalle y reclamos"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
            <Icon icon="solar:eye-linear" width={16} />
          </button>
          <button onClick={() => abrirEditar(item)} title="Editar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
            <Icon icon="solar:pen-new-square-linear" width={16} />
          </button>
          <button onClick={() => confirmarEliminar(item)} title="Eliminar"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/30">
            <Icon icon="solar:trash-bin-trash-linear" width={16} />
          </button>
        </div>
      ),
    };
  }), [response.data]);

  const paginationPages = useMemo(
    () => Array.from({ length: Math.max(response.paginacion.totalPages, 1) }, (_, i) => i + 1),
    [response.paginacion.totalPages],
  );

  if (!canUse) {
    return (
      <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-slate-950 font-jakarta">
        <div className="mx-auto mt-10 grid max-w-xl place-items-center rounded-3xl bg-white dark:bg-[#111827] px-8 py-14 text-center shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
            <Icon icon="solar:lock-keyhole-linear" className="text-4xl" />
          </div>
          <h1 className="mt-5 text-[22px] font-extrabold text-slate-800 dark:text-white">No disponible para este rubro</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Series y garantías solo aparece cuando el rubro tiene activa la característica de control por serie.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-slate-950 font-jakarta text-slate-900 dark:text-slate-100">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2 text-sm text-slate-400">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Kardex</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Series y Garantías</span>
      </div>

      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-800 dark:text-white">Series y Garantías</h1>
          <p className="mt-0.5 text-sm text-slate-400">Trazabilidad completa de productos vendidos por número de serie.</p>
        </div>
        <button onClick={abrirNueva}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition-all hover:brightness-105"
          style={{ background: ACCENT }}>
          <Icon icon="solar:add-circle-bold" className="text-lg" /> Nueva serie
        </button>
      </div>

      {/* KPI cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">{card.label}</span>
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${card.chip}`}>
                <Icon icon={card.icon} className="text-2xl" />
              </span>
            </div>
            <div className="mt-5 text-3xl font-extrabold text-slate-800 dark:text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Card contenedora — tabla principal */}
        <div className="min-w-0 flex-1 overflow-hidden rounded-3xl bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
          {/* Toolbar / filtros */}
          <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 dark:border-slate-800 p-4">
            <div className="relative min-w-0 flex-1 lg:max-w-xs">
              <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Serie, producto, cliente…"
                className="h-11 w-full rounded-2xl border-2 border-slate-200 bg-white pl-10 pr-9 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-[var(--accent)] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                  <Icon icon="solar:close-circle-bold" />
                </button>
              )}
            </div>
            <div className="w-full sm:w-44">
              <Select name="estado" label="Estado" error="" value={estadoOptions.find((o) => o.id === estado)?.value}
                onChange={(id) => setEstado(String(id) as EstadoSerie)} options={estadoOptions} withLabel />
            </div>
            <div className="w-full sm:w-44">
              <Select name="garantia" label="Garantía" error="" value={garantiaOptions.find((o) => o.id === garantia)?.value}
                onChange={(id) => setGarantia(String(id) as EstadoGarantia)} options={garantiaOptions} withLabel />
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <span className="px-1 text-sm font-medium text-slate-400">{response.paginacion.total.toLocaleString('es-PE')} registros</span>
              <button onClick={cargar}
                className="flex h-9 items-center gap-1.5 rounded-xl border-2 px-3.5 text-sm font-bold transition-colors"
                style={{ borderColor: `${ACCENT}55`, color: ACCENT }}>
                <Icon icon="solar:refresh-linear" className={loading ? 'animate-spin' : ''} /> Actualizar
              </button>
            </div>
          </div>

          <div className="p-4">
            {error && <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">{error}</div>}

            {loading ? (
              <div className="space-y-2.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                ))}
              </div>
            ) : seriesTable.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <DataTable bodyData={seriesTable} headerColumns={[
                    { label: 'Serie', key: 'serie' },
                    { label: 'Producto', key: 'producto' },
                    { label: 'Cliente', key: 'cliente' },
                    { label: 'Garantía', key: 'garantiaBadge' },
                    { label: 'Acciones', key: 'acciones' },
                  ]} />
                </div>
                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <Pagination data={seriesTable} optionSelect currentPage={page}
                    indexOfFirstItem={response.paginacion.total === 0 ? 0 : (page - 1) * itemsPerPage}
                    indexOfLastItem={Math.min(page * itemsPerPage, response.paginacion.total)}
                    setcurrentPage={setPage} setitemsPerPage={setItemsPerPage}
                    pages={paginationPages} total={response.paginacion.total} />
                </div>
              </>
            ) : (
              <div className="py-16 text-center">
                <Icon icon="solar:shield-minimalistic-linear" className="mx-auto mb-3 text-5xl text-slate-200 dark:text-slate-700" />
                <p className="font-semibold text-slate-500 dark:text-slate-400">Sin series registradas</p>
                <p className="mt-1 text-sm text-slate-400">Usa el botón "Nueva serie" para registrar manualmente, o registra desde una compra.</p>
              </div>
            )}
          </div>
        </div>

        {/* Panel lateral — detalle + reclamos */}
        {selectedSerie && (
          <div className="w-80 shrink-0 rounded-3xl bg-white dark:bg-[#111827] p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">{selectedSerie.numeroSerie}</div>
                <div className="mt-0.5 truncate text-xs text-slate-400">{selectedSerie.producto.descripcion}</div>
              </div>
              <button onClick={() => setSelectedSerie(null)} className="text-slate-400 hover:text-slate-600">
                <Icon icon="solar:close-circle-bold" width={20} />
              </button>
            </div>

            {/* Info rápida */}
            <div className="mb-4 space-y-1.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Estado</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${serieBadge[selectedSerie.estado]}`}>{selectedSerie.estado}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Garantía</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${garantiaBadge[selectedSerie.estadoGarantia]}`}>{selectedSerie.estadoGarantia}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hasta</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{fmt(selectedSerie.garantiaHasta)}</span>
              </div>
              {selectedSerie.comprobante && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Comprobante</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedSerie.comprobante.numero}</span>
                </div>
              )}
              {selectedSerie.comprobante?.cliente && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente</span>
                  <span className="max-w-[130px] truncate font-semibold text-slate-700 dark:text-slate-200">{selectedSerie.comprobante.cliente.nombre}</span>
                </div>
              )}
              {selectedSerie.observacion && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5">
                  <span className="text-slate-400">Observación: </span>
                  <span className="text-slate-700 dark:text-slate-200">{selectedSerie.observacion}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => abrirConstancia(selectedSerie)}
              disabled={generatingConstanciaId === selectedSerie.id}
              className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-50 px-3 py-2.5 text-xs font-bold text-violet-600 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
            >
              <Icon
                icon={generatingConstanciaId === selectedSerie.id ? 'line-md:loading-twotone-loop' : 'solar:document-text-bold-duotone'}
                width={16}
              />
              {generatingConstanciaId === selectedSerie.id ? 'Generando constancia...' : 'Ver constancia PDF'}
            </button>

            {/* Reclamos */}
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Reclamos / Atenciones</h4>
              <button onClick={() => { setShowReclamoForm(true); setEditReclamo(null); setReclamoForm(EMPTY_RECLAMO); }}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-rose-600">
                <Icon icon="solar:add-circle-bold" width={13} />
                Nuevo
              </button>
            </div>

            {showReclamoForm && (
              <div className="mb-4 space-y-2 rounded-2xl border border-rose-100 bg-rose-50 p-3 dark:border-rose-900/40 dark:bg-rose-900/20">
                <textarea
                  className="w-full rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-rose-900/40 dark:bg-slate-900 dark:text-slate-100"
                  rows={3} placeholder="Descripción del problema..."
                  value={reclamoForm.descripcion}
                  onChange={(e) => setReclamoForm((p) => ({ ...p, descripcion: e.target.value }))}
                />
                <input
                  className="w-full rounded-lg border border-rose-200 bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-rose-900/40 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Técnico responsable (opcional)"
                  value={reclamoForm.tecnico}
                  onChange={(e) => setReclamoForm((p) => ({ ...p, tecnico: e.target.value }))}
                />
                {editReclamo && (
                  <Select
                    name="estadoReclamo"
                    label="Estado"
                    error=""
                    options={estadoReclamoOptions}
                    value={estadoReclamoOptions.find((o) => o.id === reclamoForm.estadoReclamo)?.value}
                    onChange={(id) => setReclamoForm((p) => ({ ...p, estadoReclamo: String(id) as EstadoReclamo }))}
                  />
                )}
                <div className="flex gap-2">
                  <button onClick={guardarReclamo} disabled={savingReclamo}
                    className="flex-1 rounded-lg bg-rose-500 py-1.5 text-xs font-bold text-white transition hover:bg-rose-600 disabled:opacity-50">
                    {savingReclamo ? 'Guardando...' : editReclamo ? 'Actualizar' : 'Registrar'}
                  </button>
                  <button onClick={() => { setShowReclamoForm(false); setEditReclamo(null); }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {loadingReclamos ? (
              <div className="flex justify-center py-6"><Icon icon="line-md:loading-twotone-loop" className="text-2xl text-violet-500" /></div>
            ) : reclamos.length === 0 ? (
              <p className="py-4 text-center text-xs text-slate-400">Sin reclamos registrados</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {reclamos.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${reclamoBadge[r.estadoReclamo]}`}>{r.estadoReclamo}</span>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditReclamo(r); setReclamoForm({ descripcion: r.descripcion, tecnico: r.tecnico ?? '', estadoReclamo: r.estadoReclamo }); setShowReclamoForm(true); }}
                          className="text-slate-400 hover:text-slate-600"><Icon icon="solar:pen-new-square-linear" width={14} /></button>
                        <button onClick={() => setReclamoToDelete(r)} className="text-rose-400 hover:text-rose-600"><Icon icon="solar:trash-bin-2-linear" width={14} /></button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-700 dark:text-slate-300">{r.descripcion}</p>
                    {r.tecnico && <p className="mt-1 text-[11px] text-slate-400">Técnico: {r.tecnico}</p>}
                    {r.resolucion && <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">Resolución: {r.resolucion}</p>}
                    <p className="mt-1 text-[10px] text-slate-400">{fmt(r.fechaReclamo)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal nueva / editar serie */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#111827] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">{editSerie ? 'Editar serie' : 'Registrar nueva serie'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <Icon icon="solar:close-circle-bold" width={22} />
              </button>
            </div>

            <div className="space-y-4">
              {!editSerie && (
                <div className="relative" ref={productoDropdownRef}>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Producto *</label>
                  {productoSelected ? (
                    <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 dark:border-violet-800 dark:bg-violet-900/20">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{productoSelected.descripcion}</div>
                        <div className="font-mono text-[11px] uppercase text-slate-400">{productoSelected.codigo}</div>
                      </div>
                      <button type="button" onClick={() => { setProductoSelected(null); setProductoSearch(''); }}
                        className="text-slate-400 transition hover:text-rose-500">
                        <Icon icon="solar:close-circle-bold" width={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        placeholder="Buscar producto por nombre o código..."
                        value={productoSearch}
                        onChange={(e) => { setProductoSearch(e.target.value); setShowProductoDropdown(true); }}
                        onFocus={() => productoOptions.length > 0 && setShowProductoDropdown(true)}
                      />
                      {showProductoDropdown && productoOptions.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                          {productoOptions.map((p) => (
                            <button key={p.id} type="button"
                              className="w-full border-b border-slate-50 px-3 py-2.5 text-left transition last:border-0 hover:bg-violet-50 dark:border-slate-700 dark:hover:bg-slate-700"
                              onClick={() => { setProductoSelected(p); setProductoSearch(''); setShowProductoDropdown(false); setForm((f) => ({ ...f, productoId: String(p.id) })); }}>
                              <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{p.descripcion}</div>
                              <div className="font-mono text-[11px] uppercase text-slate-400">{p.codigo} · ID:{p.id}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {!editSerie && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Series *</label>
                  <textarea rows={4}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm font-bold uppercase text-slate-800 placeholder:font-normal placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    placeholder={"Una serie por línea o separadas por coma:\nSN123ABC\nSN456DEF\nSN789GHI"}
                    value={bulkSeries}
                    onChange={(e) => setBulkSeries(e.target.value.toUpperCase())}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    {bulkSeries.split(/[\n,]+/).filter((s) => s.trim()).length > 0
                      ? `${bulkSeries.split(/[\n,]+/).filter((s) => s.trim()).length} serie(s) a registrar`
                      : 'Ingresa los números de serie separados por salto de línea o coma'}
                  </p>
                </div>
              )}

              {editSerie && (
                <div>
                  <Select
                    name="estado"
                    label="Estado"
                    error=""
                    options={estadoOptions.filter((o) => o.id !== 'TODOS')}
                    value={estadoOptions.find((o) => o.id === ((form as any).estado ?? editSerie.estado))?.value}
                    onChange={(id) => setForm((p) => ({ ...p, estado: String(id) } as any))}
                  />
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Meses de garantía</label>
                <input type="number" min={0} max={120}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Ej. 12"
                  value={form.garantiaMeses}
                  onChange={(e) => setForm((p) => ({ ...p, garantiaMeses: e.target.value }))} />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-slate-400">Observación</label>
                <textarea rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  placeholder="Notas adicionales..."
                  value={form.observacion}
                  onChange={(e) => setForm((p) => ({ ...p, observacion: e.target.value }))} />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                Cancelar
              </button>
              <button onClick={guardarSerie} disabled={saving}
                className="flex-1 rounded-2xl py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-105 disabled:opacity-50"
                style={{ background: ACCENT }}>
                {saving ? 'Guardando...' : editSerie ? 'Actualizar' : 'Registrar serie'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalConfirm
        isOpenModal={Boolean(serieToDelete)}
        setIsOpenModal={(v) => { if (!v) setSerieToDelete(null); }}
        confirmSubmit={eliminarSerie}
        confirmLoading={deleting}
        title="Eliminar serie"
        information={
          serieToDelete?.estado === 'VENDIDO'
            ? `La serie "${serieToDelete?.numeroSerie}" está vendida y se marcará como BAJA. ¿Deseas continuar?`
            : `¿Eliminar permanentemente la serie "${serieToDelete?.numeroSerie}"? Esta acción no se puede deshacer.`
        }
        confirmText="Eliminar"
      />

      <ModalConfirm
        isOpenModal={Boolean(reclamoToDelete)}
        setIsOpenModal={(v) => { if (!v) setReclamoToDelete(null); }}
        confirmSubmit={eliminarReclamo}
        confirmLoading={deletingReclamo}
        title="Eliminar reclamo"
        information="¿Eliminar este reclamo de garantía? Esta acción no se puede deshacer."
        confirmText="Eliminar"
      />
    </div>
  );
}
