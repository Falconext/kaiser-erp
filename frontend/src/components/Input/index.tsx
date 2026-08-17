import { Icon } from "@iconify/react/dist/iconify.js";

interface IProps {
    label: string
    value?: string
    onChange: any
    max?: number | string
    isGroup?: boolean
    onKeyDown?: any
    type?: string
    name: string
    autoComplete?: string
    onClick?: any
    onBlur?: any
    readOnly?: any
    icon?: string
    step?: string | number
    disabled?: boolean
    ref?: any
    isIcon?: boolean
    isSearch?: boolean
    error?: string | null | undefined
    form?: string; // Añade esta prop
}

const Input = ({
    label,
    onClick,
    isSearch,
    readOnly,
    ref,
    autoComplete,
    value,
    onChange,
    max,
    isGroup,
    type,
    onKeyDown,
    name,
    disabled,
    isIcon,
    icon,
    error,
    form,
    step,
    onBlur,
}: IProps) => {
    const normalizedError = typeof error === 'string' ? error : '';

    return (
        <div className="rounded">
            <div className={`z-0 relative ${isGroup ? "" : "border-gray-200 dark:border-slate-700 border-solid border rounded-xl"}`}>
                {
                    isIcon && (
                        <div className="absolute top-3.5 left-3">
                            <div>
                                <Icon icon={icon || ""} width="20" height="20" />
                            </div>
                        </div>
                    )
                }
                <div className={`content-[""] w-[1px] h-full bg-[#e3e3e3] dark:bg-slate-700 absolute left-12 `}>

                </div>
                {
                    onKeyDown && !isSearch && (
                        <input
                            id={label}
                            ref={ref}
                            name={name}
                            onClick={onClick}
                            disabled={disabled}
                            type={type ? type : "text"}
                            placeholder=" "
                            form={form} 
                            readOnly={readOnly}
                            autoComplete={autoComplete}
                            className="peer block w-full font-medium pl-14 border-gray-400 dark:border-slate-700 dark:text-white dark:bg-transparent py-4 pb-2 rounded-xl focus:bg-[#F3F3F8] dark:focus:bg-slate-800 focus:outline-none focus:border-1 focus:ring-0 focus:border-[#895af8] focus:pl-14"
                            defaultValue={value || ""} // Usa value en lugar de defaultValue
                            onChange={onChange}
                            max={max}
                            step={step}
                            onBlur={onBlur}
                            onKeyDown={onKeyDown}
                        />
                    )
                }
                {
                    !onKeyDown && !isSearch && (
                        <input
                            id={label}
                            ref={ref}
                            name={name}
                            onClick={onClick}
                            disabled={disabled}
                            form={form} 
                            type={type ? type : "text"}
                            placeholder=" "
                            readOnly={readOnly}
                            autoComplete={autoComplete}
                            className="peer block w-full h-[50px] font-medium pl-14 border-gray-400 dark:border-slate-700 dark:text-white dark:bg-transparent py-4 pb-2 rounded-xl focus:outline-none focus:bg-[#F3F3F8] dark:focus:bg-slate-800 focus:border-1 focus:ring-0 focus:border-[#6851EE] focus:pl-14"
                            value={value} // Usa value en lugar de defaultValue
                            onChange={onChange}
                            max={max}
                            step={step}
                            onBlur={onBlur}
                            onKeyDown={onKeyDown}
                        />
                    )
                }

                {
                    isSearch && (
                        <input
                            id={label}
                            ref={ref}
                            name={name}
                            onClick={onClick}
                            disabled={disabled}
                            type={type ? type : "text"}
                            placeholder=" "
                            readOnly={readOnly}
                            form={form}
                            autoComplete={autoComplete}
                            className="peer block w-full font-medium pl-14 border-gray-400 dark:border-slate-700 dark:text-white dark:bg-transparent py-5 pb-2 rounded-xl focus:outline-none focus:bg-[#F3F3F8] dark:focus:bg-slate-800 focus:border-1 focus:ring-0 focus:border-[#6851EE] focus:pl-14"
                            value={value} // Usa value en lugar de defaultValue
                            onChange={onChange}
                            max={max}
                            step={step}
                            onBlur={onBlur}
                            onKeyDown={onKeyDown}
                        />
                    )
                }

                <label
                    htmlFor={label}
                    onClick={onClick}
                    className="absolute left-14 top-2 text-xs text-gray-600 dark:text-gray-400 transition-all duration-200 peer-placeholder-shown:top-3 focus:bg-[#F3F3F8] peer-placeholder-shown:text-lg peer-focus:top-2 peer-focus:text-xs peer-focus:text-black-500"
                >
                    {label}
                </label>
            </div>
            {normalizedError && <p className="text-[#D35130] font-bold text-sm mt-1">{normalizedError}</p>}
        </div>
    );
};

export default Input;
