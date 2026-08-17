import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore, type IAuthState } from '@/zustand/auth'
import { useResellerPanelStore } from '@/zustand/reseller-panel'
import { SIDEBAR_COLOR_HEX, useThemeStore, ZOOM_OPTIONS, type ZoomLevel } from '@/zustand/theme'
import Configurator from '@/components/ui/Configurator'
import { BRAND } from '@/lib/branding'

const NAV_ITEMS = [
    { to: '/reseller', end: true, icon: 'solar:widget-2-linear', label: 'Dashboard' },
    { to: '/reseller/clientes', icon: 'solar:users-group-two-rounded-linear', label: 'Mis Clientes' },
    { to: '/reseller/ganancias', icon: 'solar:money-bag-linear', label: 'Ganancias' },
    { to: '/reseller/recargas', icon: 'solar:wallet-2-linear', label: 'Recargas' },
    { to: '/reseller/estado-cuenta', icon: 'solar:document-text-linear', label: 'Estado de Cuenta' },
    { to: '/reseller/marca', icon: 'solar:pallete-2-linear', label: 'Mi Marca' },
]

export default function ResellerLayout() {
    const navigate = useNavigate()
    const location = useLocation()
    const { auth, logout: authLogout }: IAuthState = useAuthStore()
    const { branding, getBranding } = useResellerPanelStore()
    const {
        sidebarColor, sidebarType, navbarFixed, zoomLevel, setZoomLevel,
        isDarkMode, toggleDarkMode, toggleConfigurator, initTheme,
    } = useThemeStore()

    useEffect(() => {
        const accentHex = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
        document.documentElement.style.setProperty('--accent', accentHex);
        document.documentElement.style.setProperty('--accent-soft', `${accentHex}4D`);
    }, [sidebarColor]);

    // Marca blanca del reseller: su logo/nombre configurados en "Mi Marca".
    useEffect(() => {
        if (auth?.resellerId) getBranding(auth.resellerId)
    }, [auth?.resellerId, getBranding])
    const useDarkLogo = sidebarType === 'dark' || isDarkMode
    const resellerLogo = (useDarkLogo ? branding?.whiteLabelLogoWhiteUrl : branding?.whiteLabelLogoUrl)
        || branding?.whiteLabelLogoUrl
        || BRAND.logo
    const resellerName = branding?.whiteLabelNombre || BRAND.name
    useEffect(() => { setLogoBroken(false) }, [resellerLogo])

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [logoBroken, setLogoBroken] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const userMenuRef = useRef<HTMLDivElement | null>(null)

    // El portal reseller arranca en modo CLARO por defecto (marca blanca de cara
    // al cliente). Se fuerza una sola vez por navegador; si el reseller luego
    // activa el modo oscuro, su preferencia se respeta en las siguientes visitas.
    useEffect(() => {
        const KEY = 'reseller-theme-defaulted-light'
        if (!localStorage.getItem(KEY)) {
            localStorage.setItem(KEY, '1')
            if (useThemeStore.getState().isDarkMode) {
                useThemeStore.getState().toggleDarkMode() // -> claro + quita clase 'dark'
                return
            }
        }
        initTheme()
    }, [initTheme])

    // Usa la misma tipografía y scope de estilos que el panel del cliente (admin):
    // Plus Jakarta Sans forzado por `html.is-admin` en index.css.
    useEffect(() => {
        document.documentElement.classList.add('is-admin')
        return () => { document.documentElement.classList.remove('is-admin') }
    }, [])

    // Cerrar menús al hacer click fuera
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false)
        }
        document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [])

    const currentLabel = useMemo(() => {
        const match = [...NAV_ITEMS]
            .sort((a, b) => b.to.length - a.to.length)
            .find(i => i.end ? location.pathname === i.to : location.pathname.startsWith(i.to))
        return match?.label ?? 'Panel'
    }, [location.pathname])

    // Color de acento activo — respeta el color elegido en el Configurator.
    const getActiveItemColor = () => {
        switch (sidebarColor) {
            case 'brand': return 'bg-[#7551FF] shadow-[0_4px_12px_rgba(117,81,255,0.4)]'
            case 'primary': return 'bg-fuchsia-600 shadow-[0_4px_12px_rgba(192,38,211,0.35)]'
            case 'dark': return 'bg-gray-800 shadow-[0_4px_12px_rgba(31,41,55,0.35)] dark:bg-gray-700'
            case 'info': return 'bg-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.35)]'
            case 'success': return 'bg-emerald-600 shadow-[0_4px_12px_rgba(5,150,105,0.35)]'
            case 'warning': return 'bg-orange-500 shadow-[0_4px_12px_rgba(249,115,22,0.35)]'
            case 'error': return 'bg-red-500 shadow-[0_4px_12px_rgba(239,68,68,0.35)]'
            default: return 'bg-[#7551FF] shadow-[0_4px_12px_rgba(117,81,255,0.4)]'
        }
    }

    const sidebarBg = sidebarType === 'dark'
        ? 'bg-[#0a0a0a] border-r border-[#262626] text-white'
        : 'bg-[#fafafa] border-r border-[#e5e5e5] text-[#171717] dark:bg-[#0a0a0a] dark:text-white dark:border-[#262626]'

    const activeLink = `flex items-center w-full h-10 px-3 rounded-md text-[14px] font-semibold text-white ${getActiveItemColor()} transition-colors duration-150`
    const inactiveLink = `flex items-center w-full h-10 px-3 rounded-md text-[14px] font-medium ${sidebarType === 'dark'
        ? 'text-neutral-300 hover:text-white hover:bg-[#1f1f1f]'
        : 'text-neutral-600 hover:text-[#171717] hover:bg-[#efefef] dark:text-neutral-400 dark:hover:text-white dark:hover:bg-[#1f1f1f]'} transition-colors duration-150`

    const logout = () => {
        authLogout()
        navigate('/login', { replace: true })
    }

    return (
        <motion.div
            className="flex overflow-hidden bg-[#F0F2FA] transition-all duration-300 dark:bg-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            style={{
                fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                zoom: String(ZOOM_OPTIONS[zoomLevel]?.zoom ?? 1),
                height: ZOOM_OPTIONS[zoomLevel]?.height ?? '100vh',
                ...(isDarkMode ? {
                    backgroundImage: "url('/fondo.png')",
                    backgroundSize: 'cover',
                    backgroundPosition: 'center center',
                    backgroundRepeat: 'no-repeat',
                    backgroundAttachment: 'fixed',
                } : {}),
            }}
        >
            {/* Overlay móvil */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm md:hidden"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-[260px] flex-col overflow-y-auto p-4 transition-transform duration-300 md:static ${sidebarBg} ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="mb-8 mt-1 flex items-center gap-3 px-2">
                    {resellerLogo && !logoBroken ? (
                        <img src={resellerLogo} alt={resellerName} onError={() => setLogoBroken(true)} className="h-9 w-9 rounded-xl object-contain bg-white shadow-md shadow-[#7551FF]/20" />
                    ) : (
                        <div className="h-9 w-9 rounded-xl grid place-items-center text-white font-extrabold shadow-md shadow-[#7551FF]/20" style={{ background: '#7551FF' }}>
                            {String(resellerName || 'R').charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h2 className="text-[15px] font-extrabold leading-none tracking-tight">{resellerName}</h2>
                        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Panel Distribuidor</p>
                    </div>
                </div>

                <nav className="space-y-1">
                    {NAV_ITEMS.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            onClick={() => setIsSidebarOpen(false)}
                            className={({ isActive }) => isActive ? activeLink : inactiveLink}
                        >
                            <Icon icon={item.icon} className="mr-3 text-[18px]" />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer sidebar */}
                <div className="mt-auto border-t border-black/5 pt-3 dark:border-white/10">
                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[14px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                        <Icon icon="solar:logout-2-bold-duotone" className="text-[18px]" />
                        Cerrar sesión
                    </button>
                </div>
            </aside>

            {/* Contenido */}
            <main className="relative flex-1 overflow-y-auto">
                {/* Header glass */}
                <div className={`shrink-0 z-40 transition-all duration-300 ${navbarFixed ? 'sticky top-0' : 'relative'}`}>
                    <motion.header
                        className="relative flex items-center justify-between px-4 md:px-6 py-3 bg-white/70 backdrop-blur-2xl border-b border-slate-200/50 dark:bg-slate-950/30 dark:border-white/5 transition-all duration-300"
                        initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}
                    >
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#7551FF]/40 to-transparent" />

                        {/* Izquierda */}
                        <div className="flex items-center gap-3">
                            <motion.button
                                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
                                className="md:hidden grid h-10 w-10 place-items-center rounded-xl border border-slate-200/60 bg-slate-100/60 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-300 transition-colors"
                                onClick={() => setIsSidebarOpen(true)}
                                aria-label="Abrir menú"
                            >
                                <Icon icon="solar:hamburger-menu-linear" width="22" />
                            </motion.button>
                            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200/60 bg-slate-100/60 px-3 py-1.5 text-[13px] font-medium backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
                                <Icon icon="solar:crown-star-bold-duotone" width="15" className="text-[#7551FF]" />
                                <span className="text-slate-400 dark:text-slate-500">Distribuidor</span>
                                <Icon icon="solar:alt-arrow-right-linear" width="12" className="text-slate-300 dark:text-slate-600" />
                                <span className="font-bold text-[#7551FF] dark:text-violet-300">{currentLabel}</span>
                            </div>
                        </div>

                        {/* Derecha */}
                        <div className="flex items-center gap-2.5">
                            {/* Personalizar colores de la UI */}
                            <motion.button
                                whileHover={{ scale: 1.06, rotate: 45 }} whileTap={{ scale: 0.92 }}
                                onClick={toggleConfigurator}
                                className="hidden md:grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/60 bg-slate-100/50 text-slate-500 hover:bg-white hover:text-[#7551FF] dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
                                title="Personalizar colores"
                            >
                                <Icon icon="solar:palette-bold-duotone" width="20" />
                            </motion.button>

                            {/* Perfil */}
                            <div className="relative" ref={userMenuRef}>
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    type="button"
                                    className={`flex items-center gap-2.5 rounded-2xl pl-1.5 pr-2.5 py-1.5 transition-all border ${isUserMenuOpen ? 'border-[#7551FF]/30 bg-[#7551FF]/[0.06]' : 'border-slate-200/60 bg-slate-100/50 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'}`}
                                    onClick={() => setIsUserMenuOpen(p => !p)}
                                    aria-haspopup="menu" aria-expanded={isUserMenuOpen}
                                >
                                    <span className="relative shrink-0">
                                        <span className="grid h-[34px] w-[34px] place-items-center rounded-xl bg-gradient-to-br from-[#7551FF] to-[#9f7bff] text-sm font-black text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
                                            {auth?.nombre?.charAt(0)?.toUpperCase()}
                                        </span>
                                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                                    </span>
                                    <div className="hidden md:flex flex-col items-start gap-0">
                                        <span className="text-[13px] font-bold text-slate-800 dark:text-gray-100 leading-tight">{auth?.nombre?.split(' ')[0]}</span>
                                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-gray-500 tracking-wider leading-tight">Distribuidor</span>
                                    </div>
                                    <motion.span animate={{ rotate: isUserMenuOpen ? 180 : 0 }} className="hidden md:block">
                                        <Icon icon="solar:alt-arrow-down-bold" className="text-slate-400 dark:text-gray-500" width="14" />
                                    </motion.span>
                                </motion.button>

                                <AnimatePresence>
                                    {isUserMenuOpen && (
                                        <motion.div
                                            className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-gray-200/60 dark:shadow-black/40 z-[999999] overflow-hidden"
                                            initial={{ opacity: 0, scale: 0.95, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -6 }} transition={{ duration: 0.15 }}
                                        >
                                            <div className="px-4 py-3.5 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
                                                <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{auth?.nombre}</p>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">Panel Distribuidor</p>
                                            </div>
                                            <ul className="py-1.5">
                                                <li>
                                                    <button
                                                        onClick={() => { setIsUserMenuOpen(false); navigate('/reseller/marca') }}
                                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-[#7551FF]/[0.06] hover:text-[#7551FF] transition-colors"
                                                    >
                                                        <Icon icon="solar:crown-star-bold-duotone" width="18" /> Mi Marca
                                                    </button>
                                                </li>
                                                <li className="border-t border-gray-100 dark:border-slate-700 mt-1 pt-2 px-4 pb-1">
                                                    <div className="mb-2 flex items-center gap-2.5 text-[13px] font-medium text-gray-600 dark:text-gray-300">
                                                        <Icon icon="solar:minimize-square-3-bold-duotone" width="18" />
                                                        Zoom
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-1">
                                                        {ZOOM_OPTIONS.map(opt => (
                                                            <button
                                                                key={opt.level}
                                                                onClick={() => setZoomLevel(opt.level as ZoomLevel)}
                                                                title={opt.level === 0 ? 'Normal' : opt.level === 1 ? 'Compacto' : opt.level === 2 ? 'Más compacto' : 'Mínimo'}
                                                                className={`rounded-lg py-1.5 text-[11px] font-bold transition-colors ${
                                                                    zoomLevel === opt.level
                                                                        ? 'bg-violet-600 text-white'
                                                                        : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                                                                }`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </li>
                                                <li className="border-t border-gray-100 dark:border-slate-700 mt-1 pt-1">
                                                    <button
                                                        onClick={toggleDarkMode}
                                                        className="w-full flex items-center justify-between gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                                                    >
                                                        <span className="flex items-center gap-2.5">
                                                            <Icon icon={isDarkMode ? 'solar:sun-bold-duotone' : 'solar:moon-bold-duotone'} width="18" className={isDarkMode ? 'text-amber-400' : ''} />
                                                            Modo oscuro
                                                        </span>
                                                        <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isDarkMode ? 'bg-violet-600' : 'bg-gray-300 dark:bg-slate-600'}`}>
                                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isDarkMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                        </span>
                                                    </button>
                                                </li>
                                                <li className="border-t border-gray-100 dark:border-slate-700 mt-1 pt-1">
                                                    <button
                                                        onClick={() => { setIsUserMenuOpen(false); logout() }}
                                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    >
                                                        <Icon icon="solar:logout-2-bold-duotone" width="18" /> Cerrar sesión
                                                    </button>
                                                </li>
                                            </ul>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.header>
                </div>

                <div className="p-5">
                    <Outlet />
                </div>
            </main>

            <Configurator />
        </motion.div>
    )
}
