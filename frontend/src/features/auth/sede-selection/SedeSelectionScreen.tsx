import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/zustand/auth';
import { ISede } from '@/interfaces/auth';
import Alert from '@/components/Alert';
import useAlertStore from '@/zustand/alert';
import banner from '@/assets/fnlogin.png';
import { BRAND } from '@/lib/branding';

export default function SedeSelectionScreen() {
    const { auth, pendingSedes, selectSede, logout } = useAuthStore();
    const { loading } = useAlertStore();
    const navigate = useNavigate();
    const [selectedId, setSelectedId] = React.useState<number | null>(null);

    const handleSelect = async (sede: ISede) => {
        setSelectedId(sede.id);
        await selectSede(sede.id);
        if (!useAuthStore.getState().success) {
            setSelectedId(null);
        }
    };

    // Si ya autenticó con éxito, redirigir
    const { success } = useAuthStore();
    React.useEffect(() => {
        if (success && !pendingSedes) {
            navigate('/administrador', { replace: true });
        }
    }, [success, pendingSedes, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="flex min-h-screen w-full font-sans">
            {/* Alert */}
            <div className="fixed top-5 right-5 z-50">
                <Alert />
            </div>

            {/* LEFT PANEL */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-slate-900 relative">
                <div className="w-full max-w-md space-y-8">
                    {/* Header */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-[#4F46E5] flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Icon icon="solar:city-bold" className="text-white text-xl" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Selecciona tu sede</h1>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">
                                    Hola, <span className="font-semibold text-gray-700 dark:text-slate-200">{auth?.nombre?.split(' ')[0]}</span>. ¿A qué sede ingresas hoy?
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Sedes Grid */}
                    {!pendingSedes || pendingSedes.length === 0 ? (
                        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-5 text-center">
                            <Icon icon="solar:shield-warning-bold-duotone" className="mx-auto mb-2 text-4xl text-amber-500" />
                            <p className="text-sm font-bold text-gray-900 dark:text-white">Tu selección de sede expiró</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Vuelve a iniciar sesión para cargar tus sedes disponibles.</p>
                            <button
                                onClick={handleLogout}
                                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700"
                            >
                                <Icon icon="solar:logout-bold-duotone" width={16} />
                                Volver al login
                            </button>
                        </div>
                    ) : (
                    <div className="space-y-3">
                        {pendingSedes.map((sede) => (
                            <button
                                key={sede.id}
                                onClick={() => handleSelect(sede)}
                                disabled={loading}
                                className={`w-full group relative flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                                    selectedId === sede.id
                                        ? 'border-[#4F46E5] bg-indigo-50 dark:bg-indigo-900/20 shadow-lg shadow-indigo-100'
                                        : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-200 hover:bg-indigo-50/50 dark:hover:bg-slate-700 hover:shadow-md'
                                } ${loading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                {/* Icon */}
                                <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                    selectedId === sede.id
                                        ? 'bg-[#4F46E5] text-white'
                                        : 'bg-gray-50 dark:bg-slate-700 text-gray-400 dark:text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                                }`}>
                                    {loading && selectedId === sede.id ? (
                                        <Icon icon="mdi:loading" className="text-2xl animate-spin" />
                                    ) : sede.tipo === 'ALMACEN' ? (
                                        <Icon icon="solar:box-bold-duotone" className="text-2xl" />
                                    ) : sede.esPrincipal ? (
                                        <Icon icon="solar:buildings-bold-duotone" className="text-2xl" />
                                    ) : (
                                        <Icon icon="solar:city-bold-duotone" className="text-2xl" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{sede.nombre}</span>
                                        {sede.tipo === 'ALMACEN' ? (
                                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full">
                                                Almacén
                                            </span>
                                        ) : sede.esPrincipal ? (
                                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full">
                                                Principal
                                            </span>
                                        ) : null}
                                    </div>
                                    {sede.codigo && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Código: {sede.codigo}</p>
                                    )}
                                </div>

                                {/* Arrow */}
                                <Icon
                                    icon="solar:alt-arrow-right-bold"
                                    className={`flex-shrink-0 transition-all duration-200 ${
                                        selectedId === sede.id
                                            ? 'text-[#4F46E5] translate-x-1'
                                            : 'text-gray-300 dark:text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1'
                                    }`}
                                    width={20}
                                />
                            </button>
                        ))}
                    </div>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                        >
                            <Icon icon="solar:logout-bold-duotone" width={16} />
                            Cambiar cuenta
                        </button>
                        <p className="text-xs text-gray-300 dark:text-slate-600">© {new Date().getFullYear()} {BRAND.name}</p>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL (same as login) */}
            <div className="hidden lg:flex w-1/2 bg-[#4F46E5] relative flex-col items-center justify-center p-12 overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2" />

                <div className="absolute top-10 left-10 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white/20   flex items-center justify-center">
                        <Icon icon="solar:bolt-bold" className="text-white text-xl" />
                    </div>
                    <span className="text-white font-bold text-xl tracking-tight">{BRAND.name}</span>
                </div>

                <div className="w-full max-w-lg z-10 flex flex-col gap-10">
                    <div className="text-left space-y-4">
                        <h2 className="text-4xl font-bold text-white leading-tight">
                            Gestión Multi-Sede <br />
                            <span className="text-indigo-200">en tiempo real</span>
                        </h2>
                        <p className="text-indigo-100 text-lg leading-relaxed max-w-md">
                            Administra múltiples sucursales, controla el inventario por sede y consolida tus reportes en un solo lugar.
                        </p>
                    </div>
                    <div className="relative w-full bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-white/10 ring-1 ring-black/5">
                        <div className="h-8 bg-gray-50 border-b border-gray-200 flex items-center px-3 gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                            <div className="ml-4 h-4 w-32 bg-gray-200 rounded-full opacity-50" />
                        </div>
                        <img src={banner} alt={`${BRAND.name} Dashboard`} className="w-full h-full object-contain top-[-15px] relative" />
                    </div>
                </div>
            </div>
        </div>
    );
}
