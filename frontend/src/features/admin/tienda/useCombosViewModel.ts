import { useState, useEffect, useRef } from 'react';
import { useCombosStore, Combo } from '@/zustand/combos';
import { useProductsStore } from '@/zustand/products';
import { useThemeStore } from '@/zustand/theme';
import { getThemeColor } from '@/utils/themeConfig';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';

const initialForm = {
    nombre: '', descripcion: '', imagenUrl: '', precioCombo: 0,
    activo: true, fechaInicio: '', fechaFin: '',
    items: [] as { productoId: number; cantidad: number }[],
};

export const useCombosViewModel = () => {
    const { combos, loading, fetchCombos, createCombo, updateCombo, deleteCombo, toggleActivo: toggleComboActivo } = useCombosStore();
    const { products, getAllProducts } = useProductsStore();
    const { sidebarColor } = useThemeStore();
    const t = getThemeColor(sidebarColor);

    const [showModal, setShowModal] = useState(false);
    const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState(initialForm);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchCombos(true);
        getAllProducts({ limit: 500 });
    }, []);

    const refreshCombos = () => {
        fetchCombos(true);
    };

    const abrirModal = (combo?: Combo) => {
        if (combo) {
            setEditingCombo(combo);
            setForm({
                nombre: combo.nombre, descripcion: combo.descripcion || '',
                imagenUrl: combo.imagenUrl || '', precioCombo: Number(combo.precioCombo),
                activo: combo.activo, fechaInicio: combo.fechaInicio ? combo.fechaInicio.split('T')[0] : '',
                fechaFin: combo.fechaFin ? combo.fechaFin.split('T')[0] : '',
                items: combo.items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
            });
        } else {
            setEditingCombo(null);
            setForm(initialForm);
        }
        setShowModal(true);
    };

    const cerrarModal = () => { setShowModal(false); setEditingCombo(null); };

    const agregarProducto = () => setForm(prev => ({ ...prev, items: [...prev.items, { productoId: 0, cantidad: 1 }] }));

    const actualizarItem = (index: number, field: 'productoId' | 'cantidad', value: number) => {
        setForm(prev => ({ ...prev, items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item) }));
    };

    const eliminarItem = (index: number) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

    const getProductOptionLabel = (productoId: number) => {
        const product = products.find((p) => Number(p.id) === Number(productoId));
        if (!product) return '';
        return `${String(product.descripcion || '').toUpperCase()} - S/ ${Number(product.precioUnitario || 0).toFixed(2)}`;
    };

    const calcularPrecioRegular = () => form.items.reduce((sum, item) => {
        const producto = products.find((p) => p.id === item.productoId);
        return producto ? sum + Number(producto.precioUnitario) * item.cantidad : sum;
    }, 0);

    const calcularDescuento = () => {
        const precioRegular = calcularPrecioRegular();
        return precioRegular === 0 ? 0 : ((precioRegular - form.precioCombo) / precioRegular) * 100;
    };

    const guardarCombo = async () => {
        if (!form.nombre.trim()) return useAlertStore.getState().alert('El nombre es requerido', 'error');
        if (form.items.length < 2) return useAlertStore.getState().alert('Un kit debe tener al menos 2 productos', 'error');
        if (form.items.some(i => i.productoId === 0)) return useAlertStore.getState().alert('Selecciona todos los productos', 'error');
        if (form.precioCombo <= 0) return useAlertStore.getState().alert('El precio del kit debe ser mayor a 0', 'error');
        if (form.precioCombo >= calcularPrecioRegular()) return useAlertStore.getState().alert('El precio del kit debe ser menor al precio regular', 'error');

        const payload = {
            nombre: form.nombre, descripcion: form.descripcion || undefined,
            imagenUrl: form.imagenUrl || undefined, precioCombo: form.precioCombo,
            activo: form.activo, fechaInicio: form.fechaInicio || undefined,
            fechaFin: form.fechaFin || undefined, items: form.items,
        };

        const success = editingCombo ? await updateCombo(editingCombo.id, payload) : await createCombo(payload);
        if (success) cerrarModal();
    };

    const handleUploadImage = async (comboId: number, file: File) => {
        try {
            setUploading(true);
            const fd = new FormData();
            fd.append('file', file);
            const resp = await apiClient.post(`/combos/${comboId}/imagen`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const nuevaUrl = resp.data?.url || resp.data?.imagenUrl || resp.data?.data?.url;
            if (nuevaUrl) setForm(prev => ({ ...prev, imagenUrl: nuevaUrl }));
            await fetchCombos(true);
            useAlertStore.getState().alert('Imagen subida correctamente', 'success');
        } catch (error: unknown) {
            const err = error as {
                response?: {
                    data?: {
                        message?: string;
                    };
                };
            };
            useAlertStore.getState().alert(
                err.response?.data?.message || 'Error al subir imagen',
                'error',
            );
        } finally {
            setUploading(false);
        }
    };

    const onFileSelect = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (editingCombo) await handleUploadImage(editingCombo.id, file);
        else useAlertStore.getState().alert('Primero guarda el kit para poder subir la imagen al servidor.', 'info');
    };

    const handleEliminarCombo = async (id: number) => {
        if (!confirm('¿Estás seguro de eliminar este kit?')) return;
        await deleteCombo(id);
    };

    return {
        combos, loading, products, t,
        showModal, editingCombo, form, setForm, uploading, fileInputRef,
        abrirModal, cerrarModal, agregarProducto, actualizarItem, eliminarItem,
        getProductOptionLabel,
        calcularPrecioRegular, calcularDescuento, guardarCombo, onFileSelect,
        handleEliminarCombo, toggleComboActivo, refreshCombos,
    };
};
