import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { useModulosStore, IModulo, ISubModulo } from '@/zustand/modulos';

interface ModuloSelectorProps {
    selectedModulos: number[];
    onModulosChange: (modulos: number[]) => void;
    selectedSubModulos?: number[];
    onSubModulosChange?: (subModulos: number[]) => void;
    disabled?: boolean;
    producto?: 'facturacion' | 'hotel' | 'restaurante';
}

const getModuleIcon = (codigo: string): string => {
    const iconMap: Record<string, string> = {
        dashboard: 'mdi:view-dashboard',
        comprobantes: 'mdi:file-document',
        clientes: 'mdi:account-group',
        kardex: 'mdi:package-variant',
        reportes: 'mdi:chart-bar',
        configuracion: 'mdi:cog',
        usuarios: 'mdi:account-multiple',
        caja: 'mdi:cash-register',
        pagos: 'mdi:credit-card',
    };
    return iconMap[codigo] || 'mdi:puzzle';
};

export const ModuloSelector: React.FC<ModuloSelectorProps> = ({
    selectedModulos,
    onModulosChange,
    selectedSubModulos = [],
    onSubModulosChange,
    disabled = false,
    producto,
}) => {
    const { modulos, loading, getAllModulos } = useModulosStore();
    const [expandedModulos, setExpandedModulos] = useState<Set<number>>(new Set());

    useEffect(() => {
        getAllModulos(true, producto);
    }, [getAllModulos, producto]);

    const handleToggleModulo = (moduloId: number) => {
        if (disabled) return;
        const isSelected = selectedModulos.includes(moduloId);
        const updated = isSelected
            ? selectedModulos.filter(id => id !== moduloId)
            : [...selectedModulos, moduloId];
        onModulosChange(updated);

        // Al desmarcar un módulo, quitar también sus submódulos
        if (isSelected && onSubModulosChange) {
            const modulo = modulos.find(m => m.id === moduloId);
            const subIds = (modulo?.subModulos || []).map(s => s.id);
            onSubModulosChange(selectedSubModulos.filter(id => !subIds.includes(id)));
        }
    };

    const handleToggleSubModulo = (subModuloId: number) => {
        if (disabled || !onSubModulosChange) return;
        const isSelected = selectedSubModulos.includes(subModuloId);
        onSubModulosChange(
            isSelected
                ? selectedSubModulos.filter(id => id !== subModuloId)
                : [...selectedSubModulos, subModuloId]
        );
    };

    const handleSelectAllSubs = (modulo: IModulo) => {
        if (disabled || !onSubModulosChange) return;
        const subIds = modulo.subModulos.filter(s => s.activo).map(s => s.id);
        const allSel = subIds.every(id => selectedSubModulos.includes(id));
        onSubModulosChange(
            allSel
                ? selectedSubModulos.filter(id => !subIds.includes(id))
                : [...new Set([...selectedSubModulos, ...subIds])]
        );
    };

    const handleSelectAll = () => {
        if (disabled) return;
        if (selectedModulos.length === modulos.length) {
            onModulosChange([]);
            onSubModulosChange?.([]);
        } else {
            onModulosChange(modulos.map(m => m.id));
        }
    };

    const toggleExpanded = (moduloId: number) => {
        setExpandedModulos(prev => {
            const next = new Set(prev);
            next.has(moduloId) ? next.delete(moduloId) : next.add(moduloId);
            return next;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Icon icon="mdi:loading" className="animate-spin text-blue-600" width={32} />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Cargando módulos...</span>
            </div>
        );
    }

    const allSelected = selectedModulos.length === modulos.length && modulos.length > 0;
    const totalSubsDisponibles = modulos.filter(m => selectedModulos.includes(m.id)).reduce((acc, m) => acc + (m.subModulos?.filter(s => s.activo).length || 0), 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Módulos: <strong>{selectedModulos.length}</strong> de {modulos.length}
                        {onSubModulosChange && totalSubsDisponibles > 0 && (
                            <span className="ml-3 text-indigo-600">
                                · Submódulos: <strong>{selectedSubModulos.length}</strong> de {totalSubsDisponibles}
                            </span>
                        )}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={disabled}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
            </div>

            <div className="space-y-2">
                {modulos.map((modulo: IModulo) => {
                    const isSelected = selectedModulos.includes(modulo.id);
                    const isExpanded = expandedModulos.has(modulo.id);
                    const subActivos = (modulo.subModulos || []).filter((s: ISubModulo) => s.activo);
                    const subSelCount = subActivos.filter(s => selectedSubModulos.includes(s.id)).length;
                    const allSubsSel = subActivos.length > 0 && subActivos.every(s => selectedSubModulos.includes(s.id));

                    return (
                        <div key={modulo.id} className={`border-2 rounded-xl overflow-hidden transition-all ${isSelected ? 'border-blue-400 dark:border-blue-500' : 'border-gray-200 dark:border-slate-700'}`}>
                            {/* Fila del módulo */}
                            <div
                                className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                                onClick={() => handleToggleModulo(modulo.id)}
                            >
                                <div className={`flex-shrink-0 p-2 rounded-lg ${isSelected ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-slate-700'}`}>
                                    <Icon
                                        icon={modulo.icono || getModuleIcon(modulo.codigo)}
                                        className={isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}
                                        width={22}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-semibold text-sm ${isSelected ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                            {modulo.nombre}
                                        </h4>
                                        {isSelected && <Icon icon="mdi:check-circle" className="text-blue-600 dark:text-blue-400 flex-shrink-0" width={16} />}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{modulo.descripcion}</p>
                                    {isSelected && subActivos.length > 0 && onSubModulosChange && (
                                        <p className="text-xs text-indigo-600 mt-0.5">
                                            {subSelCount} de {subActivos.length} submódulos configurados
                                        </p>
                                    )}
                                </div>
                                {/* Botón expandir submódulos */}
                                {isSelected && subActivos.length > 0 && onSubModulosChange && (
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); toggleExpanded(modulo.id); }}
                                        className="p-1.5 text-indigo-500 hover:bg-indigo-100 rounded-lg transition-colors flex-shrink-0"
                                        title="Configurar submódulos"
                                    >
                                        <Icon icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} />
                                    </button>
                                )}
                            </div>

                            {/* Submódulos expandibles */}
                            {isSelected && isExpanded && subActivos.length > 0 && onSubModulosChange && (
                                <div className="border-t border-blue-100 dark:border-blue-900/40 bg-indigo-50/40 dark:bg-indigo-900/10 px-4 py-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                                            <Icon icon="mdi:sitemap" width={14} />
                                            Submódulos de {modulo.nombre}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectAllSubs(modulo)}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                        >
                                            {allSubsSel ? 'Quitar todos' : 'Seleccionar todos'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {subActivos.map((sub: ISubModulo) => {
                                            const isSubSel = selectedSubModulos.includes(sub.id);
                                            return (
                                                <label
                                                    key={sub.id}
                                                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${isSubSel ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-indigo-500'}`}
                                                    onClick={() => handleToggleSubModulo(sub.id)}
                                                >
                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSubSel ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 dark:border-slate-500'}`}>
                                                        {isSubSel && <Icon icon="mdi:check" className="text-white" width={10} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{sub.nombre}</p>
                                                        {sub.descripcion && <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{sub.descripcion}</p>}
                                                        <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{sub.codigo}</p>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {modulos.length === 0 && !loading && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No hay módulos disponibles
                </div>
            )}
        </div>
    );
};

export default ModuloSelector;
