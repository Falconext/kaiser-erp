import React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { BRAND } from '@/lib/branding';
import { IUser } from '@/interfaces/auth';

interface WelcomeModalProps {
    user: IUser;
    onStartTour: () => void;
    onSkip: () => void;
}

const MODULES = [
    { icon: 'solar:home-angle-bold-duotone', label: 'Dashboard', desc: 'Ventas y métricas en tiempo real' },
    { icon: 'solar:bill-list-bold-duotone', label: 'Facturación', desc: 'Boletas y facturas con SUNAT' },
    { icon: 'solar:box-bold-duotone', label: 'Productos', desc: 'Catálogo, precios e inventario' },
    { icon: 'solar:users-group-rounded-bold-duotone', label: 'Clientes', desc: 'Registro con DNI y RUC' },
    { icon: 'solar:document-text-bold-duotone', label: 'Cotizaciones', desc: 'Presupuestos que se convierten en facturas' },
];

const ACCENT = BRAND.primaryColor || '#3E2BC7';

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ user, onStartTour, onSkip }) => {
    const firstName = user.nombre?.split(' ')[0] || 'bienvenido';
    const empresaNombre = user.empresa?.nombre || BRAND.name;

    return createPortal(
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)' }}
        >
            <div
                className="relative w-full max-w-[560px] rounded-2xl shadow-2xl overflow-hidden
                           bg-white dark:bg-gray-900
                           border border-gray-100 dark:border-transparent"
                style={{ animation: 'wt-slide-up 0.35s cubic-bezier(0.16,1,0.3,1)' }}
            >
                <style>{`
                    @keyframes wt-slide-up {
                        from { opacity: 0; transform: translateY(24px) scale(0.97); }
                        to   { opacity: 1; transform: translateY(0) scale(1); }
                    }
                `}</style>

                {/* Header con accent sutil */}
                <div className="px-8 pt-8 pb-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${ACCENT}18` }}
                        >
                            <Icon icon="solar:rocket-bold-duotone" style={{ color: ACCENT, fontSize: 22 }} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
                                {empresaNombre}
                            </p>
                            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white leading-tight" style={{ letterSpacing: '-0.4px' }}>
                                Hola, {firstName} 👋
                            </h1>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        Tu sistema está listo. Te mostramos los 5 módulos clave para que
                        empieces a facturar y gestionar tu negocio desde hoy.
                    </p>
                </div>

                {/* Divisor */}
                <div className="mx-8 border-t border-gray-100 dark:border-white/8" />

                {/* Mapa de ruta — la firma del diseño */}
                <div className="px-8 py-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">
                        Tu ruta de inicio rápido
                    </p>
                    <div className="relative">
                        {/* Línea vertical conectora */}
                        <div
                            className="absolute left-[18px] top-5 bottom-5 w-px"
                            style={{ background: `linear-gradient(to bottom, ${ACCENT}40, ${ACCENT}10)` }}
                        />

                        <div className="space-y-0">
                            {MODULES.map((mod, i) => (
                                <div key={mod.label} className="flex items-center gap-4 py-2.5 relative">
                                    {/* Dot de la ruta */}
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10"
                                        style={{
                                            background: i === 0 ? ACCENT : `${ACCENT}12`,
                                            transition: 'background 0.2s',
                                        }}
                                    >
                                        <Icon
                                            icon={mod.icon}
                                            style={{
                                                color: i === 0 ? '#fff' : ACCENT,
                                                fontSize: 18,
                                            }}
                                        />
                                    </div>

                                    {/* Texto */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">
                                            {mod.label}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            {mod.desc}
                                        </p>
                                    </div>

                                    {/* Número de paso */}
                                    <span className="text-xs font-medium text-gray-300 dark:text-gray-600 flex-shrink-0">
                                        {i + 1}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer con botones */}
                <div className="px-8 pb-7 pt-2 flex flex-col gap-2.5">
                    <button
                        onClick={onStartTour}
                        className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all
                                   hover:opacity-90 active:scale-[0.98]"
                        style={{
                            background: ACCENT,
                            boxShadow: `0 6px 20px ${ACCENT}35`,
                        }}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Icon icon="solar:play-bold" style={{ fontSize: 15 }} />
                            Comenzar tour del sistema
                        </span>
                    </button>
                    <button
                        onClick={onSkip}
                        className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-400
                                   dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300
                                   transition-colors border border-transparent
                                   hover:border-gray-200 dark:hover:border-white/10"
                    >
                        Explorar por mi cuenta
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
