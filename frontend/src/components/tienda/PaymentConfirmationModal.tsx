import { useState } from 'react';
import { Icon } from '@iconify/react';
import { BancoLogo } from '@/components/shared/BancoLogo';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';

interface PaymentConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;

    orderData: {
        id: number;
        codigoSeguimiento: string;
        total: number;
        medioPago: string;
        tipoEntrega: 'RECOJO' | 'ENVIO';
        clienteNombre: string; // Used in checkout, maybe needed here
    };
    paymentConfig?: {
        yapeQR?: string;
        plinQR?: string;
        yapeNumero?: string;
        plinNumero?: string;
        whatsappTienda?: string;
        cuentasBancarias?: any[];
    };
    storeSlug: string;
}

export default function PaymentConfirmationModal({
    isOpen,
    onClose,
    orderData,
    paymentConfig,
    storeSlug
}: PaymentConfirmationModalProps) {
    // Determine initial tab based on selected payment method or availability
    const initialTab = ['PLIN'].includes(orderData.medioPago) ? 'PLIN' : 'YAPE';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const isDigitalPayment = ['YAPE', 'PLIN', 'TRANSFERENCIA'].includes(orderData.medioPago);
    const isCashPayment = ['EFECTIVO', 'POS'].includes(orderData.medioPago);
    const isCardPayment = orderData.medioPago === 'TARJETA';
    const isTransfer = orderData.medioPago === 'TRANSFERENCIA';

    // Check availability
    const hasYape = !!paymentConfig?.yapeQR || !!paymentConfig?.yapeNumero;
    const hasPlin = !!paymentConfig?.plinQR || !!paymentConfig?.plinNumero;
    const showTabs = isDigitalPayment && (hasYape || hasPlin) && !isTransfer;

    const getQRCode = () => {
        if (activeTab === 'YAPE') return paymentConfig?.yapeQR;
        if (activeTab === 'PLIN') return paymentConfig?.plinQR;
        return null;
    };

    const getPhoneNumber = () => {
        if (activeTab === 'YAPE') return paymentConfig?.yapeNumero;
        if (activeTab === 'PLIN') return paymentConfig?.plinNumero;
        return null;
    };

    const generateWhatsAppMessage = () => {
        const baseMessage = `Hola, acabo de realizar el pedido #${orderData.id} (${orderData.codigoSeguimiento}) por S/ ${Number(orderData?.total || 0).toFixed(2)}.`;

        if (isDigitalPayment) {
            return `${baseMessage} Te enviaré el comprobante de pago de ${activeTab}.`;
        }

        if (isCashPayment) {
            if (orderData.tipoEntrega === 'RECOJO') {
                return `${baseMessage} Pasaré a recogerlo y pagaré en efectivo.`;
            } else {
                return `${baseMessage} Pagaré en efectivo al momento de la entrega.`;
            }
        }

        return baseMessage;
    };

    const whatsappUrl = buildStorePurchaseWhatsappUrl(paymentConfig?.whatsappTienda, generateWhatsAppMessage());

    const openWhatsApp = () => {
        if (whatsappUrl) window.open(whatsappUrl, '_blank');
    };

    const qrCode = getQRCode();
    const phoneNumber = getPhoneNumber();

    const handleCopyNumber = () => {
        if (!phoneNumber) return;
        navigator.clipboard.writeText(phoneNumber || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-200">
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-100">
                {/* Header Decoration */}


                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors z-10 text-gray-400 hover:text-gray-600"
                >
                    <Icon icon="mdi:close" className="w-5 h-5" />
                </button>

                {/* Content */}
                <div className="p-8 pt-10">
                    {/* Success Animation/Icon */}
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border-4 border-green-100 animate-pulse"></div>
                        <Icon icon="solar:check-circle-bold" className="w-10 h-10 text-green-500 relative z-10" />
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl font-bold text-center text-gray-900 mb-2 tracking-tight">
                        {isDigitalPayment ? '¡Confirma tu Pago!' : isCardPayment ? '¡Pago Aprobado!' : '¡Pedido Confirmado!'}
                    </h2>
                    <p className="text-center text-gray-500 text-sm mb-8">
                        {isDigitalPayment
                            ? 'Usa los datos a continuación para realizar tu pago.'
                            : isCardPayment
                                ? 'Tu pago con tarjeta fue procesado correctamente.'
                                : 'Tu orden ha sido registrada correctamente.'}
                    </p>

                    {/* Order Summary Card */}
                    <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-5 mb-8 shadow-sm">
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 border-dashed">
                            <span className="text-sm font-medium text-gray-600">Pedido</span>
                            <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded-md">#{orderData.id}</span>
                        </div>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100 border-dashed">
                            <span className="text-sm font-medium text-gray-600">Código de Seguimiento</span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-gray-800 bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-1 rounded-md select-all">
                                    {orderData.codigoSeguimiento}
                                </span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(orderData.codigoSeguimiento);
                                        // Optional: Add simple toast feedback here if possible, or just rely on UI feedback
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                    title="Copiar código"
                                >
                                    <Icon icon="solar:copy-linear" width={14} />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600">Total a Pagar</span>
                            <span className="text-2xl font-black text-[#1E1B4B] tracking-tight">S/ {Number(orderData?.total || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Helper Note */}
                    {isDigitalPayment && (
                        <div className="flex items-start gap-2 mb-8 bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <Icon icon="solar:info-circle-bold" className="text-blue-500 w-5 h-5 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-700 leading-relaxed">
                                <span className="font-bold">Important:</span> Por favor incluye el número de pedido <span className="font-bold">#{orderData.id}</span> en el mensaje o nota de tu pago.
                            </p>
                        </div>
                    )}

                    {/* Payment Sections */}
                    {showTabs && (
                        <div className="mb-8">
                            {/* Tabs */}
                            <div className="flex p-1 bg-gray-100 rounded-xl mb-6 relative">
                                {hasYape && (
                                    <button
                                        onClick={() => setActiveTab('YAPE')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'YAPE'
                                            ? 'bg-[#742384] text-white shadow-md'
                                            : 'text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Icon icon="mdi:cellphone" width={18} /> YAPE
                                    </button>
                                )}
                                {hasPlin && (
                                    <button
                                        onClick={() => setActiveTab('PLIN')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'PLIN'
                                            ? 'bg-[#00A1C9] text-white shadow-md'
                                            : 'text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Icon icon="mdi:bank" width={18} /> PLIN
                                    </button>
                                )}
                            </div>

                            {/* Active Tab Content */}
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {qrCode ? (
                                    <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-4 mb-4 flex flex-col items-center">
                                        <div className="bg-white p-2 rounded-xl shadow-sm mb-3">
                                            <img
                                                src={qrCode}
                                                alt={`QR ${activeTab}`}
                                                className="w-48 h-48 object-contain rounded-lg"
                                            />
                                        </div>
                                        <p className="text-xs text-center text-gray-400 mb-2">Escanea el QR desde tu app</p>
                                    </div>
                                ) : (
                                    <div className="text-center p-6 bg-gray-50 rounded-2xl mb-4 text-gray-500 border border-gray-100 border-dashed">
                                        <Icon icon="solar:qr-code-linear" className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p className="text-sm">Sin QR disponible</p>
                                    </div>
                                )}

                                {phoneNumber && (
                                    <button
                                        onClick={handleCopyNumber}
                                        className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 p-4 rounded-xl flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activeTab === 'YAPE' ? 'bg-purple-100 text-purple-600' : 'bg-cyan-100 text-cyan-600'}`}>
                                                <Icon icon={activeTab === 'YAPE' ? "mdi:cellphone" : "mdi:bank"} width={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Número {activeTab}</p>
                                                <p className="text-lg font-bold text-gray-900 font-mono tracking-wide">{phoneNumber}</p>
                                            </div>
                                        </div>
                                        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-white text-gray-600 shadow-sm group-hover:scale-105'
                                            }`}>
                                            {copied ? '¡Copiado!' : 'Copiar'}
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {isTransfer && paymentConfig?.cuentasBancarias && paymentConfig.cuentasBancarias.length > 0 && (
                        <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h3 className="text-sm font-bold text-gray-900 mb-3">Cuentas Bancarias</h3>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                {paymentConfig.cuentasBancarias.map((cuenta: any) => (
                                    <div key={cuenta.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 relative group flex gap-4 items-center">
                                        <BancoLogo banco={cuenta.banco} size={48} />
                                        <div className="flex flex-col flex-1 pr-8 gap-1">
                                            <span className="text-sm font-mono text-gray-800 font-bold tracking-tight">{cuenta.numeroCuenta}</span>
                                            {cuenta.cci && <span className="text-xs text-gray-500">CCI: <span className="font-mono">{cuenta.cci}</span></span>}
                                            {cuenta.alias && <span className="text-xs text-gray-600 mt-0.5">Titular: <span className="font-bold text-gray-800">{cuenta.alias}</span></span>}
                                            <div className="flex gap-2 mt-1.5">
                                                <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500 font-bold uppercase">{cuenta.tipoCuenta}</span>
                                                <span className="text-[10px] bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-500 font-bold uppercase">{cuenta.moneda}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(cuenta.numeroCuenta);
                                            }}
                                            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
                                            title="Copiar número de cuenta"
                                        >
                                            <Icon icon="solar:copy-linear" width={18} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Cash Instructions */}
                    {isCashPayment && (
                        <div className="mb-8">
                            <div className="bg-green-50/50 border border-green-100 rounded-2xl p-6 relative overflow-hidden">
                                <Icon icon="solar:bill-check-bold" className="absolute -right-4 -bottom-4 w-24 h-24 text-green-100/50" />
                                <h3 className="text-lg font-bold text-green-900 mb-2 relative z-10">Instrucciones de Pago</h3>
                                <p className="text-sm text-green-800 leading-relaxed relative z-10">
                                    {orderData.tipoEntrega === 'RECOJO'
                                        ? 'Por favor abona el monto exacto en caja al momento de recoger tu pedido.'
                                        : 'El repartidor cobrará el monto exacto en efectivo al momento de la entrega.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="space-y-3">
                        {whatsappUrl && (
                            <button
                                onClick={openWhatsApp}
                                className="w-full bg-[#25D366] hover:bg-[#1da851] text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-100"
                            >
                                <Icon icon="mdi:whatsapp" className="w-6 h-6" />
                                <div className="flex flex-col items-start leading-none">
                                    <span>{isDigitalPayment ? 'Enviar Comprobante' : isCardPayment ? 'Notificar Pago Aprobado' : 'Notificar Pedido'}</span>
                                    {isDigitalPayment && <span className="text-[10px] opacity-90 font-normal mt-1">al WhatsApp de la empresa</span>}
                                </div>
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className="w-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 py-4 rounded-xl font-bold text-sm transition-colors"
                        >
                            Ver Estado del Pedido
                        </button>
                    </div>

                    <p className="text-[10px] text-center text-gray-400 mt-6 max-w-xs mx-auto">
                        {isDigitalPayment
                            ? 'Al enviar el comprobante, procesaremos tu pedido lo antes posible.'
                            : 'Puedes hacer seguimiento del estado del pedido en tiempo real.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
