import { useState, useEffect, ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../zustand/auth";
import useAlertStore from "../../../zustand/alert";
import { ILoginForm, initialLoginForm } from "./LoginModel";
import { getRedirectPath } from "@/utils/permissions";
import type { IUser } from "@/interfaces/auth";

export const useLoginViewModel = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [formValues, setFormValues] = useState<ILoginForm>(initialLoginForm);
    const { login, auth, isLoading, pendingSedes, success } = useAuthStore();

    // Redirigir según estado post-login
    useEffect(() => {
        // Multi-sede: ir a pantalla de selección
        if (pendingSedes && pendingSedes.length > 0) {
            if (location.pathname !== "/sede-seleccion") {
                navigate("/sede-seleccion", { replace: true });
            }
            return;
        }
        // Login completo: redirigir al panel
        if (auth && success && typeof auth === "object" && auth.rol) {
            const token = localStorage.getItem("ACCESS_TOKEN");
            if (token) {
                let targetPath = "/administrador";
                if (auth.rol === "ADMIN_SISTEMA") {
                    targetPath = "/administrador/sistema/dashboard";
                } else if (auth.rol === "ADMIN_EMPRESA" || auth.rol === "USUARIO_EMPRESA") {
                    const computed = getRedirectPath(auth as IUser, "/administrador");
                    targetPath = computed === "/login" ? "/administrador" : computed;
                } else if (auth.rol === "RESELLER") {
                    targetPath = "/reseller";
                }

                if (location.pathname !== targetPath) {
                    navigate(targetPath, { replace: true });
                }
            }
        }
    }, [auth, success, pendingSedes, navigate, location.pathname]);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormValues((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleLogin = () => {
        if (formValues?.email && formValues?.password) {
            login(formValues);
        } else {
            useAlertStore.getState().alert("Por favor ingrese el correo y la contraseña", "error");
        }
    };

    const handleKeyDown = (event: any) => {
        if (event.key === "Enter") {
            event.preventDefault();
            handleLogin();
        }
    };

    return {
        formValues,
        isLoading,
        auth,
        handleChange,
        handleLogin,
        handleKeyDown,
        navigate,
    };
};
