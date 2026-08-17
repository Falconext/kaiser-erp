import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { MetodosPagoResponse, formatSoles } from './MetodosPagoModel';
import { BRAND } from '@/lib/branding';

Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf', fontWeight: 'normal' },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', fontWeight: 'bold' },
    ],
});

const styles = StyleSheet.create({
    page: { fontFamily: 'Roboto', fontSize: 8, color: '#111827', padding: 32, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#111827', paddingBottom: 12, marginBottom: 14 },
    title: { fontSize: 16, fontWeight: 'bold' },
    subtitle: { fontSize: 8, color: '#6b7280', marginTop: 3 },
    company: { fontSize: 9, fontWeight: 'bold', textAlign: 'right' },
    meta: { fontSize: 7, color: '#6b7280', textAlign: 'right', marginTop: 2 },
    kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    kpi: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, padding: 9 },
    kpiLabel: { fontSize: 7, color: '#6b7280', marginBottom: 4 },
    kpiValue: { fontSize: 12, fontWeight: 'bold' },
    section: { fontSize: 9, fontWeight: 'bold', marginTop: 10, marginBottom: 6, textTransform: 'uppercase' },
    methodBox: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, marginBottom: 9 },
    methodHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f3f4f6', padding: 7 },
    methodTitle: { fontSize: 9, fontWeight: 'bold' },
    methodTotal: { fontSize: 9, fontWeight: 'bold' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#111827', paddingVertical: 5, paddingHorizontal: 6 },
    th: { color: '#fff', fontSize: 7, fontWeight: 'bold' },
    row: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    alt: { backgroundColor: '#fafafa' },
    cell: { fontSize: 7, color: '#374151' },
    bold: { fontWeight: 'bold', color: '#111827' },
    date: { width: '12%' },
    doc: { width: '18%' },
    client: { width: '22%' },
    ref: { width: '18%' },
    account: { width: '17%' },
    amount: { width: '13%', textAlign: 'right' },
    footer: { position: 'absolute', bottom: 20, left: 32, right: 32, borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
    footerText: { fontSize: 7, color: '#9ca3af' },
});

const formatDate = (value?: string | null) => {
    if (!value) return '-';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
};

export function MetodosPagoReportPDF({
    data,
    empresa,
}: {
    data: MetodosPagoResponse;
    empresa: { nombre?: string; ruc?: string; direccion?: string } | null;
}) {
    const now = new Date().toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });

    return (
        <Document title="Métodos de pago" author={empresa?.nombre}>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Métodos de pago</Text>
                        <Text style={styles.subtitle}>Detalle de cobros por venta y método</Text>
                    </View>
                    <View>
                        <Text style={styles.company}>{empresa?.nombre ?? 'Empresa'}</Text>
                        {empresa?.ruc && <Text style={styles.meta}>RUC: {empresa.ruc}</Text>}
                        <Text style={styles.meta}>Periodo: {data.periodo.label}</Text>
                        <Text style={styles.meta}>Generado: {now}</Text>
                    </View>
                </View>

                <View style={styles.kpiRow}>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>TOTAL COBRADO</Text>
                        <Text style={styles.kpiValue}>{formatSoles(data.resumen.totalCobrado)}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>PAGOS / OPERACIONES</Text>
                        <Text style={styles.kpiValue}>{data.resumen.totalPagos}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>CON REFERENCIA</Text>
                        <Text style={styles.kpiValue}>{data.resumen.totalConReferencia}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>MÉTODOS</Text>
                        <Text style={styles.kpiValue}>{data.resumen.totalMetodos}</Text>
                    </View>
                </View>

                <Text style={styles.section}>Detalle por método</Text>
                {data.metodos.map((metodo) => (
                    <View key={metodo.metodo} style={styles.methodBox} wrap={false}>
                        <View style={styles.methodHeader}>
                            <Text style={styles.methodTitle}>{metodo.metodo} · {metodo.cantidad} pago(s)</Text>
                            <Text style={styles.methodTotal}>{formatSoles(metodo.total)}</Text>
                        </View>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.th, styles.date]}>Fecha</Text>
                            <Text style={[styles.th, styles.doc]}>Comprobante</Text>
                            <Text style={[styles.th, styles.client]}>Cliente</Text>
                            <Text style={[styles.th, styles.ref]}>Referencia</Text>
                            <Text style={[styles.th, styles.account]}>Cuenta</Text>
                            <Text style={[styles.th, styles.amount]}>Monto</Text>
                        </View>
                        {metodo.items.slice(0, 40).map((item, idx) => (
                            <View key={item.id} style={[styles.row, idx % 2 ? styles.alt : {}]}>
                                <Text style={[styles.cell, styles.date]}>{formatDate(item.fecha)}</Text>
                                <Text style={[styles.cell, styles.doc]}>{item.documento}</Text>
                                <Text style={[styles.cell, styles.client]}>{item.cliente}</Text>
                                <Text style={[styles.cell, styles.ref]}>{item.referencia || '-'}</Text>
                                <Text style={[styles.cell, styles.account]}>{item.cuenta || '-'}</Text>
                                <Text style={[styles.cell, styles.amount, styles.bold]}>{formatSoles(item.monto)}</Text>
                            </View>
                        ))}
                        {metodo.items.length > 40 && (
                            <View style={styles.row}>
                                <Text style={styles.cell}>Se muestran 40 de {metodo.items.length} operaciones de este método.</Text>
                            </View>
                        )}
                    </View>
                ))}

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>{BRAND.name} · Finanzas</Text>
                    <Text style={styles.footerText}>Reporte de métodos de pago</Text>
                </View>
            </Page>
        </Document>
    );
}
