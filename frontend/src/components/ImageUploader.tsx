import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import useAlertStore from "@/zustand/alert";

interface ImageUploaderProps {
    label: string;
    previewUrl: string | null;
    onFileSelect: (file: File) => void;
    onRemove: () => void;
    // Optional: Allow passing external loading state or other props
}

export default function ImageUploader({
    label,
    previewUrl,
    onFileSelect,
    onRemove,
}: ImageUploaderProps) {
    const [loadingImage, setLoadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const alert = useAlertStore((state) => state.alert);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] || null;
        if (!f) return;

        if (!f.type.startsWith("image/")) {
            alert("El archivo debe ser una imagen", "error");
            return;
        }
        if (f.size > 2 * 1024 * 1024) {
            alert("La imagen no debe superar 2MB", "error");
            return;
        }

        setLoadingImage(true);
        const img = new Image();
        const objectUrl = URL.createObjectURL(f);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            if (img.width < 100 || img.height < 100) {
                // Relaxed constraint for Categories/Brands
                // alert("La imagen debe tener al menos 600x600 píxeles", "error");
                // setLoadingImage(false);
                // return; 
            }
            onFileSelect(f);
            setLoadingImage(false);
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            alert("Error al cargar la imagen", "error");
            setLoadingImage(false);
        };

        img.src = objectUrl;
    };

    return (
        <div className="w-full">
            <h5 className="text-sm font-semibold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Icon icon="mdi:image-outline" width={16} height={16} />
                {label}
            </h5>
            <div>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-40 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg hover:border-[#6A6CFF] transition-colors cursor-pointer overflow-hidden relative"
                    disabled={loadingImage}
                >
                    {loadingImage ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Icon
                                icon="mdi:loading"
                                width={32}
                                height={32}
                                className="animate-spin text-[#6A6CFF]"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">Validando...</span>
                        </div>
                    ) : previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                            <Icon icon="mdi:image-plus" width={32} height={32} className="mb-2" />
                            <div className="text-center px-4">
                                <div className="text-sm">Click para subir imagen</div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Máx. 2MB
                                </div>
                            </div>
                        </div>
                    )}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />
                {previewUrl && !loadingImage && (
                    <div className="mt-2">
                        <button
                            type="button"
                            onClick={onRemove}
                            className="text-xs text-red-600 hover:text-red-700 underline"
                        >
                            Quitar imagen
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
