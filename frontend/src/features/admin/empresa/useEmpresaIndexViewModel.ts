import { useState, useEffect } from 'react';
import { useEmpresasStore } from '@/zustand/empresas';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import { post } from '@/utils/fetch';
import apiClient from '@/utils/apiClient';

const DAY_MS = 86400000;

const normalizeDateOnly = (value?: string | Date | null): string => {
    if (!value) return '';
    const raw = typeof value === 'string' ? value : value.toISOString();
    const iso = raw.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
};

const formatDateOnly = (value?: string | Date | null): string => {
    const iso = normalizeDateOnly(value);
    if (!iso) return '-';
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
};

const getDaysUntilDate = (value?: string | Date | null): number | null => {
    const iso = normalizeDateOnly(value);
    if (!iso) return null;
    const [year, month, day] = iso.split('-').map(Number);
    const today = new Date();
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const targetUtc = Date.UTC(year, month - 1, day);
    return Math.ceil((targetUtc - todayUtc) / DAY_MS);
};

const formatDaysUntil = (days: number | null): string => {
    if (days === null) return '-';
    if (days < 0) {
        const expiredDays = Math.abs(days);
        return `Vencido hace ${expiredDays} día${expiredDays === 1 ? '' : 's'}`;
    }
    if (days === 0) return 'Vence hoy';
    return `${days} día${days === 1 ? '' : 's'}`;
};

const normalizeWhatsappPhone = (value?: string | null): string => {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 9) return `51${digits}`;
    if (digits.length === 11 && digits.startsWith('51')) return digits;
    return digits;
};

export const useEmpresaIndexViewModel = (): any => {
    const { empresas, totalEmpresas, currentPage, totalPages, loading, error, listarEmpresas, cambiarEstadoEmpresa, eliminarEmpresa } = useEmpresasStore();
    const { success } = useAlertStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [tipoFiltro, setTipoFiltro] = useState<'FORMAL' | 'INFORMAL' | ''>('');
    const [estadoFiltro, setEstadoFiltro] = useState<'ACTIVO' | 'INACTIVO' | 'TODOS'>('TODOS');
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [isOpenModalConfirm, setIsOpenModalConfirm] = useState(false);
    const [selectedEmpresa, setSelectedEmpresa] = useState<any>(null);
    const [currentPageState, setCurrentPageState] = useState(1);
    const [openEmpresaModal, setOpenEmpresaModal] = useState(false);
    const [empresaModalMode, setEmpresaModalMode] = useState<'create' | 'edit'>('create');
    const [empresaEditingId, setEmpresaEditingId] = useState<number | undefined>(undefined);

    const debounceSearch = useDebounce(searchTerm, 1000);

    const indexOfLastItem = currentPageState * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const pages = Array.from({ length: Math.ceil(totalEmpresas / itemsPerPage) }, (_, i) => i + 1);

    useEffect(() => {
        listarEmpresas({ search: debounceSearch, page: currentPageState, limit: itemsPerPage, sort: 'id', order: 'desc', estado: estadoFiltro, tipoEmpresa: tipoFiltro });
    }, [debounceSearch, currentPageState, itemsPerPage, estadoFiltro, tipoFiltro]);

    // Exporta el listado filtrado de empresas en PDF o Excel
    const [exportando, setExportando] = useState<'pdf' | 'excel' | null>(null);
    const exportarEmpresas = async (formato: 'pdf' | 'excel') => {
        if (exportando) return;
        setExportando(formato);
        try {
            const params = new URLSearchParams({ formato });
            if (debounceSearch) params.set('search', debounceSearch);
            if (estadoFiltro !== 'TODOS') params.set('estado', estadoFiltro);
            if (tipoFiltro) params.set('tipoEmpresa', tipoFiltro);
            const resp = await apiClient.get(`/empresa/exportar?${params.toString()}`, {
                responseType: 'blob',
                timeout: 60_000,
            });
            const url = window.URL.createObjectURL(new Blob([resp.data as any]));
            const link = document.createElement('a');
            link.href = url;
            link.download = `empresas.${formato === 'pdf' ? 'pdf' : 'xlsx'}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch {
            useAlertStore.getState().alert('No se pudo exportar el listado de empresas', 'error');
        } finally {
            setExportando(null);
        }
    };

    useEffect(() => { if (success === true) { setIsOpenModalConfirm(false); setSelectedEmpresa(null); } }, [success]);

    const handleSearch = (e: any) => { setSearchTerm(e.target.value); setCurrentPageState(1); };
    const handleEdit = (empresa: any) => { setEmpresaEditingId(empresa.id); setEmpresaModalMode('edit'); setOpenEmpresaModal(true); };
    const handleToggleState = (empresa: any) => { setSelectedEmpresa({ ...empresa, accion: 'cambiarEstado' }); setIsOpenModalConfirm(true); };
    const handleDelete = (empresa: any) => { setSelectedEmpresa({ ...empresa, accion: 'eliminar' }); setIsOpenModalConfirm(true); };

    const confirmAction = async () => {
        if (!selectedEmpresa) return;
        if (selectedEmpresa.accion === 'cambiarEstado') await cambiarEstadoEmpresa(selectedEmpresa.id, selectedEmpresa.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
        else if (selectedEmpresa.accion === 'eliminar') await eliminarEmpresa(selectedEmpresa.id);
        setIsOpenModalConfirm(false); setSelectedEmpresa(null);
    };

    const empresasTable = empresas?.map((empresa: any) => {
        const ambienteDisplay = empresa.ambienteFacturacion ?? (empresa.usaDemo ? 'DEMO' : 'PRODUCCIÓN');
        const tiendaEstado = empresa.plan?.tieneTienda && empresa?.slugTienda ? 'Activa' : empresa.plan?.tieneTienda && !empresa?.slugTienda ? 'Disponible' : 'No disponible';
        const diasRestantes = getDaysUntilDate(empresa.fechaExpiracion);
        const adminPrincipal = empresa.usuarios?.[0];
        return {
            id: empresa.id,
            'RUC': empresa.ruc,
            'Razon Social': empresa.razonSocial,
            nombreComercial: empresa.nombreComercial,
            adminNombre: adminPrincipal?.nombre || '',
            adminCelular: adminPrincipal?.celular || '',
            'Ambiente': ambienteDisplay,
            'Rubro': empresa?.rubro?.nombre || '-',
            'Reseller': empresa?.reseller?.nombre || '',
            resellerCodigo: empresa?.reseller?.codigo || '',
            'Plan': empresa.plan?.nombre || '-',
            'Tienda Virtual': tiendaEstado,
            fechaExpiracion: formatDateOnly(empresa.fechaExpiracion),
            'Vence en': formatDaysUntil(diasRestantes),
            estado: empresa.estado,
            // Uso del sistema: comprobantes emitidos (boleta / factura / nota de venta)
            comprobantes: empresa.comprobantes ?? { boletas: 0, facturas: 0, notasVenta: 0, total: 0 },
        };
    }) || [];

    const [drawerEmpresa, setDrawerEmpresa] = useState<any>(null);
    const [alertasDismissed, setAlertasDismissed] = useState(false);
    const [filtroPorVencer, setFiltroPorVencer] = useState(false);

    const getDiasRestantes = (fechaExpiracion: string) => getDaysUntilDate(fechaExpiracion) ?? 0;

    const proximasVencer = (empresas || []).filter((e: any) => {
        if (!e.fechaExpiracion) return false;
        const dias = getDiasRestantes(e.fechaExpiracion);
        return dias >= 0 && dias <= 7;
    });

    const handleViewDetails = (row: any) => {
        const full = empresas?.find((e: any) => e.id === row.id);
        setDrawerEmpresa(full ?? row);
    };

    const refreshEmpresas = () => listarEmpresas({ search: debounceSearch, page: currentPageState, limit: itemsPerPage, sort: 'id', order: 'desc' });

    const handleEnviarRecordatorioEmail = async (row: any) => {
        if (row.estado !== 'ACTIVO') {
            useAlertStore.getState().alert('Solo se puede recordar a empresas activas', 'warning');
            return;
        }
        const resp = await post(`empresa/${row.id}/enviar-email`, { tipo: 'RECORDATORIO' });
        if (resp.success === false || resp.error) {
            useAlertStore.getState().alert(resp.error || 'No se pudo enviar el correo de recordatorio', 'error');
            return;
        }
        useAlertStore.getState().alert('Correo de recordatorio enviado correctamente', 'success');
    };

    const handleEnviarRecordatorioWhatsapp = async (row: any) => {
        if (row.estado !== 'ACTIVO') {
            useAlertStore.getState().alert('Solo se puede recordar a empresas activas', 'warning');
            return;
        }
        const phone = normalizeWhatsappPhone(row.adminCelular);
        if (!phone) {
            useAlertStore.getState().alert('La empresa no tiene celular de administrador activo', 'warning');
            return;
        }
        const empresaNombre = row.nombreComercial || row['Razon Social'] || 'tu empresa';
        const fechaExpiracion = row.fechaExpiracion && row.fechaExpiracion !== '-' ? row.fechaExpiracion : 'por confirmar';
        const estadoVencimiento = String(row['Vence en'] || '').toLowerCase();
        const mensaje = [
            `Hola ${row.adminNombre || 'equipo'}, te recordamos que la suscripción de ${empresaNombre} ${estadoVencimiento}.`,
            `Plan actual: ${row.Plan || 'Suscripción activa'}.`,
            `Fecha de vencimiento: ${fechaExpiracion}.`,
            'Renueva a tiempo para mantener activo tu acceso, facturación, inventario, ventas y tienda virtual.',
        ].join('\n');

        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener,noreferrer');
    };

    const empresasTableFiltradas = filtroPorVencer
        ? empresasTable.filter((e: any) => {
            const full = empresas?.find((emp: any) => emp.id === e.id);
            if (!full?.fechaExpiracion) return false;
            const dias = getDiasRestantes(full.fechaExpiracion);
            return dias >= 0 && dias <= 7;
        })
        : empresasTable;

    return { exportando, exportarEmpresas, empresas, empresasTable: empresasTableFiltradas, totalEmpresas, loading, error, searchTerm, tipoFiltro, estadoFiltro, itemsPerPage, currentPageState, setCurrentPageState, setItemsPerPage, pages, indexOfFirstItem, indexOfLastItem, isOpenModalConfirm, setIsOpenModalConfirm, selectedEmpresa, openEmpresaModal, setOpenEmpresaModal, empresaModalMode, empresaEditingId, setEmpresaEditingId, setEmpresaModalMode, handleSearch, handleEdit, handleToggleState, handleDelete, confirmAction, refreshEmpresas, setTipoFiltro, setEstadoFiltro, drawerEmpresa, setDrawerEmpresa, handleViewDetails, proximasVencer, alertasDismissed, setAlertasDismissed, filtroPorVencer, setFiltroPorVencer, getDiasRestantes, handleEnviarRecordatorioEmail, handleEnviarRecordatorioWhatsapp };
};
