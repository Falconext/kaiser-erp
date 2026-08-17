import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './autoScrollTable.module.css';
import { Icon } from '@iconify/react';

interface AutoScrollTableProps {
    children: React.ReactNode;
}

const AutoScrollTable = ({
    children,
}: AutoScrollTableProps) => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const [hasOverflow, setHasOverflow] = useState(false);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [maxScroll, setMaxScroll] = useState(0);
    // Barra flotante: se muestra cuando la tabla está en pantalla pero su barra
    // natural (al pie de la tabla) quedó por debajo del viewport al hacer scroll.
    const [floatBar, setFloatBar] = useState<{ show: boolean; left: number; width: number }>({ show: false, left: 0, width: 0 });

    const jumpToEnd = () => {
        if (!tableContainerRef.current) return;
        const { scrollWidth, clientWidth } = tableContainerRef.current;
        tableContainerRef.current.scrollTo({ left: Math.max(0, scrollWidth - clientWidth), behavior: 'smooth' });
    };

    const jumpToStart = () => {
        tableContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' });
    };

    const setScroll = (left: number) => {
        if (tableContainerRef.current) tableContainerRef.current.scrollLeft = left;
    };

    const measure = useCallback(() => {
        const el = tableContainerRef.current;
        if (!el) return;
        const overflow = el.scrollWidth > el.clientWidth + 1;
        setHasOverflow(overflow);
        setMaxScroll(Math.max(0, el.scrollWidth - el.clientWidth));
        setScrollLeft(el.scrollLeft);
    }, []);

    // Recalcular la posición de la barra flotante según el viewport.
    const updateFloat = useCallback(() => {
        const el = tableContainerRef.current;
        if (!el) return;
        const overflow = el.scrollWidth > el.clientWidth + 1;
        if (!overflow) { setFloatBar((s) => (s.show ? { ...s, show: false } : s)); return; }
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const tableInView = rect.top < vh && rect.bottom > 0;
        // La barra natural vive al pie de la tabla; si ese pie ya está dentro del
        // viewport no hace falta flotar. Flota mientras el pie esté por debajo.
        const naturalBarVisible = rect.bottom <= vh;
        const show = tableInView && !naturalBarVisible;
        setFloatBar({ show, left: Math.max(0, rect.left), width: rect.width });
    }, []);

    const onTableScroll = () => {
        if (tableContainerRef.current) setScrollLeft(tableContainerRef.current.scrollLeft);
    };

    useEffect(() => {
        measure();
        updateFloat();
        // capture:true → escucha el scroll de CUALQUIER contenedor (p. ej. <main>),
        // no solo el de window; así la barra sigue al desplazamiento vertical real.
        const onScrollOrResize = () => { measure(); updateFloat(); };
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);
        return () => {
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [children, measure, updateFloat]);

    // Si ya no hay overflow, normalizar posición horizontal.
    useEffect(() => {
        if (!hasOverflow) tableContainerRef.current?.scrollTo({ left: 0, behavior: 'auto' });
    }, [hasOverflow]);

    const controls = (floating: boolean) => (
        <div className={`flex items-center gap-2 px-4 py-2 ${floating ? 'rounded-xl border border-gray-200 dark:border-slate-700 shadow-lg' : 'rounded-t-xl'} bg-white/90 dark:bg-slate-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 dark:supports-[backdrop-filter]:bg-slate-900/75`}>
            <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 font-[400] shrink-0">Desplazamiento rápido</span>
            <button
                onClick={jumpToStart}
                className="shrink-0 p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 transition-all duration-200 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm"
                title="Ir al inicio"
            >
                <Icon icon="solar:double-alt-arrow-left-bold-duotone" width={20} height={20} />
            </button>

            {/* Scrubber sincronizado: desplaza horizontalmente a cualquier posición */}
            <input
                type="range"
                min={0}
                max={maxScroll || 0}
                value={Math.min(scrollLeft, maxScroll || 0)}
                onChange={(e) => setScroll(Number(e.target.value))}
                aria-label="Desplazar tabla horizontalmente"
                className={`${styles.scrubber} flex-1 min-w-[80px]`}
            />

            <button
                onClick={jumpToEnd}
                className="shrink-0 p-1.5 rounded-lg border border-gray-200 dark:border-slate-700 transition-all duration-200 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm"
                title="Ir al final"
            >
                <Icon icon="solar:double-alt-arrow-right-bold-duotone" width={20} height={20} />
            </button>
        </div>
    );

    return (
        <div className={styles.autoScrollTable}>
            <div ref={tableContainerRef} className={styles.tableContainer} onScroll={onTableScroll}>
                {children}
            </div>

            {/* Barra natural al pie de la tabla: visible cuando el pie está en pantalla.
                Cuando queda debajo del viewport, se oculta y aparece la flotante (una sola). */}
            {hasOverflow && !floatBar.show && <div className="px-0 pt-2">{controls(false)}</div>}

            {/* Barra flotante fija (portal a body → inmune a overflow-hidden de los cards) */}
            {hasOverflow && floatBar.show && createPortal(
                <div
                    className="fixed z-40 pointer-events-auto"
                    style={{ bottom: 10, left: floatBar.left, width: floatBar.width }}
                >
                    {controls(true)}
                </div>,
                document.body,
            )}
        </div>
    );
};

export default AutoScrollTable;
