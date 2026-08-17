import { useState, useEffect } from 'react';
import { useSedesStore } from '@/zustand/sedes';
import { Sede } from '@/interfaces/Sede';

export const useSedesViewModel = () => {
    const { sedes, loading, listarSedes, eliminarSede, toggleActivoSede } = useSedesStore();
    const [showModal, setShowModal] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
    const [isEdit, setIsEdit] = useState(false);

    useEffect(() => { listarSedes(); }, []);

    const handleCreate = () => { setSelectedSede(null); setIsEdit(false); setShowModal(true); };
    const handleEdit = (sede: Sede) => { setSelectedSede(sede); setIsEdit(true); setShowModal(true); };
    const handleToggleActivo = async (sede: Sede) => { await toggleActivoSede((sede as any).id, !(sede as any).activo); };
    const handleDelete = (sede: Sede) => {
        if (sede.esPrincipal) { alert('No se puede eliminar la sede principal'); return; }
        setSelectedSede(sede);
        setShowConfirm(true);
    };

    const confirmDelete = async () => {
        if (selectedSede) {
            await eliminarSede(selectedSede.id);
            setShowConfirm(false);
            setSelectedSede(null);
        }
    };

    return { sedes, loading, showModal, setShowModal, showConfirm, setShowConfirm, selectedSede, isEdit, handleCreate, handleEdit, handleDelete, handleToggleActivo, confirmDelete };
};
