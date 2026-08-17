import { Icon } from '@iconify/react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { useThemeStore, SidebarColor, SidebarType, SIDEBAR_COLOR_HEX } from '../../zustand/theme';
import { BRAND, getBrandByKey } from '@/lib/branding';
import { useAuthStore } from '../../zustand/auth';

// Hex de cada color de acento — fuente única en el theme store.
const COLOR_HEX = SIDEBAR_COLOR_HEX;

const COLORS: { name: string; value: SidebarColor }[] = [
    { name: 'Marca', value: 'brand' },
    { name: 'Primary', value: 'primary' },
    { name: 'Dark', value: 'dark' },
    { name: 'Info', value: 'info' },
    { name: 'Success', value: 'success' },
    { name: 'Warning', value: 'warning' },
    { name: 'Error', value: 'error' },
];

const TYPES: { value: SidebarType; label: string; icon: string }[] = [
    { value: 'dark', label: 'Oscuro', icon: 'solar:moon-bold-duotone' },
    { value: 'transparent', label: 'Transp.', icon: 'solar:layers-bold-duotone' },
    { value: 'white', label: 'Blanco', icon: 'solar:sun-bold-duotone' },
];

// ── Variants de animación ─────────────────────────────────────────────────
const panelVariants: Variants = {
    hidden: { x: '100%' },
    visible: { x: 0, transition: { type: 'spring', stiffness: 320, damping: 34 } },
    exit: { x: '100%', transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

const listVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 30 } },
};

// ── Switch animado reutilizable ───────────────────────────────────────────
function AnimatedToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="relative h-7 w-12 shrink-0 rounded-full p-0.5 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7551FF]/40"
            style={{ backgroundColor: checked ? '#7551FF' : 'rgb(203 213 225)' }}
        >
            <motion.span
                layout
                transition={{ type: 'spring', stiffness: 700, damping: 34 }}
                className="block h-6 w-6 rounded-full bg-white shadow-md"
                style={{ marginLeft: checked ? 'auto' : 0 }}
            />
        </button>
    );
}

// ── Preview en vivo del sidebar ───────────────────────────────────────────
function SidebarPreview({ color, type, collapsed }: { color: SidebarColor; type: SidebarType; collapsed: boolean }) {
    const accent = COLOR_HEX[color];
    const isDark = type === 'dark';
    const isWhite = type === 'white';
    const bg = isDark ? '#0f172a' : isWhite ? '#ffffff' : 'rgba(148,163,184,0.14)';
    const rowIdle = isWhite ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.55)';
    const rows = ['solar:widget-2-bold-duotone', 'solar:bill-list-bold-duotone', 'solar:box-bold-duotone', 'solar:users-group-rounded-bold-duotone'];

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-inner">
            <div className="flex h-[132px]" style={{ backgroundColor: isDark ? '#020617' : isWhite ? '#f1f5f9' : '#e2e8f0' }}>
                {/* mini sidebar */}
                <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    className="flex flex-col gap-1.5 p-2.5 backdrop-blur-sm"
                    style={{ backgroundColor: bg, width: collapsed ? 46 : 108 }}
                >
                    <div className="mb-1 flex items-center gap-1.5">
                        <div className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-[9px] font-black text-white" style={{ backgroundColor: accent }}>V</div>
                        {!collapsed && <div className="h-1.5 w-10 rounded-full" style={{ backgroundColor: rowIdle }} />}
                    </div>
                    {rows.map((ic, i) => {
                        const active = i === 1;
                        return (
                            <div
                                key={ic}
                                className="flex items-center gap-1.5 rounded-lg px-1.5 py-1"
                                style={{ backgroundColor: active ? accent : 'transparent' }}
                            >
                                <Icon icon={ic} width={13} style={{ color: active ? '#fff' : rowIdle }} />
                                {!collapsed && <div className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: active ? 'rgba(255,255,255,0.85)' : rowIdle }} />}
                            </div>
                        );
                    })}
                </motion.div>
                {/* mini content */}
                <div className="flex-1 space-y-1.5 p-2.5">
                    <div className="h-2 w-2/3 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <div className="h-8 rounded-lg bg-white/80 dark:bg-slate-700/60 shadow-sm" />
                    <div className="h-2 w-1/2 rounded-full bg-slate-200 dark:bg-slate-700" />
                    <div className="h-2 w-3/5 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
            </div>
        </div>
    );
}

export default function Configurator() {
    const { auth } = useAuthStore();
    const isSystemAdmin = auth?.rol === 'ADMIN_SISTEMA';
    const configBrand = isSystemAdmin && auth?.sistemaNegocio
        ? getBrandByKey(auth.sistemaNegocio)
        : BRAND;

    const {
        isOpen,
        closeConfigurator,
        sidebarColor,
        setSidebarColor,
        sidebarType,
        setSidebarType,
        sidebarCollapsed,
        setSidebarCollapsed,
        navbarFixed,
        setNavbarFixed,
    } = useThemeStore();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-[90] bg-slate-900/40 backdrop-blur-[3px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={closeConfigurator}
                    />

                    {/* Panel */}
                    <motion.aside
                        variants={panelVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="fixed top-0 right-0 z-[100] flex h-full w-[360px] max-w-[92vw] flex-col rounded-l-[28px] bg-white shadow-[-20px_0_60px_-15px_rgba(15,23,42,0.35)] dark:bg-[#0b1120]"
                    >
                        {/* Header con acento en gradiente */}
                        <div className="relative overflow-hidden rounded-tl-[28px] px-6 pt-6 pb-5">
                            <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-[#7551FF]/30 to-[#9f7bff]/10 blur-2xl" />
                            <div className="relative flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#7551FF] to-[#9f7bff] shadow-lg shadow-[#7551FF]/30">
                                        <Icon icon="solar:pallete-2-bold-duotone" className="text-white" width={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-[17px] font-extrabold leading-tight text-slate-800 dark:text-white">Personalización</h2>
                                        <p className="text-xs text-slate-400">{configBrand.name} · Apariencia</p>
                                    </div>
                                </div>
                                <motion.button
                                    whileHover={{ rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={closeConfigurator}
                                    className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600 dark:border-slate-700 dark:hover:bg-slate-800"
                                >
                                    <Icon icon="solar:close-circle-linear" width={20} />
                                </motion.button>
                            </div>
                        </div>

                        {/* Cuerpo scrolleable con secciones escalonadas */}
                        <motion.div
                            variants={listVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex-1 space-y-6 overflow-y-auto px-6 pb-8"
                        >
                            {/* Preview */}
                            <motion.div variants={itemVariants}>
                                <SidebarPreview color={sidebarColor} type={sidebarType} collapsed={sidebarCollapsed} />
                            </motion.div>

                            {/* Colores */}
                            <motion.section variants={itemVariants}>
                                <div className="mb-3 flex items-center gap-2">
                                    <Icon icon="solar:paint-roller-bold-duotone" className="text-[#7551FF]" width={18} />
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-white">Color de acento</h4>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    {COLORS.map((c) => {
                                        const selected = sidebarColor === c.value;
                                        return (
                                            <motion.button
                                                key={c.value}
                                                whileHover={{ scale: 1.12 }}
                                                whileTap={{ scale: 0.92 }}
                                                onClick={() => setSidebarColor(c.value)}
                                                className="relative grid h-9 w-9 place-items-center rounded-full"
                                                style={{ backgroundColor: COLOR_HEX[c.value] }}
                                                aria-label={c.name}
                                            >
                                                {selected && (
                                                    <motion.span
                                                        layoutId="color-ring"
                                                        className="absolute -inset-1 rounded-full border-2"
                                                        style={{ borderColor: COLOR_HEX[c.value] }}
                                                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                                    />
                                                )}
                                                <AnimatePresence>
                                                    {selected && (
                                                        <motion.span
                                                            initial={{ scale: 0, opacity: 0 }}
                                                            animate={{ scale: 1, opacity: 1 }}
                                                            exit={{ scale: 0, opacity: 0 }}
                                                        >
                                                            <Icon icon="solar:check-read-bold" className="text-white" width={15} />
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.section>

                            {/* Estilo del menú — segmented con indicador animado */}
                            <motion.section variants={itemVariants}>
                                <div className="mb-3 flex items-center gap-2">
                                    <Icon icon="solar:sidebar-minimalistic-bold-duotone" className="text-[#7551FF]" width={18} />
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-white">Estilo del menú</h4>
                                </div>
                                <div className="flex gap-1.5 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/70">
                                    {TYPES.map((t) => {
                                        const active = sidebarType === t.value;
                                        return (
                                            <button
                                                key={t.value}
                                                onClick={() => setSidebarType(t.value)}
                                                className="relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-colors"
                                            >
                                                {active && (
                                                    <motion.span
                                                        layoutId="type-indicator"
                                                        className="absolute inset-0 rounded-xl bg-white shadow-sm dark:bg-slate-950"
                                                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                                    />
                                                )}
                                                <span className={`relative z-10 flex items-center gap-1.5 ${active ? 'text-[#7551FF]' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    <Icon icon={t.icon} width={16} />
                                                    {t.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.section>

                            {/* Toggles */}
                            <motion.section variants={itemVariants} className="space-y-3">
                                <ToggleRow
                                    icon="solar:siderbar-bold-duotone"
                                    title="Contraer menú lateral"
                                    desc={sidebarCollapsed ? 'Muestra solo íconos para ganar espacio.' : 'Muestra íconos y nombres completos.'}
                                    checked={sidebarCollapsed}
                                    onChange={setSidebarCollapsed}
                                />
                                <ToggleRow
                                    icon="solar:pin-bold-duotone"
                                    title="Barra superior fija"
                                    desc={navbarFixed ? 'El header permanece visible al desplazarte.' : 'El header se desplaza con el contenido.'}
                                    checked={navbarFixed}
                                    onChange={setNavbarFixed}
                                />
                            </motion.section>

                            {/* Footer */}
                            <motion.div variants={itemVariants} className="pt-2 text-center">
                                <p className="text-xs font-semibold text-slate-400">
                                    ¡Gracias por usar <span className="text-[#7551FF]">{configBrand.name}</span>!
                                </p>
                            </motion.div>
                        </motion.div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

// ── Fila de toggle con ícono ──────────────────────────────────────────────
function ToggleRow({ icon, title, desc, checked, onChange }: {
    icon: string; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <motion.div
            whileHover={{ y: -2 }}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors ${checked
                ? 'border-[#7551FF]/30 bg-[#7551FF]/[0.06] dark:bg-[#7551FF]/10'
                : 'border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60'
                }`}
        >
            <div className="flex items-center gap-3">
                <div className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${checked ? 'bg-[#7551FF] text-white' : 'bg-white text-slate-400 dark:bg-slate-800'}`}>
                    <Icon icon={icon} width={18} />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-white">{title}</h4>
                    <p className="mt-0.5 text-[11px] leading-tight text-slate-400">{desc}</p>
                </div>
            </div>
            <AnimatedToggle checked={checked} onChange={onChange} />
        </motion.div>
    );
}
