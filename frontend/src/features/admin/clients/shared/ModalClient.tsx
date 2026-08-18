import { ChangeEvent, Dispatch, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import Select from '@/components/Select';
import { IFormClient } from '@/interfaces/clients';
import { useClientsStore } from '@/zustand/clients';
import InputPro from '@/components/InputPro';
import SelectUbigeo from '@/components/Select/SelectUbigeo';
import { useExtentionsStore } from '@/zustand/extentions';
import Button from '@/components/Button';
import { get, put } from '@/utils/fetch';

// Dirección/sede adicional de un cliente (empresas con varias sucursales).
interface IDireccion {
  id?: number;
  alias?: string;
  direccion: string;
  distrito?: string;
  referencia?: string;
  esPrincipal?: boolean;
}

interface IProps {
    isOpenModal: boolean;
    closeModal: () => void;
    isEdit: boolean;
    setIsOpenModal: Dispatch<boolean>;
    formValues: IFormClient;
    setFormValues: (values: any) => void;
    errors: any;
    setErrors: (errors: any) => void;
    grupoFarmacia?: 'pacientes' | 'empresas' | 'medicos';
    /** Se invoca con el cliente recién creado (para auto-seleccionarlo en facturación). */
    onCreated?: (client: any) => void;
}

const persons = [
    { id: 'CLIENTE', value: 'CLIENTE' },
    { id: 'PROVEEDOR', value: 'PROVEEDOR' },
    { id: 'CLIENTE_PROVEEDOR', value: 'CLIENTE-PROVEEDOR' },
];

const DOC_TYPES = [
    { key: 'DNI', label: 'DNI', digits: 8, hint: 'Ingresa 8 dígitos para consultar automáticamente' },
    { key: 'RUC', label: 'RUC', digits: 11, hint: 'Ingresa 11 dígitos para consultar RUC automáticamente' },
    { key: 'CE', label: 'C.E.', digits: null, hint: 'Carnet de Extranjería: se registra manualmente, sin consulta automática' },
    { key: 'PASAPORTE', label: 'Pasaporte', digits: null, hint: null },
    { key: 'OTRO', label: 'Otro', digits: null, hint: 'Sin documento: puedes dejarlo vacío. Para boletas a consumidor final sin RUC/DNI (p. ej. un colegio), hasta S/ 700.' },
];

const normalizeDoc = (tipoDoc: string, value: string) => {
    const raw = String(value || '').trim().toUpperCase();
    if (tipoDoc === 'DNI' || tipoDoc === 'RUC') return raw.replace(/\D/g, '');
    if (tipoDoc === 'CE' || tipoDoc === 'PASAPORTE') {
        return raw
            .replace(/^(NRO\.?|NO\.?|NUMERO|NÚMERO|N\.?[°º]?)\s*/i, '')
            .replace(/[^A-Z0-9]/g, '');
    }
    return raw;
};

export default function ModalClient({
    isOpenModal,
    closeModal,
    setIsOpenModal,
    isEdit,
    formValues,
    setFormValues,
    errors,
    setErrors,
    grupoFarmacia,
    onCreated,
}: IProps) {
    const { editClients, addClients, getClientFromDoc } = useClientsStore();
    const { ubigeos, getUbigeos } = useExtentionsStore();

    // Direcciones/sedes adicionales del cliente.
    const [direcciones, setDirecciones] = useState<IDireccion[]>([]);
    useEffect(() => {
        if (!isOpenModal) return;
        const cid = Number(formValues?.id);
        if (isEdit && cid > 0) {
            get<IDireccion[]>(`clientes/${cid}/direcciones`)
                .then((r) => setDirecciones((r?.data as any) ?? []))
                .catch(() => setDirecciones([]));
        } else {
            setDirecciones([]);
        }
    }, [isOpenModal, isEdit, formValues?.id]);

    const addDireccion = () => setDirecciones((d) => [...d, { direccion: '', alias: '', esPrincipal: d.length === 0 }]);
    const updateDireccion = (i: number, campo: keyof IDireccion, valor: any) =>
        setDirecciones((d) => d.map((x, idx) => (idx === i ? { ...x, [campo]: valor } : x)));
    const removeDireccion = (i: number) => setDirecciones((d) => d.filter((_, idx) => idx !== i));
    const setPrincipal = (i: number) => setDirecciones((d) => d.map((x, idx) => ({ ...x, esPrincipal: idx === i })));

    const guardarDirecciones = async (clienteId: number) => {
        const validas = direcciones.filter((d) => d.direccion?.trim());
        if (validas.length === 0 && !isEdit) return; // nada que guardar en creación
        try {
            await put(`clientes/${clienteId}/direcciones/sincronizar`, { direcciones: validas });
        } catch { /* no bloquear el guardado del cliente por esto */ }
    };

    const modalTitle = isEdit
        ? grupoFarmacia === 'pacientes' ? 'Editar Paciente'
        : grupoFarmacia === 'empresas'  ? 'Editar Empresa'
        : 'Editar Cliente'
        : grupoFarmacia === 'pacientes' ? 'Nuevo Paciente'
        : grupoFarmacia === 'empresas'  ? 'Nueva Empresa'
        : 'Nuevo Cliente';

    const grupoBadge = grupoFarmacia === 'pacientes'
        ? { label: 'Paciente', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: '👤' }
        : grupoFarmacia === 'empresas'
        ? { label: 'Empresa farmacéutica', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: '🏢' }
        : null;

    useEffect(() => {
        getUbigeos();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const activeTipoDoc = formValues?.tipoDoc || 'DNI';
    const activeDocType = DOC_TYPES.find(d => d.key === activeTipoDoc) ?? DOC_TYPES[0];

    const handleTipoDocChange = (key: string) => {
        setFormValues({ ...formValues, tipoDoc: key, nroDoc: '' });
        setErrors({ ...errors, nroDoc: '' });
    };

    const handleChange = async (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const updatedFormValues = { ...formValues, [name]: value };
        setFormValues(updatedFormValues);

        if (name === 'nroDoc') {
            const clean = normalizeDoc(activeTipoDoc, value);
            const shouldLookup =
                (activeTipoDoc === 'DNI' && clean.length === 8) ||
                (activeTipoDoc === 'RUC' && clean.length === 11);

            if (shouldLookup) {
                const result = await getClientFromDoc(clean, activeTipoDoc);
                if (result) {
                    setFormValues({
                        ...updatedFormValues,
                        departamento: result.departamento || '',
                        distrito: result.distrito || '',
                        provincia: result.provincia || '',
                        ubigeo: result.ubigeo_sunat || '',
                        nombre: result.nombre_completo || result.nombre_o_razon_social || '',
                        direccion: result.direccion || result.direccion_completa || '',
                    });
                }
            }
        }
    };

    const validateForm = () => {
        const doc = normalizeDoc(activeTipoDoc, formValues?.nroDoc || '');
        let nroDocError = '';

        // "Otro" = consumidor final sin documento (p. ej. un colegio sin RUC).
        // No se exige número: la boleta saldrá con tipo doc "0" y número "0",
        // conservando el nombre. SUNAT lo admite en boletas hasta S/ 700.
        if (activeTipoDoc === 'OTRO') {
            nroDocError = '';
        } else if (!doc) {
            nroDocError = 'El número de documento es obligatorio';
        } else if (activeTipoDoc === 'DNI') {
            nroDocError = /^\d{8}$/.test(doc) ? '' : 'El DNI debe contener exactamente 8 dígitos numéricos';
        } else if (activeTipoDoc === 'RUC') {
            nroDocError = /^(10|15|16|17|20)\d{9}$/.test(doc) ? '' : 'El RUC debe contener 11 dígitos y comenzar con 10, 15, 16, 17 o 20';
        } else if (activeTipoDoc === 'CE') {
            nroDocError = /^[A-Za-z0-9]{6,12}$/.test(doc) ? '' : 'El Carnet de Extranjería debe contener entre 6 y 12 caracteres alfanuméricos';
        } else if (activeTipoDoc === 'PASAPORTE') {
            nroDocError = /^[A-Za-z0-9]{6,12}$/.test(doc) ? '' : 'El pasaporte debe contener entre 6 y 12 caracteres alfanuméricos';
        }

        const newErrors: any = {
            nombre: formValues?.nombre?.trim() ? '' : 'La Razón social o nombre del cliente es obligatorio',
            nroDoc: nroDocError,
        };
        setErrors(newErrors);
        return Object.values(newErrors).every((e) => !e);
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        const normalizedDoc = normalizeDoc(activeTipoDoc, formValues?.nroDoc || '');
        // "Otro" sin número → placeholder "0" (el backend lo trata como sin documento).
        const finalDoc = activeTipoDoc === 'OTRO' && !normalizedDoc ? '0' : normalizedDoc;
        const payload = { ...formValues, nroDoc: finalDoc, tipoDoc: activeTipoDoc };

        if (Number(formValues?.id) !== 0 && isEdit) {
            editClients(payload);
            await guardarDirecciones(Number(formValues.id));
            closeModal();
        } else {
            const created = await addClients({ ...payload, estado: 'ACTIVO' });
            const nuevoId = Number((created as any)?.id ?? (created as any)?.data?.id);
            if (nuevoId > 0) await guardarDirecciones(nuevoId);
            closeModal();
            if (created) onCreated?.({ ...payload, ...created });
        }
    };

    const handleChangeSelect = (idValue: any, value: any, name: any, id: any) => {
        setFormValues({ ...formValues, [name]: value, [id]: idValue });
    };

    const inputPlaceholder = activeDocType.key === 'DNI' ? 'Nro. de DNI'
        : activeDocType.key === 'RUC' ? 'Nro. de RUC'
            : activeDocType.key === 'CE' ? 'Nro. de Carnet de Extranjería'
                : activeDocType.key === 'PASAPORTE' ? 'Nro. de Pasaporte'
                    : 'Nro. de documento (opcional)';

    // Filtrar tipos de documento según el grupo
    const visibleDocTypes = grupoFarmacia === 'empresas'
        ? DOC_TYPES.filter(d => d.key === 'RUC' || d.key === 'OTRO')
        : grupoFarmacia === 'pacientes'
        ? DOC_TYPES.filter(d => d.key !== 'RUC')
        : DOC_TYPES;

    return (
        <div>
            {isOpenModal && (
                <Modal width="600px" height="auto" position="right" isOpenModal={isOpenModal} closeModal={closeModal} title={modalTitle}>

                    {/* Banner de tipo — solo en modo farmacia */}
                    {grupoBadge && (
                        <div className={`mx-4 mt-4 flex items-center gap-2.5 rounded-xl px-4 py-2.5 sm:mx-6 ${grupoBadge.color}`}>
                            <span className="text-base">{grupoBadge.icon}</span>
                            <div>
                                <p className="text-xs font-bold">{grupoBadge.label}</p>
                                <p className="text-xs opacity-75">Tipo asignado según el grupo seleccionado</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-5 space-y-4 px-4 pb-2 sm:px-6">

                        {/* Fila 1: Tipo de documento (botones) */}
                        <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 tracking-wide mb-2">N° de Documento</p>
                            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
                                {visibleDocTypes.map((dt) => (
                                    <button
                                        key={dt.key}
                                        type="button"
                                        onClick={() => handleTipoDocChange(dt.key)}
                                        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${activeTipoDoc === dt.key
                                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                                            : 'bg-white dark:bg-transparent text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-gray-500'
                                        }`}
                                    >
                                        {dt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Fila 2: Nro. documento + Nombre (misma fila) */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <InputPro
                                    autocomplete="off"
                                    error={errors.nroDoc}
                                    value={formValues?.nroDoc}
                                    name="nroDoc"
                                    onChange={handleChange}
                                    isLabel
                                    label={inputPlaceholder}
                                />
                                {activeDocType.hint && (
                                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                        <span className="inline-block w-3.5 h-3.5 rounded-full border border-gray-400 text-center leading-3 text-[10px]">i</span>
                                        {activeDocType.hint}
                                    </p>
                                )}
                            </div>
                            <div>
                                <InputPro autocomplete="off" value={formValues?.nombre} error={errors.nombre} name="nombre" onChange={handleChange} isLabel label="Nombre o Razón social" />
                            </div>
                        </div>

                        {/* Selector persona — solo si no hay grupo farmacia fijo */}
                        {!grupoBadge && (
                            <Select defaultValue={formValues?.persona} error={''} isSearch options={persons} id="persona" name="personaName" value="" onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Persona" />
                        )}

                        {/* Dirección */}
                        <InputPro autocomplete="off" error={errors.direccion} value={formValues?.direccion} name="direccion" onChange={handleChange} isLabel label="Dirección" />

                        {/* Correo + Celular */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <InputPro autocomplete="off" value={formValues?.email} error={errors.email} name="email" onChange={handleChange} isLabel label="Correo principal" />
                            <InputPro autocomplete="off" value={formValues?.telefono} error={errors.telefono} name="telefono" onChange={handleChange} isLabel label="Celular" />
                        </div>

                        {/* Ubigeo */}
                        <SelectUbigeo
                            value={formValues?.departamento ? `${formValues?.departamento}/${formValues?.provincia}/${formValues?.distrito}` : ''}
                            isSearch
                            options={ubigeos}
                            name="nombreUbigeo"
                            id="ubigeo"
                            onChange={handleChangeSelect}
                            label="Seleccionar ubigeo"
                        />

                        {/* Direcciones adicionales / sedes del cliente */}
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3.5">
                            <div className="flex items-center justify-between mb-1">
                                <div>
                                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <Icon icon="solar:map-point-bold-duotone" width={16} className="text-[var(--accent)]" />
                                        Sedes / direcciones de entrega
                                    </p>
                                    <p className="text-[11px] text-slate-400">Para clientes con varias sucursales (se usan en la guía de remisión).</p>
                                </div>
                                <button type="button" onClick={addDireccion} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10 transition">
                                    <Icon icon="solar:add-circle-bold" width={15} /> Agregar
                                </button>
                            </div>

                            {direcciones.length === 0 ? (
                                <p className="text-[12px] text-slate-400 py-2 text-center">Sin sedes adicionales. Usa “Agregar” para registrar sucursales.</p>
                            ) : (
                                <div className="space-y-2.5 mt-2">
                                    {direcciones.map((d, i) => (
                                        <div key={i} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-2.5 space-y-2">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                <input value={d.alias || ''} onChange={(e) => updateDireccion(i, 'alias', e.target.value)} placeholder="Alias (ej. Almacén Norte)" className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-[13px] outline-none focus:border-[var(--accent)]" />
                                                <input value={d.distrito || ''} onChange={(e) => updateDireccion(i, 'distrito', e.target.value)} placeholder="Distrito" className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-[13px] outline-none focus:border-[var(--accent)]" />
                                            </div>
                                            <input value={d.direccion} onChange={(e) => updateDireccion(i, 'direccion', e.target.value)} placeholder="Dirección *" className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-[13px] outline-none focus:border-[var(--accent)]" />
                                            <div className="flex items-center justify-between">
                                                <label className="flex items-center gap-1.5 text-[12px] text-slate-500 cursor-pointer select-none">
                                                    <input type="radio" name="dirPrincipal" checked={!!d.esPrincipal} onChange={() => setPrincipal(i)} className="accent-[var(--accent)]" />
                                                    Principal
                                                </label>
                                                <button type="button" onClick={() => removeDireccion(i)} className="inline-flex items-center gap-1 text-[12px] text-rose-500 hover:text-rose-600">
                                                    <Icon icon="solar:trash-bin-trash-linear" width={14} /> Quitar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Persona de contacto — se muestra en el bloque "DATOS DE CONTACTO" de la cotización */}
                        {!grupoBadge && (
                            <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">
                                    Persona de contacto <span className="normal-case font-normal text-gray-400">(opcional — aparece en la cotización)</span>
                                </p>
                                <div className="space-y-4">
                                    <InputPro autocomplete="off" value={(formValues as any)?.contactoNombre ?? ''} name="contactoNombre" onChange={handleChange} isLabel label="Nombres y apellidos del contacto" />
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <InputPro autocomplete="off" value={(formValues as any)?.contactoEmail ?? ''} name="contactoEmail" onChange={handleChange} isLabel label="Email del contacto" />
                                        <InputPro autocomplete="off" value={(formValues as any)?.contactoTelefono ?? ''} name="contactoTelefono" onChange={handleChange} isLabel label="Teléfono del contacto" />
                                    </div>
                                    <InputPro autocomplete="off" value={(formValues as any)?.contactoDireccion ?? ''} name="contactoDireccion" onChange={handleChange} isLabel label="Dirección del contacto" />
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col-reverse gap-3 px-4 pb-5 pt-6 sm:flex-row sm:justify-end sm:px-6">
                        <Button color="gray" className="w-full sm:w-auto" onClick={() => setIsOpenModal(false)}>Cancelar</Button>
                        <Button color="secondary" className="w-full sm:w-auto" onClick={handleSubmit}>{isEdit ? 'Editar' : 'Guardar'}</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
