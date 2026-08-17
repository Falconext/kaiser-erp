import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { BRAND } from '@/lib/branding';

const Loading = () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center bg-white/90 dark:bg-[#0A0D14]/90   transition-all duration-300">
            <div className="flex flex-col items-center gap-4">
                {/* Logo Animado */}
                <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
                    <div className="relative w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-xl dark:shadow-none flex items-center justify-center border border-indigo-50 dark:border-slate-700">
                        <Icon icon="solar:bolt-bold" className="text-indigo-600 text-3xl animate-pulse rounded-full" />
                    </div>
                    {/* Ring Spinner */}
                    <div className="absolute -inset-4 border-2 border-indigo-100 border-t-indigo-600 rounded-full w-24 h-24 animate-spin"></div>
                </div>

                <div className="text-center space-y-1 mt-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white tracking-tight">{BRAND.name}</h3>
                    <p className="text-sm text-indigo-500 font-medium animate-pulse">Cargando...</p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Loading;