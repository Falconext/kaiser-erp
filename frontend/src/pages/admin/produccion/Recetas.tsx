import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';
import { esRubroFabricacion } from '@/utils/rubro-features';
import Select from '@/components/Select';
import InputPro from '@/components/InputPro';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

type Receta = {
  id: number;
  codigo: string;
  nombre: string;
  version: number;
  activo: boolean;
  rendimientoObjetivo: number | string;
  unidadRendimiento: string;
  productoFinal?: {
    codigo?: string;
    descripcion?: string;
  };
  _count?: {
    componentes?: number;
    ordenes?: number;
  };
};

type ComponenteForm = {
  productoInsumoId: number | '';
  cantidadBase: number | '';
  unidadBase: string;
};

type ProductoOption = {
  id: number;
  codigo?: string;
  descripcion?: string;
  codigoBarras?: string;
};

type SelectOption = {
  id: number;
  value: string;
};

export default function ProduccionRecetasPage() {
  const sidebarColor = useThemeStore((s) => s.sidebarColor);
  const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
  const { auth } = useAuthStore();
  const alert = useAlertStore((state) => state.alert);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [importandoPlantilla, setImportandoPlantilla] = useState(false);
  const inputPlantillaRef = useRef<HTMLInputElement | null>(null);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [productoOptions, setProductoOptions] = useState<SelectOption[]>([]);
  const [productoLabelMap, setProductoLabelMap] = useState<
    Record<number, string>
  >({});
  const [componentes, setComponentes] = useState<ComponenteForm[]>([
    { productoInsumoId: '', cantidadBase: '', unidadBase: 'GR' },
  ]);
  const [form, setForm] = useState({
    productoFinalId: '' as number | '',
    codigo: '',
    nombre: '',
    rendimientoObjetivo: '' as number | '',
    unidadRendimiento: 'UN',
  });
  /**
   * Receta que se está editando. El formulario es el mismo que el de alta: una
   * receta se corrige tantas veces como haga falta —planta ajusta cantidades
   * cuando mide la merma de verdad— y tener que borrarla y rehacerla entera
   * para cambiar un número es lo que hace que nadie la mantenga.
   */
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargandoReceta, setCargandoReceta] = useState(false);

  const esFabricacion = useMemo(
    () => esRubroFabricacion(auth?.empresa?.rubro?.nombre),
    [auth?.empresa?.rubro?.nombre],
  );

  const insumosDuplicados = useMemo(() => {
    const contador = new Map<number, number>();
    componentes.forEach((item) => {
      if (!item.productoInsumoId) return;
      const id = Number(item.productoInsumoId);
      contador.set(id, (contador.get(id) || 0) + 1);
    });
    return new Set(
      Array.from(contador.entries())
        .filter(([, cantidad]) => cantidad > 1)
        .map(([id]) => id),
    );
  }, [componentes]);

  const hayInsumosDuplicados = insumosDuplicados.size > 0;

  const hayInsumoIgualProductoFinal = useMemo(() => {
    if (!form.productoFinalId) return false;
    const productoFinalId = Number(form.productoFinalId);
    return componentes.some(
      (item) =>
        item.productoInsumoId &&
        Number(item.productoInsumoId) === productoFinalId,
    );
  }, [componentes, form.productoFinalId]);

  const bloqueoFormulario = hayInsumosDuplicados || hayInsumoIgualProductoFinal;

  const chipsInsumos = useMemo(() => {
    return componentes
      .map((item, index) => {
        if (!item.productoInsumoId) return null;
        const id = Number(item.productoInsumoId);
        return {
          index,
          id,
          label: productoLabelMap[id] || `Insumo #${id}`,
          cantidadBase: item.cantidadBase,
          unidadBase: item.unidadBase,
          duplicado: insumosDuplicados.has(id),
          esProductoFinal:
            !!form.productoFinalId && id === Number(form.productoFinalId),
        };
      })
      .filter(Boolean) as Array<{
      index: number;
      id: number;
      label: string;
      cantidadBase: number | '';
      unidadBase: string;
      duplicado: boolean;
      esProductoFinal: boolean;
    }>;
  }, [componentes, form.productoFinalId, insumosDuplicados, productoLabelMap]);

  const formatearProducto = (producto: ProductoOption) => {
    const codigo = producto.codigo || `ID ${producto.id}`;
    const descripcion = producto.descripcion || 'Sin descripción';
    const codigoBarras = producto.codigoBarras
      ? ` · Barras: ${producto.codigoBarras}`
      : '';
    return `${codigo} · ${descripcion}${codigoBarras}`;
  };

  const cargarOpcionesProducto = async (
    search = '',
    callback?: () => void,
  ) => {
    try {
      const resp: any = await apiClient.get('/productos', {
        params: { search, page: 1, limit: 20 },
      });
      if (resp?.data?.code === 1) {
        const productos: ProductoOption[] = resp.data.data?.productos || [];
        const mapNuevos = productos.reduce<Record<number, string>>(
          (acumulado, item) => {
            acumulado[item.id] = formatearProducto(item);
            return acumulado;
          },
          {},
        );
        setProductoOptions(
          productos.map((item) => ({
            id: item.id,
            value: formatearProducto(item),
          })),
        );
        setProductoLabelMap((prev) => ({ ...prev, ...mapNuevos }));
      }
    } catch {
      // Se notifica en interacción explícita del usuario al crear/guardar.
    } finally {
      callback?.();
    }
  };

  const buscarProductos = (query: string, callback: () => void) => {
    void cargarOpcionesProducto(query, callback);
  };

  const cargarRecetas = async () => {
    try {
      setLoading(true);
      const resp: any = await apiClient.get('/produccion/recetas');
      if (resp?.data?.code === 1) {
        setRecetas(resp.data.data || []);
      } else {
        alert(resp?.data?.message || 'No se pudo cargar recetas', 'error');
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || 'No se pudo cargar recetas',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (esFabricacion) {
      void cargarRecetas();
      void cargarOpcionesProducto();
    }
  }, [esFabricacion]);

  const agregarComponente = () => {
    setComponentes((prev) => [
      ...prev,
      { productoInsumoId: '', cantidadBase: '', unidadBase: 'GR' },
    ]);
  };

  const quitarComponente = (index: number) => {
    setComponentes((prev) => prev.filter((_, idx) => idx !== index));
  };

  const actualizarComponente = (
    index: number,
    field: keyof ComponenteForm,
    value: string,
  ) => {
    setComponentes((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (field === 'productoInsumoId' || field === 'cantidadBase') {
          return {
            ...item,
            [field]: value === '' ? '' : Number(value),
          };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const onSelectProductoFinal = (
    id: any,
    _value: string,
    _name: string,
    _idField?: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      productoFinalId: id ? Number(id) : '',
    }));
  };

  const onSelectProductoInsumo =
    (index: number) =>
    (id: any, _value: string, _name: string, _idField?: string) => {
      actualizarComponente(index, 'productoInsumoId', id ? String(id) : '');
    };

  const limpiarFormulario = () => {
    setForm({
      productoFinalId: '',
      codigo: '',
      nombre: '',
      rendimientoObjetivo: '',
      unidadRendimiento: 'UN',
    });
    setComponentes([{ productoInsumoId: '', cantidadBase: '', unidadBase: 'GR' }]);
    setEditandoId(null);
    setModalAbierto(false);
  };

  /** Abre el modal en blanco para dar de alta una receta. */
  const nuevaReceta = () => {
    setForm({
      productoFinalId: '',
      codigo: '',
      nombre: '',
      rendimientoObjetivo: '',
      unidadRendimiento: 'UN',
    });
    setComponentes([{ productoInsumoId: '', cantidadBase: '', unidadBase: 'GR' }]);
    setEditandoId(null);
    setModalAbierto(true);
  };

  /**
   * Trae la receta COMPLETA: el listado solo devuelve cuántos componentes tiene,
   * no cuáles. Sin esta llamada el formulario se abriría vacío y guardar dejaría
   * la receta sin insumos.
   */
  const editarReceta = async (recetaId: number) => {
    try {
      setCargandoReceta(true);
      const resp: any = await apiClient.get(`/produccion/recetas/${recetaId}`);
      const r = resp?.data?.data;
      if (!r) {
        alert('No se pudo abrir la receta', 'error');
        return;
      }
      // Las etiquetas salen de `productoLabelMap`, que solo tiene lo que se haya
      // buscado antes. La receta trae código y descripción de todos sus
      // productos: se añaden aquí o el formulario se abre con "Insumo #349".
      const etiquetas: Record<number, string> = {};
      if (r.productoFinal?.id) {
        etiquetas[r.productoFinal.id] = formatearProducto(r.productoFinal);
      }
      for (const c of r.componentes ?? []) {
        if (c.productoInsumo?.id) {
          etiquetas[c.productoInsumo.id] = formatearProducto(c.productoInsumo);
        }
      }
      setProductoLabelMap((prev) => ({ ...prev, ...etiquetas }));
      setProductoOptions((prev) => {
        const vistos = new Set(prev.map((o) => o.id));
        const nuevos = Object.entries(etiquetas)
          .filter(([id]) => !vistos.has(Number(id)))
          .map(([id, value]) => ({ id: Number(id), value }));
        return [...prev, ...nuevos];
      });

      setForm({
        productoFinalId: r.productoFinalId ?? r.productoFinal?.id ?? '',
        codigo: r.codigo ?? '',
        nombre: r.nombre ?? '',
        rendimientoObjetivo: Number(r.rendimientoObjetivo) || '',
        unidadRendimiento: r.unidadRendimiento ?? 'UN',
      });
      setComponentes(
        (r.componentes ?? []).map((c: any) => ({
          productoInsumoId: c.productoInsumoId ?? c.productoInsumo?.id ?? '',
          cantidadBase: String(Number(c.cantidadBase)),
          unidadBase: c.unidadBase ?? 'UN',
        })),
      );
      setEditandoId(recetaId);
      setModalAbierto(true);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'No se pudo abrir la receta', 'error');
    } finally {
      setCargandoReceta(false);
    }
  };

  /** Apaga o enciende una receta sin borrarla: lo que ya se fabricó con ella se queda. */
  const alternarActiva = async (receta: Receta) => {
    try {
      const resp: any = await apiClient.patch(`/produccion/recetas/${receta.id}`, {
        activo: !receta.activo,
      });
      if (resp?.data?.code === 1) {
        alert(receta.activo ? 'Receta desactivada' : 'Receta activada', 'success');
        await cargarRecetas();
      } else {
        alert(resp?.data?.message || 'No se pudo cambiar el estado', 'error');
      }
    } catch (error: any) {
      alert(error?.response?.data?.message || 'No se pudo cambiar el estado', 'error');
    }
  };

  const crearReceta = async () => {
    if (!form.productoFinalId || !form.codigo.trim() || !form.nombre.trim()) {
      alert('Completa producto final, código y nombre', 'warning');
      return;
    }
    if (!form.rendimientoObjetivo) {
      alert('Ingresa el rendimiento objetivo', 'warning');
      return;
    }
    if (
      componentes.length === 0 ||
      componentes.some(
        (item) => !item.productoInsumoId || !item.cantidadBase || !item.unidadBase,
      )
    ) {
      alert('Completa todos los componentes', 'warning');
      return;
    }
    const insumosUnicos = new Set(
      componentes.map((item) => Number(item.productoInsumoId)),
    );
    if (insumosUnicos.size !== componentes.length) {
      alert('No repitas el mismo insumo en la receta', 'warning');
      return;
    }
    if (hayInsumoIgualProductoFinal) {
      alert('El producto final no puede repetirse como insumo', 'warning');
      return;
    }

    try {
      setGuardando(true);
      const payload = {
        productoFinalId: Number(form.productoFinalId),
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        rendimientoObjetivo: Number(form.rendimientoObjetivo),
        unidadRendimiento: form.unidadRendimiento.trim().toUpperCase(),
        componentes: componentes.map((item, idx) => ({
          productoInsumoId: Number(item.productoInsumoId),
          cantidadBase: Number(item.cantidadBase),
          unidadBase: item.unidadBase.trim().toUpperCase(),
          orden: idx + 1,
        })),
      };

      // Mismo cuerpo para las dos: el backend reemplaza los componentes enteros
      // al recibirlos, así que editar es volver a mandar la receta completa.
      const resp: any = editandoId
        ? await apiClient.patch(`/produccion/recetas/${editandoId}`, payload)
        : await apiClient.post('/produccion/recetas', payload);
      if (resp?.data?.code === 1) {
        alert(
          editandoId ? 'Receta actualizada correctamente' : 'Receta creada correctamente',
          'success',
        );
        limpiarFormulario();
        await cargarRecetas();
      } else {
        alert(resp?.data?.message || 'No se pudo guardar la receta', 'error');
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || 'No se pudo guardar la receta',
        'error',
      );
    } finally {
      setGuardando(false);
    }
  };

  const descargarPlantilla = async () => {
    try {
      setDescargandoPlantilla(true);
      const resp = await apiClient.get('/produccion/plantilla-carga', {
        responseType: 'blob',
      });
      const blob = new Blob([resp.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_fabricacion_vendify.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(
        error?.response?.data?.message || 'No se pudo descargar la plantilla',
        'error',
      );
    } finally {
      setDescargandoPlantilla(false);
    }
  };

  const importarPlantilla = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.xlsx')) {
      alert('Selecciona un archivo Excel válido (.xlsx)', 'warning');
      event.target.value = '';
      return;
    }

    try {
      setImportandoPlantilla(true);
      const formData = new FormData();
      formData.append('file', file);
      const resp: any = await apiClient.post(
        '/produccion/importar-plantilla',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );

      if (resp?.data?.code === 1) {
        const data = resp.data.data || {};
        alert(
          `Importación completada. Productos: +${data?.productos?.creados || 0} nuevos, ${data?.productos?.actualizados || 0} actualizados. Recetas: +${data?.recetas?.creadas || 0}. Órdenes: +${data?.ordenes?.creadas || 0}.`,
          'success',
        );
        await cargarRecetas();
      } else {
        alert(resp?.data?.message || 'No se pudo importar plantilla', 'error');
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || 'No se pudo importar plantilla',
        'error',
      );
    } finally {
      setImportandoPlantilla(false);
      event.target.value = '';
    }
  };

  if (!esFabricacion) {
    return (
      <div
        className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta"
      >
        <div className="max-w-xl mx-auto mt-10 bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-8 text-center">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 dark:text-amber-400 grid place-items-center mx-auto mb-4">
            <Icon icon="solar:lock-keyhole-minimalistic-linear" className="text-3xl" />
          </div>
          <h2 className="text-[18px] font-extrabold text-slate-800 dark:text-white">
            Módulo no disponible
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Este módulo está disponible solo para rubros de fabricación.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Producción</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>
          Recetas
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">
            Recetas de Producción
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Configura insumos y rendimientos para cada producto final.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => void descargarPlantilla()}
            disabled={descargandoPlantilla}
            className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <Icon icon="solar:download-minimalistic-linear" />
            {descargandoPlantilla ? 'Descargando…' : 'Descargar plantilla'}
          </button>
          <input
            ref={inputPlantillaRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => void importarPlantilla(e)}
          />
          <button
            onClick={() => inputPlantillaRef.current?.click()}
            disabled={importandoPlantilla}
            className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            <Icon icon="solar:upload-minimalistic-linear" />
            {importandoPlantilla ? 'Importando…' : 'Importar Excel'}
          </button>
          <button
            onClick={() => void cargarRecetas()}
            className="h-9 px-4 rounded-xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
            style={{ background: ACCENT }}
          >
            <Icon
              icon="solar:refresh-linear"
              className={loading ? 'animate-spin' : ''}
            />
            Recargar
          </button>
          <button
            onClick={nuevaReceta}
            className="h-10 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
            style={{ background: ACCENT }}
          >
            <Icon icon="solar:add-circle-linear" className="text-lg" />
            Nueva receta
          </button>
        </div>
      </div>

      {/* Banner de ayuda */}
      <div className="flex items-start gap-3 bg-white dark:bg-[#111827] rounded-2xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-4 mb-5">
        <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 grid place-items-center shrink-0">
          <Icon icon="solar:lightbulb-bolt-linear" className="text-lg" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Flujo rápido: 1) Descarga plantilla, 2) completa hojas{' '}
          <strong className="text-slate-700 dark:text-slate-200">PRODUCTOS</strong> y{' '}
          <strong className="text-slate-700 dark:text-slate-200">RECETAS</strong>, 3) opcional hoja{' '}
          <strong className="text-slate-700 dark:text-slate-200">ORDENES</strong>, 4) importa el
          archivo para crear todo de una vez.
        </p>
      </div>

      {/* El alta y la edición viven en un modal: la pantalla es la LISTA. Antes
          el formulario estaba siempre desplegado encima de la tabla y, con una
          receta de 19 insumos, había que bajar media pantalla para ver las
          recetas que ya existían. */}
      <Modal
        isOpenModal={modalAbierto}
        closeModal={limpiarFormulario}
        title={
          editandoId
            ? `Editar receta${form.codigo ? ` · ${form.codigo}` : ''}`
            : 'Nueva receta'
        }
        icon="solar:chef-hat-linear"
        width="920px"
      >
        <div className="p-5 space-y-4">
        {/* Dos filas: arriba lo que IDENTIFICA la receta, abajo lo que la mide.
            El producto final es el campo con el texto más largo —código más
            descripción— y se lleva la mitad del ancho. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Select
              label="Producto final"
              name="productoFinal"
              options={productoOptions}
              value={
                form.productoFinalId
                  ? productoLabelMap[Number(form.productoFinalId)] || ''
                  : ''
              }
              onChange={onSelectProductoFinal}
              isSearch
              handleGetData={buscarProductos}
              withLabel
              error={null}
            />
          </div>
          <InputPro
            name="codigo"
            isLabel
            label="Código receta"
            placeholder="Ej: REC-001"
            value={form.codigo}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, codigo: e.target.value }))
            }
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px_160px] gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <InputPro
            name="nombre"
            isLabel
            label="Nombre receta"
            placeholder="Nombre de receta"
            value={form.nombre}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, nombre: e.target.value }))
            }
          />
          <InputPro
            name="rendimientoObjetivo"
            type="number"
            isLabel
            label="Rendimiento objetivo"
            placeholder="Ej: 100"
            value={form.rendimientoObjetivo}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                rendimientoObjetivo: e.target.value
                  ? Number(e.target.value)
                  : '',
              }))
            }
          />
          <InputPro
            name="unidadRendimiento"
            isLabel
            label="Unidad rendimiento"
            placeholder="Ej: LT, KG, UN"
            value={form.unidadRendimiento}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                unidadRendimiento: e.target.value.toUpperCase(),
              }))
            }
          />
        </div>

        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Componentes</p>
            <button
              onClick={agregarComponente}
              className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors hover:bg-violet-50 dark:hover:bg-violet-900/20"
              style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
            >
              <Icon icon="solar:add-circle-linear" /> Agregar componente
            </button>
          </div>
          {hayInsumosDuplicados && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
              <Icon icon="solar:danger-triangle-linear" />
              Tienes insumos repetidos. Debes dejar solo uno por componente.
            </p>
          )}
          {hayInsumoIgualProductoFinal && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
              <Icon icon="solar:danger-triangle-linear" />
              El producto final no puede estar en la lista de insumos.
            </p>
          )}
          {componentes.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_118px_104px_auto] gap-2 items-end"
            >
              <div
                className={
                  item.productoInsumoId &&
                  (insumosDuplicados.has(Number(item.productoInsumoId)) ||
                    (form.productoFinalId &&
                      Number(item.productoInsumoId) === Number(form.productoFinalId)))
                    ? 'rounded-xl ring-2 ring-rose-300'
                    : ''
                }
              >
                <Select
                  label={`Insumo #${index + 1}`}
                  name={`insumo-${index}`}
                  options={productoOptions}
                  onChange={onSelectProductoInsumo(index)}
                  isSearch
                  handleGetData={buscarProductos}
                  value={
                    item.productoInsumoId
                      ? productoLabelMap[Number(item.productoInsumoId)] || ''
                      : ''
                  }
                  withLabel
                  error={null}
                />
              </div>
              <InputPro
                name={`cantidadBase-${index}`}
                type="number"
                isLabel
                label="Cantidad base"
                placeholder="Cantidad base"
                value={item.cantidadBase}
                onChange={(e) =>
                  actualizarComponente(index, 'cantidadBase', e.target.value)
                }
              />
              <InputPro
                name={`unidadBase-${index}`}
                isLabel
                label="Unidad base"
                placeholder="GR, ML, UN..."
                value={item.unidadBase}
                onChange={(e) =>
                  actualizarComponente(
                    index,
                    'unidadBase',
                    e.target.value.toUpperCase(),
                  )
                }
              />
              <button
                onClick={() => quitarComponente(index)}
                disabled={componentes.length === 1}
                className="h-11 px-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50 transition-colors"
              >
                <Icon icon="solar:trash-bin-trash-linear" /> Quitar
              </button>
            </div>
          ))}
        </div>

        {/* Pie fijo: con 19 insumos los botones quedaban al final de un scroll
            largo y había que recorrer la lista entera para guardar. */}
        <div className="sticky bottom-0 -mx-5 -mb-5 px-5 py-3 flex items-center justify-end gap-2 bg-white/95 dark:bg-[#111827]/95 backdrop-blur border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={limpiarFormulario}
            disabled={guardando}
            className="h-11 px-4 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => void crearReceta()}
            disabled={guardando || bloqueoFormulario}
            className="h-11 px-5 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 disabled:opacity-50 disabled:shadow-none transition-all"
            style={{ background: ACCENT }}
          >
            <Icon icon="solar:diskette-linear" className="text-lg" />
            {guardando
              ? 'Guardando…'
              : editandoId
                ? 'Guardar cambios'
                : 'Crear receta'}
          </button>
        </div>
        </div>
      </Modal>

      {/* Card: Recetas registradas */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 grid place-items-center">
            <Icon icon="solar:notebook-linear" className="text-lg" />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white">
            Recetas registradas
          </h2>
          <span className="ml-auto text-sm text-slate-400 font-medium">
            {recetas.length.toLocaleString('es-PE')} recetas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 pl-5 pr-3">Código</th>
                <th className="py-3 px-3">Nombre</th>
                <th className="py-3 px-3">Producto Final</th>
                <th className="py-3 px-3">Rendimiento</th>
                <th className="py-3 px-3">Componentes</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                    <td colSpan={7} className="py-3.5 px-5">
                      <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : recetas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Icon
                      icon="solar:notebook-linear"
                      className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-2"
                    />
                    <p className="text-slate-400 text-sm">
                      Aún no hay recetas.
                    </p>
                  </td>
                </tr>
              ) : (
                recetas.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="py-3 pl-5 pr-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        {item.codigo}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                          {String(item.nombre || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[200px]">
                          {item.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                      {item.productoFinal?.descripcion || '—'}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-white text-sm">
                      {item.rendimientoObjetivo} {item.unidadRendimiento}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400">
                      {item._count?.componentes || 0}
                    </td>
                    <td className="py-3 px-3 pr-5">
                      {item.activo ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 pr-5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void editarReceta(item.id)}
                          disabled={cargandoReceta}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20 disabled:opacity-50"
                        >
                          <Icon icon="solar:pen-bold" className="text-sm" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void alternarActiva(item)}
                          title={item.activo
                            ? 'Dejar de usarla sin borrarla'
                            : 'Volver a usarla'}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Icon
                            icon={item.activo ? 'solar:pause-bold' : 'solar:play-bold'}
                            className="text-sm"
                          />
                          {item.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
