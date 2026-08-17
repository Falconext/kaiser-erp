# Recuperar Contraseña — Multi-brand & UX Fix

**Fecha:** 2026-05-31  
**Estado:** Aprobado  
**Alcance:** Frontend (forgot-password, reset-password, login views) + Backend (auth.service, DTO, email template)

---

## Problema

El flujo de recuperación de contraseña ya existe end-to-end, pero tiene cuatro defectos:

1. **Foto hardcodeada:** `ForgotPasswordView` y `ResetPasswordView` siempre importan `krezka_login_photo.png` independientemente de la marca activa.
2. **Color hardcodeado:** `ForgotPasswordView` define `const ACCENT = '#642AE5'` (púrpura Krezka) en vez de leer `BRAND.primaryColor`.
3. **Estado de éxito pobre:** Tras enviar el correo, se muestra un card verde genérico flotando en espacio blanco. Sin acción clara, sin mostrar a qué email se envió, sin botón de reenvío.
4. **Email llega con marca incorrecta:** El backend usa variables de entorno globales (`APP_NAME`, `RESEND_FROM_EMAIL`, `FRONTEND_URL`, colores hardcodeados en el template) sin saber qué marca inició el request, por lo que el email siempre llega como Krezka aunque el usuario esté en Falconext.
5. **Rutas en inglés:** `/forgot-password` y `/reset-password` deben ser `/recuperar-contrasena` y `/restablecer-contrasena`.

---

## Solución

### Capa 1 — Frontend: vistas brand-aware

**`ForgotPasswordView.tsx`**
- Importar ambas fotos; seleccionar según `BRAND.authBrand`:
  ```ts
  import krezkaPhoto from '@/assets/krezka_login_photo.png';
  import falconextPhoto from '@/assets/fnlogin.png';
  const loginPhoto = BRAND.authBrand === 'falconext' ? falconextPhoto : krezkaPhoto;
  ```
- Cambiar `const ACCENT = '#642AE5'` → `const ACCENT = BRAND.primaryColor || '#642AE5'`
- Rediseñar el estado de éxito (ver sección "Estado de éxito" abajo)

**`ResetPasswordView.tsx`**
- Misma lógica de foto dinámica (el ACCENT ya usa `BRAND.primaryColor` ✅)

**Comportamiento por marca:**

| Marca (`VITE_PUBLIC_BRAND`) | Foto | Color accent |
|---|---|---|
| `krezka` | `krezka_login_photo.png` | `#00D0D4` |
| `falconext` | `fnlogin.png` | `#3E2BC7` |
| white-label | `krezka_login_photo.png` (fallback) | `BRAND.primaryColor` del tenant |

---

### Capa 2 — Frontend: nuevo estado de éxito

Reemplazar el card verde genérico por un layout centrado y branded:

- Icono `solar:letter-opened-bold-duotone` de `@iconify/react` en círculo con `ACCENT` color
- Título: **"Correo enviado"**
- Subtítulo: "Enviamos las instrucciones a `{email}`" (mostrar el email real que ingresó)
- Nota: "El enlace es válido por 15 minutos. Revisa también tu carpeta de spam."
- Botón primario: "Volver al inicio de sesión" (con `ACCENT`)
- Link secundario: "¿No llegó? Reenviar correo" (resetea el estado para volver al formulario)

El `useForgotPasswordViewModel` debe exponer `email` en su return para que la vista pueda mostrarlo.

---

### Capa 3 — Frontend: pasar brand al backend

**`useForgotPasswordViewModel.ts`**
```ts
await apiClient.post('auth/forgot-password', { email: email.trim(), brand: BRAND.key });
```

---

### Capa 4 — Rutas en español

**`App.tsx`** — renombrar rutas:
```
/forgot-password  → /recuperar-contrasena
/reset-password   → /restablecer-contrasena
```

Mantener rutas antiguas como redirect para no romper enlaces existentes:
```tsx
<Route path="/forgot-password" element={<Navigate to="/recuperar-contrasena" replace />} />
<Route path="/reset-password" element={<Navigate to="/restablecer-contrasena" replace />} />
```

Actualizar todos los `navigate('/forgot-password')` → `navigate('/recuperar-contrasena')` en:
- `KrezkaLoginView.tsx`
- `FalconextLoginView.tsx`
- `WhiteLabelLoginView.tsx`
- `TiendaLogin.tsx`
- `ResetPasswordView.tsx` (el botón "Solicitar nuevo enlace")

---

### Capa 5 — Backend: email brand-aware

**`forgot-password.dto.ts`**
```ts
@IsOptional()
@IsString()
brand?: string;
```

**`auth.service.ts` — `forgotPassword(email, brand?)`**

Tabla de configuración por marca (fallback a env vars si brand es desconocido):
```ts
const brandConfigs: Record<string, { appName: string; fromEmail: string; frontendUrl: string; primaryColor: string }> = {
  falconext: {
    appName: 'Falconext',
    fromEmail: 'noreply@falconext.pe',
    frontendUrl: 'https://app.falconext.pe',
    primaryColor: '#3E2BC7',
  },
  krezka: {
    appName: 'Krezka',
    fromEmail: 'noreply@krezka.com',
    frontendUrl: 'https://app.krezka.com',
    primaryColor: '#00D0D4',
  },
};
const cfg = brandConfigs[brand ?? ''] ?? {
  appName: this.config.get('APP_NAME') ?? 'Falconext',
  fromEmail: this.config.get('RESEND_FROM_EMAIL') ?? 'noreply@falconext.pe',
  frontendUrl: this.config.get('FRONTEND_URL') ?? 'http://localhost:5173',
  primaryColor: '#3E2BC7',
};
```

El `resetUrl` usa `cfg.frontendUrl + '/restablecer-contrasena?token=' + token`.

**`RecuperacionPasswordEmail.tsx`**  
Agregar prop `primaryColor: string` y reemplazar las 3 ocurrencias de `#642AE5` hardcodeado por dicha prop.

**`auth.controller.ts`**  
Pasar el nuevo parámetro `brand` al servicio:
```ts
await this.authService.forgotPassword(dto.email, dto.brand);
```

---

## Archivos a modificar

| Archivo | Tipo de cambio |
|---|---|
| `frontend/src/features/auth/forgot-password/ForgotPasswordView.tsx` | Foto dinámica, ACCENT por BRAND, nuevo estado éxito |
| `frontend/src/features/auth/forgot-password/useForgotPasswordViewModel.ts` | Enviar brand, exponer email en return |
| `frontend/src/features/auth/reset-password/ResetPasswordView.tsx` | Foto dinámica |
| `frontend/src/App.tsx` | Rutas en español + redirects compatibilidad |
| `frontend/src/features/auth/login/KrezkaLoginView.tsx` | navigate a nueva ruta |
| `frontend/src/features/auth/login/FalconextLoginView.tsx` | navigate a nueva ruta |
| `frontend/src/features/auth/login/WhiteLabelLoginView.tsx` | navigate a nueva ruta |
| `frontend/src/pages/TiendaLogin.tsx` | navigate a nueva ruta |
| `backend/src/auth/dto/forgot-password.dto.ts` | Agregar `brand?: string` |
| `backend/src/auth/auth.service.ts` | Lookup config por brand, pasar primaryColor al email |
| `backend/src/auth/auth.controller.ts` | Pasar brand al servicio |
| `backend/src/auth/emails/RecuperacionPasswordEmail.tsx` | Prop `primaryColor` dinámica |

---

## Lo que NO cambia

- ViewModels de reset-password (lógica intacta)
- Schema Prisma (los campos `passwordResetToken`/`passwordResetExpires` ya existen)
- Lógica de seguridad (anti-enumeración, expiración 15 min, invalidar refresh tokens)
- Los 4 estilos CSS en línea de los paneles izquierdo/derecho (solo la foto y el color cambian)
