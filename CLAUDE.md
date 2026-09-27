# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio.

## Qué es

**Kaiser ERP** es el ERP interno y mono-empresa de **Kaiser Corporation S.A.**
(Lima, Perú), fabricante y distribuidor industrial de alambre, mallas plásticas
y metálicas, jaulas, rejillas de acero y plásticos de alta tecnología para agro,
avicultura, minería y construcción.

Cubre catálogo, inventario (kardex), compras, cotizaciones → ventas B2B,
fabricación (recetas/BOM y órdenes de producción), caja, facturación
electrónica SUNAT, despacho (guía de remisión) y finanzas/contabilidad.

Deriva del monorepo Falconext MyPE **con toda la capa SaaS multi-tenant
quitada** (planes, suscripciones, resellers, tienda pública, marketing). El
control de acceso es por rol, para una sola empresa.

> **Ojo con el código heredado.** Quedan carpetas del monorepo original que
> **no están enrutadas ni registradas** y no forman parte del ERP:
> frontend `src/pages/tienda/`, `src/components/landing/`,
> `src/templates/construccion/`, `src/features/admin/sistema/`;
> backend `src/features/`, `src/galeria/`.
> No sirven como referencia: si algo parece contradecir esta guía, comprueba
> primero que el archivo esté realmente enrutado en `App.tsx` o registrado en
> `app.module.ts`.

## Arquitectura

Dos aplicaciones independientes, ambas con **pnpm**:

- `backend/` — API REST NestJS + WebSocket. Puerto **4201** en local (`PORT`).
- `frontend/` — SPA React 19 + Vite. Puerto **5184** en dev (fijo,
  `strictPort`). El 5174 es de otro proyecto (falconext-mype), no de este.

### Backend (NestJS)

Módulos registrados en `src/app.module.ts`:

- **Acceso**: `auth`, `usuarios`
- **Ventas y facturación**: `comprobante` (facturación electrónica),
  `flujo-comercial` (notas de pedido), `ventas`, `pago`, `caja`, `comisiones`
- **Catálogo e inventario**: `producto`, `categoria`, `marca`, `kardex`,
  `reserva`, `digemid`
- **Compras**: `compras`, `importaciones`
- **Fabricación**: `produccion` (recetas/BOM y órdenes de producción)
- **Despacho**: `guia-remision`, `envio-despacho`, `repartidor`
- **Finanzas**: `contabilidad` (incl. SIRE), `finanzas`, `analisis-financiero`,
  `reportes`, `dashboard`, `tipo-cambio`
- **Maestros**: `cliente`, `empresa`, `sede`, `rubro`, `extensiones`
- **Infraestructura**: `prisma`, `scheduler`, `notificaciones`, `whatsapp`,
  `branding`

Además, sin registrar en la raíz pero sí importados por otros módulos:
`s3` (subida de archivos) y `gemini` (IA).

Y fuera de Nest, como scripts: **`src/migracion/`** — la migración del
histórico desde el sistema anterior (ver `MIGRACION.md`).

**Base de datos**: Prisma con dos esquemas — PostgreSQL para web/nube
(`schema.prisma`) y SQLite para escritorio (`schema.sqlite.prisma`). Se cambia
con `pnpm run prisma:web` / `pnpm run prisma:desktop`.

**Integraciones**: JWT + Passport, Socket.io, AWS S3, Google Gemini, WhatsApp,
facturación electrónica SUNAT vía QPSE. Puppeteer (PDF), Sharp (imágenes),
XLSX, Nodemailer/Resend + React Email. Consulta DNI/RUC por apiperu.dev
(`RENIEC_TOKEN`).

**Proveedores SUNAT** (`src/common/utils/billing-provider.ts`): `QPSE` (el que
usa Kaiser), `APISUNAT` y `JAMBLE`. `resolveBillingProvider(empresa)` lee
`empresa.billingProvider` y cae a QPSE. Credenciales por empresa en
`empresa.usuarioPse` / `empresa.contrasenaPse`.

**Arranque** (`src/main.ts`):
- Zona horaria forzada a `America/Lima`
- Respuestas envueltas: `{ code: 1, message, data }`; errores `{ code: 0, message }`
- Prefijo global `/api`, límite de payload `JSON_BODY_LIMIT` (10mb por defecto)
- `ValidationPipe` con `whitelist: true, transform: true`
- `initializeDatabase()` en cada arranque (ver más abajo)

### Control de acceso

**Roles**: `ADMIN_EMPRESA` = gerencia, ve todo. Los roles operativos son
`USUARIO_EMPRESA` acotados por `permisos[]`: **VENTAS, ALMACEN, PRODUCCION,
CONTABILIDAD**. Los presets están en `PERMISOS_POR_ROL`
(`src/common/utils/init-db.ts`). `ADMIN_SISTEMA` y `RESELLER` son legado sin uso.

**No hay gating por plan**: `ModuleAccessGuard` siempre deja pasar y
`permissions.ts` solo aplica la capa de `permisos[]` del usuario.

Cadena de guards: `JwtAuthGuard` → `RolesGuard` → `PermisosGuard`. El permiso se
declara con `@RequierePermiso('codigo')`, a nivel de clase o de ruta (la ruta
manda sobre la clase). `PermisosGuard` acepta varios permisos con criterio OR.

**Regla de la capa de permisos**: las **lecturas** están abiertas a cualquier
usuario autenticado —un vendedor necesita ver stock y costos al cotizar— y solo
lo que **escribe** exige el permiso del área. Por eso existe `kardex:escribir`
separado de `kardex`: ventas y contabilidad consultan inventario pero no lo
modifican. Al tocar un controlador, mantén ese criterio: protege POST/PUT/PATCH/
DELETE, deja los GET.

En el frontend el espejo son `PermisoRoute` (bloquea la ruta) y
`usePuedeEscribir()` (oculta los botones que escribirían). Si añades un permiso
nuevo al backend, aplícalo también en la UI: un botón que devuelve 403 se ve
como un sistema roto.

### Siembra de la base (`src/common/utils/init-db.ts`)

`initializeDatabase()` corre en **cada arranque**. Hay dos tramos:

1. **Antes** del `return` de "ya inicializada" —idempotente, afecta también a
   bases existentes y a producción: catálogos SUNAT, ubigeos,
   `seedMenuKaiser()` (módulos y submódulos del sidebar) y
   `sincronizarPermisosSeed()` (realinea las cinco cuentas sembradas con
   `PERMISOS_POR_ROL`).
2. **Después** —solo en base vacía: empresa, sede, series, usuarios, cliente
   VARIOS, etc.

Si cambias el menú o los permisos de rol, van en el primer tramo o no llegarán
a las instalaciones ya creadas.

El sidebar se genera **por completo** desde la BD (`MODULOS_KAISER` y
`SUBMODULOS_KAISER`), no hay nada en duro en el layout.

### Frontend (React)

- **Estado**: Zustand en `src/zustand/`, un archivo por dominio
- **UI**: Tremor + Radix + Tailwind 3.4; iconos `@iconify/react` y `lucide-react`
- **Gráficos**: ApexCharts, Recharts
- **PDF**: `@react-pdf/renderer` en cliente; el backend genera con Puppeteer
- **Alias**: `@` → `src/`
- **HTTP**: Axios en `src/utils/apiClient.ts` + helpers tipados en
  `src/utils/fetch.ts` (`get`, `post`, `put`, `patch`, `del`). Usa `fetch.ts`
  para CRUD normal y `apiClient` para multipart o config cruda de Axios.
- **Tiempo real**: Socket.io (`src/components/NotificacionesCampana.tsx`)

`apiClient.ts` deduce la URL base: `VITE_API_URL` → `localhost:4201/api` → IP de
LAN con el mismo puerto (para probar desde móvil o tablet) → `api.falconext.pe`.
Incluye refresco de token: los 401 concurrentes se encolan y se reintentan tras
renovar.

**Un solo árbol de rutas**: `/administrador/*` bajo `ProtectedRoute` →
`AdminLayout`, más `/login`, recuperación de contraseña y `/sede-seleccion`.
No hay tienda pública ni panel de reseller (se quitaron con la capa SaaS).

Guards de ruta en `src/app/`:
- `ProtectedRoute` — exige sesión
- `PermisoRoute` — exige el permiso del módulo; evita entrar a una página que
  el backend va a responder con 403 (antes renderizaba importes en S/ 0.00,
  que parecían datos reales)
- `ProduccionRoute` — solo si `esRubroFabricacion(empresa.rubro.nombre)`
- `RoleRoute` — legado

**Multi-sede**: con 2+ sedes el login redirige a `/sede-seleccion`;
`auth/select-sede` emite los tokens finales con `sedeId`. La sede activa vive en
`localStorage` como `SEDE_ACTIVA`.

**Patrón de features** (`src/features/admin/<dominio>/`): las pantallas
complejas se parten en Model / ViewModel / View:
- `*Model.ts` — interfaces, constantes, datos estáticos
- `use*ViewModel.ts` — lógica (estado, llamadas, handlers)
- `*View.tsx` — render puro, todo por props

Las pantallas simples viven directamente en `src/pages/admin/<dominio>/`.

**Stores clave**: `auth.ts` (usuario, sede activa, login/logout/selectSede/me),
`alert.ts` (toasts y spinner de página en un mismo store), `theme.ts`
(apariencia del sidebar).

**Por rubro** (`src/utils/rubro-features.ts`): `useRubroFeatures(rubroNombre)`
deduce capacidades del nombre del rubro, sin flags de configuración.
`esRubroFabricacion(nombre)` es el que habilita Producción en Kaiser.

**Páginas de impresión**: algunas vistas se abren en pestaña aparte y llaman a
`window.print()` (`src/pages/admin/facturacion/print/`,
`src/features/admin/kardex/traslados/TrasladoPrintPage.tsx`,
`src/pages/admin/guia-remision/print/`). Renderizan sin `AdminLayout`.

**localStorage**: `ACCESS_TOKEN`, `REFRESH_TOKEN`, `SEDE_ACTIVA`.

## Comandos

### Backend

```bash
cd backend
pnpm run start:dev            # prisma db push + generate + nest watch
pnpm run build                # prisma generate + db push + nest build
pnpm run lint                 # ESLint con auto-fix
pnpm test                     # Jest
pnpm run test:cov             # cobertura
pnpm run test:e2e             # end-to-end
pnpm run migrate:deploy       # prisma migrate deploy
pnpm run prisma:web           # esquema PostgreSQL
pnpm run prisma:desktop       # esquema SQLite
```

Datos de Kaiser:

```bash
pnpm run import:kaiser            # catálogo de productos
pnpm run import:costos            # costos del catálogo
pnpm run seed:cuentas-kaiser      # cuentas bancarias
pnpm run seed:precios-demo        # precios de demostración
pnpm run qa:flujo                 # recorrido de QA del flujo comercial
```

Migración del histórico (detalle en `MIGRACION.md`):

```bash
pnpm run migracion:plantillas              # genera el Excel para Kaiser
pnpm run migracion:validar -- <archivo>    # valida sin escribir nada
pnpm run migracion:cargar -- <archivo>     # carga (idempotente) + reporte
pnpm run migracion:revertir                # deshace lo migrado
```

### Frontend

```bash
cd frontend
pnpm run dev       # Vite en el puerto 5184
pnpm run build     # build de producción → dist/
pnpm run preview   # sirve el build
pnpm run lint
pnpm run test      # Jest (jsdom)
```

### Un solo test

```bash
cd backend  && npx jest src/ruta/al/archivo.spec.ts
cd frontend && npx jest src/ruta/al/archivo.test.ts
```

## Entorno

Hacen falta `backend/.env` y `frontend/.env`.

Backend: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT` (4201 en
local; **8080 en Railway**, que es a donde apunta el dominio), `AWS_*`,
`GEMINI_API_KEY`, `FRONTEND_URL`, `APP_URL`, `RENIEC_TOKEN`,
`QPSE_ACCESS_TOKEN`, `QPSE_BASE_URL`, `QPSE_AUTH_BASE_URL`, `QPSE_USE_DEMO`
(`true` para el sandbox de SUNAT), `SMTP_*`.

Frontend: `VITE_API_URL`, `VITE_APP_URL`.

## Despliegue

- **Backend**: Railway, proyecto `striking-upliftment`, entorno `production`,
  servicio `kaiser-erp` → `kaiser-erp-production.up.railway.app`. Base de datos
  `kaiser-db` (Railway Postgres).
  ⚠️ El dominio apunta a `targetPort: 8080`: `PORT` **tiene** que ser 8080 o
  responde 502.
- **Frontend**: Vercel, proyecto `kaiser` → `kaiser-one.vercel.app`.

## Notas de dominio

- **Comprobante**: facturación electrónica SUNAT vía QPSE. Boleta = consumidor
  final, Factura = empresa. `EnviarSunatService`
  (`src/comprobante/enviar-sunat.service.ts`) arma el XML UBL y lo envía con
  `QpseClient`. `SunatPayloadException` marca errores de datos que **no** deben
  reintentarse. Tocar esto exige entender el UBL y los catálogos de SUNAT.
- **Guía de remisión**: GRE-R (remitente, código 09) y GRE-T (transportista,
  31). Estructura completa y validaciones en `GUIA_REMISION_ELECTRONICA.md`.
- **SIRE**: los libros electrónicos de SUNAT. Pantallas en
  `src/pages/admin/sire/` (LibroVentas, LibroCompras) que generan TXT en formato
  SIRE y Excel vía `/contabilidad/sire/ventas-txt` y `/compras-txt`.
- **Producción**: recetas (BOM) y órdenes de producción con merma. Es lo que
  distingue a Kaiser de una distribuidora: el costo de lo fabricado alimenta el
  margen del dashboard y el P&L.
- **Cotizaciones**: no tienen módulo propio en el backend; usan las APIs de
  comprobante/venta.
- **Multi-sede**: casi todas las consultas se acotan por `empresaId` y `sedeId`.
  Al añadir un modelo con datos operativos, acuérdate de `sedeId`: faltaba en
  `IngresoManual` y el P&L devolvía 500 para cualquier usuario con sede.
- **Escritorio (Tauri)**: usa `schema.sqlite.prisma`; corre `prisma:desktop`
  antes de compilar y siembra con `seed:desktop`.

## CORS

La lógica está en `src/main.ts` y no es una lista plana:

- En **desarrollo** (`NODE_ENV != production`) se acepta cualquier
  `localhost`/`127.0.0.1`, cualquier IP privada (192.168.x, 10.x, 172.16-31.x)
  con cualquier puerto, y los esquemas `tauri://` y `capacitor://`. Por eso el
  5184 funciona sin estar en ninguna lista.
- Siempre se aceptan `*.vendify.pe` y los despliegues del frontend en
  `*.vercel.app`.
- Y la lista fija, más `FRONTEND_URL` y `CORS_EXTRA_ORIGINS` (separados por comas).

La lista fija es herencia de MyPE (dominios de vendify y jamble); ninguno la
usa este proyecto. Lo de Kaiser entra por `FRONTEND_URL` y por la regla de
Vercel.
