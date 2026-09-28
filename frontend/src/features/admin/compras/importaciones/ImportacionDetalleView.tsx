import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import moment from 'moment';
import Button from '@/components/Button';
import ModalConfirm from '@/components/ModalConfirm';
import Select from '@/components/Select';
import { useSedesStore } from '@/zustand/sedes';
import { useImportacionDetalleViewModel } from './useImportacionDetalleViewModel';
import ModalGastoImportacion from './ModalGastoImportacion';
import ModalEditarItemsImportacion from './ModalEditarItemsImportacion';
import { usePuedeEscribir } from '@/hooks/usePuedeEscribir';
import {
    ESTADO_IMPORTACION_FLUJO,
    ESTADO_IMPORTACION_LABEL,
    ESTADO_IMPORTACION_STYLE,
    TIPO_GASTO_LABEL,
    fmtMoneda,
} from './ImportacionesModel';

const TABS: { key: 'items' | 'gastos' | 'liquidacion'; label: string; icon: string }[] = [
    { key: 'items', label: 'Ítems', icon: 'solar:box-bold-duotone' },
    { key: 'gastos', label: 'Gastos asociados', icon: 'solar:bill-list-bold-duotone' },
    { key: 'liquidacion', label: 'Liquidación', icon: 'solar:calculator-bold-duotone' },
];

export default function ImportacionDetalleView() {
    const vm = useImportacionDetalleViewModel();
    const { importacion, loading, tab, actions } = vm;
    const { sedes, listarSedes } = useSedesStore();
    const puedeEscribir = usePuedeEscribir('compras:escribir');

    useEffect(() => { listarSedes(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading || !importacion) {
        return <div className="p-8 text-center text-gray-400">Cargando importación...</div>;
    }

    // Contabilidad consulta la importación para cuadrar costos y gastos, pero no
    // la mueve de estado ni la nacionaliza: eso ingresa mercadería al almacén.
    const editable = puedeEscribir && importacion.estado !== 'NACIONALIZADA';
    const puedeAvanzarEstado =
        puedeEscribir &&
        (importacion.estado === 'BORRADOR' || importacion.estado === 'EN_TRANSITO');
    const stepIndex = ESTADO_IMPORTACION_FLUJO.indexOf(importacion.estado);

    const gastosCapitalizan = (importacion.gastos || []).filter((g) => g.afectaCosto);
    const gastosNoCapitalizan = (importacion.gastos || []).filter((g) => !g.afectaCosto);

    return (
        <div className="p-4 md:p-6 space-y-5">
            <button onClick={actions.volver} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600 dark:text-gray-400">
                <Icon icon="solar:arrow-left-linear" width={16} /> Volver a importaciones
            </button>

            {/* Header */}
            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            {importacion.numero}
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${ESTADO_IMPORTACION_STYLE[importacion.estado]}`}>
                                {ESTADO_IMPORTACION_LABEL[importacion.estado]}
                            </span>
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{importacion.descripcion || 'Sin descripción'}</p>
                    </div>
                    <div className="flex gap-2">
                        {puedeAvanzarEstado && importacion.estado === 'BORRADOR' && (
                            <Button color="secondary" outline onClick={() => actions.cambiarEstado('EN_TRANSITO')}>Marcar en tránsito</Button>
                        )}
                        {puedeAvanzarEstado && importacion.estado === 'EN_TRANSITO' && (
                            <Button color="secondary" outline onClick={() => actions.cambiarEstado('EN_ADUANA')}>Marcar en aduana</Button>
                        )}
                        {editable && importacion.estado !== 'ANULADA' && (
                            <Button color="danger" outline onClick={() => actions.cambiarEstado('ANULADA')}>Anular</Button>
                        )}
                    </div>
                </div>

                {/* Stepper */}
                {importacion.estado !== 'ANULADA' && (
                    <div className="flex items-center mt-5">
                        {ESTADO_IMPORTACION_FLUJO.map((estado, idx) => (
                            <div key={estado} className="flex items-center flex-1 last:flex-none">
                                <div className="flex flex-col items-center gap-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx <= stepIndex ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-400 dark:bg-slate-700'}`}>
                                        {idx < stepIndex ? <Icon icon="solar:check-circle-bold" width={16} /> : idx + 1}
                                    </div>
                                    <span className={`text-[10px] font-semibold uppercase text-center ${idx <= stepIndex ? 'text-violet-600' : 'text-gray-400'}`}>{ESTADO_IMPORTACION_LABEL[estado]}</span>
                                </div>
                                {idx < ESTADO_IMPORTACION_FLUJO.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-2 ${idx < stepIndex ? 'bg-violet-600' : 'bg-gray-100 dark:bg-slate-700'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5 pt-5 border-t border-gray-100 dark:border-slate-700">
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-semibold">Proveedor</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{importacion.proveedor?.nombre || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-semibold">Incoterm</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{importacion.incoterm}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-semibold">Moneda / TC</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{importacion.moneda} · {Number(importacion.tipoCambio).toFixed(4)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-semibold">Factura proveedor</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{importacion.numeroFactura || '-'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400 uppercase font-semibold">DUA</p>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{importacion.numeroDua || '-'}</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-100 dark:border-slate-700">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => actions.setTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${tab === t.key ? 'border-violet-600 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        <Icon icon={t.icon} width={16} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Tab: Items */}
            {tab === 'items' && (
                <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 dark:text-white">Ítems importados</h3>
                        {editable && (
                            <Button color="secondary" outline onClick={actions.openEditarItems}>
                                <Icon icon="solar:pen-bold" width={16} /> Editar ítems
                            </Button>
                        )}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                                    <th className="py-2">Producto</th>
                                    <th className="py-2 text-right">Cantidad</th>
                                    <th className="py-2 text-right">FOB unit.</th>
                                    <th className="py-2 text-right">Subtotal FOB</th>
                                    <th className="py-2 text-right">Peso Kg</th>
                                    <th className="py-2 text-right">Ad valorem %</th>
                                    {importacion.estado !== 'BORRADOR' && importacion.estado !== 'EN_TRANSITO' && importacion.estado !== 'EN_ADUANA' && (
                                        <th className="py-2 text-right">Costo unit. nacionalizado</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {(importacion.items || []).map((item) => (
                                    <tr key={item.id} className="border-b border-gray-50 dark:border-slate-800">
                                        <td className="py-2">
                                            <div className="font-medium">{item.producto?.codigo} - {item.producto?.descripcion || item.descripcion}</div>
                                        </td>
                                        <td className="py-2 text-right">{Number(item.cantidad).toLocaleString('es-PE')} {item.unidad}</td>
                                        <td className="py-2 text-right">{importacion.moneda} {Number(item.precioFobUnitario).toFixed(4)}</td>
                                        <td className="py-2 text-right">{importacion.moneda} {(Number(item.cantidad) * Number(item.precioFobUnitario)).toFixed(2)}</td>
                                        <td className="py-2 text-right">{item.pesoKg || '-'}</td>
                                        <td className="py-2 text-right">{item.adValoremPorcentaje != null ? `${item.adValoremPorcentaje}%` : '-'}</td>
                                        {(importacion.estado === 'LIQUIDADA' || importacion.estado === 'NACIONALIZADA') && (
                                            <td className="py-2 text-right font-semibold">S/ {Number(item.costoUnitarioFinal).toFixed(4)}</td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab: Gastos */}
            {tab === 'gastos' && (
                <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 dark:text-white">Gastos asociados</h3>
                        {editable && (
                            <Button color="violet" onClick={actions.openNuevoGasto}>
                                <Icon icon="solar:add-circle-bold" width={18} /> Agregar gasto
                            </Button>
                        )}
                    </div>

                    <GastosTable
                        titulo="Capitalizan al costo"
                        gastos={gastosCapitalizan}
                        editable={editable}
                        onEditar={actions.openEditarGasto}
                        onEliminar={actions.eliminarGasto}
                    />
                    <div className="mt-6">
                        <GastosTable
                            titulo="Crédito fiscal (no capitalizan)"
                            gastos={gastosNoCapitalizan}
                            editable={editable}
                            onEditar={actions.openEditarGasto}
                            onEliminar={actions.eliminarGasto}
                        />
                    </div>
                </div>
            )}

            {/* Tab: Liquidación */}
            {tab === 'liquidacion' && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <KpiCard label="Valor FOB" value={fmtMoneda(importacion.valorFobPen, 'PEN')} sub={fmtMoneda(importacion.valorFob, importacion.moneda)} />
                        <KpiCard label="Gastos que capitalizan" value={fmtMoneda(importacion.totalGastosCosto, 'PEN')} />
                        <KpiCard label="Crédito fiscal (no capitaliza)" value={fmtMoneda(importacion.totalGastosNoCosto, 'PEN')} />
                        <KpiCard label="Costo nacionalizado" value={fmtMoneda(importacion.costoTotalNacionalizado, 'PEN')} highlight />
                        <KpiCard label="Factor de costo" value={Number(importacion.factorCosto || 1).toFixed(4)} />
                    </div>

                    <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 p-5">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                                        <th className="py-2">Producto</th>
                                        <th className="py-2 text-right">Cantidad</th>
                                        <th className="py-2 text-right">FOB unit. ({importacion.moneda})</th>
                                        <th className="py-2 text-right">FOB S/</th>
                                        <th className="py-2 text-right">Gastos asignados S/</th>
                                        <th className="py-2 text-right">Costo unit. nacionalizado S/</th>
                                        <th className="py-2 text-right">Costo promedio actual S/</th>
                                        <th className="py-2 text-right">Variación %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(importacion.items || []).map((item) => {
                                        const costoPromedioActual = item.costoPromedioActual ?? Number(item.producto?.costoPromedio || 0);
                                        const variacion = item.variacionPorcentaje ?? (costoPromedioActual > 0
                                            ? ((Number(item.costoUnitarioFinal) - costoPromedioActual) / costoPromedioActual) * 100
                                            : null);
                                        return (
                                            <tr key={item.id} className="border-b border-gray-50 dark:border-slate-800">
                                                <td className="py-2">{item.producto?.codigo} - {item.producto?.descripcion || item.descripcion}</td>
                                                <td className="py-2 text-right">{Number(item.cantidad).toLocaleString('es-PE')}</td>
                                                <td className="py-2 text-right">{Number(item.precioFobUnitario).toFixed(4)}</td>
                                                <td className="py-2 text-right">{Number(item.costoFobPen).toFixed(2)}</td>
                                                <td className="py-2 text-right">{Number(item.gastosAsignados).toFixed(2)}</td>
                                                <td className="py-2 text-right font-bold text-violet-600 dark:text-violet-400">{Number(item.costoUnitarioFinal).toFixed(4)}</td>
                                                <td className="py-2 text-right">{costoPromedioActual.toFixed(4)}</td>
                                                <td className={`py-2 text-right font-semibold ${variacion != null && variacion > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    {variacion != null ? `${variacion > 0 ? '+' : ''}${variacion.toFixed(1)}%` : '-'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col md:flex-row justify-end gap-2 mt-5 pt-5 border-t border-gray-100 dark:border-slate-700">
                            {editable && (
                                <Button color="secondary" outline isLoading={vm.liquidando} onClick={actions.liquidar}>
                                    <Icon icon="solar:calculator-bold-duotone" width={18} /> Calcular liquidación
                                </Button>
                            )}
                            {puedeEscribir && (
                                <Button
                                    color="violet"
                                    disabled={importacion.estado !== 'LIQUIDADA'}
                                    onClick={actions.openNacionalizarConfirm}
                                >
                                    <Icon icon="solar:box-bold-duotone" width={18} /> Nacionalizar e ingresar a almacén
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modales */}
            <ModalGastoImportacion
                isOpen={vm.showGastoModal}
                importacionId={importacion.id}
                moneda={importacion.moneda}
                tipoCambio={Number(importacion.tipoCambio)}
                gasto={vm.gastoEdit}
                onClose={actions.closeGastoModal}
                onSuccess={actions.handleGastoSuccess}
            />

            <ModalEditarItemsImportacion
                isOpen={vm.showEditarItems}
                importacion={importacion}
                onClose={actions.closeEditarItems}
                onSuccess={actions.handleEditarItemsSuccess}
            />

            <ModalConfirm
                isOpenModal={vm.showNacionalizarConfirm}
                setIsOpenModal={(v) => (v ? actions.openNacionalizarConfirm() : actions.closeNacionalizarConfirm())}
                confirmSubmit={actions.confirmNacionalizar}
                title="Nacionalizar importación"
                information={`Se registrará el ingreso a almacén de ${importacion.items?.length || 0} ítem(s) con el costo unitario nacionalizado calculado. Esta acción no se puede deshacer.`}
                confirmText="Nacionalizar"
                confirmColor="violet"
                confirmLoading={vm.nacionalizando}
            >
                <div className="mt-3">
                    <Select
                        label="Sede de ingreso"
                        name="sedeNacionalizar"
                        options={sedes.map((s) => ({ id: s.id, value: s.nombre }))}
                        value={sedes.find((s) => s.id === (vm.sedeIdNacionalizar ?? importacion.sedeId))?.nombre}
                        onChange={(id) => actions.setSedeIdNacionalizar(Number(id))}
                        error={null}
                    />
                </div>
            </ModalConfirm>
        </div>
    );
}

function KpiCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
    return (
        <div className={`rounded-2xl border p-4 ${highlight ? 'bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800' : 'bg-white border-gray-100 dark:bg-slate-800/60 dark:border-slate-700'}`}>
            <p className="text-[11px] uppercase font-semibold text-gray-400">{label}</p>
            <p className={`text-lg font-bold mt-1 ${highlight ? 'text-violet-700 dark:text-violet-300' : 'text-gray-800 dark:text-white'}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}

function GastosTable({ titulo, gastos, editable, onEditar, onEliminar }: {
    titulo: string;
    gastos: any[];
    editable: boolean;
    onEditar: (g: any) => void;
    onEliminar: (id: number) => void;
}) {
    if (gastos.length === 0) {
        return (
            <div>
                <p className="text-xs uppercase font-semibold text-gray-400 mb-2">{titulo}</p>
                <p className="text-sm text-gray-400 italic">Sin gastos registrados.</p>
            </div>
        );
    }
    const total = gastos.reduce((s, g) => s + Number(g.montoPen || 0), 0);
    return (
        <div>
            <p className="text-xs uppercase font-semibold text-gray-400 mb-2">{titulo}</p>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-700">
                            <th className="py-2">Tipo</th>
                            <th className="py-2">Proveedor / documento</th>
                            <th className="py-2">Fecha</th>
                            <th className="py-2">Base prorrateo</th>
                            <th className="py-2 text-right">Monto</th>
                            <th className="py-2 text-right">Monto S/</th>
                            {editable && <th></th>}
                        </tr>
                    </thead>
                    <tbody>
                        {gastos.map((g) => (
                            <tr key={g.id} className="border-b border-gray-50 dark:border-slate-800">
                                <td className="py-2 font-medium">{TIPO_GASTO_LABEL[g.tipo] || g.tipo}{g.descripcion === 'Calculado' && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">Auto</span>}</td>
                                <td className="py-2 text-gray-500">{[g.proveedorNombre, g.numeroDocumento].filter(Boolean).join(' · ') || g.descripcion || '-'}</td>
                                <td className="py-2 text-gray-500">{g.fecha ? moment(g.fecha).format('DD/MM/YYYY') : '-'}</td>
                                <td className="py-2 text-gray-500">{g.baseProrrateo}</td>
                                <td className="py-2 text-right">{g.moneda} {Number(g.monto).toFixed(2)}</td>
                                <td className="py-2 text-right font-semibold">S/ {Number(g.montoPen).toFixed(2)}</td>
                                {editable && (
                                    <td className="py-2 text-right whitespace-nowrap">
                                        {g.descripcion !== 'Calculado' && (
                                            <>
                                                <button onClick={() => onEditar(g)} className="text-gray-400 hover:text-violet-600 mr-2">
                                                    <Icon icon="solar:pen-bold" width={16} />
                                                </button>
                                                <button onClick={() => onEliminar(g.id)} className="text-gray-400 hover:text-rose-500">
                                                    <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={5} className="py-2 text-right font-semibold">Total</td>
                            <td className="py-2 text-right font-bold">S/ {total.toFixed(2)}</td>
                            {editable && <td></td>}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
