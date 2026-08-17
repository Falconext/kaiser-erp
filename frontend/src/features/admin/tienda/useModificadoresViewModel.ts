import { useState, useEffect } from 'react';
import { useModificadoresStore } from '@/zustand/modificadores';

interface Opcion {
    id: number; nombre: string; descripcion?: string;
    precioExtra: number; orden: number; activo: boolean; esDefault: boolean;
}

interface GrupoModificador {
    id: number; nombre: string; descripcion?: string;
    esObligatorio: boolean; seleccionMin: number; seleccionMax: number;
    orden: number; activo: boolean; opciones: Opcion[];
    _count?: { productos: number };
}

const initialGrupoForm = { nombre: '', descripcion: '', esObligatorio: false, seleccionMin: 0, seleccionMax: 3, orden: 0 };
const initialOpcionForm = { nombre: '', descripcion: '', precioExtra: 0, orden: 0, esDefault: false };

export const useModificadoresViewModel = () => {
    const {
        grupos, loading, getAllGrupos, crearGrupo, actualizarGrupo,
        eliminarGrupo: eliminarGrupoStore, agregarOpcion, actualizarOpcion,
        eliminarOpcion: eliminarOpcionStore, toggleOpcionActivo: toggleOpcionActivoStore,
    } = useModificadoresStore();

    const [showModal, setShowModal] = useState(false);
    const [editingGrupo, setEditingGrupo] = useState<GrupoModificador | null>(null);
    const [showOpcionModal, setShowOpcionModal] = useState(false);
    const [editingOpcion, setEditingOpcion] = useState<Opcion | null>(null);
    const [selectedGrupoId, setSelectedGrupoId] = useState<number | null>(null);
    const [grupoForm, setGrupoForm] = useState(initialGrupoForm);
    const [opcionForm, setOpcionForm] = useState(initialOpcionForm);

    useEffect(() => { getAllGrupos(); }, [getAllGrupos]);

    const abrirModalGrupo = (grupo?: GrupoModificador) => {
        if (grupo) {
            setEditingGrupo(grupo);
            setGrupoForm({ nombre: grupo.nombre, descripcion: grupo.descripcion || '', esObligatorio: grupo.esObligatorio, seleccionMin: grupo.seleccionMin, seleccionMax: grupo.seleccionMax, orden: grupo.orden });
        } else {
            setEditingGrupo(null);
            setGrupoForm({ ...initialGrupoForm, orden: grupos.length });
        }
        setShowModal(true);
    };

    const guardarGrupo = async () => {
        if (!grupoForm.nombre.trim()) { alert('El nombre es requerido'); return; }
        try {
            editingGrupo ? await actualizarGrupo(editingGrupo.id, grupoForm) : await crearGrupo(grupoForm);
            setShowModal(false);
        } catch { }
    };

    const handleEliminarGrupo = async (grupoId: number) => {
        if (!confirm('¿Estás seguro de eliminar este grupo y todas sus opciones?')) return;
        try { await eliminarGrupoStore(grupoId); } catch { }
    };

    const abrirModalOpcion = (grupoId: number, opcion?: Opcion) => {
        setSelectedGrupoId(grupoId);
        if (opcion) {
            setEditingOpcion(opcion);
            setOpcionForm({ nombre: opcion.nombre, descripcion: opcion.descripcion || '', precioExtra: Number(opcion.precioExtra) || 0, orden: opcion.orden, esDefault: opcion.esDefault });
        } else {
            setEditingOpcion(null);
            const grupo = grupos.find((g) => g.id === grupoId);
            setOpcionForm({ ...initialOpcionForm, orden: grupo?.opciones.length || 0 });
        }
        setShowOpcionModal(true);
    };

    const guardarOpcion = async () => {
        if (!opcionForm.nombre.trim()) { alert('El nombre es requerido'); return; }
        try {
            if (editingOpcion) await actualizarOpcion(editingOpcion.id, opcionForm);
            else { if (selectedGrupoId == null) return; await agregarOpcion(selectedGrupoId, opcionForm); }
            setShowOpcionModal(false);
        } catch { }
    };

    const handleEliminarOpcion = async (opcionId: number) => {
        if (!confirm('¿Estás seguro de eliminar esta opción?')) return;
        try { await eliminarOpcionStore(opcionId); } catch { }
    };

    const handleToggleOpcionActivo = async (opcion: Opcion) => {
        try { await toggleOpcionActivoStore(opcion as any); } catch { }
    };

    return {
        grupos, loading,
        showModal, setShowModal, editingGrupo, grupoForm, setGrupoForm,
        showOpcionModal, setShowOpcionModal, editingOpcion, opcionForm, setOpcionForm,
        abrirModalGrupo, guardarGrupo, handleEliminarGrupo,
        abrirModalOpcion, guardarOpcion, handleEliminarOpcion, handleToggleOpcionActivo,
    };
};
