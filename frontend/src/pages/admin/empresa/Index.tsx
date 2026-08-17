import { useState, type MouseEvent } from 'react';
import { useEmpresaIndexViewModel } from '@/features/admin/empresa/useEmpresaIndexViewModel';
import { Icon } from '@iconify/react/dist/iconify.js';
import EmpresaFormModal from '@/components/Empresa/EmpresaFormModal';
import EmpresaDrawer from '@/components/Empresa/EmpresaDrawer';
import ModalConfirm from '@/components/ModalConfirm';
import TableSkeleton from '@/components/Skeletons/table';
import TableActionMenu from '@/components/TableActionMenu';
import Select from '@/components/Select';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

const TIPO_OPTIONS = [
  { id: '', value: 'Todas' },
  { id: 'FORMAL', value: 'Formales' },
  { id: 'INFORMAL', value: 'Informales' },
];

const ESTADO_OPTIONS = [
  { id: 'TODOS', value: 'Todos' },
  { id: 'ACTIVO', value: 'Activos' },
  { id: 'INACTIVO', value: 'Inactivos' },
];

const PER_PAGE = [10, 20, 50];

// Pill de ambiente de facturación
function ambientePill(ambiente?: string) {
  const a = String(ambiente ?? '').toUpperCase();
  if (a.includes('PROD')) return { label: 'Producción', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
  if (a.includes('DEMO')) return { label: 'Demo', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };
  return { label: ambiente || '—', dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' };
}

// Pill de estado de la empresa
function estadoPill(estado?: string) {
  const e = String(estado ?? '').toUpperCase();
  if (e === 'ACTIVO') return { label: 'Activo', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
  return { label: 'Inactivo', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' };
}

// Color del texto "Vence en"
function venceClass(texto?: string) {
  const t = String(texto ?? '').toLowerCase();
  if (t.startsWith('vencido')) return 'text-rose-600 dark:text-rose-400';
  if (t.includes('hoy')) return 'text-amber-600 dark:text-amber-400';
  return 'text-slate-500 dark:text-gray-400';
}

const EmpresasIndex = () => {
  const vm = useEmpresaIndexViewModel();
  const sidebarColor = useThemeStore((s) => s.sidebarColor);
  const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedMenuRow, setSelectedMenuRow] = useState<any>(null);
  const [showTipo, setShowTipo] = useState(false);
  const [showEstado, setShowEstado] = useState(false);

  const handleOpenMenu = (event: MouseEvent<HTMLElement>, row: any) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMenuRow(row);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setSelectedMenuRow(null);
  };

  const runMenuAction = (handler: (row: any) => void | Promise<void>) => {
    if (!selectedMenuRow) return;
    handler(selectedMenuRow);
    handleCloseMenu();
  };

  const openCreate = () => { vm.setEmpresaEditingId(undefined); vm.setEmpresaModalMode('create'); vm.setOpenEmpresaModal(true); };

  const rows: any[] = vm.empresasTable ?? [];

  // Paginación (mismos handlers del ViewModel)
  const total = vm.totalEmpresas ?? 0;
  const totalPages = Math.max(1, vm.pages?.length || 1);
  const page = vm.currentPageState;
  const fromRow = total === 0 ? 0 : (page - 1) * vm.itemsPerPage + 1;
  const toRow = Math.min(page * vm.itemsPerPage, total);

  const pageNumbers = (() => {
    const nums: number[] = [];
    const win = 2;
    for (let i = Math.max(1, page - win); i <= Math.min(totalPages, page + win); i++) nums.push(i);
    if (!nums.includes(1)) nums.unshift(1);
    if (!nums.includes(totalPages)) nums.push(totalPages);
    return [...new Set(nums)].sort((a, b) => a - b);
  })();

  const tipoLabel = TIPO_OPTIONS.find((o) => o.id === vm.tipoFiltro)?.value ?? 'Todas';
  const estadoLabel = ESTADO_OPTIONS.find((o) => o.id === vm.estadoFiltro)?.value ?? 'Todos';

  if (vm.loading && vm.empresas.length === 0) return <TableSkeleton />;

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-slate-900 font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Sistema</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Empresas</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Empresas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Administra las empresas registradas en el sistema.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 lg:w-72">
            <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={vm.searchTerm}
              onChange={vm.handleSearch}
              placeholder="Buscar por RUC o razón social…"
              className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-gray-200 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            {vm.searchTerm && (
              <button onClick={() => vm.handleSearch({ target: { value: '' } })} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <Icon icon="solar:close-circle-bold" />
              </button>
            )}
          </div>
          <button
            onClick={() => vm.exportarEmpresas('pdf')}
            disabled={vm.exportando !== null}
            className="h-11 px-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-800 text-sm font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-50 shrink-0"
            title="Exportar el listado filtrado en PDF"
          >
            <Icon icon={vm.exportando === 'pdf' ? 'svg-spinners:180-ring' : 'solar:file-text-bold-duotone'} className="text-lg" /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => vm.exportarEmpresas('excel')}
            disabled={vm.exportando !== null}
            className="h-11 px-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-800 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all disabled:opacity-50 shrink-0"
            title="Exportar el listado filtrado en Excel"
          >
            <Icon icon={vm.exportando === 'excel' ? 'svg-spinners:180-ring' : 'solar:document-add-bold-duotone'} className="text-lg" /> <span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={openCreate}
            className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
            style={{ background: ACCENT }}>
            <Icon icon="solar:add-circle-bold" className="text-lg" /> <span className="hidden sm:inline">Nueva Empresa</span>
          </button>
        </div>
      </div>

      {/* Card contenedora */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-800">
          <button onClick={vm.refreshEmpresas} className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
            style={{ borderColor: `${ACCENT}55`, color: ACCENT }}>
            <Icon icon="solar:refresh-linear" className={vm.loading ? 'animate-spin' : ''} /> Actualizar
          </button>

          {/* Filtro tipo */}
          <div className="relative">
            <button onClick={() => { setShowTipo((v) => !v); setShowEstado(false); }}
              className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
              <Icon icon="solar:filter-linear" /> {tipoLabel}
              {vm.tipoFiltro && <span className="ml-0.5 h-5 min-w-5 px-1 grid place-items-center rounded-full text-white text-[11px]" style={{ background: ACCENT }}>1</span>}
            </button>
            {showTipo && (
              <div className="absolute z-20 mt-2 w-44 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-1.5">
                {TIPO_OPTIONS.map((o) => (
                  <button key={o.id} onClick={() => { vm.setTipoFiltro(o.id); vm.setCurrentPageState(1); setShowTipo(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between ${vm.tipoFiltro === o.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    {o.value} {vm.tipoFiltro === o.id && <Icon icon="solar:check-circle-bold" style={{ color: ACCENT }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filtro estado */}
          <div className="relative">
            <button onClick={() => { setShowEstado((v) => !v); setShowTipo(false); }}
              className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
              <Icon icon="solar:tuning-2-linear" /> {estadoLabel}
            </button>
            {showEstado && (
              <div className="absolute z-20 mt-2 w-44 rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-1.5">
                {ESTADO_OPTIONS.map((o) => (
                  <button key={o.id} onClick={() => { vm.setEstadoFiltro(o.id); vm.setCurrentPageState(1); setShowEstado(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between ${vm.estadoFiltro === o.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    {o.value} {vm.estadoFiltro === o.id && <Icon icon="solar:check-circle-bold" style={{ color: ACCENT }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-sm text-slate-400 font-medium px-1">{total.toLocaleString('es-PE')} resultados</span>
        </div>

        {/* Error */}
        {vm.error && (
          <div className="mx-4 mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-300 rounded-2xl flex items-center gap-2 font-medium text-sm">
            <Icon icon="solar:danger-circle-bold" className="text-xl" />{vm.error}
          </div>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 pl-5 pr-3">Empresa</th>
                <th className="py-3 px-3">Reseller</th>
                <th className="py-3 px-3">Ambiente</th>
                <th className="py-3 px-3">Rubro</th>
                <th className="py-3 px-3">Plan</th>
                <th className="py-3 px-3">Comprobantes</th>
                <th className="py-3 px-3">Vence en</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {vm.loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                    <td colSpan={9} className="py-3.5 px-5">
                      <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <Icon icon="solar:buildings-3-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">No se encontraron empresas</p>
                    <p className="text-slate-400 text-xs mt-1">{vm.searchTerm ? 'Intenta con otros términos de búsqueda' : 'Aún no tienes empresas registradas'}</p>
                    <button onClick={openCreate}
                      className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                      style={{ background: ACCENT }}>
                      <Icon icon="solar:add-circle-bold" /> Crear Primera Empresa
                    </button>
                  </td>
                </tr>
              ) : rows.map((row) => {
                const razon = row['Razon Social'] || row.nombreComercial || 'Empresa';
                const amb = ambientePill(row['Ambiente']);
                const est = estadoPill(row.estado);
                return (
                  <tr key={row.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                          {String(razon).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700 dark:text-gray-200 text-sm truncate max-w-[220px]">{razon}</p>
                          <p className="font-mono text-xs text-slate-400">{row['RUC'] || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {row['Reseller'] ? (
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-600 dark:text-gray-300 truncate max-w-[160px]">{row['Reseller']}</p>
                          {row.resellerCodigo && <p className="font-mono text-[11px] text-slate-400">{row.resellerCodigo}</p>}
                        </div>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Directo</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${amb.bg} ${amb.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${amb.dot}`} /> {amb.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[160px]">{row['Rubro'] || '—'}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300">{row['Plan'] || '—'}</span>
                    </td>
                    <td className="py-3 px-3">
                      {(() => {
                        const c = row.comprobantes ?? { boletas: 0, facturas: 0, notasVenta: 0, total: 0 };
                        if (!c.total) {
                          return <span className="text-xs font-medium text-slate-400">Sin uso</span>;
                        }
                        return (
                          <div className="flex flex-wrap gap-1">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300" title="Boletas">B {c.boletas}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300" title="Facturas">F {c.facturas}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300" title="Notas de venta">NV {c.notasVenta}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className={`py-3 px-3 text-sm font-semibold ${venceClass(row['Vence en'])}`}>{row['Vence en'] || '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${est.bg} ${est.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} /> {est.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 pr-5 text-right">
                      <button
                        type="button"
                        onClick={(event) => handleOpenMenu(event, row)}
                        className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-gray-200 transition-colors ml-auto"
                      >
                        <Icon icon="mdi:dots-vertical" width={18} height={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-sm text-slate-400">{fromRow}-{toRow} de {total.toLocaleString('es-PE')}</span>
            <div className="flex items-center gap-1">
              <button disabled={page <= 1} onClick={() => vm.setCurrentPageState(1)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-left-linear" /></button>
              <button disabled={page <= 1} onClick={() => vm.setCurrentPageState(Math.max(1, page - 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-left-linear" /></button>
              {pageNumbers.map((n, i) => {
                const prev = pageNumbers[i - 1];
                const gap = prev && n - prev > 1;
                return (
                  <span key={n} className="flex items-center">
                    {gap && <span className="px-1 text-slate-300">…</span>}
                    <button onClick={() => vm.setCurrentPageState(n)}
                      className={`h-8 min-w-8 px-2 grid place-items-center rounded-lg text-sm font-semibold transition-colors ${n === page ? 'text-white' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      style={n === page ? { background: ACCENT } : undefined}>
                      {n}
                    </button>
                  </span>
                );
              })}
              <button disabled={page >= totalPages} onClick={() => vm.setCurrentPageState(Math.min(totalPages, page + 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-linear" /></button>
              <button disabled={page >= totalPages} onClick={() => vm.setCurrentPageState(totalPages)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-right-linear" /></button>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Filas/pág</span>
              <div className="w-24">
                <Select
                  label=""
                  name="itemsPerPage"
                  error=""
                  options={PER_PAGE.map((n) => ({ id: n, value: String(n) }))}
                  value={String(vm.itemsPerPage)}
                  onChange={(id) => { vm.setItemsPerPage(Number(id)); vm.setCurrentPageState(1); }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <ModalConfirm isOpenModal={vm.isOpenModalConfirm} setIsOpenModal={vm.setIsOpenModalConfirm}
        title={vm.selectedEmpresa?.accion === 'eliminar' ? 'Eliminar Empresa' : `${vm.selectedEmpresa?.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'} Empresa`}
        information={vm.selectedEmpresa?.accion === 'eliminar' ? `⚠️ Esta acción eliminará PERMANENTEMENTE la empresa "${vm.selectedEmpresa?.['Razon Social']}". Esta acción NO se puede deshacer.` : `¿Estás seguro que deseas ${vm.selectedEmpresa?.estado === 'ACTIVO' ? 'desactivar' : 'activar'} la empresa "${vm.selectedEmpresa?.['Razon Social']}"?`}
        confirmSubmit={vm.confirmAction}
      />
      <EmpresaFormModal open={vm.openEmpresaModal} mode={vm.empresaModalMode} empresaId={vm.empresaEditingId} onClose={() => vm.setOpenEmpresaModal(false)} onSaved={vm.refreshEmpresas} />
      <EmpresaDrawer empresa={vm.drawerEmpresa} onClose={() => vm.setDrawerEmpresa(null)} />
      <TableActionMenu
        isOpen={Boolean(menuAnchor)}
        anchorEl={menuAnchor}
        onClose={handleCloseMenu}
        className="w-56"
      >
        {selectedMenuRow && (
          <>
            <button type="button" onClick={() => runMenuAction(vm.handleViewDetails)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Icon icon="solar:eye-bold-duotone" width={16} height={16} />
              <span>Ver detalles</span>
            </button>
            <button type="button" onClick={() => runMenuAction(vm.handleEdit)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-700">
              <Icon icon="material-symbols:edit" width={16} height={16} />
              <span>Editar</span>
            </button>
            {selectedMenuRow.estado === 'ACTIVO' && (
              <>
                <div className="border-t border-slate-100 my-1" />
                <button type="button" onClick={() => runMenuAction(vm.handleEnviarRecordatorioEmail)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-blue-700 hover:bg-blue-50">
                  <Icon icon="solar:letter-bold-duotone" width={16} height={16} />
                  <span>Recordar por correo</span>
                </button>
                <button type="button" onClick={() => runMenuAction(vm.handleEnviarRecordatorioWhatsapp)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-green-700 hover:bg-green-50">
                  <Icon icon="ic:baseline-whatsapp" width={16} height={16} />
                  <span>Recordar por WhatsApp</span>
                </button>
              </>
            )}
            <div className="border-t border-slate-100 my-1" />
            <button type="button" onClick={() => runMenuAction(vm.handleToggleState)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-700 hover:bg-amber-50">
              <Icon icon="mdi:power" width={16} height={16} />
              <span>{selectedMenuRow.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}</span>
            </button>
            <button type="button" onClick={() => runMenuAction(vm.handleDelete)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50">
              <Icon icon="mdi:trash-can" width={16} height={16} />
              <span>Eliminar</span>
            </button>
          </>
        )}
      </TableActionMenu>
    </div>
  );
};

export default EmpresasIndex;
