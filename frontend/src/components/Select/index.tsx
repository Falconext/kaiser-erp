import { ChangeEvent, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import styles from './select.module.css';
import { CSSProperties } from "styled-components";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react/dist/iconify.js";
import InputPro from "../InputPro";
import { useDebounce } from "@/hooks/useDebounce";

interface IProps {
    options?: IOption[] | any
    onChange: (id: any, value: string, name: string, idField?: string) => void;
    handleGetData?: (query: string, callback: () => void) => void
    isSearch?: boolean
    icon?: string
    value?: string
    placeholder?: string
    readOnly?: boolean
    optionSelect?: boolean
    name: string
    position?: string
    isIcon?: boolean
    withLabel?: boolean
    error: any
    label: string
    defaultValue?: any
    motivoForm?: any
    reload?: any
    disabled?: boolean
    id?: string
    left?: boolean,
    top?: boolean,
    right?: boolean,
    inputClassName?: string,
}

interface IOption {
    id: number
    value: string
}

const Select = ({
    options,
    onChange,
    handleGetData,
    isSearch = false,
    readOnly,
    value,
    error,
    name,
    label,
    defaultValue,
    disabled,
    id,
    left,
    top,
    right,
    inputClassName,
    withLabel = true,
}: IProps) => {

    const [valueOptions, setValueOptions] = useState<string>(defaultValue || value || "");
    const [optionSearch, setOptionsSearch] = useState<any>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [search, setSearch] = useState("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const debounceSearch = useDebounce(searchQuery, 1000);
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(-1);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLUListElement>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
        if (value !== undefined && value !== valueOptions) {
            setValueOptions(value); // Sincronizamos el estado interno con la prop value
            setSearch(""); // Limpiamos la búsqueda para evitar conflictos
            setSearchQuery("");
        }
    }, [value]);

    const setValueOption = (item: IOption, name: string, idField?: string) => {
        setValueOptions(item.value);
        setSearchQuery(""); // Limpia la búsqueda después de seleccionar
        setSearch("");
        setIsOpen(false);
        onChange(item.id, item.value, name, idField);
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const value = e.target.value;
        setSearchQuery(value.toUpperCase());
        setSearch(value);
        setValueOptions(value); // Actualiza el valor visible en el Input
        onChange("", e.target.value, name, "");
        if (isSearch) {
            setIsOpen(true); // Abre la lista al escribir si isSearch es true
        }
    };

    useEffect(() => {
        if (debounceSearch.length > 2) { // Solo busca si hay al menos 3 caracteres
            if (handleGetData) {
                setIsLoading(true);
                handleGetData(debounceSearch, () => setIsLoading(false));
            }
        } else {
            setOptionsSearch(options?.length ? options.map((item: any) => ({
                id: item?.id?.toString(),
                value: item?.value
            })) : []);
        }
    }, [debounceSearch]);


    useEffect(() => {
        setOptionsSearch(
            options?.length
                ? options.map((item: any, index: number) => ({
                    id: item?.id?.toString() || `fallback-${index}`, // Fallback if id is undefined
                    value: item?.value,
                }))
                : []
        );
    }, [options, defaultValue]);


    useEffect(() => {
        setOptionsSearch(options?.length ? options.map((item: any) => ({
            id: item?.id?.toString(),
            value: item?.value
        })) : []);
    }, [options, defaultValue]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => { // Ajustar tipo de evento
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setIsOpen(true);
            setSelectedOptionIndex(prevIndex => Math.min(prevIndex + 1, resultsOptions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setIsOpen(true);
            setSelectedOptionIndex(prevIndex => Math.max(prevIndex - 1, -1));
        } else if (e.key === "Enter" && selectedOptionIndex >= 0) {
            e.preventDefault();
            setValueOption(resultsOptions[selectedOptionIndex], name, id);
        }
    };

    const resultsOptions: any = (!search || handleGetData) ? optionSearch : optionSearch?.filter((option: any) => (typeof option.id === "string" || typeof option.value === "string") && option?.id?.toLowerCase().includes(search.toLocaleLowerCase()) || option?.value?.toLowerCase().includes(search.toLocaleLowerCase()));

    const optionsHeigth: CSSProperties = {
        height: resultsOptions && resultsOptions.length > 10 ? "215px" : "auto",
        filter: "blur(-1px)"
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                wrapperRef.current && !wrapperRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const updateDropdownPos = () => {
        if (wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateDropdownPos();
            window.addEventListener("scroll", updateDropdownPos, true);
            window.addEventListener("resize", updateDropdownPos);
        }
        return () => {
            window.removeEventListener("scroll", updateDropdownPos, true);
            window.removeEventListener("resize", updateDropdownPos);
        };
    }, [isOpen]);

    const dropdownContent = isOpen && dropdownPos ? ReactDOM.createPortal(
        <motion.ul
            ref={dropdownRef}
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: -8 }}
            style={{
                ...optionsHeigth,
                position: "absolute",
                top: dropdownPos.top + 6,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 999999,
            }}
            className={styles.content__listOptions}
        >
            {resultsOptions?.length > 0 ? (
                resultsOptions.map((item: IOption, index: number) => {
                    const isChosen = !!valueOptions && String(item.value ?? '').trim().toLowerCase() === String(valueOptions).trim().toLowerCase();
                    return (
                        <li
                            key={item.id || `option-${index}`}
                            className={`${index === selectedOptionIndex ? styles.selectedOption : ''} ${isChosen ? styles.chosen : ''}`}
                            onClick={() => setValueOption(item, name, id)}
                        >
                            <p>{item.value}</p>
                            {isChosen && <Icon icon="solar:check-circle-bold" className={styles.check} />}
                        </li>
                    );
                })
            ) : (
                <li className="p-2" key="no-results">
                    No se encontraron más resultados
                </li>
            )}
        </motion.ul>,
        document.body
    ) : null;

    return (

        <>
            <div
                ref={wrapperRef} className={styles.wrapper__select} onClick={() => !disabled && setIsOpen(!isOpen)}>
                <div className={disabled ? `${styles.input__select} ${styles.disabled__select}` : `${styles.input__select}`} onClick={() => !disabled && setIsOpen(!isOpen)}>
                    <div id={id}>
                        <InputPro
                            reference={inputRef}
                            onClick={() => !disabled && setIsOpen(true)}
                            onKeyDown={handleKeyDown}
                            error={null}
                            name={name}
                            value={valueOptions || defaultValue}
                            label={label}
                            autocomplete="off"
                            readOnly={readOnly}
                            onChange={handleInputChange}
                            type="text"
                            isLabel={withLabel}
                            searching={isSearch}
                            disabled={disabled}
                            className={inputClassName}
                        />
                    </div>
                    {
                        isLoading ?
                            <div className={styles.select__loader__container}>
                                <span className={styles.select__loader__icon}></span>
                            </div>
                            :
                            <div className="absolute z-1 right-3 bottom-2.5 flex items-center">
                                <Icon icon="ep:arrow-down-bold" className="text-gray-400 dark:text-gray-500" onClick={() => setIsOpen(!isOpen)} />
                            </div>
                    }

                </div>
            </div>
            {error && typeof error === "string" && <p className="text-[#D35130] font-bold text-sm mt-1">{error}</p>}
            {dropdownContent}
        </>
    );
};

export default Select;
