import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import moment from 'moment';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import { post } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useClientsStore } from '@/zustand/clients';
import { useProductsStore } from '@/zustand/products';
import { tipoCambioService } from '@/services/tipoCambio.service';
import { IImportacionItemForm, INITIAL_ITEM_FORM } from './ImportacionesModel';

interface ModalNuevaImportacionProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (id: number) => void;
}

const INCOTERM_OPTIONS = [
    { id: 'FOB', value: 'FOB' },
    { id: 'CIF', value: 'CIF' },
    { id: 'EXW', value: 'EXW' },
    { id: 'CFR', value: 'CFR' },
];

const MONEDA_OPTIONS = [
    { id: 'USD', value: 'USD - Dólares' },
    { id: 'PEN', value: 'PEN - Soles' },
];

export default function ModalNuevaImportacion({ isOpen, onClose, onSuccess }: ModalNuevaImportacionProps) {
    const { alert } = useAlertStore();
    const { getAllClients, clients, addClients } = useClientsStore();
    const { getAllProducts, products } = useProductsStore();

    const [proveedorOptions, setProveedorOptions] = useState<any[]>([]);
    const [proveedorId, setProveedorId] = useState<number>(0);
    const [proveedorDisplay, setProveedorDisplay] = useState('');
    const [showNuevoProveedor, setShowNuevoProveedor] = useState(false);
    const [nuevoProveedor, setNuevoProveedor] = useState({ nombre: '', nroDoc: '', direccion: '', email: '' });
    const [savingProveedor, setSavingProveedor] = useState(false);

    const [moneda, setMoneda] = useState('USD');
    const [tipoCambio, setTipoCambio] = useState('3.75');
    const [incoterm, setIncoterm] = useState('FOB');
    const [numeroFactura, setNumeroFactura] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [fechaEmbarque, setFechaEmbarque] = useState('');
    const [fechaLlegada, setFechaLlegada] = useState('');

    const [productoOptions, setProductoOptions] = useState<any[]>([]);
    const [items, setItems] = useState<IImportacionItemForm[]>([]);
    const [itemForm, setItemForm] = useState<IImportacionItemForm>(INITIAL_ITEM_FORM);

    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        // Reset al abrir
        setProveedorId(0);
        setProveedorDisplay('');
        setShowNuevoProveedor(false);
        setNuevoProveedor({ nombre: '', nroDoc: '', direccion: '', email: '' });
        setMoneda('USD');
        setIncoterm('FOB');
        setNumeroFactura('');
        setDescripcion('');
        setFechaEmbarque('');
        setFechaLlegada('');
        setItems([]);
        setItemForm(INITIAL_ITEM_FORM);
        tipoCambioService
            .consultar()
            .then((tc) => setTipoCambio(String(tc.venta || tc.compra || 3.75)))
            .catch(() => {});
    }, [isOpen]);

    useEffect(() => {
        setProveedorOptions((clients || []).map((c) => ({ id: c.id, value: `${c.nroDoc} - ${c.nombre}` })));
    }, [clients]);

    useEffect(() => {
        setProductoOptions((products || []).map((p: any) => ({
            id: p.id,
            value: `${p.codigo} - ${p.descripcion} (Stock: ${p.stock})`,
            data: p,
        })));
    }, [products]);

    const handleProveedorSearch = (query: string, cb: () => void) => {
        getAllClients({ search: query, persona: 'PROVEEDOR', limit: 20 }, cb);
    };

    const handleProductoSearch = (query: string, cb: () => void) => {
        getAllProducts({ search: query, limit: 20 }, cb);
    };

    const guardarNuevoProveedor = async () => {
        if (!nuevoProveedor.nombre.trim()) {
            alert('Ingrese la razón social / nombre del proveedor', 'error');
            return;
        }
        setSavingProveedor(true);
        try {
            const creado = await addClients({
                id: 0,
                nombre: nuevoProveedor.nombre.trim(),
                nroDoc: nuevoProveedor.nroDoc.trim() || '00000000000',
                tipoDoc: 'OTRO',
                direccion: nuevoProveedor.direccion.trim(),
                departamento: 'Lima',
                provincia: 'Lima',
                distrito: 'Lima',
                ubigeo: '150101',
                persona: 'PROVEEDOR',
                email: nuevoProveedor.email.trim(),
                telefono: '',
                estado: 'ACTIVO',
                tipoDocumentoId: 0,
                empresaId: 0,
                tipoDocumento: { codigo: '', descripcion: '', id: 0 },
            } as any);
            if (creado?.id) {
                setProveedorId(Number(creado.id));
                setProveedorDisplay(`${creado.nroDoc || ''} - ${creado.nombre}`.trim());
                setShowNuevoProveedor(false);
            }
        } finally {
            setSavingProveedor(false);
        }
    };

    const agregarItem = () => {
        if (!itemForm.productoId) {
            alert('Seleccione un producto', 'error');
            return;
        }
        if (!itemForm.cantidad || Number(itemForm.cantidad) <= 0) {
            alert('Ingrese una cantidad válida', 'error');
            return;
        }
        if (!itemForm.precioFobUnitario || Number(itemForm.precioFobUnitario) <= 0) {
            alert('Ingrese el precio FOB unitario', 'error');
            return;
        }
        setItems((prev) => [...prev, itemForm]);
        setItemForm(INITIAL_ITEM_FORM);
    };

    const quitarItem = (idx: number) => {
        setItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const totalFob = items.reduce((s, it) => s + Number(it.cantidad || 0) * Number(it.precioFobUnitario || 0), 0);

    const onProductoChange = (id: any, value: string) => {
        const nid = Number(id);
        const prod = (products || []).find((p: any) => p.id === nid);
        setItemForm((f) => ({
            ...f,
            productoId: nid,
            productoLabel: value,
            unidad: prod?.unidadMedida?.codigo || f.unidad,
        }));
    };

    const guardar = async () => {
        if (!proveedorId) {
            alert('Seleccione el proveedor extranjero', 'error');
            return;
        }
        if (items.length === 0) {
            alert('Agregue al menos un ítem a la importación', 'error');
            return;
        }
        setGuardando(true);
        try {
            const payload = {
                proveedorId,
                moneda,
                tipoCambio: Number(tipoCambio),
                incoterm,
                numeroFactura: numeroFactura || undefined,
                descripcion: descripcion || undefined,
                fechaEmbarque: fechaEmbarque || undefined,
                fechaLlegada: fechaLlegada || undefined,
                items: items.map((it) => ({
                    productoId: it.productoId,
                    cantidad: Number(it.cantidad),
                    unidad: it.unidad || 'UND',
                    precioFobUnitario: Number(it.precioFobUnitario),
                    pesoKg: it.pesoKg ? Number(it.pesoKg) : undefined,
                    volumenM3: it.volumenM3 ? Number(it.volumenM3) : undefined,
                    partidaArancelaria: it.partidaArancelaria || undefined,
                    adValoremPorcentaje: it.adValoremPorcentaje ? Number(it.adValoremPorcentaje) : undefined,
                })),
            };
            const resp = await post<any>('/importaciones', payload);
            if (resp.success) {
                alert('Importación creada correctamente', 'success');
                onSuccess((resp.data as any)?.id);
            } else {
                alert(resp.error || 'No se pudo crear la importación', 'error');
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal isOpenModal={isOpen} closeModal={onClose} title="Nueva importación" width="900px" icon="solar:box-bold-duotone">
            <div className="p-5 space-y-5">
                {/* Proveedor */}
                <div className="space-y-2">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Select
                                label="Proveedor extranjero"
                                name="proveedor"
                                options={proveedorOptions}
                                onChange={(id, value) => { setProveedorId(Number(id)); setProveedorDisplay(value); }}
                                isSearch
                                handleGetData={handleProveedorSearch}
                                withLabel
                                error={null}
                                placeholder="Buscar proveedor..."
                                value={proveedorDisplay || proveedorOptions.find((o) => Number(o.id) === proveedorId)?.value || ''}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowNuevoProveedor((v) => !v)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-[42px] rounded-xl border text-xs font-semibold transition-all ${showNuevoProveedor ? 'bg-violet-600 text-white border-violet-600' : 'bg-white dark:bg-slate-800 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20'}`}
                        >
                            <Icon icon={showNuevoProveedor ? 'solar:close-circle-bold' : 'solar:add-circle-bold'} width={16} />
                            {showNuevoProveedor ? 'Cancelar' : 'Nuevo'}
                        </button>
                    </div>

                    {showNuevoProveedor && (
                        <div className="p-4 rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-900/10 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <InputPro isLabel name="nombre" label="Razón social" value={nuevoProveedor.nombre} onChange={(e) => setNuevoProveedor((p) => ({ ...p, nombre: e.target.value }))} />
                            <InputPro isLabel name="nroDoc" label="N° documento (Tax ID)" value={nuevoProveedor.nroDoc} onChange={(e) => setNuevoProveedor((p) => ({ ...p, nroDoc: e.target.value }))} />
                            <InputPro isLabel name="direccion" label="Dirección" value={nuevoProveedor.direccion} onChange={(e) => setNuevoProveedor((p) => ({ ...p, direccion: e.target.value }))} />
                            <InputPro isLabel name="email" label="Email" value={nuevoProveedor.email} onChange={(e) => setNuevoProveedor((p) => ({ ...p, email: e.target.value }))} />
                            <div className="md:col-span-2">
                                <Button color="violet" isLoading={savingProveedor} onClick={guardarNuevoProveedor}>Guardar proveedor</Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Datos comerciales */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Select label="Moneda" name="moneda" options={MONEDA_OPTIONS} value={MONEDA_OPTIONS.find((o) => o.id === moneda)?.value} onChange={(id) => setMoneda(String(id))} error={null} />
                    <InputPro isLabel name="tipoCambio" label="Tipo de cambio" type="number" value={tipoCambio} onChange={(e) => setTipoCambio(e.target.value)} />
                    <Select label="Incoterm" name="incoterm" options={INCOTERM_OPTIONS} value={incoterm} onChange={(id) => setIncoterm(String(id))} error={null} />
                    <InputPro isLabel name="numeroFactura" label="N° factura proveedor" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                        <Calendar name="fechaEmbarque" text="Fecha de embarque" value={fechaEmbarque ? moment(fechaEmbarque).format('DD/MM/YYYY') : ''} onChange={(date) => setFechaEmbarque(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'))} isLabel />
                    </div>
                    <div className="md:col-span-1">
                        <Calendar name="fechaLlegada" text="Fecha de llegada" value={fechaLlegada ? moment(fechaLlegada).format('DD/MM/YYYY') : ''} onChange={(date) => setFechaLlegada(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'))} isLabel />
                    </div>
                    <InputPro isLabel name="descripcion" label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                </div>

                {/* Ítems */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 uppercase tracking-wide">Ítems importados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end mb-3">
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
                        <InputPro isLabel name="precioFobUnitario" label={`FOB unit. (${moneda})`} type="number" value={itemForm.precioFobUnitario} onChange={(e) => setItemForm((f) => ({ ...f, precioFobUnitario: e.target.value }))} />
                        <InputPro isLabel name="pesoKg" label="Peso Kg" type="number" value={itemForm.pesoKg} onChange={(e) => setItemForm((f) => ({ ...f, pesoKg: e.target.value }))} />
                        <Button color="violet" onClick={agregarItem}>
                            <Icon icon="solar:add-circle-bold" width={18} /> Agregar
                        </Button>
                    </div>

                    {items.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                                        <th className="py-2">Producto</th>
                                        <th className="py-2 text-right">Cantidad</th>
                                        <th className="py-2 text-right">FOB unit.</th>
                                        <th className="py-2 text-right">Peso Kg</th>
                                        <th className="py-2 text-right">Subtotal FOB</th>
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
                                            <td className="py-2 text-right">{(Number(it.cantidad) * Number(it.precioFobUnitario)).toFixed(2)}</td>
                                            <td className="py-2 text-right">
                                                <button type="button" onClick={() => quitarItem(idx)} className="text-rose-500 hover:text-rose-600">
                                                    <Icon icon="solar:trash-bin-trash-bold" width={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={4} className="py-2 text-right font-semibold">Total FOB</td>
                                        <td className="py-2 text-right font-bold">{moneda} {totalFob.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button color="secondary" outline onClick={onClose}>Cancelar</Button>
                    <Button color="violet" isLoading={guardando} onClick={guardar}>Crear importación</Button>
                </div>
            </div>
        </Modal>
    );
}
