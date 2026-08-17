import Alert from "@/components/Alert";
import Loading from "@/components/Loading";
import { BRAND } from "@/lib/branding";
import { Icon } from "@iconify/react";
import { useEffect, useState } from "react";
import { useLoginViewModel } from "./useLoginViewModel";

// ── Paleta Vision UI Dashboard (cover sign-in) ───────────────────────────────
// Fondo de espacio profundo azul/violeta + acento en degradado azul→cian.
const BG_GRADIENT =
  "linear-gradient(159.02deg, #0F123B 14.25%, #090D2E 56.45%, #020515 86.14%)";
const BTN_GRADIENT =
  "linear-gradient(94.56deg, #0075FF 79.99%, #21D4FD 145.83%)";
const COVER_GRADIENT =
  "radial-gradient(120% 120% at 70% 15%, #7551FF 0%, #582CFF 30%, #1B1F5B 62%, #0B0F33 100%)";

export default function VendifyLoginView() {
  const { formValues, isLoading, auth, handleChange, handleLogin, navigate } = useLoginViewModel();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  // Spinner del botón: solo mientras SE ESTÁ enviando el login (no durante el
  // auth/me de fondo que restaura la sesión al cargar la página).
  const [submitting, setSubmitting] = useState(false);
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("ACCESS_TOKEN");

  // Rótulo del portal según la marca del dominio (white-label). En el dominio
  // de un reseller muestra SU marca; en el dominio base muestra algo neutro —
  // así un cliente nunca ve "Panel de Distribuidores".
  const portalLabel = BRAND.isWhiteLabel ? `Panel de ${BRAND.name}` : "Panel administrativo";

  // Cuando el store deja de cargar, se libera el estado local de envío.
  useEffect(() => {
    if (!isLoading) setSubmitting(false);
  }, [isLoading]);

  const onSubmit = () => {
    if (!formValues.email || !formValues.password || submitting) return;
    setSubmitting(true);
    handleLogin();
  };

  const onKeyDown = (e: any) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  if (isLoading && hasToken) return <Loading />;
  if (auth && !isLoading) return null;

  return (
    <div className="min-h-screen relative overflow-hidden flex" style={{ background: BG_GRADIENT, fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes vu-float { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-22px) scale(1.05); } }
        @keyframes vu-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes vu-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .vu-in { animation: vu-in .7s cubic-bezier(.16,1,.3,1) both; }
        .vu-input:focus { border-color: #21D4FD !important; box-shadow: 0 0 0 4px rgba(33,212,253,.18) !important; }
      `}</style>

      {/* Estrellas / grid muy sutil sobre todo el fondo */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,.6) 0, transparent 100%), radial-gradient(1px 1px at 65% 70%, rgba(255,255,255,.5) 0, transparent 100%), radial-gradient(1.5px 1.5px at 85% 20%, rgba(255,255,255,.7) 0, transparent 100%), radial-gradient(1px 1px at 40% 85%, rgba(255,255,255,.5) 0, transparent 100%)",
        }} />

      <div className="fixed top-5 right-5 z-50"><Alert /></div>

      {/* ── Panel COVER (derecha) ────────────────────────────────────────────── */}
      <div className="hidden lg:block absolute top-0 right-0 h-full w-[52%] overflow-hidden"
        style={{ background: COVER_GRADIENT, borderBottomLeftRadius: "200px" }}>
        {/* Imagen de banner */}
        <div className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/banner.png')" }} />
        {/* Velo de degradado para legibilidad del texto */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(11,15,51,.35) 0%, rgba(11,15,51,.15) 45%, rgba(11,15,51,.85) 100%)" }} />

        {/* Órbita / planeta con glow */}
        <div className="absolute -top-24 -right-24 w-[34rem] h-[34rem] rounded-full blur-[90px] opacity-50"
          style={{ background: "radial-gradient(circle, #21D4FD, transparent 62%)", animation: "vu-float 10s ease-in-out infinite" }} />
        <div className="absolute bottom-10 left-8 w-[26rem] h-[26rem] rounded-full blur-[110px] opacity-30"
          style={{ background: "radial-gradient(circle, #7551FF, transparent 60%)", animation: "vu-float 13s ease-in-out infinite" }} />

        {/* Anillos orbitales decorativos */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full border border-white/10"
          style={{ animation: "vu-orbit 40s linear infinite" }}>
          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,.8)]" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20rem] h-[20rem] rounded-full border border-white/[0.08]" />

        {/* Logo arriba */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-2.5">
          {BRAND.logoWhite || BRAND.logo ? (
            <img src={BRAND.logoWhite || BRAND.logo} alt={BRAND.name}
              className="h-9 w-9 rounded-xl object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <Icon icon="solar:bag-smile-bold" className="text-white text-2xl" />
          )}
          <span className="text-white text-lg font-black tracking-tight">{BRAND.name}</span>
        </div>

        {/* Tagline inferior */}
        <div className="absolute inset-x-0 bottom-24 text-center px-10">
          <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-white/70">
            Inspirado en el futuro:
          </p>
          <h2 className="mt-3 text-3xl xl:text-[2.6rem] leading-tight font-black text-white">
            EL PANEL DE {String(BRAND.name).toUpperCase()}
          </h2>
        </div>
      </div>

      {/* ── Panel FORM (izquierda) ───────────────────────────────────────────── */}
      <div className="relative z-10 w-full lg:w-[48%] flex items-center justify-center px-6 sm:px-10 py-12">
        <div className="w-full max-w-[420px] vu-in">
          {/* Logo compacto (mobile) */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            {BRAND.logo ? (
              <img src={BRAND.logo} alt={BRAND.name} className="h-10 w-10 rounded-xl object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <Icon icon="solar:bag-smile-bold" className="text-white text-2xl" />
            )}
            <span className="text-white text-xl font-black tracking-tight">{BRAND.name}</span>
          </div>

          <p className="text-sm font-bold uppercase tracking-[0.18em]" style={{ color: "#21D4FD" }}>
            {portalLabel}
          </p>
          <h1 className="mt-3 text-[2rem] font-black text-white leading-tight">¡Qué bueno verte!</h1>
          <p className="mt-2 text-[15px] text-slate-400">
            Ingresa tu correo y contraseña para acceder.
          </p>

          <form onKeyDown={onKeyDown} className="mt-8 space-y-5" autoComplete="off">
            <div>
              <label className="block text-sm font-semibold text-white mb-2 ml-1">Correo electrónico</label>
              <input
                autoComplete="off"
                type="email"
                name="email"
                value={formValues.email}
                onChange={handleChange}
                placeholder="Tu correo electrónico"
                className="vu-input w-full h-[50px] px-5 rounded-[15px] bg-transparent border-2 border-white/25 text-[15px] text-white placeholder:text-slate-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2 ml-1">Contraseña</label>
              <div className="relative">
                <input
                  autoComplete="off"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formValues.password}
                  onChange={handleChange}
                  placeholder="Tu contraseña"
                  className="vu-input w-full h-[50px] px-5 pr-12 rounded-[15px] bg-transparent border-2 border-white/25 text-[15px] text-white placeholder:text-slate-500 outline-none transition-all"
                />
                <button type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3.5 my-auto h-8 w-8 rounded-lg text-slate-500 hover:text-white transition-colors grid place-items-center">
                  <Icon icon={showPassword ? "solar:eye-bold" : "solar:eye-closed-bold"} className="text-xl" />
                </button>
              </div>
            </div>

            {/* Remember me toggle + olvidé contraseña */}
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setRemember((v) => !v)}
                className="flex items-center gap-3 group">
                <span className="relative inline-flex h-[22px] w-[42px] items-center rounded-full transition-colors"
                  style={{ background: remember ? BTN_GRADIENT : "rgba(255,255,255,.15)" }}>
                  <span className="inline-block h-[16px] w-[16px] rounded-full bg-white shadow transition-transform"
                    style={{ transform: remember ? "translateX(23px)" : "translateX(3px)" }} />
                </span>
                <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                  Recordarme
                </span>
              </button>
              <button type="button" onClick={() => navigate("/recuperar-contrasena")}
                className="text-sm font-semibold transition-colors hover:opacity-80" style={{ color: "#21D4FD" }}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button type="button" onClick={onSubmit} disabled={submitting}
              className="group w-full h-[52px] rounded-[16px] text-white font-bold text-sm uppercase tracking-wide transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: BTN_GRADIENT, boxShadow: "0 16px 34px rgba(0,117,255,.35)" }}>
              {submitting ? <Icon icon="eos-icons:loading" className="animate-spin text-lg" /> : (
                <>
                  Iniciar sesión
                  <Icon icon="solar:arrow-right-linear" className="text-lg transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-9 flex items-center justify-center gap-1.5 text-sm">
            <span className="text-slate-400">¿Aún no tienes una cuenta?</span>
            <button type="button" onClick={() => navigate("/tienda/login")}
              className="font-bold transition-colors hover:opacity-80" style={{ color: "#21D4FD" }}>
              Ir a mi tienda
            </button>
          </div>

          <p className="mt-10 text-center text-xs text-slate-600">
            © {new Date().getFullYear()} {BRAND.name}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
