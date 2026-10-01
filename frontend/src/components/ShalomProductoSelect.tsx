import { useEffect, useState } from 'react';
import { shalomService, type ShalomProducto, type ShalomTarifa } from '@/services/shalom.service';

const inp = 'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all';

const soles = (n: number) => `S/ ${n.toFixed(2)}`;

/**
 * Tamaño del paquete que se registra en Shalom (SOBRE, XXS, XS, S, M, L): lista
 * fija universal (ya no depende del catálogo de la cuenta, que cuando fallaba
 * dejaba el selector vacío y todo salía XS). Si se conoce la agencia de destino
 * se cotiza la ruta y cada tamaño muestra cuánto pagará el cliente al recoger.
 */
export function ShalomProductoSelect({ value, onChange, destinoId, onTarifa }: {
    value?: number | string | null;
    onChange: (id: number | undefined) => void;
    /** ter_id de la agencia de destino: con él se muestran los precios. */
    destinoId?: string | number | null;
    /** Devuelve la tarifa cotizada (para el resumen del despacho). */
    onTarifa?: (t: ShalomTarifa | null) => void;
}) {
    const [productos, setProductos] = useState<ShalomProducto[]>([]);
    const [cargando, setCargando] = useState(true);
    const [tarifa, setTarifa] = useState<ShalomTarifa | null>(null);
    const [cotizando, setCotizando] = useState(false);

    useEffect(() => {
        let vivo = true;
        shalomService.productos()
            .then(p => { if (vivo) setProductos(p); })
            .catch(() => { if (vivo) setProductos([]); })
            .finally(() => { if (vivo) setCargando(false); });
        return () => { vivo = false; };
    }, []);

    useEffect(() => {
        let vivo = true;
        if (!destinoId) { setTarifa(null); onTarifa?.(null); return; }
        setCotizando(true);
        // Un reintento: la primera cotización de una ruta puede fallar por tiempo.
        shalomService.tarifa(destinoId)
            .catch(() => new Promise(r => setTimeout(r, 1500)).then(() => shalomService.tarifa(destinoId)))
            .then(t => { if (vivo) { setTarifa(t); onTarifa?.(t); } })
            .catch(() => { if (vivo) { setTarifa(null); onTarifa?.(null); } })
            .finally(() => { if (vivo) setCotizando(false); });
        return () => { vivo = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [destinoId]);

    const precioDe = (id: number) => tarifa?.tamanos.find(t => t.id === id)?.precio ?? null;
    const porDefecto = productos.find(p => p.porDefecto);
    const seleccionado = value != null && value !== '' ? Number(value) : null;
    const precioSel = seleccionado != null ? precioDe(seleccionado) : (porDefecto ? precioDe(porDefecto.id) : null);

    return (
        <div>
            <select
                value={seleccionado != null ? String(seleccionado) : ''}
                disabled={cargando}
                onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
                className={inp}
                data-testid="shalom-tamano"
            >
                <option value="">
                    {cargando ? 'Cargando tamaños…' : `Usar el predeterminado${porDefecto ? ` (${porDefecto.key})` : ''}`}
                </option>
                {productos.map(p => {
                    const precio = precioDe(p.id);
                    return (
                        <option key={p.id} value={p.id}>
                            {p.nombre}{precio != null ? ` · ${soles(precio)}` : ''}
                        </option>
                    );
                })}
            </select>
            <p className="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400" data-testid="shalom-tamano-ayuda">
                {!destinoId
                    ? 'Elige la agencia de destino para ver cuánto cuesta cada tamaño en esa ruta.'
                    : cotizando
                        ? 'Cotizando la ruta en Shalom…'
                        : tarifa
                            ? <>Flete para esta ruta{precioSel != null ? <>: <b>{soles(precioSel)}</b></> : ''}{tarifa.leadTime ? ` · llega en ~${tarifa.leadTime}` : ''}. Lo paga el cliente al recoger, según tu acuerdo con Shalom.</>
                            : 'No se pudo cotizar la ruta; la guía igual se genera con el tamaño elegido.'}
            </p>
        </div>
    );
}
