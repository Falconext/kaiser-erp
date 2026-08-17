import { ReactNode } from 'react';

// Estilo premium compartido para todas las tablas del reseller
// (mismo look & feel que las tablas del admin, ej. Comprobantes).
export const THEAD_TR = 'text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-500 border-b border-slate-100 dark:border-slate-700';
export const BODY_TR = 'border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors group';

export type Pill = { label: string; dot: string; text: string; bg: string };

/** Pill de estado con puntito de color, igual que en Comprobantes del admin. */
export function estadoPill(estado?: string): Pill {
    const e = String(estado || '').toUpperCase();
    if (['ACTIVO', 'ACEPTADO', 'APLICADO', 'APROBADO', 'COMPLETADO', 'INGRESO'].includes(e))
        return { label: cap(e), dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' };
    if (['PENDIENTE', 'ENVIANDO', 'EN_PROCESO', 'PROCESANDO'].includes(e))
        return { label: 'Pendiente', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };
    if (['DEMO', 'PLACEHOLDER', 'AJUSTE'].includes(e))
        return { label: 'Demo', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };
    if (['RECHAZADO', 'FALLIDO_ENVIO', 'ERROR', 'ANULADO', 'INACTIVO', 'SALIDA', 'BAJA'].includes(e))
        return { label: cap(e), dot: 'bg-rose-500', text: 'text-rose-500 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' };
    return { label: e ? cap(e) : '—', dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' };
}

function cap(e: string) {
    return e.charAt(0) + e.slice(1).toLowerCase().replace(/_/g, ' ');
}

/** Avatar circular con la inicial (degradado violeta→índigo). */
export function Avatar({ name }: { name?: string }) {
    return (
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
            {String(name || '?').charAt(0).toUpperCase()}
        </div>
    );
}

/** Celda "empresa/cliente" con avatar + nombre + subtítulo (RUC/doc). */
export function EntityCell({ name, sub }: { name?: string; sub?: ReactNode }) {
    return (
        <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={name} />
            <div className="min-w-0">
                <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[200px]">{name || '—'}</p>
                {sub != null && sub !== '' && <p className="text-[11px] text-slate-400 dark:text-gray-500 font-mono truncate max-w-[200px]">{sub}</p>}
            </div>
        </div>
    );
}

/** Pill de estado renderizada. */
export function EstadoPill({ estado }: { estado?: string }) {
    const p = estadoPill(estado);
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${p.bg} ${p.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} /> {p.label}
        </span>
    );
}

/** Empty state consistente para las tablas. */
export function TableEmpty({ icon = 'solar:inbox-linear', text }: { icon?: string; text: string }) {
    return (
        <div className="py-14 text-center text-slate-400 dark:text-gray-500">
            <p className="text-sm font-medium">{text}</p>
        </div>
    );
}
