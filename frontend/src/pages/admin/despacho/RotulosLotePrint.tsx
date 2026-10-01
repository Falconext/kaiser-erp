import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { buildComprobantePrintPageStyle } from '@/utils/printStyles';
import RotuloEtiqueta from './RotuloEtiqueta';
import { COURIER_LABEL, rotuloPageStyle, type RotuloFormato } from './rotuloFormato';

interface DatosRotulo {
    nroOrden: string | null;
    claveOrden: string | null;
    nombreDestinatario: string;
    dniDestinatario: string;
    ubicacion: string;
    agenciaNombre: string;
    direccion: string;
    claveEnvio?: string | null;
    celular?: string;
}

export interface RotuloLoteItem {
    comprobanteId: number;
    referencia: string;
    courier: string;
    celular: string;
}

/**
 * Impresión en lote de rótulos (un rótulo por página, ticket 80mm) para todos
 * los despachos en "Preparando" de la vista actual, sin importar el courier.
 * Mismo bloque destinatario/destino que `RotuloPrint`, más la referencia de la
 * venta y el courier para que el empaquetador sepa qué paquete es cuál.
 * Se monta oculto y se dispara sola apenas `items` deja de estar vacío.
 */
export default function RotulosLotePrint({
    items,
    onDone,
    formato = 'TICKET',
}: {
    items: RotuloLoteItem[];
    onDone: () => void;
    /** Ticket 80 mm (una página por rótulo) o etiqueta adhesiva 80×50 mm (una etiqueta por rótulo). */
    formato?: RotuloFormato;
}) {
    const [datos, setDatos] = useState<Array<RotuloLoteItem & { rotulo: DatosRotulo | null }> | null>(null);
    const componentRef = useRef<HTMLDivElement>(null);
    const { alert } = useAlertStore();

    const printFn = useReactToPrint({
        // @ts-ignore
        contentRef: componentRef,
        pageStyle: rotuloPageStyle(formato) ?? buildComprobantePrintPageStyle({ width: 80, height: 330 }),
        onAfterPrint: onDone,
    });

    useEffect(() => {
        if (!items.length) { setDatos(null); return; }
        let vivo = true;
        (async () => {
            const res = await Promise.all(items.map(async (it) => {
                try {
                    const r = await apiClient.get(`/shalom/rotulo/${it.comprobanteId}`);
                    return { ...it, rotulo: (r.data?.data ?? r.data) as DatosRotulo };
                } catch {
                    return { ...it, rotulo: null };
                }
            }));
            if (!vivo) return;
            const fallidos = res.filter((r) => !r.rotulo).length;
            // Sin N° de orden ni agencia el rótulo no dice a dónde va: se omite
            // (típico despacho recién coordinado o cliente WSP sin destino).
            const sinDestino = res.filter((r) => r.rotulo && !r.rotulo.nroOrden && !r.rotulo.agenciaNombre);
            const listos = res.filter((r) => r.rotulo && !sinDestino.includes(r));
            if (!listos.length) {
                alert(
                    fallidos === res.length
                        ? 'No se pudo obtener los datos de ningún rótulo'
                        : 'Ningún despacho en Preparando tiene destino (agencia u orden) para imprimir',
                    'error',
                );
                onDone();
                return;
            }
            if (fallidos > 0) alert(`${fallidos} rótulo(s) no se pudieron cargar y se omitieron`, 'warning');
            if (sinDestino.length > 0) {
                alert(
                    `${sinDestino.length} despacho(s) sin destino omitido(s): ${sinDestino.map((r) => r.referencia).join(', ')}`,
                    'warning',
                );
            }
            setDatos(listos);
        })();
        return () => { vivo = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    useEffect(() => {
        if (!datos) return;
        const timer = window.setTimeout(() => { printFn(); setDatos(null); }, 80);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datos]);

    if (formato === 'ETIQUETA_80X50') {
        return (
            <div className="hidden">
                <div ref={componentRef}>
                    {(datos ?? []).map((d, idx) => (
                        <RotuloEtiqueta
                            key={d.comprobanteId}
                            saltoDePagina={idx < (datos?.length ?? 0) - 1}
                            d={{
                                ...(d.rotulo ?? {}),
                                referencia: d.referencia,
                                courier: COURIER_LABEL[d.courier] ?? d.courier,
                                celular: d.celular || d.rotulo?.celular,
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="hidden">
            <div ref={componentRef}>
                {(datos ?? []).map((d, idx) => (
                    <div
                        key={d.comprobanteId}
                        className="p-4 text-sm"
                        style={{ width: '80mm', pageBreakAfter: idx < (datos?.length ?? 0) - 1 ? 'always' : 'auto' }}
                    >
                        <p className="text-[10px] text-gray-500">
                            {d.referencia} · {COURIER_LABEL[d.courier] ?? d.courier}
                            {d.rotulo?.nroOrden ? ` · Orden ${d.rotulo.nroOrden}` : ''}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">Destinatario:</p>
                        <p className="text-lg font-bold leading-tight">{d.rotulo?.nombreDestinatario || '-'}</p>
                        <p className="text-xs font-bold mt-1">
                            N°DOC. <span className="font-normal">{d.rotulo?.dniDestinatario || '-'}</span>
                        </p>
                        {d.celular && (
                            <p className="text-xs font-bold">
                                CEL. <span className="font-normal">{d.celular}</span>
                            </p>
                        )}

                        <p className="text-xs text-gray-500 mt-3">Destino:</p>
                        {d.rotulo?.ubicacion && <p className="text-xs text-gray-600">{d.rotulo.ubicacion}</p>}
                        <p className="text-lg font-bold leading-tight">{d.rotulo?.agenciaNombre || '-'}</p>
                        {d.rotulo?.direccion && <p className="text-xs text-gray-600">{d.rotulo.direccion}</p>}
                    </div>
                ))}
            </div>
        </div>
    );
}
