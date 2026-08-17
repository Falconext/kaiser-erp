import { useState, useEffect, useCallback } from 'react';
import { get } from '@/utils/fetch';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import type { ILoteGestion, ILotesKpis, EstadoLote } from './LotesModel';

const EMPTY_KPIS: ILotesKpis = { totalActivos: 0, porVencer30d: 0, vencidosConStock: 0, valorTotalInventario: 0 };

export const useLotesViewModel = () => {
    const [lotes, setLotes] = useState<ILoteGestion[]>([]);
    const [kpis, setKpis] = useState<ILotesKpis>(EMPTY_KPIS);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 20;
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [estado, setEstado] = useState<EstadoLote>('TODOS');
    const debouncedSearch = useDebounce(search, 400);

    // ── Modales de acción ────────────────────────────────────────
    const [ajusteModal, setAjusteModal] = useState<{ lote: ILoteGestion | null; open: boolean }>({ lote: null, open: false });
    const [editModal, setEditModal] = useState<{ lote: ILoteGestion | null; open: boolean }>({ lote: null, open: false });
    const [desactivarModal, setDesactivarModal] = useState<{ lote: ILoteGestion | null; open: boolean }>({ lote: null, open: false });
    const [kardexModal, setKardexModal] = useState<{ lote: ILoteGestion | null; open: boolean }>({ lote: null, open: false });

    const [kardexData, setKardexData] = useState<any[]>([]);
    const [kardexLoading, setKardexLoading] = useState(false);

    const [ajusteForm, setAjusteForm] = useState({ tipo: 'INCREMENTO' as 'INCREMENTO' | 'DECREMENTO', cantidad: '', motivo: '' });
    const [editForm, setEditForm] = useState({ lote: '', fechaVencimiento: '', costoUnitario: '', proveedor: '' });
    const [actionLoading, setActionLoading] = useState(false);

    const fetchLotes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(limit), estado });
            if (debouncedSearch) params.set('search', debouncedSearch);
            const resp: any = await get(`productos/lotes/todos?${params.toString()}`);
            setLotes(resp?.data?.lotes ?? []);
            setKpis(resp?.data?.kpis ?? EMPTY_KPIS);
            setTotal(resp?.data?.total ?? 0);
        } catch {
            useAlertStore.getState().alert('Error al cargar lotes', 'error');
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, estado]);

    useEffect(() => { setPage(1); }, [debouncedSearch, estado]);
    useEffect(() => { fetchLotes(); }, [fetchLotes]);

    // ── Exportar CSV ─────────────────────────────────────────────
    const exportarExcel = () => {
        const headers = ['Producto', 'Código Prod.', 'Lote', 'Vencimiento', 'Días restantes', 'Estado', 'Stock', 'Costo U. (S/)', 'Valor total (S/)', 'Ventas', 'Proveedor'];
        const rows = lotes.map((l) => [
            l.producto.descripcion,
            l.producto.codigo,
            l.lote,
            l.fechaVencimiento ? new Date(l.fechaVencimiento).toLocaleDateString('es-PE') : '',
            l.diasAlVencimiento,
            l.diasAlVencimiento < 0 ? 'VENCIDO' : l.diasAlVencimiento <= 30 ? 'POR VENCER' : 'VIGENTE',
            l.stockActual,
            l.costoUnitario ?? 0,
            l.valorEnStock.toFixed(2),
            l.totalVentas,
            l.proveedor ?? '',
        ]);
        const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lotes_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Ajustar stock ────────────────────────────────────────────
    const abrirAjuste = (lote: ILoteGestion) => {
        setAjusteForm({ tipo: 'INCREMENTO', cantidad: '', motivo: '' });
        setAjusteModal({ lote, open: true });
    };
    const guardarAjuste = async () => {
        if (!ajusteModal.lote || !ajusteForm.cantidad || Number(ajusteForm.cantidad) <= 0) return;
        setActionLoading(true);
        try {
            await apiClient.patch(`/productos/lotes/${ajusteModal.lote.id}/ajustar-stock`, {
                productoId: ajusteModal.lote.producto.id,
                cantidad: Number(ajusteForm.cantidad),
                tipo: ajusteForm.tipo,
                motivo: ajusteForm.motivo || 'Ajuste manual desde gestión de lotes',
            });
            useAlertStore.getState().alert('Stock ajustado correctamente', 'success');
            setAjusteModal({ lote: null, open: false });
            fetchLotes();
        } catch (e: any) {
            useAlertStore.getState().alert(e.response?.data?.message || 'Error al ajustar stock', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Editar metadatos ─────────────────────────────────────────
    const abrirEdicion = (lote: ILoteGestion) => {
        setEditForm({
            lote: lote.lote,
            fechaVencimiento: lote.fechaVencimiento ? lote.fechaVencimiento.slice(0, 10) : '',
            costoUnitario: lote.costoUnitario != null ? String(lote.costoUnitario) : '',
            proveedor: lote.proveedor ?? '',
        });
        setEditModal({ lote, open: true });
    };
    const guardarEdicion = async () => {
        if (!editModal.lote) return;
        setActionLoading(true);
        try {
            await apiClient.patch(`/productos/lotes/${editModal.lote.id}`, {
                lote: editForm.lote || undefined,
                fechaVencimiento: editForm.fechaVencimiento || undefined,
                costoUnitario: editForm.costoUnitario ? Number(editForm.costoUnitario) : undefined,
                proveedor: editForm.proveedor || undefined,
            });
            useAlertStore.getState().alert('Lote actualizado', 'success');
            setEditModal({ lote: null, open: false });
            fetchLotes();
        } catch (e: any) {
            useAlertStore.getState().alert(e.response?.data?.message || 'Error al actualizar', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Desactivar ───────────────────────────────────────────────
    const guardarDesactivar = async () => {
        if (!desactivarModal.lote) return;
        setActionLoading(true);
        try {
            await apiClient.patch(`/productos/lotes/${desactivarModal.lote.id}/desactivar`);
            useAlertStore.getState().alert('Lote desactivado', 'success');
            setDesactivarModal({ lote: null, open: false });
            fetchLotes();
        } catch (e: any) {
            useAlertStore.getState().alert(e.response?.data?.message || 'Error al desactivar', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // ── Kardex / Ventas ──────────────────────────────────────────
    const abrirKardex = async (lote: ILoteGestion) => {
        setKardexModal({ lote, open: true });
        setKardexLoading(true);
        try {
            const resp: any = await get(`productos/lotes/${lote.id}/kardex`);
            setKardexData(resp?.data ?? []);
        } catch (e) {
            useAlertStore.getState().alert('Error al cargar historial del lote', 'error');
        } finally {
            setKardexLoading(false);
        }
    };

    const pages = Math.max(1, Math.ceil(total / limit));

    return {
        lotes, kpis, total, page, setPage, pages, limit, loading,
        search, setSearch,
        estado, setEstado,
        exportarExcel,
        ajusteModal, setAjusteModal, ajusteForm, setAjusteForm, abrirAjuste, guardarAjuste,
        editModal, setEditModal, editForm, setEditForm, abrirEdicion, guardarEdicion,
        desactivarModal, setDesactivarModal, guardarDesactivar,
        kardexModal, setKardexModal, kardexData, kardexLoading, abrirKardex,
        actionLoading,
    };
};
