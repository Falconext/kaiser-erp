import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import { Icon } from '@iconify/react/dist/iconify.js';

const ACCENT = 'var(--accent, #7551FF)';

/**
 * Producción › Mermas — lo que entró al almacén de mermas.
 *
 * Es la segunda mitad de lo que pidió planta el 7-oct: «si hay merma, que haya
 * un almacén de mermas, y en esa merma tiene que verse si hay artículos
 * reutilizables o no». La primera mitad (que el retazo entre) ya está en la
 * ejecución de la orden; esto es poder MIRARLO sin recorrer orden por orden.
 *
 * Dos líneas por insumo y no una: el retazo que sirve y el descarte que no son
 * productos distintos a propósito —mezclarlos daría un costo promedio entre
 * algo que vale y algo que no—, y es justo esa separación la que responde a
 * «¿hay reutilizables o no?».
 */
type MovimientoMerma = {
  id: number;
  fecha: string;
  tipo: 'REUTILIZABLE' | 'DESCARTE';
  orden: { id: number; lote: string; productoFinal: string | null };
  producto: { id: number; codigo: string; descripcion: string };
  insumoOrigen: { id: number; codigo: string; descripcion: string } | null;
  cantidad: number;
  unidad: string;
  costoUnitario: number;
  costoTotal: number;
  sede: { id: number; nombre: string } | null;
  usuario: string | null;
  observacion: string | null;
};

type TotalesMerma = {
  cantidadReutilizable: number;
  cantidadDescarte: number;
  valorRecuperado: number;
};

type SelectOption = { id: number | string; value: string };

const TIPOS: SelectOption[] = [
  { id: '', value: 'Retazo y descarte' },
  { id: 'REUTILIZABLE', value: 'Solo reutilizable' },
  { id: 'DESCARTE', value: 'Solo descarte' },
];

export default function ProduccionMermasPage() {
  const alert = useAlertStore((state) => state.alert);
  const [loading, setLoading] = useState(false);
  const [movimientos, setMovimientos] = useState<MovimientoMerma[]>([]);
  const [totales, setTotales] = useState<TotalesMerma | null>(null);
  const [total, setTotal] = useState(0);

  const [tipo, setTipo] = useState('');
  const [tipoLabel, setTipoLabel] = useState('Retazo y descarte');
  const [insumoId, setInsumoId] = useState<number | null>(null);
  const [insumoLabel, setInsumoLabel] = useState('');
  const [insumoOptions, setInsumoOptions] = useState<SelectOption[]>([]);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const toDisplayDate = (iso: string) => {
    if (!iso) return '';
    const [year, month, day] = iso.split('-');
    if (!year || !month || !day) return '';
    return `${day}/${month}/${year}`;
  };
  const toIso = (display: string) => {
    if (!display) return '';
    const [day, month, year] = display.split('/');
    if (!day || !month || !year) return '';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const resp: any = await apiClient.get('/produccion/mermas', {
        params: {
          ...(tipo ? { tipo } : {}),
          ...(insumoId ? { insumoId } : {}),
          ...(desde ? { desde } : {}),
          ...(hasta ? { hasta } : {}),
          limit: 200,
        },
      });
      if (resp?.data?.code === 1) {
        setMovimientos(resp.data.data?.movimientos || []);
        setTotales(resp.data.data?.totales || null);
        setTotal(Number(resp.data.data?.total || 0));
      } else {
        alert(resp?.data?.message || 'No se pudo cargar las mermas', 'error');
      }
    } catch (error: any) {
      alert(
        error?.response?.data?.message || 'No se pudo cargar las mermas',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [alert, tipo, insumoId, desde, hasta]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const buscarInsumos = async (query: string, callback?: () => void) => {
    try {
      const resp: any = await apiClient.get('/productos', {
        params: { search: query, page: 1, limit: 20 },
      });
      if (resp?.data?.code === 1) {
        const productos: any[] = resp.data.data?.productos || [];
        setInsumoOptions([
          { id: 0, value: 'Todos los insumos' },
          ...productos.map((p) => ({
            id: p.id,
            value: `${p.codigo || ''} · ${p.descripcion || ''}`.trim(),
          })),
        ]);
      }
    } catch {
      // el filtro es opcional: si la búsqueda falla, la lista sigue entera
    } finally {
      callback?.();
    }
  };

  useEffect(() => {
    void buscarInsumos('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const soles = (valor: number) => `S/ ${Number(valor || 0).toFixed(2)}`;
  const fecha = (iso: string) =>
    new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  const hayFiltros = useMemo(
    () => Boolean(tipo || insumoId || desde || hasta),
    [tipo, insumoId, desde, hasta],
  );

  const limpiar = () => {
    setTipo('');
    setTipoLabel('Retazo y descarte');
    setInsumoId(null);
    setInsumoLabel('');
    setDesde('');
    setHasta('');
  };

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0B1120] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Producción</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>
          Mermas
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">
            Almacén de mermas
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Lo que salió de cada orden y no es el producto: el retazo que sirve
            y el descarte que no.
          </p>
        </div>
        <button
          onClick={() => void cargar()}
          className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all self-start"
          style={{ background: ACCENT }}
        >
          <Icon
            icon="solar:refresh-linear"
            className={`text-lg ${loading ? 'animate-spin' : ''}`}
          />{' '}
          Recargar
        </button>
      </div>

      {/* Totales */}
      {totales && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Retazo reutilizable
            </p>
            <p className="mt-1 text-[22px] font-extrabold text-emerald-600">
              {totales.cantidadReutilizable.toFixed(3)}
            </p>
            <p className="text-xs text-slate-400">
              Vuelve a entrar a producción con su costo.
            </p>
          </div>
          <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Descarte
            </p>
            <p className="mt-1 text-[22px] font-extrabold text-slate-800 dark:text-white">
              {totales.cantidadDescarte.toFixed(3)}
            </p>
            <p className="text-xs text-slate-400">
              Entra a costo cero: su valor ya se quedó en el producto.
            </p>
          </div>
          <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Valor recuperado
            </p>
            <p className="mt-1 text-[22px] font-extrabold text-slate-800 dark:text-white">
              {soles(totales.valorRecuperado)}
            </p>
            <p className="text-xs text-slate-400">
              Solo el retazo. Lo fija el % de recuperación de la empresa.
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select
            name="tipo"
            label="Tipo"
            error={null}
            value={tipoLabel}
            options={TIPOS}
            onChange={(id: any, value: string) => {
              setTipo(String(id || ''));
              setTipoLabel(value);
            }}
          />
          <Select
            name="insumo"
            label="Insumo de origen"
            error={null}
            isSearch
            value={insumoLabel}
            options={insumoOptions}
            handleGetData={(query: string, callback: () => void) =>
              void buscarInsumos(query, callback)
            }
            onChange={(id: any, value: string) => {
              const numero = Number(id);
              setInsumoId(numero > 0 ? numero : null);
              setInsumoLabel(numero > 0 ? value : '');
            }}
          />
          <Calendar
            text="Desde"
            name="desde"
            value={toDisplayDate(desde)}
            onChange={(date: string) => setDesde(toIso(date))}
          />
          <Calendar
            text="Hasta"
            name="hasta"
            value={toDisplayDate(hasta)}
            onChange={(date: string) => setHasta(toIso(date))}
          />
        </div>
        {hayFiltros && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={limpiar}
              className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon icon="solar:close-circle-linear" /> Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-[15px] font-bold text-slate-800 dark:text-white">
            Ingresos al almacén de mermas{' '}
            <span className="text-slate-400 font-semibold">
              · {total} {total === 1 ? 'movimiento' : 'movimientos'}
            </span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          {movimientos.length > 0 ? (
            <table className="w-full text-left border-collapse min-w-[1080px]">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 pl-5 px-3">Fecha</th>
                  <th className="py-3 px-3">Orden</th>
                  <th className="py-3 px-3">Salió de</th>
                  <th className="py-3 px-3">Entró como</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Cantidad</th>
                  <th className="py-3 px-3">Costo unit.</th>
                  <th className="py-3 px-3">Valor</th>
                  <th className="py-3 px-3">Almacén</th>
                  <th className="py-3 px-3 pr-5">Quién</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((mov) => (
                  <tr
                    key={mov.id}
                    className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="py-3 pl-5 px-3 text-sm text-slate-500 dark:text-gray-400">
                      {fecha(mov.fecha)}
                    </td>
                    <td className="py-3 px-3 text-sm">
                      <span className="font-semibold text-slate-700 dark:text-gray-200">
                        {mov.orden.lote}
                      </span>
                      {mov.orden.productoFinal && (
                        <span className="block text-xs text-slate-400">
                          {mov.orden.productoFinal}
                        </span>
                      )}
                    </td>
                    {/* De qué insumo salió: es la pregunta de almacén —«este
                        retazo, ¿de qué rollo vino?»— y sin ella el producto
                        `-RET` no se sabe de dónde salió. */}
                    <td className="py-3 px-3 text-sm text-slate-600 dark:text-gray-300">
                      {mov.insumoOrigen ? (
                        <>
                          <span className="font-semibold">
                            {mov.insumoOrigen.codigo}
                          </span>
                          <span className="block text-xs text-slate-400">
                            {mov.insumoOrigen.descripcion}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">
                          —
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-600 dark:text-gray-300">
                      <span className="font-semibold">{mov.producto.codigo}</span>
                    </td>
                    <td className="py-3 px-3 text-sm">
                      {mov.tipo === 'REUTILIZABLE' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                          Reutilizable
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-gray-400 text-xs font-bold">
                          Descarte
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-700 dark:text-gray-200 font-semibold">
                      {mov.cantidad} {mov.unidad}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">
                      {soles(mov.costoUnitario)}
                    </td>
                    <td className="py-3 px-3 text-sm font-bold text-slate-800 dark:text-white">
                      {soles(mov.costoTotal)}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">
                      {mov.sede?.nombre || '—'}
                    </td>
                    <td className="py-3 px-3 pr-5 text-sm text-slate-500 dark:text-gray-400">
                      {mov.usuario || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <Icon
                icon="solar:box-minimalistic-linear"
                className="text-4xl text-slate-200 dark:text-slate-700 mx-auto mb-2"
              />
              <p className="text-slate-400 text-sm">
                {hayFiltros
                  ? 'Ningún ingreso de merma con estos filtros.'
                  : 'Todavía no ha entrado ninguna merma al almacén.'}
              </p>
              {!hayFiltros && (
                <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                  El retazo entra al cerrar una orden, cuando planta declara qué
                  parte de la merma sirve. Hace falta un almacén de tipo
                  «Almacén de mermas» configurado en Mi Perfil › Configuración.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
