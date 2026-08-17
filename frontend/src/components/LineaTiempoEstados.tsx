import { Icon } from '@iconify/react';

interface HistorialEstado {
    estadoAnterior: string | null;
    estadoNuevo: string;
    creadoEn: string;
    notas?: string;
}

interface LineaTiempoEstadosProps {
    historial: HistorialEstado[];
    estadoActual: string;
}

const FLUJO_ESTADOS = [
    { key: 'PENDIENTE',       label: 'Pendiente',       icon: 'mdi:clock-outline',    color: '#F59E0B' },
    { key: 'CONFIRMADO',      label: 'Confirmado',      icon: 'mdi:check-circle',     color: '#3B82F6' },
    { key: 'EN_TRANSITO',     label: 'En tránsito',     icon: 'mdi:truck-fast',       color: '#4F46E5' },
    { key: 'ENTREGADO_COMPLETADO', label: 'Entregado',  icon: 'mdi:check-all',        color: '#10B981' },
];

const CANCELADO = { key: 'CANCELADO', label: 'Cancelado', icon: 'mdi:close-circle', color: '#EF4444' };
const CANCELADOS = new Set(['CANCELADO', 'CANCELADO_INTERNO', 'CANCELADO_CLIENTE']);

const normalizeEstado = (estado: string) => {
    if (estado === 'ENTREGADO') return 'ENTREGADO_COMPLETADO';
    if (estado === 'EN_PREPARACION' || estado === 'LISTO' || estado === 'REPROGRAMADO') return 'CONFIRMADO';
    if (CANCELADOS.has(estado)) return 'CANCELADO';
    return estado;
};

export default function LineaTiempoEstados({ historial, estadoActual }: LineaTiempoEstadosProps) {
    const estadoActualNormalizado = normalizeEstado(estadoActual);
    const esCancelado = estadoActualNormalizado === 'CANCELADO';
    const estados = esCancelado ? [CANCELADO] : FLUJO_ESTADOS;

    const getTimestamp = (estadoKey: string): string | null => {
        const entry = historial.find(h => (
            normalizeEstado(h.estadoNuevo) === estadoKey ||
            (h.notas ?? '').includes(`Entrega: ${estadoKey}`)
        ));
        if (!entry) return null;
        return new Date(entry.creadoEn).toLocaleString('es-PE', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const currentIdx = estados.findIndex(e => e.key === estadoActualNormalizado);

    return (
        <div className="space-y-0">
            {estados.map((estado, idx) => {
                const isDone    = esCancelado ? true : idx < currentIdx;
                const isActive  = idx === currentIdx;
                const isPending = idx > currentIdx;
                const ts        = getTimestamp(estado.key);
                const isLast    = idx === estados.length - 1;

                return (
                    <div key={estado.key} className="flex gap-4">
                        {/* Icon + connector */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                                    isDone ? 'bg-green-500' : isPending ? 'bg-gray-100 dark:bg-slate-700' : ''
                                }`}
                                style={
                                    isActive
                                        ? { backgroundColor: estado.color, boxShadow: `0 0 0 2px white, 0 0 0 4px ${estado.color}` }
                                        : undefined
                                }
                            >
                                {isDone ? (
                                    <Icon icon="mdi:check" className="w-5 h-5 text-white" />
                                ) : (
                                    <Icon
                                        icon={estado.icon}
                                        className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-300 dark:text-slate-600'} ${isActive ? 'animate-pulse' : ''}`}
                                        style={isActive ? { color: 'white' } : undefined}
                                    />
                                )}
                            </div>
                            {!isLast && (
                                <div className={`w-0.5 flex-1 min-h-[28px] mt-1 ${isDone ? 'bg-green-400' : 'bg-gray-100 dark:bg-slate-700'}`} />
                            )}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 pb-5 ${isPending ? 'opacity-35' : ''}`}>
                            <p
                                className="font-bold text-sm"
                                style={isActive ? { color: estado.color } : undefined}
                            >
                                {estado.label}
                                {isActive && (
                                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: estado.color }}>
                                        Actual
                                    </span>
                                )}
                            </p>
                            {ts && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ts}</p>
                            )}
                            {!ts && isPending && (
                                <p className="text-xs text-gray-300 dark:text-slate-600 mt-0.5">Pendiente</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
