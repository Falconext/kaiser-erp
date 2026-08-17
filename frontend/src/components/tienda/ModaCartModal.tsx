import { Icon } from '@iconify/react';
import { buildStorePurchaseWhatsappUrl, normalizeStoreWhatsapp } from '@/utils/storeWhatsapp';

interface ModaCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  carrito: any[];
  tienda: any;
  actualizarCantidad: (id: number | string, cantidad: number) => void;
  onCheckout: () => void;
  slug?: string;
  setCarrito?: (carrito: any[]) => void;
}

const recommendations = [
  ['Camisa corset lace-up', 'PLM', 66.8, 76.9, 'https://images.unsplash.com/photo-1507680434567-5739c80be1ac?auto=format&fit=crop&q=90&w=600'],
  ['Conjunto saco arena', 'ARGUE CULTURE', 81.8, 99.8, 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&q=90&w=600'],
  ['Pantalon drape luxe', 'BLAEXIT', 58.9, 67.9, 'https://images.unsplash.com/photo-1506629905607-d405b7a30db9?auto=format&fit=crop&q=90&w=600'],
  ['Traje wide-leg negro', 'ARGUE CULTURE', 91.9, 99.9, 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&q=90&w=600'],
  ['Loafers cuero negro', 'JCAESAR', 149.6, 194.48, 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&q=90&w=600'],
  ['Casaca hooded negra', 'GY', 44.9, 69.9, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=90&w=600'],
] as const;

function money(value: number | string | null | undefined) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function getPrice(item: any) {
  return Number(item?.precioOferta || item?.precioUnitario || item?.precioVenta || item?.precio || 0);
}

function getOriginalPrice(item: any) {
  return Number(item?.precioOriginal || item?.precioVenta || item?.precioUnitario || item?.precio || getPrice(item));
}

export default function ModaCartModal({
  isOpen,
  onClose,
  carrito,
  tienda,
  actualizarCantidad,
  onCheckout,
  setCarrito,
}: ModaCartModalProps) {
  if (!isOpen) return null;

  const subtotal = carrito.reduce((sum, item) => sum + getPrice(item) * Number(item.cantidad || 1), 0);

  const whatsappNumero = tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda;
  const puedeCotizarWhatsapp = !!normalizeStoreWhatsapp(whatsappNumero);

  const cotizarPorWhatsApp = () => {
    if (!carrito.length) return;
    const nombreTienda = tienda?.nombreComercial || tienda?.nombre || 'Tienda';
    const lineas = carrito
      .map((item) => `• ${Number(item.cantidad || 1)}x ${item.descripcion} — ${money(getPrice(item) * Number(item.cantidad || 1))}`)
      .join('\n');
    const mensaje =
      `*SOLICITUD DE COTIZACIÓN — ${nombreTienda}*\n\n` +
      `${lineas}\n\n` +
      `*Total estimado: ${money(subtotal)}*\n\n` +
      `Hola, quisiera cotizar estos productos. ¿Me confirman precio y disponibilidad?`;
    const url = buildStorePurchaseWhatsappUrl(whatsappNumero, mensaje);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };
  const freeShippingGoal = 199;
  const remaining = Math.max(0, freeShippingGoal - subtotal);
  const progress = Math.min(100, (subtotal / freeShippingGoal) * 100);

  const removeItem = (item: any) => {
    // Always go through actualizarCantidad so localStorage is kept in sync.
    // Using setCarrito directly only updates React state but skips the localStorage
    // write, causing deleted items to re-appear on the next addToCart.
    actualizarCantidad(item.id, 0);
  };

  return (
    <div className="fixed inset-0 z-[999999] flex justify-end font-sans" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-[430px] flex-col overflow-hidden rounded-l-[10px] bg-white text-black shadow-2xl">
        <header className="flex h-[44px] items-center justify-between px-4">
          <h2 className="text-[13px] font-black uppercase tracking-[0.02em]">Tu carrito</h2>
          <button onClick={onClose} className="p-1 text-black hover:opacity-60" aria-label="Cerrar carrito">
            <Icon icon="solar:close-circle-linear" width={22} />
          </button>
        </header>

        <div className="px-4 pb-3">
          <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-black transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-center text-[12px]">
            {remaining > 0 ? (
              <>
                Te faltan <strong>{money(remaining)}</strong> para <strong>ENVÍO GRATIS</strong>
              </>
            ) : (
              <strong>Ya tienes ENVÍO GRATIS</strong>
            )}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {carrito.length === 0 ? (
            <section className="px-4 pb-7 pt-8 text-center">
              <h3 className="text-[14px] font-black">Tu carrito está vacío</h3>
              <p className="mt-5 text-[13px]">Agrega tus prendas favoritas para continuar.</p>
              <button onClick={onClose} className="mt-5 h-11 w-full bg-black text-[13px] font-medium text-white hover:bg-neutral-800">
                Comprar ahora
              </button>
            </section>
          ) : (
            <section className="border-t border-neutral-200">
              {carrito.map((item) => {
                const price = getPrice(item);
                const original = getOriginalPrice(item);
                return (
                  <div key={item.id} className="grid grid-cols-[78px_1fr_auto] gap-3 border-b border-neutral-200 px-4 py-4">
                    <div className="h-[84px] overflow-hidden bg-neutral-100">
                      {item.imagenUrl ? (
                        <img src={item.imagenUrl} alt={item.descripcion} className="h-full w-full object-cover object-top" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-neutral-300">
                          <Icon icon="solar:box-linear" width={28} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-[12px] font-black leading-4">{item.descripcion}</h3>
                      <p className="mt-1 text-[11px] text-neutral-500">
                        {item.modificadores?.length ? item.modificadores.map((m: any) => m?.opcionNombre).filter(Boolean).join(' / ') : 'Moda'}
                      </p>
                      <div className="mt-3 inline-grid h-8 grid-cols-3 border border-neutral-200">
                        <button onClick={() => actualizarCantidad(item.id, Math.max(1, Number(item.cantidad || 1) - 1))} className="w-8 text-[14px]">-</button>
                        <span className="flex w-8 items-center justify-center border-x border-neutral-200 text-[12px]">{item.cantidad || 1}</span>
                        <button onClick={() => actualizarCantidad(item.id, Number(item.cantidad || 1) + 1)} className="w-8 text-[14px]">+</button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between">
                      <button onClick={() => removeItem(item)} className="text-neutral-400 hover:text-black" aria-label="Eliminar producto">
                        <Icon icon="solar:trash-bin-trash-linear" width={16} />
                      </button>
                      <div className="text-right text-[12px]">
                        <p className="text-red-500">{money(price)}</p>
                        {original > price && <p className="text-neutral-400 line-through">{money(original)}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          <section className="border-t border-neutral-200 px-4 py-5">
            <h3 className="mb-5 text-center text-[13px] font-black">También te puede gustar</h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-7">
              {recommendations.map(([name, brand, price, original, image]) => (
                <article key={name} className="text-center">
                  <div className="aspect-[0.78] overflow-hidden bg-neutral-100">
                    <img src={image} alt={name} className="h-full w-full object-cover object-top" />
                  </div>
                  <p className="mt-2 line-clamp-1 text-[12px]">{name}</p>
                  <p className="text-[11px] text-neutral-500">{brand}</p>
                  <div className="mt-1 text-[12px]">
                    <span className="text-red-500">{money(price)}</span>
                    <span className="ml-1 text-neutral-400 line-through">{money(original)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {carrito.length > 0 && (
          <footer className="border-t border-neutral-200 bg-white px-4 py-4">
            <div className="mb-3 flex items-center justify-between text-[13px]">
              <span className="font-black">Subtotal ({carrito.length} item{carrito.length === 1 ? '' : 's'})</span>
              <span className="font-black text-red-500">{money(subtotal)}</span>
            </div>
            <button onClick={onCheckout} className="h-11 w-full bg-black text-[13px] font-medium text-white hover:bg-neutral-800">
              Finalizar compra →
            </button>
            {puedeCotizarWhatsapp && (
              <button
                onClick={cotizarPorWhatsApp}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 border border-neutral-300 bg-white text-[13px] font-medium text-neutral-800 transition-colors hover:border-black hover:bg-neutral-50"
              >
                <Icon icon="ic:baseline-whatsapp" width={17} className="text-emerald-600" />
                Cotizar por WhatsApp
              </button>
            )}
            <p className="mt-3 text-center text-[11px] text-neutral-500">Impuestos y envío se calculan al finalizar.</p>
          </footer>
        )}
      </aside>
    </div>
  );
}
