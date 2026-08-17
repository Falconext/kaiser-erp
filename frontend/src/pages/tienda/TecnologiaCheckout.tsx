import { type ChangeEvent, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import TecnologiaHeader from '@/components/tienda/TecnologiaHeader';
import TecnologiaFooter from '@/components/tienda/TecnologiaFooter';
import ProductCardXtra from '@/components/tienda/ProductCardXtra';
import { BancoLogo } from '@/components/shared/BancoLogo';

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
  YAPE:          { label: 'Yape',          icon: 'solar:smartphone-bold' },
  PLIN:          { label: 'Plin',          icon: 'solar:wallet-money-bold' },
  EFECTIVO:      { label: 'Efectivo',      icon: 'solar:banknote-2-bold' },
  TRANSFERENCIA: { label: 'Transferencia', icon: 'solar:card-transfer-bold' },
  TARJETA:       { label: 'Tarjeta',       icon: 'solar:card-2-bold' },
};

// ── Reusable section heading ────────────────────────────────────────────────
function SectionTitle({ children, cp }: { children: React.ReactNode; cp: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: cp }} />
      <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">{children}</h2>
    </div>
  );
}

// ── Dark input helper ───────────────────────────────────────────────────────
function inputCls(field: string, errors: Record<string, string>) {
  const base = `w-full bg-gray-50 text-gray-900 rounded-xl px-4 py-3 text-sm border transition-colors focus:outline-none focus:border-gray-400 placeholder-gray-400`;
  if (errors[field]) return `${base} border-red-500`;
  return `${base} border-gray-200`;
}

export default function TecnologiaCheckout({
  slug, tienda, carrito, formData, erroresForm, configPago, configEnvio,
  enviando, suggestedProducts, search, searchResults, setSearch,
  handleChange, updateQuantity, removeItem,
  calcularSubtotal, calcularCostoEnvio, calcularTotal, onSubmit, onAddToCart,
  freeDeliveryThreshold, freeDeliveryRemaining, freeDeliveryProgress,
}: Props) {
  const navigate = useNavigate();
  const diseno = tienda?.diseno || {};
  const cp = diseno.colorPrimario || '#D92D20';
  const subtotal = calcularSubtotal();
  const envio = calcularCostoEnvio();
  const total = calcularTotal();
  const hasBankAccounts = Array.isArray(configPago?.cuentasBancarias) && configPago.cuentasBancarias.length > 0;
  const acceptedPaymentMethods = ([
    configPago?.yapeQR || configPago?.yapeQrUrl || configPago?.yapeNumero ? 'YAPE' : null,
    configPago?.plinQR || configPago?.plinQrUrl || configPago?.plinNumero ? 'PLIN' : null,
    configPago?.aceptaEfectivo ? 'EFECTIVO' : null,
    hasBankAccounts ? 'TRANSFERENCIA' : null,
    configPago?.aceptaTarjeta && configPago?.culqiPublicKey ? 'TARJETA' : null,
  ].filter(Boolean) as MedioPago[]);
  const footerCategories = Array.from(new Set((suggestedProducts || [])
    .map((product: any) => typeof product?.categoria === 'object' ? product.categoria?.nombre : product?.categoria)
    .filter(Boolean)))
    .map((nombre) => ({ nombre: String(nombre) }));

  const handleSearchSubmit = (e: React.FormEvent, value?: string) => {
    e.preventDefault();
    const q = value || search;
    if (q.trim()) navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(q.trim())}`);
  };

  // ── Suggested-products slider ──────────────────────────────────────────
  const [VISIBLE, setVISIBLE] = useState(() =>
    window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3
  );
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
    const t = setInterval(() => setSlidePage(p => (p + 1) % totalPages), 3800);
    return () => clearInterval(t);
  }, [paused, totalPages, N, VISIBLE]);

  const prevSlide = useCallback(() => setSlidePage(p => (p - 1 + totalPages) % totalPages), [totalPages]);
  const nextSlide = useCallback(() => setSlidePage(p => (p + 1) % totalPages), [totalPages]);

  return (
    <div
      className="min-h-screen bg-[#F8F9FA]"
      style={{ fontFamily: `'${diseno.tipografia || 'Inter'}', sans-serif` }}
    >
      {/* ── Header ── */}
      <TecnologiaHeader
        tienda={tienda}
        slug={slug}
        cp={cp}
        carritoSize={carrito.length}
        onOpenCart={() => {}}
        searchQuery={search}
        setSearchQuery={setSearch}
        onSearchSubmit={handleSearchSubmit}
        allCategories={footerCategories}
      />

      <div className="max-w-screen-xl mx-auto px-4 md:px-8 pt-8 pb-20">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(`/tienda/${slug}`)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors group"
          >
            <span className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-gray-500 transition-colors">
              <Icon icon="solar:arrow-left-linear" width={14} className="text-gray-600" />
            </span>
            <span className="text-gray-600 group-hover:text-gray-900">Volver a la tienda</span>
          </button>

          {/* Breadcrumb steps */}
          <div className="hidden sm:flex items-center gap-2">
            {['Carrito', 'Información', 'Confirmación'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black"
                  style={
                    i === 1
                      ? { background: cp, color: '#fff' }
                      : { background: '#E5E7EB', color: '#6B7280' }
                  }
                >
                  {i + 1}
                </div>
                <span className={`text-xs font-bold ${i === 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                  {step}
                </span>
                {i < 2 && <Icon icon="solar:alt-arrow-right-linear" width={12} className="text-gray-400" />}
              </div>
            ))}
          </div>
        </div>

        <div className="sm:hidden flex items-center gap-2 mb-5">
          {['Carrito', 'Info', 'Confirmar'].map((step, i) => (
            <div key={step} className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                style={i === 1 ? { background: cp, color: '#fff' } : { background: '#E5E7EB', color: '#6B7280' }}
              >
                {i + 1}
              </div>
              <span className={`text-[11px] font-bold ${i === 1 ? 'text-gray-900' : 'text-gray-500'}`}>{step}</span>
              {i < 2 && <Icon icon="solar:alt-arrow-right-linear" width={10} className="text-gray-400" />}
            </div>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-1 min-w-0 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-black text-gray-900">
                  Mi carrito{' '}
                  <span className="text-gray-500 font-normal text-sm">
                    ({carrito.length} {carrito.length === 1 ? 'artículo' : 'artículos'})
                  </span>
                </h2>
              </div>

              <div className="divide-y divide-gray-100">
                {carrito.map(item => {
                  const price = Number(item.precioUnitario || 0);
                  const original = Number(item.precioOriginal || 0);
                  const hasDiscount = original > price;
                  return (
                    <div key={item.id} className="px-5 py-4 flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100 p-1">
                        {item.imagenUrl
                          ? <img src={item.imagenUrl} className="w-full h-full object-contain" alt="" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <Icon icon="solar:box-linear" className="text-gray-400 text-2xl" />
                            </div>
                        }
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{item.descripcion}</p>
                        {item.partNumber && (
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">PN: {item.partNumber}</p>
                        )}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors mt-1.5"
                        >
                          <Icon icon="solar:trash-bin-trash-linear" width={13} />
                          Eliminar
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 bg-gray-50 rounded-xl px-2 py-1.5 border border-gray-200">
                        <button
                          onClick={() => updateQuantity(item.id, item.cantidad - 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-400 transition-colors"
                        >
                          <Icon icon="mdi:minus" width={12} />
                        </button>
                        <span className="w-6 text-center text-sm font-black text-gray-900">{item.cantidad}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.cantidad + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-400 transition-colors"
                        >
                          <Icon icon="mdi:plus" width={12} />
                        </button>
                      </div>

                      <div className="text-right flex-shrink-0 min-w-[72px]">
                        <p className={`text-base font-black ${hasDiscount ? 'text-red-500' : 'text-gray-900'}`}>
                          S/ {(price * item.cantidad).toFixed(2)}
                        </p>
                        {hasDiscount && (
                          <p className="text-xs text-gray-400 line-through">
                            S/ {(original * item.cantidad).toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {configEnvio && (configEnvio.aceptaEnvio || configEnvio.aceptaRecojo) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <SectionTitle cp={cp}>Método de entrega</SectionTitle>
                <div className="flex gap-3">
                  {configEnvio.aceptaEnvio && (
                    <label
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer text-sm font-bold border-2 transition-all"
                      style={
                        formData.tipoEntrega === 'ENVIO'
                          ? { borderColor: cp, background: `${cp}10`, color: cp }
                          : { borderColor: '#E5E7EB', color: '#6B7280' }
                      }
                    >
                      <input type="radio" className="hidden" name="tipoEntrega" value="ENVIO" checked={formData.tipoEntrega === 'ENVIO'} onChange={handleChange} />
                      <Icon icon="solar:delivery-bold" width={18} />
                      Envío
                      {configEnvio.costoEnvio > 0 && (
                        <span className="text-xs opacity-70">S/ {Number(configEnvio.costoEnvio).toFixed(2)}</span>
                      )}
                    </label>
                  )}
                  {configEnvio.aceptaRecojo && (
                    <label
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl cursor-pointer text-sm font-bold border-2 transition-all"
                      style={
                        formData.tipoEntrega === 'RECOJO'
                          ? { borderColor: cp, background: `${cp}10`, color: cp }
                          : { borderColor: '#E5E7EB', color: '#6B7280' }
                      }
                    >
                      <input type="radio" className="hidden" name="tipoEntrega" value="RECOJO" checked={formData.tipoEntrega === 'RECOJO'} onChange={handleChange} />
                      <Icon icon="solar:shop-bold" width={18} />
                      Recojo en tienda
                    </label>
                  )}
                </div>

                {formData.tipoEntrega === 'RECOJO' && configEnvio.direccionRecojo && (
                  <div className="mt-4 flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <Icon icon="solar:map-point-bold" width={18} style={{ color: cp }} className="flex-shrink-0" />
                    <span className="text-sm text-gray-600">
                      Recojo en: <strong className="text-gray-900">{configEnvio.direccionRecojo}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <SectionTitle cp={cp}>Datos del cliente</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    name="clienteNombre"
                    placeholder="Nombre completo *"
                    value={formData.clienteNombre}
                    onChange={handleChange}
                    className={inputCls('clienteNombre', erroresForm)}
                  />
                  {erroresForm.clienteNombre && <p className="text-red-500 text-xs mt-1 ml-1">{erroresForm.clienteNombre}</p>}
                </div>
                <div>
                  <input
                    type="tel"
                    name="clienteTelefono"
                    placeholder="Teléfono *"
                    value={formData.clienteTelefono}
                    onChange={handleChange}
                    className={inputCls('clienteTelefono', erroresForm)}
                  />
                  {erroresForm.clienteTelefono && <p className="text-red-500 text-xs mt-1 ml-1">{erroresForm.clienteTelefono}</p>}
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="email"
                    name="clienteEmail"
                    placeholder="Email (opcional)"
                    value={formData.clienteEmail}
                    onChange={handleChange}
                    className={inputCls('clienteEmail', erroresForm)}
                  />
                  {erroresForm.clienteEmail && <p className="text-red-500 text-xs mt-1 ml-1">{erroresForm.clienteEmail}</p>}
                </div>

                {formData.tipoEntrega === 'ENVIO' && (
                  <>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        name="clienteDireccion"
                        placeholder="Dirección de entrega *"
                        value={formData.clienteDireccion}
                        onChange={handleChange}
                        className={inputCls('clienteDireccion', erroresForm)}
                      />
                      {erroresForm.clienteDireccion && <p className="text-red-500 text-xs mt-1 ml-1">{erroresForm.clienteDireccion}</p>}
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        name="clienteReferencia"
                        placeholder="Referencia (ej: frente al parque, casa azul)"
                        value={formData.clienteReferencia}
                        onChange={handleChange}
                        className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm border border-gray-200 focus:outline-none placeholder-gray-400 transition-colors"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <SectionTitle cp={cp}>Método de pago</SectionTitle>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(['YAPE', 'PLIN', 'EFECTIVO', 'TRANSFERENCIA', 'TARJETA'] as MedioPago[]).map(method => {
                  const meta = PAYMENT_META[method];
                  const show =
                    method === 'EFECTIVO' ? Boolean(configPago?.aceptaEfectivo)
                    : method === 'TRANSFERENCIA' ? Boolean(configPago?.cuentasBancarias?.length > 0)
                    : method === 'TARJETA' ? Boolean(configPago?.aceptaTarjeta && configPago?.culqiPublicKey)
                    : true;
                  if (!show) return null;
                  const active = formData.medioPago === method;
                  return (
                    <label
                      key={method}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-xl cursor-pointer text-sm font-bold border-2 transition-all"
                      style={active
                        ? { borderColor: cp, background: `${cp}10`, color: cp }
                        : { borderColor: '#E5E7EB', color: '#6B7280' }
                      }
                    >
                      <input type="radio" className="hidden" name="medioPago" value={method} checked={active} onChange={handleChange} />
                      <Icon icon={meta.icon} width={18} />
                      {meta.label}
                    </label>
                  );
                })}
              </div>

              {formData.medioPago === 'TRANSFERENCIA' && configPago?.cuentasBancarias?.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm font-bold text-gray-900">Cuentas Bancarias Disponibles</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {configPago.cuentasBancarias.map((cuenta: any) => (
                      <div key={cuenta.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex gap-4 items-center">
                        <BancoLogo banco={cuenta.banco} size={48} />
                        <div className="flex flex-col flex-1 gap-1">
                          <span className="text-sm font-mono text-gray-800 font-bold tracking-tight">{cuenta.numeroCuenta}</span>
                          {cuenta.cci && <span className="text-xs text-gray-500">CCI: <span className="font-mono">{cuenta.cci}</span></span>}
                          {cuenta.titular && <span className="text-xs text-gray-600 mt-0.5">Titular: <span className="font-bold text-gray-800">{cuenta.titular}</span></span>}
                          <div className="flex gap-2 mt-1.5">
                            <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500 font-bold uppercase">{cuenta.tipoCuenta}</span>
                            <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500 font-bold uppercase">{cuenta.moneda}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <SectionTitle cp={cp}>Nota del pedido</SectionTitle>
              <textarea
                name="observaciones"
                placeholder="Alguna indicación especial, instrucciones de instalación, etc. (opcional)..."
                value={formData.observaciones}
                onChange={handleChange}
                rows={3}
                className="w-full bg-white text-gray-900 rounded-xl px-4 py-3 text-sm border border-gray-200 focus:outline-none placeholder-gray-400 resize-none transition-colors"
              />
            </div>

            {N > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-base font-black text-gray-900">También te puede gustar</p>
                  <div className="flex items-center gap-2">
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1.5 mr-1">
                        {Array.from({ length: totalPages }).map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setSlidePage(i)}
                            className="rounded-full transition-all duration-300"
                            style={{
                              width: i === slidePage ? 18 : 6,
                              height: 6,
                              background: i === slidePage ? cp : '#E5E7EB',
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <button
                      onClick={prevSlide}
                      className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-400 transition-colors bg-white"
                    >
                      <Icon icon="solar:alt-arrow-left-bold" width={14} className="text-gray-400" />
                    </button>
                    <button
                      onClick={nextSlide}
                      className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors text-white"
                      style={{ background: cp, borderColor: cp }}
                    >
                      <Icon icon="solar:alt-arrow-right-bold" width={14} />
                    </button>
                  </div>
                </div>

                <div
                  className="overflow-hidden"
                  onMouseEnter={() => setPaused(true)}
                  onMouseLeave={() => setPaused(false)}
                >
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
                          diseno={{ ...diseno, colorPrimario: cp }}
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

          <div className="w-full lg:w-[340px] lg:flex-shrink-0 lg:sticky lg:top-28 space-y-4">

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-black text-gray-900 text-base">Resumen del pedido</h2>
              </div>

              <div className="px-5 py-3 space-y-3 max-h-56 overflow-y-auto border-b border-gray-100">
                {carrito.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                        {item.imagenUrl
                          ? <img src={item.imagenUrl} className="w-full h-full object-contain p-0.5" alt="" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <Icon icon="solar:box-linear" className="text-gray-400 text-lg" />
                            </div>
                        }
                      </div>
                      <span
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black text-white flex items-center justify-center"
                        style={{ background: cp }}
                      >
                        {item.cantidad}
                      </span>
                    </div>
                    <p className="flex-1 text-xs font-semibold text-gray-600 line-clamp-2 leading-tight">{item.descripcion}</p>
                    <span className="text-xs font-black text-gray-900 flex-shrink-0">
                      S/ {(Number(item.precioUnitario) * item.cantidad).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="px-6 py-5 space-y-3">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">S/ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Envío</span>
                  <span className="font-bold text-gray-900">
                    {envio === 0
                      ? <span className="text-emerald-600 font-bold">Gratis</span>
                      : `S/ ${envio.toFixed(2)}`}
                  </span>
                </div>

                {freeDeliveryThreshold > 0 && freeDeliveryRemaining > 0 && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon icon="solar:delivery-linear" width={13} className="text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-600">
                        Agrega S/ {freeDeliveryRemaining.toFixed(2)} para envío gratis
                      </span>
                    </div>
                    <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${freeDeliveryProgress}%`, background: '#059669' }}
                      />
                    </div>
                  </div>
                )}

                {erroresForm._minimo && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <Icon icon="mdi:alert-circle" width={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-red-500 text-xs font-medium">{erroresForm._minimo}</p>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                  <span className="font-black text-gray-900 uppercase tracking-wider text-sm">Total</span>
                  <span className="text-2xl font-black" style={{ color: cp }}>
                    S/ {total.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={onSubmit}
                  disabled={enviando || carrito.length === 0}
                  className="w-full py-4 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider shadow-lg"
                  style={{ background: cp }}
                >
                  {enviando
                    ? <><Icon icon="solar:refresh-bold" className="animate-spin" width={16} />Procesando...</>
                    : <>Confirmar pedido <Icon icon="solar:arrow-right-bold" width={16} /></>
                  }
                </button>

                <div className="flex items-center justify-center gap-5 pt-1">
                  {[
                    { icon: 'solar:shield-check-bold', label: 'Compra segura' },
                    { icon: 'solar:lock-bold', label: 'Datos protegidos' },
                  ].map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-gray-400">
                      <Icon icon={icon} width={14} />
                      <span className="text-[10px] font-semibold">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Medios de pago aceptados</p>
              <div className="flex flex-wrap gap-2">
                {(acceptedPaymentMethods.length ? acceptedPaymentMethods : (['EFECTIVO'] as MedioPago[])).map(m => {
                  const meta = PAYMENT_META[m];
                  return (
                    <div key={m} className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <Icon icon={meta.icon} width={14} />
                      <span>{meta.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <TecnologiaFooter tienda={tienda} diseno={diseno} slug={slug} categories={footerCategories} />
    </div>
  );
}
