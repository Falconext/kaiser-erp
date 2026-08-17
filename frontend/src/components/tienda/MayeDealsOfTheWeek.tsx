import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useFavoritosStore } from '@/zustand/favoritos';
import { useCompareStore } from '@/zustand/compare';
import { mayeCard, mayeHover, mayeModal, mayeOverlay, mayeSection, mayeStagger, mayeTap, mayeViewport } from '@/lib/motion/maye';
import { getStoreLinkAction, runStoreLinkAction } from '@/components/tienda/storeLinkActions';

interface Props {
  cp: string;
  slug: string;
  productos: any[];
  diseno?: any;
  onAddToCart?: (producto: any) => void;
}

export default function MayeDealsOfTheWeek({ cp, slug, productos, diseno, onAddToCart }: Props) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [now, setNow] = React.useState(() => new Date());
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const { toggleFavorito, isFavorito } = useFavoritosStore();
  const { toggle: toggleCompare, isInCompare } = useCompareStore();

  const productImage = diseno?.mayeProductImageUrl || productos?.[0]?.imagenUrl || '/assets/templates/maye/componentes.png';
  const widgetOneImage = diseno?.mayeWidgetOneImageUrl || '/assets/templates/maye/comprarahora1.png';
  const widgetTwoImage = diseno?.mayeWidgetTwoImageUrl || '/assets/templates/maye/comprarahora2.png';
  const widgetThreeImage = diseno?.mayeWidgetThreeImageUrl || '/assets/templates/maye/comprarahora3.png';
  const sectionLabel = diseno?.mayeDealsLabel || 'Mejores Ofertas';
  const sectionTitle = diseno?.mayeDealsTitle || 'Ofertas de la Semana';
  const accentSoft = `${cp}18`;
  const accentShadow = `${cp}33`;

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const parseDate = (value: string | Date | null | undefined, endOfDay = false) => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const raw = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-').map(Number);
      return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    }
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const ofertas = React.useMemo(() => productos.filter(p => {
    if (!p.precioOferta) return false;
    const inicio = parseDate(p.fechaInicioOferta);
    const fin = parseDate(p.fechaFinOferta, true);
    if (inicio && inicio > now) return false;
    if (fin && fin < now) return false;
    return true;
  }), [productos, now]);

  const sliderProducts = ofertas.length > 0 ? ofertas : productos.slice(0, 6);

  React.useEffect(() => {
    if (activeIndex >= sliderProducts.length) setActiveIndex(0);
  }, [activeIndex, sliderProducts.length]);

  const featuredDeal = sliderProducts[activeIndex] || productos[0];
  const dealImage = featuredDeal?.imagenUrl || productImage;
  const precioNormal = Number(featuredDeal?.precioRegular ?? featuredDeal?.precioOriginal ?? featuredDeal?.precioUnitario ?? 0);
  const ofertaInicio = parseDate(featuredDeal?.fechaInicioOferta);
  const ofertaFin = parseDate(featuredDeal?.fechaFinOferta, true);
  const rawPrecioOferta = Number(featuredDeal?.precioOferta || 0);
  const hasActiveOffer =
    rawPrecioOferta > 0 &&
    precioNormal > 0 &&
    rawPrecioOferta < precioNormal &&
    (!ofertaInicio || ofertaInicio <= now) &&
    (!ofertaFin || ofertaFin >= now);
  const precioOferta = hasActiveOffer ? rawPrecioOferta : precioNormal;
  const porcentajeDescuento = hasActiveOffer && precioNormal > 0 ? Math.round((1 - (precioOferta / precioNormal)) * 100) : 0;

  const hasRealOfferEnd = hasActiveOffer && Boolean(ofertaFin);
  const finOferta = hasRealOfferEnd ? ofertaFin! : now;
  const timeLeft = Math.max(0, finOferta.getTime() - now.getTime());
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const disponibles = Math.max(0, Number(featuredDeal?.stock ?? 0));
  const vendidos = Math.max(0, Number(featuredDeal?.ventas ?? featuredDeal?.vendidos ?? 0));
  const totalInventario = disponibles + vendidos;
  const progresoVentas = totalInventario > 0 ? Math.min(100, (vendidos / totalInventario) * 100) : 0;
  const wished = featuredDeal ? isFavorito(featuredDeal.id, slug) : false;
  const inCompare = featuredDeal ? isInCompare(featuredDeal.id, slug) : false;
  const catName = typeof featuredDeal?.categoria === 'object' ? featuredDeal?.categoria?.nombre : featuredDeal?.categoria;
  const marcaName = typeof featuredDeal?.marca === 'object' ? featuredDeal?.marca?.nombre : featuredDeal?.marca;
  const actionProduct = featuredDeal
    ? { ...featuredDeal, precioOriginal: hasActiveOffer ? precioNormal : featuredDeal.precioOriginal, precioUnitario: precioOferta }
    : null;
  const ratingCount = Number(featuredDeal?.ratingCount ?? featuredDeal?.reviewsCount ?? featuredDeal?.resenasCount ?? featuredDeal?.reviewCount ?? 0);
  const ratingAvg = ratingCount > 0 ? Number(featuredDeal?.ratingAvg || 0) : 0;
  const roundedRating = Math.round(ratingAvg);

  const topVentas = [...productos]
    .sort((a, b) => Number(b.ventas || 0) - Number(a.ventas || 0))
    .slice(0, 4);

  const goAction = (key: string) => {
    runStoreLinkAction(getStoreLinkAction(diseno, key, { defaultType: 'catalog' }), { slug, navigate });
  };

  const goPrev = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (sliderProducts.length <= 1) return;
    setActiveIndex((current) => (current - 1 + sliderProducts.length) % sliderProducts.length);
  };

  const goNext = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (sliderProducts.length <= 1) return;
    setActiveIndex((current) => (current + 1) % sliderProducts.length);
  };

  const handleAddToCart = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!actionProduct || Number(featuredDeal?.stock ?? 1) <= 0) return;
    onAddToCart?.(actionProduct);
  };

  const handleFavorite = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!actionProduct) return;
    toggleFavorito({
      id: actionProduct.id,
      descripcion: actionProduct.descripcion,
      precioUnitario: Number(actionProduct.precioUnitario || 0),
      imagenUrl: actionProduct.imagenUrl,
      slug,
    });
  };

  const handleCompare = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!actionProduct) return;
    toggleCompare({
      id: actionProduct.id,
      descripcion: actionProduct.descripcion,
      precioUnitario: Number(actionProduct.precioUnitario || 0),
      imagenUrl: actionProduct.imagenUrl,
      categoria: catName || undefined,
      marca: marcaName || undefined,
      stock: actionProduct.stock,
      ratingAvg: actionProduct.ratingAvg,
      slug,
    });
  };

  const handleZoom = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (dealImage) setZoomOpen(true);
  };

  return (
    <motion.section className="w-full mb-16" variants={mayeSection} initial="initial" whileInView="animate" viewport={mayeViewport}>
      
      {/* Dark background section */}
      <div className="w-full bg-[#111111] relative pt-16 pb-28 md:pb-32 px-4">
        {/* Background image fade */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url(${dealImage})`, backgroundSize: 'cover', backgroundPosition: 'center', maskImage: 'linear-gradient(to bottom, black 50%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent)' }}></div>
        
        <div className="w-full max-w-7xl mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex gap-[3px]">
              <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
              <div className="w-3 h-0.5 transform -skew-x-[30deg]" style={{ backgroundColor: cp }}></div>
            </div>
            <span className="text-sm font-bold" style={{ color: cp }}>{sectionLabel}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-8">
            {sectionTitle}
          </h2>

          <motion.div className="flex flex-col lg:flex-row gap-6" variants={mayeStagger}>
            
            {/* Left: Featured Product (Carousel) */}
            <motion.div className="flex-1 bg-white rounded-xl p-8 flex flex-col relative gap-6" variants={mayeCard} whileHover={mayeHover} layout>
              {/* Arrows */}
              <button onClick={goPrev} className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-md z-20 disabled:opacity-40 transition-opacity hover:opacity-90" style={{ backgroundColor: accentSoft, color: cp }} disabled={sliderProducts.length <= 1} aria-label="Oferta anterior">
                <Icon icon="solar:arrow-left-linear" />
              </button>
              <button onClick={goNext} className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-8 h-8 text-white rounded-full flex items-center justify-center shadow-md z-20 disabled:opacity-40 transition-opacity hover:opacity-90" style={{ backgroundColor: cp }} disabled={sliderProducts.length <= 1} aria-label="Siguiente oferta">
                <Icon icon="solar:arrow-right-linear" />
              </button>

              <AnimatePresence mode="wait">
              {featuredDeal && (
                <motion.div key={featuredDeal.id || activeIndex} className="flex flex-col md:flex-row gap-8 items-center cursor-pointer" onClick={() => navigate(`/tienda/${slug}/producto/${featuredDeal.id}`)} variants={mayeCard} initial="initial" animate="animate" exit={{ opacity: 0, y: 12, scale: 0.98 }} layout>
                  <div className="w-full md:w-1/2 flex justify-center">
                    <motion.img src={dealImage} alt={featuredDeal.descripcion} className="w-[80%] aspect-square object-contain mix-blend-multiply" initial={{ opacity: 0, scale: 0.94, rotate: -1 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 0.34, ease: [0.25, 0.46, 0.45, 0.94] }} />
                  </div>

                  <div className="w-full md:w-1/2 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      {ratingCount > 0 && (
                        <div className="flex text-[#F5B01D] text-xs">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <Icon key={index} icon={index < roundedRating ? 'solar:star-bold' : 'solar:star-linear'} />
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-gray-500 font-medium">
                        {ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount} reseñas)` : 'Sin reseñas'}
                      </span>
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-4 line-clamp-2">
                      {featuredDeal.descripcion}
                    </h3>
                    
                    <div className="flex items-baseline gap-3 mb-6">
                      <span className="text-2xl font-black" style={{ color: cp }}>S/ {precioOferta.toFixed(2)}</span>
                      {hasActiveOffer && <span className="text-sm font-bold text-gray-400 line-through">S/ {precioNormal.toFixed(2)}</span>}
                      {hasActiveOffer && porcentajeDescuento > 0 && (
                        <span className="text-[10px] font-black text-white rounded px-2 py-1" style={{ backgroundColor: cp }}>-{porcentajeDescuento}%</span>
                      )}
                    </div>

                    {hasActiveOffer ? (
                      <>
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                          <span>Disponibles: {disponibles}</span>
                          <span>Vendidos: {vendidos}</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full mb-6 overflow-hidden relative">
                          <div className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${progresoVentas}%`, backgroundColor: cp }}></div>
                        </div>

                        {hasRealOfferEnd && (
                          <div className="flex gap-3 mb-8">
                            <div className="flex flex-col items-center">
                              <div className="w-12 h-12 border border-gray-200 rounded flex items-center justify-center text-base font-black text-gray-900 mb-1">{days}</div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase">Días</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-12 h-12 border border-gray-200 rounded flex items-center justify-center text-base font-black text-gray-900 mb-1">{hours}</div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase">Hrs</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-12 h-12 border border-gray-200 rounded flex items-center justify-center text-base font-black text-gray-900 mb-1">{minutes}</div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase">Min</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-12 h-12 border border-gray-200 rounded flex items-center justify-center text-base font-black text-gray-900 mb-1">{seconds}</div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase">Seg</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="mb-8 rounded-xl bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-500">
                        Precio regular. Este producto no tiene oferta vigente.
                      </div>
                    )}

                  <div className="flex items-center gap-2">
                    <motion.button onClick={handleAddToCart} className="px-5 py-2.5 bg-[#1A1A1A] text-white font-bold rounded text-xs hover:bg-black transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed" disabled={!actionProduct || Number(featuredDeal?.stock ?? 1) <= 0} whileHover={!actionProduct ? undefined : { y: -2, scale: 1.04 }} whileTap={mayeTap}>
                      Añadir al Carrito
                    </motion.button>
                    <motion.button
                      onClick={handleFavorite}
                      className="w-10 h-10 rounded flex items-center justify-center border transition-colors"
                      title={wished ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                      style={wished ? { backgroundColor: cp, borderColor: cp, color: '#fff' } : { borderColor: '#e5e7eb', color: '#6b7280' }}
                      onMouseEnter={(e) => {
                        if (!wished) {
                          e.currentTarget.style.backgroundColor = accentSoft;
                          e.currentTarget.style.color = cp;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!wished) {
                          e.currentTarget.style.backgroundColor = '';
                          e.currentTarget.style.color = '#6b7280';
                        }
                      }}
                      whileHover={{ y: -2, scale: 1.06 }}
                      whileTap={mayeTap}
                    >
                      <Icon icon={wished ? 'solar:heart-bold' : 'solar:heart-linear'} />
                    </motion.button>
                    <motion.button onClick={handleZoom} className="w-10 h-10 border border-gray-200 text-gray-500 rounded flex items-center justify-center hover:bg-gray-50 transition-colors" title="Ver imagen" whileHover={{ y: -2, scale: 1.06 }} whileTap={mayeTap}>
                      <Icon icon="solar:eye-linear" />
                    </motion.button>
                    <motion.button onClick={handleCompare} className="w-10 h-10 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-50 transition-colors" title={inCompare ? 'Quitar de comparación' : 'Comparar'} style={{ color: inCompare ? cp : '#6b7280' }} whileHover={{ y: -2, scale: 1.06 }} whileTap={mayeTap}>
                      <Icon icon="solar:refresh-linear" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
              )}
              </AnimatePresence>

              {/* Thumbnails */}
              <div className="flex justify-between items-center gap-4 mt-4 px-4">
                {sliderProducts.slice(0, 5).map((item, i) => (
                  <motion.button key={item.id || i} onClick={(event) => { event.stopPropagation(); setActiveIndex(i); }} className="flex-1 aspect-square rounded border flex items-center justify-center p-2 cursor-pointer transition-colors hover:border-gray-300" style={i === activeIndex ? { borderColor: cp, boxShadow: `0 10px 24px -18px ${cp}` } : { borderColor: '#f3f4f6' }} aria-label={`Ver oferta ${i + 1}`} whileHover={{ y: -3, scale: 1.04 }} whileTap={mayeTap}>
                    <img src={item.imagenUrl || productImage} alt={item.descripcion || 'Oferta'} className="w-full h-full object-contain mix-blend-multiply opacity-80" />
                  </motion.button>
                ))}
              </div>
            </motion.div>

            <motion.div className="w-full lg:w-[350px] xl:w-[380px] bg-white rounded-xl pt-0 overflow-hidden flex flex-col border border-gray-100" variants={mayeCard}>
              <div className="text-white font-bold text-base py-3 px-6 text-center w-max mx-auto rounded-b-xl mb-4 relative" style={{ backgroundColor: cp, boxShadow: `0 4px 10px ${accentShadow}` }}>
                <div className="absolute top-0 left-[-8px] w-0 h-0 border-t-[8px] border-l-[8px] border-l-transparent" style={{ borderTopColor: cp }}></div>
                <div className="absolute top-0 right-[-8px] w-0 h-0 border-t-[8px] border-r-[8px] border-r-transparent" style={{ borderTopColor: cp }}></div>
                Productos Más Vendidos
              </div>
              
              <div className="flex flex-col px-6 pb-6">
                {topVentas.map((item, idx) => {
                  const pNormal = Number(item.precioRegular ?? item.precioOriginal ?? item.precioUnitario ?? 0);
                  const pInicio = parseDate(item.fechaInicioOferta);
                  const pFin = parseDate(item.fechaFinOferta, true);
                  const rawOferta = Number(item.precioOferta || 0);
                  const pTieneOferta = rawOferta > 0 && pNormal > 0 && rawOferta < pNormal && (!pInicio || pInicio <= now) && (!pFin || pFin >= now);
                  const pOferta = pTieneOferta ? rawOferta : null;
                  const itemRatingCount = Number(item.ratingCount ?? item.reviewsCount ?? item.resenasCount ?? item.reviewCount ?? 0);
                  const itemRatingAvg = itemRatingCount > 0 ? Number(item.ratingAvg || 0) : 0;
                  const itemRoundedRating = Math.round(itemRatingAvg);
                  
                  return (
                  <motion.div key={idx} className={`flex items-center gap-4 py-4 cursor-pointer ${idx !== topVentas.length - 1 ? 'border-b border-gray-100' : ''}`} onClick={() => navigate(`/tienda/${slug}/producto/${item.id}`)} whileHover={{ x: 4 }}>
                    <div className="w-16 h-16 rounded bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                      <img src={item.imagenUrl || productImage} alt="thumb" className="w-[80%] h-[80%] object-contain mix-blend-multiply opacity-80" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-1 text-[10px] mb-1">
                        {itemRatingCount > 0 ? (
                          <>
                            <span className="flex text-[#F5B01D]">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Icon key={index} icon={index < itemRoundedRating ? 'solar:star-bold' : 'solar:star-linear'} />
                              ))}
                            </span>
                            <span className="text-gray-400">({itemRatingCount})</span>
                          </>
                        ) : (
                          <span className="text-gray-400">Sin reseñas</span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 leading-tight mb-1.5 line-clamp-2">
                        {item.descripcion}
                      </h4>
                      <div className="flex items-baseline gap-2">
                        {pOferta ? (
                          <>
                            <span className="text-[11px] font-bold text-gray-400 line-through">S/ {pNormal.toFixed(2)}</span>
                            <span className="text-sm font-black" style={{ color: cp }}>S/ {pOferta.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-sm font-black text-gray-900">S/ {pNormal.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )})}
              </div>
            </motion.div>

          </motion.div>
        </div>
      </div>

      {/* 3 Promos Bottom */}
      <div className="w-full max-w-7xl mx-auto mt-[-5rem] md:mt-[-6rem] px-4 xl:px-8 relative z-20">
        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={mayeStagger} initial="initial" whileInView="animate" viewport={mayeViewport}>
          
          {/* Promo 1 */}
          <motion.div className="bg-[#0B0B0B] rounded-xl overflow-hidden p-6 relative flex flex-col justify-center min-h-[200px] border border-gray-800 shadow-xl group" variants={mayeCard} whileHover={mayeHover}>
            <div className="absolute inset-0 w-full h-full opacity-60 transition-transform duration-500 group-hover:scale-110 pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0B] to-transparent z-10"></div>
              <img src={widgetOneImage} className="w-full h-full object-cover" alt="Tires" />
            </div>
            <div className="relative z-20 max-w-[65%]">
              <span className="inline-block px-2 py-0.5 bg-[#00C4B5] text-white text-[9px] font-bold rounded mb-2">Top Marcas</span>
              <h3 className="text-xl font-black text-white leading-tight mb-1">{diseno?.widgetOneTitle || 'Componentes de PC'}</h3>
              <p className="text-[10px] text-gray-300 mb-5">{diseno?.widgetOneSubtitle || '¡Potencia tu Setup!'}</p>
              <button onClick={() => goAction('mayeWidgetOneAction')} className="text-xs font-bold flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: cp }}>
                Comprar Ahora <Icon icon="solar:arrow-right-up-linear" className="text-white rounded-full w-4 h-4 p-0.5" style={{ backgroundColor: cp }} />
              </button>
            </div>
          </motion.div>

          {/* Promo 2 */}
          <motion.div className="bg-[#F5B01D] rounded-xl overflow-hidden p-6 relative flex flex-col justify-center min-h-[200px] shadow-xl group" variants={mayeCard} whileHover={mayeHover}>
            <div className="absolute inset-0 w-full h-full opacity-90 transition-transform duration-500 group-hover:scale-110 pointer-events-none z-0">
               <img src={widgetTwoImage} alt="Oil" className="w-full h-full object-cover mix-blend-multiply" />
            </div>
            <div className="relative z-10 max-w-[65%]">
              <h3 className="text-2xl font-black text-white leading-tight mb-1">{diseno?.widgetTwoTitle || 'LAPTOPS GAMER'}</h3>
              <p className="text-[10px] text-gray-200 font-bold mb-4">{diseno?.widgetTwoSubtitle || '¡Rendimiento Suave!'}</p>
              <button onClick={() => goAction('mayeWidgetTwoAction')} className="px-4 py-1.5 bg-white text-black font-bold text-xs rounded hover:bg-gray-100 transition-colors w-max">
                Comprar Ahora
              </button>
            </div>
          </motion.div>

          {/* Promo 3 */}
          <motion.div className="rounded-xl overflow-hidden p-6 relative flex flex-col justify-center min-h-[200px] shadow-xl group" style={{ background: `linear-gradient(90deg, ${cp}, ${cp}CC)` }} variants={mayeCard} whileHover={mayeHover}>
            <div className="absolute inset-0 w-full h-full opacity-90 transition-transform duration-500 group-hover:scale-110 pointer-events-none z-0">
               <div className="absolute inset-0 z-10" style={{ background: `linear-gradient(90deg, ${cp}CC, transparent)` }}></div>
               <img src={widgetThreeImage} alt="Suspension" className="w-full h-full object-cover mix-blend-overlay" />
            </div>
            <div className="relative z-10 max-w-[70%]">
              <span className="inline-block px-2 py-0.5 bg-[#00C4B5] text-white text-[9px] font-bold rounded mb-2">Top Marcas</span>
              <h3 className="text-xl md:text-2xl font-black text-white leading-tight mb-1">{diseno?.widgetThreeTitle || 'COMPRA 1 LLEVA 1!'}</h3>
              <p className="text-[10px] text-white/80 mb-4">{diseno?.widgetThreeSubtitle || '¡Aprovecha ahora!'}</p>
              
              <div className="flex items-center gap-3">
                <button onClick={() => goAction('mayeWidgetThreeAction')} className="px-4 py-1.5 bg-white font-bold text-xs rounded hover:bg-gray-100 transition-colors" style={{ color: cp }}>
                  Comprar Ahora
                </button>
              </div>
            </div>
          </motion.div>

        </motion.div>
      </div>

      {createPortal(
        <AnimatePresence>
        {zoomOpen && dealImage && (
        <motion.div
          className="fixed inset-0 bg-black/90 flex items-center justify-center"
          style={{ zIndex: 99999 }}
          onClick={() => setZoomOpen(false)}
          variants={mayeOverlay}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
            style={{ zIndex: 100000 }}
            onClick={(event) => { event.stopPropagation(); setZoomOpen(false); }}
            aria-label="Cerrar imagen"
          >
            <Icon icon="solar:close-circle-bold" width={22} />
          </button>
          <motion.img
            src={dealImage}
            alt={featuredDeal?.descripcion || 'Oferta'}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
            onClick={(event) => event.stopPropagation()}
            variants={mayeModal}
          />
        </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}

    </motion.section>
  );
}
