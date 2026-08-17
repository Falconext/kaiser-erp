import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  GREEN, resolveFalconGreen, getName, storeNameOf, editable, withPreviewQuery,
  FalconHeader, FalconFooter, FalconBenefits,
  FalconCartDrawer, getFalconBlogPosts, blogBodyToHtml, type FalconBlogPost,
  falconFadeUp, falconHoverLift, falconScaleIn, falconStagger, falconTap,
} from '@/templates/falcon/FalconShared';
import { onTiendaCartCleared } from '@/utils/tiendaCart';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function BlogSidebar({
  green, posts, activeId, onOpen, categories, activeCategory, onSelectCategory, allTags, diseno,
}: {
  green: string; posts: FalconBlogPost[]; activeId: string; onOpen: (id: string) => void;
  categories: { name: string; count: number }[]; activeCategory: string | null;
  onSelectCategory: (name: string | null) => void; allTags: string[]; diseno?: any;
}) {
  const [search, setSearch] = useState('');
  return (
    <motion.aside initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconStagger} className="flex flex-col gap-8">
      {/* Search */}
      <motion.div variants={falconFadeUp} className="flex items-center overflow-hidden rounded-md border border-gray-200 bg-white">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={editable(diseno?.falconBlogSearchPlaceholder, 'Buscar aquí')} className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-gray-400" />
        <button type="button" className="px-4 text-gray-500 hover:text-[#151515]"><Icon icon="solar:magnifer-linear" width={20} /></button>
      </motion.div>

      {/* Categories */}
      <motion.div variants={falconFadeUp}>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-[#151515]">{editable(diseno?.falconBlogCategoriesTitle, 'Categorías del blog')}</h3>
          {activeCategory && (
            <button type="button" onClick={() => onSelectCategory(null)} className="text-xs font-bold" style={{ color: green }}>{editable(diseno?.falconBlogViewAllLabel, 'Ver todas')}</button>
          )}
        </div>
        <div className="mt-5 space-y-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.name;
            return (
              <motion.button
                key={cat.name}
                type="button"
                onClick={() => onSelectCategory(isActive ? null : cat.name)}
                whileHover={{ x: 4 }}
                whileTap={falconTap}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-semibold transition-colors hover:bg-gray-50"
                style={isActive ? { color: green } : { color: '#4b5563' }}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: isActive ? green : '#d1d5db' }} />
                  {cat.name}
                </span>
                <span className="text-gray-400">({String(cat.count).padStart(2, '0')})</span>
              </motion.button>
            );
          })}
          {categories.length === 0 && <p className="text-sm text-gray-400">Sin categorías todavía.</p>}
        </div>
      </motion.div>

      {/* Recent posts */}
      <motion.div variants={falconFadeUp}>
        <h3 className="text-xl font-black text-[#151515]">{editable(diseno?.falconBlogRecentTitle, 'Publicaciones recientes')}</h3>
        <div className="mt-5 space-y-5">
          {posts.slice(0, 3).map((p) => (
            <motion.button key={p.id} type="button" onClick={() => onOpen(p.id)} whileHover={{ x: 4 }} whileTap={falconTap} className="flex w-full items-center gap-4 text-left">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <Icon icon="solar:gallery-linear" width={26} className="text-gray-300" />}
              </span>
              <span className="min-w-0">
                <span className={`line-clamp-2 text-sm font-bold ${p.id === activeId ? '' : 'text-[#151515]'}`} style={p.id === activeId ? { color: green } : undefined}>{p.title}</span>
                <span className="mt-1 block text-xs font-semibold text-gray-400">{p.date}</span>
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Tags */}
      <motion.div variants={falconFadeUp}>
        <h3 className="text-xl font-black text-[#151515]">{editable(diseno?.falconBlogTagsTitle, 'Etiquetas')}</h3>
        <div className="mt-5 flex flex-wrap gap-3">
          {allTags.map((t) => (
            <span key={t} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200">{t}</span>
          ))}
        </div>
      </motion.div>
    </motion.aside>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// View
// ─────────────────────────────────────────────────────────────────────────────
export function FalconBlogView({
  tienda, slug, blogId, carrito, mostrarCarrito, setMostrarCarrito, actualizarCantidad, allCategories = [],
  previewMode = false, onNavigate,
}: {
  tienda: any; slug: string; blogId?: string;
  carrito: any[]; mostrarCarrito: boolean; setMostrarCarrito: (v: boolean) => void;
  actualizarCantidad: (id: number | string, qty: number) => void; allCategories?: any[];
  /** When true, internal navigation stays inside the preview instead of changing the route. */
  previewMode?: boolean;
  onNavigate?: (page: 'home' | 'catalogo' | 'checkout') => void;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const previewPlantillaId = searchParams.get('previewPlantilla');
  const diseno = previewPlantillaId ? {
    ...(tienda?.diseno || {}),
    plantillaId: previewPlantillaId,
    __previewPlantillaId: previewPlantillaId,
    __previewQuery: `previewPlantilla=${encodeURIComponent(previewPlantillaId)}&previewOrigen=template`,
  } : (tienda?.diseno || {});
  const green = resolveFalconGreen(diseno);
  const storeName = storeNameOf(tienda);

  const posts = useMemo(() => getFalconBlogPosts(diseno), [diseno]);
  // In preview there is no route param, so we track the active post locally.
  const [localId, setLocalId] = useState<string | undefined>(blogId);
  useEffect(() => { setLocalId(blogId); }, [blogId]);
  const activeId = previewMode ? localId : blogId;
  const active = useMemo(() => posts.find((p) => p.id === activeId) || posts[0], [posts, activeId]);

  // Real blog categories with post counts.
  const blogCategories = useMemo(() => {
    const map = new Map<string, number>();
    posts.forEach((p) => { const c = (p.category || 'Novedades').trim() || 'Novedades'; map.set(c, (map.get(c) || 0) + 1); });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [posts]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const pool = useMemo(() => (categoryFilter ? posts.filter((p) => (p.category || 'Novedades') === categoryFilter) : posts), [posts, categoryFilter]);

  const related = useMemo(() => pool.filter((p) => p.id !== active?.id).slice(0, 4), [pool, active]);
  const allTags = useMemo(() => Array.from(new Set(posts.flatMap((p) => p.tags || []))).slice(0, 6), [posts]);
  const categoryNames = useMemo(() => allCategories.map(getName).filter(Boolean), [allCategories]);

  const cartCount = carrito.reduce((s, i) => s + Number(i?.cantidad || 1), 0);
  const cartTotal = carrito.reduce((s, i) => s + Number(i?.precioUnitario || 0) * Number(i?.cantidad || 1), 0);

  const openPost = (id: string) => {
    if (previewMode) setLocalId(id);
    else navigate(withPreviewQuery(`/tienda/${slug}/blog/${id}`, diseno));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const selectCategory = (name: string | null) => {
    setCategoryFilter(name);
    if (name) {
      const first = posts.find((p) => (p.category || 'Novedades') === name);
      if (first && first.id !== active?.id) openPost(first.id);
    }
  };
  const goCatalog = () => { if (previewMode && onNavigate) onNavigate('catalogo'); else navigate(withPreviewQuery(`/tienda/${slug}/catalogo`, diseno)); };
  const goCheckout = () => { if (previewMode && onNavigate) onNavigate('checkout'); else navigate(withPreviewQuery(`/tienda/${slug}/checkout`, diseno), { state: { carrito, tienda } }); };

  useEffect(() => { window.scrollTo({ top: 0 }); }, [blogId]);

  if (!active) return null;

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }}>
      <style>{`
        .falcon-blog-prose { overflow-wrap: anywhere; word-break: break-word; }
        .falcon-blog-prose * { max-width: 100%; }
        .falcon-blog-prose > * + * { margin-top: 1.25rem; }
        .falcon-blog-prose h1, .falcon-blog-prose h2, .falcon-blog-prose h3 { color: #151515; font-weight: 800; line-height: 1.25; }
        .falcon-blog-prose h1 { font-size: 1.6rem; }
        .falcon-blog-prose h2 { font-size: 1.35rem; }
        .falcon-blog-prose h3 { font-size: 1.15rem; }
        .falcon-blog-prose p { margin-top: 1.15rem; }
        .falcon-blog-prose strong { color: #151515; font-weight: 700; }
        .falcon-blog-prose a { color: ${green}; text-decoration: underline; }
        .falcon-blog-prose ul, .falcon-blog-prose ol { margin-top: 1.15rem; padding-left: 1.4rem; }
        .falcon-blog-prose ul { list-style: disc; }
        .falcon-blog-prose ol { list-style: decimal; }
        .falcon-blog-prose li { margin-top: 0.4rem; }
        .falcon-blog-prose img { border-radius: 0.75rem; max-width: 100%; }
        .falcon-blog-prose blockquote { border-left: 3px solid ${green}; padding-left: 1rem; color: #6b7280; font-style: italic; }
      `}</style>
      <FalconHeader tienda={tienda} slug={slug} green={green} cartCount={cartCount} cartTotal={cartTotal} onOpenCart={() => setMostrarCarrito(true)} diseno={diseno} categories={allCategories} />

      {/* Main gray zone: sidebar + article (single white card, like Gadgetize) */}
      <div className="bg-[#ececec]">
        <div className="mx-auto max-w-[1400px] px-4 py-10 lg:px-6">
          <motion.div initial="hidden" animate="show" variants={falconScaleIn} className="grid overflow-hidden rounded-2xl bg-white shadow-sm lg:grid-cols-[360px_1fr]">
            <div className="border-b border-gray-100 p-6 md:p-8 lg:border-b-0 lg:border-r">
              <BlogSidebar green={green} posts={pool} activeId={active.id} onOpen={openPost} categories={blogCategories} activeCategory={categoryFilter} onSelectCategory={selectCategory} allTags={allTags} diseno={diseno} />
            </div>

            {/* Article */}
            <motion.article variants={falconFadeUp} className="min-w-0 p-6 md:p-8">
              <motion.div layout className="overflow-hidden rounded-2xl bg-gray-100">
                {active.image && <img src={active.image} alt={active.title} className="h-[280px] w-full object-cover md:h-[440px]" />}
              </motion.div>

              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-2 font-semibold text-gray-600"><Icon icon="solar:calendar-linear" width={18} style={{ color: green }} /> {active.date}</span>
                <span className="text-gray-300">•</span>
                <span className="font-semibold text-gray-600">Por {active.author}</span>
              </div>

              <h1 className="mt-4 break-words text-2xl font-black leading-tight text-[#151515] md:text-4xl">{active.title}</h1>

              <div
                className="falcon-blog-prose mt-5 text-sm leading-7 text-gray-500 md:text-base"
                dangerouslySetInnerHTML={{ __html: active.bodyHtml || blogBodyToHtml(active.body) }}
              />

              {/* Tags + share */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-base font-black text-[#151515]">Etiquetas:</span>
                  {(active.tags || []).map((t) => <span key={t} className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-600">{t}</span>)}
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-black text-[#151515]"><Icon icon="solar:share-linear" width={18} /> Compartir:</span>
                  {['ri:facebook-fill', 'ri:twitter-x-fill', 'ri:instagram-line', 'ri:tiktok-fill'].map((ic) => (
                    <a key={ic} href="#" className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 transition-colors" style={{ color: green }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = green; e.currentTarget.style.color = '#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = green; }}>
                      <Icon icon={ic} width={17} />
                    </a>
                  ))}
                </div>
              </div>

              {/* Prev / next */}
              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-6 text-sm font-bold text-gray-500">
                {related[0] ? (
                  <button type="button" onClick={() => openPost(related[0].id)} className="inline-flex items-center gap-2 transition-colors hover:text-[#151515]"><Icon icon="solar:alt-arrow-left-linear" width={16} /> Publicación anterior</button>
                ) : <span />}
                {related[1] && (
                  <button type="button" onClick={() => openPost(related[1].id)} className="inline-flex items-center gap-2 transition-colors hover:text-[#151515]">Siguiente publicación <Icon icon="solar:alt-arrow-right-linear" width={16} /></button>
                )}
              </div>

              {/* Comment form */}
              <div className="mt-10">
                <h3 className="text-2xl font-black text-[#151515]">{editable(diseno?.falconBlogCommentTitle, 'Deja un comentario')}</h3>
                <p className="mt-2 text-sm text-gray-500">Tu correo electrónico no será publicado. Los campos obligatorios están marcados con *</p>
                <form className="mt-6 space-y-5" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="flex items-center overflow-hidden rounded-md border border-gray-300">
                      <input placeholder="Tu nombre" className="min-w-0 flex-1 bg-transparent px-4 py-4 text-sm outline-none placeholder:text-gray-400" />
                      <Icon icon="solar:user-linear" width={20} className="mr-4 text-gray-400" />
                    </div>
                    <div className="flex items-center overflow-hidden rounded-md border border-gray-300">
                      <input type="email" placeholder="Tu correo" className="min-w-0 flex-1 bg-transparent px-4 py-4 text-sm outline-none placeholder:text-gray-400" />
                      <Icon icon="solar:letter-linear" width={20} className="mr-4 text-gray-400" />
                    </div>
                  </div>
                  <textarea rows={6} placeholder="Escribe tu comentario..." className="w-full rounded-md border border-gray-300 px-4 py-4 text-sm outline-none placeholder:text-gray-400" />
                  <motion.button type="submit" whileHover={{ y: -2 }} whileTap={falconTap} className="rounded-md px-8 py-4 text-sm font-black text-white" style={{ background: green }}>{editable(diseno?.falconBlogCommentButton, 'Enviar comentario')}</motion.button>
                </form>
              </div>
            </motion.article>
          </motion.div>
        </div>
      </div>

      <FalconBenefits green={green} diseno={diseno} />

      {/* Related blogs */}
      {related.length > 0 && (
        <div className="bg-[#ececec]">
          <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-6">
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm">
              <h2 className="text-xl font-black text-[#151515]">{editable(diseno?.falconBlogRelatedTitle, 'Blogs relacionados')}</h2>
              <button type="button" onClick={() => openPost(posts[0]?.id)} className="inline-flex items-center gap-2 text-sm font-bold text-[#151515] hover:opacity-70">{editable(diseno?.falconBlogViewAllLabel, 'Ver todo')} <Icon icon="solar:arrow-right-linear" width={18} /></button>
            </div>
            <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={falconStagger} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((p) => (
                <motion.article key={p.id} variants={falconFadeUp} whileHover={falconHoverLift} whileTap={falconTap} onClick={() => openPost(p.id)} className="flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md">
                  <div className="h-48 overflow-hidden bg-gray-100">{p.image && <img src={p.image} alt={p.title} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />}</div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="inline-flex items-center gap-2 text-xs font-bold text-gray-500"><Icon icon="solar:calendar-linear" width={16} style={{ color: green }} /> {p.date}</p>
                    <h3 className="mt-3 line-clamp-2 text-base font-black text-[#151515]">{p.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-gray-400">{p.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-2 self-start text-sm font-bold" style={{ color: green }}>{editable(diseno?.falconBlogReadMoreLabel, 'Leer más')} <Icon icon="solar:arrow-right-linear" width={16} /></span>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </div>
        </div>
      )}

      <FalconFooter tienda={tienda} slug={slug} green={green} categories={categoryNames} diseno={diseno} />

      <FalconCartDrawer isOpen={mostrarCarrito} onClose={() => setMostrarCarrito(false)} carrito={carrito} actualizarCantidad={actualizarCantidad} onCheckout={() => { setMostrarCarrito(false); goCheckout(); }} onViewCart={() => { setMostrarCarrito(false); goCatalog(); }} green={green} diseno={diseno} tienda={tienda} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data wrapper
// ─────────────────────────────────────────────────────────────────────────────
export default function FalconBlog() {
  const { slug = '', blogId } = useParams();
  const [tienda, setTienda] = useState<any>(null);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    try { const saved = localStorage.getItem(`tienda:${slug}:carrito`); if (saved) setCarrito(JSON.parse(saved)); } catch {}
    return onTiendaCartCleared(slug, () => { setCarrito([]); setMostrarCarrito(false); });
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      try {
        const [storeRes, catRes] = await Promise.all([
          axios.get(`${BASE_URL}/public/store/${slug}`),
          axios.get(`${BASE_URL}/public/store/${slug}/categories`).catch(() => ({ data: { data: [] } })),
        ]);
        setTienda(storeRes.data.data || storeRes.data);
        setAllCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
      } catch {
        setTienda({});
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug]);

  const actualizarCantidad = (productoId: number | string, cantidad: number) => {
    const next = cantidad <= 0
      ? carrito.filter((item) => item.id !== productoId && item.productoId !== productoId)
      : carrito.map((item) => (item.id === productoId || item.productoId === productoId) ? { ...item, cantidad } : item);
    setCarrito(next);
    localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(next));
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-white"><Icon icon="solar:refresh-bold" className="h-12 w-12 animate-spin text-gray-300" /></div>;

  return (
    <FalconBlogView
      tienda={tienda || {}}
      slug={slug}
      blogId={blogId}
      carrito={carrito}
      mostrarCarrito={mostrarCarrito}
      setMostrarCarrito={setMostrarCarrito}
      actualizarCantidad={actualizarCantidad}
      allCategories={allCategories}
    />
  );
}
