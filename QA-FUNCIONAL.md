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
`pnpm run qa:compras` (39) · `qa:concurrencia` · `qa:por-llegar` · `qa:docs-compra`
Repetida 5 veces: mismas 39 comprobaciones y huella de la base intacta (`qa:huella`).
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

**Resuelto — separación de funciones en compras.** `compras` se partió en lectura
y escritura, igual que ya estaba `kardex`. Contabilidad lleva el Registro de
Compras y necesita abrir la factura del proveedor para cuadrar el crédito fiscal,
pero no debe poder modificarla: eso es control interno, no una comodidad. Almacén
registra, contabilidad lee, ventas y producción no ven compras (el precio al que
Kaiser compra es información comercial). 33 rutas de escritura protegidas en
compras, solicitudes, órdenes e importaciones, y 13 en el padrón de clientes
—donde viven los proveedores— para que dar lectura a contabilidad no les abriera
el alta de proveedores de rebote. `pnpm run qa:permisos-compras` lo comprueba.

## Concurrencia de la numeración

Repetir una fase cinco veces en fila no prueba nada sobre el caso que de verdad
falla: dos personas haciendo lo mismo **a la vez**. Los dos sitios que numeran con
"el último + 1" leen el máximo y luego insertan, sin transacción.

`pnpm run qa:concurrencia` lanza 6 en paralelo y exige que salgan las 6, con
números distintos y sin huecos.

**Hallazgo grave — el comprobante admitía dos con el mismo número.** La tabla
`Comprobante` no tenía ningún índice único sobre (empresa, tipoDoc, serie,
correlativo): solo la clave primaria. Comprobado insertando un segundo
F0A1-00000011, que la base aceptó. Y lo peor: `crearComprobanteConReintento` ya
capturaba P2002 para este caso, pero **ese P2002 no lo producía nadie** — era una
protección que no podía entrar. Dos emisiones simultáneas leían el mismo
correlativo y las dos se guardaban, con el mismo número de factura ante SUNAT.
Añadido el índice único (0 duplicados previos, comprobado antes de aplicarlo).

**Hallazgo — la orden de compra perdía el documento.** Ahí sí había índice único,
así que el dato nunca se corrompió, pero la segunda petición moría con un 409 y
el usuario perdía la orden. 3 de 5 fallaban.

**Y una consecuencia de arreglar lo anterior:** al poner el índice, el duplicado
silencioso del comprobante pasaba a ser un 409 visible. El reintento sin espera
va en lockstep —todas releen el mismo máximo a la vez y solo una gana por ronda,
así que con N peticiones hacen falta N rondas— y con 5 intentos la sexta moría.
Extraído `reintentarSiChocaNumeracion()` con espera aleatoria creciente, usado
por los dos sitios. Con eso, 6 de 6 y números consecutivos.

**Resuelto — todo hueco de serie tiene explicación.** El caso tiene dos mitades y
una ya funcionaba: si el rechazo de SUNAT llega en el momento, el número
descartado era el último de la serie y la siguiente emisión lo reutiliza sola. El
hueco solo se forma cuando el rechazo llega en diferido (lo resuelve el
scheduler) y ya se emitió un documento posterior; ahí reutilizar el número
pondría un correlativo bajo en una fecha posterior y rompería la correlación que
SUNAT espera, así que el hueco es inevitable.

Lo que no era aceptable es que fuera inexplicable. Nueva tabla
`ComprobanteDescartado`: cada número que se asigna y se descarta queda con su
motivo, el error de SUNAT y la fecha. Se escribe en los **dos** caminos de
borrado (el del controlador y el propio del scheduler, que no pasaba por el
otro). `pnpm run qa:series` lista los huecos de cada serie, los cruza con ese
registro y exige cero huecos sin explicación.

El hueco existente (F0A1-00000010) quedó registrado con lo que de verdad pasó:
una prueba de emisión del QA, no una operación de Kaiser.

---

## Repetición: diez pasadas de la Fase 2

`qa:compras` · `qa:concurrencia` · `qa:permisos-compras` · `qa:series` ·
`qa:docs-compra` · `qa:por-llegar`, diez veces seguidas. 60 ejecuciones, 0 fallos,
las diez con resultados idénticos campo por campo.

**Y aun así la repetición encontró algo — pero no por repetir, sino por dejar de
elegir dónde mirar.** La huella de `qa-huella.mjs` vigila 19 campos que yo escogí,
y dijo "intacta" las diez veces. Al contar las **110 tablas** de la base apareció
`RefreshToken` creciendo diez filas por pasada: un refresh token se borra cuando
se usa o al cerrar sesión, pero nadie recogía los que caducan sin usarse —que es
lo normal, el usuario cierra el navegador y no vuelve. La tabla crecía una fila
por login, para siempre. Había 527 filas, 98 caducadas desde hacía más de un mes.

Funcionalmente eran inofensivas (`refresh()` comprueba `expiresAt`), pero es una
tabla de credenciales que nunca se poda. Nuevo job diario
`PurgarTokensExpiradosService`, más una poda oportunista del usuario al emitirle
un token nuevo. Verificado: 98 purgados, los 429 vivos intactos.

Queda como `pnpm run qa:huella-global`, que compara las 110 tablas y solo tolera
las diferencias que tienen explicación escrita.

**Lo que no era del producto:** los tiempos de las pasadas oscilaron entre 17 s y
96 s. Medido script por script, todos son estables (~18 s en total); el pico era
carga de la máquina, con load average de 10 y cinco watchers de nest colgados de
sesiones anteriores.

---

## Fase 3 — Inventario ✔
`pnpm run qa:inventario` · 45 comprobaciones
- [x] Ajuste positivo y negativo, con su movimiento y saldo encadenado
- [x] Rechazo de lo que no debe pasar: negativo mayor que el stock, sin motivo
- [x] Traslado entre sedes: sale de una, entra en la otra, **el total se conserva**
- [x] Rechazo de traslado a la misma sede y de más de lo que hay
- [x] Tarjeta de stock: todos los movimientos de la sede, sin mezclar la otra
- [x] Saldo del kardex = stock de la sede, en las dos sedes
- [x] Trazabilidad: línea de tiempo, registros tardíos, descuadres, cadena de saldos
- [x] Consolidado: los cuatro filtros y la descarga a Excel de verdad
- [x] Inventario valorizado: stock, costo, valor, lotes y último proveedor

**Hallazgo grave — el ajuste negativo recortaba en silencio.** Pedir un ajuste
negativo mayor que el stock devolvía **201** y descontaba lo que hubiera:
`Math.min(stockGlobal, cantidad)`. El operario creía haber registrado una merma
de 100 y el sistema anotaba 10. Peor: el tope se medía contra `producto.stock`
—el global de todas las sedes— mientras el descuento se aplicaba a la sede, así
que el movimiento quedaba con un saldo (−90) que no coincidía con el stock real
(0). Es exactamente el descuadre que almacén venía reportando, generado por el
propio sistema. `realizarTraslado` ya validaba bien contra la sede y hasta lo
advertía en un comentario; este camino no se había enterado. Ahora se valida
contra la sede y se **rechaza** diciendo cuánto hay, en vez de sustituir la cifra.

**Hallazgo grave — el consolidado pedido "de hoy" devolvía ayer por la tarde.**
El rango se construía con `new Date('2026-09-28')` (medianoche UTC = 19:00 del 27
en Lima) y se cerraba con `setHours(23,59,59)`, que trabaja en hora local: la
ventana resultante era 27/09 19:00 → 27/09 23:59. Los movimientos del día
quedaban fuera enteros. Afectaba al consolidado **y** a los filtros de
trazabilidad. Nuevos `inicioDelDiaLima` / `finDelDiaLima` con tests.

**Hallazgo — la pestaña de Traslados salía siempre vacía.** El filtro buscaba
`tipoMovimiento = 'TRANSFERENCIA'`, un valor del enum que **no escribe nadie**
(cero filas en la base). Un traslado entre almacenes propios se registra como
SALIDA + INGRESO sin guía. Ahora se identifican por el concepto, con constantes
compartidas entre quien las escribe y quien las lee.

**Hallazgo — el detector de descuadres se dejaba la mayoría.** Comparaba filas
consecutivas y saltaba al cambiar de sede. Con dos almacenes los movimientos se
intercalan, así que bastaba uno de la otra sede entre medias para que el
descuadre quedara invisible: comprobado con el mismo descuadre, detectado si las
filas van seguidas y perdido si hay una en medio. Ahora lleva el último saldo
**por sede**. Extraído a `detectarDescuadres()` con 10 tests, porque es un
invariante sutil que ya falló una vez.

**Hallazgo — el resumen de trazabilidad informaba mal el stock.** Daba el saldo
del último movimiento: decía 12 cuando la empresa tenía 443,15 repartidas entre
dos almacenes. Ahora es la suma por sede, y viene desglosada.

## Repetición: diez pasadas de la Fase 3

Aquí la repetición sí encontró por repetir: **6 de las 10 primeras pasadas
fallaron**, y las que fallaban tardaban la mitad porque morían al entrar.

**Hallazgo grave — entrar dos veces en el mismo segundo fallaba.** El refresh
token es un JWT firmado sobre `{sub, sedeId}`, y su `iat`/`exp` tienen resolución
de un **segundo**: dos inicios de sesión del mismo usuario en el mismo segundo
generaban un token byte a byte idéntico, que chocaba contra el índice único de
`RefreshToken.token`. El usuario recibía un 409 *"Ya existe un registro con esos
datos (token)"*, que no le dice nada. Reproducido: 7 de cada 10 entradas fallaban.

Kaiser es multi-sede, así que **toda** entrada pasa por `select-sede`, que es donde
caía. Un doble clic en "entrar", dos pestañas o un reintento lo disparaban. Y
además dos sesiones distintas compartían literalmente el mismo token: rotar o
revocar una afectaba a la otra. Añadido un `jti` aleatorio en los tres sitios que
emiten refresh token (login, select-sede y la rotación del refresh). Verificado:
12 de 12 entradas, 12 tokens distintos.

**Hallazgo grave — dos traslados simultáneos dejaban una sede en negativo.**
Esto no lo encuentra la repetición secuencial: hay que lanzar los traslados a la
vez. Comprobar el stock y descontarlo eran dos pasos separados, así que tres
traslados de 6 sobre un almacén con 10 unidades devolvían **201 los tres** y
dejaban el origen en **−8**. El total se conservaba, pero una sede en negativo
envenena el inventario valorizado, la cadena del kardex y el detector de
descuadres — y contradice la invariante que comprueba la Fase 1.

Con dos personas en almacén es un escenario normal. Resuelto con `SELECT … FOR
UPDATE` de la fila de stock del origen dentro de la transacción: bloqueo por
(producto, sede), que es la granularidad justa. De paso desaparece un 409
*"Ya existe un registro con esos datos (productoId, sedeId)"* que salía cuando dos
traslados intentaban crear la fila del destino a la vez; ahora el que se queda
fuera recibe "Stock insuficiente en …", que sí se entiende.

Queda como `pnpm run qa:traslado-concurrente`, con los **dos** escenarios: con la
fila del destino creada y sin ella. Importa probar los dos, porque el segundo
enmascaraba al primero — los perdedores morían antes por el índice único de
`ProductoStock` y el fallo de verdad no se veía.

Tras los arreglos: 10 de 10 pasadas correctas, 62 comprobaciones idénticas en
todas, y las 110 tablas sin cambios sin explicar.

**Y un fallo de método mío:** el login de los scripts accedía a
`sel.data.accessToken` sin comprobar la respuesta, así que un 409 real se veía
como *"Cannot read properties of undefined"*. Seis pasadas rojas sin decir por
qué. Todos los scripts comprueban ya el `select-sede` y dicen el código y el
mensaje.

---

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
| 3 | ✔ | ajuste negativo recortaba en silencio · consolidado devolvía el día anterior |
| 4 | pendiente | |
| 5 | pendiente | |
| 6 | pendiente | |
| 7 | pendiente | |
| 8 | pendiente | |
| 9 | pendiente | |
| 10 | pendiente | |
