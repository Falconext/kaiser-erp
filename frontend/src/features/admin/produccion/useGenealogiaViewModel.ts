import { useCallback, useEffect, useState } from 'react';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';

export interface CompraDeOrigen {
  compraId: number;
  documento: string;
  proveedor: string | null;
  fecha: string;
  cantidad: number;
  costoUnitario: number;
}

export interface ComponenteReceta {
  productoId: number;
  codigo: string;
  descripcion: string;
  cantidadBase: number;
  unidad: string;
  mermaEsperadaPorcentaje: number | null;
  esOpcional: boolean;
  costoPromedio: number;
  vinoDe: CompraDeOrigen[];
}

export interface ComponenteOrden {
  productoId: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidadTeorica: number;
  cantidadConsumida: number;
  mermaCantidad: number;
  costoUnitario: number;
  costoTotal: number;
  vinoDe: CompraDeOrigen[];
}

export interface OrdenGenealogia {
  id: number;
  lote: string;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  responsable: string | null;
  cantidadObjetivo: number;
  cantidadProducida: number;
  mermaTotal: number;
  costoConsumo: number;
  costoMerma: number;
  costoProduccion: number;
  costoUnitario: number | null;
  desviacionPorcentaje: number | null;
  componentes: ComponenteOrden[];
}

export interface Genealogia {
  producto: { id: number; codigo: string; descripcion: string; unidad: string | null; stock: number; costoPromedio: number };
  esFabricado: boolean;
  receta: {
    id: number; codigo: string; nombre: string; version: number; activo: boolean;
    rendimiento: number; unidadRendimiento: string; mermaObjetivoPorcentaje: number | null;
    componentes: ComponenteReceta[];
  } | null;
  versionesDeReceta: number;
  ordenes: OrdenGenealogia[];
  salidas: Array<{ comprobanteId: number; documento: string; tipoDoc: string; cliente: string | null; fecha: string; cantidad: number; costo: number }>;
  seUsaEn: Array<{ recetaId: number; recetaCodigo: string; recetaNombre: string; activa: boolean; productoFinalId: number; productoFinalCodigo: string; productoFinalDescripcion: string; cantidadPorUnidad: number; unidad: string }>;
}

export const soles = (n: number) =>
  `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const useGenealogiaViewModel = () => {
  const { alert } = useAlertStore();
  const [busqueda, setBusqueda] = useState('');
  const [datos, setDatos] = useState<Genealogia | null>(null);
  const [cargando, setCargando] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<number>>(new Set());
  const [sugerencias, setSugerencias] = useState<Array<{ id: number; codigo: string; descripcion: string }>>([]);

  const buscar = useCallback(async (termino?: string) => {
    const q = (termino ?? busqueda).trim();
    if (!q) return;
    setCargando(true);
    const r = await get<Genealogia>(`produccion/genealogia/${encodeURIComponent(q)}`);
    setCargando(false);
    if (r.success && r.data) {
      setDatos(r.data);
      // La primera orden viene desplegada: es la que casi siempre se mira.
      setExpandidas(new Set(r.data.ordenes.slice(0, 1).map((o) => o.id)));
    } else {
      setDatos(null);
      alert(r.error || 'No se encontró el producto', 'error');
    }
  }, [busqueda]);

  /** Productos con receta, para que la pantalla no arranque en blanco. */
  useEffect(() => {
    void get<unknown>('produccion/recetas').then((r) => {
      const cuerpo = r.data as { recetas?: unknown[] } | unknown[] | undefined;
      const lista = Array.isArray(cuerpo) ? cuerpo : (cuerpo?.recetas ?? []);
      if (!Array.isArray(lista)) return;
      const vistos = new Set<number>();
      const items: Array<{ id: number; codigo: string; descripcion: string }> = [];
      for (const x of lista as Array<{ productoFinal?: { id: number; codigo: string; descripcion: string } }>) {
        const p = x.productoFinal;
        if (!p || vistos.has(p.id)) continue;
        vistos.add(p.id);
        items.push({ id: p.id, codigo: p.codigo, descripcion: p.descripcion });
        if (items.length >= 8) break;
      }
      setSugerencias(items);
    });
  }, []);

  const toggleOrden = (id: number) =>
    setExpandidas((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });

  return { busqueda, setBusqueda, buscar, datos, cargando, expandidas, toggleOrden, sugerencias };
};
