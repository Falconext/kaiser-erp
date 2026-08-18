import { usePerfilViewModel } from '@/features/admin/perfil/usePerfilViewModel';
import { BRAND } from '@/lib/branding';
import { Icon } from '@iconify/react';
import Loading from '@/components/Loading';
import { usaLotesFarmaciaRubro } from '@/utils/rubro-features';
import { hasPlanFeature } from '@/utils/permissions';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CuentasBancariasConfig from '@/pages/admin/empresa/CuentasBancariasConfig';
import ConfiguracionQpse from '@/pages/admin/empresa/ConfiguracionQpse';

const ACCENT = 'var(--accent, #7551FF)';

export default function PerfilIndex() {
    const vm = usePerfilViewModel();
    const { perfil, loading, savingBarcodeConfig, savingFefoPriceConfig, savingVentaSinStockConfig, savingDirectorTecnico, savingWhatsAppConfig, whatsAppForm, whatsappConfigDirty, passwordForm, setPasswordForm, passwordErrors, savingPassword, handleChangePassword } = vm;
    const [showActual, setShowActual] = useState(false);
    const [showNueva, setShowNueva] = useState(false);
    const [directorInput, setDirectorInput] = useState<string | null>(null);
    // Pestañas Perfil / Configuración (sincronizadas con la URL para deep-link desde el menú)
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab: 'perfil' | 'configuracion' = searchParams.get('tab') === 'configuracion' ? 'configuracion' : 'perfil';
    const goTab = (t: 'perfil' | 'configuracion') => setSearchParams(t === 'configuracion' ? { tab: 'configuracion' } : {}, { replace: true });

    if (loading) return <div className="flex justify-center items-center h-96"><Loading /></div>;
    if (!perfil) return <div className="text-center text-slate-400 py-8">No se pudo cargar la información del perfil</div>;

    const isSystemAdmin = perfil?.rol === 'ADMIN_SISTEMA';
    const theme = {
        bg: isSystemAdmin ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-violet-50 dark:bg-violet-900/20',
        text: isSystemAdmin ? 'text-indigo-600 dark:text-indigo-300' : 'text-violet-600 dark:text-violet-300',
        textDark: isSystemAdmin ? 'text-indigo-700 dark:text-indigo-300' : 'text-violet-700 dark:text-violet-300',
        border: isSystemAdmin ? 'border-indigo-100 dark:border-indigo-900/40' : 'border-violet-100 dark:border-violet-900/40',
        icon: isSystemAdmin ? 'text-indigo-300' : 'text-violet-300',
    };
    const fefoPermitidoPorPlan = hasPlanFeature(perfil as any, 'tieneGestionLotes');
    // Conexión Shalom: solo disponible en planes Negocio y Corporativo.
    const planNombre = String(perfil?.empresa?.plan?.nombre ?? '').toLowerCase();
    const puedeShalom = /negocio|corporativo/.test(planNombre);
    // Envío automático por WhatsApp: desactivado temporalmente (a pedido).
    const SHOW_WHATSAPP: boolean = false;

    // Estilos base reutilizables — CRM claro
    const cardCls = 'bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-800';
    // Visibilidad por pestaña
    const perfilTab = activeTab === 'perfil' ? '' : 'hidden';
    const configTab = activeTab === 'configuracion' ? '' : 'hidden';
    const inputCls = 'w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none transition-colors focus:border-[var(--accent)]';
    const primaryBtn = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none';

    const SectionHeader = ({ icon, title, chip }: { icon: string; title: string; chip?: string }) => (
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2.5">
            <span className={`p-2 rounded-xl ${chip ?? `${theme.bg} ${theme.text}`}`}><Icon icon={icon} width="20" /></span>
            {title}
        </h2>
    );

    if (perfil?.rol === 'ADMIN_SISTEMA') {
        return (
            <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                    <Icon icon="solar:home-smile-linear" className="text-base" />
                    <span>Panel</span>
                    <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                    <span>Cuenta</span>
                    <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                    <span className="font-semibold" style={{ color: ACCENT }}>Mi Perfil</span>
                </div>
                <div className="mb-5">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Perfil de Administrador del Sistema</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Información de tu cuenta de plataforma.</p>
                </div>
                <div className={`${cardCls} p-6 max-w-4xl`}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-extrabold text-2xl">
                            {perfil.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{perfil.nombre}</h2>
                            <p className="text-slate-400">{perfil.email}</p>
                            <span className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300"><span className="w-1.5 h-1.5 rounded-full bg-violet-500" />SUPER ADMIN</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Rol</h3><p className="font-semibold text-slate-800 dark:text-slate-100">{perfil.rol}</p></div>
                        <div><h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Estado</h3><p className="font-semibold text-emerald-600">{perfil.estado}</p></div>
                        <div><h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Fecha Creación</h3><p className="font-semibold text-slate-800 dark:text-slate-100">{vm.formatearFecha(perfil.fechaCreacion)}</p></div>
                    </div>
                </div>
            </div>
        );
    }

    const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div className="pb-3 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">{label}</label>
            {children}
        </div>
    );

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Cuenta</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Mi Perfil</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                <div>
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Mi Perfil</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Información de tu cuenta y empresa</p>
                </div>
            </div>

            {/* Pestañas Perfil / Configuración */}
            <div className="flex items-center gap-1 mb-4 p-1 rounded-2xl bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 w-fit shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                {([
                    { key: 'perfil', label: 'Perfil', icon: 'solar:user-circle-bold-duotone' },
                    { key: 'configuracion', label: 'Configuración', icon: 'solar:settings-bold-duotone' },
                ] as const).map(t => (
                    <button
                        key={t.key}
                        type="button"
                        onClick={() => goTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === t.key ? 'text-white' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'}`}
                        style={activeTab === t.key ? { background: ACCENT } : undefined}
                    >
                        <Icon icon={t.icon} width={16} /> {t.label}
                    </button>
                ))}
            </div>

            <div className="space-y-4">
                {/* Cabecera de perfil */}
                <div className={`${cardCls} p-5 ${perfilTab}`}>
                    <div className="flex items-center gap-5">
                        <div className={`w-24 h-24 rounded-2xl p-1 border-2 ${theme.border} bg-white dark:bg-slate-800`}>
                            <div className="w-full h-full bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden relative group cursor-pointer">
                                {perfil.empresa.logo ? <img src={perfil.empresa.logo} alt="Logo empresa" className="w-full h-full object-cover" /> : <Icon icon="solar:user-circle-bold-duotone" className={`w-14 h-14 ${theme.icon}`} />}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => document.getElementById('logoInput')?.click()}><Icon icon="solar:camera-add-bold" className="text-white w-8 h-8" /></div>
                                <input type="file" id="logoInput" className="hidden" accept="image/*" onChange={vm.handleLogoChange} />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight truncate">{perfil.nombre}</h2>
                            <p className="text-slate-400 font-medium">{perfil.email}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${theme.bg} ${theme.textDark} uppercase tracking-wide`}>{perfil.rol.replace('ADMIN_', '').replace('USUARIO_', '').replace('_', ' ')}</span>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${vm.obtenerColorEstado()}`}>{vm.obtenerEstadoSuscripcion()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cambiar contraseña — visible para todos los roles */}
                <div className={`${cardCls} p-5 ${perfilTab}`}>
                    <SectionHeader icon="solar:lock-password-bold-duotone" title="Cambiar Contraseña" chip="bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Contraseña actual</label>
                            <div className="relative">
                                <input
                                    type={showActual ? 'text' : 'password'}
                                    value={passwordForm.actual}
                                    onChange={e => setPasswordForm(p => ({ ...p, actual: e.target.value }))}
                                    placeholder="••••••••"
                                    className={`w-full rounded-xl border-2 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 pr-10 outline-none transition-colors ${passwordErrors.actual ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-[var(--accent)]'}`}
                                />
                                <button type="button" onClick={() => setShowActual(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <Icon icon={showActual ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                                </button>
                            </div>
                            {passwordErrors.actual && <p className="text-xs text-rose-500">{passwordErrors.actual}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Nueva contraseña</label>
                            <div className="relative">
                                <input
                                    type={showNueva ? 'text' : 'password'}
                                    value={passwordForm.nueva}
                                    onChange={e => setPasswordForm(p => ({ ...p, nueva: e.target.value }))}
                                    placeholder="Mínimo 6 caracteres"
                                    className={`w-full rounded-xl border-2 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 pr-10 outline-none transition-colors ${passwordErrors.nueva ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-[var(--accent)]'}`}
                                />
                                <button type="button" onClick={() => setShowNueva(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    <Icon icon={showNueva ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                                </button>
                            </div>
                            {passwordErrors.nueva && <p className="text-xs text-rose-500">{passwordErrors.nueva}</p>}
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block">Confirmar contraseña</label>
                            <input
                                type="password"
                                value={passwordForm.confirmar}
                                onChange={e => setPasswordForm(p => ({ ...p, confirmar: e.target.value }))}
                                placeholder="Repite la nueva contraseña"
                                className={`w-full rounded-xl border-2 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none transition-colors ${passwordErrors.confirmar ? 'border-rose-300 focus:border-rose-400' : 'border-slate-200 dark:border-slate-700 focus:border-[var(--accent)]'}`}
                            />
                            {passwordErrors.confirmar && <p className="text-xs text-rose-500">{passwordErrors.confirmar}</p>}
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={handleChangePassword}
                            disabled={savingPassword}
                            className={primaryBtn}
                            style={{ background: ACCENT }}
                        >
                            {savingPassword ? <><Icon icon="solar:refresh-bold" className="animate-spin" width={16} />Guardando...</> : <><Icon icon="solar:lock-bold" width={16} />Actualizar contraseña</>}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className={`${cardCls} p-5 lg:order-1 ${perfilTab}`}>
                        <SectionHeader icon="solar:user-id-bold-duotone" title="Información Personal" />
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Nombre completo</label>
                                <input
                                    type="text"
                                    value={vm.personalForm.nombre}
                                    onChange={e => vm.updatePersonalField('nombre', e.target.value)}
                                    placeholder="Tu nombre y apellidos"
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                                    Email
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 normal-case"><Icon icon="solar:lock-keyhole-minimalistic-bold" width={12} /> No editable</span>
                                </label>
                                <input
                                    type="email"
                                    value={perfil.email}
                                    disabled
                                    className="w-full rounded-xl border-2 px-3 py-2.5 text-sm outline-none border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Celular</label>
                                    <input
                                        type="tel"
                                        value={vm.personalForm.celular}
                                        onChange={e => vm.updatePersonalField('celular', e.target.value)}
                                        placeholder="Ej: 987654321"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wide block mb-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={vm.personalForm.telefono}
                                        onChange={e => vm.updatePersonalField('telefono', e.target.value)}
                                        placeholder="Ej: 044-123456"
                                        className={inputCls}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                                    <Icon icon="solar:global-bold" width={13} /> Página web
                                </label>
                                <input
                                    type="text"
                                    value={vm.personalForm.paginaWeb}
                                    onChange={e => vm.updatePersonalField('paginaWeb', e.target.value)}
                                    placeholder="Ej: www.miempresa.com"
                                    className={inputCls}
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Aparecerá en tus comprobantes y cotizaciones de todos los formatos.</p>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                                <Field label="Estado"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${perfil.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300'}`}><span className={`w-1.5 h-1.5 rounded-full ${perfil.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-rose-500'}`} />{perfil.estado}</span></Field>
                                <button
                                    type="button"
                                    onClick={vm.handleSavePersonal}
                                    disabled={!vm.personalDirty || vm.savingPersonal}
                                    className={primaryBtn}
                                    style={{ background: ACCENT }}
                                >
                                    <Icon icon={vm.savingPersonal ? 'solar:refresh-bold' : 'solar:diskette-bold'} className={vm.savingPersonal ? 'animate-spin' : ''} width={16} />
                                    {vm.savingPersonal ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* ── Envío automático por WhatsApp — DESACTIVADO temporalmente (a pedido) ── */}
                    {SHOW_WHATSAPP && (
                    <div className={`lg:col-span-2 lg:order-3 overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_2px_20px_rgba(15,23,42,0.05)] ${configTab}`}>
                        <div className="relative border-b border-emerald-100/70 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-5">
                            <div className="absolute right-5 top-5 hidden rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm sm:inline-flex">
                                WhatsApp Cloud API
                            </div>
                            <div className="flex items-start gap-3 pr-0 sm:pr-40">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                                    <Icon icon="mdi:whatsapp" width={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Envío automático por WhatsApp</h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Define si los comprobantes se envían con el número oficial de la plataforma o con el número propio de esta empresa.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="space-y-4">
                                <div className="grid gap-3 md:grid-cols-3">
                                    {[
                                        { value: 'PLATFORM', title: 'Plataforma', icon: 'solar:cloud-bold-duotone', description: `${BRAND.name} envía por ti.` },
                                        { value: 'EMPRESA', title: 'Propio', icon: 'solar:smartphone-bold-duotone', description: 'Usa el número de Meta de la empresa.' },
                                        { value: 'DISABLED', title: 'Desactivado', icon: 'solar:close-circle-bold-duotone', description: 'Bloquea envíos automáticos.' },
                                    ].map(option => {
                                        const selected = whatsAppForm.provider === option.value;
                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => vm.setWhatsAppProvider(option.value as 'PLATFORM' | 'EMPRESA' | 'DISABLED')}
                                                className={`rounded-2xl border p-4 text-left transition-all ${
                                                    selected
                                                        ? 'border-emerald-400 bg-emerald-50 shadow-sm shadow-emerald-500/10'
                                                        : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${selected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                        <Icon icon={option.icon} width={19} />
                                                    </span>
                                                    {selected && <Icon icon="solar:check-circle-bold" className="text-emerald-500" width={20} />}
                                                </div>
                                                <p className="mt-3 text-sm font-bold text-slate-800 dark:text-white">{option.title}</p>
                                                <p className="mt-1 text-xs leading-5 text-slate-500">{option.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>

                                {whatsAppForm.provider === 'EMPRESA' && (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">Credenciales propias de Meta</p>
                                                <p className="text-xs text-slate-500">El token no se muestra por seguridad. Si escribes uno nuevo, se reemplaza.</p>
                                            </div>
                                            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${perfil.empresa.whatsappApiTokenConfigured ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                                                {perfil.empresa.whatsappApiTokenConfigured ? 'Token configurado' : 'Sin token'}
                                            </span>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <label className="space-y-1.5">
                                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Phone Number ID *</span>
                                                <input
                                                    value={whatsAppForm.phoneNumberId}
                                                    onChange={e => vm.updateWhatsAppField('phoneNumberId', e.target.value)}
                                                    placeholder="Ej. 123456789012345"
                                                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none transition focus:border-emerald-400"
                                                />
                                            </label>
                                            <label className="space-y-1.5">
                                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">WhatsApp Business Account ID</span>
                                                <input
                                                    value={whatsAppForm.businessId}
                                                    onChange={e => vm.updateWhatsAppField('businessId', e.target.value)}
                                                    placeholder="Opcional, pero recomendado"
                                                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none transition focus:border-emerald-400"
                                                />
                                            </label>
                                            <label className="space-y-1.5 md:col-span-2">
                                                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Permanent Access Token</span>
                                                <input
                                                    value={whatsAppForm.apiToken}
                                                    onChange={e => vm.updateWhatsAppField('apiToken', e.target.value)}
                                                    type="password"
                                                    autoComplete="new-password"
                                                    placeholder={perfil.empresa.whatsappApiTokenConfigured ? 'Dejar vacío para conservar el token actual' : 'Pega aquí el token permanente de Meta'}
                                                    className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none transition focus:border-emerald-400"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-xs leading-5 text-slate-500">
                                        Estado actual: <span className="font-bold text-slate-800 dark:text-white">{whatsAppForm.provider === 'DISABLED' ? 'Desactivado' : whatsAppForm.provider === 'EMPRESA' ? 'Número propio' : 'Número de plataforma'}</span>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!whatsappConfigDirty || savingWhatsAppConfig}
                                        onClick={vm.handleWhatsAppConfigSave}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/15 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                                    >
                                        <Icon icon={savingWhatsAppConfig ? 'svg-spinners:180-ring' : 'solar:diskette-bold'} width={18} />
                                        {savingWhatsAppConfig ? 'Guardando...' : 'Guardar WhatsApp'}
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                                <p className="flex items-center gap-2 text-sm font-bold text-sky-900">
                                    <Icon icon="solar:info-circle-bold-duotone" width={19} />
                                    Qué necesitas de Meta
                                </p>
                                <div className="mt-4 space-y-3 text-sm leading-6 text-sky-900/80">
                                    <p><span className="font-black">1.</span> Crear o entrar a una app en Meta for Developers.</p>
                                    <p><span className="font-black">2.</span> Agregar el producto WhatsApp y vincular un número.</p>
                                    <p><span className="font-black">3.</span> Copiar el <span className="font-bold">Phone Number ID</span>.</p>
                                    <p><span className="font-black">4.</span> Crear un <span className="font-bold">System User</span> y generar un token permanente con permisos de WhatsApp.</p>
                                </div>
                                <div className="mt-4 rounded-xl border border-sky-200 bg-white/70 p-3 text-xs leading-5 text-sky-900">
                                    Para empresas normales puedes dejar “Plataforma”. Para reseller white-label o corporativo con su propio número, usa “Propio”.
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    {/* ── Conexión Shalom Pro (courier) — solo planes Negocio / Corporativo ── */}
                    {puedeShalom && (
                    <div className={`lg:col-span-2 lg:order-3 overflow-hidden rounded-3xl border border-rose-100 dark:border-rose-900/40 bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none ${configTab}`}>
                        <div className="relative border-b border-rose-100/70 dark:border-rose-900/40 bg-gradient-to-br from-rose-50 via-white to-orange-50 dark:from-rose-900/20 dark:via-[#111827] dark:to-orange-900/10 p-5">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20">
                                    <Icon icon="solar:delivery-bold-duotone" width={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Conexión con Shalom (Courier)</h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Conecta tu cuenta de <strong>Shalom Pro</strong> (pro.shalom.pe) para consultar el tracking y generar guías de tus envíos. Es la misma cuenta con la que gestionas tus envíos en Shalom.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Estado</span>
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${perfil.empresa.shalomConfigured ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                                    {perfil.empresa.shalomConfigured ? 'Cuenta conectada' : 'Sin conectar'}
                                </span>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="space-y-1.5">
                                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Correo de Shalom Pro</span>
                                    <input
                                        value={vm.shalomForm.email}
                                        onChange={e => vm.updateShalomField('email', e.target.value)}
                                        placeholder="tu-correo@ejemplo.com"
                                        autoComplete="off"
                                        className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none transition focus:border-rose-400"
                                    />
                                </label>
                                <label className="space-y-1.5">
                                    <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Contraseña de Shalom Pro</span>
                                    <input
                                        value={vm.shalomForm.password}
                                        onChange={e => vm.updateShalomField('password', e.target.value)}
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder={perfil.empresa.shalomConfigured ? 'Dejar vacío para conservar la actual' : 'Tu contraseña de Shalom'}
                                        className="w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200 outline-none transition focus:border-rose-400"
                                    />
                                </label>
                            </div>
                            <div className="flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs leading-5 text-slate-500">
                                    Tu contraseña se guarda cifrada y solo se usa para autenticar tus operaciones con Shalom.
                                </p>
                                <button
                                    type="button"
                                    disabled={!vm.shalomConfigDirty || vm.savingShalomConfig}
                                    onClick={vm.handleShalomConfigSave}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/15 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                                >
                                    <Icon icon={vm.savingShalomConfig ? 'svg-spinners:180-ring' : 'solar:diskette-bold'} width={18} />
                                    {vm.savingShalomConfig ? 'Guardando...' : 'Guardar conexión'}
                                </button>
                            </div>
                        </div>
                    </div>
                    )}
                    <div className={`${cardCls} p-5 lg:order-2 ${perfilTab}`}>
                        <SectionHeader icon="solar:buildings-bold-duotone" title="Información de la Empresa" chip="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300" />
                        <div className="space-y-4">
                            <Field label="Razón Social"><p className="text-slate-700 dark:text-slate-200 font-semibold text-sm">{perfil.empresa.razonSocial}</p></Field>
                            <Field label="Nombre Comercial"><p className="text-slate-700 dark:text-slate-200 font-semibold text-sm">{perfil.empresa.nombreComercial}</p></Field>
                            <Field label="RUC"><p className="text-slate-700 dark:text-slate-200 font-semibold text-sm">{perfil.empresa.ruc}</p></Field>
                            <Field label="Dirección"><p className="text-slate-700 dark:text-slate-200 font-semibold text-sm">{perfil.empresa.direccion}</p></Field>
                            <Field label="Tipo de Empresa"><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${perfil.empresa.tipoEmpresa === 'FORMAL' ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/20 dark:text-sky-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{perfil.empresa.tipoEmpresa === 'FORMAL' ? 'Formal' : 'Informal'}</span></Field>
                            <Field label="Rubro"><p className="text-slate-700 dark:text-slate-200 font-semibold text-sm">{perfil.empresa.rubro.nombre}</p></Field>
                            {perfil.empresa.ubicacion && <Field label="Ubicación"><p className="text-slate-700 dark:text-slate-200 font-semibold text-sm">{perfil.empresa.ubicacion.distrito}, {perfil.empresa.ubicacion.provincia}, {perfil.empresa.ubicacion.departamento}</p></Field>}
                        </div>
                    </div>
                    {/* Ajustes del negocio (antes dentro de "Información de la Empresa") */}
                    <div className={`${cardCls} p-5 lg:order-2 ${configTab}`}>
                        <SectionHeader icon="solar:settings-bold-duotone" title="Configuración del Negocio" chip="bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300" />
                        <div className="space-y-4">
                            <div>
                                <label className="flex items-start gap-3 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-900/10 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(perfil.empresa.usaCodigoBarrasManual)}
                                        disabled={savingBarcodeConfig}
                                        onChange={(e) => vm.handleBarcodeToggle(e.target.checked)}
                                        className="mt-1 w-4 h-4 accent-blue-600 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Habilitar código de barras en productos</p>
                                        <p className="text-xs text-slate-500 mt-1">Muestra el campo "Código de Barras" en el formulario de productos, incluso si el rubro no lo activa automáticamente.</p>
                                        {savingBarcodeConfig && <p className="text-xs text-blue-600 mt-1">Guardando configuración...</p>}
                                    </div>
                                </label>
                                <label className={`mt-3 flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                                    fefoPermitidoPorPlan
                                        ? 'border-violet-100 dark:border-violet-900/40 bg-violet-50/40 dark:bg-violet-900/10 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/20'
                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 opacity-70 cursor-not-allowed'
                                }`}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(perfil.empresa.usarPrecioLoteFefo)}
                                        disabled={savingFefoPriceConfig || !fefoPermitidoPorPlan}
                                        onChange={(e) => vm.handleFefoPriceToggle(e.target.checked)}
                                        className="mt-1 w-4 h-4 accent-violet-600 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Usar precio por lote FEFO en facturación</p>
                                        <p className="text-xs text-slate-500 mt-1">Cuando esté activo, el precio sugerido al agregar productos en comprobantes se tomará del costo del lote FEFO activo.</p>
                                        {!fefoPermitidoPorPlan && (
                                            <p className="text-xs text-orange-600 mt-1">Disponible solo si la característica de lotes está activa en el plan.</p>
                                        )}
                                        {savingFefoPriceConfig && <p className="text-xs text-violet-600 mt-1">Guardando configuración...</p>}
                                    </div>
                                </label>
                                <label className="mt-3 flex items-start gap-3 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-900/10 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(perfil.empresa.permitirVentaSinStock)}
                                        disabled={savingVentaSinStockConfig}
                                        onChange={(e) => vm.handleVentaSinStockToggle(e.target.checked)}
                                        className="mt-1 w-4 h-4 accent-amber-600 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Permitir vender sin stock (sobreventa)</p>
                                        <p className="text-xs text-slate-500 mt-1">Cuando esté activo, podrás emitir comprobantes aunque el producto tenga stock 0 o insuficiente. La salida se registra igual y el inventario puede quedar en 0. Úsalo con cuidado.</p>
                                        {savingVentaSinStockConfig && <p className="text-xs text-amber-600 mt-1">Guardando configuración...</p>}
                                    </div>
                                </label>
                                <label className="mt-3 flex items-start gap-3 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-900/10 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(perfil.empresa.cobranzaCampo)}
                                        disabled={vm.savingCobranzaCampoConfig}
                                        onChange={(e) => vm.handleCobranzaCampoToggle(e.target.checked)}
                                        className="mt-1 w-4 h-4 text-emerald-600 dark:text-emerald-500 rounded border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-emerald-500"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Cobranza con vendedores de campo</p>
                                        <p className="text-xs text-slate-500 mt-1">Actívalo solo si tu negocio cobra a través de vendedores en el campo. Al registrar un pago, la encargada deberá indicar qué vendedor de campo envió el comprobante, a quién se dirigió el pago (administrador/empresa/vendedor) y podrá adjuntar la imagen del comprobante.</p>
                                        {vm.savingCobranzaCampoConfig && <p className="text-xs text-emerald-600 mt-1">Guardando configuración...</p>}
                                    </div>
                                </label>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                        <Icon icon="solar:document-text-bold-duotone" width={14} />
                                        Formato de Cotización
                                    </p>
                                    <p className="text-xs text-slate-500">Ahora se configura desde <span className="font-semibold text-slate-700">Cotizaciones → Configurar formato</span>, con vista previa en vivo (mostrar/ocultar y tamaño de cada elemento).</p>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                        <Icon icon="solar:printer-bold-duotone" width={14} />
                                        Tamaño del Logo en Comprobantes
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <select
                                            disabled={vm.savingTicketLogoSize}
                                            value={perfil.empresa.ticketLogoSize ?? 96}
                                            onChange={(e) => vm.handleTicketLogoSizeChange(Number(e.target.value))}
                                            className="px-3 py-2 text-sm rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)]"
                                        >
                                            <option value={64}>Extra Pequeño (64px)</option>
                                            <option value={96}>Pequeño (96px)</option>
                                            <option value={128}>Normal (128px)</option>
                                            <option value={160}>Grande (160px)</option>
                                            <option value={192}>Extra Grande (192px)</option>
                                            <option value={256}>Enorme (256px)</option>
                                            <option value={320}>Gigante (320px)</option>
                                            <option value={384}>Máximo Ancho (384px)</option>
                                        </select>
                                        {vm.savingTicketLogoSize && <span className="text-xs text-blue-600">Guardando...</span>}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Ajusta el tamaño con el que se imprime tu logo en todos los formatos: ticket 80mm, A4, A5, cotizaciones y guías de remisión.</p>
                                </div>
                                {usaLotesFarmaciaRubro(perfil.empresa.rubro?.nombre) && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                            <Icon icon="solar:medical-kit-bold-duotone" width={14} />
                                            Director Técnico Q.F. (Libro Control DIGEMID)
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 px-3 py-2 text-sm rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-violet-500"
                                                placeholder="Q.F. Nombre Apellido — CQP 12345"
                                                value={directorInput ?? (perfil.empresa.directorTecnico ?? '')}
                                                onChange={e => setDirectorInput(e.target.value)}
                                            />
                                            <button
                                                disabled={savingDirectorTecnico || directorInput === null}
                                                onClick={() => vm.handleDirectorTecnicoSave(directorInput ?? '', () => setDirectorInput(null))}
                                                className="px-3 py-2 btn-accent disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold rounded-xl transition-colors"
                                            >
                                                {savingDirectorTecnico ? '...' : 'Guardar'}
                                            </button>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">Aparece en el Libro de Control de Psicotrópicos — DS 023-2001-SA</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Uso de Comprobantes + Plan Actual en una sola caja, al lado de Configuración del Negocio */}
                    <div className={`${cardCls} p-5 lg:order-2 ${configTab}`}>
                        {/* Kaiser mono-empresa: sin "Uso de Comprobantes SUNAT" ni "Plan Actual" (conceptos SaaS). */}
                        <SectionHeader icon="solar:server-2-bold-duotone" title="Facturación electrónica (SUNAT)" chip="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300" />
                        <ConfiguracionQpse />
                    </div>
                    {/* Cuentas Bancarias */}
                    <div className={`${cardCls} p-5 lg:order-6 ${configTab}`}>
                        <CuentasBancariasConfig />
                    </div>
                </div>
            </div>
        </div>
    );
}
