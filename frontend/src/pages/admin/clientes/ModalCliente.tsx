import { ChangeEvent, Dispatch, useEffect, useMemo } from "react";
import Modal from "@/components/Modal";
import Select from "@/components/Select";
import { IFormClient } from "@/interfaces/clients";
import { useClientsStore } from "@/zustand/clients";
import InputPro from "@/components/InputPro";
import SelectUbigeo from "@/components/Select/SelectUbigeo";
import { useExtentionsStore } from "@/zustand/extentions";
import Button from "@/components/Button";
import { useAuthStore } from "@/zustand/auth";

interface IProps {
    isOpenModal: any
    closeModal: any
    isEdit: boolean
    setIsOpenModal: Dispatch<boolean>
    formValues: IFormClient
    setFormValues: any
    errors: any
    setErrors: any
}

const ModalClient = ({ isOpenModal, closeModal, setIsOpenModal, isEdit, formValues, setFormValues, errors, setErrors }: IProps) => {

    const { editClients, addClients, getClientFromDoc } = useClientsStore();
    const { ubigeos, getUbigeos } = useExtentionsStore();
    const { auth } = useAuthStore();
    const isFarmacia = useMemo(() => {
        const r = auth?.empresa?.rubro?.nombre?.toLowerCase() ?? '';
        return r.includes('farmacia') || r.includes('botica') || r.includes('medicament') || r.includes('drogueria') || r.includes('droguería');
    }, [auth?.empresa?.rubro?.nombre]);

    const persons = [
      { id: "CLIENTE", value: "CLIENTE" },
      { id: "PROVEEDOR", value: "PROVEEDOR" },
      { id: "CLIENTE_PROVEEDOR", value: "CLIENTE-PROVEEDOR" },
      { id: "EMPRESA", value: "EMPRESA" },
    ]
    const inferTipoDoc = (doc: string) => {
        if (/^\d{8}$/.test(doc)) return 'DNI';
        if (/^(10|20)\d{9}$/.test(doc)) return 'RUC';
        if (/^[A-Za-z0-9]{6,12}$/.test(doc)) return 'CE';
        return 'OTRO';
    };

    const handleChange = async (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const updatedFormValues = {
            ...formValues,
            [name]: value
        };
        setFormValues(updatedFormValues);
        if (name === "nroDoc") {
            const cleanValue = value.trim();
            if (cleanValue.length === 8 || cleanValue.length === 11) {
                const result = await getClientFromDoc(cleanValue, cleanValue.length === 11 ? 'RUC' : 'DNI');
                console.log(result)
                if (result) {
                    setFormValues({
                        ...updatedFormValues,
                        departamento: result.departamento || "",
                        distrito: result.distrito || "",
                        provincia: result.provincia || "",
                        ubigeo: result.ubigeo_sunat || "",
                        nombre: result.nombre_completo || result.nombre_o_razon_social || "",
                        direccion: result.direccion || result.direccion_completa || "",
                    });
                }
            }
        }
    };

    useEffect(() => {
        getUbigeos();
    }, [])

    console.log(formValues)

    const validateForm = () => {
        const newErrors: any = {
            nombre: formValues?.nombre && formValues?.nombre.trim() !== "" ? "" : "La Razon social o el nombre de cliente es obligatorio",
            nroDoc: (() => {
                const doc = formValues?.nroDoc?.trim() || "";

                // Si está vacío
                if (!doc) {
                    return "El número de documento es obligatorio";
                }

                // Validar según el tipo de documento
                if (formValues.persona === "CLIENTE" || formValues.persona === "CLIENTE-PROVEEDOR") {
                    // Validación para DNI (8 dígitos)
                    if (doc.length === 8) {
                        if (!/^\d{8}$/.test(doc)) {
                            return "El DNI debe contener exactamente 8 dígitos numéricos";
                        }
                        return "";
                    }
                    // Validación para RUC (11 dígitos)
                    if (doc.length === 11) {
                        if (!/^(10|20)\d{9}$/.test(doc)) {
                            return "El RUC debe contener 11 dígitos y comenzar con 10 o 20";
                        }
                        return "";
                    }
                    if (/^[A-Za-z0-9]{6,12}$/.test(doc)) return "";
                    return "El documento debe ser DNI, RUC o Carnet de Extranjería";
                }
                return "";
            })(),
        };
        setErrors(newErrors);
        return Object.values(newErrors).every((error) => !error); // Retorna `true` si no hay errores
    };

    const handleSubmitProduct = async () => {
        console.log(formValues)
        if (!validateForm()) {
            return;
        }
        if (Number(formValues?.id) !== 0 && isEdit) {
            editClients({
                ...formValues,
                tipoDoc: inferTipoDoc(formValues.nroDoc)
            });
            closeModal();
        } else {
            addClients({
                ...formValues,
                tipoDoc: inferTipoDoc(formValues.nroDoc),
                estado: "ACTIVO"
            });
            closeModal();
        }
    }

    const handleChangeSelect = (idValue: any, value: any, name: any, id: any) => {
        setFormValues({
            ...formValues,
            [name]: value,
            [id]: idValue,
        });
    }

    console.log(formValues)

    return (
        <div>
            {isOpenModal && <Modal width="600px" height="auto" position="right" isOpenModal={isOpenModal} closeModal={closeModal} title={isEdit ? "Editar cliente" : "Nuevo cliente"}>
                <div className="mt-5 grid grid-cols-1 gap-5 px-4 pb-2 sm:px-6 md:grid-cols-2">
                    <div className="">
                        <InputPro autocomplete="off" error={errors.nroDoc} value={formValues?.nroDoc} name="nroDoc" onChange={handleChange} isLabel label="Nro. documento" />
                    </div>
                    <div className="">
                        <Select defaultValue={formValues?.persona} error={""} isSearch options={persons} id="persona" name="personaName" value="" onChange={handleChangeSelect} icon="clarity:box-plot-line" isIcon label="Persona" />
                    </div>
                    <div className="md:col-start-1 md:col-end-3">
                        <InputPro autocomplete="off" value={formValues?.nombre} error={errors.nombre} name="nombre" onChange={handleChange} isLabel label="Nombre o Razon social" />
                    </div>
                    <div className="md:col-start-1 md:col-end-3">
                        <InputPro autocomplete="off" error={errors.direccion} value={formValues?.direccion} name="direccion" onChange={handleChange} isLabel label="Direccion" />
                    </div>
                    <div className="">
                        <InputPro autocomplete="off" value={formValues?.email} error={errors.email} name="email" onChange={handleChange} isLabel label="Correo principal" />
                    </div>
                    <div className="">
                        <InputPro autocomplete="off" value={formValues?.telefono} error={errors.telefono} name="phone" onChange={handleChange} isLabel label="Celular" />
                    </div>
                    <div className="md:col-start-1 md:col-end-3">
                        <SelectUbigeo value={formValues?.departamento ? `${formValues?.departamento}/${formValues?.provincia}/${formValues?.distrito}` : ""} isSearch options={ubigeos} name="nombreUbigeo" id="ubigeo" onChange={handleChangeSelect} label="Seleccionar ubigeo de la empresa" />
                    </div>

                    {isFarmacia && formValues.persona === 'CLIENTE' && (
                        <>
                            <div className="border-t border-gray-100 pt-4 dark:border-gray-700 md:col-start-1 md:col-end-3">
                                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-3">
                                    💊 Datos clínicos del paciente
                                </p>
                            </div>
                            <div>
                                <InputPro autocomplete="off" value={(formValues as any)?.fechaNacimiento ?? ''} name="fechaNacimiento" onChange={handleChange} isLabel label="Fecha de nacimiento" type="date" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Grupo sanguíneo</label>
                                <select
                                    value={(formValues as any)?.grupoSanguineo ?? ''}
                                    onChange={e => setFormValues({ ...formValues, grupoSanguineo: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Seleccionar...</option>
                                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div className="md:col-start-1 md:col-end-3">
                                <InputPro autocomplete="off" value={(formValues as any)?.alergias ?? ''} name="alergias" onChange={handleChange} isLabel label="Alergias conocidas" />
                            </div>
                        </>
                    )}
                </div>
                <div className="flex flex-col-reverse gap-3 px-4 pb-5 pt-6 sm:flex-row sm:justify-end sm:px-6">
                    <Button color="gray" className="w-full sm:w-auto" onClick={() => setIsOpenModal(false)}>Cancelar</Button>
                    <Button color="secondary" className="w-full sm:w-auto" onClick={handleSubmitProduct}>{isEdit ? "Editar" : "Guardar"}</Button>
                </div>
            </Modal>
            }
        </div>
    )
}

export default ModalClient;
