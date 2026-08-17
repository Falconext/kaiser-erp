import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { get } from '@/utils/fetch';
import {
    GastoOperativo,
    IngresoManual,
    formatCurrency,
    formatDate,
    getCategoriaIcon,
    getCategoriaLabel,
    esFinanciamiento,
    TIPOS_INGRESO
} from '../RentabilidadModel';

interface HistorialFinancieroDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onEditarGasto: (gasto: GastoOperativo) => void;
    onEliminarGasto: (id: number) => void;
    onEditarIngreso: (ingreso: IngresoManual) => void;
    onEliminarIngreso: (id: number) => void;
}

export default function HistorialFinancieroDrawer({
    isOpen,
    onClose,
    onEditarGasto,
    onEliminarGasto,
    onEditarIngreso,
    onEliminarIngreso
}: HistorialFinancieroDrawerProps) {
    const [tab, setTab] = useState<'gastos' | 'ingresos'>('gastos');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');

    const [gastos, setGastos] = useState<GastoOperativo[]>([]);
    const [ingresos, setIngresos] = useState<IngresoManual[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize dates on open if empty
    useEffect(() => {
        if (isOpen && !fechaInicio && !fechaFin) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
            setFechaInicio(`${year}-${month}-01`);
            setFechaFin(`${year}-${month}-${day}`);
        }
    }, [isOpen]);

    const fetchData = async () => {
        if (!fechaInicio || !fechaFin) return;
        setIsLoading(true);
        try {
            if (tab === 'gastos') {
                const res = await get<GastoOperativo[]>(`analisis-financiero/gastos/historial?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
                if (res.data) setGastos(res.data);
            } else {
                const res = await get<{ items: IngresoManual[] }>(`finanzas/ingresos-manuales?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
                if (res.data?.items) setIngresos(res.data.items);
            }
        } catch (e) {
            console.error('Error fetching historial', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen, tab, fechaInicio, fechaFin]);

    if (!isOpen) return null;

    return createPortal(
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 z-[9999999] bg-black/30 backdrop-blur-[2px]"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 bottom-0 z-[9999999] w-full max-w-[420px] bg-white dark:bg-[#0F1219] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Icon icon="solar:history-bold-duotone" className="text-indigo-500" />
                            Historial Financiero
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            Visualiza y filtra tus registros libremente
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400"
                    >
                        <Icon icon="solar:close-bold" width={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-800 space-y-3 flex-shrink-0">
                    {/* Tabs */}
                    <div className="flex bg-gray-100 dark:bg-slate-800/50 p-1 rounded-xl">
                        <button
                            onClick={() => setTab('gastos')}
                            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === 'gastos'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Gastos
                        </button>
                        <button
                            onClick={() => setTab('ingresos')}
                            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${tab === 'ingresos'
                                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Ingresos
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex-1">
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Desde</label>
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Hasta</label>
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-indigo-500 transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50 dark:bg-[#0F1219]">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Icon icon="mdi:loading" className="animate-spin text-2xl text-indigo-500" />
                        </div>
                    ) : tab === 'gastos' ? (
                        gastos.length === 0 ? (
                            <p className="text-center text-sm text-gray-500 py-10">No hay gastos en este rango</p>
                        ) : (
                            gastos.map(gasto => (
                                <div key={gasto.id} className="group flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-transparent hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-colors">
                                    <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                        <Icon icon={getCategoriaIcon(gasto.categoria)} className="text-base text-amber-500 dark:text-amber-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {gasto.etiqueta ? gasto.etiqueta : getCategoriaLabel(gasto.categoria)}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {gasto.etiqueta && (
                                                <span className="text-xs text-indigo-500 font-medium">{getCategoriaLabel(gasto.categoria)}</span>
                                            )}
                                            {(gasto.fecha || gasto.fechaInicio) && (
                                                <span className="text-xs text-gray-400">
                                                    {gasto.recurrenteDiario ? `Desde ${formatDate(gasto.fechaInicio ?? gasto.fecha ?? '')}` : formatDate(gasto.fecha ?? '')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                                            {formatCurrency(Number(gasto.monto))}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEditarGasto(gasto)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg"><Icon icon="solar:pen-bold" /></button>
                                        <button onClick={() => onEliminarGasto(gasto.id)} className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg"><Icon icon="solar:trash-bin-trash-bold" /></button>
                                    </div>
                                </div>
                            ))
                        )
                    ) : (
                        ingresos.length === 0 ? (
                            <p className="text-center text-sm text-gray-500 py-10">No hay ingresos en este rango</p>
                        ) : (
                            ingresos.map(ingreso => (
                                <div key={ingreso.id} className="group flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-transparent hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-colors">
                                    <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                                        <Icon icon="solar:arrow-down-bold-duotone" className="text-base text-emerald-500 dark:text-emerald-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{ingreso.concepto}</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs font-medium ${esFinanciamiento(ingreso.tipo) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                {TIPOS_INGRESO.find(t => t.key === ingreso.tipo)?.label ?? ingreso.tipo}
                                            </span>
                                            {ingreso.fecha && (
                                                <span className="text-xs text-gray-400">
                                                    {new Date(ingreso.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <span className={`text-sm font-bold tabular-nums ${esFinanciamiento(ingreso.tipo) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {formatCurrency(Number(ingreso.monto))}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => onEditarIngreso(ingreso)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg"><Icon icon="solar:pen-bold" /></button>
                                        <button onClick={() => onEliminarIngreso(ingreso.id)} className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg"><Icon icon="solar:trash-bin-trash-bold" /></button>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>
        </>,
        document.body
    );
}
