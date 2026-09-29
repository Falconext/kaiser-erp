# Subir a producción

Estado: **36 commits sin subir** y 4 migraciones pendientes. Producción no tiene
ninguno de los arreglos de esta tanda.

Lo que Kaiser tiene ahora mismo en producción, y que estos commits corrigen:

| | |
|---|---|
| El dashboard y el P&L | enseñan una **ganancia donde hay pérdida** (suman el IGV como ingreso) |
| El arqueo de caja | informa un **sobrante cuando falta dinero** |
| La numeración de facturas | **dos facturas pueden llevar el mismo número** |
| El inventario | dos operaciones simultáneas crean **stock fantasma** |
| Reclasificar un producto a servicio | **borra su inventario** sin dejar rastro |
| Anular una compra en dólares | deja el **costo promedio inflado** para siempre |
| El listado de guías | **pierde el último día y medio** del mes |

---

## 1. Antes de tocar nada

```bash
cd backend
DATABASE_URL="<url de producción>" pnpm run deploy:preflight
```

Solo lee. Comprueba lo único que puede tumbar el despliegue —**correlativos de
comprobante repetidos**, que harían fallar el índice único y dejarían la base a
medio migrar— y te dice con qué se va a encontrar.

**Si salen duplicados, no despliegues.** Hay que dejar cada grupo en uno: mirar cuál
es el válido (el que tiene CDR de SUNAT) y dar de baja o renumerar los demás.

## 2. Las cuatro migraciones

Tres son aditivas y no pueden fallar:

- `pago_compra_observacion` — una columna de texto
- `orden_produccion_costos` — tres columnas de importe con valor por defecto
- `comprobante_descartado` — una tabla nueva

La cuarta es la que importa:

- `unique_correlativo_comprobante` — índice ÚNICO sobre (empresa, tipo, serie,
  correlativo). Es lo que impide que dos facturas lleven el mismo número, y lo que
  hace que el reintento que ya existía en el código sirva de algo.

El `build` de Railway corre `prisma db push --accept-data-loss`, así que se aplican
solas. El preflight es la red de seguridad.

## 3. Avisa de esto antes, no después

Las ventas históricas **van a bajar en pantalla** al dejar de contar el IGV como
ingreso. En la base de la demo son S/ 321.249 → S/ 272.245. No se pierde dinero: se
deja de sumar un impuesto que nunca fue de Kaiser. Pero si alguien mira el dashboard
el lunes sin saberlo, va a pensar que algo se rompió.

El preflight imprime la cifra exacta de producción para que puedas decirla.

## 4. Después de desplegar

```bash
cd backend
DATABASE_URL="<url de producción>" pnpm run qa:cuadres      # solo lee
DATABASE_URL="<url de producción>" pnpm run cuadres:corregir # en seco por defecto
```

`qa:cuadres` cruza doce cifras entre módulos y no escribe nada. Si encuentra
descuadres heredados —ventas sin movimiento de kardex, stock que no coincide con su
kardex— `cuadres:corregir` los arregla: va **en seco** por defecto y solo escribe con
`--aplicar`.

### ⚠ NO corras `cuadres:corregir --aplicar` contra producción todavía

Comprobado el 29-sep-2026 con el preflight: producción tiene **34 comprobantes y
ninguno con movimiento de kardex** — 28 notas de venta (NV01, de junio a
septiembre), 5 facturas y 1 boleta. Los 18 movimientos que hay son de producción,
compras y un ajuste.

Esas notas de venta entraron por `importar-nota-venta.service.ts`, que carga
histórico desde Excel **y no toca el kardex a propósito**: son registros de lo que
ya pasó, no ventas que deban descontar stock hoy.

El problema es que ese importador **no marca `origenDato`** —columna que además
llega con esta misma tanda, así que para las filas existentes quedará en `NULL`—, y
`corregir-cuadres.mjs` solo descarta lo importado por ese campo (línea 153). Sin la
marca, daría por buenas las 34 y **crearía 34 movimientos de salida**, descontando
stock real de los 323 productos que hoy tienen existencias.

**Resuelto el 29-sep-2026**, con tres candados en vez de uno:

1. `importar-nota-venta.service.ts` ya escribe `origenDato: 'importacion-nv'`, así
   que lo que se cargue de ahora en adelante queda marcado.
2. `corregir-cuadres.mjs` descarta **cualquier** nota de venta sin marca de origen,
   exista o no `origenDato`. Una NV creada de verdad en el ERP descuenta stock al
   emitirse: si llegó ahí sin movimiento, no es una venta del día. Para forzarlo
   está `--incluir-nv`, y hay que quererlo.
3. `pnpm run marcar:nv` marca las ya cargadas. Va **en seco** por defecto y solo
   toca las que cumplen las tres condiciones: `tipoDoc = 'NV'`, sin `origenDato` y
   **sin ningún movimiento de kardex**.

Queda pendiente pasarlo por producción cuando haya ventana de acceso a la base:

```bash
DATABASE_URL="<url de producción>" pnpm run marcar:nv             # en seco
DATABASE_URL="<url de producción>" pnpm run marcar:nv -- --aplicar
```

No corre prisa: con el candado 2, `cuadres:corregir` ya no puede hacer daño ahí.

`qa:cuadres` sí se puede correr contra producción, y ahora de verdad: antes tenía
la API en duro a `localhost:4201` y cruzaba los datos de una base con la API de
otra. Ahora lee `API_URL`:

```bash
API_URL="https://kaiser-erp-production.up.railway.app/api" \
  DATABASE_URL="<url de producción>" pnpm run qa:cuadres
```

### Y una herida abierta en la base de la demo

En local esas 28 notas de venta **ya tienen 43 movimientos de kardex inventados**
por `cuadres:corregir` (llevan `[cuadre] Salida que faltaba` en la observación).
Producción está limpia; la demo no. `marcar:nv` no los toca a propósito —quitar un
movimiento cambia el stock— y los deja listados para decidir a mano.

## 5. Lo que queda por decidir, y no es técnico

- **Comisiones sobre el IGV.** Hoy se calcularían sobre el precio con impuesto: un
  18 % de más, sobre dinero de SUNAT. No hay ninguna configurada, así que no corre
  prisa, pero conviene decidirlo antes de configurar la primera.
- **Merma normal frente a anormal.** Hoy toda la merma se capitaliza en el producto
  terminado. El dato para separarlas (`mermaEsperadaPorcentaje`) se guarda y no se
  usa.
- **Tope de sesiones por usuario.** Hay cientos de refresh tokens vivos a la vez.
- **Lectura de compras para contabilidad.** Ya la tiene; queda confirmar que es lo
  que Kaiser quiere.

## 6. Y cuando Kaiser salga en vivo

Las URLs de QPSE apuntan al sandbox. `QPSE_USE_DEMO` **no lo lee ningún código**: el
entorno lo deciden solo `QPSE_BASE_URL` y `QPSE_AUTH_BASE_URL`. Para producción hay
que ponerlas a `cpe.qpse.pe`.
