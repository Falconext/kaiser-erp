import axios from '@/utils/apiClient';

export interface StoreProduct {
  id: number;
  name: string;
  description: string | null;
  price: number;
  oldPrice: number | null;
  imageUrl: string | null;
  badge: string | null;
  category: string | null;
  stock: number | null;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreProductPayload {
  name: string;
  description?: string;
  price: number;
  oldPrice?: number | null;
  imageUrl?: string;
  badge?: string;
  category?: string;
  stock?: number | null;
  isActive?: boolean;
  order?: number;
}

const extract = (res: any): any => res.data?.data ?? res.data;

const storeCatalogService = {
  getAll: async (): Promise<StoreProduct[]> => {
    const res = await axios.get('/store-catalog');
    return extract(res);
  },

  create: async (payload: StoreProductPayload): Promise<StoreProduct> => {
    const res = await axios.post('/store-catalog', payload);
    return extract(res);
  },

  update: async (id: number, payload: Partial<StoreProductPayload>): Promise<StoreProduct> => {
    const res = await axios.patch(`/store-catalog/${id}`, payload);
    return extract(res);
  },

  remove: async (id: number): Promise<void> => {
    await axios.delete(`/store-catalog/${id}`);
  },
};

export default storeCatalogService;
