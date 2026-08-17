import { useState, useEffect, useRef } from 'react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { resolveTemplate, SLIDER_MAX_COUNT, SLIDER_BANNER_SLOTS } from '@/components/tienda/resolveTemplate';

const defaultForm = {
    slugTienda: '', descripcionTienda: '', whatsappTienda: '',
    facebookUrl: '', instagramUrl: '', tiktokUrl: '', horarioAtencion: '',
    colorPrimario: '#000000', colorSecundario: '#ffffff',
    yapeQrUrl: '', yapeNumero: '', plinQrUrl: '', plinNumero: '',
    aceptaEfectivo: true, costoEnvioFijo: 0, envioGratisDesdeSoles: 0, minimoCompra: 0,
    aceptaRecojo: true, aceptaEnvio: true, direccionRecojo: '', tiempoPreparacionMin: 30,
    bancoNombre: '', numeroCuenta: '', cci: '', monedaCuenta: 'SOLES',
};

export const useConfiguracionTiendaViewModel = (): any => {
    const [config, setConfig] = useState<any>(null);

    // Derived from config: banner slots for the active plantilla
    const templateCfg = resolveTemplate(config?.diseno?.plantillaId);
    // bannerIsSlider: user preference in diseno overrides template default
    const bannerIsSlider: boolean = config?.diseno?.bannerIsSlider ?? templateCfg.bannerIsSlider;
    const bannerSlots = bannerIsSlider ? SLIDER_BANNER_SLOTS : templateCfg.bannerSlots;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ ...defaultForm });
    const { alert } = useAlertStore();

    // Logo state
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const [previewLogoUrl, setPreviewLogoUrl] = useState('');

    // QR state
    const [yapeFile, setYapeFile] = useState<File | null>(null);
    const [plinFile, setPlinFile] = useState<File | null>(null);
    const [yapeUploading, setYapeUploading] = useState(false);
    const [plinUploading, setPlinUploading] = useState(false);
    const [previewYapeUrl, setPreviewYapeUrl] = useState('');
    const [previewPlinUrl, setPreviewPlinUrl] = useState('');
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [deleteQrType, setDeleteQrType] = useState<'yape' | 'plin' | null>(null);

    // Banner state
    const [banners, setBanners] = useState<any[]>([]);
    const [loadingBanners, setLoadingBanners] = useState(false);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [newBannerTitle, setNewBannerTitle] = useState('');
    const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
    const [newBannerLink, setNewBannerLink] = useState('');
    const [newBannerOrden, setNewBannerOrden] = useState<number | ''>('');
    const [productSearch, setProductSearch] = useState('');
    const [productResults, setProductResults] = useState<any[]>([]);
    const [searchingProducts, setSearchingProducts] = useState(false);
    const [editingBanner, setEditingBanner] = useState<any>(null);
    const [editBannerTitle, setEditBannerTitle] = useState('');
    const [editBannerSubtitle, setEditBannerSubtitle] = useState('');
    const [editBannerLink, setEditBannerLink] = useState('');
    const [editBannerOrden, setEditBannerOrden] = useState<number | ''>('');
    const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
    const [editSearch, setEditSearch] = useState('');
    const [editResults, setEditResults] = useState<any[]>([]);
    const [searchingEdit, setSearchingEdit] = useState(false);
    const [storeCategories, setStoreCategories] = useState<any[]>([]);
    const [uploadingTemplateImageField, setUploadingTemplateImageField] = useState('');

    useEffect(() => { cargarConfiguracion(); cargarBanners(); }, []);

    useEffect(() => {
        const t = setTimeout(async () => {
            if (productSearch.trim().length > 2) {
                setSearchingProducts(true);
                try {
                    const { data } = await apiClient.get('/productos', { params: { limit: 5, page: 1, search: productSearch } });
                    const p = data.data;
                    setProductResults(p?.productos || p?.data || p || []);
                } catch { setProductResults([]); } finally { setSearchingProducts(false); }
            } else { setProductResults([]); }
        }, 500);
        return () => clearTimeout(t);
    }, [productSearch]);

    useEffect(() => {
        const t = setTimeout(async () => {
            if (editSearch.trim().length > 2) {
                setSearchingEdit(true);
                try {
                    const { data } = await apiClient.get('/productos', { params: { limit: 5, page: 1, search: editSearch } });
                    const p = data.data;
                    setEditResults(p?.productos || p?.data || p || []);
                } catch { setEditResults([]); } finally { setSearchingEdit(false); }
            } else { setEditResults([]); }
        }, 500);
        return () => clearTimeout(t);
    }, [editSearch]);

    useEffect(() => {
        const cargarCategoriasTienda = async () => {
            if (!formData.slugTienda) {
                setStoreCategories([]);
                return;
            }

            try {
                const { data } = await apiClient.get(`/public/store/${formData.slugTienda}/categories`);
                setStoreCategories(Array.isArray(data?.data) ? data.data : []);
            } catch {
                setStoreCategories([]);
            }
        };

        cargarCategoriasTienda();
    }, [formData.slugTienda]);

    const cargarConfiguracion = async () => {
        try {
            const { data } = await apiClient.get('/tienda/config');
            setConfig(data.data);
            setFormData({
                slugTienda: data.data.slugTienda || '', descripcionTienda: data.data.descripcionTienda || '',
                whatsappTienda: data.data.whatsappTienda || '', facebookUrl: data.data.facebookUrl || '',
                instagramUrl: data.data.instagramUrl || '', tiktokUrl: data.data.tiktokUrl || '',
                horarioAtencion: data.data.horarioAtencion || '', colorPrimario: data.data.colorPrimario || '#000000',
                colorSecundario: data.data.colorSecundario || '#ffffff', yapeQrUrl: data.data.yapeQrUrl || '',
                yapeNumero: data.data.yapeNumero || '', plinQrUrl: data.data.plinQrUrl || '',
                plinNumero: data.data.plinNumero || '', aceptaEfectivo: data.data.aceptaEfectivo ?? true,
                costoEnvioFijo: Number(data.data.costoEnvioFijo || 0), aceptaRecojo: data.data.aceptaRecojo ?? true,
                aceptaEnvio: data.data.aceptaEnvio ?? true, direccionRecojo: data.data.direccionRecojo || '',
                tiempoPreparacionMin: data.data.tiempoPreparacionMin || 30, bancoNombre: data.data.bancoNombre || '',
                numeroCuenta: data.data.numeroCuenta || '', cci: data.data.cci || '', monedaCuenta: data.data.monedaCuenta || 'SOLES',
                envioGratisDesdeSoles: Number(data.data.envioGratisDesdeSoles || 0), minimoCompra: Number(data.data.minimoCompra || 0),
            });
            setPreviewYapeUrl(data.data.yapeQrSignedUrl || data.data.yapeQrUrl || '');
            setPreviewPlinUrl(data.data.plinQrSignedUrl || data.data.plinQrUrl || '');
            setPreviewLogoUrl(data.data.logoSignedUrl || data.data.logo || '');
        } catch (error: any) { alert(error.response?.data?.message || 'Error al cargar configuración', 'error'); }
        finally { setLoading(false); }
    };

    const slugify = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        const nextValue = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: name === 'slugTienda' ? slugify(String(nextValue)) : nextValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload: any = { ...formData };
            ['facebookUrl', 'instagramUrl', 'tiktokUrl', 'yapeQrUrl', 'plinQrUrl'].forEach(k => {
                if (payload[k] === '') delete payload[k];
                else if (typeof payload[k] === 'string' && !/^https?:\/\//i.test(payload[k])) payload[k] = `https://${payload[k]}`;
            });
            if (payload.slugTienda) payload.slugTienda = slugify(payload.slugTienda);
            if (payload.costoEnvioFijo != null && payload.costoEnvioFijo !== '') payload.costoEnvioFijo = Number(payload.costoEnvioFijo);
            if (payload.tiempoPreparacionMin != null && payload.tiempoPreparacionMin !== '') payload.tiempoPreparacionMin = Number(payload.tiempoPreparacionMin);
            await apiClient.patch('/tienda/config', payload);
            alert('Configuración guardada exitosamente', 'success');
            cargarConfiguracion();
        } catch (error: any) { alert(error.response?.data?.message || 'Error al guardar configuración', 'error'); }
        finally { setSaving(false); }
    };

    const subirLogo = async () => {
        if (!logoFile) { alert('Selecciona una imagen primero', 'warning'); return; }
        if (logoFile.size > 2.5 * 1024 * 1024) { alert('El archivo es demasiado grande. Máximo 2.5MB', 'error'); return; }
        setLogoUploading(true);
        try {
            const fd = new FormData(); fd.append('file', logoFile);
            const { data } = await apiClient.post('/tienda/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            const signed = data?.data?.signedUrl || data?.data?.url || data?.signedUrl || data?.url;
            setPreviewLogoUrl(signed);
            setLogoFile(null);
            alert('Logo subido correctamente', 'success');
        } catch (error: any) { alert(error.response?.data?.message || 'Error al subir logo', 'error'); }
        finally { setLogoUploading(false); }
    };

    const eliminarLogo = async () => {
        try {
            await apiClient.patch('/tienda/config', { logo: null });
            setPreviewLogoUrl('');
            setLogoFile(null);
            alert('Logo eliminado correctamente', 'success');
        } catch (error: any) { alert(error.response?.data?.message || 'Error al eliminar logo', 'error'); }
    };

    const subirQr = async (tipo: 'yape' | 'plin') => {
        const file = tipo === 'yape' ? yapeFile : plinFile;
        if (!file) { alert('Selecciona una imagen primero', 'warning'); return; }
        tipo === 'yape' ? setYapeUploading(true) : setPlinUploading(true);
        try {
            const fd = new FormData(); fd.append('file', file);
            const { data } = await apiClient.post(`/tienda/qr/${tipo}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            const url = data?.data?.url || data?.url;
            const signed = data?.data?.signedUrl || data?.signedUrl || url;
            setFormData(prev => ({ ...prev, yapeQrUrl: tipo === 'yape' ? url : prev.yapeQrUrl, plinQrUrl: tipo === 'plin' ? url : prev.plinQrUrl }));
            if (tipo === 'yape') setPreviewYapeUrl(signed);
            if (tipo === 'plin') setPreviewPlinUrl(signed);
            alert('QR subido correctamente', 'success');
        } catch (error: any) { alert(error.response?.data?.message || 'Error al subir QR', 'error'); }
        finally { tipo === 'yape' ? setYapeUploading(false) : setPlinUploading(false); }
    };

    const eliminarQr = (tipo: 'yape' | 'plin') => { setDeleteQrType(tipo); setShowConfirmDelete(true); };

    const confirmarEliminarQr = async () => {
        if (!deleteQrType) return;
        const tipo = deleteQrType;
        setShowConfirmDelete(false); setDeleteQrType(null);
        try {
            setFormData(prev => ({ ...prev, yapeQrUrl: tipo === 'yape' ? '' : prev.yapeQrUrl, plinQrUrl: tipo === 'plin' ? '' : prev.plinQrUrl }));
            if (tipo === 'yape') { setPreviewYapeUrl(''); setYapeFile(null); }
            if (tipo === 'plin') { setPreviewPlinUrl(''); setPlinFile(null); }
            await apiClient.patch('/tienda/config', { [tipo === 'yape' ? 'yapeQrUrl' : 'plinQrUrl']: null });
            alert(`QR de ${tipo.toUpperCase()} eliminado correctamente`, 'success');
        } catch (error: any) { alert(error.response?.data?.message || 'Error al eliminar QR', 'error'); }
    };

    const abrirTienda = () => {
        if (formData.slugTienda) window.open(`/tienda/${formData.slugTienda}`, '_blank');
        else alert('Primero configura el nombre de tu tienda (slug)', 'warning');
    };

    const cargarBanners = async () => {
        try { setLoadingBanners(true); const { data } = await apiClient.get('/banners'); setBanners(data.data || []); }
        catch { } finally { setLoadingBanners(false); }
    };

    const canUploadBanner = bannerIsSlider ? banners.length < SLIDER_MAX_COUNT : banners.length < 6;

    const toggleBannerIsSlider = async (value: boolean) => {
        try {
            await apiClient.patch('/tienda/diseno', { bannerIsSlider: value });
            setConfig((prev: any) => ({
                ...prev,
                diseno: { ...(prev?.diseno || {}), bannerIsSlider: value },
            }));
            alert(value ? 'Modo carrusel activado' : 'Modo clásico activado', 'success');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Error al guardar', 'error');
        }
    };

    const actualizarDiseno = async (campos: Record<string, any>, options?: { silent?: boolean }): Promise<boolean> => {
        try {
            setSaving(true);
            await apiClient.patch('/tienda/diseno', campos);
            setConfig((prev: any) => ({
                ...prev,
                diseno: { ...(prev?.diseno || {}), ...campos },
            }));
            if (!options?.silent) alert('Configuración de diseño guardada', 'success');
            return true;
        } catch (e: any) {
            alert(e.response?.data?.message || 'Error al guardar diseño', 'error');
            return false;
        } finally {
            setSaving(false);
        }
    };

    // Para inputs de texto: refleja el cambio al instante en el preview y guarda
    // tras dejar de escribir (debounce), sin mostrar toast en cada tecla.
    const disenoTextTimers = useRef<Record<string, any>>({});
    const actualizarDisenoTexto = (campos: Record<string, any>) => {
        setConfig((prev: any) => ({
            ...prev,
            diseno: { ...(prev?.diseno || {}), ...campos },
        }));
        const key = Object.keys(campos).join('|');
        if (disenoTextTimers.current[key]) clearTimeout(disenoTextTimers.current[key]);
        disenoTextTimers.current[key] = setTimeout(() => {
            apiClient.patch('/tienda/diseno', campos).catch((e: any) => {
                alert(e.response?.data?.message || 'Error al guardar diseño', 'error');
            });
        }, 700);
    };

    const subirImagenTemplate = async (campo: string, file: File) => {
        if (!file) { alert('Selecciona una imagen primero', 'warning'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('El archivo es demasiado grande. Máximo 5MB', 'error'); return; }
        if (!file.type.startsWith('image/')) { alert('El archivo debe ser una imagen', 'error'); return; }

        setUploadingTemplateImageField(campo);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await apiClient.post(`/tienda/template/imagen/${campo}`, fd);
            const url = data?.data?.url || data?.url;
            setConfig((prev: any) => ({
                ...prev,
                diseno: { ...(prev?.diseno || {}), [campo]: url },
            }));
            alert('Imagen del template actualizada', 'success');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Error al subir imagen del template', 'error');
        } finally {
            setUploadingTemplateImageField('');
        }
    };

    // Sube una imagen suelta (p. ej. de un post del blog) y devuelve su URL.
    // No la escribe en el diseño: el consumidor decide dónde guardarla.
    const subirMediaTemplate = async (file: File): Promise<string | null> => {
        if (!file) { alert('Selecciona una imagen primero', 'warning'); return null; }
        if (file.size > 5 * 1024 * 1024) { alert('El archivo es demasiado grande. Máximo 5MB', 'error'); return null; }
        if (!file.type.startsWith('image/')) { alert('El archivo debe ser una imagen', 'error'); return null; }
        try {
            const fd = new FormData();
            fd.append('file', file);
            const { data } = await apiClient.post('/tienda/template/media', fd);
            return data?.data?.url || data?.url || null;
        } catch (e: any) {
            alert(e.response?.data?.message || 'Error al subir la imagen', 'error');
            return null;
        }
    };

    const subirBanner = async (file: File) => {
        if (!canUploadBanner) { alert(`Límite alcanzado: máximo ${bannerIsSlider ? SLIDER_MAX_COUNT : 6} banners para esta plantilla`, 'warning'); return; }
        if (file.size > 2.5 * 1024 * 1024) { alert('El archivo es demasiado grande. Máximo 2.5MB', 'error'); return; }
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
        if (!allowed.includes(file.type)) { alert('Tipo de archivo no permitido. Solo JPG, PNG o WebP', 'error'); return; }
        setUploadingBanner(true);
        try {
            const autoOrden = bannerIsSlider ? banners.length : banners.length;
            const fd = new FormData(); fd.append('file', file); fd.append('titulo', newBannerTitle || '');
            fd.append('subtitulo', newBannerSubtitle || ''); fd.append('linkUrl', newBannerLink || '');
            fd.append('orden', String(newBannerOrden !== '' ? newBannerOrden : autoOrden));
            await apiClient.post('/banners/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            alert('Banner subido exitosamente', 'success');
            cargarBanners(); setNewBannerTitle(''); setNewBannerSubtitle(''); setNewBannerLink(''); setNewBannerOrden(''); setProductSearch(''); setProductResults([]);
        } catch (error: any) { alert(error.response?.data?.message || 'Error al subir banner', 'error'); }
        finally { setUploadingBanner(false); }
    };

    const eliminarBanner = async (id: number) => {
        try { await apiClient.delete(`/banners/${id}`); alert('Banner eliminado exitosamente', 'success'); cargarBanners(); }
        catch (error: any) { alert(error.response?.data?.message || 'Error al eliminar banner', 'error'); }
    };

    const openEditModal = (banner: any) => {
        setEditingBanner(banner); setEditBannerTitle(banner.titulo || ''); setEditBannerSubtitle(banner.subtitulo || '');
        setEditBannerLink(banner.linkUrl || ''); setEditBannerOrden(banner.orden ?? ''); setEditBannerFile(null); setEditSearch('');
    };

    const handleUpdateBanner = async () => {
        if (!editingBanner) return;
        setSaving(true);
        try {
            const fd = new FormData();
            fd.append('titulo', editBannerTitle || '');
            fd.append('subtitulo', editBannerSubtitle || '');
            fd.append('linkUrl', editBannerLink || '');
            if (editBannerFile) fd.append('file', editBannerFile);
            if (editBannerOrden !== '' && editBannerOrden !== undefined) fd.append('orden', String(editBannerOrden));
            await apiClient.patch(`/banners/${editingBanner.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            alert('Banner actualizado correctamente', 'success');
            setEditingBanner(null); setEditBannerTitle(''); setEditBannerSubtitle(''); setEditBannerLink(''); setEditBannerOrden(''); setEditBannerFile(null); setEditSearch('');
            cargarBanners();
        } catch (error: any) { alert(error.response?.data?.message || 'Error al actualizar banner', 'error'); }
        finally { setSaving(false); }
    };

    const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) subirBanner(file); };

    const getCategoryLabel = (category: any) => {
        if (typeof category === 'string') return category;
        return category?.nombre || category?.name || '';
    };

    const generarLinkCatalogoCategoria = (categoryName: string) => {
        if (!formData.slugTienda || !categoryName) return '';
        return `/tienda/${formData.slugTienda}/catalogo?category=${encodeURIComponent(categoryName)}`;
    };

    return {
        config, loading, saving, formData, handleChange, handleSubmit, abrirTienda, slugify,
        logoFile, setLogoFile, logoUploading, previewLogoUrl, subirLogo, eliminarLogo,
        yapeFile, setYapeFile, plinFile, setPlinFile, yapeUploading, plinUploading, previewYapeUrl, previewPlinUrl, subirQr, eliminarQr, showConfirmDelete, setShowConfirmDelete, confirmarEliminarQr, deleteQrType,
        bannerSlots, bannerIsSlider, canUploadBanner, toggleBannerIsSlider,
        banners, loadingBanners, uploadingBanner, newBannerTitle, setNewBannerTitle, newBannerSubtitle, setNewBannerSubtitle, newBannerLink, setNewBannerLink, newBannerOrden, setNewBannerOrden,
        productSearch, setProductSearch, productResults, searchingProducts, subirBanner, eliminarBanner, handleBannerFileChange,
        editingBanner, setEditingBanner, editBannerTitle, setEditBannerTitle, editBannerSubtitle, setEditBannerSubtitle, editBannerLink, setEditBannerLink, editBannerOrden, setEditBannerOrden,
        editBannerFile, setEditBannerFile, editSearch, setEditSearch, editResults, searchingEdit, openEditModal, handleUpdateBanner,
        storeCategories, getCategoryLabel, generarLinkCatalogoCategoria, actualizarDiseno, actualizarDisenoTexto, subirImagenTemplate, subirMediaTemplate, uploadingTemplateImageField,
    };
};
