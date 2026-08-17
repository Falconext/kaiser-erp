import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import AutopartesHeader from '@/components/tienda/AutopartesHeader';
import Footer from '@/components/tienda/Footer';
import AutopartesCartModal from '@/components/tienda/AutopartesCartModal';
import ProductCardGromuse from '@/components/tienda/ProductCardGromuse';
import { onTiendaCartCleared } from '@/utils/tiendaCart';
import { withPricing, withPricingList } from '@/templates/shared/pricing';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

const QUILL_PROSE = [
  'text-sm text-gray-400 leading-relaxed break-words overflow-hidden w-full',
  '[&_h1]:text-xl [&_h1]:font-black [&_h1]:text-white [&_h1]:mb-3 [&_h1]:mt-5',
  '[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-4',
  '[&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-gray-200 [&_h3]:mb-2 [&_h3]:mt-3',
  '[&_p]:mb-3 [&_p]:leading-relaxed [&_p]:break-words',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ul]:space-y-1',
  '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_ol]:space-y-1',
  '[&_li]:text-gray-400',
  '[&_strong]:font-bold [&_strong]:text-gray-200',
  '[&_em]:italic',
  '[&_a]:underline [&_a]:text-blue-400',
  '[&_table]:w-full [&_table]:text-xs [&_table]:border-collapse [&_table]:mb-4',
  '[&_td]:border [&_td]:border-gray-800 [&_td]:px-3 [&_td]:py-2',
  '[&_th]:border [&_th]:border-gray-800 [&_th]:px-3 [&_th]:py-2 [&_th]:bg-[#1A1A1A] [&_th]:font-bold [&_th]:text-white',
].join(' ');

export default function AutopartesProductoDetalle() {
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
            setProducto(withPricing(data.data || data));

            // Fetch related
            const category = (data.data || data).categoria;
            if (category) {
                const res = await axios.get(`${BASE_URL}/public/store/${slug}/products`, {
                    params: { category, limit: 4 }
                });
                const arr = Array.isArray(res.data?.data?.data) ? res.data.data.data : Array.isArray(res.data?.data) ? res.data.data : [];
                setRelated(withPricingList(arr.filter((p: any) => p.id !== Number(id)).slice(0, 4)));
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

    const images = [producto.imagenUrl, ...(producto.imagenesExtra || [])].filter(Boolean);
    const isOutOfStock = Number(producto.stock) <= 0;
    const price = Number(producto.precioUnitario).toFixed(2);
    const original = Number(producto.precioOriginal || 0).toFixed(2);
    const hasDiscount = Number(original) > Number(price);

    return (
        <div className="min-h-screen bg-[#F8F9FA]" style={{ fontFamily: `'${tienda?.diseno?.tipografia || 'Inter'}', sans-serif` }}>
            
            <AutopartesHeader 
                tienda={tienda}
                slug={slug || ''}
                cp={cp}
                carritoSize={carrito.length}
                onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
                searchQuery={search}
                setSearchQuery={setSearch}
                onSearchSubmit={(e, value) => { e.preventDefault(); if(value?.trim()) navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(value.trim())}`); }}
                allCategories={[]}
            />

            <main className="w-full max-w-7xl mx-auto px-4 xl:px-8 py-10">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-8 uppercase tracking-wider">
                    <button onClick={() => navigate(`/tienda/${slug}`)} className="hover:text-gray-900 transition-colors">Inicio</button>
                    <Icon icon="solar:alt-arrow-right-linear" />
                    <button onClick={() => navigate(`/tienda/${slug}/catalogo`)} className="hover:text-gray-900 transition-colors">Catálogo</button>
                    <Icon icon="solar:alt-arrow-right-linear" />
                    <span className="text-gray-900 truncate max-w-[200px]">{producto.descripcion}</span>
                </div>

                <div className="flex flex-col lg:flex-row gap-10">
                    
                    {/* Left: Images */}
                    <div className="w-full lg:w-[45%]">
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden aspect-square flex items-center justify-center p-8 mb-4 relative">
                            {images.length > 0 ? (
                                <img src={images[activeImage]} alt={producto.descripcion} className="w-full h-full object-contain" />
                            ) : (
                                <Icon icon="solar:box-linear" className="w-32 h-32 text-gray-200" />
                            )}
                            {hasDiscount && (
                                <span className="absolute top-6 left-6 text-[10px] font-black bg-red-500 text-white px-3 py-1 uppercase tracking-widest rounded shadow-sm">
                                    Sale
                                </span>
                            )}
                        </div>
                        {images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                {images.map((img, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => setActiveImage(i)}
                                        className={`w-20 h-20 rounded-xl border-2 flex-shrink-0 bg-white overflow-hidden p-2 transition-colors ${activeImage === i ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-contain" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Info */}
                    <div className="flex-1 w-full">
                        <div className="mb-2">
                            {producto.marca && (
                                <span className="inline-block bg-[#1A1A1A] text-white text-[10px] font-black px-3 py-1 rounded uppercase tracking-widest mb-3">
                                    {typeof producto.marca === 'object' ? producto.marca.nombre : producto.marca}
                                </span>
                            )}
                            <h1 className="text-3xl lg:text-4xl font-black text-gray-900 leading-tight tracking-tight">
                                {producto.descripcion}
                            </h1>
                        </div>

                        {/* Part Number & Badges */}
                        <div className="flex flex-wrap items-center gap-4 mt-4 pb-6 border-b border-gray-200">
                            <div className="flex items-center gap-2 bg-gray-100 rounded border border-gray-200 px-3 py-1.5">
                                <Icon icon="solar:tag-bold" className="text-gray-400 text-sm" />
                                <span className="text-xs font-bold text-gray-500 uppercase">Código:</span>
                                <span className="text-sm font-mono font-black text-gray-900">{producto.partNumber || producto.codigo || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded">
                                <Icon icon="solar:shield-check-bold" />
                                Guaranteed Fit
                            </div>
                        </div>

                        {/* Price */}
                        <div className="py-6 flex items-end gap-4">
                            <span className="text-4xl lg:text-5xl font-black text-gray-900">S/ {price}</span>
                            {hasDiscount && (
                                <span className="text-xl text-gray-400 font-bold line-through mb-1">S/ {original}</span>
                            )}
                        </div>

                        <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-2xl">
                            {producto.descripcionLarga?.replace(/<[^>]+>/g, '').substring(0, 150)}
                            {producto.descripcionLarga?.length > 150 ? '...' : ''}
                        </p>

                        {/* Actions */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col sm:flex-row gap-4 items-end">
                            <div className="w-full sm:w-auto">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Cantidad</label>
                                <div className="flex items-center bg-[#F8F9FA] rounded-md border border-gray-200 h-[52px]">
                                    <button 
                                        onClick={() => setQty(Math.max(1, qty - 1))}
                                        className="w-12 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
                                    >
                                        <Icon icon="solar:minus-linear" />
                                    </button>
                                    <span className="w-12 text-center text-lg font-black text-gray-900">
                                        {qty}
                                    </span>
                                    <button 
                                        onClick={() => setQty(qty + 1)}
                                        className="w-12 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
                                    >
                                        <Icon icon="solar:add-linear" />
                                    </button>
                                </div>
                            </div>

                            <button 
                                disabled={isOutOfStock}
                                onClick={handleAddToCart}
                                className="flex-1 h-[52px] rounded-md flex items-center justify-center gap-2 text-white font-black uppercase tracking-widest transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                                style={{ backgroundColor: isOutOfStock ? '#9CA3AF' : cp }}
                            >
                                <Icon icon={isOutOfStock ? "solar:close-circle-bold" : "solar:cart-large-minimalistic-bold"} width={20} />
                                {isOutOfStock ? 'Agotado' : 'Agregar al Carrito'}
                            </button>
                        </div>

                        {/* Specs quick view */}
                        {(producto.compatibilidad || producto.caracteristicas?.length > 0) && (
                            <div className="mt-8 bg-[#1A1A1A] rounded-2xl p-6 border border-gray-800 text-white">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                                    <Icon icon="solar:settings-bold" /> Especificaciones Técnicas
                                </h3>
                                <div className="space-y-3 text-sm">
                                    {producto.compatibilidad && (
                                        <div className="flex">
                                            <span className="w-32 font-bold text-gray-500">Compatibilidad</span>
                                            <span className="flex-1 text-gray-300 font-medium">{producto.compatibilidad}</span>
                                        </div>
                                    )}
                                    {producto.caracteristicas?.slice(0, 4).map((c: any, i: number) => (
                                        <div key={i} className="flex">
                                            <span className="w-32 font-bold text-gray-500">{c.nombre}</span>
                                            <span className="flex-1 text-gray-300 font-medium">{c.valor}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Full Description & Specs Tabs */}
                <div className="mt-16 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                     <div className="flex border-b border-gray-200 bg-gray-50">
                        <button className="px-8 py-4 text-sm font-black uppercase tracking-widest border-b-2 bg-white" style={{ borderColor: cp, color: cp }}>
                            Description
                        </button>
                        {producto.caracteristicas?.length > 0 && (
                            <button className="px-8 py-4 text-sm font-bold uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">
                                Specifications
                            </button>
                        )}
                     </div>
                     <div className="p-8 lg:p-10">
                        {producto.descripcionLarga ? (
                            <div className={`prose max-w-none text-gray-600 ${QUILL_PROSE}`} dangerouslySetInnerHTML={{ __html: producto.descripcionLarga }} />
                        ) : (
                            <p className="text-gray-500 italic">No hay descripción disponible para este producto.</p>
                        )}
                     </div>
                </div>

                {/* Related Products */}
                {related.length > 0 && (
                    <div className="mt-20">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest mb-8 border-l-4 pl-4" style={{ borderColor: cp }}>
                            Productos Relacionados
                        </h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {related.map(p => (
                                <ProductCardGromuse
                                    key={p.id}
                                    producto={p}
                                    slug={slug || ''}
                                    diseno={tienda?.diseno}
                                    onAddToCart={() => agregarAlCarrito({ ...p, cantidad: 1 })}
                                    onClick={() => navigate(`/tienda/${slug}/producto/${p.id}`)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </main>

            <Footer tienda={tienda} diseno={tienda?.diseno} slug={slug} />

            <AutopartesCartModal 
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
