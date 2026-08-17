import { ChangeEvent, Dispatch, useEffect, useState } from "react";
import Modal from "@/components/Modal";
import DataTable from "@/components/Datatable";
import Pagination from "@/components/Pagination";
import { Icon } from "@iconify/react";
import TableSkeleton from "@/components/Skeletons/table";
import ModalConfirm from "@/components/ModalConfirm";
import InputPro from "@/components/InputPro";
import Button from "@/components/Button";
import { useBrandsStore } from "@/zustand/brands";
import CircularImageUploader from "@/components/CircularImageUploader";
import apiClient from "@/utils/apiClient";
import useAlertStore from "@/zustand/alert";

interface IPropsMarcas {
  isOpenModal: boolean;
  closeModal: any;
  setIsOpenModal: Dispatch<boolean>;
}

// Sub-component: Formulario de Marca
const BrandForm = ({ closeModal }: { closeModal: any }) => {
  const formValues = useBrandsStore(state => state.formValues);
  const isEdit = useBrandsStore(state => state.isEdit);
  const setFormValues = useBrandsStore(state => state.setFormValues);
  const setIsEdit = useBrandsStore(state => state.setIsEdit);
  const addBrand = useBrandsStore(state => state.addBrand);
  const editBrand = useBrandsStore(state => state.editBrand);
  const updateBrandImage = useBrandsStore(state => state.updateBrandImage);

  const [errors, setErrors] = useState({ nombre: "" });
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const initialForm: { id: number; nombre: string; imagenUrl?: string } = { id: 0, nombre: "", imagenUrl: "" };

  useEffect(() => {
    // Sync local preview with store formValues
    if (formValues.imagenUrl) {
      setPreviewUrl(formValues.imagenUrl);
    } else {
      setPreviewUrl(null);
    }
    setImageFile(null);
  }, [formValues.id, formValues.imagenUrl]);

  const validateForm = () => {
    const newErrors: any = {
      nombre: formValues?.nombre && formValues?.nombre.trim() !== "" ? "" : "El nombre de marca es obligatorio",
    };
    setErrors(newErrors);
    return Object.values(newErrors).every((error) => !error);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
    if (errors.nombre) setErrors({ nombre: "" });
  };

  const handleSubmitMarca = async () => {
    if (!validateForm()) return;
    try {
      setLoading(true);
      let brand: any;

      if (isEdit && formValues.id !== 0) {
        brand = await editBrand({ id: formValues.id, nombre: formValues.nombre.trim() });
      } else {
        brand = await addBrand({ nombre: formValues.nombre.trim() });
      }

      // Handle Image Upload
      const entityId = brand?.id || (isEdit ? formValues.id : null);
      if (imageFile && entityId) {
        const fd = new FormData();
        fd.append('file', imageFile);

        const imgResp = await apiClient.post(`/marca/${entityId}/imagen`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (imgResp.data?.url) {
          updateBrandImage(entityId, imgResp.data.url);
        }
      }

      setFormValues(initialForm);
      setIsEdit(false);
      setImageFile(null);
      setPreviewUrl(null);
      // Refresh list not needed as store updates locally, but image might need reload if not returning url
      // For now, assume consistent.
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-6 mt-5">
      <div className="flex flex-col md:flex-row gap-6 items-start border-b border-[#e5e7eb] dark:border-white/10 pb-10">
        <div className="w-full flex-1">
          <InputPro
            key={`input-marca-${formValues.id}`}
            autocomplete="off"
            value={formValues.nombre || ''}
            error={errors.nombre}
            name="nombre"
            onChange={handleChange}
            isLabel
            label="Nombre de la marca"
          />
        </div>

        <div className="md:col-span-2 flex justify-end gap-5 mt-5 md:mt-7 relative">
          <Button color="black" outline onClick={() => { setIsEdit(false); setFormValues(initialForm); setErrors({ nombre: "" }); }}>Limpiar</Button>
          <Button color="secondary" disabled={loading} onClick={handleSubmitMarca}>{isEdit ? "Editar" : "Guardar"}</Button>
        </div>
      </div>
    </div>
  );
};

// Sub-component: Lista de Marcas
const BrandList = () => {
  const marcas = useBrandsStore(state => state.brands);
  const deleteBrand = useBrandsStore(state => state.deleteBrand);
  const setFormValues = useBrandsStore(state => state.setFormValues);
  const setIsEdit = useBrandsStore(state => state.setIsEdit);

  const [currentPage, setcurrentPage] = useState(1);
  const [itemsPerPage, setitemsPerPage] = useState(10);
  const [isOpenModalConfirm, setIsOpenModalConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number; nombre: string } | null>(null);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const pages: number[] = [];
  for (let i = 1; i <= Math.ceil((marcas?.length || 0) / itemsPerPage || 1); i++) {
    pages.push(i);
  }

  const handleGetMarca = (data: any) => {
    setFormValues({ id: data.id, nombre: data.nombre, imagenUrl: data.imagenUrl });
    setIsEdit(true);
  };

  const handleDeleteMarca = (data: any) => {
    setItemToDelete({ id: data.id, nombre: data.nombre });
    setIsOpenModalConfirm(true);
  };

  const confirmDeleteMarca = async () => {
    if (!itemToDelete) return;
    try {
      await deleteBrand(itemToDelete.id);
      setIsEdit(false);
      setFormValues({ id: 0, nombre: "", imagenUrl: "" });
    } finally {
      setIsOpenModalConfirm(false);
      setItemToDelete(null);
    }
  };

  const actions = [
    { onClick: handleGetMarca, icon: <Icon icon="solar:pen-bold" width={18} />, tooltip: 'Editar', color: 'blue' as const },
    { onClick: handleDeleteMarca, icon: <Icon icon="solar:trash-bin-trash-bold" width={18} />, tooltip: 'Eliminar', color: 'rose' as const },
  ];

  const marcasTable = (marcas || []).map((item: any, index: number) => ({
    '#': index + 1,
    id: item.id,
    nombre: item.nombre,
    'Nombre': <span className="font-medium tracking-wide">{item.nombre?.toUpperCase()}</span>,
    imagenUrl: item.imagenUrl,
  }));

  return (
    <>
      <div className="px-6">
        <div className="overflow-hidden overflow-x-scroll md:overflow-x-visible mt-4">
          {marcas?.length > 0 ? (
            <DataTable actions={actions} bodyData={marcasTable} tableInitFinal={false} headerColumns={['#', { label: 'Nombre', key: 'Nombre' }]} isCompact={true} />
          ) : (
            <TableSkeleton arrayData={marcas || []} />
          )}

        </div>
        <Pagination
          data={marcas || []}
          optionSelect
          currentPage={currentPage}
          indexOfFirstItem={indexOfFirstItem}
          indexOfLastItem={indexOfLastItem}
          setcurrentPage={setcurrentPage}
          setitemsPerPage={setitemsPerPage}
          pages={pages}
          total={marcas?.length || 0}
        />
      </div>

      {isOpenModalConfirm && (
        <ModalConfirm
          confirmSubmit={confirmDeleteMarca}
          isOpenModal={isOpenModalConfirm}
          setIsOpenModal={setIsOpenModalConfirm}
          title="Confirmación"
          information="¿Estás seguro que deseas eliminar esta marca? No podrás revertir este cambio."
        />
      )}
    </>
  );
};

const ModalMarcas = ({ isOpenModal, closeModal, setIsOpenModal }: IPropsMarcas) => {
  const isEdit = useBrandsStore(state => state.isEdit);
  const getAllBrands = useBrandsStore(state => state.getAllBrands);
  const marcas = useBrandsStore(state => state.brands);
  const setFormValues = useBrandsStore(state => state.setFormValues);
  const setIsEdit = useBrandsStore(state => state.setIsEdit);

  useEffect(() => {
    if (isOpenModal) {
      if (!marcas || marcas.length === 0) {
        getAllBrands();
      }
      setFormValues({ id: 0, nombre: "", imagenUrl: "" });
      setIsEdit(false);
    }
  }, [isOpenModal]);

  return (
    <>
      {isOpenModal && (
        <Modal width="650px" isOpenModal={isOpenModal} closeModal={closeModal} title={isEdit ? "Editar marca" : "Nueva marca"}>
          <BrandForm closeModal={closeModal} />
          <BrandList />
        </Modal>
      )}
    </>
  );
};

export default ModalMarcas;
