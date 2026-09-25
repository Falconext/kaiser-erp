import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import { put } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useProductsStore } from '@/zustand/products';
import { IImportacion, IImportacionItemForm, INITIAL_ITEM_FORM } from './ImportacionesModel';

interface ModalEditarItemsImportacionProps {
    isOpen: boolean;
    importacion: IImportacion;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ModalEditarItemsImportacion({ isOpen, importacion, onClose, onSuccess }: ModalEditarItemsImportacionProps) {
    const { alert } = useAlertStore();
    const { getAllProducts, products } = useProductsStore();

    const [productoOptions, setProductoOptions] = useState<any[]>([]);
    const [items, setItems] = useState<IImportacionItemForm[]>([]);
    const [itemForm, setItemForm] = useState<IImportacionItemForm>(INITIAL_ITEM_FORM);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setItems((importacion.items || []).map((it) => ({
            productoId: it.productoId,
            productoLabel: `${it.producto?.codigo || ''} - ${it.producto?.descripcion || it.descripcion}`,
            descripcion: it.descripcion,
            cantidad: String(it.cantidad),
            unidad: it.unidad,
            precioFobUnitario: String(it.precioFobUnitario),
            pesoKg: it.pesoKg != null ? String(it.pesoKg) : '',
            volumenM3: it.volumenM3 != null ? String(it.volumenM3) : '',
            partidaArancelaria: it.partidaArancelaria || '',
            adValoremPorcentaje: it.adValoremPorcentaje != null ? String(it.adValoremPorcentaje) : '',
        })));
        setItemForm(INITIAL_ITEM_FORM);
    }, [isOpen, importacion]);

    useEffect(() => {
        setProductoOptions((products || []).map((p: any) => ({
            id: p.id,
            value: `${p.codigo} - ${p.descripcion} (Stock: ${p.stock})`,
            data: p,
        })));
    }, [products]);

    const handleProductoSearch = (query: string, cb: () => void) => {
        getAllProducts({ search: query, limit: 20 }, cb);
    };

    const onProductoChange = (id: any, value: string) => {
        const nid = Number(id);
        const prod = (products || []).find((p: any) => p.id === nid);
        setItemForm((f) => ({ ...f, productoId: nid, productoLabel: value, unidad: prod?.unidadMedida?.codigo || f.unidad }));
    };

    const agregarItem = () => {
        if (!itemForm.productoId || !itemForm.cantidad || !itemForm.precioFobUnitario) {
            alert('Complete producto, cantidad y precio FOB', 'error');
            return;
        }
        setItems((prev) => [...prev, itemForm]);
        setItemForm(INITIAL_ITEM_FORM);
    };

    const quitarItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

    const guardar = async () => {
        if (items.length === 0) {
            alert('La importación debe tener al menos un ítem', 'error');
            return;
        }
        setGuardando(true);
        try {
            const payload = {
                proveedorId: importacion.proveedorId,
                sedeId: importacion.sedeId || undefined,
                moneda: importacion.moneda,
                tipoCambio: Number(importacion.tipoCambio),
                incoterm: importacion.incoterm,
                numeroFactura: importacion.numeroFactura || undefined,
                numeroDua: importacion.numeroDua || undefined,
                descripcion: importacion.descripcion || undefined,
                fechaEmbarque: importacion.fechaEmbarque || undefined,
                fechaLlegada: importacion.fechaLlegada || undefined,
                observaciones: importacion.observaciones || undefined,
                items: items.map((it) => ({
                    productoId: it.productoId,
                    descripcion: it.descripcion || undefined,
                    cantidad: Number(it.cantidad),
                    unidad: it.unidad || 'UND',
                    precioFobUnitario: Number(it.precioFobUnitario),
                    pesoKg: it.pesoKg ? Number(it.pesoKg) : undefined,
                    volumenM3: it.volumenM3 ? Number(it.volumenM3) : undefined,
                    partidaArancelaria: it.partidaArancelaria || undefined,
                    adValoremPorcentaje: it.adValoremPorcentaje ? Number(it.adValoremPorcentaje) : undefined,
                })),
            };
            const resp = await put(`/importaciones/${importacion.id}`, payload);
            if (resp.success) {
                alert('Ítems actualizados', 'success');
                onSuccess();
            } else {
                alert(resp.error || 'No se pudo actualizar la importación', 'error');
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal isOpenModal={isOpen} closeModal={onClose} title="Editar ítems" width="900px" icon="solar:box-bold-duotone">
            <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                    <div className="md:col-span-2">
                        <Select
                            label="Producto"
                            name="producto"
                            options={productoOptions}
                            onChange={onProductoChange}
                            isSearch
                            handleGetData={handleProductoSearch}
                            withLabel
                            error={null}
                            placeholder="Buscar producto..."
                            value={itemForm.productoLabel || ''}
                        />
                    </div>
                    <InputPro isLabel name="cantidad" label="Cantidad" type="number" value={itemForm.cantidad} onChange={(e) => setItemForm((f) => ({ ...f, cantidad: e.target.value }))} />
                    <InputPro isLabel name="precioFobUnitario" label={`FOB unit. (${importacion.moneda})`} type="number" value={itemForm.precioFobUnitario} onChange={(e) => setItemForm((f) => ({ ...f, precioFobUnitario: e.target.value }))} />
                    <InputPro isLabel name="pesoKg" label="Peso Kg" type="number" value={itemForm.pesoKg} onChange={(e) => setItemForm((f) => ({ ...f, pesoKg: e.target.value }))} />
                    <InputPro isLabel name="adValoremPorcentaje" label="Ad valorem %" type="number" value={itemForm.adValoremPorcentaje} onChange={(e) => setItemForm((f) => ({ ...f, adValoremPorcentaje: e.target.value }))} />
                    <Button color="violet" onClick={agregarItem}><Icon icon="solar:add-circle-bold" width={18} /></Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                                <th className="py-2">Producto</th>
                                <th className="py-2 text-right">Cantidad</th>
                                <th className="py-2 text-right">FOB unit.</th>
                                <th className="py-2 text-right">Peso Kg</th>
                                <th className="py-2 text-right">Ad val. %</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it, idx) => (
                                <tr key={idx} className="border-b border-gray-100 dark:border-slate-800">
                                    <td className="py-2">{it.productoLabel}</td>
                                    <td className="py-2 text-right">{it.cantidad}</td>
                                    <td className="py-2 text-right">{it.precioFobUnitario}</td>
                                    <td className="py-2 text-right">{it.pesoKg || '-'}</td>
                                    <td className="py-2 text-right">{it.adValoremPorcentaje || '-'}</td>
                                    <td className="py-2 text-right">
                                        <button type="button" onClick={() => quitarItem(idx)} className="text-rose-500 hover:text-rose-600">
                                            <Icon icon="solar:trash-bin-trash-bold" width={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end gap-2">
                    <Button color="secondary" outline onClick={onClose}>Cancelar</Button>
                    <Button color="violet" isLoading={guardando} onClick={guardar}>Guardar cambios</Button>
                </div>
            </div>
        </Modal>
    );
}
