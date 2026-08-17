import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import LineaTiempoEstados from '@/components/LineaTiempoEstados';
import Footer from '@/components/tienda/Footer';
import { templateRegistry } from '@/templates/registry';
import { resolveTemplateId } from '@/components/tienda/resolveTemplate';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';
import { useStorePreviewNavigation } from '@/utils/useStorePreviewNavigation';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';
const TERMINAL_STATES = ['ENTREGADO', 'ENTREGADO_COMPLETADO', 'CANCELADO', 'CANCELADO_INTERNO', 'CANCELADO_CLIENTE'];
const POLLING_INTERVAL_MS = 30_000;

export default function SeguimientoPedido() {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const previewPlantillaId = searchParams.get('previewPlantilla');
    useStorePreviewNavigation(previewPlantillaId);
    const codigoParam = searchParams.get('codigo');

    const [codigo, setCodigo] = useState(codigoParam || '');
    const [pedido, setPedido] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tienda, setTienda] = useState<any>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (slug) {
            axios.get(`${BASE_URL}/public/store/${slug}`)
                .then(({ data }) => setTienda(data.data || data))
                .catch(console.error);
        }
    }, [slug]);

    useEffect(() => {
        if (codigoParam) {
            buscarPedido(codigoParam);
        }
    }, [codigoParam]);

    const fetchPedidoSilencioso = useCallback(async (codigoBusqueda: string) => {
        try {
            const { data } = await axios.get(`${BASE_URL}/public/store/track/${codigoBusqueda}`);
            const raw: any = data?.data || data;
            const normalizado = {
                ...raw,
                subtotal: Number(raw?.subtotal ?? 0),
                igv: Number(raw?.igv ?? 0),
                total: Number(raw?.total ?? 0),
                costoEnvio: Number(raw?.costoEnvio ?? 0),
                items: (raw?.items || []).map((it: any) => ({
                    ...it,
                    precioUnit: Number(it?.precioUnit ?? it?.precioUnitario ?? 0),
                    subtotal: Number(it?.subtotal ?? 0),
                })),
            };
            setPedido(normalizado);
            setLastUpdated(new Date());
        } catch {
            // silent — don't disrupt the displayed order
        }
    }, []);

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const estadoSeguimiento = getEstadoSeguimiento(pedido);
        if (pedido && !TERMINAL_STATES.includes(estadoSeguimiento)) {
            intervalRef.current = setInterval(() => {
                fetchPedidoSilencioso(pedido.codigoSeguimiento);
            }, POLLING_INTERVAL_MS);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [pedido?.estado, pedido?.estadoEntrega, pedido?.codigoSeguimiento, fetchPedidoSilencioso]);

    // Helpers de diseño
    const diseno = tienda?.diseno || {};
    const getBordeRadius = () => {
        switch (diseno.bordeRadius) {
            case 'none': return 'rounded-none';
            case 'small': return 'rounded';
            case 'large': return 'rounded-2xl';
            case 'full': return 'rounded-3xl';
            default: return 'rounded-xl';
        }
    };
    const getBotonStyle = () => {
        switch (diseno.estiloBoton) {
            case 'square': return 'rounded-none';
            case 'pill': return 'rounded-full';
            default: return 'rounded-lg';
        }
    };
    const getFontFamily = () => {
        switch (diseno.tipografia) {
            case 'Roboto': return 'font-roboto';
            case 'Open Sans': return 'font-opensans';
            case 'Lato': return 'font-lato';
            case 'Montserrat': return 'font-montserrat';
            case 'Poppins': return 'font-poppins';
            case 'Raleway': return 'font-raleway';
            case 'Ubuntu': return 'font-ubuntu';
            case 'Manrope': return 'font-manrope';
            case 'Rubik': return 'font-rubik';
            case 'Inter': return 'font-inter';
            default: return 'font-sans';
        }
    };

    const borderRadius = getBordeRadius();
    const btnRadius = getBotonStyle();
    const fontFamily = getFontFamily();
    const cp = diseno.colorPrimario || '#FF9500';

    const buscarPedido = async (codigoBusqueda: string) => {
        if (!codigoBusqueda.trim()) {
            setError('Ingresa un código de seguimiento');
            return;
        }

        setLoading(true);
        setError('');
        setPedido(null);

        try {
            const { data } = await axios.get(`${BASE_URL}/public/store/track/${codigoBusqueda}`);
            const raw: any = data?.data || data;
            const normalizado = {
                ...raw,
                subtotal: Number(raw?.subtotal ?? 0),
                igv: Number(raw?.igv ?? 0),
                total: Number(raw?.total ?? 0),
                costoEnvio: Number(raw?.costoEnvio ?? 0),
                items: (raw?.items || []).map((it: any) => ({
                    ...it,
                    precioUnit: Number(it?.precioUnit ?? it?.precioUnitario ?? 0),
                    subtotal: Number(it?.subtotal ?? 0),
                })),
            };
            setPedido(normalizado);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Pedido no encontrado');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        buscarPedido(codigo);
    };

    const [copiedLink, setCopiedLink] = useState(false);
    const compartirSeguimiento = () => {
        const url = `${window.location.origin}/tienda/${slug}/seguimiento?codigo=${pedido.codigoSeguimiento}`;
        navigator.clipboard.writeText(url).then(() => {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 2000);
        }).catch(() => {
            if (navigator.share) {
                navigator.share({ title: 'Estado de mi pedido', url });
            }
        });
    };

    const getEstadoSeguimiento = (pedidoActual: any) => (
        pedidoActual?.estadoEntrega || pedidoActual?.estado || 'PENDIENTE'
    );

    const getEstadoColor = (estado: string) => {
        const colors: any = {
            PENDIENTE: 'bg-yellow-100 text-yellow-800',
            CONFIRMADO: 'bg-blue-100 text-blue-800',
            EN_TRANSITO: 'bg-indigo-100 text-indigo-800',
            REPROGRAMADO: 'bg-orange-100 text-orange-800',
            EN_PREPARACION: 'bg-purple-100 text-purple-800',
            LISTO: 'bg-green-100 text-green-800',
            ENTREGADO: 'bg-gray-100 text-gray-800',
            ENTREGADO_COMPLETADO: 'bg-green-100 text-green-800',
            CANCELADO: 'bg-red-100 text-red-800',
            CANCELADO_INTERNO: 'bg-red-100 text-red-800',
            CANCELADO_CLIENTE: 'bg-red-100 text-red-800',
        };
        return colors[estado] || 'bg-gray-100 text-gray-800';
    };

    const getEstadoLabel = (estado: string) => {
        const labels: any = {
            PENDIENTE: 'Pendiente',
            CONFIRMADO: 'Confirmado',
            EN_TRANSITO: 'En tránsito',
            REPROGRAMADO: 'Reprogramado',
            EN_PREPARACION: 'En Preparación',
            LISTO: 'Listo',
            ENTREGADO: 'Entregado',
            ENTREGADO_COMPLETADO: 'Entregado - Completado',
            CANCELADO: 'Cancelado',
            CANCELADO_INTERNO: 'Cancelado',
            CANCELADO_CLIENTE: 'Cancelado',
        };
        return labels[estado] || estado;
    };

    // ── Template Dispatcher ───────────────────────────────────────────────────
    if (tienda && diseno.plantillaId) {
        const templateConfig = templateRegistry[resolveTemplateId(diseno.plantillaId)];
        if (templateConfig?.SeguimientoPage) {
            const TemplateSeguimiento = templateConfig.SeguimientoPage;
            return (
                <TemplateSeguimiento
                    slug={slug || ''}
                    tienda={tienda}
                    diseno={diseno}
                    cp={cp}
                    codigo={codigo}
                    setCodigo={setCodigo}
                    pedido={pedido}
                    loading={loading}
                    error={error}
                    buscarPedido={buscarPedido}
                    handleSubmit={handleSubmit}
                    compartirSeguimiento={compartirSeguimiento}
                    copiedLink={copiedLink}
                    getEstadoSeguimiento={getEstadoSeguimiento}
                    getEstadoColor={getEstadoColor}
                    getEstadoLabel={getEstadoLabel}
                    lastUpdated={lastUpdated}
                    TERMINAL_STATES={TERMINAL_STATES}
                />
            );
        }
    }

    return (
        <div className={`min-h-screen bg-gradient-to-b from-[#F9FBFD] via-[#F6F7F9] to-[#F2F4F7] ${fontFamily}`} style={{ fontFamily: '"Mona Sans", ' + (diseno.tipografia || 'sans-serif') }}>
            <main className="relative overflow-hidden">
                <div className="absolute -top-20 -left-12 w-64 h-64 rounded-full blur-3xl opacity-25" style={{ background: diseno.colorPrimario || '#FF9500' }} />
                <div className="absolute top-20 right-0 w-56 h-56 rounded-full bg-sky-200 blur-3xl opacity-30" />

                <div className="max-w-5xl mx-auto px-4 md:px-6 pt-8 pb-14 relative z-10">
                    <div className="mb-6 flex items-center gap-3">
                        <button
                            onClick={() => navigate(`/tienda/${slug}`)}
                            className="h-11 w-11 rounded-full bg-white/90 shadow-sm border border-gray-200 flex items-center justify-center hover:bg-white transition-colors"
                            aria-label="Volver"
                        >
                            <Icon icon="mdi:chevron-left" className="w-6 h-6 text-[#1A1A1A]" />
                        </button>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-[#8A8F98]">Seguimiento en tiempo real</p>
                            <h1 className="text-2xl md:text-3xl font-black text-[#1A1A1A]">Estado de tu pedido</h1>
                        </div>
                    </div>

                    <div className={`bg-white/95   ${borderRadius} border border-white shadow-xl p-4 md:p-6 mb-6`}>
                        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 md:items-center">
                            <div className={`flex-1 flex items-center gap-2 bg-[#F4F6F8] border border-gray-200 ${borderRadius} px-3 py-3`}>
                                <Icon icon="solar:delivery-linear" className="text-[#FF9500]" width={20} />
                                <input
                                    type="text"
                                    value={codigo}
                                    onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                                    placeholder="Ingresa tu código (ej: PED-ABC123-XYZ)"
                                    className="w-full bg-transparent text-sm md:text-base border-none focus:outline-none text-[#1A1A1A] placeholder:text-[#9CA3AF]"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full md:w-auto px-7 py-3 text-white font-bold ${btnRadius} transition-colors disabled:bg-gray-400`}
                                style={{ backgroundColor: diseno.colorPrimario || '#FF9500' }}
                            >
                                {loading ? 'Buscando...' : 'Buscar pedido'}
                            </button>
                        </form>

                        {error && (
                            <div className={`mt-4 p-3 bg-red-50 text-red-700 border border-red-100 ${borderRadius} flex items-center gap-2`}>
                                <Icon icon="mdi:alert-circle" className="w-5 h-5 flex-shrink-0" />
                                <span className="text-sm font-medium">{error}</span>
                            </div>
                        )}
                    </div>

                    {!pedido && !loading && !error && (
                        <div className={`bg-white ${borderRadius} border border-gray-100 shadow-sm p-6 text-center`}>
                            <div className="mx-auto w-14 h-14 rounded-2xl bg-[#FFF3E0] flex items-center justify-center mb-3">
                                <Icon icon="solar:box-bold-duotone" className="text-[#FF9500]" width={26} />
                            </div>
                            <h3 className="text-lg font-black text-[#1A1A1A] mb-1">Consulta tu pedido</h3>
                            <p className="text-sm text-gray-500">Ingresa el código de seguimiento que recibiste por WhatsApp para ver el avance.</p>
                        </div>
                    )}

                    {pedido && (() => {
                        const estadoSeguimiento = getEstadoSeguimiento(pedido);
                        const tiempoBase = (pedido?.empresa as any)?.tiempoPreparacionMin ?? 20;
                        const estimada = new Date(new Date(pedido.creadoEn).getTime() + tiempoBase * 60000);
                        const horaEstimada = estimada.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' });
                        const fechaEstimada = estimada.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
                        const whatsappUrl = buildStorePurchaseWhatsappUrl(tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda ?? diseno?.whatsappTienda, `Hola, necesito ayuda con mi pedido ${pedido.codigoSeguimiento || ''}.`);

                        return (
                            <div className="space-y-5">
                                <div className={`bg-white ${borderRadius} shadow-sm border border-gray-100 p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`h-11 w-11 ${borderRadius} flex items-center justify-center`} style={{ backgroundColor: `${diseno.colorPrimario || '#FF9500'}1A`, color: diseno.colorPrimario || '#FF9500' }}>
                                            <Icon icon="mdi:clock-fast" className="w-5 h-5" />
                                        </span>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-wider text-gray-500">Entrega estimada</p>
                                            <p className="text-sm font-semibold text-[#1A1A1A]">{fechaEstimada}</p>
                                        </div>
                                    </div>
                                    <div className="text-left md:text-right">
                                        <p className="text-xl font-black text-[#1A1A1A]">{horaEstimada}</p>
                                        <p className="text-xs text-gray-500">{tiempoBase}-{tiempoBase + 10} minutos</p>
                                    </div>
                                </div>

                                <div className={`bg-white ${borderRadius} shadow-sm border border-gray-100 p-4 md:p-6`}>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
                                        <h2 className="text-lg font-black text-[#1A1A1A]">Seguimiento del pedido</h2>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-sm font-bold break-all" style={{ color: diseno.colorPrimario || '#FF9500' }}>#{pedido.codigoSeguimiento}</span>
                                            <button
                                                onClick={compartirSeguimiento}
                                                className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-gray-400 transition-colors"
                                            >
                                                <Icon icon={copiedLink ? 'mdi:check' : 'mdi:share-variant'} className="w-3.5 h-3.5" />
                                                {copiedLink ? '¡Copiado!' : 'Compartir'}
                                            </button>
                                            {!TERMINAL_STATES.includes(estadoSeguimiento) && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="text-xs text-gray-500">
                                                        En vivo{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}` : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-5 gap-3">
                                        <span className={`px-3 py-1.5 ${borderRadius} text-xs font-bold ${getEstadoColor(estadoSeguimiento)}`}>{getEstadoLabel(estadoSeguimiento)}</span>
                                        <div className="text-xs md:text-sm text-gray-500">{new Date(pedido.creadoEn).toLocaleString('es-PE')}</div>
                                    </div>

                                    {pedido.historialEstados && pedido.historialEstados.length > 0 ? (
                                        <LineaTiempoEstados historial={pedido.historialEstados} estadoActual={estadoSeguimiento} />
                                    ) : (
                                        <p className="text-sm text-gray-500">No hay historial disponible.</p>
                                    )}
                                </div>

                                <div className={`bg-white ${borderRadius} shadow-sm border border-gray-100 p-4 md:p-6`}>
                                    <h3 className="text-lg font-black text-[#1A1A1A] mb-4">Detalle de la orden #{pedido.codigoSeguimiento}</h3>

                                    <div className="space-y-2.5 mb-5">
                                        {pedido.items.map((item: any) => (
                                            <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-[#FAFBFC]">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {item.producto?.imagenUrl ? (
                                                        <img src={item.producto.imagenUrl} alt={item.producto.descripcion} className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                                                            <Icon icon="mdi:image-off" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-sm text-[#1A1A1A]">{item.producto.descripcion}</p>
                                                        <p className="text-xs text-gray-500">{item.cantidad} item{item.cantidad > 1 ? 's' : ''}</p>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-black text-[#1A1A1A]">S/ {item.subtotal.toFixed(2)}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="rounded-xl border border-gray-100 bg-[#FAFBFC] p-4 space-y-2 text-sm">
                                        <div className="flex justify-between text-gray-600">
                                            <span>Subtotal</span>
                                            <span>S/ {Number(pedido.subtotal).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                            <span>Delivery</span>
                                            <span>{pedido.costoEnvio > 0 ? `S/ ${pedido.costoEnvio.toFixed(2)}` : 'Gratis'}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                            <span>Tiempo entrega</span>
                                            <span>{tiempoBase}-{tiempoBase + 10} min</span>
                                        </div>
                                        <div className="flex justify-between font-black text-[#1A1A1A] pt-2 border-t border-gray-200">
                                            <span>Total</span>
                                            <span>S/ {(Number(pedido.subtotal) + Number(pedido.costoEnvio)).toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {whatsappUrl && (
                                            <a
                                                href={whatsappUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`flex items-center justify-center gap-2 w-full bg-green-600 text-white py-3 ${btnRadius} font-bold hover:bg-green-700 transition-colors`}
                                            >
                                                <Icon icon="mdi:whatsapp" className="w-5 h-5" />
                                                Contactar al negocio
                                            </a>
                                        )}

                                        <button
                                            onClick={() => navigate(`/tienda/${slug}`)}
                                            className={`w-full py-3 ${btnRadius} font-bold text-white transition-opacity hover:opacity-90`}
                                            style={{ backgroundColor: diseno.colorPrimario || '#FF9500' }}
                                        >
                                            Volver a la tienda
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </main>

            <Footer tienda={tienda || {}} diseno={diseno} />
        </div>
    );
}
