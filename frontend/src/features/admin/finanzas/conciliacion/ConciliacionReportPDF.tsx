import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { IResultadoConciliacion } from './ConciliacionModel';

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
    kpiRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
    kpi: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, padding: 8 },
    kpiLabel: { fontSize: 6.5, color: '#6b7280', marginBottom: 4 },
    kpiValue: { fontSize: 12, fontWeight: 'bold' },
    kpiSub: { fontSize: 6.5, color: '#9ca3af', marginTop: 2 },
    section: { fontSize: 9, fontWeight: 'bold', marginTop: 10, marginBottom: 6, textTransform: 'uppercase' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#111827', paddingVertical: 5, paddingHorizontal: 6 },
    th: { color: '#fff', fontSize: 7, fontWeight: 'bold' },
    row: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    alt: { backgroundColor: '#fafafa' },
    cell: { fontSize: 7, color: '#374151' },
    bold: { fontWeight: 'bold', color: '#111827' },
    ok: { color: '#059669', fontWeight: 'bold' },
    pend: { color: '#d97706', fontWeight: 'bold' },
    diff: { color: '#e11d48', fontWeight: 'bold' },
    // Movimientos del banco
    cFecha: { width: '11%' },
    cOp: { width: '14%' },
    cDesc: { width: '25%' },
    cMonto: { width: '12%', textAlign: 'right', paddingRight: 8 },
    cEstado: { width: '12%', paddingLeft: 4 },
    cDoc: { width: '14%' },
    cDif: { width: '12%', textAlign: 'right' },
    // Pendientes de sistema
    pOrigen: { width: '10%' },
    pDoc: { width: '16%' },
    pContra: { width: '24%' },
    pOp: { width: '16%' },
    pMetodo: { width: '13%' },
    pFecha: { width: '11%' },
    pMonto: { width: '10%', textAlign: 'right' },
    obsBox: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, padding: 8, backgroundColor: '#fafafa' },
    obsText: { fontSize: 8, color: '#374151', lineHeight: 1.4 },
    footer: { position: 'absolute', bottom: 20, left: 32, right: 32, borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
    footerText: { fontSize: 7, color: '#9ca3af' },
    empty: { fontSize: 7, color: '#9ca3af', paddingVertical: 6, paddingHorizontal: 6 },
});

const fmt = (n: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n || 0);

export function ConciliacionReportPDF({
    data,
    empresa,
    rango,
    observaciones,
}: {
    data: IResultadoConciliacion;
    empresa: { nombre?: string; ruc?: string; direccion?: string } | null;
    rango?: { desde?: string; hasta?: string };
    observaciones?: string;
}) {
    const obs = (observaciones ?? '').trim();
    const now = new Date().toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
    const r = data.resumen;
    const periodo =
        rango?.desde || rango?.hasta
            ? `${rango?.desde || '…'} a ${rango?.hasta || '…'}`
            : 'Todos los movimientos';

    return (
        <Document title="Conciliación bancaria" author={empresa?.nombre}>
            <Page size="A4" orientation="landscape" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Conciliación bancaria</Text>
                        <Text style={styles.subtitle}>Cruce del estado de cuenta del banco contra los pagos del sistema</Text>
                    </View>
                    <View>
                        <Text style={styles.company}>{empresa?.nombre ?? 'Empresa'}</Text>
                        {empresa?.ruc ? <Text style={styles.meta}>RUC: {empresa.ruc}</Text> : null}
                        <Text style={styles.meta}>Periodo: {periodo}</Text>
                        <Text style={styles.meta}>Generado: {now}</Text>
                    </View>
                </View>

                <View style={styles.kpiRow}>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>MOV. BANCO</Text>
                        <Text style={styles.kpiValue}>{r.movimientosBanco}</Text>
                        <Text style={styles.kpiSub}>{fmt(r.montoBanco)}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>CONCILIADOS</Text>
                        <Text style={[styles.kpiValue, styles.ok]}>{r.conciliados}</Text>
                        <Text style={styles.kpiSub}>{fmt(r.montoConciliado)}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>PEND. BANCO</Text>
                        <Text style={[styles.kpiValue, styles.pend]}>{r.pendientesBanco}</Text>
                        <Text style={styles.kpiSub}>{fmt(r.montoPendienteBanco)}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>PEND. SISTEMA</Text>
                        <Text style={styles.kpiValue}>{r.pendientesSistema}</Text>
                        <Text style={styles.kpiSub}>sin match en banco</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>DIFS. DE MONTO</Text>
                        <Text style={[styles.kpiValue, styles.diff]}>{r.diferenciasMonto}</Text>
                        <Text style={styles.kpiSub}>montos que no cuadran</Text>
                    </View>
                </View>

                <Text style={styles.section}>Movimientos del banco</Text>
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, styles.cFecha]}>Fecha</Text>
                    <Text style={[styles.th, styles.cOp]}>N° Operación</Text>
                    <Text style={[styles.th, styles.cDesc]}>Descripción</Text>
                    <Text style={[styles.th, styles.cMonto]}>Monto banco</Text>
                    <Text style={[styles.th, styles.cEstado]}>Estado</Text>
                    <Text style={[styles.th, styles.cDoc]}>Doc. sistema</Text>
                    <Text style={[styles.th, styles.cDif]}>Diferencia</Text>
                </View>
                {data.movimientos.map((m, idx) => (
                    <View key={idx} style={[styles.row, idx % 2 ? styles.alt : {}]} wrap={false}>
                        <Text style={[styles.cell, styles.cFecha]}>{m.fecha ?? '-'}</Text>
                        <Text style={[styles.cell, styles.cOp]}>{m.operacion}</Text>
                        <Text style={[styles.cell, styles.cDesc]}>{m.descripcion || '-'}</Text>
                        <Text style={[styles.cell, styles.cMonto, styles.bold]}>{fmt(m.monto)}</Text>
                        <Text style={[styles.cell, styles.cEstado, m.estado === 'CONCILIADO' ? styles.ok : styles.pend]}>
                            {m.estado === 'CONCILIADO' ? 'Conciliado' : 'Pendiente'}
                        </Text>
                        <Text style={[styles.cell, styles.cDoc]}>{m.match ? m.match.documento : '-'}</Text>
                        <Text style={[styles.cell, styles.cDif, m.match && Math.abs(m.match.diferenciaMonto) > 0.01 ? styles.diff : {}]}>
                            {m.match ? fmt(m.match.diferenciaMonto) : '-'}
                        </Text>
                    </View>
                ))}
                {data.movimientos.length === 0 && <Text style={styles.empty}>Sin movimientos.</Text>}

                {data.sistemaPendientes.length > 0 && (
                    <>
                        <Text style={styles.section}>Pagos del sistema sin coincidencia en el banco</Text>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.th, styles.pOrigen]}>Origen</Text>
                            <Text style={[styles.th, styles.pDoc]}>Documento</Text>
                            <Text style={[styles.th, styles.pContra]}>Contraparte</Text>
                            <Text style={[styles.th, styles.pOp]}>N° Operación</Text>
                            <Text style={[styles.th, styles.pMetodo]}>Método</Text>
                            <Text style={[styles.th, styles.pFecha]}>Fecha</Text>
                            <Text style={[styles.th, styles.pMonto]}>Monto</Text>
                        </View>
                        {data.sistemaPendientes.map((p, idx) => (
                            <View key={idx} style={[styles.row, idx % 2 ? styles.alt : {}]} wrap={false}>
                                <Text style={[styles.cell, styles.pOrigen]}>{p.origen === 'VENTA' ? 'Venta' : 'Compra'}</Text>
                                <Text style={[styles.cell, styles.pDoc]}>{p.documento}</Text>
                                <Text style={[styles.cell, styles.pContra]}>{p.contraparte}</Text>
                                <Text style={[styles.cell, styles.pOp]}>{p.operacion}</Text>
                                <Text style={[styles.cell, styles.pMetodo]}>{p.medioPago}</Text>
                                <Text style={[styles.cell, styles.pFecha]}>{p.fecha}</Text>
                                <Text style={[styles.cell, styles.pMonto, styles.bold]}>{fmt(p.monto)}</Text>
                            </View>
                        ))}
                    </>
                )}

                {obs ? (
                    <>
                        <Text style={styles.section}>Observaciones</Text>
                        <View style={styles.obsBox}>
                            <Text style={styles.obsText}>{obs}</Text>
                        </View>
                    </>
                ) : null}

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Falconext · Finanzas</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Conciliación bancaria · ${pageNumber}/${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}
