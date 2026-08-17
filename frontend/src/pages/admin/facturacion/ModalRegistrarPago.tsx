import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { createPortal } from 'react-dom';
import { usePagosStore } from '@/zustand/pagos';
import { useAuthStore } from '@/zustand/auth';
import { useUsersStore } from '@/zustand/users';
import Select from '@/components/Select';
import PaymentReceipt from '@/components/PaymentReceipt';

const DIRIGIDO_OPTIONS = [
    { value: 'ADMINISTRADOR', label: 'Administrador' },
    { value: 'EMPRESA', label: 'Empresa (cuenta del negocio)' },
    { value: 'VENDEDOR', label: 'Vendedor' },
];

interface ModalRegistrarPagoProps {
    comprobante: any;
    onClose: () => void;
    onSuccess: () => void;
}

const ModalRegistrarPago = ({ comprobante, onClose, onSuccess }: ModalRegistrarPagoProps) => {
    const { auth } = useAuthStore();
    const { registrarPagoComprobante, subirComprobantePago, loading } = usePagosStore();
    const { usuarios, getAllUsers } = useUsersStore();
    const [monto, setMonto] = useState('');
    const [medioPago, setMedioPago] = useState('EFECTIVO');
    const [observacion, setObservacion] = useState('');
    const [referencia, setReferencia] = useState('');
    const [dirigidoA, setDirigidoA] = useState('');
    const [vendedorId, setVendedorId] = useState<number | null>(null);
    const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
    const [comprobantePreview, setComprobantePreview] = useState<string>('');
    const [subiendoComprobante, setSubiendoComprobante] = useState(false);
    const [showReceipt, setShowReceipt] = useState(false);
    const [pagoRegistrado, setPagoRegistrado] = useState<any>(null);
    const [nuevoSaldoFinal, setNuevoSaldoFinal] = useState<number>(0);
    const [error, setError] = useState<string>('');

    // Cobranza con vendedores de campo: casuística activada por empresa (perfil).
    const cobranzaCampo = Boolean((auth as any)?.empresa?.cobranzaCampo);

    // Cargar vendedores (usuarios de la empresa) solo cuando la casuística está activa.
    useEffect(() => {
        if (cobranzaCampo) getAllUsers({ page: 1, limit: 100 });
    }, [cobranzaCampo, getAllUsers]);

    // Preseleccionar el vendedor de campo que ya tiene atribuido el comprobante,
    // para que la encargada no lo vuelva a elegir en cada cobro.
    useEffect(() => {
        if (cobranzaCampo && comprobante?.vendedorCampoId) {
            setVendedorId(Number(comprobante.vendedorCampoId));
        }
    }, [cobranzaCampo, comprobante?.vendedorCampoId]);

    const handleComprobanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) { setError('El comprobante debe ser una imagen'); return; }
        setComprobanteFile(f);
        setComprobantePreview(URL.createObjectURL(f));
        setError('');
    };

    const quitarComprobante = () => {
        setComprobanteFile(null);
        if (comprobantePreview) URL.revokeObjectURL(comprobantePreview);
        setComprobantePreview('');
    };

    // Recalcular saldo si es crédito y tiene saldo 0 (mal guardado en BD)
    const calcularSaldoReal = () => {
        const saldoDB = Number(comprobante?.saldo || 0);
        const formaPagoUpper = (comprobante?.formaPagoTipo || '').toUpperCase();
        const esCredito = formaPagoUpper === 'CREDITO';

        // Si es crédito y saldo es 0 pero tiene total > 0, recalcular
        if (esCredito && saldoDB === 0 && Number(comprobante?.mtoImpVenta) > 0) {
            const montoDescontado = Number(comprobante?.montoDetraccion || 0);
            return Math.max(0, Number(comprobante?.mtoImpVenta) - montoDescontado);
        }
        return saldoDB;
    };

    const saldoActual = calcularSaldoReal();
    const montoNum = Number(monto) || 0;
    const nuevoSaldo = Math.max(0, saldoActual - montoNum);

    const handleSubmit = async () => {
        if (montoNum <= 0) { setError('El monto debe ser mayor a 0'); return; }
        if (montoNum > saldoActual) { setError(`El monto no puede exceder el saldo (S/ ${saldoActual.toFixed(2)})`); return; }
        if (cobranzaCampo && !vendedorId) { setError('Selecciona el vendedor de campo que envió el comprobante'); return; }
        if (cobranzaCampo && !dirigidoA) { setError('Indica a quién fue dirigido el pago'); return; }
        setError('');

        const vendedorNombre = cobranzaCampo ? usuarios.find((u: any) => u.id === vendedorId)?.nombre : undefined;

        const result = await registrarPagoComprobante(comprobante.id, {
            monto: montoNum,
            medioPago,
            observacion: observacion || undefined,
            referencia: referencia || undefined,
            dirigidoA: cobranzaCampo ? (dirigidoA || undefined) : undefined,
            vendedorId: cobranzaCampo ? (vendedorId ?? undefined) : undefined,
            vendedorNombre,
        });

        if (!result.success) {
            setError(result.error || 'Error al registrar el pago');
            return;
        }

        // Subir el comprobante (opcional) al pago recién creado.
        if (comprobanteFile && result.pago?.id) {
            setSubiendoComprobante(true);
            const up = await subirComprobantePago(result.pago.id, comprobanteFile);
            setSubiendoComprobante(false);
            if (!up.success) {
                setError(up.error || 'El pago se registró, pero falló la subida del comprobante');
            }
        }

        setPagoRegistrado({
            ...result.pago,
            monto: montoNum,
            medioPago,
            observacion,
            referencia,
        });
        setNuevoSaldoFinal(result.nuevoSaldo ?? nuevoSaldo);
        setShowReceipt(true);
    };

    const handlePagarTodo = () => {
        setMonto(saldoActual.toFixed(2));
    };

    const handleCloseReceipt = () => {
        setShowReceipt(false);
        onSuccess();
    };

    // Mostrar el recibo usando el componente PaymentReceipt existente
    if (showReceipt && pagoRegistrado) {
        return (
            <PaymentReceipt
                comprobante={{
                    ...comprobante,
                    data: comprobante,
                }}
                saldo={nuevoSaldoFinal}
                payment={{
                    tipo: nuevoSaldoFinal === 0 ? 'PAGO_TOTAL' : 'PAGO_PARCIAL',
                    monto: montoNum,
                    medioPago,
                    observacion,
                    referencia,
                    dirigidoA,
                    vendedorNombre: usuarios.find((u: any) => u.id === vendedorId)?.nombre,
                }}
                numeroRecibo={`REC-${pagoRegistrado?.id || '0000'}`}
                nuevoSaldo={nuevoSaldoFinal}
                company={auth}
                detalles={comprobante?.detalles}
                cliente={comprobante?.cliente}
                onClose={handleCloseReceipt}
            />
        );
    }

    // Modal de Registro de Pago
    const content = (
        <div className="fixed inset-0 bg-black/60 top-[-30px] z-[999999] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-xl max-w-lg w-full overflow-y-auto max-h-[92vh] border dark:border-transparent">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                            <Icon icon="solar:hand-money-bold-duotone" className="text-2xl" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Registrar Pago</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {comprobante?.serie}-{String(comprobante?.correlativo).padStart(8, '0')}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <Icon icon="mdi:close" className="text-xl" />
                    </button>
                </div>

                {/* Info del Comprobante */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/30">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Cliente</p>
                            <p className="font-medium text-gray-900 dark:text-white">{comprobante?.cliente?.nombre || 'Sin cliente'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">RUC/DNI</p>
                            <p className="font-medium text-gray-900 dark:text-white">{comprobante?.cliente?.nroDoc || '-'}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Total Comprobante</p>
                            <p className="font-medium text-gray-900 dark:text-white">S/ {Number(comprobante?.mtoImpVenta || 0).toFixed(2)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Saldo Pendiente</p>
                            <p className="font-bold text-red-600 dark:text-red-400 text-lg">S/ {saldoActual.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="p-5 space-y-4">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Monto a Abonar</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">S/</span>
                                <input
                                    type="number"
                                    value={monto}
                                    onChange={(e) => { setMonto(e.target.value); setError(''); }}
                                    placeholder="0.00"
                                    step="0.01"
                                    max={saldoActual}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handlePagarTodo}
                            className="mt-6 px-4 py-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                        >
                            Pagar Todo
                        </button>
                    </div>

                    <div>
                        <Select
                            error=""
                            label="Medio de Pago"
                            name="medioPago"
                            defaultValue="EFECTIVO"
                            onChange={(id: any, value: string) => setMedioPago(value)}
                            options={[
                                { value: 'EFECTIVO', label: 'Efectivo' },
                                { value: 'YAPE', label: 'Yape' },
                                { value: 'PLIN', label: 'Plin' },
                                { value: 'TRANSFERENCIA', label: 'Transferencia' },
                                { value: 'TARJETA', label: 'Tarjeta' },
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Referencia (opcional)</label>
                        <input
                            type="text"
                            value={referencia}
                            onChange={(e) => setReferencia(e.target.value)}
                            placeholder="Nro. operación, voucher, etc."
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observación (opcional)</label>
                        <textarea
                            value={observacion}
                            onChange={(e) => setObservacion(e.target.value)}
                            placeholder="Notas adicionales..."
                            rows={2}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                        />
                    </div>

                    {/* Casuística de cobranza con vendedores de campo (activada por empresa) */}
                    {cobranzaCampo && (
                        <>
                            {/* Vendedor de campo que envió el comprobante (obligatorio) */}
                            <div>
                                <Select
                                    error=""
                                    label="Vendedor de campo * (quién envió el comprobante)"
                                    name="vendedorId"
                                    value={usuarios.find((u: any) => u.id === vendedorId)?.nombre || ''}
                                    onChange={(id: any) => { setVendedorId(Number(id) || null); setError(''); }}
                                    options={(usuarios || []).map((u: any) => ({ id: u.id, value: u.nombre || u.email || `Usuario ${u.id}` }))}
                                />
                            </div>

                            {/* ¿A quién fue dirigido el pago? (obligatorio) */}
                            <div>
                                <Select
                                    error=""
                                    label="¿A quién fue dirigido el pago? *"
                                    name="dirigidoA"
                                    onChange={(id: any) => { setDirigidoA(String(id || '')); setError(''); }}
                                    options={DIRIGIDO_OPTIONS.map((o) => ({ id: o.value, value: o.label }))}
                                />
                            </div>

                            {/* Comprobante del pago (opcional, imagen) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comprobante (opcional)</label>
                                {comprobantePreview ? (
                                    <div className="relative inline-block">
                                        <img src={comprobantePreview} alt="Comprobante" className="h-28 rounded-lg border border-gray-200 dark:border-slate-700 object-cover" />
                                        <button type="button" onClick={quitarComprobante} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow hover:bg-red-600">
                                            <Icon icon="mdi:close" className="text-sm" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg px-4 py-5 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                                        <Icon icon="solar:gallery-add-bold-duotone" className="text-2xl text-blue-500" />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 text-center">Sube la imagen del comprobante que envió el vendedor</span>
                                        <input type="file" accept="image/*" onChange={handleComprobanteChange} className="hidden" />
                                    </label>
                                )}
                            </div>
                        </>
                    )}

                    {error && (
                        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 border dark:border-red-900/30">{error}</p>
                    )}

                    {montoNum > 0 && !error && (
                        <div className="flex justify-between text-sm px-1">
                            <span className="text-gray-400 dark:text-gray-500">Saldo después del pago</span>
                            <span className={`font-bold ${nuevoSaldo > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                S/ {nuevoSaldo.toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 dark:border-slate-800 flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || subiendoComprobante || montoNum <= 0 || montoNum > saldoActual}
                        className="px-5 py-2.5 btn-accent rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading || subiendoComprobante ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Icon icon="solar:check-circle-bold" />
                                Registrar Pago
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return content;
    return createPortal(content, document.body);
};

export default ModalRegistrarPago;
