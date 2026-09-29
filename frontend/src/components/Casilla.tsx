import { useEffect, useRef } from 'react';
import { Icon } from '@iconify/react';

/**
 * Casilla de selección del panel.
 *
 * La casilla nativa se dibuja distinta en cada sistema operativo, es diminuta y
 * no acompaña al resto del diseño. Esta conserva el <input> real —para que siga
 * funcionando con teclado y lectores de pantalla— y le dibuja la caja encima.
 *
 * Soporta el estado "algunas": cuando hay filas marcadas pero no todas, la
 * casilla de la cabecera muestra un guion en vez de un check, que es lo que el
 * usuario espera de una lista.
 */
export default function Casilla({
  checked,
  algunas = false,
  onChange,
  label,
  disabled,
  className = '',
}: {
  checked: boolean;
  /** Hay selección parcial: se dibuja un guion. */
  algunas?: boolean;
  onChange: (marcada: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const parcial = algunas && !checked;

  // El estado "indeterminado" no existe como atributo: se asigna por DOM.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = parcial;
  }, [parcial]);

  return (
    <span className={`relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center ${className}`}>
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className={`peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-md border-2 border-gray-300 bg-white transition-all
          hover:border-blue-400
          checked:border-blue-600 checked:bg-blue-600
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 focus-visible:ring-offset-1
          disabled:cursor-not-allowed disabled:opacity-40
          dark:border-slate-600 dark:bg-slate-800 dark:hover:border-blue-500
          ${parcial ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-600' : ''}`}
      />
      <Icon
        icon={parcial ? 'mdi:minus' : 'mdi:check'}
        className={`pointer-events-none absolute text-[13px] font-black text-white transition-opacity ${
          parcial ? 'opacity-100' : 'opacity-0 peer-checked:opacity-100'
        }`}
      />
    </span>
  );
}
