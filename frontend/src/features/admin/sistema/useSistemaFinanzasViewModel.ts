import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';

export const CATEGORIAS_GASTO = [
    { value: 'HOSTING', label: 'Hosting / Servidores', icon: 'solar:server-bold-duotone', color: '#3B82F6' },
    { value: 'HERRAMIENTAS', label: 'Herramientas / Software', icon: 'solar:widget-bold-duotone', color: '#8B5CF6' },
    { value: 'NOMINA', label: 'Nómina / Honorarios', icon: 'solar:users-group-rounded-bold-duotone', color: '#10B981' },
    { value: 'MARKETING', label: 'Marketing / Publicidad', icon: 'solar:megaphone-bold-duotone', color: '#F59E0B' },
    { value: 'LEGAL', label: 'Legal / Contabilidad', icon: 'solar:document-bold-duotone', color: '#EF4444' },
    { value: 'OTROS', label: 'Otros', icon: 'solar:tag-bold-duotone', color: '#6B7280' },
];

export const CATEGORIAS_INGRESO = [
    { value: 'SUSCRIPCION', label: 'Suscripción', icon: 'solar:refresh-circle-bold-duotone', color: '#10B981' },
    { value: 'ACTIVACION', label: 'Activación / Onboarding', icon: 'solar:rocket-bold-duotone', color: '#6366F1' },
    { value: 'SOPORTE', label: 'Soporte técnico', icon: 'solar:headphones-round-bold-duotone', color: '#3B82F6' },
    { value: 'PERSONALIZADO', label: 'Desarrollo personalizado', icon: 'solar:code-bold-duotone', color: '#F59E0B' },
    { value: 'OTROS', label: 'Otros', icon: 'solar:tag-bold-duotone', color: '#6B7280' },
];

const GASTO_VACIO = {
    concepto: '',
    categoria: 'HOSTING',
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: '',
    recurrente: false,
    periodicidad: 'MENSUAL',
};

const INGRESO_VACIO = {
    concepto: '',
    tipo: 'SUSCRIPCION',
    monto: '',
    fecha: new Date().toISOString().slice(0, 10),
    descripcion: '',
};

export function useSistemaFinanzasViewModel() {
    const { alert } = useAlertStore();

    const [tab, setTab] = useState<'dashboard' | 'movimientos' | 'clientes'>('dashboard');
    const [dashboard, setDashboard] = useState<any>(null);
    const [tendencia, setTendencia] = useState<any[]>([]);
    const [gastos, setGastos] = useState<any[]>([]);
    const [totalGastos, setTotalGastos] = useState(0);
    const [ingresos, setIngresos] = useState<any[]>([]);
    const [totalIngresos, setTotalIngresos] = useState(0);
    const [loadingDash, setLoadingDash] = useState(true);
    const [loadingGastos, setLoadingGastos] = useState(false);
    const [loadingIngresos, setLoadingIngresos] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // filtros compartidos (inicio/fin del mes actual)
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [filtroDesde, setFiltroDesde] = useState(primerDia);
    const [filtroHasta, setFiltroHasta] = useState(ultimoDia);
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroTipoIngreso, setFiltroTipoIngreso] = useState('');

    // Aliases para mantener compatibilidad (ingresos y gastos usan el mismo rango)
    const filtroDesdeIngreso = filtroDesde;
    const setFiltroDesdeIngreso = setFiltroDesde;
    const filtroHastaIngreso = filtroHasta;
    const setFiltroHastaIngreso = setFiltroHasta;

    // filtro empresas en tab clientes
    const [busquedaEmpresa, setBusquedaEmpresa] = useState('');

    // modal gasto
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState({ ...GASTO_VACIO });

    // modal ingreso
    const [showModalIngreso, setShowModalIngreso] = useState(false);
    const [editingIdIngreso, setEditingIdIngreso] = useState<number | null>(null);
    const [formIngreso, setFormIngreso] = useState({ ...INGRESO_VACIO });

    // tendencia periodo
    const [mesesTendencia, setMesesTendencia] = useState(12);

    const cargarDashboard = useCallback(async () => {
        setLoadingDash(true);
        try {
            const { data } = await apiClient.get('/sistema-finanzas/dashboard');
            setDashboard(data?.data ?? data);
        } catch {
            alert('Error al cargar el dashboard', 'error');
        } finally {
            setLoadingDash(false);
        }
    }, []);

    const cargarTendencia = useCallback(async (meses: number) => {
        try {
            const { data } = await apiClient.get(`/sistema-finanzas/tendencia?meses=${meses}`);
            const lista = data?.data ?? data;
            setTendencia(Array.isArray(lista) ? lista : []);
        } catch { }
    }, []);

    const cargarGastos = useCallback(async () => {
        setLoadingGastos(true);
        try {
            const params: any = {};
            if (filtroDesde) params.desde = filtroDesde;
            if (filtroHasta) params.hasta = filtroHasta;
            if (filtroCategoria) params.categoria = filtroCategoria;
            const { data } = await apiClient.get('/sistema-finanzas/gastos', { params });
            const payload = data?.data ?? data;
            setGastos(payload.gastos ?? []);
            setTotalGastos(payload.totalMonto ?? 0);
        } catch {
            alert('Error al cargar gastos', 'error');
        } finally {
            setLoadingGastos(false);
        }
    }, [filtroDesde, filtroHasta, filtroCategoria]);

    const cargarIngresos = useCallback(async () => {
        setLoadingIngresos(true);
        try {
            const params: any = {};
            if (filtroDesdeIngreso) params.desde = filtroDesdeIngreso;
            if (filtroHastaIngreso) params.hasta = filtroHastaIngreso;
            if (filtroTipoIngreso) params.tipo = filtroTipoIngreso;
            const { data } = await apiClient.get('/sistema-finanzas/ingresos', { params });
            const payload = data?.data ?? data;
            setIngresos(payload.ingresos ?? []);
            setTotalIngresos(payload.totalMonto ?? 0);
        } catch {
            alert('Error al cargar ingresos', 'error');
        } finally {
            setLoadingIngresos(false);
        }
    }, [filtroDesdeIngreso, filtroHastaIngreso, filtroTipoIngreso]);

    useEffect(() => { cargarDashboard(); }, [cargarDashboard]);
    useEffect(() => { cargarTendencia(mesesTendencia); }, [mesesTendencia, cargarTendencia]);
    useEffect(() => { if (tab === 'movimientos') cargarGastos(); }, [tab, cargarGastos]);
    useEffect(() => {
        if (tab === 'movimientos') {
            cargarIngresos();
        }
    }, [tab, cargarIngresos]);

    // ── Gasto CRUD ────────────────────────────────────────────────────────────

    const abrirNuevo = () => {
        setEditingId(null);
        setForm({ ...GASTO_VACIO });
        setShowModal(true);
    };

    const abrirEditar = (gasto: any) => {
        setEditingId(gasto.id);
        setForm({
            concepto: gasto.concepto,
            categoria: gasto.categoria,
            monto: String(gasto.monto),
            fecha: gasto.fecha ? gasto.fecha.slice(0, 10) : '',
            descripcion: gasto.descripcion ?? '',
            recurrente: gasto.recurrente ?? false,
            periodicidad: gasto.periodicidad ?? 'MENSUAL',
        });
        setShowModal(true);
    };

    const guardarGasto = async () => {
        if (!form.concepto.trim() || !form.monto || !form.fecha) {
            alert('Completa los campos obligatorios', 'error');
            return;
        }
        setGuardando(true);
        try {
            const payload = { ...form, monto: Number(form.monto) };
            if (editingId) {
                await apiClient.patch(`/sistema-finanzas/gastos/${editingId}`, payload);
                alert('Gasto actualizado', 'success');
            } else {
                await apiClient.post('/sistema-finanzas/gastos', payload);
                alert('Gasto registrado', 'success');
            }
            setShowModal(false);
            cargarGastos();
            cargarDashboard();
        } catch (e: any) {
            alert(e?.response?.data?.message ?? 'Error al guardar', 'error');
        } finally {
            setGuardando(false);
        }
    };

    const eliminarGasto = async (id: number) => {
        if (!confirm('¿Eliminar este gasto?')) return;
        try {
            await apiClient.delete(`/sistema-finanzas/gastos/${id}`);
            alert('Gasto eliminado', 'success');
            cargarGastos();
            cargarDashboard();
        } catch {
            alert('Error al eliminar', 'error');
        }
    };

    const setFormField = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

    // ── Ingreso CRUD ──────────────────────────────────────────────────────────

    const abrirNuevoIngreso = () => {
        setEditingIdIngreso(null);
        setFormIngreso({ ...INGRESO_VACIO });
        setShowModalIngreso(true);
    };

    const abrirEditarIngreso = (ingreso: any) => {
        setEditingIdIngreso(ingreso.id);
        setFormIngreso({
            concepto: ingreso.concepto,
            tipo: ingreso.tipo,
            monto: String(ingreso.monto),
            fecha: ingreso.fecha ? ingreso.fecha.slice(0, 10) : '',
            descripcion: ingreso.descripcion ?? '',
        });
        setShowModalIngreso(true);
    };

    const guardarIngreso = async () => {
        if (!formIngreso.concepto.trim() || !formIngreso.monto || !formIngreso.fecha) {
            alert('Completa los campos obligatorios', 'error');
            return;
        }
        setGuardando(true);
        try {
            const payload = { ...formIngreso, monto: Number(formIngreso.monto) };
            if (editingIdIngreso) {
                await apiClient.patch(`/sistema-finanzas/ingresos/${editingIdIngreso}`, payload);
                alert('Ingreso actualizado', 'success');
            } else {
                await apiClient.post('/sistema-finanzas/ingresos', payload);
                alert('Ingreso registrado', 'success');
            }
            setShowModalIngreso(false);
            cargarIngresos();
            cargarDashboard();
        } catch (e: any) {
            alert(e?.response?.data?.message ?? 'Error al guardar', 'error');
        } finally {
            setGuardando(false);
        }
    };

    const eliminarIngreso = async (id: number) => {
        if (!confirm('¿Eliminar este ingreso?')) return;
        try {
            await apiClient.delete(`/sistema-finanzas/ingresos/${id}`);
            alert('Ingreso eliminado', 'success');
            cargarIngresos();
            cargarDashboard();
        } catch {
            alert('Error al eliminar', 'error');
        }
    };

    const setFormIngresoField = (key: string, value: any) =>
        setFormIngreso((prev) => ({ ...prev, [key]: value }));

    const empresasFiltradas = (dashboard?.empresasActivas ?? []).filter((e: any) => {
        if (!busquedaEmpresa) return true;
        const q = busquedaEmpresa.toLowerCase();
        return (e.nombre ?? '').toLowerCase().includes(q) ||
            (e.ruc ?? '').includes(q) ||
            (e.adminEmail ?? '').toLowerCase().includes(q);
    });

    return {
        tab, setTab,
        dashboard, tendencia, gastos, totalGastos, ingresos, totalIngresos,
        loadingDash, loadingGastos, loadingIngresos, guardando,
        filtroDesde, setFiltroDesde,
        filtroHasta, setFiltroHasta,
        filtroCategoria, setFiltroCategoria,
        filtroDesdeIngreso, setFiltroDesdeIngreso,
        filtroHastaIngreso, setFiltroHastaIngreso,
        filtroTipoIngreso, setFiltroTipoIngreso,
        mesesTendencia, setMesesTendencia,
        busquedaEmpresa, setBusquedaEmpresa,
        empresasFiltradas,
        showModal, setShowModal,
        editingId, form, setFormField,
        abrirNuevo, abrirEditar, guardarGasto, eliminarGasto,
        showModalIngreso, setShowModalIngreso,
        editingIdIngreso, formIngreso, setFormIngresoField,
        abrirNuevoIngreso, abrirEditarIngreso, guardarIngreso, eliminarIngreso,
        cargarGastos, cargarIngresos,
    };
}
