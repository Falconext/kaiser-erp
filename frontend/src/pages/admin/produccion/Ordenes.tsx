import { useEffect, useMemo, useState } from 'react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';
import { esRubroFabricacion } from '@/utils/rubro-features';
import Select from '@/components/Select';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import DataTable from '@/components/Datatable';
import Modal from '@/components/Modal';
import TableActionMenu from '@/components/TableActionMenu';
import { Icon } from '@iconify/react/dist/iconify.js';
import { Calendar } from '@/components/Date';
import { usePuedeEscribir } from '@/hooks/usePuedeEscribir';

const ACCENT = 'var(--accent, #7551FF)';

type Orden = {
  id: number;
  loteProduccion: string;
  estado: string;
  cantidadObjetivo: number | string;
  cantidadProducida: number | string;
  mermaTotal: number | string;
  mermaValorizada?: number | string;
  creadoEn: string;
  receta?: {
    id: number;
    codigo?: string;
    nombre?: string;
    mermaObjetivoPorcentaje?: number | string;
  };
  productoFinal?: { id: number; codigo?: string; descripcion?: string };
  /// Dónde se fabrica, fijado al crear. En null son las órdenes de antes, que
  /// siguen cayendo a la sede del usuario que las cierra.
  sedeId?: number | null;
  sede?: { id: number; nombre: string } | null;
  /// El pedido que la origina.
  comprobanteId?: number | null;
  comprobante?: { id: number; serie: string; correlativo: number } | null;
  maquina?: string | null;
  encargadoNombre?: string | null;
};

type OrdenDetalle = {
  id: number;
  loteProduccion: string;
  estado: string;
  cantidadObjetivo: number | string;
  componentes: Array<{
    productoInsumoId: number;
    cantidadTeorica: number | string;
    cantidadConsumida: number | string;
    mermaCantidad: number | string;
    entregadoCantidad?: number | string;
    unidad: string;
    productoInsumo?: { id: number; codigo?: string; descripcion?: string };
  }>;
};

// Los TRES niveles de la liquidación. `cantidadReceta`, las desviaciones contra
// receta y los importes llegan en `null` cuando no se pueden calcular: la tabla
// los pinta como «—» o «sin costo» y nunca como 0, que se leería como un dato.
type ResumenMaterial = {
  componenteId: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  tipoCantidad?: string | null;
  cantidadReceta: number | null;
  cantidadTeorica: number;
  /// Lo que almacén sacó del almacén para esta orden. En 0 = no se usó la
  /// entrega, que es como funcionaban todas las órdenes hasta ahora.
  cantidadEntregada: number;
  cantidadConsumida: number;
  cantidadSobrante: number;
  sobranteRegistrado: number;
  mermaCantidad: number;
  mermaReutilizable: number;
  mermaDescarte: number;
  desvioOrdenVsReceta: number | null;
  desvioOrdenVsRecetaPct: number | null;
  desvioRealVsOrden: number;
  desvioRealVsOrdenPct: number | null;
  costoUnitario: number | null;
  mermaValorizada: number | null;
  sinCosto: boolean;
};

type ResumenTotales = {
  teorico: number;
  entregado: number;
  consumido: number;
  merma: number;
  mermaReutilizable: number;
  mermaDescarte: number;
  sobranteRegistrado: number;
  mermaValorizada: number;
  // Cuántos componentes no se pueden valorizar. Si hay alguno, la merma
  // valorizada de al lado está INCOMPLETA y hay que decirlo.
  sinCosto: number;
};

// El «kilo por metro cuadrado» de planta: el estándar de la receta frente a lo
// que salió de verdad. `estandar` en null = la orden no nace de una receta.
type ResumenRendimiento = {
  insumoPrincipal: string;
  unidad: string;
  estandar: number | null;
  real: number;
  desvioPct: number | null;
};

type RecetaOption = {
  id: number;
  codigo?: string;
  nombre?: string;
  productoFinal?: { id: number; descripcion?: string };
};

type ProductoOption = {
  id: number;
  codigo?: string;
  descripcion?: string;
  codigoBarras?: string;
};

type SelectOption = {
  id: number | string;
  value: string;
};

type MetodoSalidaLotes = 'LIFO' | 'FIFO' | 'FEFO';

type HistorialConfig = {
  id: number;
  detalle?: string;
  autorNombre: string;
  creadoEn: string;
};

type ComponenteEjecucionForm = {
  productoInsumoId: number;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidadTeorica: number;
  /// Lo que almacén ya sacó para esta orden. Se muestra, no se teclea: es con
  /// lo que planta cuenta, y lo que no use vuelve al almacén al cerrar.
  entregado: number;
  cantidadConsumida: number | '';
  mermaCantidad: number | '';
  /// De la merma, cuánto sirve para volver a usarse. Lo decide quien pesa: el
  /// mismo alambre da retazo aprovechable en un corte y chatarra en el
  /// siguiente. Entra al almacén de mermas como producto propio.
  mermaReutilizableCantidad: number | '';
  /// Entregado a planta y no usado. No es merma —no se consumió— y no mueve
  /// inventario: lo que no se usó nunca salió del almacén.
  sobranteCantidad: number | '';
  observacion: string;
};

export default function ProduccionOrdenesPage() {
  const { auth } = useAuthStore();
  const alert = useAlertStore((state) => state.alert);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState('');
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [resumenOrdenId, setResumenOrdenId] = useState<number | null>(null);
  const [resumenMateriales, setResumenMateriales] = useState<ResumenMaterial[]>([]);
  const [resumenTotales, setResumenTotales] = useState<ResumenTotales | null>(
    null,
  );
  const [resumenRendimiento, setResumenRendimiento] =
    useState<ResumenRendimiento | null>(null);
  // Avisos que devuelve la ejecución: hoy el único es «no hay almacén de
  // mermas». La orden se cierra igual —una configuración que falta no puede
  // impedir que planta registre lo que ya fabricó— pero hay que verlo.
  const [avisosEjecucion, setAvisosEjecucion] = useState<string[]>([]);
  const [recetasBase, setRecetasBase] = useState<RecetaOption[]>([]);
  const [recetaOptions, setRecetaOptions] = useState<SelectOption[]>([]);
  const [productoOptions, setProductoOptions] = useState<SelectOption[]>([]);
  const [metodoSalidaLotes, setMetodoSalidaLotes] =
    useState<MetodoSalidaLotes>('LIFO');
  const [guardandoMetodo, setGuardandoMetodo] = useState(false);
  const [historialConfig, setHistorialConfig] = useState<HistorialConfig[]>([]);
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);
  const [openAccionesId, setOpenAccionesId] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  // Almacén entra a esta pantalla para UNA cosa: entregar el material. Todo
  // lo que decide sobre la fabricación —crear, planificar, finalizar, anular—
  // es de producción, y el backend lo exige igual; ocultarlo evita ofrecer
  // botones que devolverían 403.
  const puedeProducir = usePuedeEscribir('produccion');
  const puedeEntregarMaterial = usePuedeEscribir('produccion', 'kardex:escribir');
  const [isFinalizarModalOpen, setIsFinalizarModalOpen] = useState(false);
  const [cargandoFinalizar, setCargandoFinalizar] = useState(false);
  const [guardandoFinalizar, setGuardandoFinalizar] = useState(false);
  const [ordenFinalizar, setOrdenFinalizar] = useState<OrdenDetalle | null>(null);
  const [ejecucionForm, setEjecucionForm] = useState({
    fechaInicio: '',
    fechaFin: '',
    cantidadProducida: '' as number | '',
    mermaTotal: '' as number | '',
    observaciones: '',
    // Planta los sabe al TERMINAR, no al planificar. Lo que se deje en blanco
    // conserva lo que ya tuviera la orden; no se borra nada por omitirlo.
    maquina: '',
    encargadoNombre: '',
    pesoRefRollo: '' as number | '',
    diametroCm: '' as number | '',
    alturaRolloM: '' as number | '',
    componentes: [] as ComponenteEjecucionForm[],
  });

  const mermaTotalCalculada = useMemo(
    () =>
      ejecucionForm.componentes.reduce(
        (acc, item) => acc + Number(item.mermaCantidad || 0),
        0,
      ),
    [ejecucionForm.componentes],
  );

  const [form, setForm] = useState({
    recetaId: '' as number | '',
    productoFinalId: '' as number | '',
    loteProduccion: '',
    cantidadObjetivo: '' as number | '',
    sedeId: '' as number | '',
    comprobanteId: '' as number | '',
    maquina: '',
    encargadoNombre: '',
  });
  // Entrega de material a planta. Es la salida REAL del almacén: hasta que
  // existió, el material salía al cerrar la orden y por eso el sobrante no
  // podía volver.
  const [isEntregaModalOpen, setIsEntregaModalOpen] = useState(false);
  const [ordenEntrega, setOrdenEntrega] = useState<OrdenDetalle | null>(null);
  const [cargandoEntrega, setCargandoEntrega] = useState(false);
  const [guardandoEntrega, setGuardandoEntrega] = useState(false);
  const [entregaForm, setEntregaForm] = useState<
    {
      productoInsumoId: number;
      codigo: string;
      descripcion: string;
      unidad: string;
      teorica: number;
      yaEntregado: number;
      cantidad: number | '';
    }[]
  >([]);
  const [sedeOptions, setSedeOptions] = useState<SelectOption[]>([]);
  const [pedidoOptions, setPedidoOptions] = useState<SelectOption[]>([]);
  const [sedeLabel, setSedeLabel] = useState('');
  const [pedidoLabel, setPedidoLabel] = useState('');

  const metodoSalidaOptions: SelectOption[] = [
    { id: 'LIFO', value: 'LIFO (último que entra, primero que sale)' },
    { id: 'FIFO', value: 'FIFO (primero que entra, primero que sale)' },
    { id: 'FEFO', value: 'FEFO (vence primero, sale primero)' },
  ];

  const estadoOptions: SelectOption[] = [
    { id: 'TODOS', value: 'Todos' },
    { id: 'BORRADOR', value: 'BORRADOR' },
    { id: 'PLANIFICADA', value: 'PLANIFICADA' },
    { id: 'EN_PROCESO', value: 'EN PROCESO' },
    { id: 'FINALIZADA', value: 'FINALIZADA' },
    { id: 'ANULADA', value: 'ANULADA' },
  ];

  const esFabricacion = useMemo(
    () => esRubroFabricacion(auth?.empresa?.rubro?.nombre),
    [auth?.empresa?.rubro?.nombre],
  );

  const formatearReceta = (item: RecetaOption) => {
    const codigo = item.codigo || `REC-${item.id}`;
    const nombre = item.nombre || 'Sin nombre';
    const productoFinal = item.productoFinal?.descripcion
      ? ` · ${item.productoFinal.descripcion}`
      : '';
    return `${codigo} · ${nombre}${productoFinal}`;
  };

  const formatearProducto = (producto: ProductoOption) => {
    const codigo = producto.codigo || `ID ${producto.id}`;
    const descripcion = producto.descripcion || 'Sin descripción';
    const codigoBarras = producto.codigoBarras
      ? ` · Barras: ${producto.codigoBarras}`
      : '';
    return `${codigo} · ${descripcion}${codigoBarras}`;
  };

  const cargarRecetasActivas = async () => {
    try {
      const resp: any = await apiClient.get('/produccion/recetas', {
        params: { activo: true },
      });
      if (resp?.data?.code === 1) {
        const data: RecetaOption[] = resp.data.data || [];
        setRecetasBase(data);
        setRecetaOptions(
          data.map((item) => ({
            id: item.id,
            value: formatearReceta(item),
          })),
        );
      }
    } catch {
      // la validación final ocurre al guardar orden
    }
  };

  const cargarConfiguracionProduccion = async () => {
    try {
      const resp: any = await apiClient.get('/produccion/config');
      if (resp?.data?.code === 1) {
        const metodo = String(resp.data.data?.metodoSalidaLotes || 'LIFO')
          .trim()
          .toUpperCase() as MetodoSalidaLotes;
        setMetodoSalidaLotes(
          metodo === 'FIFO' || metodo === 'FEFO' ? metodo : 'LIFO',
        );
      }
    } catch {
      // Si falla config, se mantiene LIFO.
    }
  };

  const cargarHistorialConfiguracion = async () => {
    try {
      const resp: any = await apiClient.get('/produccion/config/historial', {
        params: { limit: 6 },
      });
      if (resp?.data?.code === 1) {
        setHistorialConfig(resp.data.data || []);
      }
    } catch {
      // opcional para vista
    }
  };

  const guardarConfiguracionProduccion = async (metodo: MetodoSalidaLotes) => {
    try {
      setGuardandoMetodo(true);
      const resp: any = await apiClient.patch('/produccion/config', {
        metodoSalidaLotes: metodo,
      });
      if (resp?.data?.code === 1) {
        setMetodoSalidaLotes(metodo);
        alert('Método de salida actualizado', 'success');
        await cargarHistorialConfiguracion();
      } else {
        alert(
          resp?.data?.message || 'No se pudo actualizar método de salida',
          'error',
        );
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
          'No se pudo actualizar método de salida',
        'error',
      );
    } finally {
      setGuardandoMetodo(false);
    }
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
        setProductoOptions(
          productos.map((item) => ({
            id: item.id,
            value: formatearProducto(item),
          })),
        );
      }
    } catch {
      // la validación final ocurre al guardar orden
    } finally {
      callback?.();
    }
  };

  const buscarProductos = (query: string, callback: () => void) => {
    void cargarOpcionesProducto(query, callback);
  };

  /**
   * Sedes donde se puede fabricar. Va con `excluirMerma`: el almacén de mermas
   * es donde CAE el retazo, no un sitio donde se produce.
   */
  const cargarSedes = async () => {
    try {
      const resp: any = await apiClient.get('/sede', {
        params: { excluirMerma: 'true' },
      });
      const sedes: any[] = resp?.data?.data ?? [];
      setSedeOptions([
        { id: 0, value: 'Sin fijar (la del usuario al cerrar)' },
        ...sedes
          .filter((s) => s.activo !== false)
          .map((s) => ({ id: s.id, value: s.nombre })),
      ]);
    } catch {
      // el selector es opcional: sin él la orden nace sin sede, como antes
    }
  };

  const cargarPedidos = async (search = '', callback?: () => void) => {
    try {
      const params: any = { tipoComprobante: 'COTIZACION', page: 1, limit: 20 };
      if (search) params.search = search;
      const resp: any = await apiClient.get('/comprobante/listar', { params });
      const lista: any[] = resp?.data?.data?.comprobantes ?? [];
      setPedidoOptions([
        { id: 0, value: 'Sin pedido' },
        ...lista.map((c) => ({
          id: c.id,
          value: `${c.serie}-${String(c.correlativo).padStart(8, '0')} · ${c.cliente?.nombre ?? 'Cliente varios'}`,
        })),
      ]);
    } catch {
      // igual que arriba: el enlace al pedido es opcional
    } finally {
      callback?.();
    }
  };

  const cargarOrdenes = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (estadoFiltro) params.estado = estadoFiltro;
      const resp: any = await apiClient.get('/produccion/ordenes', { params });
      if (resp?.data?.code === 1) {
        setOrdenes(resp.data.data?.data || []);
      } else {
        alert(resp?.data?.message || 'No se pudo cargar órdenes', 'error');
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || 'No se pudo cargar órdenes',
        'error',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (esFabricacion) {
      void cargarOrdenes();
    }
  }, [esFabricacion, estadoFiltro]);

  useEffect(() => {
    if (esFabricacion) {
      void cargarRecetasActivas();
      void cargarOpcionesProducto();
      void cargarConfiguracionProduccion();
      void cargarHistorialConfiguracion();
      void cargarSedes();
      void cargarPedidos();
    }
  }, [esFabricacion]);

  const obtenerAlertaMerma = (orden: Orden) => {
    if (orden.estado !== 'FINALIZADA') {
      return { label: 'Sin cierre', className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-gray-400' };
    }
    const producida = Number(orden.cantidadProducida || 0);
    if (producida <= 0) {
      return {
        label: 'Finalizada sin producción',
        className: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
      };
    }
    const mermaPct = (Number(orden.mermaTotal || 0) / producida) * 100;
    const objetivo = Number(orden.receta?.mermaObjetivoPorcentaje || 0);
    if (mermaPct <= objetivo) {
      return {
        label: `OK ${mermaPct.toFixed(2)}% / Obj ${objetivo.toFixed(2)}%`,
        className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
      };
    }
    if (mermaPct <= objetivo * 1.2 || objetivo === 0) {
      return {
        label: `Alerta ${mermaPct.toFixed(2)}% / Obj ${objetivo.toFixed(2)}%`,
        className: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
      };
    }
    return {
      label: `Crítica ${mermaPct.toFixed(2)}% / Obj ${objetivo.toFixed(2)}%`,
      className: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
    };
  };

  const estadoPill = (estado: string) => {
    const map: Record<string, { bg: string; text: string; dot: string }> = {
      BORRADOR: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-gray-300', dot: 'bg-slate-400' },
      PLANIFICADA: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
      EN_PROCESO: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
      FINALIZADA: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
      ANULADA: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
    };
    return (
      map[estado] || { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-gray-300', dot: 'bg-slate-400' }
    );
  };

  const onSelectReceta = (
    id: any,
    _value: string,
    _name: string,
    _idField?: string,
  ) => {
    const recetaId = id ? Number(id) : '';
    const receta = recetasBase.find((item) => item.id === Number(id));
    setForm((prev) => ({
      ...prev,
      recetaId,
      productoFinalId: receta?.productoFinal?.id ?? prev.productoFinalId,
    }));
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

  const onSelectMetodoSalida = (
    id: any,
    _value: string,
    _name: string,
    _idField?: string,
  ) => {
    const metodo = String(id || '')
      .trim()
      .toUpperCase() as MetodoSalidaLotes;
    if (metodo === 'LIFO' || metodo === 'FIFO' || metodo === 'FEFO') {
      void guardarConfiguracionProduccion(metodo);
    }
  };

  const onSelectEstadoFiltro = (
    id: any,
    _value: string,
    _name: string,
    _idField?: string,
  ) => {
    const estado = String(id || '').trim().toUpperCase();
    setEstadoFiltro(estado === 'TODOS' ? '' : estado);
  };

  const crearOrden = async () => {
    if (!form.loteProduccion.trim()) {
      alert('Completa el lote de producción', 'warning');
      return;
    }
    // Con un pedido detrás, producto y cantidad se prellenan de su línea: no
    // tiene sentido obligar a teclear lo que el pedido ya dice.
    if (!form.comprobanteId && !form.cantidadObjetivo) {
      alert('Completa la cantidad objetivo, o elige el pedido de origen', 'warning');
      return;
    }
    if (!form.comprobanteId && !form.recetaId && !form.productoFinalId) {
      alert('Elige receta, producto final o el pedido de origen', 'warning');
      return;
    }

    try {
      setGuardando(true);
      const payload: any = {
        loteProduccion: form.loteProduccion.trim(),
      };
      if (form.cantidadObjetivo) payload.cantidadObjetivo = Number(form.cantidadObjetivo);
      if (form.recetaId) payload.recetaId = Number(form.recetaId);
      if (form.productoFinalId) payload.productoFinalId = Number(form.productoFinalId);
      if (form.sedeId) payload.sedeId = Number(form.sedeId);
      if (form.comprobanteId) payload.comprobanteId = Number(form.comprobanteId);
      if (form.maquina.trim()) payload.maquina = form.maquina.trim();
      if (form.encargadoNombre.trim()) payload.encargadoNombre = form.encargadoNombre.trim();

      const resp: any = await apiClient.post('/produccion/ordenes', payload);
      if (resp?.data?.code === 1) {
        alert('Orden creada correctamente', 'success');
        setForm({
          recetaId: '',
          productoFinalId: '',
          loteProduccion: '',
          cantidadObjetivo: '',
          sedeId: '',
          comprobanteId: '',
          maquina: '',
          encargadoNombre: '',
        });
        setSedeLabel('');
        setPedidoLabel('');
        await cargarOrdenes();
      } else {
        alert(resp?.data?.message || 'No se pudo crear orden', 'error');
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || 'No se pudo crear orden',
        'error',
      );
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (ordenId: number, estado: string) => {
    try {
      const resp: any = await apiClient.patch(
        `/produccion/ordenes/${ordenId}/estado`,
        { estado },
      );
      if (resp?.data?.code === 1) {
        alert('Estado actualizado', 'success');
        await cargarOrdenes();
      } else {
        alert(resp?.data?.message || 'No se pudo actualizar estado', 'error');
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || 'No se pudo actualizar estado',
        'error',
      );
    }
  };

  const abrirEntregaMaterial = async (ordenId: number) => {
    try {
      setCargandoEntrega(true);
      const resp: any = await apiClient.get(`/produccion/ordenes/${ordenId}`);
      if (resp?.data?.code !== 1) {
        alert(resp?.data?.message || 'No se pudo cargar orden', 'error');
        return;
      }
      const orden = resp.data.data as OrdenDetalle;
      setOrdenEntrega(orden);
      setEntregaForm(
        (orden.componentes || []).map((item) => {
          const teorica = Number(item.cantidadTeorica || 0);
          const yaEntregado = Number(item.entregadoCantidad || 0);
          // Se propone lo que FALTA por entregar, no lo teórico entero: en la
          // segunda entrega de una tanda nadie quiere volver a sacar todo.
          const pendiente = Math.max(0, teorica - yaEntregado);
          return {
            productoInsumoId: Number(item.productoInsumoId),
            codigo: item.productoInsumo?.codigo || `ID ${item.productoInsumoId}`,
            descripcion: item.productoInsumo?.descripcion || 'Sin descripción',
            unidad: item.unidad || 'UN',
            teorica,
            yaEntregado,
            cantidad: pendiente > 0 ? pendiente : '',
          };
        }),
      );
      setIsEntregaModalOpen(true);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'No se pudo cargar orden', 'error');
    } finally {
      setCargandoEntrega(false);
    }
  };

  const entregarMaterial = async () => {
    if (!ordenEntrega) return;
    const aEntregar = entregaForm.filter((item) => Number(item.cantidad) > 0);
    if (!aEntregar.length) {
      alert('Pon al menos una cantidad a entregar', 'warning');
      return;
    }
    if (entregaForm.some((item) => Number(item.cantidad || 0) < 0)) {
      alert('No se puede entregar una cantidad negativa', 'warning');
      return;
    }
    try {
      setGuardandoEntrega(true);
      const resp: any = await apiClient.post(
        `/produccion/ordenes/${ordenEntrega.id}/entregar`,
        {
          componentes: aEntregar.map((item) => ({
            productoInsumoId: item.productoInsumoId,
            cantidad: Number(item.cantidad),
          })),
        },
      );
      if (resp?.data?.code === 1) {
        alert('Material entregado a planta', 'success');
        setIsEntregaModalOpen(false);
        setOrdenEntrega(null);
        await cargarOrdenes();
      } else {
        alert(resp?.data?.message || 'No se pudo entregar el material', 'error');
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || 'No se pudo entregar el material',
        'error',
      );
    } finally {
      setGuardandoEntrega(false);
    }
  };

  const abrirFinalizarOrden = async (ordenId: number) => {
    try {
      setCargandoFinalizar(true);
      const resp: any = await apiClient.get(`/produccion/ordenes/${ordenId}`);
      if (resp?.data?.code !== 1) {
        alert(resp?.data?.message || 'No se pudo cargar orden', 'error');
        return;
      }
      const orden = resp.data.data as OrdenDetalle;
      const ahora = new Date();
      const isoLocal = (d: Date) => {
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60000);
        return local.toISOString().slice(0, 16);
      };
      const componentes = (orden.componentes || []).map((item) => ({
        productoInsumoId: Number(item.productoInsumoId),
        codigo: item.productoInsumo?.codigo || `ID ${item.productoInsumoId}`,
        descripcion: item.productoInsumo?.descripcion || 'Sin descripción',
        unidad: item.unidad || 'UN',
        cantidadTeorica: Number(item.cantidadTeorica || 0),
        entregado: Number(item.entregadoCantidad || 0),
        cantidadConsumida: Number(item.cantidadTeorica || 0),
        mermaCantidad: Number(item.mermaCantidad || 0),
        mermaReutilizableCantidad: 0,
        sobranteCantidad: 0,
        observacion: '',
      }));
      setOrdenFinalizar(orden);
      const yaOrden = orden as OrdenDetalle & {
        maquina?: string | null;
        encargadoNombre?: string | null;
      };
      setEjecucionForm({
        maquina: yaOrden.maquina ?? '',
        encargadoNombre: yaOrden.encargadoNombre ?? '',
        pesoRefRollo: '',
        diametroCm: '',
        alturaRolloM: '',
        fechaInicio: isoLocal(ahora),
        fechaFin: isoLocal(ahora),
        cantidadProducida:
          Number(orden.cantidadObjetivo || 0) > 0
            ? Number(orden.cantidadObjetivo || 0)
            : '',
        mermaTotal: '',
        observaciones: '',
        componentes,
      });
      setIsFinalizarModalOpen(true);
    } catch (error: any) {
      alert(error?.response?.data?.message || 'No se pudo cargar orden', 'error');
    } finally {
      setCargandoFinalizar(false);
    }
  };

  const actualizarComponenteEjecucion = (
    index: number,
    field:
      | 'cantidadConsumida'
      | 'mermaCantidad'
      | 'mermaReutilizableCantidad'
      | 'sobranteCantidad'
      | 'observacion',
    value: string,
  ) => {
    setEjecucionForm((prev) => ({
      ...prev,
      componentes: prev.componentes.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [field]:
                field === 'observacion'
                  ? value
                  : value === ''
                    ? ''
                    : Number(value),
            }
          : item,
      ),
    }));
  };

  const toDisplayDate = (isoLike: string) => {
    if (!isoLike) return '';
    const d = new Date(isoLike);
    if (Number.isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toIsoFromDisplayDate = (displayDate: string) => {
    if (!displayDate) return '';
    const [day, month, year] = displayDate.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00`;
  };

  const finalizarOrden = async () => {
    if (!ordenFinalizar) return;
    if (!ejecucionForm.cantidadProducida || Number(ejecucionForm.cantidadProducida) <= 0) {
      alert('Ingresa cantidad producida mayor a 0', 'warning');
      return;
    }
    if (!ejecucionForm.componentes.length) {
      alert('La orden no tiene componentes para ejecutar', 'warning');
      return;
    }
    if (
      ejecucionForm.componentes.some(
        (item) =>
          item.cantidadConsumida === '' ||
          Number(item.cantidadConsumida) < 0 ||
          item.mermaCantidad === '' ||
          Number(item.mermaCantidad) < 0,
      )
    ) {
      alert('Revisa consumos/mermas: no pueden ser negativos', 'warning');
      return;
    }
    // El reutilizable es una PARTE de la merma, no algo aparte: lo que pase de
    // ahí sería retazo que nunca salió del almacén. El backend lo rechaza
    // igual; avisar aquí evita el viaje y dice qué componente es.
    const excedido = ejecucionForm.componentes.find(
      (item) =>
        Number(item.mermaReutilizableCantidad || 0) >
        Number(item.mermaCantidad || 0),
    );
    if (excedido) {
      alert(
        `${excedido.codigo}: el retazo reutilizable (${excedido.mermaReutilizableCantidad}) no puede superar la merma (${excedido.mermaCantidad}).`,
        'warning',
      );
      return;
    }
    if (
      ejecucionForm.componentes.some(
        (item) =>
          Number(item.mermaReutilizableCantidad || 0) < 0 ||
          Number(item.sobranteCantidad || 0) < 0,
      )
    ) {
      alert('El retazo y el sobrante no pueden ser negativos', 'warning');
      return;
    }

    try {
      setGuardandoFinalizar(true);
      const payload = {
        fechaInicio: ejecucionForm.fechaInicio
          ? new Date(ejecucionForm.fechaInicio).toISOString()
          : undefined,
        fechaFin: ejecucionForm.fechaFin
          ? new Date(ejecucionForm.fechaFin).toISOString()
          : undefined,
        cantidadProducida: Number(ejecucionForm.cantidadProducida),
        mermaTotal: mermaTotalCalculada,
        observaciones: ejecucionForm.observaciones || undefined,
        maquina: ejecucionForm.maquina.trim() || undefined,
        encargadoNombre: ejecucionForm.encargadoNombre.trim() || undefined,
        pesoRefRollo: ejecucionForm.pesoRefRollo === '' ? undefined : Number(ejecucionForm.pesoRefRollo),
        diametroCm: ejecucionForm.diametroCm === '' ? undefined : Number(ejecucionForm.diametroCm),
        alturaRolloM: ejecucionForm.alturaRolloM === '' ? undefined : Number(ejecucionForm.alturaRolloM),
        componentes: ejecucionForm.componentes.map((item) => ({
          productoInsumoId: item.productoInsumoId,
          cantidadConsumida: Number(item.cantidadConsumida || 0),
          mermaCantidad: Number(item.mermaCantidad || 0),
          mermaReutilizableCantidad: Number(
            item.mermaReutilizableCantidad || 0,
          ),
          sobranteCantidad: Number(item.sobranteCantidad || 0),
          observacion: item.observacion || undefined,
        })),
      };
      const resp: any = await apiClient.post(
        `/produccion/ordenes/${ordenFinalizar.id}/ejecutar`,
        payload,
      );
      if (resp?.data?.code === 1) {
        alert('Orden finalizada correctamente', 'success');
        // La orden puede cerrarse con avisos (el único de hoy: no hay almacén
        // de mermas configurado, así que el retazo no entró a ningún sitio).
        // Se muestran bajo la tabla hasta que se cierren a mano: un toast que
        // se va solo no sirve para una configuración que hay que arreglar.
        const avisos = resp.data.data?.avisos;
        setAvisosEjecucion(Array.isArray(avisos) ? avisos : []);
        setIsFinalizarModalOpen(false);
        setOrdenFinalizar(null);
        await cargarOrdenes();
      } else {
        alert(resp?.data?.message || 'No se pudo finalizar orden', 'error');
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || 'No se pudo finalizar orden',
        'error',
      );
    } finally {
      setGuardandoFinalizar(false);
    }
  };

  const verResumen = async (ordenId: number) => {
    try {
      setResumenOrdenId(ordenId);
      const resp: any = await apiClient.get(
        `/produccion/ordenes/${ordenId}/resumen-materiales`,
      );
      if (resp?.data?.code === 1) {
        setResumenMateriales(resp.data.data?.componentes || []);
        setResumenTotales(resp.data.data?.totales || null);
        setResumenRendimiento(resp.data.data?.rendimiento || null);
      } else {
        alert(resp?.data?.message || 'No se pudo cargar resumen', 'error');
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || 'No se pudo cargar resumen',
        'error',
      );
    }
  };

  const formatSoles = (value: number | string | null | undefined) => {
    const n = Number(value || 0);
    return `S/ ${n.toFixed(2)}`;
  };
  /// Un importe que NO existe se dice con palabras. Un «S/ 0.00» se lee como
  /// «es gratis», y es justo lo que miente del inventario valorizado: el
  /// componente sin costo no vale cero, es que nadie sabe cuánto vale.
  const solesONada = (value: number | null | undefined) =>
    value === null || value === undefined ? 'sin costo' : formatSoles(value);

  /// Igual para las cantidades: «—» cuando no hay con qué comparar (una orden
  /// sin receta no es una receta que pedía 0).
  const cantidadONada = (value: number | null | undefined, unidad: string) =>
    value === null || value === undefined
      ? '—'
      : `${Number(Number(value).toFixed(4))} ${unidad}`;

  /// Una desviación con su signo y su porcentaje. Verde cuando se gastó menos
  /// de lo previsto, rojo cuando más: es la lectura que planta hace de un
  /// vistazo, y el signo solo no la da.
  const desviacion = (
    valor: number | null,
    pct: number | null,
    unidad: string,
  ) => {
    if (valor === null || valor === undefined) {
      return <span className="text-slate-300 dark:text-slate-600">—</span>;
    }
    const redondeado = Number(valor.toFixed(4));
    const color =
      redondeado > 0
        ? 'text-rose-600'
        : redondeado < 0
          ? 'text-emerald-600'
          : 'text-slate-400';
    return (
      <span className={`font-semibold ${color}`}>
        {redondeado > 0 ? '+' : ''}
        {redondeado} {unidad}
        {pct === null || pct === undefined ? '' : ` (${pct.toFixed(1)} %)`}
      </span>
    );
  };

  const descargarLiquidacion = async () => {
    if (!resumenOrdenId) return;
    try {
      const resp = await apiClient.get(
        `/produccion/ordenes/${resumenOrdenId}/resumen-materiales/excel`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `liquidacion_orden_${resumenOrdenId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('No se pudo descargar la liquidación', 'error');
    }
  };

  const componentesEjecucionRows = ejecucionForm.componentes.map((item, index) => ({
    Componente: (
      <div>
        <div className="font-semibold text-slate-800 dark:text-white">{item.codigo}</div>
        <div className="text-xs text-slate-400">{item.descripcion}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          Teórico:{' '}
          <span className="font-semibold text-slate-500 dark:text-gray-300">
            {item.cantidadTeorica} {item.unidad}
          </span>
          {item.entregado > 0 && (
            <>
              {' · '}Entregado:{' '}
              <span className="font-semibold text-sky-600 dark:text-sky-400">
                {item.entregado} {item.unidad}
              </span>
            </>
          )}
        </div>
      </div>
    ),
    Consumido: (
      <InputPro
        name={`consumido-${item.productoInsumoId}-${index}`}
        type="number"
        value={item.cantidadConsumida}
        onChange={(e) =>
          actualizarComponenteEjecucion(index, 'cantidadConsumida', e.target.value)
        }
        className="w-28 !py-1.5"
      />
    ),
    Merma: (
      <InputPro
        name={`merma-${item.productoInsumoId}-${index}`}
        type="number"
        value={item.mermaCantidad}
        onChange={(e) =>
          actualizarComponenteEjecucion(index, 'mermaCantidad', e.target.value)
        }
        className="w-24 !py-1.5"
      />
    ),
    Reutilizable: (
      <InputPro
        name={`reutil-${item.productoInsumoId}-${index}`}
        type="number"
        value={item.mermaReutilizableCantidad}
        onChange={(e) =>
          actualizarComponenteEjecucion(
            index,
            'mermaReutilizableCantidad',
            e.target.value,
          )
        }
        className="w-20 !py-1.5"
      />
    ),
    Sobrante: (
      <InputPro
        name={`sobrante-${item.productoInsumoId}-${index}`}
        type="number"
        value={item.sobranteCantidad}
        onChange={(e) =>
          actualizarComponenteEjecucion(
            index,
            'sobranteCantidad',
            e.target.value,
          )
        }
        className="w-20 !py-1.5"
      />
    ),
    Observación: (
      <InputPro
        name={`obs-${item.productoInsumoId}-${index}`}
        type="text"
        value={item.observacion}
        onChange={(e) =>
          actualizarComponenteEjecucion(index, 'observacion', e.target.value)
        }
        className="w-full min-w-[140px] !py-1.5"
        placeholder="Opcional"
      />
    ),
  }));

  if (!esFabricacion) {
    return (
      <div
        className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0B1120] font-jakarta"
      >
        <div className="max-w-xl mx-auto mt-16 bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-8 text-center">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 grid place-items-center mb-4">
            <Icon icon="solar:factory-linear" width={28} />
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
      className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0B1120] font-jakarta"
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Producción</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>
          Órdenes
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">
            Órdenes de Producción
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Crea, sigue y controla mermas por lote de producción.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsHistorialModalOpen(true)}
            className="h-11 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Icon icon="solar:history-linear" className="text-lg" /> Historial
          </button>
          <button
            onClick={() => void cargarOrdenes()}
            className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
            style={{ background: ACCENT }}
          >
            <Icon
              icon="solar:refresh-linear"
              className={`text-lg ${loading ? 'animate-spin' : ''}`}
            />{' '}
            Recargar
          </button>
        </div>
      </div>

      {/* Método de salida */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-5 mb-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-11 w-11 rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 grid place-items-center">
              <Icon icon="solar:box-linear" width={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                Método de salida de lotes
              </p>
              <p className="text-xs text-slate-400">
                Consumo de insumos en producción
              </p>
            </div>
          </div>
          <div className="w-full md:max-w-md md:ml-auto">
            <Select
              label="Método"
              name="metodoSalidaLotes"
              options={metodoSalidaOptions}
              onChange={onSelectMetodoSalida}
              value={
                metodoSalidaOptions.find((opt) => opt.id === metodoSalidaLotes)
                  ?.value || ''
              }
              disabled={guardandoMetodo}
              withLabel
              error={null}
            />
            {guardandoMetodo ? (
              <span className="text-xs text-slate-400">Guardando...</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Ayuda de estados */}
      <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-blue-900 dark:text-blue-300 mb-5 flex gap-3">
        <Icon
          icon="solar:info-circle-linear"
          className="text-lg text-blue-500 shrink-0 mt-0.5"
        />
        <p>
          <strong>Estados:</strong> BORRADOR (aún editable), PLANIFICADA (lista
          para iniciar), EN PROCESO (consumiendo insumos), FINALIZADA (cerrada y
          ya ingresó producto final), ANULADA (cancelada).
        </p>
      </div>

      {/* Nueva Orden */}
      <div className={`bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-5 mb-5 ${puedeProducir ? '' : 'hidden'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 grid place-items-center">
            <Icon icon="solar:add-square-linear" width={20} />
          </div>
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">Nueva Orden</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select
            label="Receta (opcional)"
            name="recetaId"
            options={recetaOptions}
            onChange={onSelectReceta}
            isSearch
            withLabel
            error={null}
          />
          <Select
            label="Producto final (opcional)"
            name="productoFinalId"
            options={productoOptions}
            onChange={onSelectProductoFinal}
            isSearch
            handleGetData={buscarProductos}
            withLabel
            error={null}
          />
          <InputPro
            name="loteProduccion"
            isLabel
            label="Lote producción"
            placeholder="Ej: V052027"
            value={form.loteProduccion}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, loteProduccion: e.target.value }))
            }
          />
          <InputPro
            name="cantidadObjetivo"
            type="number"
            isLabel
            label="Cantidad objetivo"
            placeholder="Ej: 100"
            value={form.cantidadObjetivo}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                cantidadObjetivo: e.target.value ? Number(e.target.value) : '',
              }))
            }
          />
        </div>
        {/* Segunda fila: lo que faltaba en la orden. Sede y pedido son los dos
            que cambian comportamiento —dónde se descuenta el stock y de qué
            venta viene—; máquina y encargado son para poder comparar
            rendimientos después. Los cuatro son opcionales. */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <Select
            label="Sede de fabricación"
            name="sedeId"
            options={sedeOptions}
            value={sedeLabel}
            onChange={(id: any, value: string) => {
              const n = Number(id);
              setForm((prev) => ({ ...prev, sedeId: n > 0 ? n : '' }));
              setSedeLabel(n > 0 ? value : '');
            }}
            withLabel
            error={null}
          />
          <Select
            label="Pedido de origen"
            name="comprobanteId"
            options={pedidoOptions}
            value={pedidoLabel}
            isSearch
            handleGetData={(query: string, callback: () => void) =>
              void cargarPedidos(query, callback)
            }
            onChange={(id: any, value: string) => {
              const n = Number(id);
              setForm((prev) => ({ ...prev, comprobanteId: n > 0 ? n : '' }));
              setPedidoLabel(n > 0 ? value : '');
            }}
            withLabel
            error={null}
          />
          <InputPro
            name="maquina"
            isLabel
            label="Máquina"
            placeholder="Ej: Prensa 3"
            value={form.maquina}
            onChange={(e) => setForm((prev) => ({ ...prev, maquina: e.target.value }))}
          />
          <InputPro
            name="encargadoNombre"
            isLabel
            label="Encargado"
            placeholder="Quién la saca"
            value={form.encargadoNombre}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, encargadoNombre: e.target.value }))
            }
          />
        </div>
        {form.comprobanteId ? (
          <p className="mt-2 text-xs text-slate-400">
            Con un pedido elegido, el producto y la cantidad se toman de su
            primera línea si los dejas en blanco.
          </p>
        ) : null}
        <div className="mt-4">
          <button
            onClick={() => void crearOrden()}
            disabled={guardando}
            className="h-11 px-5 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all disabled:opacity-60"
            style={{ background: ACCENT }}
          >
            <Icon icon="solar:add-circle-bold" className="text-lg" />
            {guardando ? 'Guardando...' : 'Crear orden'}
          </button>
        </div>
      </div>

      {/* Órdenes registradas */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-[15px] font-bold text-slate-800 dark:text-white">
            Órdenes registradas
          </h2>
          <div className="w-full sm:w-auto sm:min-w-[240px]">
            <Select
              label="Filtrar estado"
              name="estadoFiltro"
              options={estadoOptions}
              onChange={onSelectEstadoFiltro}
              value={
                estadoOptions.find(
                  (opt) => (estadoFiltro || 'TODOS') === opt.id,
                )?.value || 'Todos'
              }
              withLabel
              error={null}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1240px]">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-3 pl-5 px-3">Lote</th>
                <th className="py-3 px-3">Pedido</th>
                <th className="py-3 px-3">Sede</th>
                <th className="py-3 px-3" title="En qué máquina se hizo y quién estuvo a cargo">
                  Máquina / encargado
                </th>
                <th className="py-3 px-3">Receta</th>
                <th className="py-3 px-3">Producto Final</th>
                <th className="py-3 px-3">Objetivo</th>
                <th className="py-3 px-3">Producido</th>
                <th className="py-3 px-3">Alerta Merma</th>
                <th className="py-3 px-3">Merma (S/)</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 pr-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                    <td colSpan={12} className="py-3.5 px-5">
                      <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : ordenes.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center">
                    <Icon
                      icon="solar:clipboard-list-linear"
                      className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-2"
                    />
                    <p className="text-slate-400 text-sm">Aún no hay órdenes.</p>
                  </td>
                </tr>
              ) : (
                ordenes.map((item) => {
                  const alertaMerma = obtenerAlertaMerma(item);
                  const pill = estadoPill(item.estado);
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800 transition-colors"
                    >
                      <td className="py-3 pl-5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                          {item.loteProduccion}
                        </span>
                      </td>
                      {/* El pedido enlaza a Pedidos, que es donde se autoriza y
                          se factura: desde la orden se llega al documento sin
                          tener que buscarlo por el número. */}
                      <td className="py-3 px-3 text-sm">
                        {item.comprobante ? (
                          <a
                            href="/administrador/pedidos"
                            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {item.comprobante.serie}-
                            {String(item.comprobante.correlativo).padStart(8, '0')}
                          </a>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">
                        {item.sede?.nombre || (
                          <span
                            className="text-slate-300 dark:text-slate-600"
                            title="Sin fijar: se usa la sede de quien cierre la orden"
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">
                        {item.maquina || item.encargadoNombre ? (
                          <>
                            <span className="block text-slate-600 dark:text-gray-300">
                              {item.maquina || '—'}
                            </span>
                            <span className="block text-xs text-slate-400">
                              {item.encargadoNombre || 'sin encargado'}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">
                        {item.receta?.codigo || '—'}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-600 dark:text-gray-300 truncate max-w-[200px]">
                        {item.productoFinal?.descripcion || '—'}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800 dark:text-white text-sm">
                        {item.cantidadObjetivo}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-600 dark:text-gray-300">
                        {item.cantidadProducida || 0}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${alertaMerma.className}`}
                        >
                          {alertaMerma.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-rose-600 text-sm">
                        {formatSoles(item.mermaValorizada)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${pill.dot}`}
                          />
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-3 px-3 pr-5">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              const nextId =
                                openAccionesId === item.id ? null : item.id;
                              setOpenAccionesId(nextId);
                              setAnchorEl(
                                nextId ? (e.currentTarget as HTMLElement) : null,
                              );
                            }}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Icon icon="solar:menu-dots-bold" width={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Avisos de la última ejecución. Hoy el único: la empresa no tiene
          almacén de mermas, así que el retazo se quedó sin entrar a ningún
          sitio. La orden se cerró igual —a propósito— pero esto hay que verlo
          y arreglarlo en Mi Perfil › Configuración › Mermas. */}
      {avisosEjecucion.length > 0 && (
        <div className="rounded-3xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 mt-5 flex items-start gap-3">
          <Icon
            icon="solar:danger-triangle-bold"
            className="text-xl text-amber-600 shrink-0 mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
              La orden se cerró con avisos
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-amber-700 dark:text-amber-300 list-disc pl-5">
              {avisosEjecucion.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => setAvisosEjecucion([])}
            className="h-8 px-3 rounded-xl border border-amber-300 dark:border-amber-700 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors shrink-0"
          >
            Entendido
          </button>
        </div>
      )}

      {resumenOrdenId && (
        <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden mt-5">
          <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="min-w-0">
              <h3 className="text-[15px] font-bold text-slate-800 dark:text-white">
                Liquidación de materiales{' '}
                <span className="text-slate-400 font-semibold">
                  · Orden #{resumenOrdenId}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Tres niveles: lo que pide la <strong>receta</strong>, lo que se
                planificó en la <strong>orden</strong> y lo que{' '}
                <strong>realmente</strong> se usó.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void descargarLiquidacion()}
                className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Icon icon="solar:file-download-linear" /> Excel
              </button>
              <button
                onClick={() => {
                  setResumenOrdenId(null);
                  setResumenMateriales([]);
                  setResumenTotales(null);
                  setResumenRendimiento(null);
                }}
                className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Icon icon="solar:close-circle-linear" /> Cerrar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {resumenMateriales.length > 0 ? (
              <table className="w-full text-left border-collapse min-w-[1180px]">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-3 pl-5 px-3">Componente</th>
                    <th className="py-3 px-3" title="El estándar de la receta aplicado a esta cantidad">
                      Receta
                    </th>
                    <th className="py-3 px-3" title="Lo que se planificó al crear la orden">
                      Orden
                    </th>
                    <th className="py-3 px-3" title="Lo que almacén entregó a planta: la salida real del almacén">
                      Entregado
                    </th>
                    <th className="py-3 px-3">Consumido</th>
                    <th className="py-3 px-3">Merma</th>
                    <th className="py-3 px-3" title="De la merma, lo que entró al almacén de mermas como retazo">
                      Reutilizable
                    </th>
                    <th className="py-3 px-3" title="Entregado y no usado: se registra, no mueve inventario">
                      Sobrante
                    </th>
                    <th className="py-3 px-3" title="¿Se planificó según el estándar de la receta?">
                      Orden vs receta
                    </th>
                    <th className="py-3 px-3" title="¿Se cumplió lo planificado en la orden?">
                      Real vs orden
                    </th>
                    <th className="py-3 px-3">Costo unit.</th>
                    <th className="py-3 px-3 pr-5">Merma (S/)</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenMateriales.map((item) => (
                    <tr
                      key={item.componenteId}
                      className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800 transition-colors"
                    >
                      <td className="py-3 pl-5 px-3 text-sm text-slate-700 dark:text-gray-200">
                        <span className="font-semibold text-slate-700 dark:text-gray-200">
                          {item.codigo}
                        </span>
                        <span className="text-slate-400"> · {item.descripcion}</span>
                        {item.tipoCantidad === 'POR_LOTE' && (
                          <span
                            className="ml-2 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 dark:text-gray-400 align-middle"
                            title="Gasto de tanda: no escala con la cantidad del lote"
                          >
                            POR LOTE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">
                        {cantidadONada(item.cantidadReceta, item.unidad)}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">
                        {item.cantidadTeorica} {item.unidad}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">
                        {item.cantidadEntregada > 0 ? (
                          `${item.cantidadEntregada} ${item.unidad}`
                        ) : (
                          <span
                            className="text-slate-300 dark:text-slate-600"
                            title="Esta orden no usó la entrega: el material salió del almacén al cerrarla"
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-600 dark:text-gray-300">
                        {item.cantidadConsumida} {item.unidad}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-600 dark:text-gray-300">
                        {item.mermaCantidad} {item.unidad}
                      </td>
                      <td className="py-3 px-3 text-sm text-emerald-600 dark:text-emerald-400">
                        {item.mermaReutilizable > 0
                          ? `${item.mermaReutilizable} ${item.unidad}`
                          : '—'}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">
                        {item.sobranteRegistrado > 0
                          ? `${item.sobranteRegistrado} ${item.unidad}`
                          : '—'}
                      </td>
                      <td className="py-3 px-3 text-sm">
                        {desviacion(
                          item.desvioOrdenVsReceta,
                          item.desvioOrdenVsRecetaPct,
                          item.unidad,
                        )}
                      </td>
                      <td className="py-3 px-3 text-sm">
                        {desviacion(
                          item.desvioRealVsOrden,
                          item.desvioRealVsOrdenPct,
                          item.unidad,
                        )}
                      </td>
                      <td
                        className={`py-3 px-3 text-sm ${item.sinCosto ? 'text-amber-600 italic' : 'text-slate-500 dark:text-gray-400'}`}
                      >
                        {solesONada(item.costoUnitario)}
                      </td>
                      <td
                        className={`py-3 px-3 pr-5 text-sm font-bold ${item.sinCosto ? 'text-amber-600 italic font-semibold' : 'text-rose-600'}`}
                      >
                        {solesONada(item.mermaValorizada)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center">
                <Icon
                  icon="solar:box-minimalistic-linear"
                  className="text-4xl text-slate-200 dark:text-slate-700 mx-auto mb-2"
                />
                <p className="text-slate-400 text-sm">
                  No hay detalle de materiales para esta orden.
                </p>
              </div>
            )}
          </div>
          {resumenTotales && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-sm flex flex-wrap gap-x-6 gap-y-2">
              <span className="text-slate-500 dark:text-gray-400">
                Merma total:{' '}
                <strong className="text-slate-800 dark:text-white">
                  {resumenTotales.merma.toFixed(4)}
                </strong>
              </span>
              <span className="text-slate-500 dark:text-gray-400">
                Reutilizable:{' '}
                <strong className="text-emerald-600">
                  {resumenTotales.mermaReutilizable.toFixed(4)}
                </strong>
              </span>
              <span className="text-slate-500 dark:text-gray-400">
                Descarte:{' '}
                <strong className="text-slate-800 dark:text-white">
                  {resumenTotales.mermaDescarte.toFixed(4)}
                </strong>
              </span>
              <span className="text-slate-500 dark:text-gray-400">
                Sobrante devuelto:{' '}
                <strong className="text-slate-800 dark:text-white">
                  {resumenTotales.sobranteRegistrado.toFixed(4)}
                </strong>
              </span>
              <span className="text-slate-500 dark:text-gray-400">
                Merma valorizada:{' '}
                <strong className="text-rose-600">
                  {formatSoles(resumenTotales.mermaValorizada)}
                </strong>
              </span>
            </div>
          )}

          {/* El total valorizado está INCOMPLETO si algún insumo no tiene
              costo. Decirlo es la diferencia entre una cifra con un hueco y
              una cifra equivocada que nadie revisa. */}
          {resumenTotales && resumenTotales.sinCosto > 0 && (
            <div className="px-4 pb-4">
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3.5 py-2.5 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <Icon
                  icon="solar:danger-triangle-bold"
                  className="text-base shrink-0 mt-0.5"
                />
                <span>
                  {resumenTotales.sinCosto === 1
                    ? '1 componente no tiene costo'
                    : `${resumenTotales.sinCosto} componentes no tienen costo`}
                  : la merma valorizada de arriba es un total{' '}
                  <strong>incompleto</strong>. Carga el costo del insumo (o su
                  compra) para que cuadre.
                </span>
              </div>
            </div>
          )}

          {/* El «kilo por metro cuadrado» de planta. Es la cifra con la que se
              recalibra una receta, y la razón de ser del nivel de receta. */}
          {resumenRendimiento && (
            <div className="px-4 pb-4">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Rendimiento · {resumenRendimiento.insumoPrincipal}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span className="text-slate-500 dark:text-gray-400">
                    Estándar de la receta:{' '}
                    <strong className="text-slate-800 dark:text-white">
                      {resumenRendimiento.estandar === null
                        ? 'sin receta'
                        : `${resumenRendimiento.estandar.toFixed(4)} ${resumenRendimiento.unidad}`}
                    </strong>
                  </span>
                  <span className="text-slate-500 dark:text-gray-400">
                    Real:{' '}
                    <strong className="text-slate-800 dark:text-white">
                      {resumenRendimiento.real.toFixed(4)}{' '}
                      {resumenRendimiento.unidad}
                    </strong>
                  </span>
                  {resumenRendimiento.desvioPct !== null && (
                    <span className="text-slate-500 dark:text-gray-400">
                      Desvío:{' '}
                      <strong
                        className={
                          resumenRendimiento.desvioPct > 0
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }
                      >
                        {resumenRendimiento.desvioPct > 0 ? '+' : ''}
                        {resumenRendimiento.desvioPct.toFixed(2)} %
                      </strong>
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Por unidad producida, excluyendo los insumos por lote.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpenModal={isHistorialModalOpen}
        closeModal={() => setIsHistorialModalOpen(false)}
        title="Historial reciente de cambios"
        width="680px"
        height="auto"
      >
        <div className="p-4 space-y-3">
          {historialConfig.length > 0 ? (
            <div className="space-y-2">
              {historialConfig.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 p-3"
                >
                  <p className="text-sm text-slate-700 dark:text-gray-200">
                    {item.detalle || 'Sin detalle'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.autorNombre} ·{' '}
                    {new Date(item.creadoEn).toLocaleString('es-PE')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              Aún no hay cambios registrados.
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              onClick={() => void cargarHistorialConfiguracion()}
              color="secondary"
              outline
              className="text-sm"
            >
              Actualizar
            </Button>
            <Button
              onClick={() => setIsHistorialModalOpen(false)}
              color="primary"
              className="text-sm"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      <TableActionMenu
        isOpen={!!openAccionesId && !!anchorEl}
        anchorEl={anchorEl}
        onClose={() => {
          setOpenAccionesId(null);
          setAnchorEl(null);
        }}
      >
        {openAccionesId && (() => {
          const orden = ordenes.find((o) => o.id === openAccionesId);
          if (!orden) return null;

          const puedePlanificar =
            orden.estado === 'BORRADOR' ||
            orden.estado === 'EN_PROCESO' ||
            orden.estado === 'ANULADA';
          const puedeIniciar =
            orden.estado === 'BORRADOR' || orden.estado === 'PLANIFICADA';
          const puedeAnular =
            orden.estado === 'BORRADOR' ||
            orden.estado === 'PLANIFICADA' ||
            orden.estado === 'EN_PROCESO';
          const puedeFinalizar = orden.estado === 'EN_PROCESO';
          // Se entrega material mientras la orden esté viva. Entregar la pone
          // EN_PROCESO sola, así que también vale desde PLANIFICADA: en la
          // vida real el material sale antes de que nadie marque nada.
          const puedeEntregar =
            orden.estado === 'BORRADOR' ||
            orden.estado === 'PLANIFICADA' ||
            orden.estado === 'EN_PROCESO';

          return (
            <>
              {puedePlanificar && puedeProducir && (
                <button
                  type="button"
                  onClick={() => {
                    void cambiarEstado(orden.id, 'PLANIFICADA');
                    setOpenAccionesId(null);
                    setAnchorEl(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <Icon icon="solar:clipboard-list-bold" width={16} />
                  <span>{orden.estado === 'ANULADA' ? 'Reactivar' : 'Planificar'}</span>
                </button>
              )}
              {puedeIniciar && puedeProducir && (
                <button
                  type="button"
                  onClick={() => {
                    void cambiarEstado(orden.id, 'EN_PROCESO');
                    setOpenAccionesId(null);
                    setAnchorEl(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                >
                  <Icon icon="solar:play-bold" width={16} />
                  <span>Iniciar</span>
                </button>
              )}
              {puedeAnular && puedeProducir && (
                <button
                  type="button"
                  onClick={() => {
                    void cambiarEstado(orden.id, 'ANULADA');
                    setOpenAccionesId(null);
                    setAnchorEl(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Icon icon="solar:close-circle-bold" width={16} />
                  <span>Anular</span>
                </button>
              )}
              {puedeEntregar && puedeEntregarMaterial && (
                <button
                  type="button"
                  onClick={() => {
                    void abrirEntregaMaterial(orden.id);
                    setOpenAccionesId(null);
                    setAnchorEl(null);
                  }}
                  disabled={cargandoEntrega}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  <Icon icon="solar:inbox-out-bold" width={16} className="text-sky-600" />
                  <span>Entregar material</span>
                </button>
              )}
              {puedeFinalizar && puedeProducir && (
                <button
                  type="button"
                  onClick={() => {
                    void abrirFinalizarOrden(orden.id);
                    setOpenAccionesId(null);
                    setAnchorEl(null);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  <Icon icon="solar:check-circle-bold" width={16} />
                  <span>Finalizar orden</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  void verResumen(orden.id);
                  setOpenAccionesId(null);
                  setAnchorEl(null);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <Icon icon="solar:document-text-bold" width={16} />
                <span>Ver resumen</span>
              </button>
            </>
          );
        })()}
      </TableActionMenu>

      {/* Entrega de material a planta. Es la salida REAL del almacén: hasta
          que existió, el material salía al CERRAR la orden y por eso lo que
          sobraba no podía volver — nunca había salido. */}
      <Modal
        isOpenModal={isEntregaModalOpen}
        closeModal={() => {
          if (guardandoEntrega) return;
          setIsEntregaModalOpen(false);
        }}
        title={
          ordenEntrega
            ? `Entregar material · ${ordenEntrega.loteProduccion}`
            : 'Entregar material'
        }
        width="920px"
        height="auto"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-slate-500 dark:text-gray-400">
            Lo que almacén saca y le pasa a planta. Sale del inventario{' '}
            <strong>ahora</strong>, no al cerrar la orden, y lo que no se use
            vuelve al cerrarla. Se puede entregar varias veces: las cantidades
            se suman.
          </p>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2.5 pl-4 px-3">Insumo</th>
                  <th className="py-2.5 px-3">Teórico</th>
                  <th className="py-2.5 px-3">Ya entregado</th>
                  <th className="py-2.5 px-3 pr-4">Entregar ahora</th>
                </tr>
              </thead>
              <tbody>
                {entregaForm.map((item, index) => (
                  <tr
                    key={item.productoInsumoId}
                    className="border-b border-slate-50 dark:border-slate-800"
                  >
                    <td className="py-2.5 pl-4 px-3">
                      <div className="font-semibold text-sm text-slate-800 dark:text-white">
                        {item.codigo}
                      </div>
                      <div className="text-xs text-slate-400">
                        {item.descripcion}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-sm text-slate-500 dark:text-gray-400">
                      {item.teorica} {item.unidad}
                    </td>
                    <td className="py-2.5 px-3 text-sm">
                      {item.yaEntregado > 0 ? (
                        <span className="font-semibold text-sky-600 dark:text-sky-400">
                          {item.yaEntregado} {item.unidad}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 pr-4">
                      <InputPro
                        name={`entrega-${item.productoInsumoId}`}
                        type="number"
                        value={item.cantidad}
                        onChange={(e) =>
                          setEntregaForm((prev) =>
                            prev.map((fila, idx) =>
                              idx === index
                                ? {
                                    ...fila,
                                    cantidad: e.target.value
                                      ? Number(e.target.value)
                                      : '',
                                  }
                                : fila,
                            ),
                          )
                        }
                        className="w-28 !py-1.5"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => setIsEntregaModalOpen(false)}
              color="secondary"
              outline
              className="text-sm"
              disabled={guardandoEntrega}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void entregarMaterial()}
              color="primary"
              className="text-sm"
              disabled={guardandoEntrega}
            >
              {guardandoEntrega ? 'Entregando...' : 'Entregar material'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpenModal={isFinalizarModalOpen}
        closeModal={() => {
          if (guardandoFinalizar) return;
          setIsFinalizarModalOpen(false);
        }}
        title={
          ordenFinalizar
            ? `Finalizar Orden · ${ordenFinalizar.loteProduccion}`
            : 'Finalizar Orden'
        }
        /* 1320 y no 980: con reutilizable y sobrante son seis columnas, y a
           980 las últimas quedaban fuera del borde — había que descubrir que
           la tabla hace scroll lateral. El Modal lo limita a 95vw, así que en
           una pantalla pequeña se comporta como antes. */
        width="1320px"
        height="auto"
      >
        <div className="p-4 space-y-4">
          {cargandoFinalizar ? (
            <div className="text-sm text-slate-400">Cargando datos...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Calendar
                  text="Fecha inicio"
                  name="fechaInicio"
                  value={toDisplayDate(ejecucionForm.fechaInicio)}
                  onChange={(date: string) =>
                    setEjecucionForm((prev) => ({
                      ...prev,
                      fechaInicio: toIsoFromDisplayDate(date),
                    }))
                  }
                />
                <Calendar
                  text="Fecha fin"
                  name="fechaFin"
                  value={toDisplayDate(ejecucionForm.fechaFin)}
                  onChange={(date: string) =>
                    setEjecucionForm((prev) => ({
                      ...prev,
                      fechaFin: toIsoFromDisplayDate(date),
                    }))
                  }
                />
                <InputPro
                  name="cantidadProducida"
                  type="number"
                  isLabel
                  label="Cantidad producida"
                  value={ejecucionForm.cantidadProducida}
                  onChange={(e) =>
                    setEjecucionForm((prev) => ({
                      ...prev,
                      cantidadProducida: e.target.value
                        ? Number(e.target.value)
                        : '',
                    }))
                  }
                />
                <InputPro
                  name="mermaTotal"
                  type="number"
                  isLabel
                  label="Merma total (automática)"
                  value={Number(mermaTotalCalculada.toFixed(4))}
                  readOnly
                  className="bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Lo que planta anota al cerrar. Si la orden ya traía máquina
                  y encargado llegan rellenos, y lo que se escriba aquí los
                  pisa: el que vale es el de quien la sacó de verdad. */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <InputPro
                  name="maquinaEjec"
                  isLabel
                  label="Máquina"
                  value={ejecucionForm.maquina}
                  onChange={(e) =>
                    setEjecucionForm((prev) => ({ ...prev, maquina: e.target.value }))
                  }
                />
                <InputPro
                  name="encargadoEjec"
                  isLabel
                  label="Encargado"
                  value={ejecucionForm.encargadoNombre}
                  onChange={(e) =>
                    setEjecucionForm((prev) => ({ ...prev, encargadoNombre: e.target.value }))
                  }
                />
                <InputPro
                  name="pesoRefRollo"
                  type="number"
                  isLabel
                  label="Peso rollo (kg)"
                  value={ejecucionForm.pesoRefRollo}
                  onChange={(e) =>
                    setEjecucionForm((prev) => ({
                      ...prev,
                      pesoRefRollo: e.target.value ? Number(e.target.value) : '',
                    }))
                  }
                />
                <InputPro
                  name="diametroCm"
                  type="number"
                  isLabel
                  label="Diámetro (cm)"
                  value={ejecucionForm.diametroCm}
                  onChange={(e) =>
                    setEjecucionForm((prev) => ({
                      ...prev,
                      diametroCm: e.target.value ? Number(e.target.value) : '',
                    }))
                  }
                />
                <InputPro
                  name="alturaRolloM"
                  type="number"
                  isLabel
                  label="Altura (m)"
                  value={ejecucionForm.alturaRolloM}
                  onChange={(e) =>
                    setEjecucionForm((prev) => ({
                      ...prev,
                      alturaRolloM: e.target.value ? Number(e.target.value) : '',
                    }))
                  }
                />
              </div>

              <InputPro
                name="observaciones"
                isLabel
                label="Observaciones"
                value={ejecucionForm.observaciones}
                onChange={(e) =>
                  setEjecucionForm((prev) => ({
                    ...prev,
                    observaciones: e.target.value,
                  }))
                }
              />

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">
                    Componentes consumidos
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <strong>Reutilizable</strong> es la parte de la merma que
                    sirve para volver a usarse: entra al almacén de mermas como
                    retazo, con su costo. El resto entra como descarte, a costo
                    cero. <strong>Sobrante</strong> es lo que se entregó y no se
                    usó: se registra, pero no mueve inventario — nunca salió
                    del almacén.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <DataTable
                    bodyData={componentesEjecucionRows}
                    headerColumns={[
                      'Componente',
                      'Consumido',
                      'Merma',
                      'Reutilizable',
                      'Sobrante',
                      'Observación',
                    ]}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setIsFinalizarModalOpen(false)}
                  color="secondary"
                  outline
                  className="text-sm"
                  disabled={guardandoFinalizar}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => void finalizarOrden()}
                  color="success"
                  className="text-sm"
                  disabled={guardandoFinalizar}
                >
                  {guardandoFinalizar ? 'Finalizando...' : 'Finalizar orden'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
