import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf', fontWeight: 'normal' },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', fontWeight: 'bold' },
    ],
});

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Roboto',
        fontSize: 9,
        color: '#111827',
        backgroundColor: '#FFFFFF',
        padding: 36,
    },

    // ─── Header ────────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 18,
        paddingBottom: 14,
        borderBottomWidth: 2,
        borderBottomColor: '#111827',
    },
    reportTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827', marginBottom: 3 },
    reportSubtitle: { fontSize: 8, color: '#6B7280' },
    companyName: { fontSize: 10, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
    companyMeta: { fontSize: 7.5, color: '#6B7280', textAlign: 'right', marginTop: 2 },
    periodValue: { fontSize: 9, fontWeight: 'bold', color: '#111827', textAlign: 'right', marginTop: 4 },
    generatedAt: { fontSize: 7, color: '#9CA3AF', textAlign: 'right', marginTop: 3 },

    // ─── Section title ──────────────────────────────────────────────────────────
    sectionTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 16,
        marginBottom: 7,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#D1D5DB',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ─── KPI row (3 cards) ──────────────────────────────────────────────────────
    kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 0 },
    kpiCard: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 4,
        padding: 10,
    },
    kpiLabel: { fontSize: 7.5, color: '#6B7280', marginBottom: 5 },
    kpiValue: { fontSize: 13, fontWeight: 'bold', color: '#111827' },
    kpiNote: { fontSize: 7, color: '#9CA3AF', marginTop: 3 },

    // ─── Two-col layout ─────────────────────────────────────────────────────────
    row2: { flexDirection: 'row', gap: 8, marginTop: 8 },
    halfCard: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 4,
        padding: 10,
    },

    // ─── Table ─────────────────────────────────────────────────────────────────
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#111827',
        borderRadius: 3,
        paddingVertical: 5,
        paddingHorizontal: 8,
        marginBottom: 1,
    },
    tableHeaderCell: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 8 },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    tableRowAlt: { backgroundColor: '#F9FAFB' },
    tableCell: { fontSize: 8, color: '#374151' },
    tableCellBold: { fontSize: 8, fontWeight: 'bold', color: '#111827' },
    tableCellMuted: { fontSize: 8, color: '#6B7280' },

    colDate: { width: '22%' },
    colAmount: { width: '26%', textAlign: 'right' },
    colBalance: { width: '26%', textAlign: 'right' },

    // ─── Summary totals ─────────────────────────────────────────────────────────
    summaryBox: {
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#111827',
        borderRadius: 4,
        padding: 12,
        flexDirection: 'row',
    },
    summaryItem: { flex: 1, flexDirection: 'column', alignItems: 'center' },
    summaryDivider: { borderLeftWidth: 1, borderLeftColor: '#D1D5DB' },
    summaryLabel: { fontSize: 7.5, color: '#6B7280', marginBottom: 4 },
    summaryValue: { fontSize: 12, fontWeight: 'bold', color: '#111827' },

    // ─── Balance indicator ──────────────────────────────────────────────────────
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    balanceBadge: {
        borderWidth: 1,
        borderColor: '#374151',
        borderRadius: 3,
        paddingVertical: 1,
        paddingHorizontal: 5,
    },
    balanceBadgeText: { fontSize: 7, color: '#374151', fontWeight: 'bold' },

    // ─── Footer ─────────────────────────────────────────────────────────────────
    footer: {
        position: 'absolute',
        bottom: 24,
        left: 36,
        right: 36,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#D1D5DB',
        paddingTop: 5,
    },
    footerText: { fontSize: 7, color: '#9CA3AF' },
});

const fmt = (n: number) =>
    `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

interface Props {
    kpis: {
        ingresosPeriodo: number;
        egresosPeriodo: number;
        balancePeriodo: number;
        porCobrar: number;
        porPagar: number;
    } | null;
    chartData: Array<{ fecha: string; ingresos: number; egresos: number }>;
    fechaInicio: string;
    fechaFin: string;
    empresa: { nombre?: string; ruc?: string; direccion?: string } | null;
    sedeName?: string;
}

export const FinanceReportPDF = ({ kpis, chartData, fechaInicio, fechaFin, empresa, sedeName }: Props) => {
    const now = new Date().toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
    const balance = kpis?.balancePeriodo ?? 0;
    const isPositive = balance >= 0;

    const rows = [...(chartData ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const totalIngresosChart = rows.reduce((s, r) => s + (r.ingresos ?? 0), 0);
    const totalEgresosChart = rows.reduce((s, r) => s + (r.egresos ?? 0), 0);
    const totalBalanceChart = totalIngresosChart - totalEgresosChart;

    return (
        <Document title="Reporte Financiero" author={empresa?.nombre}>
            <Page size="A4" style={styles.page}>

                {/* ── Header ── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.companyName}>{empresa?.nombre ?? 'Empresa'}</Text>
                        {empresa?.ruc && <Text style={styles.companyMeta}>RUC: {empresa.ruc}</Text>}
                        {empresa?.direccion && <Text style={styles.companyMeta}>{empresa.direccion}</Text>}
                        <Text style={styles.periodValue}>{formatDate(fechaInicio)} — {formatDate(fechaFin)}</Text>
                        {sedeName && <Text style={styles.companyMeta}>Sede: {sedeName}</Text>}
                        <Text style={styles.generatedAt}>Generado: {now}</Text>
                    </View>
                </View>

                {/* ── Resumen del Período ── */}
                <Text style={styles.sectionTitle}>Resumen del período</Text>
                <View style={styles.kpiRow}>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>INGRESOS TOTALES</Text>
                        <Text style={styles.kpiValue}>{fmt(kpis?.ingresosPeriodo ?? 0)}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>EGRESOS TOTALES</Text>
                        <Text style={styles.kpiValue}>{fmt(kpis?.egresosPeriodo ?? 0)}</Text>
                    </View>
                    <View style={styles.kpiCard}>
                        <Text style={styles.kpiLabel}>BALANCE NETO</Text>
                        <Text style={styles.kpiValue}>{fmt(balance)}</Text>
                        <View style={styles.balanceRow}>
                            <View style={styles.balanceBadge}>
                                <Text style={styles.balanceBadgeText}>{isPositive ? '▲ Utilidad' : '▼ Pérdida'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.row2}>
                    <View style={styles.halfCard}>
                        <Text style={styles.kpiLabel}>CUENTAS POR COBRAR</Text>
                        <Text style={styles.kpiValue}>{fmt(kpis?.porCobrar ?? 0)}</Text>
                        <Text style={styles.kpiNote}>Pendiente de cobro a clientes</Text>
                    </View>
                    <View style={styles.halfCard}>
                        <Text style={styles.kpiLabel}>CUENTAS POR PAGAR</Text>
                        <Text style={styles.kpiValue}>{fmt(kpis?.porPagar ?? 0)}</Text>
                        <Text style={styles.kpiNote}>Pendiente de pago a proveedores</Text>
                    </View>
                </View>

                {/* ── Flujo Diario ── */}
                {rows.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Flujo de caja diario</Text>

                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableHeaderCell, styles.colDate]}>Fecha</Text>
                            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Ingresos</Text>
                            <Text style={[styles.tableHeaderCell, styles.colAmount]}>Egresos</Text>
                            <Text style={[styles.tableHeaderCell, styles.colBalance]}>Balance día</Text>
                        </View>

                        {rows.map((row, i) => {
                            const dayBalance = (row.ingresos ?? 0) - (row.egresos ?? 0);
                            return (
                                <View key={i} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                                    <Text style={[styles.tableCell, styles.colDate]}>{formatDate(row.fecha)}</Text>
                                    <Text style={[styles.tableCell, styles.colAmount]}>{fmt(row.ingresos ?? 0)}</Text>
                                    <Text style={[styles.tableCell, styles.colAmount]}>{fmt(row.egresos ?? 0)}</Text>
                                    <Text style={[
                                        dayBalance >= 0 ? styles.tableCellBold : styles.tableCellMuted,
                                        styles.colBalance
                                    ]}>{fmt(dayBalance)}</Text>
                                </View>
                            );
                        })}

                        {/* Totals */}
                        <View style={styles.summaryBox}>
                            <View style={styles.summaryItem}>
                                <Text style={styles.summaryLabel}>Total Ingresos</Text>
                                <Text style={styles.summaryValue}>{fmt(totalIngresosChart)}</Text>
                            </View>
                            <View style={[styles.summaryItem, styles.summaryDivider]}>
                                <Text style={styles.summaryLabel}>Total Egresos</Text>
                                <Text style={styles.summaryValue}>{fmt(totalEgresosChart)}</Text>
                            </View>
                            <View style={[styles.summaryItem, styles.summaryDivider]}>
                                <Text style={styles.summaryLabel}>Balance Total</Text>
                                <Text style={styles.summaryValue}>{fmt(totalBalanceChart)}</Text>
                            </View>
                        </View>
                    </>
                )}

                {/* ── Footer ── */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>{empresa?.nombre ?? ''} — Reporte Financiero Confidencial</Text>
                    <Text
                        style={styles.footerText}
                        render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} / ${totalPages}`}
                    />
                </View>
            </Page>
        </Document>
    );
};
