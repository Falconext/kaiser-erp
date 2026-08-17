import { useState, useEffect, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react/dist/iconify.js';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import { useEmpresasStore } from '@/zustand/empresas';
import { useExtentionsStore } from '@/zustand/extentions';
import useAlertStore from '@/zustand/alert';
import { useClientsStore } from '@/zustand/clients';

// ── Estilo CRM claro (Brix UI) ──────────────────────────────────────────────
const ACCENT = 'var(--accent, #7551FF)';

interface FormData {
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
  usuario: {
    nombre: string;
    email: string;
    password: string;
    dni: string;
    celular: string;
  };
}

interface FormErrors {
  [key: string]: string;
}

const REQUIRED_EMPRESA = ['ruc', 'razonSocial', 'nombreComercial', 'direccion', 'rubroId', 'ubigeo', 'planId'];
const REQUIRED_USUARIO = ['usuario.nombre', 'usuario.email', 'usuario.password', 'usuario.dni', 'usuario.celular'];

const CreateEmpresa = () => {
  const navigate = useNavigate();
  const { success } = useAlertStore();
  const { loading, error, crearEmpresa } = useEmpresasStore();
  const { planes, rubros, ubigeos, getRubros, getUbigeos, getPlanes } = useExtentionsStore();

  const [formData, setFormData] = useState<FormData>({
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
    usuario: { nombre: '', email: '', password: '', dni: '', celular: '' },
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [searchingRuc, setSearchingRuc] = useState(false);
  const [ubigeoSelected, setUbigeoSelected] = useState<any>('');
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => { getRubros(); getUbigeos(); getPlanes(); }, [getRubros, getUbigeos, getPlanes]);

  const { getClientFromDoc } = useClientsStore();

  useEffect(() => {
    if (success === true && !isSubmitting) navigate('/administrador/empresas');
  }, [success, navigate, isSubmitting]);

  // ── Validación completa ──────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const e: FormErrors = {};

    // RUC
    if (!formData.ruc) {
      e.ruc = 'El RUC es obligatorio';
    } else if (!/^\d{11}$/.test(formData.ruc)) {
      e.ruc = 'El RUC debe tener exactamente 11 dígitos numéricos';
    } else if (!/^(10|15|16|17|20)/.test(formData.ruc)) {
      e.ruc = 'El RUC debe comenzar con 10, 15, 16, 17 o 20';
    }

    // Datos empresa
    if (!formData.razonSocial.trim()) e.razonSocial = 'La razón social es obligatoria';
    if (!formData.nombreComercial.trim()) e.nombreComercial = 'El nombre comercial es obligatorio';
    if (!formData.direccion.trim()) e.direccion = 'La dirección es obligatoria';
    if (!formData.rubroId || formData.rubroId <= 0) e.rubroId = 'Debes seleccionar un rubro';
    if (!formData.ubigeo) e.ubigeo = 'Debes seleccionar la ubicación (ubigeo)';
    if (!formData.planId || formData.planId <= 0) e.planId = 'Debes seleccionar un plan';

    // Fechas
    if (formData.fechaExpiracion && formData.fechaActivacion) {
      if (new Date(formData.fechaExpiracion) <= new Date(formData.fechaActivacion)) {
        e.fechaExpiracion = 'La fecha de expiración debe ser posterior a la fecha de activación';
      }
    }

    // Administrador
    if (!formData.usuario.nombre.trim()) {
      e['usuario.nombre'] = 'El nombre del administrador es obligatorio';
    } else if (formData.usuario.nombre.trim().split(/\s+/).length < 2) {
      e['usuario.nombre'] = 'Ingresa nombre y apellido del administrador';
    }

    if (!formData.usuario.email) {
      e['usuario.email'] = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.usuario.email)) {
      e['usuario.email'] = 'El formato del email no es válido';
    }

    if (!formData.usuario.password) {
      e['usuario.password'] = 'La contraseña es obligatoria';
    } else if (formData.usuario.password.length < 6) {
      e['usuario.password'] = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.usuario.dni) {
      e['usuario.dni'] = 'El DNI es obligatorio';
    } else if (!/^\d{8}$/.test(formData.usuario.dni)) {
      e['usuario.dni'] = 'El DNI debe tener exactamente 8 dígitos numéricos';
    }

    if (!formData.usuario.celular) {
      e['usuario.celular'] = 'El celular es obligatorio';
    } else if (!/^9\d{8}$/.test(formData.usuario.celular)) {
      e['usuario.celular'] = 'El celular debe tener 9 dígitos y comenzar con 9';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Errores por sección (para badges)
  const empresaErrorCount = REQUIRED_EMPRESA.filter(k => errors[k]).length +
    (errors.fechaExpiracion ? 1 : 0);
  const usuarioErrorCount = REQUIRED_USUARIO.filter(k => errors[k]).length;
  const totalErrors = Object.keys(errors).length;

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('usuario.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, usuario: { ...prev.usuario, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleTipoEmpresaChange = (id: any) => {
    setFormData(prev => ({
      ...prev,
      tipoEmpresa: id as 'FORMAL' | 'INFORMAL',
      fechaExpiracion: recalcularFechaExpiracion(prev.esPrueba, id, prev.planId),
    }));
  };

  const handleEsPruebaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const esPrueba = e.target.checked;
    setFormData(prev => ({
      ...prev,
      esPrueba,
      fechaExpiracion: recalcularFechaExpiracion(esPrueba, prev.tipoEmpresa, prev.planId),
    }));
  };

  const handlePlanSelect = (planId: number) => {
    setFormData(prev => ({
      ...prev,
      planId,
      fechaExpiracion: recalcularFechaExpiracion(prev.esPrueba, prev.tipoEmpresa, planId),
    }));
    if (errors.planId) setErrors(prev => ({ ...prev, planId: '' }));
  };

  const handleSelectChange = (id: any, _value: string, name: string) => {
    const val = parseInt(id) || 0;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleUbigeoChange = (id: any) => {
    const found: any = ubigeos.find((u: any) => u.codigo === id);
    if (found) {
      setUbigeoSelected(found);
      setFormData(prev => ({
        ...prev,
        ubigeo: found.codigo,
        departamento: found.departamento,
        provincia: found.provincia,
        distrito: found.distrito,
      }));
      if (errors.ubigeo) setErrors(prev => ({ ...prev, ubigeo: '' }));
    }
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const max = 300;
      let { width, height } = img;
      if (width > height) { if (width > max) { height = (height * max) / width; width = max; } }
      else { if (height > max) { width = (width * max) / height; height = max; } }
      canvas.width = width; canvas.height = height;
      ctx?.clearRect(0, 0, width, height);
      ctx?.drawImage(img, 0, 0, width, height);
      const b64 = canvas.toDataURL('image/png');
      setLogoPreview(b64);
      setFormData(prev => ({ ...prev, logo: b64 }));
    };
    img.src = URL.createObjectURL(file);
  };

  const handleRucBlur = async () => {
    if (formData.ruc && formData.ruc.length === 11) {
      setSearchingRuc(true);
      try {
        const response = await getClientFromDoc(formData.ruc);
        if (response) {
          const razonSocial = response.nombre_o_razon_social || response.razonSocial || '';
          const direccion = response.direccion_completa || response.direccion || '';
          const ubigeo = response.ubigeo_sunat || '';
          const found: any = ubigeos.find((u: any) => u.codigo === ubigeo);
          setUbigeoSelected(found);
          setFormData(prev => ({
            ...prev, razonSocial, nombreComercial: razonSocial, direccion,
            departamento: response.departamento || '',
            provincia: response.provincia || '',
            distrito: response.distrito || '',
            ubigeo: found?.codigo || ubigeo || '',
            fechaActivacion: new Date().toISOString().split('T')[0],
            fechaExpiracion: recalcularFechaExpiracion(prev.esPrueba, prev.tipoEmpresa, prev.planId),
          }));
          setErrors(prev => ({ ...prev, ruc: '', razonSocial: '', nombreComercial: '', direccion: '', ubigeo: '' }));
        }
      } catch {
        // No se encontró RUC en SUNAT — el usuario llena manualmente
      } finally {
        setSearchingRuc(false);
      }
    }
  };

  const recalcularFechaExpiracion = (esPrueba: boolean, tipoEmpresa: string, planId?: number) => {
    const ahora = new Date();
    let dias = 30;
    if (planId && Array.isArray(planes)) {
      const plan: any = planes.find((p: any) => p.id === planId);
      if (plan?.duracionDias) dias = plan.duracionDias;
    } else {
      if (esPrueba) dias = 15;
      else if (tipoEmpresa === 'INFORMAL') dias = 30;
    }
    return new Date(ahora.getTime() + dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setIsSubmitting(true);
    try {
      await crearEmpresa(formData);
    } catch (err) {
      console.error('Error al crear empresa:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const rubrosOptions = rubros && Array.isArray(rubros) ? rubros : [];
  const ubigeosOptions = ubigeos.map((u: any) => ({
    id: u.codigo,
    value: `${u.departamento} - ${u.provincia} - ${u.distrito}`,
  }));

  // ── UI helpers ───────────────────────────────────────────────────────────
  const SectionBadge = ({ count }: { count: number }) =>
    count > 0 ? (
      <span className="ml-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
        {count}
      </span>
    ) : null;

  const sectionClass = (hasError: boolean) =>
    `p-6 rounded-3xl border transition-colors ${hasError
      ? 'bg-rose-50/60 border-rose-200 dark:bg-rose-900/10 dark:border-rose-900/50'
      : 'bg-white dark:bg-[#111827] border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_rgba(15,23,42,0.05)]'}`;

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Empresas</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Nueva empresa</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={() => navigate('/administrador/empresas')}
          className="h-11 w-11 grid place-items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
        >
          <Icon icon="solar:alt-arrow-left-linear" className="text-lg" />
        </button>
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Nueva empresa</h1>
          <p className="text-sm text-slate-400 mt-0.5">Completa todos los campos obligatorios <span style={{ color: ACCENT }}>*</span></p>
        </div>
      </div>

      {/* Error global del servidor */}
      {error && (
        <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 rounded-2xl flex items-start gap-3">
          <Icon icon="solar:danger-triangle-bold" className="text-xl mt-0.5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Resumen de errores al intentar enviar */}
      {submitAttempted && totalErrors > 0 && (
        <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="solar:close-circle-bold" className="text-rose-500 text-lg" />
            <p className="text-sm font-bold text-rose-700 dark:text-rose-300">
              Hay {totalErrors} campo{totalErrors !== 1 ? 's' : ''} con error. Corrígelos antes de continuar.
            </p>
          </div>
          <ul className="space-y-1 pl-6 list-disc">
            {Object.entries(errors).map(([, msg]) => (
              <li key={msg} className="text-xs text-rose-600 dark:text-rose-400">{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="max-w-8xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

            {/* ── Datos de la Empresa ── */}
            <div className={sectionClass(empresaErrorCount > 0)}>
              <div className="flex items-center gap-3 mb-5">
                <span className="h-10 w-10 grid place-items-center rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shrink-0">
                  <Icon icon="solar:buildings-bold-duotone" className="text-xl" />
                </span>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">
                  Datos de la Empresa
                </h2>
                <SectionBadge count={empresaErrorCount} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* RUC */}
                <div>
                  <InputPro
                    name="ruc"
                    label="RUC *"
                    value={formData.ruc}
                    onChange={handleInputChange}
                    handleOnBlur={handleRucBlur}
                    error={errors.ruc}
                    isLabel
                    maxLength={11}
                    placeholder="20XXXXXXXXX"
                  />
                  {searchingRuc && (
                    <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                      <Icon icon="mdi:loading" className="animate-spin" /> Consultando SUNAT...
                    </p>
                  )}
                  {!errors.ruc && formData.ruc.length === 11 && !searchingRuc && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <Icon icon="solar:check-circle-bold" /> RUC válido
                    </p>
                  )}
                </div>

                {/* Razón Social */}
                <div>
                  <InputPro
                    name="razonSocial"
                    label="Razón Social *"
                    value={formData.razonSocial}
                    onChange={handleInputChange}
                    error={errors.razonSocial}
                    isLabel
                    placeholder="Nombre legal de la empresa"
                  />
                </div>

                {/* Nombre Comercial */}
                <div>
                  <InputPro
                    name="nombreComercial"
                    label="Nombre Comercial *"
                    value={formData.nombreComercial}
                    onChange={handleInputChange}
                    error={errors.nombreComercial}
                    isLabel
                    placeholder="Nombre que aparece al cliente"
                  />
                </div>

                {/* Rubro */}
                <div>
                  <Select
                    name="rubroId"
                    label="Rubro *"
                    options={rubrosOptions}
                    onChange={handleSelectChange}
                    error={errors.rubroId}
                    withLabel
                  />
                  {!errors.rubroId && formData.rubroId > 0 && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <Icon icon="solar:check-circle-bold" /> Rubro seleccionado
                    </p>
                  )}
                </div>

                {/* Tipo de Empresa */}
                <div>
                  <Select
                    name="tipoEmpresa"
                    label="Tipo de Empresa *"
                    options={[
                      { id: 'FORMAL', value: 'Empresa Formal (emite comprobantes SUNAT)' },
                      { id: 'INFORMAL', value: 'Empresa Informal (sin comprobantes SUNAT)' },
                    ]}
                    value={formData.tipoEmpresa === 'FORMAL' ? 'Empresa Formal (emite comprobantes SUNAT)' : 'Empresa Informal (sin comprobantes SUNAT)'}
                    onChange={handleTipoEmpresaChange}
                    error={errors.tipoEmpresa}
                    withLabel
                  />
                </div>

                {/* Dirección */}
                <div className="md:col-span-2">
                  <InputPro
                    name="direccion"
                    label="Dirección *"
                    value={formData.direccion}
                    onChange={handleInputChange}
                    error={errors.direccion}
                    isLabel
                    placeholder="Av. / Jr. / Calle + número + urbanización"
                  />
                </div>

                {/* Ubigeo */}
                <div className="md:col-span-2">
                  <Select
                    name="ubigeo"
                    label="Ubicación: Departamento — Provincia — Distrito *"
                    options={ubigeosOptions}
                    onChange={handleUbigeoChange}
                    error={errors.ubigeo}
                    isSearch
                    withLabel
                  />
                  {ubigeoSelected && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                      <Icon icon="solar:check-circle-bold" />
                      {ubigeoSelected.departamento} → {ubigeoSelected.provincia} → {ubigeoSelected.distrito}
                    </p>
                  )}
                </div>

                {/* Plan */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Plan *
                    </label>
                    {errors.planId && (
                      <span className="text-xs text-rose-500 flex items-center gap-1">
                        <Icon icon="solar:danger-circle-bold" /> {errors.planId}
                      </span>
                    )}
                  </div>
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-3 ${errors.planId ? 'rounded-2xl ring-2 ring-rose-300 p-1' : ''}`}>
                    {planes && Array.isArray(planes) && planes.map((plan: any) => {
                      const active = formData.planId === plan.id;
                      return (
                      <div
                        key={plan.id}
                        onClick={() => handlePlanSelect(plan.id)}
                        className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 ${active
                          ? 'bg-violet-50 dark:bg-violet-900/20 ring-2 shadow-[0_2px_20px_rgba(117,81,255,0.12)]'
                          : 'border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                        }`}
                        style={active ? { ['--tw-ring-color' as any]: ACCENT } : undefined}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-800 dark:text-white">{plan.nombre}</span>
                          {active && (
                            <Icon icon="solar:check-circle-bold" className="text-lg" style={{ color: ACCENT }} />
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{plan.descripcion || ''}</div>
                        <div className="text-xl font-extrabold mt-3" style={{ color: ACCENT }}>
                          S/ {plan.costo?.toString()}
                          {plan.tipoFacturacion && (
                            <span className="text-xs text-slate-400 ml-1 font-normal">/ {plan.tipoFacturacion.toLowerCase()}</span>
                          )}
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                          {plan.limiteUsuarios && <span>Usuarios: {plan.limiteUsuarios}</span>}
                          {plan.duracionDias && <span>{plan.duracionDias} días</span>}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1">
                          {plan.tieneTienda && <div className="flex items-center text-xs text-slate-600 dark:text-slate-300"><Icon icon="solar:check-circle-bold" className="text-emerald-500 mr-1.5" /> Tienda Virtual</div>}
                          {plan.tieneCulqi && <div className="flex items-center text-xs text-slate-600 dark:text-slate-300"><Icon icon="solar:check-circle-bold" className="text-emerald-500 mr-1.5" /> Pagos con Culqi</div>}
                          {plan.tieneDeliveryGPS && <div className="flex items-center text-xs text-slate-600 dark:text-slate-300"><Icon icon="solar:check-circle-bold" className="text-emerald-500 mr-1.5" /> Delivery con GPS</div>}
                          {plan.tieneGaleria && <div className="flex items-center text-xs text-slate-600 dark:text-slate-300"><Icon icon="solar:check-circle-bold" className="text-emerald-500 mr-1.5" /> Galería de Imágenes</div>}
                          {plan.tieneBanners && <div className="flex items-center text-xs text-slate-600 dark:text-slate-300"><Icon icon="solar:check-circle-bold" className="text-emerald-500 mr-1.5" /> Banners Promocionales</div>}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* Versión prueba */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.esPrueba}
                      onChange={handleEsPruebaChange}
                      className="w-5 h-5 rounded accent-violet-600 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                    />
                    <div>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Versión de prueba (sin costo)</span>
                      <p className="text-xs text-slate-400 mt-0.5">Duración de 15 días. El cliente puede actualizar al plan completo en cualquier momento.</p>
                    </div>
                  </label>
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Logo (Opcional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 dark:file:bg-violet-900/30 file:text-violet-700 dark:file:text-violet-300 hover:file:bg-violet-100 dark:hover:file:bg-violet-900/50"
                  />
                  {logoPreview && (
                    <img src={logoPreview} alt="Preview" className="mt-2 h-20 w-20 object-cover rounded-2xl border border-slate-200 dark:border-slate-700" />
                  )}
                </div>

                {/* Fechas */}
                <div>
                  <InputPro name="fechaActivacion" label="Fecha de Activación" type="date" value={formData.fechaActivacion} onChange={handleInputChange} isLabel disabled />
                </div>
                <div>
                  <InputPro
                    name="fechaExpiracion"
                    label="Fecha de Expiración (auto-calculada)"
                    type="date"
                    value={formData.fechaExpiracion || ''}
                    onChange={handleInputChange}
                    error={errors.fechaExpiracion}
                    isLabel
                  />
                </div>
              </div>
            </div>

            {/* ── Integración SUNAT ── */}
            {formData.tipoEmpresa === 'FORMAL' && !formData.esPrueba && (
              <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="h-10 w-10 grid place-items-center rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shrink-0">
                    <Icon icon="solar:document-bold-duotone" className="text-xl" />
                  </span>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white">Integración SUNAT</h2>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full">Opcional</span>
                </div>
                <p className="text-sm text-slate-400 mb-4">
                  Credenciales del proveedor de facturación electrónica (QPSE). Puedes agregarlas después del registro desde la configuración de la empresa.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputPro name="usuarioPse" label="Usuario PSE (QPSE)" value={formData.usuarioPse || ''} onChange={handleInputChange} isLabel placeholder="Ej. 0HGRQ55B" />
                  <InputPro name="contrasenaPse" label="Contraseña PSE (QPSE)" type="password" value={formData.contrasenaPse || ''} onChange={handleInputChange} isLabel placeholder="Ej. R8101ZBD" />
                </div>
              </div>
            )}

            {/* ── Administrador ── */}
            <div className={sectionClass(usuarioErrorCount > 0)}>
              <div className="flex items-center gap-3 mb-5">
                <span className="h-10 w-10 grid place-items-center rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shrink-0">
                  <Icon icon="solar:user-bold-duotone" className="text-xl" />
                </span>
                <h2 className="text-base font-bold text-slate-800 dark:text-white">
                  Administrador de la Empresa
                </h2>
                <SectionBadge count={usuarioErrorCount} />
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Este usuario tendrá acceso total a la empresa. Asegúrate de que los datos sean correctos.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <InputPro
                    name="usuario.nombre"
                    label="Nombre Completo *"
                    value={formData.usuario.nombre}
                    onChange={handleInputChange}
                    error={errors['usuario.nombre']}
                    isLabel
                    placeholder="Ej. Juan Pérez García"
                  />
                </div>

                <div>
                  <InputPro
                    name="usuario.dni"
                    label="DNI *"
                    value={formData.usuario.dni}
                    onChange={handleInputChange}
                    error={errors['usuario.dni']}
                    isLabel
                    maxLength={8}
                    placeholder="12345678"
                  />
                  {!errors['usuario.dni'] && /^\d{8}$/.test(formData.usuario.dni) && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><Icon icon="solar:check-circle-bold" /> DNI válido</p>
                  )}
                </div>

                <div>
                  <InputPro
                    name="usuario.celular"
                    label="Celular *"
                    value={formData.usuario.celular}
                    onChange={handleInputChange}
                    error={errors['usuario.celular']}
                    isLabel
                    maxLength={9}
                    placeholder="9XXXXXXXX"
                  />
                  {!errors['usuario.celular'] && /^9\d{8}$/.test(formData.usuario.celular) && (
                    <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><Icon icon="solar:check-circle-bold" /> Celular válido</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <InputPro
                    name="usuario.email"
                    label="Email *"
                    type="email"
                    value={formData.usuario.email}
                    onChange={handleInputChange}
                    error={errors['usuario.email']}
                    isLabel
                    placeholder="admin@empresa.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <InputPro
                    name="usuario.password"
                    label="Contraseña *"
                    type="password"
                    value={formData.usuario.password}
                    onChange={handleInputChange}
                    error={errors['usuario.password']}
                    isLabel
                    placeholder="Mínimo 6 caracteres"
                  />
                  {formData.usuario.password.length > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className={`h-1 w-8 rounded-full transition-colors ${
                            formData.usuario.password.length >= i * 3
                              ? i <= 1 ? 'bg-rose-400' : i <= 2 ? 'bg-amber-400' : i <= 3 ? 'bg-blue-400' : 'bg-emerald-500'
                              : 'bg-slate-100 dark:bg-slate-700'
                          }`} />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formData.usuario.password.length < 6 ? 'Muy corta' :
                         formData.usuario.password.length < 9 ? 'Aceptable' :
                         formData.usuario.password.length < 12 ? 'Buena' : 'Fuerte'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/administrador/empresas')}
                className="h-11 px-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || isSubmitting}
                className="h-11 px-5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: ACCENT }}
              >
                {isSubmitting ? (
                  <>
                    <Icon icon="mdi:loading" className="animate-spin text-lg" /> Creando empresa...
                  </>
                ) : (
                  <>
                    <Icon icon="solar:add-circle-bold" className="text-lg" /> Crear Empresa
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
    </div>
  );
};

export default CreateEmpresa;
