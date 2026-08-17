import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useConfiguracionTiendaViewModel } from '@/features/admin/tienda/useConfiguracionTiendaViewModel';
import { getFalconBlogPosts, type FalconBlogPost } from '@/templates/falcon/FalconShared';
import useAlertStore from '@/zustand/alert';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'clean'],
  ],
};

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

const emptyPost = (author = 'Tienda'): FalconBlogPost => ({
  id: uid(),
  image: '',
  date: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }),
  title: '',
  excerpt: '',
  author,
  category: 'Novedades',
  tags: [],
  body: [''],
  bodyHtml: '',
});

export default function BlogTienda() {
  const vm = useConfiguracionTiendaViewModel();
  const { alert } = useAlertStore();
  const diseno = vm.config?.diseno;
  const plantillaId = diseno?.plantillaId;
  const blogTemplates = ['falcon'];
  const activeTemplateSupportsBlog = blogTemplates.includes(String(plantillaId || ''));
  const configAny = vm.config as any;
  const defaultAuthor =
    configAny?.nombreComercial ||
    configAny?.empresa?.nombreComercial ||
    configAny?.empresa?.razonSocial ||
    configAny?.empresa?.nombre ||
    'Tienda';

  const [posts, setPosts] = useState<FalconBlogPost[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  // Seed local state once config has loaded.
  useEffect(() => {
    if (posts !== null || !vm.config) return;
    setPosts(getFalconBlogPosts(diseno));
  }, [vm.config, diseno, posts]);

  const list = posts ?? [];

  const patchPost = (id: string, patch: Partial<FalconBlogPost>) => {
    setPosts((prev) => (prev || []).map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setDirty(true);
  };

  const addPost = () => {
    const p = emptyPost(defaultAuthor);
    setPosts((prev) => [...(prev || []), p]);
    setExpanded(p.id);
    setDirty(true);
  };

  const deletePost = (id: string) => {
    setPosts((prev) => (prev || []).filter((p) => p.id !== id));
    setDirty(true);
  };

  const movePost = (id: string, dir: -1 | 1) => {
    setPosts((prev) => {
      const arr = [...(prev || [])];
      const i = arr.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
    setDirty(true);
  };

  const onPickImage = async (id: string, file: File | undefined) => {
    if (!file) return;
    setUploadingId(id);
    const url = await vm.subirMediaTemplate(file);
    setUploadingId(null);
    if (url) patchPost(id, { image: url });
  };

  const save = async () => {
    if (!posts) return;
    const clean = posts
      .map((p) => ({
        ...p,
        title: (p.title || '').trim(),
        tags: (p.tags || []).map((t) => String(t).trim()).filter(Boolean),
        body: (p.body || []).map((b) => String(b).trim()).filter(Boolean),
      }))
      .filter((p) => p.title);
    if (clean.length !== posts.length && posts.some((p) => !(p.title || '').trim())) {
      alert('Cada publicación necesita un título. Las vacías no se guardarán.', 'warning');
    }
    setSaving(true);
    const ok = await vm.actualizarDiseno({ storeBlogPosts: clean, falconBlogPosts: clean }, { silent: true });
    setSaving(false);
    if (ok) {
      setPosts(clean);
      setDirty(false);
      alert('Blog guardado correctamente', 'success');
    }
  };

  const allTags = useMemo(() => Array.from(new Set(list.flatMap((p) => p.tags || []))), [list]);
  const allCategories = useMemo(() => Array.from(new Set(list.map((p) => (p.category || '').trim()).filter(Boolean))), [list]);
  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    list.forEach((p) => { const c = (p.category || 'Novedades').trim() || 'Novedades'; m.set(c, (m.get(c) || 0) + 1); });
    return Array.from(m.entries());
  }, [list]);

  if (vm.loading || posts === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Icon icon="eos-icons:loading" className="h-10 w-10 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <style>{`
        .falcon-blog-quill .ql-container { min-height: 180px; font-size: 14px; border: none; }
        .falcon-blog-quill .ql-editor { min-height: 180px; }
        .falcon-blog-quill .ql-toolbar.ql-snow { border: none; border-bottom: 1px solid #e5e7eb; }
        .dark .falcon-blog-quill .ql-toolbar.ql-snow { border-color: #334155; }
        .dark .falcon-blog-quill .ql-editor { color: #e2e8f0; }
      `}</style>
      <datalist id="falcon-blog-cats">
        {allCategories.map((c) => <option key={c} value={c} />)}
        {['Novedades', 'Guías', 'Tendencias', 'Reseñas'].filter((c) => !allCategories.includes(c)).map((c) => <option key={c} value={c} />)}
      </datalist>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-gray-900 dark:text-white">
            <Icon icon="solar:notebook-bold-duotone" className="text-emerald-600" width={28} />
            Blog de la tienda
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Administra un solo blog para tu tienda. Las plantillas compatibles lo mostrarán con su propio diseño.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addPost}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Icon icon="solar:add-circle-bold" width={18} /> Nueva publicación
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Icon icon="eos-icons:loading" width={18} /> : <Icon icon="solar:diskette-bold" width={18} />}
            Guardar
          </button>
        </div>
      </div>

      {!activeTemplateSupportsBlog && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <Icon icon="solar:info-circle-bold" width={20} className="mt-0.5 shrink-0" />
          <span>Tu plantilla actual es <strong>{plantillaId || 'genérica'}</strong> y todavía no muestra página de blog. Estas publicaciones quedan guardadas para tu tienda y se verán automáticamente en plantillas con blog, como <strong>Falcon</strong>.</span>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400 dark:border-slate-700">
            <Icon icon="solar:notebook-linear" width={44} className="mx-auto mb-3" />
            <p className="text-sm font-semibold">Aún no hay publicaciones.</p>
            <button type="button" onClick={addPost} className="mt-3 text-sm font-bold text-emerald-600 hover:underline">Crear la primera</button>
          </div>
        )}

        {list.map((p, idx) => {
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-transparent dark:bg-slate-900">
              {/* Row header */}
              <div className="flex items-center gap-3 p-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800">
                  {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <Icon icon="solar:gallery-linear" width={22} className="text-gray-400" />}
                </div>
                <button type="button" onClick={() => setExpanded(isOpen ? null : p.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{p.title || <span className="text-gray-400">Sin título</span>}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-400">{p.date} · {p.category}</p>
                </button>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => movePost(p.id, -1)} disabled={idx === 0} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-slate-800"><Icon icon="solar:alt-arrow-up-linear" width={18} /></button>
                  <button type="button" onClick={() => movePost(p.id, 1)} disabled={idx === list.length - 1} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-slate-800"><Icon icon="solar:alt-arrow-down-linear" width={18} /></button>
                  <button type="button" onClick={() => setExpanded(isOpen ? null : p.id)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"><Icon icon="solar:pen-linear" width={18} /></button>
                  <button type="button" onClick={() => deletePost(p.id)} className="rounded-md p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><Icon icon="solar:trash-bin-trash-linear" width={18} /></button>
                </div>
              </div>

              {/* Editor */}
              {isOpen && (
                <div className="border-t border-gray-100 p-4 dark:border-slate-800">
                  <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                    {/* Image */}
                    <div>
                      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Imagen</label>
                      <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800">
                        {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : <Icon icon="solar:gallery-add-linear" width={30} className="text-gray-300" />}
                      </div>
                      <input ref={(el) => { fileInputs.current[p.id] = el; }} type="file" accept="image/*" className="hidden" onChange={(e) => { onPickImage(p.id, e.target.files?.[0]); e.currentTarget.value = ''; }} />
                      <button type="button" onClick={() => fileInputs.current[p.id]?.click()} disabled={uploadingId === p.id} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {uploadingId === p.id ? <Icon icon="eos-icons:loading" width={14} /> : <Icon icon="solar:upload-linear" width={14} />}
                        Subir imagen
                      </button>
                      <input value={p.image || ''} onChange={(e) => patchPost(p.id, { image: e.target.value })} placeholder="o pega una URL" className="mt-2 w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                    </div>

                    {/* Fields */}
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Título</label>
                        <input value={p.title} onChange={(e) => patchPost(p.id, { title: e.target.value })} placeholder="Título de la publicación" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Fecha</label>
                          <input value={p.date} onChange={(e) => patchPost(p.id, { date: e.target.value })} placeholder="11 Dic, 2024" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Autor</label>
                          <input value={p.author || ''} onChange={(e) => patchPost(p.id, { author: e.target.value })} placeholder="Autor" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Categoría</label>
                          <input list="falcon-blog-cats" value={p.category || ''} onChange={(e) => patchPost(p.id, { category: e.target.value })} placeholder="Novedades" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Etiquetas <span className="font-normal normal-case text-gray-400">(separadas por coma)</span></label>
                        <input value={(p.tags || []).join(', ')} onChange={(e) => patchPost(p.id, { tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} placeholder="Accesorios, Audífonos" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Extracto <span className="font-normal normal-case text-gray-400">(resumen breve)</span></label>
                        <textarea value={p.excerpt} onChange={(e) => patchPost(p.id, { excerpt: e.target.value })} rows={2} placeholder="Resumen que se muestra en las tarjetas del blog" className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">Contenido <span className="font-normal normal-case text-gray-400">(negritas, listas, enlaces…)</span></label>
                        <div className="falcon-blog-quill overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                          <ReactQuill
                            theme="snow"
                            value={p.bodyHtml || ''}
                            onChange={(html: string) => patchPost(p.id, { bodyHtml: html })}
                            modules={QUILL_MODULES}
                            placeholder="Escribe el contenido del artículo…"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(categoryCounts.length > 0 || allTags.length > 0) && (
        <div className="mt-6 space-y-2 border-t border-gray-100 pt-4 dark:border-slate-800">
          {categoryCounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-gray-500">Categorías:</span>
              {categoryCounts.map(([name, count]) => (
                <span key={name} className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{name} ({count})</span>
              ))}
            </div>
          )}
          {allTags.length > 0 && (
            <p className="text-xs text-gray-400">Etiquetas en uso: {allTags.join(' · ')}</p>
          )}
        </div>
      )}
    </div>
  );
}
