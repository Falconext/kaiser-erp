import React from "react";
import { Icon } from "@iconify/react";
import useAlertStore from "@/zustand/alert";
import { useProductModalViewModel } from "../useProductModalViewModel";

type ViewProps = ReturnType<typeof useProductModalViewModel>;

export const ProductImageUploader: React.FC<{ vm: ViewProps }> = ({ vm }) => {
  const {
    labels,
    loadingImage,
    previewPrincipal,
    filePrincipalInputRef,
    isGeneratingImage,
    formValues,
    setFilePrincipal,
    setPreviewPrincipal,
    setLoadingImage,
    handleAutoImage,
    setFormValues,
    imageCandidates,
    setImageCandidates,
    aprobarImagenReferencia,
    productSections,
  } = vm;

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-white/10">
      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
        <Icon icon="mdi:image-outline" width={16} height={16} />
        {labels.imagen}
      </h5>
      <div>
        <button
          type="button"
          onClick={() => filePrincipalInputRef.current?.click()}
          className="w-full h-40 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg hover:border-[#6A6CFF] dark:hover:border-[#6A6CFF] transition-colors cursor-pointer overflow-hidden relative dark:bg-slate-800/50"
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
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Validando imagen...
              </span>
            </div>
          ) : previewPrincipal ? (
            <img
              src={previewPrincipal}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <Icon
                icon="mdi:image-plus"
                width={32}
                height={32}
                className="mb-2"
              />
              <div className="text-center px-4">
                <div className="text-sm">Click para subir imagen</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Mín. 600x600px, máx. 2MB
                </div>
              </div>
            </div>
          )}
        </button>
        <input
          ref={filePrincipalInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            if (!f) return;
            if (!f.type.startsWith("image/")) {
              useAlertStore
                .getState()
                .alert("El archivo debe ser una imagen", "error");
              return;
            }
            if (f.size > 2 * 1024 * 1024) {
              useAlertStore
                .getState()
                .alert("La imagen no debe superar 2MB", "error");
              return;
            }

            setLoadingImage(true);
            const img = new Image();
            const objectUrl = URL.createObjectURL(f);
            img.onload = () => {
              URL.revokeObjectURL(objectUrl);
              if (img.width < 600 || img.height < 600) {
                useAlertStore
                  .getState()
                  .alert(
                    "La imagen debe tener al menos 600x600 píxeles",
                    "error",
                  );
                setLoadingImage(false);
                return;
              }
              setFilePrincipal(f);
              setPreviewPrincipal(URL.createObjectURL(f));
              setLoadingImage(false);
            };
            img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              useAlertStore
                .getState()
                .alert("Error al cargar la imagen", "error");
              setLoadingImage(false);
            };
            img.src = objectUrl;
            setImageCandidates([]);
          }}
          className="hidden"
        />
        {previewPrincipal && !loadingImage && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => {
                setFilePrincipal(null);
                setPreviewPrincipal(null);
                setFormValues((prev: any) => ({
                  ...prev,
                  imagenUrl: null,
                  imagenUrlDisplay: null,
                }));
                setImageCandidates([]);
              }}
              className="text-xs text-red-600 hover:text-red-700 underline"
            >
              Quitar imagen
            </button>
          </div>
        )}
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
          Recomendación: 800x800px, JPG o PNG. Peso máximo 2MB.
        </p>

        {productSections.autoGenerarImagen && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleAutoImage}
              disabled={isGeneratingImage || !formValues.descripcion}
              className={`mt-3 w-full py-2 px-4 flex items-center justify-center gap-2 rounded-lg font-medium text-sm transition-all shadow-sm ${
                isGeneratingImage || !formValues.descripcion
                  ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 hover:shadow-md"
              }`}
            >
              <Icon
                icon={
                  isGeneratingImage
                    ? "line-md:loading-loop"
                    : "solar:magic-stick-3-bold-duotone"
                }
                width={20}
                className={isGeneratingImage ? "text-indigo-400" : ""}
              />
              {isGeneratingImage ? "Buscando..." : "Auto-Generar Imagen"}
            </button>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center leading-tight">
              Nota: La imagen generada puede no ser exacta y sirve solo como apoyo
              referencial.
            </p>
          </div>
        )}

        {imageCandidates.length > 0 && (
          <div className="mt-3 border border-indigo-100 dark:border-indigo-900/40 rounded-lg p-3 bg-indigo-50/40 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                Opciones sugeridas (elige una)
              </p>
              <button
                type="button"
                className="text-[11px] text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                onClick={() => setImageCandidates([])}
              >
                Ocultar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {imageCandidates.map((url) => {
                const isSelected = previewPrincipal === url;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setFilePrincipal(null);
                      setPreviewPrincipal(url);
                      setFormValues((prev: any) => ({
                        ...prev,
                        imagenUrl: url,
                        imagenUrlDisplay: url,
                      }));
                      void aprobarImagenReferencia(url, true);
                    }}
                    className={`relative h-24 rounded-lg overflow-hidden border-2 transition-all ${isSelected ? "border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-900" : "border-transparent hover:border-indigo-300"}`}
                  >
                    <img
                      src={url}
                      alt="Candidata IA"
                      className="w-full h-full object-cover"
                    />
                    {isSelected && (
                      <span className="absolute top-1 right-1 text-[10px] bg-indigo-600 text-white rounded px-1.5 py-0.5">
                        Seleccionada
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
