import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import InputPro from "@/components/InputPro";
import Button from "@/components/Button";
import { useProductsStore } from "@/zustand/products";
import { useDebounce } from "@/hooks/useDebounce";

interface IProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (product: any) => void;
}

const ProductSearchModal = ({ isOpen, onClose, onSelect }: IProps) => {
    const { getAllProducts, products } = useProductsStore();
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            handleSearch("");
        }
    }, [isOpen]);

    useEffect(() => {
        handleSearch(debouncedSearchTerm);
    }, [debouncedSearchTerm]);

    const handleSearch = async (query: string) => {
        setIsLoading(true);
        // Pass page 1 and limit 20 for search results
        await getAllProducts({ search: query, page: 1, limit: 20 }, undefined, true);
        setIsLoading(false);
    };

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title="Buscar Producto"
            width="700px"
        >
            <div className="p-4">
                <div className="mb-4">
                    <InputPro
                        label="Buscar por Código o Descripción"
                        name="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Escriba para buscar..."
                        isLabel
                    />
                </div>

                <div className="overflow-y-auto max-h-[400px] border dark:border-slate-800 rounded-lg">
                    {isLoading ? (
                        <div className="p-4 text-center dark:text-gray-400">Cargando...</div>
                    ) : products && products.length > 0 ? (
                        <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm text-left">
                            <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3">Descripción</th>
                                    <th className="px-4 py-3">Stock</th>
                                    <th className="px-4 py-3">Precio</th>
                                    <th className="px-4 py-3">Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product: any) => (
                                    <tr key={product.id} className="bg-white dark:bg-[#111827] border-b dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                        <td className="px-4 py-3 font-medium dark:text-white">{product.codigo}</td>
                                        <td className="px-4 py-3 dark:text-gray-300">{product.descripcion}</td>
                                        <td className="px-4 py-3 dark:text-gray-300">{product.stock}</td>
                                        <td className="px-4 py-3 dark:text-gray-300">S/ {Number(product.precioUnitario).toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <Button
                                                size="sm"
                                                color="secondary"
                                                onClick={() => {
                                                    onSelect(product);
                                                    onClose();
                                                }}
                                            >
                                                Seleccionar
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table></div>
                    ) : (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No se encontraron productos
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-4">
                    <Button color="gray" onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ProductSearchModal;
