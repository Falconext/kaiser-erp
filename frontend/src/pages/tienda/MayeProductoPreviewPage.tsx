import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { motion } from 'framer-motion';
import MayeHeader from '@/components/tienda/MayeHeader';
import MayeFooter from '@/components/tienda/MayeFooter';
import MayeCartModal from '@/components/tienda/MayeCartModal';
import ProductCardMaye from '@/components/tienda/ProductCardMaye';
import { mayeCard, mayePage, mayeSection, mayeStagger, mayeTap } from '@/lib/motion/maye';
import { getProductPricing } from '@/templates/shared/pricing';

interface MayeProductoPreviewPageProps {
  producto: any;
  demo: any;
  cp: string;
  diseno: any;
  carrito: any[];
  setCarrito: (items: any[]) => void;
  mostrarCarrito: boolean;
  setMostrarCarrito: (value: boolean) => void;
  actualizarCantidad: (id: number | string, cantidad: number) => void;
  onNav: (page: 'home' | 'catalogo' | 'producto' | 'checkout') => void;
  onProduct: (producto: any) => void;
  onAddToCart: (producto: any) => void;
}

export function MayeProductoPreviewPage({
  producto,
  demo,
  cp,
  diseno,
  carrito,
  setCarrito,
  mostrarCarrito,
  setMostrarCarrito,
  actualizarCantidad,
  onNav,
  onProduct,
  onAddToCart,
}: MayeProductoPreviewPageProps) {
  const [search, setSearch] = useState('');
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('specifications');

  const tienda = useMemo(() => ({
    nombre: demo.storeName,
    nombreComercial: demo.storeName,
    razonSocial: demo.storeName,
    slogan: demo.slogan,
    diseno,
  }), [demo, diseno]);

  const allCategories = useMemo(
    () => (demo.categories || []).filter((category: string) => category !== 'Todos').map((nombre: string) => ({ nombre })),
    [demo.categories],
  );

  const related = useMemo(
    () => (demo.products || []).filter((item: any) => item.id !== producto.id).slice(0, 4),
    [demo.products, producto.id],
  );

  const images = useMemo(() => {
    const extra = Array.isArray(producto?.imagenesExtra) ? producto.imagenesExtra : [];
    return [producto?.imagenUrl, ...extra].filter(Boolean);
  }, [producto]);

  const categoryName = typeof producto.categoria === 'object' ? producto.categoria?.nombre : producto.categoria;
  const brandName = typeof producto.marca === 'object' ? producto.marca?.nombre : producto.marca;
  const pricing = getProductPricing(producto);
  const priceValue = pricing.precioFinal;
  const originalValue = pricing.enOferta ? pricing.precioRegular : 0;
  const hasDiscount = pricing.enOferta;
  const discount = pricing.porcentajeDescuento;
  const pricedProduct = {
    ...producto,
    precioUnitario: priceValue,
    precioRegular: pricing.precioRegular,
    precioOriginal: hasDiscount ? pricing.precioRegular : null,
    precioOferta: hasDiscount ? priceValue : null,
    enOferta: hasDiscount,
    descuentoOferta: discount,
  };
  const isOutOfStock = Number(producto.stock ?? 0) <= 0;
  const ratingCount = Number(producto.ratingCount ?? producto.reviewsCount ?? 0);
  const ratingAvg = ratingCount > 0 ? Number(producto.ratingAvg || 0) : 0;
  const carritoTotal = carrito.reduce((total, item) => total + Number(item.precioUnitario || 0) * Number(item.cantidad || 1), 0);

  const specs = [
    { label: 'Marca', value: brandName },
    { label: 'Categoria', value: categoryName },
    { label: 'Stock', value: `${Number(producto.stock || 0)} unidades` },
    { label: 'Codigo', value: producto.codigo || producto.partNumber },
    ...(Array.isArray(producto.caracteristicas) ? producto.caracteristicas.map((item: any) => ({ label: item.nombre, value: item.valor })) : []),
  ].filter(item => item.value);

  const specPairs = [];
  for (let i = 0; i < specs.length; i += 2) specPairs.push(specs.slice(i, i + 2));

  const handleAdd = () => {
    if (isOutOfStock) return;
    for (let i = 0; i < qty; i += 1) onAddToCart(pricedProduct);
    setMostrarCarrito(true);
  };

  const renderStars = (size = 18) => (
    <div className="flex" style={{ color: '#F5B01D' }}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon key={index} icon={index < Math.round(ratingAvg) ? 'solar:star-bold' : 'solar:star-linear'} width={size} />
      ))}
    </div>
  );

  return (
    <motion.div className="min-h-screen bg-white" style={{ fontFamily: `'${diseno?.tipografia || 'Inter'}', sans-serif` }} variants={mayePage} initial="initial" animate="animate" exit="exit">
      <MayeHeader
        tienda={tienda}
        slug="preview"
        cp={cp}
        carritoSize={carrito.length}
        carritoTotal={carritoTotal}
        onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
        searchQuery={search}
        setSearchQuery={setSearch}
        onSearchSubmit={(event) => {
          event.preventDefault();
          onNav('catalogo');
        }}
        allCategories={allCategories}
        diseno={diseno}
      />

      <motion.main className="mx-auto w-full max-w-7xl px-4 py-8 md:py-10 xl:px-8" variants={mayeStagger}>
        <motion.div className="mb-7 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400" variants={mayeCard}>
          <button onClick={() => onNav('home')} className="hover:text-gray-950">Inicio</button>
          <Icon icon="solar:alt-arrow-right-linear" />
          <button onClick={() => onNav('catalogo')} className="hover:text-gray-950">Catalogo</button>
          {categoryName && (
            <>
              <Icon icon="solar:alt-arrow-right-linear" />
              <button onClick={() => onNav('catalogo')} className="hover:text-gray-950">{categoryName}</button>
            </>
          )}
        </motion.div>

        <motion.section className="grid gap-8 lg:grid-cols-[minmax(0,1.03fr)_minmax(360px,0.97fr)]" variants={mayeSection}>
          <div>
            <div className="relative overflow-hidden rounded-3xl bg-[#F4F5F6] p-5">
              {hasDiscount && (
                <span className="absolute left-5 top-5 z-10 rounded-md px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: cp }}>
                  Ahorra {discount}%
                </span>
              )}
              <div className="flex aspect-square items-center justify-center rounded-2xl">
                {images.length > 0 ? (
                  <motion.img
                    src={images[activeImage] || images[0]}
                    alt={producto.descripcion}
                    className="h-full w-full object-contain mix-blend-multiply"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                ) : (
                  <Icon icon="solar:box-linear" className="h-32 w-32 text-gray-200" />
                )}
              </div>
            </div>

            {images.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {images.map((image: string, index: number) => (
                  <button
                    key={`${image}-${index}`}
                    onClick={() => setActiveImage(index)}
                    className="h-20 w-20 flex-shrink-0 rounded-2xl border-2 bg-white p-2 transition-colors"
                    style={activeImage === index ? { borderColor: cp } : { borderColor: 'transparent' }}
                  >
                    <img src={image} alt="" className="h-full w-full object-contain mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 lg:pl-4">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${isOutOfStock ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-600'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isOutOfStock ? 'bg-gray-400' : 'bg-emerald-500'}`} />
              {isOutOfStock ? 'Sin stock' : 'En stock'}
            </span>

            <h1 className="mt-4 text-3xl font-black leading-[1.1] tracking-tight text-gray-950 md:text-[2.75rem]">{producto.descripcion}</h1>

            <button onClick={() => setActiveTab('reviews')} className="mt-4 flex flex-wrap items-center gap-2">
              {renderStars(18)}
              <span className="text-sm font-bold text-gray-700">{ratingAvg.toFixed(1)}</span>
              <span className="text-sm text-gray-400">({ratingCount} resenas)</span>
            </button>

            <div className="mt-6 flex flex-wrap items-end gap-3">
              <span className="text-4xl font-black tracking-tight text-gray-950 md:text-[2.75rem]">S/ {priceValue.toFixed(2)}</span>
              {hasDiscount && <span className="mb-1.5 text-xl font-semibold text-gray-400 line-through">S/ {originalValue.toFixed(2)}</span>}
              {hasDiscount && <span className="mb-2 rounded-md px-2 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: cp }}>-{discount}%</span>}
            </div>

            <div className="mt-6">
              <p className="mb-3 text-xs font-black uppercase tracking-wider text-gray-400">Cantidad</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[156px_minmax(0,1fr)]">
                <div className="flex min-h-[56px] w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-1">
                  <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50"><Icon icon="solar:minus-linear" /></button>
                  <span className="min-w-12 text-center text-lg font-black text-gray-950">{qty}</span>
                  <button type="button" onClick={() => setQty(qty + 1)} className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-50"><Icon icon="solar:add-linear" /></button>
                </div>
                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAdd}
                  className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-[15px] font-black leading-none text-white shadow-lg transition-transform hover:scale-[1.01] disabled:opacity-50"
                  style={{ backgroundColor: isOutOfStock ? '#9CA3AF' : cp, boxShadow: isOutOfStock ? undefined : `0 16px 30px -18px ${cp}` }}
                >
                  <Icon icon={isOutOfStock ? 'solar:close-circle-bold' : 'solar:cart-large-minimalistic-bold'} width={21} />
                  {isOutOfStock ? 'Sin stock' : 'Agregar al carrito'}
                </button>
              </div>
              <button type="button" className="mt-3 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 hover:bg-gray-50">
                <Icon icon="solar:heart-linear" width={20} />
                Agregar a lista de deseos
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ['solar:star-bold', 'Opiniones en Google', 'Resenas verificadas', 'bg-indigo-50', 'text-indigo-600'],
                ['solar:box-bold', 'Agencias Shalom', 'Envios a todo el pais', 'bg-amber-50', 'text-amber-600'],
                ['solar:map-point-bold', 'Local de recojo', 'Ubicanos en el mapa', 'bg-emerald-50', 'text-emerald-600'],
              ].map(([icon, label, sub, tint, fg]) => (
                <div key={label} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3.5 text-left">
                  <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${tint}`}>
                    <Icon icon={icon} width={20} className={fg} />
                  </span>
                  <div>
                    <p className="text-[13px] font-black leading-tight text-gray-950">{label}</p>
                    <p className="mt-0.5 text-[11px] leading-tight text-gray-500">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.section className="mt-12" variants={mayeSection}>
          <div className="flex flex-wrap gap-6 border-b border-gray-200">
            {[
              ['description', 'Descripcion'],
              ['specifications', 'Especificaciones'],
              ['reviews', `Resenas (${ratingCount})`],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`relative -mb-px pb-3 text-sm font-bold transition-colors ${activeTab === key ? '' : 'text-gray-400 hover:text-gray-700'}`}
                style={activeTab === key ? { color: cp } : undefined}
              >
                {label}
                {activeTab === key && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full" style={{ backgroundColor: cp }} />}
              </button>
            ))}
          </div>

          <div className="mt-8">
            {activeTab === 'description' && (
              <p className="max-w-3xl text-sm leading-relaxed text-gray-500">
                Producto destacado de {demo.storeName}. Ideal para compradores que buscan calidad, stock disponible y atencion especializada.
              </p>
            )}
            {activeTab === 'specifications' && (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                {specPairs.map((pair, index) => (
                  <div key={index} className={`grid grid-cols-1 md:grid-cols-2 ${index !== specPairs.length - 1 ? 'border-b border-gray-100' : ''} ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                    {pair.map((spec: any, pairIndex: number) => (
                      <div key={`${spec.label}-${pairIndex}`} className={`flex items-start gap-4 px-5 py-3 ${pairIndex === 0 ? 'md:border-r md:border-gray-100' : ''}`}>
                        <span className="w-[34%] flex-shrink-0 text-[11px] font-medium uppercase tracking-wide text-gray-500">{spec.label}</span>
                        <span className="flex-1 text-[13px] leading-snug text-gray-800">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'reviews' && (
              <div className="flex flex-col items-start gap-6 rounded-3xl bg-gray-50 p-8 sm:flex-row sm:items-center">
                <div className="text-center">
                  <p className="text-5xl font-black text-gray-950">{ratingAvg.toFixed(1)}</p>
                  <div className="mt-2 flex justify-center">{renderStars(18)}</div>
                  <p className="mt-1 text-xs text-gray-500">{ratingCount} resenas</p>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-gray-950">Opiniones de clientes</h3>
                  <p className="mt-1 text-sm text-gray-500">Reseñas registradas para este producto.</p>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {related.length > 0 && (
          <motion.section className="mt-14" variants={mayeSection}>
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <div className="flex gap-[3px]">
                    <span className="h-0.5 w-4 -skew-x-[30deg]" style={{ backgroundColor: cp }} />
                    <span className="h-0.5 w-4 -skew-x-[30deg]" style={{ backgroundColor: cp }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: cp }}>Tambien recomendado</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-gray-950">Completa tu setup</h2>
              </div>
              <motion.button onClick={() => onNav('catalogo')} className="hidden rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-black text-gray-700 hover:bg-gray-50 md:inline-flex" whileHover={{ y: -2, scale: 1.03 }} whileTap={mayeTap}>
                Ver catalogo
              </motion.button>
            </div>
            <motion.div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4" variants={mayeStagger}>
              {related.map((item: any) => (
                <ProductCardMaye
                  key={item.id}
                  producto={item}
                  slug="preview"
                  diseno={diseno}
                  onAddToCart={() => onAddToCart(item)}
                  onClick={() => onProduct(item)}
                />
              ))}
            </motion.div>
          </motion.section>
        )}
      </motion.main>

      <MayeFooter tienda={tienda} slug="preview" diseno={diseno} />

      <MayeCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        setCarrito={setCarrito}
        actualizarCantidad={actualizarCantidad}
        onCheckout={() => onNav('checkout')}
        cp={cp}
      />
    </motion.div>
  );
}
