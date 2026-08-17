import React, { useEffect, useMemo, useState } from 'react';
import { useCajaStore } from '../../../../zustand/caja';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import InputPro from '@/components/InputPro';
import useEscapeKey from '@/hooks/useEscapeKey';
import ModalRegistrarGasto from './ModalRegistrarGasto';

const ACCENT = 'var(--accent, #7551FF)';

const CajaControl: React.FC = () => {
    const {
        estadoCaja,
        loading,
        error,
        obtenerEstadoCaja,
        abrirCaja,
        cerrarCaja,
        clearError,
    } = useCajaStore();

    const [showApertura, setShowApertura] = useState(false);
    const [showCierre, setShowCierre] = useState(false);
    const [showGasto, setShowGasto] = useState(false);
    const [confirmCierre, setConfirmCierre] = useState(false);
    const [formApertura, setFormApertura] = useState({
        montoInicial: '' as string | number,
        observaciones: ''
    });
    const [formCierre, setFormCierre] = useState({
        montoEfectivo: '' as string | number,
        montoYape: '' as string | number,
        montoPlin: '' as string | number,
        montoTransferencia: '' as string | number,
        montoTarjeta: '' as string | number,
        observaciones: ''
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        obtenerEstadoCaja();
    }, [obtenerEstadoCaja]);

    const totalDeclarado = useMemo(() => {
        return (
            (parseFloat(String(formCierre.montoEfectivo)) || 0) +
            (parseFloat(String(formCierre.montoYape)) || 0) +
            (parseFloat(String(formCierre.montoPlin)) || 0) +
            (parseFloat(String(formCierre.montoTransferencia)) || 0) +
            (parseFloat(String(formCierre.montoTarjeta)) || 0)
        );
    }, [formCierre]);

    const totalSistema = useMemo(() => {
        return Number(estadoCaja?.ventasDelDia?.totalIngresos || 0);
    }, [estadoCaja]);

    const diferencia = useMemo(() => totalDeclarado - totalSistema, [totalDeclarado, totalSistema]);

    const validateApertura = () => {
        const errors: Record<string, string> = {};
        const monto = parseFloat(String(formApertura.montoInicial));
        if (isNaN(monto) || String(formApertura.montoInicial) === '') {
            errors.montoInicial = 'El monto inicial es requerido';
        } else if (monto < 0) {
            errors.montoInicial = 'El monto no puede ser negativo';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAbrirCaja = async () => {
        if (!validateApertura()) return;
        const result = await abrirCaja({
            montoInicial: parseFloat(String(formApertura.montoInicial)) || 0,
            observaciones: formApertura.observaciones,
        });
        if (result.success) {
            setShowApertura(false);
            setFormApertura({ montoInicial: '', observaciones: '' });
            setFormErrors({});
        }
    };

    const handleCerrarCaja = async () => {
        const result = await cerrarCaja({
            montoEfectivo: parseFloat(String(formCierre.montoEfectivo)) || 0,
            montoYape: parseFloat(String(formCierre.montoYape)) || 0,
            montoPlin: parseFloat(String(formCierre.montoPlin)) || 0,
            montoTransferencia: parseFloat(String(formCierre.montoTransferencia)) || 0,
            montoTarjeta: parseFloat(String(formCierre.montoTarjeta)) || 0,
            observaciones: formCierre.observaciones,
        });
        if (result.success) {
            setShowCierre(false);
            setConfirmCierre(false);
            setFormCierre({
                montoEfectivo: '',
                montoYape: '',
                montoPlin: '',
                montoTransferencia: '',
                montoTarjeta: '',
                observaciones: ''
            });
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const isAbierta = estadoCaja?.estado === 'ABIERTA';

    useEscapeKey(() => setShowApertura(false), showApertura);
    useEscapeKey(() => setShowCierre(false), showCierre);
    useEscapeKey(() => setShowGasto(false), showGasto);

    if (loading && !estadoCaja) {
        return (
            <div className="font-jakarta space-y-6">
                <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-28 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    <div className="h-28 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    <div className="h-28 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
            </div>
        );
    }

    const handleOpenCierre = () => {
        if (estadoCaja && estadoCaja.ventasDelDia) {
            const { mediosPago } = estadoCaja.ventasDelDia;
            const montoInicial = Number(estadoCaja.movimiento?.montoInicial || 0);

            setFormCierre({
                montoEfectivo: (montoInicial + Number(mediosPago.EFECTIVO || 0)).toFixed(2),
                montoYape: Number(mediosPago.YAPE || 0).toFixed(2),
                montoPlin: Number(mediosPago.PLIN || 0).toFixed(2),
                montoTransferencia: Number(mediosPago.TRANSFERENCIA || 0).toFixed(2),
                montoTarjeta: Number(mediosPago.TARJETA || 0).toFixed(2),
                observaciones: ''
            });
        }
        setShowCierre(true);
    };

    return (
        <div className="space-y-6 font-jakarta animate-in fade-in duration-500">

            {/* Error global */}
            {error && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 text-rose-600 dark:bg-rose-900/20 dark:border-rose-900/40 dark:text-rose-300 px-4 py-3 rounded-2xl">
                    <Icon icon="solar:danger-circle-bold" className="text-xl flex-shrink-0" />
                    <span className="text-sm font-semibold flex-1">{error}</span>
                    <button onClick={clearError} className="text-rose-400 hover:text-rose-600">
                        <Icon icon="solar:close-circle-bold" className="text-lg" />
                    </button>
                </div>
            )}

            {/* Hero Status Card */}
            <div className="relative overflow-hidden rounded-3xl p-8 bg-white dark:bg-[#111827] shadow-[0_2px_20px_rgba(15,23,42,0.05)]">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className={`h-16 w-16 grid place-items-center rounded-2xl ${isAbierta ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                            <Icon
                                icon={isAbierta ? "solar:shop-2-bold-duotone" : "solar:lock-keyhole-minimalistic-bold-duotone"}
                                className="text-4xl"
                            />
                        </div>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mb-1">Estado del Turno</p>
                            <div className="flex items-center gap-2.5">
                                <h2 className="text-[26px] font-extrabold tracking-tight text-slate-800 dark:text-white">
                                    {isAbierta ? 'Turno Abierto' : 'Turno Cerrado'}
                                </h2>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isAbierta ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isAbierta ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                    {isAbierta ? 'Activo' : 'Inactivo'}
                                </span>
                            </div>
                            {isAbierta && estadoCaja?.movimiento && (
                                <p className="mt-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300 inline-flex items-center px-3 py-1 rounded-full">
                                    <Icon icon="solar:clock-circle-linear" className="mr-1.5" />
                                    Abierto desde: {new Date(estadoCaja.movimiento.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        {isAbierta ? (
                            <div className="flex flex-wrap gap-2.5 justify-end">
                                <button
                                    onClick={() => setShowGasto(true)}
                                    className="h-11 px-5 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30 text-sm font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Icon icon="solar:wallet-money-bold-duotone" className="text-xl" />
                                    Registrar Gasto
                                </button>
                                <button
                                    onClick={handleOpenCierre}
                                    className="h-11 px-5 rounded-2xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30 text-sm font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Icon icon="solar:stop-circle-bold" className="text-xl" />
                                    Cerrar Turno del Día
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowApertura(true)}
                                className="h-11 px-6 rounded-2xl text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                                style={{ background: ACCENT }}
                            >
                                <Icon icon="solar:play-circle-bold" className="text-xl" />
                                Abrir Nuevo Turno
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Grid - Only visible when Open */}
            {isAbierta && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] flex items-center gap-4">
                        <div className="h-12 w-12 grid place-items-center bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 rounded-2xl">
                            <Icon icon="solar:wallet-money-bold-duotone" className="text-2xl" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Monto Inicial</p>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                                {formatCurrency(Number(estadoCaja?.movimiento?.montoInicial || 0))}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] flex items-center gap-4">
                        <div className="h-12 w-12 grid place-items-center bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300 rounded-2xl">
                            <Icon icon="solar:hand-money-bold-duotone" className="text-2xl" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Ingresos del Turno</p>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                                {formatCurrency(Number(estadoCaja?.ventasDelDia?.totalIngresos || 0))}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#111827] p-6 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] flex items-center gap-4">
                        <div className="h-12 w-12 grid place-items-center bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300 rounded-2xl">
                            <Icon icon="solar:bill-list-bold-duotone" className="text-2xl" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wide">Gastos del Turno</p>
                            <p className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                                {formatCurrency(Number(estadoCaja?.totalEgresos || 0))}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Apertura */}
            {showApertura && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 top-[-30px] flex items-center justify-center p-4 animate-in fade-in duration-200 font-jakarta">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="bg-emerald-50 p-6 border-b border-emerald-100">
                            <h3 className="text-xl font-extrabold text-emerald-700 flex items-center gap-2">
                                <Icon icon="solar:wad-of-money-bold" className="text-2xl" /> Apertura de Caja
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <InputPro
                                label="Monto Inicial (S/)"
                                name="montoInicial"
                                type="number"
                                value={formApertura.montoInicial}
                                onChange={(e: any) => {
                                    setFormApertura({ ...formApertura, montoInicial: e.target.value });
                                    setFormErrors({});
                                }}
                                autoFocus
                                isLabel
                            />
                            {formErrors.montoInicial && (
                                <p className="text-red-500 text-xs flex items-center gap-1 -mt-2">
                                    <Icon icon="solar:danger-circle-bold" />
                                    {formErrors.montoInicial}
                                </p>
                            )}
                            <InputPro
                                label="Observaciones"
                                name="observaciones"
                                value={formApertura.observaciones}
                                onChange={(e: any) => setFormApertura({ ...formApertura, observaciones: e.target.value })}
                                isLabel
                                placeholder="Opcional"
                            />
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => { setShowApertura(false); setFormErrors({}); }} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <Button onClick={handleAbrirCaja} disabled={loading} className="bg-emerald-600 text-white hover:bg-emerald-700 border-none">
                                {loading ? <Icon icon="eos-icons:loading" className="mr-2" /> : null}
                                Confirmar Apertura
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cierre */}
            {showCierre && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 font-jakarta">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-slate-50 p-6 border-b border-slate-100">
                            <h3 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                                <Icon icon="solar:safe-circle-bold" className="text-rose-500" /> Cierre de Turno
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">Ingresa los montos finales contados en caja.</p>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <InputPro
                                    label="Efectivo en Caja (S/)"
                                    name="montoEfectivo"
                                    type="number"
                                    value={formCierre.montoEfectivo}
                                    onChange={(e: any) => setFormCierre({ ...formCierre, montoEfectivo: e.target.value })}
                                    isLabel
                                    autoFocus
                                />
                            </div>
                            <InputPro
                                label="Yape (S/)"
                                name="montoYape"
                                type="number"
                                value={formCierre.montoYape}
                                onChange={(e: any) => setFormCierre({ ...formCierre, montoYape: e.target.value })}
                                isLabel
                            />
                            <InputPro
                                label="Plin (S/)"
                                name="montoPlin"
                                type="number"
                                value={formCierre.montoPlin}
                                onChange={(e: any) => setFormCierre({ ...formCierre, montoPlin: e.target.value })}
                                isLabel
                            />
                            <InputPro
                                label="Tarjetas (S/)"
                                name="montoTarjeta"
                                type="number"
                                value={formCierre.montoTarjeta}
                                onChange={(e: any) => setFormCierre({ ...formCierre, montoTarjeta: e.target.value })}
                                isLabel
                            />
                            <InputPro
                                label="Transferencias (S/)"
                                name="montoTransferencia"
                                type="number"
                                value={formCierre.montoTransferencia}
                                onChange={(e: any) => setFormCierre({ ...formCierre, montoTransferencia: e.target.value })}
                                isLabel
                            />
                            <div className="col-span-2">
                                <InputPro
                                    label="Observaciones"
                                    name="observaciones"
                                    value={formCierre.observaciones}
                                    onChange={(e: any) => setFormCierre({ ...formCierre, observaciones: e.target.value })}
                                    isLabel
                                    type="textarea"
                                    rows={2}
                                    placeholder="Comentarios finales del turno..."
                                />
                            </div>

                            {/* Resumen en tiempo real */}
                            <div className="col-span-2 bg-slate-50 rounded-2xl p-4 space-y-2">
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Total del sistema:</span>
                                    <span className="font-bold text-slate-800">{formatCurrency(totalSistema)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Total declarado:</span>
                                    <span className="font-bold text-slate-800">{formatCurrency(totalDeclarado)}</span>
                                </div>
                                <div className={`flex justify-between text-sm font-bold border-t border-slate-200 pt-2 ${Math.abs(diferencia) < 0.01 ? 'text-emerald-600' : diferencia > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                                    <span>Diferencia:</span>
                                    <span>{diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Confirmación antes de cerrar */}
                        {!confirmCierre ? (
                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                                <button onClick={() => setShowCierre(false)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                <Button onClick={() => setConfirmCierre(true)} className="bg-amber-500 text-white hover:bg-amber-600 border-none">
                                    <Icon icon="solar:shield-warning-bold" className="mr-1" />
                                    Revisar y Cerrar
                                </Button>
                            </div>
                        ) : (
                            <div className="p-4 bg-rose-50 border-t border-rose-100 space-y-3">
                                <p className="text-sm text-rose-600 font-semibold text-center flex items-center justify-center gap-2">
                                    <Icon icon="solar:danger-triangle-bold" className="text-lg" />
                                    ¿Confirmas el cierre de caja? Esta acción no se puede deshacer.
                                </p>
                                <div className="flex justify-center gap-3">
                                    <button onClick={() => setConfirmCierre(false)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">Volver</button>
                                    <Button onClick={handleCerrarCaja} disabled={loading} className="bg-rose-500 text-white hover:bg-rose-600 border-none">
                                        {loading ? <Icon icon="eos-icons:loading" className="mr-2" /> : <Icon icon="solar:stop-circle-bold" className="mr-1" />}
                                        Confirmar Cierre
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ModalRegistrarGasto
                isOpen={showGasto}
                onClose={() => setShowGasto(false)}
                onSuccess={() => obtenerEstadoCaja()}
            />
        </div>
    );
};

export default CajaControl;
