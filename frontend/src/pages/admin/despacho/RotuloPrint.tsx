import { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { buildComprobantePrintPageStyle } from '@/utils/printStyles';
import { mensajeErrorShalom } from '@/services/shalom.service';
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
    transportista?: string | null;
    referencia?: string;
}

/**
 * Rótulo propio (no el PDF con la marca de Shalom): solo el bloque de
 * destinatario/destino que el negocio necesita pegar en el paquete, con el
 * mismo formato de impresión (ticket 80mm) que el resto de comprobantes.
 * Se monta oculto y se dispara sola apenas `comprobanteId` cambia a un valor.
 */
export default function RotuloPrint({
    comprobanteId,
    onDone,
    formato = 'TICKET',
}: {
    comprobanteId: number | null;
    onDone: () => void;
    /** Ticket 80 mm (alto variable) o etiqueta adhesiva 80×50 mm. */
    formato?: RotuloFormato;
}) {
    const [datos, setDatos] = useState<DatosRotulo | null>(null);
    const componentRef = useRef<HTMLDivElement>(null);
    const { alert } = useAlertStore();

    const printFn = useReactToPrint({
        // @ts-ignore
        contentRef: componentRef,
        pageStyle: rotuloPageStyle(formato) ?? buildComprobantePrintPageStyle({ width: 80, height: 330 }),
        onAfterPrint: onDone,
    });

    useEffect(() => {
        if (!comprobanteId) { setDatos(null); return; }
        let vivo = true;
        (async () => {
            try {
                const res = await apiClient.get(`/shalom/rotulo/${comprobanteId}`);
                if (vivo) setDatos(res.data?.data ?? res.data);
            } catch (e) {
                if (vivo) {
                    alert(mensajeErrorShalom(e, 'No se pudo obtener los datos del rótulo'), 'error');
                    onDone();
                }
            }
        })();
        return () => { vivo = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comprobanteId]);

    useEffect(() => {
        if (!datos) return;
        // Un tick para que el div ya tenga el contenido pintado antes de imprimir.
        const timer = window.setTimeout(() => { printFn(); setDatos(null); }, 50);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datos]);

    if (formato === 'ETIQUETA_80X50') {
        return (
            <div className="hidden">
                <div ref={componentRef}>
                    {datos && <RotuloEtiqueta d={{ ...datos, referencia: datos.referencia, courier: datos.transportista ? (COURIER_LABEL[datos.transportista] ?? datos.transportista) : undefined }} />}
                </div>
            </div>
        );
    }

    return (
        <div className="hidden">
            <div ref={componentRef} className="p-4 text-sm" style={{ width: '80mm' }}>
                <p className="text-xs text-gray-500">Destinatario:</p>
                <p className="text-lg font-bold leading-tight">{datos?.nombreDestinatario || '-'}</p>
                <p className="text-xs font-bold mt-1">
                    N°DOC. <span className="font-normal">{datos?.dniDestinatario || '-'}</span>
                </p>

                <p className="text-xs text-gray-500 mt-3">Destino:</p>
                {datos?.ubicacion && <p className="text-xs text-gray-600">{datos.ubicacion}</p>}
                <p className="text-lg font-bold leading-tight">{datos?.agenciaNombre || '-'}</p>
                {datos?.direccion && <p className="text-xs text-gray-600">{datos.direccion}</p>}
            </div>
        </div>
    );
}
