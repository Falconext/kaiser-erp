import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import TecnologiaHeader from '@/components/tienda/TecnologiaHeader';
import TecnologiaFooter from '@/components/tienda/TecnologiaFooter';
import TecnologiaCartModal from '@/components/tienda/TecnologiaCartModal';
import ProductCardXtra from '@/components/tienda/ProductCardXtra';
import { onTiendaCartCleared } from '@/utils/tiendaCart';
import { withPricing, withPricingList } from '@/templates/shared/pricing';
import TiendaFloatingButtons from '@/components/tienda/TiendaFloatingButtons';
import { parsePastedPairs } from '@/lib/pastedSpecs';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

export default function TecnologiaProductoDetalle() {
    const { slug, id } = useParams();
    const navigate = useNavigate();

    const [tienda, setTienda] = useState<any>(null);
    const [carrito, setCarrito] = useState<any[]>([]);
    const [mostrarCarrito, setMostrarCarrito] = useState(false);
    const [allCategories, setAllCategories] = useState<any[]>([]);



    useEffect(() => {
        if (!slug) return;
        const loadTienda = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/public/store/${slug}`);
                const data = res.data.data || res.data;
                setTienda(data);
                
                // Categories
                const catRes = await axios.get(`${BASE_URL}/public/store/${slug}/categories`);
                setAllCategories(Array.isArray(catRes.data?.data) ? catRes.data.data : []);
            } catch (e) {
                console.error(e);
            }
        };
        loadTienda();

        // Restore cart
        try {
            const saved = localStorage.getItem(`tienda:${slug}:carrito`);
            if (saved) setCarrito(JSON.parse(saved));
        } catch {}
    }, [slug]);

    // Save cart when it changes
    useEffect(() => {
        if (carrito.length > 0) {
            localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(carrito));
        }
    }, [carrito, slug]);

    const agregarAlCarrito = (item: any) => {
        const exist = carrito.find(i => i.productoId === item.productoId || i.id === item.id);
        let newCart = [];
        if (exist) {
            newCart = carrito.map(i => (i.productoId === item.productoId || i.id === item.id) ? { ...i, cantidad: i.cantidad + item.cantidad } : i);
        } else {
            newCart = [...carrito, { ...item, id: item.id || item.productoId, productoId: item.productoId || item.id }];
        }
        setCarrito(newCart);
        localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(newCart));
    };

    const actualizarCantidad = (productoId: number | string, cantidad: number) => {
        if (cantidad <= 0) {
            const newCart = carrito.filter(item => item.id !== productoId);
            setCarrito(newCart);
            localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(newCart));
        } else {
            const newCart = carrito.map(item => item.id === productoId ? { ...item, cantidad } : item);
            setCarrito(newCart);
            localStorage.setItem(`tienda:${slug}:carrito`, JSON.stringify(newCart));
        }
    };

    const [producto, setProducto] = useState<any>(null);
    const [related, setRelated] = useState<any[]>([]);
    const [reviews, setReviews] = useState<any[]>([]);
    const [reviewSummary, setReviewSummary] = useState({ ratingAvg: 0, ratingCount: 0 });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [qty, setQty] = useState(1);
    const [activeImage, setActiveImage] = useState(0);

    const cp = tienda?.diseno?.colorPrimario || '#D92D20';

    useEffect(() => {
        if (!slug || !id) return;
        cargarProducto();
    }, [slug, id]);

    useEffect(() => {
        if (!slug) return;
        return onTiendaCartCleared(slug, () => {
            setCarrito([]);
            setMostrarCarrito(false);
        });
    }, [slug]);

    const cargarProducto = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${BASE_URL}/public/store/${slug}/products/${id}`);
            const productData = withPricing(data.data || data);
            setProducto(productData);
            setReviews([]);
            setReviewSummary({
                ratingAvg: Number(productData.ratingAvg || productData.ratingPromedio || productData.promedioRating || 0),
                ratingCount: Number(productData.ratingCount || productData.totalReviews || productData.reviewsCount || 0),
            });

            // Fetch related
            const category = productData.categoria?.nombre || productData.categoria;
            if (category) {
                const res = await axios.get(`${BASE_URL}/public/store/${slug}/products`, {
                    params: { category, limit: 4 }
                });
                const arr = Array.isArray(res.data?.data?.data) ? res.data.data.data : Array.isArray(res.data?.data) ? res.data.data : [];
                setRelated(withPricingList(arr.filter((p: any) => p.id !== Number(id)).slice(0, 4)));
            }

            try {
                const reviewsRes = await axios.get(`${BASE_URL}/public/store/${slug}/products/${productData.id}/reviews`);
                const payload = reviewsRes.data?.data || reviewsRes.data || {};
                const reviewItems = Array.isArray(payload.reviews) ? payload.reviews : [];
                setReviews(reviewItems);
                setReviewSummary({
                    ratingAvg: Number(payload.ratingAvg || payload.promedio || 0),
                    ratingCount: Number(payload.ratingCount || reviewItems.length || 0),
                });
            } catch {
                setReviews([]);
            }
        } catch {
            navigate(`/tienda/${slug}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = () => {
        const item = { ...producto, cantidad: qty };
        agregarAlCarrito(item);
        setMostrarCarrito(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
                <Icon icon="solar:wheel-bold" className="w-12 h-12 text-gray-700 animate-spin" />
            </div>
        );
    }

    if (!producto) return null;

    const extraImages = Array.isArray(producto.imagenesExtra) ? producto.imagenesExtra : [];
    const images = [producto.imagenUrl, ...extraImages].filter(Boolean);
    const stock = Number(producto.stock || 0);
    const isOutOfStock = stock <= 0;
    const price = Number(producto.precioUnitario || 0);
    const originalPrice = Number(producto.precioOriginal || producto.precioRegular || 0);
    const hasDiscount = Boolean(producto.enOferta) && originalPrice > price;
    const discountPct = hasDiscount ? Math.round((1 - price / originalPrice) * 100) : 0;
    const marca = producto.marca?.nombre || producto.marca || 'Tech';
    const categoria = producto.categoria?.nombre || producto.categoria || 'Tecnología';

    // Especificaciones/destacados cargados desde el admin (misma lógica que la plantilla Maye):
    // el texto "pegado" tiene prioridad; si no existe, se arma con características + ficha técnica.
    const fichaTecnica = (producto as any)?.fichaTecnica;
    const pastedEspec = parsePastedPairs((producto as any)?.atributosTecnicos?.__especificacionesTexto);
    const pastedDest = parsePastedPairs((producto as any)?.atributosTecnicos?.__destacadosTexto);
    const rawSpecs: { label: string; value: any }[] = pastedEspec.length
        ? pastedEspec.map((p) => ({ label: p.label, value: p.value }))
        : [
            ...(Array.isArray(producto.caracteristicas) ? producto.caracteristicas.map((item: any) => ({ label: item.nombre, value: item.valor })) : []),
            ...(fichaTecnica && Array.isArray(fichaTecnica.destacados) ? fichaTecnica.destacados.map((it: any) => ({ label: it.label, value: it.value })) : []),
            ...(fichaTecnica && Array.isArray(fichaTecnica.grupos)
                ? fichaTecnica.grupos.flatMap((g: any) => Array.isArray(g.items) ? g.items.map((it: any) => ({ label: it.label, value: it.value })) : [])
                : []),
        ];
    const seenSpecs = new Set<string>();
    const specs = rawSpecs.filter((sp) => {
        if (sp.value == null || sp.value === '') return false;
        const key = String(sp.label || '').trim().toLowerCase();
        if (key) {
            if (seenSpecs.has(key)) return false;
            seenSpecs.add(key);
        }
        return true;
    });
    const destacados = pastedDest.length
        ? pastedDest.map((p) => ({ label: p.label, value: p.value }))
        : specs.slice(0, 6);
    const renderStars = (rating: number, size = 18) => (
        <div className="flex text-[#F5B01D]">
            {Array.from({ length: 5 }).map((_, index) => (
                <Icon key={index} icon={index < Math.round(rating || 0) ? 'solar:star-bold' : 'solar:star-linear'} width={size} />
            ))}
        </div>
    );
    return (
        <div className="min-h-screen bg-[#F8F9FA]" style={{ fontFamily: `'${tienda?.diseno?.tipografia || 'Inter'}', sans-serif` }}>
            
            <TecnologiaHeader 
                tienda={tienda}
                slug={slug || ''}
                cp={cp}
                carritoSize={carrito.length}
                onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
                searchQuery={search}
                setSearchQuery={setSearch}
                onSearchSubmit={(e, value) => { e.preventDefault(); if(value?.trim()) navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(value.trim())}`); }}
                allCategories={allCategories}
            />

            <main className="mx-auto w-full max-w-7xl px-4 py-8 xl:px-8 xl:py-10">
                <nav className="mb-8 flex items-center gap-2 text-xs font-semibold text-gray-400">
                    <button onClick={() => navigate(`/tienda/${slug}`)} className="transition-colors hover:text-gray-900">Inicio</button>
                    <Icon icon="solar:alt-arrow-right-linear" width={12} />
                    <button onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="transition-colors hover:text-gray-900">Catálogo</button>
                    <Icon icon="solar:alt-arrow-right-linear" width={12} />
                    <span className="max-w-[48vw] truncate text-gray-700">{producto.descripcion}</span>
                </nav>

                <section className="grid gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(420px,0.96fr)] lg:gap-14">
                    <div>
                        <div className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
                            {hasDiscount && (
                                <span className="absolute left-5 top-5 z-10 rounded-md px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-white" style={{ background: cp }}>
                                    -{discountPct}%
                                </span>
                            )}
                            <div className="flex aspect-square items-center justify-center rounded-2xl bg-gray-50">
                                {images.length > 0 ? (
                                    <img src={images[activeImage] || producto.imagenUrl} alt={producto.descripcion} className="h-full w-full object-contain p-6 transition-transform duration-700 hover:scale-[1.03]" />
                                ) : (
                                    <Icon icon="solar:box-linear" className="h-32 w-32 text-gray-200" />
                                )}
                            </div>
                        </div>

                        {images.length > 0 && (
                            <div className="mt-4 grid grid-cols-4 gap-3">
                                {images.slice(0, 4).map((image, index) => (
                                    <button
                                        key={`${image}-${index}`}
                                        type="button"
                                        onClick={() => setActiveImage(index)}
                                        className="aspect-square rounded-2xl border bg-white p-2 transition"
                                        style={{ borderColor: activeImage === index ? cp : '#E5E7EB' }}
                                    >
                                        <img src={image} alt="" className="h-full w-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-600">
                                {isOutOfStock ? 'Agotado' : `En stock (${stock})`}
                            </span>
                            <span className="rounded-full bg-gray-900 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                                {marca}
                            </span>
                        </div>

                        <h1 className="text-3xl font-black leading-tight tracking-tight text-gray-950 md:text-4xl lg:text-5xl">
                            {producto.descripcion}
                        </h1>

                        <div className="mt-5 flex items-center gap-2">
                            {reviewSummary.ratingCount > 0 ? renderStars(reviewSummary.ratingAvg) : renderStars(0)}
                            <span className="text-sm font-semibold text-gray-500">
                                {reviewSummary.ratingCount > 0
                                    ? `${reviewSummary.ratingAvg.toFixed(1)} (${reviewSummary.ratingCount} reseñas)`
                                    : 'Sin reseñas publicadas'}
                            </span>
                        </div>

                        <div className="mt-7 flex flex-wrap items-end gap-3">
                            <span className="text-4xl font-black tracking-tight text-gray-950 md:text-5xl">S/ {price.toFixed(2)}</span>
                            {hasDiscount && (
                                <>
                                    <span className="pb-1 text-lg font-bold text-gray-400 line-through">S/ {originalPrice.toFixed(2)}</span>
                                    <span className="mb-2 rounded-md bg-red-500 px-2.5 py-1 text-xs font-black text-white">-{discountPct}%</span>
                                </>
                            )}
                        </div>

                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            <div className="flex h-[60px] items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 sm:w-40">
                                <button onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-black text-gray-500 hover:bg-gray-100 hover:text-gray-900">-</button>
                                <span className="text-base font-black text-gray-900">{qty}</span>
                                <button onClick={() => setQty(isOutOfStock ? qty : (stock > 0 ? Math.min(stock, qty + 1) : qty + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl font-black text-gray-500 hover:bg-gray-100 hover:text-gray-900">+</button>
                            </div>
                            <button
                                disabled={isOutOfStock}
                                onClick={handleAddToCart}
                                className="group relative flex h-[60px] flex-1 items-center justify-center gap-3 overflow-hidden rounded-2xl px-6 py-4 text-base font-black text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] disabled:translate-y-0 disabled:bg-gray-300 disabled:shadow-none"
                                style={isOutOfStock ? undefined : {
                                    backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${cp} 88%, #fff) 0%, ${cp} 45%, color-mix(in srgb, ${cp} 80%, #000) 100%)`,
                                    boxShadow: `0 12px 26px -8px ${cp}99, inset 0 1px 0 rgba(255,255,255,0.28)`,
                                }}
                            >
                                {/* Brillo superior sutil */}
                                {!isOutOfStock && (
                                    <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                                )}
                                <span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isOutOfStock ? 'bg-white/30' : 'bg-white/20'}`}>
                                    <Icon icon={isOutOfStock ? 'solar:close-circle-bold' : 'solar:cart-large-minimalistic-bold'} width={20} />
                                </span>
                                <span className="relative truncate tracking-wide">{isOutOfStock ? 'Agotado' : 'Agregar al carrito'}</span>
                            </button>
                        </div>

                        <div className="mt-8 grid gap-3 sm:grid-cols-3">
                            {[
                                ['solar:shield-check-bold-duotone', 'Garantía real', 'Comprobante y soporte'],
                                ['solar:delivery-bold-duotone', 'Despacho seguro', 'Envío o recojo'],
                                ['solar:card-2-bold-duotone', 'Pagos confiables', 'Yape, Plin y más'],
                            ].map(([icon, title, text]) => (
                                <div key={title} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                                    <Icon icon={icon} width={24} style={{ color: cp }} />
                                    <p className="mt-3 text-sm font-black text-gray-900">{title}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-gray-500">{text}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 rounded-2xl bg-[#0B1120] p-6 text-white">
                            <h2 className="text-sm font-black uppercase tracking-widest text-white/80">Ficha técnica</h2>
                            <div className="mt-5 grid gap-3 text-sm">
                                <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                                    <span className="text-white/45">Categoría</span>
                                    <span className="text-right font-bold">{categoria}</span>
                                </div>
                                <div className="flex justify-between gap-4 border-b border-white/10 pb-3">
                                    <span className="text-white/45">Marca</span>
                                    <span className="text-right font-bold">{marca}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-white/45">Disponibilidad</span>
                                    <span className="text-right font-bold">{isOutOfStock ? 'Sin stock' : `${stock} unidades`}</span>
                                </div>
                                {producto.compatibilidad && (
                                    <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
                                        <span className="text-white/45">Compatibilidad</span>
                                        <span className="max-w-[70%] text-right font-bold">{producto.compatibilidad}</span>
                                    </div>
                                )}
                                {destacados.map((c: any, i: number) => (
                                    <div key={`${c.label}-${i}`} className="flex justify-between gap-4 border-t border-white/10 pt-3">
                                        <span className="text-white/45">{c.label}</span>
                                        <span className="max-w-[70%] text-right font-bold">{c.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {producto.descripcionLarga && (
                    <section className="mt-12 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
                        <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: cp }}>Descripción</p>
                        <div className="mt-4 text-sm leading-relaxed text-gray-600 overflow-hidden w-full [&_*]:!whitespace-pre-wrap [&_*]:!break-words [&_*]:!max-w-full" dangerouslySetInnerHTML={{ __html: producto.descripcionLarga }} />
                    </section>
                )}

                {specs.length > 0 && (
                    <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
                        <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: cp }}>Especificaciones</p>
                        <div className="mt-5 overflow-hidden rounded-xl border border-gray-100">
                            {specs.map((spec, i) => (
                                <div
                                    key={`${spec.label}-${i}`}
                                    className={`grid grid-cols-[38%_minmax(0,1fr)] gap-4 px-5 py-3 ${i !== specs.length - 1 ? 'border-b border-gray-100' : ''} ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}
                                >
                                    <span className="text-[11px] font-black uppercase tracking-wide text-gray-500">{spec.label}</span>
                                    <span className="text-[13px] leading-snug text-gray-800">{spec.value}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="mt-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm lg:p-8">
                    <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: cp }}>Reseñas</p>
                    {reviewSummary.ratingCount > 0 ? (
                        <div className="mt-5 space-y-4">
                            <div className="flex items-center gap-3">
                                {renderStars(reviewSummary.ratingAvg, 16)}
                                <span className="text-sm font-black text-gray-900">{reviewSummary.ratingAvg.toFixed(1)} de 5</span>
                                <span className="text-sm font-semibold text-gray-400">({reviewSummary.ratingCount})</span>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                {reviews.slice(0, 6).map((review) => (
                                    <div key={review.id || `${review.clienteNombre}-${review.creadoEn}`} className="rounded-2xl border border-gray-100 p-4">
                                        <div className="mb-2 flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black text-gray-900">{review.clienteNombre || 'Cliente verificado'}</p>
                                                {review.compraVerificada && <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Compra verificada</p>}
                                            </div>
                                            {renderStars(Number(review.rating || 0), 13)}
                                        </div>
                                        {review.comentario && <p className="text-sm leading-relaxed text-gray-500">{review.comentario}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="mt-4 text-sm leading-relaxed text-gray-500">Aún no hay reseñas publicadas para este producto.</p>
                    )}
                </section>

                {related.length > 0 && (
                    <section className="mt-16 border-t border-gray-200 pt-12">
                        <div className="mb-7 flex items-end justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.25em]" style={{ color: cp }}>También te puede interesar</p>
                                <h2 className="mt-2 text-2xl font-black text-gray-950">Productos relacionados</h2>
                            </div>
                            <button onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="hidden text-sm font-black text-gray-500 hover:text-gray-900 sm:inline-flex">
                                Ver catálogo
                            </button>
                        </div>
                        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {related.map(p => (
                                <div key={p.id} className="w-[180px] sm:w-[240px] md:w-[260px] shrink-0 snap-start">
                                    <ProductCardXtra
                                        producto={p}
                                        slug={slug || ''}
                                        diseno={{ ...tienda?.diseno, colorPrimario: cp }}
                                        onAddToCart={() => agregarAlCarrito({ ...p, cantidad: 1 })}
                                        onClick={() => {
                                            navigate(`/tienda/${slug}/producto/${p.id}`);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <TecnologiaFooter tienda={tienda} diseno={tienda?.diseno} slug={slug || ''} categories={allCategories} />

            <TiendaFloatingButtons diseno={tienda?.diseno} tienda={tienda} />

            <TecnologiaCartModal
                isOpen={mostrarCarrito}
                onClose={() => setMostrarCarrito(false)}
                carrito={carrito}
                setCarrito={setCarrito}
                actualizarCantidad={actualizarCantidad}
                onCheckout={() => navigate(`/tienda/${slug}/checkout`)}
                cp={cp}
                tienda={tienda}
            />
        </div>
    );
}
