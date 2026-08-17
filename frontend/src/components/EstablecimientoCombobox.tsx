import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useSedesStore } from '@/zustand/sedes';
import { useAuthStore } from '@/zustand/auth';

interface Props {
    value: string;
    onChange: (v: string) => void;
    invalid?: boolean;
    className?: string;
}

const inp = 'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all placeholder:text-slate-400';
const invalidInp = 'border-red-400 dark:border-red-500 focus:border-red-500 focus:ring-red-400/20';

export function EstablecimientoCombobox({ value, onChange, invalid, className }: Props) {
    const { sedes, listarSedes } = useSedesStore();
    const { sedeActiva } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { void listarSedes(); }, [listarSedes]);

    // Pre-fill with active sede if empty
    useEffect(() => {
        if (!value && sedeActiva?.nombre) onChange(sedeActiva.nombre);
    }, [sedeActiva?.nombre]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!open || !inputRef.current) return;
        const r = inputRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }, [open]);

    const options = sedes
        .filter(s => s.activo !== false && s.estado !== 'INACTIVO')
        .map(s => s.nombre);

    const filtered = options.filter(n =>
        !value || n.toLowerCase().includes(value.toLowerCase())
    );

    const handleSelect = (name: string) => { onChange(name); setOpen(false); };

    return (
        <div className={`relative ${className ?? ''}`}>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={e => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="Sede o almacén de despacho"
                autoComplete="off"
                className={`${inp} ${invalid ? invalidInp : ''}`}
            />
            {open && filtered.length > 0 && ReactDOM.createPortal(
                <div
                    style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 99999 }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-transparent rounded-xl shadow-2xl overflow-hidden"
                    onMouseDown={e => e.preventDefault()}
                >
                    {filtered.map(name => (
                        <button
                            key={name}
                            type="button"
                            onMouseDown={() => handleSelect(name)}
                            className="w-full text-left px-3 py-2.5 text-sm text-slate-800 dark:text-white hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                        >
                            {name}
                        </button>
                    ))}
                </div>,
                document.body,
            )}
        </div>
    );
}
