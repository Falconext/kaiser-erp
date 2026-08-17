import { useState, useEffect, useMemo, useRef } from 'react';
import { get, patch } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import useEmpresasStore from '@/zustand/empresas';
import { useAuthStore } from '@/zustand/auth';
import React from 'react';

type WhatsAppProvider = 'PLATFORM' | 'EMPRESA' | 'DISABLED';

interface WhatsAppSettingsForm {
    provider: WhatsAppProvider;
    phoneNumberId: string;
    businessId: string;
    apiToken: string;
    activo: boolean;
}

interface PerfilData {
    id: number; nombre: string; email: string; rol: string; celular?: string; telefono?: string;
    empresaId: number; estado: string; fechaCreacion: string; fechaActualizacion: string;
    empresa: { id: number; razonSocial: string; nombreComercial: string; paginaWeb?: string | null; direccion: string; logo?: string; ruc: string; tipoEmpresa: string; fechaCreacion: string; fechaActivacion?: string; fechaExpiracion?: string; usaCodigoBarrasManual?: boolean | null; usarPrecioLoteFefo?: boolean | null; permitirVentaSinStock?: boolean | null; cobranzaCampo?: boolean | null; cotizMostrarEmail?: boolean | null; cotizMostrarCuentas?: boolean | null; cotizMostrarRazonSocial?: boolean | null; cotizMostrarDetraccion?: boolean | null; ticketLogoSize?: number | null; directorTecnico?: string | null; whatsappProvider?: WhatsAppProvider | null; whatsappPhoneNumberId?: string | null; whatsappBusinessId?: string | null; whatsappActivo?: boolean | null; whatsappApiTokenConfigured?: boolean; shalomEmail?: string | null; shalomConfigured?: boolean; rubro: { id: number; nombre: string; descripcion: string }; plan: { id: number; nombre: string; descripcion: string; costo: number; duracionDias: number; tipoFacturacion: string; esPrueba: boolean; activo: boolean; tieneGestionLotes: boolean }; departamento?: string; provincia?: string; distrito?: string; ubicacion?: { codigo: string; departamento: string; provincia: string; distrito: string } };
}

const whatsappFormFromPerfil = (perfil: PerfilData): WhatsAppSettingsForm => ({
    provider: perfil.empresa?.whatsappProvider || 'PLATFORM',
    phoneNumberId: perfil.empresa?.whatsappPhoneNumberId || '',
    businessId: perfil.empresa?.whatsappBusinessId || '',
    apiToken: '',
    activo: perfil.empresa?.whatsappActivo ?? true,
});

export const usePerfilViewModel = () => {
    const [perfil, setPerfil] = useState<PerfilData | null>(null);
    const [loading, setLoading] = useState(true);
    const [passwordForm, setPasswordForm] = useState({ actual: '', nueva: '', confirmar: '' });
    const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
    const [savingPassword, setSavingPassword] = useState(false);
    const [savingBarcodeConfig, setSavingBarcodeConfig] = useState(false);
    const [savingFefoPriceConfig, setSavingFefoPriceConfig] = useState(false);
    const [savingVentaSinStockConfig, setSavingVentaSinStockConfig] = useState(false);
    const [savingCotizConfig, setSavingCotizConfig] = useState(false);
    const [savingDirectorTecnico, setSavingDirectorTecnico] = useState(false);
    const [savingWhatsAppConfig, setSavingWhatsAppConfig] = useState(false);
    const [whatsAppForm, setWhatsAppForm] = useState<WhatsAppSettingsForm>({
        provider: 'PLATFORM',
        phoneNumberId: '',
        businessId: '',
        apiToken: '',
        activo: true,
    });
    const [savingShalomConfig, setSavingShalomConfig] = useState(false);
    const [shalomForm, setShalomForm] = useState({ email: '', password: '' });
    // Información personal editable (usuario) + página web (empresa)
    const [personalForm, setPersonalForm] = useState({ nombre: '', celular: '', telefono: '', paginaWeb: '' });
    const [savingPersonal, setSavingPersonal] = useState(false);
    const [usageStats, setUsageStats] = useState<any>(null);
    const fefoToggleInFlight = useRef(false);
    const barcodeToggleInFlight = useRef(false);
    const ventaSinStockToggleInFlight = useRef(false);
    const cobranzaCampoToggleInFlight = useRef(false);
    const [savingCobranzaCampoConfig, setSavingCobranzaCampoConfig] = useState(false);
    const { alert } = useAlertStore();

    useEffect(() => { cargarPerfil(); cargarUsageStats(); }, []);

    const cargarPerfil = async () => {
        try {
            setLoading(true);
            const response: any = await get('auth/perfil');
            if (response.code === 1) {
                setPerfil(response.data);
                setWhatsAppForm(whatsappFormFromPerfil(response.data));
                setShalomForm({ email: response.data?.empresa?.shalomEmail ?? '', password: '' });
                setPersonalForm({
                    nombre: response.data?.nombre ?? '',
                    celular: response.data?.celular ?? '',
                    telefono: response.data?.telefono ?? '',
                    paginaWeb: response.data?.empresa?.paginaWeb ?? '',
                });
            }
            else alert('Error al cargar el perfil', 'error');
        } catch { alert('Error al cargar el perfil', 'error'); }
        finally { setLoading(false); }
    };

    const handleBarcodeToggle = async (enabled: boolean) => {
        if (savingBarcodeConfig || barcodeToggleInFlight.current) return;
        if (Boolean(perfil?.empresa?.usaCodigoBarrasManual) === enabled) return;
        try {
            barcodeToggleInFlight.current = true;
            setSavingBarcodeConfig(true);
            await useEmpresasStore.getState().actualizarMiEmpresa({ usaCodigoBarrasManual: enabled });
            setPerfil(prev => {
                if (!prev) return prev;
                return { ...prev, empresa: { ...prev.empresa, usaCodigoBarrasManual: enabled } };
            });
            useAuthStore.setState(state => ({
                auth: state.auth ? { ...state.auth, empresa: { ...(state.auth as any).empresa, usaCodigoBarrasManual: enabled } } : state.auth,
            }));
            useAlertStore.getState().alert('Configuración de código de barras actualizada', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error?.response?.data?.message || error?.message || 'No se pudo actualizar la configuración', 'error');
        } finally {
            barcodeToggleInFlight.current = false;
            setSavingBarcodeConfig(false);
        }
    };

    const handleCotizToggle = async (
        campo: 'cotizMostrarEmail' | 'cotizMostrarCuentas' | 'cotizMostrarRazonSocial' | 'cotizMostrarDetraccion',
        enabled: boolean,
    ) => {
        if (savingCotizConfig) return;
        if (Boolean((perfil?.empresa as any)?.[campo] ?? true) === enabled) return;
        try {
            setSavingCotizConfig(true);
            await useEmpresasStore.getState().actualizarMiEmpresa({ [campo]: enabled } as any);
            setPerfil(prev => (prev ? { ...prev, empresa: { ...prev.empresa, [campo]: enabled } } : prev));
            // Reflejar también en el store de auth (de ahí lee la cotización el formato)
            useAuthStore.setState(state => ({
                auth: state.auth ? { ...state.auth, empresa: { ...(state.auth as any).empresa, [campo]: enabled } } : state.auth,
            }));
            useAlertStore.getState().alert('Configuración de cotización actualizada', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error?.response?.data?.message || error?.message || 'No se pudo actualizar la configuración', 'error');
        } finally {
            setSavingCotizConfig(false);
        }
    };

    const handleFefoPriceToggle = async (enabled: boolean) => {
        if (savingFefoPriceConfig || fefoToggleInFlight.current) return;
        if (Boolean(perfil?.empresa?.usarPrecioLoteFefo) === enabled) return;
        try {
            fefoToggleInFlight.current = true;
            setSavingFefoPriceConfig(true);
            await useEmpresasStore.getState().actualizarMiEmpresa({ usarPrecioLoteFefo: enabled });
            setPerfil(prev => {
                if (!prev) return prev;
                return { ...prev, empresa: { ...prev.empresa, usarPrecioLoteFefo: enabled } };
            });
            useAuthStore.setState(state => ({
                auth: state.auth ? { ...state.auth, empresa: { ...(state.auth as any).empresa, usarPrecioLoteFefo: enabled } } : state.auth,
            }));
            useAlertStore.getState().alert('Configuración de precio FEFO actualizada', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error?.response?.data?.message || error?.message || 'No se pudo actualizar la configuración FEFO', 'error');
        } finally {
            fefoToggleInFlight.current = false;
            setSavingFefoPriceConfig(false);
        }
    };

    const handleVentaSinStockToggle = async (enabled: boolean) => {
        if (savingVentaSinStockConfig || ventaSinStockToggleInFlight.current) return;
        if (Boolean(perfil?.empresa?.permitirVentaSinStock) === enabled) return;
        try {
            ventaSinStockToggleInFlight.current = true;
            setSavingVentaSinStockConfig(true);
            await useEmpresasStore.getState().actualizarMiEmpresa({ permitirVentaSinStock: enabled });
            setPerfil(prev => (prev ? { ...prev, empresa: { ...prev.empresa, permitirVentaSinStock: enabled } } : prev));
            useAuthStore.setState(state => ({
                auth: state.auth ? { ...state.auth, empresa: { ...(state.auth as any).empresa, permitirVentaSinStock: enabled } } : state.auth,
            }));
            useAlertStore.getState().alert('Configuración de venta sin stock actualizada', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error?.response?.data?.message || error?.message || 'No se pudo actualizar la configuración de venta sin stock', 'error');
        } finally {
            ventaSinStockToggleInFlight.current = false;
            setSavingVentaSinStockConfig(false);
        }
    };

    const handleCobranzaCampoToggle = async (enabled: boolean) => {
        if (savingCobranzaCampoConfig || cobranzaCampoToggleInFlight.current) return;
        if (Boolean(perfil?.empresa?.cobranzaCampo) === enabled) return;
        try {
            cobranzaCampoToggleInFlight.current = true;
            setSavingCobranzaCampoConfig(true);
            await useEmpresasStore.getState().actualizarMiEmpresa({ cobranzaCampo: enabled });
            setPerfil(prev => (prev ? { ...prev, empresa: { ...prev.empresa, cobranzaCampo: enabled } } : prev));
            useAuthStore.setState(state => ({
                auth: state.auth ? { ...state.auth, empresa: { ...(state.auth as any).empresa, cobranzaCampo: enabled } } : state.auth,
            }));
            useAlertStore.getState().alert('Configuración de cobranza en campo actualizada', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error?.response?.data?.message || error?.message || 'No se pudo actualizar la configuración', 'error');
        } finally {
            cobranzaCampoToggleInFlight.current = false;
            setSavingCobranzaCampoConfig(false);
        }
    };

    const [savingTicketLogoSize, setSavingTicketLogoSize] = useState(false);
    const logoSizeRef = useRef(false);

    const handleTicketLogoSizeChange = async (size: number) => {
        if (logoSizeRef.current) return;
        try {
            logoSizeRef.current = true;
            setSavingTicketLogoSize(true);
            await useEmpresasStore.getState().actualizarMiEmpresa({ ticketLogoSize: size });
            setPerfil((prev: any) => {
                if (!prev) return prev;
                return { ...prev, empresa: { ...prev.empresa, ticketLogoSize: size } };
            });
            useAlertStore.getState().alert('Tamaño de logo actualizado', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error?.response?.data?.message || 'Error al actualizar tamaño', 'error');
        } finally {
            logoSizeRef.current = false;
            setSavingTicketLogoSize(false);
        }
    };

    const cargarUsageStats = async () => {
        try {
            const response: any = await get('comprobante/usage');
            if (response?.data) setUsageStats(response.data);
            else if (response && !response.error) setUsageStats(response);
        } catch { }
    };

    const formatearFecha = (fecha: string) => new Date(fecha).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const formatearFechaSolo = (fecha: string) => new Date(fecha).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });

    const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            try {
                await useEmpresasStore.getState().actualizarMiEmpresa({ logo: e.target.files[0] });
                useAlertStore.getState().alert('Logo actualizado correctamente', 'success');
                cargarPerfil();
            } catch { useAlertStore.getState().alert('Error al actualizar logo', 'error'); }
        }
    };

    const obtenerEstadoSuscripcion = () => {
        if (!perfil?.empresa.fechaExpiracion) return 'Sin información';
        const fechaExp = new Date(perfil.empresa.fechaExpiracion);
        const hoy = new Date();
        if (fechaExp < hoy) return 'Expirada';
        const dias = Math.ceil((fechaExp.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
        return dias <= 7 ? `Expira en ${dias} días` : 'Activa';
    };

    const obtenerColorEstado = () => {
        const estado = obtenerEstadoSuscripcion();
        if (estado === 'Expirada') return 'text-red-600 bg-red-100';
        if (estado.includes('Expira en')) return 'text-orange-600 bg-orange-100';
        return 'text-green-600 bg-green-100';
    };

    const handleDirectorTecnicoSave = async (valor: string, onDone?: () => void) => {
        if (savingDirectorTecnico) return;
        try {
            setSavingDirectorTecnico(true);
            await useEmpresasStore.getState().actualizarMiEmpresa({ directorTecnico: valor });
            setPerfil(prev => {
                if (!prev) return prev;
                return { ...prev, empresa: { ...prev.empresa, directorTecnico: valor } };
            });
            onDone?.();
            useAlertStore.getState().alert('Director Técnico actualizado', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error?.response?.data?.message || error?.message || 'No se pudo actualizar el Director Técnico', 'error');
        } finally {
            setSavingDirectorTecnico(false);
        }
    };

    const whatsappConfigDirty = useMemo(() => {
        if (!perfil || !perfil.empresa) return false;
        const initial = whatsappFormFromPerfil(perfil);
        return (
            whatsAppForm.provider !== initial.provider ||
            whatsAppForm.phoneNumberId !== initial.phoneNumberId ||
            whatsAppForm.businessId !== initial.businessId ||
            whatsAppForm.activo !== initial.activo ||
            whatsAppForm.apiToken.trim().length > 0
        );
    }, [perfil, whatsAppForm]);

    const setWhatsAppProvider = (provider: WhatsAppProvider) => {
        setWhatsAppForm(prev => ({
            ...prev,
            provider,
            activo: provider !== 'DISABLED',
        }));
    };

    const updateWhatsAppField = (field: keyof Omit<WhatsAppSettingsForm, 'provider' | 'activo'>, value: string) => {
        setWhatsAppForm(prev => ({ ...prev, [field]: value }));
    };

    const handleWhatsAppConfigSave = async () => {
        if (!perfil || savingWhatsAppConfig) return;

        const token = whatsAppForm.apiToken.trim();
        const phoneNumberId = whatsAppForm.phoneNumberId.trim();
        const businessId = whatsAppForm.businessId.trim();

        if (whatsAppForm.provider === 'EMPRESA' && !phoneNumberId) {
            useAlertStore.getState().alert('Ingresa el Phone Number ID de Meta', 'error');
            return;
        }

        if (whatsAppForm.provider === 'EMPRESA' && !perfil.empresa.whatsappApiTokenConfigured && !token) {
            useAlertStore.getState().alert('Ingresa el token permanente de WhatsApp Cloud API', 'error');
            return;
        }

        try {
            setSavingWhatsAppConfig(true);
            const payload: {
                whatsappProvider: WhatsAppProvider;
                whatsappPhoneNumberId?: string | null;
                whatsappBusinessId?: string | null;
                whatsappApiToken?: string;
                whatsappActivo: boolean;
            } = {
                whatsappProvider: whatsAppForm.provider,
                whatsappPhoneNumberId: phoneNumberId || null,
                whatsappBusinessId: businessId || null,
                whatsappActivo: whatsAppForm.provider !== 'DISABLED',
            };

            if (token) payload.whatsappApiToken = token;

            await useEmpresasStore.getState().actualizarMiEmpresa(payload);

            setPerfil(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    empresa: {
                        ...prev.empresa,
                        whatsappProvider: whatsAppForm.provider,
                        whatsappPhoneNumberId: phoneNumberId || null,
                        whatsappBusinessId: businessId || null,
                        whatsappActivo: whatsAppForm.provider !== 'DISABLED',
                        whatsappApiTokenConfigured: prev.empresa.whatsappApiTokenConfigured || Boolean(token),
                    },
                };
            });

            setWhatsAppForm(prev => ({ ...prev, apiToken: '', activo: prev.provider !== 'DISABLED' }));
            useAlertStore.getState().alert('Configuración de WhatsApp actualizada', 'success');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'No se pudo actualizar WhatsApp';
            useAlertStore.getState().alert(message, 'error');
        } finally {
            setSavingWhatsAppConfig(false);
        }
    };

    // ── Conexión Shalom Pro (courier) ────────────────────────────────────────
    const updateShalomField = (field: 'email' | 'password', value: string) => {
        setShalomForm(prev => ({ ...prev, [field]: value }));
    };

    const shalomConfigDirty = useMemo(() => {
        if (!perfil) return false;
        const emailChanged = shalomForm.email.trim() !== String(perfil.empresa?.shalomEmail ?? '').trim();
        const passwordChanged = shalomForm.password.trim().length > 0;
        return emailChanged || passwordChanged;
    }, [perfil, shalomForm]);

    const handleShalomConfigSave = async () => {
        if (!perfil || savingShalomConfig) return;
        const email = shalomForm.email.trim();
        const password = shalomForm.password.trim();
        if (!email) {
            useAlertStore.getState().alert('Ingresa el correo de tu cuenta Shalom Pro', 'error');
            return;
        }
        if (!perfil.empresa.shalomConfigured && !password) {
            useAlertStore.getState().alert('Ingresa la contraseña de tu cuenta Shalom Pro', 'error');
            return;
        }
        try {
            setSavingShalomConfig(true);
            const payload: { shalomEmail: string; shalomPassword?: string } = { shalomEmail: email };
            if (password) payload.shalomPassword = password;
            await useEmpresasStore.getState().actualizarMiEmpresa(payload as any);
            setPerfil(prev => prev ? {
                ...prev,
                empresa: {
                    ...prev.empresa,
                    shalomEmail: email,
                    shalomConfigured: prev.empresa.shalomConfigured || Boolean(password),
                },
            } : prev);
            setShalomForm(prev => ({ ...prev, password: '' }));
            useAlertStore.getState().alert('Conexión con Shalom actualizada', 'success');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'No se pudo guardar la conexión con Shalom';
            useAlertStore.getState().alert(message, 'error');
        } finally {
            setSavingShalomConfig(false);
        }
    };

    // ── Información personal (nombre/celular/teléfono) + página web de la empresa ──
    const updatePersonalField = (field: 'nombre' | 'celular' | 'telefono' | 'paginaWeb', value: string) => {
        setPersonalForm(prev => ({ ...prev, [field]: value }));
    };

    const personalDirty = useMemo(() => {
        if (!perfil) return false;
        return (
            personalForm.nombre.trim() !== (perfil.nombre ?? '').trim() ||
            personalForm.celular.trim() !== (perfil.celular ?? '').trim() ||
            personalForm.telefono.trim() !== (perfil.telefono ?? '').trim() ||
            personalForm.paginaWeb.trim() !== (perfil.empresa?.paginaWeb ?? '').trim()
        );
    }, [perfil, personalForm]);

    const handleSavePersonal = async () => {
        if (!perfil || savingPersonal) return;
        if (!personalForm.nombre.trim()) {
            useAlertStore.getState().alert('El nombre no puede estar vacío', 'error');
            return;
        }
        try {
            setSavingPersonal(true);
            const nombre = personalForm.nombre.trim();
            const celular = personalForm.celular.trim();
            const telefono = personalForm.telefono.trim();
            const paginaWeb = personalForm.paginaWeb.trim();

            // Datos del usuario (nunca el email, no editable)
            await patch('usuario/me', { nombre, celular, telefono });

            // Página web es un dato de la empresa
            if (paginaWeb !== (perfil.empresa?.paginaWeb ?? '').trim()) {
                await useEmpresasStore.getState().actualizarMiEmpresa({ paginaWeb });
            }

            setPerfil(prev => prev ? {
                ...prev,
                nombre,
                celular,
                telefono,
                empresa: { ...prev.empresa, paginaWeb },
            } : prev);

            // Reflejar en la sesión global para que salga en comprobantes/cotizaciones
            useAuthStore.setState(state => ({
                auth: state.auth ? {
                    ...state.auth,
                    nombre,
                    empresa: { ...(state.auth as any).empresa, paginaWeb },
                } : state.auth,
            }));

            useAlertStore.getState().alert('Información personal actualizada', 'success');
        } catch (error: any) {
            useAlertStore.getState().alert(error?.response?.data?.message || error?.message || 'No se pudo actualizar la información', 'error');
        } finally {
            setSavingPersonal(false);
        }
    };

    const handleChangePassword = async () => {
        const errs: Record<string, string> = {};
        if (!passwordForm.actual) errs.actual = 'Ingresa tu contraseña actual';
        if (!passwordForm.nueva) errs.nueva = 'Ingresa la nueva contraseña';
        else if (passwordForm.nueva.length < 6) errs.nueva = 'Mínimo 6 caracteres';
        if (passwordForm.nueva !== passwordForm.confirmar) errs.confirmar = 'Las contraseñas no coinciden';
        setPasswordErrors(errs);
        if (Object.keys(errs).length > 0) return;
        try {
            setSavingPassword(true);
            const result = await patch('usuario/password', { actual: passwordForm.actual, nueva: passwordForm.nueva });
            if (result.error) {
                const msg = result.error || 'Contraseña actual incorrecta';
                useAlertStore.getState().alert(Array.isArray(msg) ? msg[0] : msg, 'error');
                return;
            }
            useAlertStore.getState().alert('Contraseña actualizada correctamente', 'success');
            setPasswordForm({ actual: '', nueva: '', confirmar: '' });
            setPasswordErrors({});
        } catch (error: any) {
            const msg = error?.response?.data?.message || error?.message || 'Error al cambiar contraseña';
            useAlertStore.getState().alert(Array.isArray(msg) ? msg[0] : msg, 'error');
        } finally {
            setSavingPassword(false);
        }
    };

    return { perfil, loading, usageStats, savingBarcodeConfig, savingFefoPriceConfig, savingDirectorTecnico, savingWhatsAppConfig, whatsAppForm, whatsappConfigDirty, passwordForm, setPasswordForm, passwordErrors, savingPassword, handleChangePassword, formatearFecha, formatearFechaSolo, handleLogoChange, handleBarcodeToggle, handleFefoPriceToggle, savingVentaSinStockConfig, handleVentaSinStockToggle, savingCobranzaCampoConfig, handleCobranzaCampoToggle, savingCotizConfig, handleCotizToggle, handleDirectorTecnicoSave, setWhatsAppProvider, updateWhatsAppField, handleWhatsAppConfigSave, obtenerEstadoSuscripcion, obtenerColorEstado, handleTicketLogoSizeChange, savingTicketLogoSize, shalomForm, savingShalomConfig, shalomConfigDirty, updateShalomField, handleShalomConfigSave, personalForm, savingPersonal, personalDirty, updatePersonalField, handleSavePersonal };
};
