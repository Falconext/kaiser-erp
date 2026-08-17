import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, type IAuthState } from '@/zustand/auth'
import NotificacionesCampana from '@/components/NotificacionesCampana'
import { hasPermission, hasPlanFeature, hasSubPermission, getRedirectPath } from '@/utils/permissions'
import { useThemeStore, SIDEBAR_COLOR_HEX, ZOOM_OPTIONS, type ZoomLevel } from '@/zustand/theme'
import Configurator from '@/components/ui/Configurator'
import { BRAND, getBrandByKey } from '@/lib/branding'
import { esRubroFabricacion } from '@/utils/rubro-features'
import { AnimatePresence, motion } from 'framer-motion'
import { accordionReveal, fadeIn, fadeUp, interactiveHover, navItemReveal, navStagger, pageTransition, scaleIn, slideRight } from '@/lib/motion/presets'
import { useReducedMotionPreference } from '@/lib/motion/reducedMotion'
import { MODULE_META, SUBMODULE_META, LEGACY_MODULE_ROUTES, LEGACY_SUBMODULE_ROUTES, type SidebarSubItem } from '@/layouts/sidebar/sidebarMeta'

const isDesktopBuild = String(import.meta.env.VITE_VENDIFY_DESKTOP || '').toLowerCase() === 'true'

// Convierte cualquier icono (solar/mdi/etc.) a su variante outline (línea),
// para que los iconos del sidebar —incluidos los que vienen de la BD (modulo.icono)—
// se muestren en trazo y no rellenos.
const toOutlineIcon = (name?: string): string => {
  if (!name || typeof name !== 'string') return name || 'solar:circle-linear'
  if (name.startsWith('solar:')) {
    return name
      .replace(/-bold-duotone$/, '-linear')
      .replace(/-line-duotone$/, '-linear')
      .replace(/-bold$/, '-linear')
      .replace(/-duotone$/, '-linear')
      .replace(/-outline$/, '-linear')
  }
  // Otros sets (mdi, etc.): quitar sufijo relleno común.
  return name.replace(/-(fill|filled|bold|solid)$/, '-outline')
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { auth, sedeActiva, selectSede }: IAuthState = useAuthStore()
  const { sidebarColor, sidebarType, sidebarCollapsed, setSidebarCollapsed, navbarFixed, zoomLevel, setZoomLevel, isDarkMode, toggleDarkMode, toggleConfigurator, initTheme } = useThemeStore()

  // El color de acento elegido en Personalización se publica como variable CSS
  // global (--accent): los botones principales del panel la consumen.
  useEffect(() => {
    const accentHex = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF'
    document.documentElement.style.setProperty('--accent', accentHex)
    // Variante translúcida (~30%) para anillos de foco de inputs/selects/calendars.
    document.documentElement.style.setProperty('--accent-soft', `${accentHex}4D`)
  }, [sidebarColor])

  // Detectar si el rubro es restaurante para cambiar nombres del menú
  const isRestaurante = useMemo(() => {
    const rubroNombre = auth?.empresa?.rubro?.nombre?.toLowerCase() || ''
    return rubroNombre.includes('restaurante') || rubroNombre.includes('comida') || rubroNombre.includes('alimento')
  }, [auth?.empresa?.rubro?.nombre])

  const isFabricacion = useMemo(() => {
    return esRubroFabricacion(auth?.empresa?.rubro?.nombre)
  }, [auth?.empresa?.rubro?.nombre])

  const [nameNavbar, setNameNavbar] = useState<string>('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [navQuery, setNavQuery] = useState('')
  // Chrome ignora autocomplete="off" y autocompleta el email en el primer input de
  // texto de la página (este buscador) cuando el Perfil tiene form de contraseña.
  // readOnly hasta el primer foco evita ese autofill; se habilita al hacer clic.
  const [navSearchReadOnly, setNavSearchReadOnly] = useState(true)
  const matchesNavQuery = (label: string) => !navQuery.trim() || label.toLowerCase().includes(navQuery.trim().toLowerCase())
  const [openModuleCode, setOpenModuleCode] = useState<string | null>(null)
  const toggleModule = (codigo: string) => setOpenModuleCode(prev => prev === codigo ? null : codigo)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const autoCollapsePaths = ['/administrador/ventas', '/administrador/tienda/pedidos']
  const isSidebarCollapsed = sidebarCollapsed || autoCollapsePaths.some(p => location.pathname.startsWith(p))
  const [isSedeMenuOpen, setIsSedeMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  const sedeMenuRef = useRef<HTMLDivElement | null>(null)
  const mainRef = useRef<HTMLElement | null>(null)
  const scrollYRef = useRef(0)
  const defaultProfileLogo = 'https://icons.veryicon.com/png/o/miscellaneous/two-color-icon-library/user-286.png'
  const reduceMotion = useReducedMotionPreference()

  const companyLogoSrc = useMemo(() => {
    const logo = auth?.empresa?.logo?.trim()
    if (!logo) return defaultProfileLogo
    if (/^data:image\//i.test(logo)) return logo
    if (/^(https?:)?\/\//i.test(logo) || logo.startsWith('/')) return logo
    return `data:image/png;base64,${logo}`
  }, [auth?.empresa?.logo])

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!userMenuRef.current) return
      if (!userMenuRef.current.contains(e.target as Node)) setIsUserMenuOpen(false)
      if (sedeMenuRef.current && !sedeMenuRef.current.contains(e.target as Node)) setIsSedeMenuOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsUserMenuOpen(false); setIsSedeMenuOpen(false) }
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEsc)
    initTheme()

    // Controlar el overflow de la etiqueta html solo para rutas de administrador
    document.documentElement.classList.add('is-admin')

    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEsc)
      document.documentElement.classList.remove('is-admin')
    }
  }, [])

  useEffect(() => {
    if (location.pathname === '/administrador') setNameNavbar('Administrador')
    else if (location.pathname.startsWith('/administrador/')) {
      const name = location.pathname.replace('/administrador/', '')
      setNameNavbar(name.charAt(0).toUpperCase() + name.slice(1))
    }
  }, [location.pathname])

  const isAlmacen = sedeActiva?.tipo === 'ALMACEN'
  // Almacén con facturación habilitada: además de kardex, permite el módulo de comprobantes.
  const almacenFactura = isAlmacen && sedeActiva?.permiteFacturacion === true

  // Redireccionar a primer módulo permitido si no tiene acceso a dashboard
  useEffect(() => {
    if (!auth) return
    if (location.pathname === '/administrador' && !hasPermission(auth, 'dashboard')) {
      const path = getRedirectPath(auth, location.pathname)
      if (path && path !== location.pathname) {
        navigate(path, { replace: true })
      }
    }
  }, [auth, location.pathname, navigate])

  // Sede tipo ALMACEN: solo kardex permitido (y facturación si la sede lo habilita)
  useEffect(() => {
    if (!isAlmacen) return
    const allowedPrefixes = ['/administrador/kardex']
    if (almacenFactura) allowedPrefixes.push('/administrador/facturacion')
    const permitido = allowedPrefixes.some((p) => location.pathname.startsWith(p))
    if (!permitido) {
      navigate('/administrador/kardex/productos', { replace: true })
    }
  }, [isAlmacen, almacenFactura, location.pathname, navigate])

  // Robust scroll lock for mobile drawer using position:fixed and restoring scroll
  useEffect(() => {
    const body = document.body

    // Prevent body scroll in admin layout to avoid double scrollbars
    const originalOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    const lock = () => {
      scrollYRef.current = window.scrollY
      body.style.position = 'fixed'
      body.style.top = `-${scrollYRef.current}px`
      body.style.left = '0'
      body.style.right = '0'
      body.style.width = '100%'
    }
    const unlock = () => {
      const y = Math.abs(parseInt(body.style.top || '0', 10)) || 0
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      if (y) window.scrollTo(0, y)
    }

    if (isSidebarOpen && window.innerWidth < 768) lock()
    else unlock()

    return () => {
      unlock()
      body.style.overflow = originalOverflow;
    }
  }, [isSidebarOpen])

  const logout = () => {
    useAuthStore.getState().logout()
    navigate('/login', { replace: true })
  }

  // Determine theme based on role
  const isSystemAdmin = auth?.rol === 'ADMIN_SISTEMA'

  // Sidebar dinámico: módulos y submódulos del plan, ordenados
  const planModules = useMemo(() => {
    const mods = auth?.empresa?.plan?.modulosAsignados ?? [];
    const sorted = [...mods].sort((a, b) => (a.modulo.orden ?? 0) - (b.modulo.orden ?? 0));

    return sorted;
  }, [auth?.empresa?.plan?.modulosAsignados, auth?.rol]);

  // Comisiones (Mis Comisiones / Comisiones del equipo) viven dentro del dashboard
  // de finanzas, que pertenece al módulo "mi-negocio" (actual) o "reportes" (legacy).
  // Solo se muestran si el plan incluye ese módulo financiero — así el plan Negocio
  // las tiene y el plan Emprendedor (que no accede a finanzas) no.
  const planTieneFinanzas = useMemo(
    () => planModules.some(({ modulo }) => modulo.codigo === 'mi-negocio' || modulo.codigo === 'reportes'),
    [planModules],
  );

  const planSubModulesAll = useMemo(() => {
    return auth?.empresa?.plan?.subModulosAsignados ?? [];
  }, [auth?.empresa?.plan?.subModulosAsignados]);

  const mapSubModuleToSidebarItem = (subModulo: any): SidebarSubItem | null => {
    if (!hasSubPermission(auth, subModulo.codigo)) return null;
    const smMeta = SUBMODULE_META[subModulo.codigo];
    if (smMeta?.condition && !smMeta.condition(auth)) return null;
    return {
      codigo: subModulo.codigo,
      nombre: smMeta?.labelOverride?.(auth) ?? subModulo.nombre ?? subModulo.codigo,
      ruta: subModulo.ruta ?? LEGACY_SUBMODULE_ROUTES[subModulo.codigo] ?? '#',
      end: smMeta?.end,
    } as SidebarSubItem;
  };

  const getModuleSubItems = (modulo: any): SidebarSubItem[] => {
    const moduloId = modulo.id ?? 0;
    const assignedSubModules = (planSubModulesAll as any[])
      .filter((psm: any) => psm.subModulo.moduloId === moduloId)
      .sort((a: any, b: any) => (a.subModulo.orden ?? 0) - (b.subModulo.orden ?? 0))
      .map(({ subModulo }: any) => subModulo);

    const sourceSubModules = assignedSubModules.length > 0
      ? assignedSubModules
      : [...(modulo.subModulos ?? [])].sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0));

    return sourceSubModules
      .map(mapSubModuleToSidebarItem)
      .filter(Boolean) as SidebarSubItem[];
  };

  // Para ADMIN_SISTEMA con sistemaNegocio asignado, usar branding de su plataforma
  const sidebarBrand = isSystemAdmin && auth?.sistemaNegocio
    ? getBrandByKey(auth.sistemaNegocio)
    : BRAND

  // Tinte de fondo UNIFORME del sidebar según el color elegido (sin degradado
  // blanco arriba, para que el color se vea consistente incluida la zona del logo).
  const getSidebarTint = (color: string) => {
    switch (color) {
      case 'brand':   return 'bg-[#F3F1FF]';   // violeta
      case 'primary': return 'bg-fuchsia-50';  // fucsia
      case 'dark':    return 'bg-slate-100';   // gris/navy
      case 'info':    return 'bg-blue-50';     // azul
      case 'success': return 'bg-emerald-50';  // verde
      case 'warning': return 'bg-orange-50';   // naranja
      case 'error':   return 'bg-red-50';      // rojo
      default:        return 'bg-[#fafafa]';   // neutro
    }
  };

  // Theme adaptado al diseño de referencia
  const getActiveItemColor = () => {
    switch (sidebarColor) {
      case 'brand': return 'bg-[#7551FF] shadow-[0_4px_12px_rgba(117,81,255,0.4)]';
      case 'primary': return 'bg-fuchsia-600 shadow-[0_4px_12px_rgba(192,38,211,0.35)]';
      case 'dark': return 'bg-gray-800 shadow-[0_4px_12px_rgba(31,41,55,0.35)] dark:bg-gray-700';
      case 'info': return 'bg-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.35)]';
      case 'success': return 'bg-emerald-600 shadow-[0_4px_12px_rgba(5,150,105,0.35)]';
      case 'warning': return 'bg-orange-500 shadow-[0_4px_12px_rgba(249,115,22,0.35)]';
      case 'error': return 'bg-red-500 shadow-[0_4px_12px_rgba(239,68,68,0.35)]';
      default: return 'bg-violet-600 shadow-[0_4px_12px_rgba(124,58,237,0.35)]';
    }
  };

  const getSubmenuActiveColor = () => {
    switch (sidebarColor) {
      case 'brand': return 'text-[#7551FF] bg-[#7551FF]/10 dark:bg-[#7551FF]/20';
      case 'primary': return 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/30';
      case 'dark': return 'text-gray-800 bg-gray-100 dark:bg-gray-800/50 dark:text-gray-200';
      case 'info': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/30';
      case 'success': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30';
      case 'warning': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/30';
      case 'error': return 'text-red-600 bg-red-50 dark:bg-red-900/30';
      default: return 'text-violet-600 bg-violet-50 dark:bg-violet-900/30';
    }
  };

  const theme = {
    mainPadding: 'p-3 sm:p-5',

    get sidebarBg() {
      // 'dark' fuerza sidebar oscuro. En claro, se aplica un tinte uniforme del
      // color elegido (sin degradado blanco arriba) para que el color se note de
      // forma consistente en todo el sidebar, incluida la zona del logo.
      if (sidebarType === 'dark') return 'bg-[#0a0a0a] border-r border-[#262626] text-white';
      return `${getSidebarTint(sidebarColor)} border-r border-[#e5e5e5] text-[#171717] dark:bg-[#0a0a0a] dark:text-white dark:border-[#262626]`;
    },

    get sidebarText() {
      return sidebarType === 'dark' ? 'text-white' : 'text-[#171717] dark:text-white';
    },

    get sidebarTextMuted() {
      return sidebarType === 'dark' ? 'text-neutral-400' : 'text-neutral-500 dark:text-neutral-500';
    },

    // Superficie de tarjetas/inputs dentro del sidebar (logo, buscador, upgrade).
    // Respeta el tipo de sidebar (claro/oscuro), no solo el modo oscuro global.
    get sidebarSurface() {
      return sidebarType === 'dark'
        ? 'border-white/10 bg-white/5'
        : 'border-[#e5e5e5] bg-white dark:border-[#262626] dark:bg-white/5';
    },
    get sidebarSurfaceHover() {
      return sidebarType === 'dark'
        ? 'border-white/10 bg-white/5 hover:bg-white/10'
        : 'border-[#e5e5e5] bg-white hover:bg-[#f1f1f3] dark:border-[#262626] dark:bg-white/5 dark:hover:bg-white/10';
    },

    // Item activo — superficie neutra suave + barra de acento a la izquierda + texto oscuro
    get activeLink() {
      const base = isSidebarCollapsed
        ? 'justify-center mx-auto h-9 w-9 p-0 rounded-lg'
        : "w-full h-10 px-3 rounded-lg before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-[var(--accent)]";
      const surface = sidebarType === 'dark' ? 'text-white bg-white/10' : 'text-[#171717] dark:text-white bg-[#f1f1f3] dark:bg-white/10';
      return `relative flex items-center ${base} text-[14px] font-semibold ${surface} transition-colors duration-150 group`;
    },
    // Item inactivo
    get inactiveLink() {
      return `relative flex items-center ${isSidebarCollapsed ? 'justify-center mx-auto h-9 w-9 p-0 rounded-lg' : 'w-full h-10 px-3 rounded-lg'} text-[14px] font-medium ${sidebarType === 'dark' ? 'text-neutral-300 hover:text-white hover:bg-white/5' : 'text-neutral-600 hover:text-[#171717] hover:bg-[#f1f1f3] dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/5'} transition-colors duration-150 group`;
    },
    // Accordion activo e inactivo
    get accordionActive() {
      const base = isSidebarCollapsed
        ? 'justify-center mx-auto h-9 w-9 p-0 rounded-lg'
        : "justify-between w-full h-10 px-3 rounded-lg before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-[3px] before:rounded-r-full before:bg-[var(--accent)]";
      const surface = sidebarType === 'dark' ? 'text-white bg-white/10' : 'text-[#171717] dark:text-white bg-[#f1f1f3] dark:bg-white/10';
      return `relative flex items-center ${base} text-[14px] font-semibold ${surface} transition-colors text-left`;
    },
    get accordionInactive() {
      return `relative flex items-center ${isSidebarCollapsed ? 'justify-center mx-auto h-9 w-9 p-0 rounded-lg' : 'justify-between w-full h-10 px-3 rounded-lg'} text-[14px] font-medium ${sidebarType === 'dark' ? 'text-neutral-300 hover:text-white hover:bg-white/5' : 'text-neutral-600 hover:text-[#171717] hover:bg-[#f1f1f3] dark:text-neutral-400 dark:hover:text-white dark:hover:bg-white/5'} transition-colors text-left`;
    },
    // Submenu links
    get submenuBorder() {
      return sidebarType === 'dark' ? 'border-[#262626]' : 'border-[#e5e5e5] dark:border-[#262626]';
    },
    get submenuActiveLink() {
      return `flex items-center rounded-md px-3 py-2 text-[13px] font-semibold ${getSubmenuActiveColor()} transition-colors`;
    },
    get submenuInactiveLink() {
      return `flex items-center rounded-md px-3 py-2 text-[13px] font-medium ${sidebarType === 'dark' ? 'text-neutral-400 hover:text-white hover:bg-[#1f1f1f]' : 'text-neutral-500 hover:text-[#171717] hover:bg-[#efefef] dark:text-neutral-400 dark:hover:text-white dark:hover:bg-[#1f1f1f]'} transition-colors`;
    },
  };


  return (
    <motion.div
      className="flex overflow-hidden bg-[#F0F2FA] dark:bg-slate-950 transition-all duration-300"
      style={{
        fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        // El zoom NO se aplica aquí: solo debe afectar al contenido (Outlet),
        // no al header ni al sidebar. Ver el contenedor del <Outlet /> más abajo.
        height: '100vh',
        // Fondo del dashboard = imagen fondo.png (sin color de fondo), solo en
        // modo oscuro. El shell (main/navbar) queda transparente para dejarlo ver.
        ...(isDarkMode
          ? {
              backgroundImage: "url('/fondo.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed',
            }
          : {}),
      }}
      variants={fadeIn}
      initial="initial"
      animate={reduceMotion ? { opacity: 1 } : 'animate'}
    >

      <motion.aside
        className={`print:hidden fixed inset-y-0 left-0 ${theme.sidebarBg} flex flex-col pt-4 pb-4 w-[85%] max-w-[300px] transform transition-all duration-300 ease-in-out md:relative md:my-0 md:ml-0 md:rounded-none ${isSidebarCollapsed ? 'md:w-[64px] items-center px-2' : 'md:w-[300px] px-2'} md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 z-[70]' : '-translate-x-full z-[45] md:translate-x-0'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Company card — Kaiser: isotipo + KAISER / Kaiser Corporation S.A. */}
        <div className={`mb-3 ${isSidebarCollapsed ? 'flex justify-center px-0' : 'px-1'}`}>
          <div className={`flex items-center gap-2.5 rounded-xl ${isSidebarCollapsed ? 'p-1.5 justify-center' : 'p-2.5'}`}>
            <img src="/kaiser-isotipo.png" alt="Kaiser" className={`shrink-0 object-contain ${isSidebarCollapsed ? 'h-9 w-9' : 'h-10 w-10'}`} />
            {!isSidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1 leading-tight">
                  <h2 className={`truncate text-[16px] font-extrabold tracking-wide ${theme.sidebarText}`}>KAISER</h2>
                  <p className={`truncate text-[10px] font-medium tracking-wide ${theme.sidebarTextMuted}`}>Kaiser Corporation S.A.</p>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(true)}
                  className="shrink-0 grid h-6 w-6 place-items-center rounded-md text-neutral-400 hover:bg-[#f1f1f3] hover:text-[#171717] dark:hover:bg-white/10 dark:hover:text-white transition-colors"
                  title="Contraer menú"
                >
                  <Icon icon="solar:double-alt-arrow-left-linear" width={16} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        {!isSidebarCollapsed && (auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'USUARIO_EMPRESA') && (
          <div className="mb-3 px-1">
            <div className={`flex items-center gap-2 rounded-lg border ${theme.sidebarSurface} px-2.5 h-9 focus-within:border-[var(--accent)] transition-colors`}>
              <Icon icon="solar:magnifer-linear" width={16} className="text-neutral-400 shrink-0" />
              <input
                type="text"
                name="menu-search"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                readOnly={navSearchReadOnly}
                onFocus={() => setNavSearchReadOnly(false)}
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="Buscar en el menú…"
                className={`min-w-0 flex-1 bg-transparent border-none focus:border-none outline-none text-[13px] placeholder:text-neutral-400 focus:outline-none ${sidebarType === 'dark' ? 'text-white' : 'text-[#171717] dark:text-white'}`}
              />
              {navQuery ? (
                <button onClick={() => setNavQuery('')} className="text-neutral-400 hover:text-[#171717] dark:hover:text-white shrink-0" title="Limpiar">
                  <Icon icon="solar:close-circle-linear" width={15} />
                </button>
              ) : (
                <span className={`text-[10px] font-semibold text-neutral-400 border rounded px-1 shrink-0 ${sidebarType === 'dark' ? 'border-white/15' : 'border-[#e5e5e5] dark:border-[#262626]'}`}>⌘K</span>
              )}
            </div>
          </div>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className={`hidden md:flex items-center absolute top-8 -translate-y-1/2 z-[1] justify-center w-7 h-7 bg-[#fafafa] dark:bg-[#0a0a0a] text-neutral-500 dark:text-neutral-400 hover:bg-[#efefef] hover:text-[#171717] dark:hover:bg-[#1f1f1f] dark:hover:text-white rounded-full border border-[#e5e5e5] dark:border-[#262626] transition-colors cursor-pointer -right-3.5`}
          title={isSidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          <Icon icon={isSidebarCollapsed ? "solar:alt-arrow-right-linear" : "solar:alt-arrow-left-linear"} width="14" />
        </button>

      <div className={`flex-1 space-y-0.5 ${isSidebarCollapsed ? 'px-0 w-full overflow-visible mt-2' : 'overflow-y-auto overflow-x-hidden custom-scrollbar px-1'}`}>
          <motion.nav
            className="space-y-0.5 w-full"
            variants={navStagger}
            initial={reduceMotion ? false : 'initial'}
            animate="animate"
          >
            {auth?.rol === 'ADMIN_SISTEMA' && (
              <motion.div variants={navItemReveal} className="space-y-0.5">
                <NavLink onClick={() => setIsSidebarOpen(false)} to="/administrador/sistema/dashboard" className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink} title="Dashboard">
                  <Icon icon="solar:widget-5-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                  {!isSidebarCollapsed && <span>Dashboard</span>}
                </NavLink>

                <NavLink onClick={() => setIsSidebarOpen(false)} to="/administrador/empresas" className={({ isActive }) => isActive || location.pathname.startsWith('/administrador/empresas') ? theme.activeLink : theme.inactiveLink} title="Empresas">
                  <Icon icon="solar:buildings-2-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                  {!isSidebarCollapsed && <span>Empresas</span>}
                </NavLink>

                <NavLink onClick={() => setIsSidebarOpen(false)} to="/administrador/sistema/usuarios" className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink} title="Usuarios del Sistema">
                  <Icon icon="solar:shield-user-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                  {!isSidebarCollapsed && <span>Usuarios Sistema</span>}
                </NavLink>

                <NavLink onClick={() => setIsSidebarOpen(false)} to="/administrador/sistema/catalogo-global" className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink} title="Catálogo Global">
                  <Icon icon="solar:database-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                  {!isSidebarCollapsed && <span>Catálogo Global</span>}
                </NavLink>
                {!isDesktopBuild && (
                  <>
                    <NavLink onClick={() => setIsSidebarOpen(false)} to="/administrador/sistema/planes" className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink} title="Planes">
                      <Icon icon="solar:card-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                      {!isSidebarCollapsed && <span>Planes</span>}
                    </NavLink>
                    <NavLink onClick={() => setIsSidebarOpen(false)} to="/administrador/sistema/modulos" className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink} title="Módulos">
                      <Icon icon="solar:widget-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                      {!isSidebarCollapsed && <span>Módulos</span>}
                    </NavLink>
                    <NavLink onClick={() => setIsSidebarOpen(false)} to="/administrador/sistema/resellers" className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink} title="Distribuidores">
                      <Icon icon="solar:users-group-two-rounded-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                      {!isSidebarCollapsed && <span>Distribuidores</span>}
                    </NavLink>
                    <NavLink onClick={() => setIsSidebarOpen(false)} to="/administrador/sistema/catalogo-web" className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink} title="Catálogo Web">
                      <Icon icon="solar:shop-2-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                      {!isSidebarCollapsed && <span>Catálogo Web</span>}
                    </NavLink>
                  </>
                )}
                <NavLink onClick={() => setIsSidebarOpen(false)} to="/administrador/sistema/rubros" className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink} title="Rubros de Negocio">
                  <Icon icon="solar:buildings-3-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                  {!isSidebarCollapsed && <span>Rubros</span>}
                </NavLink>
                {!isDesktopBuild && (
                  <NavLink onClick={() => setIsSidebarOpen(false)} to="/administrador/sistema/disenos-tienda" className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink} title="Diseño de Tiendas">
                    <Icon icon="solar:palette-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                    {!isSidebarCollapsed && <span>Diseño Tiendas</span>}
                  </NavLink>
                )}
              </motion.div>
            )}

            {auth?.rol === 'ADMIN_SISTEMA' && !isDesktopBuild && (
              <motion.div variants={navItemReveal} className="space-y-0.5">
                <NavLink onClick={() => setIsSidebarOpen(false)} to="/administrador/sistema/finanzas" className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink} title="Finanzas del Sistema">
                  <Icon icon="solar:chart-square-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                  {!isSidebarCollapsed && <span>Finanzas</span>}
                </NavLink>
              </motion.div>
            )}

            {(auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'USUARIO_EMPRESA') && (
              <>
                {/* Aviso visual cuando la sede es un Almacén */}
                {isAlmacen && !isSidebarCollapsed && (
                  <div className="mx-2 mb-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Icon icon="solar:box-bold-duotone" width={12} /> Modo Almacén
                    </p>
                    <p className="text-[9px] text-amber-600 dark:text-amber-500 mt-0.5">{almacenFactura ? 'Acceso a Kardex y Facturación' : 'Solo acceso a Kardex'}</p>
                  </div>
                )}

                {/* Section label */}
                {!isSidebarCollapsed && (
                  <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Menú principal</p>
                )}

                {/* ── Sidebar dinámico generado desde plan.modulosAsignados ── */}
                {planModules.map(({ modulo }) => {
                  // En modo almacén solo mostrar kardex (y comprobantes si la sede habilita facturación)
                  if (isAlmacen && modulo.codigo !== 'kardex' && !(almacenFactura && modulo.codigo === 'comprobantes')) return null;
                  if (!hasPermission(auth, modulo.codigo)) return null;
                  const meta = MODULE_META[modulo.codigo];
                  if (meta?.condition && !meta.condition(auth)) return null;

                  const label = meta?.labelOverride?.(auth) ?? modulo.nombre ?? modulo.codigo;
                  if (!matchesNavQuery(label)) return null;
                  const icon = toOutlineIcon(meta?.iconOverride?.(auth) ?? modulo.icono ?? 'solar:circle-linear');
                  const ruta = modulo.ruta ?? LEGACY_MODULE_ROUTES[modulo.codigo];
                  const navRoute = meta?.navRoute?.(auth) ?? ruta ?? '#';
                  const pathPrefix = meta?.pathPrefix?.(auth) ?? ruta ?? '___';
                  const isOpen = openModuleCode === modulo.codigo;
                  const isModuleActive = location.pathname === '/administrador' && modulo.codigo === 'dashboard'
                    ? location.pathname === '/administrador'
                    : location.pathname.startsWith(pathPrefix);

                  const dbSubItems = getModuleSubItems(modulo);
                  const extraItems = meta?.extraItems?.(auth) ?? [];
                  const allSubItems = [...dbSubItems, ...extraItems];

                  if (allSubItems.length === 0) {
                    return (
                      <NavLink
                        key={modulo.id ?? modulo.codigo}
                        onClick={() => { setIsSidebarOpen(false); setNameNavbar(label); }}
                        to={ruta ?? '#'}
                        end={modulo.codigo === 'dashboard'}
                        className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink}
                        title={label}
                      >
                        <Icon icon={icon} className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                        {!isSidebarCollapsed && <span>{label}</span>}
                      </NavLink>
                    );
                  }

                  return (
                    <div key={modulo.id ?? modulo.codigo} className="relative group">
                      <button
                        onClick={() => {
                          if (isSidebarCollapsed) { navigate(navRoute); }
                          else { toggleModule(modulo.codigo); }
                          setNameNavbar(label);
                        }}
                        className={isModuleActive ? theme.accordionActive : theme.accordionInactive}
                        title={label}
                      >
                        <div className="flex items-center justify-center">
                          <Icon icon={icon} className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                          {!isSidebarCollapsed && <span>{label}</span>}
                        </div>
                        {!isSidebarCollapsed && (
                          <Icon icon="solar:alt-arrow-down-linear" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} width="18" />
                        )}
                      </button>
                      {/* Collapsed popover */}
                      {isSidebarCollapsed && (
                        <div className="absolute left-full top-0 ml-1 w-52 rounded-lg border border-[#e5e5e5] bg-[#fafafa] py-2 shadow-xl z-[9999] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all dark:border-[#262626] dark:bg-[#0a0a0a]">
                          <div className="mb-1 border-b border-[#e5e5e5] px-4 py-2 text-xs font-semibold text-neutral-500 dark:border-[#262626] dark:text-neutral-400">{label}</div>
                          {allSubItems.map(item => (
                            <NavLink key={item.codigo} onClick={() => setIsSidebarOpen(false)} to={item.ruta} end={item.end}
                              className={() => {
                                const active = item.end ? location.pathname === item.ruta : location.pathname.startsWith(item.ruta);
                                return active ? theme.submenuActiveLink : theme.submenuInactiveLink;
                              }}
                            >{item.nombre}</NavLink>
                          ))}
                        </div>
                      )}
                      <AnimatePresence initial={false}>
                        {!isSidebarCollapsed && isOpen && (
                          <motion.div
                            variants={accordionReveal}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className={'ml-4 pl-4 border-l-2 ' + theme.submenuBorder + ' space-y-1 mt-1'}
                            style={{ overflow: 'hidden' }}
                          >
                            {allSubItems.map(item => (
                              <NavLink key={item.codigo} onClick={() => setIsSidebarOpen(false)} to={item.ruta} end={item.end}
                                className={() => {
                                  const active = item.end ? location.pathname === item.ruta : location.pathname.startsWith(item.ruta);
                                  return active ? theme.submenuActiveLink : theme.submenuInactiveLink;
                                }}
                              >{item.nombre}</NavLink>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {/* LEGACY: dashboard dashboard no existente en plan (fallback) */}
                {!planModules.some(m => hasPermission(auth, m.modulo.codigo)) && (
                  <NavLink data-tour="dashboard" onClick={() => { setIsSidebarOpen(false); setNameNavbar('Administrador') }} to="/administrador" end className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink} title="Dashboard">
                    <Icon icon="solar:chart-2-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                    {!isSidebarCollapsed && <span>Dashboard</span>}
                  </NavLink>
                )}

                {/* Comisiones — parte del módulo financiero. Una sola entrada;
                    el admin ve además la pestaña "Del equipo" dentro de la página. */}
                {planTieneFinanzas && (auth?.rol === 'USUARIO_EMPRESA' || auth?.rol === 'ADMIN_EMPRESA') && matchesNavQuery('Comisiones') && (
                  <NavLink
                    onClick={() => { setIsSidebarOpen(false); setNameNavbar('Comisiones'); }}
                    to="/administrador/mis-comisiones"
                    className={({ isActive }) => isActive ? theme.activeLink : theme.inactiveLink}
                    title="Comisiones"
                  >
                    <Icon icon="solar:hand-money-linear" className={`${isSidebarCollapsed ? 'text-xl m-0' : 'mr-3 text-[18px]'}`} />
                    {!isSidebarCollapsed && <span>Comisiones</span>}
                  </NavLink>
                )}

              </>
            )}

          </motion.nav>
        </div>

        {/* Divider e info abajo (Configuración y Cerrar sesión ahora viven en el menú del usuario) */}
        {/* Kaiser ERP mono-empresa: sin tarjeta de upgrade de plan (concepto SaaS). */}
      </motion.aside>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="sidebar-backdrop"
            role="button"
            aria-label="Cerrar menú"
            tabIndex={0}
            className="print:hidden fixed inset-0 bg-black/40 z-[60] md:hidden cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsSidebarOpen(false)}
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
          />
        )}
      </AnimatePresence>

      {/* Main content */}
      <main
        ref={mainRef}
        className="flex-1 min-h-0 flex flex-col min-w-0 overflow-y-auto print:overflow-visible bg-[#F9FAFC] dark:bg-transparent"
      >
        <div className={`shrink-0 z-[60] transition-all duration-300 ${navbarFixed ? 'sticky top-0' : 'relative'}`}>
          <motion.header className="print:hidden relative flex items-center justify-between px-4 md:px-6 py-3 bg-white/70 backdrop-blur-2xl border-b border-slate-200/50 dark:bg-slate-950/30 dark:border-white/5 transition-all duration-300" variants={fadeUp} initial="initial" animate="animate">
          {/* Hairline de acento inferior */}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#7551FF]/40 to-transparent" />
          <div className="flex items-center gap-3">
            <motion.button
              className="md:hidden grid h-10 w-10 place-items-center rounded-xl border border-slate-200/60 bg-slate-100/60 text-slate-600 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-300 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Abrir menú"
              whileHover={interactiveHover.whileHover}
              whileTap={interactiveHover.whileTap}
            >
              <Icon icon="solar:hamburger-menu-linear" width="22" />
            </motion.button>
            {/* Accesos rápidos del header */}
            <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-200/60 bg-slate-100/60 p-1 text-[13px] font-medium backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              {[
                { to: '/administrador/facturacion/comprobantes', label: 'Comprobantes SUNAT', icon: 'solar:document-text-bold-duotone' },
                { to: '/administrador/ventas', label: 'Panel de ventas', icon: 'solar:cart-large-2-bold-duotone' },
                { to: '/administrador/facturacion/cotizaciones', label: 'Cotizaciones', icon: 'solar:bill-list-bold-duotone' },
              ].map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${isActive ? 'bg-[#7551FF] text-white' : 'text-slate-500 hover:bg-white hover:text-[#7551FF] dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-violet-300'}`}
                >
                  <Icon icon={icon} width={14} className="shrink-0" />
                  <span className="whitespace-nowrap">{label}</span>
                </NavLink>
              ))}
            </div>
            {/* Sede activa badge / switcher */}
            {sedeActiva && (() => {
              const todasSedes = auth?.sedes || []
              const otrasSedesActivas = todasSedes.filter(s => s.activo && s.id !== sedeActiva.id)
              const puedesCambiar = otrasSedesActivas.length > 0

              return puedesCambiar ? (
                <div className="relative hidden md:block" ref={sedeMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsSedeMenuOpen(p => !p)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
                  >
                    <Icon icon={sedeActiva.tipo === 'ALMACEN' ? 'solar:box-bold-duotone' : 'solar:city-bold-duotone'} className="text-violet-600 dark:text-violet-400" width={14} />
                    <span className="text-[12px] font-semibold text-violet-600 dark:text-violet-400 truncate max-w-[140px]">{sedeActiva.nombre}</span>
                    {sedeActiva.tipo === 'ALMACEN' && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Almacén</span>
                    )}
                    <Icon icon="solar:alt-arrow-down-linear" className="text-violet-600 dark:text-violet-400" width={12} />
                  </button>
                  <AnimatePresence>
                    {isSedeMenuOpen && (
                    <motion.div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg py-1 min-w-[200px]" variants={scaleIn} initial="initial" animate="animate" exit="exit">
                      <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500 px-3 py-1 tracking-wider">Cambiar sede</p>
                      {todasSedes.filter(s => s.activo).map(sede => (
                        <button
                          key={sede.id}
                          type="button"
                          onClick={() => {
                            selectSede(sede.id)
                            setIsSedeMenuOpen(false)
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${sede.id === sedeActiva.id ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 font-semibold cursor-default' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'}`}
                        >
                          <Icon icon={sede.id === sedeActiva.id ? 'solar:check-circle-bold' : sede.tipo === 'ALMACEN' ? 'solar:box-linear' : 'solar:city-linear'} width={14} />
                          {sede.nombre}
                          {sede.tipo === 'ALMACEN'
                            ? <span className="ml-auto text-[9px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase">Almacén</span>
                            : sede.esPrincipal
                              ? <span className="ml-auto text-[10px] text-gray-400 dark:text-slate-500 font-normal">Principal</span>
                              : null}
                        </button>
                      ))}
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/40 rounded-lg">
                  <Icon icon={sedeActiva.tipo === 'ALMACEN' ? 'solar:box-bold-duotone' : 'solar:city-bold-duotone'} className="text-violet-600 dark:text-violet-400" width={14} />
                  <span className="text-[12px] font-semibold text-violet-600 dark:text-violet-400 truncate max-w-[140px]">{sedeActiva.nombre}</span>
                  {sedeActiva.tipo === 'ALMACEN' && (
                    <span className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Almacén</span>
                  )}
                </div>
              )
            })()}
          </div>

          <div className="flex items-center gap-2.5">
            {/* Personalizar colores de la UI */}
            <motion.button
              whileHover={{ scale: 1.06, rotate: 45 }}
              whileTap={{ scale: 0.92 }}
              onClick={toggleConfigurator}
              className="hidden md:grid h-10 w-10 place-items-center rounded-2xl border border-slate-200/60 bg-slate-100/50 text-slate-500 hover:bg-white hover:text-[#7551FF] dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 transition-colors"
              title="Personalizar colores"
            >
              <Icon icon="solar:palette-bold-duotone" width="20" />
            </motion.button>

            {/* Notificaciones */}
            {(auth?.rol === 'ADMIN_EMPRESA' || auth?.rol === 'USUARIO_EMPRESA') && (
              <div className="hidden md:block">
                <NotificacionesCampana />
              </div>
            )}

            {/* User profile */}
            <div className="relative" ref={userMenuRef}>
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="button"
                className={`flex items-center gap-2.5 rounded-2xl outline-none focus:outline-none pl-1.5 pr-2.5 py-1.5 transition-all border ${isUserMenuOpen ? 'border-[#7551FF]/30 bg-[#7551FF]/[0.06] dark:bg-[#7551FF]/20' : 'border-slate-200/60 bg-slate-100/50 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'}`}
                onClick={() => setIsUserMenuOpen((p) => !p)}
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
              >
                <span className="relative shrink-0">
                  <img
                    width={34}
                    height={34}
                    className="h-[34px] w-[34px] rounded-xl object-contain bg-white p-0.5 ring-2 ring-white shadow-sm dark:bg-slate-800 dark:ring-slate-800"
                    src={companyLogoSrc}
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = defaultProfileLogo
                    }}
                    alt=""
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
                </span>
                <div className="hidden md:flex flex-col items-start gap-0">
                  <span className="text-[13px] font-bold text-slate-800 dark:text-gray-100 leading-tight">{auth?.nombre?.split(' ')[0]}</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-gray-500 tracking-wider leading-tight">{auth?.empresa?.nombreComercial?.split(' ')[0] ?? auth?.rol?.replace('ADMIN_', '')?.replace('USUARIO_', '')}</span>
                </div>
                <motion.span animate={{ rotate: isUserMenuOpen ? 180 : 0 }} className="hidden md:block">
                  <Icon icon="solar:alt-arrow-down-bold" className="text-slate-400 dark:text-gray-500" width="14" />
                </motion.span>
              </motion.button>

              <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-gray-200/60 dark:shadow-black/40 z-[999999] overflow-hidden" variants={scaleIn} initial="initial" animate="animate" exit="exit">
                  <div className="px-4 py-3.5 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-700">
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{auth?.nombre}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{auth?.empresa?.nombreComercial}</p>
                  </div>
                  <ul className="py-1.5" role="menu">
                    {!isAlmacen && (
                      <li>
                        <button
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          onClick={() => { setIsUserMenuOpen(false); navigate('/administrador/perfil') }}
                          role="menuitem"
                        >
                          <Icon icon="solar:user-circle-bold-duotone" width="18" />
                          Perfil
                        </button>
                      </li>
                    )}
                    <li>
                      <button
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                        onClick={() => { setIsUserMenuOpen(false); navigate('/administrador/perfil?tab=configuracion') }}
                        role="menuitem"
                      >
                        <Icon icon="solar:settings-bold-duotone" width="18" />
                        Configuración
                      </button>
                    </li>
                    {!isDesktopBuild && !isAlmacen && (auth?.empresa?.slugTienda || hasPlanFeature(auth, 'tieneTienda')) && (
                      <li>
                        <button
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                          onClick={() => { setIsUserMenuOpen(false); if (auth?.empresa?.slugTienda) navigate(`/tienda/${auth.empresa.slugTienda}`); else navigate('/administrador/tienda/configuracion'); }}
                          role="menuitem"
                        >
                          <Icon icon="solar:shop-bold-duotone" width="18" />
                          Ir a tienda virtual
                        </button>
                      </li>
                    )}
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
                        className="w-full flex items-center justify-between gap-2.5 px-4 py-2.5 text-[13px] font-medium text-gray-600 dark:text-gray-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                        onClick={toggleDarkMode}
                        role="menuitem"
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
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        onClick={() => { setIsUserMenuOpen(false); logout() }}
                        role="menuitem"
                      >
                        <Icon icon="solar:logout-bold-duotone" width="18" />
                        Cerrar sesión
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

        <div
          className={`flex-1 ${theme.mainPadding} transition-all duration-300`}
          style={{ zoom: String(ZOOM_OPTIONS[zoomLevel]?.zoom ?? 1) }}
        >
          <Outlet />
        </div>
      </main>

      {/* Panel de personalización de UI (colores, tipo de sidebar, etc.) */}
      <Configurator />
    </motion.div>
  )
}
