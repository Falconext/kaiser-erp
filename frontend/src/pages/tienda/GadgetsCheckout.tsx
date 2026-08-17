import { type ChangeEvent, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import XtraHeader from '@/components/tienda/XtraHeader';
import Footer from '@/components/tienda/Footer';
import ProductCardXtra from '@/components/tienda/ProductCardXtra';

type MedioPago = 'YAPE' | 'PLIN' | 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';

interface Props {
  slug: string;
  tienda: any;
  carrito: any[];
  formData: any;
  erroresForm: Record<string, string>;
  configPago: any;
  configEnvio: any;
  enviando: boolean;
  suggestedProducts: any[];
  search: string;
  searchResults: any[];
  setSearch: (v: string) => void;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  updateQuantity: (id: any, qty: number) => void;
  removeItem: (id: any) => void;
  calcularSubtotal: () => number;
  calcularCostoEnvio: () => number;
  calcularTotal: () => number;
  onSubmit: () => void;
  onAddToCart: (producto: any) => void;
  freeDeliveryThreshold: number;
  freeDeliveryRemaining: number;
  freeDeliveryProgress: number;
}

const PAYMENT_META: Record<MedioPago, { label: string; icon: string }> = {
  YAPE: { label: 'Yape', icon: 'solar:smartphone-bold' },
  PLIN: { label: 'Plin', icon: 'solar:wallet-money-bold' },
  EFECTIVO: { label: 'Efectivo', icon: 'solar:banknote-2-bold' },
  TRANSFERENCIA: { label: 'Transferencia', icon: 'solar:card-transfer-bold' },
  TARJETA: { label: 'Tarjeta', icon: 'solar:card-2-bold' },
};

export default function GadgetsCheckout({
  slug, tienda, carrito, formData, erroresForm, configPago, configEnvio,
  enviando, suggestedProducts, search, searchResults, setSearch,
  handleChange, updateQuantity, removeItem,
  calcularSubtotal, calcularCostoEnvio, calcularTotal, onSubmit, onAddToCart,
  freeDeliveryThreshold, freeDeliveryRemaining, freeDeliveryProgress,
}: Props) {
  const navigate = useNavigate();
  const diseno = tienda?.diseno || {};
  const cp = diseno.colorPrimario || '#6A6CFF';
  const subtotal = calcularSubtotal();
  const envio = calcularCostoEnvio();
  const total = calcularTotal();

  const inputClass = (field: string) =>
    `w-full bg-[#F8FAFC] rounded-xl px-4 py-3 text-sm border-2 focus:outline-none transition-colors ${
      erroresForm[field]
        ? 'border-red-400 focus:border-red-400'
        : 'border-transparent focus:border-opacity-40'
    }`;

  // ── Slider responsivo "También te puede gustar" ──
  const [VISIBLE, setVISIBLE] = useState(() => window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);
  useEffect(() => {
    const fn = () => setVISIBLE(window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const slideProd = suggestedProducts.slice(0, 9);
  const N = slideProd.length;
  const totalPages = Math.max(1, Math.ceil(N / VISIBLE));
  const [slidePage, setSlidePage] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => { setSlidePage(0); }, [VISIBLE]);

  useEffect(() => {
    if (paused || N <= VISIBLE) return;
    const t = setInterval(() => setSlidePage(p => (p + 1) % totalPages), 3500);
    return () => clearInterval(t);
  }, [paused, totalPages, N, VISIBLE]);

  const prevSlide = useCallback(() => setSlidePage(p => (p - 1 + totalPages) % totalPages), [totalPages]);
  const nextSlide = useCallback(() => setSlidePage(p => (p + 1) % totalPages), [totalPages]);

  return (
    <div className="min-h-screen bg-[#F4F6FB]" style={{ fontFamily: `'${diseno.tipografia || 'Inter'}', sans-serif` }}>

      <XtraHeader
        tienda={tienda}
        slug={slug}
        carritoCount={carrito.length}
        onToggleCart={() => {}}
        isAdminOpen={false}
        setIsAdminOpen={() => {}}
        adminMenuRef={{ current: null }}
        search={search}
        setSearch={setSearch}
        categories={[]}
        onSelectCategory={() => {}}
        recommendedProducts={searchResults}
        onSearch={() => { if (search.trim()) navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(search)}`); }}
        cp={cp}
      />

      <div className="max-w-screen-xl mx-auto px-4 md:px-8 pt-20 pb-16">

        {/* Top bar: breadcrumb + steps en la misma línea */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <button
            onClick={() => navigate(`/tienda/${slug}`)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Icon icon="solar:arrow-left-linear" width={16} />
            Seguir comprando
          </button>

          {/* Steps inline */}
          <div className="hidden sm:flex items-center gap-2">
            {['Carrito', 'Información', 'Confirmación'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${i === 1 ? 'text-white' : 'bg-gray-200 text-gray-400'}`}
                  style={i === 1 ? { background: cp } : {}}
                >
                  {i + 1}
                </div>
                <span className={`text-xs font-bold ${i === 1 ? 'text-gray-800' : 'text-gray-400'}`}>{step}</span>
                {i < 2 && <Icon icon="solar:alt-arrow-right-linear" width={12} className="text-gray-300" />}
              </div>
            ))}
          </div>
        </div>

        {/* Steps mobile */}
        <div className="sm:hidden flex items-center gap-2 mb-4">
          {['Carrito', 'Info', 'Confirmar'].map((step, i) => (
            <div key={step} className="flex items-center gap-1.5">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${i === 1 ? 'text-white' : 'bg-gray-200 text-gray-400'}`}
                style={i === 1 ? { background: cp } : {}}>{i + 1}</div>
              <span className={`text-[11px] font-bold ${i === 1 ? 'text-gray-800' : 'text-gray-400'}`}>{step}</span>
              {i < 2 && <Icon icon="solar:alt-arrow-right-linear" width={10} className="text-gray-300" />}
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ── LEFT ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Cart items */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-black text-gray-900">
                  Carrito <span className="text-gray-400 font-normal text-sm">({carrito.length} items)</span>
                </h2>
              </div>

              <div className="divide-y divide-gray-50">
                {carrito.map((item) => {
                  const price = Number(item.precioUnitario || 0);
                  const original = Number(item.precioOriginal || 0);
                  const hasDiscount = original > price;
                  return (
                    <div key={item.id} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-[72px] h-[72px] rounded-2xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                        {item.imagenUrl
                          ? <img src={item.imagenUrl} className="w-full h-full object-contain p-1.5" alt="" />
                          : <div className="w-full h-full flex items-center justify-center"><Icon icon="solar:box-linear" className="text-gray-300 text-2xl" /></div>
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{item.descripcion}</p>
                        {item.modificadores?.length > 0 && item.modificadores[0]?.opcionNombre && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                            {item.modificadores.filter((m: any) => m?.opcionNombre).map((m: any) => m.opcionNombre).join(', ')}
                          </p>
                        )}
                        <button onClick={() => removeItem(item.id)} className="flex items-center gap-1 text-xs text-gray-300 hover:text-red-400 transition-colors mt-1.5">
                          <Icon icon="solar:trash-bin-trash-linear" width={13} />
                          Eliminar
                        </button>
                      </div>

                      {/* Qty */}
                      <div className="flex items-center gap-2 flex-shrink-0 bg-gray-50 rounded-xl px-2 py-1.5 border border-gray-100">
                        <button onClick={() => updateQuantity(item.id, item.cantidad - 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:border-opacity-60 transition-colors" style={{}}>
                          <Icon icon="mdi:minus" width={12} />
                        </button>
                        <span className="w-6 text-center text-sm font-black text-gray-900">{item.cantidad}</span>
                        <button onClick={() => updateQuantity(item.id, item.cantidad + 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                          <Icon icon="mdi:plus" width={12} />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right flex-shrink-0 min-w-[72px]">
                        <p className={`text-base font-black ${hasDiscount ? 'text-red-500' : 'text-gray-900'}`}>
                          S/ {(price * item.cantidad).toFixed(2)}
                        </p>
                        {hasDiscount && (
                          <p className="text-xs text-gray-400 line-through">S/ {(original * item.cantidad).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery type */}
            {configEnvio && (configEnvio.aceptaEnvio || configEnvio.aceptaRecojo) && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Tipo de entrega</p>
                <div className="flex gap-2">
                  {configEnvio.aceptaEnvio && (
                    <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer text-sm font-bold border-2 transition-all ${formData.tipoEntrega === 'ENVIO' ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      style={formData.tipoEntrega === 'ENVIO' ? { borderColor: cp, background: `${cp}15`, color: cp } : {}}>
                      <input type="radio" className="hidden" name="tipoEntrega" value="ENVIO" checked={formData.tipoEntrega === 'ENVIO'} onChange={handleChange} />
                      <Icon icon="solar:delivery-bold" width={16} />
                      Delivery
                      {configEnvio.costoEnvio > 0 && (
                        <span className="text-xs opacity-70">S/ {Number(configEnvio.costoEnvio).toFixed(2)}</span>
                      )}
                    </label>
                  )}
                  {configEnvio.aceptaRecojo && (
                    <label className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl cursor-pointer text-sm font-bold border-2 transition-all ${formData.tipoEntrega === 'RECOJO' ? 'text-white' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      style={formData.tipoEntrega === 'RECOJO' ? { borderColor: cp, background: `${cp}15`, color: cp } : {}}>
                      <input type="radio" className="hidden" name="tipoEntrega" value="RECOJO" checked={formData.tipoEntrega === 'RECOJO'} onChange={handleChange} />
                      <Icon icon="solar:shop-bold" width={16} />
                      Recojo en tienda
                    </label>
                  )}
                </div>
                {formData.tipoEntrega === 'RECOJO' && configEnvio.direccionRecojo && (
                  <div className="mt-3 flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 bg-gray-50 border border-gray-100">
                    <Icon icon="solar:map-point-bold" width={16} style={{ color: cp }} />
                    <span className="text-gray-600">Recojo en: <strong className="text-gray-900">{configEnvio.direccionRecojo}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Customer info */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Información del cliente</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input type="text" name="clienteNombre" placeholder="Nombre completo *" value={formData.clienteNombre} onChange={handleChange}
                    className={inputClass('clienteNombre')} style={erroresForm.clienteNombre ? {} : { '--tw-ring-color': `${cp}40` } as any} />
                  {erroresForm.clienteNombre && <p className="text-red-500 text-xs mt-1 ml-1">{erroresForm.clienteNombre}</p>}
                </div>
                <div>
                  <input type="tel" name="clienteTelefono" placeholder="Teléfono *" value={formData.clienteTelefono} onChange={handleChange}
                    className={inputClass('clienteTelefono')} />
                  {erroresForm.clienteTelefono && <p className="text-red-500 text-xs mt-1 ml-1">{erroresForm.clienteTelefono}</p>}
                </div>
                <div className="sm:col-span-2">
                  <input type="email" name="clienteEmail" placeholder="Email (opcional)" value={formData.clienteEmail} onChange={handleChange}
                    className={inputClass('clienteEmail')} />
                  {erroresForm.clienteEmail && <p className="text-red-500 text-xs mt-1 ml-1">{erroresForm.clienteEmail}</p>}
                </div>
                {formData.tipoEntrega === 'ENVIO' && (
                  <>
                    <div className="sm:col-span-2">
                      <input type="text" name="clienteDireccion" placeholder="Dirección de entrega *" value={formData.clienteDireccion} onChange={handleChange}
                        className={inputClass('clienteDireccion')} />
                      {erroresForm.clienteDireccion && <p className="text-red-500 text-xs mt-1 ml-1">{erroresForm.clienteDireccion}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <input type="text" name="clienteReferencia" placeholder="Referencia (ej: frente al parque, casa azul)" value={formData.clienteReferencia} onChange={handleChange}
                        className="w-full bg-[#F8FAFC] rounded-xl px-4 py-3 text-sm border-2 border-transparent focus:outline-none" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Método de pago</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['YAPE', 'PLIN', 'EFECTIVO', 'TARJETA'] as MedioPago[]).map(method => {
                  const meta = PAYMENT_META[method];
                  const show =
                    method === 'EFECTIVO' ? Boolean(configPago?.aceptaEfectivo)
                    : method === 'TARJETA' ? Boolean(configPago?.aceptaTarjeta && configPago?.culqiPublicKey)
                    : true;
                  if (!show) return null;
                  const active = formData.medioPago === method;
                  return (
                    <label key={method}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl cursor-pointer text-sm font-bold border-2 transition-all ${active ? '' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                      style={active ? { borderColor: cp, background: `${cp}10`, color: cp } : {}}>
                      <input type="radio" className="hidden" name="medioPago" value={method} checked={active} onChange={handleChange} />
                      <Icon icon={meta.icon} width={18} />
                      {meta.label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Nota del pedido</p>
              <textarea
                name="observaciones"
                placeholder="Alguna indicación especial (opcional)..."
                value={formData.observaciones}
                onChange={handleChange}
                rows={3}
                className="w-full bg-[#F8FAFC] rounded-xl px-4 py-3 text-sm border-2 border-transparent focus:outline-none resize-none"
              />
            </div>

            {/* También te puede gustar — slider 3 cards */}
            {N > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-base font-black text-gray-900">También te puede gustar</p>
                  <div className="flex items-center gap-2">
                    {/* Dots */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1.5 mr-1">
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setSlidePage(i)}
                            className="rounded-full transition-all duration-300"
                            style={{ width: i === slidePage ? 18 : 6, height: 6, background: i === slidePage ? cp : '#D1D5DB' }}
                          />
                        ))}
                      </div>
                    )}
                    {/* Arrows */}
                    <button
                      onClick={prevSlide}
                      className="w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center hover:border-gray-400 transition-colors bg-white"
                    >
                      <Icon icon="solar:alt-arrow-left-bold" width={14} className="text-gray-500" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors text-white"
                      style={{ background: cp, borderColor: cp }}
                    >
                      <Icon icon="solar:alt-arrow-right-bold" width={14} />
                    </button>
                  </div>
                </div>

                {/* Clip window */}
                <div
                  className="overflow-hidden"
                  onMouseEnter={() => setPaused(true)}
                  onMouseLeave={() => setPaused(false)}
                >
                  {/* Track — width = N/VISIBLE * 100% of container so each card = 100%/N of track = container/VISIBLE */}
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{
                      width: `${(N / VISIBLE) * 100}%`,
                      transform: `translateX(-${slidePage * (VISIBLE / N) * 100}%)`,
                    }}
                  >
                    {slideProd.map(p => (
                      <div
                        key={p.id}
                        className="px-1.5"
                        style={{ width: `${100 / N}%` }}
                      >
                        <ProductCardXtra
                          producto={p}
                          slug={slug}
                          diseno={diseno}
                          onAddToCart={() => onAddToCart(p)}
                          onClick={() => navigate(`/tienda/${slug}/producto/${p.id}`)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Order Summary ── */}
          <div className="w-full lg:w-[340px] lg:flex-shrink-0 lg:sticky lg:top-32 space-y-4">

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-black text-gray-900">Resumen del pedido</h2>
              </div>

              {/* Mini cart */}
              <div className="px-5 py-3 space-y-3 max-h-56 overflow-y-auto border-b border-gray-50">
                {carrito.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                        {item.imagenUrl
                          ? <img src={item.imagenUrl} className="w-full h-full object-contain p-0.5" alt="" />
                          : <div className="w-full h-full flex items-center justify-center"><Icon icon="solar:box-linear" className="text-gray-200 text-lg" /></div>}
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center" style={{ background: cp }}>
                        {item.cantidad}
                      </span>
                    </div>
                    <p className="flex-1 text-xs font-semibold text-gray-700 line-clamp-2 leading-tight">{item.descripcion}</p>
                    <span className="text-xs font-black text-gray-900 flex-shrink-0">S/ {(Number(item.precioUnitario) * item.cantidad).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">S/ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Envío</span>
                  <span className="font-bold text-gray-900">
                    {envio === 0
                      ? <span className="text-emerald-500 font-bold">Gratis</span>
                      : `S/ ${envio.toFixed(2)}`}
                  </span>
                </div>

                {/* Free delivery progress */}
                {freeDeliveryThreshold > 0 && freeDeliveryRemaining > 0 && (
                  <div className="rounded-xl bg-emerald-50 px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon icon="solar:delivery-linear" width={13} className="text-emerald-500" />
                      <span className="text-xs font-bold text-emerald-600">
                        Agrega S/ {freeDeliveryRemaining.toFixed(2)} para envío gratis
                      </span>
                    </div>
                    <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${freeDeliveryProgress}%`, background: '#22C55E' }} />
                    </div>
                  </div>
                )}

                {erroresForm._minimo && (
                  <p className="text-red-500 text-xs font-medium flex items-center gap-1">
                    <Icon icon="mdi:alert-circle" width={13} />{erroresForm._minimo}
                  </p>
                )}

                <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                  <span className="font-black text-gray-900">Total</span>
                  <span className="text-2xl font-black text-gray-900">S/ {total.toFixed(2)}</span>
                </div>

                <button
                  onClick={onSubmit}
                  disabled={enviando || carrito.length === 0}
                  className="w-full py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 shadow-lg"
                  style={{ background: cp }}
                >
                  {enviando
                    ? <><Icon icon="solar:refresh-bold" className="animate-spin" width={16} />Procesando...</>
                    : <>Confirmar pedido <Icon icon="solar:arrow-right-bold" width={16} /></>}
                </button>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 pt-1">
                  {[
                    { icon: 'solar:shield-check-bold', label: 'Compra segura' },
                    { icon: 'solar:lock-bold', label: 'Datos protegidos' },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-gray-300">
                      <Icon icon={icon} width={14} />
                      <span className="text-[10px] font-semibold">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer tienda={tienda} diseno={diseno} />
    </div>
  );
}
