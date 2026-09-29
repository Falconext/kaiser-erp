# Continuación del trabajo — prompt para el agente

> Este archivo es el encargo completo para la siguiente sesión (Opus 5). Léelo
> entero antes de tocar nada. Después lee `CLAUDE.md`, `CONTABILIDAD-ASIENTOS.md`,
> `DESPLIEGUE.md` y `REUNION-STARSOFT.md`. Todo lo que sigue está en castellano
> porque el usuario trabaja en castellano: responde y comenta el código en
> castellano.

---

## 0. Contexto en tres párrafos

**Kaiser ERP** compite contra **STARSOFT** por la cuenta de Kaiser Corporation
S.A. (Lima, fabricante y distribuidora de alambre y mallas). STARSOFT hizo dos
demos (10-sep y 29-sep) y en la segunda enseñó Planillas completo y asientos
contables automáticos. La gerente (Karim) elogió que "contabilidad jalaba no
más". Kaiser tiene ~50 trabajadores y usa un software de planillas que "no le
ayuda del todo".

**Decisión tomada con el usuario**: NO construir el motor de planillas (224
conceptos remunerativos, PLAME, T-Registro: caro, regulado, se mantiene para
siempre). SÍ construir la contabilidad de partida doble —que no existía— y una
importación de la planilla ya calculada que genere el gasto y el asiento. Eso
entrega exactamente lo que la gerente elogió sin calcular una sola AFP.

**Estado al 29-sep-2026**: la **Fase 0** (cimiento contable: plan de cuentas,
períodos, asientos, Libro Diario) está **hecha, probada en el navegador y en
commit**. Hay **50 commits sin subir** a producción. El preflight de despliegue
necesita acceso a la base de producción, que el agente no tiene (ver §2).

---

## 1. Reglas de trabajo (no negociables)

1. **Lee `CLAUDE.md` y respétalo.** En especial: lecturas abiertas a cualquier
   usuario autenticado, escrituras con `@RequierePermiso`; espejo en el frontend
   con `PermisoRoute` / `usePuedeEscribir`; `sedeId` en todo modelo operativo;
   el sidebar se siembra desde `init-db.ts` (tramo 1, idempotente).
2. **No toques la transacción de venta ni la de facturación electrónica** para
   generar asientos. Los asientos se generan **por lote, después**, a través de
   `LibroDiarioService.registrar()`. Es el único camino de entrada a `Asiento`.
3. **Un asiento que no cuadra no se guarda.** `registrar()` ya lo garantiza; no
   lo rodees.
4. **Nada de hardcodear cuentas.** Las cuentas salen de `ConfiguracionContable`
   (clave → cuentaId). Si necesitas una clave nueva, añádela a
   `MAPEO_CONTABLE_DEFECTO` en `plan-cuentas.seed.ts` (se siembra sola).
5. **Cada fase termina con**: script `qa:<algo>` nuevo o ampliado (convención
   `✔`/`✘`, ver `src/scripts/qa-asientos.mjs`), `pnpm run qa:todo` en verde,
   `tsc --noEmit` limpio en backend y frontend (el único error preexistente es
   `test/app.e2e-spec.ts`, ignóralo), eslint limpio en los archivos nuevos,
   **prueba en el navegador** con las herramientas de Chrome (frontend en
   `localhost:5184`, backend en `localhost:4201`, ambos ya corriendo con watch),
   y un commit en castellano con `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
6. **No hagas `git push` sin el preflight en verde** (§2). Si el usuario te pide
   subir sin preflight, díselo una vez y obedece.
7. **Documenta en la raíz**, como los demás (`*.md` en castellano, directo, sin
   relleno). Marca cada fase como hecha en `CONTABILIDAD-ASIENTOS.md` y añade la
   nota de dominio a `CLAUDE.md` si cambia algo que el siguiente agente deba saber.
8. **Limpia lo que crees en la base de la demo** (los scripts de QA borran lo
   suyo; si pruebas a mano en el navegador, borra después). La base local es la
   de la demo: 45 comprobantes, 4 compras, 407 productos (11 con receta),
   sedes 1 (La Victoria, principal) y 3 (Chacra Cerro).
9. **Cierra las pestañas de Chrome** que abras. No dispares `alert()`/`confirm()`.
10. Usa Bash para leer/escribir archivos (heredocs, python3 para parches). No
    uses subagentes ni workflows salvo que el usuario lo pida.

Cosas que ya mordieron y no hace falta redescubrir:
- `useAlertStore` es export **default**; `alert(msg, 'success' | 'error' | 'warning')`; `load(bool)` para el spinner.
- `fetch.ts` (`get/post/put/patch/del`) devuelve `{ success, data, error }`, nunca lanza.
- `auth.empresa` trae `nombreComercial`, no `razonSocial`.
- Prisma `Decimal` llega como string al JSON: conviértelo con `Number()` en el servicio (ver `serializar()` en `libro-diario.service.ts`).
- `ts-node` falla por la config de módulos: para consultas sueltas usa `node -e` con `require('@prisma/client')`.
- CORS: si una descarga necesita leer cabeceras propias, van en `exposedHeaders` de `main.ts` (ya están `Content-Disposition` y `X-Registros-Exportados`).
- `Modal` (`isOpenModal, closeModal, title, width, icon, height`) y `ModalConfirm` (`isOpenModal, setIsOpenModal, confirmSubmit, title, information, confirmText, confirmLoading`) en `src/components/`.
- El JWT deja en `req.user`: `{ id, empresaId, sedeId | null, rol, permisos }`. Tipa el usuario del controlador con una interfaz local (ver `UsuarioJwt` en `libro-diario.controller.ts`) para que eslint no proteste.

---

## 2. Tarea suelta A — Subir a producción (prioridad 1, pero la decide el usuario)

Son 50 commits: 13 bugs del ERP arreglados (dashboard sumaba el IGV como
ingreso, arqueo escondía faltantes, correlativos duplicables, stock fantasma…),
la migración probada, "Mis datos", y ahora el Libro Diario. Producción sigue
con todos esos bugs.

`DESPLIEGUE.md` es el runbook. Lo que el agente **no puede** hacer solo: la base
`kaiser-db` de Railway no tiene proxy TCP (sin `DATABASE_PUBLIC_URL`) y el SSH
al contenedor está bloqueado por el modo automático. El script de preflight
(`pnpm run deploy:preflight`) viaja en esta misma tanda, así que tampoco está en
producción.

Pídele al usuario que haga esto y espera su resultado:

```
1. Railway → servicio kaiser-db → Settings → Networking → Enable TCP Proxy.
2. En este terminal:
   ! cd backend && DATABASE_URL="<url pública>" pnpm run deploy:preflight
```

- Si NO hay correlativos duplicados → `git push origin main`. Railway hace
  `prisma db push --accept-data-loss` en el build (aplica solos los modelos
  nuevos, todos aditivos) y Vercel despliega el frontend.
- Si HAY duplicados → no subas. Resuélvelos como dice `DESPLIEGUE.md` §1.
- Después: `DATABASE_URL="<url>" pnpm run qa:cuadres` (solo lee) y, si
  reporta descuadres heredados, `cuadres:corregir` en seco y luego `--aplicar`.
- Avisa (o recuérdale al usuario que avise) de que **las ventas históricas bajan
  en pantalla** al dejar de sumar el IGV: no se pierde dinero.
- Comprueba que `PORT=8080` sigue en Railway (el dominio apunta a 8080).

Si el usuario prefiere seguir construyendo antes de subir, sigue con §3 sin
insistir más de una vez.

---

## 3. Contabilidad — Fases 1 a 4 (plan en `CONTABILIDAD-ASIENTOS.md`)

### Lo que ya existe (Fase 0) y vas a usar

- Modelos: `CuentaContable`, `PeriodoContable`, `Asiento`, `AsientoDetalle`,
  `ConfiguracionContable`. Enum `OrigenAsiento`: MANUAL, VENTA, COMPRA, COBRO,
  PAGO, CAJA, GASTO, INGRESO, PLANILLA, EXTORNO.
- `backend/src/contabilidad/libro-diario.service.ts`:
  `registrar(empresaId, usuarioId, NuevoAsiento)`, `extornar()`, `listar()`,
  `obtener()`, `cerrarPeriodo()`, `reabrirPeriodo()`, `planCuentas()`,
  `periodoDe(fecha)`. `registrar()` rechaza con `ConflictException` si ya hay un
  asiento REGISTRADO con el mismo `origen + origenId`: **eso es lo que hace la
  generación idempotente**.
- Mapeo por defecto (`MAPEO_CONTABLE_DEFECTO`): CLIENTES 1212, PROVEEDORES 4212,
  IGV_VENTAS/IGV_COMPRAS 40111, VENTA_MERCADERIA 70111,
  VENTA_PRODUCTO_TERMINADO 70211, DEVOLUCION_VENTA_* 7091/7092,
  COSTO_VENTA_* 6911/6921, COMPRA_MERCADERIA 6011, COMPRA_MATERIA_PRIMA 6021,
  EXISTENCIA_* 2011/2111/2411, VARIACION_* 6111/6121, CAJA 1011, BANCOS 1041,
  DETRACCIONES 1071, SUELDOS 6211, COMISIONES_VENDEDORES 6212,
  ESSALUD_GASTO 6271, SUELDOS_POR_PAGAR 4111, ESSALUD_POR_PAGAR 4031,
  ONP_POR_PAGAR 4032, RENTA_QUINTA_POR_PAGAR 40173, AFP_POR_PAGAR 407,
  GASTO_PUBLICIDAD 6371, GASTO_ENVIOS 6311, GASTO_COMISIONES 6212,
  GASTO_ALQUILER 6352, GASTO_OTROS 6599, INGRESO_OTROS 7599,
  DESTINO_GASTO_ADMINISTRATIVO 941, DESTINO_GASTO_VENTAS 951,
  CARGAS_IMPUTABLES 791, USA_CLASE_9 = 'false' (valor, no cuenta).
- Endpoints: `GET contabilidad/plan-cuentas[?imputables=true]`,
  `GET contabilidad/periodos`, `GET contabilidad/asientos?anio&mes&sedeId&origen`,
  `GET contabilidad/asientos/:id`, `POST contabilidad/asientos`,
  `POST contabilidad/asientos/:id/extornar`,
  `POST contabilidad/periodos/:anio/:mes/cerrar|reabrir`.
- Frontend: `features/admin/contabilidad/useLibroDiarioViewModel.ts` +
  `pages/admin/contabilidad/LibroDiario.tsx`, ruta
  `/administrador/contabilidad/libro-diario`, submódulo sembrado.
- QA: `qa:asientos` (39 checks) y la invariante de cuadre en `qa:todo`.

### Diseño común de la generación (Fases 1-3)

Crea `backend/src/contabilidad/generacion-asientos.service.ts` con:

- `generar(empresaId, usuarioId, { anio, mes, origenes?: OrigenAsiento[], sedeId?, simular?: boolean })`
  → recorre los documentos del período que aún no tienen asiento REGISTRADO,
  arma las líneas leyendo el mapeo, llama a `registrar()` uno por uno (no en una
  transacción gigante: un documento roto no debe tumbar los demás) y devuelve
  `{ generados: [{origen, origenId, cuo}], omitidos: [{origen, origenId, motivo}], errores: [...] }`.
  Con `simular: true` no escribe nada: devuelve los asientos que escribiría
  (para la vista previa y para la demo).
- Un método por origen: `deVenta(comprobante)`, `deCompra(compra)`,
  `deCobro(pago)`, `dePagoCompra(pagoCompra)`, `deCaja(movimientoCaja)`,
  `deGasto(gastoOperativo)`, `deIngreso(ingresoManual)`. Cada uno devuelve un
  `NuevoAsiento` o `null` con motivo (p. ej. "comprobante rechazado").
- Helper `cuentaDe(empresaId, clave)` que lee `ConfiguracionContable` (cachéalo
  por llamada a `generar`, no por proceso) y lanza `BadRequestException` clara
  si la clave no tiene cuenta: "Falta configurar la cuenta para VENTA_MERCADERIA".
- Todo en soles: si el documento está en USD, `importe × tipoCambio` del
  documento; si el documento no trae tipo de cambio, `GET tipo-cambio/:fecha`
  (módulo `tipo-cambio`); guarda `moneda` y `tipoCambio` en el asiento.
- `sedeId` del asiento = `sedeId` del documento.
- Redondea cada línea a céntimos y **cuadra la diferencia de redondeo** en la
  última línea de la contrapartida (12 en ventas, 42 en compras); nunca dejes
  que `registrar()` rechace por 0.01.
- Endpoints: `POST contabilidad/generar` (permiso `contabilidad`) y
  `POST contabilidad/generar?simular=true`. Pantalla: en Libro Diario, botón
  **"Generar asientos del período"** que abre un modal con la vista previa
  (cuántos por origen, cuántos omitidos y por qué) y el botón de confirmar.
  Oculto si el período está cerrado o sin permiso.

### Fase 1 — Ventas y compras · 4-5 días

**Venta** (`Comprobante` con `tipoDoc` 01 factura / 03 boleta):
- Incluir si `estadoEnvioSunat` ∉ {RECHAZADO, ANULADO}. PENDIENTE/ENVIADO/
  EMITIDO/REGISTRADO/NO_APLICA/PENDIENTE_CONCILIACION entran (una factura
  emitida ya es venta aunque el envío esté en cola). Si más tarde SUNAT la
  rechaza, la Fase 4 la extorna (ver abajo).
- Líneas: **Debe** CLIENTES por `mtoImpVenta`; **Haber** IGV_VENTAS por
  `mtoIGV`; **Haber** ventas por `mtoOperGravadas + mtoOperInafectas +
  mtoOperExoneradas + mtoOperExportacion`, **repartido por producto**: cada
  `DetalleComprobante` va a VENTA_PRODUCTO_TERMINADO si su `productoId` tiene
  `RecetaProduccion`, y a VENTA_MERCADERIA si no. Agrupa: como mucho dos líneas
  de 70. Si el comprobante tiene detracción (`montoDetraccion > 0`), la venta
  se asienta entera igual; la detracción se refleja al cobrar (Fase 2).
- **Costo de ventas** en el mismo asiento o en uno aparte (elige uno aparte con
  origen VENTA y `origenId = comprobante.id` NO sirve por la unicidad: usa el
  mismo asiento, líneas adicionales): **Debe** COSTO_VENTA_* / **Haber**
  EXISTENCIA_* por la suma de `MovimientoKardex.valorTotal` (o
  `cantidad × costoUnitario`) de los movimientos de salida ligados a ese
  comprobante (`comprobante.movimientosKardex`), separando fabricado/revendido
  por receta. Si un comprobante no tiene movimientos de kardex (servicios),
  no lleva costo.
- Campos PLE en las líneas: `tipoDocSunat = tipoDoc`, `serie`, `numero =
  correlativo`, `fechaVencimiento = fechaVencimientoCredito ?? null`.
- Glosa: `Venta F001-123 · <cliente.nombre>`.

**Nota de crédito** (`tipoDoc` 07): asiento inverso de lo que afecta —
**Debe** DEVOLUCION_VENTA_* (7091/7092) y **Debe** IGV_VENTAS, **Haber**
CLIENTES. El costo NO se revierte aquí: la mercadería vuelve al stock solo
cuando almacén confirma la `DevolucionMercaderia` (ver CLAUDE.md), y ese
movimiento de kardex es el que lleva la contrapartida (Debe EXISTENCIA_* /
Haber COSTO_VENTA_*) — hazlo en la generación leyendo los `MovimientoKardex`
de entrada ligados a la devolución confirmada. Nota de débito (08): como venta.

**Compra** (`Compra` con `estado = REGISTRADO`):
- Naturaleza: **Debe** COMPRA_* por `subtotal`, **Debe** IGV_COMPRAS por
  `igv`, **Haber** PROVEEDORES por `total`.
- Destino: **Debe** EXISTENCIA_* / **Haber** VARIACION_* por `subtotal`.
- Materia prima vs mercadería: el producto es **materia prima** si aparece como
  `productoInsumoId` en algún `RecetaComponente`; si no, mercadería. Reparte por
  línea de `DetalleCompra`, agrupa.
- USD al `tipoCambio` de la compra. Campos PLE: `tipoDocSunat = tipoDoc`,
  `serie`, `numero`, `fechaVencimiento`.
- Compra anulada (`estado = ANULADO`) con asiento REGISTRADO → extorno
  automático en la generación.

**Extornos automáticos** (aplícalos en cada `generar`): comprobante que pasó a
RECHAZADO/ANULADO y tiene asiento REGISTRADO → `extornar()` con motivo
"Comprobante rechazado/anulado". Lo mismo para compras anuladas.

**QA**: `qa:asientos-ventas` que cree (o use) una venta con un producto con
receta y otro sin, genere, compruebe las cuentas 70111/70211/6911/6921, los
totales contra `mtoImpVenta`, que una segunda generación no duplique, que la
anulación extorna, y que limpie. Amplía `qa:cuadres` con un cruce nuevo: Σ
haber de 70 del período = ventas netas del reporte de contabilidad.

**Demo**: Libro Diario del mes con los 45 comprobantes de la demo generados en
un clic, entrar a uno, ver que la malla fabricada fue a 70211 y el alambre a
70111.

### Fase 2 — Cobros, pagos, caja y gastos · 2-3 días

- **Cobro** (`Pago`): **Debe** CAJA si `medioPago` es efectivo, BANCOS si hay
  `cuentaBancariaId` o el medio es transferencia/Yape/Plin/tarjeta; **Haber**
  CLIENTES por `monto`. Si el comprobante tiene detracción y este pago la
  cubre, la parte detraída va a **Debe** DETRACCIONES (1071). Origen COBRO,
  `origenId = pago.id`, `sedeId` del comprobante.
- **Pago a proveedor** (`PagoCompra`): **Debe** PROVEEDORES / **Haber** BANCOS
  o CAJA. Origen PAGO.
- **Caja** (`MovimientoCaja` con `tipoMovimiento` INGRESO/EGRESO; ignora
  APERTURA y CIERRE): INGRESO → Debe CAJA / Haber INGRESO_OTROS; EGRESO → Debe
  GASTO_<categoriaGasto o OTROS> / Haber CAJA. Origen CAJA.
- **Gasto operativo** (`GastoOperativo`): Debe GASTO_<categoria> (mapea
  PUBLICIDAD/SUELDOS/ENVIOS/COMISIONES/ALQUILER/OTROS/PERSONALIZADA; SUELDOS
  usa la clave SUELDOS) / Haber BANCOS o CAJA según `cuentaBancariaId`/
  `medioPago`. `GastoOperativo` no guarda IGV: asienta el importe completo y
  déjalo dicho en el doc (mejora futura: campo `igv`). Los `recurrenteDiario`
  se asientan **una vez al mes** por el total del mes, no día a día. Si
  `USA_CLASE_9 = 'true'`, añade **Debe** DESTINO_GASTO_ADMINISTRATIVO (o
  DESTINO_GASTO_VENTAS si la categoría es PUBLICIDAD/ENVIOS/COMISIONES) /
  **Haber** CARGAS_IMPUTABLES por el mismo importe. Origen GASTO.
- **Ingreso manual** (`IngresoManual`): Debe CAJA o BANCOS / Haber
  INGRESO_OTROS. Origen INGRESO.
- Pantalla: en el modal de generación, un check por origen.
- Pantalla nueva pequeña: **Contabilidad › Configuración contable**
  (`/administrador/contabilidad/configuracion`): tabla clave → cuenta con
  select de cuentas imputables, y el toggle "Generar destino de gastos
  (clase 9)". Endpoints `GET/PUT contabilidad/configuracion`. Escribe solo
  `contabilidad`.
- **QA**: `qa:asientos-cobros` (cobro parcial + total cuadra contra 1212,
  gasto con y sin clase 9, caja ingreso/egreso).

### Fase 3 — Planilla importada · 2-3 días

Es lo que cierra el tema de planillas sin calcular nada.

- Plantilla Excel descargable (`GET contabilidad/planilla/plantilla`): una fila
  por trabajador con columnas `dni, nombres, basico, asignacion_familiar,
  horas_extras, comisiones, bonificaciones, gratificacion, vacaciones, cts,
  total_ingresos, afp, onp, renta_5ta, otros_descuentos, total_descuentos,
  neto, essalud`. Importes en soles, dos decimales. Hoja 2 "Instrucciones".
- `POST contabilidad/planilla/importar` (multipart, `apiClient`; permiso
  `contabilidad`) con `?simular=true` para la vista previa: valida que
  `total_ingresos − total_descuentos = neto` por fila y que las columnas
  existan; devuelve el resumen (trabajadores, totales por concepto, errores por
  fila). Sin simular: crea **un** `GastoOperativo` (categoria SUELDOS, mes/año,
  `descripcion = "Planilla <mes> <año> · N trabajadores"`, monto = total
  ingresos + essalud) y **un** asiento PLANILLA con `origenId = gasto.id`:
  ```
  Debe  SUELDOS                 basico + asignación + horas extras + bonificaciones
  Debe  COMISIONES_VENDEDORES   comisiones
  Debe  6214 / 6215 / 6291      gratificación / vacaciones / cts   (claves nuevas GRATIFICACIONES, VACACIONES, CTS)
  Debe  ESSALUD_GASTO           essalud
    Haber SUELDOS_POR_PAGAR     neto
    Haber AFP_POR_PAGAR         afp
    Haber ONP_POR_PAGAR         onp
    Haber RENTA_QUINTA_POR_PAGAR renta_5ta
    Haber 4699 (clave OTROS_DESCUENTOS_POR_PAGAR)  otros_descuentos
    Haber ESSALUD_POR_PAGAR     essalud
  ```
  Con clase 9 activa, destino 941 contra 791 por el total del gasto. Guarda el
  Excel en S3 (módulo `s3`) y su URL en el gasto (`numeroDocumento` o campo
  nuevo `archivoUrl`), y el detalle por trabajador en un modelo nuevo
  `PlanillaImportada` + `PlanillaImportadaDetalle` (empresaId, sedeId null,
  anio, mes, gastoId, asientoId, archivoUrl; detalle con las columnas). Sin
  eso la contadora no puede auditar de dónde salió el asiento.
- Pantalla **Contabilidad › Planilla** (`/administrador/contabilidad/planilla`):
  descargar plantilla, subir archivo, vista previa con totales y errores,
  confirmar, historial de planillas importadas con enlace al asiento. Importar
  dos veces el mismo mes: rechazar con mensaje claro (extornar primero).
- **QA**: `qa:planilla` que genere un Excel sintético con `xlsx`, lo suba por
  la API, compruebe el asiento y limpie.
- Datos que faltan del cliente y **no bloquean**: qué software de planillas
  usa Kaiser y qué exporta (adaptar la plantilla a su formato después).

### Fase 4 — Libros y salida · 2 días

- **Libro Mayor**: `GET contabilidad/mayor?cuenta=<codigo>&anio&mes[&sedeId]`
  → saldo inicial (acumulado de períodos anteriores del mismo año), movimientos
  con `cuo`, fecha, glosa, debe, haber, saldo corrido, saldo final. Y
  `GET contabilidad/mayor/resumen?anio&mes` → todas las cuentas con movimiento y
  sus totales (esto es el balance de comprobación). Pantalla
  **Contabilidad › Libro Mayor** con selector de cuenta (buscable) y período.
- **PLE 5.1 (Diario)** y **6.1 (Mayor)**: TXT con los campos oficiales
  separados por `|`. Nombre de archivo:
  `LE<RUC><AAAA><MM>00<0501|0601>00<00|01>1<1|0>11.txt` (el indicador de
  "con información" = 1 si hay asientos). Campos del 5.1, en orden: período
  `AAAAMM00`, CUO, correlativo del asiento (`M` + número), código de cuenta,
  código de unidad de operación (vacío), centro de costo (vacío salvo clase 9),
  moneda (`PEN`/`USD`), código de la contraparte (vacío), tipo de documento de
  identidad de la contraparte, número de documento de la contraparte, tipo de
  comprobante (catálogo 10), serie, número, fecha contable, fecha de
  vencimiento, fecha de operación, glosa, glosa referencial, debe, haber,
  dato estructurado (vacío), indicador de estado (`1` = del período),
  campos libres. **Verifica el formato contra la resolución vigente de SUNAT
  antes de dar por buena la estructura**: busca "estructura libro diario PLE
  5.1" y confirma número y orden de campos; también confirma si para 2026
  SUNAT ya exige el Diario por SIRE en vez de PLE (al 29-sep-2026 el agente
  anterior creía que Diario y Mayor siguen en PLE, sin confirmar). Endpoints
  `GET contabilidad/ple/diario?anio&mes` y `/ple/mayor`, con `?formato=excel`.
- **Correlativo en SIRE**: en `sire.service.ts` las columnas
  `'', // 3 Correlativo asiento` (líneas ~185 y ~399) y `'CORR. ASIENTO': ''`
  (~270 y ~480) hoy van vacías. Rellénalas con el `cuo` del asiento REGISTRADO
  de origen VENTA/COMPRA y `origenId` = id del documento (una consulta agrupada
  por período, no una por fila).
- **Exportación para el sistema de la contadora** (el `SISTCONT` de STARSOFT):
  Excel plano de asientos del período (`GET contabilidad/asientos/exportar?
  anio&mes&formato=excel`) con una fila por línea: cuo, fecha, cuenta,
  denominación, glosa, documento, debe, haber, moneda, tipo de cambio. El
  formato exacto que consume su sistema es una de las preguntas abiertas para
  Kaiser (§5); mientras tanto, este Excel.
- **QA**: `qa:libros` (mayor cuadra con diario, PLE tiene N líneas = N detalles,
  SIRE trae el correlativo).

### Después (no ahora): Fase 5 candidata

Costo de producción: consumo de materia prima (Debe 6121 / Haber 2411 vía
`MovimientoKardex` de salida por orden de producción) y producto terminado
(Debe 2111 / Haber 7111 al cerrar la orden, incluyendo merma). Solo si el
usuario lo pide.

---

## 4. Tareas sueltas del producto (huecos frente a STARSOFT)

Por orden de rendimiento. Cada una es un commit propio con QA y prueba en el
navegador.

### A-bis. Listas de precio con nombre (Prioridad 1, se me pasó en el primer borrador)
`REUNION-STARSOFT.md` lista **tres** huecos de Prioridad 1, no dos: el tercero es
que STARSOFT asigna a cada cliente una lista de precios con nombre y el vendedor
elige de ahí. Kaiser ERP tiene `preciosMayorista` (un JSON por producto), que no
es una entidad asignable. Trabajo medio; puede bastar con nombrar los niveles que
ya existen.

### B. Límite de crédito por cliente (trabajo bajo, STARSOFT lo demostró)
- `Cliente.limiteCredito Decimal? @db.Decimal(12,2)` y `Cliente.diasCredito Int?`.
- Servicio: `saldoPendiente(clienteId)` = Σ `Comprobante.saldo` de comprobantes
  01/03 con `estadoPago` ∈ {PENDIENTE_PAGO, PAGO_PARCIAL} no anulados.
- Al emitir una venta a crédito (`formaPagoTipo` = Credito): si
  `saldoPendiente + mtoImpVenta > limiteCredito`, **bloquear** con mensaje
  "Supera el límite de crédito (S/ X de S/ Y usados)". Gerencia (ADMIN_EMPRESA)
  puede autorizar con un flag `autorizarExcesoCredito: true` en el body; queda
  registrado quién (`autorizadoPorId`, ya existe en `Comprobante`).
- Frontend: campo en la ficha del cliente; en el punto de venta / cotización
  → factura, chip "Crédito disponible S/ …" al elegir cliente, y el aviso
  cuando bloquea.
- `GET cliente/:id/credito` → { limite, usado, disponible, vencido }.
- QA: `qa:credito`.

### C. Alerta de despacho pendiente (Ari la pidió; STARSOFT dijo que no)
- Un job en `scheduler` (ver `scheduler.service.ts`), diario a las 8:00 Lima:
  comprobantes 01/03 con `estadoPedido` no entregado / `EnvioDespacho.estado`
  pendiente y `fechaEmision` (o `fechaRecojo`) con más de N días (N en la
  configuración de la empresa, 2 por defecto) → notificación por la campana
  (`notificaciones.service.ts`, gateway Socket.io) a los usuarios con permiso
  `ventas` y a gerencia, agrupada ("5 pedidos llevan más de 2 días sin
  despachar") y con enlace a la lista filtrada.
- Además un contador en el dashboard: "Pedidos sin despachar > N días".
- QA: `qa:despacho-pendiente` que cree la condición, dispare el job a mano
  (expón el método) y compruebe la notificación.

### D. Equivalencias rollo ↔ m² (pregunta abierta a Kaiser)
- `Producto.factorConversion` ya existe. Cuando Kaiser responda si las
  equivalencias son enteras, decidir si hace falta `Decimal` y una segunda
  unidad de venta visible en cotización/venta. No construir hasta tener la
  respuesta.

### E. Planillas — el motor (NO hacer)
Decidido: no. Si el usuario vuelve a plantearlo, recuérdale los 224 conceptos,
PLAME/T-Registro y el mantenimiento perpetuo, y que la importación (Fase 3)
entrega lo que la gerente elogió. Si aun así lo pide, arrancar por boleta +
CTS + gratificaciones + vacaciones en D. Leg. 728, sin PLAME, y con la renta de
5ta como el único cálculo genuinamente difícil (proyección anual, 7 UIT,
tramos).

---

## 5. Preguntas abiertas para Kaiser (recuérdaselas al usuario, no las inventes)

1. ¿Qué plan de cuentas usa la contadora y usa clase 9? (ajusta el mapeo, no el código)
2. ¿Con qué sistema contable trabaja y qué formato importa? (Fase 4, exportación)
3. ¿Qué software de planillas usan y qué exporta? (Fase 3, plantilla)
4. ¿Las equivalencias rollo↔m² son enteras? (tarea D)
5. ¿Qué puede exportar P&P (el sistema anterior)? Sin ese archivo no se puede
   demostrar la migración con datos reales.
6. ¿Planillas viene incluido en el precio de STARSOFT o va aparte? (dato comercial)

Y decisiones del usuario, no técnicas: cláusula de salida en el contrato
(`OBJECION-NUBE.md`), postura sobre instalación local, y que la sede marcada
como principal es La Victoria, donde factura el 5%.

---

## 6. Cómo empezar la sesión

1. `git status` y `git log --oneline -5` para confirmar que estás en `main` con
   el árbol limpio y el último commit "Libro Diario: partida doble…".
2. Comprueba que backend (`curl localhost:4201/api/contabilidad/plan-cuentas`
   → 401) y frontend (`curl localhost:5184` → 200) están arriba; si no,
   `pnpm run start:dev` y `pnpm run dev` en sus carpetas, en segundo plano.
3. `cd backend && pnpm run qa:asientos` para verificar que la base está sana.
4. Pregunta al usuario **una sola cosa**: "¿Subimos primero (§2) o sigo con la
   Fase 1 (§3)?". Y arranca.
