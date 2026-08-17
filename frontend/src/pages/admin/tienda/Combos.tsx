import { useState } from 'react';
import { useCombosViewModel } from '@/features/admin/tienda/useCombosViewModel';
import { Icon } from '@iconify/react';
import InputPro from '@/components/InputPro';
import { Calendar } from '@/components/Date';
import Select from '@/components/Select';
import Button from '@/components/Button';
import {
  InventoryCard,
  InventoryEmptyState,
  InventoryHero,
  InventoryInfoPill,
  InventoryPage,
  InventorySearchBox,
  InventoryToolbar,
  InventoryToolbarButton,
} from '@/features/admin/kardex/shared/InventoryChrome';

const ACCENT = 'var(--accent, #7551FF)';

export default function CombosAdmin() {
  const vm = useCombosViewModel();
  const { t } = vm;
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');

  const filteredCombos = vm.combos.filter((combo) => {
    const matchesSearch = !search.trim()
      || combo.nombre.toLowerCase().includes(search.toLowerCase())
      || String(combo.descripcion || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === 'TODOS'
      || (status === 'ACTIVOS' ? combo.activo : !combo.activo);
    return matchesSearch && matchesStatus;
  });

  if (vm.loading) return <div className="flex items-center justify-center h-64"><Icon icon="eos-icons:loading" className="w-12 h-12 text-gray-400" /></div>;

  return (
    <InventoryPage>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Tienda</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Kits y Packs</span>
      </div>

      <InventoryHero
        icon="solar:bag-smile-bold-duotone"
        title="Kits y packs"
        subtitle="Gestiona tus kits y ofertas especiales desde un panel más limpio y ordenado."
        badge="Promos"
        actions={
          <>
            <InventoryToolbarButton
              icon="solar:refresh-linear"
              label="Actualizar"
              onClick={() => vm.refreshCombos()}
            />
            <InventoryToolbarButton
              icon="solar:add-circle-bold"
              label="Nuevo kit"
              onClick={() => vm.abrirModal()}
              tone="primary"
            />
          </>
        }
      />

      <InventoryCard>
        <InventoryToolbar>
          <div className="flex flex-wrap items-center gap-3">
            <InventoryInfoPill
              icon="solar:box-linear"
              label={`${filteredCombos.length} kits`}
            />
            <div className="flex flex-wrap gap-2">
              {(['TODOS', 'ACTIVOS', 'INACTIVOS'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  className={`inline-flex h-11 items-center rounded-2xl border px-4 text-sm font-semibold transition-all ${
                    status === option
                      ? 'border-violet-200 bg-violet-50 text-violet-600 dark:border-indigo-800/60 dark:bg-indigo-950/50 dark:text-indigo-300'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300'
                  }`}
                >
                  {option === 'TODOS' ? 'Todos' : option === 'ACTIVOS' ? 'Activos' : 'Inactivos'}
                </button>
              ))}
            </div>
          </div>
          <InventorySearchBox
            value={search}
            onChange={setSearch}
            placeholder="Buscar kit, promo o descripción..."
            className="w-full sm:max-w-md"
          />
        </InventoryToolbar>

        <div className="p-5">
      {filteredCombos.length === 0 ? (
        <InventoryEmptyState
          icon="solar:bag-smile-bold-duotone"
          title={vm.combos.length === 0 ? 'No hay kits creados' : 'No hay resultados para esos filtros'}
          subtitle={vm.combos.length === 0 ? 'Crea tu primer kit para empezar a ofrecer promociones y packs.' : 'Prueba con otro término de búsqueda o cambia el estado seleccionado.'}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredCombos.map((combo) => (
            <div key={combo.id} className={`overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_2px_20px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(117,81,255,0.15)] dark:border-slate-800 dark:bg-[#111827] ${!combo.activo ? 'opacity-65' : ''}`}>
              <div className="relative h-44 bg-gray-900 overflow-hidden">
                {combo.imagenUrl ? <img src={combo.imagenUrl} alt={combo.nombre} className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900"><Icon icon="solar:bag-smile-bold-duotone" className="w-20 h-20 text-white/30" /></div>}
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-lg ${combo.activo ? 'bg-green-500/80 text-white' : 'bg-gray-500/80 text-white'}`}>{combo.activo ? 'Activo' : 'Inactivo'}</span>
                  <span className="bg-red-500/80 text-white px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md shadow-lg">-{Math.round(Number(combo.descuentoPorcentaje))}%</span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white">{combo.nombre}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{combo.descripcion || 'Sin descripción'}</p>
                <div className="flex items-center justify-between mb-4 bg-gray-50 dark:bg-slate-800 rounded-xl p-3">
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 line-through">S/ {Number(combo.precioRegular).toFixed(2)}</p>
                    <p className={`text-xl font-bold ${t.text}`}>S/ {Number(combo.precioCombo).toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ahorra</p>
                    <p className="text-sm text-green-600 font-bold">S/ {(Number(combo.precioRegular) - Number(combo.precioCombo)).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => vm.toggleComboActivo(combo)} className={`flex-1 py-2.5 rounded-2xl text-sm font-semibold transition-all ${combo.activo ? 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 border border-transparent dark:border-slate-700' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 border border-green-200 dark:border-green-800/50'}`}>{combo.activo ? 'Desactivar' : 'Activar'}</button>
                  <button onClick={() => vm.abrirModal(combo)} className={`p-2.5 ${t.soft} dark:bg-indigo-900/30 dark:text-indigo-400 rounded-2xl hover:opacity-80 transition-colors border dark:border-indigo-800/50`}><Icon icon="solar:pen-bold" width={18} /></button>
                  <button onClick={() => vm.handleEliminarCombo(combo.id)} className="p-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors border dark:border-red-800/50"><Icon icon="solar:trash-bin-trash-bold" width={18} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </InventoryCard>

      {vm.showModal && (
        <div className="fixed inset-0 bg-black/60   z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border dark:border-transparent">
            <div className="sticky top-0 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-md border-b dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold dark:text-white">{vm.editingCombo ? 'Editar Kit' : 'Nuevo Kit'}</h2>
              <button onClick={vm.cerrarModal} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-white"><Icon icon="mdi:close" width={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              <InputPro name="nombre" isLabel label="Nombre del Kit *" value={vm.form.nombre} onChange={(e) => vm.setForm(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Ej: Kit de Baño Completo" />
              <InputPro isLabel name="descripcion" label="Descripción" value={vm.form.descripcion} onChange={(e) => vm.setForm(prev => ({ ...prev, descripcion: e.target.value }))} placeholder="Descripción del kit..." />
              <div className="border border-gray-200 dark:border-transparent rounded-xl p-4 bg-gray-50/50 dark:bg-slate-800/50">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Imagen del Kit</label>
                <div className="space-y-3">
                  <div className="relative w-full h-52 rounded-xl overflow-hidden border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 group shadow-sm">
                    {vm.form.imagenUrl ? (
                      <>
                        <img src={vm.form.imagenUrl} alt="Imagen del kit" className="w-full h-full object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                          <p className="text-xs font-medium text-white/90">Vista previa del kit</p>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                        <Icon icon="solar:camera-bold" width={30} />
                        <p className="text-sm font-medium">Sin imagen</p>
                        <p className="text-xs text-gray-400">Sube una imagen para destacar el kit</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {vm.editingCombo ? (
                      <>
                        <input type="file" ref={vm.fileInputRef} className="hidden" accept="image/*" onChange={vm.onFileSelect} />
                        <Button color="primary" size="sm" disabled={vm.uploading} onClick={() => vm.fileInputRef.current?.click()}>
                          <Icon icon="solar:upload-minimalistic-bold" className="mr-2" />{vm.uploading ? 'Subiendo...' : 'Seleccionar Imagen'}
                        </Button>
                        {vm.form.imagenUrl && (
                          <button
                            type="button"
                            onClick={() => vm.setForm(p => ({ ...p, imagenUrl: '' }))}
                            className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                          >
                            Quitar imagen
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                        Primero crea el kit. Luego podrás subir la imagen en modo edición.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Productos del Kit *</label>
                  <button type="button" onClick={vm.agregarProducto} className={`text-sm ${t.text} dark:text-indigo-400 hover:opacity-80 flex items-center gap-1 font-semibold`}><Icon icon="mdi:plus" /> Agregar producto</button>
                </div>
                <div className="space-y-3">
                    {vm.form.items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-end bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-transparent">
                      <div className="flex-1">
                        <Select
                          label={index === 0 ? "Producto" : "Producto"}
                          name={`producto-${index}`}
                          value={vm.getProductOptionLabel(item.productoId)}
                          options={vm.products.map(p => ({ id: String(p.id), value: `${String(p.descripcion || '').toUpperCase()} - S/ ${Number(p.precioUnitario).toFixed(2)}` }))}
                          onChange={(id: string) => vm.actualizarItem(index, 'productoId', Number(id))}
                          placeholder="Seleccionar producto..."
                          error={undefined}
                          withLabel={true}
                        />
                      </div>
                      <div className="w-24"><InputPro name={`cantidad-${index}`} label={index === 0 ? "Cant." : "Cant."} type="number" value={item.cantidad} onChange={(e) => vm.actualizarItem(index, 'cantidad', Number(e.target.value))} isLabel={true} /></div>
                      <button type="button" onClick={() => vm.eliminarItem(index)} className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors mb-[2px]"><Icon icon="solar:trash-bin-trash-bold" width={20} /></button>
                    </div>
                  ))}
                  {vm.form.items.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl">Agrega al menos 2 productos al kit</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Regular</label>
                  <div className={`w-full border rounded-lg px-4 py-2 focus:ring-2 ${t.ring} ${t.border} dark:bg-slate-800 dark:text-white dark:border-slate-700`}>S/ {vm.calcularPrecioRegular().toFixed(2)}</div>
                </div>
                <InputPro name="precioCombo" label="Precio Kit / Pack *" type="number" isLabel value={vm.form.precioCombo} onChange={(e) => vm.setForm(prev => ({ ...prev, precioCombo: Number(e.target.value) }))} />
              </div>
              {vm.form.precioCombo > 0 && vm.calcularPrecioRegular() > 0 && (
                <div className={`p-3 rounded-lg ${vm.calcularDescuento() > 0 ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                  <p className="text-sm font-medium">{vm.calcularDescuento() > 0 ? `✓ Descuento: ${vm.calcularDescuento().toFixed(1)}% (Ahorro: S/ ${(vm.calcularPrecioRegular() - vm.form.precioCombo).toFixed(2)})` : '✗ El precio del kit debe ser menor al precio regular'}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="relative z-20">
                  <Calendar text="Fecha Inicio (opcional)" value={vm.form.fechaInicio ? vm.form.fechaInicio.split('T')[0].split('-').reverse().join('/') : ''} onChange={(date: string) => { const [d, m, y] = date.split('/'); vm.setForm(prev => ({ ...prev, fechaInicio: `${y}-${m}-${d}` })); }} />
                </div>
                <div className="relative z-20">
                  <Calendar text="Fecha Fin (opcional)" value={vm.form.fechaFin ? vm.form.fechaFin.split('T')[0].split('-').reverse().join('/') : ''} onChange={(date: string) => { const [d, m, y] = date.split('/'); vm.setForm(prev => ({ ...prev, fechaFin: `${y}-${m}-${d}` })); }} right />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="activo" checked={vm.form.activo} onChange={(e) => vm.setForm(prev => ({ ...prev, activo: e.target.checked }))} className={`w-5 h-5 ${t.text} rounded ${t.ring} dark:bg-slate-800 dark:border-slate-600`} />
                <label htmlFor="activo" className="text-sm font-medium text-gray-700 dark:text-gray-300">Kit activo (visible en la tienda)</label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-gray-50 dark:bg-slate-900 border-t dark:border-slate-800 px-6 py-4 flex justify-end gap-3 z-10">
              <button onClick={vm.cerrarModal} className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium">Cancelar</button>
              <button onClick={vm.guardarCombo} className={`px-6 py-2.5 ${t.bg} text-white rounded-xl ${t.hover} flex items-center gap-2 font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95`}><Icon icon="mdi:content-save" />{vm.editingCombo ? 'Guardar Cambios' : 'Crear Kit'}</button>
            </div>
          </div>
        </div>
      )}
    </InventoryPage>
  );
}
