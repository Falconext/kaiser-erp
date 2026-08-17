import { Icon } from "@iconify/react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    /** Producto padre (trae .descripcion, .moneda y .variantes) */
    product: any;
    /** Se llama con (padre, variante) al elegir una variante */
    onSelect: (padre: any, variante: any) => void;
}

/** Etiqueta legible de la variante a partir de sus atributos: {Color:"Rojo", Talla:"M"} -> "Rojo / M" */
export const etiquetaVariante = (variante: any): string => {
    const vals = variante?.valoresAtributos;
    if (vals && typeof vals === "object") {
        const partes = Object.values(vals).filter(Boolean);
        if (partes.length) return partes.join(" / ");
    }
    return variante?.descripcion || variante?.codigo || "Variante";
};

const ModalSeleccionVariante = ({ isOpen, onClose, product, onSelect }: Props) => {
    if (!isOpen || !product) return null;

    const simbolo = String(product?.moneda || "PEN").toUpperCase() === "USD" ? "$" : "S/";
    const variantes: any[] = (Array.isArray(product?.variantes) ? product.variantes : [])
        .filter((v: any) => String(v?.estado || "ACTIVO").toUpperCase() === "ACTIVO");

    return (
        <div
            className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Icon icon="solar:widget-5-bold-duotone" width={22} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-white truncate">Selecciona la variante</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{product?.descripcion?.toUpperCase()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0">
                        <Icon icon="solar:close-circle-bold" width={26} />
                    </button>
                </div>

                {/* Lista de variantes */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {variantes.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-6">Este producto no tiene variantes activas.</p>
                    )}
                    {variantes.map((v: any) => {
                        const stock = Number(v?.stock ?? 0);
                        const sinStock = stock <= 0;
                        const precio = Number(v?.precioUnitario ?? 0);
                        return (
                            <button
                                key={v.id}
                                type="button"
                                disabled={sinStock}
                                onClick={() => !sinStock && onSelect(product, v)}
                                className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-colors ${
                                    sinStock
                                        ? "border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 opacity-60 cursor-not-allowed"
                                        : "border-gray-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20"
                                }`}
                            >
                                <div className="min-w-0">
                                    <p className="font-semibold text-gray-900 dark:text-white truncate">{etiquetaVariante(v)}</p>
                                    <p className="text-[11px] text-gray-400 font-mono truncate">{v?.codigo}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-bold text-gray-900 dark:text-white">{simbolo} {precio.toFixed(2)}</p>
                                    <p className={`text-[11px] font-semibold ${sinStock ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                                        {sinStock ? "Sin stock" : `Stock: ${stock}`}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ModalSeleccionVariante;
