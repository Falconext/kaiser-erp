"use strict";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useConfiguracionTiendaViewModel } from "@/features/admin/tienda/useConfiguracionTiendaViewModel";
import { Icon } from "@iconify/react";
import Button from "@/components/Button";
import InputPro from "@/components/InputPro";
import ModalConfirm from "@/components/ModalConfirm";
import { ALL_PLANTILLAS } from "@/components/tienda/resolveTemplate";
export default function ConfiguracionTienda() {
  const vm = useConfiguracionTiendaViewModel();
  if (vm.loading) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-64 bg-gray-50 dark:bg-[#0A0D14]", children: /* @__PURE__ */ jsx(Icon, { icon: "eos-icons:loading", className: "w-12 h-12 text-gray-400" }) });
  }
  if (!vm.config?.plan?.tieneTienda) {
    return /* @__PURE__ */ jsxs("div", { className: "max-w-2xl mx-auto mt-12 p-8 bg-white dark:bg-[#111827] rounded-lg shadow text-center border dark:border-slate-800", children: [
      /* @__PURE__ */ jsx(Icon, { icon: "mdi:store-off", className: "w-16 h-16 mx-auto text-gray-400 mb-4" }),
      /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold mb-2 dark:text-white", children: "Tienda Virtual no disponible" }),
      /* @__PURE__ */ jsx("p", { className: "text-gray-600 dark:text-gray-400 mb-6", children: "Tu plan actual no incluye tienda virtual. Actualiza tu plan para activar esta funcionalidad." }),
      /* @__PURE__ */ jsx(Button, { onClick: () => window.location.href = "/administrador/perfil", children: "Ver Planes" })
    ] });
  }
  const { formData, handleChange, handleSubmit, saving } = vm;
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen pb-4 px-2 bg-gray-50 dark:bg-[#0A0D14]", children: [
    /* @__PURE__ */ jsx(
      ModalConfirm,
      {
        isOpenModal: vm.showConfirmDelete,
        setIsOpenModal: vm.setShowConfirmDelete,
        confirmSubmit: vm.confirmarEliminarQr,
        title: `Eliminar QR de ${vm.deleteQrType?.toUpperCase() || ""}`,
        information: `\xBFEst\xE1s seguro de que deseas eliminar el c\xF3digo QR de ${vm.deleteQrType?.toUpperCase() || ""}?`
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 pt-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Icon, { icon: "solar:settings-bold-duotone", className: "text-blue-600 dark:text-blue-400" }),
          "Configuraci\xF3n de Tienda Virtual"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400 mt-1", children: "Personaliza tu tienda online: logo, banners, pagos y m\xE1s" })
      ] }),
      formData.slugTienda && /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: vm.abrirTienda,
          className: "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95",
          children: [
            /* @__PURE__ */ jsx(Icon, { icon: "solar:shop-2-bold", className: "text-lg" }),
            "Ver mi tienda"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6", children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Icon, { icon: "solar:info-circle-bold-duotone", className: "text-xl text-blue-500" }),
          "Informaci\xF3n B\xE1sica"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx(InputPro, { label: "Nombre de la tienda (URL)", name: "slugTienda", value: formData.slugTienda, onChange: handleChange, placeholder: "mi-negocio" }),
            /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-gray-500 dark:text-gray-400", children: "Solo letras min\xFAsculas, n\xFAmeros y guiones." })
          ] }),
          /* @__PURE__ */ jsx(InputPro, { label: "WhatsApp", name: "whatsappTienda", value: formData.whatsappTienda, onChange: handleChange, placeholder: "+51 999 999 999" }),
          /* @__PURE__ */ jsx("div", { className: "md:col-span-2", children: /* @__PURE__ */ jsx(InputPro, { label: "Descripci\xF3n", name: "descripcionTienda", value: formData.descripcionTienda, onChange: handleChange, placeholder: "Breve descripci\xF3n de tu negocio", type: "textarea", rows: 3, isLabel: true }) }),
          /* @__PURE__ */ jsx(InputPro, { label: "Horario de atenci\xF3n", name: "horarioAtencion", value: formData.horarioAtencion, onChange: handleChange })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6", children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Icon, { icon: "solar:shop-2-bold-duotone", className: "text-xl text-indigo-500" }),
          "Plantilla de Tienda"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400 mb-5", children: "Elige el dise\xF1o base de tu tienda virtual. Algunas plantillas requieren un plan superior." }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3", children: ALL_PLANTILLAS.map((plantilla) => {
          const isOn = vm.config?.diseno?.plantillaId === plantilla.id;
          const requiredPlans = plantilla.planesPermitidos || [];
          const userPlan = vm.config?.plan?.nombre?.toUpperCase() || "";
          const isAllowed = requiredPlans.length === 0 || requiredPlans.includes(userPlan) || userPlan.includes("CORPORATIVO");
          return /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              disabled: !isAllowed,
              onClick: () => vm.actualizarDiseno({ plantillaId: plantilla.id }),
              className: `relative text-left p-4 rounded-xl border-2 transition-all flex flex-col 
                    ${!isAllowed ? "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-slate-900 border-gray-100 dark:border-slate-800" : isOn ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-sm" : "border-gray-100 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"}`,
              children: [
                isOn && /* @__PURE__ */ jsx("span", { className: "absolute top-2 right-2", children: /* @__PURE__ */ jsx(Icon, { icon: "solar:check-circle-bold", className: "text-indigo-600 text-sm" }) }),
                !isAllowed && /* @__PURE__ */ jsx("span", { className: "absolute top-2 right-2", title: `Requiere plan: ${requiredPlans.join(", ")}`, children: /* @__PURE__ */ jsx(Icon, { icon: "solar:lock-bold", className: "text-gray-400 text-sm" }) }),
                /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-xl mb-3 flex items-center justify-center flex-shrink-0", style: { backgroundColor: plantilla.accentColor + "18" }, children: /* @__PURE__ */ jsx(Icon, { icon: plantilla.icon, className: "text-xl", style: { color: plantilla.accentColor } }) }),
                /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-gray-800 dark:text-gray-100 mb-1", children: plantilla.label }),
                /* @__PURE__ */ jsx("p", { className: "text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed", children: !isAllowed ? `Requiere plan ${requiredPlans.join(" o ")}` : plantilla.description })
              ]
            },
            plantilla.id
          );
        }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6", children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Icon, { icon: "solar:image-bold-duotone", className: "text-xl text-[#FF9500]" }),
          "Logo de Tienda"
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-500 dark:text-gray-400 mb-5", children: [
          "Aparece en el ",
          /* @__PURE__ */ jsx("strong", { children: "encabezado" }),
          " de tu tienda virtual junto al nombre. Recomendado: 200\xD7200px, fondo transparente (PNG)."
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-6 flex-wrap", children: [
          /* @__PURE__ */ jsx("div", { className: "flex-shrink-0", children: vm.previewLogoUrl ? /* @__PURE__ */ jsxs("div", { className: "relative group", children: [
            /* @__PURE__ */ jsx("div", { className: "w-28 h-28 rounded-2xl border-2 border-[#FF9500]/30 bg-[#FAF6F1] dark:bg-slate-900/50 flex items-center justify-center overflow-hidden", children: /* @__PURE__ */ jsx("img", { src: vm.previewLogoUrl, alt: "Logo", className: "max-w-full max-h-full object-contain p-2" }) }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: vm.eliminarLogo,
                className: "absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity",
                children: /* @__PURE__ */ jsx(Icon, { icon: "solar:trash-bin-trash-bold", className: "text-xs" })
              }
            ),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-center text-gray-400 dark:text-gray-500 mt-1", children: "Logo actual" })
          ] }) : /* @__PURE__ */ jsxs("div", { className: "w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/30 flex flex-col items-center justify-center gap-1", children: [
            /* @__PURE__ */ jsx(Icon, { icon: "solar:shop-bold", className: "text-3xl text-gray-300 dark:text-gray-700" }),
            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-gray-400 dark:text-gray-500", children: "Sin logo" })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-[220px]", children: [
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-100 dark:border-slate-800 rounded-xl cursor-pointer bg-gray-50 dark:bg-slate-900/20 hover:bg-[#FFF3E0] dark:hover:bg-[#FF9500]/10 hover:border-[#FF9500] transition-colors", children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "file",
                  accept: "image/png,image/jpeg,image/webp,image/svg+xml",
                  className: "hidden",
                  onChange: (e) => vm.setLogoFile(e.target.files?.[0] || null)
                }
              ),
              vm.logoFile ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-1", children: [
                /* @__PURE__ */ jsx("img", { src: URL.createObjectURL(vm.logoFile), className: "h-16 object-contain", alt: "preview" }),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-[#FF9500] font-medium truncate max-w-[180px]", children: vm.logoFile.name })
              ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(Icon, { icon: "solar:upload-minimalistic-bold-duotone", className: "text-3xl text-gray-400 mb-1" }),
                /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-500", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Clic para elegir" }),
                  " logo"
                ] }),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-400", children: "PNG, JPG, SVG \xB7 m\xE1x 2.5MB" })
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              Button,
              {
                type: "button",
                onClick: vm.subirLogo,
                disabled: vm.logoUploading || !vm.logoFile,
                className: "w-full mt-3",
                color: "secondary",
                children: vm.logoUploading ? /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx(Icon, { icon: "eos-icons:loading", className: "animate-spin" }),
                  " Subiendo..."
                ] }) : "Subir Logo"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6", children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Icon, { icon: "solar:share-circle-bold-duotone", className: "text-xl text-purple-500" }),
          "Redes Sociales"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ jsx(InputPro, { label: "Facebook", name: "facebookUrl", value: formData.facebookUrl, onChange: handleChange, placeholder: "https://facebook.com/tu-pagina" }),
          /* @__PURE__ */ jsx(InputPro, { label: "Instagram", name: "instagramUrl", value: formData.instagramUrl, onChange: handleChange, placeholder: "https://instagram.com/tu-cuenta" }),
          /* @__PURE__ */ jsx(InputPro, { label: "TikTok", name: "tiktokUrl", value: formData.tiktokUrl, onChange: handleChange, placeholder: "https://tiktok.com/@tu-cuenta" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6", children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Icon, { icon: "solar:wallet-money-bold-duotone", className: "text-xl text-emerald-500" }),
          "Medios de Pago"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "border border-gray-100 dark:border-slate-800 rounded-xl p-5 bg-gray-50/50 dark:bg-slate-900/30", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
              /* @__PURE__ */ jsx("div", { className: "w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "text-lg", children: "\u{1F49C}" }) }),
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-gray-800 dark:text-white", children: "Yape" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsx(InputPro, { label: "N\xFAmero Yape", name: "yapeNumero", value: formData.yapeNumero, onChange: handleChange, placeholder: "999 999 999" }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "C\xF3digo QR" }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-stretch gap-4", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col", children: [
                    /* @__PURE__ */ jsxs("label", { className: "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-xl cursor-pointer bg-white dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors", children: [
                      /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", onChange: (e) => vm.setYapeFile(e.target.files?.[0] || null), className: "hidden" }),
                      /* @__PURE__ */ jsx(Icon, { icon: "solar:upload-minimalistic-bold-duotone", className: "text-3xl text-gray-400 dark:text-gray-600 mb-2" }),
                      /* @__PURE__ */ jsx("span", { className: "text-sm text-gray-500 dark:text-gray-400", children: vm.yapeFile ? vm.yapeFile.name : "Seleccionar imagen" })
                    ] }),
                    /* @__PURE__ */ jsx(Button, { type: "button", onClick: () => vm.subirQr("yape"), disabled: vm.yapeUploading || !vm.yapeFile, color: "lila", fill: true, className: "w-full mt-3", children: vm.yapeUploading ? "Subiendo..." : "Subir QR" })
                  ] }),
                  vm.previewYapeUrl || formData.yapeQrUrl ? /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                    /* @__PURE__ */ jsx("img", { src: vm.previewYapeUrl || formData.yapeQrUrl, alt: "QR Yape", className: "w-28 h-auto max-h-40 object-contain rounded-xl border border-gray-200 dark:border-slate-700" }),
                    /* @__PURE__ */ jsx("button", { type: "button", onClick: () => vm.eliminarQr("yape"), className: "absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-md", children: /* @__PURE__ */ jsx(Icon, { icon: "solar:trash-bin-trash-bold", className: "text-xs" }) })
                  ] }) : /* @__PURE__ */ jsx("div", { className: "w-32 h-32 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-900/50 flex items-center justify-center", children: /* @__PURE__ */ jsx(Icon, { icon: "solar:qr-code-linear", className: "text-4xl text-gray-300 dark:text-gray-700" }) })
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "border border-gray-100 dark:border-slate-800 rounded-xl p-5 bg-gray-50/50 dark:bg-slate-900/30", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
              /* @__PURE__ */ jsx("div", { className: "w-8 h-8 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsx("span", { className: "text-lg", children: "\u{1F49A}" }) }),
              /* @__PURE__ */ jsx("span", { className: "font-semibold text-gray-800 dark:text-white", children: "Plin" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
              /* @__PURE__ */ jsx(InputPro, { label: "N\xFAmero Plin", name: "plinNumero", value: formData.plinNumero, onChange: handleChange, placeholder: "999 999 999" }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "C\xF3digo QR" }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-stretch gap-4", children: [
                  /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col", children: [
                    /* @__PURE__ */ jsxs("label", { className: "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-xl cursor-pointer bg-white dark:bg-slate-900/50 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors", children: [
                      /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", onChange: (e) => vm.setPlinFile(e.target.files?.[0] || null), className: "hidden" }),
                      /* @__PURE__ */ jsx(Icon, { icon: "solar:upload-minimalistic-bold-duotone", className: "text-3xl text-gray-400 dark:text-gray-600 mb-2" }),
                      /* @__PURE__ */ jsx("span", { className: "text-sm text-gray-500 dark:text-gray-400", children: vm.plinFile ? vm.plinFile.name : "Seleccionar imagen" })
                    ] }),
                    /* @__PURE__ */ jsx(Button, { type: "button", onClick: () => vm.subirQr("plin"), disabled: vm.plinUploading || !vm.plinFile, color: "lila", fill: true, className: "w-full mt-3", children: vm.plinUploading ? "Subiendo..." : "Subir QR" })
                  ] }),
                  vm.previewPlinUrl || formData.plinQrUrl ? /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                    /* @__PURE__ */ jsx("img", { src: vm.previewPlinUrl || formData.plinQrUrl, alt: "QR Plin", className: "w-28 h-auto max-h-40 object-contain rounded-xl border border-gray-200 dark:border-slate-700" }),
                    /* @__PURE__ */ jsx("button", { type: "button", onClick: () => vm.eliminarQr("plin"), className: "absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-md", children: /* @__PURE__ */ jsx(Icon, { icon: "solar:trash-bin-trash-bold", className: "text-xs" }) })
                  ] }) : /* @__PURE__ */ jsx("div", { className: "w-32 h-32 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-100 dark:bg-slate-900/50 flex items-center justify-center", children: /* @__PURE__ */ jsx(Icon, { icon: "solar:qr-code-linear", className: "text-4xl text-gray-300 dark:text-gray-700" }) })
                ] })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-5 pt-5 border-t border-gray-100 dark:border-slate-800", children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", name: "aceptaEfectivo", checked: formData.aceptaEfectivo, onChange: handleChange, className: "w-4 h-4 rounded border-gray-300 dark:border-slate-700 dark:bg-slate-800 text-blue-600 focus:ring-blue-500" }),
          /* @__PURE__ */ jsx("label", { className: "text-sm text-gray-700 dark:text-gray-300", children: "Acepto pago en efectivo contra entrega" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-8 pt-5 border-t border-gray-100 dark:border-slate-800", children: [
          /* @__PURE__ */ jsxs("h4", { className: "text-md font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Icon, { icon: "solar:card-transfer-bold-duotone", className: "text-xl text-blue-500" }),
            "Cuenta Bancaria (Para Cotizaciones)"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsx(InputPro, { name: "bancoNombre", label: "Nombre del Banco", value: formData.bancoNombre, onChange: handleChange, isLabel: true, placeholder: "Ej: INTERBANK" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "mb-1", children: /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Moneda" }) }),
              /* @__PURE__ */ jsxs("select", { name: "monedaCuenta", value: formData.monedaCuenta, onChange: handleChange, className: "w-full rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-black focus:border-black dark:text-white", children: [
                /* @__PURE__ */ jsx("option", { value: "SOLES", children: "SOLES" }),
                /* @__PURE__ */ jsx("option", { value: "DOLARES", children: "DOLARES" })
              ] })
            ] }),
            /* @__PURE__ */ jsx(InputPro, { name: "numeroCuenta", label: "N\xB0 Cuenta", value: formData.numeroCuenta, onChange: handleChange, isLabel: true, placeholder: "Ej: 200-3006350516" }),
            /* @__PURE__ */ jsx(InputPro, { name: "cci", label: "CCI", value: formData.cci, onChange: handleChange, isLabel: true, placeholder: "Ej: 003-200-003006350516-35" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6", children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-lg font-semibold dark:text-white mb-4 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Icon, { icon: "solar:delivery-bold", className: "text-xl text-amber-500" }),
          "Configuraci\xF3n de Env\xEDo y Recojo"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("input", { type: "checkbox", name: "aceptaRecojo", checked: formData.aceptaRecojo, onChange: handleChange, className: "w-4 h-4 dark:bg-slate-800 dark:border-slate-700" }),
              /* @__PURE__ */ jsx("label", { className: "text-sm dark:text-gray-300", children: "Acepto recojo en tienda" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("input", { type: "checkbox", name: "aceptaEnvio", checked: formData.aceptaEnvio, onChange: handleChange, className: "w-4 h-4 dark:bg-slate-800 dark:border-slate-700" }),
              /* @__PURE__ */ jsx("label", { className: "text-sm dark:text-gray-300", children: "Acepto env\xEDo a domicilio" })
            ] })
          ] }),
          formData.aceptaEnvio && /* @__PURE__ */ jsx(InputPro, { label: "Costo de env\xEDo fijo (S/)", name: "costoEnvioFijo", type: "number", value: formData.costoEnvioFijo, onChange: handleChange, placeholder: "0.00", isLabel: true }),
          formData.aceptaEnvio && /* @__PURE__ */ jsx(InputPro, { label: "Env\xEDo gratis desde (S/) \u2014 0 = nunca gratis", name: "envioGratisDesdeSoles", type: "number", value: formData.envioGratisDesdeSoles, onChange: handleChange, placeholder: "0.00", isLabel: true }),
          formData.aceptaRecojo && /* @__PURE__ */ jsx(InputPro, { label: "Direcci\xF3n de recojo", name: "direccionRecojo", value: formData.direccionRecojo, onChange: handleChange, placeholder: "Av. Principal 123, Distrito, Ciudad", isLabel: true }),
          /* @__PURE__ */ jsx(InputPro, { label: "Monto m\xEDnimo de pedido (S/) \u2014 0 = sin m\xEDnimo", name: "minimoCompra", type: "number", value: formData.minimoCompra, onChange: handleChange, placeholder: "0.00", isLabel: true }),
          /* @__PURE__ */ jsx(InputPro, { label: "Tiempo estimado de preparaci\xF3n (minutos)", name: "tiempoPreparacionMin", type: "number", value: formData.tiempoPreparacionMin, onChange: handleChange, placeholder: "30", isLabel: true })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxs("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(Icon, { icon: "solar:gallery-bold-duotone", className: "text-xl text-[#FF9500]" }),
            "Banners de Tienda Virtual"
          ] }),
          vm.bannerSlots.length > 0 && /* @__PURE__ */ jsxs("span", { className: "text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-bold px-3 py-1 rounded-full", children: [
            vm.banners.length,
            " / ",
            vm.bannerIsSlider ? 3 : 6
          ] })
        ] }),
        vm.bannerSlots.length > 0 && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-5 p-4 bg-gray-50 dark:bg-slate-900/30 rounded-xl border border-gray-200 dark:border-slate-800", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("p", { className: "text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Icon, { icon: "solar:play-circle-bold-duotone", className: "text-[#FF9500]", width: 18 }),
              "Modo carrusel"
            ] }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-0.5", children: vm.bannerIsSlider ? "Las im\xE1genes rotan autom\xE1ticamente como slider (m\xE1x. 3 slides)" : "Layout cl\xE1sico con hero, tarjetas laterales y banners promo" })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => vm.toggleBannerIsSlider(!vm.bannerIsSlider),
              className: `relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${vm.bannerIsSlider ? "bg-[#FF9500]" : "bg-gray-300 dark:bg-slate-600"}`,
              children: /* @__PURE__ */ jsx("span", { className: `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${vm.bannerIsSlider ? "translate-x-5" : "translate-x-0"}` })
            }
          )
        ] }),
        vm.bannerSlots.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-10 text-center", children: [
          /* @__PURE__ */ jsx(Icon, { icon: "solar:gallery-minimalistic-bold-duotone", className: "text-5xl text-gray-300 dark:text-gray-700 mb-3" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-gray-500 dark:text-gray-400", children: "Esta plantilla no usa banners" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1", children: "Cambia la plantilla desde Dise\xF1o de Tienda para activar esta secci\xF3n." })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("div", { className: "mb-6 bg-[#FFF8F0] dark:bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-2xl p-5", children: [
            /* @__PURE__ */ jsxs("p", { className: "text-sm font-bold text-[#FF9500] mb-3 flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(Icon, { icon: "solar:info-circle-bold", width: 16 }),
              vm.bannerIsSlider ? "Carrusel de slides \u2014 se rotan autom\xE1ticamente en la tienda" : "\xBFC\xF3mo se usan los banners en la tienda?"
            ] }),
            vm.bannerIsSlider ? /* @__PURE__ */ jsx("div", { className: "space-y-2", children: vm.bannerSlots.map((slot) => {
              const uploaded = vm.banners.find((b) => b.orden === slot.orden);
              return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 bg-white dark:bg-[#0A0D14] rounded-xl border border-gray-200 dark:border-slate-800 p-3", children: [
                /* @__PURE__ */ jsx("span", { className: "w-7 h-7 rounded-full bg-[#FF9500] text-white text-xs font-black flex items-center justify-center flex-shrink-0", children: slot.orden + 1 }),
                /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                  /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-gray-800 dark:text-white", children: slot.label }),
                  /* @__PURE__ */ jsxs("p", { className: "text-xs text-gray-400 dark:text-gray-500", children: [
                    slot.description,
                    " \xB7 ",
                    slot.recomendado
                  ] })
                ] }),
                uploaded ? /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [
                  /* @__PURE__ */ jsx("img", { src: uploaded.imagenUrl, className: "w-14 h-9 object-cover rounded-lg border border-gray-200 dark:border-slate-700", alt: "" }),
                  /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
                    /* @__PURE__ */ jsx("button", { type: "button", onClick: () => vm.openEditModal(uploaded), className: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg p-1 hover:bg-blue-100 transition-colors", children: /* @__PURE__ */ jsx(Icon, { icon: "solar:pen-bold", className: "w-3.5 h-3.5" }) }),
                    /* @__PURE__ */ jsx("button", { type: "button", onClick: () => vm.eliminarBanner(uploaded.id), className: "bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg p-1 hover:bg-red-100 transition-colors", children: /* @__PURE__ */ jsx(Icon, { icon: "mdi:delete", className: "w-3.5 h-3.5" }) })
                  ] })
                ] }) : /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-400 dark:text-gray-500 flex-shrink-0", children: "Sin imagen" })
              ] }, slot.orden);
            }) }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-[10px] text-gray-600 dark:text-gray-400", children: vm.bannerSlots.map((slot) => /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#0A0D14] rounded-lg border border-gray-100 dark:border-slate-800 p-2", children: [
              /* @__PURE__ */ jsxs("p", { className: "font-black text-gray-800 dark:text-white text-[11px]", children: [
                "Orden ",
                slot.orden,
                " \u2014 ",
                slot.label
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-gray-500 dark:text-gray-400 mt-0.5", children: slot.description }),
              /* @__PURE__ */ jsxs("p", { className: "text-[#FF9500] font-medium mt-1", children: [
                "\u{1F4D0} ",
                slot.recomendado
              ] })
            ] }, slot.orden)) })
          ] }),
          vm.loadingBanners ? /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center py-12", children: /* @__PURE__ */ jsx(Icon, { icon: "eos-icons:loading", className: "w-8 h-8 text-gray-400" }) }) : /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
            !vm.bannerIsSlider && vm.banners.length > 0 && /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 md:grid-cols-6 gap-3", children: [...vm.banners].sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999)).map((banner, index) => {
              const slot = vm.bannerSlots.find((s) => s.orden === banner.orden);
              const label = slot?.label || `Banner ${index + 1}`;
              return /* @__PURE__ */ jsxs("div", { className: "relative group", children: [
                /* @__PURE__ */ jsx("div", { className: "rounded-xl overflow-hidden border-2 border-gray-200 dark:border-slate-800 aspect-video", children: /* @__PURE__ */ jsx("img", { src: banner.imagenUrl, alt: banner.titulo || label, className: "w-full h-full object-cover" }) }),
                /* @__PURE__ */ jsx("div", { className: "absolute top-2 left-2 bg-[#FF9500] text-white text-[9px] font-black px-2 py-0.5 rounded-full", children: label }),
                /* @__PURE__ */ jsxs("div", { className: "absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity", children: [
                  /* @__PURE__ */ jsx("button", { type: "button", onClick: () => vm.openEditModal(banner), className: "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-full p-1.5 shadow-lg hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors", children: /* @__PURE__ */ jsx(Icon, { icon: "solar:pen-bold", className: "w-3.5 h-3.5" }) }),
                  /* @__PURE__ */ jsx("button", { type: "button", onClick: () => vm.eliminarBanner(banner.id), className: "bg-white dark:bg-slate-800 text-red-500 rounded-full p-1.5 shadow-lg hover:bg-red-50 dark:hover:bg-slate-700 transition-colors", children: /* @__PURE__ */ jsx(Icon, { icon: "mdi:delete", className: "w-3.5 h-3.5" }) })
                ] }),
                /* @__PURE__ */ jsx("p", { className: "mt-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 truncate px-1", children: banner.titulo || label })
              ] }, banner.id);
            }) }),
            vm.editingBanner && /* @__PURE__ */ jsx("div", { className: "fixed inset-0 z-50 top-[-30px] flex items-center justify-center bg-black/60 p-4", children: /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] border dark:border-slate-800", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-5", children: [
                /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold dark:text-white", children: "Editar Banner" }),
                /* @__PURE__ */ jsx("button", { type: "button", onClick: () => vm.setEditingBanner(null), className: "p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400", children: /* @__PURE__ */ jsx(Icon, { icon: "mdi:close", width: 20 }) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "mb-4 bg-[#FFF8F0] dark:bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-xl p-3 text-sm text-gray-600 dark:text-gray-400", children: [
                /* @__PURE__ */ jsx(Icon, { icon: "solar:info-circle-bold", className: "inline text-[#FF9500] mr-1", width: 14 }),
                vm.bannerSlots.find((s) => s.orden === vm.editingBanner.orden)?.description || `Orden ${vm.editingBanner.orden}`,
                " \xB7 ",
                /* @__PURE__ */ jsx("strong", { children: vm.bannerSlots.find((s) => s.orden === vm.editingBanner.orden)?.recomendado })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Imagen del Banner" }),
                  /* @__PURE__ */ jsxs("div", { className: "relative aspect-video rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-slate-800 hover:border-[#FF9500] transition-colors cursor-pointer bg-gray-50 dark:bg-slate-900/50 flex items-center justify-center group/edit-img", children: [
                    /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", className: "absolute inset-0 opacity-0 z-10 cursor-pointer", onChange: (e) => vm.setEditBannerFile(e.target.files?.[0] || null) }),
                    vm.editBannerFile ? /* @__PURE__ */ jsx("img", { src: URL.createObjectURL(vm.editBannerFile), className: "w-full h-full object-cover", alt: "Preview" }) : vm.editingBanner.imagenUrl ? /* @__PURE__ */ jsx("img", { src: vm.editingBanner.imagenUrl, className: "w-full h-full object-cover", alt: "Current" }) : /* @__PURE__ */ jsx("span", { className: "text-gray-400 dark:text-gray-600", children: "Clic para subir imagen" }),
                    /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/edit-img:opacity-100 transition-opacity pointer-events-none", children: /* @__PURE__ */ jsx(Icon, { icon: "solar:camera-bold", className: "text-white text-3xl" }) })
                  ] }),
                  vm.editBannerFile && /* @__PURE__ */ jsxs("p", { className: "text-xs text-green-600 mt-1", children: [
                    "\u2713 Nueva imagen: ",
                    vm.editBannerFile.name
                  ] })
                ] }),
                /* @__PURE__ */ jsx(InputPro, { label: "T\xEDtulo (Opcional)", name: "titulo", value: vm.editBannerTitle, onChange: (e) => vm.setEditBannerTitle(e.target.value), placeholder: "Ej: Gran Liquidaci\xF3n" }),
                /* @__PURE__ */ jsx(InputPro, { label: "Subt\xEDtulo (Opcional)", name: "subtitulo", value: vm.editBannerSubtitle, onChange: (e) => vm.setEditBannerSubtitle(e.target.value), placeholder: "Ej: Hasta 50% de descuento" }),
                /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                  /* @__PURE__ */ jsx(InputPro, { label: "Enlace (URL o ruta)", name: "link", value: vm.editBannerLink, onChange: (e) => vm.setEditBannerLink(e.target.value), placeholder: "/tienda/producto/xyz" }),
                  /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 mb-1", children: "O vincula al cat\xE1logo por categor\xEDa:" }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      value: "",
                      onChange: (e) => {
                        const v = e.target.value;
                        if (!v) return;
                        vm.setEditBannerLink(vm.generarLinkCatalogoCategoria(v));
                        e.currentTarget.value = "";
                      },
                      className: "w-full text-sm rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] dark:text-white",
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "", children: "Seleccionar categor\xEDa..." }),
                        vm.storeCategories.map((cat, idx) => {
                          const name = vm.getCategoryLabel(cat);
                          if (!name) return null;
                          return /* @__PURE__ */ jsx("option", { value: name, children: name }, `${name}-${idx}`);
                        })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 mb-1", children: "O busca un producto:" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "text",
                      value: vm.editSearch,
                      onChange: (e) => vm.setEditSearch(e.target.value),
                      placeholder: "Buscar producto...",
                      className: "w-full text-sm rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] dark:text-white"
                    }
                  ),
                  vm.editSearch.length > 2 && /* @__PURE__ */ jsx("div", { className: "absolute top-full left-0 right-0 bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-800 shadow-xl rounded-b-xl z-10 max-h-48 overflow-y-auto mt-1", children: vm.searchingEdit ? /* @__PURE__ */ jsx("div", { className: "p-3 text-center text-xs text-gray-500 dark:text-gray-400", children: "Buscando..." }) : vm.editResults.length > 0 ? vm.editResults.map((p) => /* @__PURE__ */ jsxs("div", { onClick: () => {
                    vm.setEditBannerLink(`/tienda/${formData.slugTienda}/producto/${p.slug || p.id}`);
                    vm.setEditSearch("");
                  }, className: "p-3 hover:bg-[#FFF8F0] dark:hover:bg-slate-800 cursor-pointer text-sm border-b dark:border-slate-800 last:border-0 flex items-center gap-3", children: [
                    p.imagenUrl && /* @__PURE__ */ jsx("img", { src: p.imagenUrl, className: "w-8 h-8 object-contain rounded", alt: "" }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { className: "font-medium truncate dark:text-white", children: p.descripcion }),
                      /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-400 dark:text-gray-500", children: [
                        "S/ ",
                        p.precioUnitario
                      ] })
                    ] })
                  ] }, p.id)) : /* @__PURE__ */ jsx("div", { className: "p-3 text-center text-xs text-gray-500", children: "Sin resultados" }) })
                ] }),
                !vm.bannerIsSlider && /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Orden / Posici\xF3n" }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      value: vm.editBannerOrden,
                      onChange: (e) => vm.setEditBannerOrden(e.target.value === "" ? "" : Number(e.target.value)),
                      className: "w-full rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] text-sm dark:text-white",
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "", children: "Sin orden" }),
                        vm.bannerSlots.map((slot) => /* @__PURE__ */ jsxs("option", { value: slot.orden, children: [
                          slot.orden,
                          " \u2014 ",
                          slot.label,
                          " (",
                          slot.recomendado,
                          ")"
                        ] }, slot.orden))
                      ]
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2 mt-6", children: [
                /* @__PURE__ */ jsx(Button, { type: "button", color: "secondary", onClick: () => vm.setEditingBanner(null), children: "Cancelar" }),
                /* @__PURE__ */ jsx(Button, { type: "button", onClick: vm.handleUpdateBanner, disabled: saving, children: saving ? "Guardando..." : "Guardar Cambios" })
              ] })
            ] }) }),
            vm.canUploadBanner && /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 dark:bg-slate-900/30 border border-gray-200 dark:border-slate-800 rounded-xl p-5", children: [
              /* @__PURE__ */ jsx("h4", { className: "text-sm font-bold text-gray-800 dark:text-white mb-1", children: vm.bannerIsSlider ? `Agregar slide (${vm.banners.length} / 3)` : "Subir Nuevo Banner" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-4", children: vm.bannerIsSlider ? `Se asignar\xE1 como Slide ${vm.banners.length + 1}. Recomendado: ${vm.bannerSlots[0]?.recomendado || "1400\xD7500px"}` : "Elige el orden seg\xFAn la posici\xF3n que quieres en la tienda (ver gu\xEDa arriba)" }),
              /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4", children: [
                /* @__PURE__ */ jsx(InputPro, { label: "T\xEDtulo (Opcional)", name: "tituloNew", value: vm.newBannerTitle, onChange: (e) => vm.setNewBannerTitle(e.target.value), placeholder: "Ej: Ofertas Especiales" }),
                /* @__PURE__ */ jsx(InputPro, { label: "Subt\xEDtulo (Opcional)", name: "subtituloNew", value: vm.newBannerSubtitle, onChange: (e) => vm.setNewBannerSubtitle(e.target.value), placeholder: "Ej: Hasta 50% off" }),
                !vm.bannerIsSlider && /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Orden / Posici\xF3n" }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      value: vm.newBannerOrden,
                      onChange: (e) => vm.setNewBannerOrden(e.target.value === "" ? "" : Number(e.target.value)),
                      className: "w-full rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] text-sm dark:text-white",
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "", children: "Autom\xE1tico" }),
                        vm.bannerSlots.map((slot) => /* @__PURE__ */ jsxs("option", { value: slot.orden, children: [
                          slot.orden,
                          " \u2014 ",
                          slot.label,
                          " (",
                          slot.recomendado,
                          ")"
                        ] }, slot.orden))
                      ]
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                  /* @__PURE__ */ jsx("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1", children: "Enlace (Opcional)" }),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      type: "text",
                      value: vm.newBannerLink,
                      onChange: (e) => vm.setNewBannerLink(e.target.value),
                      placeholder: "/tienda/mi-tienda/producto/123",
                      className: "w-full text-sm rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] dark:text-white"
                    }
                  ),
                  /* @__PURE__ */ jsx("label", { className: "block text-xs font-medium text-gray-500 dark:text-gray-400 mt-2 mb-1", children: "O por categor\xEDa:" }),
                  /* @__PURE__ */ jsxs(
                    "select",
                    {
                      value: "",
                      onChange: (e) => {
                        const v = e.target.value;
                        if (!v) return;
                        vm.setNewBannerLink(vm.generarLinkCatalogoCategoria(v));
                        e.currentTarget.value = "";
                      },
                      className: "w-full text-sm rounded-lg border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] focus:ring-[#FF9500] focus:border-[#FF9500] dark:text-white",
                      children: [
                        /* @__PURE__ */ jsx("option", { value: "", children: "Seleccionar categor\xEDa..." }),
                        vm.storeCategories.map((cat, idx) => {
                          const name = vm.getCategoryLabel(cat);
                          if (!name) return null;
                          return /* @__PURE__ */ jsx("option", { value: name, children: name }, `${name}-${idx}`);
                        })
                      ]
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "relative mb-4", children: [
                /* @__PURE__ */ jsx("label", { className: "block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1", children: "O busca un producto para el enlace:" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "text",
                    value: vm.productSearch,
                    onChange: (e) => vm.setProductSearch(e.target.value),
                    placeholder: "Buscar producto...",
                    className: "w-full text-sm border-gray-300 dark:border-slate-800 bg-white dark:bg-[#0A0D14] rounded-lg focus:ring-[#FF9500] focus:border-[#FF9500] dark:text-white"
                  }
                ),
                vm.productSearch.length > 2 && /* @__PURE__ */ jsx("div", { className: "absolute top-full left-0 right-0 bg-white dark:bg-[#111827] border border-gray-200 dark:border-slate-800 shadow-xl rounded-b-xl z-10 max-h-48 overflow-y-auto mt-1", children: vm.searchingProducts ? /* @__PURE__ */ jsx("div", { className: "p-3 text-center text-xs text-gray-500 dark:text-gray-400", children: "Buscando..." }) : vm.productResults.length > 0 ? vm.productResults.map((p) => /* @__PURE__ */ jsxs("div", { onClick: () => {
                  vm.setNewBannerLink(`/tienda/${formData.slugTienda}/producto/${p.slug || p.id}`);
                  vm.setProductSearch("");
                }, className: "p-3 hover:bg-[#FFF8F0] dark:hover:bg-slate-800 cursor-pointer text-sm border-b dark:border-slate-800 last:border-0 flex items-center gap-3", children: [
                  p.imagenUrl && /* @__PURE__ */ jsx("img", { src: p.imagenUrl, className: "w-8 h-8 object-contain rounded", alt: "" }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("div", { className: "font-medium truncate dark:text-white", children: p.descripcion }),
                    /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-400 dark:text-gray-500", children: [
                      "S/ ",
                      p.precioUnitario
                    ] })
                  ] })
                ] }, p.id)) : /* @__PURE__ */ jsx("div", { className: "p-3 text-center text-xs text-gray-500 dark:text-gray-400", children: "Sin resultados" }) })
              ] }),
              /* @__PURE__ */ jsxs("label", { className: "flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-xl cursor-pointer bg-white dark:bg-slate-900/50 hover:bg-[#FFF8F0] dark:hover:bg-[#FF9500]/10 hover:border-[#FF9500] transition-colors", children: [
                /* @__PURE__ */ jsx("div", { className: "flex flex-col items-center justify-center py-4", children: vm.uploadingBanner ? /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx(Icon, { icon: "eos-icons:loading", className: "w-10 h-10 text-[#FF9500] mb-2 animate-spin" }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500 font-semibold", children: "Subiendo..." })
                ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx(Icon, { icon: "solar:cloud-upload-bold-duotone", className: "w-10 h-10 text-gray-400 dark:text-gray-600 mb-2" }),
                  /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-600 dark:text-gray-400", children: [
                    /* @__PURE__ */ jsx("span", { className: "font-bold", children: "Clic para subir" }),
                    " o arrastra la imagen"
                  ] }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1", children: "PNG, JPG o WEBP \xB7 m\xE1x 2.5MB" })
                ] }) }),
                /* @__PURE__ */ jsx("input", { type: "file", className: "hidden", accept: "image/png,image/jpeg,image/jpg,image/webp", onChange: vm.handleBannerFileChange, disabled: vm.uploadingBanner })
              ] })
            ] })
          ] })
        ] })
      ] }),
      vm.config?.diseno?.plantillaId === "autopartes" && /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-[#111827] rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-6", children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Icon, { icon: "solar:wheel-bold", className: "text-xl text-red-600" }),
          "Configuraci\xF3n Especial Autopartes"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h4", { className: "text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 border-b dark:border-slate-800 pb-2", children: "Hero Section" }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
              /* @__PURE__ */ jsx(
                InputPro,
                {
                  label: "T\xEDtulo del Banner Principal",
                  name: "heroTitle",
                  value: vm.config?.diseno?.heroTitle || "",
                  onChange: (e) => vm.actualizarDiseno({ heroTitle: e.target.value }),
                  placeholder: "Cat\xE1logo de Productos",
                  isLabel: true
                }
              ),
              /* @__PURE__ */ jsx(
                InputPro,
                {
                  label: "Subt\xEDtulo del Banner Principal",
                  name: "heroSubtitle",
                  value: vm.config?.diseno?.heroSubtitle || "",
                  onChange: (e) => vm.actualizarDiseno({ heroSubtitle: e.target.value }),
                  placeholder: "Encuentra los mejores repuestos...",
                  isLabel: true
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h4", { className: "text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 border-b dark:border-slate-800 pb-2", children: "Secci\xF3n Comunidad" }),
            /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
              /* @__PURE__ */ jsx(
                InputPro,
                {
                  label: "T\xEDtulo de la Comunidad",
                  name: "comunidadTitle",
                  value: vm.config?.diseno?.comunidadTitle || "",
                  onChange: (e) => vm.actualizarDiseno({ comunidadTitle: e.target.value }),
                  placeholder: "S\xE9 parte de nuestra comunidad",
                  isLabel: true
                }
              ),
              /* @__PURE__ */ jsx(
                InputPro,
                {
                  label: "Texto descriptivo",
                  name: "comunidadText",
                  value: vm.config?.diseno?.comunidadText || "",
                  onChange: (e) => vm.actualizarDiseno({ comunidadText: e.target.value }),
                  placeholder: "\xDAnete para ofertas exclusivas",
                  isLabel: true
                }
              )
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-3 pt-2", children: [
        /* @__PURE__ */ jsx(Button, { type: "button", onClick: () => window.location.reload(), disabled: saving, color: "secondary", children: "Cancelar" }),
        /* @__PURE__ */ jsx(Button, { type: "submit", disabled: saving, children: saving ? /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Icon, { icon: "eos-icons:loading", className: "animate-spin" }),
          " Guardando..."
        ] }) : "Guardar Configuraci\xF3n" })
      ] })
    ] })
  ] });
}
