# Migración del histórico — Kaiser Corporation S.A.

Este documento responde las tres preguntas del punto 3 del pliego: **qué se
migra, cómo se migra y qué recibe Kaiser al terminar.**

STARSOFT planteó que solo migra tablas maestras y no movimientos ni
transacciones. Aquí se migran ambos: maestros **y** el histórico de
operaciones, con saldos.

---

## 1. Qué se migra

| Lo que preguntó Karim | ¿Se migra? | Cómo entra al ERP |
|---|---|---|
| Clientes | **Sí** | Padrón con dirección, ubigeo y sector — el ubigeo y el sector son los que habilitan los reportes por zona y por rubro |
| Proveedores | **Sí** | El mismo padrón, marcados con rol `PROVEEDOR` |
| Productos | **Sí** | Catálogo con unidad, categoría, precio y costo |
| Inventario | **Sí** | Saldo inicial valorizado por almacén, como movimiento de apertura del kardex |
| Ventas históricas | **Sí** | Comprobantes emitidos, con su cliente, vendedor, moneda y tipo de cambio |
| Compras | **Sí** | Facturas de proveedor con fecha de vencimiento |
| Facturas | **Sí** | Son las ventas: se migran como documentos ya emitidos |
| Notas de crédito | **Sí** | Con su motivo del catálogo 09 y el documento que corrigen. El ERP las resta de las ventas del periodo |
| Líneas de la compra | **Sí** | Hoja `COMPRAS_DETALLE`, opcional: qué se le compró a cada proveedor |
| Kardex | **Parcial — ver abajo** | Saldo inicial; el movimiento histórico es opcional |
| Saldos | **Sí** | Salen de las ventas y compras: lo pendiente de cobro y de pago |
| Notas de débito | **No** | No se han visto en el histórico de Kaiser. Si aparecen, es una opción más en `tipo_doc` |
| Historial de pagos | **No** | Viaja el saldo pendiente, no los pagos parciales ni sus fechas. Encarece la exportación y lo que se cobra es el saldo |
| Ventas por almacén | **Sí** | Columna `almacen` en VENTAS y en COMPRAS, con el nombre de la sede |
| Otros movimientos | **A definir** | Según lo que P&P pueda exportar |

### Sobre el kardex, con franqueza

Se migra el **saldo inicial valorizado** al día del corte, y desde ahí el ERP
construye el kardex con la operación diaria. No se reconstruye el movimiento
histórico completo hacia atrás.

Es deliberado, y es lo que se hace en una puesta en marcha seria: para
reconstruir un kardex histórico fiel habría que traer cada ingreso y salida en
orden con su costeo, y cualquier hueco en el origen descuadra el costo promedio
de todos los movimientos posteriores. Un saldo inicial contado y valorizado es
un punto de partida sólido y auditable.

**De dónde sale el costo.** El `costo_unitario` de la hoja INVENTARIO es el que
manda: es la toma física valorizada al corte, es obligatorio, y viene por almacén.
De ahí se calcula el `costoPromedio` del producto como **promedio ponderado entre
almacenes** — con 100 unidades a 40 en un almacén y 50 a 46 en otro, el costo queda
en 42.00 y el stock en 150. La columna `costo` de la hoja PRODUCTOS es opcional y
solo se usa si viene llena; dejarla vacía no borra nada. Importa porque es el costo
con el que el ERP valoriza cada salida y calcula el margen: si entrara en cero, las
primeras ventas saldrían con margen del 100 %.

**Lo que Kaiser no pierde:** el histórico de documentos (ventas y compras) sí se
migra completo, así que el análisis comercial hacia atrás —qué se le vendió a
quién, a qué precio, en qué mes— se conserva.

**Si Kaiser quiere el kardex movimiento por movimiento**, se puede hacer: hace
falta que P&P exporte los movimientos con fecha, tipo, cantidad y costo
unitario. Es una hoja más en la plantilla y una semana adicional de trabajo.
Conviene decidirlo antes de arrancar, no a mitad.

---

## 2. Cómo se migra

El proceso tiene cuatro pasos y está automatizado. No es trabajo manual de
copiar y pegar.

### Paso 1 — Kaiser recibe las plantillas

```bash
pnpm run migracion:plantillas
```

Genera `PLANTILLAS-MIGRACION-KAISER.xlsx`: una pestaña por tipo de información,
con los encabezados exactos, filas de ejemplo y una hoja de INSTRUCCIONES que
explica qué va en cada una de las 65 columnas.

Kaiser (o el proveedor de P&P) exporta su información con ese formato.

### Paso 2 — Se valida sin tocar nada

```bash
pnpm run migracion:validar -- archivo.xlsx
```

Revisa el archivo completo y **no escribe nada en el sistema**. Si algo está
mal, devuelve la lista exacta de qué corregir:

```
CLIENTES fila    3 · num_doc: un RUC debe tener 11 dígitos (venía "123")
CLIENTES fila    5 · num_doc: repetido: ya aparece en la fila 2
VENTAS   fila    3 · tipo_cambio: obligatorio cuando la moneda es USD
VENTAS   fila    4 · total: no cuadra: gravado (10000) + igv (1800) = 11800.00
VENTAS   fila    5 · cliente_doc: no existe en la hoja CLIENTES
```

Qué se valida: campos obligatorios, tipos y formatos de fecha, valores
admitidos, RUC de 11 dígitos y DNI de 8, ubigeo de 6, que los totales cuadren
con base + IGV, que el saldo no supere el total, que no haya documentos
repetidos y que cada venta apunte a un cliente y a productos que existen.

Este paso se repite con Kaiser hasta que el archivo sale limpio. **Aquí es
donde se resuelven los problemas, no en producción.**

### Paso 3 — Se carga

```bash
pnpm run migracion:cargar -- archivo.xlsx
```

Carga en orden de dependencias: clientes → productos → inventario → ventas →
compras. Se puede cargar por partes con `--solo=VENTAS,COMPRAS`.

Dos garantías:

- **Es idempotente.** Cada fila se identifica por su clave natural (documento,
  código, serie + número). Volver a correrlo actualiza en vez de duplicar. Esto
  permite hacer ensayos, corregir y recargar sin ensuciar la base.
- **Deja un reporte** en markdown con cuántos registros se crearon, se
  actualizaron y se omitieron, por cada tipo de información.

El reporte también avisa de las **unidades de medida que no reconoció**. Conviene
mirarlo: Kaiser vende por kilo (`KGM`) y por metro (`MTR`), y una unidad que no
empareja queda como `NIU` (UNIDAD). Si el archivo trae `KG` en vez de `KGM`, los
productos se cargan igual pero con la unidad equivocada, y eso sale impreso en cada
factura que se emita a SUNAT.

### Paso 4 — Se verifica, y si hace falta se revierte

```bash
pnpm run migracion:revertir
```

Todo lo migrado queda marcado internamente con `[migracion]`. La reversión
borra exactamente eso y nada más: lo que el ERP haya emitido después queda
intacto.

Esta es la red de seguridad del corte. Si el fin de semana de la puesta en
marcha algo no cuadra, se revierte y se vuelve a cargar corregido, sin rehacer
la base ni perder la configuración.

---

## 3. Qué recibe Kaiser al terminar

Al cierre de la migración, Kaiser entra al ERP y encuentra:

- **Su padrón completo** de clientes y proveedores, con ubigeo y sector, listo
  para que los reportes por zona y por rubro tengan sentido desde el día uno.
- **Su catálogo** con precios y costos.
- **Su inventario** cuadrado contra la toma física del corte, valorizado.
- **Su histórico de ventas**: qué le vendió a cada cliente, cuándo, en qué
  moneda y con qué vendedor. Los reportes por vendedor, cliente, producto,
  sector y ubigeo funcionan sobre datos reales, no sobre una base en blanco.
- **Sus cuentas por cobrar**: qué cliente debe cuánto y desde cuándo.
- **Sus cuentas por pagar**: qué se le debe a cada proveedor y cuándo vence.
- **Un reporte de migración** que dice exactamente cuántos registros entraron de
  cada tipo, para cuadrar contra los reportes del sistema anterior.

### Cómo se comprueba que quedó bien

El mismo día del corte se cuadran cuatro cifras contra P&P:

| Qué se cuadra | Dónde se ve en el ERP |
|---|---|
| Valor del inventario | Inventario → Productos |
| Cantidad y total de comprobantes emitidos | Facturación → Comprobantes |
| Total por cobrar a clientes | Finanzas → Cuentas por cobrar |
| Total por pagar a proveedores | Compras |

Si las cuatro cuadran, la migración está cerrada.

---

## La columna `almacen`, y por qué conviene llenarla

Kaiser tiene dos sedes, y el reparto no es el que sugieren sus nombres:

| Sede en el ERP | Dirección | Facturación |
|---|---|---|
| Almacén Chacra Cerro | Comas | **~95 %** de los pedidos |
| Sede Principal - La Victoria | Jr. Francia 1028 | ~5 % |

La que está marcada como **principal** en el ERP es La Victoria, que es la del 5 %.
Por eso `VENTAS` y `COMPRAS` llevan una columna `almacen` con el nombre de la sede:
**si se deja vacía, la fila cae en la principal**, y con eso el 95 % del histórico
quedaría atribuido a la sede equivocada. Los reportes por sede saldrían invertidos.

Un nombre de sede que no exista en el ERP no detiene la carga —la fila entra en la
principal— pero **se lista en el reporte de migración**. Conviene mirarlo.

---

## Las notas de crédito, y por qué el saldo va neto

Las notas de crédito van en la **misma hoja VENTAS**, con `tipo_doc = NOTA_CREDITO`
y cuatro columnas más: el `motivo` del catálogo 09 de SUNAT y el tipo, serie y
número del documento que corrigen. Las cuatro son obligatorias solo en esas filas, y
la validación rechaza una nota que corrija un documento que no esté en el archivo.

Hay un detalle que hay que entender antes de llenar la plantilla, porque decide si
las cuentas por cobrar salen bien:

**El ERP no descuenta la nota del saldo de la factura.** Son dos documentos
independientes: la nota resta de las **ventas del periodo** (los reportes le aplican
signo negativo) pero no toca la deuda de la factura. Por eso:

- El `saldo_pendiente` de la **factura** tiene que venir **ya neto** — de sus notas
  de crédito y de los pagos recibidos. Es la deuda real de hoy.
- La **nota** se carga **saldada**, con saldo 0 y estado COMPLETADO, aunque el
  archivo traiga un importe en esa columna. Si entrara con saldo aparecería como una
  deuda que nadie debe, y restaría dos veces.

Dicho de otro modo: la nota de crédito arregla el **histórico de ventas**; las
**cuentas por cobrar** salen del saldo que exporte P&P. Si ese saldo viene en bruto,
Kaiser va a ver deuda que ya no existe, y eso no lo puede detectar el migrador.

---

## 4. Los comprobantes históricos y SUNAT

Las ventas migradas entran como documentos **ya emitidos** y se marcan
`NO_APLICA` frente a SUNAT: **no se reenvían**. El sistema anterior ya los
declaró, y reenviarlos generaría duplicados ante SUNAT.

Lo que sí queda activo desde el día uno es la emisión nueva: el ERP emite
factura, boleta, nota de crédito y guía de remisión electrónica contra SUNAT
con XML, CDR y QR.

---

## 5. Las tres semanas, día por día

Lo que se prometió son tres semanas. Esto es lo que pasa en cada una:

**Semana 1 — Levantamiento y primera carga de prueba**
- Kaiser entrega los archivos exportados de P&P.
- Se validan y se devuelve la lista de correcciones.
- Primera carga de prueba en un ambiente separado.
- Se cuadra contra los reportes de P&P y se ajusta el mapeo.

**Semana 2 — Ajustes y ensayo completo**
- Segunda vuelta con las correcciones de Kaiser.
- Ensayo de migración completa, con cuadre de las cuatro cifras.
- Kaiser revisa su información dentro del ERP y valida que sea la suya.
- Se cierra la configuración: sedes, series de comprobantes, usuarios y
  permisos por área.

**Semana 3 — Corte y puesta en marcha**
- Se define la fecha de corte (idealmente un fin de mes).
- Kaiser hace la toma física de inventario a esa fecha.
- Carga final con los datos del corte, en fin de semana.
- Cuadre final y firma de conformidad.
- Capacitación por área: ventas, almacén, producción, compras y contabilidad.
- El lunes Kaiser opera en el ERP.

### Lo que hace falta de Kaiser

Para que las tres semanas se cumplan:

1. **Un responsable por área** que valide que su información quedó bien. La
   migración se cuadra con quien conoce el dato, no con quien lo carga.
2. **La exportación de P&P** en la primera semana. Es la dependencia crítica: si
   los archivos llegan tarde, todo se corre.
3. **La toma física de inventario** a la fecha de corte.
4. **Definir antes de arrancar** si se quiere el kardex histórico movimiento por
   movimiento (suma una semana).

---

## El ensayo

Antes de tocar los datos de Kaiser, el proceso completo se prueba solo:

```bash
pnpm run qa:migracion
```

Genera las plantillas, arma un libro sintético con dos almacenes y ventas en soles
y en dólares, comprueba que un archivo con siete errores plantados sea rechazado
con el detalle exacto, carga, cuadra las cuatro cifras, **recarga el mismo archivo
para probar que no duplica**, recarga con cantidades corregidas para probar que
ajusta, revierte, y termina comprobando que la base quedó como estaba. 65
comprobaciones.

Usa códigos `QAMIG-` y RUC `20999…` para no poder emparejar con el catálogo real,
y limpia lo que crea. Correrlo no ensucia nada.

Conviene correrlo también **con el archivo real de Kaiser** en la primera semana,
antes del ensayo de migración completa: es la forma de descubrir problemas de
formato cuando todavía hay tiempo de pedir una reexportación.

---

## Referencia técnica

| Comando | Qué hace |
|---|---|
| `pnpm run migracion:plantillas` | Genera el Excel de plantillas para Kaiser |
| `pnpm run migracion:validar -- <archivo>` | Valida sin escribir y lista qué corregir |
| `pnpm run migracion:cargar -- <archivo>` | Carga (idempotente) y deja reporte |
| `pnpm run migracion:cargar -- <archivo> --solo=VENTAS` | Carga solo ciertas hojas |
| `pnpm run migracion:revertir` | Deshace todo lo migrado |
| `pnpm run qa:migracion` | Ensayo completo de punta a punta con datos sintéticos |

El código está en `backend/src/migracion/`:

- `esquema.ts` — define las hojas y columnas. Es la única fuente de verdad: de
  aquí salen las plantillas, la validación y la tabla de campos. Agregar una
  columna es tocar un solo archivo.
- `validar.ts` — lectura del Excel y validación por fila y entre hojas.
- `migrar.ts` — carga, reversión y reporte.
- `generar-plantillas.ts` — genera el Excel que recibe Kaiser.

**Una limitación conocida:** la carga no es transaccional entre tipos de
información. Si falla a mitad (por ejemplo, por un corte de red), queda cargado
lo anterior. Como es idempotente, la solución es volver a correrlo: retoma sin
duplicar. Para el corte real conviene correrlo en una ventana sin interrupciones.
