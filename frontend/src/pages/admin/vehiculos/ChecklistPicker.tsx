import { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import Select from '@/components/Select';
import { CHECKLIST_CATALOG, ESTADOS_CHECK, keyOf } from './checklistCatalog';

export type ChecklistState = Record<string, { estado: string; nota: string }>;

// Normaliza texto para buscar sin distinguir mayúsculas ni tildes.
const normalize = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Convierte el estado interno del picker al payload que espera el backend. */
export const checklistToPayload = (checks: ChecklistState) =>
    Object.entries(checks).map(([k, { estado, nota }]) => {
        const [categoria, item] = k.split('::');
        return { categoria, item, estado, nota: nota.trim() || undefined };
    });

// Picker de inspección reutilizable (registro de vehículo y actas de ingreso/retiro).
// Marca solo lo que presenta novedad; lo no marcado se asume en buen estado.
export default function ChecklistPicker({
    checks, onChange,
}: {
    checks: ChecklistState;
    onChange: (next: ChecklistState) => void;
}) {
    const toggleItem = (categoria: string, item: string) => {
        const k = keyOf(categoria, item);
        const next = { ...checks };
        if (next[k]) delete next[k];
        else next[k] = { estado: ESTADOS_CHECK[0], nota: '' };
        onChange(next);
    };
    const setCheck = (k: string, patch: Partial<{ estado: string; nota: string }>) =>
        onChange({ ...checks, [k]: { ...checks[k], ...patch } });

    const novedades = Object.keys(checks).length;

    // Buscador: filtra categorías e ítems por lo que coincide con el término.
    const [query, setQuery] = useState('');
    const grupos = useMemo(() => {
        const q = normalize(query.trim());
        if (!q) return CHECKLIST_CATALOG;
        return CHECKLIST_CATALOG
            .map((grupo) => {
                // Si el término coincide con la categoría, se muestran todos sus ítems.
                if (normalize(grupo.categoria).includes(q)) return grupo;
                const items = grupo.items.filter((item) => normalize(item).includes(q));
                return items.length ? { ...grupo, items } : null;
            })
            .filter(Boolean) as typeof CHECKLIST_CATALOG;
    }, [query]);

    return (
        <div>
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Checklist de inspección</label>
                    <p className="text-[11px] text-slate-400">Marca solo lo que presenta novedad. Lo no marcado se asume en buen estado.</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${novedades ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>
                    {novedades ? `${novedades} novedad${novedades !== 1 ? 'es' : ''}` : 'Sin novedades'}
                </span>
            </div>
            {/* Buscador de ítems del checklist */}
            <div className="relative mb-3">
                <Icon icon="solar:magnifer-linear" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar parte a inspeccionar (ej. parachoques, faro, llanta…)"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-700 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
                {query && (
                    <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200">
                        <Icon icon="solar:close-circle-bold" className="text-lg" />
                    </button>
                )}
            </div>
            <div className="space-y-4">
                {grupos.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center dark:border-slate-700">
                        <Icon icon="solar:magnifer-linear" className="mx-auto mb-2 text-3xl text-slate-300" />
                        <p className="text-sm text-slate-400">Sin coincidencias para “{query}”.</p>
                    </div>
                )}
                {grupos.map((grupo) => (
                    <div key={grupo.categoria} className="rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                            <Icon icon={grupo.icon} className="text-lg text-slate-400" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{grupo.categoria}</span>
                        </div>
                        <div className="grid gap-1 p-2 sm:grid-cols-2">
                            {grupo.items.map((item) => {
                                const k = keyOf(grupo.categoria, item);
                                const marked = !!checks[k];
                                return (
                                    <div key={item} className={`rounded-lg p-2 transition ${marked ? 'bg-amber-50 ring-1 ring-amber-200 dark:bg-amber-500/5 dark:ring-amber-500/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                                            <input type="checkbox" checked={marked} onChange={() => toggleItem(grupo.categoria, item)} className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400" />
                                            <span className={marked ? 'font-semibold text-amber-800 dark:text-amber-300' : ''}>{item}</span>
                                        </label>
                                        {marked && (
                                            <div className="mt-2 flex flex-col gap-2 pl-6">
                                                <Select
                                                    label=""
                                                    name="estado"
                                                    error=""
                                                    options={ESTADOS_CHECK.map((es) => ({ id: es, value: es }))}
                                                    value={checks[k].estado}
                                                    onChange={(id) => setCheck(k, { estado: String(id) })}
                                                />
                                                <input value={checks[k].nota} onChange={(e) => setCheck(k, { nota: e.target.value })} placeholder="Detalle (opcional): lado, tamaño…"
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
