import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SidebarColor = 'brand' | 'primary' | 'dark' | 'info' | 'success' | 'warning' | 'error';
// Hex de cada color de acento del Configurador — fuente única para sidebar,
// variable CSS --accent (botones) y swatches.
export const SIDEBAR_COLOR_HEX: Record<SidebarColor, string> = {
    brand: '#7551FF',
    primary: '#C026D3',
    dark: '#111827',
    info: '#3B82F6',
    success: '#10B981',
    warning: '#F97316',
    error: '#EF4444',
};

export type SidebarType = 'dark' | 'transparent' | 'white';
export type ZoomLevel = 0 | 1 | 2 | 3;

export const ZOOM_OPTIONS: { level: ZoomLevel; label: string; zoom: number; height: string }[] = [
    { level: 0, label: '100%', zoom: 1,    height: '100vh' },
    { level: 1, label: '90%',  zoom: 0.9,  height: '111vh' },
    { level: 2, label: '82%',  zoom: 0.82, height: '122vh' },
    { level: 3, label: '75%',  zoom: 0.75, height: '133vh' },
];

interface ThemeState {
    isOpen: boolean;
    sidebarColor: SidebarColor;
    sidebarType: SidebarType;
    sidebarCollapsed: boolean;
    navbarFixed: boolean;
    zoomLevel: ZoomLevel;
    isDarkMode: boolean;

    // Actions
    toggleConfigurator: () => void;
    setSidebarColor: (color: SidebarColor) => void;
    setSidebarType: (type: SidebarType) => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
    setNavbarFixed: (fixed: boolean) => void;
    closeConfigurator: () => void;
    setZoomLevel: (level: ZoomLevel) => void;
    toggleDarkMode: () => void;
    initTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            isOpen: false,
            sidebarColor: 'brand',
            sidebarType: 'dark',
            sidebarCollapsed: false,
            navbarFixed: true,
            zoomLevel: 1,
            isDarkMode: true,

            toggleConfigurator: () => set((state) => ({ isOpen: !state.isOpen })),
            closeConfigurator: () => set({ isOpen: false }),
            setSidebarColor: (color) => set({ sidebarColor: color }),
            setSidebarType: (type) => set({ sidebarType: type }),
            setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
            setNavbarFixed: (fixed) => set({ navbarFixed: fixed }),
            setZoomLevel: (level) => set({ zoomLevel: level }),
            toggleDarkMode: () => {
                const { isDarkMode } = get();
                const newMode = !isDarkMode;
                if (newMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
                set({ isDarkMode: newMode });
            },
            initTheme: () => {
                const { isDarkMode } = get();
                if (isDarkMode) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        }),
        {
            name: 'theme-storage-v4',
            version: 1,
            // Migración: usuarios que seguían con el color por defecto anterior ('info')
            // pasan al color de marca ('brand'). Quien eligió otro color lo conserva.
            migrate: (persisted: any, version: number) => {
                if (version < 1 && persisted && persisted.sidebarColor === 'info') {
                    persisted.sidebarColor = 'brand';
                }
                return persisted;
            },
        }
    )
);
