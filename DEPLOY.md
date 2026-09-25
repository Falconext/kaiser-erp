# Deploy — Kaiser ERP

Arquitectura de despliegue:

- **Frontend** (React/Vite) → **Vercel**
- **Backend** (NestJS) → **Railway** (servidor persistente: WebSockets, cron, Puppeteer)
- **Base de datos** (PostgreSQL) → **Neon**

---

## 1. Base de datos — Neon

1. En [neon.tech](https://neon.tech) crea un proyecto `kaiser-erp` (región cercana, ej. AWS us-east).
2. Copia la **connection string** (formato `postgresql://user:pass@ep-xxx.neon.tech/kaiser_erp?sslmode=require`).
3. Esa string es el `DATABASE_URL` que usará Railway.

> El schema se aplica solo: el `startCommand` de Railway corre `prisma db push`, y al primer arranque `initializeDatabase()` siembra empresa Kaiser, sede, usuarios, módulos y autorizadores.
> Para cargar el catálogo/costos/precios, corre una vez (apuntando DATABASE_URL a Neon): `pnpm run import:kaiser && pnpm run import:costos`.

---

## 2. Backend — Railway

Repo: subcarpeta `backend/`. Configs ya incluidas: `railway.json` (build/start) y `nixpacks.toml` (Chromium para Puppeteer).

### Variables de entorno (Railway → Variables)

**Imprescindibles:**
```
DATABASE_URL          = <connection string de Neon>
JWT_SECRET            = <generar: openssl rand -hex 32>
JWT_REFRESH_SECRET    = <generar: openssl rand -hex 32, distinto del anterior>
JWT_ACCESS_EXPIRES_IN = 1d
JWT_REFRESH_EXPIRES_IN= 7d
BCRYPT_SALT_ROUNDS    = 10
NODE_ENV              = production
FRONTEND_URL          = https://<tu-app>.vercel.app
```
> `PORT` lo inyecta Railway automáticamente. El CORS ya acepta cualquier `*.vercel.app`.

> ⚠ **Nunca escribas los secretos en este archivo ni en ningún otro del repo.**
> Genéralos con `openssl rand -hex 32` y pégalos solo en Railway → Variables.
> Los valores que estuvieron aquí hasta septiembre de 2026 quedaron en el
> historial de git y deben considerarse comprometidos: si alguna vez se usaron
> en un entorno real, rótalos (al cambiarlos, todas las sesiones activas se
> invalidan y los usuarios vuelven a iniciar sesión).

**Opcionales (según features que se usen):**
```
RENIEC_TOKEN          = <apiperu.dev>   # búsqueda DNI/RUC
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION / AWS_S3_BUCKET_NAME   # subida de imágenes
QPSE_ACCESS_TOKEN / QPSE_BASE_URL / QPSE_AUTH_BASE_URL / QPSE_USE_DEMO=true   # facturación SUNAT
RESEND_API_KEY / RESEND_FROM_EMAIL   # correos
GEMINI_API_KEY        # IA (opcional)
```

### Pasos
```bash
cd backend
railway login
railway init            # crea proyecto o vincula uno existente
railway up              # despliega
```
Verifica: `https://<backend>.up.railway.app/api` debe responder.

---

## 3. Frontend — Vercel

Repo: subcarpeta `frontend/`. Config incluida: `vercel.json` (rewrite SPA).

### Variables de entorno (Vercel → Settings → Environment Variables)
```
VITE_API_URL = https://<backend>.up.railway.app/api
```

### Ajustes del proyecto en Vercel
- **Root Directory**: `frontend`
- **Build Command**: `pnpm run build`
- **Output Directory**: `dist`
- **Install Command**: `pnpm install`

### Pasos
```bash
cd frontend
vercel                  # preview
vercel --prod           # producción
```

---

## Orden recomendado
1. Neon: crear BD, copiar `DATABASE_URL`.
2. Railway: desplegar backend con `DATABASE_URL` + secrets → obtener URL del backend.
3. Vercel: desplegar frontend con `VITE_API_URL` = URL del backend → obtener URL del frontend.
4. Railway: setear `FRONTEND_URL` = URL del frontend (para CORS del dominio custom; los `*.vercel.app` ya se aceptan solos).
5. Cargar catálogo: `DATABASE_URL=<neon> pnpm run import:kaiser && pnpm run import:costos`.
