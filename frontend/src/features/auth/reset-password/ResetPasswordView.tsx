import React, { useState } from 'react';
import Alert from '@/components/Alert';
import { BRAND } from '@/lib/branding';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import loginPhoto from '@/assets/auth-side-image.png';
import { useResetPasswordViewModel } from './useResetPasswordViewModel';

const ACCENT = BRAND.primaryColor || '#642AE5';

export default function ResetPasswordView() {
    const navigate = useNavigate();
    const { password, confirm, isLoading, done, token, handleChange, handleSubmit, handleKeyDown } = useResetPasswordViewModel();
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <>
            <style>{`
                * { box-sizing: border-box; margin: 0; padding: 0; }
                .rp-root {
                    min-height: 100vh; width: 100%;
                    display: flex; font-family: 'Inter', sans-serif; background: #fff;
                }
                .rp-left {
                    width: 48%; flex-shrink: 0;
                    position: relative; overflow: hidden;
                }
                .rp-left img { width: 100%; height: 100%; object-fit: cover; display: block; }
                .rp-overlay {
                    position: absolute; inset: 0;
                    background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.7) 100%);
                }
                .rp-logo-wrap {
                    position: absolute; top: 28px; left: 28px;
                    display: flex; align-items: center; gap: 8px; z-index: 2;
                }
                .rp-logo-icon {
                    width: 36px; height: 36px;
                    background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
                    border-radius: 10px; display: flex; align-items: center; justify-content: center;
                    border: 1px solid rgba(255,255,255,0.25); overflow: hidden;
                }
                .rp-right {
                    flex: 1; display: flex; flex-direction: column;
                    align-items: center; background: #fff;
                }
                .rp-form-wrap {
                    flex: 1; display: flex; flex-direction: column;
                    justify-content: center; padding: 48px 40px;
                    max-width: 480px; width: 100%;
                }
                .rp-input {
                    width: 100%; padding: 13px 46px 13px 16px;
                    border: 1.5px solid #E5E7EB; border-radius: 10px;
                    font-size: 14px; color: #111; outline: none;
                    background: #fff; transition: border-color 0.2s, box-shadow 0.2s;
                }
                .rp-input::placeholder { color: #C0C4CC; }
                .rp-input:focus { border-color: ${ACCENT}; box-shadow: 0 0 0 3px ${ACCENT}20; }
                .rp-btn {
                    width: 100%; padding: 15px; border-radius: 10px;
                    background: ${ACCENT}; color: #fff; font-size: 15px;
                    font-weight: 700; border: none; cursor: pointer;
                    box-shadow: 0 6px 20px ${ACCENT}40;
                    transition: opacity 0.2s, transform 0.1s;
                }
                .rp-btn:hover { opacity: 0.88; }
                .rp-btn:active { transform: scale(0.98); }
                .rp-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                .rp-strength-bar { height: 4px; border-radius: 2px; transition: width 0.3s, background 0.3s; }
                @media (max-width: 768px) { .rp-left { display: none; } .rp-form-wrap { padding: 60px 28px; } }
            `}</style>

            <div className="rp-root">
                <div className="fixed top-5 right-5 z-50"><Alert /></div>

                {/* Left photo */}
                <div className="rp-left">
                    <img src={loginPhoto} alt={BRAND.name} />
                    <div className="rp-overlay" />
                    <div className="rp-logo-wrap">
                        <div className="rp-logo-icon">
                            <img src={BRAND.logoWhite} alt={BRAND.name} style={{ height: 22, objectFit: 'contain' }}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                    </div>
                </div>

                {/* Right form */}
                <div className="rp-right">
                    <div className="rp-form-wrap">
                        {done ? (
                            <div style={{ textAlign: 'center', padding: '32px 24px', background: '#F0FDF4', borderRadius: 16, border: '1.5px solid #86EFAC' }}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#166534', marginBottom: 8 }}>
                                    ¡Contraseña actualizada!
                                </h2>
                                <p style={{ fontSize: 14, color: '#15803D', lineHeight: 1.6 }}>
                                    Tu contraseña fue cambiada correctamente. Redirigiendo al inicio de sesión...
                                </p>
                            </div>
                        ) : !token ? (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
                                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#B45309', marginBottom: 8 }}>Enlace inválido</h2>
                                <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 24 }}>
                                    Este enlace de recuperación no es válido o ha expirado.
                                </p>
                                <button onClick={() => navigate('/recuperar-contrasena')}
                                    style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}>
                                    Solicitar nuevo enlace
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
                                    Nueva contraseña
                                </h1>
                                <p style={{ fontSize: 14, color: '#9CA3AF', marginBottom: 32, lineHeight: 1.5 }}>
                                    Crea una contraseña segura de al menos 8 caracteres.
                                </p>

                                <form onKeyDown={handleKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {/* Password */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                                            Nueva contraseña
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className="rp-input"
                                                type={showPass ? 'text' : 'password'}
                                                value={password}
                                                onChange={handleChange('password')}
                                                placeholder="Mínimo 8 caracteres"
                                            />
                                            <button type="button" onClick={() => setShowPass(!showPass)}
                                                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0 }}>
                                                <Icon icon={showPass ? 'solar:eye-bold' : 'solar:eye-closed-bold'} style={{ fontSize: 18 }} />
                                            </button>
                                        </div>
                                        {/* Strength indicator */}
                                        {password.length > 0 && (
                                            <div style={{ marginTop: 8 }}>
                                                <div style={{ height: 4, borderRadius: 2, background: '#E5E7EB' }}>
                                                    <div className="rp-strength-bar" style={{
                                                        width: password.length < 8 ? '33%' : password.length < 12 ? '66%' : '100%',
                                                        background: password.length < 8 ? '#EF4444' : password.length < 12 ? '#F59E0B' : '#22C55E',
                                                    }} />
                                                </div>
                                                <p style={{ fontSize: 11, color: password.length < 8 ? '#EF4444' : password.length < 12 ? '#F59E0B' : '#22C55E', marginTop: 4 }}>
                                                    {password.length < 8 ? 'Demasiado corta' : password.length < 12 ? 'Aceptable' : 'Contraseña fuerte'}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                                            Confirmar contraseña
                                        </label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className="rp-input"
                                                type={showConfirm ? 'text' : 'password'}
                                                value={confirm}
                                                onChange={handleChange('confirm')}
                                                placeholder="Repite tu contraseña"
                                            />
                                            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                                                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0 }}>
                                                <Icon icon={showConfirm ? 'solar:eye-bold' : 'solar:eye-closed-bold'} style={{ fontSize: 18 }} />
                                            </button>
                                        </div>
                                        {confirm.length > 0 && password !== confirm && (
                                            <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Las contraseñas no coinciden</p>
                                        )}
                                    </div>

                                    <button type="button" className="rp-btn" onClick={handleSubmit} disabled={isLoading}>
                                        {isLoading ? (
                                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                <Icon icon="solar:spinner-bold" style={{ fontSize: 18, animation: 'spin 1s linear infinite' }} />
                                                Guardando...
                                            </span>
                                        ) : 'Cambiar contraseña'}
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
