import { useEffect } from 'react';

const isModifiedClick = (event: MouseEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

export function withStorePreviewParams(url: unknown, previewPlantillaId?: string | null) {
  if (!previewPlantillaId || typeof url === 'undefined' || url === null) return url;

  const raw = String(url);
  if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) {
    return url;
  }

  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin || !parsed.pathname.startsWith('/tienda/')) return url;
    if (!parsed.searchParams.has('previewPlantilla')) {
      parsed.searchParams.set('previewPlantilla', previewPlantillaId);
    }
    if (!parsed.searchParams.has('previewOrigen')) {
      parsed.searchParams.set('previewOrigen', 'template');
    }

    if (/^https?:\/\//i.test(raw)) return parsed.toString();
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

export function useStorePreviewNavigation(previewPlantillaId?: string | null) {
  useEffect(() => {
    if (!previewPlantillaId) return;

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = ((state: any, unused: string, url?: string | URL | null) => {
      return originalPushState(state, unused, withStorePreviewParams(url, previewPlantillaId) as any);
    }) as typeof window.history.pushState;

    window.history.replaceState = ((state: any, unused: string, url?: string | URL | null) => {
      return originalReplaceState(state, unused, withStorePreviewParams(url, previewPlantillaId) as any);
    }) as typeof window.history.replaceState;

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) return;
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return;

      const next = withStorePreviewParams(anchor.getAttribute('href'), previewPlantillaId);
      if (typeof next === 'string' && next !== anchor.getAttribute('href')) {
        anchor.setAttribute('href', next);
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      window.history.pushState = originalPushState as typeof window.history.pushState;
      window.history.replaceState = originalReplaceState as typeof window.history.replaceState;
      document.removeEventListener('click', handleClick, true);
    };
  }, [previewPlantillaId]);
}
