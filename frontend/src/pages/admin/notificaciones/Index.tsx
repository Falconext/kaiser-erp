import { useNotificacionesViewModel } from '@/features/admin/notificaciones/useNotificacionesViewModel';
import { Icon } from '@iconify/react';
import KpiHero from '@/components/ui/KpiHero';

const ACCENT = 'var(--accent, #7551FF)';

const NotificacionesPage = () => {
  const vm = useNotificacionesViewModel();
  const visibles = vm.notificaciones?.length || 0;
  const sinLeer = Math.max(0, vm.noLeidas || 0);
  const totalNotificaciones = Math.max(visibles, sinLeer);
  const leidas = Math.max(0, totalNotificaciones - sinLeer);

  const stats = [
    { label: 'Total', value: totalNotificaciones, icon: 'solar:bell-bold', chip: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400', num: 'text-slate-800 dark:text-white' },
    { label: 'Sin Leer', value: sinLeer, icon: 'solar:letter-unread-bold', chip: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400', num: 'text-rose-600 dark:text-rose-400' },
    { label: 'Leídas', value: leidas, icon: 'solar:letter-opened-bold', chip: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400', num: 'text-emerald-600 dark:text-emerald-400' },
  ];

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Notificaciones</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Notificaciones</h1>
          <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Centro de alertas y mensajes del sistema</p>
        </div>
        {sinLeer > 0 && (
          <button
            onClick={vm.marcarTodasComoLeidas}
            className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
            style={{ background: ACCENT }}
          >
            <Icon icon="solar:check-read-bold" className="text-lg" /> Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Stats — diseño hero del dashboard */}
      <KpiHero
        className="mb-6"
        cards={[
          { label: 'Total', value: String(totalNotificaciones), mini: 'line' },
          { label: 'Sin Leer', value: String(sinLeer), mini: 'wave' },
          { label: 'Leídas', value: String(leidas), mini: 'bars' },
        ]}
      />

      {/* Contenido */}
      {vm.loading && vm.notificaciones.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
                <div className="flex-1 h-4 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
              </div>
              <div className="h-3 rounded bg-slate-100 dark:bg-slate-700 animate-pulse mb-2" />
              <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-700 animate-pulse" />
            </div>
          ))}
        </div>
      ) : vm.notificaciones?.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-50 dark:bg-slate-900 mb-4">
            <Icon icon="solar:bell-off-linear" className="h-10 w-10 text-slate-300 dark:text-gray-600" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">No tienes notificaciones</h3>
          <p className="text-slate-400 dark:text-gray-400 max-w-md mx-auto">Cuando recibas notificaciones importantes, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vm.notificaciones?.map((notificacion) => {
            const { icon, iconColor } = vm.getTipoIcon(notificacion.tipo);
            return (
              <div
                key={notificacion.id}
                onClick={() => vm.handleNotificacionClick(notificacion)}
                className={`bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none hover:shadow-[0_8px_30px_rgba(15,23,42,0.10)] transition-all cursor-pointer overflow-hidden ${!notificacion.leida ? 'ring-2 ring-[var(--accent)]/40' : ''}`}
              >
                <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center">
                      <Icon icon={icon} className={`h-5 w-5 ${iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-2 leading-tight">{notificacion.titulo}</h3>
                      {!notificacion.leida && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> Nueva
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-slate-500 dark:text-gray-400 mb-3 line-clamp-3 leading-relaxed">{notificacion.mensaje}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-gray-400">
                    <Icon icon="solar:clock-circle-linear" className="h-3.5 w-3.5" />
                    <span>{vm.formatFecha(notificacion.creadoEn)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificacionesPage;
