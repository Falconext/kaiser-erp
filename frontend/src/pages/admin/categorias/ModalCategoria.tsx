import Button from "@/components/Button";
import InputPro from "@/components/InputPro";
import Modal from "@/components/Modal";
import ImageUploader from "@/components/ImageUploader";
import { useEffect, useState } from "react";
import apiClient from "@/utils/apiClient";
import useAlertStore from "@/zustand/alert";

interface ModalCategoriaProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { nombre: string; categoriaId?: number; imagenUrl?: string }) => Promise<any>;
  initial?: {
    nombre: string;
    categoriaId?: number;
    imagenUrl?: string;
  };
  title?: string;
}

export default function ModalCategoria({
  isOpen,
  onClose,
  onSubmit,
  initial,
  title,
}: ModalCategoriaProps) {
  const [nombre, setNombre] = useState("");
  const [nombreError, setNombreError] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initial) {
        setNombre(initial.nombre);
        setPreviewUrl(initial.imagenUrl || null);
      } else {
        setNombre("");
        setNombreError("");
        setPreviewUrl(null);
      }
      setImageFile(null);
    }
  }, [isOpen, initial]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) { setNombreError("El nombre es obligatorio"); return; }
    setNombreError("");
    setLoading(true);
    try {
      const entity = await onSubmit({ ...initial, nombre });
      const entityId = entity?.id || initial?.categoriaId;
      if (imageFile && entityId) {
        const fd = new FormData();
        fd.append('file', imageFile);
        await apiClient.post(`/categoria/${entityId}/imagen`, fd);
      }
      onClose();
    } catch (error) {
      console.error("Error saving category:", error);
      useAlertStore.getState().alert("Error al guardar la categoría", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpenModal={isOpen}
      closeModal={onClose}
      title={title || (initial?.categoriaId ? 'Editar categoría' : 'Nueva categoría')}
      height="auto"
      width="500px"
      position="center"
    >
      <form onSubmit={handleFormSubmit} className="flex flex-col gap-4 p-4">
        <InputPro
          label="Nombre"
          name="nombre"
          value={nombre}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNombre(e.target.value)}
          error={nombreError || undefined}
        />

        <ImageUploader
          label="Imagen de Categoría"
          previewUrl={previewUrl}
          onFileSelect={(file) => {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
          }}
          onRemove={() => {
            setImageFile(null);
            setPreviewUrl(null);
          }}
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            onClick={onClose}
            className="bg-gray-300 text-gray-700"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
