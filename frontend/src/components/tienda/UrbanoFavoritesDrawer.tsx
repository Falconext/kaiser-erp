import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useFavoritosStore } from '@/zustand/favoritos';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

interface UrbanoFavoritesDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    slug: string;
}

export default function UrbanoFavoritesDrawer({ isOpen, onClose, slug }: UrbanoFavoritesDrawerProps) {
    const navigate = useNavigate();
    const { getFavoritosBySlug, removeFavorito, refreshImagenes } = useFavoritosStore();
    const favoritos = getFavoritosBySlug(slug);

    // Las URLs firmadas de S3 expiran (~10 min). Al abrir el drawer, re-obtenemos
    // imágenes frescas para los favoritos persistidos y que no se vean rotas.
    useEffect(() => {
        if (!isOpen || !slug) return;
        const items = getFavoritosBySlug(slug);
        if (items.length === 0) return;
        let cancelled = false;
        (async () => {
            const updates = await Promise.all(
                items.map(async (fav) => {
                    try {
                        const res = await axios.get(`${BASE_URL}/public/store/${slug}/products/${fav.id}`);
                        const prod = res.data?.data || res.data;
                        return prod?.imagenUrl ? { id: fav.id, slug, imagenUrl: prod.imagenUrl as string } : null;
                    } catch {
                        return null;
                    }
                }),
            );
            if (cancelled) return;
            const valid = updates.filter(Boolean) as Array<{ id: number; slug: string; imagenUrl: string }>;
            if (valid.length > 0) refreshImagenes(valid);
        })();
        return () => { cancelled = true; };
    }, [isOpen, slug]);

    if (!isOpen) return null;

    const irAProducto = (id: number) => {
        onClose();
        window.scrollTo(0, 0);
        navigate(`/tienda/${slug}/producto/${id}`);
    };

    return (
        <div className="fixed inset-0 z-[999999] flex justify-end" style={{ fontFamily: '"Inter", sans-serif' }}>
            <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-[420px] bg-white h-full shadow-2xl flex flex-col border-l-2 border-black animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="px-6 py-5 border-b-2 border-black flex items-center justify-between">
                    <h2
                        className="text-xl font-black tracking-tighter uppercase text-black"
                        style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}
                    >
                        Mis Favoritos
                        <span className="ml-2 text-sm font-bold align-middle text-gray-400">({favoritos.length})</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                    >
                        <Icon icon="mdi:close" width={18} />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {favoritos.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                            <Icon icon="solar:heart-linear" className="w-16 h-16 text-gray-300" />
                            <h3 className="text-base font-black uppercase tracking-tighter text-black" style={{ fontFamily: '"Impact", "Arial Black", sans-serif' }}>
                                Aún no tienes favoritos
                            </h3>
                            <button
                                onClick={onClose}
                                className="mt-2 border-2 border-black px-6 py-3 text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-black hover:text-white transition-colors"
                            >
                                Explorar productos
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {favoritos.map((item) => (
                                <div key={item.id} className="flex gap-4">
                                    <div
                                        className="relative w-[88px] h-[110px] bg-[#F4F5F6] flex-shrink-0 overflow-hidden border border-gray-200 cursor-pointer"
                                        onClick={() => irAProducto(item.id)}
                                    >
                                        {item.imagenUrl ? (
                                            <img src={item.imagenUrl} className="w-full h-full object-cover" alt={item.descripcion} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Icon icon="solar:box-linear" className="text-gray-300 w-8 h-8" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 flex flex-col min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3
                                                className="text-[13px] font-bold uppercase text-black line-clamp-2 leading-snug pr-3 cursor-pointer"
                                                onClick={() => irAProducto(item.id)}
                                            >
                                                {item.descripcion}
                                            </h3>
                                            <button
                                                onClick={() => removeFavorito(item.id, slug)}
                                                className="text-gray-300 hover:text-black transition-colors mt-0.5"
                                            >
                                                <Icon icon="solar:trash-bin-trash-linear" width={16} />
                                            </button>
                                        </div>

                                        <p className="text-[12px] font-bold text-gray-500 mb-auto">
                                            S/ {Number(item.precioUnitario).toFixed(2)}
                                        </p>

                                        <button
                                            onClick={() => irAProducto(item.id)}
                                            className="mt-3 w-fit border-2 border-black px-4 py-2 text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-black hover:text-white transition-colors"
                                        >
                                            Ver producto
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
