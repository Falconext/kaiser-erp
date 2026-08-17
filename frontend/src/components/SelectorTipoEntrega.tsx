import { Icon } from '@iconify/react';

interface SelectorTipoEntregaProps {
    tipoEntrega: 'RECOJO' | 'ENVIO';
    onChange: (tipo: 'RECOJO' | 'ENVIO') => void;
    aceptaRecojo: boolean;
    aceptaEnvio: boolean;
    costoEnvio?: number;
    direccionRecojo?: string;
}

export default function SelectorTipoEntrega({
    tipoEntrega,
    onChange,
    aceptaRecojo,
    aceptaEnvio,
    costoEnvio = 0,
    direccionRecojo,
}: SelectorTipoEntregaProps) {
    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium mb-2">Tipo de entrega *</label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aceptaRecojo && (
                    <button
                        type="button"
                        onClick={() => onChange('RECOJO')}
                        className={`p-4 border-2 rounded-lg transition-all ${tipoEntrega === 'RECOJO'
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center ${tipoEntrega === 'RECOJO' ? 'bg-blue-600' : 'bg-gray-200 dark:bg-slate-700'
                                    }`}
                            >
                                <Icon
                                    icon="mdi:store"
                                    className={`w-6 h-6 ${tipoEntrega === 'RECOJO' ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                />
                            </div>
                            <div className="text-left flex-1">
                                <p className="font-semibold">Recojo en tienda</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Gratis</p>
                                {direccionRecojo && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{direccionRecojo}</p>
                                )}
                            </div>
                            {tipoEntrega === 'RECOJO' && (
                                <Icon icon="mdi:check-circle" className="w-6 h-6 text-blue-600" />
                            )}
                        </div>
                    </button>
                )}

                {aceptaEnvio && (
                    <button
                        type="button"
                        onClick={() => onChange('ENVIO')}
                        className={`p-4 border-2 rounded-lg transition-all ${tipoEntrega === 'ENVIO'
                            ? 'border-green-600 bg-green-50 dark:bg-emerald-900/20'
                            : 'border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center ${tipoEntrega === 'ENVIO' ? 'bg-green-600' : 'bg-gray-200 dark:bg-slate-700'
                                    }`}
                            >
                                <Icon
                                    icon="mdi:moped"
                                    className={`w-6 h-6 ${tipoEntrega === 'ENVIO' ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                                        }`}
                                />
                            </div>
                            <div className="text-left flex-1">
                                <p className="font-semibold">Envío a domicilio</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    S/ {costoEnvio.toFixed(2)}
                                </p>
                            </div>
                            {tipoEntrega === 'ENVIO' && (
                                <Icon icon="mdi:check-circle" className="w-6 h-6 text-green-600" />
                            )}
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
