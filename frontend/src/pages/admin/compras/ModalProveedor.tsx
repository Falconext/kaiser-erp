import { ChangeEvent, Dispatch, useEffect } from 'react';
import Modal from '@/components/Modal';
import { IFormClient } from '@/interfaces/clients';
import { useClientsStore } from '@/zustand/clients';
import InputPro from '@/components/InputPro';
import SelectUbigeo from '@/components/Select/SelectUbigeo';
import { useExtentionsStore } from '@/zustand/extentions';
import Button from '@/components/Button';

interface IProps {
    isOpenModal: boolean;
    closeModal: () => void;
    isEdit: boolean;
    setIsOpenModal: Dispatch<boolean>;
    formValues: IFormClient;
    setFormValues: (values: any) => void;
    errors: any;
    setErrors: (errors: any) => void;
}

const DOC_TYPES = [
    { key: 'DNI',       label: 'DNI',       digits: 8,  hint: 'Ingresa 8 dígitos para consultar automáticamente' },
    { key: 'RUC',       label: 'RUC',       digits: 11, hint: 'Ingresa 11 dígitos para consultar RUC automáticamente' },
    { key: 'CE',        label: 'C.E.',      digits: null, hint: null },
    { key: 'PASAPORTE', label: 'Pasaporte', digits: null, hint: null },
    { key: 'OTRO',      label: 'Otro',      digits: null, hint: null },
];

export default function ModalProveedor({
    isOpenModal,
    closeModal,
    setIsOpenModal,
    isEdit,
    formValues,
    setFormValues,
    errors,
    setErrors,
}: IProps) {
    const { editClients, addClients, getClientFromDoc } = useClientsStore();
    const { ubigeos, getUbigeos } = useExtentionsStore();

    useEffect(() => { getUbigeos(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Force persona to PROVEEDOR whenever modal opens
    useEffect(() => {
        if (isOpenModal) setFormValues({ ...formValues, persona: 'PROVEEDOR' });
    }, [isOpenModal]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeTipoDoc = formValues?.tipoDoc || 'RUC';
    const activeDocType = DOC_TYPES.find(d => d.key === activeTipoDoc) ?? DOC_TYPES[1];

    const handleTipoDocChange = (key: string) => {
        setFormValues({ ...formValues, tipoDoc: key, nroDoc: '' });
        setErrors({ ...errors, nroDoc: '' });
    };

    const handleChange = async (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const updated = { ...formValues, [name]: value };
        setFormValues(updated);

        if (name === 'nroDoc') {
            const clean = value.trim();
            const shouldLookup =
                (activeTipoDoc === 'DNI' && clean.length === 8) ||
                (activeTipoDoc === 'RUC' && clean.length === 11);

            if (shouldLookup) {
                const result = await getClientFromDoc(clean, activeTipoDoc);
                if (result) {
                    setFormValues({
                        ...updated,
                        departamento: result.departamento || '',
                        distrito:     result.distrito || '',
                        provincia:    result.provincia || '',
                        ubigeo:       result.ubigeo_sunat || '',
                        nombre:       result.nombre_completo || result.nombre_o_razon_social || '',
                        direccion:    result.direccion || result.direccion_completa || '',
                    });
                }
            }
        }
    };

    const validateForm = () => {
        const doc = formValues?.nroDoc?.trim() || '';
        let nroDocError = '';

        if (!doc) {
            nroDocError = 'El número de documento es obligatorio';
        } else if (activeTipoDoc === 'DNI') {
            nroDocError = /^\d{8}$/.test(doc) ? '' : 'El DNI debe contener exactamente 8 dígitos numéricos';
        } else if (activeTipoDoc === 'RUC') {
            nroDocError = /^(10|15|16|17|20)\d{9}$/.test(doc) ? '' : 'El RUC debe contener 11 dígitos y comenzar con 10, 15, 16, 17 o 20';
        }

        const newErrors: any = {
            nombre: formValues?.nombre?.trim() ? '' : 'La Razón Social es obligatoria',
            nroDoc: nroDocError,
        };
        setErrors(newErrors);
        return Object.values(newErrors).every((e) => !e);
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;
        const payload = { ...formValues, tipoDoc: activeTipoDoc, persona: 'PROVEEDOR' };

        if (Number(formValues?.id) !== 0 && isEdit) {
            editClients(payload);
            closeModal();
        } else {
            addClients({ ...payload, estado: 'ACTIVO' });
            closeModal();
        }
    };

    const handleChangeSelect = (idValue: any, value: any, name: any, id: any) => {
        setFormValues({ ...formValues, [name]: value, [id]: idValue });
    };

    const inputPlaceholder = activeDocType.key === 'DNI' ? 'Nro. de DNI'
        : activeDocType.key === 'RUC' ? 'Nro. de RUC'
        : activeDocType.key === 'CE' ? 'Nro. de Carnet de Extranjería'
        : activeDocType.key === 'PASAPORTE' ? 'Nro. de Pasaporte'
        : 'Nro. de documento';

    return (
        <div>
            {isOpenModal && (
                <Modal width="600px" height="auto" position="right" isOpenModal={isOpenModal} closeModal={closeModal} title={isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor'}>
                    <div className="md:px-6 grid grid-cols-1 mt-5 gap-5">

                        {/* Tipo de documento + número */}
                        <div className="space-y-3">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">N° de Documento</p>
                            <div className="flex flex-wrap gap-2">
                                {DOC_TYPES.map((dt) => (
                                    <button
                                        key={dt.key}
                                        type="button"
                                        onClick={() => handleTipoDocChange(dt.key)}
                                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                                            activeTipoDoc === dt.key
                                                ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                                                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500 hover:text-gray-800 dark:bg-slate-800 dark:text-gray-400 dark:border-slate-700 dark:hover:border-slate-500 dark:hover:text-white'
                                        }`}
                                    >
                                        {dt.label}
                                    </button>
                                ))}
                            </div>
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
                                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                    <span className="inline-block w-3.5 h-3.5 rounded-full border border-gray-400 dark:border-gray-500 text-center leading-3 text-[10px]">i</span>
                                    {activeDocType.hint}
                                </p>
                            )}
                        </div>

                        <div className="col-start-1 col-end-3">
                            <InputPro autocomplete="off" value={formValues?.nombre} error={errors.nombre} name="nombre" onChange={handleChange} isLabel label="Razón Social / Nombre" />
                        </div>
                        <div className="col-start-1 col-end-3">
                            <InputPro autocomplete="off" error={errors.direccion} value={formValues?.direccion} name="direccion" onChange={handleChange} isLabel label="Dirección" />
                        </div>
                        <div>
                            <InputPro autocomplete="off" value={formValues?.email} error={errors.email} name="email" onChange={handleChange} isLabel label="Correo electrónico" />
                        </div>
                        <div>
                            <InputPro autocomplete="off" value={formValues?.telefono} error={errors.telefono} name="telefono" onChange={handleChange} isLabel label="Teléfono / Celular" />
                        </div>
                        <div className="col-start-1 col-end-3">
                            <SelectUbigeo
                                value={formValues?.departamento ? `${formValues?.departamento}/${formValues?.provincia}/${formValues?.distrito}` : ''}
                                isSearch
                                options={ubigeos}
                                name="nombreUbigeo"
                                id="ubigeo"
                                onChange={handleChangeSelect}
                                label="Ubicación"
                            />
                        </div>
                    </div>
                    <div className="flex gap-5 justify-end mt-10 mb-5 md:pr-5">
                        <Button color="gray" onClick={() => setIsOpenModal(false)}>Cancelar</Button>
                        <Button color="secondary" onClick={handleSubmit}>{isEdit ? 'Guardar Cambios' : 'Registrar Proveedor'}</Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
