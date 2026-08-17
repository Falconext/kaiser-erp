import moment from 'moment';
import React, { useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { BRAND } from '@/lib/branding';
import { elemCfg } from '@/features/admin/cotizaciones/cotizFormatoElementos';

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
    const fc = (key: string) => elemCfg(formatoConfig, key);
    const px = (key: string) => `${fc(key).size}px`;

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
                            /* Standard invoice footer (Existing Logic for non-quotation) */
                            <div className="w-full">
                                <div className="flex justify-between items-start">
                                    {logoDataUrl && <img src={logoDataUrl} alt="logo" className="object-contain object-left" style={{ width: company?.empresa?.ticketLogoSize ?? 150, height: company?.empresa?.ticketLogoSize ?? 150, objectFit: 'contain', objectPosition: 'left' }} />}
                                    <div className="flex-1 ml-4">
                                        <h6 className="text-xl font-bold">{company?.empresa?.nombreComercial.toUpperCase()}</h6>
                                        <p className="text-xs">{company?.empresa?.direccion}<br />{company?.empresa?.rubro?.nombre?.toUpperCase()}<br />RAZON SOCIAL: {company?.empresa?.razonSocial}<br />{empresaNumero && <>CELULAR: {empresaNumero}<br /></>}EMAIL: {company?.email}{(company?.empresa as any)?.paginaWeb && <><br />WEB: {(company?.empresa as any).paginaWeb}</>}</p>
                                    </div>
                                    <div className="border border-black px-4 pt-4 pb-2 text-center ml-4">
                                        <div className="text-xs">RUC: {company?.empresa?.ruc}</div>
                                        <div className="text-lg font-bold">{receipt}</div>
                                        <div className='font-bold text-lg'>ELECTRONICA</div>
                                        <div>{formValues?.serie}-{formValues?.correlativo}</div>
                                    </div>
                                </div>
                                <div className="mt-4 mb-4">
                                    {/* Datos de Cliente + Comprobante en un solo cuadro (mismo estilo que cotización) */}
                                    <div className="flex gap-6 mb-2 border border-black rounded-lg p-3">
                                        <div className="flex-1 text-xs">
                                            <div className="grid grid-cols-[80px_1fr] gap-y-1">
                                                <span className="font-bold">CLIENTE:</span>
                                                <span className="break-words">{selectedClient?.nombre?.toUpperCase() || '-'}</span>

                                                <span className="font-bold">RUC:</span>
                                                <span>{selectedClient?.nroDoc || '-'}</span>

                                                <span className="font-bold">EMAIL:</span>
                                                <span className="break-all">{selectedClient?.email || '-'}</span>

                                                <span className="font-bold">TELF:</span>
                                                <span>{selectedClient?.telefono || '-'}</span>

                                                <span className="font-bold">DIR:</span>
                                                <span className="break-words leading-tight">{selectedClient?.direccion?.toUpperCase() || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 border-l border-gray-300 pl-6 text-xs">
                                            <div className="grid grid-cols-[115px_1fr] gap-y-1">
                                                <span className="font-bold">FECHA:</span>
                                                <span>{moment(formValues?.fechaEmision || new Date()).format('DD/MM/YYYY')}</span>

                                                <span className="font-bold">HORA:</span>
                                                <span>{moment(formValues?.fechaEmision || new Date()).format('h:mm:ss a')}</span>

                                                <span className="font-bold">MONEDA:</span>
                                                <span>SOLES</span>

                                                <span className="font-bold">FORMA PAGO:</span>
                                                <span>{paymentConditionLabel}</span>

                                                {isMixedPayment && Array.isArray(formValues?.splitPayments) && formValues.splitPayments.length > 0 ? (
                                                    <>
                                                        <span className="font-bold">MEDIOS PAGO:</span>
                                                        <span>
                                                            {formValues.splitPayments.map((sp: { method: string; amount: number }, idx: number) => {
                                                                const detail = splitPaymentDetails[idx] || sp;
                                                                return (
                                                                    <span key={idx} className="block">
                                                                        <span className="flex justify-between">
                                                                            <span>{sp.method?.toUpperCase()}:</span>
                                                                            <span>S/ {Number(sp.amount).toFixed(2)}</span>
                                                                        </span>
                                                                        {formatPaymentExtra(detail).map((line) => (
                                                                            <span key={line} className="block text-[10px] text-gray-700">{line}</span>
                                                                        ))}
                                                                    </span>
                                                                );
                                                            })}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="font-bold">MEDIO PAGO:</span>
                                                        <span>
                                                            {paymentMethodLabel} S/ {isCreditPayment ? '0.00' : round2(mtoImpVenta).toFixed(2)}
                                                            {formatPaymentExtra(singlePaymentDetail).map((line) => (
                                                                <span key={line} className="block text-[10px] text-gray-700">{line}</span>
                                                            ))}
                                                        </span>
                                                    </>
                                                )}

                                                <span className="font-bold">VUELTO:</span>
                                                <span>S/ {displayVuelto.toFixed(2)}</span>

                                                <span className="font-bold">PAGADO:</span>
                                                <span>S/ {displayPagado.toFixed(2)}</span>

                                                <span className="font-bold">VENDEDOR:</span>
                                                <span>{vendedorNombre}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {hasCreditInstallments && (
                                        <div className="mt-2 border p-2 border-gray-300 rounded-md">
                                            <div className="text-xs mb-1">CUOTAS:</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {cuotasCredito.map((cuota: any, idx: number) => (
                                                    <div key={idx} className="text-[10px] px-1">
                                                        <div className="uppercase">CUOTA {idx + 1}</div>
                                                        <div className="flex justify-between gap-3">
                                                            <span>{moment(cuota.fechaVencimiento).format('DD/MM/YYYY')}</span>
                                                            <span>S/ {Number(cuota.monto).toFixed(2)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Información de Detracción - ANTES de productos */}
                                {formValues?.tipoDetraccion && (
                                    <div className="p-3 mt-3">
                                        <p className="text-sm font-bold mb-2">OPERACIÓN SUJETA A DETRACCIÓN</p>
                                        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                                            <div className="flex">
                                                <span className="text-xs font-bold w-[130px]">Tipo Detracción:</span>
                                                <span className="text-xs">{formValues.tipoDetraccion?.codigo} - {formValues.tipoDetraccion?.descripcion} ({formValues.tipoDetraccion?.porcentaje}%)</span>
                                            </div>
                                            <div className="flex">
                                                <span className="text-xs font-bold w-[100px]">Cuenta BN:</span>
                                                <span className="text-xs">{formValues.cuentaBancoNacion || '-'}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="text-xs font-bold w-[130px]">Monto Detracción:</span>
                                                <span className="text-xs">S/ {Number(formValues.montoDetraccion || 0).toFixed(2)}</span>
                                            </div>
                                            {formValues.medioPagoDetraccion && (
                                                <div className="flex">
                                                    <span className="text-xs font-bold w-[100px]">Medio de Pago:</span>
                                                    <span className="text-xs">{formValues.medioPagoDetraccion?.codigo} - {formValues.medioPagoDetraccion?.descripcion}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="w-full mb-3">
                                    <div className="flex bg-gray-300 text-black font-bold border border-gray-400 text-xs py-1">
                                        <div className="w-[8%] text-center border-r border-gray-400">N°</div>
                                        <div className="w-[10%] text-center border-r border-gray-400">CANT.</div>
                                        <div className="w-[10%] text-center border-r border-gray-400">UNIDAD</div>
                                        {includeProductImages && <div className="w-[10%] text-center border-r border-gray-400">IMAGEN</div>}
                                        <div className="flex-1 text-center border-r border-gray-400 px-2">DESCRIPCIÓN</div>
                                        <div className="w-[9%] text-center border-r border-gray-400">MONEDA</div>
                                        <div className="w-[10%] text-center border-r border-gray-400">P.UNIT.</div>
                                        <div className="w-[10%] text-center">TOTAL</div>
                                    </div>

                                    {productsInvoice?.map((item: any, i: number) => {
                                        const cant = Number(item?.cantidad || 0);
                                        // Precio final (ya con descuento) para el importe de la línea.
                                        const pUnitFinal = Number(item?.mtoPrecioUnitario || item?.precioUnitario || item?.producto?.precioUnitario || 0);
                                        // Precio de lista para la columna P.UNIT: en reimpresión = final + descuento por unidad.
                                        const pUnit = item?.precioUnitario != null
                                            ? Number(item.precioUnitario)
                                            : pUnitFinal + (Number(item?.mtoDescuento || 0) / (cant || 1));
                                        const totalItem = Number(item?.total || (pUnitFinal * cant));

                                        return (
                                            <div key={i} className="flex border-b border-l border-r border-gray-300" style={{ fontSize: px('productos') }}>
                                                <div className="w-[8%] text-center border-r border-gray-300 py-1">{i + 1}</div>
                                                <div className="w-[10%] text-center border-r border-gray-300 py-1">{formatCantidad(cant)}</div>
                                                <div className="w-[10%] text-center border-r border-gray-300 py-1">{item?.unidad?.toUpperCase() || item?.unidadMedida?.toUpperCase() || 'NIU'}</div>
                                                {includeProductImages && (
                                                    <div className="w-[10%] flex justify-center items-center border-r border-gray-300 py-1">
                                                        {item.imagenUrl ? <img src={item.imagenUrl} className="w-8 h-8 object-cover" alt="" /> : '-'}
                                                    </div>
                                                )}
                                                <div className="flex-1 text-left border-r border-gray-300 px-2 py-1">
                                                    <div>{item?.descripcion?.toUpperCase()}</div>
                                                    {item?.lotes && item.lotes.length > 0 && (
                                                        <div className="flex flex-col mt-0.5">
                                                            {item.lotes.map((l: any, idx: number) => (
                                                                <span key={idx} className="text-[9px] text-gray-500">Lote: {l.lote} | Venc: {moment(l.fechaVencimiento).format('DD/MM/YYYY')}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {/* Lote directo desde DetalleComprobante (farmacia POS) */}
                                                    {!item?.lotes?.length && item?.lote && (
                                                        <div className="text-[9px] text-gray-500 mt-0.5">
                                                            Lote: {item.lote.lote}{item.lote.fechaVencimiento ? ` | Venc: ${moment(item.lote.fechaVencimiento).format('DD/MM/YYYY')}` : ''}
                                                        </div>
                                                    )}
                                                    {/* Datos de receta médica */}
                                                    {item?.numeroReceta && (
                                                        <div className="text-[9px] text-gray-500 mt-0.5">
                                                            Receta: {item.numeroReceta}
                                                            {item.medicoNombre ? ` — Dr. ${item.medicoNombre}` : ''}
                                                            {item.dniPaciente ? ` — Pac. DNI: ${item.dniPaciente}` : ''}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-[9%] text-center border-r border-gray-300 py-1">S/</div>
                                                <div className="w-[10%] text-right border-r border-gray-300 px-1 py-1">{pUnit.toFixed(2)}</div>
                                                <div className="w-[10%] text-right px-1 py-1">{totalItem.toFixed(2)}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="border border-black rounded-lg p-2 mb-2 font-bold text-center text-lg bg-gray-50">
                                    SON: {totalInWords || ''}
                                </div>

                                <div className="border border-black rounded-lg p-3 relative mb-10">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="w-2/3 pr-2">
                                            <div className="font-bold mb-1">OBSERVACIONES:</div>
                                            <div className="text-xs">{observation?.toUpperCase() || ''}</div>
                                            <div className="text-xs mt-2">
                                                Representación impresa del Comprobante de Pago Electrónico.
                                                <br />
                                                Autorizado mediante Resolución de Intendencia N° 080-005-000153/SUNAT.
                                                <br />
                                                Emite a través de APISPERU - Proveedor Autorizado por SUNAT.
                                            </div>
                                        </div>

                                        <div className="w-1/3 text-right space-y-0.5">
                                            {isDocumentoFiscal && (
                                                <>
                                                    <div className="flex justify-between"><span className="font-bold">OP. GRAVADAS:</span><span>S/ {round2(mtoOperGravadas).toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span className="font-bold">OP. EXONERADAS:</span><span>S/ {round2(mtoOperExoneradas).toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span className="font-bold">OP. INAFECTAS:</span><span>S/ {round2(mtoOperInafectas).toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span className="font-bold">OP. GRATUITAS:</span><span>S/ {round2(mtoOperGratuitas).toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span className="font-bold">ICBPER:</span><span>S/ {round2(mtoIcbper).toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span className="font-bold">SUB TOTAL:</span><span>S/ {round2(mtoOperGravadas).toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span>DESCUENTOS TOTAL:</span><span>S/ {round2(totalDescuentos).toFixed(2)}</span></div>
                                                    <div className="flex justify-between"><span className="font-bold">IGV 18%:</span><span>S/ {round2(mtoIgv).toFixed(2)}</span></div>
                                                </>
                                            )}
                                            {!isDocumentoFiscal && totalDescuentos > 0 && (
                                                <div className="flex justify-between">
                                                    <span>DESCUENTO:</span>
                                                    <span>- S/ {round2(totalDescuentos).toFixed(2)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-lg font-bold border-t border-black pt-1 mt-1">
                                                <span>MONTO TOTAL:</span>
                                                <span>S/ {round2(mtoImpVenta).toFixed(2)}</span>
                                            </div>
                                            {shouldShowRetention && (
                                                <>
                                                    <div className="flex justify-between"><span className="font-bold">RETENCIÓN (3%):</span><span>S/ {displayRetencionMonto.toFixed(2)}</span></div>
                                                    <div className="flex justify-between font-bold"><span>IMPORTE NETO:</span><span>S/ {Number(mtoImpVenta - displayRetencionMonto).toFixed(2)}</span></div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 text-center text-[10px]">
                                    {fc('gracias').visible && (<>
                                    <div className="font-bold mb-1" style={{ fontSize: px('gracias') }}>
                                        GRACIAS POR ELEGIR {company?.empresa?.nombreComercial?.toUpperCase() || company?.empresa?.razonSocial?.toUpperCase()} PARA CUBRIR SUS REQUERIMIENTOS DE {company?.empresa?.rubro?.nombre?.toUpperCase() || 'SERVICIOS'}
                                    </div>
                                    <div className="font-bold mb-8" style={{ fontSize: px('gracias') }}>VUELVA PRONTO</div>
                                    </>)}

                                    <div className="flex justify-between items-end border-t border-gray-400 pt-1">
                                        <div className="text-left text-[10px] text-gray-500 font-mono">
                                            USUARIO: {formValues?.vendedor || 'ADMIN'} {moment().format('DD/MM/YYYY HH:mm')}
                                        </div>

                                        <div className="text-right text-[10px] text-gray-500">
                                            {(() => {
                                                const reseller = company?.empresa?.reseller;
                                                const brandName = reseller?.whiteLabelNombre || BRAND.name;
                                                const brandWebsite = reseller?.whiteLabelWebsite || BRAND.website;
                                                return (
                                                    <>
                                                        <div className="font-bold italic">{brandName} ™</div>
                                                        <div>Comprobante emitido a través de {brandWebsite}</div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
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
