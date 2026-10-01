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

**Base de datos**: Prisma sobre PostgreSQL, un solo esquema (`schema.prisma`).
No hay versión de escritorio: lo que quedaba de eso (esquema SQLite, Tauri,
plantilla `.db`) era herencia del monorepo y se quitó.

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

### Cómo el sidebar decide qué está activo

Gana el **prefijo más largo que coincide**, no el primero. Antes cada módulo se
marcaba con `pathname.startsWith(pathPrefix)` por su cuenta, y varios prefijos se
contienen entre sí —Facturación es `/administrador/facturacion` y Cotizaciones
`/administrador/facturacion/cotizaciones`—, así que estando en Cotizaciones se
encendían las dos. Pasaba igual con Guías de Remisión, y con Caja y Pagos debajo de
Ventas y Despacho: **20 módulos cuelgan de otro**. La comparación por longitud lo
resuelve para todos a la vez, incluidos los que se añadan después.

Los **submenús** llevan la misma regla, y la necesitaban igual: "Clientes"
(`/administrador/clientes`) se encendía estando en Crédito, e "Ingresos y salidas"
(`/administrador/kardex`) estando en Productos.

Dos condiciones de las que depende, y que `qa:menu` fija:
· el `orden` de cada módulo es **único**: con el orden empatado —Cotizaciones y
  Facturación compartían el 3— el sidebar los colocaba según llegaran de la API y
  podía cambiar entre recargas;
· ningún módulo comparte ruta con otro, porque serían indistinguibles para la regla.

Y una trampa aparte: **un módulo con submenú muestra SOLO sus submódulos**, así que su
pantalla principal tiene que estar entre ellos o queda inalcanzable desde el menú.
`qa:menu` también lo comprueba.

### "Mi día", la pantalla de inicio de cada rol

`/administrador/mi-dia` (`src/ventas/mi-dia.service.ts`). El panel general muestra el
negocio de la empresa; "Mi día" muestra **el trabajo de quien entra**, acotado por
`Comprobante.usuarioId`. Cuatro bloques, cada uno una pregunta que el vendedor se hace
al abrir el sistema:

  1. **Llamar hoy** — sus cotizaciones vencidas o a menos de 3 días. El plazo sale de
     `cotizVigencia`, que es lo que él le prometió al cliente.
  2. **Esperando visto bueno** — sus pedidos en PENDIENTE, marcando los retenidos por
     crédito.
  3. **Le debo mercadería** — lo suyo que no salió del almacén. La lista general es de
     almacén; esta es la que le van a reclamar por teléfono a él.
  4. **Cobrar** — sus documentos con el plazo vencido.

Más sus tres números: vendido del mes, **su comisión** y cuánto le deben. Ninguno es
de la empresa: un vendedor no necesita la utilidad de Kaiser para hacer su trabajo.

No lleva `@RequierePermiso` **a propósito**: cada quien ve lo suyo y eso no hay que
autorizarlo. Manda el id del token, no un parámetro — pedir los datos de otro vendedor
no está en la API. Gerencia sí puede ver el consolidado con `?todos=true`; a los demás
se les ignora el parámetro.

El módulo va **antes que el Dashboard** en el menú (orden 0) y `mi-dia` está en los
cuatro presets de `PERMISOS_POR_ROL`.

⚠ Al sembrar pedidos de demo por la API, el script entra como gerencia y los documentos
quedan a nombre de gerencia: hay que reasignar `usuarioId` al vendedor o "Mi día"
aparece vacío justo en la demostración.

### Qué ve cada rol en el panel

`/dashboard/overview` devolvía el bloque `financiero` —compras, gastos, ganancias y
margen de la EMPRESA— a cualquier usuario autenticado. `/analisis-financiero/pnl` y
`/finanzas/resumen` están cerrados con permiso, así que el panel era **una puerta
lateral que rodeaba esos dos 403**: un vendedor recibía por ahí el gasto mensual, la
utilidad y el margen que el permiso le niega en la ruta de al lado.

Corregido el 30-sep-2026: el controlador decide `verFinanzas` con los mismos permisos
que abren el P&L (`reportes`, `contabilidad`, `analisis-financiero`, o ADMIN_EMPRESA)
y el servicio recorta el bloque. **`ingresos` se queda para todos** a propósito: las
ventas de la empresa se comparten —el ranking de vendedores vive de eso—. La línea es
**cuánto entra sí, cuánto cuesta y cuánto queda no**.

`qa:panel-permisos` lo fija para los cinco roles. Al añadir cualquier cifra agregada
a un panel, la pregunta es la misma: ¿esto lo niega algún 403 en otra ruta? Si sí, hay
que recortarlo aquí también.

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
```

Datos de Kaiser:

```bash
pnpm run import:kaiser            # catálogo de productos
pnpm run import:costos            # costos del catálogo
pnpm run fichas:cargar -- <carpeta> --dry-run   # fichas técnicas en bloque
pnpm run seed:cuentas-kaiser      # cuentas bancarias
pnpm run seed:precios-demo        # precios de demostración
pnpm run seed:operaciones-demo    # el mes de ventas, cotizaciones, caja y gastos
pnpm run seed:costos-faltantes    # ⚠ SOLO DEMO: deduce el costo que falta del precio
pnpm run qa:flujo                 # recorrido de QA del flujo comercial
pnpm run qa:todo                  # los 38 scripts + invariantes (inventario y cuadre contable) entre cada uno
pnpm run cuadres:corregir         # repara descuadres (en seco; --aplicar para escribir)
pnpm run unidades:consolidar      # funde unidades de medida repetidas (en seco; -- --aplicar)
pnpm run comisiones:conciliacion  # comisiones de ventas atascadas en conciliación (en seco)
pnpm run qa:vendedor-campo        # el ciclo del vendedor de campo: comisión y cobranza
pnpm run qa:couriers              # Shalom y Olva: catálogos, configuración, tablero y permisos
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
- ⚠ **Los alias `qa:*` son el espacio de nombres del QA.** `qa:todo` los descubre
  solos, así que reapuntar un alias existente a otro guion no rompe nada visible:
  simplemente el guion anterior **deja de ejecutarse y el total baja**. Pasó con
  `qa:seguimiento`, que acabó apuntando a un guion de fechas mientras las 30
  comprobaciones del seguimiento de cotizaciones quedaban muertas — en verde, que es
  lo peor. Al añadir un guion, alias nuevo; y si el total de `qa:todo` **baja**, es
  que algo dejó de correr.
- **Envío automático del comprobante al cliente**
  (`src/comprobante/envio-automatico.service.ts`): en cuanto SUNAT acepta una
  factura o boleta, se le manda al correo del cliente con el PDF adjunto. El envío
  por correo ya existía pero era manual, documento por documento.
  Cuatro reglas, todas deliberadas:
  · **Apagado por defecto** (`Empresa.enviarComprobanteEmail`, interruptor en el
    formulario de empresa). Encenderlo manda correo a clientes reales: es una
    decisión de la empresa, no un valor por defecto que se active al desplegar.
  · **Nunca rompe la emisión.** Se llama SIN `await` desde `enviar-sunat.service`
    y el servicio se traga sus errores. Facturar no puede fallar porque el
    servidor de correo esté caído — mismo criterio que los asientos contables y
    que `registrarComisionesAlAceptar`, que ya seguía este patrón.
  · **Va después de S3**, no en el punto donde se persiste la aceptación: el
    correo lleva el PDF, y en ese punto todavía no está subido.
  · **Una sola vez** (`Comprobante.emailEnviadoEn` / `emailEnviadoA`): un reintento
    de SUNAT o una consulta de estado no se lo reenvían al cliente. Si el envío
    falla NO se marca, así que el botón manual sirve para reintentar.
  Solo 01, 03, 07 y 08. Una cotización o una nota de venta no se mandan solas: esas
  las manda el vendedor cuando decide. Si el cliente no tiene correo en su ficha no
  es un error, es un dato que falta — cae al `contactoEmail` si lo hay.
  `qa:envio-email` lo fija sin mandar un solo correo de verdad.

- **Guía de remisión**: GRE-R (remitente, código 09) y GRE-T (transportista,
  31). Estructura completa y validaciones en `GUIA_REMISION_ELECTRONICA.md`.
- **SIRE**: los libros electrónicos de SUNAT (RVIE de ventas, RCE de compras).
  Portado entero desde falconext-mype el 29-sep-2026: la copia de Kaiser era la
  versión inicial y nunca se tocó aquí, así que arrastraba un fallo de fondo —el
  período iba como `AAAAMM00`, del PLE antiguo, cuando el SIRE quiere `AAAAMM`—.
  Módulo en `src/contabilidad/{sire.service,sire.controller}.ts` más
  `common/utils/{sire.client,secreto.util,moneda-compra}.ts`; pantallas en
  `src/pages/admin/sire/`. Lo que hace, además de exportar TXT y Excel:
  · **Contrastar con la propuesta de SUNAT** (`ventas-comparar`,
    `compras-comparar`): se sube el archivo que SUNAT entrega —el navegador lo
    lee en ISO-8859-1 y lo manda como texto, sin multipart— y dice qué le falta
    al libro y qué le sobra.
    **No necesita credenciales**: el archivo se baja a mano del portal SOL. Las
    credenciales solo automatizan ese paso (`compras-sincronizar`). Como la
    propuesta tiene el mismo formato que el TXT que genera el módulo, `qa:sire`
    la prueba devolviéndole el suyo con diferencias metidas a propósito.
  · **Revisión del contador** sobre cada compra (`Compra.estadoContador`:
    PENDIENTE / APROBADA / DENEGADA con motivo). Una DENEGADA sale del RCE y del
    IGV a declarar. Es lo único del módulo que escribe.
  · Resúmenes y revisión previa del período, IGV del período, estado y prueba de
    conexión con SUNAT.
  Las credenciales del SIRE son **otras** que las de facturación (se generan en
  Menú SOL → Credenciales de API SUNAT → Gestión, marcando "MIGE RCE y RVIE -
  SIRE") y viven en `Empresa.sire*`. La clave SOL se guarda cifrada con
  AES-256-GCM (`secreto.util.ts`) porque la API la exige de vuelta
  (`grant_type=password`), y `PrismaService` la **omite por defecto** para que no
  viaje al navegador en los `include: { empresa: true }` de `auth/me`.
- **Producción**: recetas (BOM) y órdenes de producción con merma. Es lo que
  distingue a Kaiser de una distribuidora: el costo de lo fabricado alimenta el
  margen del dashboard y el P&L.
- **Genealogía** (`GET produccion/genealogia/:idOcodigo`, pantalla en Producción ›
  Genealogía): el árbol de un producto en los dos sentidos. Hacia atrás, su
  receta y las órdenes que lo fabricaron —teórico frente a consumido, con la
  **merma real** y su costo, y de qué **compra** entró cada insumo, vía
  `MovimientoKardex.compraId`—. Hacia adelante, en qué ventas salió y en qué
  otras recetas se usa como insumo. No añade tablas: todo estaba guardado y sin
  conectar. Lo lee quien tenga `produccion` **o** `kardex`: un vendedor al que
  un cliente pregunta de qué está hecha una malla tiene que poder contestar sin
  pedirle el favor a planta.
- **Fuga previa, sin resolver**: ese mismo `include: { empresa: true }` sí
  devuelve `contrasenaPse` **en claro** al frontend. No se tocó porque
  `EmpresaFormModal` la precarga para editarla; arreglarlo pide rehacer ese
  formulario (guardar sin devolver el valor).
- **Consolidado de almacén** — pantalla en Inventario › Consolidado
  (`/administrador/kardex/consolidado`, API `GET /kardex/consolidado`): ingresos, salidas o
  traslados con el documento que sustenta cada movimiento, con quién fue
  (cliente, proveedor o destinatario), el saldo y quién lo registró.
  `?formato=excel` lo descarga con dos hojas, Resumen y Movimientos. El viejo
  `GET /kardex/exportar/:tipo` no exportaba nada: devolvía JSON con el mensaje
  "Datos listos para exportación".
- **Trazabilidad por código** — pantalla en Inventario › Trazabilidad
  (`/administrador/kardex/trazabilidad`, API `GET /kardex/trazabilidad/:idOcodigo`): línea de
  tiempo de un producto con el documento que originó cada movimiento, quién lo
  registró, el saldo encadenado, y dos detecciones que pidió almacén: los
  movimientos **registrados tarde** (desfase entre la fecha del documento y
  `MovimientoKardex.creadoEn`, el sello de tiempo del sistema) y los
  **descuadres** (el saldo final de un movimiento no coincide con el inicial del
  siguiente en la misma sede, señal de que alguien tocó el stock por fuera).
- **Documentos de la compra**: cada recepción puede llevar su expediente
  digital (`CompraDocumento`): packing list, factura del proveedor, guía,
  orden de compra, reporte de incidencia u otro. Endpoints
  `GET/POST /compras/:id/documentos` y `DELETE /compras/:id/documentos/:docId`;
  los archivos van a S3. Lo pidió almacén para dejar de cruzar papeles a mano.
- **Devoluciones** (`DevolucionMercaderia`): una nota de crédito con motivo 01,
  06 o 07 abre una devolución PENDIENTE y **no** mueve stock. El stock vuelve
  cuando almacén confirma cuánto llegó y cuánto vino dañado
  (`PATCH /devoluciones/:id/confirmar`); al kardex entra solo lo aprovechable.
  No reintroducir la reposición automática al emitir la nota sin quitar esta, o
  el inventario se duplica.
- **Fichas técnicas**: son PDFs que sube Kaiser, uno por producto
  (`ProductoDocumento`, tipos FICHA_TECNICA / CERTIFICADO / MANUAL / OTRO). El
  ERP **no las genera**: no hay plantilla ni especificaciones técnicas en los
  datos — el `atributosTecnicos` de los 407 productos solo trae metadatos de la
  importación (fuente, dimensiones, volumen), no calibres ni resistencias. Para
  cargarlas en bloque está `pnpm run fichas:cargar`, que empareja cada PDF de
  una carpeta con su producto por el nombre del archivo (código exacto, código
  dentro del nombre, o descripción) y lo sube por el endpoint real. Córrelo
  primero con `--dry-run`.
- ⚠ **En Kaiser la COTIZACIÓN ES la nota de pedido.** La pantalla «Nota de Pedido»
  (`/administrador/pedidos`) consulta `tipoComprobante: "COTIZACION"`: sobre las
  cotizaciones se autoriza, se entrega, se factura y se anula, con el ciclo
  `PENDIENTE → AUTORIZADO → ENTREGADO → FACTURADO` de `Comprobante.estadoPedido`.
  El tipo `NP` existe en el modelo y el backend lo acepta, pero **esa pantalla no
  lo muestra**, así que un NP emitido queda invisible ahí.
  Consecuencia práctica, y el error que costó descubrir: **el control que se pone
  "al emitir un pedido NP" nunca se dispara**, porque el flujo real no pasa por
  ahí. El límite de crédito se comprueba **al AUTORIZAR** (`flujo-comercial.autorizar`),
  que es cuando el documento deja de ser una oferta y compromete mercadería —
  cotizar no compromete crédito, autorizar sí.

- **Seguimiento de cotizaciones** (`src/cotizaciones/seguimiento.service.ts`):
  existía el ESTADO de una cotización y su vigencia, pero no la GESTIÓN. Y perder
  una cotización era **borrarla**, así que «¿por qué perdemos?» no tenía respuesta
  en ninguna parte. Tres piezas:
  · **Bitácora** (`SeguimientoCotizacion`): una línea por contacto o suceso, con
    quién y cuándo. **No se edita ni se borra** — lo que se registró mal se corrige
    con otra entrada; una bitácora retocable no sirve para contestar qué se le dijo
    al cliente hace seis semanas. Los tipos CREADA, ENVIADA, VERSION, GANADA y
    PERDIDA los escribe el **sistema**: el vendedor solo anota lo que pasa fuera.
  · **Próxima acción** (`proximaAccion` + `proximaAccionEn`): la vigencia dice
    cuándo caduca el precio, esto dice cuándo hay que llamar. **Registrar algo
    nuevo cierra la acción anterior** (`cumplidaEn`) — si volviste a anotar, es que
    ya lo hiciste. Alimenta «Lo que quedaste en hacer» en Mi día y el aviso de las
    7:50.
  · **Motivo de pérdida** (`Comprobante.motivoPerdida`): perder pasa a ser un
    estado con su razón, y el documento se queda. Alimenta el panel
    **Cotizaciones › Por qué perdemos**, que ordena por **dinero**, no por
    cantidad: perder diez de S/ 500 por precio no es lo mismo que perder una de
    S/ 80.000 por plazo. La tasa de cierre se calcula solo sobre cotizaciones
    **cerradas** — incluir las abiertas daría una tasa que empeora sola cada vez
    que se cotiza.
  El botón **Seguimiento** está en las dos pantallas que tocan una cotización:
  Cotizaciones › Ver cotizaciones (⋮) y **Pedidos**, que es por donde pasa el flujo
  real. En Pedidos se abre incluso en las facturadas y anuladas: la bitácora sirve
  justo para mirar atrás y ver por qué acabó así.
  ⚠ El botón «Eliminar» de la lista sigue existiendo y **sí borra**: es para
  errores de tecleo. Perder una oportunidad es «Marcar como perdida», que es otra
  cosa. `qa:seguimiento` fija las 30 comprobaciones.

- **Cotizaciones**: no tienen módulo propio en el backend; usan las APIs de
  comprobante/venta. El **formato** se configura en Cotizaciones › Configurar
  formato (`ModalConfigCotizacion`) y se guarda en `Empresa.cotizFormatoConfig`;
  las notas de venta tienen el suyo (`notaVentaFormatoConfig`).
  · Los tamaños son **por formato**: A4 fija el general, y A5 y Ticket lo siguen
    salvo que se desvincule ese elemento (`config[key].a5.size` /
    `config[key].ticket.size`). Hacía falta porque el ticket se imprime con fuente
    térmica a 16px de base: subir un título pensando en A4 lo dejaba ilegible en
    80mm y no había forma de arreglarlo sin estropear el A4. `ticketPx()` escala
    respecto al default del elemento, así que **sin configurar nada el ticket sale
    exactamente como siempre**.
  · Los textos libres (autorizado por, condición, agradecimiento) van en el mapa
    `textos` de esa misma config, que es el mecanismo propio de Kaiser — no
    dentro de cada elemento.
  · **"Cotizar a partir de esta"** crea una cotización NUEVA con los datos de otra
    y deja la original intacta. Es distinto de editar, que pisa lo que ya se le
    mandó al cliente: versionando quedan v1, v2, v3 y se puede enseñar qué se
    ofreció y cuándo.
  · El documento va **de corrido**: membrete y datos bancarios salen UNA sola
    vez, en la página que les toque. Hubo una versión que envolvía todo en una
    tabla para que el navegador repitiera `<thead>`/`<tfoot>` en cada hoja
    impresa; **se quitó a pedido** (1-oct-2026). Lo único que sigue repitiéndose
    son los títulos de columna de la tabla de artículos, que están en su `thead`
    porque sin ellos la segunda hoja es una lista de cifras sin encabezado.
  · El recuadro de artículos se estira hasta el pie cuando sobran pocas líneas
    (`altoRelleno`), midiendo el **div del documento** y no el contenedor de la
    hoja: ese lleva `minHeight: 297mm` y daría siempre una página entera. Solo
    rellena si el documento cabe en UNA hoja, y la comparación lleva una
    tolerancia de 10px — sin ella el efecto se re-dispara solo y la pantalla
    queda en blanco por "Maximum update depth exceeded".
  · **Observación por producto** (`DetalleComprobante.observacionCotizacion`,
    respaldo en `Producto.observacionCotizacion`): se resuelve siempre igual —
    manda el **snapshot de la línea** y el catálogo es el respaldo— porque lo que
    se cotizó es lo que se imprime aunque el catálogo cambie después.
    ⚠ Hay **dos generadores** del documento y hay que tocar los dos: la vista de
    imprimir es React (`comprobanteImprimir.tsx`, helper `obsDeItem`) y el PDF
    que se adjunta al correo lo arma el backend con `cotizacion.hbs`. Durante un
    tiempo solo el primero las mostraba: el PDF que recibía el cliente salía sin
    ellas. Al tocar el formato, cambia los dos o vuelve a divergir — incluidos
    los defaults de tamaño (`cotizElemDefaults` en el servicio tiene que
    coincidir con `cotizFormatoElementos.ts` del frontend).
    ⚠ **Editar una cotización borra los detalles y los recrea**: todo campo
    nuevo del detalle hay que copiarlo también en el `createMany` de
    `actualizarCotizacion`, o se pierde en la primera edición. Así desaparecía
    esta observación. `observacion-cotizacion.spec.ts` fija la regla.
  ⚠ La tabla A4 de la cotización imprime **VALOR UNIT y VALOR VENTA (sin IGV)
  siempre**: su diseño está construido sobre eso. En falconext-mype es un
  interruptor (`preciosSinIgv`) porque allí el formato por defecto es con IGV; no
  se trajo, porque aquí sugeriría que se puede apagar.
- **Libro Diario** (partida doble, plan en `CONTABILIDAD-ASIENTOS.md`): modelos
  `CuentaContable` (subconjunto del PCGE 2019 sembrado por empresa en el tramo 1
  de `init-db.ts`, `update: {}` para no pisar lo que renombre la contadora),
  `PeriodoContable`, `Asiento`/`AsientoDetalle` (con los campos del PLE 5.1) y
  `ConfiguracionContable` (qué cuenta usa cada origen: vive en la BD, no en el
  código). `LibroDiarioService.registrar()` es el único camino de entrada:
  valida el cuadre (`asiento-cuadre.ts`, función pura con spec), el período
  abierto y que la cuenta sea imputable; asigna correlativo y CUO por período.
  No se borra: se extorna, y **sin fecha explícita el extorno va al período del
  asiento original** si sigue abierto (solo cae en hoy si está cerrado, que es lo
  declarado a SUNAT y no se toca). Antes caía siempre en hoy: el acumulado
  cuadraba, pero el mes del original se quedaba con el cargo y el mes corriente
  con el abono, así que cada período por separado mentía.
  **Generación por lote** (`generacion-asientos.service.ts`, `POST
  contabilidad/generar`, `?simular=true` para la vista previa): arma los asientos
  de las ventas y compras del período y los mete por `registrar()`, **nunca dentro
  de la transacción del documento** —facturar no puede depender de que la
  contabilidad esté bien configurada—. Es idempotente: un documento con asiento
  REGISTRADO se omite diciendo en cuál está. Un comprobante rechazado/anulado o
  una compra anulada que ya tenían asiento se extornan solos, en el período del
  original si sigue abierto.
  La venta lleva **su costo** (69 contra 20/21, del kardex) y la compra lleva
  **naturaleza y destino** (60 contra 42, y 20/24 contra 61): en Perú la compra
  son dos asientos, y sin el segundo la existencia nunca entra al balance.
  Fabricado y revendido van a cuentas distintas —70211/70111 y 6921/6911— según
  tenga receta o no, que es lo que separa a Kaiser de una distribuidora.
  Las notas de venta (`NV`) quedan fuera a propósito: son histórico importado.
  También se generan **cobros, pagos, caja, gastos e ingresos** (`deCobro`,
  `dePagoCompra`, `deCaja`, `deGasto`, `deIngreso`); el modal del Libro Diario
  lleva un check por origen y el body acepta `origenes: string[]` (vacío = solo
  ventas y compras). Cosas que hay que saber antes de tocarlo:
  · **Un documento se asienta una vez por PERÍODO**, no una sola vez. Lo obliga
    el gasto `recurrenteDiario`: una sola fila de `GastoOperativo` que guarda el
    importe de un día y se devenga cada mes que dura, con un asiento por mes
    (importe diario × días cubiertos). Por eso el control de duplicados de
    `registrar()` está acotado al período.
  · La **apertura y el cierre de caja no se asientan**: se filtran en la consulta.
    Y un movimiento de caja es efectivo por definición (contrapartida 101),
    aunque su `metodoPago` diga transferencia.
  · **Yape y Plin van a BANCOS**, no a CAJA; la `cuentaBancariaId` del documento
    manda sobre el medio declarado.
  · La **detracción** de un cobro va al 1071 (no es caja libre) y se imputa FIFO
    sobre los cobros del comprobante, porque no hay campo que diga cuál la cubrió.
  · `GastoOperativo` **no guarda IGV** e `IngresoManual` **no guarda medio de
    pago**: el gasto se asienta entero sin crédito fiscal y el ingreso entra por
    caja. Son límites del esquema, no decisiones contables.
  El mapeo se edita en **Contabilidad › Configuración contable**
  (`/administrador/contabilidad/configuracion`, `GET`/`PUT
  contabilidad/configuracion`): tabla clave → cuenta imputable más el toggle de
  la clase 9 (`USA_CLASE_9`), que añade el destino del gasto 941/951 contra 791.
  Nada de cuentas en duro: si la contadora usa otras, se cambian ahí.
- **Datos de la demo** (`src/scripts/seed-demo-operaciones.mjs`): el mes de
  ventas, cotizaciones, guías, caja, comisiones y gastos de septiembre. Tres
  cosas que hay que saber antes de tocarlo:
  · **`--agregar`** no borra lo sembrado: crea solo las ventas que faltan, y salta
    cualquier día que ya tenga comprobante de esa serie. Existe porque los
    correlativos no se pueden reordenar — borrar los comprobantes de la demo y
    volver a emitirlos los renumera y deja un hueco que la serie no sabe
    explicar, y `qa:series` lo caza. En base nueva, sin la bandera.
  · Las ventas se insertan con **fecha pasada**, así que después recompone el
    **saldo corrido** del kardex de cada producto/sede que tocó: metiendo una
    venta el día 7 cuando ya existe otra el 23, el saldo de la del 23 se queda
    con el de antes y la cadena se rompe. Y el **stock global** es la suma de las
    sedes, no el de la sede que se tocó.
  · El mes tiene ventas en 15 días, no en 6. Con seis, el P&L comparaba un mes
    entero de alquiler, servicios y planilla contra dos semanas de facturación y
    daba pérdida por desfase de calendario, no por el negocio.
- **Costos que faltan en el catálogo** (`seed-costos-faltantes-demo.mjs`): la
  importación dejó **72 productos con precio y sin `costoPromedio`**, 43 de ellos
  con existencias. Eso vale S/ 1,38 M de inventario valorizado en cero, una
  salida de kardex que cuesta 0 y un margen del 100 %. El script los deduce del
  precio con el margen uniforme del catálogo —(precio/1,18)/1,35, mediana de los
  335 que sí tienen ambos— y **es solo para la demo**: lo que Kaiser tiene que
  hacer es cargar sus costos con `import:costos`. No se calculan por receta a
  propósito: las recetas también tienen componentes sin costo, y un costo
  incompleto miente peor que uno deducido porque parece calculado.

- **Límite de crédito por cliente** (`src/cliente/credito.service.ts`, panel en
  Clientes › Crédito de clientes): es el hueco 1 frente a STARSOFT, que lo enseñó
  funcionando. Cuatro cosas que hay que entender antes de tocarlo:
  · `Cliente.limiteCredito` en **NULL significa SIN LÍMITE**, y es el valor de
    todos los clientes que ya existen. El control es opt-in: no hace nada hasta
    que Kaiser pone un número, cliente por cliente. Un límite por defecto habría
    empezado a rechazar ventas el día del despliegue.
  · Un límite de **CERO sí es un límite** ("a este no se le vende al crédito").
    Por eso la comprobación es `limite === null`, nunca `!limite`.
  · En la **factura se BLOQUEA**; en el **pedido se MARCA**. Una factura sale a
    SUNAT en el acto y no tiene estado donde esperar; el pedido nace en PENDIENTE
    y el V°B° ya existía (`flujo-comercial.autorizar`, que exige elegir un
    autorizador del catálogo). La **cotización nunca se frena**: ofertar no
    compromete crédito.
  · La salida explícita es `autorizarExcesoCredito` en el body. **Tiene que estar
    declarado en el DTO**: el ValidationPipe global va con `whitelist: true` y
    borra del body lo que el DTO no declare, sin avisar — un campo que el
    servicio lee y el DTO no declara simplemente no llega.
  La deuda sale del `saldo` de los comprobantes, la misma fuente que cuentas por
  cobrar: si divergiera, el vendedor vería una deuda y el contador otra. El
  documento guarda `deudaAlEmitir` y `limiteAlEmitir` porque ambos cambian y
  dentro de un mes nadie podría reconstruir cuánto debía el cliente el día que se
  le dio más crédito. `qa:credito` fija todo esto.
  ⚠ Ese QA **no emite facturas** a propósito: consumiría correlativos de la serie
  real y borrarlos dejaría un hueco que `qa:series` caza con razón. Comprueba que
  la misma petición, con y sin autorización, falle por motivos distintos.

- **Listas de precio** (`src/listas-precio/`, pantalla en Clientes › Listas de
  precio): el hueco 3 frente a STARSOFT, que asigna una lista a cada cliente y el
  vendedor cotiza con ese precio. **No son lo mismo que `Producto.preciosMayorista`**:
  esos son tramos por cantidad ("de 50 en adelante, a 9,80") que valen para
  cualquiera y no se asignan a nadie. Las dos cosas conviven.
  El orden al resolver un precio es: **precio del producto en la lista del cliente
  → ajuste porcentual de la lista → precio de catálogo**. El ajuste
  (`ajustePorcentaje`, negativo = descuento) es lo que hace que una lista cubra
  los 407 productos sin teclear 407 precios; un precio explícito siempre gana
  sobre el ajuste. Los precios de la lista van **CON IGV**, igual que
  `Producto.precioUnitario`.
  La lista **gana sobre el override de precio por sede** a propósito: el override
  es DÓNDE se vende, la lista es A QUIÉN, y un precio acordado con un cliente no
  lo cambia el almacén que despacha.
  `GET /productos?clienteId=N` devuelve ya el precio de ese cliente y un
  `precioLista: { nombre, precioCatalogo, origen }` para que la pantalla pueda
  decir de dónde sale el número en vez de mostrar uno distinto al del catálogo sin
  explicación. Se resuelve en **una consulta por página**, no una por producto.
  Desactivar una lista la apaga sin desasignarla; una lista con clientes asignados
  **no se borra** (dejaría a esos clientes sin precio de golpe y sin rastro).
  `qa:listas-precio` fija todo esto.

- **Despachos pendientes** (`src/guia-remision/despacho-pendiente.service.ts`,
  pantalla en Guías de Remisión › Despachos pendientes): lo que Ari preguntó en la
  reunión —"si despacho 4 de 10, ¿el sistema me avisa de las 6?"— y STARSOFT dijo
  que no. Compara lo vendido en cada comprobante con lo despachado en sus guías,
  línea por línea.
  Hizo falta un dato que no existía: **`GuiaRemision.comprobanteId`**. Antes el
  vínculo era una frase en `observaciones` ("Traslado por venta F0A1-00000005"),
  que sirve para que la lea una persona y para nada más. `pnpm run enlazar:guias`
  recupera el enlace de las guías viejas leyendo esa frase (en seco por defecto);
  el formulario de guía ya lo manda al importar desde un comprobante.
  Cosas que hay que saber antes de tocarlo:
  · Las **notas de venta quedan fuera**, con el mismo criterio que el Libro
    Diario: son histórico importado, se despacharon de verdad pero no por aquí, y
    con ellas dentro el aviso salía con 39 pendientes y nacía inservible.
  · La exclusión de importados lleva un `origenDato: null` explícito que **NO es
    redundante**: en SQL `NOT (campo LIKE '%x%')` con el campo en NULL da NULL, no
    TRUE, y la fila se descarta — sin esa rama desaparecía todo lo emitido a mano.
  · Una guía **ANULADA no cuenta** como despacho, y despachar de más no deja el
    pendiente en negativo: se marca aparte (`deMas`, `conExceso`).
  · El aviso diario (7:45 Lima, justo tras el de mercadería por llegar) lleva
    `diasGracia = 1`: una venta de hoy sin guía no es una alerta, es el curso
    normal del día. Y no se repite si hay uno sin leer de las últimas 20 horas.
  · Va a **gerencia y a quien despacha** (permiso `guias-remision` o
    `kardex:escribir`), no solo a los administradores: almacén es quien tiene que
    sacar la mercadería. `Usuario.permisos` es un JSON en TEXTO, así que se filtra
    con `contains` del nombre entre comillas, no con `has`.
  `qa:despachos` reproduce el caso exacto de Ari: 4 de 10, 6 pendientes, 40 %.

- **Vendedor de campo** (`Comprobante.vendedorCampoId` / `vendedorCampoNombre`,
  interruptor `Empresa.cobranzaCampo`): quien vende y cobra en la calle, que no
  siempre es quien digita el documento. Tres cosas que tiene que cumplir el
  ciclo, y las tres se rompen por separado:
  · **La comisión es del vendedor apuntado, no del emisor**: todos los puntos de
    atribución usan `vendedorCampoId ?? usuarioId`. El filtro por vendedor del
    panel de ventas usa el mismo criterio a propósito (`{vendedorCampoId: X}` OR
    `{vendedorCampoId: null, usuarioId: X}`), o el panel y la comisión dirían
    cosas distintas sobre la misma venta.
  · **La conciliación también paga comisión.** Cuando SUNAT responde 1033
    ("comprobante ya registrado") y el CDR nunca llega, el documento va a
    `PENDIENTE_CONCILIACION`; esa rama **no pasa** por el punto donde se generan
    las comisiones, así que la venta terminaba EMITIDA y el vendedor no cobraba
    nunca. `conciliarComprobante` y la rama 1033 del scheduler llaman ahora a
    `registrarComisionesAlAceptar` — idempotente, no bloqueante (si falla, la
    conciliación no se deshace: el documento ya está bien). Para las que
    quedaron atrás: `pnpm run comisiones:conciliacion` (en seco; `-- --aplicar`
    para escribir).
  · **Se ve a qué bolsillo entró el dinero**: `Pago.dirigidoA` (VENDEDOR /
    ADMINISTRADOR / EMPRESA) + `vendedorNombre`, que el panel de ventas resume en
    la columna "Cobro dirigido a" ("Vendedor: Juan") con el comprobante de pago
    adjunto. Sin eso nadie sabe si la plata ya llegó a la empresa o la tiene el
    vendedor en el bolsillo.
  ⚠ `Empresa.cobranzaCampo` viene en **false** y el selector de vendedor no
  aparece hasta activarlo (Perfil › Cobranza en campo). Es opt-in, como el
  límite de crédito. `qa:vendedor-campo` fija los tres puntos (18
  comprobaciones) sin emitir nada a SUNAT ni consumir correlativos: inserta con
  la serie `FQA9`, que no existe en `Serie`, y la borra al terminar.

- **Couriers: Shalom y Olva** (`src/shalom/`, `src/olva/`, tablero en Ventas ›
  Couriers Shalom / Olva, configuración en Ventas › Configurar despacho).
  Portado entero desde falconext-mype: Kaiser solo tenía el selector de agencia
  y `Empresa.shalomEmail`, sin módulo detrás; de Olva no había nada.
  Lo que hay que saber antes de tocarlo:
  · **El rastreo y la creación de guías son dos cosas distintas.** El rastreo y
    los catálogos (agencias, tamaños, ubigeos, cotización) salen con la **API
    key global** del entorno — `SHALOM_LAT_API_KEY`, `OLVA_API_KEY` — y funcionan
    sin configurar nada. Crear guías exige además, en Shalom, registrar la cuenta
    Shalom Pro de Kaiser como "instancia" del proveedor; Olva no tiene cuenta por
    negocio, solo la agencia de origen.
  · **Tres interruptores, los tres apagados** y por el mismo motivo: encenderlos
    tiene efectos fuera del sistema. `shalomAutoTrackingActivo` /
    `olvaAutoTrackingActivo` hacen que el cron avance estados y avise al cliente
    por WhatsApp; `shalomAutoGuiaActivo` crea envíos REALES en la cuenta al
    cerrar una venta. `qa:couriers` fija que nazcan en `false`.
  · Los crons van **desfasados 15 minutos** (Shalom en `*/30`, Olva en `15,45`)
    para no golpear a los dos proveedores a la vez, y se apagan por entorno con
    `SHALOM_JOBS_ENABLED=false` / `OLVA_JOBS_ENABLED=false`, igual que los de
    SUNAT y por la misma razón: un backend de desarrollo contra la BD compartida
    duplicaría las corridas del desplegado.
  · **`shalomTamano` y `shalomFleteCotizado` no los manda el formulario**: los
    sella el servicio al CREAR la guía, con el tamaño que acabó usándose y lo que
    Shalom cobró por esa ruta. El DTO del despacho no los declara a propósito.
  · Las **claves de retiro** (`Empresa.shalomClavesRetiro`) existen porque Shalom
    no deja repetir la clave del día anterior: el servicio toma la primera que no
    se usó ayer y, sin ninguna configurada, genera una aleatoria por envío.
  · ⚠ **El destinatario de una guía Shalom se identifica con DNI, no con RUC.**
    Su API responde `params/dni must NOT have more than 8 characters` ante un
    documento de 11. Tiene sentido: el destinatario es la PERSONA que retira el
    paquete en la agencia, no la empresa que compró. En Kaiser esto es la regla
    —casi toda venta es factura a empresa— así que el documento del cliente solo
    se hereda cuando es un DNI; con RUC, `crearGuia` corta antes de llamar al
    proveedor y pide el DNI de quien recogerá. `destinatario-dni.spec.ts` fija
    la regla.
    El **modal de Coordinación de Envío del POS** pide ese DNI cuando el courier
    es Shalom y no deja confirmar sin él. El DNI va **primero** y el nombre se
    completa solo consultando RENIEC (`clientes/consultar/DNI/:numero`): es el
    documento el que manda, porque es lo que la agencia pide al entregar. El
    nombre queda editable y **no se pisa si lo escribió una persona** — solo se
    sobrescribe mientras su valor sea el que trajo una consulta anterior.
    El efecto depende del DNI y NO del nombre a propósito: con el nombre en las
    dependencias, cada tecla al corregirlo relanzaría la consulta. Antes solo
    estaban en el modal de despacho posterior —en falconext-mype siguen solo
    ahí—, así que al facturar con Shalom no había dónde ponerlos: la venta se
    cerraba sin esos datos y la guía automática fallaba siempre.
  · ⚠ **`POST shalom/guia/:id` crea un envío REAL y cuesta dinero.** No admite
    modo de prueba: cualquier parámetro que no esté en el DTO se descarta en
    silencio (ValidationPipe con whitelist), así que inventarse un `soloValidar`
    no simula nada — crea la guía. Y la API del proveedor **no expone
    anulación**: una guía creada por error solo se puede anular desde el panel
    de Shalom Pro.
  · El **gate de plan de mype no existe aquí**: `planPermiteShalomPro` y
    `planPermiteOlva` devuelven siempre `true` y se conservan como funciones
    porque son el único punto donde cerrar el módulo si hiciera falta. Lo que
    decide de verdad es si la cuenta está conectada y si hay API key.
  · Los **GET están abiertos** (un vendedor tiene que poder decir dónde va un
    paquete) y las **escrituras exigen `guias-remision`**: `POST guia/:id` crea
    un envío real y `PATCH instancia` cambia la cuenta conectada de la empresa.
  · Todo se configura en **Mi Perfil › Configuración**, donde cada tema es una
    tarjeta-acceso que abre su modal (`SeccionConfig`). Ese componente vive
    **fuera** de `PerfilIndex` a propósito: definido dentro, su identidad cambia
    en cada render, React remonta el subárbol, los bloques de Shalom y Olva
    repiten su petición al montarse y eso vuelve a renderizar — un bucle que
    disparó 448 peticiones en segundos y hacía desaparecer las tarjetas.
  · La sección vieja "Conexión con Shalom (Courier)" se quitó: guardaba
    `shalomEmail`/`shalomPassword` y nada más, que es lo que ya hace "Shalom Pro
    · crear guías" al conectar. Estaba oculta de todos modos — su condición era
    `/negocio|corporativo/.test(planNombre)` y el plan de Kaiser es PRO.
  ⚠ `qa:couriers` **no crea guías reales** a propósito — cuestan dinero —;
  comprueba hasta donde se puede sin gastar: catálogos, configuración que
  persiste en la BASE, campos del despacho, el tablero y los 403.

- **Factura con despacho** (sí se puede; el toggle de envío está en todo salvo
  notas de crédito y débito): el flete que se le cobra al cliente se comporta
  **distinto que en una nota de venta**, y es deliberado.
  · En un documento FORMAL el flete entra como **línea de la factura**
    (`ITEM_ENVIO`): "Servicio de envío (courier)", unidad **ZZ** del Catálogo 03
    —servicio— y gravado al 18 %. Es lo correcto: el flete cobrado es parte de
    la operación y va a SUNAT dentro del comprobante.
  · En un INFORMAL (NV, NP, OT, TICKET, CP, RH) puede ir como **adelanto**
    (`ADELANTO`), fuera del importe del documento. Lo fuerzan los dos lados: el
    POS convierte `ADELANTO` a `ITEM_ENVIO` si el documento es formal, y
    `envio-despacho.service` solo registra el pago de adelanto para esos seis
    tipos. No se puede "colar" un flete como adelanto en una factura.
  · Esa línea **no toca stock** (no tiene `productoId`), **no aparece en
    Despachos pendientes** (filtra `productoId != null`) y **no busca costo de
    inventario** en el asiento contable. Las tres cosas son correctas.
  ⚠ Lo que sí fallaba: al importar esa factura a una **guía de remisión**, el
  "Servicio de envío" se colaba como un ítem más a trasladar, con código vacío.
  No rompía el envío a SUNAT (el XML de la GRE solo manda descripción, cantidad
  y unidad), pero declaraba el traslado de algo que no es un bien y había que
  borrarlo a mano en cada guía. `getPrefillDesdeComprobante` ahora descarta las
  líneas con **unidad ZZ**. El criterio es la unidad y NO `productoId == null`:
  un ítem libre puede ser mercadería real fuera de catálogo, y esa sí se
  transporta y debe figurar en la guía. `qa:couriers` fija los dos casos.

- **Tablero de despacho por courier** (`analisis-financiero/couriers`, pantalla
  en Ventas › Couriers Shalom / Olva): cuánto sale por cada courier, cuánto
  llega, cuánto demora y qué está atascado, con el mapa de destinos
  (`peru-coordenadas.ts`). El módulo `ventas` no tenía submenú: al añadirle
  estas entradas hubo que incluir **su propia pantalla** ("Detalle de venta") o
  el Panel de ventas quedaba inalcanzable — la trampa que `qa:menu` comprueba.

- **Export del resumen de comprobantes** (`exportarResumenComprobantes`): se
  trajo la versión de mype, que exporta **una fila por producto** cuando la
  columna Productos está visible y respeta las **columnas que el usuario dejó
  en la tabla** (`?columnas=` como CSV de keys, declarado en el DTO o el
  ValidationPipe lo descarta). El PDF no cambia: sigue siendo una fila por venta
  con los productos apilados. Usa `xlsx-js-style` y no `xlsx` porque la edición
  community descarta `cell.s` y el Excel salía sin formato.

- **Unidades de medida: una fila por concepto.** La tabla la llenan DOS fuentes
  y el upsert va por **código**, así que el mismo concepto acababa duplicado:
  `init-db.ts` siembra las del Catálogo 03 de SUNAT (NIU, KGM, LTR, MTK, BOX…)
  e `import-kaiser-catalog.ts` las del negocio (UND, KG, LT, M2, CJ, RLL, PZ,
  PQ). Resultado: UNIDAD, KILOGRAMO, LITRO, METRO CUADRADO y CAJA aparecían
  **dos veces** en el selector de producto, que se pinta por NOMBRE — dos
  opciones idénticas sin forma de distinguirlas.
  · Con SUNAT nunca hubo problema: `sunat-unidades.ts` traduce los códigos
    internos al Catálogo 03 antes de armar el XML (RLL→NIU, CJ→BX, PQ→PK,
    KG→KGM, M2→MTK, LT→LTR). Lo que mentía era el catálogo maestro.
  · Corregido en los dos frentes: la siembra **no crea una unidad si ya existe
    otra con ese nombre**, y `pnpm run unidades:consolidar` funde las que ya
    estaban repetidas. Gana la fila que usan los productos (en Kaiser, las del
    negocio: sus 407 productos están en UND/RLL/PZ/KG/M2/CJ/PQ/LT) y los
    productos de la perdedora se mueven antes de borrarla.
  ⚠ **No borres filas de esta tabla a mano.** `producto.service` buscaba la
  unidad por defecto con `codigo: 'NIU'` clavado: al consolidar desaparece esa
  fila y el alta de producto se cayó con un 403 "No se encontró unidad de medida
  por defecto". Ahora busca por código entre los equivalentes, luego por nombre
  y en último caso cualquiera. `qa:maestros` comprueba que no haya nombres ni
  códigos repetidos y que toda unidad en uso traduzca al Catálogo 03.

- **Imagen del producto por IA** (`POST productos/ia/generar-imagen`, botón en
  Nuevo producto / Editar): busca la foto en varios proveedores (Serper, Google
  CSE, Pixabay), la valida con Gemini y **memoriza la aprobada por empresa**
  (`ImagenProductoAprobadaIa`) para no repetir la llamada.
  ⚠ La memoria guarda **todas las opciones**, no solo la elegida
  (`candidatos Json?`). Sin eso —como estaba— la primera búsqueda ofrecía 4 o 5
  fotos y a partir de la segunda **una sola**: la aprobada, sin forma de
  cambiarla desde el formulario. Ahora `conMemorizada()` pone la aprobada al
  frente y añade el resto, y se aplica en los CINCO returns del endpoint (los
  tres de búsqueda, el de caché y el de memoria). Un registro viejo sin
  candidatos sigue a la búsqueda normal y se completa solo la próxima vez.
  · Lo que NO se trajo de falconext-mype: el **filtro por color de variante**
    (`buildColorMatcher`, que exige coincidencia de color en lugar de tratarlo
    como un token más) y la generación por ítem de **paquete**. Ninguno aplica
    aquí: `Producto` no tiene campo `color` y la relación de variantes existe en
    el esquema pero no la usa ningún producto.

- **Pedir V°B° (correo al autorizador)** (`POST flujo-comercial/pedidos/:id/
  enviar-correo`, botón "Pedir V°B°" en Pedidos): manda un correo al encargado
  de autorizar con el **PDF del pedido** y el **comprobante de pago** adjuntos,
  guarda en el pedido el N° de operación, el banco y la dirección de entrega, y
  sube el voucher a S3 (`comprobantePagoUrl`).
  · Va por **Resend** (`RESEND_API_KEY`, remitente `RESEND_FROM_EMAIL`). Sin la
    clave el endpoint responde con un mensaje claro en vez de fallar callado.
  · Los destinatarios salen del catálogo `AutorizadorPedido` (Pedidos →
    autorizadores) o del correo que se escriba al enviar. **Un autorizador no es
    un usuario del sistema**: son dos tablas distintas, así que para que alguien
    reciba el correo hay que darlo de alta como autorizador aunque ya tenga
    cuenta.
  · El cuerpo lleva cliente, total, las primeras 8 líneas del pedido, datos de
    pago y entrega, la nota y quién lo envió. Todo lo que viene del usuario se
    escapa (`esc`): el nombre del cliente y la nota acaban dentro del HTML.
  · Si el PDF falla, el correo **se manda igual** con los datos: es mejor que el
    autorizador reciba el aviso sin adjunto que no recibir nada.
  · **Queda en la bitácora** del pedido (tipo CORREO) con quién lo pidió, a
    quién y con qué datos de pago, y el pedido guarda `vbSolicitadoEn` /
    `vbSolicitadoA`. Esos dos campos existen porque el V°B° se puede pedir sin
    N° de operación ni voucher: deducirlo de esos datos habría dejado sin marca
    justo los envíos más simples.
  · El botón **no desaparece** al pedirlo —hay que poder reenviar: el
    autorizador no lo vio, se corrigió el voucher— pero pasa a decir "V°B°
    pedido · dd/mm" en verde, con la fecha y el destinatario en el tooltip.
  ⚠ Los hitos del flujo (autorizar, entregar, facturar) **también** se anotan
  ahora. El de facturar existía pero estaba escrito DESPUÉS del `return`, así
  que nunca se ejecutó: ninguna cotización facturada quedaba marcada como
  GANADA en su bitácora.

- **Qué cuenta como venta** (y qué no): las cotizaciones (COT), las órdenes de
  trabajo (OT) y las **notas de pedido (NP)** no son ingreso. Lo dicen ya tres
  sitios —el dashboard, la generación de asientos (solo asienta 01, 03, 07 y 08) y
  desde el 30-sep-2026 también el P&L—. El P&L las contaba, heredado del monorepo
  multi-rubro donde para un negocio informal la NP *sí* es el comprobante de venta;
  en Kaiser la NP tiene su propia máquina de estados (PENDIENTE → AUTORIZADO →
  ENTREGADO → FACTURADO) y termina en factura, así que contarla reconocía la venta
  antes de autorizarla y antes de despachar. Con un solo pedido en la base, el
  mismo mes salía con dos cifras de ventas distintas según la pantalla. Si se
  vuelve a tocar `filtroExcluirConvertidos`, hay que tocar los tres a la vez —y
  `qa:cuadres` compara las tres fuentes justamente para que no se separen.

- **Planilla importada** (`contabilidad/planilla/*`, pantalla en Contabilidad ›
  Planilla): el ERP **no calcula la planilla**, la recibe. Se sube el Excel que
  Kaiser ya calcula en su software y el sistema crea el `GastoOperativo` del mes
  (categoría SUELDOS, por el **costo de empresa** = ingresos + EsSalud) y el
  asiento de provisión (62x al debe; 4111, 407, 4032, 40173, 4699 y 4031 al
  haber), y guarda el detalle por trabajador en `PlanillaImportada` /
  `PlanillaImportadaDetalle` para que la contadora pueda auditar de dónde salió
  cada importe. Las columnas se reconocen por varios alias porque cada software
  de planillas exporta los suyos. **Aquí los GET NO están abiertos**: una
  planilla lleva el sueldo de cada persona con su nombre.
  Por qué no se calcula: son 224 conceptos remunerativos con su fórmula y su
  referencia legal, más PLAME y T-Registro, y todo cambia cada año. Si una AFP
  sale mal es una multa y un reclamo laboral, no un bug que se arregla el martes.
- **Libro Mayor y salida** (`contabilidad/mayor`, `/mayor/balance`,
  `/asientos/exportar`, `/ple/:libro`; pantalla en Contabilidad › Libro Mayor):
  el mayor de una cuenta con saldo de arrastre desde enero y saldo corrido, el
  balance de comprobación agrupado por clase del PCGE, el Excel de asientos para
  el sistema contable de la contadora, y los TXT del PLE 5.1 y 6.1.
  **Los saldos se calculan siempre desde `AsientoDetalle`**, nunca se guardan: un
  saldo que se calcula es un saldo que no miente. Y **no se filtra por estado**:
  un asiento extornado y su reverso conviven y se anulan; excluir el original
  restaba dos veces.
  ⚠ Los archivos del PLE **no están validados con el Programa Validador de
  SUNAT** — no se consiguió la especificación oficial. El orden de campos vive en
  `CAMPOS_5_1` / `CAMPOS_6_1` de `ple.service.ts` para ajustarlo de un vistazo, y
  la pantalla lo advierte. Ventas y compras van por SIRE, que sí está verificado.
- **Migración del histórico** (`src/migracion/`, detalle en `MIGRACION.md`): el
  `costo_unitario` de la hoja INVENTARIO es la fuente del `costoPromedio` del
  producto (promedio ponderado entre almacenes), y el `stock` global se recalcula
  sumando `ProductoStock` al cerrar la carga —no fila a fila, o un producto en dos
  almacenes se queda con el de uno. `pnpm run qa:migracion` ensaya el proceso
  completo con datos sintéticos antes de tocar los de Kaiser.
- **Multi-sede**: casi todas las consultas se acotan por `empresaId` y `sedeId`.
  Al añadir un modelo con datos operativos, acuérdate de `sedeId`: faltaba en
  `IngresoManual` y el P&L devolvía 500 para cualquier usuario con sede.

## CORS

La lógica está en `src/main.ts` y no es una lista plana:

- En **desarrollo** (`NODE_ENV != production`) se acepta cualquier
  `localhost`/`127.0.0.1`, cualquier IP privada (192.168.x, 10.x, 172.16-31.x)
  con cualquier puerto, y el esquema `capacitor://` (para la app móvil). Por eso
  el 5184 funciona sin estar en ninguna lista.
- Siempre se aceptan `*.vendify.pe` y los despliegues del frontend en
  `*.vercel.app`.
- Y la lista fija, más `FRONTEND_URL` y `CORS_EXTRA_ORIGINS` (separados por comas).

La lista fija es herencia de MyPE (dominios de vendify y jamble); ninguno la
usa este proyecto. Lo de Kaiser entra por `FRONTEND_URL` y por la regla de
Vercel.
