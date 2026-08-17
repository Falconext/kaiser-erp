import { useState, useEffect, useCallback } from 'react';
import InputPro from './InputPro';
import Button from './Button';
import { Icon } from '@iconify/react';
import { PaymentType, PaymentMethod } from '@/hooks/usePaymentFlow';
import useEscapeKey from '@/hooks/useEscapeKey';
import { useCuentasBancariasStore } from '@/zustand/cuentasBancarias';

interface ModalPaymentUnifiedProps {
  isOpen: boolean;
  isLoading?: boolean;
  saldoPendiente: number;
  totalComprobante: number;
  paymentType: PaymentType;
  comprobanteInfo: {
    id: number;
    serie: string;
    correlativo: number;
    cliente: string;
    total: number;
  };
  onConfirm: (monto: number, medioPago: PaymentMethod, observacion?: string, referencia?: string, cuentaBancariaId?: number) => void;
  onCancel: () => void;
  error?: string;
}

const PAYMENT_METHODS: { key: PaymentMethod; icon: string }[] = [
  { key: 'Efectivo', icon: '💰' },
  { key: 'Yape', icon: '📱' },
  { key: 'Plin', icon: '📱' },
  { key: 'Transferencia', icon: '🏦' },
  { key: 'Tarjeta', icon: '💳' },
  { key: 'Otro', icon: '🔄' },
];

const ModalPaymentUnified = ({
  isOpen,
  isLoading = false,
  saldoPendiente,
  totalComprobante,
  paymentType,
  comprobanteInfo,
  onConfirm,
  onCancel,
  error: externalError = '',
}: ModalPaymentUnifiedProps) => {
  const [monto, setMonto] = useState<number>(saldoPendiente);
  const [medioPago, setMedioPago] = useState<PaymentMethod>('Efectivo');
  const [error, setError] = useState<string>(externalError);
  const [vuelto, setVuelto] = useState<number>(0);
  const [observacion, setObservacion] = useState<string>('');
  const [referencia, setReferencia] = useState<string>('');
  const [cuentaBancariaId, setCuentaBancariaId] = useState<number | undefined>(undefined);

  const { cuentas, listar } = useCuentasBancariasStore();

  useEffect(() => {
    if (isOpen && cuentas.length === 0) {
      listar();
    }
  }, [isOpen, cuentas.length, listar]);

  const cuentasActivas = cuentas.filter((c) => c.activo);

  const getDefaultMonto = () => {
    switch (paymentType) {
      case 'ADELANTO': return 0;
      default: return saldoPendiente;
    }
  };

  const getModalTitle = () => {
    switch (paymentType) {
      case 'ADELANTO': return 'Registrar Adelanto';
      case 'PAGO_TOTAL': return 'Pago Total';
      case 'PAGO_PARCIAL': return 'Registrar Pago Parcial';
      default: return 'Registrar Pago';
    }
  };

  const getSubtitle = () => {
    switch (paymentType) {
      case 'ADELANTO': return `Adelanto máximo: S/ ${totalComprobante.toFixed(2)}`;
      case 'PAGO_TOTAL': return `Pago total del comprobante`;
      case 'PAGO_PARCIAL': return `Saldo pendiente: S/ ${saldoPendiente.toFixed(2)}`;
      default: return '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      setMonto(getDefaultMonto());
      setMedioPago('Efectivo');
      setError(externalError);
      setVuelto(0);
      setObservacion('');
      setReferencia('');
      setCuentaBancariaId(undefined);
    }
  }, [isOpen, paymentType, saldoPendiente]);

  // Auto-seleccionar primera cuenta bancaria al cambiar a Transferencia
  useEffect(() => {
    if (medioPago === 'Transferencia' && cuentasActivas.length > 0 && !cuentaBancariaId) {
      setCuentaBancariaId(cuentasActivas[0].id);
    }
    if (medioPago !== 'Transferencia') {
      setCuentaBancariaId(undefined);
    }
  }, [medioPago, cuentasActivas.length]);

  const handleMontoChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setMonto(numValue);
    setVuelto(Math.max(0, numValue - saldoPendiente));

    if (numValue <= 0) {
      setError('El monto debe ser mayor a 0');
    } else if (paymentType === 'ADELANTO' && numValue > totalComprobante) {
      setError(`El adelanto no puede exceder el total (S/ ${totalComprobante.toFixed(2)})`);
    } else if (paymentType === 'PAGO_PARCIAL' && numValue > saldoPendiente) {
      setError(`No puede exceder el saldo pendiente (S/ ${saldoPendiente.toFixed(2)})`);
    } else if (paymentType === 'PAGO_TOTAL' && Math.abs(numValue - saldoPendiente) > 0.01) {
      setError(`El monto debe ser exactamente S/ ${saldoPendiente.toFixed(2)}`);
    } else {
      setError('');
    }
  };

  const handleConfirm = () => {
    if (monto <= 0) { setError('El monto debe ser mayor a 0'); return; }
    if (error) return;
    onConfirm(monto, medioPago, observacion, referencia, cuentaBancariaId);
  };

  const handleClose = useCallback(() => {
    if (isOpen) onCancel();
  }, [isOpen, onCancel]);

  useEscapeKey(() => handleClose(), isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg dark:shadow-none max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{getModalTitle()}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getSubtitle()}</p>
          </div>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
            <Icon icon="tabler:x" width="24" height="24" />
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg mb-4 text-sm">
          <p className="text-gray-600 dark:text-gray-400"><span className="font-semibold">Comprobante:</span> {comprobanteInfo.serie}-{comprobanteInfo.correlativo}</p>
          <p className="text-gray-600 dark:text-gray-400"><span className="font-semibold">Cliente:</span> {comprobanteInfo.cliente}</p>
          <p className="text-gray-600 dark:text-gray-400"><span className="font-semibold">Total:</span> S/ {comprobanteInfo.total.toFixed(2)}</p>
          {paymentType !== 'ADELANTO' && (
            <p className="text-gray-800 dark:text-white font-semibold mt-2">
              <span className="text-orange-600">Saldo Pendiente:</span> S/ {saldoPendiente.toFixed(2)}
            </p>
          )}
        </div>

        <div className="mb-4">
          <InputPro
            type="number"
            label="Monto"
            name="monto"
            value={monto}
            onChange={(e: any) => handleMontoChange(e.target.value)}
            error={error}
            isLabel
            placeholder="0.00"
          />
        </div>

        {vuelto > 0 && paymentType !== 'ADELANTO' && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-emerald-900/20 border border-green-200 dark:border-emerald-900/30 rounded-lg">
            <p className="text-sm text-green-800 dark:text-emerald-400"><span className="font-semibold">Vuelto:</span> S/ {vuelto.toFixed(2)}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">Método de Pago</label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map(({ key, icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMedioPago(key)}
                className={`p-2 rounded-lg border-2 text-center text-xs font-semibold transition-all ${
                  medioPago === key
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <span className="block text-lg mb-1">{icon}</span>
                {key}
              </button>
            ))}
          </div>
        </div>

        {/* Cuenta bancaria destino — solo para Transferencia */}
        {medioPago === 'Transferencia' && (
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
              Cuenta destino
            </label>
            {cuentasActivas.length === 0 ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg px-3 py-2">
                No hay cuentas bancarias registradas. Agrégalas en <strong>Mi Negocio → Cuentas Bancarias</strong>.
              </p>
            ) : (
              <select
                value={cuentaBancariaId ?? ''}
                onChange={(e) => setCuentaBancariaId(e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Sin especificar</option>
                {cuentasActivas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.alias || c.banco} — {c.numeroCuenta} ({c.moneda})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Observación */}
        <div className="mb-4">
          <InputPro
            type="text"
            label="Observación (opcional)"
            name="observacion"
            value={observacion}
            onChange={(e: any) => setObservacion(e.target.value)}
            isLabel
            placeholder="Ej: Pago por servicio..."
          />
        </div>

        {/* Referencia/Operación */}
        {(medioPago === 'Transferencia' || medioPago === 'Tarjeta') && (
          <div className="mb-4">
            <InputPro
              type="text"
              label={medioPago === 'Tarjeta' ? 'Número de Operación' : 'N° Operación / Referencia'}
              name="referencia"
              value={referencia}
              onChange={(e: any) => setReferencia(e.target.value)}
              isLabel
              placeholder={medioPago === 'Tarjeta' ? 'Ej: 123456789' : 'Ej: REF-001'}
            />
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 border border-blue-200 dark:border-blue-900/30">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Resumen:</p>
          {paymentType === 'ADELANTO' ? (
            <>
              <div className="flex justify-between text-sm font-semibold">
                <span>Total Comprobante:</span>
                <span className="text-blue-600">S/ {totalComprobante.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold mt-1">
                <span>Adelanto:</span>
                <span className="text-green-600">S/ {monto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t border-blue-200 dark:border-blue-900/30">
                <span>Saldo a Pagar:</span>
                <span className="text-orange-600">S/ {(totalComprobante - monto).toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-sm font-semibold">
                <span>Saldo Anterior:</span>
                <span className="text-orange-600">S/ {saldoPendiente.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold mt-1">
                <span>A Pagar:</span>
                <span className="text-green-600">S/ {monto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold mt-1 pt-1 border-t border-blue-200 dark:border-blue-900/30">
                <span>Nuevo Saldo:</span>
                <span className={(saldoPendiente - monto) > 0 ? 'text-orange-600' : 'text-green-600'}>
                  S/ {Math.max(0, saldoPendiente - monto).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={onCancel} color="danger" disabled={isLoading} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            color="primary"
            disabled={isLoading || error !== '' || monto <= 0}
            className="flex-1"
          >
            {isLoading ? 'Procesando...' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModalPaymentUnified;
