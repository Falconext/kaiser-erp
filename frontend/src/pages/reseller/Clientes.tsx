import React, { useEffect, useMemo, useRef, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { Icon } from '@iconify/react';
import { useAuthStore } from '@/zustand/auth';
import { useResellerPanelStore } from '@/zustand/reseller-panel';
import Select from '@/components/Select';
import ClienteDetalleModal from '@/components/reseller/ClienteDetalleModal';
import Modal from '@/components/Modal';
import ModalConfirm from '@/components/ModalConfirm';
import useAlertStore from '@/zustand/alert';
import InputPro from '@/components/InputPro';
import { BRAND } from '@/lib/branding';
import { useExtentionsStore } from '@/zustand/extentions';
import { PageHead, KpiHero, type KpiHeroItem } from './resellerUi';

// ── Recordatorios al cliente (WhatsApp / correo) ──────────────────────────────
// El reseller usa estos enlaces para avisar a su cliente sobre la renovación.
// `marca` es el nombre del reseller (su white-label), NO la marca de la plataforma.
const soloDigitos = (t: string) => String(t || '').replace(/\D/g, '');
const planCorto = (plan: string) => String(plan || '').split(' · ')[0];
function whatsappRecordatorioUrl(telefono: string, empresa: string, plan: string, vence: string, marca: string) {
    const num = soloDigitos(telefono);
    const full = num.length === 9 ? `51${num}` : num; // Perú: antepone 51 si es celular local
    const msg = `Hola, le saluda ${marca}. Le recordamos que el plan ${planCorto(plan)} de ${empresa} ${vence && vence !== '—' ? `vence el ${vence}` : 'está por vencer'}. Renuévelo a tiempo para no interrumpir su servicio. ¡Gracias!`;
    return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`;
}
function correoRecordatorioUrl(email: string, empresa: string, plan: string, vence: string, marca: string) {
    const subject = `Recordatorio de renovación · ${empresa}`;
    const body = `Estimado cliente,\n\nLe recordamos que el plan ${planCorto(plan)} de ${empresa} ${vence && vence !== '—' ? `vence el ${vence}` : 'está por vencer'}. Le agradeceremos realizar la renovación a tiempo para no interrumpir su servicio.\n\nSaludos,\n${marca}`;
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Costo MAYORISTA del reseller (modelo por volumen de clientes):
//  - MENSUAL: parte del precio base del plan mensual y baja S/1 por cada tramo de
//    volumen del reseller -> 1-5 = base, 6-15 = base-1, 16-30 = base-2, 31+ = base-3.
//  - ANUAL: PLANO. El costo es el precio del plan anual, sin descuento por volumen.
function volumeTier(clientes: number): number {
    if (clientes <= 5) return 0;
    if (clientes <= 15) return 1;
    if (clientes <= 30) return 2;
    return 3;
}
function volumeTierLabel(clientes: number): string {
    return ['1-5 clientes', '6-15 clientes', '16-30 clientes', '31+ clientes'][volumeTier(clientes)];
}
function costoMensualReseller(baseMensual: number | string, clientes: number): number {
    return Math.max(0, Number(baseMensual || 0) - volumeTier(clientes));
}

// Nombre base del tier, sin el sufijo " ANUAL".
function baseTierName(nombre: string): string {
    return String(nombre || '').replace(/\s*anual\s*$/i, '').trim();
}
function esPlanAnual(nombre: string): boolean {
    return /anual\s*$/i.test(String(nombre || ''));
}
// Empareja el plan MENSUAL y el ANUAL de un mismo tier (ej. "CORPORATIVO" y
// "CORPORATIVO ANUAL"), sin importar cuál seleccionó el reseller.
function findPlanPair(planes: any[], nombre: string): { mensual: any; anual: any } {
    const base = baseTierName(nombre).toLowerCase();
    const mensual = planes.find((p: any) => baseTierName(p.nombre).toLowerCase() === base && !esPlanAnual(p.nombre));
    const anual = planes.find((p: any) => baseTierName(p.nombre).toLowerCase() === base && esPlanAnual(p.nombre));
    return { mensual, anual };
}
// Precio base mensual del tier (usa el plan mensual del mismo tier).
function precioBaseMensual(planes: any[], plan: any): number {
    const { mensual } = findPlanPair(planes, plan.nombre);
    return Number((mensual ?? plan).costo || 0);
}
// Precio anual del tier (plano). Si no existe plan anual, usa mensual×10 (2 meses gratis).
function precioAnual(planes: any[], plan: any): number {
    const { mensual, anual } = findPlanPair(planes, plan.nombre);
    if (anual) return Number(anual.costo || 0);
    return Number((mensual ?? plan).costo || 0) * 10;
}
// Costo del reseller para un plan concreto: mensual con tramo de volumen, anual plano.
function costoResellerDePlan(planes: any[], plan: any, clientes: number): number {
    return esPlanAnual(plan.nombre)
        ? precioAnual(planes, plan)
        : costoMensualReseller(precioBaseMensual(planes, plan), clientes);
}

const isFlagship = ['default', 'vendify'].includes(String(BRAND.key || '').toLowerCase());

// Pill de estado con el mismo look que las tablas del admin (Comprobantes).
function estadoPillCliente(estado: string) {
    const e = String(estado || '').toUpperCase();
    if (e === 'ACTIVO') return { label: 'Activo', dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (e === 'PLACEHOLDER' || e === 'DEMO') return { label: 'Demo', dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: e ? e.charAt(0) + e.slice(1).toLowerCase() : '—', dot: 'bg-rose-500', text: 'text-rose-500', bg: 'bg-rose-50' };
}

const DEFAULT_SERIES = [
    { tipoDoc: '01', nombre: 'Factura', serie: 'F001', correlativo: 1, activo: true },
    { tipoDoc: '03', nombre: 'Boleta', serie: 'B001', correlativo: 1, activo: true },
    { tipoDoc: '07', nombre: 'Nota crédito', serie: 'FC01', correlativo: 1, activo: true },
    { tipoDoc: '08', nombre: 'Nota débito', serie: 'FD01', correlativo: 1, activo: true },
    { tipoDoc: 'NV', nombre: 'Nota venta', serie: 'NV01', correlativo: 1, activo: true },
];

const initialFormData = {
    rut: '',
    razonSocial: '',
    nombreComercial: '',
    direccion: '',
    logo: '',
    departamento: '',
    provincia: '',
    distrito: '',
    ubigeo: '',
    rubroId: '',
    producto: 'facturacion', // sistema: 'facturacion' | 'restaurante' | 'hotel'
    representa: '',
    email: '',
    telefono: '',
    password: '',
    planId: '',
    cicloFacturacion: 'MENSUAL' as 'MENSUAL' | 'ANUAL',
    precioClienteFinal: '',
    esWhiteLabel: true, // los clientes de un reseller SIEMPRE operan bajo su marca blanca
    usaCodigoBarrasManual: false,
    usaDemo: false, // Producción SUNAT activo por defecto (Demo = apagado)
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
};

export default function ResellerClientes() {
    const { auth } = useAuthStore();
    const { clientes, getClientes, createCliente, updateCliente, deleteDemoCliente, stats, getDashboard, planes, getPlanes, consultarDocumento, getClienteSeries, updateClienteSeries, branding, getBranding } = useResellerPanelStore();
    // Marca del reseller (white-label) para firmar los recordatorios al cliente.
    const marcaReseller = branding?.whiteLabelNombre || auth?.nombre || BRAND.name;
    const { rubros, ubigeos, getRubros, getUbigeos } = useExtentionsStore();
    // Solo planes de facturación (excluir hotel)
    const planesFacturacion = useMemo(
        () => planes.filter((p: any) => String(p.producto ?? 'facturacion').toLowerCase() !== 'hotel'),
        [planes]
    );
    const logoFileRef = useRef<HTMLInputElement>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<number>(0);
    const [editingCliente, setEditingCliente] = useState<any>(null);
    const [search, setSearch] = useState('');
    const [marcaFilter, setMarcaFilter] = useState<'todos' | 'wl' | 'std'>('todos');
    const [estadoFilter, setEstadoFilter] = useState<'todos' | 'activos' | 'suspendidos' | 'porvencer' | 'demo'>('todos');
    const [activeTab, setActiveTab] = useState<'empresa' | 'facturacion' | 'series'>('empresa');
    const [searchingDoc, setSearchingDoc] = useState(false);
    const [seriesData, setSeriesData] = useState(DEFAULT_SERIES);

    useEffect(() => {
        if (isModalOpen) setActiveTab('empresa');
    }, [isModalOpen]);

    // Form State
    const [formData, setFormData] = useState(initialFormData);

    // Prefill del precio de venta con el precio configurado por el reseller para
    // ese plan (si el reseller ya lo definió y el campo está vacío).
    useEffect(() => {
        if (!isModalOpen || formData.precioClienteFinal !== '') return;
        const plan = planesFacturacion.find((p: any) => String(p.id) === String(formData.planId));
        const precio = plan ? (stats.preciosPlan || {})[plan.nombre] : undefined;
        if (precio) setFormData(prev => ({ ...prev, precioClienteFinal: String(precio) }));
    }, [formData.planId, isModalOpen]);

    useEffect(() => {
        console.log("ResellerClientes mounted. Auth:", auth);
        getPlanes(); // Call plans immediately (does not require resellerId arg)
        getRubros();
        getUbigeos();

        if (auth?.resellerId) {
            console.log("Fetching Reseller Data for ID:", auth.resellerId);
            getClientes(auth.resellerId);
            getDashboard(auth.resellerId);
            if (!branding) getBranding(auth.resellerId);
        } else {
            console.warn("No resellerId found in auth object");
        }
    }, [auth]);

    const [searchingDocEdit, setSearchingDocEdit] = useState(false);
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
    const [editData, setEditData] = useState({
        planId: '',
        ruc: '',
        razonSocial: '',
        nombreComercial: '',
        direccion: '',
        logo: '',
        departamento: '',
        provincia: '',
        distrito: '',
        ubigeo: '',
        rubroId: '',
        telefono: '',
        adminEmail: '',
        adminPassword: '',
        precioClienteFinal: '',
        esWhiteLabel: true, // reseller: siempre marca blanca
        usaCodigoBarrasManual: false,
        usaDemo: true,
    });

    const openEditModal = async (cliente: any) => {
        const raw = clientes.find((c: any) => c.id === cliente.id);
        setEditingCliente(raw);
        setEditData({
            planId: String(raw?.planId || ''),
            ruc: raw?.ruc || '',
            razonSocial: raw?.razonSocial || '',
            nombreComercial: raw?.nombreComercial || '',
            direccion: raw?.direccion || '',
            logo: raw?.logo || '',
            departamento: raw?.departamento || '',
            provincia: raw?.provincia || '',
            distrito: raw?.distrito || '',
            ubigeo: raw?.ubigeo || raw?.empresaUbigeo || '',
            rubroId: String(raw?.rubroId || raw?.rubro?.id || ''),
            telefono: raw?.telefono || '',
            adminEmail: raw?.usuarios?.[0]?.email || '',
            adminPassword: '',
            precioClienteFinal: raw?.precioClienteFinal != null ? String(raw.precioClienteFinal) : '',
            esWhiteLabel: true, // reseller: siempre marca blanca
            usaCodigoBarrasManual: Boolean(raw?.usaCodigoBarrasManual),
            usaDemo: Boolean(raw?.usaDemo),
        });
        if (auth?.resellerId) {
            const currentSeries = await getClienteSeries(auth.resellerId, raw.id);
            setSeriesData(DEFAULT_SERIES.map((base) => {
                const found = currentSeries.find((s: any) => s.tipoDoc === base.tipoDoc);
                return found ? { ...base, serie: found.serie, correlativo: found.correlativo ?? base.correlativo, activo: found.activo ?? base.activo } : base;
            }));
        }
        setIsEditModalOpen(true);
    };

    const doEditSave = async (rucLimpio: string) => {
        if (!auth || !editingCliente) return;
        const payload: any = {
            ruc: rucLimpio || undefined,
            razonSocial: editData.razonSocial,
            nombreComercial: editData.nombreComercial,
            direccion: editData.direccion,
            logo: editData.logo?.startsWith('data:') ? undefined : editData.logo,
            departamento: editData.departamento,
            provincia: editData.provincia,
            distrito: editData.distrito,
            ubigeo: editData.ubigeo,
            rubroId: editData.rubroId ? Number(editData.rubroId) : null,
            usaCodigoBarrasManual: editData.usaCodigoBarrasManual,
            usaDemo: editData.usaDemo,
            telefono: editData.telefono,
            adminEmail: editData.adminEmail,
            precioClienteFinal: editData.precioClienteFinal === '' ? null : Number(editData.precioClienteFinal),
            esWhiteLabel: editData.esWhiteLabel,
        };
        if (editData.planId) payload.planId = Number(editData.planId);
        if (editData.adminPassword) payload.adminPassword = editData.adminPassword;
        const result = await updateCliente(auth.resellerId!, editingCliente.id, payload);
        if (result.success) {
            await updateClienteSeries(auth.resellerId!, editingCliente.id, seriesData);
            setIsEditModalOpen(false);
            getClientes(auth.resellerId!);
        }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth || !editingCliente) return;
        const rucLimpio = (editData.ruc || '').replace(/\D/g, '');
        const rucCambia = rucLimpio && rucLimpio !== (editingCliente.ruc || '');
        if (rucCambia && rucLimpio.length !== 11) {
            useAlertStore.getState().alert('El RUC debe tener 11 dígitos.', 'error');
            return;
        }
        if (rucCambia) {
            setConfirm({
                title: 'Cambiar el RUC del cliente',
                information: 'Vas a cambiar el RUC de esta empresa.',
                children: (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Se <b>borrarán las credenciales QPSE actuales</b> del cliente; deberás volver a generarlas con el nuevo RUC desde <b>Ver → Configuración</b>.
                    </p>
                ),
                confirmText: 'Cambiar RUC',
                confirmColor: 'danger',
                onConfirm: () => doEditSave(rucLimpio),
            });
            return;
        }
        await doEditSave(rucLimpio);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !auth?.resellerId) return;
        setLogoUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const resp: any = await apiClient.post(`/resellers/${auth.resellerId}/upload-logo`, fd);
            const url = resp.data?.data?.url ?? resp.data?.url ?? '';
            if (url) setFormData(prev => ({ ...prev, logo: url }));
        } catch {
            // silent
        } finally {
            setLogoUploading(false);
        }
    };

    const handleSearchDocument = async () => {
        if (!auth?.resellerId || formData.rut.replace(/\D/g, '').length !== 11) {
            alert('Ingresa un RUC válido de 11 dígitos.');
            return;
        }
        setSearchingDoc(true);
        try {
            const data = await consultarDocumento(auth.resellerId, 'RUC', formData.rut);
            setFormData(prev => ({
                ...prev,
                razonSocial: data?.nombre_o_razon_social || data?.razonSocial || data?.nombre || prev.razonSocial,
                nombreComercial: data?.nombre_comercial || data?.nombre_o_razon_social || prev.nombreComercial,
                direccion: data?.direccion || prev.direccion,
                departamento: data?.departamento || prev.departamento,
                provincia: data?.provincia || prev.provincia,
                distrito: data?.distrito || prev.distrito,
                ubigeo: data?.ubigeo || prev.ubigeo,
            }));
        } catch (error: any) {
            alert(error.message || 'No se pudo consultar el RUC.');
        } finally {
            setSearchingDoc(false);
        }
    };

    const handleSearchDocumentEdit = async () => {
        if (!auth?.resellerId || (editData.ruc || '').replace(/\D/g, '').length !== 11) {
            alert('Ingresa un RUC válido de 11 dígitos.');
            return;
        }
        setSearchingDocEdit(true);
        try {
            const data = await consultarDocumento(auth.resellerId, 'RUC', editData.ruc);
            setEditData(prev => ({
                ...prev,
                razonSocial: data?.nombre_o_razon_social || data?.razonSocial || data?.nombre || prev.razonSocial,
                nombreComercial: data?.nombre_comercial || data?.nombre_o_razon_social || prev.nombreComercial,
                direccion: data?.direccion || prev.direccion,
                departamento: data?.departamento || prev.departamento,
                provincia: data?.provincia || prev.provincia,
                distrito: data?.distrito || prev.distrito,
                ubigeo: data?.ubigeo || prev.ubigeo,
            }));
        } catch (error: any) {
            alert(error.message || 'No se pudo consultar el RUC.');
        } finally {
            setSearchingDocEdit(false);
        }
    };

    const rubrosOptions = Array.isArray(rubros) ? rubros as any[] : [];
    // Sistema/producto que correrá la empresa. 'restaurante' aprovisiona un tenant
    // en el sistema dedicado falconext-restaurante; 'facturacion' vive en este POS.
    const productoOptions = [
        { id: 'facturacion', value: 'Facturación' },
        { id: 'restaurante', value: 'Restaurante' },
    ];
    const ubigeosOptions = (Array.isArray(ubigeos) ? ubigeos as any[] : []).map((u: any) => ({
        id: u.codigo,
        value: `${u.departamento} - ${u.provincia} - ${u.distrito}`,
    }));

    const formatUbigeoValue = (data: { departamento?: string; provincia?: string; distrito?: string; ubigeo?: string }) => {
        if (data.departamento && data.provincia && data.distrito) return `${data.departamento} - ${data.provincia} - ${data.distrito}`;
        const selected = (ubigeos as any[])?.find?.((u: any) => u.codigo === data.ubigeo);
        return selected ? `${selected.departamento} - ${selected.provincia} - ${selected.distrito}` : '';
    };

    const normalizeUbigeo = (value: unknown) => {
        if (Array.isArray(value)) { const f = value.filter(Boolean); return String(f[f.length - 1] || ''); }
        return String(value || '');
    };

    const applyUbigeoToForm = (id: any, target: 'create' | 'edit') => {
        const ubigeoCode = normalizeUbigeo(id);
        const selected = (ubigeos as any[])?.find?.((u: any) => u.codigo === ubigeoCode);
        if (!selected) return;
        const next = {
            ubigeo: selected.codigo,
            departamento: selected.departamento,
            provincia: selected.provincia,
            distrito: selected.distrito,
        };
        if (target === 'edit') setEditData(prev => ({ ...prev, ...next }));
        else setFormData(prev => ({ ...prev, ...next }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!auth) {
            alert("Error: No autenticado");
            return;
        }

        const resellerId = (auth as any).resellerId;
        if (!resellerId) {
            alert("Error: No se encontró ID de Reseller en la sesión. Recarga la página.");
            return;
        }

        const result = await createCliente(resellerId, {
            ...formData,
            ubigeo: normalizeUbigeo(formData.ubigeo),
            rubroId: formData.rubroId ? Number(formData.rubroId) : null,
            series: seriesData,
            celular: formData.telefono // Mapping for backend
        });

        if (result.success) {
            setIsModalOpen(false);
            setFormData(initialFormData);
            setSeriesData(DEFAULT_SERIES);
            getClientes(auth.resellerId!); // Refresh list
        }
    };

    const formatCurrency = (value: number) => `S/ ${value.toFixed(2)}`;

    const diasParaVencer = (fecha?: string) => {
        if (!fecha) return null;
        const ms = new Date(fecha).getTime() - Date.now();
        return Math.ceil(ms / (1000 * 60 * 60 * 24));
    };

    const resumen = useMemo(() => {
        const activos = clientes.filter((c: any) => c.estado === 'ACTIVO');
        const suspendidos = clientes.filter((c: any) => c.estado !== 'ACTIVO');
        const porVencer = activos.filter((c: any) => { const d = diasParaVencer(c.fechaExpiracion); return d != null && d >= 0 && d <= 7; });
        const demo = clientes.filter((c: any) => c.usaDemo);
        return { total: clientes.length, activos: activos.length, suspendidos: suspendidos.length, porVencer: porVencer.length, demo: demo.length };
    }, [clientes]);

    const clientsTable = useMemo(() => {
        const term = search.trim().toLowerCase();
        const filtered = clientes.filter((cliente: any) => {
            if (marcaFilter === 'wl' && !cliente.esWhiteLabel) return false;
            if (marcaFilter === 'std' && cliente.esWhiteLabel) return false;
            if (estadoFilter === 'activos' && cliente.estado !== 'ACTIVO') return false;
            if (estadoFilter === 'suspendidos' && cliente.estado === 'ACTIVO') return false;
            if (estadoFilter === 'demo' && !cliente.usaDemo) return false;
            if (estadoFilter === 'porvencer') {
                const d = cliente.estado === 'ACTIVO' ? diasParaVencer(cliente.fechaExpiracion) : null;
                if (d == null || d < 0 || d > 7) return false;
            }
            if (!term) return true;
            const razon = String(cliente.razonSocial || '').toLowerCase();
            const ruc = String(cliente.ruc || '').toLowerCase();
            return razon.includes(term) || ruc.includes(term);
        });

        return filtered.map((cliente: any) => {
            const dias = cliente.estado === 'ACTIVO' ? diasParaVencer(cliente.fechaExpiracion) : null;
            const vence = cliente.fechaExpiracion
                ? new Date(cliente.fechaExpiracion).toLocaleDateString('es-PE')
                : '—';
            const renueva = dias == null ? '—' : dias < 0 ? 'Vencida' : dias === 0 ? 'Hoy' : `En ${dias}d`;
            return {
                id: cliente.id,
                empresa: cliente.razonSocial,
                ruc: cliente.ruc,
                plan: cliente?.plan?.nombre
                    ? `${cliente.plan.nombre}${cliente?.plan?.maxComprobantes ? ` · ${cliente.plan.maxComprobantes} comprob.` : ''}`
                    : `Plan ID: ${cliente.planId}`,
                marca: cliente.esWhiteLabel ? '⬥ Marca blanca' : 'Estándar',
                costo: formatCurrency(
                    cliente?.plan?.nombre
                        ? costoResellerDePlan(planesFacturacion, cliente.plan, stats.clientesActivos || 0)
                        : Number(cliente.costoActivacionReseller ?? cliente.plan?.costo ?? 0)
                ),
                vence,
                renueva,
                dias,
                esWhiteLabel: Boolean(cliente.esWhiteLabel),
                estado: cliente.estado,
                usaDemo: Boolean(cliente.usaDemo),
                telefono: cliente.usuarios?.[0]?.celular || cliente.telefono || '',
                email: cliente.usuarios?.[0]?.email || cliente.email || '',
            };
        });
    }, [clientes, search, marcaFilter, estadoFilter, planesFacturacion, stats.clientesActivos]);

    const exportCSV = () => {
        const head = ['Empresa', 'RUC', 'Plan', 'Marca', 'Costo reseller', 'Vence', 'Renueva', 'Estado'];
        const lines = clientsTable.map((r: any) => [r.empresa, r.ruc, r.plan, String(r.marca).replace('⬥ ', ''), r.costo, r.vence, r.renueva, r.estado]
            .map((x) => `"${String(x).replace(/"/g, '""')}"`).join(','));
        const blob = new Blob([[head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            <PageHead title="Mis Clientes" subtitle="Gestiona las empresas bajo tu distribución">
                <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-sm"
                >
                    <Icon icon="solar:upload-minimalistic-linear" width="18" />
                    <span className="hidden sm:inline">Exportar</span>
                </button>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 btn-accent font-bold rounded-xl shadow-lg shadow-black/20 transition-all active:scale-95"
                >
                    <Icon icon="solar:add-circle-bold" width="20" />
                    Nuevo Cliente
                </button>
            </PageHead>

            {/* Resumen — tarjetas clickeables que filtran por estado */}
            <KpiHero items={([
                { label: 'Total', value: String(resumen.total), mini: 'bars', onClick: () => setEstadoFilter('todos'), active: estadoFilter === 'todos' },
                { label: 'Activos', value: String(resumen.activos), mini: 'line', onClick: () => setEstadoFilter('activos'), active: estadoFilter === 'activos' },
                { label: 'Suspendidos', value: String(resumen.suspendidos), mini: 'wave', warn: resumen.suspendidos > 0, onClick: () => setEstadoFilter('suspendidos'), active: estadoFilter === 'suspendidos' },
                { label: 'Por vencer (7d)', value: String(resumen.porVencer), mini: 'donut', onClick: () => setEstadoFilter('porvencer'), active: estadoFilter === 'porvencer' },
                { label: 'Demo', value: String(resumen.demo), mini: 'bars', onClick: () => setEstadoFilter('demo'), active: estadoFilter === 'demo' },
            ] as KpiHeroItem[])} />

            <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] border border-slate-100 overflow-hidden">
                <div className="p-5 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Icon icon="solar:filter-bold-duotone" className="text-blue-600 text-xl" />
                        <h3 className="font-semibold text-slate-800">Filtros</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Icon icon="solar:magnifer-linear" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="20" />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-violet-100 text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-1">
                            {([['todos', 'Todos'], ['wl', 'Marca blanca'], ['std', 'Estándar']] as const).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setMarcaFilter(key)}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${marcaFilter === key ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 relative z-0">
                    <div className="overflow-x-auto font-inter">
                        {clientsTable.length === 0 ? (
                            <div className="py-14 text-center text-slate-400">
                                <Icon icon="solar:users-group-rounded-linear" className="text-5xl mx-auto mb-2 opacity-60" />
                                <p className="text-sm font-medium">
                                    {search || marcaFilter !== 'todos' || estadoFilter !== 'todos'
                                        ? 'Ningún cliente coincide con los filtros.'
                                        : 'Aún no tienes clientes. Registra el primero con “Nuevo Cliente”.'}
                                </p>
                                {(search || marcaFilter !== 'todos' || estadoFilter !== 'todos') && (
                                    <button onClick={() => { setSearch(''); setMarcaFilter('todos'); setEstadoFilter('todos'); }} className="mt-3 text-sm font-bold text-violet-600 hover:underline">Limpiar filtros</button>
                                )}
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                        <th className="py-3 pl-5 pr-3">Empresa</th>
                                        <th className="py-3 px-3">Plan</th>
                                        <th className="py-3 px-3">Marca</th>
                                        <th className="py-3 px-3">Ambiente</th>
                                        <th className="py-3 px-3">Costo reseller</th>
                                        <th className="py-3 px-3">Vence</th>
                                        <th className="py-3 px-3">Renueva</th>
                                        <th className="py-3 px-3">Estado</th>
                                        <th className="py-3 px-3 pr-5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clientsTable.map((row: any) => {
                                        const pill = estadoPillCliente(row.estado);
                                        const renuevaCls = row.dias == null ? 'bg-slate-50 text-slate-400' : row.dias < 0 ? 'bg-rose-50 text-rose-600' : row.dias <= 7 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600';
                                        return (
                                            <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group">
                                                <td className="py-3 pl-5 pr-3">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                                                            {String(row.empresa || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-slate-700 text-sm truncate max-w-[200px]">{row.empresa}</p>
                                                            <p className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">{row.ruc}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-sm text-slate-500 truncate max-w-[180px]">{row.plan}</td>
                                                <td className="py-3 px-3">
                                                    {row.esWhiteLabel ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-50 text-violet-600 whitespace-nowrap"><Icon icon="solar:crown-star-bold" width={12} /> Marca blanca</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-500">Estándar</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3">
                                                    {row.usaDemo ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-600 whitespace-nowrap"><Icon icon="solar:test-tube-bold" width={12} /> Demo</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-600 whitespace-nowrap"><Icon icon="solar:cloud-check-bold" width={12} /> Producción</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 font-bold text-slate-800 text-sm whitespace-nowrap">{row.costo}</td>
                                                <td className="py-3 px-3 text-sm text-slate-500 whitespace-nowrap">{row.vence}</td>
                                                <td className="py-3 px-3">
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${renuevaCls}`}>{row.renueva}</span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {pill.label}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3 pr-5">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => { setSelectedClientId(row.id); setIsDetailsOpen(true); }} title="Ver detalles" aria-label="Ver detalles" className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-violet-600 transition-colors">
                                                            <Icon icon="solar:eye-bold" width={16} />
                                                        </button>
                                                        <button onClick={() => openEditModal(row)} title="Editar" aria-label="Editar" className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-violet-600 transition-colors">
                                                            <Icon icon="solar:pen-bold" width={16} />
                                                        </button>
                                                        {row.telefono ? (
                                                            <a
                                                                href={whatsappRecordatorioUrl(row.telefono, row.empresa, row.plan, row.vence, marcaReseller)}
                                                                target="_blank" rel="noopener noreferrer"
                                                                title="Recordar por WhatsApp" aria-label="Recordar por WhatsApp"
                                                                className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-colors"
                                                            >
                                                                <Icon icon="mdi:whatsapp" width={16} />
                                                            </a>
                                                        ) : (
                                                            <button disabled title="Sin teléfono registrado" aria-label="Sin teléfono registrado" className="h-8 w-8 grid place-items-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed">
                                                                <Icon icon="mdi:whatsapp" width={16} />
                                                            </button>
                                                        )}
                                                        {row.email ? (
                                                            <a
                                                                href={correoRecordatorioUrl(row.email, row.empresa, row.plan, row.vence, marcaReseller)}
                                                                title="Enviar correo de recordatorio" aria-label="Enviar correo de recordatorio"
                                                                className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-colors"
                                                            >
                                                                <Icon icon="solar:letter-bold" width={16} />
                                                            </a>
                                                        ) : (
                                                            <button disabled title="Sin correo registrado" aria-label="Sin correo registrado" className="h-8 w-8 grid place-items-center rounded-lg border border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed">
                                                                <Icon icon="solar:letter-bold" width={16} />
                                                            </button>
                                                        )}
                                                        {row.usaDemo && (
                                                            <button
                                                                onClick={() => {
                                                                    if (!auth?.resellerId) return;
                                                                    setConfirm({
                                                                        title: 'Eliminar cliente demo',
                                                                        information: 'Este cliente demo se ocultará del panel y sus usuarios quedarán inactivos.',
                                                                        confirmText: 'Eliminar',
                                                                        confirmColor: 'danger',
                                                                        onConfirm: async () => { await deleteDemoCliente(auth.resellerId!, row.id); },
                                                                    });
                                                                }}
                                                                title="Eliminar demo" aria-label="Eliminar demo"
                                                                className="h-8 w-8 grid place-items-center rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 transition-colors"
                                                            >
                                                                <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Details Modal */}
            <ClienteDetalleModal
                resellerId={auth?.resellerId!}
                clienteId={selectedClientId}
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
            />

            {/* Edit Modal */}
            <Modal
                isOpenModal={isEditModalOpen}
                closeModal={() => setIsEditModalOpen(false)}
                title="Editar Cliente"
                icon="solar:pen-bold-duotone"
                iconClass="bg-amber-50 text-amber-600"
                width="500px"
                height="auto"
            >
                <form onSubmit={handleEditSubmit} className="flex flex-col min-h-[calc(100dvh-56px)] md:block md:min-h-0">
                    <div className="flex-1 min-h-0 overflow-y-auto p-5 grid grid-cols-2 gap-3 md:flex-none md:max-h-[70vh]">
                        <div className="col-span-2 grid grid-cols-[1fr_auto] items-end gap-2">
                            <InputPro isLabel label="RUC" name="ruc" value={editData.ruc} onChange={(e: any) => setEditData(prev => ({ ...prev, ruc: e.target.value }))} placeholder="20100100100" maxLength={11} />
                            <button type="button" onClick={handleSearchDocumentEdit} disabled={searchingDocEdit} className="h-10 shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#7551FF]/10 px-4 text-sm font-bold text-[#7551FF] hover:bg-[#7551FF]/20 disabled:opacity-60">
                                <Icon icon={searchingDocEdit ? 'svg-spinners:ring-resize' : 'solar:magnifer-linear'} width="16" />
                                {searchingDocEdit ? '...' : 'Buscar'}
                            </button>
                        </div>
                        <p className="col-span-2 -mt-1 text-[11px] text-amber-600">
                            Cambiar el RUC borra las credenciales QPSE actuales; deberás volver a generarlas.
                        </p>
                        <div className="col-span-2">
                            <InputPro isLabel label="Razón Social" name="razonSocial" value={editData.razonSocial} onChange={(e: any) => setEditData(prev => ({ ...prev, razonSocial: e.target.value }))} placeholder="Empresa SAC" />
                        </div>
                        <div className="col-span-2">
                            <InputPro isLabel label="Nombre Comercial" name="nombreComercial" value={editData.nombreComercial} onChange={(e: any) => setEditData(prev => ({ ...prev, nombreComercial: e.target.value }))} placeholder="Marca comercial" />
                        </div>
                        <div className="col-span-2">
                            <InputPro isLabel label="Dirección fiscal" name="direccion" value={editData.direccion} onChange={(e: any) => setEditData(prev => ({ ...prev, direccion: e.target.value }))} placeholder="Dirección completa" />
                        </div>
                        <div className="col-span-2">
                            <Select
                                label="Ubicación"
                                name="ubigeo"
                                value={formatUbigeoValue(editData)}
                                options={ubigeosOptions}
                                onChange={(id: any) => applyUbigeoToForm(id, 'edit')}
                                error={null}
                                isSearch
                                withLabel
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logo</label>
                            <div className="flex items-center gap-2">
                                <div
                                    className="relative w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-violet-50 flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors cursor-pointer"
                                    onClick={() => {
                                        const inp = document.createElement('input');
                                        inp.type = 'file';
                                        inp.accept = 'image/*';
                                        inp.onchange = async (ev: any) => {
                                            const file = ev.target.files?.[0];
                                            if (!file || !editingCliente?.resellerId) return;
                                            try {
                                                const fd = new FormData();
                                                fd.append('file', file);
                                                const resp: any = await apiClient.post(`/resellers/${auth?.resellerId}/upload-logo`, fd);
                                                const url = resp.data?.data?.url ?? resp.data?.url ?? '';
                                                if (url) setEditData(prev => ({ ...prev, logo: url }));
                                            } catch { /* silent */ }
                                        };
                                        inp.click();
                                    }}
                                    title="Haz clic para subir logo"
                                >
                                    {editData.logo
                                        ? <img src={editData.logo} alt="Logo" className="w-full h-full object-contain p-0.5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        : <div className="flex flex-col items-center gap-0.5">
                                            <Icon icon="solar:upload-minimalistic-bold-duotone" className="text-lg text-slate-300" />
                                            <span className="text-[9px] text-slate-300 font-medium">Logo</span>
                                        </div>
                                    }
                                </div>
                                <input name="logo" value={editData.logo} onChange={(e: any) => setEditData(prev => ({ ...prev, logo: e.target.value }))} placeholder="o pega URL aquí..." className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                            </div>
                        </div>
                        <div className="col-span-2">
                            <Select
                                label="Rubro"
                                name="rubroId"
                                value={(rubros as any[]).find((r: any) => String(r.id) === String(editData.rubroId))?.value || ''}
                                options={rubrosOptions}
                                onChange={(id: any) => setEditData(prev => ({ ...prev, rubroId: String(id) }))}
                                error={null}
                                readOnly={true}
                            />
                        </div>
                        <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <InputPro isLabel label="Teléfono" name="telefono" value={editData.telefono} onChange={(e: any) => setEditData(prev => ({ ...prev, telefono: e.target.value }))} placeholder="999 999 999" />
                            <InputPro isLabel label="Email Admin" name="adminEmail" type="email" value={editData.adminEmail} onChange={(e: any) => setEditData(prev => ({ ...prev, adminEmail: e.target.value }))} placeholder="admin@empresa.com" />
                        </div>
                        <div className="col-span-2">
                            <InputPro isLabel label="Nueva Contraseña (opcional)" name="adminPassword" type="password" value={editData.adminPassword} onChange={(e: any) => setEditData(prev => ({ ...prev, adminPassword: e.target.value }))} placeholder="Dejar vacío para no cambiar" />
                        </div>
                        <div className="col-span-2">
                            <Select
                                label="Plan"
                                name="planId"
                                value={(() => {
                                    const p = planesFacturacion.find((x: any) => String(x.id) === String(editData.planId));
                                    if (!p) return '';
                                    const finalCost = costoResellerDePlan(planesFacturacion, p, stats.clientesActivos || 0);
                                    return `${p.nombre} (S/${finalCost.toFixed(2)})`;
                                })()}
                                options={planesFacturacion.map((plan: any) => {
                                    const finalCost = costoResellerDePlan(planesFacturacion, plan, stats.clientesActivos || 0);
                                    return { id: plan.id, value: `${plan.nombre} (S/${finalCost.toFixed(2)})` };
                                })}
                                onChange={(id: any) => setEditData(prev => ({ ...prev, planId: String(id) }))}
                                error={null}
                                readOnly={true}
                            />
                        </div>
                        {/* Precio que el reseller cobra al cliente + ganancia en vivo */}
                        {(() => {
                            const p = planesFacturacion.find((x: any) => String(x.id) === String(editData.planId));
                            const costoMensual = p ? costoResellerDePlan(planesFacturacion, p, stats.clientesActivos || 0) : 0;
                            const precioNum = editData.precioClienteFinal === '' ? null : Number(editData.precioClienteFinal);
                            const ganancia = precioNum != null ? precioNum - costoMensual : null;
                            return (
                                <div className="col-span-2 grid grid-cols-[1fr_auto] gap-3 items-end">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600">Precio que le cobras al cliente (mensual) <span className="text-[10px] font-normal text-slate-400">opcional</span></label>
                                        <div className="relative mt-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">S/</span>
                                            <input
                                                type="number" min="0" step="0.10"
                                                value={editData.precioClienteFinal}
                                                onChange={(e) => setEditData(prev => ({ ...prev, precioClienteFinal: e.target.value }))}
                                                placeholder="Ej. 49.90"
                                                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                                            />
                                        </div>
                                    </div>
                                    <div className={`rounded-xl px-4 py-2.5 text-center min-w-[120px] ${ganancia == null ? 'bg-slate-50 border border-slate-100' : ganancia >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ganancia</div>
                                        <div className={`text-base font-extrabold ${ganancia == null ? 'text-slate-400' : ganancia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{ganancia == null ? '—' : `S/ ${ganancia.toFixed(2)}`}</div>
                                    </div>
                                </div>
                            );
                        })()}
                        {editingCliente && (
                            <div className="col-span-2 bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-0.5">
                                <p><span className="font-semibold">Plan actual:</span> {editingCliente.plan?.nombre}</p>
                                <p><span className="font-semibold">Estado:</span> {editingCliente.estado}</p>
                            </div>
                        )}
                        {/* Entorno de facturación */}
                        {String(editingCliente?.billingProvider || 'QPSE').toUpperCase() === 'QPSE' ? (
                            <div className="col-span-2 flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <span className="flex items-center gap-3">
                                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${!editData.usaDemo ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-white'}`}>
                                        <Icon icon={!editData.usaDemo ? 'solar:cloud-check-bold-duotone' : 'solar:test-tube-bold-duotone'} width="20" />
                                    </span>
                                    <span>
                                        <strong className="block text-sm text-slate-800">Facturación: {!editData.usaDemo ? 'Producción' : 'Modo prueba'}</strong>
                                        <span className="text-xs text-slate-500">Para pasar este cliente a <b>producción</b>, entra a <b>Ver&nbsp;👁&nbsp;→ Configuración → Pasar a producción</b>.</span>
                                    </span>
                                </span>
                            </div>
                        ) : (
                            <label className={`col-span-2 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${!editData.usaDemo ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-100 bg-slate-50'}`}>
                                <span className="flex items-center gap-3">
                                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${!editData.usaDemo ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'}`}>
                                        <Icon icon={!editData.usaDemo ? 'solar:cloud-check-bold-duotone' : 'solar:cloud-storage-bold-duotone'} width="20" />
                                    </span>
                                    <span>
                                        <strong className="block text-sm text-slate-800">Producción SUNAT</strong>
                                        <span className="text-xs text-slate-500">{!editData.usaDemo ? 'Emite comprobantes reales ante SUNAT.' : 'Apagado = entorno Demo (pruebas).'}</span>
                                    </span>
                                </span>
                                <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                                    <input type="checkbox" className="peer sr-only" checked={!editData.usaDemo} onChange={(e) => setEditData(prev => ({ ...prev, usaDemo: !e.target.checked }))} />
                                    <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-emerald-500" />
                                    <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                                </span>
                            </label>
                        )}

                        {/* Código de barras */}
                        <label className={`col-span-2 flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${editData.usaCodigoBarrasManual ? 'border-[#7551FF]/30 bg-[#7551FF]/[0.06]' : 'border-slate-100 bg-slate-50'}`}>
                            <span className="flex items-center gap-3">
                                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${editData.usaCodigoBarrasManual ? 'bg-[#7551FF] text-white' : 'bg-white text-slate-400'}`}>
                                    <Icon icon="mdi:barcode-scan" width="20" />
                                </span>
                                <span>
                                    <strong className="block text-sm text-slate-800">Código de barras</strong>
                                    <span className="text-xs text-slate-500">Muestra el campo código de barras en productos.</span>
                                </span>
                            </span>
                            <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
                                <input type="checkbox" className="peer sr-only" checked={editData.usaCodigoBarrasManual} onChange={(e) => setEditData(prev => ({ ...prev, usaCodigoBarrasManual: e.target.checked }))} />
                                <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-[#7551FF]" />
                                <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                            </span>
                        </label>

                        {/* Series */}
                        <div className="col-span-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                            <div className="mb-3 flex items-center gap-2.5">
                                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#7551FF]/10 text-[#7551FF]"><Icon icon="solar:hashtag-square-bold-duotone" width="16" /></div>
                                <div>
                                    <p className="text-[13px] font-bold text-slate-700">Series de comprobantes</p>
                                    <p className="text-[11px] text-slate-400">Serie y correlativo inicial por tipo de documento.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-[1fr_84px_84px_44px] items-center gap-2 px-1 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                <span>Documento</span>
                                <span>Serie</span>
                                <span>Correlat.</span>
                                <span className="text-center">Activo</span>
                            </div>
                            <div className="space-y-1.5">
                                {seriesData.map((item, index) => (
                                    <div key={item.tipoDoc} className={`grid grid-cols-[1fr_84px_84px_44px] items-center gap-2 rounded-xl border px-2.5 py-1.5 transition-colors ${item.activo ? 'border-slate-100 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                                        <span className="text-xs font-semibold text-slate-700">{item.nombre}</span>
                                        <input className="h-8 w-full rounded-lg border border-slate-200 px-2 text-xs font-mono uppercase text-slate-700 focus:border-[#7551FF] focus:outline-none" value={item.serie} onChange={(e) => setSeriesData(prev => prev.map((s, i) => i === index ? { ...s, serie: e.target.value.toUpperCase() } : s))} />
                                        <input className="h-8 w-full rounded-lg border border-slate-200 px-2 text-xs text-slate-700 focus:border-[#7551FF] focus:outline-none" type="number" min={1} value={item.correlativo} onChange={(e) => setSeriesData(prev => prev.map((s, i) => i === index ? { ...s, correlativo: Number(e.target.value || 1) } : s))} />
                                        <label className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-self-center">
                                            <input type="checkbox" className="peer sr-only" checked={item.activo} onChange={(e) => setSeriesData(prev => prev.map((s, i) => i === index ? { ...s, activo: e.target.checked } : s))} />
                                            <span className="absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-[#7551FF]" />
                                            <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="sticky bottom-0 z-20 mt-auto flex gap-3 border-t border-slate-100 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-[#111827] md:px-5">
                        <button type="button" onClick={() => setIsEditModalOpen(false)} className="h-12 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Cancelar</button>
                        <button type="submit" className="h-12 flex-1 rounded-xl btn-accent text-sm font-bold shadow-lg shadow-black/20 transition-all">Guardar Cambios</button>
                    </div>
                </form>
            </Modal>

            {/* Create Modal */}
            <Modal
                isOpenModal={isModalOpen}
                closeModal={() => setIsModalOpen(false)}
                title="Nuevo Cliente"
                icon="solar:buildings-bold-duotone"
                iconClass="bg-[#7551FF]/10 text-[#7551FF]"
                width="580px"
                height="auto"
            >
                <form onSubmit={handleSubmit} className="flex flex-col min-h-[calc(100dvh-56px)] md:block md:min-h-0">
                    <div className="flex gap-1 border-b border-slate-100 px-4 dark:border-slate-800">
                        {([
                            { id: 'empresa', label: 'Empresa', icon: 'solar:buildings-bold-duotone' },
                            { id: 'facturacion', label: 'Facturación', icon: 'solar:bill-list-bold-duotone' },
                            { id: 'series', label: 'Series', icon: 'solar:hashtag-square-bold-duotone' },
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

                    <div className="flex-1 min-h-0 overflow-y-auto p-5 md:flex-none md:max-h-[72vh]">
                        {activeTab === 'empresa' && (
                            <div className="space-y-5">
                                {/* ── Sección: Datos de la empresa ── */}
                                <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                                    <div className="mb-4 flex items-center gap-2.5">
                                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#7551FF]/10 text-[#7551FF]"><Icon icon="solar:buildings-2-bold-duotone" width="16" /></div>
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">Datos de la empresa</p>
                                            <p className="text-[11px] text-slate-400">Identidad e imagen del negocio.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                                                <InputPro isLabel label="RUC" name="rut" value={formData.rut} onChange={handleChange as any} placeholder="20100100100" maxLength={11} />
                                                <button type="button" onClick={handleSearchDocument} disabled={searchingDoc} className="h-10 shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#7551FF]/10 px-4 text-sm font-bold text-[#7551FF] hover:bg-[#7551FF]/20 disabled:opacity-60">
                                                    <Icon icon={searchingDoc ? 'svg-spinners:ring-resize' : 'solar:magnifer-linear'} width="16" />
                                                    {searchingDoc ? '...' : 'Buscar'}
                                                </button>
                                            </div>
                                            {/* Logo upload */}
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Logo</label>
                                                <input ref={logoFileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => logoFileRef.current?.click()}
                                                        disabled={logoUploading}
                                                        className="relative w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 bg-white hover:border-[#7551FF]/40 hover:bg-[#7551FF]/5 flex items-center justify-center overflow-hidden flex-shrink-0 transition-colors dark:bg-slate-800 dark:border-slate-700"
                                                        title="Haz clic para subir logo"
                                                    >
                                                        {logoUploading ? (
                                                            <Icon icon="svg-spinners:ring-resize" className="text-[#7551FF] text-xl" />
                                                        ) : formData.logo ? (
                                                            <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-0.5" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-0.5">
                                                                <Icon icon="solar:upload-minimalistic-bold-duotone" className="text-lg text-slate-300" />
                                                                <span className="text-[9px] text-slate-300 font-medium">Logo</span>
                                                            </div>
                                                        )}
                                                    </button>
                                                    <input name="logo" value={formData.logo} onChange={handleChange as any} placeholder="o pega URL aquí..." className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#7551FF]/20 focus:border-[#7551FF] dark:bg-slate-800 dark:border-slate-700 dark:text-white" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <InputPro isLabel label="Razón Social" name="razonSocial" value={formData.razonSocial} onChange={handleChange as any} placeholder="Empresa SAC" />
                                            <InputPro isLabel label="Nombre Comercial" name="nombreComercial" value={formData.nombreComercial} onChange={handleChange as any} placeholder="Nombre visible" />
                                        </div>
                                    </div>
                                </section>

                                {/* ── Sección: Contacto y ubicación ── */}
                                <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                                    <div className="mb-4 flex items-center gap-2.5">
                                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#7551FF]/10 text-[#7551FF]"><Icon icon="solar:map-point-wave-bold-duotone" width="16" /></div>
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">Contacto y ubicación</p>
                                            <p className="text-[11px] text-slate-400">Dónde está y cómo contactar al negocio.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <InputPro isLabel label="Teléfono" name="telefono" value={formData.telefono} onChange={handleChange as any} placeholder="999 999 999" />
                                            <InputPro isLabel label="Representante" name="representa" value={formData.representa} onChange={handleChange as any} placeholder="Nombre del contacto" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <InputPro isLabel label="Dirección fiscal" name="direccion" value={formData.direccion} onChange={handleChange as any} placeholder="Dirección completa" />
                                            <Select label="Ubicación" name="ubigeo" value={formatUbigeoValue(formData)} options={ubigeosOptions} onChange={(id: any) => applyUbigeoToForm(id, 'create')} error={null} isSearch withLabel />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <Select label="Sistema" name="producto" value={productoOptions.find((o) => o.id === formData.producto)?.value || ''} options={productoOptions} onChange={(id: any) => setFormData(prev => {
                                                const next = { ...prev, producto: String(id) };
                                                if (String(id) === 'restaurante') {
                                                    // El rubro es evidente: se fija a "Restaurantes y comida" y se bloquea.
                                                    const rubroResto = (rubros as any[]).find((r: any) => /restauran|comida/i.test(String(r.value ?? r.nombre ?? '')));
                                                    if (rubroResto) next.rubroId = String(rubroResto.id);
                                                } else {
                                                    next.rubroId = '';
                                                }
                                                return next;
                                            })} error={null} />
                                            <Select label="Rubro" name="rubroId" value={(rubros as any[]).find((r: any) => String(r.id) === String(formData.rubroId))?.value || ''} options={rubrosOptions} onChange={(id: any) => setFormData(prev => ({ ...prev, rubroId: String(id) }))} error={null} disabled={formData.producto === 'restaurante'} />
                                        </div>
                                        {formData.producto === 'restaurante' && (
                                            <p className="mt-2 text-[11px] leading-snug text-amber-600 dark:text-amber-400">
                                                Al crear, la empresa se aprovisiona en el sistema Restaurante (backend dedicado). El administrador ingresará al panel de restaurante, no al POS de facturación.
                                            </p>
                                        )}
                                    </div>
                                </section>

                                {/* ── Sección: Acceso del administrador ── */}
                                <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                                    <div className="mb-4 flex items-center gap-2.5">
                                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#7551FF]/10 text-[#7551FF]"><Icon icon="solar:user-id-bold-duotone" width="16" /></div>
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">Acceso del administrador</p>
                                            <p className="text-[11px] text-slate-400">Con estos datos el cliente inicia sesión.</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <InputPro isLabel label="Email (Admin)" name="email" type="email" value={formData.email} onChange={handleChange as any} placeholder="admin@empresa.com" />
                                        <InputPro isLabel label="Contraseña Inicial" name="password" value={formData.password} onChange={handleChange as any} placeholder="123456" />
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs cursor-pointer dark:border-slate-700 dark:bg-slate-800/60">
                                            <span><strong className="block text-slate-700 text-xs dark:text-slate-100">Producción SUNAT</strong><span className="text-slate-400">Apagado = Demo</span></span>
                                            <input type="checkbox" checked={!formData.usaDemo} onChange={(e) => setFormData(prev => ({ ...prev, usaDemo: !e.target.checked }))} className="h-4 w-4 accent-[#7551FF]" />
                                        </label>
                                        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs cursor-pointer dark:border-slate-700 dark:bg-slate-800/60">
                                            <span><strong className="block text-slate-700 text-xs dark:text-slate-100">Código de barras</strong><span className="text-slate-400">Activa el campo</span></span>
                                            <input name="usaCodigoBarrasManual" type="checkbox" checked={formData.usaCodigoBarrasManual} onChange={handleChange as any} className="h-4 w-4 accent-[#7551FF]" />
                                        </label>
                                    </div>
                                </section>

                                {/* ── Sección: Plan y facturación ── */}
                                <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                                    <div className="mb-4 flex items-center gap-2.5">
                                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#7551FF]/10 text-[#7551FF]"><Icon icon="solar:tag-price-bold-duotone" width="16" /></div>
                                        <div>
                                            <p className="text-[13px] font-bold text-slate-700 dark:text-slate-100">Plan y facturación</p>
                                            <p className="text-[11px] text-slate-400">Plan, ciclo de cobro y tu ganancia.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-slate-600">Tipo de Plan</label>
                                        <span className="text-[10px] font-medium text-[#7551FF] bg-[#7551FF]/10 px-2 py-0.5 rounded-md">
                                            Nivel: {volumeTierLabel((stats.clientesActivos || 0) + 1)} con este cliente
                                        </span>
                                    </div>
                                    <Select
                                        label=""
                                        name="planId"
                                        value={planesFacturacion.find((p: any) => String(p.id) === String(formData.planId))?.nombre || ''}
                                        options={planesFacturacion.map((plan: any) => ({ id: plan.id, value: plan.nombre }))}
                                        onChange={(id: any) => {
                                            const plan = planesFacturacion.find((x: any) => String(x.id) === String(id));
                                            const ciclo = plan && esPlanAnual(plan.nombre) ? 'ANUAL' : 'MENSUAL';
                                            setFormData(prev => ({ ...prev, planId: id, cicloFacturacion: ciclo }));
                                        }}
                                        error={null}
                                        readOnly={true}
                                    />

                                    {/* Ciclo de cobro — solo en Producción (el Demo no cobra) */}
                                    {!formData.usaDemo && (
                                    <div className="mt-3">
                                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">Ciclo de cobro</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(() => {
                                                const planSel = planesFacturacion.find((x: any) => String(x.id) === String(formData.planId));
                                                const planEsAnual = planSel ? esPlanAnual(planSel.nombre) : false;
                                                return (['MENSUAL', 'ANUAL'] as const).map((c) => {
                                                    const active = formData.cicloFacturacion === c;
                                                    // El ciclo lo determina el plan: si es un plan anual, solo "Anual" es
                                                    // seleccionable; si es mensual, solo "Mensual".
                                                    const disabled = (c === 'MENSUAL' && planEsAnual) || (c === 'ANUAL' && !planEsAnual);
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={c}
                                                            disabled={disabled}
                                                            onClick={() => { if (!disabled) setFormData(prev => ({ ...prev, cicloFacturacion: c })); }}
                                                            className={`rounded-xl border px-3 py-2.5 text-left transition-all ${disabled ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed' : active ? 'border-[#7551FF] bg-[#7551FF]/5 ring-1 ring-[#7551FF]/30' : 'border-slate-200 hover:border-slate-300'}`}
                                                        >
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className={`text-sm font-bold ${active && !disabled ? 'text-[#7551FF]' : 'text-slate-700'}`}>{c === 'MENSUAL' ? 'Mensual' : 'Anual'}</span>
                                                                {c === 'ANUAL' && <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">2 MESES GRATIS</span>}
                                                            </div>
                                                            <span className="text-[11px] text-slate-400">{c === 'MENSUAL' ? 'Se cobra cada 30 días' : 'Se cobra 1 vez al año'}</span>
                                                        </button>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    </div>

                                    )}

                                    {/* Pill de costo/precio/ganancia — solo en Producción (el Demo no cobra) */}
                                    {(() => {
                                        const p = planesFacturacion.find((x: any) => String(x.id) === String(formData.planId));
                                        if (!p || formData.usaDemo) return null;
                                        const esAnual = formData.cicloFacturacion === 'ANUAL';
                                        const clientesConNuevo = (stats.clientesActivos || 0) + 1;
                                        const costoMensual = costoMensualReseller(precioBaseMensual(planesFacturacion, p), clientesConNuevo);
                                        const costoAnual = precioAnual(planesFacturacion, p);
                                        const precioNum = formData.precioClienteFinal === '' ? null : Number(formData.precioClienteFinal);
                                        // La ganancia se calcula contra el costo del ciclo elegido (anual vs mensual).
                                        const costoBase = esAnual ? costoAnual : costoMensual;
                                        const ganancia = precioNum != null ? precioNum - costoBase : null;
                                        return (
                                            <>
                                            <div className="mt-2 flex items-center gap-3 rounded-2xl bg-[#7551FF]/[0.07] border border-[#7551FF]/15 px-4 py-3">
                                                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7551FF]/10 text-[#7551FF]">
                                                    <Icon icon="solar:tag-price-bold-duotone" width="18" />
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 flex-1">
                                                    <div className={`transition-opacity ${esAnual ? 'opacity-40' : ''}`}>
                                                        <div className="text-[10px] text-[#7551FF]/70 font-bold uppercase tracking-wide">Tu costo mensual</div>
                                                        <div className="text-lg font-black text-[#7551FF]">S/ {costoMensual.toFixed(2)}</div>
                                                    </div>
                                                    <div className="w-px h-8 bg-[#7551FF]/20" />
                                                    <div className={`transition-opacity ${esAnual ? '' : 'opacity-40'}`}>
                                                        <div className="text-[10px] text-[#7551FF]/70 font-bold uppercase tracking-wide">Tu costo anual</div>
                                                        <div className="text-lg font-black text-[#7551FF]">S/ {costoAnual.toFixed(2)}</div>
                                                    </div>
                                                    <span className="ml-auto rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-[#7551FF] shadow-sm ring-1 ring-[#7551FF]/10">Cobro {esAnual ? 'anual' : 'mensual'}</span>
                                                </div>
                                            </div>
                                            {/* Precio que el reseller cobra al cliente + ganancia en vivo */}
                                            <div className="mt-2 grid grid-cols-[1fr_auto] gap-3 items-end">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                                                        Precio que le cobras al cliente ({esAnual ? 'anual' : 'mensual'})
                                                        <span className="text-[10px] font-normal text-slate-400">opcional</span>
                                                    </label>
                                                    <div className="relative mt-1">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">S/</span>
                                                        <input
                                                            name="precioClienteFinal"
                                                            type="number"
                                                            min="0"
                                                            step="0.10"
                                                            value={formData.precioClienteFinal}
                                                            onChange={handleChange as any}
                                                            placeholder="Ej. 49.90"
                                                            className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                                                        />
                                                    </div>
                                                </div>
                                                <div className={`rounded-xl px-4 py-2.5 text-center min-w-[120px] ${ganancia == null ? 'bg-slate-50 border border-slate-100' : ganancia >= 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                                                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tu ganancia</div>
                                                    <div className={`text-base font-extrabold ${ganancia == null ? 'text-slate-400' : ganancia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {ganancia == null ? '—' : `S/ ${ganancia.toFixed(2)}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="mt-1 text-[10px] text-slate-400">Si lo dejas vacío, en Ganancias se usará el precio de lista del plan como estimado.</p>
                                            </>
                                        );
                                    })()}
                                </section>
                            </div>
                        )}

                        {activeTab === 'facturacion' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <Select
                                        label="Proveedor de Facturación"
                                        name="billingProvider"
                                        value={formData.billingProvider === 'JAMBLE' ? 'JAMBLE (API propia)' : formData.billingProvider}
                                        options={[
                                            { id: 'QPSE', value: 'QPSE' },
                                            { id: 'JAMBLE', value: 'JAMBLE (API propia)' },
                                        ]}
                                        onChange={(id: any) => setFormData(prev => ({ ...prev, billingProvider: id }))}
                                        error={null}
                                        readOnly={true}
                                    />
                                </div>

                                {formData.billingProvider === 'QPSE' && (
                                    <div className="col-span-2 flex items-start gap-3 rounded-2xl border border-[#7551FF]/15 bg-[#7551FF]/[0.05] p-4">
                                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#7551FF]/10 text-[#7551FF]">
                                            <Icon icon="solar:shield-check-bold-duotone" width="18" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Facturación gestionada por la plataforma</p>
                                            <p className="mt-0.5 text-xs text-slate-500">Vendify genera y configura automáticamente las credenciales QPSE de este cliente (consulta la razón social en SUNAT por el RUC). No necesitas ingresar usuario ni clave.</p>
                                        </div>
                                    </div>
                                )}

                                {formData.billingProvider === 'JAMBLE' && (
                                    <>
                                        <div className="col-span-2">
                                            <InputPro isLabel label="URL API Producción" name="billingApiBaseUrl" value={formData.billingApiBaseUrl} onChange={handleChange as any} placeholder="https://facturas.jambleperu.com" />
                                        </div>
                                        <div className="col-span-2">
                                            <InputPro isLabel label="URL API Demo" name="billingApiDemoBaseUrl" value={formData.billingApiDemoBaseUrl} onChange={handleChange as any} placeholder="https://demo-facturas.jambleperu.com" />
                                        </div>
                                        <div className="col-span-2">
                                            <InputPro isLabel label="Token API" name="billingApiToken" value={formData.billingApiToken} onChange={handleChange as any} placeholder="token (opcional si usas usuario/clave)" />
                                        </div>
                                        <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <InputPro isLabel label="Usuario API" name="billingApiUser" value={formData.billingApiUser} onChange={handleChange as any} placeholder="usuario_api" />
                                            <InputPro isLabel label="Clave API" name="billingApiPassword" type="password" value={formData.billingApiPassword} onChange={handleChange as any} placeholder="••••••••" />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {activeTab === 'series' && (
                            <div className="space-y-3">
                                {seriesData.map((item, index) => (
                                    <div key={item.tipoDoc} className="grid grid-cols-[minmax(0,1fr)_72px_72px_36px] sm:grid-cols-[1fr_110px_110px_40px] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-slate-800">{item.nombre}</p>
                                            <p className="text-[11px] text-slate-400">Tipo {item.tipoDoc}</p>
                                        </div>
                                        <input className="w-full min-w-0 rounded-lg border border-slate-200 px-2 sm:px-3 py-2 text-sm font-bold uppercase" value={item.serie} onChange={(e) => setSeriesData(prev => prev.map((s, i) => i === index ? { ...s, serie: e.target.value.toUpperCase() } : s))} />
                                        <input className="w-full min-w-0 rounded-lg border border-slate-200 px-2 sm:px-3 py-2 text-sm" type="number" min={1} value={item.correlativo} onChange={(e) => setSeriesData(prev => prev.map((s, i) => i === index ? { ...s, correlativo: Number(e.target.value || 1) } : s))} />
                                        <input type="checkbox" checked={item.activo} onChange={(e) => setSeriesData(prev => prev.map((s, i) => i === index ? { ...s, activo: e.target.checked } : s))} className="h-5 w-5 accent-[#7551FF]" />
                                    </div>
                                ))}
                                <p className="text-xs text-slate-500">Estas series se usarán como base para los comprobantes nuevos de esta empresa.</p>
                            </div>
                        )}
                    </div>

                    <div className="sticky bottom-0 z-20 mt-auto flex flex-col gap-2 border-t border-slate-100 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-[#111827] md:px-5">
                        {(() => {
                            const planSel = planesFacturacion.find((x: any) => String(x.id) === String(formData.planId));
                            const costoActivacion = planSel ? costoResellerDePlan(planesFacturacion, planSel, (stats.clientesActivos || 0) + 1) : 0;
                            // Los clientes DEMO no cobran saldo; solo se bloquea al crear en producción.
                            const esProduccion = !formData.usaDemo;
                            const saldoInsuf = esProduccion && Boolean(planSel) && Number(stats.saldo || 0) < costoActivacion;
                            return (
                                <>
                                    {saldoInsuf && (
                                        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                                            <Icon icon="solar:wallet-money-bold-duotone" width={16} className="shrink-0" />
                                            <span>Saldo insuficiente: el plan cuesta S/{costoActivacion.toFixed(2)} y tu saldo es S/{Number(stats.saldo || 0).toFixed(2)}. Recarga o créalo como Demo (no consume saldo).</span>
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <button type="button" onClick={() => setIsModalOpen(false)} className="h-12 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Cancelar</button>
                                        <button type="submit" disabled={saldoInsuf} className="h-12 flex-1 rounded-xl btn-accent text-sm font-bold shadow-lg shadow-black/20 transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">Crear Cliente</button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </form>
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
        </div>
    );
}
