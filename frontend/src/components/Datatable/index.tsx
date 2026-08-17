import { FC, useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import TableHeader from './TableHeader';
import TableBody from './TableBody';
import { IDataTableProps } from './types';
import styles from './table.module.css';
import AutoScrollTable from '../Autoscrolltable';
import { AnimatePresence, motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion/presets';

const DataTable: FC<IDataTableProps> = ({
    formValues,
    headerColumns,
    bodyData,
    color,
    idTable,
    colorFont,
    colorRow,
    actions,
    isCompact,
    pageSize,
    onSort,
    sortColumn,
    sortDirection,
}: any) => {
    const [data, setData] = useState(Array.isArray(bodyData) ? bodyData : []);
    const [currentPage, setCurrentPage] = useState(1);
    // Tamaño de página interno (permite el selector "Filas/pág"); se siembra del prop.
    const [perPage, setPerPage] = useState<number | undefined>(pageSize);
    useEffect(() => { setPerPage(pageSize); }, [pageSize]);

    const resolvedColumns = useMemo(() => {
        if (!Array.isArray(headerColumns)) return headerColumns;

        const rows = Array.isArray(bodyData) ? bodyData : [];
        const sample = rows.length > 0 ? rows[0] : undefined;
        if (!sample || typeof sample !== 'object') return headerColumns;

        const sampleKeys = Object.keys(sample);

        const normalize = (value: string) =>
            value.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const aliases: Record<string, string[]> = {
            nro: ['correlativo', 'numero', 'nro', 'nrodoc', 'numdoc'],
            ot: ['numeroot', 'numeroordentrabajo', 'ordentrabajo', 'ot'],
            producto: ['descripcion', 'producto'],
            unimed: ['unidadmedida', 'unidad'],
            pu: ['preciounitario', 'precio'],
            venta: ['sale', 'venta'],
            importe: ['total', 'monto', 'mtoimpventa', 'importe'],
            nrodocumento: ['ruc', 'nrodoc', 'numdoc', 'document', 'documento'],
            opergravada: ['montogravadas', 'mtoopergravadas', 'mtoopergravada', 'opergravada', 'gravadas', 'gravada'],
            igv: ['montoigv', 'mtoigv', 'igv'],
            docafiliado: ['documentoafiliado', 'numdocafectado', 'documentoafectado'],
            numdoc: ['document', 'nrodoc', 'numdoc'],
        };

        const resolveKey = (label: string) => {
            if (Object.prototype.hasOwnProperty.call(sample, label)) return label;
            const labelNorm = normalize(label);
            const exactNorm = sampleKeys.find((k) => normalize(k) === labelNorm);
            if (exactNorm) return exactNorm;
            const aliasList = aliases[labelNorm];
            if (aliasList) {
                for (const aliasNorm of aliasList) {
                    const match = sampleKeys.find((k) => normalize(k) === aliasNorm);
                    if (match) return match;
                }
            }
            const minLen = 4;
            if (labelNorm.length >= minLen) {
                const fuzzy = sampleKeys.find((k) => {
                    const nk = normalize(k);
                    const shortLen = Math.min(nk.length, labelNorm.length);
                    if (shortLen < minLen) return false;
                    return nk.includes(labelNorm) || labelNorm.includes(nk);
                });
                if (fuzzy) return fuzzy;
            }
            return label;
        };

        return headerColumns.map((col: any) => {
            if (typeof col === 'object' && col && 'key' in col && 'label' in col) return col;
            const label = col as string;
            return { label, key: resolveKey(label) };
        });
    }, [headerColumns, bodyData]);

    const safeResolvedColumns = useMemo(() => {
        if (Array.isArray(resolvedColumns) && resolvedColumns.length > 0) return resolvedColumns;
        const sample = Array.isArray(bodyData) && bodyData.length > 0 ? bodyData[0] : null;
        if (!sample || typeof sample !== 'object') return [];
        const fallbackKeys = ['Producto', 'Precio Venta', 'Stock', 'Estado', 'Acciones'];
        return fallbackKeys
            .filter((key) => Object.prototype.hasOwnProperty.call(sample, key))
            .map((key) => ({ label: key, key }));
    }, [resolvedColumns, bodyData]);

    useEffect(() => {
        const nextData = Array.isArray(bodyData) ? bodyData : [];
        setData(nextData);
        setCurrentPage(1);
    }, [bodyData]);

    const handleSort = (column: string) => {
        const sortedData = [...data].sort((a, b) => (a[column] > b[column] ? 1 : -1));
        setData(sortedData);
        setCurrentPage(1);
    };

    // Ordenamiento controlado por el padre (opt-in). Si no se pasa `onSort`,
    // se conserva el ordenamiento interno por defecto (retrocompatible).
    const effectiveSort = typeof onSort === 'function' ? onSort : handleSort;

    // ── Pagination ──────────────────────────────────────────────────
    const totalItems = data?.length ?? 0;
    const totalPages = perPage && perPage > 0 ? Math.ceil(totalItems / perPage) : 1;
    const paginatedData = perPage && perPage > 0
        ? (data ?? []).slice((currentPage - 1) * perPage, currentPage * perPage)
        : data;

    const getPageNumbers = () => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | '...')[] = [];
        const delta = 2;
        const left = Math.max(2, currentPage - delta);
        const right = Math.min(totalPages - 1, currentPage + delta);
        pages.push(1);
        if (left > 2) pages.push('...');
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < totalPages - 1) pages.push('...');
        pages.push(totalPages);
        return pages;
    };

    const renderPagination = () => {
        if (!perPage) return null;
        const start = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
        const end = Math.min(currentPage * perPage, totalItems);
        const perPageOptions = Array.from(new Set([10, 20, 50, perPage].filter(Boolean) as number[])).sort((a, b) => a - b);
        const navBtn = 'h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors';

        return (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-400 dark:text-gray-400">
                    {start}-{end} de {totalItems.toLocaleString('es-PE')}
                </span>

                {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className={navBtn}><Icon icon="solar:double-alt-arrow-left-linear" /></button>
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className={navBtn}><Icon icon="solar:alt-arrow-left-linear" /></button>
                        {getPageNumbers().map((page, idx) =>
                            page === '...' ? (
                                <span key={`ellipsis-${idx}`} className="w-8 h-8 grid place-items-center text-slate-300 dark:text-slate-600 text-sm">…</span>
                            ) : (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page as number)}
                                    className={`h-8 min-w-8 px-2 grid place-items-center rounded-lg text-sm font-semibold transition-all ${
                                        page === currentPage
                                            ? 'btn-accent shadow-sm'
                                            : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {page}
                                </button>
                            )
                        )}
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className={navBtn}><Icon icon="solar:alt-arrow-right-linear" /></button>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className={navBtn}><Icon icon="solar:double-alt-arrow-right-linear" /></button>
                    </div>
                )}

                <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400">
                    <span>Filas/pág</span>
                    <div className="relative">
                        <select
                            value={perPage}
                            onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="appearance-none h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-600 dark:text-gray-200 focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                        >
                            {perPageOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <Icon icon="solar:alt-arrow-down-linear" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col">
            <AutoScrollTable>
                <div className="px-0 w-max min-w-full">
                    {data?.length > 0 && safeResolvedColumns.length > 0 ? (
                        <AnimatePresence mode="sync">
                            <motion.table
                                key={`table-${currentPage}`}
                                className={`${styles.table} ${isCompact ? styles.compact : ''} w-full`}
                                id={idTable}
                                layout
                                variants={fadeUp}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                            >
                                <TableHeader
                                    columns={safeResolvedColumns}
                                    colorFont={colorFont}
                                    onSort={effectiveSort}
                                    actions={actions}
                                    sortColumn={sortColumn}
                                    sortDirection={sortDirection}
                                />
                                <TableBody
                                    formValues={formValues}
                                    data={paginatedData}
                                    colorRow={colorRow}
                                    colorFont={colorFont}
                                    actions={actions}
                                    columns={safeResolvedColumns}
                                />
                            </motion.table>
                        </AnimatePresence>
                    ) : (
                        <motion.div className="flex flex-col items-center justify-center py-20 text-gray-400" variants={fadeUp} initial="initial" animate="animate" exit="exit">
                            <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-full mb-4">
                                <Icon icon="solar:box-minimalistic-linear" className="text-6xl text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-[#8C8B88] mb-1">
                                {data?.length > 0 ? 'No se pudieron renderizar las columnas' : 'No se encontraron registros'}
                            </h3>
                            <p className="text-sm text-[#A09F9B] text-center">
                                {data?.length > 0
                                    ? 'Restauramos una vista segura. Recarga la página para sincronizar columnas.'
                                    : 'Intenta ajustar los filtros o realiza una nueva búsqueda para encontrar lo que necesitas.'}
                            </p>
                        </motion.div>
                    )}
                </div>
            </AutoScrollTable>
            {renderPagination()}
        </div>
    );
};

export default DataTable;
