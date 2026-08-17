import { useEffect, useMemo, useState } from 'react';
import { useConfiguracionTiendaViewModel } from '@/features/admin/tienda/useConfiguracionTiendaViewModel';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import InputPro from '@/components/InputPro';
import {
  ALL_PLANTILLAS,
  getPurchasedPremiumTemplates,
  isTemplateAllowedForRubro,
  isTemplatePremiumLocked,
  resolveTemplateId,
} from '@/components/tienda/resolveTemplate';
import { LIVE_EDITOR_FIELDS } from '@/components/tienda/liveEditorFields';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';
import apiClient from '@/utils/apiClient';

type PlantillaVentaConfig = {
  id: string;
  premium?: boolean;
  precioSoles?: number;
  premiumNote?: string;
};

const PREMIUM_TEMPLATE_DETAILS: Record<string, { headline: string; features: string[]; pages: string[] }> = {
  maye: {
    headline: 'Experiencia ecommerce premium para tiendas tecnológicas con portada editorial, secciones comerciales y microinteracciones.',
    features: ['Home premium con banners compuestos', 'Productos destacados y ofertas configurables', 'Animaciones profesionales', 'Personalización en vivo de textos, imágenes y productos'],
    pages: ['Inicio', 'Catálogo', 'Detalle de producto', 'Checkout', 'Carrito lateral'],
  },
  falcon: {
    headline: 'Marketplace tecnológico completo tipo Gadgetize, pensado para vender gadgets, cómputo y accesorios con una experiencia más robusta.',
    features: ['Home con hero, banners laterales y categorías circulares', 'Blog integrado editable', 'Carrito lateral premium', 'Checkout profesional', 'Selector de productos destacados'],
    pages: ['Inicio', 'Catálogo', 'Blog', 'Detalle de producto', 'Checkout', 'Carrito lateral'],
  },
  construccion: {
    headline: 'Plantilla profesional tipo ferretería para herramientas, materiales de obra y ventas con alto ticket.',
    features: ['Diseño especializado para ferretería', 'Catálogo con filtros profesionales', 'Checkout adaptado a pedidos de tienda', 'Página de contacto', 'Carrito lateral personalizado'],
    pages: ['Inicio', 'Catálogo', 'Detalle de producto', 'Checkout', 'Contacto', 'Carrito lateral'],
  },
  apicultura: {
    headline: 'Diseño cálido y premium para miel, productos naturales, alimentos artesanales y marcas orgánicas.',
    features: ['Portada visual con enfoque natural', 'Secciones de beneficios y confianza', 'Checkout limpio', 'Página de contacto', 'Personalización visual avanzada'],
    pages: ['Inicio', 'Catálogo', 'Detalle de producto', 'Checkout', 'Contacto'],
  },
};

const mergePlantillaConfig = (plantilla: any, config?: PlantillaVentaConfig) => ({
  ...plantilla,
  premium: config?.premium ?? plantilla.premium,
  precioSoles: config?.precioSoles ?? plantilla.precioSoles,
  premiumNote: config?.premiumNote ?? plantilla.premiumNote,
});

const getTemplateDetails = (plantilla: any) => {
  const specific = PREMIUM_TEMPLATE_DETAILS[plantilla.id];
  if (specific) return specific;
  return {
    headline: plantilla.description || 'Diseño avanzado para mejorar la presentación de tu tienda y diferenciar tu marca.',
    features: [
      'Diseño optimizado para mobile y escritorio',
      'Secciones comerciales listas para vender',
      'Estilo visual profesional según el rubro',
      'Compatible con catálogo, carrito y checkout',
    ],
    pages: ['Inicio', 'Catálogo', 'Detalle de producto', 'Checkout'],
  };
};


export default function TemplateTienda() {
  const vm = useConfiguracionTiendaViewModel();
  const auth = useAuthStore(s => s.auth);
  const { alert } = useAlertStore();
  const rubroNombre = vm.config?.rubro?.nombre || auth?.empresa?.rubro?.nombre || '';
  const rubroId = vm.config?.rubro?.id || (auth as any)?.empresa?.rubroId || (auth as any)?.empresa?.rubro?.id;
  const activePlantillaId = vm.config?.diseno?.plantillaId;
  const activeTemplateId = resolveTemplateId(activePlantillaId);
  // Las plantillas con editor en vivo personalizan banners/imágenes directo en la tienda,
  // así que aquí se ocultan los "Banners de Tienda Virtual" (sistema antiguo) para evitar duplicidad.
  const usesLiveTemplateEditor = Object.prototype.hasOwnProperty.call(LIVE_EDITOR_FIELDS, activeTemplateId);
  const [rubroPlantillaId, setRubroPlantillaId] = useState<string | null>(null);
  const [loadingRubroPlantilla, setLoadingRubroPlantilla] = useState(false);
  const [plantillasConfig, setPlantillasConfig] = useState<Record<string, PlantillaVentaConfig>>({});
  const [previewPlantilla, setPreviewPlantilla] = useState<any | null>(null);
  const plantillasPremiumCompradas = useMemo(
    () => getPurchasedPremiumTemplates(vm.config?.diseno),
    [vm.config?.diseno],
  );

  useEffect(() => {
    let mounted = true;
    apiClient.get('/diseno-rubro/plantillas/config')
      .then(({ data }) => {
        if (!mounted) return;
        const payload = (data as any)?.data ?? data;
        const lista = Array.isArray(payload) ? payload : [];
        const map = lista.reduce<Record<string, PlantillaVentaConfig>>((acc, item: PlantillaVentaConfig) => {
          if (item?.id) acc[item.id] = item;
          return acc;
        }, {});
        setPlantillasConfig(map);
      })
      .catch(() => {
        if (mounted) setPlantillasConfig({});
      });

    return () => { mounted = false; };
  }, []);

  const plantillasCatalogo = useMemo(
    () => ALL_PLANTILLAS.map(plantilla => mergePlantillaConfig(plantilla, plantillasConfig[plantilla.id])),
    [plantillasConfig],
  );

  // Plantillas que el ADMIN_SISTEMA habilitó para este rubro (CSV en diseno-rubro).
  useEffect(() => {
    let mounted = true;
    if (!rubroId) {
      setRubroPlantillaId(null);
      return;
    }

    setLoadingRubroPlantilla(true);
    apiClient.get(`/diseno-rubro/${rubroId}`)
      .then(({ data }) => {
        if (!mounted) return;
        const payload = data?.data ?? data;
        const plantillaId = typeof payload?.plantillaId === 'string' ? payload.plantillaId : null;
        setRubroPlantillaId(plantillaId);
      })
      .catch(() => {
        if (mounted) setRubroPlantillaId(null);
      })
      .finally(() => {
        if (mounted) setLoadingRubroPlantilla(false);
      });

    return () => { mounted = false; };
  }, [rubroId]);

  // IDs habilitados para el rubro: lo que asignó el admin manda. Si el admin aún no
  // configuró este rubro, caemos al permiso por defecto del catálogo de plantillas.
  const allowedPlantillaIds = useMemo(() => {
    const fromAdmin = (rubroPlantillaId || '').split(',').map(s => s.trim()).filter(Boolean);
    if (fromAdmin.length > 0) return fromAdmin;
    if (rubroNombre) {
      const porRubro = plantillasCatalogo.filter(p => isTemplateAllowedForRubro(p, rubroNombre)).map(p => p.id);
      if (porRubro.length > 0) return porRubro;
    }
    return ['moderna'];
  }, [plantillasCatalogo, rubroPlantillaId, rubroNombre]);

  const plantillasVisibles = useMemo(
    () => plantillasCatalogo.filter(p => allowedPlantillaIds.includes(p.id)),
    [allowedPlantillaIds, plantillasCatalogo],
  );

  // La plantilla activa en la tienda es la que el emprendedor eligió (override),
  // ya validada por el backend contra la lista permitida.
  const seleccionada = allowedPlantillaIds.includes(activePlantillaId)
    ? activePlantillaId
    : allowedPlantillaIds[0];

  const elegirPlantilla = (id: string) => {
    if (id === activePlantillaId || vm.saving) return;
    const plantilla = plantillasCatalogo.find(item => item.id === id);
    if (plantilla && isTemplatePremiumLocked(plantilla, vm.config?.diseno)) {
      alert(`La plantilla ${plantilla.label} es premium. Solicita la compra para activarla.`, 'warning');
      return;
    }
    vm.actualizarDiseno({ plantillaId: id });
  };

  const solicitarPlantillaPremium = (plantilla: any) => {
    const mensaje = encodeURIComponent(
      `Hola, quiero comprar la plantilla premium ${plantilla.label} para mi tienda. Precio: S/ ${Number(plantilla.precioSoles || 0).toFixed(2)}.`,
    );
    window.open(`https://wa.me/?text=${mensaje}`, '_blank');
  };

  const getPreviewUrl = (plantillaId: string) => {
    if (formData.slugTienda) {
      const params = new URLSearchParams({
        previewPlantilla: plantillaId,
        previewOrigen: 'template',
      });
      return `/tienda/${formData.slugTienda}?${params.toString()}`;
    }

    const diseno = vm.config?.diseno || {};
    const params = new URLSearchParams({
      plantillaId,
      colorPrimario: diseno.colorPrimario || '#6A6CFF',
      colorSecundario: diseno.colorSecundario || '#ffffff',
      colorAccento: diseno.colorAccento || '#FF6B6B',
      tipografia: diseno.tipografia || 'Inter',
      rubroNombre: rubroNombre || 'Tienda',
    });
    return `/diseno-preview?${params.toString()}`;
  };

  const { formData, saving } = vm;

  // Sync live changes to iframe
  useEffect(() => {
    const iframe = document.getElementById('live-editor-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: 'UPDATE_DISENO', payload: vm.config?.diseno || {} },
        '*'
      );
    }
  }, [vm.config?.diseno]);

  if (vm.loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-[#0A0D14]">
        <Icon icon="eos-icons:loading" className="w-12 h-12 text-gray-400" />
      </div>
    );
  }

  if (!vm.config?.plan?.tieneTienda) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 bg-white dark:bg-[#111827] rounded-lg shadow text-center border dark:border-transparent">
        <Icon icon="mdi:store-off" className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2 dark:text-white">Template de tienda no disponible</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Tu plan actual no incluye tienda virtual.</p>
        <Button onClick={() => window.location.href = '/administrador/perfil'}>Ver Planes</Button>
      </div>
    );
  }


  return (
    <div className="min-h-screen pb-4 px-2 bg-gray-50 dark:bg-[#0A0D14]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Icon icon="solar:palette-round-bold-duotone" className="text-indigo-600 dark:text-indigo-400" />
            Diseño y Template de Tienda
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Personaliza plantilla, banners e imágenes visuales del template.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.location.href = '/administrador/tienda/configuracion'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-50 dark:hover:bg-slate-900 transition-all"
          >
            <Icon icon="solar:settings-bold" className="text-lg" />
            Config. general
          </button>
          {formData.slugTienda && (
            <button
              type="button"
              onClick={vm.abrirTienda}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              <Icon icon="solar:shop-2-bold" className="text-lg" />
              Ver mi tienda
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Lanzador del editor en vivo (modo WordPress) */}
        <button
          type="button"
          onClick={() => {
            if (!formData.slugTienda) { alert('Primero configura el nombre de tu tienda (slug)', 'warning'); return; }
            window.open(`/tienda/${formData.slugTienda}?edit=1`, '_blank');
          }}
          className="group w-full text-left rounded-2xl p-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30 transition-all active:scale-[0.99] flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4 min-w-0">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Icon icon="solar:magic-stick-3-bold" className="text-2xl" />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-black leading-tight">Personalizar mi tienda en vivo</p>
              <p className="text-sm text-white/80">Abre tu tienda real y edita textos, colores e imágenes con un panel lateral, viendo los cambios al instante.</p>
            </div>
          </div>
          <Icon icon="solar:arrow-right-bold" className="text-2xl flex-shrink-0 transition-transform group-hover:translate-x-1" />
        </button>

        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Icon icon="solar:shop-2-bold-duotone" className="text-xl text-indigo-500" />
            Plantilla de Tienda
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Elige el diseño con el que se verá tu tienda. Estos son los diseños habilitados para el rubro {rubroNombre ? <strong>{rubroNombre}</strong> : 'de tu empresa'}.
            {loadingRubroPlantilla ? ' Cargando diseños del rubro...' : ' El cambio se aplica al instante en tu tienda virtual.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {plantillasVisibles.map(plantilla => {
              const isOn = seleccionada === plantilla.id;
              const isPremium = Boolean(plantilla.premium);
              const isPurchased = plantillasPremiumCompradas.includes(plantilla.id);
              const isLocked = isTemplatePremiumLocked(plantilla, vm.config?.diseno);
              const details = getTemplateDetails(plantilla);

              return (
                <div
                  key={plantilla.id}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all flex flex-col hover:border-indigo-300 dark:hover:border-indigo-700
                    ${isOn ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-sm' : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                >
                  {isOn && (
                    <span className="absolute top-2 right-2">
                      <Icon icon="solar:check-circle-bold" className="text-indigo-600 text-sm" />
                    </span>
                  )}

                  {isPremium && (
                    <span className={`absolute top-2 ${isOn ? 'right-8' : 'right-2'} inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${isPurchased ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                      <Icon icon={isPurchased ? 'solar:unlock-bold' : 'solar:lock-keyhole-bold'} className="text-xs" />
                      {isPurchased ? 'Comprada' : 'Premium'}
                    </span>
                  )}

                  <div className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: plantilla.accentColor + '18' }}>
                    <Icon icon={plantilla.icon} className="text-xl" style={{ color: plantilla.accentColor }} />
                  </div>

                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">{plantilla.label}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {plantilla.description}
                  </p>

                  {isPremium && (
                    <div className="mt-3 space-y-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3 dark:border-amber-900/40 dark:bg-amber-900/10">
                      <div>
                        <p className="text-lg font-black text-gray-900 dark:text-white">S/ {Number(plantilla.precioSoles || 0).toFixed(2)}</p>
                        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          {plantilla.premiumNote || 'Compra única aparte del plan'}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {details.features.slice(0, 3).map((feature) => (
                          <p key={feature} className="flex items-start gap-1.5 text-[10px] font-semibold leading-snug text-gray-700 dark:text-gray-300">
                            <Icon icon="solar:check-circle-bold" className="mt-0.5 flex-shrink-0 text-emerald-500" />
                            {feature}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewPlantilla(plantilla)}
                      className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-200 dark:ring-slate-700"
                    >
                      {isPremium ? 'Ver qué incluye' : 'Vista previa'}
                    </button>
                    <button
                      type="button"
                      onClick={() => elegirPlantilla(plantilla.id)}
                      disabled={vm.saving || isLocked}
                      className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all disabled:cursor-not-allowed
                        ${isOn
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                          : isLocked
                            ? 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500'
                            : 'bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-gray-900'}`}
                    >
                      {isOn ? 'Diseño activo' : isLocked ? 'Bloqueada' : 'Usar diseño'}
                    </button>
                    {isLocked && (
                      <button
                        type="button"
                        onClick={() => solicitarPlantillaPremium(plantilla)}
                        className="rounded-full bg-amber-500 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-white hover:bg-amber-600"
                      >
                        Comprar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {!usesLiveTemplateEditor && vm.bannerSlots.length > 0 && <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-transparent p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Icon icon="solar:gallery-bold-duotone" className="text-xl text-[#FF9500]" />
              Banners de Tienda Virtual
            </h3>
            <span className="text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-bold px-3 py-1 rounded-full">
              {vm.banners.length} / {vm.bannerIsSlider ? 3 : 6}
            </span>
          </div>
          <div className="flex items-center justify-between mb-5 p-4 bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-gray-200 dark:border-transparent">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Icon icon="solar:play-circle-bold-duotone" className="text-[#FF9500]" width={18} />
                Modo carrusel
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {vm.bannerIsSlider
                  ? 'Las imágenes rotan automáticamente como slider (máx. 3 slides)'
                  : 'Layout clásico con hero, tarjetas laterales y banners promo'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => vm.toggleBannerIsSlider(!vm.bannerIsSlider)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${vm.bannerIsSlider ? 'bg-[#FF9500]' : 'bg-gray-300 dark:bg-slate-600'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${vm.bannerIsSlider ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <>
              <div className="mb-6 bg-[#FFF8F0] dark:bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-2xl p-5">
                <p className="text-sm font-bold text-[#FF9500] mb-3 flex items-center gap-2">
                  <Icon icon="solar:info-circle-bold" width={16} />
                  {vm.bannerIsSlider ? 'Carrusel de slides — se rotan automáticamente en la tienda' : '¿Cómo se usan los banners en la tienda?'}
                </p>

                {vm.bannerIsSlider ? (
                  <div className="space-y-2">
                    {vm.bannerSlots.map((slot: any) => {
                      const uploaded = vm.banners.find((b: any) => b.orden === slot.orden);
                      return (
                        <div key={slot.orden} className="flex items-center gap-3 bg-white dark:bg-[#0A0D14] rounded-xl border border-gray-200 dark:border-transparent p-3">
                          <span className="w-7 h-7 rounded-full bg-[#FF9500] text-white text-xs font-black flex items-center justify-center flex-shrink-0">{slot.orden + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{slot.label}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{slot.description} · {slot.recomendado}</p>
                          </div>
                          {uploaded ? (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <img src={uploaded.imagenUrl} className="w-14 h-9 object-cover rounded-lg border border-gray-200 dark:border-slate-700" alt="" />
                              <div className="flex flex-col gap-1">
                                <button type="button" onClick={() => vm.openEditModal(uploaded)} className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg p-1 hover:bg-blue-100 transition-colors">
                                  <Icon icon="solar:pen-bold" className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => vm.eliminarBanner(uploaded.id)} className="bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg p-1 hover:bg-red-100 transition-colors">
                                  <Icon icon="mdi:delete" className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">Sin imagen</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-[10px] text-gray-600 dark:text-gray-400">
                    {vm.bannerSlots.map((slot: any) => (
                      <div key={slot.orden} className="bg-white dark:bg-[#0A0D14] rounded-lg border border-gray-100 dark:border-transparent p-2">
                        <p className="font-black text-gray-800 dark:text-white text-[11px]">Orden {slot.orden} — {slot.label}</p>
                        <p className="text-gray-500 dark:text-gray-400 mt-0.5">{slot.description}</p>
                        <p className="text-[#FF9500] font-medium mt-1">📐 {slot.recomendado}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {vm.loadingBanners ? (
                <div className="flex items-center justify-center py-12">
                  <Icon icon="eos-icons:loading" className="w-8 h-8 text-gray-400" />
                </div>
              ) : (
                <div className="space-y-4">
                  {!vm.bannerIsSlider && vm.banners.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                      {[...vm.banners].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999)).map((banner, index) => {
                        const slot = vm.bannerSlots.find((s: any) => s.orden === banner.orden);
                        const label = slot?.label || `Banner ${index + 1}`;
                        return (
                          <div key={banner.id} className="relative group">
                            <div className="rounded-xl overflow-hidden border-2 border-gray-200 dark:border-slate-800 aspect-video">
                              <img src={banner.imagenUrl} alt={banner.titulo || label} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute top-2 left-2 bg-[#FF9500] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                              {label}
                            </div>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => vm.openEditModal(banner)} className="bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full p-1.5 shadow-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors">
                                <Icon icon="solar:pen-bold" className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => vm.eliminarBanner(banner.id)} className="bg-white dark:bg-slate-800 text-red-500 rounded-full p-1.5 shadow-lg hover:bg-red-50 dark:hover:bg-slate-700 transition-colors">
                                <Icon icon="mdi:delete" className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="mt-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 truncate px-1">{banner.titulo || label}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {vm.editingBanner && (
                    <div className="fixed inset-0 z-50 top-[-30px] flex items-center justify-center bg-black/60 p-4">
                      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] border dark:border-transparent">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-lg font-bold dark:text-white">Editar Banner</h3>
                          <button type="button" onClick={() => vm.setEditingBanner(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400">
                            <Icon icon="mdi:close" width={20} />
                          </button>
                        </div>

                        <div className="mb-4 bg-[#FFF8F0] dark:bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-xl p-3 text-sm text-gray-600 dark:text-gray-400">
                          <Icon icon="solar:info-circle-bold" className="inline text-[#FF9500] mr-1" width={14} />
                          {vm.bannerSlots.find((s: any) => s.orden === vm.editingBanner.orden)?.description || `Orden ${vm.editingBanner.orden}`}
                          {' · '}
                          <strong>{vm.bannerSlots.find((s: any) => s.orden === vm.editingBanner.orden)?.recomendado}</strong>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Imagen del Banner</label>
                            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-slate-800 hover:border-[#FF9500] transition-colors cursor-pointer bg-gray-50 dark:bg-slate-900/50 flex items-center justify-center group/edit-img">
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 z-10 cursor-pointer" onChange={(e) => vm.setEditBannerFile(e.target.files?.[0] || null)} />
                              {vm.editBannerFile ? (
                                <img src={URL.createObjectURL(vm.editBannerFile)} className="w-full h-full object-cover" alt="Preview" />
                              ) : vm.editingBanner.imagenUrl ? (
                                <img src={vm.editingBanner.imagenUrl} className="w-full h-full object-cover" alt="Current" />
                              ) : (
                                <span className="text-gray-400 dark:text-gray-600">Clic para subir imagen</span>
                              )}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/edit-img:opacity-100 transition-opacity pointer-events-none">
                                <Icon icon="solar:camera-bold" className="text-white text-3xl" />
                              </div>
                            </div>
                            {vm.editBannerFile && <p className="text-xs text-green-600 mt-1">✓ Nueva imagen: {vm.editBannerFile.name}</p>}
                          </div>

                          <InputPro label="Título (Opcional)" name="titulo" value={vm.editBannerTitle} onChange={(e: any) => vm.setEditBannerTitle(e.target.value)} placeholder="Ej: Gran Liquidación" />
                          <InputPro label="Subtítulo (Opcional)" name="subtitulo" value={vm.editBannerSubtitle} onChange={(e: any) => vm.setEditBannerSubtitle(e.target.value)} placeholder="Ej: Hasta 50% de descuento" />

                          <div className="relative">
                            <InputPro label="Enlace (URL o ruta)" name="link" value={vm.editBannerLink} onChange={(e: any) => vm.setEditBannerLink(e.target.value)} placeholder="/tienda/producto/xyz" />
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 mb-1">O vincula al catálogo por categoría:</label>
                            <select
                              value=""
                              onChange={(e) => { const v = e.target.value; if (!v) return; vm.setEditBannerLink(vm.generarLinkCatalogoCategoria(v)); e.currentTarget.value = ''; }}
                              className="w-full text-sm rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] dark:text-white"
                            >
                              <option value="">Seleccionar categoría...</option>
                              {vm.storeCategories.map((cat: any, idx: number) => {
                                const name = vm.getCategoryLabel(cat);
                                if (!name) return null;
                                return <option key={`${name}-${idx}`} value={name}>{name}</option>;
                              })}
                            </select>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 mb-1">O busca un producto:</label>
                            <input
                              type="text"
                              value={vm.editSearch}
                              onChange={(e) => vm.setEditSearch(e.target.value)}
                              placeholder="Buscar producto..."
                              className="w-full text-sm rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] dark:text-white"
                            />
                            {vm.editSearch.length > 2 && (
                              <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-800 shadow-xl rounded-b-xl z-10 max-h-48 overflow-y-auto mt-1">
                                {vm.searchingEdit ? (
                                  <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">Buscando...</div>
                                ) : vm.editResults.length > 0 ? (
                                  vm.editResults.map((p: any) => (
                                    <div key={p.id} onClick={() => { vm.setEditBannerLink(`/tienda/${formData.slugTienda}/producto/${p.slug || p.id}`); vm.setEditSearch(''); }} className="p-3 hover:bg-[#FFF8F0] dark:hover:bg-slate-800 cursor-pointer text-sm border-b dark:border-slate-800 last:border-0 flex items-center gap-3">
                                      {p.imagenUrl && <img src={p.imagenUrl} className="w-8 h-8 object-contain rounded" alt="" />}
                                      <div>
                                        <div className="font-medium truncate dark:text-white">{p.descripcion}</div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500">S/ {p.precioUnitario}</div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-3 text-center text-xs text-gray-500">Sin resultados</div>
                                )}
                              </div>
                            )}
                          </div>

                          {!vm.bannerIsSlider && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Orden / Posición</label>
                              <select
                                value={vm.editBannerOrden}
                                onChange={(e) => vm.setEditBannerOrden(e.target.value === '' ? '' : Number(e.target.value))}
                                className="w-full rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] text-sm dark:text-white"
                              >
                                <option value="">Sin orden</option>
                                {vm.bannerSlots.map((slot: any) => (
                                  <option key={slot.orden} value={slot.orden}>{slot.orden} — {slot.label} ({slot.recomendado})</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                          <Button type="button" color="secondary" onClick={() => vm.setEditingBanner(null)}>Cancelar</Button>
                          <Button type="button" onClick={vm.handleUpdateBanner} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {vm.canUploadBanner && (
                    <div className="bg-gray-50 dark:bg-slate-900/30 border border-gray-200 dark:border-transparent rounded-xl p-5">
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-1">
                        {vm.bannerIsSlider ? `Agregar slide (${vm.banners.length} / 3)` : 'Subir Nuevo Banner'}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        {vm.bannerIsSlider
                          ? `Se asignará como Slide ${vm.banners.length + 1}. Recomendado: ${vm.bannerSlots[0]?.recomendado || '1400×500px'}`
                          : 'Elige el orden según la posición que quieres en la tienda (ver guía arriba)'}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <InputPro label="Título (Opcional)" name="tituloNew" value={vm.newBannerTitle} onChange={(e: any) => vm.setNewBannerTitle(e.target.value)} placeholder="Ej: Ofertas Especiales" />
                        <InputPro label="Subtítulo (Opcional)" name="subtituloNew" value={vm.newBannerSubtitle} onChange={(e: any) => vm.setNewBannerSubtitle(e.target.value)} placeholder="Ej: Hasta 50% off" />

                        {!vm.bannerIsSlider && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Orden / Posición</label>
                            <select
                              value={vm.newBannerOrden}
                              onChange={(e: any) => vm.setNewBannerOrden(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] text-sm dark:text-white"
                            >
                              <option value="">Automático</option>
                              {vm.bannerSlots.map((slot: any) => (
                                <option key={slot.orden} value={slot.orden}>{slot.orden} — {slot.label} ({slot.recomendado})</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enlace (Opcional)</label>
                          <input
                            type="text"
                            value={vm.newBannerLink}
                            onChange={(e: any) => vm.setNewBannerLink(e.target.value)}
                            placeholder="/tienda/mi-tienda/producto/123"
                            className="w-full text-sm rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] dark:text-white"
                          />
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 mb-1">O por categoría:</label>
                          <select
                            value=""
                            onChange={(e) => { const v = e.target.value; if (!v) return; vm.setNewBannerLink(vm.generarLinkCatalogoCategoria(v)); e.currentTarget.value = ''; }}
                            className="w-full text-sm rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] dark:text-white"
                          >
                            <option value="">Seleccionar categoría...</option>
                            {vm.storeCategories.map((cat: any, idx: number) => {
                              const name = vm.getCategoryLabel(cat);
                              if (!name) return null;
                              return <option key={`${name}-${idx}`} value={name}>{name}</option>;
                            })}
                          </select>
                        </div>
                      </div>

                      <div className="relative mb-4">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">O busca un producto para el enlace:</label>
                        <input
                          type="text"
                          value={vm.productSearch}
                          onChange={(e) => vm.setProductSearch(e.target.value)}
                          placeholder="Buscar producto..."
                          className="w-full text-sm border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] rounded-lg focus:ring-[#FF9500] focus:border-[#FF9500] dark:text-white"
                        />
                        {vm.productSearch.length > 2 && (
                          <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-800 shadow-xl rounded-b-xl z-10 max-h-48 overflow-y-auto mt-1">
                            {vm.searchingProducts ? (
                              <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">Buscando...</div>
                            ) : vm.productResults.length > 0 ? (
                              vm.productResults.map((p: any) => (
                                <div key={p.id} onClick={() => { vm.setNewBannerLink(`/tienda/${formData.slugTienda}/producto/${p.slug || p.id}`); vm.setProductSearch(''); }} className="p-3 hover:bg-[#FFF8F0] dark:hover:bg-slate-800 cursor-pointer text-sm border-b dark:border-slate-800 last:border-0 flex items-center gap-3">
                                  {p.imagenUrl && <img src={p.imagenUrl} className="w-8 h-8 object-contain rounded" alt="" />}
                                  <div>
                                    <div className="font-medium truncate dark:text-white">{p.descripcion}</div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500">S/ {p.precioUnitario}</div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">Sin resultados</div>
                            )}
                          </div>
                        )}
                      </div>

                      <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-xl cursor-pointer bg-white dark:bg-slate-900/50 hover:bg-[#FFF8F0] dark:hover:bg-[#FF9500]/10 hover:border-[#FF9500] transition-colors">
                        <div className="flex flex-col items-center justify-center py-4">
                          {vm.uploadingBanner ? (
                            <>
                              <Icon icon="eos-icons:loading" className="w-10 h-10 text-[#FF9500] mb-2 animate-spin" />
                              <p className="text-sm text-gray-500 font-semibold">Subiendo...</p>
                            </>
                          ) : (
                            <>
                              <Icon icon="solar:cloud-upload-bold-duotone" className="w-10 h-10 text-gray-400 dark:text-gray-600 mb-2" />
                              <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold">Clic para subir</span> o arrastra la imagen</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PNG, JPG o WEBP · máx 2.5MB</p>
                            </>
                          )}
                        </div>
                        <input type="file" className="hidden" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={vm.handleBannerFileChange} disabled={vm.uploadingBanner} />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </>
        </div>}
      </div>
      {previewPlantilla && (() => {
        const details = getTemplateDetails(previewPlantilla);
        const isPremium = Boolean(previewPlantilla.premium);
        const isPurchased = plantillasPremiumCompradas.includes(previewPlantilla.id);
        const isLocked = isTemplatePremiumLocked(previewPlantilla, vm.config?.diseno);
        const isActivePreview = activeTemplateId === previewPlantilla.id;

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 sm:p-5">
            <div className="flex max-h-[94vh] w-full max-w-[min(1800px,96vw)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#111827]">
              <div className="flex flex-col gap-4 border-b border-gray-100 p-4 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${previewPlantilla.accentColor}18`, color: previewPlantilla.accentColor }}>
                      <Icon icon={previewPlantilla.icon} className="text-2xl" />
                    </span>
                    <div>
                      <h3 className="text-xl font-black text-gray-950 dark:text-white">{previewPlantilla.label}</h3>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{previewPlantilla.description}</p>
                    </div>
                  </div>
                  {isPremium && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Icon icon="solar:crown-bold" />
                        Premium · S/ {Number(previewPlantilla.precioSoles || 0).toFixed(2)}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{previewPlantilla.premiumNote || 'Compra única aparte del plan'}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewPlantilla(null)}
                  className="self-end rounded-2xl bg-gray-100 p-3 text-gray-500 transition hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700 sm:self-start"
                >
                  <Icon icon="solar:close-circle-bold" className="text-xl" />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 lg:grid-cols-[360px_minmax(0,1fr)]">
                <aside className="space-y-5 overflow-y-auto border-b border-gray-100 p-5 dark:border-slate-800 lg:border-b-0 lg:border-r">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-gray-400">Por qué cuesta más</p>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-700 dark:text-gray-300">{details.headline}</p>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-gray-400">Incluye</p>
                    <div className="mt-3 space-y-2">
                      {details.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2 rounded-2xl bg-gray-50 p-3 text-sm font-semibold text-gray-700 dark:bg-slate-900 dark:text-gray-300">
                          <Icon icon="solar:check-circle-bold" className="mt-0.5 flex-shrink-0 text-emerald-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-gray-400">Páginas listas</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {details.pages.map((page) => (
                        <span key={page} className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-black text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                          {page}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {isLocked ? (
                      <button
                        type="button"
                        onClick={() => solicitarPlantillaPremium(previewPlantilla)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-black text-white transition hover:bg-amber-600"
                      >
                        <Icon icon="solar:cart-check-bold" className="text-lg" />
                        Comprar plantilla
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          elegirPlantilla(previewPlantilla.id);
                          setPreviewPlantilla(null);
                        }}
                        disabled={isActivePreview || vm.saving}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-black text-white transition hover:bg-black disabled:opacity-60 dark:bg-white dark:text-gray-950"
                      >
                        <Icon icon={isPurchased || !isPremium ? 'solar:check-circle-bold' : 'solar:unlock-bold'} className="text-lg" />
                        {isActivePreview ? 'Ya está activa' : 'Usar esta plantilla'}
                      </button>
                    )}
                    <a
                      href={getPreviewUrl(previewPlantilla.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
                    >
                      <Icon icon="solar:eye-bold" className="text-lg" />
                      Abrir preview completo
                    </a>
                  </div>
                </aside>

                <div className="min-h-[620px] bg-gray-100 p-3 dark:bg-slate-950 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-gray-500 shadow-sm dark:bg-slate-900 dark:text-gray-300">
                    <span className="inline-flex items-center gap-2">
                      <Icon icon="solar:monitor-bold" className="text-base text-indigo-500" />
                      Vista escritorio
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Icon icon={formData.slugTienda ? 'solar:box-bold' : 'solar:test-tube-bold'} className="text-base text-emerald-500" />
                      {formData.slugTienda ? 'Con tus productos reales' : 'Con productos demo'}
                    </span>
                  </div>
                  <div className="h-[calc(100%-56px)] min-h-[560px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-800">
                    <iframe
                      title={`Preview ${previewPlantilla.label}`}
                      src={getPreviewUrl(previewPlantilla.id)}
                      loading="lazy"
                      className="h-full min-h-[560px] w-full bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
