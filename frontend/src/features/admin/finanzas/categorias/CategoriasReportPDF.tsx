import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { CategoriasResponse, formatPct, formatSoles } from './CategoriasModel';
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
    tableHeader: { flexDirection: 'row', backgroundColor: '#111827', paddingVertical: 5, paddingHorizontal: 6 },
    th: { color: '#fff', fontSize: 7, fontWeight: 'bold' },
    row: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
    alt: { backgroundColor: '#fafafa' },
    cell: { fontSize: 7, color: '#374151' },
    bold: { fontWeight: 'bold', color: '#111827' },
    cName: { width: '30%' },
    cNum: { width: '17.5%', textAlign: 'right' },
    footer: { position: 'absolute', bottom: 20, left: 32, right: 32, borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
    footerText: { fontSize: 7, color: '#9ca3af' },
});

export function CategoriasReportPDF({
    data,
    empresa,
}: {
    data: CategoriasResponse;
    empresa: { nombre?: string; ruc?: string; direccion?: string } | null;
}) {
    const now = new Date().toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
    return (
        <Document title="Rentabilidad por categorías" author={empresa?.nombre}>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Rentabilidad por categorías</Text>
                        <Text style={styles.subtitle}>Ingresos, costos y ganancia bruta por categoría</Text>
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
                        <Text style={styles.kpiLabel}>INGRESOS</Text>
                        <Text style={styles.kpiValue}>{formatSoles(data.ingresoTotal)}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>GANANCIA</Text>
                        <Text style={styles.kpiValue}>{formatSoles(data.gananciaTotal)}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>MARGEN</Text>
                        <Text style={styles.kpiValue}>{formatPct(data.margenPromedio)}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>CATEGORÍAS</Text>
                        <Text style={styles.kpiValue}>{data.totalCategorias}</Text>
                    </View>
                </View>

                <Text style={styles.section}>Resumen por categoría</Text>
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, styles.cName]}>Categoría</Text>
                    <Text style={[styles.th, styles.cNum]}>Ingresos</Text>
                    <Text style={[styles.th, styles.cNum]}>Ganancia</Text>
                    <Text style={[styles.th, styles.cNum]}>Margen</Text>
                    <Text style={[styles.th, styles.cNum]}>Uds</Text>
                </View>
                {data.categorias.map((cat, idx) => (
                    <View key={cat.nombre} style={[styles.row, idx % 2 ? styles.alt : {}]}>
                        <Text style={[styles.cell, styles.cName, styles.bold]}>{cat.nombre}</Text>
                        <Text style={[styles.cell, styles.cNum]}>{formatSoles(cat.ingresoTotal)}</Text>
                        <Text style={[styles.cell, styles.cNum, styles.bold]}>{formatSoles(cat.gananciaTotal)}</Text>
                        <Text style={[styles.cell, styles.cNum]}>{formatPct(cat.margenPromedio)}</Text>
                        <Text style={[styles.cell, styles.cNum]}>{cat.unidadesVendidas}</Text>
                    </View>
                ))}

                <Text style={styles.section}>Productos principales</Text>
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, styles.cName]}>Producto</Text>
                    <Text style={[styles.th, styles.cName]}>Categoría</Text>
                    <Text style={[styles.th, styles.cNum]}>Ingreso</Text>
                    <Text style={[styles.th, styles.cNum]}>Ganancia</Text>
                    <Text style={[styles.th, styles.cNum]}>Margen</Text>
                </View>
                {data.categorias.flatMap((cat) => cat.productos.slice(0, 5).map((prod) => ({ cat: cat.nombre, prod }))).slice(0, 30).map((row, idx) => (
                    <View key={`${row.cat}-${row.prod.nombre}-${idx}`} style={[styles.row, idx % 2 ? styles.alt : {}]}>
                        <Text style={[styles.cell, styles.cName]}>{row.prod.nombre}</Text>
                        <Text style={[styles.cell, styles.cName]}>{row.cat}</Text>
                        <Text style={[styles.cell, styles.cNum]}>{formatSoles(row.prod.ingresoTotal)}</Text>
                        <Text style={[styles.cell, styles.cNum, styles.bold]}>{formatSoles(row.prod.gananciaTotal)}</Text>
                        <Text style={[styles.cell, styles.cNum]}>{formatPct(row.prod.margen)}</Text>
                    </View>
                ))}

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>{BRAND.name} · Finanzas</Text>
                    <Text style={styles.footerText}>Reporte de categorías</Text>
                </View>
            </Page>
        </Document>
    );
}
