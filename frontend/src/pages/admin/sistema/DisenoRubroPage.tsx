import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { del, get, post } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { ALL_PLANTILLAS, type PlantillaId } from '@/components/tienda/resolveTemplate';
import { getRubroDemo } from '@/data/rubroDemo';
import ModalConfirm from '@/components/ModalConfirm';

interface Rubro {
  id: number;
  nombre: string;
  _count?: { empresas: number };
}

interface DisenoRubro {
  rubroId: number;
  plantillaId: string;
  colorPrimario: string;
  colorSecundario: string;
  colorAccento: string;
  tipografia: string;
  vistaProductos: string;
}

interface PlantillaVentaConfig {
  id: string;
  premium: boolean;
  precioSoles: number;
  premiumNote?: string;
}

interface EmpresaPlantillaPremium {
  empresaId: number;
  nombre: string;
  razonSocial?: string;
  slugTienda?: string;
  precioPagado?: number;
  activadoEn?: string | null;
  autorNombre?: string | null;
  autorEmail?: string | null;
}

const getApiPayload = <T,>(response: any): T | undefined => {
  if (response?.data?.data !== undefined) return response.data.data as T;
  if (response?.data !== undefined) return response.data as T;
  return response as T;
};

const isApiError = (response: any) => response?.success === false || response?.data?.success === false;

const getApiErrorMessage = (response: any, fallback: string) =>
  response?.error || response?.data?.error || response?.data?.message || response?.message || fallback;

const mergePlantillaConfig = (plantilla: any, config?: PlantillaVentaConfig) => ({
  ...plantilla,
  premium: config?.premium ?? plantilla.premium,
  precioSoles: config?.precioSoles ?? plantilla.precioSoles,
  premiumNote: config?.premiumNote ?? plantilla.premiumNote,
});

const TIPOGRAFIAS = [
  'Inter', 
  'Heebo',
  'Poppins', 
  'Outfit',
  'Plus Jakarta Sans',
  'Montserrat', 
  'Lato', 
  'Roboto', 
  'Space Grotesk',
  'Oswald',
  'Nunito',
  'Quicksand',
  'Playfair Display'
];

const ACCENT = 'var(--accent, #7551FF)';

const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
    <label className="relative cursor-pointer flex-shrink-0">
      <input type="color" value={value} onChange={e => onChange(e.target.value)} className="sr-only" />
      <div className="w-9 h-9 rounded-xl shadow-inner border-2 border-white dark:border-slate-700 ring-1 ring-slate-200 dark:ring-slate-600" style={{ background: value }} />
    </label>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-600 dark:text-gray-300">{label}</p>
      <p className="text-xs font-mono text-slate-400">{value}</p>
    </div>
  </div>
);

export default function DisenoRubroPage() {
  const { alert, load } = useAlertStore();
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [empresas, setEmpresas] = useState<{ id: number; nombre: string }[]>([]);
  const [disenos, setDisenos] = useState<Record<number, DisenoRubro>>({});
  const [plantillasConfig, setPlantillasConfig] = useState<Record<string, PlantillaVentaConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [savingPlantillaConfig, setSavingPlantillaConfig] = useState(false);
  const [loadingAltasPremium, setLoadingAltasPremium] = useState(false);
  const [altasPremiumError, setAltasPremiumError] = useState('');
  const [removingAltaEmpresaId, setRemovingAltaEmpresaId] = useState<number | null>(null);
  const [altasPremium, setAltasPremium] = useState<EmpresaPlantillaPremium[]>([]);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPlantillaId, setDrawerPlantillaId] = useState<string | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [empresaToRemove, setEmpresaToRemove] = useState<number | null>(null);

  const [drawerTitle, setDrawerTitle] = useState('');
  const [premiumForm, setPremiumForm] = useState({
    premium: false,
    precioSoles: '0',
    premiumNote: '',
  });
  const [altaPremiumForm, setAltaPremiumForm] = useState({
    empresaId: '',
    precioPagado: '',
  });
  const [selected, setSelected] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<DisenoRubro>>({});

  const plantillasCatalogo = useMemo(
    () => ALL_PLANTILLAS.map(plantilla => mergePlantillaConfig(plantilla, plantillasConfig[plantilla.id])),
    [plantillasConfig],
  );
  const drawerPlantilla = drawerPlantillaId
    ? plantillasCatalogo.find(plantilla => plantilla.id === drawerPlantillaId)
    : null;
  const drawerPremiumPersistido = Boolean(drawerPlantilla?.premium);

  const cargar = async () => {
    setLoading(true);
    try {
      const [rubrosRes, disenosRes, plantillasConfigRes, empresasRes] = await Promise.all([
        get<any>('/rubro'),
        get<DisenoRubro[]>('/diseno-rubro'),
        get<PlantillaVentaConfig[]>('/diseno-rubro/plantillas/config'),
        get<any>('/empresa/listar?page=1&limit=500').catch(() => null),
      ]);
      const empresasRaw: any[] = (empresasRes as any)?.data?.empresas ?? (empresasRes as any)?.empresas ?? [];
      setEmpresas(
        empresasRaw
          .map((e: any) => ({ id: Number(e.id), nombre: e.nombreComercial || e.razonSocial || `Empresa #${e.id}` }))
          .filter((e) => Number.isFinite(e.id))
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
      );
      const lista: Rubro[] = Array.isArray(rubrosRes.data) ? rubrosRes.data : Array.isArray(rubrosRes) ? rubrosRes : [];
      const disenosList: DisenoRubro[] = Array.isArray(disenosRes) ? disenosRes : (disenosRes as any)?.data ?? [];
      const plantillasConfigList: PlantillaVentaConfig[] = Array.isArray((plantillasConfigRes as any)?.data)
        ? (plantillasConfigRes as any).data
        : Array.isArray(plantillasConfigRes)
          ? plantillasConfigRes as any
          : [];
      setRubros(lista);
      const map: Record<number, DisenoRubro> = {};
      disenosList.forEach(d => { map[d.rubroId] = d; });
      setDisenos(map);
      setPlantillasConfig(plantillasConfigList.reduce<Record<string, PlantillaVentaConfig>>((acc, item) => {
        if (item?.id) acc[item.id] = item;
        return acc;
      }, {}));
    } catch {
      alert('No se pudieron cargar los rubros', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void cargar(); }, []);

  useEffect(() => {
    if (!drawerOpen || !drawerPlantillaId) return;
    const plantilla = plantillasCatalogo.find(item => item.id === drawerPlantillaId);
    setPremiumForm({
      premium: Boolean(plantilla?.premium),
      precioSoles: String(Number(plantilla?.precioSoles || 0)),
      premiumNote: plantilla?.premiumNote || '',
    });
    setAltaPremiumForm(prev => ({
      ...prev,
      precioPagado: String(Number(plantilla?.precioSoles || 0)),
    }));
  }, [drawerOpen, drawerPlantillaId, plantillasCatalogo]);

  const cargarAltasPremium = async (plantillaId: string) => {
    setLoadingAltasPremium(true);
    setAltasPremiumError('');
    try {
      const res = await get<EmpresaPlantillaPremium[]>(`/tienda/admin/templates-premium/${plantillaId}/empresas`);
      if (isApiError(res)) {
        throw new Error(getApiErrorMessage(res, 'No se pudo cargar'));
      }
      const payload = getApiPayload<EmpresaPlantillaPremium[]>(res);
      const data = Array.isArray(payload) ? payload : [];
      setAltasPremium(data);
    } catch (error: any) {
      setAltasPremiumError(error?.message || 'No se pudieron cargar las empresas con alta.');
    } finally {
      setLoadingAltasPremium(false);
    }
  };

  useEffect(() => {
    if (!drawerOpen || !drawerPlantillaId || !drawerPremiumPersistido) {
      setAltasPremium([]);
      return;
    }
    void cargarAltasPremium(drawerPlantillaId);
  }, [drawerOpen, drawerPlantillaId, drawerPremiumPersistido]);

  const abrirRubro = (rubro: Rubro) => {
    setSelected(rubro.id);
    const d = disenos[rubro.id];
    const demo = getRubroDemo(rubro.nombre);
    setForm({
      plantillaId: d?.plantillaId ?? demo.plantillaDefault,
      colorPrimario: d?.colorPrimario ?? demo.colorDefault,
      colorSecundario: d?.colorSecundario ?? '#ffffff',
      colorAccento: d?.colorAccento ?? '#FF6B6B',
      tipografia: d?.tipografia ?? 'Inter',
      vistaProductos: d?.vistaProductos ?? 'cards',
    });
  };

  const abrirPreviewCompleto = (especificId?: string) => {
    if (!rubroSeleccionado) return;
    const previewConfig = {
      plantillaId: especificId || (form.plantillaId ? form.plantillaId.split(',').filter(Boolean)[0] : 'moderna'),
      colorPrimario: form.colorPrimario,
      colorSecundario: form.colorSecundario,
      colorAccento: form.colorAccento,
      tipografia: form.tipografia,
      rubroNombre: rubroSeleccionado.nombre,
    };
    sessionStorage.setItem('store-preview-config', JSON.stringify(previewConfig));
    const params = new URLSearchParams(
      Object.entries(previewConfig).reduce<Record<string, string>>((acc, [key, value]) => {
        if (value) acc[key] = String(value);
        return acc;
      }, {}),
    );
    window.open(`/diseno-preview?${params.toString()}`, '_blank');
  };

  const guardar = async () => {
    if (!selected) return;
    setSaving(selected);
    load(true);
    try {
      const res = await post<DisenoRubro>(`/diseno-rubro/${selected}`, form);
      const saved = (res as any)?.data ?? res;
      setDisenos(prev => ({ ...prev, [selected]: saved as DisenoRubro }));
      alert('Diseño guardado correctamente', 'success');
    } catch {
      alert('No se pudo guardar el diseño', 'error');
    } finally {
      setSaving(null);
      load(false);
    }
  };

  const guardarPlantillaConfig = async () => {
    if (!drawerPlantillaId) return;
    const precioSoles = Number(premiumForm.precioSoles || 0);
    if (!Number.isFinite(precioSoles) || precioSoles < 0) {
      alert('Ingresa un precio válido', 'warning');
      return;
    }
    if (premiumForm.premium && precioSoles <= 0) {
      alert('Una plantilla premium debe tener un precio mayor a cero', 'warning');
      return;
    }

    setSavingPlantillaConfig(true);
    try {
      const res = await post<PlantillaVentaConfig>(`/diseno-rubro/plantillas/config/${drawerPlantillaId}`, {
        premium: premiumForm.premium,
        precioSoles,
        premiumNote: premiumForm.premium
          ? premiumForm.premiumNote || 'Compra única aparte del plan'
          : '',
      });
      if (isApiError(res)) {
        throw new Error(getApiErrorMessage(res, 'No se pudo guardar'));
      }
      const saved = getApiPayload<PlantillaVentaConfig>(res);
      if (!saved?.id) throw new Error('Respuesta inválida');
      setPlantillasConfig(prev => ({ ...prev, [drawerPlantillaId]: saved }));
      alert('Configuración premium guardada', 'success');
    } catch {
      alert('No se pudo guardar la configuración premium', 'error');
    } finally {
      setSavingPlantillaConfig(false);
    }
  };

  const activarPlantillaParaEmpresa = async () => {
    if (!drawerPlantillaId) return;
    const empresaId = Number(altaPremiumForm.empresaId);
    const precioPagado = Number(altaPremiumForm.precioPagado || 0);
    if (!Number.isInteger(empresaId) || empresaId <= 0) {
      alert('Selecciona una empresa', 'warning');
      return;
    }
    if (premiumForm.premium && (!Number.isFinite(precioPagado) || precioPagado < 0)) {
      alert('Ingresa un precio pagado válido', 'warning');
      return;
    }

    setSavingPlantillaConfig(true);
    try {
      const res = await post(`/tienda/admin/empresas/${empresaId}/templates-premium/${drawerPlantillaId}/activar`, {
        precioPagado,
      });
      if (isApiError(res)) {
        throw new Error(getApiErrorMessage(res, 'No se pudo activar'));
      }
      const empresa = empresas.find(item => item.id === empresaId);
      setAltasPremium(prev => {
        const next = prev.filter(item => item.empresaId !== empresaId);
        return [
          {
            empresaId,
            nombre: empresa?.nombre || `Empresa #${empresaId}`,
            precioPagado,
            activadoEn: new Date().toISOString(),
          },
          ...next,
        ];
      });
      setAltaPremiumForm(prev => ({ ...prev, empresaId: '' }));
      alert('Plantilla activada para la empresa', 'success');
    } catch {
      alert('No se pudo activar la plantilla para la empresa', 'error');
    } finally {
      setSavingPlantillaConfig(false);
    }
  };

  const handleDesactivarClick = (empresaId: number) => {
    setEmpresaToRemove(empresaId);
    setIsConfirmModalOpen(true);
  };

  const desactivarPlantillaParaEmpresa = async () => {
    if (!drawerPlantillaId || !empresaToRemove) return;

    setRemovingAltaEmpresaId(empresaToRemove);
    setIsConfirmModalOpen(false);
    try {
      const res = await del(`/tienda/admin/empresas/${empresaToRemove}/templates-premium/${drawerPlantillaId}`);
      if (isApiError(res)) {
        throw new Error(getApiErrorMessage(res, 'No se pudo quitar'));
      }
      await cargarAltasPremium(drawerPlantillaId);
      alert('Alta de plantilla eliminada para la empresa', 'success');
    } catch {
      alert('No se pudo quitar la plantilla de la empresa', 'error');
    } finally {
      setRemovingAltaEmpresaId(null);
      setEmpresaToRemove(null);
    }
  };

  const rubroSeleccionado = rubros.find(r => r.id === selected);
  const plantillasActuales = (form.plantillaId ?? 'moderna').split(',').filter(Boolean) as PlantillaId[];
  if (loading) {
    return (
      <div className="-m-5 p-5 bg-[#F7F8FB] dark:bg-slate-900 font-jakarta min-h-[calc(100vh-64px)] flex items-center justify-center">
        <Icon icon="svg-spinners:ring-resize" className="text-3xl" style={{ color: ACCENT }} />
      </div>
    );
  }

  return (
    <div className="-m-5 p-5 bg-[#F7F8FB] dark:bg-slate-900 font-jakarta min-h-[calc(100vh-64px)]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Sistema</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Tiendas</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Diseño por Rubro</span>
      </div>

      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Diseño por Rubro</h1>
        <p className="text-sm text-slate-400 mt-0.5">Configura plantillas, colores y tipografías para cada rubro de negocio.</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-190px)] min-h-[520px]">
      {/* ── Rubros sidebar ── */}
      <div className="w-64 bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-y-auto flex-shrink-0">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#111827] z-10">
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-white">Rubros</h2>
          <p className="text-xs text-slate-400 mt-0.5">{rubros.length} rubros disponibles</p>
        </div>
        <div className="p-2 space-y-1">
          {rubros.map(rubro => {
            const d = disenos[rubro.id];
            const firstPlantillaId = String(d?.plantillaId ?? 'moderna').split(',').filter(Boolean)[0] || 'moderna';
            const plantilla = plantillasCatalogo.find(p => p.id === firstPlantillaId);
            const isActive = selected === rubro.id;
            return (
              <button
                key={rubro.id}
                onClick={() => abrirRubro(rubro)}
                className={`w-full text-left px-3 py-2.5 rounded-2xl transition-all flex items-center gap-3 border ${isActive ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-transparent'}`}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: (d?.colorPrimario ?? ACCENT) + '18' }}
                >
                  <Icon icon={plantilla?.icon ?? 'solar:shop-2-bold'} className="text-sm" style={{ color: d?.colorPrimario ?? ACCENT }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold capitalize truncate ${isActive ? 'text-[var(--accent)]' : 'text-slate-700 dark:text-gray-200'}`}>{rubro.nombre}</p>
                  <p className="text-xs text-slate-400">{rubro._count?.empresas ?? 0} negocios</p>
                </div>
                {d && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main area ── */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-center p-8 bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
          <div>
            <Icon icon="solar:palette-linear" className="text-slate-200 dark:text-slate-700 text-6xl mb-4 mx-auto" />
            <p className="font-semibold text-slate-500 dark:text-gray-400">Selecciona un rubro para diseñar su tienda</p>
            <p className="text-sm text-slate-400 mt-1">Los cambios aplican a todas las tiendas de ese rubro</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">

          {/* ── Config panel ── */}
          <div className="flex-1 bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-y-auto flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0 sticky top-0 bg-white dark:bg-[#111827] z-10">
              <div>
                <h2 className="font-extrabold text-slate-800 dark:text-white capitalize text-base">{rubroSeleccionado?.nombre}</h2>
                <p className="text-xs text-slate-400">{rubroSeleccionado?._count?.empresas ?? 0} negocios</p>
              </div>
              <button onClick={() => setSelected(null)} className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <Icon icon="solar:close-circle-linear" className="text-lg" />
              </button>
            </div>

            {/* Config content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-8 max-w-7xl mx-auto w-full">

              {/* Plantilla */}
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Plantillas de tienda</p>
                <p className="text-xs text-slate-400 mb-4">Marca todas las plantillas que quieras habilitar para este rubro. El emprendedor podrá elegir cuál usar en su tienda. (Engranaje = colores/tipografía y vista previa.)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {plantillasCatalogo.map(plantilla => {
                    const isOn = plantillasActuales.includes(plantilla.id);
                    const isPremium = Boolean(plantilla.premium);
                    return (
                      <button
                        key={plantilla.id}
                        onClick={() => setForm(f => {
                          const actuales = (f.plantillaId ?? 'moderna').split(',').filter(Boolean);
                          let nuevas;
                          if (actuales.includes(plantilla.id)) {
                            // Require at least one to be selected
                            if (actuales.length === 1) return f;
                            nuevas = actuales.filter(id => id !== plantilla.id);
                          } else {
                            nuevas = [...actuales, plantilla.id];
                          }
                          return { ...f, plantillaId: nuevas.join(',') };
                        })}
                        className={`relative text-left p-4 rounded-2xl border-2 transition-all group ${isOn ? 'border-[var(--accent)] bg-violet-50/60 dark:bg-violet-900/20 shadow-sm' : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 bg-white dark:bg-slate-800'}`}
                      >
                        {isOn && (
                          <span className="absolute top-3 right-3">
                            <Icon icon="solar:check-circle-bold" className="text-lg" style={{ color: ACCENT }} />
                          </span>
                        )}
                        <div className="w-12 h-12 rounded-2xl mb-3 flex items-center justify-center" style={{ backgroundColor: plantilla.accentColor + '18' }}>
                          <Icon icon={plantilla.icon} className="text-2xl" style={{ color: plantilla.accentColor }} />
                        </div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{plantilla.label}</p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-3 mb-6">{plantilla.description}</p>
                        {isPremium && (
                          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">
                            <Icon icon="solar:crown-bold" className="text-xs" />
                            S/ {Number(plantilla.precioSoles || 0).toFixed(2)}
                          </span>
                        )}

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span
                            title="Vista previa"
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 px-2 py-1.5 text-[10px] font-bold text-slate-600 dark:text-gray-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirPreviewCompleto(plantilla.id);
                            }}
                          >
                            <Icon icon="solar:eye-bold" className="text-xs" />
                            Ver
                          </span>
                          <span
                            title="Configurar"
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 flex items-center justify-center cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDrawerPlantillaId(plantilla.id);
                              setDrawerTitle(plantilla.label);
                              setDrawerOpen(true);
                            }}
                          >
                            <Icon icon="solar:settings-bold-duotone" className="text-slate-600 dark:text-gray-300 text-sm" />
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Guardar asignación de plantillas al rubro */}
              <div className="sticky bottom-0 -mx-5 px-5 py-4 bg-white/90 dark:bg-[#111827]/90 backdrop-blur border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {plantillasActuales.length} plantilla{plantillasActuales.length === 1 ? '' : 's'} habilitada{plantillasActuales.length === 1 ? '' : 's'} para <span className="font-semibold capitalize text-slate-600 dark:text-gray-300">{rubroSeleccionado?.nombre}</span>
                </p>
                <button
                  onClick={guardar}
                  disabled={saving === selected}
                  className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30 hover:brightness-105"
                  style={{ backgroundColor: form.colorPrimario || ACCENT }}
                >
                  {saving === selected
                    ? <><Icon icon="svg-spinners:ring-resize" className="text-lg" /> Guardando...</>
                    : <><Icon icon="mdi:check" className="text-lg" /> Guardar plantillas del rubro</>
                  }
                </button>
              </div>

              </div>
            </div>

          {/* Config Drawer */}
          <AnimatePresence>
            {drawerOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setDrawerOpen(false)}
                  className="fixed inset-0 bg-black/30 z-[999]"
                />
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white dark:bg-[#111827] shadow-2xl z-[1000] flex flex-col border-l border-gray-100 dark:border-slate-800"
                >
                  {/* Drawer Header */}
                  <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Icon icon="solar:palette-bold-duotone" className="text-primary text-lg" />
                        Configurar: {drawerTitle}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ajustes visuales para el rubro {rubroSeleccionado?.nombre}</p>
                    </div>
                    <button onClick={() => setDrawerOpen(false)} className="p-2 bg-white hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors border border-gray-100 dark:border-slate-700">
                      <Icon icon="solar:close-circle-bold-duotone" className="text-xl text-gray-500" />
                    </button>
                  </div>

                  {/* Drawer Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Colores */}
                    <div>
                      <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        Colores
                      </p>
                      <div className="space-y-4">
                        <ColorPicker label="Color Principal" value={form.colorPrimario ?? '#6A6CFF'} onChange={v => setForm(f => ({ ...f, colorPrimario: v }))} />
                        <ColorPicker label="Color de Fondo" value={form.colorSecundario ?? '#ffffff'} onChange={v => setForm(f => ({ ...f, colorSecundario: v }))} />
                        <ColorPicker label="Color de Acento / CTA" value={form.colorAccento ?? '#FF6B6B'} onChange={v => setForm(f => ({ ...f, colorAccento: v }))} />
                      </div>
                    </div>

                    {/* Venta premium */}
                    <div>
                      <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        Venta premium
                      </p>
                      <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-transparent dark:bg-slate-800/60">
                        <label className="flex items-center justify-between gap-4">
                          <span className="min-w-0">
                            <span className="block text-sm font-bold text-gray-800 dark:text-gray-100">Plantilla premium</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">Si está activo, el empresario la ve pero no puede usarla hasta comprarla.</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setPremiumForm(prev => ({ ...prev, premium: !prev.premium }))}
                            className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${premiumForm.premium ? 'bg-amber-500' : 'bg-gray-300 dark:bg-slate-600'}`}
                            aria-pressed={premiumForm.premium}
                          >
                            <span className={`absolute top-1 left-0 h-5 w-5 rounded-full bg-white shadow transition-transform ${premiumForm.premium ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </label>

                        <div className="grid grid-cols-1 gap-3">
                          <label className="space-y-1">
                            <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Precio en soles</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={premiumForm.precioSoles}
                              onChange={e => setPremiumForm(prev => ({ ...prev, precioSoles: e.target.value }))}
                              disabled={!premiumForm.premium}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-amber-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Nota comercial</span>
                            <input
                              type="text"
                              value={premiumForm.premiumNote}
                              onChange={e => setPremiumForm(prev => ({ ...prev, premiumNote: e.target.value }))}
                              disabled={!premiumForm.premium}
                              placeholder="Compra única aparte del plan"
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-amber-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                          </label>
                        </div>

                        <button
                          type="button"
                          onClick={guardarPlantillaConfig}
                          disabled={savingPlantillaConfig}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
                        >
                          {savingPlantillaConfig
                            ? <><Icon icon="svg-spinners:ring-resize" className="text-lg" /> Guardando...</>
                            : <><Icon icon="solar:crown-bold" className="text-lg" /> Guardar premium y precio</>
                          }
                        </button>
                      </div>
                    </div>

                    {/* Alta por empresa */}
                    <div>
                      <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        Alta por empresa
                      </p>
                      <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-transparent dark:bg-slate-800/60">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {drawerPremiumPersistido
                            ? 'Cuando una empresa paga esta plantilla, actívala aquí. La compra quedará guardada solo para esa empresa y la plantilla se aplicará a su tienda.'
                            : 'Guarda esta plantilla como premium antes de activar compras por empresa.'}
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                          <label className="space-y-1">
                            <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Empresa</span>
                            <select
                              value={altaPremiumForm.empresaId}
                              onChange={e => setAltaPremiumForm(prev => ({ ...prev, empresaId: e.target.value }))}
                              disabled={!drawerPremiumPersistido}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            >
                              <option value="">Selecciona una empresa…</option>
                              {empresas.map(e => (
                                <option key={e.id} value={String(e.id)}>{e.nombre}</option>
                              ))}
                            </select>
                          </label>
                          <label className="space-y-1">
                            <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Precio pagado</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={altaPremiumForm.precioPagado}
                              onChange={e => setAltaPremiumForm(prev => ({ ...prev, precioPagado: e.target.value }))}
                              disabled={!premiumForm.premium}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-900 outline-none transition focus:border-emerald-400 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            />
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={activarPlantillaParaEmpresa}
                          disabled={savingPlantillaConfig || !drawerPremiumPersistido}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {savingPlantillaConfig
                            ? <><Icon icon="svg-spinners:ring-resize" className="text-lg" /> Activando...</>
                            : <><Icon icon="solar:unlock-bold" className="text-lg" /> Activar para empresa</>
                          }
                        </button>

                        <div className="rounded-2xl border border-gray-100 bg-white p-3 dark:border-transparent dark:bg-slate-900/80">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Empresas con alta</p>
                              <p className="text-[11px] text-gray-400">{altasPremium.length} empresa{altasPremium.length === 1 ? '' : 's'} activa{altasPremium.length === 1 ? '' : 's'}</p>
                            </div>
                            {loadingAltasPremium ? (
                              <Icon icon="svg-spinners:ring-resize" className="text-lg text-gray-400" />
                            ) : drawerPlantillaId && drawerPremiumPersistido ? (
                              <button
                                type="button"
                                onClick={() => cargarAltasPremium(drawerPlantillaId)}
                                className="rounded-lg bg-gray-100 p-2 text-gray-500 transition hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                                title="Actualizar lista"
                              >
                                <Icon icon="solar:refresh-linear" className="text-sm" />
                              </button>
                            ) : null}
                          </div>

                          {altasPremiumError && (
                            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                              {altasPremiumError}
                            </div>
                          )}

                          {!loadingAltasPremium && !altasPremiumError && altasPremium.length === 0 && (
                            <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center dark:border-slate-700">
                              <Icon icon="solar:lock-keyhole-minimalistic-linear" className="mx-auto mb-2 text-2xl text-gray-300" />
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Todavía no hay empresas con esta plantilla comprada.</p>
                            </div>
                          )}

                          {altasPremium.length > 0 && (
                            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                              {altasPremium.map(item => (
                                <div key={item.empresaId} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 dark:border-transparent dark:bg-slate-800">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{item.nombre}</p>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                                      <span>ID {item.empresaId}</span>
                                      {Number(item.precioPagado || 0) > 0 && <span>S/ {Number(item.precioPagado).toFixed(2)}</span>}
                                      {item.activadoEn && <span>{new Date(item.activadoEn).toLocaleDateString('es-PE')}</span>}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleDesactivarClick(item.empresaId)}
                                    disabled={removingAltaEmpresaId === item.empresaId}
                                    className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] font-black text-red-600 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                                  >
                                    {removingAltaEmpresaId === item.empresaId
                                      ? <Icon icon="svg-spinners:ring-resize" className="text-sm" />
                                      : <Icon icon="solar:trash-bin-trash-bold" className="text-sm" />
                                    }
                                    Quitar
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Tipografía */}
                    <div>
                      <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Tipografía</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {TIPOGRAFIAS.map(t => (
                          <button
                            key={t}
                            onClick={() => setForm(f => ({ ...f, tipografia: t }))}
                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all ${form.tipografia === t ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-gray-100 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-gray-200 dark:hover:border-slate-600'}`}
                            style={{ fontFamily: t }}
                          >
                            <span className="truncate text-xs">{t}</span>
                            {form.tipografia === t && <Icon icon="solar:check-circle-bold" className="text-primary text-sm flex-shrink-0 ml-1" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Drawer Footer */}
                  <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex flex-col gap-3 bg-gray-50 dark:bg-slate-900">
                    <button
                      onClick={() => { abrirPreviewCompleto(drawerPlantillaId || undefined); setDrawerOpen(false); }}
                      className="w-full px-6 py-3 rounded-xl text-sm font-semibold border transition-all flex items-center justify-center gap-2 hover:bg-white dark:hover:bg-slate-800 bg-white dark:bg-slate-800"
                      style={{ borderColor: form.colorPrimario ?? '#6A6CFF', color: form.colorPrimario ?? '#6A6CFF' }}
                    >
                      <Icon icon="solar:maximize-square-bold" className="text-lg" />
                      Ver en pantalla completa
                    </button>
                    <button
                      onClick={() => { guardar(); setDrawerOpen(false); }}
                      disabled={saving === selected}
                      className="w-full px-8 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm hover:opacity-90"
                      style={{ backgroundColor: form.colorPrimario ?? '#6A6CFF' }}
                    >
                      {saving === selected
                        ? <><Icon icon="svg-spinners:ring-resize" className="text-lg" /> Guardando...</>
                        : <><Icon icon="mdi:check" className="text-lg" /> Guardar diseño</>
                      }
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
      </div>

      <ModalConfirm
        isOpenModal={isConfirmModalOpen}
        setIsOpenModal={setIsConfirmModalOpen}
        title="Quitar plantilla"
        information={`¿Estás seguro de quitar la plantilla ${drawerTitle} de ${altasPremium.find(i => i.empresaId === empresaToRemove)?.nombre || 'esta empresa'}?`}
        confirmText="Sí, quitar"
        confirmSubmit={desactivarPlantillaParaEmpresa}
      />
    </div>
  );
}
