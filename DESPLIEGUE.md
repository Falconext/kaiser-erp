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
