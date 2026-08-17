import { useEffect, useMemo, useRef, useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import { Icon } from '@iconify/react';
import { useEmpresasStore, type EmpresaSerieConfig } from '@/zustand/empresas';
import { useAuthStore } from '@/zustand/auth';
import { useExtentionsStore } from '@/zustand/extentions';
import useAlertStore from '@/zustand/alert';
import { useClientsStore } from '@/zustand/clients';

export type EmpresaFormMode = 'create' | 'edit';

interface EmpresaFormModalProps {
  open: boolean;
  mode: EmpresaFormMode;
  empresaId?: number;
  onClose: () => void;
  onSaved?: () => void;
}

interface CreateFormData {
  ruc: string;
  razonSocial: string;
  direccion: string;
  logo?: any;
  planId?: number;
  esPrueba: boolean;
  tipoEmpresa: 'FORMAL' | 'INFORMAL';
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  rubroId: number;
  nombreComercial: string;
  fechaActivacion: string;
  fechaExpiracion?: string;
  usuarioPse?: string;
  contrasenaPse?: string;
  providerId?: string;
  providerToken?: string;
  billingProvider?: 'QPSE' | 'APISUNAT' | 'JAMBLE';
  billingApiBaseUrl?: string;
  billingApiDemoBaseUrl?: string;
  billingApiToken?: string;
  billingApiUser?: string;
  billingApiPassword?: string;
  usaDemo: boolean;
  usaCodigoBarrasManual?: boolean;
  brand?: string;
  producto?: 'facturacion' | 'hotel' | 'restaurante';
  usuario: {
    nombre: string;
    email: string;
    password: string;
    dni: string;
    celular: string;
  };
}

interface EditFormData {
  id: number;
  ruc: string;
  razonSocial: string;
  direccion: string;
  logo?: any;
  planId: number;
  tipoEmpresa: 'FORMAL' | 'INFORMAL';
  departamento: string;
  provincia: string;
  distrito: string;
  ubigeo: string;
  rubroId: number;
  nombreComercial: string;
  fechaActivacion: string;
  fechaExpiracion: string;
  usuarioPse?: string;
  contrasenaPse?: string;
  providerId?: string;
  providerToken?: string;
  billingProvider?: 'QPSE' | 'APISUNAT' | 'JAMBLE';
  billingApiBaseUrl?: string;
  billingApiDemoBaseUrl?: string;
  billingApiToken?: string;
  billingApiUser?: string;
  billingApiPassword?: string;
  usaDemo: boolean;
  esAgenteRetencion?: boolean;
  usaCodigoBarrasManual?: boolean;
  cotizMostrarEmail?: boolean;
  cotizMostrarCuentas?: boolean;
  cotizMostrarRazonSocial?: boolean;
  cotizMostrarDetraccion?: boolean;
  brand?: string;
  producto?: 'facturacion' | 'hotel' | 'restaurante';
  usuario?: {
    nombre?: string;
    email?: string;
    password?: string;
    dni?: string;
    celular?: string;
  };
}

const DOCUMENTO_SERIES: Array<{
  tipoDoc: string;
  label: string;
  help: string;
  serie: string;
}> = [
  { tipoDoc: '01', label: 'Factura', help: 'Factura electrónica', serie: 'F001' },
  { tipoDoc: '03', label: 'Boleta', help: 'Boleta de venta electrónica', serie: 'B001' },
  { tipoDoc: '07:01', label: 'Nota de crédito factura', help: 'Cuando afecta una factura', serie: 'FCA1' },
  { tipoDoc: '07:03', label: 'Nota de crédito boleta', help: 'Cuando afecta una boleta', serie: 'BCA1' },
  { tipoDoc: '08:01', label: 'Nota de débito factura', help: 'Cuando afecta una factura', serie: 'FDA1' },
  { tipoDoc: '08:03', label: 'Nota de débito boleta', help: 'Cuando afecta una boleta', serie: 'BDA1' },
  { tipoDoc: '09', label: 'Guía remitente', help: 'Guía de remisión remitente', serie: 'T001' },
  { tipoDoc: '31', label: 'Guía transportista', help: 'Guía de remisión transportista', serie: 'V001' },
];

const resolverSerieDefault = (tipoDoc: string, billingProvider?: string) => {
  if (tipoDoc === '01') return billingProvider === 'JAMBLE' ? 'F001' : 'F0A1';
  if (tipoDoc === '03') return billingProvider === 'JAMBLE' ? 'B001' : 'B0A1';
  return DOCUMENTO_SERIES.find((item) => item.tipoDoc === tipoDoc)?.serie || 'F0A1';
};

const crearSeriesIniciales = (billingProvider?: string): EmpresaSerieConfig[] =>
  DOCUMENTO_SERIES.map((item) => ({
    tipoDoc: item.tipoDoc,
    serie: resolverSerieDefault(item.tipoDoc, billingProvider),
    correlativo: 1,
    activo: true,
  }));

const unirSeriesEmpresa = (series?: EmpresaSerieConfig[] | null, billingProvider?: string): EmpresaSerieConfig[] => {
  const byTipo = new Map((series || []).map((item) => [item.tipoDoc, item]));
  return DOCUMENTO_SERIES.map((item) => {
    const saved = byTipo.get(item.tipoDoc);
    return {
      id: saved?.id,
      tipoDoc: item.tipoDoc,
      serie: (saved?.serie || resolverSerieDefault(item.tipoDoc, billingProvider)).toUpperCase(),
      correlativo: Number(saved?.correlativo || 1),
      activo: saved?.activo ?? true,
    };
  });
};


export default function EmpresaFormModal({ open, mode, empresaId, onClose, onSaved }: EmpresaFormModalProps) {
  const isEdit = mode === 'edit';
  const navigate = useNavigate();
  const { success, alert } = useAlertStore();
  const { crearEmpresa, actualizarEmpresa, obtenerEmpresa, empresa, listarSeriesEmpresa, guardarSeriesEmpresa } = useEmpresasStore();
  const { planes, rubros, ubigeos, getPlanes, getRubros, getUbigeos } = useExtentionsStore();
  const { getClientFromDoc } = useClientsStore();
  const { auth } = useAuthStore();
  const isAdminSistema = auth?.rol === 'ADMIN_SISTEMA';
  const hasNegocioScope = isAdminSistema && !!auth?.sistemaNegocio;
  const hasProductoScope = isAdminSistema && !!auth?.sistemaProducto;

  const [activeTab, setActiveTab] = useState<'datos' | 'suscripcion' | 'sunat' | 'series' | 'admin'>('datos');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [searchingRuc, setSearchingRuc] = useState(false);
  const [seriesConfig, setSeriesConfig] = useState<EmpresaSerieConfig[]>(() => crearSeriesIniciales());

  const initialCreate: CreateFormData = useMemo(() => ({
    ruc: '',
    razonSocial: '',
    direccion: '',
    tipoEmpresa: 'FORMAL',
    esPrueba: false,
    departamento: '',
    provincia: '',
    distrito: '',
    logo: '',
    ubigeo: '',
    rubroId: 0,
    nombreComercial: '',
    fechaActivacion: new Date().toISOString().split('T')[0],
    fechaExpiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    usaCodigoBarrasManual: false,
    usaDemo: false,
    providerId: '',
    providerToken: '',
    billingProvider: 'QPSE',
    billingApiBaseUrl: '',
    billingApiDemoBaseUrl: '',
    billingApiToken: '',
    billingApiUser: '',
    billingApiPassword: '',
    brand: '',
    producto: 'facturacion',
    usuario: { nombre: '', email: '', password: '', dni: '', celular: '' },
  }), []);

  const initialEdit: EditFormData = useMemo(() => ({
    id: 0,
    ruc: '',
    razonSocial: '',
    direccion: '',
    planId: 0,
    tipoEmpresa: 'FORMAL',
    departamento: '',
    provincia: '',
    distrito: '',
    ubigeo: '',
    rubroId: 0,
    nombreComercial: '',
    fechaActivacion: '',
    fechaExpiracion: '',
    usuarioPse: '',
    contrasenaPse: '',
    usaDemo: false,
    providerId: '',
    providerToken: '',
    billingProvider: 'QPSE',
    billingApiBaseUrl: '',
    billingApiDemoBaseUrl: '',
    billingApiToken: '',
    billingApiUser: '',
    billingApiPassword: '',
    brand: 'default',
    producto: 'facturacion',
    esAgenteRetencion: false,
    usaCodigoBarrasManual: false,
    cotizMostrarEmail: true,
    cotizMostrarCuentas: true,
    cotizMostrarRazonSocial: true,
    cotizMostrarDetraccion: true,
    usuario: { nombre: '', email: '', password: '', dni: '', celular: '' },
  }), []);

  const [createData, setCreateData] = useState<CreateFormData>(initialCreate);
  const [editData, setEditData] = useState<EditFormData>(initialEdit);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [initialEditPlanId, setInitialEditPlanId] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    getRubros();
    getUbigeos();
    getPlanes();
    setActiveTab('datos');

    if (isEdit && empresaId) {
      obtenerEmpresa(empresaId);
      listarSeriesEmpresa(empresaId)
        .then((series) => setSeriesConfig(unirSeriesEmpresa(series)))
        .catch(() => setSeriesConfig(crearSeriesIniciales()));
    } else {
      setCreateData({
        ...initialCreate,
        brand: hasNegocioScope ? (String(auth?.sistemaNegocio || '').toLowerCase() || initialCreate.brand) : initialCreate.brand,
        producto: hasProductoScope ? ((String(auth?.sistemaProducto || '').toLowerCase() === 'hotel') ? 'hotel' : 'facturacion') : initialCreate.producto,
      });
      setLogoPreview('');
      setSeriesConfig(crearSeriesIniciales());
    }
  }, [open, isEdit, empresaId, getRubros, getUbigeos, getPlanes, obtenerEmpresa, listarSeriesEmpresa, initialCreate, hasNegocioScope, hasProductoScope, auth?.sistemaNegocio, auth?.sistemaProducto]);

  useEffect(() => {
    if (open && isEdit && empresa && empresaId && empresa.id === empresaId) {
      const adminUser = (empresa as any).usuarios && (empresa as any).usuarios.length > 0
        ? (empresa as any).usuarios[0]
        : {};

      setEditData({
        id: empresa.id,
        ruc: empresa.ruc,
        razonSocial: empresa.razonSocial,
        direccion: empresa.direccion,
        planId: Number(empresa?.plan?.id || (empresa as any)?.planId || 0),
        tipoEmpresa: (empresa as any).tipoEmpresa || 'FORMAL',
        departamento: empresa.departamento || '',
        provincia: empresa.provincia || '',
        distrito: empresa.distrito || '',
        ubigeo: empresa.ubigeo || '',
        rubroId: empresa.rubro?.id || 0,
        nombreComercial: empresa.nombreComercial || '',
        fechaActivacion: empresa.fechaActivacion.split('T')[0],
        fechaExpiracion: empresa.fechaExpiracion.split('T')[0],
        usuarioPse: (empresa as any).usuarioPse || '',
        contrasenaPse: (empresa as any).contrasenaPse || '',
        usaDemo: Boolean((empresa as any).usaDemo),
        providerId: (empresa as any).providerId || '',
        providerToken: (empresa as any).providerToken || '',
        billingProvider: (empresa as any).billingProvider === 'JAMBLE' ? 'JAMBLE' : 'QPSE',
        billingApiBaseUrl: (empresa as any).billingApiBaseUrl || '',
        billingApiDemoBaseUrl: (empresa as any).billingApiDemoBaseUrl || '',
        billingApiToken: (empresa as any).billingApiToken || '',
        billingApiUser: (empresa as any).billingApiUser || '',
        billingApiPassword: (empresa as any).billingApiPassword || '',
        usaCodigoBarrasManual: Boolean((empresa as any).usaCodigoBarrasManual),
        brand: (empresa as any).brand || 'default',
        producto: (empresa as any).producto || 'facturacion',
        usuario: {
          nombre: adminUser.nombre || '',
          email: adminUser.email || '',
          dni: adminUser.dni || '',
          celular: adminUser.celular || '',
          password: '',
        },
        esAgenteRetencion: (empresa as any).esAgenteRetencion || false,
        cotizMostrarEmail: (empresa as any).cotizMostrarEmail ?? true,
        cotizMostrarCuentas: (empresa as any).cotizMostrarCuentas ?? true,
        cotizMostrarRazonSocial: (empresa as any).cotizMostrarRazonSocial ?? true,
        cotizMostrarDetraccion: (empresa as any).cotizMostrarDetraccion ?? true,
      });
      setInitialEditPlanId(empresa.plan?.id || 0);
      setLogoPreview(empresa.logo ? empresa.logo : '');
      setSeriesConfig(unirSeriesEmpresa((empresa as any).series, (empresa as any).billingProvider));
    }
  }, [open, isEdit, empresa, empresaId]);

  useEffect(() => {
    if (open && isEdit) setLogoPreview('');
  }, [empresaId, open, isEdit]);

  const rubrosOptions = rubros && Array.isArray(rubros) ? rubros : [];
  const ubigeosOptions = ubigeos.map((u: any) => ({ id: u.codigo, value: `${u.departamento} - ${u.provincia} - ${u.distrito}` }));
  const productoActual = (isEdit ? editData.producto : createData.producto) || 'facturacion';
  // Sistema unificado (marca única neutra): los planes se filtran solo por
  // producto, ya no por plataforma (marca múltiple eliminada).
  const planesDisponibles = useMemo(() => {
    return (planes as any[] || []).filter((plan: any) => {
      const planProducto = String(plan?.producto || 'facturacion').toLowerCase();
      return planProducto === String(productoActual).toLowerCase();
    });
  }, [planes, productoActual]);

  const selectedPlan: any = useMemo(() => {
    const id = isEdit ? editData.planId : createData.planId;
    return (planesDisponibles || []).find((p: any) => p.id === id);
  }, [planesDisponibles, isEdit, editData.planId, createData.planId]);

  const storePlans: any[] = useMemo(() => {
    return (planesDisponibles || []).filter((p: any) => !!p?.tieneTienda);
  }, [planesDisponibles]);

  const selectFirstStorePlan = () => {
    if (!storePlans || storePlans.length === 0) {
      alert('No hay planes con tienda virtual disponibles.', 'warning');
      return;
    }
    const id = storePlans[0].id;
    if (isEdit) setEditData(prev => ({ ...prev, planId: id }));
    else setCreateData(prev => ({ ...prev, planId: id }));
  };

  const currentUsaDemo = isEdit ? editData.usaDemo : createData.usaDemo;

  const handleUsaDemoToggle = (enabled: boolean) => {
    if (isEdit) {
      setEditData(prev => ({ ...prev, usaDemo: enabled }));
      return;
    }
    setCreateData(prev => ({ ...prev, usaDemo: enabled }));
    if (enabled) setErrors({});
  };

  const handleSelect = (id: any, _value: string, name: string) => {
    if (isEdit) {
      setEditData(prev => ({ ...prev, [name]: name === 'rubroId' ? parseInt(id) : id } as any));
    } else {
      setCreateData(prev => ({ ...prev, [name]: name === 'rubroId' ? parseInt(id) : id } as any));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleUbigeoChange = (id: any) => {
    const selected: any = ubigeos.find((u: any) => u.codigo === id);
    if (!selected) return;
    if (isEdit) {
      setEditData(prev => ({ ...prev, ubigeo: selected.codigo, departamento: selected.departamento, provincia: selected.provincia, distrito: selected.distrito }));
    } else {
      setCreateData(prev => ({ ...prev, ubigeo: selected.codigo, departamento: selected.departamento, provincia: selected.provincia, distrito: selected.distrito }));
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target as any;
    if (isEdit) {
      if (name.startsWith('usuario.')) {
        const field = name.split('.')[1];
        setEditData(prev => ({ ...prev, usuario: { ...prev.usuario, [field]: value } }));
      } else {
        setEditData(prev => ({ ...prev, [name]: value } as any));
      }
    } else {
      if (name.startsWith('usuario.')) {
        const field = name.split('.')[1];
        setCreateData(prev => ({ ...prev, usuario: { ...prev.usuario, [field]: value } }));
      } else {
        setCreateData(prev => ({ ...prev, [name]: value } as any));
      }
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const updateSerieConfig = (
    tipoDoc: string,
    field: 'serie' | 'correlativo' | 'activo',
    value: string | number | boolean,
  ) => {
    setSeriesConfig((prev) =>
      prev.map((item) =>
        item.tipoDoc === tipoDoc
          ? {
              ...item,
              [field]:
                field === 'serie'
                  ? String(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
                  : field === 'correlativo'
                    ? Math.max(1, Number(value) || 1)
                    : Boolean(value),
            }
          : item,
      ),
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`serie.${tipoDoc}`];
      delete next[`correlativo.${tipoDoc}`];
      return next;
    });
  };

  const handleEsPrueba = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreateData(prev => ({ ...prev, esPrueba: e.target.checked }));
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const max = 300; let { width, height } = img;
      if (width > height) { if (width > max) { height = (height * max) / width; width = max; } }
      else { if (height > max) { width = (width * max) / height; height = max; } }
      canvas.width = width; canvas.height = height;
      ctx?.clearRect(0, 0, width, height); ctx?.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL('image/png');
      setLogoPreview(base64);
      if (isEdit) setEditData(prev => ({ ...prev, logo: base64 }));
      else setCreateData(prev => ({ ...prev, logo: base64 }));
    };
    img.src = URL.createObjectURL(file);
  };

  const searchRuc = async () => {
    const ruc = isEdit ? editData.ruc : createData.ruc;
    if (!ruc || ruc.length !== 11) return;
    setSearchingRuc(true);
    try {
      const response: any = await getClientFromDoc(ruc);
      if (response) {
        const razonSocial = response.nombre_o_razon_social || response.razonSocial || '';
        const direccion = response.direccion_completa || response.direccion || '';
        const departamento = response.departamento || '';
        const provincia = response.provincia || '';
        const distrito = response.distrito || '';
        const ubigeoCode = response.ubigeo_sunat || '';
        const selected: any = ubigeos.find((u: any) => u.codigo === ubigeoCode);
        const updates = {
          razonSocial, nombreComercial: razonSocial, direccion,
          departamento, provincia, distrito, ubigeo: selected?.codigo || ubigeoCode || '',
        };
        if (isEdit) setEditData(prev => ({ ...prev, ...updates }));
        else setCreateData(prev => ({ ...prev, ...updates }));
        setErrors(prev => ({ ...prev, razonSocial: '', nombreComercial: '', direccion: '', ubigeo: '' }));
      }
    } catch { /* ignore */ } finally {
      setSearchingRuc(false);
    }
  };

  const handleRucBlur = () => { void searchRuc(); };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const base = isEdit ? editData : createData;
    const isDemo = base.usaDemo;

    if (!base.ruc) e.ruc = 'RUC es requerido';
    if (!base.razonSocial) e.razonSocial = 'Razón social es requerida';
    if (!base.direccion) e.direccion = 'Dirección es requerida';
    if (!base.nombreComercial) e.nombreComercial = 'Nombre comercial es requerido';
    if (!isDemo && !base.rubroId) e.rubroId = 'Rubro es requerido';
    if (!isDemo && !base.ubigeo) e.ubigeo = 'Ubigeo es requerido';

    if (!isEdit) {
      if (!createData.usuario?.nombre) e['usuario.nombre'] = 'Nombre del administrador es requerido';
      if (!createData.usuario?.email) e['usuario.email'] = 'Email del administrador es requerido';
      if (!createData.usuario?.password) e['usuario.password'] = 'Contraseña es requerida';
      if (!createData.usuario?.dni) e['usuario.dni'] = 'DNI es requerido';
      if (!createData.usuario?.celular) e['usuario.celular'] = 'Celular es requerido';
      if (!isDemo && isAdminSistema && !hasProductoScope && !createData.producto) e.producto = 'Selecciona el producto de destino';
    }

    if (isEdit) {
      for (const item of seriesConfig) {
        if (!item.activo) continue;
        if (!/^[A-Z0-9]{4}$/.test(String(item.serie || ''))) {
          e[`serie.${item.tipoDoc}`] = 'Serie inválida';
        }
        if (!Number.isInteger(Number(item.correlativo)) || Number(item.correlativo) < 1) {
          e[`correlativo.${item.tipoDoc}`] = 'Correlativo inválido';
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (isEdit) {
        await actualizarEmpresa(editData as any);
        await guardarSeriesEmpresa(editData.id, seriesConfig);
        alert('Empresa actualizada correctamente', 'success');
      } else {
        await crearEmpresa(createData as any);
        alert('Empresa creada correctamente', 'success');
      }
      onSaved?.();
      onClose();
    } catch (_err) {
      // El store maneja errores
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpenModal={open} closeModal={onClose} title={isEdit ? 'Editar Empresa' : 'Nueva Empresa'} width="1200px">
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[600px]">

        {/* Sidebar */}
        <aside className="md:col-span-3 border-r border-gray-100 dark:border-slate-700 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col">
          <div className="flex flex-col items-center text-center pb-5 border-b border-gray-100 dark:border-slate-700 mb-5">
            <div className="h-20 w-20 rounded-full bg-white dark:bg-slate-700 shadow-sm overflow-hidden mb-3 border border-gray-200 dark:border-slate-600 flex items-center justify-center">
              {logoPreview ? (
                <img src={logoPreview} className="h-full w-full object-cover" alt="Logo" />
              ) : (
                <svg className="w-9 h-9 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              )}
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              {isEdit ? (empresa?.razonSocial || '-') : 'Nueva Empresa'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
              {isEdit ? empresa?.ruc : 'RUC por registrar'}
            </p>
          </div>

          <nav className="space-y-1.5 flex-1">
            {[
              { id: 'datos', label: 'Datos de Empresa', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
              { id: 'suscripcion', label: 'Plan y Vigencia', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
              { id: 'sunat', label: 'Integración SUNAT', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
              ...(isEdit ? [{ id: 'series', label: 'Series SUNAT', icon: 'M7 8h10M7 12h6m-6 4h10M5 3h14a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 012-2z' }] : []),
              { id: 'admin', label: 'Administrador', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
            ].map((t: any) => (
              <button key={t.id} type="button"
                className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                  activeTab === t.id
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white border border-transparent hover:border-gray-200 dark:hover:border-slate-600 hover:shadow-sm'
                }`}
                onClick={() => setActiveTab(t.id)}>
                <svg className={`w-4 h-4 mr-2.5 shrink-0 ${activeTab === t.id ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === t.id ? "2" : "1.5"} d={t.icon} />
                </svg>
                {t.label}
              </button>
            ))}
          </nav>

          {/* Demo mode indicator in sidebar */}
          {currentUsaDemo && (
            <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
              <Icon icon="solar:test-tube-bold-duotone" width={18} className="text-amber-500 shrink-0" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Modo Demo activo</span>
            </div>
          )}
        </aside>

        {/* Content */}
        <section className="md:col-span-9 bg-white dark:bg-[#111827] overflow-y-auto flex flex-col">

          {/* Demo Mode Banner — always visible at top */}
          <div className={`px-4 sm:px-8 pt-6 pb-0 transition-all duration-300`}>
            <div
              className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                currentUsaDemo
                  ? 'border-amber-400 bg-amber-50 shadow-sm shadow-amber-200'
                  : 'border-dashed border-gray-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/30 dark:hover:bg-amber-900/10'
              }`}
              onClick={() => handleUsaDemoToggle(!currentUsaDemo)}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl transition-colors ${currentUsaDemo ? 'bg-amber-400' : 'bg-gray-100 dark:bg-slate-700'}`}>
                  <Icon icon="solar:test-tube-bold-duotone" width={20} className={currentUsaDemo ? 'text-white' : 'text-gray-400 dark:text-gray-500'} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${currentUsaDemo ? 'text-amber-900 dark:text-amber-200' : 'text-gray-700 dark:text-gray-300'}`}>
                    Modo Demo
                    {!isEdit && currentUsaDemo && <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Datos de prueba aplicados</span>}
                  </p>
                  <p className={`text-xs mt-0.5 ${currentUsaDemo ? 'text-amber-700 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {currentUsaDemo
                      ? 'Los comprobantes se enviarán por QPSE demo'
                      : isEdit
                        ? 'Activar para usar el servidor de pruebas de QPSE'
                        : 'Activa para crear la cuenta demo al instante con datos de prueba'
                    }
                  </p>
                </div>
              </div>
              {/* Toggle switch */}
              <div className={`relative w-12 h-6 rounded-full transition-colors duration-300 shrink-0 ${currentUsaDemo ? 'bg-amber-400' : 'bg-gray-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${currentUsaDemo ? 'left-7' : 'left-1'}`} />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-4 sm:px-8 pb-6 pt-5 space-y-0">
            <div className="flex-1">

              {activeTab === 'datos' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-2">Información General</h3>

                  {(isAdminSistema && (!hasNegocioScope || !hasProductoScope)) && (
                    <div>
                      {/* Selector de plataforma (plataforma múltiple) eliminado:
                          sistema unificado en una sola marca neutra. El brand
                          queda fijo en 'default' (ver createData/editData). */}

                      {!hasProductoScope && (
                        <>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2">Producto de destino <span className="text-red-500">*</span></p>
                          <div className="grid grid-cols-2 gap-3">
                            {([
                              { id: 'facturacion', label: 'Facturación', icon: 'solar:bill-list-bold-duotone', color: '#0EA5E9' },
                              { id: 'hotel', label: 'Hotel', icon: 'solar:bed-bold-duotone', color: '#F59E0B' },
                              { id: 'restaurante', label: 'Restaurante', icon: 'solar:cup-hot-bold-duotone', color: '#10B981' },
                            ] as const).map((p) => {
                              const selectedProducto = isEdit ? editData.producto : createData.producto;
                              const sel = selectedProducto === p.id;
                              return (
                                <button key={p.id} type="button"
                                  onClick={() => {
                                    if (isEdit) setEditData(prev => ({ ...prev, producto: p.id, planId: 0 }));
                                    else setCreateData(prev => ({ ...prev, producto: p.id, planId: 0 }));
                                    if (errors.producto) setErrors(prev => ({ ...prev, producto: '' }));
                                  }}
                                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${sel ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30 dark:border-sky-400 shadow-sm' : 'border-gray-200 dark:border-slate-600 hover:border-sky-300 dark:hover:border-sky-400 bg-white dark:bg-slate-800/50'}`}>
                                  <Icon icon={p.icon} width={20} style={{ color: sel ? p.color : '#9CA3AF' }} />
                                  <span className={`font-semibold text-sm ${sel ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{p.label}</span>
                                  {sel && <Icon icon="solar:check-circle-bold" width={16} className="ml-auto text-sky-500" />}
                                </button>
                              );
                            })}
                          </div>
                          {errors.producto && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1"><Icon icon="solar:danger-circle-bold" width={13} />{errors.producto}</p>}
                        </>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex gap-2 items-end">
                        <div className="flex-1">
                          <InputPro name="ruc" label="RUC" isLabel value={isEdit ? editData.ruc : createData.ruc} onChange={handleChange} error={errors.ruc} maxLength={11} />
                        </div>
                        <button
                          type="button"
                          onClick={() => void searchRuc()}
                          disabled={searchingRuc || (isEdit ? editData.ruc : createData.ruc).length !== 11}
                          className="h-10 px-3 flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white disabled:text-gray-400 dark:disabled:text-gray-500 text-xs font-semibold transition-all flex-shrink-0"
                        >
                          {searchingRuc
                            ? <Icon icon="svg-spinners:ring-resize" width={13} />
                            : <Icon icon="solar:magnifer-bold" width={13} />
                          }
                          <span className="hidden sm:inline">{searchingRuc ? 'Buscando...' : 'Buscar'}</span>
                        </button>
                      </div>
                    </div>
                    <InputPro name="razonSocial" label="Razón Social" isLabel value={isEdit ? editData.razonSocial : createData.razonSocial} onChange={handleChange} error={errors.razonSocial} />
                    <InputPro name="nombreComercial" label="Nombre Comercial" isLabel value={isEdit ? editData.nombreComercial : createData.nombreComercial} onChange={handleChange} error={errors.nombreComercial} />
                    <div className="relative">
                      <Select name="rubroId" label="Rubro" options={rubrosOptions} value={isEdit ? (rubrosOptions as any[]).find((r: any) => r.id === editData.rubroId)?.value : (rubrosOptions as any[]).find((r: any) => r.id === createData.rubroId)?.value} onChange={(id: any, v: string) => handleSelect(id, v, 'rubroId')} error={errors.rubroId} withLabel />
                    </div>
                    <Select error={() => {}} name="tipoEmpresa" label="Tipo de Empresa" options={[{ id: 'FORMAL', value: 'Empresa Formal' }, { id: 'INFORMAL', value: 'Empresa Informal' }]} value={isEdit ? (editData.tipoEmpresa === 'FORMAL' ? 'Empresa Formal' : 'Empresa Informal') : (createData.tipoEmpresa === 'FORMAL' ? 'Empresa Formal' : 'Empresa Informal')} onChange={(id: any, v: string) => handleSelect(id, v, 'tipoEmpresa')} withLabel />

                    <div className="md:col-span-2">
                      <InputPro name="direccion" label="Dirección" isLabel value={isEdit ? editData.direccion : createData.direccion} onChange={handleChange} error={errors.direccion} />
                    </div>
                    <div className="md:col-span-2">
                      <Select value={isEdit ? `${editData.departamento} - ${editData.provincia} - ${editData.distrito}` : `${createData.departamento} - ${createData.provincia} - ${createData.distrito}`} name="ubigeo" label="Ubicación (Departamento - Provincia - Distrito)" options={ubigeosOptions} onChange={(id: any) => handleUbigeoChange(id)} error={errors.ubigeo} isSearch withLabel />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Logo de la Empresa</label>
                      <div className="flex items-center space-x-4">
                        {logoPreview && (
                          <div className="h-14 w-14 rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden bg-gray-50 dark:bg-slate-800 shrink-0">
                            <img src={logoPreview} alt="preview" className="h-full w-full object-cover" />
                          </div>
                        )}
                        <label className="flex flex-col items-center justify-center w-full max-w-sm h-14 border-2 border-gray-300 dark:border-slate-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 hover:border-blue-300 transition-colors">
                          <div className="flex flex-row items-center justify-center space-x-2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Click para subir un logo</p>
                          </div>
                          <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                        </label>
                      </div>
                    </div>

                    {isEdit && (
                      <div className="md:col-span-2 space-y-3 mt-1">
                        {[
                          { key: 'usaCodigoBarrasManual', label: 'Habilitar código de barras en productos', desc: 'Fuerza la visualización del campo "Código de Barras" en productos, sin depender del rubro.' },
                          { key: 'esAgenteRetencion', label: 'Agente de Retención (SUNAT)', desc: 'Activa esta opción si la empresa ha sido designada como Agente de Retención por SUNAT.' },
                          { key: 'cotizMostrarRazonSocial', label: 'Mostrar razón social en cotizaciones', desc: 'Útil para ocultarla cuando es igual al nombre comercial y se ve duplicada.' },
                          { key: 'cotizMostrarEmail', label: 'Mostrar email en cotizaciones', desc: 'Muestra u oculta la línea "EMAIL:" en el encabezado del formato de cotización.' },
                          { key: 'cotizMostrarCuentas', label: 'Mostrar cuentas bancarias en cotizaciones', desc: 'Muestra u oculta la sección de cuentas para depósito en el formato de cotización.' },
                          { key: 'cotizMostrarDetraccion', label: 'Mostrar detracción en cotizaciones', desc: 'Muestra u oculta el bloque de detracción (solo si la cotización tiene detracción configurada).' },
                        ].map(({ key, label, desc }) => (
                          <label key={key} className="flex items-start space-x-3 p-3.5 border rounded-xl bg-blue-50/40 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                            <input type="checkbox" name={key} checked={Boolean((editData as any)[key])}
                              onChange={(e) => setEditData(prev => ({ ...prev, [key]: e.target.checked }))}
                              className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                            <div>
                              <span className="font-semibold text-gray-900 dark:text-white text-sm">{label}</span>
                              <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}

                    {!isEdit && (
                      <div className="md:col-span-2 mt-1">
                        <label className="flex items-start space-x-3 p-3.5 border rounded-xl bg-blue-50/40 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                          <input type="checkbox" name="usaCodigoBarrasManual" checked={Boolean(createData.usaCodigoBarrasManual)}
                            onChange={(e) => setCreateData(prev => ({ ...prev, usaCodigoBarrasManual: e.target.checked }))}
                            className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                          <div>
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">Habilitar código de barras en productos</span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Activa el campo "Código de Barras" en productos para esta empresa desde el inicio.</span>
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'suscripcion' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-2">Planes Disponibles</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {planesDisponibles && Array.isArray(planesDisponibles) && planesDisponibles.map((plan: any) => {
                      const selectedPlanId = Number(isEdit ? editData.planId : createData.planId);
                      const selected = selectedPlanId === Number(plan.id);
                      const dias = Number(plan.duracionDias || 0);
                      const periodoLabel = dias >= 330 ? 'anual'
                        : dias >= 150 ? 'semestral'
                        : dias >= 75 ? 'trimestral'
                        : plan.tipoFacturacion ? String(plan.tipoFacturacion).toLowerCase()
                        : 'mensual';
                      return (
                        <div key={plan.id}
                          onClick={() => (isEdit ? setEditData(prev => ({ ...prev, planId: plan.id })) : setCreateData(prev => ({ ...prev, planId: plan.id })))}
                          className={`relative p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col h-full ${selected ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-900/30 dark:border-blue-400 shadow-lg ring-1 ring-blue-600 dark:ring-blue-500' : 'border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-400 hover:shadow-md bg-white dark:bg-slate-800'}`}>
                          {selected && (
                            <div className="absolute top-3 right-3 text-blue-600">
                              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          <div className="font-extrabold text-gray-900 dark:text-white mb-1 pr-5">{plan.nombre}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2 min-h-[32px]">{plan.descripcion || 'Plan estándar'}</div>
                          <div className="mt-auto">
                            <div className="text-xl font-black text-blue-700 dark:text-blue-400">
                              <span className="text-sm text-blue-600 dark:text-blue-400 font-bold mr-0.5">S/</span>
                              {Number(plan.costo || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">/{periodoLabel}</span>
                            </div>
                            <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mt-3 pt-2 border-t border-gray-100 dark:border-slate-700">
                              {plan.limiteUsuarios ? <span>{plan.limiteUsuarios} Usu.</span> : <span />}
                              {plan.duracionDias ? <span>{plan.duracionDias} días</span> : <span />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {planesDisponibles.length === 0 && (
                    <div className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                      No hay planes disponibles para el producto seleccionado.
                    </div>
                  )}

                  <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-2 pt-3">Fechas de Vigencia</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputPro name="fechaActivacion" label="Fecha de Activación" type="date" isLabel value={isEdit ? editData.fechaActivacion : createData.fechaActivacion} onChange={handleChange} />
                    <InputPro name="fechaExpiracion" label="Fecha de Expiración" type="date" isLabel value={isEdit ? editData.fechaExpiracion : (createData.fechaExpiracion || '')} onChange={handleChange} />
                  </div>

                  <div className="rounded-xl border border-blue-100 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">Módulo de Tienda Virtual</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {selectedPlan?.tieneTienda
                          ? <span>Este plan <strong className="text-emerald-600">incluye tienda virtual</strong>.</span>
                          : <span>Este plan no incluye módulo de tienda virtual.</span>}
                      </p>
                    </div>
                    {selectedPlan?.tieneTienda ? (
                      isAdminSistema ? (
                        <div className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 text-xs font-medium text-gray-500 dark:text-gray-400 text-center whitespace-nowrap">Solo admin<br/>de empresa</div>
                      ) : (
                        <Button type="button" color="secondary" className="shrink-0 text-sm"
                          disabled={isEdit ? initialEditPlanId !== undefined && initialEditPlanId !== editData.planId : true}
                          onClick={() => navigate('/administrador/tienda/configuracion')}>
                          {isEdit ? (initialEditPlanId !== undefined && initialEditPlanId !== editData.planId ? 'Guardar para configurar' : ((empresa as any)?.slugTienda ? 'Gestionar Tienda' : 'Configurar Tienda')) : 'Guardar y Configurar'}
                        </Button>
                      )
                    ) : (
                      <Button type="button" color="white" outline onClick={selectFirstStorePlan} className="shrink-0 text-sm">Ver planes con tienda</Button>
                    )}
                  </div>

                  {!isEdit && (
                    <label className="flex items-center w-max group cursor-pointer">
                      <input type="checkbox" checked={createData.esPrueba} onChange={handleEsPrueba} className="w-4 h-4 text-blue-600 rounded border-gray-300 cursor-pointer focus:ring-blue-500" />
                      <span className="ml-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Activar versión de prueba gratuita</span>
                    </label>
                  )}
                </div>
              )}

              {activeTab === 'sunat' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-2">Credenciales SUNAT / PSE</h3>

                  <div className="bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                    <div className="flex items-start">
                      <svg className="w-4 h-4 text-amber-500 mt-0.5 mr-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        Emisión estándar activa con <strong>QPSE</strong>. Usa aquí las credenciales QPSE de la empresa. APISUNAT está desactivado temporalmente.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputPro name="usuarioPse" label="Usuario PSE (QPSE)" isLabel value={isEdit ? (editData.usuarioPse || '') : (createData.usuarioPse || '')} onChange={handleChange} placeholder="Ej. 0HGRQ55B" />
                    <InputPro name="contrasenaPse" label="Contraseña PSE (QPSE)" type="password" isLabel value={isEdit ? (editData.contrasenaPse || '') : (createData.contrasenaPse || '')} onChange={handleChange} placeholder="Ej. R8101ZBD" />
                  </div>
                </div>
              )}

              {activeTab === 'series' && isEdit && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-2">Series y Correlativos SUNAT</h3>

                  <div className="bg-sky-50/70 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Icon icon="solar:info-circle-bold" width={18} className="text-sky-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
                        Úsalo cuando la empresa viene de otro facturador. Si el último documento usado fue <strong>B001-250</strong>, configura boleta con serie <strong>B001</strong> y siguiente correlativo <strong>251</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {DOCUMENTO_SERIES.map((doc) => {
                      const item = seriesConfig.find((serie) => serie.tipoDoc === doc.tipoDoc) || {
                        tipoDoc: doc.tipoDoc,
                        serie: doc.serie,
                        correlativo: 1,
                        activo: true,
                      };
                      return (
                        <div
                          key={doc.tipoDoc}
                          className={`rounded-2xl border p-4 transition-all ${
                            item.activo
                              ? 'border-slate-200 bg-white shadow-sm dark:border-transparent dark:bg-slate-800/70'
                              : 'border-slate-200 bg-slate-50 opacity-70 dark:border-transparent dark:bg-slate-900/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{doc.label}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{doc.help}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateSerieConfig(doc.tipoDoc, 'activo', !item.activo)}
                              className={`relative h-6 w-11 rounded-full transition-colors ${
                                item.activo ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                              aria-label={`Activar ${doc.label}`}
                            >
                              <span
                                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                                  item.activo ? 'left-6' : 'left-1'
                                }`}
                              />
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Serie</span>
                              <input
                                value={item.serie}
                                onChange={(event) => updateSerieConfig(doc.tipoDoc, 'serie', event.target.value)}
                                disabled={!item.activo}
                                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold uppercase text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800"
                              />
                              {errors[`serie.${doc.tipoDoc}`] && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors[`serie.${doc.tipoDoc}`]}</p>}
                            </label>
                            <label className="block">
                              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Siguiente</span>
                              <input
                                type="number"
                                min={1}
                                value={item.correlativo}
                                onChange={(event) => updateSerieConfig(doc.tipoDoc, 'correlativo', event.target.value)}
                                disabled={!item.activo}
                                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:disabled:bg-slate-800"
                              />
                              {errors[`correlativo.${doc.tipoDoc}`] && <p className="mt-1 text-[11px] font-semibold text-red-500">{errors[`correlativo.${doc.tipoDoc}`]}</p>}
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'admin' && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-700 pb-2">Superusuario de la Empresa</h3>

                  {isEdit && (
                    <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                      <div className="flex items-start">
                        <svg className="w-4 h-4 text-blue-500 mt-0.5 mr-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                          Puedes actualizar los datos del administrador principal. <strong>Si dejas la contraseña en blanco, se mantiene la actual.</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputPro name="usuario.nombre" label="Nombre Completo" isLabel value={isEdit ? editData.usuario?.nombre || '' : createData.usuario.nombre} onChange={handleChange} error={isEdit ? '' : errors['usuario.nombre']} />
                    <InputPro name="usuario.dni" label="DNI" isLabel value={isEdit ? editData.usuario?.dni || '' : createData.usuario.dni} onChange={handleChange} error={isEdit ? '' : errors['usuario.dni']} maxLength={8} />
                    <InputPro name="usuario.email" label="Correo Electrónico" type="email" isLabel value={isEdit ? editData.usuario?.email || '' : createData.usuario.email} onChange={handleChange} error={isEdit ? '' : errors['usuario.email']} />
                    <InputPro name="usuario.celular" label="Número de Celular" isLabel value={isEdit ? editData.usuario?.celular || '' : createData.usuario.celular} onChange={handleChange} error={isEdit ? '' : errors['usuario.celular']} />
                    <div className="md:col-span-2">
                      <InputPro name="usuario.password" label={isEdit ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso'} type="password" isLabel value={isEdit ? editData.usuario?.password || '' : createData.usuario.password} onChange={handleChange} error={isEdit ? '' : errors['usuario.password']} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-5 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between mt-4">
              <div>
                {Object.keys(errors).length > 0 && (
                  <span className="text-xs text-red-500 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Completa los campos requeridos
                  </span>
                )}
              </div>
              <div className="flex gap-2.5">
                <Button type="button" color="white" outline onClick={onClose} className="px-5 font-medium bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm">
                  Cancelar
                </Button>
                <Button type="submit" color="secondary" disabled={isSubmitting} className="px-7 shadow-sm text-sm">
                  {isSubmitting ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {isEdit ? 'Guardando...' : 'Creando...'}
                    </span>
                  ) : (isEdit ? 'Guardar Cambios' : 'Crear Empresa')}
                </Button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </Modal>
  );
}
