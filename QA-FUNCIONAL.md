# QA funcional de Kaiser ERP

Recorrido completo, de abajo arriba: cada fase se apoya en la anterior, así que
un fallo en maestros contamina todo lo que viene después. Se ejecuta en ese
orden a propósito.

**Criterio**: no basta con que la pantalla cargue. Cada fase ejercita el flujo
real y comprueba el DATO — que el stock quede donde debe, que el documento
diga lo que tiene que decir, y que el número cuadre con el del módulo de al
lado.

**Regla**: todo lo que el QA cree, el QA lo borra. El inventario y los datos de
demostración quedan como estaban.

---

## Fase 0 — Cimientos ✔
- [x] Backend y frontend arrancan; la app compila con tipado (0 errores)
- [x] Login de los 5 usuarios con selección de sede
- [x] Matriz de permisos: 100 casillas, 11 lecturas × 5 roles + 9 escrituras × 5
- [x] Menú por rol: gerencia 17 módulos, ventas 9, almacén 4, producción 3, contabilidad 5

**Hallazgo**: el módulo `tienda` seguía asignado al plan aunque su código se
eliminó con la capa SaaS. El frontend lo ocultaba por una condición de plan,
pero si esa condición cambiase el menú llevaría a una ruta inexistente. Se
desasigna, y `seedMenuKaiser` lo mantiene fuera junto con reseller, marketing,
ecommerce, mi-negocio y vehiculos.

## Fase 1 — Maestros ✔
`pnpm run qa:maestros` · 21 comprobaciones
- [x] Catálogos SUNAT: 22 unidades, 6 tipos de documento, 14 motivos, 1874 ubigeos
- [x] Empresa: RUC real de 11 dígitos, FORMAL, una sola sede principal
- [x] Productos: 407, sin códigos duplicados, sin precios ni stock negativos
- [x] Alta, edición y rechazo de código duplicado
- [x] Clientes: 14, todos con documento de formato válido; rechazo de RUC corto

**Hallazgo**: las validaciones de datos del servicio de clientes lanzaban
`ForbiddenException` (403) en vez de `BadRequestException` (400). El mensaje era
correcto, pero 403 significa "no tienes permiso" y 400 "tu dato está mal": una
integración las trataría al revés. 16 excepciones corregidas.

## Controles negativos

Un script de QA que siempre dice "todo correcto" es indistinguible de uno que no
comprueba nada, y las dos primeras fases salieron idénticas en tres pasadas
seguidas. Así que se comprueba el QA a sí mismo: se rompe algo a propósito y se
exige que la comprobación se ponga en rojo. Si no se pone, es decorativa.

| Comando | Qué hace |
|---|---|
| `pnpm run qa:control-maestros` | Inyecta 5 defectos de datos, uno a uno, y exige que la Fase 1 los cace |
| `pnpm run qa:control-permisos` | Le quita un permiso a almacén y exige que sus casillas de la matriz se pongan en 403 |

Los dos revierten en su `finally` y comparan una huella de las tablas tocadas
contra la de antes de empezar, así que se pueden correr contra la base de la demo.

Resultado: 5 de 5 defectos cazados, 0 puntos ciegos, y la matriz de permisos se
mueve cuando se le quita el permiso. Sin residuo en ninguno de los dos.

Dos cosas que salieron de aquí y no del QA normal:

- El código de producto duplicado **no se puede ni inyectar**: hay un índice
  único `(empresaId, codigo)` en la base. La comprobación del QA es redundante
  con el motor, que es el sitio correcto donde tenerla.
- Revocar un permiso **surte efecto en la petición siguiente**, no al caducar el
  token: `JwtStrategy` lee `permisos` de base en cada petición. Si a alguien se
  le retira un área, deja de tenerla al instante.

---

## Fase 2 — Compras y recepción ✔
`pnpm run qa:compras` (39) · `qa:por-llegar` · `qa:docs-compra`
- [x] Solicitud → 2 cotizaciones → comparativo → orden de compra
- [x] El comparativo marca la más barata y la orden hereda su precio
- [x] Recepción: genera la compra, mueve kardex, no se puede recibir dos veces
- [x] Compra en dólares: el ingreso entra a precio × tipo de cambio
- [x] Anulación: la salida compensatoria sale al mismo valor al que entró
- [x] Aviso de mercadería por llegar (ventana, destinatarios, no insiste)
- [x] Expediente documental: packing list, factura, incidencia
- [x] Cuentas por pagar: saldo, vencimiento, pago parcial

**Hallazgo grave — el tipo de cambio no se aplicaba al anular.** El ingreso de
una compra en dólares se valorizaba en soles (correcto), pero el movimiento
compensatorio de la anulación usaba `precioUnitario` en crudo: entraba a
S/ 37.50 y salía a S/ 10.00. La cantidad cuadraba, así que a simple vista no se
notaba, pero el kardex retiraba una cuarta parte del valor que había metido y el
costo promedio del producto quedaba inflado de forma permanente — y con él el
margen y el COGS. Afectaba también a la edición de una compra, que revierte por
la misma vía. Corregido en `revertirInventarioCompra`.

**Hallazgo — dato de compras accesible por otra puerta.** `GET /compras` devuelve
403 a ventas, pero `GET /kardex/inventario-valorizado` le entregaba nombre y RUC
del proveedor, el número de su factura y su precio unitario. El costo se
mantiene abierto a propósito (un vendedor lo necesita para cotizar con margen);
el bloque del proveedor ahora exige el permiso `compras`, igual que la puerta
principal. Nuevo helper `tienePermiso()` con el mismo criterio OR que
`PermisosGuard`, para no acabar con dos reglas distintas de lo mismo.

**Hallazgo menor — aprobar una solicitud la dejaba sin salida.** Con la solicitud
en APROBADA no se podían añadir cotizaciones, que es justo el paso siguiente.
No estaba vivo (ninguna pantalla aprueba solicitudes; el estado solo se alcanza
por API), pero la trampa estaba puesta para el día que se cablee el botón.
Ampliada la guarda de `agregarCotizacion`; editar sigue cerrado tras aprobar,
que es lo correcto.

**Pendiente de decisión (no es un bug):** contabilidad no tiene el permiso
`compras`, así que recibe 403 en `GET /compras` aunque es quien lleva el Libro de
Compras del SIRE. Lo saca por `/contabilidad/sire/compras-txt`, que sí tiene, pero
no puede abrir una compra concreta para conciliarla. Hay que decidir si se le da
lectura.

## Fase 3 — Inventario
- [ ] Ajuste manual (positivo y negativo)
- [ ] Traslado entre sedes: sale de una, entra en la otra
- [ ] Tarjeta de stock: que TODO movimiento figure
- [ ] Trazabilidad: línea de tiempo, registros tardíos, descuadres
- [ ] Consolidado: ingresos, salidas, traslados; descarga a Excel
- [ ] Inventario valorizado: proveedor, lote, costo

## Fase 4 — Producción
- [ ] Receta (BOM) con sus insumos
- [ ] Orden de producción: consume insumos, genera producto terminado
- [ ] Merma registrada y reflejada en el costo
- [ ] Costeo: el costo del terminado sale de lo consumido

## Fase 5 — Ciclo comercial
- [ ] Cotización: alta, PDF, moneda (soles y dólares)
- [ ] Cotización → nota de venta / factura
- [ ] Nota de pedido: estados y autorización
- [ ] Stock disponible al cotizar

## Fase 6 — Facturación electrónica
- [ ] Factura contra el sandbox SUNAT: XML, CDR, QR
- [ ] Boleta
- [ ] Nota de crédito → devolución pendiente → visto bueno de almacén
- [ ] Anulación de comprobante: revierte stock y pagos
- [ ] El PDF: datos de la empresa, cuentas, firma, sin marcas internas

## Fase 7 — Despacho
- [ ] Guía de remisión desde una factura
- [ ] Guía con QR válido
- [ ] Motivos de traslado: cuáles mueven kardex y cuáles no
- [ ] Anulación de guía con motivo, devolviendo stock

## Fase 8 — Cobros y caja
- [ ] Registro de pago sobre un comprobante
- [ ] Pago parcial y saldo pendiente
- [ ] Turno de caja: apertura, movimientos, arqueo, cierre
- [ ] Comisiones de vendedor

## Fase 9 — Contabilidad y finanzas
- [ ] Reporte contable del periodo
- [ ] SIRE: libro de ventas y libro de compras (TXT)
- [ ] P&L: ingresos, costo de mercadería, gastos, utilidad
- [ ] Reportes de gestión: por vendedor, cliente, producto, sector, ubigeo

## Fase 10 — Cuadres cruzados
Aquí es donde aparecen los fallos de verdad: cada número tiene que coincidir
con el mismo número visto desde otro módulo.

- [ ] Ventas del periodo = suma de comprobantes = ingresos del P&L
- [ ] Stock del inventario = último saldo del kardex, producto a producto
- [ ] Cuentas por cobrar = saldos pendientes de los comprobantes
- [ ] Cuentas por pagar = saldos pendientes de las compras
- [ ] Costo de mercadería del P&L = salidas valorizadas del kardex
- [ ] Caja del turno = pagos en efectivo del periodo
- [ ] SIRE ventas = comprobantes formales emitidos

---

## Estado

| Fase | Estado | Hallazgos |
|---|---|---|
| 0 | ✔ | módulo `tienda` asignado al plan sin código detrás |
| 1 | ✔ | validaciones devolvían 403 en vez de 400 |
| 2 | ✔ | tipo de cambio no se aplicaba al anular una compra en USD |
| 3 | pendiente | |
| 4 | pendiente | |
| 5 | pendiente | |
| 6 | pendiente | |
| 7 | pendiente | |
| 8 | pendiente | |
| 9 | pendiente | |
| 10 | pendiente | |
