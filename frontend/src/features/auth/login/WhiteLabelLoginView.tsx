import Alert from "@/components/Alert";
import Loading from "@/components/Loading";
import { BRAND } from "@/lib/branding";
import { Icon } from "@iconify/react";
import { useMemo, useState } from "react";
import { useLoginViewModel } from "./useLoginViewModel";

const toRgba = (hex: string, alpha: number): string => {
  const safeHex = (hex || "").replace("#", "").trim();
  const fullHex = safeHex.length === 3
    ? safeHex.split("").map((c) => `${c}${c}`).join("")
    : safeHex;

  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return `rgba(56,132,255,${alpha})`;
  }

  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

export default function WhiteLabelLoginView() {
  const { formValues, isLoading, auth, handleChange, handleLogin, handleKeyDown, navigate } = useLoginViewModel();
  const [showPassword, setShowPassword] = useState(false);
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("ACCESS_TOKEN");

  const primary = BRAND.primaryColor || "#3B82F6";

  // Fondo tipo "cielo": degradado azul claro → blanco + toques de la marca.
  const skyBg = useMemo(
    () =>
      `radial-gradient(120% 80% at 50% -10%, ${toRgba(primary, 0.28)} 0%, transparent 55%),` +
      `linear-gradient(180deg, #bfe0f8 0%, #d8ecfa 32%, #eaf4fc 58%, #f6fafe 100%)`,
    [primary],
  );

  if (isLoading && hasToken) return <Loading />;
  if (auth && !isLoading) return null;

  const logo = BRAND.logo || BRAND.logoWhite;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4" style={{ background: skyBg, fontFamily: "'Plus Jakarta Sans', 'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <div className="fixed top-5 right-5 z-50">
        <Alert />
      </div>

      {/* Nubes suaves inferiores */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            "radial-gradient(60% 60% at 20% 100%, rgba(255,255,255,0.9) 0%, transparent 60%)," +
            "radial-gradient(55% 55% at 55% 100%, rgba(255,255,255,0.85) 0%, transparent 60%)," +
            "radial-gradient(60% 60% at 85% 100%, rgba(255,255,255,0.9) 0%, transparent 60%)",
        }}
      />
      {/* Arcos decorativos tenues */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-60" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="arc" cx="50%" cy="40%" r="60%">
            <stop offset="60%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
          </radialGradient>
        </defs>
        <circle cx="50%" cy="42%" r="34%" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
        <circle cx="50%" cy="42%" r="46%" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      </svg>

      {/* Marca arriba a la izquierda */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl bg-white shadow-sm ring-1 ring-black/5 grid place-items-center overflow-hidden">
          {logo ? (
            <img
              src={logo}
              alt={BRAND.name}
              className="h-6 w-auto object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Icon icon="solar:shop-2-bold-duotone" className="text-slate-700 text-lg" />
          )}
        </div>
        <span className="font-bold text-slate-800 tracking-tight">{BRAND.name}</span>
      </div>

      {/* Tarjeta */}
      <div className="relative z-10 w-full max-w-[400px] rounded-[28px] border border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(30,80,160,0.35)] p-7 sm:p-8">
        {/* Icono superior */}
        <div className="mx-auto -mt-14 mb-4 h-14 w-14 rounded-2xl bg-white shadow-md ring-1 ring-black/5 grid place-items-center overflow-hidden">
          {logo ? (
            <img
              src={logo}
              alt={BRAND.name}
              className="h-8 w-auto object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <Icon icon="solar:login-3-bold-duotone" className="text-slate-800 text-2xl" />
          )}
        </div>

        <div className="text-center mb-6">
          <h1 className="text-[22px] font-bold text-slate-900">Inicia sesión</h1>
          <p className="text-[13px] text-slate-500 mt-1 leading-snug">
            Accede a tu panel de {BRAND.name} para gestionar tu negocio.
          </p>
        </div>

        <form onKeyDown={handleKeyDown} className="space-y-3">
          {/* Email */}
          <div className="relative">
            <Icon icon="solar:letter-bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              autoComplete="off"
              type="email"
              name="email"
              value={formValues.email}
              onChange={handleChange}
              placeholder="Correo electrónico"
              className="w-full h-12 pl-11 pr-4 rounded-2xl bg-slate-100/80 border border-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all"
              onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 4px ${toRgba(primary, 0.16)}`; e.currentTarget.style.borderColor = toRgba(primary, 0.5); }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "transparent"; }}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Icon icon="solar:lock-password-bold" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              autoComplete="off"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formValues.password}
              onChange={handleChange}
              placeholder="Contraseña"
              className="w-full h-12 pl-11 pr-11 rounded-2xl bg-slate-100/80 border border-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white transition-all"
              onFocus={(e) => { e.currentTarget.style.boxShadow = `0 0 0 4px ${toRgba(primary, 0.16)}`; e.currentTarget.style.borderColor = toRgba(primary, 0.5); }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "transparent"; }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 my-auto h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 transition-colors grid place-items-center"
            >
              <Icon icon={showPassword ? "solar:eye-bold" : "solar:eye-closed-bold"} className="text-lg" />
            </button>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/recuperar-contrasena")}
              className="text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            className="mt-1 w-full h-12 rounded-2xl bg-slate-900 text-white font-semibold text-sm transition-all hover:bg-slate-800 active:scale-[0.99] shadow-lg shadow-slate-900/20"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
