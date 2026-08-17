# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Kaiser ERP** is the internal, single-company ERP for **Kaiser Corporation S.A.** (Lima, Perú) — an industrial manufacturer/distributor of wire, plastic/metal mesh, cages, steel grating and high-tech plastics for the agro, poultry, mining and construction sectors. Covers catalog, inventory (kardex), purchasing, B2B quotations→sales, manufacturing (BOM/production orders), cash, SUNAT electronic invoicing, dispatch (guía de remisión), and finance/accounting.

It is derived from the Falconext MyPE monorepo with the **entire SaaS multi-tenant layer removed** (plans, subscriptions, resellers, public storefront/e-commerce, marketing). Access control is **role-based** (single company). See `src/app.module.ts` for the active module map and `src/common/utils/init-db.ts` (`PERMISOS_POR_ROL`) for the role presets.

**Roles**: `ADMIN_EMPRESA` = gerencia (sees everything); operational roles are `USUARIO_EMPRESA` scoped by `permisos[]`: **VENTAS, ALMACEN, PRODUCCION, CONTABILIDAD**. There is **no plan/module gating** — `ModuleAccessGuard` always allows; `permissions.ts` only applies the user `permisos[]` layer. Legacy roles `ADMIN_SISTEMA`/`RESELLER` are unused.

## Architecture

Monorepo with two independent applications:

- `backend/` — NestJS REST API + WebSocket server (port 4001)
- `frontend/` — React 19 + Vite SPA (port 5174 dev)

Both apps use **pnpm** as the package manager.

### Backend (NestJS)

Feature modules organized into functional domains:

- **Auth/Access**: `auth`, `usuarios`, `reseller`
- **Sales/Invoicing**: `tienda` (e-commerce), `comprobante` (electronic invoicing), `pago`, `caja`
- **Products**: `producto`, `categoria`, `marca`, `combos`, `modificadores`, `kardex`
- **Finance**: `contabilidad`, `finanzas`, `dashboard`, `compras`
- **Other**: `cliente`, `sede`, `empresa`, `plan`, `suscripcion`, `banners`, `galeria`, `guia-remision`, `extensiones`, `modulos`, `rubro`, `diseno-rubro`, `reserva` (product stock reservation tracking — validates available stock by subtracting active reservations from base stock; used by tienda orders before committing)
- **Manufacturing**: `produccion` (recetas/bill-of-materials and órdenes de producción)
- **Infrastructure**: `prisma`, `s3`, `scheduler`, `sync`, `gemini`, `notificaciones`, `whatsapp`
- **Platform admin (ADMIN_SISTEMA only)**: `sistema-finanzas` (platform-level KPI dashboard — MRR, ARR, churned/active empresas, revenue metrics; scoped to the authenticated admin's `sistemaNegocio`/`sistemaProducto`), `store-catalog` (public marketplace product catalog — `StoreProduct` entity, separate from per-business `producto` inventory)

Notable infrastructure details:
- `features` (`src/features/features.service.ts`): validates plan-level feature flags (`tieneBanners`, `tieneGaleria`, `tieneCulqi`, `tieneDeliveryGPS`) and enforces plan limits (`maxBanners`, `maxImagenesProducto`). This is distinct from `ModuleAccessGuard` — use this service when checking boolean feature flags on `Plan`, not module codes.
- `sync`: processes offline backup payloads from a mobile/desktop client and upserts productos, clientes, and ventas into the server DB.
- `scheduler`: background job via `@nestjs/schedule`; includes `verificar-pendientes-sunat.service.ts` which polls for comprobantes/guías stuck in a pending SUNAT state and retries submission.

**Database**: Prisma ORM with two schemas — PostgreSQL for web/cloud (`schema.prisma`) and SQLite for desktop (`schema.sqlite.prisma`). Switch between them with `pnpm run prisma:web` or `pnpm run prisma:desktop`.

**Key integrations**: JWT + Passport.js auth, Socket.io real-time notifications, AWS S3 file storage, Google Gemini AI, Twilio SMS, WhatsApp, SUNAT electronic invoicing (multi-provider — see below). Additional libraries: Puppeteer (server-side PDF generation), Sharp (image resizing), XLSX (spreadsheet export), Nodemailer + Resend + `@react-email/components` (transactional emails via React Email templates). DNI/RUC lookups via apiperu.dev (`RENIEC_TOKEN`).

**SUNAT billing providers** (`src/common/utils/billing-provider.ts`): three providers are supported per empresa — `QPSE` (default, `src/common/utils/qpse.client.ts`), `APISUNAT` (legacy sandbox alias), `JAMBLE` (`src/common/utils/jamble.client.ts`). `resolveBillingProvider(empresa)` reads `empresa.billingProvider` field and falls back to QPSE. Per-empresa QPSE credentials: `empresa.usuarioPse`/`empresa.contrasenaPse`. Jamble env vars: `JAMBLE_API_ISSUE_PATHS`, `JAMBLE_API_STATUS_PATH`, `JAMBLE_API_VOID_PATH`.

**Backend `branding` module** (`src/branding/`): serves `/api/branding/public` — resolves white-label brand config (name, logo, colors) from the request `host` header. Used by frontends to fetch brand at runtime instead of relying solely on `VITE_PUBLIC_BRAND`.

**Global setup** (`src/main.ts`):
- Timezone forced to `America/Lima` via `process.env.TZ`
- All responses wrapped: `{ code: 1, message, data }` by `ResponseInterceptor`; errors use `{ code: 0, message }`
- Global prefix: `/api`
- Payload limit: 50mb
- `ValidationPipe` with `whitelist: true, transform: true`
- Auto-seed on first boot via `initializeDatabase()`

**Auth flow**: JWT Bearer token stored in `localStorage` as `ACCESS_TOKEN`; refresh token stored as `REFRESH_TOKEN`. JWT payload: `{ sub, rol, empresaId, sedeId }`. Guards: `JwtAuthGuard`, `RolesGuard`, `ModuleAccessGuard` (checks plan modules). `apiClient.ts` handles token refresh on 401 automatically — concurrent requests are queued and replayed after a successful refresh; only 401s with no stored tokens skip the refresh attempt.

**Module access control**: Routes decorated with `@RequiresModule('CODIGO')` (`src/common/decorators/module.decorator.ts`) are gated by `ModuleAccessGuard`, which checks if the empresa's plan includes the module code. `ADMIN_SISTEMA` role bypasses all guards.

### Frontend (React)

- **State**: Zustand stores in `src/zustand/` (one file per domain)
- **UI**: Tremor + Radix UI + Tailwind CSS (v3.4)
- **Charts**: ApexCharts, Recharts
- **PDF**: `@react-pdf/renderer` for client-side PDF generation (used in some invoice/report views)
- **Path alias**: `@` maps to `src/`
- **Real-time**: Socket.io client for notifications (see `src/components/NotificacionesCampana.tsx`)
- **HTTP**: Axios via `src/utils/apiClient.ts` + typed helpers in `src/utils/fetch.ts` (`get`, `post`, `put`, `patch`, `del`). Use `fetch.ts` wrappers for standard CRUD. Use `apiClient` directly for multipart/form-data uploads or when you need raw Axios config.
- **Route guards**: `src/app/ProtectedRoute.tsx` and `src/app/RoleRoute.tsx`
- **Service layer**: `src/services/` — files that call apiClient directly with their own typed interfaces (e.g. `reseller.service.ts`, `sede.service.ts`, `storeCatalogService.ts`). Distinct from the zustand + `fetch.ts` pattern used in ViewModels.
- **Multi-brand (white-label)**: `src/lib/branding.ts` exports `BRAND` — a config object (name, logo, colors, contacts, socials) resolved at runtime from `VITE_PUBLIC_BRAND` env var. Supported brands: `falconext`, `krezka`. Use `BRAND` for any brand-specific display strings; `getBrandByKey(key)` to resolve by empresa brand field.

`apiClient.ts` auto-infers base URL: `VITE_API_URL` env → `localhost:4001/api` → LAN IP (`192.168.x.x`/`10.x`) uses same host with port 4001 → `api.falconext.pe/api`. This LAN fallback lets mobile/tablet devices on the same network hit a locally running backend without any `.env` change. Includes token refresh interceptor.

Three route trees:
1. **Admin app** (`/administrador/*`) — `ProtectedRoute` → `AdminLayout`, scoped to authenticated business users
2. **Reseller app** (`/reseller/*`) — `RoleRoute(allowedRoles: ['RESELLER'])` → `ResellerLayout`
3. **Public store** (`/tienda/:slug/*`) — unauthenticated customer-facing storefront per business slug, with its own login at `/tienda/login`

`ProtectedRoute` blocks on `auth.isLoading`, redirects to `/login` if no token. `RoleRoute` additionally checks `auth.rol`. `ProduccionRoute` (`src/app/ProduccionRoute.tsx`) wraps manufacturing pages — redirects away unless `esRubroFabricacion(empresa.rubro.nombre)` returns true.

Multi-sede: after login, if user has 2+ sedes they are redirected to `/sede-seleccion`. `auth/select-sede` issues final tokens with `sedeId` embedded. Active sede stored in `localStorage` as `SEDE_ACTIVA`.

**Features pattern** (`src/features/admin/<domain>/`): complex pages use a Model/ViewModel/View split:
- `*Model.ts` — TypeScript interfaces, constants, static data
- `use*ViewModel.ts` — business logic hook (state, API calls, handlers); consumes Zustand stores and `useAlertStore` for feedback
- `*View.tsx` — pure rendering component receiving everything via props

Simpler pages sit directly in `src/pages/admin/<domain>/`.

**State** (`src/zustand/`): one store per domain. Key stores:
- `auth.ts` (`useAuthStore`) — user, sedeActiva, pendingSedes, login/logout/selectSede/me; calls `auth/me` on module load to restore session
- `alert.ts` (`useAlertStore`) — global toast **and** full-page loading spinner in one store; `loading` for spinners, `alert()` for toasts
- `theme.ts` (`useThemeStore`) — sidebar color, type (collapsible/fixed), navbar fixed, compact mode; drives `AdminLayout` sidebar appearance

**Permissions** (`src/utils/permissions.ts`): two-layer check — Plan modules then user permissions.
- `ADMIN_SISTEMA` bypasses all checks; `ADMIN_EMPRESA` bypasses user-layer but not plan-layer
- `USUARIO_EMPRESA` must pass both `hasPermission(user, moduloCodigo)` and optionally `hasSubPermission`
- `AdminLayout` uses these to show/hide sidebar items

**Rubro-aware features** (`src/utils/rubro-features.ts`): `useRubroFeatures(rubroNombre)` auto-detects capabilities from `empresa.rubro.nombre` — no config flags needed.
- `gestionLotes` / `requiereVencimientos` / `permiteFraccionamiento` → true for farmacia/botica
- `usaCodigoBarras` → true for bodega/supermarket (overridable via `empresa.usaCodigoBarrasManual`)
- `gestionOfertas` → true for bodega/supermarket
- `esRubroFabricacion(nombre)` → true for fabricación/manufactura/industria/producción rubros; gates `ProduccionRoute`
- Restaurante rubro renames "Kardex" → "Catálogo" and "Productos" → "Platos" in the sidebar

**Shared hooks** (`src/hooks/`): `useDebounce`, `useOutsideClick`, `useEscapeKey`, `useIsMobile`, `usePaymentFlow` (multi-step payment modal).

**UI utilities**: `src/utils/cn.ts` (clsx + tailwind-merge) for conditional class merging. Icons via `@iconify/react` and `lucide-react`. Animations via Framer Motion.

**Print pages**: some features open dedicated print-only views in new tabs via `window.print()` (e.g. `src/pages/admin/facturacion/print/`, `src/features/admin/kardex/traslados/TrasladoPrintPage.tsx`, `src/pages/admin/guia-remision/print/`). These render without `AdminLayout`.

**LocalStorage keys**:
| Key | Value |
|-----|-------|
| `ACCESS_TOKEN` | JWT bearer token |
| `REFRESH_TOKEN` | Refresh token |
| `SEDE_ACTIVA` | JSON-serialized `ISede` object |

## Commands

### Backend

```bash
cd backend
pnpm run start:dev         # prisma generate + nest watch
pnpm run build             # prisma generate + db push + nest build
pnpm run start             # prisma migrate deploy + generate + nest start
pnpm run lint              # ESLint with auto-fix
pnpm test                  # Jest unit tests
pnpm run test:watch        # Jest watch mode
pnpm run test:cov          # Coverage report
pnpm run test:e2e          # E2E tests
pnpm run migrate:deploy    # Run Prisma migrations
pnpm run prisma:web        # Switch schema to PostgreSQL (web/cloud)
pnpm run prisma:desktop    # Switch schema to SQLite (desktop)
pnpm run seed:desktop      # Seed desktop (SQLite) database
pnpm run seed:detracciones # Seed SUNAT detracciones catalog
pnpm run migrate:sedes     # One-time data migration for multi-sede refactor
pnpm run reset:stock       # Reset/recalculate stock levels
pnpm run export:catalog    # Export store catalog to web (scripts/export-catalog-web.ts)
```

### Frontend

```bash
cd frontend
pnpm run dev             # Vite dev server (port 5174) — krezka brand
pnpm run dev:krezka      # Vite dev server — explicit krezka brand
pnpm run dev:falconext   # Vite dev server — falconext brand (--mode falconext)
pnpm run build           # Production build → dist/ (krezka)
pnpm run build:krezka    # Production build — explicit krezka brand
pnpm run build:falconext # Production build — falconext brand
pnpm run preview         # Preview production build locally
pnpm run lint            # ESLint check
pnpm run test            # Jest (jsdom environment)
pnpm run test:watch      # Jest watch mode
```

### Running a single test

```bash
# Backend
cd backend && npx jest src/path/to/file.spec.ts
cd backend && npx jest --testNamePattern="pattern"

# Frontend
cd frontend && npx jest src/path/to/file.test.ts
cd frontend && npx jest --testNamePattern="pattern"
```

## Environment Setup

Both `backend/.env` and `frontend/.env` are required. Copy from `.env.example` files.

Key backend vars: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AWS_*`, `GEMINI_API_KEY`, `TWILIO_*`, `FRONTEND_URL`, `RENIEC_TOKEN` (apiperu.dev — DNI/RUC lookup), `QPSE_ACCESS_TOKEN`, `QPSE_BASE_URL`, `QPSE_AUTH_BASE_URL`, `QPSE_USE_DEMO` (set `true` for SUNAT sandbox), `SMTP_*` (email via SIRE), `HOTEL_BACKEND_SYNC_URL`/`HOTEL_BACKEND_SYNC_TOKEN` (hotel product sync). Backend listens on `PORT` env (default 4001).

Frontend key vars: `VITE_API_URL`, `VITE_PUBLIC_BRAND` (selects white-label brand; defaults to `krezka` if unset), `VITE_APP_URL`.

## CORS Origins

Backend allows: `localhost:5173`, `localhost:5174`, `localhost:3000`, `tauri://localhost`, `https://tauri.localhost`, `falconext.pe`, `app.falconext.pe`, Railway deployment URLs. Also reads `FRONTEND_URL` env var.

## Domain Notes

- **Comprobante module**: Handles SUNAT-compliant electronic invoicing via QPSE (cpe.qpse.pe). Boleta = consumer receipt, Factura = business invoice. `EnviarSunatService` (`src/comprobante/enviar-sunat.service.ts`) builds UBL XML and sends via `QpseClient`; per-empresa QPSE credentials live in `empresa.usuarioPse`/`empresa.contrasenaPse`. `SunatPayloadException` signals data errors that must NOT be retried (comprobante should be deleted). Changes here require understanding SUNAT XML/UBL format rules and Catálogo codes.
- **Guia de Remisión**: Two types — GRE-R (Remitente, code 09) and GRE-T (Transportista, code 31). See `GUIA_REMISION_ELECTRONICA.md` for full UBL structure and validations.
- **Multi-sede**: Businesses can have multiple locations (sedes); most queries are scoped by `empresaId` and `sedeId`. Sede is selected at login and stored in localStorage.
- **Plan/Module gating**: Features are gated by `Plan.modulosAsignados`. The `@RequiresModule('CODIGO')` decorator + `ModuleAccessGuard` enforce this at the API level.
- **Reseller tier**: Separate dashboard (`/reseller/*`) and auth flow for resellers who manage multiple client businesses.
- **Desktop app**: Tauri build uses `schema.sqlite.prisma`; run `pnpm run prisma:desktop` before building. Has separate seed: `pnpm run seed:desktop`. CORS includes `tauri://` origins.
- **SIRE**: SUNAT's electronic accounting books system. Pages under `src/pages/admin/sire/` (LibroVentas, LibroCompras) generate SIRE-format TXT (`SIRE_RVIE_*.txt`, `SIRE_RCE_*.txt`) and Excel exports via `/contabilidad/sire/ventas-txt`, `/contabilidad/sire/compras-txt`, etc. Backed by the `contabilidad` module.
- **Cotizaciones**: Quotations/estimates feature (`src/features/admin/cotizaciones/`). No dedicated backend module — uses the existing comprobante/venta APIs.
- **Sistema admin section** (`/administrador/sistema/*`): ADMIN_SISTEMA-only platform management pages in `src/features/admin/sistema/` — Módulos, Planes, Resellers, CatalogoGlobal, CatalogoWeb, SistemaFinanzas, SistemaUsuarios. These manage the SaaS platform itself, not individual empresa data.
