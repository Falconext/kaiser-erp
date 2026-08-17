import { useState, useEffect } from 'react';
import { useModulosStore, IModulo, ISubModulo } from '@/zustand/modulos';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';

const initialModuloForm: Partial<IModulo> = { codigo: '', producto: 'facturacion', nombre: '', descripcion: '', icono: '', ruta: '', activo: true, orden: 0 };

const initialSubModuloForm = { moduloId: 0, codigo: '', nombre: '', descripcion: '', ruta: '', activo: true, orden: 0 };

export const useModulosViewModel = () => {
    const { modulos, loading, getAllModulos, createModulo, updateModulo, deleteModulo, createSubModulo, updateSubModulo, deleteSubModulo } = useModulosStore();
    const { alert } = useAlertStore();
    const { auth } = useAuthStore();
    const productoScope = (String(auth?.sistemaProducto || '').toLowerCase() === 'hotel' ? 'hotel' : String(auth?.sistemaProducto || '').toLowerCase() === 'restaurante' ? 'restaurante' : String(auth?.sistemaProducto || '').toLowerCase() === 'facturacion' ? 'facturacion' : '') as '' | 'facturacion' | 'hotel' | 'restaurante';
    const [productoFiltro, setProductoFiltro] = useState<'' | 'facturacion' | 'hotel' | 'restaurante'>(productoScope);

    // Estado módulo
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [currentId, setCurrentId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [modalConfirmOpen, setModalConfirmOpen] = useState(false);
    const [form, setForm] = useState(initialModuloForm);

    // Estado submódulo
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [isSubEdit, setIsSubEdit] = useState(false);
    const [currentSubId, setCurrentSubId] = useState<number | null>(null);
    const [deleteSubId, setDeleteSubId] = useState<number | null>(null);
    const [modalConfirmSubOpen, setModalConfirmSubOpen] = useState(false);
    const [subForm, setSubForm] = useState(initialSubModuloForm);
    const [expandedModulos, setExpandedModulos] = useState<Set<number>>(new Set());

    useEffect(() => {
        setProductoFiltro(productoScope);
    }, [productoScope]);

    useEffect(() => {
        getAllModulos(true, productoScope || productoFiltro || undefined);
    }, [getAllModulos, productoScope, productoFiltro]);

    // ── Módulos ──────────────────────────────────────────────────────────────

    const handleOpenCreate = () => {
        setIsEdit(false);
        setForm({
            ...initialModuloForm,
            producto: productoScope || productoFiltro || 'facturacion',
            orden: modulos.length + 1,
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (modulo: IModulo) => {
        setIsEdit(true);
        setCurrentId(modulo.id);
        setForm({ ...modulo });
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.codigo || !form.nombre) { alert('Código y nombre son obligatorios', 'warning'); return; }
        const success = isEdit && currentId
            ? await updateModulo(currentId, form, productoScope || productoFiltro || undefined)
            : await createModulo(form, productoScope || productoFiltro || undefined);
        if (success) {
            alert(isEdit ? 'Módulo actualizado' : 'Módulo creado', 'success');
            setIsModalOpen(false);
        }
    };

    const confirmDelete = (id: number) => { setDeleteId(id); setModalConfirmOpen(true); };

    const handleDelete = async () => {
        if (!deleteId) return;
        const success = await deleteModulo(deleteId, productoScope || productoFiltro || undefined);
        if (success) { alert('Módulo eliminado', 'success'); setModalConfirmOpen(false); }
    };

    // ── SubMódulos ───────────────────────────────────────────────────────────

    const toggleExpanded = (moduloId: number) => {
        setExpandedModulos(prev => {
            const next = new Set(prev);
            next.has(moduloId) ? next.delete(moduloId) : next.add(moduloId);
            return next;
        });
    };

    const handleOpenCreateSub = (moduloId: number) => {
        setIsSubEdit(false);
        setCurrentSubId(null);
        const modulo = modulos.find(m => m.id === moduloId);
        const nextOrden = (modulo?.subModulos?.length || 0) + 1;
        setSubForm({ ...initialSubModuloForm, moduloId, orden: nextOrden });
        setIsSubModalOpen(true);
    };

    const handleOpenEditSub = (sub: ISubModulo) => {
        setIsSubEdit(true);
        setCurrentSubId(sub.id);
        setSubForm({ moduloId: sub.moduloId, codigo: sub.codigo, nombre: sub.nombre, descripcion: sub.descripcion || '', ruta: sub.ruta || '', activo: sub.activo, orden: sub.orden });
        setIsSubModalOpen(true);
    };

    const handleSubmitSub = async () => {
        if (!subForm.codigo || !subForm.nombre) { alert('Código y nombre son obligatorios', 'warning'); return; }
        const success = isSubEdit && currentSubId
            ? await updateSubModulo(currentSubId, { nombre: subForm.nombre, descripcion: subForm.descripcion, ruta: subForm.ruta || undefined, activo: subForm.activo, orden: subForm.orden }, productoScope || productoFiltro || undefined)
            : await createSubModulo(subForm, productoScope || productoFiltro || undefined);
        if (success) {
            alert(isSubEdit ? 'Submódulo actualizado' : 'Submódulo creado', 'success');
            setIsSubModalOpen(false);
        } else {
            alert('Error al guardar submódulo', 'error');
        }
    };

    const confirmDeleteSub = (id: number) => { setDeleteSubId(id); setModalConfirmSubOpen(true); };

    const handleDeleteSub = async () => {
        if (!deleteSubId) return;
        const success = await deleteSubModulo(deleteSubId, productoScope || productoFiltro || undefined);
        if (success) { alert('Submódulo eliminado', 'success'); setModalConfirmSubOpen(false); }
    };

    return {
        modulos, loading,
        productoFiltro, setProductoFiltro, productoScope,
        // Módulos
        isModalOpen, setIsModalOpen, isEdit, form, setForm, modalConfirmOpen, setModalConfirmOpen,
        handleOpenCreate, handleOpenEdit, handleSubmit, confirmDelete, handleDelete,
        // SubMódulos
        isSubModalOpen, setIsSubModalOpen, isSubEdit, subForm, setSubForm,
        modalConfirmSubOpen, setModalConfirmSubOpen, expandedModulos,
        toggleExpanded, handleOpenCreateSub, handleOpenEditSub,
        handleSubmitSub, confirmDeleteSub, handleDeleteSub,
    };
};
