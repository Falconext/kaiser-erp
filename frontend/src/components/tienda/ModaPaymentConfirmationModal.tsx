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
        clienteNombre: string;
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

export default function ModaPaymentConfirmationModal({
    isOpen,
    onClose,
    orderData,
    paymentConfig,
    storeSlug
}: PaymentConfirmationModalProps) {
    const initialTab = ['PLIN'].includes(orderData.medioPago) ? 'PLIN' : 'YAPE';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const isDigitalPayment = ['YAPE', 'PLIN', 'TRANSFERENCIA'].includes(orderData.medioPago);
    const isCashPayment = ['EFECTIVO', 'POS'].includes(orderData.medioPago);
    const isCardPayment = orderData.medioPago === 'TARJETA';
    const isTransfer = orderData.medioPago === 'TRANSFERENCIA';

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
        if (isDigitalPayment) return `${baseMessage} Te enviaré el comprobante de pago de ${activeTab}.`;
        if (isCashPayment) {
            if (orderData.tipoEntrega === 'RECOJO') return `${baseMessage} Pasaré a recogerlo y pagaré en efectivo.`;
            else return `${baseMessage} Pagaré en efectivo al momento de la entrega.`;
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <div className="bg-white rounded-none max-w-md w-full border border-gray-200 shadow-2xl relative flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight uppercase">
                        Confirmación
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <Icon icon="mdi:close" className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 border border-gray-900 flex items-center justify-center mb-4">
                            <Icon icon="solar:check-circle-linear" className="w-8 h-8 text-gray-900" />
                        </div>
                        <h4 className="text-2xl font-black text-gray-900 tracking-tight uppercase">¡Pedido Recibido!</h4>
                        <p className="text-gray-500 text-sm mt-2">Usa los datos a continuación para el pago.</p>
                    </div>

                    <div className="border border-gray-200 mb-8 divide-y divide-gray-100">
                        <div className="flex justify-between items-center p-4">
                            <span className="text-sm font-bold text-gray-500 uppercase">Pedido</span>
                            <span className="text-sm font-black text-gray-900 uppercase">#{orderData.id}</span>
                        </div>
                        <div className="flex justify-between items-center p-4">
                            <span className="text-sm font-bold text-gray-500 uppercase">Seguimiento</span>
                            <span className="px-2 py-1 bg-gray-100 text-xs font-bold text-gray-900 tracking-widest uppercase">{orderData.codigoSeguimiento}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gray-50">
                            <span className="text-sm font-bold text-gray-900 uppercase">Total a Pagar</span>
                            <span className="text-xl font-black text-gray-900">S/ {Number(orderData.total).toFixed(2)}</span>
                        </div>
                    </div>

                    {showTabs && (
                        <div className="mb-8">
                            <div className="flex w-full border border-gray-200 p-1 mb-6">
                                {hasYape && (
                                    <button
                                        onClick={() => setActiveTab('YAPE')}
                                        className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'YAPE' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        Yape
                                    </button>
                                )}
                                {hasPlin && (
                                    <button
                                        onClick={() => setActiveTab('PLIN')}
                                        className={`flex-1 py-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'PLIN' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        Plin
                                    </button>
                                )}
                            </div>

                            {qrCode && (
                                <div className="border border-gray-200 p-4 flex justify-center mb-6">
                                    <img src={qrCode} alt={`QR ${activeTab}`} className="w-48 h-48 object-contain" />
                                </div>
                            )}

                            {phoneNumber && (
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Número de {activeTab}</p>
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-2xl font-black text-gray-900 tracking-wider">{phoneNumber}</span>
                                        <button
                                            onClick={handleCopyNumber}
                                            className="w-10 h-10 flex items-center justify-center border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                                            title="Copiar número"
                                        >
                                            <Icon icon={copied ? "mdi:check" : "mdi:content-copy"} className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {copied && <p className="text-xs text-green-600 font-bold mt-2 uppercase">¡Número copiado!</p>}
                                </div>
                            )}
                        </div>
                    )}

                    {isTransfer && paymentConfig?.cuentasBancarias && paymentConfig.cuentasBancarias.length > 0 && (
                        <div className="mb-8 space-y-4">
                            <h5 className="text-sm font-bold text-gray-900 uppercase tracking-widest text-center mb-4">Cuentas Bancarias</h5>
                            {paymentConfig.cuentasBancarias.map((cuenta: any, idx: number) => (
                                <div key={idx} className="border border-gray-200 p-4">
                                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                                        <BancoLogo banco={cuenta.banco} className="w-6 h-6 grayscale" />
                                        <span className="font-bold text-gray-900 uppercase text-sm">{cuenta.banco}</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">Titular</span>
                                            <span className="font-bold text-gray-900">{cuenta.titular}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-500">N° Cuenta</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900">{cuenta.numeroCuenta}</span>
                                                <button onClick={() => navigator.clipboard.writeText(cuenta.numeroCuenta)} className="text-gray-400 hover:text-gray-900">
                                                    <Icon icon="mdi:content-copy" className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {cuenta.cci && (
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-gray-500">CCI</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900">{cuenta.cci}</span>
                                                    <button onClick={() => navigator.clipboard.writeText(cuenta.cci)} className="text-gray-400 hover:text-gray-900">
                                                        <Icon icon="mdi:content-copy" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="bg-gray-50 border border-gray-200 p-4 flex gap-3 mt-4">
                        <Icon icon="solar:info-circle-linear" className="w-5 h-5 text-gray-900 flex-shrink-0" />
                        <p className="text-xs text-gray-600 leading-relaxed font-medium">
                            Por favor incluye el número de pedido <strong className="font-black text-gray-900">#{orderData.id}</strong> en el mensaje o nota de tu pago.
                        </p>
                    </div>

                </div>

                {/* Footer Buttons */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 sticky bottom-0 z-10 flex flex-col gap-3">
                    <button
                        onClick={onClose}
                        className="w-full py-3.5 bg-gray-900 text-white font-bold tracking-wide uppercase hover:bg-black transition-colors"
                    >
                        Ver Estado del Pedido
                    </button>
                    {whatsappUrl && (
                        <button
                            onClick={openWhatsApp}
                            className="w-full py-3.5 border border-gray-300 text-gray-900 font-bold tracking-wide uppercase hover:bg-white flex items-center justify-center gap-2 transition-colors"
                        >
                            <Icon icon="mdi:whatsapp" className="w-5 h-5" />
                            Enviar Comprobante
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
