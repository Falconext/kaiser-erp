import { Icon } from "@iconify/react";
import Button from "@/components/Button";
import { ProductImageUploader } from "./ProductImageUploader";
import { ProductWholesalePricing } from "./ProductWholesalePricing";
import { ProductBasicForm } from "./ProductBasicForm";
import { ProductRichDescription } from "./ProductRichDescription";
import ModalMedicamento from "@/pages/admin/kardex/modal-productos/components/ModalMedicamento";
import ModalLotes from "@/pages/admin/kardex/modal-productos/components/ModalLotes";

// Cuerpo compartido del formulario de producto. Se usa tanto dentro del modal
// (ProductModalView) como en la página dedicada de "Nuevo producto"
// (ProductoNuevo). Recibe el `vm` de useProductModalViewModel — única fuente de
// verdad para no duplicar lógica.
export const ProductFormContent: React.FC<{ vm: any; onCancel?: () => void; forceBarcode?: boolean }> = ({ vm, onCancel, forceBarcode }) => {
    return (
        <>
            {(forceBarcode || vm.productSections.codigos) && !vm.isFabricacion && (
                <div className="px-4 pt-4 pb-1">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/60 dark:bg-violet-950/20">
                        <Icon icon="mdi:barcode-scan" className="text-violet-500 flex-shrink-0" width={20} />
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Código de barras → auto-completar desde red global"
                            className="flex-1 bg-transparent text-sm text-gray-700 focus-within:outline-none dark:text-gray-200 dark:placeholder-gray-500 outline-none border-none focus:border-none min-w-0"
                            value={vm.barcodeQuery}
                            onChange={e => vm.setBarcodeQuery(e.target.value.replace(/\D/g, '').slice(0, 14))}
                            onKeyDown={e => e.key === 'Enter' && void vm.handleBarcodeGlobalSearch()}
                        />
                        <button
                            type="button"
                            onClick={() => void vm.handleBarcodeGlobalSearch()}
                            disabled={vm.searchingBarcode || vm.barcodeQuery.length < 8}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white disabled:text-gray-400 text-xs font-semibold transition-all flex-shrink-0"
                        >
                            <Icon icon={vm.searchingBarcode ? "svg-spinners:ring-resize" : "solar:global-bold-duotone"} width={14} />
                            <span className="hidden sm:inline">{vm.searchingBarcode ? 'Buscando...' : 'Buscar'}</span>
                        </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                Auto-buscar imagen al guardar
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                Solo si el producto no tiene imagen. Puede traer imágenes referenciales no exactas.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => vm.setAutoImageOnSave(!vm.autoImageOnSave)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${vm.autoImageOnSave ? 'bg-violet-600' : 'bg-gray-300 dark:bg-slate-600'}`}
                            aria-pressed={vm.autoImageOnSave}
                            aria-label="Auto buscar imagen al guardar"
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${vm.autoImageOnSave ? 'translate-x-5' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>
                </div>
            )}

            <div className={`${vm.isRestaurante ? 'grid-cols-1 md:grid-cols-2' : vm.isFarmacia ? 'flex flex-col gap-6' : 'grid-cols-1 md:grid-cols-3'} grid px-4 gap-5`}>

                {/* Left Column - Image & Financials */}
                <div
                    className={
                        vm.isFarmacia
                            ? 'w-full'
                            : 'w-full md:sticky md:top-[88px] md:self-start'
                    }
                >
                    <div className={`mt-5 ${vm.isFarmacia ? 'w-full' : ''}`}>
                        <ProductImageUploader vm={vm} />
                        {vm.productSections.mayorista && (
                            <div className="mt-4">
                                <ProductWholesalePricing vm={vm} />
                            </div>
                        )}
                        <ProductRichDescription vm={vm} />

                    </div>
                </div>

                {/* Right Columns - Form & Logistics */}
                <ProductBasicForm vm={vm} />

            </div>

            {/* Submit Actions */}
            <div className="sticky bottom-0 z-10 flex gap-4 px-6 justify-end py-4 md:pr-5 border-t border-gray-200 dark:border-white/10 bg-white dark:bg-[#111c44]/70 dark:backdrop-blur-xl mt-6">
                <Button color="danger" outline className="" onClick={() => (onCancel ? onCancel() : vm.setIsOpenModal(false))}>
                    Cancelar
                </Button>
                <Button color="primary" className="px-6" onClick={vm.handleSubmitProduct} disabled={vm.loading}>
                    {vm.loading ? (
                        <div className="flex items-center gap-2">
                            <Icon icon="svg-spinners:180-ring-with-bg" />
                            {vm.isEdit ? "Editando cambios..." : "Guardando..."}
                        </div>
                    ) : (
                        vm.isEdit ? "Editar cambios" : "Crear Producto"
                    )}
                </Button>
            </div>

            {/* Nested Drawers */}
            <ModalMedicamento
                isOpen={vm.showMedicamentoModal}
                onClose={() => vm.setShowMedicamentoModal(false)}
                formValues={vm.formValues}
                handleChange={vm.handleChange}
                errors={vm.errors}
                onFillFromDigemid={vm.fillFromDigemid}
            />
            <ModalLotes
                isOpen={vm.showLotesModal}
                onClose={() => vm.setShowLotesModal(false)}
                formValues={vm.formValues}
                isEdit={vm.isEdit}
                creationLote={vm.creationLote}
                setCreationLote={vm.setCreationLote}
            />
        </>
    );
};
