import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { useFavoritosStore } from '@/zustand/favoritos';
import { useCompareStore } from '@/zustand/compare';

interface Props {
  cp: string;
  slug: string;
  productos: any[];
  diseno?: any;
  onAddToCart?: (producto: any) => void;
}

export default function TecnologiaDealsOfTheWeek({ cp, slug, productos, diseno, onAddToCart }: Props) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [now, setNow] = React.useState(() => new Date());
  const [zoomOpen, setZoomOpen] = React.useState(false);
  const { toggleFavorito, isFavorito } = useFavoritosStore();
  const { toggle: toggleCompare, isInCompare } = useCompareStore();

  const productImage = diseno?.tecnologiaProductImageUrl || productos?.[0]?.imagenUrl || '/assets/templates/tecnologia/producto.png';
  const widgetOneImage = diseno?.tecnologiaWidgetOneImageUrl || '/assets/templates/tecnologia/widget1.png';
  const widgetTwoImage = diseno?.tecnologiaWidgetTwoImageUrl || '/assets/templates/tecnologia/widget2.png';
  const widgetThreeImage = diseno?.tecnologiaWidgetThreeImageUrl || '/assets/templates/tecnologia/widget3.png';

  const fallbackOfferEndRef = React.useRef<Date | null>(null);
  if (!fallbackOfferEndRef.current) {
    fallbackOfferEndRef.current = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

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
  const precioOferta = featuredDeal?.precioOferta != null ? Number(featuredDeal.precioOferta) : Number(precioNormal * 0.8);
  const porcentajeDescuento = precioNormal > 0 ? Math.round((1 - (precioOferta / precioNormal)) * 100) : 0;

  const finOferta = parseDate(featuredDeal?.fechaFinOferta, true) || fallbackOfferEndRef.current || now;
  const timeLeft = Math.max(0, finOferta.getTime() - now.getTime());
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const disponibles = Math.max(0, Number(featuredDeal?.stock ?? 0));
  const vendidos = Math.max(0, Number(featuredDeal?.ventas ?? featuredDeal?.vendidos ?? 12));
  const totalInventario = Math.max(1, disponibles + vendidos);
  const progresoVentas = Math.min(100, Math.max(8, (vendidos / totalInventario) * 100));
  const wished = featuredDeal ? isFavorito(featuredDeal.id, slug) : false;
  const inCompare = featuredDeal ? isInCompare(featuredDeal.id, slug) : false;
  const catName = typeof featuredDeal?.categoria === 'object' ? featuredDeal?.categoria?.nombre : featuredDeal?.categoria;
  const marcaName = typeof featuredDeal?.marca === 'object' ? featuredDeal?.marca?.nombre : featuredDeal?.marca;
  const actionProduct = featuredDeal
    ? { ...featuredDeal, precioOriginal: precioNormal, precioUnitario: precioOferta }
    : null;

  const topVentas = [...productos]
    .sort((a, b) => Number(b.ventas || 0) - Number(a.ventas || 0))
    .slice(0, 4);

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
    <div className="w-full mb-16">
      
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
            <span className="text-sm font-bold" style={{ color: cp }}>Mejores Ofertas</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-8">
            Ofertas de la Semana
          </h2>

          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Left: Featured Product (Carousel) */}
            <div className="flex-1 bg-white rounded-xl p-8 flex flex-col relative gap-6">
              {/* Arrows */}
              <button onClick={goPrev} className="absolute left-[-16px] top-1/2 -translate-y-1/2 w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center shadow-md hover:bg-red-200 z-20 disabled:opacity-40" disabled={sliderProducts.length <= 1} aria-label="Oferta anterior">
                <Icon icon="solar:arrow-left-linear" />
              </button>
              <button onClick={goNext} className="absolute right-[-16px] top-1/2 -translate-y-1/2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-700 z-20 disabled:opacity-40" disabled={sliderProducts.length <= 1} aria-label="Siguiente oferta">
                <Icon icon="solar:arrow-right-linear" />
              </button>

              {featuredDeal && (
                <div className="flex flex-col md:flex-row gap-8 items-center cursor-pointer" onClick={() => navigate(`/tienda/${slug}/producto/${featuredDeal.id}`)}>
                  <div className="w-full md:w-1/2 flex justify-center">
                    <img src={dealImage} alt={featuredDeal.descripcion} className="w-[80%] aspect-square object-contain mix-blend-multiply" />
                  </div>

                  <div className="w-full md:w-1/2 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex text-[#F5B01D] text-xs">
                        <Icon icon="solar:star-bold" /><Icon icon="solar:star-bold" /><Icon icon="solar:star-bold" /><Icon icon="solar:star-bold" /><Icon icon="solar:star-linear" />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">(126) Reseñas</span>
                    </div>
                    
                    <h3 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-4 line-clamp-2">
                      {featuredDeal.descripcion}
                    </h3>
                    
                    <div className="flex items-baseline gap-3 mb-6">
                      <span className="text-2xl font-black text-red-600">S/ {precioOferta.toFixed(2)}</span>
                      <span className="text-sm font-bold text-gray-400 line-through">S/ {precioNormal.toFixed(2)}</span>
                      {porcentajeDescuento > 0 && (
                        <span className="text-[10px] font-black text-white bg-red-600 rounded px-2 py-1">-{porcentajeDescuento}%</span>
                      )}
                    </div>

                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                      <span>Disponibles: {disponibles}</span>
                      <span>Vendidos: {vendidos}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mb-6 overflow-hidden relative">
                      <div className="absolute top-0 left-0 h-full bg-red-600 rounded-full" style={{ width: `${progresoVentas}%` }}></div>
                    </div>

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

                  <div className="flex items-center gap-2">
                    <button onClick={handleAddToCart} className="px-5 py-2.5 bg-[#1A1A1A] text-white font-bold rounded text-xs hover:bg-black transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed" disabled={!actionProduct || Number(featuredDeal?.stock ?? 1) <= 0}>
                      Añadir al Carrito
                    </button>
                    <button onClick={handleFavorite} className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${wished ? 'bg-red-600 text-white hover:bg-red-700' : 'border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600'}`} title={wished ? 'Quitar de favoritos' : 'Agregar a favoritos'}>
                      <Icon icon={wished ? 'solar:heart-bold' : 'solar:heart-linear'} />
                    </button>
                    <button onClick={handleZoom} className="w-10 h-10 border border-gray-200 text-gray-500 rounded flex items-center justify-center hover:bg-gray-50 transition-colors" title="Ver imagen">
                      <Icon icon="solar:eye-linear" />
                    </button>
                    <button onClick={handleCompare} className="w-10 h-10 border border-gray-200 rounded flex items-center justify-center hover:bg-gray-50 transition-colors" title={inCompare ? 'Quitar de comparación' : 'Comparar'} style={{ color: inCompare ? cp : '#6b7280' }}>
                      <Icon icon="solar:refresh-linear" />
                    </button>
                  </div>
                </div>
              </div>
              )}

              {/* Thumbnails */}
              <div className="flex justify-between items-center gap-4 mt-4 px-4">
                {sliderProducts.slice(0, 5).map((item, i) => (
                  <button key={item.id || i} onClick={(event) => { event.stopPropagation(); setActiveIndex(i); }} className={`flex-1 aspect-square rounded border flex items-center justify-center p-2 cursor-pointer transition-colors ${i === activeIndex ? 'border-red-500' : 'border-gray-100 hover:border-gray-300'}`} aria-label={`Ver oferta ${i + 1}`}>
                    <img src={item.imagenUrl || productImage} alt={item.descripcion || 'Oferta'} className="w-full h-full object-contain mix-blend-multiply opacity-80" />
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-[350px] xl:w-[380px] bg-white rounded-xl pt-0 overflow-hidden flex flex-col border border-gray-100">
              <div className="bg-[#DB4437] text-white font-bold text-base py-3 px-6 text-center w-max mx-auto rounded-b-xl mb-4 relative shadow-[0_4px_10px_rgba(220,38,38,0.2)]">
                <div className="absolute top-0 left-[-8px] w-0 h-0 border-t-[8px] border-t-red-900 border-l-[8px] border-l-transparent"></div>
                <div className="absolute top-0 right-[-8px] w-0 h-0 border-t-[8px] border-t-red-900 border-r-[8px] border-r-transparent"></div>
                Productos Más Vendidos
              </div>
              
              <div className="flex flex-col px-6 pb-6">
                {topVentas.map((item, idx) => {
                  const pNormal = Number(item.precioRegular ?? item.precioOriginal ?? item.precioUnitario ?? 0);
                  const pOferta = item.precioOferta ? Number(item.precioOferta) : null;
                  
                  return (
                  <div key={idx} className={`flex items-center gap-4 py-4 cursor-pointer ${idx !== topVentas.length - 1 ? 'border-b border-gray-100' : ''}`} onClick={() => navigate(`/tienda/${slug}/producto/${item.id}`)}>
                    <div className="w-16 h-16 rounded bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                      <img src={item.imagenUrl || productImage} alt="thumb" className="w-[80%] h-[80%] object-contain mix-blend-multiply opacity-80" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="flex text-[#F5B01D] text-[10px] mb-1">
                        <Icon icon="solar:star-bold" /><Icon icon="solar:star-bold" /><Icon icon="solar:star-bold" /><Icon icon="solar:star-bold" /><Icon icon="solar:star-bold" />
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 leading-tight mb-1.5 line-clamp-2">
                        {item.descripcion}
                      </h4>
                      <div className="flex items-baseline gap-2">
                        {pOferta ? (
                          <>
                            <span className="text-[11px] font-bold text-gray-400 line-through">S/ {pNormal.toFixed(2)}</span>
                            <span className="text-sm font-black text-red-600">S/ {pOferta.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-sm font-black text-gray-900">S/ {pNormal.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 3 Promos Bottom */}
      <div className="w-full max-w-7xl mx-auto mt-[-5rem] md:mt-[-6rem] px-4 xl:px-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Promo 1 */}
          <div className="bg-[#0B0B0B] rounded-xl overflow-hidden p-6 relative flex flex-col justify-center min-h-[200px] border border-gray-800 shadow-xl group">
            <div className="absolute inset-0 w-full h-full opacity-60 transition-transform duration-500 group-hover:scale-110 pointer-events-none z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0B] to-transparent z-10"></div>
              <img src={widgetOneImage} className="w-full h-full object-cover" alt="Tires" />
            </div>
            <div className="relative z-20 max-w-[65%]">
              <span className="inline-block px-2 py-0.5 bg-[#00C4B5] text-white text-[9px] font-bold rounded mb-2">Top Marcas</span>
              <h3 className="text-xl font-black text-white leading-tight mb-1">{diseno?.widgetOneTitle || 'Llantas y Ruedas'}</h3>
              <p className="text-[10px] text-gray-300 mb-5">{diseno?.widgetOneSubtitle || '¡Mantente seguro en la Vía!'}</p>
              <button className="text-xs font-bold text-red-500 flex items-center gap-1 hover:text-red-400 transition-colors">
                Comprar Ahora <Icon icon="solar:arrow-right-up-linear" className="bg-red-500 text-white rounded-full w-4 h-4 p-0.5" />
              </button>
            </div>
          </div>

          {/* Promo 2 */}
          <div className="bg-[#F5B01D] rounded-xl overflow-hidden p-6 relative flex flex-col justify-center min-h-[200px] shadow-xl group">
            <div className="absolute inset-0 w-full h-full opacity-90 transition-transform duration-500 group-hover:scale-110 pointer-events-none z-0">
               <img src={widgetTwoImage} alt="Oil" className="w-full h-full object-cover mix-blend-multiply" />
            </div>
            <div className="relative z-10 max-w-[65%]">
              <h3 className="text-2xl font-black text-white leading-tight mb-1">{diseno?.widgetTwoTitle || 'ACEITE MOTOR'}</h3>
              <p className="text-[10px] text-gray-200 font-bold mb-4">{diseno?.widgetTwoSubtitle || '¡Rendimiento Suave!'}</p>
              <button className="px-4 py-1.5 bg-white text-black font-bold text-xs rounded hover:bg-gray-100 transition-colors w-max">
                Comprar Ahora
              </button>
            </div>
          </div>

          {/* Promo 3 */}
          <div className="bg-gradient-to-r from-[#DB4437] to-[#E65C00] rounded-xl overflow-hidden p-6 relative flex flex-col justify-center min-h-[200px] shadow-xl group">
            <div className="absolute inset-0 w-full h-full opacity-90 transition-transform duration-500 group-hover:scale-110 pointer-events-none z-0">
               <div className="absolute inset-0 bg-gradient-to-r from-[#DB4437]/80 to-transparent z-10"></div>
               <img src={widgetThreeImage} alt="Suspension" className="w-full h-full object-cover mix-blend-overlay" />
            </div>
            <div className="relative z-10 max-w-[70%]">
              <span className="inline-block px-2 py-0.5 bg-[#00C4B5] text-white text-[9px] font-bold rounded mb-2">Top Marcas</span>
              <h3 className="text-xl md:text-2xl font-black text-white leading-tight mb-1">{diseno?.widgetThreeTitle || 'COMPRA 1 LLEVA 1!'}</h3>
              <p className="text-[10px] text-white/80 mb-4">{diseno?.widgetThreeSubtitle || '¡Aprovecha ahora!'}</p>
              
              <div className="flex items-center gap-3">
                <button className="px-4 py-1.5 bg-white text-[#DB4437] font-bold text-xs rounded hover:bg-gray-100 transition-colors">
                  Comprar Ahora
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {zoomOpen && dealImage && createPortal(
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center"
          style={{ zIndex: 99999 }}
          onClick={() => setZoomOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
            style={{ zIndex: 100000 }}
            onClick={(event) => { event.stopPropagation(); setZoomOpen(false); }}
            aria-label="Cerrar imagen"
          >
            <Icon icon="solar:close-circle-bold" width={22} />
          </button>
          <img
            src={dealImage}
            alt={featuredDeal?.descripcion || 'Oferta'}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
            onClick={(event) => event.stopPropagation()}
          />
        </div>,
        document.body
      )}

    </div>
  );
}
