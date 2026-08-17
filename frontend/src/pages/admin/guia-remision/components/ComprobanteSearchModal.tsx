import { useState, useEffect } from "react";
import Modal from "@/components/Modal";
import InputPro from "@/components/InputPro";
import Button from "@/components/Button";
import { useInvoiceStore } from "@/zustand/invoices";
import { useDebounce } from "@/hooks/useDebounce";

interface IProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (comprobante: any) => void;
}

/**
 * Selector de comprobantes (Factura/Boleta) emitidos para precargar los datos
 * de la guía de remisión (destinatario, punto de llegada e ítems).
 */
const ComprobanteSearchModal = ({ isOpen, onClose, onSelect }: IProps) => {
    const { getAllInvoices, invoices } = useInvoiceStore();
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [isLoading, setIsLoading] = useState(false);

    const handleSearch = async (query: string) => {
        setIsLoading(true);
        await getAllInvoices({
            tipoComprobante: "FORMAL",
            search: query,
            page: 1,
            limit: 20,
        });
        setIsLoading(false);
    };

    useEffect(() => {
        if (isOpen) handleSearch("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) handleSearch(debouncedSearchTerm);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchTerm]);

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title="Importar desde Factura / Boleta"
            width="640px"
        >
            <div className="p-4">
                <div className="mb-4">
                    <InputPro
                        label="Buscar por serie-correlativo, cliente o documento"
                        name="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Ej: F001-123 o razón social..."
                        isLabel
                    />
                </div>

                <div className="overflow-y-auto max-h-[420px] border dark:border-slate-800 rounded-lg">
                    {isLoading ? (
                        <div className="p-4 text-center dark:text-gray-400">Cargando...</div>
                    ) : invoices && invoices.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[520px] text-sm text-left">
                                <thead className="text-xs text-gray-700 dark:text-gray-200 uppercase bg-gray-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-4 py-3">Comprobante</th>
                                        <th className="px-4 py-3">Cliente</th>
                                        <th className="px-4 py-3">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((c: any) => (
                                        <tr key={c.id} className="bg-white dark:bg-[#111827] border-b dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                                            <td className="px-4 py-3 font-medium dark:text-white">
                                                <span className="block">{c.serie}-{String(c.correlativo).padStart(8, "0")}</span>
                                                <span className="text-[11px] text-gray-400 uppercase">{c.comprobante}</span>
                                            </td>
                                            <td className="px-4 py-3 dark:text-gray-300">
                                                <span className="block">{c.cliente?.nombre || "—"}</span>
                                                <span className="text-[11px] text-gray-400">{c.cliente?.nroDoc || ""}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Button
                                                    size="sm"
                                                    color="secondary"
                                                    onClick={() => {
                                                        onSelect(c);
                                                        onClose();
                                                    }}
                                                >
                                                    Usar
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No se encontraron comprobantes
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

export default ComprobanteSearchModal;
