import { useCallback, useEffect, useState } from 'react';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useDebounce } from '@/hooks/useDebounce';
import type { Trazabilidad } from './TrazabilidadModel';

interface ProductoSugerido {
  id: number;
  codigo: string;
  descripcion: string;
}

export function useTrazabilidadViewModel() {
  const { alert } = useAlertStore();

  const [busqueda, setBusqueda] = useState('');
  const [sugerencias, setSugerencias] = useState<ProductoSugerido[]>([]);
  const [cargando, setCargando] = useState(false);
  const [traza, setTraza] = useState<Trazabilidad | null>(null);
  /** Código consultado, para saber si ya se buscó algo. */
  const [codigoActual, setCodigoActual] = useState<string | null>(null);

  const debounced = useDebounce(busqueda, 350);

  // Sugerencias mientras se escribe: almacén busca por código, pero también
  // por nombre cuando no lo recuerda.
  useEffect(() => {
    let cancelado = false;
    const termino = debounced.trim();
    if (termino.length < 2) {
      setSugerencias([]);
      return;
    }
    (async () => {
      try {
        const resp: any = await get(
          `productos?search=${encodeURIComponent(termino)}&page=1&limit=8`,
        );
        if (cancelado) return;
        const lista = resp?.data?.productos ?? resp?.productos ?? [];
        setSugerencias(
          lista.map((p: any) => ({
            id: p.id,
            codigo: p.codigo,
            descripcion: p.descripcion,
          })),
        );
      } catch {
        if (!cancelado) setSugerencias([]);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [debounced]);

  const consultar = useCallback(
    async (identificador: string) => {
      const id = String(identificador ?? '').trim();
      if (!id) return;
      setCargando(true);
      try {
        const resp: any = await get(
          `kardex/trazabilidad/${encodeURIComponent(id)}`,
        );
        const datos: Trazabilidad | null = resp?.data ?? resp ?? null;
        setTraza(datos);
        setCodigoActual(datos?.producto?.codigo ?? id);
        if (datos && datos.lineaDeTiempo.length === 0) {
          alert('Ese producto todavía no tiene movimientos registrados.', 'info');
        }
      } catch (e: any) {
        setTraza(null);
        setCodigoActual(id);
        alert(
          e?.response?.data?.message ?? 'No se encontró ese producto.',
          'error',
        );
      } finally {
        setCargando(false);
      }
    },
    [alert],
  );

  const elegirSugerencia = (p: ProductoSugerido) => {
    setBusqueda(p.codigo);
    consultar(p.codigo);
  };

  const limpiar = () => {
    setBusqueda('');
    setTraza(null);
    setCodigoActual(null);
    setSugerencias([]);
  };

  return {
    busqueda,
    setBusqueda,
    sugerencias,
    cargando,
    traza,
    codigoActual,
    actions: { consultar, elegirSugerencia, limpiar },
  };
}
