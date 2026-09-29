# Lo que Kaiser pidió en la reunión con STARSOFT

Análisis de los dos audios de la reunión del **10 de septiembre de 2026** entre
STARSOFT y el equipo de Kaiser Corporation: la demo del competidor, con cada área
de Kaiser preguntando por lo que necesita.

Sirve para dos cosas: saber **qué necesita Kaiser de verdad** —dicho por ellos, no
supuesto por nosotros— y saber **dónde falla STARSOFT**, que es contra quien
competimos.

## Procedencia y fiabilidad

| | |
|---|---|
| Origen | Dos audios de WhatsApp, 67 min y 15 min, del 10-set-2026 |
| Transcripción | `mlx_whisper` con `whisper-large-v3-turbo`, en local |
| Calidad | Buena en el grueso; con bucles en los silencios y jerga peruana imperfecta |

**Léase con cuidado.** La transcripción es automática: no separa hablantes, los
nombres propios pueden estar mal escritos y hay tramos confusos. Las atribuciones
de abajo están deducidas del contexto. **Antes de usar cualquier cita en una
propuesta comercial, contrástese con el audio.**

## Quién habla

| Persona | Área | Qué le preocupa |
|---|---|---|
| **Evelyn** | STARSOFT | Presenta la demo |
| **Karim / Karina** | Kaiser, coordinación | Modera y empuja a que cada área pregunte |
| **Stephanie** | Jefatura comercial | El histórico de ventas y los reportes |
| **Sharon** | Almacén | Códigos de producto en proceso, inventario |
| **Álvaro** | Jefatura de planta | Unidades de medida, merma |
| **Javier** | Comercial | Reserva de stock entre vendedores |
| **Ari** | Comercial | Fichas técnicas, alertas de despacho |

---

## 1. Lo que STARSOFT admitió no poder hacer

Diez limitaciones, cada una levantada por alguien de Kaiser. En orden de gravedad
según cuánto insistieron.

### 1.1 No migran movimientos ni transacciones

Lo repitieron **seis veces**, a cuatro personas distintas. Textual:

> "No migramos movimientos. Solo las tablas iniciales, las tablas maestras y saldos
> iniciales." — *"Sería mentirles ofrecerles o darles alguna opción en ello."*

Stephanie explicó por qué le importa: necesita saber qué compró un cliente en 2024 y
2025, cuándo y cómo pagó. Javier preguntó si al menos los clientes principales. No.
Preguntó si se puede jalar del SQL Server que ya tienen. No.

La conclusión a la que llegó el propio equipo de Kaiser en la llamada fue
**"borrón y cuenta nueva"**, manteniendo el sistema anterior encendido en paralelo
solo para consultar el histórico.

### 1.2 La merma no existe en el módulo de costos

Álvaro y Sharon preguntaron dos veces. La respuesta:

> "El módulo de costos no genera ningún proceso de mermas. Tendría que registrarlo
> directamente al módulo de inventario. Podrías considerar un almacén de mermas."

El planteamiento de Kaiser era el correcto: cada orden de fabricación debería
liquidar la materia prima consumida contra el producto terminado, y la diferencia
—con su porcentaje esperado— es la merma. En STARSOFT eso se registra a mano, en un
almacén inventado para el caso.

Para un fabricante es un hueco de fondo, no de detalle.

### 1.3 Un artículo, una sola unidad de medida

Álvaro lo levantó apenas lo oyó: las mallas tejidas se manejan **en rollos y en
metros cuadrados**. Ari lo repitió para productos que se compran en una unidad y se
venden en otra.

La solución de STARSOFT: **duplicar el código** —uno en rollos, otro en metros— y
usar "equivalencias" para convertir moviendo stock de un código al otro.

Duplicar códigos multiplica el maestro de artículos, parte el histórico de cada
producto en dos y obliga al vendedor a saber cuál elegir.

### 1.4 No reservan stock

Javier planteó el caso real: dos vendedores cotizan el mismo producto, hay stock
para uno, y se lo lleva aquel cuyo cliente deposite primero.

> "Una cotización no compromete stock, no reserva stock. Si existe algún proceso que
> me permita reservar y luego liberar, no lo tenemos considerado por el momento."

La salida que les ofrecieron: **crear un almacén llamado "reservas"** y transferir a
mano la mercadería para que nadie más la vea.

### 1.5 Fichas técnicas solo en texto

Ari preguntó si se pueden subir las fichas técnicas de los productos, porque el área
de ventas las necesita de soporte. Se puede **escribir texto**, no adjuntar el PDF:

> — "¿Estos datos serían así, texto, o sería un formato PDF que se suba?"
> — "Texto, texto."

### 1.6 250 caracteres por línea de comentario

En la cotización, el comentario sobre un artículo tiene un tope duro de 250
caracteres. Kaiser lo necesita para especificar medidas y detalles de la malla.

> — "¿Eso no puede incrementarse? ¿Es 250 a rajatabla?"
> — "Así es, correcto. 250."

La salida ofrecida: añadir más líneas de texto de 250 cada una, sabiendo el usuario
dónde se corta cada una. Comentario de alguien de Kaiser en el audio: *"muy
limitante"*.

### 1.7 Producto en proceso, a pulso

El caso que contó Sharon: compran fierro en varillas, lo cortan y doblan para hacer
anclajes, y mandan el anclaje fuera a galvanizar. Tres estados del mismo material.

STARSOFT: créense un código para cada estado, manualmente. Sharon reconoció que **en
el último inventario físico ya tuvieron discrepancias** justo por esto, porque los
anclajes a medio procesar se contaban con el código del producto terminado.

Álvaro añadió una preocupación operativa: que el código intermedio **no aparezca**
cuando el vendedor va a tomar un pedido, para que no lo venda por error.

### 1.8 Sin alertas de despacho pendiente

Ari preguntó si, al despachar 4 de 10 unidades, el sistema avisa de las 6 que faltan.

> "No te envía alertas, sino que genera el reporte y analizas nuestra información."

### 1.9 Escritorio, e instalado en el servidor de Kaiser

SQL Server on-premise, en el servidor de Kaiser. La interfaz es de escritorio.

Los comentarios en paralelo de quien grababa el segundo audio son inequívocos:
*"estamos quejándonos de Dynamics toda la vida para volver a Dynamics"*, *"no hay
diseño, no hay estética, no es amigable"*, *"¿por qué tiene que ser tan
complicado?"*.

Es el punto más subjetivo de todos y probablemente el más decisivo: quien grababa ya
había decidido.

### 1.10 Migración por consultor, no por el cliente

Las plantillas Excel las entrega el consultor, explica cómo llenarlas y **él** hace
la carga. Kaiser no puede ensayar por su cuenta ni repetir la carga.

---

## 2. Cómo responde Kaiser ERP hoy

Verificado contra el código, no supuesto. ✔ = existe y está probado ·
◐ = existe con límites · ✗ = no existe.

| Lo que pidió Kaiser | STARSOFT | Kaiser ERP | Dónde |
|---|---|---|---|
| Migrar movimientos e histórico | ✗ | ✔ | `src/migracion/`, ensayado de punta a punta |
| Merma en la orden de producción | ✗ | ✔ | `mermaEsperadaPorcentaje`, `mermaTotal`, `costoMerma` |
| Comprar y vender en distinta unidad | ✗ dos códigos | ◐ | `factorConversion`, usado en ventas y producción |
| Reserva de stock | ✗ | ✔ | módulo `reserva` |
| Fichas técnicas en PDF | ✗ solo texto | ✔ | `ProductoDocumento` + carga masiva |
| Comentario largo en la cotización | ✗ 250 car. | ✔ | `descripcion String`, sin tope |
| Producto en proceso / semielaborado | ✗ manual | ✔ | un producto puede ser insumo y producto final a la vez |
| Alerta de stock bajo mínimo | ✔ correo | ✔ | `inventario-notificaciones.service` |
| Alerta de despacho pendiente | ✗ | ✗ | **nadie lo tiene** |
| Cuadro comparativo de cotizaciones | ✔ | ✔ | `solicitud-compra.service` |
| Orden de compra con estados y aprobación | ✔ | ✔ | `solicitud-compra.service` |
| Importaciones con reparto de gastos | ✔ | ✔ | `importaciones.service` |
| Listas de precio por cliente | ✔ | ◐ | `preciosMayorista`, no listas con nombre |
| Límite de crédito por cliente | ✔ | ✗ | **no existe** |
| Asientos contables automáticos | ✔ | ✗ | **no existe** |
| Reportes a Excel | ✔ | ✔ | varios módulos |
| Web / móvil | ✗ escritorio | ✔ | React + API |

---

## 3. Lo que hay que mejorar, por orden

### Prioridad 1 — huecos frente a STARSOFT

Cosas que **ellos demostraron funcionando** y nosotros no tenemos. Si alguien de
Kaiser compara lado a lado, se ven.

**1. Límite de crédito por cliente.** STARSOFT lo demostró: el pedido de un cliente
que excede su límite queda *pendiente de aprobación* y un responsable lo autoriza.
No hay campo de límite de crédito en `Cliente` ni bloqueo por deuda.
*Trabajo: campo en Cliente + validación al crear el pedido + reutilizar el flujo de
autorización de pedidos que ya existe.*

**2. Asientos contables automáticos.** STARSOFT genera el asiento de la compra, el de
costo de venta y el de consumo, y los transfiere al módulo contable. Kaiser ERP tiene
SIRE, arqueo y reportes, pero **no genera asientos**. Es lo primero que va a
preguntar el área contable de Kaiser.
*Trabajo: es el de más fondo de la lista. Requiere plan de cuentas y reglas de
asiento por tipo de operación.*

**3. Listas de precio con nombre.** STARSOFT asigna a cada cliente una lista, y el
vendedor elige el precio de esa lista. Kaiser ERP tiene `preciosMayorista` (un JSON
por producto), que no es lo mismo: no hay entidad "lista de precios" asignable.
*Trabajo: medio. Puede bastar con nombrar los niveles que ya existen.*

### Prioridad 2 — lo que nadie tiene, y Kaiser pidió

**4. Alerta de despacho pendiente.** Ari lo preguntó explícitamente y STARSOFT dijo
que no. Es la oportunidad más limpia de toda la reunión: una necesidad declarada que
el competidor rechazó delante de ellos.
*Trabajo: bajo. Ya hay notificaciones y los pedidos tienen estado parcial.*

### Prioridad 3 — límites de lo que ya tenemos

**5. `factorConversion` es un entero.** Sirve para "1 caja = 12 unidades", no para
"1 rollo = 33,5 m²". Para mallas eso puede quedarse corto.
*Trabajo: bajo, cambiar el tipo a Decimal. Conviene confirmar con Álvaro si las
equivalencias reales de Kaiser son enteras.*

**6. Almacenes dentro de una sede.** Solo existe `Sede`. Kaiser ERP no necesita los
almacenes falsos que STARSOFT recomienda —tenemos reservas y merma de verdad—, pero
sí conviene confirmar si almacén necesita separar zonas dentro de una misma sede.

**7. Ventas históricas migradas van a la sede principal.** Ya documentado en
`MIGRACION.md`. Pendiente de confirmar si Chacra Cerro factura o solo almacena.

### Prioridad 4 — lo que decide la venta y no es una función

**8. La interfaz.** El comentario más repetido del segundo audio no es sobre una
funcionalidad: es sobre que STARSOFT se ve viejo. Es nuestra mayor ventaja y la más
frágil, porque se pierde si la demo va lenta o algo se ve a medio hacer.

---

## 4. Qué confirmar con Kaiser antes de la demo

1. **¿Chacra Cerro factura o solo almacena?** Decide si hace falta la columna de sede
   en la migración de ventas.
2. **¿Las equivalencias de unidad son enteras?** (rollo ↔ m²) Decide si
   `factorConversion` debe pasar a decimal.
3. **¿Qué espera contabilidad?** Si esperan asientos automáticos como los de
   STARSOFT, es el trabajo más grande pendiente.
4. **¿Qué exporta P&P?** Es la dependencia crítica de la migración y no está en
   nuestro lado. Sin ese archivo, la ventaja principal no se puede demostrar con
   datos reales.

---

## 5. La idea que debería ordenar la demo

STARSOFT dijo **seis veces**, a cuatro personas distintas, que no migra el histórico.
Hay una frase suya que lo resume: *"sería mentirles ofrecerles o darles alguna opción
en ello"*.

Kaiser salió de esa reunión asumiendo que empezaría de cero y tendría que mantener el
sistema viejo encendido para consultar lo de antes.

Nosotros migramos ventas, compras, saldos e inventario valorizado, con validación
previa, carga repetible y reversión — y está ensayado de punta a punta.

Lo segundo que más les dolió fue la merma, y se lo respondieron con *"cree un almacén
de mermas y regístrelo a mano"*. Quienes más preguntaron —**Álvaro y Sharon**— son
los que van a usar el sistema todos los días.
