import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import Button from '@/components/Button';
import { useImportacionesViewModel } from './useImportacionesViewModel';
import ModalNuevaImportacion from './ModalNuevaImportacion';
import { usePuedeEscribir } from '@/hooks/usePuedeEscribir';
import {
    ESTADO_FILTRO_OPTIONS,
    ESTADO_IMPORTACION_LABEL,
    ESTADO_IMPORTACION_STYLE,
    fmtMoneda,
} from './ImportacionesModel';

export default function ImportacionesView() {
    const navigate = useNavigate();
    const vm = useImportacionesViewModel();
    const { importaciones, loading, filters, showNuevaModal, actions } = vm;
    const puedeEscribir = usePuedeEscribir('compras:escribir');

    useEffect(() => {
        actions.cargar();
    }, [vm.debounce, filters.estado]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="p-4 md:p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Icon icon="solar:global-bold-duotone" className="text-violet-600" width={26} />
                        Importaciones
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Importación → gastos asociados → liquidación → costo nacionalizado
                    </p>
                </div>
                {puedeEscribir && (
                    <Button color="violet" onClick={actions.openNueva}>
                        <Icon icon="solar:add-circle-bold" width={18} /> Nueva importación
                    </Button>
                )}
            </div>

            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1">
                    <InputPro
                        name="search"
                        placeholder="Buscar por número, factura, DUA o proveedor..."
                        value={filters.search}
                        onChange={(e) => actions.setSearch(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-64">
                    <Select
                        label="Estado"
                        name="estadoFiltro"
                        withLabel={false}
                        options={ESTADO_FILTRO_OPTIONS.map((o) => ({ id: o.value, value: o.label }))}
                        value={ESTADO_FILTRO_OPTIONS.find((o) => o.value === filters.estado)?.label}
                        onChange={(id) => actions.setEstado(String(id))}
                        error={null}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/40 border-b border-gray-100 dark:border-slate-700">
                                <th className="py-3 px-4">Número</th>
                                <th className="py-3 px-4">Proveedor</th>
                                <th className="py-3 px-4">Factura</th>
                                <th className="py-3 px-4">Moneda / TC</th>
                                <th className="py-3 px-4 text-right">FOB</th>
                                <th className="py-3 px-4 text-right">Costo nacionalizado</th>
                                <th className="py-3 px-4 text-right">Factor</th>
                                <th className="py-3 px-4">Estado</th>
                                <th className="py-3 px-4"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr><td colSpan={9} className="py-8 text-center text-gray-400">Cargando...</td></tr>
                            )}
                            {!loading && importaciones.length === 0 && (
                                <tr><td colSpan={9} className="py-8 text-center text-gray-400">No hay importaciones registradas.</td></tr>
                            )}
                            {!loading && importaciones.map((imp) => (
                                <tr
                                    key={imp.id}
                                    className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40 cursor-pointer"
                                    onClick={() => navigate(`/administrador/compras/importaciones/${imp.id}`)}
                                >
                                    <td className="py-3 px-4 font-semibold text-violet-600 dark:text-violet-400">{imp.numero}</td>
                                    <td className="py-3 px-4">
                                        <div className="font-medium text-gray-800 dark:text-gray-100">{imp.proveedor?.nombre || '-'}</div>
                                        <div className="text-xs text-gray-400">{imp.proveedor?.nroDoc}</div>
                                    </td>
                                    <td className="py-3 px-4">{imp.numeroFactura || '-'}</td>
                                    <td className="py-3 px-4">{imp.moneda} · {Number(imp.tipoCambio).toFixed(4)}</td>
                                    <td className="py-3 px-4 text-right">{fmtMoneda(imp.valorFob, imp.moneda)}</td>
                                    <td className="py-3 px-4 text-right font-semibold">{fmtMoneda(imp.costoTotalNacionalizado, 'PEN')}</td>
                                    <td className="py-3 px-4 text-right">{Number(imp.factorCosto || 1).toFixed(4)}</td>
                                    <td className="py-3 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${ESTADO_IMPORTACION_STYLE[imp.estado]}`}>
                                            {ESTADO_IMPORTACION_LABEL[imp.estado]}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <Icon icon="solar:alt-arrow-right-bold" className="text-gray-400" width={18} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ModalNuevaImportacion
                isOpen={showNuevaModal}
                onClose={actions.closeNueva}
                onSuccess={(newId) => {
                    actions.handleNuevaSuccess();
                    if (newId) navigate(`/administrador/compras/importaciones/${newId}`);
                }}
            />
        </div>
    );
}
