import { useState, useEffect } from 'react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useModulosStore } from '@/zustand/modulos';
import { useAuthStore } from '@/zustand/auth';

export interface Plan {
    id: number; nombre: string; descripcion?: string; costo: number;
    plataforma?: string;
    producto?: 'facturacion' | 'hotel' | 'restaurante';
    duracionDias: number; limiteUsuarios: number; maxSedes: number;
    maxImagenesProducto: number;
    maxBanners: number; maxComprobantes: number; esPrueba: boolean;
    tieneTienda: boolean; tieneBanners: boolean; tieneGaleria: boolean;
    tieneCulqi: boolean; tieneDeliveryGPS: boolean; tieneTicketera: boolean;
    tieneGestionLotes: boolean; tieneGestionProvisiones: boolean; tieneDescripcionRica: boolean;
    tieneAnalisisFinancieroAvanzado: boolean; tieneMultiplesSedes: boolean;
    tieneAutoGenerarImagen: boolean; tieneLocalizacion: boolean;
    features?: Record<string, boolean>;
    _count?: { empresas: number };
    modulosAsignados?: { modulo: { id: number; codigo: string; nombre: string; descripcion: string; icono: string; } }[];
    subModulosAsignados?: { subModulo: { id: number; codigo: string; nombre: string; moduloId: number } }[];
}

export interface PlanFeatureCatalogItem {
    key: keyof Pick<Plan,
        'esPrueba' | 'tieneTienda' | 'tieneBanners' | 'tieneGaleria' | 'tieneCulqi' |
        'tieneDeliveryGPS' | 'tieneTicketera' | 'tieneGestionLotes' | 'tieneGestionProvisiones' | 'tieneDescripcionRica' |
        'tieneAnalisisFinancieroAvanzado' | 'tieneMultiplesSedes' | 'tieneAutoGenerarImagen' | 'tieneLocalizacion'
    >;
    label: string;
    description: string;
    group: 'general' | 'tienda' | 'ventas' | 'operaciones' | 'inventario';
    icon: string;
    dependsOn?: PlanFeatureCatalogItem['key'];
    limits?: Array<{
        key: keyof Pick<Plan, 'maxBanners' | 'maxImagenesProducto' | 'maxComprobantes' | 'maxSedes' | 'limiteUsuarios'>;
        label: string;
        hint?: string;
    }>;
}

const initialForm: Partial<Plan> & { moduloIds?: number[]; subModuloIds?: number[] } = {
    plataforma: 'default',
    producto: 'facturacion',
    nombre: '', descripcion: '', costo: 0, duracionDias: 30,
    limiteUsuarios: 1, maxSedes: 1, maxImagenesProducto: 1, maxBanners: 0, maxComprobantes: 100,
    esPrueba: false, tieneTienda: false, tieneBanners: false, tieneGaleria: false,
    tieneCulqi: false, tieneDeliveryGPS: false, tieneTicketera: false,
    tieneGestionLotes: false, tieneGestionProvisiones: false, tieneDescripcionRica: false,
    tieneAnalisisFinancieroAvanzado: false, tieneMultiplesSedes: false,
    tieneAutoGenerarImagen: false, tieneLocalizacion: false,
    moduloIds: [], subModuloIds: [],
};

export const usePlanesViewModel = () => {
    const [planes, setPlanes] = useState<Plan[]>([]);
    const [featureCatalog, setFeatureCatalog] = useState<PlanFeatureCatalogItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [showFeaturesModal, setShowFeaturesModal] = useState(false);
    const [showModulesModal, setShowModulesModal] = useState(false);
    const [form, setForm] = useState<Partial<Plan> & { moduloIds?: number[]; subModuloIds?: number[] }>(initialForm);
    const [modalConfirmOpen, setModalConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const { alert } = useAlertStore();
    const { getAllModulos } = useModulosStore();
    const { auth } = useAuthStore();
    // Sistema unificado: la plataforma (plataforma múltiple) fue eliminada. Se usa
    // un valor neutro 'default' y ya no se filtra ni scopea por plataforma.
    const plataformaScope = '' as string;
    const productoScope = (String(auth?.sistemaProducto || '').toLowerCase() === 'hotel' ? 'hotel' : String(auth?.sistemaProducto || '').toLowerCase() === 'restaurante' ? 'restaurante' : String(auth?.sistemaProducto || '').toLowerCase() === 'facturacion' ? 'facturacion' : '') as '' | 'facturacion' | 'hotel' | 'restaurante';
    const [plataformaFiltro, setPlataformaFiltro] = useState<string>('');
    const [productoFiltro, setProductoFiltro] = useState<'' | 'facturacion' | 'hotel' | 'restaurante'>(productoScope);

    useEffect(() => {
        setProductoFiltro(productoScope);
    }, [productoScope]);

    useEffect(() => {
        loadPlanes();
    }, [productoFiltro, productoScope, plataformaFiltro, plataformaScope]);

    useEffect(() => {
        loadFeatureCatalog();
    }, []);

    const loadFeatureCatalog = async () => {
        try {
            const { data } = await apiClient.get('/plan/features/catalog');
            setFeatureCatalog(Array.isArray(data) ? data : (data.data || []));
        } catch {
            setFeatureCatalog([]);
        }
    };

    const loadPlanes = async () => {
        try {
            setLoading(true);
            const producto = productoScope || productoFiltro;
            const params = new URLSearchParams();
            if (producto) params.set('producto', producto);
            const qs = params.toString() ? `?${params.toString()}` : '';
            const { data } = await apiClient.get(`/plan${qs}`);
            const raw: Plan[] = Array.isArray(data) ? data : (data.data || []);
            const seen = new Set<number>();
            setPlanes(raw.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; }));
        } catch { alert('Error al cargar planes', 'error'); }
        finally { setLoading(false); }
    };

    const handleOpenCreate = () => {
        setIsEdit(false);
        const plataforma = 'default';
        const producto = productoScope || 'facturacion';
        setForm({ ...initialForm, plataforma, producto, moduloIds: [], subModuloIds: [] });
        getAllModulos(true, producto);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (plan: Plan) => {
        const plataforma = plan.plataforma || 'default';
        const producto = (plan.producto || 'facturacion') as 'facturacion' | 'hotel' | 'restaurante';
        setIsEdit(true);
        setCurrentId(plan.id);
        setForm({
            ...plan,
            ...(plan.features || {}),
            plataforma,
            producto,
            moduloIds: plan.modulosAsignados?.map(m => m.modulo.id) || [],
            subModuloIds: plan.subModulosAsignados?.map(s => s.subModulo.id) || [],
        });
        getAllModulos(true, producto);
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.nombre || form.costo === undefined) { alert('Nombre y costo son obligatorios', 'warning'); return; }
        try {
            setLoading(true);
            // Quita campos de relación/solo-lectura que el backend no acepta en el DTO
            const { id, _count, modulosAsignados, subModulosAsignados, creadoEn, createdAt, updatedAt, features, ...formData } = form as any;
            const payload = {
                ...formData,
                features: (featureCatalog.length ? featureCatalog : []).reduce((acc, feature) => {
                    acc[feature.key] = Boolean((form as any)[feature.key]);
                    return acc;
                }, {} as Record<string, boolean>),
                plataforma: form.plataforma || 'default',
                producto: (productoScope || form.producto || 'facturacion') as 'facturacion' | 'hotel' | 'restaurante',
                costo: Number(form.costo),
                duracionDias: Number(form.duracionDias),
                limiteUsuarios: Number(form.limiteUsuarios),
                maxSedes: Number(form.maxSedes ?? 1),
                maxImagenesProducto: Number(form.maxImagenesProducto),
                maxBanners: Number(form.maxBanners),
            };
            if (isEdit && currentId) {
                await apiClient.put(`/plan/${currentId}`, payload);
                alert('Plan actualizado', 'success');
            } else {
                await apiClient.post('/plan', payload);
                alert('Plan creado', 'success');
            }
            setIsModalOpen(false);
            await loadPlanes();
        } catch (error: any) { alert(error.response?.data?.message || 'Error al guardar', 'error'); }
        finally { setLoading(false); }
    };

    const confirmDelete = (id: number) => { setDeleteId(id); setModalConfirmOpen(true); };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await apiClient.delete(`/plan/${deleteId}`);
            alert('Plan eliminado', 'success');
            setModalConfirmOpen(false);
            loadPlanes();
        } catch (error: any) { alert(error.response?.data?.message || 'Error al eliminar', 'error'); }
    };

    return {
        planes, loading, featureCatalog,
        plataformaFiltro, setPlataformaFiltro,
        productoFiltro, setProductoFiltro,
        isModalOpen, setIsModalOpen, isEdit, form, setForm,
        showFeaturesModal, setShowFeaturesModal,
        showModulesModal, setShowModulesModal,
        modalConfirmOpen, setModalConfirmOpen,
        handleOpenCreate, handleOpenEdit, handleSubmit, confirmDelete, handleDelete,
    };
};
