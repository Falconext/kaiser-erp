import { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';

export interface OlvaAgencia {
    /** Código de agencia Olva — es lo que pide el registro de la guía. */
    codigo: string;
    nombre: string;
    tipo: string;
    departamento: string;
    provincia: string;
    distrito: string;
    ubigeo: string;
    direccion?: string;
    label: string;
}

interface Props {
    value: string;
    onChange: (value: string) => void;
    /** Se dispara solo al elegir del listado: entrega la agencia con su código. */
    onSelectAgencia?: (agencia: OlvaAgencia) => void;
    invalid?: boolean;
    placeholder?: string;
    className?: string;
}

let _cache: OlvaAgencia[] | null = null;
let _fetching: Promise<OlvaAgencia[]> | null = null;

async function fetchAgencias(): Promise<OlvaAgencia[]> {
    if (_cache) return _cache;
    if (_fetching) return _fetching;
    _fetching = apiClient
        .get<any>('/olva/agencias')
        .then((res) => {
            // ResponseInterceptor envuelve: { code:1, data: { success:true, data:[...], total:N } }
            const wrapper = res.data?.data ?? res.data ?? {};
            const raw = Array.isArray(wrapper) ? wrapper : (wrapper?.data ?? []);
            _cache = Array.isArray(raw) ? raw : [];
            return _cache!;
        })
        .catch(() => [])
        .finally(() => { _fetching = null; });
    return _fetching;
}

function strip(s: string) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

const inp = 'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all placeholder:text-slate-400';
const invalidInp = 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-red-400/20';

export function OlvaAgenciaSelect({ value, onChange, onSelectAgencia, invalid, placeholder, className }: Props) {
    const [agencias, setAgencias] = useState<OlvaAgencia[]>([]);
    const [query, setQuery] = useState(value ?? '');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLoading(true);
        fetchAgencias().then((data) => { setAgencias(data); setLoading(false); });
    }, []);

    useEffect(() => { setQuery(value ?? ''); }, [value]);

    // Recalculate dropdown position when opened
    useEffect(() => {
        if (!open || !inputRef.current) return;
        const rect = inputRef.current.getBoundingClientRect();
        setDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });

        const onScroll = () => {
            if (!inputRef.current) return;
            const r = inputRef.current.getBoundingClientRect();
            setDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
        };
        window.addEventListener('scroll', onScroll, true);
        return () => window.removeEventListener('scroll', onScroll, true);
    }, [open]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (inputRef.current && !inputRef.current.closest('[data-olva-select]')?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const results = useCallback(() => {
        if (!query.trim()) return agencias.slice(0, 80);
        const q = strip(query);
        return agencias
            .filter((a) => strip(a.label + ' ' + a.distrito).includes(q))
            .slice(0, 60);
    }, [query, agencias])();

    const handleSelect = (a: OlvaAgencia) => {
        const display = [a.nombre, a.provincia, a.departamento].filter(Boolean).join(' - ');
        setQuery(display);
        onChange(display);
        onSelectAgencia?.(a);
        setOpen(false);
    };

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setQuery(v);
        onChange(v);
        setOpen(true);
    };

    let dropContent: React.ReactNode;
    if (loading) {
        dropContent = (
            <div className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                <Icon icon="eos-icons:loading" className="animate-spin text-indigo-400" />
                Cargando agencias Olva...
            </div>
        );
    } else if (agencias.length === 0) {
        dropContent = (
            <div className="px-4 py-3 text-xs text-red-500">
                No se pudieron cargar las agencias. Verifica que el backend esté corriendo.
            </div>
        );
    } else if (results.length === 0) {
        dropContent = (
            <div className="px-4 py-3 text-xs text-slate-500">
                No se encontraron agencias para "{query}"
            </div>
        );
    } else {
        dropContent = results.map((a) => (
            <button
                key={a.codigo || a.label}
                type="button"
                onMouseDown={() => handleSelect(a)}
                className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex flex-col gap-0.5"
            >
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{a.nombre}</span>
                <span className="text-[11px] text-slate-400">
                    {[a.distrito, a.provincia, a.departamento].filter(Boolean).join(' · ')}
                </span>
            </button>
        ));
    }

    const dropdown = open ? ReactDOM.createPortal(
        <div
            style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 99999 }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto"
            onMouseDown={e => e.preventDefault()}
        >
            {dropContent}
        </div>,
        document.body,
    ) : null;

    return (
        <div data-olva-select="" className={`relative ${className ?? ''}`}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInput}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder={placeholder ?? 'Buscar agencia Olva...'}
                    className={`${inp} pr-8 ${invalid ? invalidInp : ''}`}
                    autoComplete="off"
                />
                <span className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none">
                    {loading
                        ? <Icon icon="eos-icons:loading" className="text-sm animate-spin text-slate-400" />
                        : <Icon icon="solar:buildings-2-bold-duotone" className="text-sm text-indigo-400" />
                    }
                </span>
            </div>
            {dropdown}
        </div>
    );
}
