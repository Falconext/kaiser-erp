import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import Modal from '@/components/Modal';
import Select from '@/components/Select';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';

/**
 * Cotizar un módulo de jaulas.
 *
 * El cliente no compra «120 módulos», compra sitio para sus aves: aquí se
 * teclean las AVES y el sistema dice cuántos módulos son. La cantidad queda
 * editable, porque el vendedor a veces redondea por su cuenta.
 *
 * El precio no sale del catálogo sino de **peso × precio por kilo × factor**,
 * y lo calcula el servidor — el peso viene de la receta y mandarlo desde aquí
 * dejaría cotizar un módulo al peso que a uno le convenga.
 *
 * ⚠ «Qué lleva» es informativo: NO se añaden líneas por componente a la
 * cotización. Se vende el módulo, no sus piezas, y detallarlas invita al
 * cliente a pedirlas sueltas.
 */
type Props = {
  abierto: boolean;
  cerrar: () => void;
  /** Se llama una vez por línea a añadir al carrito. */
  onAgregar: (linea: {
    productoId: number;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    unidad: string;
    filas?: number;
    factor?: number;
    esAdicional?: boolean;
  }) => void;
  /** La moneda del documento que se está cotizando. */
  moneda?: string;
  /** Soles por dólar. Sin él no se convierte y se avisa. */
  tipoCambio?: number | null;
};

/** El símbolo que se imprime delante del número. */
const simbolo = (m?: string | null) =>
  String(m ?? 'PEN').toUpperCase() === 'USD' ? 'US$' : 'S/';

type ProductoModulo = {
  id: number;
  codigo?: string;
  descripcion?: string;
  capacidadAves?: number | null;
  productoAdicionalPorFilaId?: number | null;
  unidadMedida?: { nombre?: string; codigo?: string };
};

export default function ModalCotizarModulo({ abierto, cerrar, onAgregar, moneda = 'PEN', tipoCambio = null }: Props) {
  const alert = useAlertStore((s) => s.alert);
  const [modulos, setModulos] = useState<ProductoModulo[]>([]);
  const [opciones, setOpciones] = useState<{ id: number; value: string }[]>([]);
  const [moduloId, setModuloId] = useState<number | ''>('');
  const [moduloLabel, setModuloLabel] = useState('');
  const [aves, setAves] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [filas, setFilas] = useState<number | ''>('');
  const [factor, setFactor] = useState<number | ''>('');
  const [precio, setPrecio] = useState<any | null>(null);
  const [explosion, setExplosion] = useState<any | null>(null);
  const [verQueLleva, setVerQueLleva] = useState(false);
  const [cargando, setCargando] = useState(false);

  const modulo = modulos.find((m) => m.id === Number(moduloId)) || null;

  useEffect(() => {
    if (!abierto) return;
    (async () => {
      try {
        // Solo los productos marcados como módulo: el resto se cotiza por el
        // camino normal.
        const resp: any = await apiClient.get('/productos', {
          params: { page: 1, limit: 100, esModulo: true },
        });
        const lista: ProductoModulo[] = (resp?.data?.data?.productos ?? []).filter(
          (p: any) => p.esModulo,
        );
        setModulos(lista);
        setOpciones(
          lista.map((p) => ({
            id: p.id,
            value: `${p.codigo ?? ''} · ${p.descripcion ?? ''}`.trim(),
          })),
        );
      } catch {
        alert('No se pudieron cargar los módulos', 'error');
      }
    })();
  }, [abierto, alert]);

  // El precio se recalcula al cambiar el módulo o el factor. No depende de la
  // cantidad: es el precio UNITARIO.
  useEffect(() => {
    if (!moduloId) {
      setPrecio(null);
      return;
    }
    (async () => {
      try {
        setCargando(true);
        const resp: any = await apiClient.get(
          `/produccion/modulos/${moduloId}/precio`,
          {
            params: {
              ...(factor !== '' ? { factor } : {}),
              moneda,
              ...(tipoCambio ? { tipoCambio } : {}),
            },
          },
        );
        setPrecio(resp?.data?.data ?? null);
        if (factor === '' && resp?.data?.data?.factor != null) {
          setFactor(Number(resp.data.data.factor));
        }
      } catch {
        setPrecio(null);
      } finally {
        setCargando(false);
      }
    })();
  }, [moduloId, factor, moneda, tipoCambio]);

  const cargarQueLleva = async () => {
    if (!moduloId) return;
    try {
      const resp: any = await apiClient.get(
        `/produccion/modulos/${moduloId}/explosion`,
        { params: { cantidad: Number(cantidad) || 1 } },
      );
      setExplosion(resp?.data?.data ?? null);
      setVerQueLleva(true);
    } catch {
      alert('No se pudo cargar qué lleva el módulo', 'error');
    }
  };

  // Las aves mandan sobre la cantidad mientras el vendedor no la toque a mano:
  // se redondea HACIA ARRIBA porque medio módulo no existe, y dejar 8 aves
  // fuera se nota en la granja, no en la hoja de cálculo.
  const onAvesChange = (valor: string) => {
    const n = valor ? Number(valor) : '';
    setAves(n);
    if (n !== '' && modulo?.capacidadAves) {
      setCantidad(Math.ceil(Number(n) / modulo.capacidadAves));
    }
  };

  const limpiar = () => {
    setModuloId(''); setModuloLabel(''); setAves(''); setCantidad('');
    setFilas(''); setFactor(''); setPrecio(null); setExplosion(null); setVerQueLleva(false);
  };

  const agregar = () => {
    if (!modulo || !cantidad || Number(cantidad) <= 0) {
      alert('Elige un módulo y una cantidad', 'warning');
      return;
    }
    onAgregar({
      productoId: modulo.id,
      descripcion: modulo.descripcion ?? '',
      cantidad: Number(cantidad),
      precioUnitario: Number(precio?.precio ?? 0),
      unidad: modulo.unidadMedida?.codigo ?? 'NIU',
      filas: filas === '' ? undefined : Number(filas),
      factor: factor === '' ? undefined : Number(factor),
    });

    // El soporte que cierra cada fila: va uno más por fila y se añade solo.
    // Sin esto hay que acordarse a mano, y es justo lo que se olvida.
    if (modulo.productoAdicionalPorFilaId && Number(filas) > 0) {
      const adicional = modulos.find((m) => m.id === modulo.productoAdicionalPorFilaId);
      onAgregar({
        productoId: modulo.productoAdicionalPorFilaId,
        descripcion: adicional?.descripcion ?? 'Soporte adicional por fila',
        cantidad: Number(filas),
        precioUnitario: 0,
        unidad: 'NIU',
        esAdicional: true,
      });
    }

    limpiar();
    cerrar();
  };

  return (
    <Modal
      isOpenModal={abierto}
      closeModal={cerrar}
      title="Cotizar módulo"
      width="860px"
      height="auto"
    >
      <div className="p-4 space-y-4">
        {/* Sin ningún producto marcado como módulo, el selector saldría vacío
            y sin explicación. `esModulo` es opt-in: hasta que alguien lo
            marque, esta pantalla no tiene nada que ofrecer, y conviene que lo
            diga en vez de parecer que falló. */}
        {opciones.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-900/10 p-4">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
              Todavía no hay ningún producto marcado como módulo
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Se marca en la ficha del producto, junto con cuántas aves entran
              y qué soporte añade por fila. Hasta entonces, los módulos se
              cotizan como cualquier otro producto del catálogo.
            </p>
          </div>
        ) : null}
        <Select
          label="Módulo"
          name="modulo"
          options={opciones}
          value={moduloLabel}
          onChange={(id: any, value: string) => {
            setModuloId(Number(id) || '');
            setModuloLabel(value);
            setExplosion(null);
            setVerQueLleva(false);
          }}
          isSearch
          withLabel
          error={null}
        />

        {modulo && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InputPro
                name="aves"
                type="number"
                isLabel
                label={`Aves${modulo.capacidadAves ? ` (${modulo.capacidadAves} por módulo)` : ''}`}
                value={aves}
                onChange={(e: any) => onAvesChange(e.target.value)}
              />
              <InputPro
                name="cantidadModulos"
                type="number"
                isLabel
                label="Módulos"
                value={cantidad}
                onChange={(e: any) => setCantidad(e.target.value ? Number(e.target.value) : '')}
              />
              <InputPro
                name="filas"
                type="number"
                isLabel
                label="Filas apiladas"
                value={filas}
                onChange={(e: any) => setFilas(e.target.value ? Number(e.target.value) : '')}
              />
              <InputPro
                name="factor"
                type="number"
                isLabel
                label="Factor"
                value={factor}
                onChange={(e: any) => setFactor(e.target.value ? Number(e.target.value) : '')}
              />
            </div>

            {!modulo.capacidadAves && (
              <p className="text-xs text-amber-600">
                Este módulo no tiene capacidad en aves, así que hay que poner la
                cantidad a mano.
              </p>
            )}

            {/* El precio, con de dónde sale. Que el vendedor sepa si está
                cotizando por peso o con el precio de catálogo es la diferencia
                entre defender una cifra y leerla. */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4">
              {cargando ? (
                <p className="text-sm text-slate-400">Calculando…</p>
              ) : precio ? (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                    <span className="text-[22px] font-extrabold text-slate-800 dark:text-white">
                      {simbolo(precio.moneda)} {Number(precio.precio ?? 0).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500">
                      por módulo ·{' '}
                      {precio.origen === 'PESO_X_FACTOR' ? (
                        <>
                          {Number(precio.pesoKg).toFixed(3)} kg ×{' '}
                          {simbolo(precio.monedaBase)}{' '}
                          {Number(precio.precioBaseKg).toFixed(2)} ×{' '}
                          {Number(precio.factor)}
                        </>
                      ) : (
                        <span className="font-semibold text-amber-600">
                          precio de catálogo
                        </span>
                      )}
                    </span>
                    {cantidad ? (
                      <span className="text-sm text-slate-500">
                        Total:{' '}
                        <strong className="text-slate-800 dark:text-white">
                          {simbolo(precio.moneda)}{' '}
                          {(Number(precio.precio ?? 0) * Number(cantidad)).toFixed(2)}
                        </strong>
                      </span>
                    ) : null}
                  </div>

                  {/* ⚠ El precio volvió en otra moneda que el documento: sin
                      tipo de cambio no se convierte, y meterlo tal cual en una
                      cotización en soles la deja al 27 % de su valor. */}
                  {String(precio.moneda) !== String(moneda).toUpperCase() && (
                    <p className="mt-2 text-xs text-rose-600 font-semibold">
                      <Icon icon="solar:danger-triangle-bold" className="inline mr-1" />
                      Este precio está en {precio.moneda} y el documento va en{' '}
                      {String(moneda).toUpperCase()}. Falta el tipo de cambio: elige la
                      fecha de emisión para que se cargue, o corrige la moneda del
                      precio por kilo en Mi Perfil › Precio por peso.
                    </p>
                  )}

                  {/* Los `faltan` son un AVISO, no un error: la cotización se
                      puede hacer igual con el precio de catálogo. */}
                  {precio.faltan?.length > 0 && (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      <Icon icon="solar:danger-triangle-bold" className="inline mr-1" />
                      No se pudo calcular por peso. Falta: {precio.faltan.join(', ')}.
                    </p>
                  )}
                  {precio.bajoMinimo && (
                    <p className="mt-2 text-xs text-rose-600">
                      El factor está por debajo del mínimo ({Number(precio.factorMinimo)}):
                      hará falta la autorización de gerencia al guardar.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">Elige un módulo.</p>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => (verQueLleva ? setVerQueLleva(false) : void cargarQueLleva())}
                className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5"
              >
                <Icon icon={verQueLleva ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} />
                Qué lleva
              </button>
              {verQueLleva && explosion && (
                <div className="mt-2 rounded-xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-[11px] font-bold uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <th className="py-2 pl-3 px-2">Componente</th>
                        <th className="py-2 px-2">Requerido</th>
                        <th className="py-2 px-2">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(explosion.componentes ?? []).map((c: any) => (
                        <tr key={c.productoInsumoId} className="border-b border-slate-50 dark:border-slate-800">
                          <td className="py-1.5 pl-3 px-2">
                            <span className="font-semibold">{c.codigo}</span>
                            <span className="text-slate-400"> · {c.descripcion}</span>
                          </td>
                          <td className="py-1.5 px-2">{c.requerido} {c.unidad}</td>
                          <td className={`py-1.5 px-2 ${c.alcanza ? 'text-slate-500' : 'text-rose-600 font-semibold'}`}>
                            {c.stock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="px-3 py-2 text-xs text-slate-400">
                    Informativo: a la cotización va el módulo, no sus piezas.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={cerrar} color="secondary" outline className="text-sm">
            Cancelar
          </Button>
          <Button onClick={agregar} color="primary" className="text-sm">
            Agregar a la cotización
          </Button>
        </div>
      </div>
    </Modal>
  );
}
