import React, { useState } from "react";
import { Icon } from "@iconify/react";
import { useLoginViewModel } from "./useLoginViewModel";

/**
 * Login de Kaiser Corporation — panel de marca navy + formulario limpio.
 * Reutiliza useLoginViewModel (email/password, handleLogin, isLoading).
 */

const LINEAS = [
  { icon: "solar:test-tube-minimalistic-bold-duotone", label: "Alambres y derivados" },
  { icon: "solar:widget-4-bold-duotone", label: "Mallas plásticas y metálicas" },
  { icon: "solar:box-bold-duotone", label: "Jaulas y reja de acero" },
  { icon: "solar:leaf-bold-duotone", label: "Plásticos de alta tecnología" },
];

export default function KaiserLoginView() {
  const vm = useLoginViewModel();
  const [showPass, setShowPass] = useState(false);
  // El spinner del botón solo se muestra tras un intento REAL de login, no por
  // el isLoading global del bootstrap (auth/me al cargar la app).
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vm.formValues.email || !vm.formValues.password) { vm.handleLogin(); return; }
    setSubmitting(true);
    vm.handleLogin();
    // Failsafe: reactivar el botón si en 8s no hubo navegación (credenciales malas, etc.)
    window.setTimeout(() => setSubmitting(false), 8000);
  };

  const loading = submitting && vm.isLoading;

  return (
    <div className="min-h-screen w-full flex bg-[#f4f6f9] font-sans">
      {/* ── Panel de marca (izquierda) ── */}
      <div className="relative hidden lg:flex lg:w-[55%] xl:w-3/5 flex-col justify-between overflow-hidden p-12 xl:p-16 text-white bg-gradient-to-br from-[#214878] via-[#17335a] to-[#0e2340]">
        {/* Brillos suaves (sin patrón) */}
        <div className="pointer-events-none absolute -top-32 -right-24 z-0 h-[28rem] w-[28rem] rounded-full bg-[#37b7c6]/15 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-32 z-0 h-[30rem] w-[30rem] rounded-full bg-[#3b6aa0]/25 blur-[120px]" />
        {/* Isotipo gigante como marca de agua */}
        <img
          src="/kaiser-isotipo-white.png"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -right-10 z-0 w-[26rem] opacity-[0.04]"
        />

        {/* Marca */}
        <div className="relative z-10 flex items-center gap-4">
          <img src="/kaiser-isotipo-white.png" alt="Kaiser" className="h-14 w-14 object-contain" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-wide leading-none">KAISER</h1>
            <p className="text-[13px] font-medium tracking-[0.2em] text-[#8fc7d2]">CORPORATION S.A.</p>
          </div>
        </div>

        {/* Mensaje central */}
        <div className="relative z-10 max-w-lg">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.25em] text-[#8fc7d2]">
            Sistema de gestión interno
          </p>
          <h2 className="text-4xl xl:text-5xl font-extrabold leading-[1.1] tracking-tight text-white text-balance">
            Soluciones industriales para el sector productivo.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            Más de 45 años fabricando y distribuyendo soluciones plásticas y metálicas
            para el agro, avicultura, minería y construcción en todo el Perú.
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-3">
            {LINEAS.map((l) => (
              <li key={l.label} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3.5 py-2.5 ring-1 ring-white/10">
                <Icon icon={l.icon} width={20} className="text-[#37b7c6] shrink-0" />
                <span className="text-[13px] font-medium text-white/85">{l.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Pie */}
        <p className="relative z-10 text-[12px] text-white/40">
          © {new Date().getFullYear()} Kaiser Corporation S.A. · Jr. Francia 1028, La Victoria, Lima
        </p>
      </div>

      {/* ── Formulario (derecha) ── */}
      <div className="flex w-full lg:w-[45%] xl:w-2/5 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          {/* Marca compacta (solo móvil) */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <img src="/kaiser-isotipo.png" alt="Kaiser" className="h-11 w-11 object-contain" />
            <div>
              <h1 className="text-xl font-extrabold tracking-wide text-[#17335a] leading-none">KAISER</h1>
              <p className="text-[11px] font-medium tracking-[0.18em] text-[#3b6aa0]">CORPORATION S.A.</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-[26px] font-extrabold tracking-tight text-slate-800">Bienvenido</h2>
            <p className="mt-1 text-[14px] text-slate-500">Ingresa a tu panel de gestión Kaiser.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Correo electrónico</label>
              <div className="relative">
                <Icon icon="solar:letter-bold-duotone" width={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={vm.formValues.email}
                  onChange={vm.handleChange}
                  onKeyDown={vm.handleKeyDown}
                  placeholder="usuario@kaisercorp.com.pe"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3.5 text-[14px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#214878] focus:ring-4 focus:ring-[#214878]/10"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Contraseña</label>
              <div className="relative">
                <Icon icon="solar:lock-password-bold-duotone" width={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  name="password"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={vm.formValues.password}
                  onChange={vm.handleChange}
                  onKeyDown={vm.handleKeyDown}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-[14px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#214878] focus:ring-4 focus:ring-[#214878]/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  title={showPass ? "Ocultar" : "Mostrar"}
                >
                  <Icon icon={showPass ? "solar:eye-closed-bold" : "solar:eye-bold"} width={18} />
                </button>
              </div>
            </div>

            {/* Olvidé contraseña */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => vm.navigate("/recuperar-contrasena")}
                className="text-[13px] font-semibold text-[#214878] hover:text-[#17335a] transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#214878] to-[#17335a] text-[15px] font-bold text-white shadow-lg shadow-[#214878]/25 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Ingresando…
                </>
              ) : (
                <>
                  Ingresar
                  <Icon icon="solar:arrow-right-linear" width={18} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[12px] text-slate-400">
            Acceso exclusivo para personal autorizado de Kaiser Corporation S.A.
          </p>
        </div>
      </div>
    </div>
  );
}
