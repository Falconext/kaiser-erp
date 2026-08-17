import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import useAlertStore from '@/zustand/alert';
import { post } from '@/utils/fetch';

interface ModalEnviarWhatsAppProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: 'whatsapp' | 'email';
    comprobante: {
        id: number;
        serie: string;
        correlativo: number;
        comprobante: string;
        total: number;
        clienteNombre: string;
        clienteCelular?: string;
        clienteEmail?: string;
        pdfUrl?: string;
    };
}

type Tab = 'whatsapp' | 'email';

const ModalEnviarWhatsApp = ({ isOpen, onClose, defaultTab = 'whatsapp', comprobante }: ModalEnviarWhatsAppProps) => {
    const { alert } = useAlertStore();

    const [tab, setTab] = useState<Tab>(defaultTab);
    const [numeroDestino, setNumeroDestino] = useState('');
    const [emailDestino, setEmailDestino] = useState('');
    const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
    const [generando, setGenerando] = useState(false);
    const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);
    const [enviandoEmail, setEnviandoEmail] = useState(false);

    // Reset y pre-llenar al abrir. Si no hay PDF persistido, lo preparamos en segundo plano.
    useEffect(() => {
        if (!isOpen) return;
        setTab(defaultTab);
        setPdfUrl(comprobante.pdfUrl);
        setNumeroDestino(comprobante.clienteCelular || '');
        setEmailDestino(comprobante.clienteEmail || '');
        if (!comprobante.pdfUrl) {
            void generarPdf();
        }
    }, [isOpen, comprobante.id, comprobante.pdfUrl, defaultTab]);

    const generarPdf = async (): Promise<string | null> => {
        if (pdfUrl) return pdfUrl;
        setGenerando(true);
        try {
            const res = await post<{ pdfUrl: string }>(
                `comprobante/${comprobante.id}/generar-pdf`,
                {},
            );
            const error = (res as any)?.error;
            const url = (res as any)?.data?.pdfUrl || (res as any)?.pdfUrl;

            if (error) {
                alert(error, 'error');
                return null;
            }

            if (url) {
                setPdfUrl(url);
                return url;
            }

            alert('No se pudo obtener el enlace del PDF', 'error');
            return null;
        } finally {
            setGenerando(false);
        }
    };

    const asegurarPdf = async () => {
        if (pdfUrl) return pdfUrl;
        return generarPdf();
    };

    const handleEnviarWhatsApp = async () => {
        const num = numeroDestino.trim();
        if (!num) {
            alert('Ingrese un número de WhatsApp válido', 'error');
            return;
        }
        setEnviandoWhatsApp(true);
        await asegurarPdf();
        const res = await post(`comprobante/${comprobante.id}/enviar-whatsapp`, { celular: num });
        setEnviandoWhatsApp(false);
        if ((res as any).error) {
            alert((res as any).error, 'error');
            return;
        }
        alert('Mensaje de WhatsApp enviado correctamente', 'success');
        handleClose();
    };

    const handleEnviarEmail = async () => {
        const email = emailDestino.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Ingrese un correo electrónico válido', 'error');
            return;
        }
        setEnviandoEmail(true);
        await asegurarPdf();
        const res = await post(`comprobante/${comprobante.id}/enviar-email`, { email });
        setEnviandoEmail(false);
        if ((res as any).error) {
            alert((res as any).error, 'error');
            return;
        }
        alert('Correo enviado correctamente', 'success');
        handleClose();
    };

    const handleClose = () => {
        setNumeroDestino('');
        setEmailDestino('');
        onClose();
    };

    if (!isOpen) return null;

    const serie = `${comprobante.serie}-${String(comprobante.correlativo).padStart(8, '0')}`;
    const monto = `S/ ${(comprobante.total ?? 0).toFixed(2)}`;

    return (
        <div className="fixed inset-0 z-[999999] top-[-30px] flex items-center justify-center bg-black/60">
            <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden border dark:border-transparent">

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Enviar comprobante</h3>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Icon icon="mdi:close" className="text-xl" />
                    </button>
                </div>

                <div className="px-6 pt-4 pb-6 space-y-4">
                    {/* Info del comprobante */}
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-1.5 text-sm border dark:border-transparent">
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Tipo</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{comprobante.comprobante}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Serie-Número</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{serie}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Cliente</span>
                            <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[60%] text-right">{comprobante.clienteNombre}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Monto</span>
                            <span className="font-bold text-gray-900 dark:text-white">{monto}</span>
                        </div>

                        {/* Estado PDF */}
                        <div className="pt-1">
                            {generando ? (
                                <div className="flex items-center gap-2 text-violet-600 text-xs font-medium">
                                    <Icon icon="line-md:loading-twotone-loop" className="text-base" />
                                    Generando PDF...
                                </div>
                            ) : pdfUrl ? (
                                <div className="flex items-center gap-2 text-emerald-600 text-xs font-medium">
                                    <Icon icon="solar:check-circle-bold" className="text-base" />
                                    PDF listo
                                    <a href={pdfUrl} target="_blank" rel="noreferrer" className="underline ml-1">Ver</a>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span className="text-amber-600 text-xs italic">PDF pendiente</span>
                                    <button
                                        onClick={generarPdf}
                                        className="text-xs text-violet-600 font-semibold hover:underline"
                                    >
                                        Generar ahora
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-gray-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
                        <button
                            onClick={() => setTab('whatsapp')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                                tab === 'whatsapp'
                                    ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon icon="mdi:whatsapp" className="text-lg" />
                            WhatsApp
                        </button>
                        <button
                            onClick={() => setTab('email')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                                tab === 'email'
                                    ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon icon="solar:letter-bold" className="text-lg" />
                            Email
                        </button>
                    </div>

                    {/* WhatsApp tab */}
                    {tab === 'whatsapp' && (
                        <div className="space-y-4">
                            <InputPro
                                name="numeroDestino"
                                label="Número de WhatsApp"
                                placeholder="Ej: 999 999 999"
                                value={numeroDestino}
                                onChange={(e) => setNumeroDestino(e.target.value)}
                                isLabel
                                type="text"
                            />

                             {/* Info */}
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-xl p-3 flex items-start gap-2">
                                <Icon icon="mdi:whatsapp" className="text-green-500 text-base mt-0.5 shrink-0" />
                                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                                    El PDF del comprobante se enviará directamente al WhatsApp del cliente como documento adjunto.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 pt-1">
                                <div className="flex gap-3">
                                    <Button onClick={handleClose} className="flex-1 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700">
                                        Cancelar
                                    </Button>
                                    {/* Botón "Enviar (API)" oculto temporalmente hasta terminar el
                                        setup de producción de Zavu (número + plantilla + key zv_live_).
                                        Reactivar descomentando cuando Zavu esté listo. */}
                                    {/*
                                    <Button
                                        onClick={handleEnviarWhatsApp}
                                        disabled={enviandoWhatsApp || generando || !numeroDestino.trim()}
                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2 disabled:opacity-60"
                                    >
                                        {enviandoWhatsApp ? (
                                            <Icon icon="line-md:loading-twotone-loop" className="text-xl" />
                                        ) : (
                                            <Icon icon="solar:whatsapp-bold" className="text-xl" />
                                        )}
                                        {enviandoWhatsApp ? 'Enviando...' : 'Enviar (API)'}
                                    </Button>
                                    */}
                                </div>
                                
                                <button
                                    onClick={async () => {
                                        const num = numeroDestino.trim().replace(/\D/g, '');
                                        const url = await asegurarPdf();
                                        if (!url) return;
                                        const finalNum = num.startsWith('51') ? num : `51${num}`;
                                        const mensaje = encodeURIComponent(
                                            `Hola ${comprobante.clienteNombre}, te enviamos tu ${comprobante.comprobante} ${serie} por ${monto}.\n\nPuedes descargarlo aquí: ${url}`
                                        );
                                        window.open(`https://wa.me/${finalNum}?text=${mensaje}`, '_blank');
                                    }}
                                    disabled={!numeroDestino.trim() || generando}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-green-500 text-green-600 dark:text-green-400 font-bold hover:bg-green-50 dark:hover:bg-green-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Icon icon="solar:share-circle-bold-duotone" className="text-xl" />
                                    Abrir enlace directo de WhatsApp
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Email tab */}
                    {tab === 'email' && (
                        <div className="space-y-4">
                            <InputPro
                                name="emailDestino"
                                label="Correo electrónico"
                                placeholder="cliente@ejemplo.com"
                                value={emailDestino}
                                onChange={(e) => setEmailDestino(e.target.value)}
                                isLabel
                                type="email"
                            />
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                El PDF del comprobante se enviará como adjunto al correo indicado.
                            </p>

                            <div className="flex gap-3 pt-1">
                                <Button onClick={handleClose} className="flex-1 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700">
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleEnviarEmail}
                                    disabled={enviandoEmail || generando || !emailDestino.trim()}
                                    className="flex-1 !bg-[var(--accent)] hover:opacity-90 text-white flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {enviandoEmail ? (
                                        <Icon icon="line-md:loading-twotone-loop" className="text-xl" />
                                    ) : (
                                        <Icon icon="solar:letter-bold" className="text-xl" />
                                    )}
                                    {enviandoEmail ? 'Enviando...' : 'Enviar correo'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModalEnviarWhatsApp;
