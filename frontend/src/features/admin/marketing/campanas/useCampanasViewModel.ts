import { useState, useEffect, useCallback } from 'react';
import { get, post, patch, del } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useProductsStore } from '@/zustand/products';
import {
  Campana, CampanaForm, ListaCampanasResponse,
  initialCampanaForm, PlataformaAds,
} from './CampanasModel';

export function useCampanasViewModel() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [data, setData] = useState<ListaCampanasResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filtroPlataforma, setFiltroPlataforma] = useState<PlataformaAds | 'TODAS'>('TODAS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editando, setEditando] = useState<Campana | null>(null);
  const [form, setForm] = useState<CampanaForm>(initialCampanaForm);
  const [isSaving, setIsSaving] = useState(false);
  const alertFn = useAlertStore(s => s.alert);
  const products = useProductsStore(s => s.products);
  const getAllProducts = useProductsStore(s => s.getAllProducts);

  useEffect(() => { getAllProducts({ page: 1, limit: 500 }); }, [getAllProducts]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await get<ListaCampanasResponse>(`/campanas?mes=${mes}&anio=${anio}`);
      setData(res.data ?? null);
    } catch {
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navegarMes = (delta: number) => {
    let m = mes + delta;
    let a = anio;
    if (m > 12) { m = 1; a++; }
    if (m < 1) { m = 12; a--; }
    setMes(m); setAnio(a);
  };

  const abrirCrear = () => {
    setEditando(null);
    setForm(initialCampanaForm);
    setIsModalOpen(true);
  };

  const abrirEditar = (c: Campana) => {
    setEditando(c);
    setForm({
      nombre: c.nombre,
      plataforma: c.plataforma,
      productoId: c.producto?.id ?? null,
      presupuestoDiario: c.presupuestoDiario,
      presupuestoOriginal: c.presupuestoOriginal ?? c.presupuestoDiario,
      tipoPresupuesto: c.tipoPresupuesto ?? 'DIARIO',
      moneda: c.moneda as 'PEN' | 'USD',
      fechaInicio: c.fechaInicio,
      fechaFin: c.fechaFin ?? '',
      esRecurrente: c.esRecurrente ?? false,
    });
    setIsModalOpen(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim() || !form.presupuestoOriginal) {
      alertFn('Completa nombre y presupuesto', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        presupuestoDiario: Number(form.presupuestoDiario || form.presupuestoOriginal), // just fallback
        presupuestoOriginal: Number(form.presupuestoOriginal),
        productoId: form.productoId ?? undefined,
      };
      if (editando) {
        await patch(`/campanas/${editando.id}`, payload);
        alertFn('Campaña actualizada', 'success');
      } else {
        await post('/campanas', payload);
        alertFn('Campaña creada', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      alertFn('Error al guardar campaña', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEstado = async (c: Campana) => {
    const nuevoEstado = c.estado === 'ACTIVA' ? 'PAUSADA' : 'ACTIVA';
    try {
      await patch(`/campanas/${c.id}`, { estado: nuevoEstado });
      fetchData();
    } catch {
      alertFn('Error al actualizar estado', 'error');
    }
  };

  const eliminar = async (id: number) => {
    try {
      await del(`/campanas/${id}`);
      alertFn('Campaña eliminada', 'success');
      fetchData();
    } catch {
      alertFn('Error al eliminar campaña', 'error');
    }
  };

  const campanasFiltradas = (data?.campanas ?? []).filter(
    c => filtroPlataforma === 'TODAS' || c.plataforma === filtroPlataforma,
  );

  const diasEstimadosMes = () => {
    const hoy = new Date();
    if (mes === hoy.getMonth() + 1 && anio === hoy.getFullYear()) return hoy.getDate();
    return new Date(anio, mes, 0).getDate();
  };

  return {
    mes, anio, data, isLoading, filtroPlataforma, setFiltroPlataforma,
    isModalOpen, setIsModalOpen, editando, form, setForm, isSaving,
    navegarMes, abrirCrear, abrirEditar, guardar, toggleEstado, eliminar,
    campanasFiltradas, products, diasEstimadosMes,
  };
}
