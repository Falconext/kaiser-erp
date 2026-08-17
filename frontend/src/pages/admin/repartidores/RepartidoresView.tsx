import React, { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import apiClient from '@/utils/apiClient';
import { Repartidor, RepartidorFormData, TipoRepartidor, useRepartidoresStore } from '@/zustand/repartidores';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DespachoStat {
  preparando: number;
  enCamino: number;
  entregado: number;
  total: number;
}

type FiltroTipo = 'TODOS' | 'PLANILLA' | 'EVENTUAL';
type FiltroEstado = 'TODOS' | 'ACTIVOS' | 'INACTIVOS';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = 'var(--accent, #7551FF)';

const EMPTY_FORM: RepartidorFormData = { nombre: '', celular: '', tipo: 'EVENTUAL', activo: true };

const INPUT_CLASS =
  'w-full rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none transition focus:border-[var(--accent)]';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nombre: string) {
  const parts = nombre.trim().split(' ').filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

// ─── RepartidorCard ───────────────────────────────────────────────────────────

interface CardProps {
  repartidor: Repartidor;
  stats?: DespachoStat;
  statsLoading: boolean;
  onEdit: (r: Repartidor) => void;
  onDelete: (r: Repartidor) => void;
  onToggleActive: (r: Repartidor) => void;
  onViewDespachos: (r: Repartidor) => void;
}

function RepartidorCard({ repartidor, stats, statsLoading, onEdit, onDelete, onToggleActive, onViewDespachos }: CardProps) {
  const initials = getInitials(repartidor.nombre);
  const isPlanilla = repartidor.tipo === 'PLANILLA';
  const tasaEntrega = stats && stats.total > 0 ? Math.round((stats.entregado / stats.total) * 100) : 0;
  const celular = repartidor.celular?.replace(/\D/g, '') ?? '';

  return (
    <div
      className={`relative flex flex-col rounded-3xl bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none transition-all hover:shadow-[0_6px_28px_rgba(15,23,42,0.08)] overflow-hidden ${
        repartidor.activo ? 'border border-slate-100 dark:border-slate-800' : 'border border-dashed border-slate-200 dark:border-slate-700 opacity-70'
      }`}
    >
      {/* Tipo stripe */}
      <div className={`h-1 w-full shrink-0 ${isPlanilla ? 'bg-gradient-to-r from-violet-500 to-indigo-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`} />

      <div className="flex-1 p-4 space-y-3">
        {/* Avatar + Name + Badges */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white shadow-sm ${
              isPlanilla ? 'bg-gradient-to-br from-violet-400 to-indigo-500' : 'bg-gradient-to-br from-amber-400 to-orange-500'
            }`}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-white truncate leading-snug">{repartidor.nombre}</p>
            {repartidor.sede?.nombre && (
              <div className="flex items-center gap-1 mt-0.5">
                <Icon icon="solar:map-point-linear" className="text-slate-400 shrink-0" width={11} />
                <p className="text-xs text-slate-400 truncate">{repartidor.sede.nombre}</p>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  isPlanilla ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300'
                }`}
              >
                {repartidor.tipo}
              </span>
              <button
                type="button"
                onClick={() => onToggleActive(repartidor)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition hover:opacity-75 ${
                  repartidor.activo ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${repartidor.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {repartidor.activo ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          </div>
        </div>

        {/* Celular row */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <Icon icon="solar:phone-linear" className="text-slate-400 shrink-0" width={14} />
            <span className="text-sm text-slate-700 dark:text-slate-200 font-medium tabular-nums">
              {repartidor.celular || '—'}
            </span>
          </div>
          {celular ? (
            <a
              href={`https://wa.me/51${celular}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1 rounded-lg bg-emerald-500 px-2.5 text-white hover:bg-emerald-600 transition-colors text-[11px] font-bold shrink-0"
              title="Contactar por WhatsApp"
            >
              <Icon icon="mdi:whatsapp" width={13} />
              WhatsApp
            </a>
          ) : (
            <span className="text-[10px] text-slate-400">Sin contacto</span>
          )}
        </div>

        {/* Despachos hoy */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Icon icon="solar:calendar-linear" width={12} />
              Despachos hoy
            </p>
            {stats && stats.total > 0 && (
              <span className="text-[10px] font-bold text-slate-500">
                {stats.total} en total
              </span>
            )}
          </div>

          {statsLoading ? (
            <div className="flex items-center gap-2 text-slate-400 py-1">
              <Icon icon="mdi:loading" className="animate-spin shrink-0" width={13} />
              <span className="text-xs">Cargando...</span>
            </div>
          ) : stats && stats.total > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                <div className="flex flex-col items-center rounded-xl bg-amber-50 dark:bg-amber-900/20 px-1.5 py-1.5">
                  <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400 leading-none">{stats.preparando}</span>
                  <span className="text-[9px] text-amber-500 mt-0.5 font-semibold">Prep.</span>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-blue-50 dark:bg-blue-900/20 px-1.5 py-1.5">
                  <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400 leading-none">{stats.enCamino}</span>
                  <span className="text-[9px] text-blue-500 mt-0.5 font-semibold">Tráns.</span>
                </div>
                <div className="flex flex-col items-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-1.5">
                  <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">{stats.entregado}</span>
                  <span className="text-[9px] text-emerald-500 mt-0.5 font-semibold">Entr.</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                    style={{ width: `${tasaEntrega}%` }}
                  />
                </div>
                <span className="text-[10px] font-extrabold text-emerald-600 shrink-0 tabular-nums">
                  {tasaEntrega}%
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400 py-0.5">
              <Icon icon="solar:sleep-linear" width={14} />
              <span className="text-xs">Sin despachos asignados hoy</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-1.5 border-t border-slate-100 dark:border-slate-800 px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={() => onViewDespachos(repartidor)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-xs font-bold transition-colors"
        >
          <Icon icon="solar:route-linear" width={14} />
          Ver despachos
        </button>
        <button
          type="button"
          onClick={() => onEdit(repartidor)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          title="Editar"
        >
          <Icon icon="solar:pen-linear" width={14} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(repartidor)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
          title="Eliminar"
        >
          <Icon icon="solar:trash-bin-trash-linear" width={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function RepartidoresView() {
  const navigate = useNavigate();
  const { repartidores, loading, fetchRepartidores, createRepartidor, updateRepartidor, toggleActivo, deleteRepartidor } =
    useRepartidoresStore();

  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('TODOS');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Repartidor | null>(null);
  const [form, setForm] = useState<RepartidorFormData>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<Repartidor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [despachoMap, setDespachoMap] = useState<Map<number, DespachoStat>>(new Map());
  const [despachoLoading, setDespachoLoading] = useState(false);
  const [globalDespacho, setGlobalDespacho] = useState({ total: 0, preparando: 0, enCamino: 0, entregado: 0 });

  const fetchDespachoStats = useCallback(async () => {
    setDespachoLoading(true);
    try {
      const fecha = moment().format('YYYY-MM-DD');
      const { data } = await apiClient.get<any>(`/envio-despacho/panel?fecha=${fecha}`);
      const raw: any[] = data?.data?.data ?? data?.data ?? [];
      if (!Array.isArray(raw)) return;

      const map = new Map<number, DespachoStat>();
      let gTotal = 0, gPreparando = 0, gEnCamino = 0, gEntregado = 0;

      raw.forEach((item) => {
        if (item.repartidorId == null) return;
        const id = Number(item.repartidorId);
        if (!map.has(id)) map.set(id, { preparando: 0, enCamino: 0, entregado: 0, total: 0 });
        const s = map.get(id)!;
        s.total++;
        gTotal++;
        if (['PREPARANDO', 'POR_COORDINAR'].includes(item.estado)) { s.preparando++; gPreparando++; }
        else if (['EN_CAMINO', 'EN_REPARTO', 'ENVIADO'].includes(item.estado)) { s.enCamino++; gEnCamino++; }
        else if (['ENTREGADO', 'ENTREGADO_COMPLETADO'].includes(item.estado)) { s.entregado++; gEntregado++; }
      });

      setDespachoMap(map);
      setGlobalDespacho({ total: gTotal, preparando: gPreparando, enCamino: gEnCamino, entregado: gEntregado });
    } catch {
      // despacho stats are optional — fail silently
    } finally {
      setDespachoLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRepartidores(); }, [fetchRepartidores]);
  useEffect(() => { void fetchDespachoStats(); }, [fetchDespachoStats]);

  const handleRefresh = () => {
    void fetchRepartidores();
    void fetchDespachoStats();
  };

  const stats = useMemo(() => ({
    total: repartidores.length,
    activos: repartidores.filter((r) => r.activo).length,
    planilla: repartidores.filter((r) => r.tipo === 'PLANILLA').length,
    eventual: repartidores.filter((r) => r.tipo === 'EVENTUAL').length,
  }), [repartidores]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return repartidores.filter((r) => {
      if (filtroTipo !== 'TODOS' && r.tipo !== filtroTipo) return false;
      if (filtroEstado === 'ACTIVOS' && !r.activo) return false;
      if (filtroEstado === 'INACTIVOS' && r.activo) return false;
      if (query) {
        return (
          r.nombre.toLowerCase().includes(query) ||
          String(r.celular ?? '').includes(query) ||
          (r.sede?.nombre ?? '').toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [repartidores, search, filtroTipo, filtroEstado]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setModalOpen(true); };

  const openEdit = (item: Repartidor) => {
    setEditing(item);
    setForm({ nombre: item.nombre, celular: item.celular ?? '', tipo: item.tipo, activo: item.activo });
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.nombre.trim()) return;
    setSubmitting(true);
    try {
      const payload: RepartidorFormData = {
        nombre: form.nombre.trim(),
        celular: form.celular?.trim() || null,
        tipo: form.tipo,
        activo: form.activo,
      };
      if (editing) await updateRepartidor(editing.id, payload);
      else await createRepartidor(payload);
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await deleteRepartidor(confirmDelete.id);
    setConfirmDelete(null);
  };

  const handleToggleActive = (item: Repartidor) => {
    void toggleActivo(item.id, !item.activo);
  };

  const handleViewDespachos = (item: Repartidor) => {
    navigate(`/administrador/ventas?fecha=${moment().format('YYYY-MM-DD')}&repartidorId=${item.id}`);
  };

  const globalTasa = globalDespacho.total > 0 ? Math.round((globalDespacho.entregado / globalDespacho.total) * 100) : 0;
  const hasFilters = search || filtroTipo !== 'TODOS' || filtroEstado !== 'TODOS';
  const isBusy = loading || despachoLoading;

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">

      {/* ── Breadcrumb ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Logística</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Repartidores</span>
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Repartidores</h1>
          <p className="text-sm text-slate-400 mt-0.5">Equipo de reparto propio · rendimiento del día</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 lg:w-72">
            <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nombre, celular o sede…"
              className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <Icon icon="solar:close-circle-bold" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isBusy}
            className="h-11 w-11 grid place-items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50 shrink-0"
            title="Actualizar"
          >
            <Icon icon="solar:refresh-linear" width={18} className={isBusy ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
            style={{ background: ACCENT }}
          >
            <Icon icon="solar:add-circle-bold" className="text-lg" />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>
      </div>

      {/* ── KPIs — Repartidores ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: stats.total, icon: 'solar:users-group-rounded-linear', colorClass: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
          { label: 'Activos', value: stats.activos, icon: 'solar:check-circle-linear', colorClass: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
          { label: 'Planilla', value: stats.planilla, icon: 'solar:user-id-linear', colorClass: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' },
          { label: 'Eventuales', value: stats.eventual, icon: 'solar:user-hand-up-linear', colorClass: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
        ].map((k) => (
          <div key={k.label} className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${k.colorClass}`}>
                <Icon icon={k.icon} width={22} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-slate-800 dark:text-white leading-none">{k.value}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wide mt-1">{k.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── KPIs — Despacho hoy ──────────────────────────────────── */}
      {(globalDespacho.total > 0 || despachoLoading) && (
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
              <Icon icon="solar:calendar-linear" width={14} style={{ color: ACCENT }} />
              Despachos hoy · {moment().format('DD/MM/YYYY')}
            </p>
            {globalDespacho.total > 0 && (
              <span className="text-xs font-extrabold" style={{ color: ACCENT }}>
                {globalTasa}% entregado
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { label: 'Total', value: globalDespacho.total, textColor: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
              { label: 'Por preparar', value: globalDespacho.preparando, textColor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { label: 'En tránsito', value: globalDespacho.enCamino, textColor: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { label: 'Entregados', value: globalDespacho.entregado, textColor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            ].map((k) => (
              <div key={k.label} className={`rounded-2xl ${k.bg} px-3 py-2.5`}>
                <p className={`text-2xl font-extrabold leading-none ${k.textColor}`}>
                  {despachoLoading ? '…' : k.value}
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1.5 leading-tight">{k.label}</p>
              </div>
            ))}
          </div>

          {globalDespacho.total > 0 && (
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700"
                style={{ width: `${globalTasa}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="flex items-center gap-1.5">
          {(['TODOS', 'PLANILLA', 'EVENTUAL'] as FiltroTipo[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFiltroTipo(t)}
              className={`h-9 px-3.5 rounded-xl text-xs font-bold transition ${
                filtroTipo === t
                  ? 'text-white shadow-lg shadow-violet-500/30'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              style={filtroTipo === t ? { background: ACCENT } : undefined}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { value: 'TODOS' as FiltroEstado, label: 'Todos' },
            { value: 'ACTIVOS' as FiltroEstado, label: '● Activos' },
            { value: 'INACTIVOS' as FiltroEstado, label: '○ Inactivos' },
          ].map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFiltroEstado(f.value)}
              className={`h-9 px-3.5 rounded-xl text-xs font-bold transition ${
                filtroEstado === f.value
                  ? 'text-white shadow-lg shadow-violet-500/30'
                  : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
              style={filtroEstado === f.value ? { background: ACCENT } : undefined}
            >
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-sm text-slate-400 font-medium px-1">{filtered.length} resultados</span>
      </div>

      {/* ── Cards Grid ───────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#111827] p-4 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-3 w-1/3 rounded bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              </div>
              <div className="h-10 mt-3 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              <div className="h-20 mt-3 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111827] text-slate-400">
          <Icon icon="solar:delivery-linear" width={48} className="text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium">
            {repartidores.length === 0 ? 'Aún no hay repartidores registrados' : 'Sin resultados para los filtros actuales'}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setSearch(''); setFiltroTipo('TODOS'); setFiltroEstado('TODOS'); }}
              className="text-xs font-semibold hover:underline"
              style={{ color: ACCENT }}
            >
              Limpiar filtros
            </button>
          )}
          {repartidores.length === 0 && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-500/30 hover:brightness-105 transition"
              style={{ background: ACCENT }}
            >
              <Icon icon="solar:add-circle-bold" width={16} />
              Agregar el primero
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <RepartidorCard
              key={r.id}
              repartidor={r}
              stats={despachoMap.get(r.id)}
              statsLoading={despachoLoading}
              onEdit={openEdit}
              onDelete={setConfirmDelete}
              onToggleActive={handleToggleActive}
              onViewDespachos={handleViewDespachos}
            />
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ──────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-900/40" onClick={() => setModalOpen(false)} aria-label="Cerrar" />
          <form onSubmit={handleSubmit} className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-[#111827] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5" style={{ background: ACCENT }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 text-white">
                  <Icon icon="solar:delivery-bold-duotone" width={22} />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold leading-none text-white">
                    {editing ? 'Editar Repartidor' : 'Nuevo Repartidor'}
                  </h2>
                  <p className="mt-1 text-xs text-white/80">Personal disponible para reparto propio</p>
                </div>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl bg-white/15 p-2 text-white hover:bg-white/25 transition">
                <Icon icon="solar:close-circle-bold" width={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Nombre *</label>
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                  className={INPUT_CLASS}
                  placeholder="Nombre completo del repartidor"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Celular</label>
                <input
                  value={form.celular ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, celular: e.target.value.replace(/\D/g, '').slice(0, 9) }))}
                  className={INPUT_CLASS}
                  placeholder="9XXXXXXXX"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as TipoRepartidor }))}
                    className={INPUT_CLASS}
                  >
                    <option value="PLANILLA">PLANILLA</option>
                    <option value="EVENTUAL">EVENTUAL</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">Estado</label>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, activo: !p.activo }))}
                    className={`flex h-11 w-full items-center justify-between rounded-2xl border-2 px-3.5 text-sm font-bold transition ${
                      form.activo
                        ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span>{form.activo ? 'Activo' : 'Inactivo'}</span>
                    <Icon icon={form.activo ? 'solar:toggle-on-bold' : 'solar:toggle-off-bold'} width={24} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-11 flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !form.nombre.trim()}
                className="h-11 flex-[2] rounded-2xl text-sm font-extrabold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-105 disabled:opacity-60"
                style={{ background: ACCENT }}
              >
                {submitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Delete Confirm ───────────────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-slate-900/40" onClick={() => setConfirmDelete(null)} aria-label="Cerrar" />
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-[#111827] p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400">
              <Icon icon="solar:trash-bin-trash-bold-duotone" width={24} />
            </div>
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Eliminar repartidor</h3>
            <p className="mt-2 text-sm text-slate-500">
              Se desactivará a <strong>{confirmDelete.nombre}</strong>. Podrás reactivarlo editándolo cuando lo necesites.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="h-10 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="h-10 flex-1 rounded-xl bg-rose-600 text-sm font-bold text-white hover:bg-rose-700 transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
