import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useResellerPanelStore } from '@/zustand/reseller-panel';
import Modal from '@/components/Modal';
import ModalConfirm from '@/components/ModalConfirm';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import Select from '@/components/Select';

interface Props {
    resellerId: number;
    clienteId: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function ClienteDetalleModal({ resellerId, clienteId, isOpen, onClose }: Props) {
    const { getClienteDetalle, toggleEstadoCliente, updateClienteConfig, aprovisionarQpse, pasarProduccionCliente } = useResellerPanelStore();
    const [cliente, setCliente] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'config'>('info');
    // Plan de facturación QPSE por defecto (la afiliación es a nivel Vendify).
    const qpsePlanType: '01' | '02' = '01';
    const [confirm, setConfirm] = useState<null | {
        title: string;
        information: string;
        children?: React.ReactNode;
        confirmText: string;
        confirmColor?: string;
        onConfirm: () => Promise<void> | void;
    }>(null);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const runConfirm = async () => {
        if (!confirm) return;
        setConfirmLoading(true);
        try { await confirm.onConfirm(); } finally { setConfirmLoading(false); setConfirm(null); }
    };
    const [configForm, setConfigForm] = useState<any>({
        billingProvider: 'QPSE',
        providerId: '',
        providerToken: '',
        usuarioPse: '',
        contrasenaPse: '',
        billingApiBaseUrl: '',
        billingApiDemoBaseUrl: '',
        billingApiToken: '',
        billingApiUser: '',
        billingApiPassword: '',
        usaDemo: true,
        adminNombre: '',
        adminEmail: '',
        adminCelular: '',
        adminPassword: '',
    });

    useEffect(() => {
        if (isOpen && clienteId) {
            setLoading(true);
            setActiveTab('info');
            getClienteDetalle(resellerId, clienteId).then((data) => {
                setCliente(data);
                setConfigForm({
                    billingProvider: data?.billingProvider || 'QPSE',
                    providerId: data?.providerId || '',
                    providerToken: data?.providerToken || '',
                    usuarioPse: data?.usuarioPse || '',
                    contrasenaPse: data?.contrasenaPse || '',
                    billingApiBaseUrl: data?.billingApiBaseUrl || '',
                    billingApiDemoBaseUrl: data?.billingApiDemoBaseUrl || '',
                    billingApiToken: data?.billingApiToken || '',
                    billingApiUser: data?.billingApiUser || '',
                    billingApiPassword: data?.billingApiPassword || '',
                    usaDemo: Boolean(data?.usaDemo),
                    adminNombre: data?.usuarios?.[0]?.nombre || '',
                    adminEmail: data?.usuarios?.[0]?.email || '',
                    adminCelular: data?.usuarios?.[0]?.celular || '',
                    adminPassword: '',
                });
                setLoading(false);
            });
        }
    }, [isOpen, clienteId]);

    const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setConfigForm((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSaveConfig = async () => {
        setSaving(true);
        const payload = { ...configForm };
        if (!payload.adminPassword) delete payload.adminPassword;
        const result = await updateClienteConfig(resellerId, clienteId, payload);
        if (result.success) {
            const updated = await getClienteDetalle(resellerId, clienteId);
            setCliente(updated);
        }
        setSaving(false);
    };

    const doToggleEstado = async (nuevoEstado: 'ACTIVO' | 'INACTIVO') => {
        const result = await toggleEstadoCliente(resellerId, clienteId, nuevoEstado);
        if (result.success && cliente) setCliente({ ...cliente, estado: nuevoEstado });
    };
    const handleToggleEstado = () => {
        if (!cliente) return;
        const nuevoEstado = cliente.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
        setConfirm({
            title: nuevoEstado === 'ACTIVO' ? 'Activar cliente' : 'Suspender cliente',
            information: `¿Seguro que quieres ${nuevoEstado === 'ACTIVO' ? 'activar' : 'suspender'} a este cliente?`,
            confirmText: nuevoEstado === 'ACTIVO' ? 'Activar' : 'Suspender',
            confirmColor: nuevoEstado === 'ACTIVO' ? 'success' : 'danger',
            onConfirm: () => doToggleEstado(nuevoEstado),
        });
    };

    const doAprovisionar = async (forzar: boolean) => {
        const result = await aprovisionarQpse(resellerId, clienteId, forzar);
        if (result.success) {
            const updated = await getClienteDetalle(resellerId, clienteId);
            setCliente(updated);
            setConfigForm((prev: any) => ({ ...prev, usuarioPse: updated?.usuarioPse || '', contrasenaPse: updated?.contrasenaPse || '', usaDemo: Boolean(updated?.usaDemo) }));
        }
    };
    const handleAprovisionarQpse = (forzar = false) => {
        if (!forzar) { void doAprovisionar(false); return; }
        setConfirm({
            title: 'Regenerar credenciales QPSE',
            information: 'Esto generará NUEVAS credenciales QPSE y reemplazará las actuales del cliente.',
            confirmText: 'Regenerar',
            confirmColor: 'danger',
            onConfirm: () => doAprovisionar(true),
        });
    };

    const doPasarProduccion = async () => {
        const result = await pasarProduccionCliente(resellerId, clienteId, qpsePlanType);
        if (result.success) {
            const updated = await getClienteDetalle(resellerId, clienteId);
            setCliente(updated);
            setConfigForm((prev: any) => ({ ...prev, usaDemo: Boolean(updated?.usaDemo) }));
        }
    };
    const handlePasarProduccion = () => {
        setConfirm({
            title: 'Pasar a producción',
            information: 'Vas a pasar este cliente a PRODUCCIÓN para que emita comprobantes reales ante SUNAT.',
            children: (
                <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex gap-2"><Icon icon="solar:wallet-money-bold-duotone" className="mt-0.5 shrink-0 text-slate-400" width="16" /> Se descuenta la activación de tu saldo (según el plan del cliente).</li>
                    <li className="flex gap-2"><Icon icon="solar:shield-check-bold-duotone" className="mt-0.5 shrink-0 text-emerald-500" width="16" /> El costo por comprobante lo cubre Vendify.</li>
                    <li className="flex gap-2"><Icon icon="solar:danger-triangle-bold-duotone" className="mt-0.5 shrink-0 text-amber-500" width="16" /> Es irreversible: no se puede volver a modo prueba.</li>
                </ul>
            ),
            confirmText: 'Pasar a producción',
            confirmColor: 'success',
            onConfirm: doPasarProduccion,
        });
    };

    const tieneQpse = Boolean(configForm.usuarioPse && configForm.contrasenaPse);
    const esProduccion = tieneQpse && configForm.usaDemo === false;
    const isActive = cliente?.estado === 'ACTIVO';

    return (
        <>
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title={loading ? 'Cargando...' : (cliente?.nombreComercial || 'Detalles del Cliente')}
            icon="solar:buildings-bold-duotone"
            iconClass="bg-[#7551FF]/10 text-[#7551FF]"
            width="680px"
            height="auto"
        >
            {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                    <Icon icon="svg-spinners:3-dots-fade" width="40" className="text-[#7551FF]" />
                    <p className="text-sm">Cargando información...</p>
                </div>
            ) : !cliente ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                    <Icon icon="solar:buildings-linear" width="40" className="opacity-40" />
                    <p className="text-sm">No se encontró información del cliente.</p>
                </div>
            ) : (
                <>
                    {/* Tab bar */}
                    <div className="flex gap-1 border-b border-slate-100 px-4 dark:border-slate-800">
                        {([
                            { id: 'info', label: 'Información', icon: 'solar:info-circle-bold-duotone' },
                            { id: 'config', label: 'Configuración', icon: 'solar:settings-bold-duotone' },
                        ] as const).map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id)}
                                className={`relative flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wide transition-colors ${activeTab === t.id ? 'text-[#7551FF]' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            >
                                <Icon icon={t.icon} width="15" />{t.label}
                                {activeTab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#7551FF]" />}
                            </button>
                        ))}
                    </div>

                    {/* Info tab */}
                    {activeTab === 'info' && (
                        <div className="grid items-stretch gap-4 p-5 md:grid-cols-2">
                            {/* Company card */}
                            <div className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Empresa</p>
                                <div className="flex items-center gap-3">
                                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#7551FF] to-[#9f7bff] text-lg font-black uppercase text-white shadow-md shadow-[#7551FF]/25">
                                        {cliente.nombreComercial?.charAt(0) || 'E'}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold leading-tight text-slate-800 line-clamp-2 dark:text-white">{cliente.nombreComercial}</p>
                                        <p className="mt-0.5 font-mono text-xs text-slate-400">{cliente.ruc}</p>
                                    </div>
                                </div>

                                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                                    <div className="mb-3">
                                        <p className="text-[11px] font-medium text-slate-400">Razón Social</p>
                                        <p className="mt-0.5 text-[13px] font-semibold leading-snug text-slate-700 dark:text-slate-200">{cliente.razonSocial}</p>
                                    </div>
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400">Plan</span>
                                            <span className="rounded-md bg-[#7551FF]/10 px-2 py-0.5 text-[11px] font-bold text-[#7551FF]">{cliente.plan?.nombre || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400">Estado</span>
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${isActive ? 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-400' : 'border-red-100 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                {cliente.estado}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400">Facturación</span>
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{configForm.billingProvider}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Admin access card */}
                            <div className="flex flex-col">
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Acceso Administrativo</p>
                                {cliente.usuarios?.length > 0 ? (
                                    <div className="flex flex-1 flex-col rounded-2xl border border-[#7551FF]/15 bg-[#7551FF]/[0.05] p-4 dark:border-[#7551FF]/25 dark:bg-[#7551FF]/10">
                                        <div className="flex items-center gap-2.5">
                                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-[#7551FF] shadow-sm ring-1 ring-[#7551FF]/15 dark:bg-slate-900">
                                                <Icon icon="solar:user-id-bold-duotone" width="18" />
                                            </div>
                                            <span className="text-sm font-bold text-[#7551FF] dark:text-violet-300">Usuario Principal</span>
                                        </div>
                                        <div className="mt-4 space-y-3">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7551FF]/60">Email de Acceso</p>
                                                <p className="mt-0.5 select-all break-all text-sm font-semibold text-slate-800 dark:text-white">{cliente.usuarios[0].email}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7551FF]/60">Celular</p>
                                                <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-white">{cliente.usuarios[0].celular || '—'}</p>
                                            </div>
                                        </div>
                                        <p className="mt-auto border-t border-[#7551FF]/10 pt-3 text-[10px] leading-snug text-slate-400">
                                            Si el cliente olvidó su contraseña, deberá usar "Recuperar Contraseña" desde el login.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-1 items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40">
                                        <Icon icon="solar:user-minus-linear" width="18" />
                                        Sin usuario administrador vinculado.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Config tab */}
                    {activeTab === 'config' && (
                        <div className="space-y-4 p-5">
                            {/* Billing section */}
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                                <div className="mb-4 flex items-center gap-2.5">
                                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#7551FF]/10 text-[#7551FF]">
                                        <Icon icon="solar:bill-list-bold-duotone" width="16" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">Integración de Facturación</p>
                                        <p className="text-[11px] text-slate-400">Proveedor y credenciales SUNAT del cliente.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <Select
                                            label="Proveedor"
                                            name="billingProvider"
                                            value={configForm.billingProvider === 'JAMBLE' ? 'JAMBLE (API propia)' : configForm.billingProvider}
                                            options={[
                                                { id: 'QPSE', value: 'QPSE' },
                                                { id: 'APISUNAT', value: 'APISUNAT' },
                                                { id: 'JAMBLE', value: 'JAMBLE (API propia)' },
                                            ]}
                                            onChange={(id: any) => setConfigForm((prev: any) => ({ ...prev, billingProvider: id }))}
                                            error={null}
                                            readOnly={true}
                                        />
                                    </div>

                                    {configForm.billingProvider === 'QPSE' && (
                                        <div className="col-span-2 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tieneQpse ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                                                        <Icon icon={tieneQpse ? 'solar:shield-check-bold-duotone' : 'solar:shield-warning-bold-duotone'} width="22" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-100">
                                                            {tieneQpse ? 'Credenciales QPSE configuradas' : 'Credenciales QPSE pendientes'}
                                                        </p>
                                                        <p className="text-xs text-slate-400">
                                                            {tieneQpse
                                                                ? `Usuario: ${configForm.usuarioPse}`
                                                                : 'La plataforma aún no ha generado el usuario/clave QPSE de este cliente.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2">
                                                {!tieneQpse ? (
                                                    <button type="button" onClick={() => handleAprovisionarQpse(false)} className="inline-flex items-center gap-1.5 rounded-xl btn-accent px-3.5 py-2 text-xs font-bold transition-all">
                                                        <Icon icon="solar:magic-stick-3-bold-duotone" width="16" />
                                                        Generar credenciales QPSE
                                                    </button>
                                                ) : (
                                                    <button type="button" onClick={() => handleAprovisionarQpse(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                                        <Icon icon="solar:refresh-bold-duotone" width="16" />
                                                        Regenerar
                                                    </button>
                                                )}
                                            </div>
                                            <p className="mt-2 text-[11px] leading-snug text-slate-400">
                                                Vendify gestiona la facturación QPSE de este cliente. Las credenciales se generan automáticamente desde el RUC (consulta SUNAT); no es necesario ingresarlas a mano.
                                            </p>

                                            {tieneQpse && (esProduccion ? (
                                                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
                                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white">
                                                        <Icon icon="solar:check-circle-bold" width="22" />
                                                    </span>
                                                    <div>
                                                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">Cliente en Producción</p>
                                                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">Ya emite comprobantes reales y válidos ante SUNAT.</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                                                    <div className="flex items-center gap-2.5">
                                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400 text-white">
                                                            <Icon icon="solar:test-tube-bold-duotone" width="18" />
                                                        </span>
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Este cliente está en modo prueba</p>
                                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Los comprobantes que emita <b>no son válidos</b> ante SUNAT. Pásalo a producción para que emita comprobantes reales.</p>
                                                        </div>
                                                    </div>

                                                    <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                                        Al pasar a producción se <b>descuenta la activación de tu saldo</b> (según el plan del cliente). El costo por comprobante lo cubre Vendify. Es <b>irreversible</b> (no se puede volver a modo prueba).
                                                    </p>

                                                    <button type="button" onClick={handlePasarProduccion} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition-all">
                                                        <Icon icon="solar:rocket-2-bold-duotone" width="18" />
                                                        Pasar a producción
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {configForm.billingProvider === 'APISUNAT' && (
                                        <>
                                            <InputPro isLabel label="Persona ID" name="providerId" value={configForm.providerId} onChange={handleConfigChange as any} placeholder="personaId" />
                                            <InputPro isLabel label="Persona Token" name="providerToken" value={configForm.providerToken} onChange={handleConfigChange as any} placeholder="token" />
                                        </>
                                    )}

                                    {configForm.billingProvider === 'JAMBLE' && (
                                        <>
                                            <label className="col-span-2 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                                                <span>
                                                    <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">
                                                        {configForm.usaDemo ? 'Entorno demo' : 'Entorno producción'}
                                                    </span>
                                                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                                                        {configForm.usaDemo ? 'Usará la URL API Demo para emitir pruebas.' : 'Usará la URL API Producción para emitir comprobantes reales.'}
                                                    </span>
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    checked={!configForm.usaDemo}
                                                    onChange={(event) => setConfigForm((prev: any) => ({ ...prev, usaDemo: !event.target.checked }))}
                                                    className="h-5 w-5 accent-[#7551FF]"
                                                />
                                            </label>
                                            <div className="col-span-2">
                                                <InputPro isLabel label="URL API Producción" name="billingApiBaseUrl" value={configForm.billingApiBaseUrl} onChange={handleConfigChange as any} placeholder="https://facturas.jambleperu.com" />
                                            </div>
                                            <div className="col-span-2">
                                                <InputPro isLabel label="URL API Demo" name="billingApiDemoBaseUrl" value={configForm.billingApiDemoBaseUrl} onChange={handleConfigChange as any} placeholder="https://demo-facturas.jambleperu.com" />
                                            </div>
                                            <div className="col-span-2">
                                                <InputPro isLabel label="Token API" name="billingApiToken" value={configForm.billingApiToken} onChange={handleConfigChange as any} placeholder="token (opcional)" />
                                            </div>
                                            <InputPro isLabel label="Usuario API" name="billingApiUser" value={configForm.billingApiUser} onChange={handleConfigChange as any} placeholder="usuario_api" />
                                            <InputPro isLabel label="Clave API" name="billingApiPassword" type="password" value={configForm.billingApiPassword} onChange={handleConfigChange as any} placeholder="••••••••" />
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Admin credentials section */}
                            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                                <div className="mb-4 flex items-center gap-2.5">
                                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#7551FF]/10 text-[#7551FF]">
                                        <Icon icon="solar:user-id-bold-duotone" width="16" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">Acceso del Administrador</p>
                                        <p className="text-[11px] text-slate-400">Datos y contraseña del usuario principal.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputPro isLabel label="Nombre" name="adminNombre" value={configForm.adminNombre} onChange={handleConfigChange as any} placeholder="Nombre Admin" />
                                    <InputPro isLabel label="Celular" name="adminCelular" value={configForm.adminCelular} onChange={handleConfigChange as any} placeholder="999 999 999" />
                                    <div className="col-span-2">
                                        <InputPro isLabel label="Email" name="adminEmail" type="email" value={configForm.adminEmail} onChange={handleConfigChange as any} placeholder="admin@empresa.com" />
                                    </div>
                                    <div className="col-span-2">
                                        <InputPro isLabel label="Nueva contraseña (opcional)" name="adminPassword" type="password" value={configForm.adminPassword} onChange={handleConfigChange as any} placeholder="Dejar vacío para no cambiar" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center gap-2 px-5 pb-5 border-t border-slate-100 dark:border-slate-800 pt-4">
                        <Button type="button" onClick={onClose} color="default">Cerrar</Button>
                        <div className="flex-1" />
                        {activeTab === 'config' && (
                            <Button
                                type="button"
                                onClick={handleSaveConfig}
                                disabled={saving}
                                color="primary"
                            >
                                <Icon icon={saving ? 'svg-spinners:3-dots-fade' : 'solar:diskette-bold'} width="15" className="mr-1.5" />
                                {saving ? 'Guardando...' : 'Guardar'}
                            </Button>
                        )}
                        {cliente && (
                            isActive ? (
                                <Button type="button" onClick={handleToggleEstado} color="danger" outline>
                                    <Icon icon="solar:forbidden-circle-bold" width="15" className="mr-1.5" />
                                    Suspender
                                </Button>
                            ) : (
                                <Button type="button" onClick={handleToggleEstado} color="success">
                                    <Icon icon="solar:check-circle-bold" width="15" className="mr-1.5" />
                                    Reactivar
                                </Button>
                            )
                        )}
                    </div>
                </>
            )}
        </Modal>

        <ModalConfirm
            isOpenModal={!!confirm}
            setIsOpenModal={(v) => { if (!v) setConfirm(null); }}
            confirmSubmit={runConfirm}
            title={confirm?.title || ''}
            information={confirm?.information || ''}
            confirmText={confirm?.confirmText || 'Confirmar'}
            confirmColor={confirm?.confirmColor}
            confirmLoading={confirmLoading}
        >
            {confirm?.children}
        </ModalConfirm>
        </>
    );
}
