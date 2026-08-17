import { useState, useEffect } from 'react';
import { useResellerStore } from '@/zustand/resellers';

export const useResellersViewModel = () => {
    const { resellers, rentabilidad, getAllResellers, getRentabilidad, createReseller, recargarSaldo, ajustarSaldo, toggleEstadoReseller } = useResellerStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [selectedReseller, setSelectedReseller] = useState<any>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        nombre: '',
        codigo: '',
        representante: '',
        telefono: '',
        email: '',
        dominioPersonalizado: '',
        whiteLabelNombre: '',
        whiteLabelLogoUrl: '',
        whiteLabelLogoWhiteUrl: '',
        whiteLabelFaviconUrl: '',
        whiteLabelColorPrimario: '',
        whiteLabelColorSecundario: '',
        whiteLabelWebsite: '',
        whiteLabelEmail: '',
        whiteLabelTelefono: '',
        whiteLabelWhatsapp: '',
    });
    const [rechargeData, setRechargeData] = useState({ monto: '', referencia: '' });
    const [saldoMode, setSaldoMode] = useState<'recargar' | 'ajustar'>('recargar');
    const [ajusteData, setAjusteData] = useState({ nuevoSaldo: '', motivo: '' });
    const handleAjusteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setAjusteData(prev => ({ ...prev, [name]: value }));
    };

    useEffect(() => {
        getAllResellers();
        getRentabilidad();
    }, []);

    const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRechargeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setRechargeData(prev => ({ ...prev, [name]: value }));
    };

    const openCreateModal = () => {
        setIsEditMode(false); setEditingId(null);
        setFormData({
            nombre: '',
            codigo: '',
            representante: '',
            telefono: '',
            email: '',
            dominioPersonalizado: '',
            whiteLabelNombre: '',
            whiteLabelLogoUrl: '',
            whiteLabelLogoWhiteUrl: '',
            whiteLabelFaviconUrl: '',
            whiteLabelColorPrimario: '',
            whiteLabelColorSecundario: '',
            whiteLabelWebsite: '',
            whiteLabelEmail: '',
            whiteLabelTelefono: '',
            whiteLabelWhatsapp: '',
        });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (reseller: any) => {
        setIsEditMode(true); setEditingId(reseller.id);
        setFormData({
            nombre: reseller.nombre || '',
            codigo: reseller.codigo || '',
            representante: reseller.representante || '',
            telefono: reseller.telefono || '',
            email: reseller.email || '',
            dominioPersonalizado: reseller.dominioPersonalizado || '',
            whiteLabelNombre: reseller.whiteLabelNombre || '',
            whiteLabelLogoUrl: reseller.whiteLabelLogoUrl || '',
            whiteLabelLogoWhiteUrl: reseller.whiteLabelLogoWhiteUrl || '',
            whiteLabelFaviconUrl: reseller.whiteLabelFaviconUrl || '',
            whiteLabelColorPrimario: reseller.whiteLabelColorPrimario || '',
            whiteLabelColorSecundario: reseller.whiteLabelColorSecundario || '',
            whiteLabelWebsite: reseller.whiteLabelWebsite || '',
            whiteLabelEmail: reseller.whiteLabelEmail || '',
            whiteLabelTelefono: reseller.whiteLabelTelefono || '',
            whiteLabelWhatsapp: reseller.whiteLabelWhatsapp || '',
        });
        setIsCreateModalOpen(true);
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = isEditMode && editingId
            ? await useResellerStore.getState().updateReseller(editingId, formData)
            : await createReseller(formData);
        if (result.success) {
            setIsCreateModalOpen(false);
            setFormData({
                nombre: '',
                codigo: '',
                representante: '',
                telefono: '',
                email: '',
                dominioPersonalizado: '',
                whiteLabelNombre: '',
                whiteLabelLogoUrl: '',
                whiteLabelLogoWhiteUrl: '',
                whiteLabelFaviconUrl: '',
                whiteLabelColorPrimario: '',
                whiteLabelColorSecundario: '',
                whiteLabelWebsite: '',
                whiteLabelEmail: '',
                whiteLabelTelefono: '',
                whiteLabelWhatsapp: '',
            });
        }
    };

    const openRechargeModal = (reseller: any) => {
        setSelectedReseller(reseller);
        setSaldoMode('recargar');
        setRechargeData({ monto: '', referencia: '' });
        setAjusteData({ nuevoSaldo: Number(reseller?.saldo ?? 0).toFixed(2), motivo: '' });
        setIsRechargeModalOpen(true);
    };

    const handleRechargeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReseller) return;
        const monto = parseFloat(rechargeData.monto);
        if (isNaN(monto) || monto <= 0) return;
        const result = await recargarSaldo(selectedReseller.id, monto, rechargeData.referencia);
        if (result.success) { setIsRechargeModalOpen(false); await getRentabilidad(); }
    };

    const handleAjustarSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReseller) return;
        const nuevoSaldo = parseFloat(ajusteData.nuevoSaldo);
        if (isNaN(nuevoSaldo) || nuevoSaldo < 0) return;
        if (!ajusteData.motivo.trim()) return;
        const result = await ajustarSaldo(selectedReseller.id, nuevoSaldo, ajusteData.motivo.trim());
        if (result.success) { setIsRechargeModalOpen(false); await getRentabilidad(); }
    };

    const handleToggleEstado = async (reseller: any) => {
        const nuevoEstado = !reseller.activo;
        const ok = window.confirm(`¿Deseas ${nuevoEstado ? 'activar' : 'desactivar'} a ${reseller.nombre}?`);
        if (!ok) return;
        const result = await toggleEstadoReseller(reseller.id, nuevoEstado);
        if (result.success) {
            await getRentabilidad();
        }
    };

    const getRentabilidadByReseller = (resellerId: number) => {
        return rentabilidad.find((item) => item.resellerId === resellerId);
    };

    return { resellers, rentabilidad, isCreateModalOpen, setIsCreateModalOpen, isRechargeModalOpen, setIsRechargeModalOpen, selectedReseller, isEditMode, formData, rechargeData, handleCreateChange, handleRechargeChange, openCreateModal, openEditModal, handleCreateSubmit, openRechargeModal, handleRechargeSubmit, handleToggleEstado, getRentabilidadByReseller, saldoMode, setSaldoMode, ajusteData, handleAjusteChange, handleAjustarSubmit };
};
