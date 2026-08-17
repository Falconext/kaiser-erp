import { Icon } from "@iconify/react";
import moment from "moment";
import Modal from "@/components/Modal";
import InputPro from "@/components/InputPro";
import Select from "@/components/Select";
import Button from "@/components/Button";
import { Calendar } from "@/components/Date";

interface AnticipoForm {
    tipoDoc: string;
    serie: string;
    numero: string;
    monto: string;
    fecha: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    form: AnticipoForm;
    setForm: (updater: (p: AnticipoForm) => AnticipoForm) => void;
    onAdd: () => void;
    anticipos: any[];
    totalAnticipos: number;
    currencySymbol: string;
    onRemove: (index: number) => void;
}

export default function ModalAnticipos({
    isOpen, onClose, form, setForm, onAdd, anticipos, totalAnticipos, currencySymbol, onRemove,
}: Props) {
    const puedeAgregar = form.serie.trim() !== "" && form.numero.trim() !== "" && Number(form.monto) > 0;

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title="Anticipos a descontar"
            icon="solar:hand-money-bold-duotone"
            iconClass="text-indigo-500"
            width="620px"
            height="auto"
        >
            <div className="p-5 space-y-5">
                {/* Explicación en lenguaje claro */}
                <div className="flex gap-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-950/20 p-4">
                    <Icon icon="solar:info-circle-bold" className="text-indigo-500 text-xl shrink-0 mt-0.5" />
                    <p className="text-[13px] leading-relaxed text-indigo-800 dark:text-indigo-200/90">
                        ¿Tu cliente ya te dio un <b>adelanto</b> con una factura o boleta de anticipo?
                        Regístralo aquí y se <b>restará</b> del total de esta factura: tu cliente solo
                        pagará el <b>saldo pendiente</b>. La moneda del anticipo debe ser la misma que la de la factura.
                    </p>
                </div>

                {/* Formulario para agregar un anticipo — componentes del proyecto */}
                <div className="rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        <div className="col-span-2">
                            <Select
                                label="Tipo de anticipo"
                                name="tipoDoc"
                                options={[
                                    { id: "01", value: "Factura de anticipo" },
                                    { id: "03", value: "Boleta de anticipo" },
                                ]}
                                onChange={(id: any) => setForm((p) => ({ ...p, tipoDoc: String(id) }))}
                                value={form.tipoDoc === "03" ? "Boleta de anticipo" : "Factura de anticipo"}
                                withLabel
                                error={null}
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <InputPro
                                autocomplete="off"
                                label="Serie"
                                name="serieAnticipo"
                                value={form.serie}
                                onChange={(e: any) => setForm((p) => ({ ...p, serie: e.target.value.toUpperCase() }))}
                                isLabel
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                            <InputPro
                                autocomplete="off"
                                label="Número"
                                name="numeroAnticipo"
                                value={form.numero}
                                onChange={(e: any) => setForm((p) => ({ ...p, numero: e.target.value }))}
                                isLabel
                            />
                        </div>
                        <div className="col-span-1 md:col-span-3">
                            <InputPro
                                autocomplete="off"
                                type="number"
                                label={`Monto del adelanto (${currencySymbol})`}
                                name="montoAnticipo"
                                value={form.monto}
                                onChange={(e: any) => setForm((p) => ({ ...p, monto: e.target.value }))}
                                isLabel
                            />
                        </div>
                        <div className="col-span-1 md:col-span-3">
                            <Calendar
                                portal
                                text="Fecha del adelanto (opcional)"
                                name="fechaAnticipo"
                                value={form.fecha ? moment(form.fecha).format("DD/MM/YYYY") : ""}
                                onChange={(date: string) => {
                                    if (moment(date, "DD/MM/YYYY", true).isValid()) {
                                        setForm((p) => ({ ...p, fecha: moment(date, "DD/MM/YYYY").format("YYYY-MM-DD") }));
                                    } else if (!date) {
                                        setForm((p) => ({ ...p, fecha: "" }));
                                    }
                                }}
                            />
                        </div>
                    </div>
                    <div className="mt-4">
                        <Button color="primary" onClick={onAdd} disabled={!puedeAgregar}>
                            <span className="flex items-center justify-center gap-2">
                                <Icon icon="solar:add-circle-bold" className="text-lg" />
                                Agregar adelanto
                            </span>
                        </Button>
                    </div>
                </div>

                {/* Lista de anticipos agregados */}
                {anticipos?.length > 0 ? (
                    <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                            Adelantos registrados
                        </p>
                        {anticipos.map((a: any, i: number) => (
                            <div
                                key={`${a.serie}-${a.numero}-${i}`}
                                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                                        <Icon icon="solar:bill-list-bold-duotone" className="text-indigo-500 text-lg" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 dark:text-slate-100 truncate">
                                            {a.tipoDoc === "03" ? "Boleta" : "Factura"} {a.serie}-{a.numero}
                                        </p>
                                        {a.fecha ? <p className="text-xs text-gray-400">{a.fecha}</p> : null}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                        {currencySymbol} {Number(a.monto).toFixed(2)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onRemove(i)}
                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                        title="Quitar adelanto"
                                    >
                                        <Icon icon="solar:trash-bin-trash-bold" className="text-base" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-sm text-gray-400 dark:text-slate-500">
                        <Icon icon="solar:hand-money-linear" className="text-3xl mx-auto mb-2 opacity-60" />
                        Aún no agregaste ningún adelanto.
                    </div>
                )}

                {/* Total */}
                {anticipos?.length > 0 && (
                    <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-4 text-white shadow-lg shadow-indigo-500/20">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-50/80">Total a descontar</p>
                            <p className="text-[11px] text-indigo-50/70">Se restará del total de la factura</p>
                        </div>
                        <span className="text-2xl font-black">{currencySymbol} {Number(totalAnticipos || 0).toFixed(2)}</span>
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-end gap-2 pt-1">
                    <Button color="secondary" onClick={onClose}>Listo</Button>
                </div>
            </div>
        </Modal>
    );
}
