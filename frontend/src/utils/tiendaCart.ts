export const tiendaCartKey = (slug: string) => `tienda:${slug}:carrito`;

export const CART_CLEARED_EVENT = 'vendify:tienda-cart-cleared';

export function persistTiendaCart(slug: string, carrito: any[]) {
  if (!slug) return;
  try {
    if (Array.isArray(carrito) && carrito.length > 0) {
      localStorage.setItem(tiendaCartKey(slug), JSON.stringify(carrito));
    } else {
      localStorage.removeItem(tiendaCartKey(slug));
    }
  } catch { }
}

export function clearTiendaCart(slug: string) {
  if (!slug) return;
  try {
    localStorage.removeItem(tiendaCartKey(slug));
    window.dispatchEvent(new CustomEvent(CART_CLEARED_EVENT, { detail: { slug } }));
  } catch { }
}

export function onTiendaCartCleared(slug: string, callback: () => void) {
  const handler = (event: Event) => {
    const detailSlug = (event as CustomEvent<{ slug?: string }>).detail?.slug;
    if (!detailSlug || detailSlug === slug) callback();
  };
  window.addEventListener(CART_CLEARED_EVENT, handler);
  return () => window.removeEventListener(CART_CLEARED_EVENT, handler);
}
