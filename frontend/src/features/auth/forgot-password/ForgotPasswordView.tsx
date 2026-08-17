import React from 'react';
import Alert from '@/components/Alert';
import { BRAND } from '@/lib/branding';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import loginPhoto from '@/assets/auth-side-image.png';
import { useForgotPasswordViewModel } from './useForgotPasswordViewModel';

const ACCENT = '#642AE5';

export default function ForgotPasswordView() {
    const navigate = useNavigate();
    const { email, isLoading, sent, handleChange, handleSubmit, handleKeyDown, handleResend } = useForgotPasswordViewModel();

    return (
        <>
            <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; }
                .fp-root {
                    min-height: 100vh; width: 100%;
                    display: flex; font-family: 'Inter', sans-serif; background: #fff;
                }
                .fp-left {
                    width: 48%; flex-shrink: 0;
                    position: relative; overflow: hidden;
                }
                .fp-left img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .fp-overlay {
                    position: absolute; inset: 0;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.7) 100%);
                }
                .fp-logo-wrap {
                    position: absolute; top: 28px; left: 28px;
                    display: flex; align-items: center; gap: 8px; z-index: 2;
                }
                .fp-logo-icon {
                    width: 36px; height: 36px;
                    background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
                    border-radius: 10px; display: flex; align-items: center; justify-content: center;
                    border: 1px solid rgba(255,255,255,0.25); overflow: hidden;
                }
                .fp-right {
                    flex: 1; display: flex; flex-direction: column;
                    align-items: center; background: #fff;
                }
                .fp-form-wrap {
                    flex: 1; display: flex; flex-direction: column;
                    justify-content: center; padding: 48px 40px;
                    max-width: 480px; width: 100%;
                }
                .fp-input {
                    width: 100%; padding: 13px 16px;
                    border: 1.5px solid #E5E7EB; border-radius: 10px;
                    font-size: 14px; color: #111; outline: none;
                    background: #fff; transition: border-color 0.2s, box-shadow 0.2s;
                }
                .fp-input::placeholder { color: #C0C4CC; }
                .fp-input:focus { border-color: ${ACCENT}; box-shadow: 0 0 0 3px ${ACCENT}20; }
                .fp-btn {
                    width: 100%; padding: 15px; border-radius: 10px;
                    background: ${ACCENT}; color: #fff; font-size: 15px;
                    font-weight: 700; border: none; cursor: pointer;
                    box-shadow: 0 6px 20px ${ACCENT}40;
                    transition: opacity 0.2s, transform 0.1s;
                }
                .fp-btn:hover { opacity: 0.88; }
                .fp-btn:active { transform: scale(0.98); }
                .fp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
@media (max-width: 768px) { .fp-left { display: none; } .fp-form-wrap { padding: 60px 28px; } }
            `}</style>

            <div className="fp-root">
                <div className="fixed top-5 right-5 z-50"><Alert /></div>

                {/* Left photo */}
                <div className="fp-left">
                    <img src={loginPhoto} alt={BRAND.name} />
                    <div className="fp-overlay" />
                    <div className="fp-logo-wrap">
                        <div className="fp-logo-icon">
                            <img src={BRAND.logoWhite} alt={BRAND.name} style={{ height: 22, objectFit: 'contain' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                    </div>
                </div>

                {/* Right form */}
                <div className="fp-right">
                    <div className="fp-form-wrap">
                        {sent ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                {/* Icono con glow radial en color de marca */}
                                <div style={{
                                    width: 88, height: 88, borderRadius: '50%',
                                    background: `${ACCENT}12`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginBottom: 28,
                                    boxShadow: `0 0 0 14px ${ACCENT}08`,
                                }}>
                                    <Icon icon="solar:letter-opened-bold-duotone" style={{ fontSize: 42, color: ACCENT }} />
                                </div>

                                {/* Título */}
                                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', marginBottom: 10, letterSpacing: '-0.4px' }}>
                                    Correo enviado
                                </h1>
                                <p style={{ fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 1.6, maxWidth: 320 }}>
                                    Enviamos las instrucciones de recuperación a:
                                </p>

                                {/* Pill del email — recibo de envío */}
                                <div style={{
                                    background: '#F9FAFB', border: '1.5px solid #E5E7EB',
                                    borderRadius: 10, padding: '10px 22px',
                                    fontSize: 14, fontWeight: 600, color: '#111',
                                    letterSpacing: '0.01em', marginBottom: 20,
                                    maxWidth: '100%', wordBreak: 'break-all',
                                }}>
                                    {email}
                                </div>

                                {/* Badge de expiración en tint de marca */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    background: `${ACCENT}0E`, border: `1px solid ${ACCENT}22`,
                                    borderRadius: 8, padding: '8px 14px',
                                    fontSize: 12, color: ACCENT, fontWeight: 500,
                                    marginBottom: 32,
                                }}>
                                    <Icon icon="solar:clock-circle-bold" style={{ fontSize: 14, flexShrink: 0 }} />
                                    El enlace expira en 15 min · Revisa también spam
                                </div>

                                {/* Botón primario */}
                                <button
                                    onClick={() => navigate('/login')}
                                    className="fp-btn"
                                    style={{ marginBottom: 16 }}
                                >
                                    Volver al inicio de sesión
                                </button>

                                {/* Reintento secundario */}
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', padding: 0 }}
                                >
                                    ¿No llegó el correo? Reintentar
                                </button>
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate('/login')}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 13, marginBottom: 32, padding: 0 }}
                                >
                                    <Icon icon="solar:arrow-left-linear" style={{ fontSize: 16 }} />
                                    Volver al inicio de sesión
                                </button>
                                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111', marginBottom: 6 }}>
                                    ¿Olvidaste tu contraseña?
                                </h1>
                                <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 32, lineHeight: 1.5 }}>
                                    Ingresa tu correo y te enviaremos un enlace para recuperar el acceso a tu cuenta.
                                </p>

                                <form onKeyDown={handleKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                                            Correo electrónico
                                        </label>
                                        <input
                                            className="fp-input"
                                            type="email"
                                            value={email}
                                            onChange={handleChange}
                                            placeholder="correo@empresa.com"
                                            autoComplete="email"
                                        />
                                    </div>

                                    <button type="button" className="fp-btn" onClick={handleSubmit} disabled={isLoading}>
                                        {isLoading ? (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                <Icon icon="solar:spinner-bold" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} />
                                                Enviando...
                                            </span>
                                        ) : 'Enviar instrucciones'}
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
