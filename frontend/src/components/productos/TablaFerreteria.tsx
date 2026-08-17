import DataTable from "@/components/Datatable";
import Pagination from "@/components/Pagination";
import TableSkeleton from "@/components/Skeletons/table";
import { Icon } from "@iconify/react";

interface TablaFerreteriaProps {
    productsTable: any[];
    productsLoaded?: boolean;
    visibleColumns: string[];
    currentPage: number;
    itemsPerPage: number;
    totalProducts: number;
    indexOfFirstItem: number;
    indexOfLastItem: number;
    pages: number[];
    setcurrentPage: (page: number) => void;
    setitemsPerPage: (items: number) => void;
    /** Click en el header de una columna (ordenamiento controlado por el padre). */
    onSort?: (column: string) => void;
    /** Columna actualmente ordenada (key resuelta, p.ej. "Stock"). */
    sortColumn?: string;
    /** Dirección del ordenamiento activo. */
    sortDirection?: 'asc' | 'desc';
}

const TablaFerreteria = ({
    productsTable,
    productsLoaded = true,
    visibleColumns,
    currentPage,
    itemsPerPage,
    totalProducts,
    indexOfFirstItem,
    indexOfLastItem,
    pages,
    setcurrentPage,
    setitemsPerPage,
    onSort,
    sortColumn,
    sortDirection
}: TablaFerreteriaProps) => {
    if (!productsLoaded && (!productsTable || productsTable.length === 0)) {
        return <TableSkeleton />;
    }

    if (!productsTable || productsTable.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-full mb-4">
                    <Icon icon="solar:box-minimalistic-linear" className="text-6xl text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-[#8C8B88] mb-1">No se encontraron productos</h3>
                <p className="text-sm text-[#A09F9B] text-center">
                    Ajusta los filtros o registra un nuevo producto para empezar.
                </p>
            </div>
        );
    }

    return (
        <>
            <div className="w-full overflow-x-auto">
                <DataTable
                    key={`kardex-productos-${totalProducts}-${currentPage}-${visibleColumns.join('|')}`}
                    bodyData={productsTable}
                    headerColumns={visibleColumns}
                    onSort={onSort}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                />
            </div>
            <Pagination
                data={productsTable}
                optionSelect
                currentPage={currentPage}
                indexOfFirstItem={indexOfFirstItem}
                indexOfLastItem={indexOfLastItem}
                setcurrentPage={setcurrentPage}
                setitemsPerPage={setitemsPerPage}
                pages={pages}
                total={totalProducts}
            />
        </>
    );
};

export default TablaFerreteria;
