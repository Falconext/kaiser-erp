import { Icon } from '@iconify/react';
import { useCampanasViewModel } from './useCampanasViewModel';
import CampanaFormModal from './CampanaFormModal';
import { Campana, MESES, formatCurrency, PlataformaAds } from './CampanasModel';
import KpiHero from '@/components/ui/KpiHero';

const ACCENT = 'var(--accent, #7551FF)';

const PLATAFORMA_CONFIG = {
  META: { label: 'META', color: '#1877f2', bg: 'bg-[#1877f2]' },
  TIKTOK: { label: 'TIKTOK', color: '#ff0050', bg: 'bg-[#ff0050]' },
};

function KpiCard({ label, value, icon, chipClass }: { label: string; value: string; icon: string; chipClass: string }) {
  return (
    <div className="bg-white dark:bg-[#111827] rounded-3xl p-5 shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${chipClass}`}>
          <Icon icon={icon} className="text-xl" />
        </div>
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-extrabold text-slate-800 dark:text-white">{value}</p>
    </div>
  );
}

function CampanaCard({ c, onEditar, onToggle }: { c: Campana; onEditar: () => void; onToggle: () => void }) {
  const plat = PLATAFORMA_CONFIG[c.plataforma];
  const activa = c.estado === 'ACTIVA';
  const moneda = c.moneda;

  return (
    <div className={`bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden transition-opacity ${!activa ? 'opacity-60' : ''}`}>
      {/* Header de la card */}
      <div className="flex items-center gap-3 p-4">
        <div className={`${plat.bg} text-white rounded-xl px-3 py-1.5 text-xs font-black flex-shrink-0`}>
          {plat.label}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-white truncate flex items-center gap-1.5">
            {c.nombre}
            {c.esRecurrente && <span title="Bucle recurrente activo" className="inline-flex"><Icon icon="solar:refresh-circle-bold-duotone" className="text-violet-500" /></span>}
          </p>
          {c.producto && (
            <p className="text-xs text-indigo-500 truncate mt-0.5">{c.producto.descripcion}</p>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${activa ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${activa ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {activa ? 'ACTIVA' : 'PAUSADA'}
        </span>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={onToggle} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${activa ? 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800' : 'text-white hover:brightness-105'}`} style={!activa ? { background: ACCENT } : undefined}>
            {activa ? 'Pausar' : 'Activar'}
          </button>
          <button onClick={onEditar} className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            <Icon icon="solar:pen-bold-duotone" className="text-base" />
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-px bg-slate-100 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800">
        {[
          {
            label: c.tipoPresupuesto === 'SEMANAL' ? 'Presup. Semanal' : c.tipoPresupuesto === 'MENSUAL' ? 'Presup. Mensual' : c.tipoPresupuesto === 'TOTAL' ? 'Presup. Total' : 'Presup./día',
            value: formatCurrency(c.presupuestoOriginal || c.presupuestoDiario, moneda)
          },
          { label: 'Días del mes', value: String(c.diasProyectados ?? c.diasActivos) },
          { label: 'Invertido', value: formatCurrency(c.gastoEstimado, moneda), sub: `${c.diasActivos} días` },
          { label: 'Ventas', value: String(c.ventasAtribuidas), sub: 'unidades' },
        ].map((m, i) => (
          <div key={i} className="bg-white dark:bg-[#111827] px-3 py-3 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{m.label}</p>
            <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{m.value}</p>
            {m.sub && <p className="text-[9px] text-slate-400">{m.sub}</p>}
          </div>
        ))}
      </div>

      {/* Ganancia real por unidad vendida */}
      {c.pnlUnidad && (
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mb-1.5">
            ¿Cuánto gano por cada unidad vendida?
          </p>
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <span className="text-slate-600 dark:text-slate-300">{formatCurrency(c.pnlUnidad.precio, moneda)}</span>
            <span className="text-slate-400 text-[10px]">precio neto (sin IGV)</span>
            <span className="text-slate-400 mx-0.5">−</span>
            <span className="text-slate-600 dark:text-slate-300">{formatCurrency(c.pnlUnidad.costoProducto, moneda)}</span>
            <span className="text-slate-400 text-[10px]">costo producto</span>
            {c.pnlUnidad.costoFijo > 0 && <>
              <span className="text-slate-400 mx-0.5">−</span>
              <span className="text-slate-600 dark:text-slate-300">{formatCurrency(c.pnlUnidad.costoFijo, moneda)}</span>
              <span className="text-slate-400 text-[10px]">costo fijo/envío</span>
            </>}
            {c.pnlUnidad.comisionVenta > 0 && <>
              <span className="text-slate-400 mx-0.5">−</span>
              <span className="text-slate-600 dark:text-slate-300">{formatCurrency(c.pnlUnidad.comisionVenta, moneda)}</span>
              <span className="text-slate-400 text-[10px]">comisión vendedor</span>
            </>}
            {c.cpa > 0 && <>
              <span className="text-slate-400 mx-0.5">−</span>
              <span className="text-amber-600 font-semibold">{formatCurrency(c.cpa, moneda)}</span>
              <span className="text-slate-400 text-[10px]">publicidad por venta</span>
            </>}
            <span className="text-slate-400 mx-0.5">=</span>
            <span className={`font-bold text-sm ${c.pnlUnidad.gananciaReal >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              {formatCurrency(c.pnlUnidad.gananciaReal, moneda)}
            </span>
            <span className={`text-[10px] font-semibold ${c.pnlUnidad.gananciaReal >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
              {c.pnlUnidad.gananciaReal >= 0 ? 'ganancia neta' : 'estás perdiendo dinero'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CampanasView() {
  const vm = useCampanasViewModel();
  const { mes, anio, data, isLoading, filtroPlataforma, setFiltroPlataforma, campanasFiltradas, navegarMes, abrirCrear, abrirEditar, toggleEstado } = vm;
  const now = new Date();
  const resumen = data?.resumen;

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Marketing</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Campañas</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Campañas de Publicidad</h1>
          <p className="text-sm text-slate-400 mt-0.5">Controla tus inversiones en ads y cuánto ganas realmente por cada venta.</p>
        </div>
        <button onClick={abrirCrear}
          className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
          style={{ background: ACCENT }}>
          <Icon icon="solar:add-circle-bold" className="text-lg" /> Nueva Campaña
        </button>
      </div>

      {/* KPIs */}
      <KpiHero
        className="mb-6"
        cards={[
          { label: 'Gasté en publicidad', value: resumen ? formatCurrency(resumen.gastoTotalEstimado) : '—', mini: 'wave' },
          { label: 'Ventas logradas con ads', value: resumen ? `${resumen.ventasAtribuidas} ventas` : '—', mini: 'line' },
          { label: 'Cuánto me costó cada venta', value: resumen ? formatCurrency(resumen.cpaPromedio) : '—', mini: 'donut' },
          { label: 'Campañas activas', value: data ? `${data.campanas.filter(c => c.estado === 'ACTIVA').length} de ${data.campanas.length}` : '—', mini: 'bars' },
        ]}
      />

      {/* Filtros + navegación mes */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#111827] rounded-2xl p-1 shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
          {(['TODAS', 'META', 'TIKTOK'] as const).map(p => (
            <button
              key={p}
              onClick={() => setFiltroPlataforma(p as PlataformaAds | 'TODAS')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${filtroPlataforma === p ? 'text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              style={filtroPlataforma === p ? { background: ACCENT } : undefined}
            >
              {p === 'META' ? <span><span style={{color:'#1877f2'}}>●</span> META</span> : p === 'TIKTOK' ? <span><span style={{color:'#ff0050'}}>●</span> TIKTOK</span> : 'Todas'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-[#111827] rounded-2xl px-3 py-2 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
          <button onClick={() => navegarMes(-1)} className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <Icon icon="solar:alt-arrow-left-bold" />
          </button>
          <span className="text-sm font-bold text-slate-800 dark:text-white min-w-[90px] text-center">{MESES[mes - 1]} {anio}</span>
          <button onClick={() => navegarMes(1)} disabled={mes === now.getMonth() + 1 && anio === now.getFullYear()} className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30">
            <Icon icon="solar:alt-arrow-right-bold" />
          </button>
        </div>
      </div>

      {/* Lista campañas */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : campanasFiltradas.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] rounded-3xl p-16 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none text-center">
          <Icon icon="solar:target-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400 dark:text-gray-400">Sin campañas todavía</p>
          <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">Crea tu primera campaña para saber cuánto te cuesta cada venta y cuánto ganas realmente</p>
          <button onClick={abrirCrear} className="mt-4 h-10 px-5 rounded-2xl text-white text-sm font-bold hover:brightness-105 transition-all shadow-lg shadow-violet-500/30" style={{ background: ACCENT }}>
            + Nueva Campaña
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {campanasFiltradas.map(c => (
            <CampanaCard key={c.id} c={c} onEditar={() => abrirEditar(c)} onToggle={() => toggleEstado(c)} />
          ))}
        </div>
      )}

      <CampanaFormModal vm={vm} />
    </div>
  );
}
