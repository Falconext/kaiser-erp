import type { NavigateFunction } from 'react-router-dom';
import type { LinkFieldTarget } from '@/components/tienda/liveEditorFields';

export interface StoreLinkAction {
  type: LinkFieldTarget;
  value?: string | null;
  productId?: number | string | null;
  url?: string | null;
}

interface ResolveOptions {
  defaultType?: LinkFieldTarget;
  fallbackValue?: string | null;
}

interface RunOptions {
  slug: string;
  navigate: NavigateFunction;
  fallback?: StoreLinkAction;
  previewQuery?: string;
}

const VALID_TYPES = new Set<LinkFieldTarget>(['catalog', 'category', 'search', 'product', 'url', 'none']);

export function getStoreLinkAction(diseno: any, key: string, options: ResolveOptions = {}): StoreLinkAction {
  const rawType = diseno?.[`${key}Type`] || options.defaultType || 'catalog';
  const type = VALID_TYPES.has(rawType) ? rawType : 'catalog';

  return {
    type,
    value: diseno?.[`${key}Value`] ?? options.fallbackValue ?? null,
    productId: diseno?.[`${key}ProductId`] ?? null,
    url: diseno?.[`${key}Url`] ?? null,
  };
}

/**
 * Indica si el empresario configuró explícitamente un enlace (botón/banner) con
 * un destino utilizable. Sirve para mostrar elementos opcionales (ej. el botón
 * "Ver Promoción") solo cuando hay algo a dónde llevar.
 */
export function isLinkActionConfigured(diseno: any, key: string): boolean {
  const rawType = diseno?.[`${key}Type`];
  if (!rawType || !VALID_TYPES.has(rawType) || rawType === 'none') return false;
  if (rawType === 'product') return !!String(diseno?.[`${key}ProductId`] ?? '').trim();
  if (rawType === 'category' || rawType === 'search') return !!String(diseno?.[`${key}Value`] ?? '').trim();
  if (rawType === 'url') return !!String(diseno?.[`${key}Url`] ?? '').trim();
  // 'catalog' es un destino válido elegido a propósito
  return rawType === 'catalog';
}

export function runStoreLinkAction(action: StoreLinkAction, options: RunOptions) {
  const target = normalizeAction(action, options.fallback);
  if (target.type === 'none') return;

  if (options.slug === 'preview') {
    window.dispatchEvent(new CustomEvent('preview-nav', { detail: target.type === 'product' ? 'producto' : 'catalogo' }));
    return;
  }

  const base = `/tienda/${options.slug}`;
  const value = String(target.value || '').trim();
  const productId = String(target.productId || '').trim();
  const appendPreview = (url: string) => {
    const query = String(options.previewQuery || '').replace(/^\?/, '');
    if (!query) return url;
    return `${url}${url.includes('?') ? '&' : '?'}${query}`;
  };

  if (target.type === 'product' && productId) {
    options.navigate(appendPreview(`${base}/producto/${encodeURIComponent(productId)}`));
    return;
  }

  if (target.type === 'category' && value) {
    options.navigate(appendPreview(`${base}/catalogo?category=${encodeURIComponent(value)}`));
    return;
  }

  if (target.type === 'search' && value) {
    options.navigate(appendPreview(`${base}/catalogo?search=${encodeURIComponent(value)}`));
    return;
  }

  if (target.type === 'url' && target.url) {
    window.open(target.url, '_blank', 'noopener,noreferrer');
    return;
  }

  options.navigate(appendPreview(`${base}/catalogo`));
}

function normalizeAction(action: StoreLinkAction, fallback?: StoreLinkAction): StoreLinkAction {
  if (action.type === 'category' && !action.value && fallback?.value) return { ...action, value: fallback.value };
  if (action.type === 'search' && !action.value && fallback?.value) return { ...action, value: fallback.value };
  if (action.type === 'product' && !action.productId && fallback?.productId) return { ...action, productId: fallback.productId };
  if (action.type === 'url' && !action.url && fallback?.url) return { ...action, url: fallback.url };
  return action;
}
