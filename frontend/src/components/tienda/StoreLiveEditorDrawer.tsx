import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { resolveTemplate } from '@/components/tienda/resolveTemplate';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import {
  getLiveEditorConfig,
  COLOR_FIELDS,
  type ImageFieldDef,
  type TextFieldDef,
  type ProductFieldDef,
  type LinkFieldDef,
  type LinkFieldTarget,
} from '@/components/tienda/liveEditorFields';

interface Props {
  slug: string;
  /** Diseño live actual (el mismo objeto que pinta la tienda de fondo) */
  diseno: any;
  /** Mezcla campos en el diseño live del padre → actualización instantánea */
  onChange: (campos: Record<string, any>) => void;
  defaultOpen?: boolean;
}

type SectionKey = 'colores' | 'textos' | 'imagenes' | 'productos' | 'enlaces';

export default function StoreLiveEditorDrawer({ slug, diseno, onChange, defaultOpen }: Props) {
  const { alert } = useAlertStore();
  const [open, setOpen] = useState(!!defaultOpen);
  const [section, setSection] = useState<SectionKey>('colores');
  const [uploadingKey, setUploadingKey] = useState<string>('');
  const timers = useRef<Record<string, any>>({});

  const plantillaId: string = diseno?.plantillaId || 'moderna';
  const template = resolveTemplate(plantillaId);
  const { textFields, imageFields, productFields, linkFields } = getLiveEditorConfig(plantillaId);

  // Categorías reales de la tienda (para los campos tipo "categorySelect")
  const [storeCategories, setStoreCategories] = useState<string[]>([]);
  const needsCategories = textFields.some(f => f.type === 'categorySelect') || linkFields.length > 0;
  useEffect(() => {
    if (!needsCategories) return;
    let mounted = true;
    // Todas las categorías de la empresa (incluye las que aún no tienen productos),
    // a diferencia del endpoint público que solo devuelve categorías con stock.
    apiClient.get('/categoria/listar')
      .then(({ data }) => {
        if (!mounted) return;
        const cats = (data?.data || data || []) as any[];
        const names = cats
          .map(c => (typeof c === 'string' ? c : c?.nombre || c?.name || c?.descripcion))
          .filter(Boolean)
          .map(String)
          .filter(n => n.toLowerCase() !== 'todos');
        setStoreCategories(Array.from(new Set(names)));
      })
      .catch(() => { if (mounted) setStoreCategories([]); });
    return () => { mounted = false; };
  }, [needsCategories]);

  // Persistencia con debounce para inputs de texto/color
  const persistDebounced = (campos: Record<string, any>) => {
    const key = Object.keys(campos).join('|');
    if (timers.current[key]) clearTimeout(timers.current[key]);
    timers.current[key] = setTimeout(() => {
      apiClient.patch('/tienda/diseno', campos).catch((e: any) => {
        alert(e?.response?.data?.message || 'Error al guardar cambios', 'error');
      });
    }, 600);
  };

  // Texto/color: refleja al instante en la tienda + guarda con debounce
  const setCampoTexto = (campos: Record<string, any>) => {
    onChange(campos);
    persistDebounced(campos);
  };

  // Imagen: sube al backend y refleja la URL devuelta al instante
  const subirImagen = async (campo: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) { alert('Máximo 5MB por imagen', 'error'); return; }
    if (!file.type.startsWith('image/')) { alert('El archivo debe ser una imagen', 'error'); return; }
    setUploadingKey(campo);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post(`/tienda/template/imagen/${campo}`, fd);
      const url = data?.data?.url || data?.url;
      if (url) onChange({ [campo]: url });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Error al subir imagen', 'error');
    } finally {
      setUploadingKey('');
    }
  };

  const sections: { key: SectionKey; label: string; icon: string; hidden?: boolean }[] = [
    { key: 'colores', label: 'Colores', icon: 'solar:palette-bold' },
    { key: 'textos', label: 'Textos', icon: 'solar:text-field-bold', hidden: textFields.length === 0 },
    { key: 'imagenes', label: 'Imágenes', icon: 'solar:gallery-bold', hidden: imageFields.length === 0 },
    { key: 'productos', label: 'Productos', icon: 'solar:bag-4-bold', hidden: productFields.length === 0 },
    { key: 'enlaces', label: 'Enlaces', icon: 'solar:link-bold', hidden: linkFields.length === 0 },
  ];
  const visibleSections = sections.filter(s => !s.hidden);

  // Si la sección activa quedó oculta al cambiar de plantilla, vuelve a "colores"
  useEffect(() => {
    if (!visibleSections.find(s => s.key === section)) setSection('colores');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantillaId]);

  return (
    <>
      {/* FAB flotante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <Icon icon="solar:magic-stick-3-bold" className="text-lg" />
          Personalizar
        </button>
      )}

      <AnimatePresence>
        {open && (
            <motion.div
              key="store-live-editor"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="fixed top-0 right-0 bottom-0 z-[9999] w-full max-w-[360px] bg-white dark:bg-[#0F1320] shadow-2xl flex flex-col border-l border-gray-100 dark:border-slate-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Icon icon="solar:magic-stick-3-bold" className="text-indigo-500" />
                    Personalizar tienda
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    Editando en vivo · plantilla <span className="font-semibold">{template.label}</span>
                  </p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">
                  <Icon icon="solar:close-circle-bold" className="text-xl" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-3 py-2 border-b border-gray-100 dark:border-slate-800 overflow-x-auto">
                {visibleSections.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setSection(s.key)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${section === s.key ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                  >
                    <Icon icon={s.icon} />
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {section === 'colores' && (
                  <ColoresSection diseno={diseno} onChange={setCampoTexto} />
                )}
                {section === 'textos' && (
                  <TextosSection fields={textFields} diseno={diseno} onChange={setCampoTexto} categories={storeCategories} />
                )}
                {section === 'imagenes' && (
                  <ImagenesSection fields={imageFields} diseno={diseno} uploadingKey={uploadingKey} onUpload={subirImagen} onUrl={setCampoTexto} />
                )}
                {section === 'productos' && (
                  <ProductosSection fields={productFields} diseno={diseno} slug={slug} onChange={setCampoTexto} />
                )}
                {section === 'enlaces' && (
                  <EnlacesSection fields={linkFields} diseno={diseno} categories={storeCategories} onChange={setCampoTexto} />
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-800">
                <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                  <Icon icon="solar:check-circle-bold" className="text-green-500" />
                  Los cambios se guardan automáticamente.
                </p>
              </div>
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ColoresSection({ diseno, onChange }: { diseno: any; onChange: (c: Record<string, any>) => void }) {
  return (
    <div className="space-y-3">
      {COLOR_FIELDS.map(f => {
        const value = diseno?.[f.key] || f.fallback;
        return (
          <div key={f.key} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
            <label className="relative cursor-pointer flex-shrink-0">
              <input type="color" value={value} onChange={e => onChange({ [f.key]: e.target.value })} className="sr-only" />
              <span className="block w-9 h-9 rounded-lg border-2 border-white ring-1 ring-gray-200 shadow-inner" style={{ background: value }} />
            </label>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{f.label}</p>
              <p className="text-[11px] font-mono text-gray-400">{value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function TextosSection({ fields, diseno, onChange, categories }: { fields: TextFieldDef[]; diseno: any; onChange: (c: Record<string, any>) => void; categories: string[] }) {
  const groups = fields.reduce<Record<string, TextFieldDef[]>>((acc, f) => {
    const g = f.group || 'General';
    (acc[g] ||= []).push(f);
    return acc;
  }, {});

  const AUTO_ID = '__auto__';

  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2">{group}</p>
          <div className="space-y-3">
            {items.map(f => {
              const current = String(diseno?.[f.key] ?? '');

              if (f.type === 'toggle') {
                const checked = Boolean(diseno?.[f.key]);
                return (
                  <div key={f.key} className="rounded-xl border border-gray-100 dark:border-slate-800 p-3">
                    <label className="flex items-start justify-between gap-3 cursor-pointer">
                      <span>
                        <span className="block text-sm font-bold text-gray-800 dark:text-slate-200">{f.label}</span>
                        {f.hint && <span className="mt-0.5 block text-[11px] font-semibold leading-4 text-gray-400">{f.hint}</span>}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={checked}
                        onClick={() => onChange({ [f.key]: !checked })}
                        className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </label>
                  </div>
                );
              }

              if (f.type === 'categorySelect') {
                const options = [
                  { id: AUTO_ID, value: 'Automática (categoría real)' },
                  ...categories.map(c => ({ id: c, value: c })),
                ];
                return (
                  <Select
                    key={f.key}
                    name={f.key}
                    label={f.label}
                    withLabel
                    isSearch
                    error={null}
                    value={current}
                    options={options}
                    onChange={(id: any, value: string) => {
                      // id === '' = el usuario está escribiendo para filtrar; aún no elige
                      if (id === '') return;
                      onChange({ [f.key]: id === AUTO_ID || !value ? null : value });
                    }}
                  />
                );
              }

              return (
                <InputPro
                  key={f.key}
                  name={f.key}
                  type={f.type === 'date' ? 'date' : 'text'}
                  label={f.label}
                  isLabel
                  placeholder={f.placeholder}
                  value={current}
                  onChange={e => onChange({ [f.key]: e.target.value })}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ImagenesSection({
  fields, diseno, uploadingKey, onUpload, onUrl,
}: {
  fields: ImageFieldDef[];
  diseno: any;
  uploadingKey: string;
  onUpload: (campo: string, file: File) => void;
  onUrl: (c: Record<string, any>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map(f => {
        const value = diseno?.[f.key] || '';
        const preview = value || f.fallback;
        return (
          <div key={f.key} className="rounded-xl border border-gray-100 dark:border-transparent overflow-hidden bg-gray-50 dark:bg-slate-900">
            <div className="relative aspect-video bg-slate-200 dark:bg-slate-800">
              {preview
                ? (
                  <img
                    src={preview}
                    alt={f.label}
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(event) => {
                      const img = event.currentTarget;
                      if (f.fallback && img.src !== new URL(f.fallback, window.location.origin).href) {
                        img.src = f.fallback;
                      } else {
                        img.style.display = 'none';
                      }
                    }}
                  />
                )
                : <div className="absolute inset-0 flex items-center justify-center text-gray-300"><Icon icon="solar:gallery-bold" className="text-2xl" /></div>}
              <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 opacity-0 hover:opacity-100 transition-all cursor-pointer">
                {uploadingKey === f.key
                  ? <Icon icon="svg-spinners:ring-resize" className="text-white text-xl" />
                  : <span className="text-white text-[11px] font-bold flex items-center gap-1"><Icon icon="solar:cloud-upload-bold" /> Subir</span>}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingKey === f.key}
                  onChange={e => { const file = e.currentTarget.files?.[0]; if (file) onUpload(f.key, file); e.currentTarget.value = ''; }}
                />
              </label>
            </div>
            <div className="px-2 py-1.5">
              <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 truncate">{f.label}</p>
              <p className="text-[10px] text-gray-400 truncate">{f.hint}</p>
              {value && (
                <button
                  onClick={() => onUrl({ [f.key]: null })}
                  className="mt-1 text-[10px] font-semibold text-red-500 hover:underline"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function EnlacesSection({
  fields, diseno, categories, onChange,
}: {
  fields: LinkFieldDef[];
  diseno: any;
  categories: string[];
  onChange: (c: Record<string, any>) => void;
}) {
  const groups = fields.reduce<Record<string, LinkFieldDef[]>>((acc, f) => {
    const g = f.group || 'General';
    (acc[g] ||= []).push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-indigo-50 dark:bg-indigo-950/20 px-3 py-2 text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-200">
        Define si cada banner o botón abre un producto, categoría, búsqueda, catálogo, URL externa o queda sin enlace.
      </div>
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2">{group}</p>
          <div className="space-y-3">
            {items.map(f => (
              <LinkActionPicker key={f.key} field={f} diseno={diseno} categories={categories} onChange={onChange} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const LINK_TARGET_OPTIONS: { id: LinkFieldTarget; label: string }[] = [
  { id: 'catalog', label: 'Catálogo' },
  { id: 'category', label: 'Categoría' },
  { id: 'product', label: 'Producto' },
  { id: 'search', label: 'Búsqueda' },
  { id: 'url', label: 'URL externa' },
  { id: 'none', label: 'Sin enlace' },
];

function LinkActionPicker({
  field, diseno, categories, onChange,
}: {
  field: LinkFieldDef;
  diseno: any;
  categories: string[];
  onChange: (c: Record<string, any>) => void;
}) {
  const typeKey = `${field.key}Type`;
  const valueKey = `${field.key}Value`;
  const productKey = `${field.key}ProductId`;
  const urlKey = `${field.key}Url`;
  const rawType = diseno?.[typeKey] || field.defaultType || 'catalog';
  const type = LINK_TARGET_OPTIONS.some(o => o.id === rawType) ? rawType as LinkFieldTarget : 'catalog';
  const value = String(diseno?.[valueKey] ?? '');
  const url = String(diseno?.[urlKey] ?? '');

  return (
    <div className="rounded-xl border border-gray-100 dark:border-slate-800 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{field.label}</p>
        <select
          value={type}
          onChange={e => onChange({ [typeKey]: e.target.value })}
          className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-[11px] font-bold text-gray-700 outline-none focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-200"
        >
          {LINK_TARGET_OPTIONS.map(option => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      </div>

      {type === 'category' && (
        <Select
          name={`${field.key}-category`}
          label="Categoría destino"
          withLabel
          isSearch
          error={null}
          value={value}
          options={[
            { id: '', value: 'Elegir categoría' },
            ...categories.map(c => ({ id: c, value: c })),
          ]}
          onChange={(id: any, selected: string) => {
            if (id === '') return;
            onChange({ [typeKey]: 'category', [valueKey]: selected || id });
          }}
        />
      )}

      {type === 'product' && (
        <ProductTargetPicker
          selectedId={diseno?.[productKey]}
          selectedName={value}
          onSelect={(product) => onChange({
            [typeKey]: 'product',
            [productKey]: product.id,
            [valueKey]: product.descripcion,
          })}
          onClear={() => onChange({ [productKey]: null, [valueKey]: null })}
        />
      )}

      {type === 'search' && (
        <InputPro
          name={`${field.key}-search`}
          label="Texto de búsqueda"
          isLabel
          placeholder="Ej. laptops gamer"
          value={value}
          onChange={e => onChange({ [typeKey]: 'search', [valueKey]: e.target.value })}
        />
      )}

      {type === 'url' && (
        <InputPro
          name={`${field.key}-url`}
          label="URL externa"
          isLabel
          placeholder="https://..."
          value={url}
          onChange={e => onChange({ [typeKey]: 'url', [urlKey]: e.target.value })}
        />
      )}

      {type === 'catalog' && (
        <p className="text-[11px] text-gray-400">Abrirá el catálogo general de la tienda.</p>
      )}

      {type === 'none' && (
        <p className="text-[11px] text-gray-400">El bloque se verá igual, pero no navegará a otra página.</p>
      )}
    </div>
  );
}

function ProductTargetPicker({
  selectedId, selectedName, onSelect, onClear,
}: {
  selectedId?: number | string | null;
  selectedName?: string;
  onSelect: (product: any) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (search.trim().length > 2) {
        setSearching(true);
        try {
          const { data } = await apiClient.get('/productos', { params: { limit: 5, page: 1, search } });
          const p = data.data;
          setResults(p?.productos || p?.data || p || []);
        } catch { setResults([]); } finally { setSearching(false); }
      } else { setResults([]); }
    }, 450);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="space-y-2">
      {selectedId && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-slate-900 px-2 py-1.5">
          <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">{selectedName || `Producto #${selectedId}`}</p>
          <button onClick={onClear} className="text-red-500 p-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex-shrink-0">
            <Icon icon="mdi:close" />
          </button>
        </div>
      )}
      <div className="relative">
        <InputPro
          name={`search-target-${selectedId || 'empty'}`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto destino..."
        />
        {searching && <Icon icon="svg-spinners:ring-resize" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />}
        {results.length > 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 dark:border-transparent bg-white dark:bg-[#111827] shadow-lg max-h-56 overflow-y-auto">
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); setSearch(''); setResults([]); }}
                className="flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-indigo-50 dark:hover:bg-slate-800 border-b dark:border-slate-800 last:border-0"
              >
                {p.imagenUrl
                  ? <img src={p.imagenUrl} className="w-6 h-6 rounded object-cover" alt="" />
                  : <span className="w-6 h-6 rounded bg-gray-100 dark:bg-slate-800" />}
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200 truncate">{p.descripcion}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function ProductosSection({
  fields, diseno, slug, onChange,
}: {
  fields: ProductFieldDef[];
  diseno: any;
  slug: string;
  onChange: (c: Record<string, any>) => void;
}) {
  return (
    <div className="space-y-5">
      {fields.map(f => (
        <ProductPicker key={f.key} field={f} selected={Array.isArray(diseno?.[f.key]) ? diseno[f.key] : []} onChange={onChange} slug={slug} />
      ))}
    </div>
  );
}

function ProductPicker({
  field, selected, onChange,
}: {
  field: ProductFieldDef;
  selected: any[];
  onChange: (c: Record<string, any>) => void;
  slug: string;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (search.trim().length > 2) {
        setSearching(true);
        try {
          const { data } = await apiClient.get('/productos', { params: { limit: 5, page: 1, search } });
          const p = data.data;
          setResults(p?.productos || p?.data || p || []);
        } catch { setResults([]); } finally { setSearching(false); }
      } else { setResults([]); }
    }, 450);
    return () => clearTimeout(t);
  }, [search]);

  const add = (p: any) => {
    if (selected.find(x => x.id === p.id)) return;
    const next = [...selected, {
      id: p.id, descripcion: p.descripcion, imagenUrl: p.imagenUrl,
      precioUnitario: p.precioUnitario, opcionesAtributos: p.opcionesAtributos, variantes: p.variantes,
    }];
    onChange({ [field.key]: next });
    setSearch('');
    setResults([]);
  };

  const remove = (id: number) => onChange({ [field.key]: selected.filter(x => x.id !== id) });

  return (
    <div className="rounded-xl border border-gray-100 dark:border-slate-800 p-3">
      <p className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">{field.label}</p>
      <div className="space-y-1.5 mb-2">
        {selected.map(p => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-slate-900 px-2 py-1.5">
            <div className="flex items-center gap-2 min-w-0">
              {p.imagenUrl
                ? <img src={p.imagenUrl} className="w-7 h-7 rounded object-cover flex-shrink-0" alt="" />
                : <span className="w-7 h-7 rounded bg-gray-200 dark:bg-slate-800 flex-shrink-0" />}
              <p className="text-[11px] font-medium text-gray-700 dark:text-gray-300 truncate">{p.descripcion}</p>
            </div>
            <button onClick={() => remove(p.id)} className="text-red-500 p-0.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex-shrink-0">
              <Icon icon="mdi:close" />
            </button>
          </div>
        ))}
        {selected.length === 0 && <p className="text-[11px] text-gray-400">Ningún producto seleccionado</p>}
      </div>
      <div className="relative">
        <InputPro
          name={`search-${field.key}`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar para añadir..."
        />
        {searching && <Icon icon="svg-spinners:ring-resize" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />}
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 dark:border-transparent bg-white dark:bg-[#111827] shadow-lg max-h-56 overflow-y-auto">
            {results.map(p => (
              <button key={p.id} onClick={() => add(p)} className="flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-indigo-50 dark:hover:bg-slate-800 border-b dark:border-slate-800 last:border-0">
                {p.imagenUrl
                  ? <img src={p.imagenUrl} className="w-6 h-6 rounded object-cover" alt="" />
                  : <span className="w-6 h-6 rounded bg-gray-100 dark:bg-slate-800" />}
                <span className="text-[11px] font-medium text-gray-700 dark:text-gray-200 truncate">{p.descripcion}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
