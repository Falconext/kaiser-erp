import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import InputPro from "@/components/InputPro";
import Button from "@/components/Button";
import { Icon } from "@iconify/react";

interface IProps {
    isOpen: boolean;
    onClose: () => void;
    item: any;
    onSave: (newData: any) => void;
}

const normalizeWholesaleUnitPrice = (
    base: number,
    rule: { cantidadMinima: number; precio: number },
): number => {
    const minQty = Number(rule.cantidadMinima);
    const rulePrice = Number(rule.precio);

    if (!Number.isFinite(rulePrice) || rulePrice <= 0) return base;
    if (Number.isFinite(base) && base > 0 && minQty > 1 && rulePrice > base) {
        return Number((rulePrice / minQty).toFixed(6));
    }
    return rulePrice;
};

const getApplicablePrice = (
    base: number,
    rules: { cantidadMinima: number; precio: number }[],
    qty: number,
): number => {
    if (!Number.isFinite(base) || base <= 0) return 0;
    if (!rules?.length) return base;

    const parsedQty = Number(qty);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) return base;

    const normalizedRules = rules
        .map((r) => ({
            cantidadMinima: Number(r.cantidadMinima),
            precioUnitario: normalizeWholesaleUnitPrice(base, r),
        }))
        .filter((r) =>
            Number.isFinite(r.cantidadMinima) &&
            r.cantidadMinima > 0 &&
            Number.isFinite(r.precioUnitario) &&
            r.precioUnitario > 0,
        );

    if (!normalizedRules.length) return base;

    const applicable = normalizedRules
        .filter((r) => parsedQty >= r.cantidadMinima)
        .sort((a, b) => b.cantidadMinima - a.cantidadMinima)[0];

    return applicable ? applicable.precioUnitario : base;
};

const ModalEditLineItem = ({ isOpen, onClose, item, onSave }: IProps) => {
    const [formValues, setFormValues] = useState<any>({
        precioUnitario: 0,
        cantidad: 0,
        descuento: 0,
        descripcion: ""
    });

    useEffect(() => {
        if (item) {
            setFormValues({
                precioUnitario: Number(item.precioUnitario),
                cantidad: Number(item.cantidad),
                descuento: Number(item.descuento || 0),
                descripcion: item.descripcion
            });
        }
    }, [item]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (name === 'cantidad') {
            const qty = Number(value);
            const base = Number(item?.precioBase ?? item?.precioUnitario);
            const price = getApplicablePrice(base, item?.preciosMayorista ?? [], qty);
            setFormValues((prev: any) => ({ ...prev, cantidad: value, precioUnitario: price }));
        } else {
            setFormValues((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = () => {
        onSave({
            ...item,
            precioUnitario: Number(formValues.precioUnitario),
            cantidad: Number(formValues.cantidad),
            descuento: Number(formValues.descuento),
            descripcion: formValues.descripcion
        });
        onClose();
    };

    const hasWholesaleRules = item?.preciosMayorista?.length > 0;

    return (
        <Modal isOpenModal={isOpen} closeModal={onClose} title="Editar Item" width="500px">
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Descripción del Producto</label>
                    <InputPro
                        name="descripcion"
                        value={formValues.descripcion}
                        onChange={handleChange}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Precio Unitario (S/)</label>
                        <InputPro
                            name="precioUnitario"
                            type="number"
                            value={formValues.precioUnitario}
                            onChange={handleChange}
                        />
                        {hasWholesaleRules && (
                            <p className="text-xs text-green-600 mt-1">Precio mayorista aplicado según cantidad</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Cantidad</label>
                        <InputPro
                            name="cantidad"
                            type="number"
                            value={formValues.cantidad}
                            onChange={handleChange}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Descuento (%)</label>
                        <InputPro
                            name="descuento"
                            type="number"
                            value={formValues.descuento}
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {hasWholesaleRules && (
                    <div className="rounded-xl border border-gray-100 dark:border-transparent bg-gradient-to-br from-white to-gray-50/50 dark:from-slate-800/60 dark:to-slate-900/40 p-3">
                        <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-sm flex-shrink-0">
                                <Icon icon="solar:tag-price-bold-duotone" className="text-white" width={13} />
                            </div>
                            <p className="text-xs font-bold text-gray-800 dark:text-white">Precio por Mayorista</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Seleccionar:</span>

                            {/* Base price pill */}
                            {(() => {
                                const base = Number(item?.precioBase ?? item?.precioUnitario);
                                const isActive = Math.abs(Number(formValues.precioUnitario) - base) < 0.001 &&
                                    !item.preciosMayorista.some((t: any) => Math.abs(Number(formValues.precioUnitario) - t.precio) < 0.001 && t.precio !== base);
                                return (
                                    <button
                                        type="button"
                                        onClick={() => setFormValues((prev: any) => ({ ...prev, precioUnitario: base }))}
                                        className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                                            isActive
                                                ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 border-gray-800 dark:border-gray-200'
                                                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-600 hover:border-gray-500'
                                        }`}
                                    >
                                        Base S/{base.toFixed(2)}
                                    </button>
                                );
                            })()}

                            {/* Tier pills */}
                            {[...item.preciosMayorista]
                                .sort((a: any, b: any) => a.cantidadMinima - b.cantidadMinima)
                                .map((tier: any, i: number) => {
                                    const tierUnitPrice = normalizeWholesaleUnitPrice(Number(item?.precioBase ?? item?.precioUnitario), tier);
                                    const isActive = Math.abs(Number(formValues.precioUnitario) - tierUnitPrice) < 0.001;
                                    const isReached = Number(formValues.cantidad) >= tier.cantidadMinima;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setFormValues((prev: any) => ({
                                                ...prev,
                                                cantidad: Number(tier.cantidadMinima),
                                                precioUnitario: tierUnitPrice,
                                            }))}
                                            title={`Aplica desde ${tier.cantidadMinima} unidades`}
                                            className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                                                isActive
                                                    ? 'bg-green-600 text-white border-green-600 shadow-sm'
                                                    : isReached
                                                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-100'
                                                        : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-500 border-gray-200 dark:border-slate-700 hover:border-green-400'
                                            }`}
                                        >
                                            {isReached && !isActive && <Icon icon="mdi:check-circle" width={9} className="text-green-500" />}
                                            {tier.cantidadMinima}u → S/{Number(tierUnitPrice).toFixed(2)}
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                    <Button color="secondary" outline onClick={onClose}>Cancelar</Button>
                    <Button color="primary" onClick={handleSubmit}>Guardar</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ModalEditLineItem;
