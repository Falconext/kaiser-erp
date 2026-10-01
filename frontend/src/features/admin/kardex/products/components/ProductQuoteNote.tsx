import { Icon } from "@iconify/react";
import type { useProductModalViewModel } from "../useProductModalViewModel";

type ViewProps = ReturnType<typeof useProductModalViewModel>;

/**
 * Observación que la COTIZACIÓN imprime debajo de la imagen del producto: medidas,
 * acabado, condiciones de entrega… Se guarda en el catálogo, así que el vendedor no
 * la reescribe en cada cotización — viene puesta al agregar el producto.
 *
 * Sin límite de caracteres a propósito (es `text` en Postgres). El contador es una
 * referencia de cuánto ocupará en el PDF, no un tope.
 */
export const ProductQuoteNote: React.FC<{ vm: ViewProps }> = ({ vm }) => {
    const { formValues, setFormValues } = vm;
    const valor = (formValues as any)?.observacionCotizacion || '';

    return (
        <div className="mt-4 rounded-2xl border border-gray-200 dark:border-white/10 p-4">
            <div className="flex items-center gap-2 mb-1">
                <Icon icon="solar:document-text-linear" width={16} className="text-violet-600 dark:text-violet-400" />
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Observación para cotizaciones</h4>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">
                Se imprime debajo de la imagen de este producto en la cotización. Puedes usar
                varias líneas.
            </p>
            <textarea
                value={valor}
                onChange={(e) => setFormValues({ ...formValues, observacionCotizacion: e.target.value } as any)}
                rows={4}
                placeholder="Ej: Rollo de 100 m. Ancho 4.20 m. Entrega en planta Comas. Precio sujeto a confirmación de stock."
                className="w-full resize-y rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-violet-300"
            />
            <div className="mt-1 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{valor.length} caracteres</span>
                {valor && (
                    <button
                        type="button"
                        onClick={() => setFormValues({ ...formValues, observacionCotizacion: '' } as any)}
                        className="text-[10px] font-semibold text-red-500 hover:text-red-600"
                    >
                        Borrar
                    </button>
                )}
            </div>
        </div>
    );
};
