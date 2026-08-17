import React, { useState, useRef } from 'react';
import { BarcodeScannerInput } from '@/components/BarcodeScannerInput';
import moment from 'moment';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import Select from '@/components/Select';
import Pagination from '@/components/Pagination';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import { Calendar } from '@/components/Date';
import { useMovementsViewModel } from './useMovementsViewModel';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';

const ACCENT = 'var(--accent, #7551FF)';

// Pills de tipo de movimiento — punto de color + texto, estilo CRM claro.
function tipoPill(tipo: string) {
    const t = String(tipo ?? '').toUpperCase();
    switch (t) {
        case 'INGRESO': return { label: 'Ingreso', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
        case 'SALIDA': return { label: 'Salida', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' };
        case 'AJUSTE': return { label: 'Ajuste', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' };
        case 'TRANSFERENCIA': return { label: 'Transferencia', dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' };
        default: return { label: t ? t.charAt(0) + t.slice(1).toLowerCase() : '—', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-gray-400', bg: 'bg-slate-100 dark:bg-slate-700' };
    }
}

export default function MovementsView() {
    const vm = useMovementsViewModel();
    const { alert } = useAlertStore();
    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeLoading, setBarcodeLoading] = useState(false);
    const barcodeRef = useRef<HTMLInputElement>(null);

    const handleBarcodeScan = async (codigo: string) => {
        const trimmed = codigo.trim();
        if (!trimmed) return;
        setBarcodeLoading(true);
        try {
            const resp: any = await get(`productos/barcode/${encodeURIComponent(trimmed)}`);
            if (resp.code === 1 && resp.data) {
                vm.actions.selectProduct(resp.data);
                setBarcodeInput('');
            } else {
                alert(`Producto no encontrado: ${trimmed}`, 'error');
                setBarcodeInput('');
            }
        } catch {
            alert(`Código de barras no encontrado: ${trimmed}`, 'error');
            setBarcodeInput('');
        } finally {
            setBarcodeLoading(false);
            barcodeRef.current?.focus();
        }
    };

    const {
        loading,
        kardex,
        actions,
        filters,
        productQuery,
        showSuggestions,
        products,
        movimientosTable,
        pagination,
        selectedMovimiento,
        helpers,
        TIPOS_MOVIMIENTO
    } = vm;

    const renderTipoBadge = (tipo: string) => {
        const pill = tipoPill(tipo);
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {pill.label}
            </span>
        );
    };

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-500 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Kardex</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Movimientos</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shrink-0">
                        <Icon icon="solar:box-bold-duotone" width={24} height={24} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Movimientos de Kardex</h1>
                        <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5">Control de entradas, salidas y ajustes de inventario</p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="mb-5 p-5 bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-8 w-8 grid place-items-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        <Icon icon="solar:filter-bold-duotone" width={18} height={18} />
                    </div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Filtros</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                    <div>
                        <Calendar
                            text="Fecha Inicio"
                            name="fechaInicio"
                            onChange={actions.handleDate}
                            isLabel
                            value={moment(filters.fechaInicio, 'YYYY-MM-DD').format('DD/MM/YYYY')}
                        />
                    </div>
                    <div>
                        <Calendar
                            text="Fecha Fin"
                            name="fechaFin"
                            onChange={actions.handleDate}
                            isLabel
                            value={moment(filters.fechaFin, 'YYYY-MM-DD').format('DD/MM/YYYY')}
                        />
                    </div>
                    <div>
                        <Select
                            name="tipoMovimiento"
                            label="Tipo de Movimiento"
                            error={""}
                            value={filters.tipoMovimiento}
                            onChange={(id) => actions.handleFilterChange('tipoMovimiento', String(id))}
                            options={TIPOS_MOVIMIENTO.map(t => ({ id: t.value, value: t.label }))}
                            withLabel
                        />
                    </div>
                    <div className="relative">
                        <InputPro
                            name="productoSearch"
                            label="Buscar Producto"
                            isLabel
                            value={productQuery}
                            onChange={actions.handleProductSearchChange}
                            placeholder="Nombre o código..."
                            onClick={() => {
                                if (productQuery && productQuery.trim().length >= 2) actions.setShowSuggestions(true);
                            }}
                            handleOnBlur={() => setTimeout(() => actions.setShowSuggestions(false), 150)}
                        />
                        {showSuggestions && products && products.length > 0 && (
                            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl dark:shadow-none max-h-60 overflow-auto">
                                {products.map((p: any) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => actions.selectProduct(p)}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 transition-colors"
                                    >
                                        <div className="font-semibold text-slate-700 dark:text-slate-200">{p.descripcion}</div>
                                        <div className="text-xs text-slate-400 dark:text-gray-500">{p.codigo} • {p?.unidadMedida?.nombre}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Barcode scanner filter */}
                <BarcodeScannerInput
                    className="mt-4"
                    inputRef={barcodeRef}
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onScan={handleBarcodeScan}
                    loading={barcodeLoading}
                    placeholder="Escanear código de barras para filtrar movimientos..."
                />

                <div className="grid grid-cols-2 sm:flex sm:justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <Button onClick={actions.clearFilters} color="secondary" className="w-full sm:w-auto">
                        <Icon icon="solar:refresh-linear" className="mr-1" /> Limpiar
                    </Button>
                    <Button onClick={actions.applyFilters} color="primary" className="w-full sm:w-auto">
                        <Icon icon="solar:magnifer-linear" className="mr-1" /> Buscar
                    </Button>
                </div>
            </div>

            {loading && !kardex ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 flex justify-center items-center py-20">
                    <Icon icon="line-md:loading-twotone-loop" className="text-4xl" style={{ color: ACCENT }} />
                    <span className="ml-3 text-slate-400 dark:text-gray-500 font-medium">Cargando movimientos...</span>
                </div>
            ) : (
                <>
                    {/* Tabla de movimientos */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 grid place-items-center rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400">
                            <Icon icon="solar:document-text-bold-duotone" width={18} height={18} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Historial de Movimientos</h3>
                    </div>
                    <span className="text-sm text-slate-400 dark:text-gray-500 font-medium">
                        {pagination.total.toLocaleString('es-PE')} registros encontrados
                    </span>
                </div>

                {movimientosTable?.length > 0 ? (
                    <>
                        {/* Desktop table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1100px]">
                                <thead>
                                    <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500 border-b border-slate-100 dark:border-slate-700">
                                        <th className="py-3 pl-5 pr-3">Fecha</th>
                                        <th className="py-3 px-3">Producto</th>
                                        <th className="py-3 px-3">Sede</th>
                                        <th className="py-3 px-3">Tipo</th>
                                        <th className="py-3 px-3">Concepto</th>
                                        <th className="py-3 px-3 text-right">Cantidad</th>
                                        <th className="py-3 px-3 text-right">Stock Ant.</th>
                                        <th className="py-3 px-3 text-right">Stock Act.</th>
                                        <th className="py-3 px-3 text-right">Costo Unit.</th>
                                        <th className="py-3 px-3 text-right">Precio Unit.</th>
                                        <th className="py-3 px-3 text-right">Ganancia/U.</th>
                                        <th className="py-3 px-3 pr-5 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movimientosTable.map((row: any, index: number) => (
                                        <tr key={`${row.fecha}-${row.producto}-${index}`} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-3 pl-5 pr-3 text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">{row.fecha}</td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="h-8 w-8 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 grid place-items-center shrink-0">
                                                        <Icon icon="solar:box-linear" width={16} height={16} />
                                                    </div>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[200px]" title={row.producto}>{row.producto}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[140px]">{row.sede}</td>
                                            <td className="py-3 px-3">{renderTipoBadge(row.tipo)}</td>
                                            <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[220px]" title={row.concepto}>{row.concepto}</td>
                                            <td className={`py-3 px-3 text-right text-sm font-bold whitespace-nowrap ${Number(row.cantidad) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                {Number(row.cantidad) > 0 ? '+' : ''}{row.cantidad}
                                            </td>
                                            <td className="py-3 px-3 text-right text-sm text-slate-500 dark:text-gray-400">{row.stockAnterior}</td>
                                            <td className="py-3 px-3 text-right text-sm font-bold text-slate-800 dark:text-white">{row.stockActual}</td>
                                            <td className="py-3 px-3 text-right text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">{row.costoUnitario}</td>
                                            <td className="py-3 px-3 text-right text-sm text-slate-500 dark:text-gray-400 whitespace-nowrap">{row.precioUnitario}</td>
                                            <td className="py-3 px-3 text-right text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{row.gananciaUnidad}</td>
                                            <td className="py-3 px-3 pr-5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => actions.openModal(row._original)}
                                                    className="h-8 w-8 grid place-items-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                                                    title="Ver Detalle"
                                                    aria-label="Ver detalle"
                                                >
                                                    <Icon icon="solar:eye-bold" width={18} height={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="md:hidden space-y-3 p-3">
                            {movimientosTable.map((row: any, index: number) => (
                                <article key={`${row.fecha}-${row.producto}-${index}`} className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">{row.fecha}</p>
                                            <h3 className="mt-1 line-clamp-2 text-sm font-extrabold text-slate-800 dark:text-white">{row.producto}</h3>
                                            <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-gray-500">{row.sede}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => actions.openModal(row._original)}
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-violet-600 dark:text-violet-400"
                                            aria-label="Ver detalle"
                                        >
                                            <Icon icon="solar:eye-bold" width={20} height={20} />
                                        </button>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        {renderTipoBadge(row.tipo)}
                                        <p className={`text-lg font-extrabold ${Number(row.cantidad) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {Number(row.cantidad) > 0 ? '+' : ''}{row.cantidad}
                                        </p>
                                    </div>

                                    <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                        {row.concepto}
                                    </p>

                                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                                            <p className="font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Stock anterior</p>
                                            <p className="mt-1 font-extrabold text-slate-800 dark:text-white">{row.stockAnterior}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                                            <p className="font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Stock actual</p>
                                            <p className="mt-1 font-extrabold text-slate-800 dark:text-white">{row.stockActual}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                                            <p className="font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Costo</p>
                                            <p className="mt-1 font-extrabold text-slate-800 dark:text-white">{row.costoUnitario}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
                                            <p className="font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500">Precio</p>
                                            <p className="mt-1 font-extrabold text-slate-800 dark:text-white">{row.precioUnitario}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                            <Pagination
                                data={movimientosTable}
                                optionSelect
                                currentPage={vm.currentPage}
                                indexOfFirstItem={pagination.indexOfFirstItem}
                                indexOfLastItem={pagination.indexOfLastItem}
                                setcurrentPage={actions.setcurrentPage}
                                setitemsPerPage={actions.setitemsPerPage}
                                pages={pagination.pages}
                                total={pagination.total}
                            />
                        </div>
                    </>
                ) : (
                    <div className="py-16 text-center">
                        <Icon icon="solar:box-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-gray-400 font-medium">No se encontraron movimientos</p>
                        <p className="text-sm text-slate-400 dark:text-gray-500 mt-1">Ajusta los filtros o selecciona un rango de fechas diferente</p>
                    </div>
                )}
            </div>
            </>
            )}

            {/* Modal de Detalle */}
            <Modal
                isOpenModal={!!selectedMovimiento}
                closeModal={actions.closeModal}
                title="Detalle del Movimiento"
                position="right"
                height="auto"
                width="450px"
            >
                {selectedMovimiento && (
                    <div className="flex flex-col gap-6 p-6">
                        <div className="flex flex-col gap-6">
                            {/* Transaction Details */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                                    <Icon icon="solar:clipboard-list-linear" className="text-slate-400 dark:text-gray-500" />
                                    <h5 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                                        Detalles Operación
                                    </h5>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 dark:text-gray-500 mb-1">Fecha</label>
                                        <div className="text-sm font-medium text-slate-800 dark:text-white">
                                            {helpers.formatDate(selectedMovimiento.fecha)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 dark:text-gray-500 mb-1">Cantidad</label>
                                        <div className="text-sm font-bold text-slate-800 dark:text-white">
                                            {parseFloat(Number(selectedMovimiento.cantidad ?? 0).toFixed(3))} {selectedMovimiento.producto?.unidadMedida?.codigo || 'UN'}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 dark:text-gray-500 mb-1">Concepto</label>
                                    <p className="text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 p-3 rounded-xl">
                                        {String(selectedMovimiento.concepto ?? '').replace(/(\d+\.\d{1,3})\d+/g, '$1')}
                                    </p>
                                </div>

                                {selectedMovimiento.lote && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 dark:text-gray-500 mb-1">Lote</label>
                                        <p className="text-sm font-medium text-slate-800 dark:text-white">{selectedMovimiento.lote}</p>
                                    </div>
                                )}
                            </div>

                            {/* Financial & Stock */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
                                    <Icon icon="solar:chart-square-linear" className="text-slate-400 dark:text-gray-500" />
                                    <h5 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                                        Valores y Stock
                                    </h5>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl text-center">
                                        <label className="block text-xs font-medium text-slate-400 dark:text-gray-500 mb-1">Stock Anterior</label>
                                        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 leading-none">{parseFloat(Number(selectedMovimiento.stockAnterior ?? 0).toFixed(3))}</p>
                                    </div>
                                    <div className="bg-violet-50 dark:bg-violet-900/20 p-3 rounded-xl border border-violet-100 dark:border-violet-900/30 text-center">
                                        <label className="block text-xs font-medium text-violet-600 dark:text-violet-400 mb-1">Stock Actual</label>
                                        <p className="text-lg font-bold text-violet-700 dark:text-violet-400 leading-none">{parseFloat(Number(selectedMovimiento.stockActual ?? 0).toFixed(3))}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 dark:text-gray-500 mb-1">Costo Unit.</label>
                                        <p className="text-sm font-medium text-slate-800 dark:text-white">{
                                            !isNaN(Number(selectedMovimiento.costoUnitario)) ? helpers.formatCurrency(Number(selectedMovimiento.costoUnitario)) : '-'
                                        }</p>
                                    </div>
                                    {selectedMovimiento.valorTotal && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-400 dark:text-gray-500 mb-1">Valor Total</label>
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{
                                                !isNaN(Number(selectedMovimiento.valorTotal)) ? helpers.formatCurrency(Number(selectedMovimiento.valorTotal)) : '-'
                                            }</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer: Metadata */}
                        {(selectedMovimiento.usuario || selectedMovimiento.comprobante) && (
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mt-auto flex flex-col gap-2 text-xs text-slate-500 dark:text-gray-400">
                                {selectedMovimiento.usuario && (
                                    <div className="flex items-center gap-2">
                                        <Icon icon="solar:user-circle-linear" width={16} />
                                        <span>Responsable: <span className="font-medium text-slate-700 dark:text-slate-200">{selectedMovimiento.usuario.nombre}</span></span>
                                    </div>
                                )}
                                {selectedMovimiento.comprobante && (
                                    <div className="flex items-center gap-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                                        <Icon icon="solar:document-linear" width={16} />
                                        <span>Documento: <span className="font-medium text-slate-700 dark:text-slate-200">
                                            {selectedMovimiento.comprobante.tipoDoc} {selectedMovimiento.comprobante.serie}-{selectedMovimiento.comprobante.correlativo}
                                        </span></span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
