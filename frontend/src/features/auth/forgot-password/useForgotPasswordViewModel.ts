import { useState, ChangeEvent } from 'react';
import useAlertStore from '@/zustand/alert';
import apiClient from '@/utils/apiClient';
import { BRAND } from '@/lib/branding';

export const useForgotPasswordViewModel = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

    const handleSubmit = async () => {
        if (!email.trim()) {
            useAlertStore.getState().alert('Por favor ingresa tu correo electrónico', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await apiClient.post('auth/forgot-password', { email: email.trim(), brand: BRAND.key });
            setSent(true);
        } catch {
            // Always show success to avoid user enumeration
            setSent(true);
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

    const handleResend = () => setSent(false);

    return { email, isLoading, sent, handleChange, handleSubmit, handleKeyDown, handleResend };
};
