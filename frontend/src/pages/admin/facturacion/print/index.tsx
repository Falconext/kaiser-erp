
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import moment from 'moment';

Font.register({
    family: 'Roboto',
    fonts: [
        {
            src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf', // URL de Roboto Regular
            fontWeight: 'normal',
        },
        {
            src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', // URL de Roboto Bold
            fontWeight: 'bold',
        },
    ],
});
// Estilos para el PDF


// Componente para generar el PDF
const PrintPDF = ({
    productsInvoice,
    totalInWords,
    qrCodeDataUrl,
    observation,
    company,
    formValues,
    mode,
    total,
    receipt,
    selectedClient,
    discount,
    size,
}: {
    productsInvoice: any[];
    selectedClient: any;
    company: any,
    size: any,
    formValues: any
    totalInWords: string;
    serie: string
    correlative: string
    qrCodeDataUrl: any
    receipt: string
    mode: string
    total: string;
    observation: string
    discount: string
}) => {

    const styles = StyleSheet.create({
        subtitleTicket: {
            fontSize: size === "A5" ? 7 : 8,
            textAlign: "center",
            textTransform: "uppercase"
        },
        page: {
            fontFamily: 'Inter',
            fontSize: size === "A5" ? 8 : 10,
            position: 'relative',
        },
        logo: {
            textAlign: "center",
            margin: "",
            marginRight: 20,
            position: "relative",
            top: "-10px",
            display: "flex",
            justifyContent: "center"
        },
        header: {
            textAlign: size === "A4" ? "left" : size === "A5" ? "left" : "center",
            marginBottom: size === "A4" ? 20 : size === "A5" ? 20 : 5,
            width: size === "A5" ? "250px" : size === "TICKET" ? "190px" : "330px"
        },
        title: {
            fontSize: size === "A4" ? 13 : 9,
            fontWeight: size === "A4" ? 'bold' : "normal",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            // marginBottom: 5,
        },
        subtitle: {
            fontSize: size === "A5" ? 7 : 8,
        },
        section: {
            // marginBottom: 8,
        },
        row: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        infoRow: {
            flexDirection: 'row',
            marginBottom: 1, // Espacio entre filas
        },
        label: {
            width: size === "TICKET" ? "auto" : 80, // Ancho fijo para las etiquetas (ajusta según necesites)
            fontWeight: size === "TICKET" ? "normal" : 'bold',
            fontSize: size === "A5" ? 7 : 8,
        },
        value: {
            fontSize: size === "A5" ? 7 : 8,
            lineHeight: 1.5, // Mejoramos la legibilidad,
        },
        valueAddress: {
            fontSize: size === "A5" ? 7 : 8,
            lineHeight: 1.5,
            width: size === "A5" ? 150 : 200, // Ancho máximo para permitir el ajuste de línea
            wrap: true,
        },
        table: {
            width: '100%',
            borderStyle: 'solid',
            fontSize: size === "A5" ? 7 : 8,
            borderWidth: 1,
            borderColor: '#000',
            marginBottom: 10,
        },
        tableRow: {
            flexDirection: 'row',
            borderBottom: "none",
            fontSize: size === "A5" ? 7 : 8,
        },
        tableHeader: {
            borderStyle: 'solid',
            borderColor: '#000',
            fontSize: size === "A5" ? 7 : 8,
            padding: 3,
            fontWeight: 'bold',
            borderBottom: "none",
            borderBottomWidth: 0,
            backgroundColor: "#fff",
            textAlign: 'center',
            flex: 1,
        },
        tableHeaderTicket: {
            fontSize: 8,
            padding: 0,
            flex: 1,
        },
        tableHeaderDescription: {
            borderStyle: 'solid',
            backgroundColor: "#fff",
            fontSize: size === "A5" ? 7 : 8,
            borderColor: '#000',
            borderLeft: "none",
            borderRight: "none",
            borderBottom: "none",
            borderBottomWidth: 0,
            padding: 3,
            fontWeight: 'bold',
            textAlign: 'center',
            flex: 7,
        },
        tableCell: {
            borderStyle: 'solid',
            borderBottom: "none",
            borderWidth: "0px",
            // borderColor: '#000',
            padding: 3,
            borderBottomWidth: 0,
            borderTopWidth: 0,
            textAlign: 'center',
            flex: 1,
        },
        tableCellNumber: {
            borderStyle: 'solid',
            borderBottom: "none",
            // borderColor: '#000',
            padding: 3,
            borderBottomWidth: 0,
            borderTopWidth: 0,
            textAlign: 'right',
            flex: 1,
        },
        tableCellDescription: {
            borderStyle: 'solid',
            borderWidth: "0px",
            borderBottom: "none",
            // borderColor: '#000',
            borderBottomWidth: 0,
            borderTopWidth: 0,
            padding: 3,
            textAlign: 'left',
            flex: 7,
        },
        bold: {
            fontWeight: 'bold',
        },
        qrCode: {
            position: 'absolute',
            bottom: 10,
            right: 20,
            width: 60,
            height: 60,
        },
        watermark: {
            position: 'absolute',
            top: '50%',
            left: '15%',
            transform: formValues?.estadoPago === "ANULADO" ? 'translate(20%, -50%) rotate(45deg)' : "translate(-50%, -50%) rotate(45deg)",
            color: 'red',
            fontSize: size === "TICKET" ? 35 : size === "A4" ? 80 : 600,
            fontWeight: 'bold',
            opacity: 0.3,
        },
        separator: {
            marginTop: 1,
            marginBottom: 1,
            textAlign: 'center',
        },
    });

    console.log(size)

    let print = size === "TICKET" ? { width: 80 * 2.83465, height: 200 * 2.83465 } : size;

    const totalReceipt = productsInvoice.reduce((sum, producto) => {
        return sum + Number(producto.total || producto.mtoPrecioUnitario * producto.cantidad || 0);
    }, 0);

    const totalPrices = productsInvoice.reduce((sum, producto) => {
        const cant = Number(producto.cantidad || 0);
        // Precio de lista de la línea: en creación viene precioUnitario; en reimpresión se
        // reconstruye sumando el descuento guardado (mtoDescuento) al precio ya rebajado.
        const grossLine = producto.precioUnitario != null
            ? Number(producto.precioUnitario) * cant
            : Number(producto.mtoPrecioUnitario || 0) * cant + Number((producto as any).mtoDescuento || 0);
        return sum + grossLine;
    }, 0);

    const isDocumentoFiscal = ['01', '03', '07', '08'].includes(String(formValues?.tipoDoc || ''));
    // Descuento por línea guardado en el comprobante (reimpresión desde la lista). En el
    // ticket de creación los ítems del carrito no lo traen, así que el ahorro se deduce de
    // (totalPrices - totalReceipt). Nota: mtoDescuentoGlobal llega como 0 (no null) en la
    // reimpresión, por lo que la cadena `??` lo cortaría; por eso se suma explícitamente.
    const lineDiscountsSum = productsInvoice.reduce(
        (s: number, p: any) => s + Number(p?.mtoDescuento || 0), 0
    );
    const headerGlobalDiscount = Number(
        formValues?.totalDescuentos ??
        formValues?.mtoDescuentos ??
        formValues?.mtoDescuentoGlobal ??
        0
    ) || 0;
    const fallbackDiscount = totalPrices > totalReceipt ? totalPrices - totalReceipt : 0;
    const totalDescuentos = (lineDiscountsSum + headerGlobalDiscount) > 0
        ? lineDiscountsSum + headerGlobalDiscount
        : (Number(discount || 0) || fallbackDiscount);
    const explicitDiscount = Number(formValues?.mtoDescuentoGlobal ?? formValues?.totalDescuentos ?? discount ?? 0) || 0;
    const netTotalFallback = Math.max(0, totalReceipt - explicitDiscount);
    const mtoOperGravadas = Number(formValues?.mtoOperGravadas ?? (netTotalFallback / 1.18));
    const mtoOperGratuitas = Number(formValues?.mtoOperGratuitas ?? 0);
    const mtoOperInafectas = Number(formValues?.mtoOperInafectas ?? 0);
    const mtoOperExoneradas = Number(formValues?.mtoOperExoneradas ?? 0);
    const mtoIcbper = Number(formValues?.icbper ?? formValues?.mtoIcbper ?? 0);
    const mtoIgv = Number(formValues?.mtoIGV ?? (netTotalFallback - (netTotalFallback / 1.18)));
    const mtoImpVenta = Number(formValues?.mtoImpVenta ?? netTotalFallback);
    const formatCantidad = (value: any): string => {
        const cantidad = Number(value || 0);
        if (!Number.isFinite(cantidad)) return '0';
        if (Number.isInteger(cantidad)) return String(cantidad);
        return cantidad.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
    };
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
    const displayVuelto = isCreditPayment ? 0 : Number(formValues?.vuelto || 0);
    const splitPaidTotal = isMixedPayment && Array.isArray(formValues?.splitPayments)
        ? formValues.splitPayments.reduce((sum: number, sp: { amount: number }) => sum + Number(sp.amount || 0), 0)
        : 0;
    const displayPagado = isCreditPayment ? 0 : (splitPaidTotal > 0 ? splitPaidTotal : mtoImpVenta + displayVuelto);
    const paymentDetails = formValues?.paymentDetails || {};
    const splitPaymentDetails = Array.isArray(paymentDetails?.splitPayments)
        ? paymentDetails.splitPayments
        : (Array.isArray(formValues?.splitPayments) ? formValues.splitPayments : []);
    const singlePaymentDetail = paymentDetails?.mode === 'SIMPLE' ? paymentDetails : { method: paymentMethodLabel, amount: mtoImpVenta };
    const formatPaymentExtra = (payment: any) => {
        const extras: string[] = [];
        if (payment?.cuentaBancariaLabel) extras.push(`Cuenta: ${payment.cuentaBancariaLabel}`);
        if (payment?.referencia) extras.push(`Op/Voucher: ${payment.referencia}`);
        const method = (payment?.method || '').toUpperCase();
        if (method === 'TARJETA') {
            const tarjeta = [payment?.tarjetaMarca, payment?.tarjetaTipo, payment?.tarjetaUltimos4 ? `****${payment.tarjetaUltimos4}` : ''].filter(Boolean).join(' ');
            if (tarjeta) extras.push(`Tarjeta: ${tarjeta}`);
        }
        return extras;
    };
    const vendedorNombre = (formValues?.vendedor || company?.nombre || 'ADMIN').toString().toUpperCase();
    const empresaNumero = (
        company?.empresa?.celular ||
        company?.empresa?.telefono ||
        company?.celular ||
        company?.telefono ||
        ''
    ).toString().trim();

    function round2(n: number): number {
        return parseFloat(n?.toFixed(2)) || 0;
    }

    console.log(company)

    const rawBase64 = company?.empresa?.logo;
    const logoDataUrl = (() => {
        if (!rawBase64) return undefined;
        const t = rawBase64.trim();
        if (t.startsWith('data:')) return t;
        if (/^https?:\/\//i.test(t) || t.startsWith('/')) return t;
        return `data:${t.startsWith('/9j/') ? 'image/jpeg' : 'image/png'};base64,${t}`;
    })();

    const logoScale = (Number(company?.empresa?.ticketLogoSize) || 96) / 96;
    const ticketLogoDim = 70 * logoScale;
    const documentLogoDim = 100 * logoScale;

    return (
        <Document>
            <Page size={print} style={styles.page}>
                {/* Encabezado */}
                {
                    size === "TICKET" ?
                        <>
                            <View style={styles.header}>
                                {logoDataUrl && (
                                    <View style={{ alignItems: 'center', marginBottom: 8 }}>
                                        <Image src={logoDataUrl} style={{ width: ticketLogoDim, height: ticketLogoDim, objectFit: 'contain' }} />
                                    </View>
                                )}
                                <Text style={styles.title}>{company?.empresa?.nombreComercial}</Text>
                                <Text style={styles.subtitle}>
                                    RAZON SOCIAL: {company?.empresa?.razonSocial.toUpperCase()}
                                    {'\n'}
                                    DIRECCION: {company?.empresa?.direccion.toUpperCase()}
                                    {'\n'}
                                    {empresaNumero ? `CELULAR: ${empresaNumero}\n` : ''}
                                    {(company?.empresa as any)?.paginaWeb ? `WEB: ${(company?.empresa as any).paginaWeb}\n` : ''}
                                    RUC: {company?.empresa?.ruc.toUpperCase()}
                                    {'\n'}
                                </Text>
                            </View>
                            <Text style={styles.separator}>-------------------------------------------------------------------</Text>
                            <View>
                                <Text style={{ fontWeight: "bold", textAlign: "center", fontSize: 8 }}>
                                    {receipt === 'COTIZACIÓN' ? 'COTIZACIÓN' : receipt === 'ORDEN DE PAGO' ? 'ORDEN DE PAGO' : /VENTA$/i.test(String(receipt || '')) ? `${receipt} ELECTRÓNICA` : `${receipt || ''} DE VENTA ELECTRÓNICA`}
                                    {'\n'}
                                    <Text>{formValues.serie}-{formValues.correlativo}</Text>
                                </Text>
                            </View>
                            <Text style={styles.separator}>-------------------------------------------------------------------</Text>

                            <View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>FECHA Y HORA:</Text>
                                    <Text style={styles.value}>{formValues?.fechaEmision}</Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>RAZON SOCIAL:</Text>
                                    <Text style={styles.value}>{selectedClient?.nombre?.toUpperCase() || ''}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>NÚMERO DE DOCUMENTO:</Text>
                                    <Text style={styles.value}>{selectedClient?.nroDoc || ''}</Text>
                                </View>

                                {(receipt === "NOTA DE CREDITO" || receipt === "NOTA DE CRÉDITO" || receipt === "NOTA DE DÉBITO" || receipt === "NOTA DE DEBITO") && (
                                    <>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>TIPO NOTA:</Text>
                                            <Text style={styles.value}>({formValues?.motivoId || ''}) {formValues?.motivo?.descripcion || formValues?.motivo || ''}</Text>
                                        </View>
                                        {receipt === "NOTA DE DEBITO" && (
                                            <View style={styles.infoRow}>
                                                <Text style={styles.label}>MEDIO PAGO:</Text>
                                                <Text style={styles.value}>{paymentMethodLabel} S/ {isCreditPayment ? '0.00' : round2(mtoImpVenta).toFixed(2)}</Text>
                                            </View>
                                        )}
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>DOC. REF.:</Text>
                                            <Text style={styles.value}>{formValues?.numDocAfectado?.toUpperCase() || ''}</Text>
                                        </View>
                                    </>
                                )}
                            </View>
                            <Text style={styles.separator}>-------------------------------------------------------------------</Text>
                            <View>
                                <View style={styles.tableRow}>
                                    <Text style={styles.tableHeaderTicket}>CANT.</Text>
                                    <Text style={styles.tableHeaderTicket}>U.M.</Text>
                                    <Text style={[styles.tableHeaderTicket, { flex: 7, textAlign: 'left' }]}>DESCRIPCION</Text>
                                    <Text style={[styles.tableHeaderTicket, { textAlign: 'right' }]}>P.U.</Text>
                                    <Text style={[styles.tableHeaderTicket, { textAlign: 'right' }]}>IMP.</Text>
                                </View>
                                {productsInvoice?.map((item, index) => (
                                    <View style={styles.tableRow} key={index}>
                                        <Text style={styles.tableCell}>{formatCantidad(item?.cantidad)}</Text>
                                        <Text style={styles.tableCell}>{item?.unidad?.toUpperCase() || item?.unidadMedida?.toUpperCase() || item?.producto?.unidadMedida?.codigo?.toUpperCase() || ''}</Text>
                                        <Text style={styles.tableCellDescription}>{item?.descripcion?.toUpperCase() || ''}</Text>
                                        <Text style={styles.tableCellNumber}>{Number(
                                            item?.precioUnitario != null
                                                ? item.precioUnitario
                                                : Number(item?.mtoPrecioUnitario || 0) + (Number((item as any)?.mtoDescuento || 0) / Number(item?.cantidad || 1))
                                        ).toFixed(2)}</Text>
                                        <Text style={styles.tableCellNumber}>{Number(item?.total || (item?.mtoPrecioUnitario ?? 0) * (item?.cantidad ?? 0) || 0).toFixed(2)}</Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={styles.separator}>-------------------------------------------------------------------</Text>
                            <>
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>FORMA PAGO:</Text>
                                    <Text style={styles.value}>{paymentConditionLabel}</Text>
                                </View>
                                {isCreditPayment && formValues?.fechaVencimientoCredito && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>VENCIMIENTO:</Text>
                                        <Text style={styles.value}>{moment(formValues.fechaVencimientoCredito).format('DD/MM/YYYY')}</Text>
                                    </View>
                                )}
                                {hasCreditInstallments && (
                                    <View>
                                        <Text style={[styles.value, { marginTop: 4 }]}>CUOTAS:</Text>
                                        {cuotasCredito.map((cuota: any, idx: number) => (
                                            <View key={idx}>
                                                <Text style={styles.value}>CUOTA {idx + 1}</Text>
                                                <View style={[styles.infoRow, { paddingLeft: 4 }]}>
                                                    <Text style={styles.value}>{moment(cuota.fechaVencimiento).format('DD/MM/YYYY')}</Text>
                                                    <Text style={styles.value}>S/ {Number(cuota.monto).toFixed(2)}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                {isCreditPayment && (
                                    <>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>MEDIO PAGO:</Text>
                                            <Text style={styles.value}>CRÉDITO S/ 0.00</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>PAGADO:</Text>
                                            <Text style={styles.value}>S/ 0.00</Text>
                                        </View>
                                    </>
                                )}
                                {!isCreditPayment && (
                                    <>
                                        {isMixedPayment && Array.isArray(formValues?.splitPayments) && formValues.splitPayments.length > 0 ? (
                                            <>
                                                <View style={styles.infoRow}>
                                                    <Text style={styles.label}>MEDIOS PAGO:</Text>
                                                </View>
                                                {formValues.splitPayments.map((sp: { method: string; amount: number }, idx: number) => {
                                                    const detail = splitPaymentDetails[idx] || sp;
                                                    return (
                                                        <View key={idx}>
                                                            <View style={[styles.infoRow, { paddingLeft: 4 }]}>
                                                                <Text style={styles.label}>{sp.method?.toUpperCase()}:</Text>
                                                                <Text style={styles.value}>S/ {Number(sp.amount).toFixed(2)}</Text>
                                                            </View>
                                                            {formatPaymentExtra(detail).map((line) => (
                                                                <Text key={line} style={[styles.value, { paddingLeft: 8 }]}>{line}</Text>
                                                            ))}
                                                        </View>
                                                    );
                                                })}
                                            </>
                                        ) : (
                                            <>
                                                <View style={styles.infoRow}>
                                                    <Text style={styles.label}>MEDIO PAGO:</Text>
                                                    <Text style={styles.value}>{paymentMethodLabel} S/ {isCreditPayment ? '0.00' : round2(mtoImpVenta).toFixed(2)}</Text>
                                                </View>
                                                {formatPaymentExtra(singlePaymentDetail).map((line) => (
                                                    <Text key={line} style={[styles.value, { paddingLeft: 4 }]}>{line}</Text>
                                                ))}
                                            </>
                                        )}
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>VUELTO:</Text>
                                            <Text style={styles.value}>S/ {displayVuelto.toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>PAGADO:</Text>
                                            <Text style={styles.value}>S/ {displayPagado.toFixed(2)}</Text>
                                        </View>
                                    </>
                                )}
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>VENDEDOR:</Text>
                                    <Text style={styles.value}>{vendedorNombre}</Text>
                                </View>
                            </>
                            <View style={styles.section}>
                                <Text style={styles.bold}>SON: {totalInWords || ''}</Text>
                                {!isDocumentoFiscal && (discount && Number(discount) > 0) && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>DESCUENTO:</Text>
                                        <Text style={styles.value}>- S/ {round2(totalDescuentos).toFixed(2)}</Text>
                                    </View>
                                )}
                                {!isDocumentoFiscal && !explicitDiscount && totalReceipt < totalPrices && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>DESCUENTO:</Text>
                                        <Text style={styles.value}>S/ {(totalPrices - totalReceipt).toFixed(2)}</Text>
                                    </View>
                                )}
                                {isDocumentoFiscal && (
                                    <>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>OP. GRAVADA:</Text>
                                            <Text style={styles.value}>S/ {round2(mtoOperGravadas).toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>OP. GRATUITA:</Text>
                                            <Text style={styles.value}>S/ {round2(mtoOperGratuitas).toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>OP. INAFECTA:</Text>
                                            <Text style={styles.value}>S/ {round2(mtoOperInafectas).toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>OP. EXONERADA:</Text>
                                            <Text style={styles.value}>S/ {round2(mtoOperExoneradas).toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>ICBPER:</Text>
                                            <Text style={styles.value}>S/ {round2(mtoIcbper).toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>IGV (18%):</Text>
                                            <Text style={styles.value}>S/ {round2(mtoIgv).toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.infoRow}>
                                            <Text style={styles.label}>DESCUENTOS:</Text>
                                            <Text style={styles.value}>S/ {round2(totalDescuentos).toFixed(2)}</Text>
                                        </View>
                                    </>
                                )}
                                <View style={styles.infoRow}>
                                    <Text style={styles.label}>IMPORTE TOTAL:</Text>
                                    <Text style={styles.value}>S/ {round2(mtoImpVenta).toFixed(2)}</Text>
                                </View>
                            </View>

                            <View style={{ border: "1px solid #222", padding: 5 }}>
                                <Text style={styles.subtitle}>
                                    <Text style={styles.bold}>OBSERVACIONES:</Text>
                                    {'\n'}
                                    {observation ? observation.toUpperCase() : ""}
                                    {'\n'}
                                    Representación impresa del Comprobante de Pago Electrónico.
                                    {'\n'}
                                    Autorizado mediante Resolución de Intendencia N° 080-005-000153/SUNAT.
                                    {'\n'}
                                    Emite a través de APISPERU - Proveedor Autorizado por SUNAT.
                                </Text>
                                {qrCodeDataUrl && <Image style={styles.qrCode} src={qrCodeDataUrl} />}
                            </View>

                            {(mode === "vista previa" || formValues?.estadoEnvioSunat === "ANULADO" || formValues?.estadoPago === "ANULADO") && (
                                <Text style={styles.watermark}>{formValues?.estadoEnvioSunat || formValues?.estadoPago === "ANULADO" || "VISTA PREVIA"}</Text>
                            )}

                        </>
                        :
                        <>
                            <View style={[styles.section, styles.row]}>


                                {logoDataUrl && logoDataUrl !== "" && (
                                    <Text style={[styles.logo]}>
                                        <View>
                                            <Image
                                                src={logoDataUrl}
                                                style={{ width: documentLogoDim, height: documentLogoDim, objectFit: 'contain' }}
                                            />
                                        </View>
                                    </Text>
                                )}


                                <View style={styles.header}>
                                    <Text style={styles.subtitle}>
                                        <Text style={{ fontSize: "15px", fontWeight: "bold" }}>{company?.empresa?.nombreComercial || ''}</Text>
                                        {'\n'}
                                        {'\n'}
                                        {company?.empresa?.direccion || ''}
                                        {'\n'}
                                        {'\n'}
                                        {company?.empresa?.rubro?.nombre?.toUpperCase() || ''}
                                        {'\n'}
                                        RAZON SOCIAL: {company?.empresa?.razonSocial || ''}
                                        {'\n'}
                                        {empresaNumero ? `CELULAR: ${empresaNumero}\n` : ''}
                                        EMAIL: {company?.email || ''}
                                        {(company?.empresa as any)?.paginaWeb ? `\nWEB: ${(company?.empresa as any).paginaWeb}` : ''}
                                    </Text>
                                </View>
                                <View>
                                    <View style={{ border: "1px solid #222", padding: "10px 15px", textAlign: "center" }}>
                                        <Text style={styles.subtitle}>
                                            {'\n'}
                                            RUC: {company?.empresa?.ruc || ''}
                                            {'\n'}
                                            <Text style={{ fontSize: "13px", fontWeight: "bold" }}>{receipt || receipt === ""}</Text>
                                            {'\n'}
                                            <Text style={{ fontSize: "13px", fontWeight: "bold" }}>ELECTRONICA</Text>
                                            {'\n'}
                                            {formValues.serie}-{formValues.correlativo}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.section, styles.row]}>
                                <View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>CLIENTE:</Text>
                                        <Text style={styles.value}>{selectedClient?.nombre?.toUpperCase() || ''}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>DIRECCION:</Text>
                                        <Text style={styles.valueAddress}>{selectedClient?.direccion?.toUpperCase() || '-'}</Text>
                                    </View>
                                    {(receipt === "NOTA DE CREDITO" || receipt === "NOTA DE CRÉDITO" || receipt === "NOTA DE DÉBITO" || receipt === "NOTA DE DEBITO") ? (
                                        <>
                                            <View style={styles.infoRow}>
                                                <Text style={styles.label}>TIPO NOTA</Text>
                                                <Text style={styles.value}>({formValues?.motivoId || ''}) {formValues?.motivo?.descripcion || formValues?.motivo || ''}</Text>
                                            </View>
                                            {receipt === "NOTA DE DEBITO" && (
                                                <View style={styles.infoRow}>
                                                    <Text style={styles.label}>MEDIO DE PAGO</Text>
                                                    <Text style={styles.value}>{paymentMethodLabel} S/ {isCreditPayment ? '0.00' : round2(mtoImpVenta).toFixed(2)}</Text>
                                                </View>
                                            )}
                                            <View style={styles.infoRow}>
                                                <Text style={styles.label}>DOC. REFERENCIA</Text>
                                                <Text style={styles.value}>{formValues?.numDocAfectado?.toUpperCase() || ''}</Text>
                                            </View>
                                            <View style={styles.infoRow}>
                                                <Text style={styles.label}>MOTIVO NOTA</Text>
                                                <Text style={styles.value}>{formValues?.motivo?.descripcion || formValues?.motivo || ''}</Text>
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <View style={styles.infoRow}>
                                                <Text style={styles.label}>FORMA DE PAGO</Text>
                                                <Text style={styles.value}>{paymentConditionLabel}</Text>
                                            </View>
                                            {isCreditPayment && formValues?.fechaVencimientoCredito && (
                                                <View style={styles.infoRow}>
                                                    <Text style={styles.label}>VENCIMIENTO</Text>
                                                    <Text style={styles.value}>{moment(formValues.fechaVencimientoCredito).format('DD/MM/YYYY')}</Text>
                                                </View>
                                            )}
                                            {hasCreditInstallments && (
                                                <View>
                                                    <Text style={[styles.value, { marginTop: 4 }]}>CUOTAS</Text>
                                                    {cuotasCredito.map((cuota: any, idx: number) => (
                                                        <View key={idx}>
                                                            <Text style={styles.value}>CUOTA {idx + 1}</Text>
                                                            <View style={[styles.infoRow, { paddingLeft: 4 }]}>
                                                                <Text style={styles.value}>{moment(cuota.fechaVencimiento).format('DD/MM/YYYY')}</Text>
                                                                <Text style={styles.value}>S/ {Number(cuota.monto).toFixed(2)}</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                            {isCreditPayment && (
                                                <>
                                                    <View style={styles.infoRow}>
                                                        <Text style={styles.label}>MEDIO DE PAGO</Text>
                                                        <Text style={styles.value}>CRÉDITO S/ 0.00</Text>
                                                    </View>
                                                    <View style={styles.infoRow}>
                                                        <Text style={styles.label}>PAGADO</Text>
                                                        <Text style={styles.value}>S/ 0.00</Text>
                                                    </View>
                                                </>
                                            )}
                                            {!isCreditPayment && (
                                                <>
                                                    {isMixedPayment && Array.isArray(formValues?.splitPayments) && formValues.splitPayments.length > 0 ? (
                                                        <>
                                                            <View style={styles.infoRow}>
                                                                <Text style={styles.label}>MEDIOS DE PAGO</Text>
                                                            </View>
                                                            {formValues.splitPayments.map((sp: { method: string; amount: number }, idx: number) => {
                                                                const detail = splitPaymentDetails[idx] || sp;
                                                                return (
                                                                    <View key={idx}>
                                                                        <View style={[styles.infoRow, { paddingLeft: 4 }]}>
                                                                            <Text style={styles.label}>{sp.method?.toUpperCase()}:</Text>
                                                                            <Text style={styles.value}>S/ {Number(sp.amount).toFixed(2)}</Text>
                                                                        </View>
                                                                        {formatPaymentExtra(detail).map((line) => (
                                                                            <Text key={line} style={[styles.value, { paddingLeft: 8 }]}>{line}</Text>
                                                                        ))}
                                                                    </View>
                                                                );
                                                            })}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <View style={styles.infoRow}>
                                                                <Text style={styles.label}>MEDIO DE PAGO</Text>
                                                                <Text style={styles.value}>{paymentMethodLabel} S/ {isCreditPayment ? '0.00' : round2(mtoImpVenta).toFixed(2)}</Text>
                                                            </View>
                                                            {formatPaymentExtra(singlePaymentDetail).map((line) => (
                                                                <Text key={line} style={[styles.value, { paddingLeft: 4 }]}>{line}</Text>
                                                            ))}
                                                        </>
                                                    )}
                                                    <View style={styles.infoRow}>
                                                        <Text style={styles.label}>VUELTO</Text>
                                                        <Text style={styles.value}>S/ {displayVuelto.toFixed(2)}</Text>
                                                    </View>
                                                    <View style={styles.infoRow}>
                                                        <Text style={styles.label}>PAGADO</Text>
                                                        <Text style={styles.value}>S/ {displayPagado.toFixed(2)}</Text>
                                                    </View>
                                                </>
                                            )}
                                            <View style={styles.infoRow}>
                                                <Text style={styles.label}>VENDEDOR</Text>
                                                <Text style={styles.value}>{vendedorNombre}</Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                                <View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>RUC:</Text>
                                        <Text style={styles.value}>{selectedClient?.nroDoc || ''}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>FECHA:</Text>
                                        <Text style={styles.value}>{moment(formValues?.fechaEmision).format('DD/MM/YYYY')}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>HORA:</Text>
                                        <Text style={styles.value}>{moment(formValues?.fechaEmision).format('HH:mm:ss')}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.label}>MONEDA:</Text>
                                        <Text style={styles.value}>SOLES</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.table}>
                                <View style={styles.tableRow}>
                                    <Text style={styles.tableHeader}>CANT.</Text>
                                    <Text style={styles.tableHeader}>U.M.</Text>
                                    <Text style={styles.tableHeaderDescription}>DESCRIPCION</Text>
                                    <Text style={styles.tableHeader}>P.U.</Text>
                                    <Text style={styles.tableHeader}>{size === "A5" ? "IMP." : "IMPORTE"}</Text>
                                </View>
                                {productsInvoice?.map((item, index) => (
                                    <View style={styles.tableRow} key={index}>
                                        <Text style={styles.tableCell}>{formatCantidad(item?.cantidad)}</Text>
                                        <Text style={styles.tableCell}>{item?.unidad?.toUpperCase() || item?.unidadMedida?.toUpperCase() || item?.producto?.unidadMedida?.codigo?.toUpperCase() || ''}</Text>
                                        <View style={styles.tableCellDescription}>
                                            <Text>{item?.descripcion?.toUpperCase() || ''}</Text>
                                            {item?.lotes && item.lotes.length > 0 && item.lotes.map((l: any, i: number) => (
                                                <Text key={i} style={{ fontSize: size === "A5" ? 6 : 7, color: '#555' }}>
                                                    Lote: {l.lote} | Venc: {l.fechaVencimiento ? new Date(l.fechaVencimiento).toLocaleDateString('es-PE') : ''}
                                                </Text>
                                            ))}
                                            {!item?.lotes?.length && item?.lote && (
                                                <Text style={{ fontSize: size === "A5" ? 6 : 7, color: '#555' }}>
                                                    Lote: {item.lote?.lote ?? item.lote}{(item.lote?.fechaVencimiento) ? ` | Venc: ${new Date(item.lote.fechaVencimiento).toLocaleDateString('es-PE')}` : ''}
                                                </Text>
                                            )}
                                            {item?.numeroReceta && (
                                                <Text style={{ fontSize: size === "A5" ? 6 : 7, color: '#555' }}>
                                                    Receta: {item.numeroReceta}{item.medicoNombre ? ` | Dr. ${item.medicoNombre}` : ''}{item.dniPaciente ? ` | Pac DNI: ${item.dniPaciente}` : ''}
                                                </Text>
                                            )}
                                        </View>
                                        <Text style={styles.tableCellNumber}>{Number(
                                            item?.precioUnitario != null
                                                ? item.precioUnitario
                                                : Number(item?.mtoPrecioUnitario || 0) + (Number((item as any)?.mtoDescuento || 0) / Number(item?.cantidad || 1))
                                        ).toFixed(2)}</Text>
                                        <Text style={styles.tableCellNumber}>{Number(item?.total || (item?.mtoPrecioUnitario ?? 0) * (item?.cantidad ?? 0) || 0).toFixed(2)}</Text>
                                    </View>
                                ))}
                            </View>

                            <View style={[styles.section, styles.row]}>
                                <View>
                                    <Text style={{ width: "300px", fontWeight: "bold", fontSize: size === "A5" ? "7px" : "8px" }}>
                                        SON: {totalInWords || ''}
                                    </Text>
                                </View>

                                <View>
                                    {(discount && Number(discount) > 0) && (
                                        <View style={{ flexDirection: "row", fontWeight: "900" }}>
                                            <Text style={styles.label}>DESCUENTO:</Text>
                                            <Text style={styles.value}>- S/ {round2(totalDescuentos).toFixed(2)}</Text>
                                        </View>
                                    )}
                                    {!explicitDiscount && totalReceipt < totalPrices && (
                                        <View style={{ flexDirection: "row", fontWeight: "900" }}>
                                            <Text style={styles.label}>DESCUENTO:</Text>
                                            <Text style={styles.value}>S/ {(totalPrices - totalReceipt).toFixed(2)}</Text>
                                        </View>
                                    )}
                                    {!['ORDEN DE TRABAJO', 'NOTA DE VENTA', 'NOTA DE PEDIDO', 'TICKET', 'COMPROBANTE DE PAGO', 'RECIBO POR HONORARIOS', 'BOLETA'].includes(formValues?.comprobante) && (
                                        <>
                                            <View style={{ flexDirection: "row", fontWeight: "900" }}>
                                                <Text style={styles.label}>OP. GRAVADA:</Text>
                                                <Text style={styles.value}>S/ {round2(mtoOperGravadas).toFixed(2)}</Text>
                                            </View>
                                            <View style={{ flexDirection: "row", fontWeight: "900" }}>
                                                <Text style={styles.label}>IGV:</Text>
                                                <Text style={styles.value}>S/ {round2(mtoIgv).toFixed(2)}</Text>
                                            </View>
                                        </>
                                    )}
                                    <View style={{ flexDirection: "row", fontWeight: "900" }}>
                                        <Text style={styles.label}>IMPORTE TOTAL:</Text>
                                        <Text style={styles.value}>S/ {round2(mtoImpVenta).toFixed(2)}</Text>
                                    </View>
                                </View>
                            </View>
                            <View style={{ border: "1px solid #222", padding: "5px 5px 2px 5px", position: "relative" }}>
                                <View style={styles.section}>
                                    <Text style={{ fontSize: size === "A5" ? "7px" : "8px" }}>
                                        <Text style={{ fontWeight: "900", fontSize: size === "A5" ? "7px" : "8px" }}>OBSERVACIONES:</Text>
                                        {'\n'}
                                        {'\n'}
                                        {observation ? observation.toUpperCase() : ""}
                                        {'\n'}
                                        {'\n'}
                                        Representación impresa del Comprobante de Pago Electrónico.
                                        {'\n'}
                                        Autorizado mediante Resolución de Intendencia N° 080-005-000153/SUNAT.
                                        {'\n'}
                                        Emite a través de APISPERU - Proveedor Autorizado por SUNAT.
                                    </Text>
                                </View>
                                {qrCodeDataUrl && <Image style={styles.qrCode} src={qrCodeDataUrl} />}
                            </View>
                        </>
                }


                {/* {(mode === "vista previa" || formValues?.estadoEnvioSunat === "ANULADO" || formValues?.estadoPago === "ANULADO") && <Text style={styles.watermark}>{formValues?.estadoEnvioSunat || formValues?.estadoPago === "ANULADO" || "VISTA PREVIA"}</Text>} */}
            </Page>
        </Document>
    );
};

export default PrintPDF;
