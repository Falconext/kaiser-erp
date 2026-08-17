import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import axios from 'axios';
import FalconBlog from './FalconBlog';
import { resolveTemplateId } from '@/components/tienda/resolveTemplate';
import { useStorePreviewNavigation } from '@/utils/useStorePreviewNavigation';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

// Templates that ship a dedicated blog page. Others redirect to the store home.
const BLOG_PAGE_BY_TEMPLATE: Record<string, ComponentType> = {
  falcon: FalconBlog,
};

export default function BlogRouter() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const previewPlantillaId = searchParams.get('previewPlantilla');
  useStorePreviewNavigation(previewPlantillaId);
  const [plantillaId, setPlantillaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (previewPlantillaId) {
      setPlantillaId(previewPlantillaId);
      setLoading(false);
      return;
    }
    if (!slug) return;
    axios.get(`${BASE_URL}/public/store/${slug}`)
      .then((res) => {
        const tienda = res.data.data || res.data;
        setPlantillaId(tienda?.diseno?.plantillaId || '');
      })
      .catch(() => setPlantillaId(''))
      .finally(() => setLoading(false));
  }, [slug, previewPlantillaId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Icon icon="eos-icons:loading" className="h-12 w-12 animate-spin text-gray-300" />
      </div>
    );
  }

  const BlogPage = BLOG_PAGE_BY_TEMPLATE[resolveTemplateId(plantillaId)];
  if (BlogPage) return <BlogPage />;
  return <Navigate to={`/tienda/${slug}${previewPlantillaId ? `?previewPlantilla=${encodeURIComponent(previewPlantillaId)}&previewOrigen=template` : ''}`} replace />;
}
