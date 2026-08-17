import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FavoritoItem {
    id: number;
    descripcion: string;
    precioUnitario: number;
    imagenUrl?: string;
    slug: string;
}

interface FavoritosStore {
    favoritos: FavoritoItem[];
    toggleFavorito: (producto: FavoritoItem) => void;
    isFavorito: (productoId: number, slug: string) => boolean;
    getFavoritosBySlug: (slug: string) => FavoritoItem[];
    removeFavorito: (productoId: number, slug: string) => void;
    refreshImagenes: (updates: Array<{ id: number; slug: string; imagenUrl: string }>) => void;
}

export const useFavoritosStore = create<FavoritosStore>()(
    persist(
        (set, get) => ({
            favoritos: [],
            toggleFavorito: (producto) => {
                const exists = get().favoritos.some(f => f.id === producto.id && f.slug === producto.slug);
                set({
                    favoritos: exists
                        ? get().favoritos.filter(f => !(f.id === producto.id && f.slug === producto.slug))
                        : [...get().favoritos, producto],
                });
            },
            isFavorito: (productoId, slug) =>
                get().favoritos.some(f => f.id === productoId && f.slug === slug),
            getFavoritosBySlug: (slug) =>
                get().favoritos.filter(f => f.slug === slug),
            removeFavorito: (productoId, slug) =>
                set({ favoritos: get().favoritos.filter(f => !(f.id === productoId && f.slug === slug)) }),
            refreshImagenes: (updates) => {
                const map = new Map(updates.map(u => [`${u.id}:${u.slug}`, u.imagenUrl]));
                set({
                    favoritos: get().favoritos.map(f => {
                        const newUrl = map.get(`${f.id}:${f.slug}`);
                        return newUrl ? { ...f, imagenUrl: newUrl } : f;
                    }),
                });
            },
        }),
        { name: 'tienda-favoritos', version: 1 }
    )
);
