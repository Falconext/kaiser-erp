# Asientos contables: el hueco y el plan

El segundo de los dos huecos reales frente a STARSOFT (el otro es límite de crédito
por cliente). Lo demostraron funcionando en la reunión y es lo que **Karim elogió**
—"contabilidad jalaba no más"—, así que no es un detalle técnico: es el argumento
que más peso tuvo del otro lado.

Este documento es **el plan, antes de escribir código**. Los plazos son estimaciones
mías, no compromisos. Revisado contra el PCGE 2019 (vigente desde 2020) y contra
los datos reales de Kaiser en la base.

---

## 1. Dónde estamos, verificado

No es que falten asientos automáticos. Es que **no existe la partida doble**:

| | |
|---|---|
| Modelo `Asiento` / `AsientoDetalle` | no existe |
| Modelo `CuentaContable` / plan contable | no existe |
| Campo `cuentaContable` en cualquier modelo | 0 coincidencias en 3.119 líneas de `schema.prisma` |
| Módulo `src/contabilidad/` | `arqueo` + `reportes` + `sire`. Nada de libros contables |
| Lo único que dice "asiento" | una columna **vacía** del TXT de SIRE (`'', // 3 Correlativo asiento`) |

Lo que hoy llamamos "contabilidad" en el ERP son reportes de gestión: ventas,
compras, gastos, arqueo de caja. Útiles, pero no son contabilidad.

**Lo que hace STARSOFT**, según la captura de *Generar Asientos para Contabilidad*:
el destino es un desplegable `SISTCONT` con botones *Reporte* y *Excel*. Es decir,
**el asiento sale como archivo hacia otro sistema contable**. No es integración
en vivo. Eso baja el listón de lo que hay que igualar.

**Datos de Kaiser que condicionan el diseño** (consultados en la base):

| | |
|---|---|
| Agente de retención de IGV | **No** (`esAgenteRetencion = false`) → no hay cuenta 40114 en el pago a proveedores |
| Productos | 407, de los que **11 tienen receta** (fabricados). El resto se revende |
| Comprobantes con detracción | 0 hasta hoy, pero hay que soportarla |
| Documentos en dólares | 0 ventas, 1 compra. Existe, no es frecuente |

---

## 2. La materia prima ya está

Todo lo que genera un asiento ya está en la base. No hay que capturar nada nuevo:

| Origen | Modelo | Qué aporta |
|---|---|---|
| Venta / nota de crédito | `Comprobante` | `tipoDoc`, `mtoOperGravadas`, `mtoIGV`, `mtoImpVenta`, `tipoMoneda`, `tipoCambio`, detracción, `estadoEnvioSunat` |
| Compra | `Compra` | `subtotal`, `igv`, `total`, `moneda`, `tipoCambio`, `proveedorId` |
| Cobro | `Pago` | `monto`, `medioPago`, `cuentaBancariaId` |
| Pago a proveedor | `PagoCompra` | ídem |
| Caja | `MovimientoCaja` | apertura, cierre, ingreso, egreso |
| Gasto | `GastoOperativo` | `categoria` (ya trae `SUELDOS`), `monto`, `proveedor` |
| Ingreso vario | `IngresoManual` | `concepto`, `monto` |
| Costo de lo vendido | `MovimientoKardex` | costo por salida, **ya calculado** |
| Fabricado / revendido | `RecetaProduccion` | si el producto tiene receta, es producto terminado |

Todos llevan `empresaId` y casi todos `sedeId`. **El asiento también los lleva**,
o se repite el 500 del P&L que arreglamos en `IngresoManual`.

---

## 3. Cómo se hace en Perú, y qué implica

Esto es lo que diferencia una contabilidad peruana de una "genérica", y lo que la
contadora de Kaiser va a mirar primero:

**3.1 — Asiento por naturaleza y asiento por destino.** En Perú una compra de
existencias no es un asiento, son **dos**. El de naturaleza (clase 6) y el de
destino (clase 2 contra 61). Sin el segundo, el inventario nunca entra al balance:

```
Naturaleza:  Debe 601 Mercaderías        1,000   Debe 40111 IGV   180
             Haber 4212 Facturas por pagar                       1,180
Destino:     Debe 201 Mercaderías        1,000
             Haber 611 Variación de existencias                  1,000
```

Para Kaiser, que fabrica, la materia prima va por `602 → 241 / 612`.

**3.2 — El destino del gasto (clase 9 contra 79).** Los gastos también llevan
destino: `94 Gastos administrativos` o `95 Gastos de ventas` contra `791 Cargas
imputables`. El PCGE lo deja como opcional, pero **la mayoría de contadoras lo
usan**, y un Libro Diario sin clase 9 les va a parecer incompleto. Es un par fijo
por cuenta de gasto: se resuelve con el mapeo, no con código. Se pregunta a la
contadora y se activa o no por empresa.

**3.3 — Costo de ventas en el mismo período.** La venta lleva su asiento de costo
(`69 → 20/21`). Sin él, el margen del diario no existe. El kardex ya tiene el costo
de cada salida, así que es barato hacerlo desde el principio.

**3.4 — Fabricado vs revendido son cuentas distintas.** `701 Mercaderías` para lo
que se revende, `702 Productos terminados` para lo fabricado; y en el costo,
`691` / `692` contra `20` / `21`. Se deduce de si el producto tiene receta. Una
distribuidora no tendría este problema; Kaiser sí, y es parte de su historia.

**3.5 — Los libros electrónicos.** Ventas y compras ya van por **SIRE** (lo
tenemos). El Libro Diario y el Mayor van por **PLE**, formatos **5.1** y **6.1**,
hasta donde sé — SUNAT viene migrando libros a SIRE y hay que confirmar el estado
al momento de hacer la Fase 4. Lo que no cambia son los campos que piden: período,
CUO, correlativo, cuenta, centro de costo (opcional), moneda, tipo de cambio,
fecha de operación, fecha de vencimiento, tipo y número de comprobante, debe,
haber, glosa. **El modelo `AsientoDetalle` nace con esos campos**, para que la
exportación sea el formato oficial y no un Excel bonito.

**3.6 — Detracción y cuentas restringidas.** El importe detraído no es caja libre:
va a `107 Fondos sujetos a restricción` (la cuenta del Banco de la Nación), no a
`104`. Kaiser no tiene detracciones hoy, pero vende bienes y puede tenerlas.

**3.7 — Qué es un hecho contable.** Un comprobante **emitido** ya es una venta,
aunque el envío a SUNAT esté en cola o la boleta viaje en el resumen diario. Se
excluyen solo los **anulados** (comunicación de baja) y los **rechazados**. Un
pendiente de envío se asienta con marca, y si SUNAT lo rechaza, se extorna.

---

## 4. Cinco decisiones de diseño

**4.1 — Por lote, no en línea.** El asiento NO se genera dentro de la transacción
de venta. Se genera después, por período, desde una pantalla. Dos razones: no tocar
el flujo de facturación electrónica a días de una demo, y que un error contable no
pueda bloquear una venta. Contabilidad revisa antes de cerrar, que es como trabaja
de verdad.

**4.2 — Plan de cuentas acotado, a cinco dígitos.** El PCGE tiene cientos de
cuentas. Kaiser usa unas 50-60. Se siembra ese subconjunto en el **primer tramo**
de `init-db.ts` (el idempotente, antes del `return`), como los catálogos SUNAT —
o no llega a las instalaciones ya creadas.

**4.3 — El mapeo origen → cuenta va en base de datos.** `ConfiguracionContable`:
qué cuenta usa cada origen y cada categoría de gasto, y si se genera destino
(clase 9) o no. **Sin hardcodear** — la contadora va a querer cambiarlas, y si
están en el código, cada cambio es un despliegue.

**4.4 — Todo en soles.** Cada línea guarda moneda original, tipo de cambio del
documento e importe en soles. La diferencia de cambio queda fuera del alcance
mínimo (es del cierre mensual, con tipo de cambio de cierre).

**4.5 — Períodos que se cierran.** Un período `CERRADO` no admite regenerar ni
editar. `origen + origenId` únicos por asiento: regenerar un período abierto
reemplaza, nunca duplica.

---

## 5. Alcance mínimo defendible

### Fase 0 — El cimiento · 2-3 días · **HECHA (29-sep-2026)**

- `CuentaContable` (código, denominación, naturaleza, nivel, activa)
- `Asiento` (empresaId, sedeId, período, fecha, CUO, correlativo, glosa, origen,
  origenId, estado)
- `AsientoDetalle` con los campos del PLE 5.1: cuentaId, debe, haber, moneda,
  tipoCambio, tipoDocSunat, serie, número, fechaVencimiento, glosa
- `ConfiguracionContable`: mapeo por origen y por categoría; toggle de clase 9
- `PeriodoContable`: ABIERTO / CERRADO
- Servicio con **validación de cuadre**: un asiento que no cuadra no se guarda. Nunca
- Siembra del plan de cuentas en `init-db.ts`, tramo 1
- Pantalla **Libro Diario** (`/administrador/contabilidad/libro-diario`): asientos del
  período con sus líneas, asiento manual con cuadre en vivo, extorno, cerrar y
  reabrir período. Escribe solo quien tiene `contabilidad`; lee cualquiera
- Entrada de menú sembrada (Contabilidad › Libro Diario)
- `pnpm run qa:asientos` (39 comprobaciones) y una tercera invariante en
  `qa:todo`: cada asiento cuadra y sus totales coinciden con sus líneas

Lo que quedó en código: `backend/src/contabilidad/{plan-cuentas.seed,asiento-cuadre,
libro-diario.service,libro-diario.controller}.ts`, modelos `CuentaContable`,
`PeriodoContable`, `Asiento`, `AsientoDetalle`, `ConfiguracionContable`;
`frontend/src/features/admin/contabilidad/useLibroDiarioViewModel.ts` y
`pages/admin/contabilidad/LibroDiario.tsx`.

### Fase 1 — Ventas y compras · 4-5 días · **HECHA (29-sep-2026)**

Venta (fabricado o revendido según receta), **con su costo**:

```
Debe   1212 Facturas por cobrar             1,180.00
  Haber  40111 IGV por pagar                          180.00
  Haber  70111 / 70211 Ventas                       1,000.00

Debe   691 / 692 Costo de ventas              620.00     ← del kardex
  Haber  201 / 211 Existencias                        620.00
```

Compra, naturaleza **y destino** (§3.1). Notas de crédito como asiento inverso.
Detracción a `107`. Dólares al tipo de cambio del documento. Criterio de
inclusión según §3.7.

Lo que quedó en código: `backend/src/contabilidad/generacion-asientos.service.ts`,
`POST contabilidad/generar` (con `?simular=true` para la vista previa), y el botón
**Generar asientos** del Libro Diario con su modal de vista previa. QA:
`pnpm run qa:asientos-ventas` (38 comprobaciones).

Decisiones que se tomaron al construirlo, y por qué:

- **Las notas de venta (`NV`) quedan fuera.** Solo entran 01, 03, 07 y 08. Las NV
  de Kaiser son histórico importado del sistema anterior; asentarlas duplicaría
  ingresos que el sistema viejo ya declaró. Salen listadas como omitidas, no
  desaparecen en silencio.
- **El extorno cae en el período del asiento original**, no en el de hoy, si ese
  período sigue abierto. Anular en septiembre una compra de agosto dejaba agosto
  cuadrando sobre un importe que ya no existía. Si agosto está cerrado —ya
  declarado— el extorno va a la fecha de hoy, que es lo correcto.
- **El céntimo del redondeo se cuadra contra la contrapartida** (cliente o
  proveedor): repartir un neto entre dos cuentas de ingreso deja diferencias de
  0,01 que harían que `registrar()` rechazara el asiento entero.
- **El costo de ventas cae al costo promedio del producto** cuando el movimiento
  de kardex no guardó importe: hay movimientos con `valorTotal` en null.
- **Una compra marcada `esGasto` no lleva asiento de destino**: no es inventario.

### Fase 2 — Cobros, pagos, caja y gastos · 2-3 días · **HECHA (29-sep-2026)**

```
Debe   104 Cuentas corrientes               1,180.00
  Haber  1212 Facturas por cobrar                   1,180.00
```

Gastos operativos por `categoria` → cuenta 63/65 según el mapeo, con destino
94/95 contra 791 si la contadora lo activa. Recibos por honorarios con retención de
4ta (`40172`) como opción del mapeo.

Lo que quedó en código: cinco métodos más en `generacion-asientos.service.ts`
(`deCobro`, `dePagoCompra`, `deCaja`, `deGasto`, `deIngreso`) enganchados en
`generar()` por `opts.origenes`; un check por origen en el modal del Libro
Diario; la pantalla **Contabilidad › Configuración contable**
(`/administrador/contabilidad/configuracion`) con `GET`/`PUT
contabilidad/configuracion`. QA: `pnpm run qa:asientos-cobros`.

Decisiones que se tomaron al construirlo, y por qué:

- **Un documento se asienta una vez POR PERÍODO**, no una sola vez en la vida.
  Lo obligó el gasto `recurrenteDiario`: es **una** fila de `GastoOperativo` que
  guarda el importe de un día y se devenga todos los meses que dura, así que
  necesita un asiento por mes. `registrar()` acota su control de duplicados al
  período; para ventas y compras el criterio no cambia, porque la fecha del
  documento fija su período.
- **El recurrente se asienta una vez al mes por el total del mes** (importe
  diario × días cubiertos, con fecha del último día cubierto). Día a día llenaría
  el Diario de treinta asientos de veinte soles.
- **La detracción se imputa FIFO sobre los cobros del comprobante.** No hay
  campo que diga qué cobro la cubrió, así que sale del primer dinero que entra:
  es determinista y con un solo cobro —el caso normal— coincide con la realidad.
- **Yape y Plin van al 104, no al 101.** Son transferencias con otro nombre:
  contarlas como efectivo descuadra el arqueo. La cuenta bancaria del documento
  manda sobre el medio declarado.
- **La apertura y el cierre de caja no se asientan** y ni se listan como
  omitidos: se filtran en la consulta. Declaran cuánto hay en el cajón, no mueven
  patrimonio, y asentarlos duplicaría el saldo.
- **Un movimiento de caja es efectivo por definición**: la contrapartida es
  siempre el 101 aunque `metodoPago` diga transferencia. Lo que fue por banco se
  registra como gasto operativo o como cobro, no en caja.
- **`GastoOperativo` no guarda IGV**: se asienta el importe completo al gasto y
  no hay crédito fiscal. El 63/65 de la contadora incluirá el IGV de los gastos
  con factura. Mejora futura: un campo `igv` en el modelo y su línea 40111.
- **`IngresoManual` no guarda medio de pago**: entra por caja, que es el supuesto
  conservador. Distinguirlo pide un `medioPago` en el modelo.
- **El mapeo se edita desde la pantalla**, no desde el código: es la respuesta a
  "¿y si la contadora usa otras cuentas?". El `PUT` rechaza claves inventadas,
  cuentas de otra empresa y cuentas de agrupación (no imputables), que
  reventarían después al generar.

### Fase 3 — Planilla importada · 2-3 días · **HECHA (29-sep-2026)**

**Esto es lo que cierra el tema de planillas sin calcular una sola AFP.** Se sube el
Excel que ya produce el software de RRHH de Kaiser, y el ERP arma la provisión:

```
Debe   6211 Sueldos y salarios                 50,000.00
Debe   6271 EsSalud (9%)                        4,500.00
  Haber  4111 Sueldos por pagar                          40,700.00   ← el 41101 de la captura
  Haber  4031 EsSalud por pagar                           4,500.00
  Haber  4032 ONP por pagar                                 800.00
  Haber  40173 Renta de 5ta por pagar                     3,500.00
  Haber  407 AFP por pagar                                5,000.00
```

Con destino `94/95 → 791` si está activo. Y el gasto entra a `GastoOperativo` con
categoría `SUELDOS`, que ya existe.

Lo que **no** hace: calcular la boleta. Los 224 conceptos remunerativos de STARSOFT
quedan donde están. Gratificaciones, CTS y vacaciones entran como líneas más del
mismo Excel (`6214`, `6291`, `6215` contra `4114`, `4151`, `4115`), no se calculan.

Lo que quedó en código: `backend/src/contabilidad/{planilla.service,planilla.controller}.ts`,
modelos `PlanillaImportada` y `PlanillaImportadaDetalle`, pantalla en Contabilidad ›
Planilla, y `pnpm run qa:planilla` (46 comprobaciones).

Decisiones que se tomaron al construirlo:

- **El archivo se lee, no se recalcula.** Si el Excel declara sus totales, se usan
  los suyos y se avisa cuando no cuadran con la suma de conceptos. Lo único
  bloqueante es que `ingresos − descuentos ≠ neto`: eso haría que el asiento no
  cuadrara.
- **Las columnas se reconocen por varios nombres.** Cada software exporta el suyo
  («Total Haberes», «Neto a Pagar», «Aporte EsSalud»…), así que hay una lista de
  alias por campo y se avisa de las columnas que sobran en vez de fallar.
- **El gasto va por el COSTO DE EMPRESA** (ingresos + EsSalud), no por el neto:
  el neto es lo que reciben los trabajadores, no lo que cuesta la planilla.
- **El EsSalud aparece dos veces** en el asiento, y está bien: al debe como gasto
  del empleador (6271) y al haber como deuda con EsSalud (4031).
- **Un mes no se importa dos veces.** La vista previa avisa antes de intentarlo y
  el backend lo rechaza diciendo qué hacer.
- **Borrar exige extornar primero.** Primero se deshace la contabilidad y luego el
  dato, nunca al revés. Al borrar se lleva su gasto: no quedan gastos huérfanos.
- **Aquí las lecturas NO están abiertas**, a diferencia del resto de la API: una
  planilla trae el sueldo de cada persona con su nombre. Es la excepción razonada
  a la regla de la casa, y el QA la comprueba.

Lo que **no** hace, y es el punto: no calcula la boleta. Los 224 conceptos
remunerativos, PLAME y T-Registro quedan donde están.

### Fase 4 — Libros y salida · 2 días · **HECHA (29-sep-2026)**

- **Libro Mayor** por cuenta
- Exportación **PLE 5.1** (Diario) y **6.1** (Mayor), más Excel
- **Llenar el `Correlativo asiento` del SIRE**, que hoy sale vacío
- El equivalente al `SISTCONT` de STARSOFT: exportar el asiento en el formato del
  sistema contable de la contadora

**Total: 12 a 16 días de trabajo.** Tres semanas con holgura.


Lo que quedó en código: `backend/src/contabilidad/{libro-mayor.service,ple.service}.ts`,
endpoints `GET contabilidad/mayor`, `/mayor/balance`, `/asientos/exportar` y
`/ple/:libro`, pantalla en Contabilidad › Libro Mayor, y `pnpm run qa:libros`
(40 comprobaciones).

Dos cosas que cambiaron respecto al plan:

- **El correlativo del SIRE ya no aplica.** Ese hueco venía de la copia vieja de
  `sire.service.ts`, de la época del PLE. El módulo portado de MyPE usa el formato
  SIRE real (RVIE de 33 campos), que no tiene columna de correlativo de asiento.
  No había nada que rellenar.
- **El PLE 5.1 y 6.1 se generan pero NO están validados.** No se consiguió la
  especificación oficial campo por campo: el PDF del anexo de SUNAT rechaza la
  conexión. El archivo sale con la estructura documentada que sí se pudo
  contrastar, el orden de campos vive en una sola constante (`CAMPOS_5_1`) para
  poder ajustarlo de un vistazo, y **la pantalla lo advierte**: hay que pasarlo
  por el Programa Validador de SUNAT antes de presentarlo. Ventas y compras sí
  van por SIRE, que está verificado.

Y un bug propio, encontrado por su QA: el Mayor filtraba por `estado: REGISTRADO`,
así que al extornar un asiento **excluía el original pero seguía contando su
reverso** y restaba dos veces. En un libro no se quita nada: el asiento y su
extorno conviven y se anulan. Sin el filtro, el Mayor cuadra con el Diario.

---

## 6. Fuera de alcance, a propósito

| | Por qué |
|---|---|
| Costo de producción (24 → 61/71 → 21) | el kardex ya valoriza lo fabricado; el asiento de fábrica es una fase posterior |
| Depreciación de activos fijos | Kaiser no lo pidió |
| Diferencia de cambio | requiere cierre mensual con tipo de cambio de cierre |
| Cierre anual y destino de resultados | una vez al año, lo hace la contadora |
| Balance de comprobación y estados financieros | salen del Mayor; segunda vuelta |

Lo que **no** está fuera, aunque lo estuvo en el primer borrador: el asiento por
destino de existencias y el costo de ventas. Sin ellos el Diario está mal, no
"simplificado".

---

## 7. Tres preguntas para Kaiser, ninguna bloquea el arranque

1. **¿Qué plan de cuentas usa la contadora, y usa clase 9?** El suyo, no el PCGE
   genérico. Necesito el listado. Mientras no llegue, se siembra el subconjunto
   estándar y se ajusta por el mapeo.
2. **¿Con qué sistema contable trabaja y qué formato importa?** Define la Fase 4
   (el equivalente a su `SISTCONT`).
3. **¿Qué software de planillas usan y qué exporta?** Define el importador de la
   Fase 3. Y de paso responde lo de "no le ayuda del todo".

---

## 8. Riesgos

- **El cuadre.** Un asiento descuadrado en producción es peor que no tener asientos.
  Validación dura + comprobación en `qa:todo`, como los invariantes de inventario:
  después de cada script, Σ debe = Σ haber en todos los períodos.
- **Regenerar.** Resuelto por diseño (§4.5): `origen + origenId` únicos y períodos
  cerrados.
- **Multi-sede.** `sedeId` en `Asiento` desde el primer día.
- **El plan de cuentas equivocado.** El riesgo real: si la contadora usa otras
  cuentas, el trabajo no se pierde pero la demo pierde credibilidad. De ahí que
  el mapeo sea configurable y no código.
- **Extornos.** Un comprobante asentado que SUNAT rechaza después necesita su
  asiento inverso automático, no un borrado.

---

## 9. Cómo se demuestra

Abrir el Libro Diario, mostrar los asientos del mes generados solos desde las ventas
y compras que Kaiser ya tiene cargadas, entrar a uno y ver de qué comprobante salió,
enseñar que la venta de una malla fabricada fue a `702` y la de un alambre revendido
a `701`, y exportar el PLE.

Y decir la frase que importa: **"su contadora deja de picar"**.

Es exactamente lo que elogió Karim, sin haber calculado una planilla.
