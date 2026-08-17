import { FC, useEffect, useState } from 'react';
import styles from './../table.module.css';
import { useInvoiceStore } from '@/zustand/invoices';
import useAlertStore from '@/zustand/alert';
import { motion } from 'framer-motion';
import { listItemFadeUp, listItemHidden, listStagger } from '@/lib/motion/presets';
import { motionTransitions } from '@/lib/motion/transitions';
import { useReducedMotionPreference } from '@/lib/motion/reducedMotion';

const DOCUMENT_TOKEN_CAPTURE_REGEX = /([a-zA-Z0-9]+-[a-zA-Z0-9]+)/g;
const DOCUMENT_TOKEN_REGEX = /^[a-zA-Z0-9]+-[a-zA-Z0-9]+$/;

const CENTERED_KEYS = new Set(['estado', 'tipo', 'status', 'acciones']);

/** Maps action.color or auto-detects from tooltip → Tailwind classes */
const getButtonStyle = (action: any, row: any): string => {
    if (action.color) {
        const map: Record<string, string> = {
            violet:  'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30 dark:border-violet-900/40',
            blue:    'bg-blue-50 text-blue-500 hover:bg-blue-100 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 dark:border-blue-900/40',
            rose:    'bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/30 dark:border-rose-900/40',
            emerald: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/30 dark:border-emerald-900/40',
            amber:   'bg-amber-50 text-amber-500 hover:bg-amber-100 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/30 dark:border-amber-900/40',
            gray:    'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700 dark:border-slate-700',
        };
        return map[action.color] ?? map.violet;
    }

    const raw = typeof action.tooltip === 'function' ? action.tooltip(row) : (action.tooltip ?? '');
    const t = raw.toString().toLowerCase();

    if (/(elim|borra|anula|cancel|delet)/.test(t)) return 'bg-rose-50 text-rose-500 hover:bg-rose-100 border border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/30 dark:border-rose-900/40';
    if (/(imprim|pdf|export|descarg|print)/.test(t))  return 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200 dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700 dark:border-slate-700';
    if (/(ver|detall|vista|abrir|view|show)/.test(t))  return 'bg-blue-50 text-blue-500 hover:bg-blue-100 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 dark:border-blue-900/40';
    if (/(edit|modif|actualiz|cambiar|update)/.test(t)) return 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30 dark:border-violet-900/40';

    return 'bg-violet-50 text-violet-600 hover:bg-violet-100 border border-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30 dark:border-violet-900/40';
};

const EditableCell = ({ value, type, onChange, disabled, className }: any) => {
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => { setLocalValue(value); }, [value]);

    const handleBlur = () => { if (localValue != value) onChange(localValue); };
    const handleKeyDown = (e: any) => { if (e.key === 'Enter') e.currentTarget.blur(); };

    return (
        <input
            type={type}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={className}
            disabled={disabled}
        />
    );
};

interface ITableBodyProps {
    data: any[];
    colorRow?: string;
    colorFont?: string;
    actions?: any[];
    formValues: any;
    columns: any[];
}

const TableBody: FC<ITableBodyProps> = ({ data, formValues, actions, columns }) => {
    const { updateProductInvoice, productsInvoice } = useInvoiceStore();
    const reduceMotion = useReducedMotionPreference();

    const getOriginalQuantity = (row: any) => {
        const orig = productsInvoice.find((item: any) => item.descripcion === row.descripcion);
        if (!orig) return Number(row.cantidad);
        return orig.cantidadOriginal !== undefined ? Number(orig.cantidadOriginal) : Number(orig.cantidad);
    };

    const handleInputChange = (index: number, field: string, value: string | number) => {
        const updatedProduct = { ...data[index] };
        const originalQuantity = getOriginalQuantity(updatedProduct);

        if (field === 'cantidad' && formValues?.motivoId === 7) {
            const newQuantity = value === '' ? 0 : Number(value);
            if (newQuantity > originalQuantity) {
                useAlertStore.getState().alert("No puedes colocar un número mayor que la cantidad original", "error");
                return;
            }
            if (newQuantity <= 0 && value !== '') return;
            updatedProduct[field] = value === '' ? '' : newQuantity;
        } else {
            updatedProduct[field] = value;
        }

        const descount = parseFloat(updatedProduct.descuento) || 0;
        if (field === 'descuento' && (descount < 0 || descount > 100)) return;

        if (updatedProduct.cantidad !== '') {
            const unitPrice = parseFloat(updatedProduct.precioUnitario) || 0;
            const quantity = parseFloat(updatedProduct.cantidad) || 1;
            const sale = (unitPrice * quantity * (1 - descount / 100)) / 1.18;
            updatedProduct.sale = sale.toFixed(2);
            const igv = sale * 0.18;
            updatedProduct.igv = igv.toFixed(2);
            const total = sale + igv;
            updatedProduct.total = total.toFixed(2);
            updateProductInvoice(index, updatedProduct);
        }
    };

    return (
        <motion.tbody variants={listStagger} initial="initial" animate="animate" exit="exit">
            {data.map((row, index) => {
                const isCanceled = formValues === undefined || row.estado === 'cancelado' || row.estado === 'completado' ||
                    ([1, 2, 4, 6].includes(formValues?.motivoId));
                const isNoteType03 = formValues?.motivoId === 3;
                const isNoteType04 = formValues?.motivoId === 4;
                const isNoteType05 = formValues?.motivoId === 5;
                const isNoteType07 = formValues?.motivoId === 7;
                const isNoteType08 = formValues?.motivoId === 8;
                const isNoteType09 = formValues?.motivoId === 9;
                const isNoteType10 = formValues?.motivoId === 10;

                return (
                    <motion.tr
                        key={index}
                        className="group transition-colors duration-150"
                        variants={reduceMotion ? undefined : {
                            initial: listItemHidden,
                            animate: listItemFadeUp,
                            exit: listItemHidden,
                        }}
                        initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.995 }}
                        animate={reduceMotion ? { opacity: 1 } : {
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: {
                                ...motionTransitions.normal,
                                delay: Math.min(index * 0.028, 0.2),
                            },
                        }}
                        exit={reduceMotion ? { opacity: 0 } : {
                            opacity: 0,
                            y: 6,
                            scale: 0.995,
                            transition: motionTransitions.fast,
                        }}
                        layout
                    >
                        {columns.map((col, cellIndex) => {
                            const isObject = typeof col === 'object';
                            const key = isObject ? col.key : (col as string);
                            const keyLower = key.toString().toLowerCase();
                            const cell = row[key];

                            let isEditable: boolean;
                            if (isNoteType05 || isNoteType04) {
                                isEditable = key === 'precioUnitario';
                            } else if (isNoteType03) {
                                isEditable = key === 'descripcion';
                            } else if (isNoteType07) {
                                isEditable = key === 'cantidad' && !isCanceled;
                            } else {
                                isEditable = ['descripcion', 'cantidad', 'precioUnitario', 'descuento'].includes(key) && !isCanceled;
                            }
                            if (isNoteType08 || isNoteType09 || isNoteType10) isEditable = key === 'precioUnitario';

                            const cellValue = cell === null || cell === undefined ? '' : cell.toString();
                            const isTruncatable = key === 'direccion' || key === 'nombre' || key === 'razonSocial';
                            const isConceptoColumn = keyLower === 'concepto';
                            const centered = CENTERED_KEYS.has(keyLower);

                            return (
                                <td
                                    key={cellIndex}
                                    style={{
                                        color: isCanceled ? '#B8B2A7' : undefined,
                                        textAlign: centered ? 'center' : 'left',
                                    }}
                                >
                                    {isEditable ? (
                                        <EditableCell
                                            type={key === 'descripcion' ? 'text' : 'number'}
                                            value={cellValue}
                                            onChange={(newValue: any) => handleInputChange(index, key, newValue)}
                                            className="w-full py-1.5 px-3 border-0 bg-gray-50 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-violet-100 focus:bg-white transition-all dark:bg-slate-800 dark:text-gray-200 dark:focus:bg-slate-900 dark:focus:ring-violet-900/40"
                                            disabled={!isEditable}
                                        />
                                    ) : key === 'stock' || key === 'Stock' ? (
                                        cell !== null && cell !== '' ? (
                                            <span className={`font-semibold ${Number(cell) <= 5 ? 'text-rose-500 dark:text-rose-400' : Number(cell) <= 15 ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {cell as React.ReactNode}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 dark:text-gray-500">—</span>
                                        )
                                    ) : keyLower === 'cantidad' && !isEditable ? (
                                        <span className={`font-semibold ${Number(cell) > 10 ? 'text-emerald-600 dark:text-emerald-400' : Number(cell) > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                            {cell?.toString()}
                                        </span>
                                    ) : key === 'estado' || key === 'tipo' || key === 'status' || key === 'ambiente' || key === 'Ambiente' ? (
                                        <div
                                            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold
                                                ${cell === 'EMITIDO' || cell === 'ACTIVO' || cell === 'ACEPTADO' || cell === 'INGRESO' || cell === 'TRANSFERENCIA' || cell === 'SENT' || cell === 'Present' || cell === 'COMPLETADO' || cell === 'PRODUCCIÓN'
                                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300'
                                                    : cell === 'PENDIENTE' || cell === 'PENDIENTE_CONCILIACION'
                                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                                                        : cell === 'PENDIENTE_PAGO' || cell === 'PAGO_PARCIAL' || cell === 'AJUSTE' || cell === 'ENVIANDO' || cell === 'DEMO'
                                                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300'
                                                            : cell === 'PARTIAL'
                                                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300'
                                                                : cell === 'RECHAZADO' || cell === 'ANULADO' || cell === 'SALIDA' || cell === 'FALLIDO_ENVIO' || cell === 'INACTIVO' || cell === 'Leave'
                                                                    ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-300'
                                                                    : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'
                                                }`}
                                        >
                                            {cell === 'PENDIENTE_CONCILIACION' ? 'Conciliación SUNAT'
                                                : cell === 'PENDIENTE' ? 'En procesamiento'
                                                : cell === 'INGRESO' ? 'Ingreso'
                                                : cell === 'SALIDA' ? 'Salida'
                                                : cell === 'AJUSTE' ? 'Ajuste'
                                                : cell === 'TRANSFERENCIA' ? 'Transferencia'
                                                : cell === 'ACTIVO' ? 'Activo'
                                                : cell === 'EMITIDO' ? 'Emitido'
                                                : cell === 'RECHAZADO' ? 'Rechazado'
                                                : cell === 'ANULADO' ? 'Anulado'
                                                : cell === 'PENDIENTE_PAGO' ? 'Pendiente Pago'
                                                : cell === 'PAGO_PARCIAL' ? 'Parcial'
                                                : cell === 'COMPLETADO' ? 'Completado'
                                                : cell === 'ACEPTADO' ? 'Aceptado'
                                                : cell === 'ENVIANDO' ? 'Enviando'
                                                : cell === 'FALLIDO_ENVIO' ? 'Fallido Envío'
                                                : cell === 'PRODUCCIÓN' ? 'Producción'
                                                : cell === 'DEMO' ? 'Demo'
                                                : cell?.toString().toLowerCase()}
                                        </div>
                                    ) : isTruncatable ? (
                                        <span className={`${styles.truncate} capitalize`} title={cellValue}>
                                            {cellValue.toLowerCase()}
                                        </span>
                                    ) : (
                                        <div className="flex">
                                            {(() => {
                                                const isCode = keyLower.includes('código') || keyLower.includes('codigo') || keyLower.includes('code') || keyLower.includes('serie') || keyLower.includes('seria') || keyLower.includes('doc') || keyLower === 'referencia' || keyLower === 'comprobante' || keyLower === 'email' || keyLower.includes('email');
                                                const isString = typeof cell === 'string';

                                                if (isConceptoColumn && isString) {
                                                    const segments = cellValue.split(DOCUMENT_TOKEN_CAPTURE_REGEX);
                                                    return (
                                                        <span className="capitalize">
                                                            {segments.map((segment: string, segIdx: number) => {
                                                                if (!segment) return null;
                                                                const isDocToken = DOCUMENT_TOKEN_REGEX.test(segment);
                                                                return isDocToken ? (
                                                                    <span key={`tok-${segIdx}`} className="uppercase tracking-wide">{segment.toUpperCase()}</span>
                                                                ) : segment.toLowerCase();
                                                            })}
                                                        </span>
                                                    );
                                                }

                                                // Correos/emails siempre en minúscula (nunca capitalizados).
                                                const isEmail = keyLower.includes('correo') || keyLower.includes('email') || keyLower.includes('e-mail');
                                                if (isString && isEmail) {
                                                    return <span className="lowercase" title={cellValue}>{cell.toString().toLowerCase()}</span>;
                                                }

                                                if (isString && !isCode) {
                                                    return <span className="capitalize">{cell.toString().toLowerCase()}</span>;
                                                }
                                                return cell as React.ReactNode;
                                            })()}
                                        </div>
                                    )}
                                </td>
                            );
                        })}

                        {actions && actions.length > 0 && (
                            <td className="text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                    {actions.map((action: any, actionIndex: number) => {
                                        if (action.condition && !action.condition(row)) return null;
                                        if (action.hide && action.hide(row)) return null;

                                        const iconElement = typeof action.icon === 'function' ? action.icon(row) : action.icon;
                                        const tooltipText = typeof action.tooltip === 'function' ? action.tooltip(row) : action.tooltip;
                                        const btnStyle = getButtonStyle(action, row);

                                        return (
                                            <div key={actionIndex} className={styles.tooltipContainer}>
                                                <button
                                                    type="button"
                                                    onClick={() => action.onClick(row)}
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 ${btnStyle}`}
                                                >
                                                    {iconElement}
                                                </button>
                                                {tooltipText && (
                                                    <p className={styles.tooltip}>{tooltipText}</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </td>
                        )}
                    </motion.tr>
                );
            })}
        </motion.tbody>
    );
};

export default TableBody;
