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
- **Cotizaciones**: no tienen módulo propio en el backend; usan las APIs de
  comprobante/venta.
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
