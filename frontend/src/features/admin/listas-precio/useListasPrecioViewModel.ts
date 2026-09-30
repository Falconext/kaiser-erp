import { useCallback, useEffect, useState } from 'react';
import { get, post, put, del } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';

export interface ListaResumen {
  id: number;
  nombre: string;
  descripcion: string | null;
  ajustePorcentaje: number | null;
  activa: boolean;
  productos: number;
  clientes: number;
}

export interface ItemLista {
  id: number;
  productoId: number;
  codigo: string;
  descripcion: string;
  unidad: string | null;
  precio: number;
  precioDeLista: number;
  diferenciaPorcentaje: number | null;
}

export interface ListaDetalle {
  id: number;
  nombre: string;
  descripcion: string | null;
  ajustePorcentaje: number | null;
  activa: boolean;
  clientes: { id: number; nombre: string; nroDoc: string }[];
  items: ItemLista[];
}

interface ProductoBusqueda {
  id: number;
  codigo: string;
  descripcion: string;
  precioUnitario: number;
}

export const soles = (n: number | null | undefined) =>
  `S/ ${Number(n ?? 0).toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const useListasPrecioViewModel = () => {
  const { load, alert } = useAlertStore();
  const [listas, setListas] = useState<ListaResumen[]>([]);
  const [detalle, setDetalle] = useState<ListaDetalle | null>(null);
  const [cargado, setCargado] = useState(false);

  // Alta de lista
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');

  // Alta de precio dentro de la lista
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ProductoBusqueda[]>([]);
  const [elegido, setElegido] = useState<ProductoBusqueda | null>(null);
  const [precio, setPrecio] = useState('');

  const cargarListas = useCallback(async () => {
    load(true);
    try {
      const r = await get<ListaResumen[]>('listas-precio?incluirInactivas=true');
      setListas(r.data ?? []);
    } finally {
      load(false);
      setCargado(true);
    }
  }, [load]);

  const abrir = useCallback(
    async (id: number) => {
      load(true);
      try {
        const r = await get<ListaDetalle>(`listas-precio/${id}`);
        setDetalle(r.data ?? null);
      } finally {
        load(false);
      }
    },
    [load],
  );

  useEffect(() => {
    void cargarListas();
  }, [cargarListas]);

  const crear = async () => {
    if (!nuevoNombre.trim()) {
      alert('Ponle un nombre a la lista', 'warning');
      return;
    }
    const r = await post<ListaResumen>('listas-precio', {
      nombre: nuevoNombre.trim(),
      descripcion: nuevaDescripcion.trim() || undefined,
    });
    if (!r.success) {
      alert(r.error ?? 'No se pudo crear la lista', 'error');
      return;
    }
    setNuevoNombre('');
    setNuevaDescripcion('');
    await cargarListas();
    if (r.data?.id) await abrir(r.data.id);
  };

  const cambiarAjuste = async (id: number, valor: string) => {
    const ajuste = valor.trim() === '' ? null : Number(valor);
    if (ajuste !== null && Number.isNaN(ajuste)) return;
    const r = await put(`listas-precio/${id}`, { ajustePorcentaje: ajuste });
    if (!r.success) {
      alert(r.error ?? 'No se pudo guardar el ajuste', 'error');
      return;
    }
    await Promise.all([cargarListas(), abrir(id)]);
  };

  const alternarActiva = async (l: ListaResumen) => {
    const r = await put(`listas-precio/${l.id}`, { activa: !l.activa });
    if (!r.success) {
      alert(r.error ?? 'No se pudo cambiar el estado', 'error');
      return;
    }
    await cargarListas();
    if (detalle?.id === l.id) await abrir(l.id);
  };

  const eliminar = async (l: ListaResumen) => {
    const r = await del(`listas-precio/${l.id}`);
    if (!r.success) {
      // El backend explica por qué (clientes asignados); se muestra tal cual.
      alert(r.error ?? 'No se pudo borrar la lista', 'error');
      return;
    }
    if (detalle?.id === l.id) setDetalle(null);
    await cargarListas();
  };

  const buscar = async (texto: string) => {
    setBusqueda(texto);
    setElegido(null);
    if (texto.trim().length < 2) {
      setResultados([]);
      return;
    }
    const r = await get<{ productos: ProductoBusqueda[] }>(
      `productos?limit=8&search=${encodeURIComponent(texto.trim())}`,
    );
    setResultados(r.data?.productos ?? []);
  };

  const elegir = (p: ProductoBusqueda) => {
    setElegido(p);
    setBusqueda(`${p.codigo} — ${p.descripcion}`);
    setResultados([]);
    // Se precarga el precio de catálogo: casi siempre se parte de ahí para
    // bajarlo, y escribirlo de cero invita a equivocarse de orden de magnitud.
    setPrecio(String(p.precioUnitario));
  };

  const fijarPrecio = async () => {
    if (!detalle || !elegido) return;
    const valor = Number(precio);
    if (!(valor > 0)) {
      alert('El precio tiene que ser mayor que cero', 'warning');
      return;
    }
    const r = await put(
      `listas-precio/${detalle.id}/productos/${elegido.id}`,
      { precio: valor },
    );
    if (!r.success) {
      alert(r.error ?? 'No se pudo fijar el precio', 'error');
      return;
    }
    setBusqueda('');
    setElegido(null);
    setPrecio('');
    await Promise.all([abrir(detalle.id), cargarListas()]);
  };

  const quitarPrecio = async (productoId: number) => {
    if (!detalle) return;
    const r = await del(`listas-precio/${detalle.id}/productos/${productoId}`);
    if (!r.success) {
      alert(r.error ?? 'No se pudo quitar el precio', 'error');
      return;
    }
    await Promise.all([abrir(detalle.id), cargarListas()]);
  };

  return {
    listas,
    detalle,
    cargado,
    abrir,
    cerrar: () => setDetalle(null),
    nuevoNombre,
    setNuevoNombre,
    nuevaDescripcion,
    setNuevaDescripcion,
    crear,
    cambiarAjuste,
    alternarActiva,
    eliminar,
    busqueda,
    buscar,
    resultados,
    elegido,
    elegir,
    precio,
    setPrecio,
    fijarPrecio,
    quitarPrecio,
  };
};
