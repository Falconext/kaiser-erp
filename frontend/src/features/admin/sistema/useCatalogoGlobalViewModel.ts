import { useState, useEffect } from 'react';
import { usePlantillasStore } from '@/zustand/plantillas';
import { useEmpresasStore } from '@/zustand/empresas';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';

export const useCatalogoGlobalViewModel = (): any => {
    const { plantillas, total, loading, page, limit, search, rubroId, setPage, setLimit, setSearch, setRubroId, getPlantillas, deletePlantilla, deletePlantillasMasivo, updateLocalPlantilla } = usePlantillasStore();
    const { listarEmpresas, empresas } = useEmpresasStore();
    const { alert } = useAlertStore();

    const [rubros, setRubros] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [form, setForm] = useState<any>({});
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [modalConfirmOpen, setModalConfirmOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isModalImportOpen, setIsModalImportOpen] = useState(false);
    const [empresaIdToImport, setEmpresaIdToImport] = useState<number | undefined>(undefined);
    const [rubroIdToImport, setRubroIdToImport] = useState<number | undefined>(undefined);
    const [categorizando, setCategorizando] = useState(false);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [actionLoading, setActionLoading] = useState(false);
    const [buscandoImagenes, setBuscandoImagenes] = useState(false);
    const [processingId, setProcessingId] = useState<number | null>(null);

    useEffect(() => { loadRubros(); listarEmpresas(); getPlantillas(true); }, []);

    const loadRubros = async () => {
        try {
            const response = await apiClient.get('/rubro');
            const data = response.data;
            setRubros(Array.isArray(data) ? data : (data?.data || []));
        } catch (error) { console.error(error); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let plantillaId: number | null | undefined = isEdit && form.id ? form.id : null;
            const payload = { nombre: form.nombre, descripcion: form.descripcion, precioSugerido: Number(form.precioSugerido), rubroId: Number(form.rubroId), categoria: form.categoria, imagenUrl: form.imagenUrl, unidadConteo: form.unidadConteo || 'NIU', marca: form.marca };
            if (isEdit && form.id) { await apiClient.post(`/plantillas/${form.id}`, payload); alert('Plantilla actualizada', 'success'); updateLocalPlantilla(form.id, payload); }
            else { const { data } = await apiClient.post('/plantillas', payload); plantillaId = data.id; alert('Plantilla creada', 'success'); }
            if (selectedFile && plantillaId) {
                const formData = new FormData(); formData.append('file', selectedFile);
                const { data } = await apiClient.post(`/plantillas/${plantillaId}/imagen`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                alert('Imagen subida', 'success');
                if (data.url || data.imagenUrl) updateLocalPlantilla(plantillaId!, { imagenUrl: data.url || data.imagenUrl });
            }
            setIsModalOpen(false); setSelectedFile(null); getPlantillas(true);
        } catch (error: any) { alert(error.response?.data?.message || 'Error al guardar', 'error'); }
    };

    const openDelete = (id: number) => {
        setDeleteId(id);
        setModalConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try { await deletePlantilla(deleteId); alert('Plantilla eliminada', 'success'); setModalConfirmOpen(false); }
        catch (error: any) { alert(error.response?.data?.message || 'Error al eliminar', 'error'); }
    };

    const handleImportFromCompany = async () => {
        if (!empresaIdToImport || !rubroIdToImport) return;
        try {
            const { data } = await apiClient.post('/plantillas/importar-de-empresa', { empresaId: empresaIdToImport, rubroId: rubroIdToImport });
            alert(data.message || `Importación completada: ${data.importados} productos`, 'success');
            setIsModalImportOpen(false); setEmpresaIdToImport(undefined); setRubroIdToImport(undefined); getPlantillas(true);
        } catch (error: any) { alert(error.response?.data?.message || 'Error al importar', 'error'); }
    };

    const openNew = () => { setForm({ rubroId: rubros[0]?.id }); setSelectedFile(null); setIsEdit(false); setIsModalOpen(true); };

    const openEdit = (item: any) => {
        const original = plantillas.find(p => p.id === item.id);
        if (original) { setForm(original); setSelectedFile(null); setIsEdit(true); setIsModalOpen(true); }
    };

    const handleCategorizarIA = async () => {
        try {
            setCategorizando(true);
            const { data } = await apiClient.post('/plantillas/categorizar-ia', { rubroId, soloSinCategoria: false });
            if (data.success) { alert(`✅ ${data.message}. Procesados: ${data.procesados} de ${data.total}`, 'success'); getPlantillas(true); }
            else alert(data.message || 'Error al categorizar', 'error');
        } catch (error: any) { alert(error.response?.data?.message || 'Error al categorizar con IA', 'error'); }
        finally { setCategorizando(false); }
    };

    const toggleSelect = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const toggleSelectAll = () => setSelectedIds(selectedIds.length === plantillas.length && plantillas.length > 0 ? [] : plantillas.map(p => p.id));

    const clearSelection = () => setSelectedIds([]);

    const handleBuscarImagenesFaltantes = async () => {
        const sinImagen = plantillas.filter(p => !p.imagenUrl);
        if (sinImagen.length === 0) { alert('No hay productos sin imagen en esta página.', 'info'); return; }
        if (!window.confirm(`Se buscarán imágenes para ${sinImagen.length} productos. ¿Continuar?`)) return;
        setBuscandoImagenes(true); let count = 0;
        try {
            for (const p of sinImagen) {
                try {
                    setProcessingId(p.id);
                    const { data } = await apiClient.post('/plantillas/search-image', { id: p.id, nombre: p.nombre });
                    if (data.success && data.url) { count++; updateLocalPlantilla(p.id, { imagenUrl: data.url }); }
                    await new Promise(r => setTimeout(r, 200));
                } catch { }
            }
            setProcessingId(null); getPlantillas(true);
            alert(`Proceso finalizado. Se encontraron ${count} imágenes nuevas.`, 'success');
        } catch { } finally { setBuscandoImagenes(false); }
    };

    const handleBulkDeleteImages = async () => {
        if (!window.confirm(`¿Estás seguro de eliminar las IMÁGENES de ${selectedIds.length} productos?`)) return;
        try { setActionLoading(true); await apiClient.post('/plantillas/masivo/delete-images', { ids: selectedIds }); alert('Imágenes eliminadas', 'success'); selectedIds.forEach(id => updateLocalPlantilla(id, { imagenUrl: '' })); setSelectedIds([]); }
        catch (error: any) { alert(error.response?.data?.message || 'Error al eliminar imágenes', 'error'); }
        finally { setActionLoading(false); }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`¿Estás seguro de ELIMINAR ${selectedIds.length} PRODUCTOS del catálogo?`)) return;
        try { setActionLoading(true); await deletePlantillasMasivo(selectedIds); alert('Productos eliminados', 'success'); setSelectedIds([]); }
        catch (error: any) { alert(error.response?.data?.message || 'Error', 'error'); }
        finally { setActionLoading(false); }
    };

    return {
        plantillas, total, loading, page, limit, search, rubroId,
        rubros, empresas, form, setForm, selectedFile, setSelectedFile,
        isModalOpen, setIsModalOpen, isEdit, modalConfirmOpen, setModalConfirmOpen,
        isModalImportOpen, setIsModalImportOpen, empresaIdToImport, setEmpresaIdToImport,
        rubroIdToImport, setRubroIdToImport, categorizando, selectedIds,
        actionLoading, buscandoImagenes, processingId,
        setPage, setLimit, setSearch, setRubroId,
        handleSubmit, handleDelete, handleImportFromCompany,
        openDelete,
        openNew, openEdit, handleCategorizarIA,
        toggleSelect, toggleSelectAll,
        clearSelection,
        handleBuscarImagenesFaltantes, handleBulkDeleteImages, handleBulkDelete,
    };
};
