import React from 'react';
import { Icon } from '@iconify/react';
import { cn } from '@/utils/cn';

interface BarcodeScannerInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onScan?: (value: string) => void;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    loading?: boolean;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    label?: string;
    name?: string;
    error?: boolean;
    hideIcon?: boolean;
}

export const BarcodeScannerInput: React.FC<BarcodeScannerInputProps> = ({
    value,
    onChange,
    onScan,
    inputRef,
    loading = false,
    placeholder = 'Escanear código de barras...',
    disabled = false,
    className,
    label,
    name,
    error = false,
    hideIcon = false,
}) => {
    return (
        <div className={cn('relative group', className)}>
            {label && (
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                {!hideIcon && (
                    <Icon
                        icon="mdi:barcode-scan"
                        className={cn(
                            "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
                            loading ? "text-indigo-500" : error ? "text-red-500" : "text-slate-400 dark:text-slate-500"
                        )}
                        width={20}
                    />
                )}
                <input
                    ref={inputRef}
                    type="text"
                    name={name}
                    value={value}
                    onChange={onChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (value.trim()) {
                                onScan?.(value.trim());
                            }
                        }
                    }}
                    placeholder={placeholder}
                    disabled={disabled || loading}
                    autoComplete="off"
                    className={cn(
                        "w-full h-10 rounded-xl border border-slate-200 bg-white pr-10 text-sm text-slate-800 placeholder:text-slate-400 font-normal dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-slate-900 transition-all duration-150",
                        hideIcon ? "pl-3" : "pl-10",
                        error && "border-[#D35130] focus:ring-[#D35130]/30 focus:border-[#D35130] dark:border-red-900/50"
                    )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {loading ? (
                        <Icon
                            icon="solar:refresh-bold"
                            className="animate-spin text-violet-500"
                            width={16}
                        />
                    ) : error ? (
                        <Icon
                            icon="solar:danger-bold"
                            className="text-red-500"
                            width={16}
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
};
