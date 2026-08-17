import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import storeCatalogService, { StoreProduct, StoreProductPayload } from '@/services/storeCatalogService';
import useAlertStore from '@/zustand/alert';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import Select from '@/components/Select';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

const EMPTY_FORM: StoreProductPayload = {
  name: '',
  description: '',
  price: 0,
  oldPrice: undefined,
  imageUrl: '',
  badge: '',
  category: '',
  stock: null,
  isActive: true,
  order: 0,
};

export default function CatalogoWebPage() {
  const sidebarColor = useThemeStore((s) => s.sidebarColor);
  const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StoreProduct | null>(null);
  const [form, setForm] = useState<StoreProductPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      setProducts(await storeCatalogService.getAll());
    } catch {
      useAlertStore.getState().alert('Error al cargar el catálogo', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (modalOpen) setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [modalOpen]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p: StoreProduct) => {
    setEditTarget(p);
    setForm({
      name: p.name,
      description: p.description ?? '',
      price: p.price,
      oldPrice: p.oldPrice ?? undefined,
      imageUrl: p.imageUrl ?? '',
      badge: p.badge ?? '',
      category: p.category ?? '',
      stock: p.stock ?? null,
      isActive: p.isActive,
      order: p.order,
    });
    setModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked
        : (name === 'price' || name === 'oldPrice' || name === 'order' || name === 'stock') ? (value === '' ? undefined : Number(value))
        : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { useAlertStore.getState().alert('El nombre es obligatorio', 'warning'); return; }
    setSaving(true);
    try {
      const payload: StoreProductPayload = {
        ...form,
        oldPrice: form.oldPrice && Number(form.oldPrice) > 0 ? Number(form.oldPrice) : null,
        stock: form.stock !== undefined && form.stock !== null ? Number(form.stock) : null,
        category: form.category || undefined,
      };
      if (editTarget) {
        await storeCatalogService.update(editTarget.id, payload);
        useAlertStore.getState().alert('Producto actualizado', 'success');
      } else {
        await storeCatalogService.create(payload);
        useAlertStore.getState().alert('Producto creado', 'success');
      }
      setModalOpen(false);
      await load();
    } catch {
      useAlertStore.getState().alert('Error al guardar el producto', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await storeCatalogService.remove(id);
      useAlertStore.getState().alert('Producto eliminado', 'success');
      setDeleteId(null);
      await load();
    } catch {
      useAlertStore.getState().alert('Error al eliminar el producto', 'error');
    }
  };

  const handleToggleActive = async (p: StoreProduct) => {
    try {
      await storeCatalogService.update(p.id, { isActive: !p.isActive });
      await load();
    } catch {
      useAlertStore.getState().alert('Error al actualizar el estado', 'error');
    }
  };

  const activos = products.filter(p => p.isActive).length;

  return (
    <>
      <style>{`
        .quill-container .ql-toolbar {
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
          border-color: #f3f4f6;
        }
        .quill-container .ql-container {
          border-bottom-left-radius: 0.75rem;
          border-bottom-right-radius: 0.75rem;
          border-color: #f3f4f6;
          min-height: 120px;
          font-family: inherit;
        }
      `}</style>
      <div className="-m-5 p-5 bg-[#F7F8FB] font-jakarta min-h-screen">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Sistema</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Tienda</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Catálogo Web</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 text-violet-600 shrink-0">
            <Icon icon="solar:shop-2-bold-duotone" className="text-2xl" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight truncate">Catálogo Web</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Productos visibles en <span className="font-semibold" style={{ color: ACCENT }}>/tienda</span> de tu negocio
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0 self-start"
          style={{ background: ACCENT }}
        >
          <Icon icon="solar:add-circle-bold" className="text-lg" /> Nuevo producto
        </button>
      </div>

      {/* Card contenedora */}
      <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100">
          <button
            onClick={load}
            className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
            style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
          >
            <Icon icon="solar:refresh-linear" className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          <span className="text-sm text-slate-400 font-medium px-1">{products.length.toLocaleString('es-PE')} productos</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {activos} activos
          </span>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="py-3 pl-5 pr-3">Orden</th>
                <th className="py-3 px-3">Imagen</th>
                <th className="py-3 px-3">Producto</th>
                <th className="py-3 px-3">Badge</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3 text-right">Precio</th>
                <th className="py-3 px-3 text-right">Stock</th>
                <th className="py-3 px-3 text-right">Antes</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 pr-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td colSpan={10} className="py-3.5 px-5">
                      <div className="h-6 rounded-lg bg-slate-100 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <Icon icon="solar:shop-2-linear" className="text-5xl text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Sin productos. Haz clic en "Nuevo producto" para empezar.</p>
                  </td>
                </tr>
              ) : (
                products.map(p => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 pl-5 pr-3 text-slate-400 font-mono text-xs">{p.order}</td>
                    <td className="py-3 px-3">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-slate-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                          <Icon icon="solar:image-linear" className="text-slate-300" width="18" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-700 text-sm">{p.name}</p>
                      {p.description && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">
                          {p.description.replace(/<[^>]*>?/gm, '')}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {p.badge ? (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600">
                          {p.badge}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-3">
                      {p.category ? (
                        <span className="text-sm text-slate-500 font-medium">{p.category}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800 text-sm">
                      S/ {Number(p.price).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-sm">
                      {p.stock !== null ? (
                        <span className={p.stock === 0 ? 'text-rose-500 font-semibold' : p.stock <= 5 ? 'text-amber-500 font-semibold' : 'text-slate-500'}>
                          {p.stock}
                        </span>
                      ) : (
                        <span className="text-emerald-500 text-xs">∞</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-sm text-slate-400">
                      {p.oldPrice ? <span className="line-through">S/ {Number(p.oldPrice).toFixed(2)}</span> : <span>—</span>}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                          p.isActive
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {p.isActive ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-3 px-3 pr-5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Icon icon="solar:pen-bold" width="17" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Icon icon="solar:trash-bin-trash-bold" width="17" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar */}
      <Modal
        isOpenModal={modalOpen}
        closeModal={() => setModalOpen(false)}
        title={editTarget ? 'Editar Producto' : 'Nuevo Producto'}
        icon="solar:shop-2-bold-duotone"
        iconClass="bg-violet-50 text-violet-600"
        width="560px"
        height="auto"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-3">
            <InputPro
              isLabel
              label="Nombre *"
              name="name"
              value={form.name}
              onChange={handleChange as any}
              placeholder="Ej. Sistema de Facturación Plan Pro"
              reference={firstInputRef as any}
            />

            <div className="quill-container">
              <label className="block text-sm font-[400] text-gray-900 dark:!text-gray-300 mb-2">Descripción</label>
              <ReactQuill
                theme="snow"
                value={form.description || ''}
                onChange={(value) => setForm(prev => ({ ...prev, description: value }))}
                placeholder="Escribe la descripción del producto..."
                className="bg-white dark:bg-slate-800 rounded-xl"
                modules={{ toolbar: [[{ header: [1, 2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['link'], ['clean']] }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputPro isLabel label="Precio (S/) *" name="price" type="number" step="0.01" value={String(form.price)} onChange={handleChange as any} />
              <InputPro isLabel label="Precio anterior (S/)" name="oldPrice" type="number" step="0.01" value={String(form.oldPrice ?? '')} onChange={handleChange as any} placeholder="0.00" />
            </div>

            <InputPro isLabel label="URL de Imagen" name="imageUrl" value={form.imageUrl ?? ''} onChange={handleChange as any} placeholder="https://..." />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Categoría *"
                name="category"
                value={form.category ?? ''}
                options={[
                  { id: 'Accesorios', value: 'Accesorios' },
                  { id: 'Combo', value: 'Combo' },
                  { id: 'Equipos', value: 'Equipos' },
                  { id: 'Sistema', value: 'Sistema' },
                ]}
                onChange={(id: any) => setForm(prev => ({ ...prev, category: id }))}
                error={null}
                readOnly={true}
              />
              <InputPro isLabel label="Stock (vacío = ∞)" name="stock" type="number" value={String(form.stock ?? '')} onChange={handleChange as any} placeholder="∞" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputPro isLabel label="Badge" name="badge" value={form.badge ?? ''} onChange={handleChange as any} placeholder="Nuevo, Popular..." />
              <InputPro isLabel label="Orden" name="order" type="number" value={String(form.order ?? 0)} onChange={handleChange as any} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border border-gray-100 dark:border-slate-700">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive ?? true}
                onChange={handleChange}
                className="w-4 h-4 rounded accent-violet-600"
              />
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Producto activo</p>
                <p className="text-xs text-gray-400">Solo los productos activos aparecen en la web pública</p>
              </div>
            </label>
          </div>

          <div className="flex gap-3 px-5 pb-5">
            <Button type="button" onClick={() => setModalOpen(false)} color="default" className="flex-1">Cancelar</Button>
            <Button type="submit" color="primary" disabled={saving} className="flex-1">
              {saving && <Icon icon="svg-spinners:ring-resize" width="15" className="mr-1.5" />}
              {editTarget ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal
        isOpenModal={deleteId !== null}
        closeModal={() => setDeleteId(null)}
        title="Eliminar producto"
        icon="solar:trash-bin-trash-bold-duotone"
        iconClass="bg-red-50 text-red-500"
        width="360px"
        height="auto"
      >
        <div className="px-5 py-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Esta acción no se puede deshacer.</p>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <Button type="button" onClick={() => setDeleteId(null)} color="default" className="flex-1">Cancelar</Button>
          <Button type="button" onClick={() => deleteId !== null && handleDelete(deleteId)} color="danger" className="flex-1">Eliminar</Button>
        </div>
      </Modal>
    </div>
    </>
  );
}
