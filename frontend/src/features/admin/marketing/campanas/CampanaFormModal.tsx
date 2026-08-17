import { Icon } from '@iconify/react';
import { useCampanasViewModel } from './useCampanasViewModel';
import { PlataformaAds, MESES } from './CampanasModel';

type VM = ReturnType<typeof useCampanasViewModel>;

const PLATAFORMAS: { key: PlataformaAds; label: string; color: string }[] = [
  { key: 'META', label: 'META', color: '#1877f2' },
  { key: 'TIKTOK', label: 'TIKTOK', color: '#ff0050' },
];

export default function CampanaFormModal({ vm }: { vm: VM }) {
  const { isModalOpen, setIsModalOpen, editando, form, setForm, isSaving, guardar, products, diasEstimadosMes } = vm;
  if (!isModalOpen) return null;

  const dias = diasEstimadosMes();
  const gastoEstimado = Number(form.presupuestoDiario || 0) * dias;
  const sym = form.moneda === 'USD' ? '$' : 'S/';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" onClick={() => setIsModalOpen(false)}>
      <div className="bg-white dark:bg-[#111827] rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100/50 dark:border-transparent" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
              <Icon icon="solar:target-bold-duotone" className="text-indigo-600 dark:text-indigo-400 text-lg" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-base">
              {editando ? 'Editar Campaña' : 'Nueva Campaña'}
            </h3>
          </div>
          <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <Icon icon="solar:close-circle-bold-duotone" className="text-gray-400 text-xl" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Nombre de la campaña</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Blusa Negra — Invierno 2026"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Plataforma */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Plataforma</label>
            <div className="flex gap-3">
              {PLATAFORMAS.map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setForm({ ...form, plataforma: p.key })}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${form.plataforma === p.key ? 'text-white shadow-md' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'}`}
                  style={form.plataforma === p.key ? { backgroundColor: p.color } : {}}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Producto */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Producto estrella <span className="text-gray-400 font-normal normal-case">(opcional)</span></label>
            <select
              value={form.productoId ?? ''}
              onChange={e => setForm({ ...form, productoId: e.target.value ? Number(e.target.value) : null })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sin producto vinculado</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.descripcion}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Las ventas de este producto definen el CPA automáticamente</p>
          </div>

          {/* Presupuesto + Moneda + Frecuencia */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Presupuesto</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.presupuestoOriginal || ''}
                onChange={e => setForm({ ...form, presupuestoOriginal: Number(e.target.value) })}
                placeholder="Ej. 120"
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <select
                value={form.tipoPresupuesto}
                onChange={e => setForm({ ...form, tipoPresupuesto: e.target.value as any })}
                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="DIARIO">Diario</option>
                <option value="SEMANAL">Semanal</option>
                <option value="MENSUAL">Mensual</option>
                <option value="TOTAL">Campaña Total</option>
              </select>
              <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 text-sm font-bold">
                {(['PEN', 'USD'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, moneda: m })}
                    className={`px-4 py-2.5 transition-colors ${form.moneda === m ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                  >
                    {m === 'PEN' ? 'S/' : '$'}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">El gasto real puede variar ±20% según la plataforma</p>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Fecha de inicio</label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Fecha de fin <span className="text-gray-400 font-normal normal-case">(opc)</span></label>
              <input
                type="date"
                value={form.fechaFin || ''}
                onChange={e => setForm({ ...form, fechaFin: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Bucle recurrente */}
          {form.fechaFin && (
            <div className="flex items-center justify-between p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Icon icon="solar:refresh-circle-bold-duotone" className="text-indigo-500 text-lg" />
                  Bucle (Recurrente)
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Reiniciar gasto al llegar a la fecha fin
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={form.esRecurrente || false}
                  onChange={e => setForm({ ...form, esRecurrente: e.target.checked })}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          )}

          {/* Preview gasto estimado */}
          {gastoEstimado > 0 && (
            <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 px-4 py-3 flex items-center gap-2 text-sm">
              <Icon icon="solar:calculator-minimalistic-bold-duotone" className="text-indigo-500 text-lg flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-300">
                {sym} {form.presupuestoOriginal || 0}/{form.tipoPresupuesto === 'DIARIO' ? 'día' : form.tipoPresupuesto === 'SEMANAL' ? 'sem' : form.tipoPresupuesto === 'MENSUAL' ? 'mes' : 'tot'} × {dias} días =
                <strong className="text-indigo-600 dark:text-indigo-400 ml-1">{sym} {gastoEstimado.toFixed(2)} est. mensual</strong>
                <span className="text-gray-400 ml-1 text-xs">(±20%)</span>
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6 pt-2 gap-3">
          {editando && (
            <button
              onClick={() => { vm.eliminar(editando.id); setIsModalOpen(false); }}
              className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-500 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
            >
              Eliminar
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-sm font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl btn-accent text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <Icon icon="mdi:loading" className="animate-spin" />}
              {editando ? 'Guardar' : 'Crear Campaña'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
