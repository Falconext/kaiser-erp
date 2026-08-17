import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import moment from 'moment';
import { useReactToPrint } from 'react-to-print';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import ModalConfirm from '@/components/ModalConfirm';
import { get, post, put, patch } from '@/utils/fetch';
import { useAuthStore } from '@/zustand/auth';
import { useUsersStore } from '@/zustand/users';
import Select from '@/components/Select';
import useAlertStore from '@/zustand/alert';
import ComprobantePrintPage from './comprobanteImprimir';
import { numberToWords } from '@/utils/numberToLetters';
import { hasPlanFeature } from '@/utils/permissions';
import { buildComprobantePrintPageStyle } from '@/utils/printStyles';

// ─── Types ───────────────────────────────────────────────────────────────────

type PrintSize = 'TICKET' | 'A4' | 'A5';

const ESTADOS_DESPACHO = [
    { id: 'PREPARANDO', value: 'Preparando',   icon: 'solar:box-bold-duotone',           color: '#F59E0B', bg: 'bg-amber-50  border-amber-200  text-amber-600'   },
    { id: 'EN_CAMINO',  value: 'En camino',    icon: 'solar:delivery-bold-duotone',      color: '#3B82F6', bg: 'bg-blue-50   border-blue-200   text-blue-600'    },
    { id: 'EN_DESTINO', value: 'En destino',   icon: 'solar:map-point-bold-duotone',     color: '#8B5CF6', bg: 'bg-violet-50 border-violet-200 text-violet-600'  },
    { id: 'ENTREGADO',  value: 'Entregado',    icon: 'solar:check-circle-bold-duotone',  color: '#10B981', bg: 'bg-emerald-50 border-emerald-200 text-emerald-600' },
    { id: 'DEVUELTO',   value: 'Devuelto',     icon: 'solar:arrow-left-bold-duotone',    color: '#EF4444', bg: 'bg-red-50    border-red-200    text-red-600'     },
];

const PRINT_SIZES: { id: PrintSize; label: string; icon: string }[] = [
    { id: 'TICKET', label: 'Ticket 80mm', icon: 'solar:printer-minimalistic-bold-duotone' },
    { id: 'A4',     label: 'A4',          icon: 'solar:document-bold-duotone' },
    { id: 'A5',     label: 'A5',          icon: 'solar:document-bold-duotone' },
];

const PRINT_DIMENSIONS: Record<PrintSize, { width: number; height: number }> = {
    TICKET: { width: 80,  height: 330 },
    A4:     { width: 210, height: 297 },
    A5:     { width: 148, height: 210 },
};

const COMPROBANTE_LABELS: Record<string, string> = {
    '01': 'FACTURA',
    '03': 'BOLETA',
    '07': 'NOTA DE CRÉDITO',
    '08': 'NOTA DE DÉBITO',
    NV: 'NOTA DE VENTA',
    NP: 'NOTA DE PEDIDO',
    OT: 'ORDEN DE TRABAJO',
    TICKET: 'TICKET',
    CP: 'COMPROBANTE DE PAGO',
    RH: 'RECIBO POR HONORARIO',
};

const getEstado = (id: string) => ESTADOS_DESPACHO.find(e => e.id === id) ?? ESTADOS_DESPACHO[0];
const unwrapApiPayload = (response: any) => {
    if (!response || response.success === false) return null;
    return response.data ?? response;
};
const getComprobanteLabel = (comprobante: any) => (
    comprobante?.comprobante ||
    COMPROBANTE_LABELS[String(comprobante?.tipoDoc ?? '')] ||
    comprobante?.tipoDoc ||
    'COMPROBANTE'
);
const getComprobanteTotal = (comprobante: any) => Number(
    comprobante?.mtoImpVenta ??
    comprobante?.total ??
    comprobante?.subTotal ??
    comprobante?.valorVenta ??
    0
);
const getDetalleDescripcion = (detalle: any) => (
    detalle?.descripcion ||
    detalle?.producto?.descripcion ||
    detalle?.producto?.nombre ||
    'Producto / servicio'
);
const getDetallePrecio = (detalle: any) => Number(
    detalle?.mtoPrecioUnitario ??
    detalle?.mtoValorUnitario ??
    detalle?.precioUnitario ??
    0
);
const getDetalleSubtotal = (detalle: any) => Number(
    detalle?.mtoValorVenta ??
    detalle?.subtotal ??
    (Number(detalle?.cantidad ?? 0) * getDetallePrecio(detalle))
);

const planPermiteDespacho = (auth: any) => {
    return hasPlanFeature(auth, 'tieneDeliveryGPS');
};

const hasUsefulText = (value: unknown) => {
    const text = String(value ?? '').trim();
    return Boolean(text) && !['-', '—', 'NO_APLICA', 'NULL', 'UNDEFINED'].includes(text.toUpperCase());
};

const hasRealDespacho = (envio: any) => {
    if (!envio?.id) return false;

    const estado = String(envio.estado ?? '').trim().toUpperCase();
    if (estado && estado !== 'PREPARANDO' && estado !== 'NO_APLICA') return true;

    const hasDestino = hasUsefulText(envio.direccionDestino) || hasUsefulText(envio.agenciaDestino);
    const hasCourier = hasUsefulText(envio.transportista);
    const hasTracking = hasUsefulText(envio.codigoGuia) || hasUsefulText(envio.nroOrden) || hasUsefulText(envio.claveOrden);
    const hasContacto = String(envio.celularDest ?? '').replace(/\D/g, '').length >= 9;
    const hasFecha = hasUsefulText(envio.fechaEstimada);
    const hasPaquetes = Number(envio.nroPaquetes ?? 0) > 0;
    const hasOperativo = hasUsefulText(envio.establecimiento) || hasUsefulText(envio.empaquetador) || hasUsefulText(envio.repartidor);

    return hasCourier || hasDestino || hasTracking || hasContacto || hasFecha || hasPaquetes || hasOperativo;
};

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
    comprobanteId: number | null;
    isOpen: boolean;
    onClose: () => void;
    // Se dispara cuando algo del comprobante cambió (p. ej. el vendedor de campo),
    // para que la vista que abrió el modal refresque su listado.
    onUpdated?: () => void;
}

export default function ModalDetalleComprobante({ comprobanteId, isOpen, onClose, onUpdated }: Props) {
    const { auth } = useAuthStore();
    const { alert } = useAlertStore();
    const navigate = useNavigate();
    const puedeDespacho = planPermiteDespacho(auth);

    const [comprobante, setComprobante] = useState<any>(null);
    const [envio, setEnvio] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // ── Cobranza en campo: reasignar vendedor de campo (retroactivo) ──
    const cobranzaCampo = Boolean((auth as any)?.empresa?.cobranzaCampo);
    const { usuarios, getAllUsers } = useUsersStore();
    const [guardandoVendedorCampo, setGuardandoVendedorCampo] = useState(false);
    useEffect(() => {
        if (isOpen && cobranzaCampo) getAllUsers({ page: 1, limit: 100 });
    }, [isOpen, cobranzaCampo]); // eslint-disable-line react-hooks/exhaustive-deps

    const guardarVendedorCampo = async (vendedorCampoId: number | null) => {
        if (!comprobante?.id) return;
        if (comprobante?.comisionLiquidada) {
            alert('La comisión de esta venta ya fue liquidada; no se puede cambiar el vendedor.', 'error');
            return;
        }
        const nombre = usuarios.find((u: any) => u.id === vendedorCampoId)?.nombre ?? null;
        setGuardandoVendedorCampo(true);
        try {
            await patch(`comprobante/${comprobante.id}/vendedor-campo`, {
                vendedorCampoId,
                vendedorCampoNombre: nombre,
            });
            setComprobante((prev: any) => prev ? { ...prev, vendedorCampoId, vendedorCampoNombre: nombre } : prev);
            alert('Vendedor de campo actualizado', 'success');
            onUpdated?.();
        } catch (e: any) {
            alert(e?.message || 'No se pudo actualizar el vendedor', 'error');
        } finally {
            setGuardandoVendedorCampo(false);
        }
    };

    // ── Print / Share state ──
    const [printSize, setPrintSize] = useState<PrintSize>('TICKET');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [generandoPdf, setGenerandoPdf] = useState(false);
    const [shouldPrint, setShouldPrint] = useState(false);
    const componentRef = useRef<HTMLDivElement>(null);

    // ── WhatsApp / Email state ──
    const [waNumber, setWaNumber] = useState('');
    const [emailDest, setEmailDest] = useState('');
    const [enviandoEmail, setEnviandoEmail] = useState(false);

    const load = useCallback(async () => {
        if (!comprobanteId) return;
        setLoading(true);
        try {
            const [respComp, respEnvio] = await Promise.all([
                get<any>(`comprobante/${comprobanteId}`),
                puedeDespacho
                    ? get<any>(`envio-despacho/comprobante/${comprobanteId}`).catch(() => null)
                    : Promise.resolve(null),
            ]);
            const comp = unwrapApiPayload(respComp);
            if (!comp) return;
            setComprobante(comp);
            setWaNumber(comp?.cliente?.telefono || comp?.cliente?.celular || '');
            setEmailDest(comp?.cliente?.email || '');
            setEnvio(unwrapApiPayload(respEnvio));
        } finally {
            setLoading(false);
        }
    }, [comprobanteId, puedeDespacho]);

    useEffect(() => {
        if (!isOpen || !comprobanteId) return;
        setComprobante(null);
        setEnvio(null);
        setPdfUrl(null);
        load();
    }, [isOpen, comprobanteId, load]);

    // ── Print logic ──
    const dim = PRINT_DIMENSIONS[printSize];
    const printFn = useReactToPrint({
        // @ts-ignore
        contentRef: componentRef,
        pageStyle: buildComprobantePrintPageStyle(dim),
        // Nombre sugerido al "Guardar como PDF": serie-correlativo del comprobante
        documentTitle: comprobante?.serie ? `${comprobante.serie}-${comprobante.correlativo}` : undefined,
    });

    useEffect(() => {
        if (!shouldPrint || !comprobante) return;
        const timer = setTimeout(() => {
            if (componentRef?.current) printFn();
            setShouldPrint(false);
        }, 400);
        return () => clearTimeout(timer);
    }, [shouldPrint, comprobante, printFn]);

    const handleImprimir = () => setShouldPrint(true);

    const handleGenerarPdf = async (): Promise<string | null> => {
        if (pdfUrl) return pdfUrl;
        if (!comprobanteId) return null;
        setGenerandoPdf(true);
        try {
            const res = await post<{ pdfUrl: string }>(`comprobante/${comprobanteId}/generar-pdf`, {});
            const url = (res as any)?.data?.pdfUrl || (res as any)?.pdfUrl;
            if (url) { setPdfUrl(url); return url; }
            return null;
        } finally {
            setGenerandoPdf(false);
        }
    };

    const handleCompartirPdf = async () => {
        const url = await handleGenerarPdf();
        if (url) window.open(url, '_blank');
        else alert('No se pudo generar el PDF', 'error');
    };

    const handlePdfServidor = async () => {
        const url = await handleGenerarPdf();
        if (url) window.open(url, '_blank');
        else alert('No se pudo generar el PDF desde el servidor', 'error');
    };

    // ── WhatsApp ──
    const handleEnviarWhatsApp = () => {
        const num = waNumber.trim().replace(/\D/g, '');
        if (!num) { alert('Ingrese un número de WhatsApp válido', 'error'); return; }
        if (!pdfUrl && !comprobante?.s3PdfUrl) {
            alert('Primero genera el PDF para compartirlo', 'warning');
            return;
        }
        const finalNum = num.startsWith('51') ? num : `51${num}`;
        const serie = `${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}`;
        const monto = `S/ ${getComprobanteTotal(comprobante).toFixed(2)}`;
        const link = pdfUrl || comprobante.s3PdfUrl || '';
        const mensaje = encodeURIComponent(
            `Hola ${comprobante?.cliente?.nombre || ''}, te enviamos tu ${getComprobanteLabel(comprobante)} ${serie} por ${monto}.\n\nPuedes descargarlo aquí: ${link}`
        );
        window.open(`https://wa.me/${finalNum}?text=${mensaje}`, '_blank');
    };

    // ── Email ──
    const handleEnviarEmail = async () => {
        const email = emailDest.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Ingrese un correo electrónico válido', 'error');
            return;
        }
        if (!comprobanteId) return;
        setEnviandoEmail(true);
        const res = await post(`comprobante/${comprobanteId}/enviar-email`, { email });
        setEnviandoEmail(false);
        if ((res as any).error) { alert((res as any).error, 'error'); return; }
        alert('Correo enviado correctamente', 'success');
    };

    const total = getComprobanteTotal(comprobante);
    const comprobanteLabel = getComprobanteLabel(comprobante);
    const showDespacho = puedeDespacho && hasRealDespacho(envio);
    // Condición de pago (crédito) — no depende del medio de pago: una venta al
    // crédito tiene medioPago 'EFECTIVO' por defecto pero formaPagoTipo=CREDITO
    // / estadoPago pendiente / saldo>0.
    const esVentaCredito =
        String(comprobante?.formaPagoTipo || '').toUpperCase() === 'CREDITO' ||
        ['PENDIENTE_PAGO', 'PAGO_PARCIAL'].includes(
            String(comprobante?.estadoPago || '').toUpperCase(),
        ) ||
        Number(comprobante?.saldo || 0) > 0;

    return (
        <>
        {/* Hidden print component */}
        {comprobante && (
            <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
                <ComprobantePrintPage
                    company={auth}
                    componentRef={componentRef}
                    formValues={comprobante}
                    size={printSize}
                    serie={comprobante.serie}
                    correlative={comprobante.correlativo}
                    productsInvoice={comprobante.detalles}
                    total={total.toFixed(2)}
                    mode="off"
                    qrCodeDataUrl={undefined}
                    discount={comprobante.mtoDescuentoGlobal ? comprobante.mtoDescuentoGlobal.toString() : null}
                    receipt={comprobanteLabel}
                    selectedClient={comprobante.cliente}
                    totalInWords={numberToWords(total) + ' SOLES'}
                    observation={comprobante.observaciones}
                    includeProductImages={false}
                    quotationDiscount={0}
                    quotationValidity={7}
                    quotationSignature=""
                    quotationTerms=""
                />
            </div>
        )}

        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title="Detalle del comprobante"
            icon="solar:document-text-bold-duotone"
            iconClass="bg-blue-50 dark:bg-blue-900/20 text-blue-600"
            width="800px"
        >
            {loading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                    <Icon icon="line-md:loading-twotone-loop" className="text-4xl text-blue-500 animate-spin" />
                    <span className="text-sm">Cargando comprobante...</span>
                </div>
            ) : comprobante ? (
                <div className="divide-y divide-gray-100 dark:divide-slate-800">

                    {/* ── Cabecera ── */}
                    <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-6">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Comprobante</p>
                            <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                                {comprobanteLabel}
                            </p>
                            <p className="text-sm text-gray-500 font-mono">
                                {comprobante.serie}-{String(comprobante.correlativo).padStart(8, '0')}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {moment(comprobante.fechaEmision).format('DD/MM/YYYY HH:mm')}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Total</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white">
                                S/ {total.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                {esVentaCredito
                                    ? `Crédito${comprobante.medioPago ? ` · ${comprobante.medioPago}` : ''}`
                                    : comprobante.medioPago || 'Sin medio de pago'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Cliente</p>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{comprobante.cliente?.nombre || '-'}</p>
                            <p className="text-xs text-gray-500">{comprobante.cliente?.nroDoc || ''}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Estado SUNAT</p>
                            <SunatBadge estado={comprobante.estadoEnvioSunat} />
                        </div>
                    </div>

                    {/* ── Cobranza en campo: reasignar vendedor de campo ── */}
                    {cobranzaCampo && (
                        <div className="px-5 pb-4">
                            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 dark:border-violet-900/30 dark:bg-violet-900/10">
                                <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                                    <Icon icon="solar:user-hand-up-bold-duotone" width={13} />
                                    Vendedor de campo
                                </p>
                                <Select
                                    error=""
                                    label=""
                                    name="vendedorCampoDetalle"
                                    value={comprobante.vendedorCampoNombre || comprobante.usuario?.nombre || ''}
                                    options={(usuarios || []).map((u: any) => ({ id: u.id, value: u.nombre || u.email || `Usuario ${u.id}` }))}
                                    onChange={(id: any) => guardarVendedorCampo(Number(id) || null)}
                                    disabled={!!comprobante.comisionLiquidada || guardandoVendedorCampo}
                                />
                                <p className="mt-1 text-[10px] text-gray-400 dark:text-slate-500">
                                    {comprobante.comisionLiquidada
                                        ? '🔒 La comisión de esta venta ya fue liquidada (pagada al vendedor). No se puede cambiar el vendedor.'
                                        : guardandoVendedorCampo
                                            ? 'Guardando…'
                                            : 'Se muestra como vendedor en el panel, la nota de venta y el comprobante. Al cambiarlo, la comisión se recalcula para el nuevo vendedor.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Productos ── */}
                    <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                            Productos / Servicios ({comprobante.detalles?.length ?? 0})
                        </p>
                        <div className="rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
                            {(comprobante.detalles ?? []).map((det: any, i: number) => (
                                <div
                                    key={i}
                                    className="flex items-start justify-between gap-3 px-4 py-3 border-b border-gray-50 dark:border-slate-800/50 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                            {getDetalleDescripcion(det)}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {det.unidad || 'NIU'} &middot; {Number(det.cantidad ?? 0)} und &times; S/ {getDetallePrecio(det).toFixed(2)}
                                        </p>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-white shrink-0">
                                        S/ {getDetalleSubtotal(det).toFixed(2)}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 space-y-1 text-sm">
                            <div className="flex justify-between text-gray-500">
                                <span>IGV (18%)</span>
                                <span>S/ {Number(comprobante.mtoIGV ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-100 dark:border-slate-800">
                                <span>Total</span>
                                <span>S/ {total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ── Imprimir / Compartir ── */}
                    <div className="p-5 space-y-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Imprimir / Compartir
                        </p>

                        {/* Selector de tamaño */}
                        <div className="flex gap-2">
                            {PRINT_SIZES.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setPrintSize(s.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                                        printSize === s.id
                                            ? 'border-violet-500 text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 ring-1 ring-violet-400'
                                            : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <Icon icon={s.icon} width={13} />
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {/* Botones de acción */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={handleImprimir}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                            >
                                <Icon icon="solar:printer-minimalistic-bold-duotone" width={16} />
                                Imprimir
                            </button>
                            <button
                                type="button"
                                onClick={handleCompartirPdf}
                                disabled={generandoPdf}
                                className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all disabled:opacity-60"
                            >
                                {generandoPdf ? (
                                    <Icon icon="line-md:loading-twotone-loop" className="text-base" />
                                ) : (
                                    <Icon icon="solar:share-bold-duotone" width={16} />
                                )}
                                Compartir PDF
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handlePdfServidor}
                            disabled={generandoPdf}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800/50 text-violet-600 dark:text-violet-400 text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all disabled:opacity-60"
                        >
                            {generandoPdf ? (
                                <Icon icon="line-md:loading-twotone-loop" className="text-base" />
                            ) : (
                                <Icon icon="solar:cloud-download-bold-duotone" width={16} />
                            )}
                            PDF servidor
                        </button>
                    </div>

                    {/* ── Enviar por WhatsApp ── */}
                    <div className="p-5 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Enviar por WhatsApp
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                <Icon icon="mdi:whatsapp" className="text-green-600 dark:text-green-400 text-xl" />
                            </div>
                            <input
                                type="text"
                                value={waNumber}
                                onChange={e => setWaNumber(e.target.value)}
                                placeholder="Número (ej: 51999...)"
                                className="flex-1 h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={handleEnviarWhatsApp}
                                className="h-10 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors shrink-0"
                            >
                                Enviar
                            </button>
                        </div>
                        {!pdfUrl && !comprobante?.s3PdfUrl && (
                            <p className="text-[11px] text-amber-500 dark:text-amber-400 flex items-center gap-1">
                                <Icon icon="solar:danger-bold" width={12} />
                                Genera el PDF primero para incluir el enlace en el mensaje
                            </p>
                        )}
                    </div>

                    {/* ── Enviar por Correo ── */}
                    <div className="p-5 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Enviar por Correo
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                                <Icon icon="solar:letter-bold-duotone" className="text-violet-600 dark:text-violet-400 text-xl" />
                            </div>
                            <input
                                type="email"
                                value={emailDest}
                                onChange={e => setEmailDest(e.target.value)}
                                placeholder="Correo electrónico"
                                className="flex-1 h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={handleEnviarEmail}
                                disabled={enviandoEmail}
                                className="h-10 px-4 rounded-xl btn-accent text-sm font-bold transition-colors shrink-0 disabled:opacity-60 flex items-center gap-1.5"
                            >
                                {enviandoEmail && <Icon icon="line-md:loading-twotone-loop" className="text-base" />}
                                Enviar
                            </button>
                        </div>
                    </div>

                    {/* ── Seguimiento de despacho (solo lectura) ── */}
                    {showDespacho && (
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Icon icon="solar:delivery-bold-duotone" className="text-blue-500 text-xl" />
                                    <p className="text-sm font-bold text-gray-800 dark:text-white">Seguimiento de despacho</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { onClose(); navigate(`/administrador/ventas?fecha=${moment(comprobante.fechaEmision).format('YYYY-MM-DD')}&comprobanteId=${comprobante.id}`); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-200 dark:border-blue-800/50"
                                >
                                    <Icon icon="solar:arrow-right-up-bold" width={13} />
                                    Ir al Panel de Despacho
                                </button>
                            </div>

                            <div className="space-y-3">
                                {(() => {
                                    const estadoInfo = getEstado(envio.estado);
                                    return (
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${estadoInfo.bg}`}>
                                            <Icon icon={estadoInfo.icon} width={14} />
                                            {estadoInfo.value}
                                        </div>
                                    );
                                })()}
                                <div className="grid grid-cols-2 gap-3">
                                    <InfoCard icon="solar:bus-bold-duotone" label="Transportista" value={envio.transportista || '-'} />
                                    <InfoCard icon="solar:tag-bold-duotone" label="Código guía / SKU" value={envio.codigoGuia || '-'} />
                                    <InfoCard icon="solar:map-point-bold-duotone" label="Dirección destino" value={envio.direccionDestino || '-'} />
                                    <InfoCard
                                        icon="solar:calendar-bold-duotone"
                                        label="Fecha estimada"
                                        value={envio.fechaEstimada ? moment(envio.fechaEstimada).format('DD/MM/YYYY') : '-'}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                    No se pudo cargar el comprobante
                </div>
            )}
        </Modal>

</>
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SunatBadge({ estado }: { estado: string }) {
    const map: Record<string, { label: string; cls: string }> = {
        ACEPTADO:  { label: 'Aceptado',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
        PENDIENTE: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
        RECHAZADO: { label: 'Rechazado', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
        ANULADO:   { label: 'Anulado',   cls: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400' },
        NO_APLICA: { label: 'N/A',       cls: 'bg-gray-100 text-gray-400' },
    };
    const info = map[estado] ?? { label: estado, cls: 'bg-gray-100 text-gray-500' };
    return (
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${info.cls}`}>
            {info.label}
        </span>
    );
}

function InfoCard({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-transparent">
            <Icon icon={icon} className="text-gray-400 mt-0.5 shrink-0 text-lg" />
            <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{value}</p>
            </div>
        </div>
    );
}
