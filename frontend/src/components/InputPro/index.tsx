import { ChangeEvent, FC, FocusEvent, useEffect, useRef, useState, RefObject } from "react";

interface IInput {
  type?: "text" | "date" | "time" | "email" | "password" | "number" | "textarea";
  mode?: string;
  name: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  value?: string | number;
  label?: string;
  isLabel?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onReset?: () => void;
  handleOnBlur?: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  maxLength?: number;
  autocomplete?: string;
  id?: string;
  uppercase?: boolean;
  step?: string;
  min?: string | number;
  max?: string | number;
  error?: string | null | undefined;
  onCopy?: (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSelect?: (e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  reference?: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  refInput?: RefObject<HTMLInputElement | HTMLTextAreaElement>;
  readOnly?: boolean;
  rows?: number;
  onlyNumbers?: boolean;
  item?: string;
  searching?: boolean;
  autoFocus?: boolean;
  register?: any;
}

const InputPro: FC<IInput> = ({
  type = "text",
  name,
  mode,
  item,
  autoFocus,
  step,
  isLabel,
  placeholder,
  onChange,
  value = "",
  onClick,
  error,
  handleOnBlur,
  autocomplete,
  label,
  disabled,
  className,
  onKeyDown,
  reference,
  refInput,
  readOnly,
  rows,
  id,
  maxLength,
  onCopy,
  onSelect,
  onlyNumbers,
  register,
}) => {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = useState<string | number>(value);

  const commonClasses =
    "w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 font-normal" +
    " dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500" +
    " outline-none focus:ring-2 focus:ring-[var(--accent-soft,rgba(129,140,248,0.3))] focus:border-[var(--accent,#818cf8)]" +
    " disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-slate-900 transition-all duration-150";

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (onlyNumbers && !/^\d*$/.test(newValue)) return;
    setLocalValue(newValue);
    onChange?.(e);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    handleOnBlur?.(e);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const isControlKey =
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "Tab" ||
      ((e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "x" || e.key.toLowerCase() === "v"));

    if (onlyNumbers && !isControlKey && !/[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const normalizedError = typeof error === "string" ? error : "";

  const renderInput = () => {
    // Propiedades comunes
    const baseProps = {
      name,
      placeholder,
      id,
      autoComplete: autocomplete,
      autoFocus,
      disabled,
      maxLength,
      className,
      readOnly,
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        handleKeyPress(e);
        onKeyDown?.(e);
      },
      step,
      onCopy,
      onBlur: (e: any) => {
        handleBlur(e);
        if (register && register.onBlur) register.onBlur(e);
      },
      onChange: (e: any) => {
        handleInputChange(e);
        if (register && register.onChange) register.onChange(e);
      },
      value: localValue,
    };

    // Propiedades específicas para input
    const defaultInputClasses = commonClasses;
    const inputProps = {
      ...baseProps,
      type,
      className: className ? `${defaultInputClasses} ${className}` : defaultInputClasses,
      ref: (register?.ref || reference || refInput || inputRef) as any,
      onClick: onClick as React.MouseEventHandler<HTMLInputElement> | undefined,
      onSelect: onSelect as React.ReactEventHandler<HTMLInputElement> | undefined,
    };

    // Propiedades específicas para textarea
    const textareaProps = {
      ...baseProps,
      className: className ? className : `${commonClasses} !h-24 py-2.5 resize-none align-top`,
      ref: (register?.ref || reference || refInput || inputRef) as any,
      rows: rows, // Solo se pasa si está definido
    };

    if (type === "text" && onlyNumbers) {
      return <input {...inputProps} onKeyPress={handleKeyPress} />;
    }

    if (item === "numberOfSerieState" && type === "text") {
      return (
        <input
          {...inputProps}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) =>
            !/^[0-9]*[.,]?[0-9]*$/.test(e.key) && e.preventDefault()
          }
        />
      );
    }

    switch (type) {
      case "textarea":
        return <textarea {...textareaProps} />;
      case "text":
      case "date":
      case "time":
      case "email":
      case "password":
      case "number":
        return <input {...inputProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <div className={mode === "flex" ? "flex items-center" : ""}>
        <div>
          {isLabel && <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>}
        </div>
        {renderInput()}
      </div>
      {normalizedError && <p className="text-[#D35130] font-bold text-sm mt-1">{normalizedError}</p>}
    </div>
  );
};

export default InputPro;
