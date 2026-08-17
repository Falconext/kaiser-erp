import { useState, useEffect } from "react";
import { BRAND } from "@/lib/branding";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAuthStore } from "../zustand/auth";
import useAlertStore from "../zustand/alert";
import { motion } from "framer-motion";
import banner from "@/assets/fnlogin.png";

const TiendaLogin = () => {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    // Auth Store
    const { login, success, auth, isLoading: authLoading } = useAuthStore();
    const { alert } = useAlertStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (success && auth) {
            navigate("/tienda/home");
        }
    }, [success, auth, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!identifier || !password) {
            alert("Por favor ingrese su correo y contraseña", "warning");
            return;
        }

        setLoading(true);
        try {
            // Login with object payload
            await login({ correo: identifier, password });
            // Navigation handled by useEffect on success change
        } catch (error) {
            console.error("Login Error:", error);
            alert("Ocurrió un error al iniciar sesión", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
            {/* Left Section - Form */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-white z-10"
            >
                <div className="w-full max-w-md mx-auto space-y-8">
                    {/* Header */}
                    <div className="text-center lg:text-left space-y-2">
                        <div className="inline-flex items-center justify-center lg:justify-start gap-2 mb-2 p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Icon icon="solar:shop-bold-duotone" width="24" />
                            <span className="font-bold text-sm tracking-wide uppercase">Acceso Tienda</span>
                        </div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Bienvenido a tu Tienda</h1>
                        <p className="text-gray-500 text-lg">Accede para gestionar tus pedidos y catálogo.</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Correo Electrónico</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                        <Icon icon="solar:letter-bold-duotone" width="20" />
                                    </div>
                                    <input
                                        type="email"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                        placeholder="tucorreo@ejemplo.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-indigo-500 transition-colors">
                                        <Icon icon="solar:lock-password-bold-duotone" width="20" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-gray-50/50 focus:bg-white"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer" />
                                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Recordarme</span>
                            </label>
                            <Link to="/recuperar-contrasena" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-500/30 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Icon icon="line-md:loading-loop" width="24" />
                            ) : (
                                "INICIAR SESIÓN"
                            )}
                        </button>
                    </form>

                    <div className="text-center pt-4">
                        <Link to="/login" className="text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1 group">
                            <Icon icon="solar:bill-check-bold-duotone" width="16" className="group-hover:scale-110 transition-transform" />
                            ¿Buscas facturación? Ir al panel principal
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="text-center pt-8 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                            &copy; {new Date().getFullYear()} {BRAND.name}. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Right Section - Branding */}
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="hidden lg:flex w-1/2 bg-indigo-900 relative items-center justify-center p-12 overflow-hidden"
            >
                {/* Background Patterns */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-indigo-600/30 to-purple-900/40 backdrop-blur-3xl"></div>

                {/* Content */}
                <div className="relative z-10 max-w-lg text-center text-white space-y-8">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/10 shadow-2xl"
                    >
                        <img
                            src={banner}
                            alt="Dashboard Preview"
                            className="rounded-xl shadow-inner opacity-90 hover:opacity-100 transition-opacity duration-500"
                        />
                    </motion.div>

                    <div className="space-y-4">
                        <h2 className="text-3xl font-bold tracking-tight text-white">
                            Impulsa tu Tienda Virtual
                        </h2>
                        <p className="text-indigo-100 text-lg leading-relaxed">
                            Recibe pedidos por Yape/Plin, gestiona tu catálogo y vende 24/7 sin complicaciones. Tu negocio, en línea y creciendo.
                        </p>
                    </div>

                    {/* Testimonial or Trust Badges (Optional) */}
                    <div className="flex justify-center gap-4 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="h-8 w-24 bg-white/20 rounded-md animate-pulse"></div>
                        <div className="h-8 w-24 bg-white/20 rounded-md animate-pulse delay-75"></div>
                        <div className="h-8 w-24 bg-white/20 rounded-md animate-pulse delay-150"></div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default TiendaLogin;
