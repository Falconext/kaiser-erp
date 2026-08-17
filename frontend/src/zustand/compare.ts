import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompareItem {
  id: number;
  descripcion: string;
  precioUnitario: number;
  imagenUrl?: string;
  categoria?: string;
  marca?: string;
  stock?: number;
  ratingAvg?: number;
  slug: string;
}

interface CompareStore {
  items: CompareItem[];
  toggle: (item: CompareItem) => void;
  isInCompare: (id: number, slug: string) => boolean;
  remove: (id: number, slug: string) => void;
  clear: (slug: string) => void;
  getBySlug: (slug: string) => CompareItem[];
}

const MAX = 4;

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (item) => {
        const exists = get().items.some(i => i.id === item.id && i.slug === item.slug);
        if (exists) {
          set({ items: get().items.filter(i => !(i.id === item.id && i.slug === item.slug)) });
        } else {
          const bySlug = get().getBySlug(item.slug);
          if (bySlug.length >= MAX) return; // max 4
          set({ items: [...get().items, item] });
        }
      },
      isInCompare: (id, slug) => get().items.some(i => i.id === id && i.slug === slug),
      remove: (id, slug) => set({ items: get().items.filter(i => !(i.id === id && i.slug === slug)) }),
      clear: (slug) => set({ items: get().items.filter(i => i.slug !== slug) }),
      getBySlug: (slug) => get().items.filter(i => i.slug === slug),
    }),
    { name: 'tienda-compare', version: 1 }
  )
);
