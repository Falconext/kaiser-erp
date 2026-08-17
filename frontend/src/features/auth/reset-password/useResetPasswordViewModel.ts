import { useState, ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAlertStore from '@/zustand/alert';
import apiClient from '@/utils/apiClient';

export const useResetPasswordViewModel = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token') ?? '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleChange = (field: 'password' | 'confirm') => (e: ChangeEvent<HTMLInputElement>) => {
        if (field === 'password') setPassword(e.target.value);
        else setConfirm(e.target.value);
    };

    const handleSubmit = async () => {
        if (!token) {
            useAlertStore.getState().alert('El enlace de recuperación es inválido.', 'error');
            return;
        }
        if (password.length < 8) {
            useAlertStore.getState().alert('La contraseña debe tener al menos 8 caracteres.', 'error');
            return;
        }
        if (password !== confirm) {
            useAlertStore.getState().alert('Las contraseñas no coinciden.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await apiClient.post('auth/reset-password', { token, password });
            setDone(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'El enlace expiró o es inválido. Solicita uno nuevo.';
            useAlertStore.getState().alert(msg, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
        }
    };

    return { password, confirm, isLoading, done, token, handleChange, handleSubmit, handleKeyDown };
};
