import { ReactNode } from 'react';
import { Icon } from '@iconify/react';

// Chrome compartido para las vistas de inventario (kardex / kits).
// Adaptado a la identidad "Vendify": fondo #F7F8FB, tipografía Jakarta,
// acento violeta #7551FF y tarjetas rounded-3xl con sombra suave.
const ACCENT = 'var(--accent, #7551FF)';

interface InventoryPageProps {
  children: ReactNode;
}

interface InventoryHeroProps {
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  actions?: ReactNode;
}

interface InventoryCardProps {
  children: ReactNode;
  className?: string;
}

interface InventoryEmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
}

export function InventoryPage({ children }: InventoryPageProps) {
  return (
    <div
      className="min-h-screen -m-5 p-5 bg-[#F7F8FB] font-jakarta dark:bg-[#0A0D14]"
    >
      {children}
    </div>
  );
}

export function InventoryHero({
  icon,
  title,
  subtitle,
  badge,
  actions,
}: InventoryHeroProps) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300">
          <Icon icon={icon} width={22} height={22} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-extrabold tracking-tight text-slate-800 dark:text-white">
              {title}
            </h1>
            {badge ? (
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
                style={{ background: ACCENT }}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">{subtitle}</p>
        </div>
      </div>

      {actions ? (
        <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">{actions}</div>
      ) : null}
    </div>
  );
}

export function InventoryCard({ children, className = '' }: InventoryCardProps) {
  return (
    <section
      className={`overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-[#111827] ${className}`}
    >
      {children}
    </section>
  );
}

export function InventoryToolbar({ children, className = '' }: InventoryCardProps) {
  return (
    <div
      className={`flex flex-col gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      {children}
    </div>
  );
}

export function InventoryToolbarButton({
  icon,
  label,
  onClick,
  tone = 'default',
  className = '',
  type = 'button',
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  tone?: 'default' | 'primary';
  className?: string;
  type?: 'button' | 'submit';
}) {
  const base =
    'inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-all';

  if (tone === 'primary') {
    return (
      <button
        type={type}
        onClick={onClick}
        className={`${base} text-white shadow-lg shadow-violet-500/30 hover:brightness-105 ${className}`}
        style={{ background: ACCENT }}
      >
        <Icon icon={icon} width={18} height={18} />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 ${className}`}
    >
      <Icon icon={icon} width={18} height={18} />
      <span>{label}</span>
    </button>
  );
}

export function InventorySearchBox({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label
      className={`flex h-11 items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900/60 ${className}`}
    >
      <Icon icon="solar:magnifer-linear" className="text-lg text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-100"
      />
    </label>
  );
}

export function InventoryInfoPill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300">
      <Icon icon={icon} className="text-base text-slate-400" />
      <span>{label}</span>
    </div>
  );
}

export function InventoryEmptyState({ icon, title, subtitle }: InventoryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl border border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
        <Icon icon={icon} className="text-3xl text-slate-300 dark:text-slate-600" />
      </div>
      <p className="text-base font-extrabold text-slate-600 dark:text-slate-200">{title}</p>
      <p className="mt-1 max-w-md text-sm text-slate-400 dark:text-slate-500">{subtitle}</p>
    </div>
  );
}
