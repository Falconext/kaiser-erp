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

## Fase 4 — Producción ✔
`pnpm run qa:produccion` (34) · `qa:produccion-concurrente` · `qa:kardex-concurrente`
- [x] Receta (BOM) con sus insumos y rechazo de código duplicado
- [x] Orden: explota la receta con cantidades y costos; lote único
- [x] Ejecución: consume insumos, genera terminado, registra la merma
- [x] **Conservación del valor**: lo que sale del inventario = lo que cuesta el terminado
- [x] El costeo queda guardado en la orden, con la merma separada
- [x] Rechazos: orden finalizada, producir 0, insumo ajeno, cantidad negativa
- [x] Stock insuficiente de insumos: rechazado con mensaje claro

**Hallazgo grave — el valor de la merma se evaporaba.** El costo del terminado se
calculaba solo con lo consumido, pero del almacén salía consumo **más** merma.
Medido con números limpios: salían S/ 20,00 de insumos y el terminado se
valorizaba en S/ 18,00. Esos S/ 2,00 no quedaban en inventario, ni en el costo del
producto, ni en un gasto: desaparecían. El terminado salía un 10 % más barato de
lo que costó, y de ahí al COGS, al margen y al P&L. Para un fabricante de alambre
y mallas, donde la merma de corte es inherente, no es un decimal.

Ahora el terminado absorbe consumo + merma, y la orden guarda `costoConsumo`,
`costoMerma` y `costoProduccion` por separado: la merma se capitaliza pero queda
visible, que es la cifra que le interesa a un fabricante.

De paso, el `costoTotal` de cada componente usaba `cantidadTeorica` en vez de lo
realmente consumido: el detalle de la orden mostraba el costo del plan, no el real.

**Queda por decidir:** `mermaEsperadaPorcentaje` se guarda en la receta y en cada
componente, y **no se usa en ningún cálculo**. Con ese dato se podría separar la
merma normal (que se capitaliza, como ahora) de la anormal (que debería ir a
gasto del periodo, no a inventario). Eso es política contable de Kaiser, no una
decisión técnica; hoy toda la merma se capitaliza.

**Hallazgo grave — dos ejecuciones simultáneas creaban inventario fantasma.** Es
la misma causa raíz del traslado de la Fase 3, pero en el camino que comparten
producción, ventas, compras, guías y devoluciones. Dos órdenes consumiendo 6 de un
insumo con 10 unidades, ejecutadas a la vez, dejaban **dos movimientos de kardex
idénticos «10 → 4»**: el kardex decía que se consumieron 12 y solo se descontaron
6. Seis unidades que el sistema cree tener y no existen, dos productos terminados
fabricados con insumos que nunca se descontaron, y la cadena de saldos partida.

Con cuatro ajustes simultáneos el efecto era mayor: `100→80 · 100→80 · 100→80 ·
80→60`, stock en 60 cuando los movimientos sumaban 20. **Cuarenta unidades
fantasma.**

Y no se veía venir porque el escritor hacía `Math.max(0, nuevoStock)`: el stock
nunca bajaba de cero, simplemente dejaba de corresponder con sus propios
movimientos. Un stock recortado en silencio es peor que uno negativo, porque el
negativo al menos se ve.

Resuelto en `registrarMovimiento`, que ahora corre en transacción con la fila de
stock bloqueada (`SELECT … FOR UPDATE`) y acepta la transacción del llamador.
Quitado el recorte a cero. Y una guarda opcional `rechazarSiNegativo`, que usan
los ajustes: no se aplica por defecto porque hay salidas que legítimamente pueden
dejar negativo —anular una compra cuya mercadería ya se vendió, o descartar un
comprobante— y bloquearlas dejaría la operación sin salida.

Los bloqueos se toman siempre en orden de `productoId`, en producción y en los
traslados, para que dos operaciones que comparten insumos no se abracen.

**Sigue pendiente:** la validación de stock de las ventas
(`validarStockDisponibleParaVenta`) también vive fuera del bloqueo, así que dos
ventas simultáneas del mismo producto podrían pasar las dos. El stock ya no queda
descuadrado —eso lo arregla el bloqueo— pero se podría vender de más. Se aborda en
la Fase 5, que es la del ciclo comercial.

## Ventas simultáneas: por qué no se bloquea

`pnpm run qa:venta-concurrente`

Dos ventas del mismo producto a la vez pasan las dos. Comprobado: 10 unidades,
dos notas de venta de 8, las dos aceptadas, 16 vendidas.

**No se bloquea, y es una decisión, no un olvido.** El orden de una venta es
validar stock → crear el comprobante → descontar. Cuando se toca el inventario el
comprobante ya existe y, en una factura, puede estar ya en SUNAT. Hacer fallar el
movimiento dejaría un documento emitido sin movimiento de inventario, que es peor
que la sobreventa. Bloquear de verdad exige reservar el stock antes de crear el
documento, y eso es reestructurar el método más delicado del sistema.

Además, en un fabricante contra pedido vender lo que se va a producir es legítimo:
un bloqueo duro rechazaría ventas buenas.

Lo que sí era un fallo, y está corregido:

- **El dato quedaba incoherente.** El escritor recortaba con `Math.max(0, …)`, así
  que el stock decía 0 mientras su propio kardex decía −6. Sin el recorte y con el
  bloqueo de fila, el stock es exactamente lo que dicen sus movimientos.
- **Pasaba en silencio.** El aviso posterior a la venta trataba el negativo como
  «producto agotado», que manda a almacén a reponer. Un producto en −6 no está
  agotado: está **comprometido de más**, hay documentos emitidos contra unidades
  que no existen, y la decisión es otra —producir, comprar con urgencia o avisar
  al cliente. Aviso nuevo y distinto, con las unidades que faltan.

**Queda como decisión tuya:** si Kaiser quiere un bloqueo duro, hay que reservar
el stock antes de emitir. Es trabajo de la Fase 5 con su propio QA, no un parche.

---

## Fase 5 — Ciclo comercial ✔
`pnpm run qa:comercial` (35) · el recorrido feliz completo ya está en `qa:flujo`
- [x] **Qué documentos mueven el almacén y cuáles no**: COT nunca, NP solo si se
      marca, NV y el resto siempre
- [x] Cotización en dólares (`cotizMoneda`, que es de presentación)
- [x] PDF de la cotización: se genera, se sube, se descarga y **es un PDF**
- [x] Autorizadores: alta y exigencia al autorizar
- [x] Máquina de estados: las transiciones válidas y **todas** las inválidas
- [x] FACTURADO y ANULADO son terminales de verdad

La invariante de la fase es cuándo se toca el inventario, y se cumple: cotizar no
descuenta nada. Una cotización que moviera stock sería un desastre —se reservaría
mercadería por cada propuesta enviada— y lo contrario, vender sin descontar,
también.

La máquina de estados salió intacta: no se puede entregar ni facturar sin
autorizar, no se puede autorizar dos veces, no se puede autorizar con un
autorizador que no existe, y desde FACTURADO o ANULADO no se sale. Diez
comprobaciones, las diez bien de origen.

**Hallazgo — un comprobante formal en dólares se guardaba con tipo de cambio 1.**
`tipoCambio: input.tipoCambio != null ? Number(input.tipoCambio) : 1` — es decir,
un dólar vale un sol. SUNAT exige el tipo de cambio en el XML de una factura en
moneda extranjera, y cualquier reporte que convierta a soles quedaría corrido casi
cuatro veces. La pantalla lo envía siempre (lo consulta al emitir), así que no
estaba vivo; pero una integración o un script no tienen por qué, y el fallo sería
invisible: el documento se emite y los importes parecen correctos porque están en
dólares. Ahora se rechaza, y también el tipo de cambio 1, que nunca es legítimo.

**Y una verificación que conviene tener:** el PDF no se da por bueno con que la
API devuelva una URL. Se descarga el fichero y se comprueba la cabecera `%PDF-`.
La primera versión de la prueba solo miraba la respuesta, y con eso un PDF roto o
un fichero vacío en S3 habría pasado.

## Reportes de gestión: dos pantallas, dos cifras

Las diez pasadas de todo salieron sin un fallo, pero eso solo dice que los scripts
pasan lo que los scripts miran. Al ir a lo NO cubierto apareció esto:

**Hallazgo — el reporte de ventas y el P&L daban cifras distintas del mismo mes.**
`/reportes/ventas` sumaba `mtoImpVenta`, el total con IGV, y la pantalla lo
rotulaba «Ventas del periodo» —la misma pregunta que responde el P&L—. Para
setiembre: S/ 135.342,69 en el reporte y S/ 114.697,21 en el P&L. Quien abre las
dos no sabe cuál creer.

Ahora el reporte informa la venta neta, que es la que cuadra, y el total facturado
con IGV va aparte en `totalFacturado`: nadie pierde el número que usaba. Los
detalles traen las dos columnas. El cuadre cruzado incluye la comprobación, con las
filas por vendedor sumando el total y las participaciones al 100 %.

**Hallazgo grave — el dashboard tenía los dos errores del P&L, sin corregir.** Es
la primera pantalla que se abre en una demo, y calculaba sus finanzas por su cuenta:

| | informaba | real |
|---|---|---|
| Ingresos | 135 342,69 | **114 697,21** |
| Ganancia | +18 666,19 | **−30 548,11** |
| Margen | 13,79 % | **−26,63 %** |

Sumaba con IGV **y** costeaba con el `costoPromedio` actual: exactamente los dos
fallos que ya había corregido en el P&L, en otro módulo que los reimplementaba.
Ahora las ventas salen de `SUMA_VENTA_NETA` y el costo del movimiento de kardex, con
el costo fijo por unidad incluido —que no viaja en el kardex y desviaba los últimos
S/ 2 327.

Las tres pantallas coinciden ya al céntimo, y el cuadre cruzado lo vigila.

**Un candidato que resultó correcto:** `finanzas.getResumenFinanciero` también suma
`mtoImpVenta`, pero es un balance de tesorería —ingresos y egresos de caja, no un
estado de resultados— y el efectivo que entra sí lleva el IGV. Lo comprobé antes de
tocarlo; ahí no había nada que arreglar.

**La causa raíz, que es lo que importa:** tres módulos calculaban «ingresos» de
forma independiente, así que arreglar uno no arreglaba los otros. Ahora qué es una
venta neta está escrito en un solo sitio (`SUMA_VENTA_NETA` en `moneda.util.ts`).

**Hallazgo latente — la comisión se calcularía sobre el IGV.** El cálculo usa
`detalle.mtoPrecioUnitario`, que es el precio CON impuesto (comprobado: el ratio
contra `mtoValorUnitario` es exactamente 1,1800). Una comisión del 5 % sobre una
venta de S/ 240 pagaría S/ 12,00 en vez de S/ 10,17: un 18 % de más, y sobre dinero
que es de SUNAT.

No está vivo —hoy no hay ni un producto ni un vendedor con comisión configurada—,
así que **no lo he tocado**: si Kaiser decide comisionar sobre el bruto es una
política legítima, y cambiarla sin preguntar sería decidir por ellos. Pero conviene
decidirlo antes de configurar la primera comisión, no después de pagarla.

---

## La otra familia: stock que cambia sin pasar por el kardex

`pnpm run qa:stock-sin-kardex`

Es la invariante que sostiene todo el inventario, y la que reclamaba la jefa de
almacén: si el stock cambia sin dejar movimiento, la tarjeta de stock miente y no
hay forma de explicar dónde fue la mercadería. Barrido de todo lo que escribe
`ProductoStock` desde fuera del kardex.

**Hallazgo grave — reclasificar un producto como SERVICIO borraba su inventario.**
Un `updateMany({ stock: 0 })` a pelo. Con 400 unidades a S/ 25:

| | antes | después |
|---|---|---|
| Stock de la sede | 400 | **0** |
| `producto.stock` | 400 | **400** |
| Último saldo del kardex | 400 | **400** |

S/ 10 000 de inventario desaparecidos sin un solo movimiento, con tres invariantes
rotas a la vez y nadie con qué explicar dónde fue el dinero. Ahora la mercadería
sale por el kardex, con su motivo («Baja de inventario: el producto pasa a ser
servicio») y su valor.

**Hallazgo — un movimiento de kardex fallido dejaba el stock cambiado.** Al editar
el stock de un producto, si `registrarMovimiento` fallaba el error se escribía en
consola y unas líneas más abajo el stock se guardaba igual. Eso es exactamente cómo
se fabrica un descuadre. Ahora si el kardex no acepta, la edición falla y el usuario
se entera.

**Hallazgo — solo los ingresos se valorizaban.** `registrarMovimiento` ponía el
costo promedio por defecto únicamente en los INGRESOS, así que una SALIDA sin costo
explícito quedaba con `valorTotal` en cero: salían 400 unidades del almacén y el
movimiento decía que valían S/ 0. Corregido en el punto común, no en el llamador
—que es la lección de toda esta sesión: arreglarlo en un sitio deja a los hermanos
roto.

---

## La familia de las fechas

`pnpm run qa:rangos-fecha`

Perú está en UTC-5, así que `new Date('2026-09-30')` es medianoche **UTC**: las 19:00
del 29 en Lima. Un rango construido así queda corrido cinco horas. Barrido de los
veinte sitios que construyen rangos: la mayoría ya usaba el desplazamiento `-05:00`
explícito y estaba bien. Tres no.

**Hallazgo grave — el listado de guías perdía el último día y medio del mes.** Pedir
«setiembre» devolvía del **31 de agosto a las 19:00 al 29 de setiembre a las 19:00**.
Una guía del día 30 a las 15:00 se quedaba fuera. Y es justo en el cierre de mes
cuando se mira ese listado.

**Y dos menores** — los listados de compras y de órdenes de producción arrancaban
cinco horas antes de tiempo, colando la tarde del día anterior al rango.

Los tres pasan ya por `inicioDelDiaLima` / `finDelDiaLima`, que es donde está escrito
una sola vez qué es un día de Lima.

**Y un bug en mi propio QA, que es el más instructivo.** Las diez pasadas fallaron
las diez en la Fase 3: el consolidado devolvía cero movimientos de hoy. El código
estaba bien; mi prueba usaba `new Date().toISOString().slice(0,10)`, que es la fecha
**UTC**. A las 20:16 de Lima eso ya es el día siguiente, así que la prueba pedía un
día que en Lima no había empezado.

Exactamente la clase de error que estaba cazando, en el cazador. Y solo se manifiesta
entre las 19:00 y medianoche, por lo que había pasado todo el día. Corregido en los
cuatro scripts que lo tenían, con un `hoyLima()` compartido.

**Diez pasadas de los 21 scripts tras los arreglos:** 210 ejecuciones, 0 fallos,
4240 comprobaciones, las 110 tablas sin residuo. La única variación sigue siendo cuál
de tres órdenes simultáneas gana la carrera.

---

## Fase 6 — Facturación electrónica
- [ ] Factura contra el sandbox SUNAT: XML, CDR, QR
- [ ] Boleta
- [ ] Nota de crédito → devolución pendiente → visto bueno de almacén
- [ ] Anulación de comprobante: revierte stock y pagos
- [ ] El PDF: datos de la empresa, cuentas, firma, sin marcas internas

## Fase 7 — Despacho ✔
`pnpm run qa:guia-kardex` (16) · `qa:sunat-documentos`
- [x] **Guía electrónica contra el sandbox**: T001-00000005, código 0, ACEPTADA
- [x] Motivos de traslado: el 01 (venta) NO descuenta —la factura ya movió el
      stock—, el traslado entre sedes sí, en las dos puntas
- [x] Anulación con motivo: devuelve stock en origen y destino, y los movimientos
      originales no se borran, se compensan
- [x] Rechazo de anulación sin motivo

Ninguna guía se había enviado nunca a SUNAT: las cuatro de la demo estaban en
EMITIDO sin respuesta.

**Hallazgo — el XML y el CDR de las guías no se podían recuperar.** Se guardaban en
la base (`sunatXml`, `sunatCdrZip`) y no existía endpoint para bajarlos: `/xml` y
`/cdr` devolvían 404. En los comprobantes sí se puede, porque van a S3.

SUNAT obliga a conservar el XML firmado y el CDR **y a poder presentarlos**. Que el
dato esté en una columna no basta si para sacarlo hace falta un desarrollador con
acceso a la base. Añadidos los dos endpoints; una guía sin enviar responde 400
explicando por qué en vez de devolver un fichero vacío.

## Fase 8 — Cobros y caja ✔
`pnpm run qa:caja` (16) · los pagos y saldos los cubre el cuadre, comprobante a
comprobante
- [x] Apertura del turno con su fondo; abrir dos veces se rechaza
- [x] Venta al contado dentro del turno
- [x] Egreso del turno; rechazo de egreso en cero y sin categoría
- [x] **Arqueo: la diferencia es cero cuando el cajón cuadra**
- [x] **Y el faltante exacto cuando falta dinero**
- [x] Cerrar sin caja abierta se rechaza
- [ ] Comisiones de vendedor (sin probar)

**Hallazgo grave — el arqueo escondía los faltantes.** La diferencia del cierre se
calculaba como `declarado − cobrado`, sin sumar el fondo de apertura ni restar los
egresos del turno. Comprobado con números redondos:

| | | |
|---|---|---|
| Turno sin ventas, abierto con | S/ 500,00 | |
| Se declara | S/ 460,00 | *faltan 40* |
| El sistema informaba | **+S/ 460,00 de sobrante** | |

**Faltaban cuarenta soles del cajón y el arqueo informaba un sobrante de 460.** No
es solo que estuviera mal: estaba mal en la dirección exacta que oculta un
faltante, que es justo lo que un arqueo existe para detectar. Y en un turno normal
informaba un sobrante igual al fondo, todos los días, con lo que un faltante real
se perdía dentro del ruido.

Corregido en las dos capas, porque las dos lo tenían: el cierre guarda ahora
`fondo + cobros − egresos` como importe esperado, y la pantalla usaba la misma
fórmula equivocada mientras su valor sugerido **sí** incluía el fondo —así que el
cajero aceptaba la sugerencia y veía un sobrante fantasma.

La pantalla muestra además el desglose (fondo, cobros, egresos, debería haber,
declarado) y la diferencia dice **Cuadra / Sobra / Falta** en vez de un número
suelto: un arqueo que no se puede explicar no sirve para reclamar nada.

## Un fallo de método: mi propia prueba borró datos ajenos

Al emitir la boleta se descubrió que la limpieza de la Fase 3 borraba **todo
movimiento de su producto de los últimos 30 minutos**. La boleta que acababa de
aceptar SUNAT usaba ese producto, así que su movimiento de kardex desapareció: el
comprobante quedó vivo y su salida de almacén no. Exactamente el descuadre que este
proyecto persigue, causado por su propia prueba.

La regla ahora es doble: solo movimientos **nuevos** y solo los que **no cuelgan de
ningún documento**. Un movimiento con comprobante, compra o guía detrás pertenece a
una operación real y una prueba no lo toca nunca, aunque haya nacido mientras corría.

Es la segunda vez que pasa —la primera fue la sonda de permisos, que ejecutó
`DELETE /compras/4` de verdad— y el patrón es el mismo: **una prueba que identifica
lo suyo por tiempo en vez de por pertenencia.** Repuesto el movimiento de la boleta y
recompuesta la cadena.

---

## Fase 9 — Contabilidad y finanzas
- [ ] Reporte contable del periodo
- [ ] SIRE: libro de ventas y libro de compras (TXT)
- [ ] P&L: ingresos, costo de mercadería, gastos, utilidad
- [ ] Reportes de gestión: por vendedor, cliente, producto, sector, ubigeo

## Fase 10 — Cuadres cruzados ✔
`pnpm run qa:cuadres` (solo lee, se puede correr en producción) ·
`pnpm run cuadres:corregir` (en seco por defecto)

- [x] Stock de cada sede = último saldo de su kardex (326 combinaciones)
- [x] `producto.stock` = suma de sus sedes · sin stock negativo
- [x] Ventas del periodo = ingresos del P&L, **y no el total con IGV**
- [x] Costo de mercadería del P&L = salidas valorizadas del kardex
- [x] Cuentas por cobrar = total − cobrado, comprobante a comprobante
- [x] Cuentas por pagar = total − pagado, compra a compra
- [x] Cabecera de cada comprobante = suma de sus líneas
- [x] Toda factura y boleta dejó movimiento de kardex
- [x] SIRE ventas = comprobantes formales del periodo
- [x] Caja: se informa la diferencia (aviso, no error: la caja recoge ingresos
      que no nacen de un comprobante)

Esta fase valía por todas las demás juntas. Tres hallazgos, y el primero es el más
grave de todo el proyecto.

**Hallazgo grave — el P&L informaba las ventas CON IGV.** `ventasBrutas` sumaba
`mtoImpVenta`, el total con impuesto. El IGV no es un ingreso: se le cobra al
cliente y se le entrega a SUNAT. Con los datos de la demo:

| | informaba | real |
|---|---|---|
| Ventas netas | 135 342,69 | **114 697,21** |
| Ganancia bruta | 60 622,79 | **39 977,31** |
| Margen bruto | 44,79 % | **34,85 %** |
| **Ganancia neta** | **+18 666,19** | **−1 979,29** |

La demo mostraba una ganancia de S/ 18 666 donde los datos dicen una pérdida de
S/ 1 979. Un contador de Kaiser lo ve al primer vistazo, y con eso se cae todo lo
demás. Corregido: las ventas y las notas de crédito se suman por el neto
(gravadas + exoneradas + inafectas + exportación), con caída a `valorVenta`.

**Hallazgo grave — el costo de ventas se recalculaba con el costo de HOY.**
`costoBaseProductos` usaba `producto.costoPromedio` en el momento del informe, no
el costo con el que salió la mercadería. Dos consecuencias: el P&L de un mes
cerrado **cambiaba** en cuanto se compraba a otro precio —un periodo cerrado no
puede moverse— y no cuadraba con las salidas valorizadas del kardex, que son el
mismo número visto desde el almacén. Ahora el costo sale del movimiento de kardex
del propio comprobante, y solo cae al promedio actual cuando no hay movimiento
(servicios, histórico importado).

**Hallazgo grave en los datos — las 28 notas de venta de la demo no movían el
almacén.** Ninguna tenía movimiento de kardex: vendieron mercadería que nunca
salió. Es literalmente la queja de la jefa de almacén —"hay ventas que no figuran
en la tarjeta de stock"— reproducida en los datos con los que se iba a demostrar
justamente eso. El código está bien (la Fase 5 lo comprueba); el seed las insertó
directo en base.

Corregido con `cuadres:corregir`: 43 salidas registradas con la fecha de su venta,
inventario inicial para los 6 productos que no tenían existencias, el campo global
recalculado y un ajuste con su movimiento para la única sede que contradecía a su
kardex.

**Y un error mío que conviene contar**, porque es la trampa de cualquier
reparación retroactiva: al insertar las salidas con la fecha real de cada venta
entraron EN MEDIO del histórico, y los movimientos posteriores se quedaron con sus
saldos viejos. Mi primera recomposición partió del stock actual en vez del saldo de
arranque y **duplicó el stock de dos productos** (9 366 → 16 683). El diagnóstico
de fondo era otro: la demo abría su inventario el 17 de agosto y tenía ventas desde
el 3 de junio —vendía antes de tener existencias—. Se adelantó el inventario
inicial al 1 de junio y se recompuso la cadena entera. Hoy ningún producto pasa por
saldo negativo en **ningún** punto de su histórico.

---

## Estado

| Fase | Estado | Hallazgos |
|---|---|---|
| 0 | ✔ | módulo `tienda` asignado al plan sin código detrás |
| 1 | ✔ | validaciones devolvían 403 en vez de 400 |
| 2 | ✔ | tipo de cambio no se aplicaba al anular una compra en USD |
| 3 | ✔ | ajuste negativo recortaba en silencio · consolidado devolvía el día anterior |
| 4 | ✔ | el valor de la merma se evaporaba · inventario fantasma en simultáneo |
| 5 | ✔ | comprobante formal en dólares se guardaba con tipo de cambio 1 |
| 6 | ✔ | la boleta nunca se había emitido a SUNAT |
| 7 | ✔ | el XML y el CDR de las guías no se podían recuperar |
| 8 | ✔ | el arqueo informaba un sobrante donde faltaba dinero |
| 9 | pendiente | |
| 10 | ✔ | el P&L informaba ventas con IGV · costo de ventas con el costo de hoy · 28 notas de venta sin mover almacén |
