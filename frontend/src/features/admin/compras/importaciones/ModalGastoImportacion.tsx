import { useEffect, useState } from 'react';
import moment from 'moment';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import { Calendar } from '@/components/Date';
import { post, put } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import {
    BASE_PRORRATEO_OPTIONS,
    IImportacionGasto,
    TIPO_GASTO_OPTIONS,
    TIPOS_NO_CAPITALIZAN,
    TipoGastoImportacion,
} from './ImportacionesModel';

interface ModalGastoImportacionProps {
    isOpen: boolean;
    importacionId: number;
    moneda: string;
    tipoCambio: number;
    gasto?: IImportacionGasto | null;
    onClose: () => void;
    onSuccess: () => void;
}

const MONEDA_GASTO_OPTIONS = [
    { id: 'PEN', value: 'PEN - Soles' },
    { id: 'USD', value: 'USD - Dólares' },
];

export default function ModalGastoImportacion({
    isOpen, importacionId, moneda: monedaImportacion, tipoCambio: tcImportacion, gasto, onClose, onSuccess,
}: ModalGastoImportacionProps) {
    const { alert } = useAlertStore();
    const isEdit = !!gasto?.id;

    const [tipo, setTipo] = useState<TipoGastoImportacion>('FLETE_INTERNACIONAL');
    const [descripcion, setDescripcion] = useState('');
    const [proveedorNombre, setProveedorNombre] = useState('');
    const [numeroDocumento, setNumeroDocumento] = useState('');
    const [fecha, setFecha] = useState('');
    const [moneda, setMoneda] = useState('PEN');
    const [tipoCambio, setTipoCambio] = useState(String(tcImportacion || 1));
    const [monto, setMonto] = useState('');
    const [afectaCosto, setAfectaCosto] = useState(true);
    const [baseProrrateo, setBaseProrrateo] = useState('VALOR');
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        if (gasto) {
            setTipo(gasto.tipo);
            setDescripcion(gasto.descripcion || '');
            setProveedorNombre(gasto.proveedorNombre || '');
            setNumeroDocumento(gasto.numeroDocumento || '');
            setFecha(gasto.fecha ? moment(gasto.fecha).format('YYYY-MM-DD') : '');
            setMoneda(gasto.moneda || 'PEN');
            setTipoCambio(String(gasto.tipoCambio || 1));
            setMonto(String(gasto.monto ?? ''));
            setAfectaCosto(!!gasto.afectaCosto);
            setBaseProrrateo(gasto.baseProrrateo || 'VALOR');
        } else {
            setTipo('FLETE_INTERNACIONAL');
            setDescripcion('');
            setProveedorNombre('');
            setNumeroDocumento('');
            setFecha(moment().format('YYYY-MM-DD'));
            setMoneda('PEN');
            setTipoCambio(monedaImportacion === 'PEN' ? '1' : String(tcImportacion || 1));
            setMonto('');
            setAfectaCosto(!TIPOS_NO_CAPITALIZAN.includes('FLETE_INTERNACIONAL'));
            setBaseProrrateo(tipo === 'FLETE_INTERNACIONAL' ? 'PESO' : 'VALOR');
        }
    }, [isOpen, gasto]); // eslint-disable-line react-hooks/exhaustive-deps

    const onTipoChange = (id: any) => {
        const nuevoTipo = String(id) as TipoGastoImportacion;
        setTipo(nuevoTipo);
        if (!isEdit) {
            setAfectaCosto(!TIPOS_NO_CAPITALIZAN.includes(nuevoTipo));
            setBaseProrrateo(nuevoTipo === 'FLETE_INTERNACIONAL' || nuevoTipo === 'SEGURO' ? 'PESO' : 'VALOR');
        }
    };

    const guardar = async () => {
        if (!monto || Number(monto) <= 0) {
            alert('Ingrese un monto válido', 'error');
            return;
        }
        setGuardando(true);
        try {
            const payload = {
                tipo,
                descripcion: descripcion || undefined,
                proveedorNombre: proveedorNombre || undefined,
                numeroDocumento: numeroDocumento || undefined,
                fecha: fecha || undefined,
                moneda,
                tipoCambio: Number(tipoCambio),
                monto: Number(monto),
                afectaCosto,
                baseProrrateo,
            };
            const resp = isEdit
                ? await put(`/importaciones/${importacionId}/gastos/${gasto!.id}`, payload)
                : await post(`/importaciones/${importacionId}/gastos`, payload);
            if (resp.success) {
                alert(isEdit ? 'Gasto actualizado' : 'Gasto agregado', 'success');
                onSuccess();
            } else {
                alert(resp.error || 'No se pudo guardar el gasto', 'error');
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal isOpenModal={isOpen} closeModal={onClose} title={isEdit ? 'Editar gasto' : 'Agregar gasto'} width="600px" icon="solar:bill-list-bold-duotone">
            <div className="p-5 space-y-4">
                <Select
                    label="Tipo de gasto"
                    name="tipoGasto"
                    options={TIPO_GASTO_OPTIONS.map((o) => ({ id: o.value, value: o.label }))}
                    value={TIPO_GASTO_OPTIONS.find((o) => o.value === tipo)?.label}
                    onChange={onTipoChange}
                    error={null}
                />
                <div className="grid grid-cols-2 gap-3">
                    <InputPro isLabel name="proveedorNombre" label="Proveedor / entidad" value={proveedorNombre} onChange={(e) => setProveedorNombre(e.target.value)} />
                    <InputPro isLabel name="numeroDocumento" label="N° documento" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} />
                </div>
                <InputPro isLabel name="descripcion" label="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
                <div className="grid grid-cols-3 gap-3">
                    <Select
                        label="Moneda"
                        name="monedaGasto"
                        options={MONEDA_GASTO_OPTIONS}
                        value={MONEDA_GASTO_OPTIONS.find((o) => o.id === moneda)?.value}
                        onChange={(id) => setMoneda(String(id))}
                        error={null}
                    />
                    <InputPro isLabel name="tipoCambioGasto" label="Tipo cambio" type="number" value={tipoCambio} disabled={moneda === 'PEN'} onChange={(e) => setTipoCambio(e.target.value)} />
                    <InputPro isLabel name="monto" label={`Monto (${moneda})`} type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                    <Calendar name="fechaGasto" text="Fecha" value={fecha ? moment(fecha).format('DD/MM/YYYY') : ''} onChange={(date) => setFecha(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'))} isLabel />
                    <Select
                        label="Base de prorrateo"
                        name="baseProrrateo"
                        options={BASE_PRORRATEO_OPTIONS.map((o) => ({ id: o.value, value: o.label }))}
                        value={BASE_PRORRATEO_OPTIONS.find((o) => o.value === baseProrrateo)?.label}
                        onChange={(id) => setBaseProrrateo(String(id))}
                        error={null}
                    />
                </div>
                <button
                    type="button"
                    onClick={() => setAfectaCosto((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${afectaCosto ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-900/20 dark:border-emerald-700' : 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700'}`}
                >
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Capitaliza al costo del producto</span>
                    <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${afectaCosto ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${afectaCosto ? 'translate-x-6' : 'translate-x-1'}`} />
                    </span>
                </button>
                {!afectaCosto && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 -mt-2">
                        No capitaliza: se trata como crédito fiscal (IGV / percepción), no forma parte del costo nacionalizado.
                    </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <Button color="secondary" outline onClick={onClose}>Cancelar</Button>
                    <Button color="violet" isLoading={guardando} onClick={guardar}>{isEdit ? 'Guardar cambios' : 'Agregar gasto'}</Button>
                </div>
            </div>
        </Modal>
    );
}
