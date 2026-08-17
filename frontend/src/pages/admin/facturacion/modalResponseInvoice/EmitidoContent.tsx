import { IInvoicesState, useInvoiceStore } from "@/zustand/invoices";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Icon } from "@iconify/react";
import ModalEnviarWhatsApp from "@/pages/admin/facturacion/ModalEnviarWhatsApp";
import { useThemeStore } from "@/zustand/theme";

export interface IEmitidoContentProps {
    serie: string
    correlative: string
    dataReceipt: any
    auth: any
    client: any
    comprobante: string
    isLoading: boolean
    closeModal: any
    handleOpenNewTab: any
    company?: any
    productsInvoice?: any[]
    formValues?: any
    observation?: string
    isPendiente?: boolean
    isUpdate?: boolean
    hasDespacho?: boolean
}

/**
 * Contenido del comprobante emitido (éxito / procesando) SIN el wrapper de modal.
 * Se reutiliza dentro del modal "Continuar pago" para la transición inline.
 */
const EmitidoContent = ({ isLoading, dataReceipt, auth, client, comprobante, closeModal, handleOpenNewTab, formValues, isPendiente, isUpdate, hasDespacho }: IEmitidoContentProps) => {
    const { resetInvoice, resetProductInvoice }: IInvoicesState = useInvoiceStore();
    const navigate = useNavigate();
    const { isDarkMode } = useThemeStore();
    const [showEnviar, setShowEnviar] = useState(false);
    const [tabEnviar, setTabEnviar] = useState<'whatsapp' | 'email'>('whatsapp');

    const goListInvoice = () => {
        resetInvoice();
        resetProductInvoice();
        if (['BOLETA', 'FACTURA', 'NOTA DE CREDITO', 'NOTA DE DEBITO'].includes(comprobante)) {
            navigate('/administrador/facturacion/comprobantes');
        } else if (comprobante === 'COTIZACIÓN') {
            navigate('/administrador/facturacion/cotizaciones');
        } else {
            navigate('/administrador/facturacion/comprobantes-informales');
        }
    };

    const goDespacho = () => {
        resetInvoice();
        resetProductInvoice();
        navigate('/administrador/ventas');
    };

    const canShare = dataReceipt?.id != null && dataReceipt.id !== 0;

    const comprobanteParaEnvio = canShare ? {
        id: dataReceipt.id,
        serie: dataReceipt.serie,
        correlativo: dataReceipt.correlativo,
        comprobante,
        total: dataReceipt.total ?? formValues?.mtoImpVenta ?? 0,
        clienteNombre: client?.nombre ?? '',
        clienteCelular: client?.telefono ?? client?.celular ?? '',
        clienteEmail: client?.email ?? '',
    } : null;

    if (isLoading) {
        return (
            <div className="p-10 flex flex-col items-center gap-4">
                <img className="w-32 h-32 object-contain" src="/gif/loading.gif" alt="Procesando" />
                <p className={`text-sm font-semibold text-center ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    Espere por favor, procesando su comprobante...
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col">
                {/* Header con estado */}
                <div className={`px-6 pt-7 pb-5 flex flex-col items-center gap-3 text-center border-b ${isDarkMode ? 'border-slate-800' : 'border-gray-100'}`}>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400 dark:text-gray-500 font-medium">{isUpdate ? 'Comprobante actualizado' : 'Comprobante emitido'}</p>

                    {isPendiente ? (
                        <div className={`flex items-center justify-center w-16 h-16 rounded-full border-2 ${isDarkMode ? 'bg-amber-950/40 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
                            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    ) : (
                        <img className="w-20 h-20 rounded-full" src="/gif/suc.gif" alt="Éxito" />
                    )}

                    <div>
                        <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                            {isPendiente ? (
                                <>
                                    Comprobante <strong>registrado correctamente</strong>.<br />
                                    <span className="text-amber-500 font-medium text-xs">SUNAT no disponible — se confirmará automáticamente.</span>
                                </>
                            ) : (
                                <>
                                    Hola, <strong>{auth?.nombre}</strong>. La {comprobante?.toLowerCase()} del cliente <strong>{client?.nombre}</strong> fue {isUpdate ? 'actualizada' : 'generada'} con éxito.
                                </>
                            )}
                        </p>
                    </div>

                    {/* Número de comprobante destacado */}
                    <div className={`mt-1 px-6 py-3 rounded-2xl border-2 border-dashed ${
                        isPendiente
                            ? isDarkMode ? 'border-amber-700 bg-amber-950/30' : 'border-amber-300 bg-amber-50'
                            : isDarkMode ? 'border-emerald-700 bg-emerald-950/30' : 'border-emerald-300 bg-emerald-50'
                    }`}>
                        <span className={`text-3xl font-bold tracking-[0.18em] ${isPendiente ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {dataReceipt?.serie}-{dataReceipt?.correlativo}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        {isPendiente ? 'Se confirmará en tu historial pronto.' : 'Disponible en tu historial de comprobantes.'}
                    </p>
                </div>

                {/* Sección compartir */}
                {canShare && (
                    <div className="px-6 pt-4 pb-2">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-medium mb-3 text-center">Compartir comprobante</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => { setTabEnviar('whatsapp'); setShowEnviar(true); }}
                                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20bc5b] text-white text-sm font-semibold transition-all duration-150 shadow-sm shadow-green-200 active:scale-95"
                            >
                                <Icon icon="mdi:whatsapp" className="text-xl" />
                                WhatsApp
                            </button>
                            <button
                                onClick={() => { setTabEnviar('email'); setShowEnviar(true); }}
                                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl btn-accent text-sm font-semibold transition-all duration-150 shadow-sm shadow-black/20 active:scale-95"
                            >
                                <Icon icon="solar:letter-bold" className="text-xl" />
                                Correo
                            </button>
                        </div>
                    </div>
                )}

                {/* Acciones secundarias */}
                <div className="px-6 pt-3 pb-6 flex flex-col gap-2">
                    {/* Formatos de impresión */}
                    <div>
                        <p className={`text-[10px] uppercase tracking-[0.2em] font-medium mb-2 text-center ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>
                            Formato de impresión
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { size: 'A4',     icon: 'solar:document-bold-duotone',     label: 'A4',     sub: '210×297mm' },
                                { size: 'A5',     icon: 'solar:file-bold-duotone',          label: 'A5',     sub: '148×210mm' },
                                { size: 'TICKET', icon: 'solar:receipt-bold-duotone',       label: 'Ticket', sub: '80mm' },
                            ].map(({ size, icon, label, sub }) => (
                                <button
                                    key={size}
                                    onClick={() => handleOpenNewTab(size)}
                                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all active:scale-95 ${
                                        isDarkMode
                                            ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-slate-200'
                                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    <Icon icon={icon} className={`text-xl ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                                    <span className="text-xs font-bold">{label}</span>
                                    <span className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-gray-400'}`}>{sub}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={goListInvoice}
                        className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-medium transition-colors ${isDarkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                    >
                        <Icon icon="solar:list-bold-duotone" className={`text-base ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`} />
                        Ver lista
                    </button>
                    {hasDespacho && (
                        <button
                            onClick={goDespacho}
                            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl btn-accent text-sm font-semibold transition-colors active:scale-95"
                        >
                            <Icon icon="solar:delivery-bold-duotone" className="text-lg" />
                            Ver despacho
                        </button>
                    )}
                    <button
                        onClick={() => closeModal()}
                        className={`w-full py-3 rounded-xl text-white text-sm font-semibold transition-colors active:scale-95 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                    >
                        Nueva {comprobante?.toLowerCase()}
                    </button>
                </div>
            </div>

            {showEnviar && comprobanteParaEnvio && (
                <ModalEnviarWhatsApp
                    isOpen={showEnviar}
                    onClose={() => setShowEnviar(false)}
                    defaultTab={tabEnviar}
                    comprobante={comprobanteParaEnvio}
                />
            )}
        </>
    );
};

export default EmitidoContent;
