import moment from 'moment';
import React, { useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { BRAND } from '@/lib/branding';
import { elemCfg, ticketPx, type FormatoImpresionKey } from '@/features/admin/cotizaciones/cotizFormatoElementos';

const ComprobantePrintPage = ({
    productsInvoice,
    totalInWords,
    qrCodeDataUrl,
    componentRef,
    observation,
    company,
    formValues,
    mode,
    total,
    receipt,
    selectedClient,
    discount,
    printFn,
    size,
    includeProductImages = false,
    quotationDiscount = 0,
    quotationValidity = 7,
    quotationSignature = '',
    quotationTerms = '',
    quotationPaymentType = 'CONTADO',
    quotationAdvance = 0,
    quotationCurrency = 'PEN',
    retencionData = null
}: any) => {

    // Moneda de la cotización: solo afecta el formato COTIZACIÓN (no la facturación SUNAT)
    const esUSD = String(quotationCurrency).toUpperCase() === 'USD';
    const monedaSimbolo = esUSD ? 'US$' : 'S/';
    const monedaNombre = esUSD ? 'DÓLARES' : 'SOLES';
    const sonEnMoneda = esUSD
        ? String(totalInWords || '').replace(/SOLES/gi, 'DÓLARES AMERICANOS').replace(/SOL\b/gi, 'DÓLAR AMERICANO')
        : totalInWords;


    const localComponentRef = useRef(null);

    useEffect(() => {
        // Force re-render or update logic if needed
        // This ensures the component updates when props change
    }, [productsInvoice, totalInWords, qrCodeDataUrl, observation, company, formValues, mode, total, receipt, selectedClient, discount, size, includeProductImages, quotationDiscount, quotationValidity, quotationSignature, retencionData]);

    const totalReceipt = productsInvoice?.reduce((sum: any, p: any) => sum + Number(p.total || p.mtoPrecioUnitario * p.cantidad || 0), 0);
    const totalPrices = productsInvoice?.reduce((sum: any, p: any) => {
        const cant = Number(p.cantidad || 0);
        // Precio de lista de la línea: en creación viene precioUnitario; en reimpresión se
        // reconstruye sumando el descuento guardado (mtoDescuento) al precio ya rebajado.
        const grossLine = p.precioUnitario != null
            ? Number(p.precioUnitario) * cant
            : Number(p.mtoPrecioUnitario || 0) * cant + Number(p.mtoDescuento || 0);
        return sum + grossLine;
    }, 0);

    // Configuración del formato (visibilidad + tamaño por elemento).
    // Las notas de venta tienen su propio formato independiente del de cotización.
    const formatoConfig = receipt === 'NOTA DE VENTA'
        ? (company?.empresa as any)?.notaVentaFormatoConfig
        : (company?.empresa as any)?.cotizFormatoConfig;
    // El tamaño depende del FORMATO: A4 manda el general, A5 puede llevar el suyo,
    // y el ticket escala respecto a la fuente térmica (16px) en vez de aplicar el
    // px de A4 tal cual — si no, un título subido para A4 sale ilegible en 80mm.
    const fmt = (size === 'TICKET' || size === 'A5' ? size : 'A4') as FormatoImpresionKey;
    const fc = (key: string) => elemCfg(formatoConfig, key, fmt);
    const px = (key: string, base?: number) =>
        fmt === 'TICKET' ? `${ticketPx(formatoConfig, key, base)}px` : `${fc(key).size}px`;

    const round2 = (n: any) => parseFloat(n?.toFixed(2)) || 0;
    const parseAmount = (value: any, fallback = 0): number => {
        if (value === null || value === undefined || value === '') return fallback;
        if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
        const normalized = String(value).replace(/\s/g, '').replace(',', '.');
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : fallback;
    };
    const formatCantidad = (value: any): string => {
        const cantidad = parseAmount(value, 0);
        if (Number.isInteger(cantidad)) return String(cantidad);
        return cantidad.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    };

console.log(formValues)
    console.log(company)
    const rawBase64 = company?.empresa?.logo;
    const logoDataUrl = (() => {
        if (!rawBase64) return undefined;
        const t = rawBase64.trim();
        if (t.startsWith('data:')) return t;
        if (/^https?:\/\//i.test(t) || t.startsWith('/')) return t;
        return `data:${t.startsWith('/9j/') ? 'image/jpeg' : 'image/png'};base64,${t}`;
    })();

    // Fallback: Detect retention from observation if data prop is missing
    const hasRetentionText = observation?.toUpperCase().includes("RETENCIÓN") && observation?.toUpperCase().includes("3%");
    const calculatedRetention = hasRetentionText ? Number((Number(total) * 0.03).toFixed(2)) : 0;

    const displayRetencionMonto = retencionData ? Number(retencionData.montoDetraccion || 0) : calculatedRetention;
    const shouldShowRetention = retencionData || (hasRetentionText && calculatedRetention > 0);
    const isDocumentoFiscal = ['01', '03', '07', '08'].includes(String(formValues?.tipoDoc || ''));
    const explicitDiscount = parseAmount(
        formValues?.mtoDescuentoGlobal ??
        formValues?.totalDescuentos ??
        discount,
        0
    );
    const netTotalFallback = Math.max(0, totalReceipt - explicitDiscount);
    // Descuento por línea guardado en el comprobante (reimpresión desde la lista). En el
    // ticket de creación los ítems del carrito no lo traen, así que el ahorro se deduce de
    // (totalPrices - totalReceipt). Nota: mtoDescuentoGlobal llega como 0 (no null) en la
    // reimpresión, por lo que la cadena `??` lo cortaría; por eso se suma explícitamente.
    const lineDiscountsSum = productsInvoice?.reduce(
        (s: number, p: any) => s + Number(p?.mtoDescuento || 0), 0
    ) || 0;
    const headerGlobalDiscount = parseAmount(
        formValues?.totalDescuentos ??
        formValues?.mtoDescuentos ??
        formValues?.mtoDescuentoGlobal,
        0
    );
    const fallbackDiscount = totalPrices > totalReceipt ? totalPrices - totalReceipt : 0;
    const totalDescuentos = (lineDiscountsSum + headerGlobalDiscount) > 0
        ? lineDiscountsSum + headerGlobalDiscount
        : (parseAmount(discount, 0) || fallbackDiscount);
    const mtoOperGravadas = parseAmount(formValues?.mtoOperGravadas, netTotalFallback / 1.18);
    const mtoOperGratuitas = parseAmount(formValues?.mtoOperGratuitas, 0);
    const mtoOperInafectas = parseAmount(formValues?.mtoOperInafectas, 0);
    const mtoOperExoneradas = parseAmount(formValues?.mtoOperExoneradas, 0);
    const mtoIcbper = parseAmount(formValues?.icbper ?? formValues?.mtoIcbper, 0);
    const mtoIgv = parseAmount(formValues?.mtoIGV, netTotalFallback - (netTotalFallback / 1.18));
    const mtoImpVenta = parseAmount(formValues?.mtoImpVenta, netTotalFallback);
    // Porcentaje de descuento (respecto al bruto), para mostrarlo junto al monto en soles
    const descuentoPct = totalDescuentos > 0 && totalPrices > 0
        ? Math.round((totalDescuentos / totalPrices) * 1000) / 10
        : (Number(quotationDiscount) > 0 ? Number(quotationDiscount) : 0);
    const normalizePaymentLabel = (value: any): string =>
        String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toUpperCase();
    const cuotasCredito = Array.isArray(formValues?.cuotas) ? formValues.cuotas : [];
    const hasCreditInstallments = cuotasCredito.length > 0;
    const paymentConditionCode = normalizePaymentLabel(formValues?.formaPagoTipo || formValues?.medioPago);
    const medioPagoCode = normalizePaymentLabel(formValues?.medioPago);
    const isCreditPayment = paymentConditionCode === 'CREDITO' || medioPagoCode === 'CREDITO' || hasCreditInstallments;
    const isMixedPayment = medioPagoCode === 'MIXTO';
    const paymentConditionLabel = isCreditPayment ? 'CRÉDITO' : 'CONTADO';
    const paymentMethodLabel = isCreditPayment
        ? 'CRÉDITO'
        : (formValues?.medioPago ? String(formValues.medioPago).toUpperCase() : 'EFECTIVO');
    const displayVuelto = isCreditPayment ? 0 : parseAmount(formValues?.vuelto, 0);
    const splitPaidTotal = isMixedPayment && Array.isArray(formValues?.splitPayments)
        ? formValues.splitPayments.reduce((sum: number, sp: { amount: number }) => sum + parseAmount(sp.amount, 0), 0)
        : 0;
    const displayPagado = isCreditPayment ? 0 : (splitPaidTotal > 0 ? splitPaidTotal : mtoImpVenta + displayVuelto);
    const paymentDetails = formValues?.paymentDetails || {};
    const splitPaymentDetails = Array.isArray(paymentDetails?.splitPayments)
        ? paymentDetails.splitPayments
        : (Array.isArray(formValues?.splitPayments) ? formValues.splitPayments : []);
    const singlePaymentDetail = paymentDetails?.mode === 'SIMPLE' ? paymentDetails : {
        method: paymentMethodLabel,
        amount: mtoImpVenta,
        referencia: paymentDetails?.referencia,
        cuentaBancariaLabel: paymentDetails?.cuentaBancariaLabel,
        tarjetaTipo: paymentDetails?.tarjetaTipo,
        tarjetaMarca: paymentDetails?.tarjetaMarca,
        tarjetaUltimos4: paymentDetails?.tarjetaUltimos4,
    };
    const formatPaymentExtra = (payment: any) => {
        const extras = [];
        if (payment?.cuentaBancariaLabel) extras.push(`Cuenta: ${payment.cuentaBancariaLabel}`);
        if (payment?.referencia) extras.push(`Op/Voucher: ${payment.referencia}`);
        const method = (payment?.method || '').toUpperCase();
        if (method === 'TARJETA') {
            const tarjeta = [payment?.tarjetaMarca, payment?.tarjetaTipo, payment?.tarjetaUltimos4 ? `****${payment.tarjetaUltimos4}` : ''].filter(Boolean).join(' ');
            if (tarjeta) extras.push(`Tarjeta: ${tarjeta}`);
        }
        return extras;
    };
    // Cobranza en campo: prioriza el vendedor de campo atribuido. Soporta tanto el
    // row plano del panel (formValues.vendedor) como el comprobante crudo del detalle.
    const vendedorNombre = (formValues?.vendedorCampoNombre || formValues?.vendedor || formValues?.usuario?.nombre || company?.nombre || 'ADMIN').toString().toUpperCase();
    const empresaNumero = (
        company?.empresa?.celular ||
        company?.empresa?.telefono ||
        company?.celular ||
        company?.telefono ||
        ''
    ).toString().trim();

    console.log(formValues)

    // ── Formato Kaiser (cotización / nota de venta A4) ──────────────────────
    const fmtMoney = (n: any) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtMoney3 = (n: any) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    const emp: any = company?.empresa || {};
    const textosKaiser: any = (formatoConfig as any)?.textos || {};
    const logoKaiser = logoDataUrl || '/svg/kaiser-logo.png';
    const brandColor = emp.colorPrimario && emp.colorPrimario !== '#000000' ? emp.colorPrimario : '#0053a6';
    const borderColor = '#1f3a5f';
    const monedaTextoKaiser = esUSD ? 'DOLARES AMERICANOS' : 'SOLES';
    const monedaCodigoKaiser = esUSD ? 'USD' : 'PEN';
    const advanceAmountKaiser = quotationPaymentType === 'ADELANTO'
        ? (mtoImpVenta * Number(quotationAdvance || 0)) / 100
        : 0;
    const condicionPagoKaiser = quotationPaymentType === 'CONTADO' ? 'CONTADO'
        : quotationPaymentType === 'CREDITO_30' ? 'CRÉDITO 30 DÍAS'
        : quotationPaymentType === 'CREDITO_60' ? 'CRÉDITO 60 DÍAS'
        : quotationPaymentType === 'CREDITO_90' ? 'CRÉDITO 90 DÍAS'
        : quotationPaymentType === 'ADELANTO' ? `ADELANTO ${quotationAdvance}%`
        : 'CONTADO';
    const cuentasRawKaiser = (Array.isArray(emp?.cuentasBancarias) ? emp.cuentasBancarias : [])
        .filter((c: any) => c.mostrarEnCotizacion !== false);
    const mapCuentaKaiser = (c: any) => ({ banco: (c.banco || '').toUpperCase(), numeroCuenta: c.numeroCuenta || '', cci: c.cci || '' });
    const cuentasDolaresKaiser = cuentasRawKaiser.filter((c: any) => c.moneda === 'USD').map(mapCuentaKaiser);
    const cuentasSolesKaiser = cuentasRawKaiser.filter((c: any) => c.moneda !== 'USD').map(mapCuentaKaiser);
    const horarioKaiser = textosKaiser.horario || emp.horarioAtencion
        || 'HORARIO DE ATENCIÓN – PLANTA COMAS (CHACRACERRO):\nLUNES A VIERNES: 9:00 A.M. – 12:00 P.M. / 2:00 P.M. – 5:00 P.M.\nSÁBADOS: 9:00 A.M. – 11:00 A.M.';
    const avisoObsKaiser = textosKaiser.avisoObservaciones || 'LAS OBSERVACIONES DEL PRODUCTO SE RECIBIRÁN HASTA 7 DÍAS CALENDARIO; LUEGO SE CONSIDERARÁ CONFORME.';
    const condicionNotaKaiser = textosKaiser.condicionNota || 'PRECIO SUJETO A VARIACIÓN, POR LAS CONSTANTES ALZAS DE LA MATERIA PRIMA A NIVEL MUNDIAL. ANTES DE REALIZAR EL DEPÓSITO, CONSULTE TIPO DE CAMBIO DEL DÍA.';
    const autorizadoKaiser = {
        nombre: textosKaiser.autorizadoNombre || 'CECILIA KAISER POLO',
        cargo: textosKaiser.autorizadoCargo || 'Gerente Comercial',
        telefono: textosKaiser.autorizadoTelefono || '989007725',
        email: textosKaiser.autorizadoEmail || 'ckp@kaisercorp.com.pe',
    };
    const emitidoKaiser = {
        nombre: vendedorNombre,
        telefono: formValues?.usuario?.celular || empresaNumero || '',
        email: formValues?.usuario?.email || company?.email || '',
    };
    const barStyle: React.CSSProperties = { background: brandColor, color: '#fff' };
    const tdBase: React.CSSProperties = { borderLeft: `1px solid ${borderColor}`, borderRight: `1px solid ${borderColor}`, padding: '2px 4px', verticalAlign: 'top' };

    // ── Comprobante fiscal (BOLETA/FACTURA/NC/ND) — layout representación SUNAT ──
    const fiscalEsUSD = String(formValues?.tipoMoneda || 'PEN').toUpperCase() === 'USD';
    const fiscalSimbolo = fiscalEsUSD ? 'US$' : 'S/';
    const fiscalMonedaNombre = fiscalEsUSD ? 'DOLARES AMERICANOS' : 'SOLES';
    const tipoDocFiscalLabel = ({ '01': 'FACTURA', '03': 'BOLETA', '07': 'NOTA DE CRÉDITO', '08': 'NOTA DE DÉBITO' } as any)[String(formValues?.tipoDoc || '')] || String(receipt || 'COMPROBANTE').toUpperCase().replace(/ ELECTRÓNICA$/, '');
    const cuentasFiscal = cuentasRawKaiser.map((c: any) => ({
        banco: (c.banco || '').toUpperCase(),
        moneda: c.moneda === 'USD' ? 'Dólares ($)' : 'Soles (S/)',
        numeroCuenta: c.numeroCuenta || '',
        cci: c.cci || '',
    }));
    const fechaEmisionFiscal = moment(formValues?.fechaEmision || new Date());
    const fechaVencFiscal = formValues?.fechaVencimientoCredito
        ? moment(formValues.fechaVencimientoCredito).format('YYYY-MM-DD')
        : fechaEmisionFiscal.format('YYYY-MM-DD');
    const numCuotasFiscal = Array.isArray(formValues?.cuotas) && formValues.cuotas.length > 0 ? formValues.cuotas.length : 1;
    const isc = 0;
    const fiscalBox: React.CSSProperties = { border: `1px solid #111` };

    const isScreenHidden = mode === 'off';

    return (
        <div
            id="print-root"
            aria-hidden={isScreenHidden}
            className={isScreenHidden ? 'pointer-events-none opacity-0 fixed -left-[200vw] top-0 z-[-1]' : 'bg-[#fff]'}
        >
            <div
                ref={componentRef || localComponentRef}
                className={`bg-[#fff] py-0 text-sm ${size === 'TICKET' ? 'px-4 pt-3 pb-2' : 'px-5 pt-5 pb-10'}`}
                style={{
                    width: size === 'TICKET' ? '80mm' : (size === 'A5' ? '148mm' : '210mm'),
                    margin: '0 auto',
                    minHeight: size === 'TICKET' ? '330mm' : (size === 'A5' ? '210mm' : '297mm'),
                    fontFamily:
                        size === 'TICKET'
                            ? 'VT323, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                            : 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    lineHeight: size === 'TICKET' ? 1.05 : undefined,
                    letterSpacing: size === 'TICKET' ? '0.1px' : undefined
                }}
            >
                {size === 'TICKET' ? (
                    <div className="">
                        {fc('logo').visible && logoDataUrl && <img src={logoDataUrl} alt="logo" className="mx-auto mb-1 object-contain" style={{ maxWidth: company?.empresa?.ticketLogoSize ?? 96, maxHeight: company?.empresa?.ticketLogoSize ?? 96, width: '100%', height: 'auto', objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} />}
                        {fc('nombreComercial').visible && <p className="text-center text-[16px] font-bold">{company?.empresa?.nombreComercial?.toUpperCase()}</p>}
                        <p className={`text-center ${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}>
                            {fc('razonSocial').visible && <>RAZON SOCIAL: {company?.empresa?.razonSocial?.toUpperCase()}<br /></>}
                            {fc('direccion').visible && <>DIRECCION: {company?.empresa?.direccion?.toUpperCase()}<br /></>}
                            {fc('rubro').visible && company?.empresa?.rubro?.nombre && <>RUBRO: {company?.empresa?.rubro?.nombre?.toUpperCase()}<br /></>}
                            {fc('celular').visible && empresaNumero && <>CELULAR: {empresaNumero}<br /></>}
                            {fc('email').visible && company?.email && <>EMAIL: {company?.email}<br /></>}
                            {fc('web').visible && (company?.empresa as any)?.paginaWeb && <>WEB: {(company?.empresa as any).paginaWeb}<br /></>}
                            <span className="">RUC: {company?.empresa?.ruc}</span>
                        </p>
                        <hr className="my-1 border-dashed border-[#222]" />
                        <h2 className={`text-center font-bold ${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}>{receipt === "COTIZACIÓN" ? "COTIZACIÓN DE VENTA ELECTRÓNICA" : /VENTA$/i.test(String(receipt || '')) ? `${receipt} ELECTRÓNICA` : `${receipt} DE VENTA ELECTRÓNICA`}<br />{formValues?.serie}-{formValues?.correlativo}</h2>
                        <hr className="my-1 border-dashed border-[#222]" />
                        {fc('datosCliente').visible && (
                        <div>
                            <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}><span className="">FECHA/HORA:</span> {moment(formValues?.fechaEmision).format('DD/MM/YYYY HH:mm:ss')}</p>
                            <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}><span className="">RAZON SOCIAL:</span> {selectedClient?.nombre?.toUpperCase() || ''}</p>
                            <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}><span className="">NÚMERO DE DOCUMENTO:</span> {selectedClient?.nroDoc || ''}</p>
                            <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}><span className="">DIRECCION:</span> {selectedClient?.direccion?.toUpperCase() || ''}</p>
                        </div>
                        )}
                        {/* Información de Detracción - ANTES de productos */}
                        {fc('detraccion').visible && formValues?.tipoDetraccion && (
                            <>
                                <hr className="my-1 border-dashed border-[#222]" />
                                <div className="">
                                    <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} font-bold mb-1`}>OPERACIÓN SUJETA A DETRACCIÓN</p>
                                    <div className="space-y-0.5">
                                        <div className="flex justify-between">
                                            <span className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} font-bold`}>Tipo Detracción:</span>
                                            <span className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}>{formValues.tipoDetraccion?.codigo} - {formValues.tipoDetraccion?.descripcion} ({formValues.tipoDetraccion?.porcentaje}%)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} font-bold`}>Monto Detracción:</span>
                                            <span className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}>S/ {Number(formValues.montoDetraccion || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} font-bold`}>Cuenta BN:</span>
                                            <span className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}>{formValues.cuentaBancoNacion || '-'}</span>
                                        </div>
                                        {formValues.medioPagoDetraccion && (
                                            <div className="flex justify-between">
                                                <span className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} font-bold`}>Medio de Pago:</span>
                                                <span className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}>{formValues.medioPagoDetraccion?.codigo} - {formValues.medioPagoDetraccion?.descripcion}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                        <hr className="my-1 border-dashed border-[#222]" />
                        <div className="">
                            <div className="flex text-center">
                                <span className={`basis-[16%] shrink-0 text-center ${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}>CANT.</span>
                                <span className={`basis-[44%] shrink-0 text-left ${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}>DESCRIPCION</span>
                                <span className={`basis-[20%] shrink-0 text-center ${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}>P.U.</span>
                                <span className={`basis-[20%] shrink-0 text-center ${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}>IMP.</span>
                            </div>
                            {productsInvoice?.map((item: any, i: any) => (
                                <div key={i} className="flex">
                                    <span className={`basis-[16%] shrink-0 ${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} text-center`}>{item?.cantidad || 0}</span>
                                    <span className={`basis-[44%] shrink-0 ${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} text-left`}>
                                        {item?.descripcion?.toUpperCase() || ''}
                                        {item?.lotes && item.lotes.length > 0 && (
                                            <div className="flex flex-col mt-0.5">
                                                {item.lotes.map((l: any, idx: number) => (
                                                    <span key={idx} className={`${size === 'TICKET' ? 'text-[12px]' : 'text-[9px]'}`}>Lote: {l.lote} Venc: {moment(l.fechaVencimiento).format('DD/MM/YYYY')}</span>
                                                ))}
                                            </div>
                                        )}
                                        {/* Lote directo desde DetalleComprobante (farmacia POS) */}
                                        {!item?.lotes?.length && item?.lote && (
                                            <div className={`${size === 'TICKET' ? 'text-[12px]' : 'text-[9px]'} mt-0.5`}>
                                                Lote: {item.lote.lote}{item.lote.fechaVencimiento ? ` Venc: ${moment(item.lote.fechaVencimiento).format('DD/MM/YYYY')}` : ''}
                                            </div>
                                        )}
                                        {/* Datos de receta médica */}
                                        {item?.numeroReceta && (
                                            <div className={`${size === 'TICKET' ? 'text-[12px]' : 'text-[9px]'} mt-0.5 text-gray-600`}>
                                                Receta: {item.numeroReceta}
                                                {item.medicoNombre ? ` — Dr. ${item.medicoNombre}` : ''}
                                                {item.dniPaciente ? ` — Pac. DNI: ${item.dniPaciente}` : ''}
                                            </div>
                                        )}
                                    </span>
                                    <span className={`basis-[20%] shrink-0 ${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} text-center`}>{Number(
                                        item?.precioUnitario != null
                                            ? item.precioUnitario
                                            : Number(item?.mtoPrecioUnitario || item?.producto?.precioUnitario || 0) + (Number(item?.mtoDescuento || 0) / Number(item?.cantidad || 1))
                                    ).toFixed(2)}</span>
                                    <span className={`basis-[20%] shrink-0 ${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} text-center`}>{Number(
                                        (item?.precioUnitario != null
                                            ? Number(item.precioUnitario)
                                            : Number(item?.mtoPrecioUnitario || item?.producto?.precioUnitario || 0) + (Number(item?.mtoDescuento || 0) / Number(item?.cantidad || 1))
                                        ) * Number(item?.cantidad || 0)
                                    ).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <hr className="my-1 border-dashed border-[#222]" />
                        {fc('sonTexto').visible && <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} `}>SON: {totalInWords || ''}</p>}
                        <hr className="my-1 border-dashed border-[#222]" />
                        {fc('subTotal').visible && totalDescuentos > 0 && (
                            <label className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between`}>
                                <div className="">SUBTOTAL:</div>
                                <div>{round2(totalPrices).toFixed(2)}</div>
                            </label>
                        )}
                        {fc('descuentos').visible && totalDescuentos > 0 && (
                            <label className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between`}>
                                <div className="">DESCUENTO:</div>
                                <div>- {round2(totalDescuentos).toFixed(2)}</div>
                            </label>
                        )}
                        {fc('opGravadas').visible && <label className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between`}><div className="">TOTAL GRAVADAS:</div> <div>{round2(mtoOperGravadas).toFixed(2)}</div></label>}
                        {fc('igv').visible && <label className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between`}><div className="">I.G.V 18.00 %:</div> <div>{round2(mtoIgv).toFixed(2)}</div></label>}
                        {fc('montoTotal').visible && <label className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between`}><div className="">IMPORTE TOTAL:</div> <div>{round2(mtoImpVenta).toFixed(2)}</div></label>}
                        {
                            shouldShowRetention && (
                                <>
                                    <label className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between`}>
                                        <div className="">RETENCIÓN (3%):</div>
                                        <div>{displayRetencionMonto.toFixed(2)}</div>
                                    </label>
                                    <label className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between font-bold`}>
                                        <div className="">IMPORTE NETO:</div>
                                        <div>{Number(mtoImpVenta - displayRetencionMonto).toFixed(2)}</div>
                                    </label>
                                </>
                            )
                        }
                        <hr className="my-1 border-dashed border-[#222]" />
                        <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between gap-3`}>
                            <span>CONDICIÓN DE PAGO:</span>
                            <span className="text-right">{paymentConditionLabel}</span>
                        </p>
                        {hasCreditInstallments && (
                            <div className="mt-1 mb-1">
                                <p className={`${size === 'TICKET' ? 'text-[15px]' : 'text-xs'}`}>CUOTAS:</p>
                                {cuotasCredito.map((cuota: any, idx: number) => (
                                    <div key={idx} className="mb-0.5">
                                        <p className={`${size === 'TICKET' ? 'text-[15px]' : 'text-xs'} uppercase`}>
                                            CUOTA {idx + 1}
                                        </p>
                                        <p className={`${size === 'TICKET' ? 'text-[15px]' : 'text-xs'} flex justify-between gap-3`}>
                                            <span>{moment(cuota.fechaVencimiento).format('DD/MM/YYYY')}</span>
                                            <span>S/ {Number(cuota.monto).toFixed(2)}</span>
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {isMixedPayment && Array.isArray(formValues?.splitPayments) && formValues.splitPayments.length > 0 ? (
                            <div>
                                <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} font-bold`}>MEDIOS DE PAGO:</p>
                                {formValues.splitPayments.map((sp: { method: string; amount: number }, idx: number) => {
                                    const detail = splitPaymentDetails[idx] || sp;
                                    return (
                                        <div key={idx} className="mb-0.5">
                                            <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between`}>
                                                <span>{sp.method?.toUpperCase()}:</span>
                                                <span>S/ {Number(sp.amount).toFixed(2)}</span>
                                            </p>
                                            {formatPaymentExtra(detail).map((line) => (
                                                <p key={line} className={`${size === 'TICKET' ? 'text-[14px]' : 'text-[10px]'} text-left`}>{line}</p>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <>
                                <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between gap-3`}>
                                    <span>MEDIO DE PAGO:</span>
                                    <span className="text-right">{paymentMethodLabel}</span>
                                </p>
                                {formatPaymentExtra(singlePaymentDetail).map((line) => (
                                    <p key={line} className={`${size === 'TICKET' ? 'text-[14px]' : 'text-[10px]'}`}>{line}</p>
                                ))}
                            </>
                        )}
                        <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between`}>
                            <span>VUELTO:</span>
                            <span>S/ {displayVuelto.toFixed(2)}</span>
                        </p>
                        <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between`}>
                            <span>PAGADO:</span>
                            <span>S/ {displayPagado.toFixed(2)}</span>
                        </p>
                        <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'} flex justify-between`}>
                            <span>VENDEDOR:</span>
                            <span className="text-right">{vendedorNombre}</span>
                        </p>
                        <hr className="my-1 border-dashed border-[#222]" />
                        {fc('observaciones').visible && <p className={`${size === 'TICKET' ? 'text-[16px]' : 'text-xs'}`}><span className="">OBSERVACIONES : </span>{observation?.toUpperCase() || ''}</p>}
                        <div className="uppercase">
                            {(() => {
                                const reseller = company?.empresa?.reseller;
                                const brandName = reseller?.nombre || BRAND.name;
                                const developerName = reseller?.whiteLabelNombre || brandName;
                                const brandWebsite = reseller?.whiteLabelWebsite || BRAND.website;
                                return (
                                    <>
                                        <p className={`${size === 'TICKET' ? 'text-[15px]' : 'text-xs'} text-center mt-4`}>
                                            Sistema punto de venta - {brandName}.</p>
                                        <p className={`${size === 'TICKET' ? 'text-[15px]' : 'text-xs'} text-center`}>Desarrollado por {developerName}.</p>
                                        <p className={`${size === 'TICKET' ? 'text-[15px]' : 'text-xs'} text-center`}>{brandWebsite}.</p>
                                    </>
                                );
                            })()}
                        </div>
                        <hr className="my-1 border-dashed border-[#222]" />
                        {fc('gracias').visible && <p className={`${size === 'TICKET' ? 'text-[15px]' : 'text-xs'} text-center`}>GRACIAS POR SU COMPRA, VUELVA PRONTO !</p>}
                        {fc('gracias').visible && <hr className="my-1 border-dashed border-[#222]" />}
                    </div>
                ) : (
                    <div className="w-full text-xs font-sans">
                        {(receipt === "COTIZACIÓN" || receipt === "NOTA DE VENTA") ? (
                            <div className="w-full" style={{ fontFamily: '"Courier New", Courier, monospace', color: '#111', fontSize: '10.5px', lineHeight: 1.35 }}>
                                {/* HEADER: logo + empresa + badge COTIZACION */}
                                <div className="flex items-start mb-2" style={{ gap: 12 }}>
                                    {fc('logo').visible && logoKaiser && (
                                        <img src={logoKaiser} alt="logo" style={{ width: fc('logo').size, height: 'auto', maxHeight: fc('logo').size, objectFit: 'contain' }} />
                                    )}
                                    <div className="flex-1">
                                        {fc('nombreComercial').visible && (
                                            <div style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: px('nombreComercial'), lineHeight: 1.1 }}>{(emp?.nombreComercial || emp?.razonSocial)?.toUpperCase()}</div>
                                        )}
                                        <div style={{ fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{emp?.ruc}</div>
                                        {fc('direccion').visible && <div style={{ fontSize: 10 }}>{emp?.direccion?.toUpperCase()}</div>}
                                        {fc('celular').visible && empresaNumero && <div style={{ fontSize: 10 }}>TELEFONO: {empresaNumero}</div>}
                                        {fc('web').visible && emp?.paginaWeb && <div style={{ fontSize: 10 }}>WEB: {emp.paginaWeb}</div>}
                                    </div>
                                    <div style={{ width: 210 }}>
                                        <div style={{ ...barStyle, fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: 1, textAlign: 'center', padding: '5px 0', marginBottom: 8 }}>
                                            {receipt === "COTIZACIÓN" ? "COTIZACION" : "NOTA DE VENTA"}
                                        </div>
                                        <table style={{ width: '100%', fontSize: 10 }}><tbody>
                                            <tr><td style={{ fontWeight: 'bold', whiteSpace: 'nowrap', paddingRight: 8 }}>{receipt === "COTIZACIÓN" ? "COTIZACION N°" : "DOCUMENTO N°"}</td><td>{formValues?.serie}-{formValues?.correlativo}</td></tr>
                                            <tr><td style={{ fontWeight: 'bold', paddingRight: 8 }}>FECHA</td><td>{moment(formValues?.fechaEmision).format('DD/MM/YYYY')}</td></tr>
                                        </tbody></table>
                                    </div>
                                </div>

                                {/* DATOS DEL CLIENTE / DATOS DE CONTACTO */}
                                <div className="flex" style={{ ...barStyle, fontSize: 10, fontWeight: 'bold', padding: '3px 8px' }}>
                                    <div className="flex-1">DATOS DEL CLIENTE</div>
                                    <div className="flex-1">DATOS DE CONTACTO:</div>
                                </div>
                                <div className="flex" style={{ border: `1px solid ${borderColor}`, borderTop: 'none' }}>
                                    <div className="flex-1" style={{ padding: '6px 8px' }}>
                                        <table style={{ width: '100%' }}><tbody>
                                            <tr><td style={{ fontWeight: 'bold', width: 92, verticalAlign: 'top' }}>Razón Social:</td><td>{selectedClient?.nombre?.toUpperCase() || ''}</td></tr>
                                            <tr><td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>RUC:</td><td>{selectedClient?.nroDoc || ''}</td></tr>
                                            <tr><td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>Dirección:</td><td>{selectedClient?.direccion?.toUpperCase() || ''}</td></tr>
                                        </tbody></table>
                                    </div>
                                    <div className="flex-1" style={{ padding: '6px 8px', borderLeft: '1px solid #c7d2e0' }}>
                                        <table style={{ width: '100%' }}><tbody>
                                            <tr><td style={{ fontWeight: 'bold', width: 118, verticalAlign: 'top' }}>Nombres y Apellidos:</td><td>{selectedClient?.contactoNombre?.toUpperCase() || ''}</td></tr>
                                            <tr><td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>Email:</td><td style={{ wordBreak: 'break-all' }}>{selectedClient?.contactoEmail || ''}</td></tr>
                                            <tr><td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>Telefono:</td><td>{selectedClient?.contactoTelefono || ''}</td></tr>
                                            <tr><td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>Dirección:</td><td>{selectedClient?.contactoDireccion?.toUpperCase() || ''}</td></tr>
                                        </tbody></table>
                                    </div>
                                </div>

                                {/* CONDICIONES DE VENTA */}
                                <div className="flex" style={{ ...barStyle, fontSize: 10, fontWeight: 'bold', padding: '3px 8px', marginTop: 8 }}>
                                    <div className="flex-1">CONDICIONES DE VENTA:</div>
                                    <div className="flex-1"></div>
                                </div>
                                <div className="flex" style={{ border: `1px solid ${borderColor}`, borderTop: 'none' }}>
                                    <div className="flex-1" style={{ padding: '6px 8px' }}>
                                        <table style={{ width: '100%' }}><tbody>
                                            <tr><td style={{ fontWeight: 'bold', width: 150, verticalAlign: 'top' }}>FORMA DE PAGO:</td><td>{condicionPagoKaiser}</td></tr>
                                            <tr><td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>MONEDA:</td><td>{monedaTextoKaiser}</td></tr>
                                            <tr><td style={{ fontWeight: 'bold', verticalAlign: 'top' }}>VALIDEZ DE LA OFERTA:</td><td>{quotationValidity} DÍAS ÚTILES</td></tr>
                                        </tbody></table>
                                    </div>
                                    <div className="flex-1" style={{ padding: '6px 8px', borderLeft: '1px solid #c7d2e0', textAlign: 'center', fontSize: 8.6, lineHeight: 1.35, whiteSpace: 'pre-line' }}>
                                        <div>{horarioKaiser}</div>
                                        {avisoObsKaiser && <div style={{ marginTop: 4 }}>{avisoObsKaiser}</div>}
                                    </div>
                                </div>
                                <div style={{ fontSize: 9, margin: '4px 0 8px', lineHeight: 1.3 }}>{condicionNotaKaiser}</div>

                                {/* ARTICULO */}
                                <div style={{ ...barStyle, fontSize: 10, fontWeight: 'bold', padding: '3px 8px', textAlign: 'center' }}>ARTICULO</div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: px('productos') }}>
                                    <thead>
                                        <tr>
                                            {['Nro', 'CODIGO', 'DESCRIPCION', 'CANTIDAD', 'UNID.', 'VALOR UNIT', 'VALOR VENTA'].map((h, hi) => (
                                                <th key={hi} style={{ border: `1px solid ${borderColor}`, borderTop: 'none', padding: '3px 4px', fontWeight: 'bold', textAlign: 'center' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productsInvoice?.map((item: any, i: number) => {
                                            const cant = Number(item?.cantidad || 0);
                                            const netUnit = item?.mtoValorUnitario != null
                                                ? Number(item.mtoValorUnitario)
                                                : Number(item?.mtoPrecioUnitario || item?.precioUnitario || 0) / 1.18;
                                            const netLine = item?.mtoValorVenta != null
                                                ? Number(item.mtoValorVenta)
                                                : netUnit * cant;
                                            return (
                                                <tr key={i}>
                                                    <td style={{ ...tdBase, textAlign: 'center', width: '4%' }}>{String(i + 1).padStart(2, '0')}</td>
                                                    <td style={{ ...tdBase, width: '15%' }}>{(item?.producto?.codigo || item?.codigo || '').toUpperCase()}</td>
                                                    <td style={{ ...tdBase, width: '41%' }}>
                                                        {item?.descripcion?.toUpperCase()}
                                                        {includeProductImages && item?.imagenUrl && (<><br /><img src={item.imagenUrl} alt="" style={{ width: 30, height: 30, objectFit: 'cover', marginTop: 2 }} /></>)}
                                                    </td>
                                                    <td style={{ ...tdBase, textAlign: 'right', width: '10%' }}>{fmtMoney(cant)}</td>
                                                    <td style={{ ...tdBase, textAlign: 'center', width: '8%' }}>{item?.unidad?.toUpperCase() || item?.unidadMedida?.toUpperCase() || 'NIU'}</td>
                                                    <td style={{ ...tdBase, textAlign: 'right', width: '11%' }}>{fmtMoney3(netUnit)}</td>
                                                    <td style={{ ...tdBase, textAlign: 'right', width: '11%' }}>{fmtMoney(netLine)}</td>
                                                </tr>
                                            );
                                        })}
                                        {fc('observaciones').visible && observation && (
                                            <tr>
                                                <td style={tdBase}></td>
                                                <td style={tdBase}></td>
                                                <td style={tdBase}>
                                                    <div style={{ marginTop: 8, whiteSpace: 'pre-line' }}><span style={{ fontWeight: 'bold' }}>NOTA IMPORTANTE:</span>{'\n'}{observation?.toUpperCase()}</div>
                                                </td>
                                                <td style={tdBase}></td>
                                                <td style={tdBase}></td>
                                                <td style={tdBase}></td>
                                                <td style={tdBase}></td>
                                            </tr>
                                        )}
                                        <tr>
                                            {Array.from({ length: 7 }).map((_, ci) => (
                                                <td key={ci} style={{ ...tdBase, height: 220, borderBottom: `1px solid ${borderColor}` }}></td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>

                                {/* DATOS BANCARIOS + TOTALES */}
                                <div className="flex" style={{ ...barStyle, fontSize: 10, fontWeight: 'bold', padding: '3px 8px', marginTop: 8 }}>
                                    <div className="flex-1">DATOS BANCARIOS</div>
                                    <div className="flex-1"></div>
                                </div>
                                <div className="flex" style={{ border: `1px solid ${borderColor}`, borderTop: 'none' }}>
                                    <div style={{ flex: 1.55, padding: '6px 8px', borderRight: '1px solid #c7d2e0' }}>
                                        <div style={{ fontWeight: 'bold' }}>NRO CTA. CTE.:</div>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 3 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold' }}>DÓLARES:</div>
                                                {cuentasDolaresKaiser.map((c: any, ci: number) => (
                                                    <div key={ci} style={{ paddingLeft: 2 }}>{c.banco} {c.numeroCuenta}</div>
                                                ))}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold' }}>SOLES:</div>
                                                {cuentasSolesKaiser.map((c: any, ci: number) => (
                                                    <div key={ci} style={{ paddingLeft: 2 }}>{c.banco} {c.numeroCuenta}</div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, padding: '6px 8px' }}>
                                        <div className="flex justify-between" style={{ padding: '1px 0' }}><span style={{ fontWeight: 'bold' }}>VALOR VENTA:</span><span>{fmtMoney(mtoOperGravadas)}</span></div>
                                        <div className="flex justify-between" style={{ padding: '1px 0' }}><span style={{ fontWeight: 'bold' }}>ADELANTOS:</span><span>{fmtMoney(advanceAmountKaiser)}</span></div>
                                        <div className="flex justify-between" style={{ padding: '1px 0' }}><span style={{ fontWeight: 'bold' }}>IGV (18%):</span><span>{fmtMoney(mtoIgv)}</span></div>
                                        <div className="flex" style={{ marginTop: 4, alignItems: 'stretch' }}>
                                            <div style={{ ...barStyle, fontFamily: 'Arial, sans-serif', fontWeight: 700, padding: '4px 10px', fontSize: 12 }}>TOTAL</div>
                                            <div style={{ padding: '4px 6px', fontWeight: 'bold' }}>{monedaCodigoKaiser}</div>
                                            <div style={{ flex: 1, textAlign: 'right', fontFamily: 'Arial, sans-serif', fontWeight: 700, fontSize: 13, padding: '4px' }}>{fmtMoney(mtoImpVenta)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* FIRMAS */}
                                <div className="flex" style={{ border: `1px solid ${borderColor}`, borderTop: 'none' }}>
                                    <div className="flex-1" style={{ padding: '6px 8px' }}>
                                        <div style={{ fontWeight: 'bold' }}>Autorizado por:</div>
                                        <div style={{ fontWeight: 'bold' }}>{autorizadoKaiser.nombre}</div>
                                        {autorizadoKaiser.cargo && <div>{autorizadoKaiser.cargo}</div>}
                                        {autorizadoKaiser.telefono && <div>Telf.: {autorizadoKaiser.telefono}</div>}
                                        {autorizadoKaiser.email && <div>{autorizadoKaiser.email}</div>}
                                    </div>
                                    <div className="flex-1" style={{ padding: '6px 8px', borderLeft: '1px solid #c7d2e0' }}>
                                        <div style={{ fontWeight: 'bold' }}>Emitido por:</div>
                                        <div style={{ fontWeight: 'bold' }}>{emitidoKaiser.nombre}</div>
                                        {emitidoKaiser.telefono && <div>{emitidoKaiser.telefono}</div>}
                                        {emitidoKaiser.email && <div>{emitidoKaiser.email}</div>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Comprobante fiscal (BOLETA/FACTURA/NC/ND) — representación SUNAT */
                            <div className="w-full" style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#111', fontSize: '9.5px' }}>
                                {/* HEADER */}
                                <div className="flex items-center" style={{ gap: 14, marginBottom: 8 }}>
                                    {logoKaiser && <img src={logoKaiser} alt="logo" style={{ width: (emp?.ticketLogoSize ?? 120), height: 'auto', maxHeight: 90, objectFit: 'contain' }} />}
                                    <div style={{ flex: 1, textAlign: 'center', lineHeight: 1.35 }}>
                                        <div style={{ fontWeight: 700, fontSize: 12 }}>{(emp?.nombreComercial || emp?.razonSocial)?.toUpperCase()}</div>
                                        <div style={{ fontSize: 9 }}>{emp?.direccion?.toUpperCase()}</div>
                                        {empresaNumero && <div style={{ fontSize: 9 }}>Teléfono: {empresaNumero}</div>}
                                        {(company?.email || emp?.email) && <div style={{ fontSize: 9 }}>Correo: {company?.email || emp?.email}</div>}
                                        {emp?.paginaWeb && <div style={{ fontSize: 9 }}>WEB: {emp.paginaWeb}</div>}
                                    </div>
                                    <div style={{ flexShrink: 0, width: 200, border: '1px solid #111', borderRadius: 6, textAlign: 'center', padding: '10px 8px' }}>
                                        <div style={{ fontWeight: 700, fontSize: 12 }}>RUC N°{emp?.ruc}</div>
                                        <div style={{ fontWeight: 700, fontSize: 13, margin: '8px 0' }}>{tipoDocFiscalLabel} ELECTRÓNICA</div>
                                        <div style={{ fontWeight: 700, fontSize: 12, borderTop: '1px solid #111', paddingTop: 6 }}>N° {formValues?.serie}-{formValues?.correlativo}</div>
                                    </div>
                                </div>

                                {/* CLIENTE */}
                                <div style={{ ...fiscalBox, padding: '6px 8px', marginBottom: 6 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                                        <tr><td style={{ fontWeight: 700, width: 92, verticalAlign: 'top', padding: '1.5px 4px' }}>Señor(es)</td><td colSpan={5} style={{ padding: '1.5px 4px' }}>{selectedClient?.nombre?.toUpperCase() || '-'}</td></tr>
                                        <tr><td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>Dirección</td><td colSpan={5} style={{ padding: '1.5px 4px' }}>{selectedClient?.direccion?.toUpperCase() || '-'}</td></tr>
                                        <tr>
                                            <td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>{selectedClient?.tipoDocumento?.codigo === '6' ? 'RUC' : 'DNI'}</td><td style={{ padding: '1.5px 4px' }}>{selectedClient?.nroDoc || '-'}</td>
                                            <td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>Cuotas</td><td style={{ padding: '1.5px 4px' }}>{numCuotasFiscal}</td>
                                            <td></td><td></td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>F. Emisión</td><td style={{ padding: '1.5px 4px' }}>{fechaEmisionFiscal.format('YYYY-MM-DD HH:mm:ss')}</td>
                                            <td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>F. Vencimiento</td><td style={{ padding: '1.5px 4px' }}>{fechaVencFiscal}</td>
                                            <td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>Moneda</td><td style={{ padding: '1.5px 4px' }}>{fiscalMonedaNombre}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>Condición venta</td><td style={{ padding: '1.5px 4px' }}>{paymentConditionLabel}</td>
                                            <td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>Orden Compra</td><td style={{ padding: '1.5px 4px' }}></td>
                                            <td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>Vendedor</td><td style={{ padding: '1.5px 4px' }}>{vendedorNombre}</td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>G. Remisión</td><td style={{ padding: '1.5px 4px' }}>-</td>
                                            <td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>Numero Pedido</td><td style={{ padding: '1.5px 4px' }}>-</td>
                                            <td style={{ fontWeight: 700, verticalAlign: 'top', padding: '1.5px 4px' }}>Referencia</td><td style={{ padding: '1.5px 4px' }}></td>
                                        </tr>
                                    </tbody></table>
                                </div>

                                {/* PRODUCTOS */}
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            {[['COD','15%','left'],['CANT','9%','right'],['UM','8%','center'],['DESCRIPCIÓN','44%','left'],['V. Unit','12%','right'],['VENTA TOTAL','12%','right']].map(([h,w,a]:any,hi:number)=>(
                                                <th key={hi} style={{ width: w, textAlign: a, background: '#6b7280', color: '#fff', fontSize: 9.5, fontWeight: 700, padding: '4px 4px', border: '1px solid #6b7280' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productsInvoice?.map((item: any, i: number) => {
                                            const cant = Number(item?.cantidad || 0);
                                            const grossUnit = Number(item?.mtoPrecioUnitario ?? item?.precioUnitario ?? item?.producto?.precioUnitario ?? 0);
                                            const netUnit = item?.mtoValorUnitario != null ? Number(item.mtoValorUnitario) : grossUnit / 1.18;
                                            const netLine = item?.mtoValorVenta != null ? Number(item.mtoValorVenta) : netUnit * cant;
                                            return (
                                                <tr key={i}>
                                                    <td style={{ width: '15%', padding: '3px 4px', borderLeft: '1px solid #d1d5db', borderRight: '1px solid #d1d5db', borderTop: i===0?'1px solid #d1d5db':undefined, verticalAlign: 'top' }}>{(item?.producto?.codigo || item?.codigo || '').toUpperCase()}</td>
                                                    <td style={{ width: '9%', textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #d1d5db', borderTop: i===0?'1px solid #d1d5db':undefined, verticalAlign: 'top' }}>{formatCantidad(cant)}</td>
                                                    <td style={{ width: '8%', textAlign: 'center', padding: '3px 4px', borderRight: '1px solid #d1d5db', borderTop: i===0?'1px solid #d1d5db':undefined, verticalAlign: 'top' }}>{item?.unidad?.toUpperCase() || item?.unidadMedida?.toUpperCase() || 'NIU'}</td>
                                                    <td style={{ width: '44%', padding: '3px 4px', borderRight: '1px solid #d1d5db', borderTop: i===0?'1px solid #d1d5db':undefined, verticalAlign: 'top' }}>{item?.descripcion?.toUpperCase()}</td>
                                                    <td style={{ width: '12%', textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #d1d5db', borderTop: i===0?'1px solid #d1d5db':undefined, verticalAlign: 'top' }}>{netUnit.toFixed(2)}</td>
                                                    <td style={{ width: '12%', textAlign: 'right', padding: '3px 4px', borderRight: '1px solid #d1d5db', borderTop: i===0?'1px solid #d1d5db':undefined, verticalAlign: 'top' }}>{netLine.toFixed(2)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* BANCOS | TOTALES */}
                                <div style={{ display: 'flex', marginTop: 6, gap: 8, alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1.15 }}>
                                        {cuentasFiscal.length > 0 && (
                                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr>{['Banco','Moneda','Cuenta Bancaria','Código Interbancario (CCI)'].map((h,hi)=>(
                                                        <th key={hi} style={{ background: '#f3f4f6', border: '1px solid #999', fontSize: 8, fontWeight: 700, padding: '2px 4px', textAlign: 'center' }}>{h}</th>
                                                    ))}</tr>
                                                </thead>
                                                <tbody>
                                                    {cuentasFiscal.map((c: any, ci: number) => (
                                                        <tr key={ci}>
                                                            <td style={{ border: '1px solid #ccc', fontSize: 8, padding: '2px 4px' }}>{c.banco}</td>
                                                            <td style={{ border: '1px solid #ccc', fontSize: 8, padding: '2px 4px' }}>{c.moneda}</td>
                                                            <td style={{ border: '1px solid #ccc', fontSize: 8, padding: '2px 4px' }}>{c.numeroCuenta}</td>
                                                            <td style={{ border: '1px solid #ccc', fontSize: 8, padding: '2px 4px' }}>{c.cci}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
                                            {[
                                                ['SUBTOTAL', round2(mtoOperGravadas)],
                                                ['DESCUENTO', round2(totalDescuentos)],
                                                ['OP. GRAVADAS', round2(mtoOperGravadas)],
                                                ['OP. GRATUITAS', round2(mtoOperGratuitas)],
                                                ['OP. EXONERADAS', round2(mtoOperExoneradas)],
                                                ['OP. INAFECTA', round2(mtoOperInafectas)],
                                                ['I.S.C', isc],
                                                ['I.G.V. (18)%', round2(mtoIgv)],
                                            ].map(([lbl, val]: any, ri: number) => (
                                                <tr key={ri}>
                                                    <td style={{ fontWeight: 700, fontSize: 9.5, padding: '1px 4px' }}>{lbl}</td>
                                                    <td style={{ textAlign: 'right', width: 34, color: '#333', fontSize: 9.5, padding: '1px 4px' }}>{fiscalSimbolo}</td>
                                                    <td style={{ textAlign: 'right', fontSize: 9.5, padding: '1px 4px' }}>{Number(val).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody></table>
                                    </div>
                                </div>

                                {/* FIRMA + IMPORTE TOTAL */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #111', borderBottom: '1px solid #111', marginTop: 6, padding: '5px 4px' }}>
                                    <div style={{ fontSize: 9 }}>{formValues?.hashFirma ? `FIRMA DIGITAL: ${formValues.hashFirma}` : ''}</div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}><span style={{ fontSize: 11 }}>IMPORTE TOTAL</span> {fiscalSimbolo} {round2(mtoImpVenta).toFixed(2)}</div>
                                </div>

                                {/* SON */}
                                <div style={{ fontSize: 9.5, marginTop: 6, textTransform: 'uppercase' }}>SON: {totalInWords || ''} {fiscalMonedaNombre}.</div>

                                {/* OBSERVACIONES + QR */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4, gap: 12 }}>
                                    <div style={{ flex: 1, fontSize: 9.5 }}>
                                        <div style={{ fontWeight: 700 }}>Observaciones</div>
                                        {observation && <div>{observation.toUpperCase()}</div>}
                                    </div>
                                    {qrCodeDataUrl && <div style={{ flexShrink: 0, textAlign: 'center' }}><img src={qrCodeDataUrl} alt="QR" style={{ width: 100, height: 100 }} /></div>}
                                </div>

                                {/* LEGAL */}
                                <div style={{ textAlign: 'center', fontSize: 9, color: '#333', marginTop: 18, borderTop: '1px solid #ccc', paddingTop: 8 }}>
                                    Representación impresa del comprobante electrónico{(() => { const w = company?.empresa?.reseller?.whiteLabelWebsite || BRAND.website; return w ? `, consulte en ${w}` : ''; })()}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
};

export default ComprobantePrintPage;
