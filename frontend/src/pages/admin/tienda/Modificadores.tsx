import { useModificadoresViewModel } from '@/features/admin/tienda/useModificadoresViewModel';
import { Icon } from '@iconify/react';

export default function Modificadores() {
  const vm = useModificadoresViewModel();

  if (vm.loading) return <div className="flex items-center justify-center h-64"><Icon icon="eos-icons:loading" className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="min-h-screen px-2 pb-4 bg-gray-50 dark:bg-[#0A0D14]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Modificadores de Productos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configura cremas, acompañamientos, extras y más para tus productos</p>
        </div>
        <button onClick={() => vm.abrirModalGrupo()} className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/20 font-bold text-sm">
          <Icon icon="solar:add-circle-bold" className="w-5 h-5" />Nuevo Grupo
        </button>
      </div>

      {vm.grupos.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent p-12 text-center">
          <Icon icon="solar:dishes-linear" className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No hay grupos de modificadores</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Crea grupos como "Cremas", "Acompañamientos" o "Extras"</p>
          <button onClick={() => vm.abrirModalGrupo()} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 shadow-sm hover:shadow-md font-medium transition-all">Crear primer grupo</button>
        </div>
      ) : (
        <div className="space-y-4">
          {vm.grupos?.map((grupo: any) => (
            <div key={grupo.id} className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${grupo.activo ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">{grupo.nombre}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      {grupo.esObligatorio && <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs">Obligatorio</span>}
                      <span>Selección: {grupo.seleccionMin === 0 ? 'opcional' : `mín ${grupo.seleccionMin}`}{grupo.seleccionMax > 1 && ` - máx ${grupo.seleccionMax}`}</span>
                      {grupo._count && <span className="text-gray-400 dark:text-gray-500">• {grupo._count.productos} producto(s)</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => vm.abrirModalOpcion(grupo.id)} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Agregar opción"><Icon icon="mdi:plus-circle" className="w-5 h-5" /></button>
                  <button onClick={() => vm.abrirModalGrupo(grupo)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Editar grupo"><Icon icon="mdi:pencil" className="w-5 h-5" /></button>
                  <button onClick={() => vm.handleEliminarGrupo(grupo.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Eliminar grupo"><Icon icon="mdi:delete" className="w-5 h-5" /></button>
                </div>
              </div>
              {grupo.opciones.length > 0 ? (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {grupo.opciones.map((opcion: any) => (
                      <div key={opcion.id} className={`flex items-center justify-between p-3 rounded-lg border ${opcion.activo ? 'bg-gray-50 dark:bg-slate-900/30 border-gray-300 dark:border-slate-700' : 'bg-gray-100 dark:bg-slate-800/50 border-gray-200 dark:border-slate-800 opacity-60'}`}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => vm.handleToggleOpcionActivo(opcion)} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${opcion.activo ? 'bg-primary border-[#6B6CFF] text-white' : 'border-gray-300 dark:border-slate-600'}`}>
                            {opcion.activo && <Icon color='#6B6CFF' icon="mdi:check" className="w-4 h-4" />}
                          </button>
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-200">{opcion.nombre}</span>
                            {opcion.esDefault && <span className="ml-2 text-xs text-primary dark:text-blue-400">(default)</span>}
                            {Number(opcion.precioExtra) > 0 && <span className="ml-2 text-sm text-green-600 dark:text-green-400">+S/{Number(opcion.precioExtra).toFixed(2)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => vm.abrirModalOpcion(grupo.id, opcion)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><Icon icon="mdi:pencil" className="w-4 h-4" /></button>
                          <button onClick={() => vm.handleEliminarOpcion(opcion.id)} className="p-1 text-gray-400 hover:text-red-500"><Icon icon="mdi:close" className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div className="p-4 text-center text-gray-400 dark:text-gray-500"><p>Sin opciones. Haz clic en + para agregar.</p></div>}
            </div>
          ))}
        </div>
      )}

      {/* Modal Grupo */}
      {vm.showModal && (
        <div className="fixed inset-0 bg-black/60   flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border dark:border-transparent">
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold dark:text-white">{vm.editingGrupo ? 'Editar Grupo' : 'Nuevo Grupo de Modificadores'}</h2>
              <button onClick={() => vm.setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><Icon icon="mdi:close" className="w-6 h-6" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre del grupo *</label>
                <input type="text" value={vm.grupoForm.nombre} onChange={(e) => vm.setGrupoForm({ ...vm.grupoForm, nombre: e.target.value })} placeholder="Ej: Elige tus cremas" className="w-full px-3 py-2 bg-white dark:bg-[#0A0D14] border border-gray-300 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descripción (opcional)</label>
                <input type="text" value={vm.grupoForm.descripcion} onChange={(e) => vm.setGrupoForm({ ...vm.grupoForm, descripcion: e.target.value })} placeholder="Ej: Selecciona hasta 3 cremas gratis" className="w-full px-3 py-2 bg-white dark:bg-[#0A0D14] border border-gray-300 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="esObligatorio" checked={vm.grupoForm.esObligatorio} onChange={(e) => vm.setGrupoForm({ ...vm.grupoForm, esObligatorio: e.target.checked })} className="w-4 h-4 text-primary rounded border-gray-300 dark:border-slate-700 dark:bg-slate-800" />
                <label htmlFor="esObligatorio" className="text-sm text-gray-700 dark:text-gray-300">Es obligatorio elegir al menos una opción</label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Selección mínima</label>
                  <input type="number" min="0" value={vm.grupoForm.seleccionMin} onChange={(e) => vm.setGrupoForm({ ...vm.grupoForm, seleccionMin: Number(e.target.value) })} className="w-full px-3 py-2 bg-white dark:bg-[#0A0D14] border border-gray-300 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Selección máxima</label>
                  <input type="number" min="1" value={vm.grupoForm.seleccionMax} onChange={(e) => vm.setGrupoForm({ ...vm.grupoForm, seleccionMax: Number(e.target.value) })} className="w-full px-3 py-2 bg-white dark:bg-[#0A0D14] border border-gray-300 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white" />
                </div>
              </div>
            </div>
            <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-2 bg-gray-50 dark:bg-slate-900/50">
              <button onClick={() => vm.setShowModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">Cancelar</button>
              <button onClick={vm.guardarGrupo} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium">{vm.editingGrupo ? 'Guardar cambios' : 'Crear grupo'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Opción */}
      {vm.showOpcionModal && (
        <div className="fixed inset-0 bg-black/60   flex items-center justify-center z-50">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border dark:border-transparent">
            <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold dark:text-white">{vm.editingOpcion ? 'Editar Opción' : 'Nueva Opción'}</h2>
              <button onClick={() => vm.setShowOpcionModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><Icon icon="mdi:close" className="w-6 h-6" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre *</label>
                <input type="text" value={vm.opcionForm.nombre} onChange={(e) => vm.setOpcionForm({ ...vm.opcionForm, nombre: e.target.value })} placeholder="Ej: Mayonesa, Con papas fritas" className="w-full px-3 py-2 bg-white dark:bg-[#0A0D14] border border-gray-300 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Precio extra (S/)</label>
                <input type="number" min="0" step="0.5" value={vm.opcionForm.precioExtra} onChange={(e) => vm.setOpcionForm({ ...vm.opcionForm, precioExtra: Number(e.target.value) })} placeholder="0 = gratis" className="w-full px-3 py-2 bg-white dark:bg-[#0A0D14] border border-gray-300 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary dark:text-white" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Deja en 0 si es gratis</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="esDefault" checked={vm.opcionForm.esDefault} onChange={(e) => vm.setOpcionForm({ ...vm.opcionForm, esDefault: e.target.checked })} className="w-4 h-4 text-primary rounded border-gray-300 dark:border-slate-700 dark:bg-slate-800" />
                <label htmlFor="esDefault" className="text-sm text-gray-700 dark:text-gray-300">Seleccionado por defecto</label>
              </div>
            </div>
            <div className="p-4 border-t dark:border-slate-800 flex justify-end gap-2 bg-gray-50 dark:bg-slate-900/50">
              <button onClick={() => vm.setShowOpcionModal(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">Cancelar</button>
              <button onClick={vm.guardarOpcion} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium">{vm.editingOpcion ? 'Guardar cambios' : 'Agregar opción'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
