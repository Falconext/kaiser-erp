import { useState, useEffect, useCallback } from 'react';
import { get, post, put, del } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { IDoctor, INITIAL_DOCTOR } from './DoctorsModel';

export function useDoctorsViewModel() {
  const { alert, load } = useAlertStore();

  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState<IDoctor>(INITIAL_DOCTOR);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    try {
      const res: any = await get<IDoctor[]>(`/doctors${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setDoctors(res?.data ?? []);
    } catch {
      alert('No se pudieron cargar los doctores', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, alert]);

  useEffect(() => { void fetchDoctors(); }, [fetchDoctors]);

  const openCreate = () => {
    setForm(INITIAL_DOCTOR);
    setIsEdit(false);
    setIsModalOpen(true);
  };

  const openEdit = (doctor: IDoctor) => {
    setForm(doctor);
    setIsEdit(true);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleChange = (field: keyof IDoctor, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.nombre.trim()) { alert('El nombre es requerido', 'error'); return; }
    load(true);
    try {
      if (isEdit) {
        await put(`/doctors/${form.id}`, form);
        setDoctors(prev => prev.map(d => d.id === form.id ? { ...d, ...form } : d));
        alert('Doctor actualizado', 'success');
      } else {
        const resp: any = await post<IDoctor>('/doctors', form);
        if (resp?.data) setDoctors(prev => [resp.data, ...prev]);
        alert('Doctor registrado', 'success');
      }
      closeModal();
    } catch (e: any) {
      alert(e?.message ?? 'Error al guardar', 'error');
    } finally {
      load(false);
    }
  };

  const confirmDelete = (id: number) => setDeleteId(id);
  const cancelDelete = () => setDeleteId(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    load(true);
    try {
      await del(`/doctors/${deleteId}`);
      setDoctors(prev => prev.filter(d => d.id !== deleteId));
      alert('Doctor desactivado', 'success');
    } catch {
      alert('Error al desactivar', 'error');
    } finally {
      load(false);
      setDeleteId(null);
    }
  };

  return {
    doctors, search, setSearch, isLoading,
    isModalOpen, isEdit, form,
    deleteId,
    openCreate, openEdit, closeModal, handleChange, handleSubmit,
    confirmDelete, cancelDelete, handleDelete,
  };
}
