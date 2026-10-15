# Qué falta y qué hay que preguntar — Almacén, Comercial, Producción

Repaso del ERP contra **lo que Kaiser pidió por escrito**, área por área, y la
lista de preguntas que hay que llevar a la reunión con cada jefatura.

No es una lista de ideas: cada hueco de abajo sale de una petición concreta de
alguien de Kaiser, y está contrastado contra el código, no supuesto.

## De dónde sale esto

| Documento | Qué es | Dónde |
|---|---|---|
| **LINEAMIENTOS PARA KAISER CORPORATION.pdf** | Los 15 puntos del socio comercial tras la demo de STARSOFT. Es el guion de la venta, no el detalle operativo. | `~/Downloads/` |
| **Ficha de evaluación de Procesos ALMACEN.xlsx** | Sharon Urcuhuaranga, Jefa de Almacén. 50 actividades, **32 con petición**. | `~/Downloads/` |
| **Ficha de evaluación de Procesos COMERCIAL.xlsx** | Christian Romero, vendedor. 59 actividades, **11 atendidas y 48 no**. | `~/Downloads/` |
| **Reunión STARSOFT–Kaiser, 10-set** | Dos audios transcritos. Lo que cada área preguntó al competidor. | `REUNION-STARSOFT.md` |
| **Reunión con planta, 7-oct** | Álvaro, Astrid, Stephanie. Factores de precio, capacidades, la hoja del levante. | Sin acta propia: solo quedó volcada en `CLAUDE.md` |

### Lo primero que falta es un documento

Hay ficha de evaluación de **Almacén** y de **Comercial**. **No hay de Planta,
ni de Logística/Compras, ni de Contabilidad, ni de Facturación.**

Eso no es un detalle administrativo: las dos fichas que existen son, con
diferencia, la mejor fuente de requisitos del proyecto —están escritas por quien
hace el trabajo, actividad por actividad, diciendo qué le falta—. De Producción,
que es el módulo que según el PDF *"puede hacer que ganemos la venta"*, lo único
que tenemos son grabaciones sueltas del 7-oct y una hoja de cálculo de la que la
propia planta no supo explicar un dato (el ÷2).

**Pedir la misma ficha para Planta es la acción con mejor relación
esfuerzo/resultado de toda esta lista.**

---

## 1. ALMACÉN

### Lo que ya está cerrado

Las peticiones de Sharon se atendieron en bloque el 28-sep y después: guía de
remisión que mueve kardex (su queja principal, repetida cinco veces), anulación
con motivo, visto bueno de almacén en las devoluciones, aviso de mercadería por
llegar, orden de compra visible al recibir, expediente digital de la compra,
trazabilidad por código con detección de registros tardíos y descuadres,
consolidado descargable, inventario valorizado, rotación/ABC/obsoletos, y el
origen de la mercadería importada (DUA y proveedor extranjero) en las dos
pantallas.

### Lo que falta

**A1. Un artículo sigue teniendo una sola unidad de medida útil.**
`Producto.factorConversion` es un **entero** (`prisma/schema.prisma:515`). Sirve
para "1 caja = 12 unidades"; no para "1 rollo = 33,5 m²". Álvaro lo levantó en la
reunión con STARSOFT apenas lo oyó —las mallas tejidas se manejan en rollos y en
metros cuadrados— y de momento seguimos igual de cortos que ellos. Es un cambio
de tipo a `Decimal`, no un módulo nuevo; lo que no sabemos es si hace falta.

**A2. No existe la toma de inventario físico.**
Lo que hay es `POST kardex/ajuste-masivo`, que es un **bucle de ajustes
individuales** (`src/kardex/kardex.service.ts:830`). No hay hoja de conteo, ni
conteo ciego, ni segundo conteo, ni diferencias valorizadas, ni acta, ni quién
aprueba. Sharon no lo pidió —lo da por hecho fuera del sistema, "se realiza y se
reporta a través de informes"—, pero reconoció en la reunión que **en el último
inventario físico ya tuvieron discrepancias**. Es un tema de reunión, no un bug.

**A3. El enlace orden de producción ↔ kardex se lee de un texto.**
El consolidado reconoce un movimiento de producción haciendo *regex* sobre el
concepto (`src/kardex/kardex.service.ts:2690`), porque
`MovimientoProduccion.movimientoKardexId` solo lo rellenan los dos ingresos de
merma. Funciona hoy; el día que alguien cambie el texto del concepto, la columna
"Documento" vuelve a decir "Ajuste manual" — exactamente la columna en blanco de
la que almacén vino a quejarse. Sharon lo pidió explícitamente: *"vincular o
identificar la Orden de Producción al generar una Nota de Salida o de Ingreso"*.

**A4. El material que sale a maquilar no tiene camino.**
El caso lo contó Sharon: compran fierro en varillas, lo cortan y doblan, y
**mandan el anclaje fuera a galvanizar**. En el ERP no hay servicio de terceros:
habría que simularlo con un traslado a una sede ficticia y una orden de
producción. Nadie lo ha pedido todavía con esas palabras, pero es un proceso real
suyo que hoy no tiene dónde registrarse.

**A5. Lo fabricado no nace con lote.**
La orden consume lotes de insumo (FIFO), pero el ingreso de producto terminado no
crea un `ProductoLote` propio (`src/produccion/produccion.service.ts:1939`). Hacia
atrás la genealogía responde de sobra; hacia adelante, "de qué tanda salió este
módulo" no se puede contestar por lote.

**A6. Ubicación: un campo de texto.**
`ProductoStock.ubicacion` (`prisma/schema.prisma:1933`) es texto libre por
producto y sede. Si tienen codificación de zona/rack/nivel, no hay dónde ponerla
ni cómo listar por ubicación.

### Preguntas para Sharon (Almacén)

1. **¿Las equivalencias rollo ↔ m² son enteras o decimales?** ¿Un rollo del mismo
   código siempre da los mismos metros, o se mide rollo por rollo? *(Decide si
   `factorConversion` pasa a decimal o si hace falta algo más gordo.)*
2. **¿El inventario físico lo quieren hacer dentro del ERP?** Y si sí: ¿conteo
   ciego o con saldo a la vista, un conteo o dos, por zonas o por familias, se
   congela el movimiento mientras dura, y **quién firma las diferencias**?
3. **¿Cada cuánto hacen inventario** y cuánto les toma hoy?
4. **¿Existe codificación de ubicaciones** (zona, pasillo, rack, nivel), o el
   almacén se ordena por criterio de quien guarda?
5. **El fierro que sale a galvanizar: ¿sale con guía?** ¿Vuelve con factura del
   tercero? ¿Quieren ver cuánto se mandó, cuánto volvió y cuánto se perdió en el
   proceso?
6. **¿Manejan lote o colada del alambre?** ¿Se lo exige algún cliente —minería,
   construcción— en el certificado?
7. **¿Quién tiene permiso para dejar el stock en negativo?** Hay 9 existencias en
   −1 creadas el 30-sep por un guion, sin documento detrás. Hay que decidir si se
   corrigen con ajuste (dejando rastro) y quién lo firma.
8. **¿"Notas de ingreso" y "notas de salida" deben llamarse así en el menú?** Hoy
   son compras, ajustes y traslados. Funcionalmente está; el vocabulario no.
9. **La entrega de material a planta: ¿qué papel se firma hoy?** ¿Vale el nuevo
   "Entregar material" de la orden, o necesitan un vale impreso?
10. **¿Chacra Cerro debería ser la sede principal del ERP?** Factura el ~95 % y la
    marcada como principal es La Victoria. Decide dónde caen por defecto las
    ventas nuevas y contra qué se agrupan los reportes.

---

## 2. COMERCIAL

### Lo que ya está cerrado

Stock real al cotizar, listas de precio por cliente, límite de crédito con V°B°,
seguimiento de cotizaciones (bitácora, próxima acción, motivo de pérdida y el
panel "por qué perdemos"), "Mi día" por vendedor, despachos pendientes —el caso
exacto que preguntó Ari: de 10 se despacharon 4, faltan 6—, soles y dólares,
direcciones y contactos múltiples, consulta de RUC/DNI, envío del comprobante al
cliente por correo y WhatsApp, cotización que se cierra sola al facturarla, y el
cotizador de módulos por peso × factor.

### Lo que falta

**C1. El vendedor no ve qué le vendió antes a ese cliente.**
Es la petición más repetida de la ficha —filas 10, 33, 50 y 60: *"no existe
histórico; se consulta otra área o un Excel"*— y la misma que Stephanie le hizo a
STARSOFT. Existe `GET compras/ultimo-precio` para saber a cuánto compramos a un
proveedor (`src/compras/compras.controller.ts:82`) y **no existe su espejo en
ventas**: a cuánto le vendimos la última vez a este cliente, cuándo, cuánto
compró, cómo pagó. El dato está todo en la base; lo que falta es la pantalla y la
consulta.

**C2. No hay dónde registrar un reclamo.**
Diez filas seguidas de la ficha son el ciclo del reclamo: registrar el motivo,
coordinar con almacén, coordinar con el área que evalúa, registrar la respuesta
al cliente, seguir el estado hasta el cierre. En el ERP existe `ReclamoGarantia`
(`prisma/schema.prisma:1249`) pero **cuelga de un número de serie**
(`ProductoSerie`): es garantía de un equipo, no un reclamo comercial, y Kaiser no
vende por número de serie. Las devoluciones de mercadería sí existen, pero
arrancan de una nota de crédito: cubren el final del proceso, no el principio.

**C3. El descuento no tiene techo ni autorización.**
Se puede descontar por línea y en total, y queda guardado. Lo que no hay es un
descuento máximo, un precio mínimo, un margen mínimo ni un "esto lo autoriza
gerencia". El único suelo que existe en todo el sistema es `factorPrecioMinimo`,
y solo aplica a los módulos. La ficha lo pide dos veces: *"permitir registrar
descuentos autorizados"*.

**C4. No hay alerta de cliente duplicado** (fila 46).

**C5. La cotización no se autoguarda** (fila 14): *"si no se guarda manualmente,
la cotización no se genera"*. Hoy tampoco hay borrador.

**C6. El producto no sabe de qué proveedor u origen viene.**
Aparece tres veces en la ficha (*"no se diferencia el proveedor u origen"*).
`Producto` no tiene proveedor; el origen solo se reconstruye por el kardex, un
movimiento a la vez. Para un vendedor que tiene que decir si la malla es
nacional o importada, eso no sirve.

**C7. Nada sugiere qué más ofrecer** (filas 61 y 64): productos relacionados o
complementarios. Hoy el único automatismo de ese tipo es el soporte de final de
fila del cotizador de módulos.

**C8. El catálogo es su archivo de stock, no su maestro de productos.**
Los 407 productos salieron de `STOCK ALMACEN CHACRA CERRO.xlsx`. Reproduciendo su
pedido real PE20-00003384, **cuatro de ocho líneas no se pueden teclear**: tres
códigos no existen y uno (`10461IMPL0031`) existe apuntando a **otro producto**.
Y no hay un solo producto de servicio —ni instalación, ni flete—. Se puede emitir
igual metiéndolos como ítem libre, pero teclear a mano la mitad de cada pedido es
la fricción por la que ventas se queda en Word.

**C9. Puntos 12 y 13 del PDF siguen abiertos**: el aplicativo móvil existe en el
monorepo pero no apunta a Kaiser ni está rebrandeado, y no hay web pública
conectada al ERP.

### Preguntas para Comercial (Christian, Javier, Ari, Stephanie)

1. **¿El precio lo pone el vendedor o viene autorizado?** ¿Hay un descuento máximo
   —por vendedor, por producto, por cliente—? ¿Quién lo autoriza y hace falta que
   quede registrado quién lo aprobó?
2. **¿Qué es exactamente la "condición comercial" de un cliente?** ¿Días de
   crédito, lista de precios, descuento fijo, quién paga el flete? Hoy el ERP
   guarda crédito y lista; el resto no tiene campo.
3. **Al abrir un cliente, ¿qué necesita ver el vendedor en la primera pantalla?**
   ¿Las últimas diez compras con su precio, lo que debe, lo que cotizó y no
   cerró, el último contacto? *(Es lo que decide cómo se construye C1.)*
4. **Un reclamo: ¿quién lo registra, Comercial o Almacén?** ¿Qué estados tiene,
   quién lo cierra, y termina siempre en nota de crédito o a veces en cambio de
   mercadería?
5. **Reserva de stock: ¿al cotizar o al autorizar el pedido?** ¿Cuántos días dura
   y quién puede liberarla? Javier lo planteó así: hoy se lleva el producto el
   cliente que deposita primero.
6. **¿Nos pueden dar el maestro de productos de STARSOFT/P&P?** No otro archivo de
   stock. Y de paso: ¿`10461IMPL0031` es *Piso levante* o *Medianera levante*?
7. **¿Los servicios se facturan?** Instalación, flete, montaje: ¿van como producto
   del catálogo o como texto libre en la factura?
8. **¿Con qué tipo de cambio cotizan en dólares?** ¿El de SUNAT del día, el del
   banco, uno fijo del mes? ¿Y quién lo actualiza?
9. **¿Se factura una cotización en partes?** Hoy el sistema la cierra con el
   primer comprobante, porque se confirmó que facturan completa. Si eso cambia,
   hay que comparar línea por línea.
10. **¿Quién emite la factura?** La ficha dice que la hace Facturación, no
    Comercial. Eso decide permisos y decide quién ve qué en el menú.
11. **Comisiones: ¿se ganan al emitir o al cobrar?** ¿Porcentaje por vendedor, por
    producto o por margen? ¿Y el vendedor de campo cobra en la calle?
12. **¿Qué falta en la cotización impresa** que hoy tienen que escribir a mano
    después de descargarla?

---

## 3. PRODUCCIÓN

### Lo que ya está cerrado

Recetas con componentes por unidad y por lote, órdenes con merma, entrega de
material a planta, devolución del sobrante, almacén de mermas con retazo y
descarte separados, liquidación a tres niveles (receta / orden / real) con sus dos
desviaciones y el rendimiento, genealogía hacia atrás y hacia adelante, y el
precio del módulo por peso × precio por kilo × factor, con la moneda del precio
base resuelta.

Es, de lejos, lo más fuerte que tenemos frente a STARSOFT, que respondió a la
merma con *"cree un almacén de mermas y regístrelo a mano"*.

### Lo que falta

**P1. El costo de fabricar es solo material.**
`costoProduccion = costoConsumo + costoMerma` (`prisma/schema.prisma:700`). No hay
mano de obra, ni energía, ni depreciación de máquina, ni gasto indirecto. El PDF
pide textualmente *"costo real del producto terminado"*, y en una planta que corta,
dobla y suelda, el material no es el costo entero. **Mientras esto no esté, el
margen del dashboard y el P&L sobrevaloran lo fabricado.** Es el hueco más
grande que queda en el módulo estrella.

**P2. No hay ficha de evaluación de Planta.** Ver arriba.

**P3. El BOM se corta en el segundo nivel.** A los módulos les faltan **27 piezas
intermedias** —soportes, divisiones, coberturas, puertas— y ninguna de las 27
tiene receta propia: el árbol salta del módulo a la pieza y ahí se acaba. La vía
barata es la que enseñó el comedero: **cuántas piezas salen de una plancha**, que
planta sabe de memoria porque es como cortan.

**P4. Pesos pendientes.** La platina de guillotina no tiene peso unitario (en su
hoja, al lado, planta escribió *"peso?"*). Hay 49 productos en KG con 50 000 g,
24 de ellos heredados de la importación, donde el peso parece ser el del rollo.
Y cinco de los siete módulos no tienen capacidad de aves: solo están documentadas
la de levante 1 piso (96) y la de postura 3 pisos (168).

**P5. Hay dos "MÓDULO MODELO LEVANTE 1 PISO"**: `10460GALI0002` (receta de 19
componentes, el de la hoja de planta) y `10461GALI0002` (receta de 5, del
inventario de almacén). Ninguno tiene movimientos. Hay que saber cuál es el bueno
y si el otro se da de baja.

**P6. Los números del precio por peso no están puestos.** `precioBaseKg`,
`factorPrecioDefault` (2,8) y `factorPrecioMinimo` (2,6) nacen en NULL a
propósito: encenderlos cambia precios y es decisión de Kaiser. Mientras tanto,
todo cae al precio de catálogo.

**P7. No hay control de calidad, ni tiempos, ni paradas, ni capacidad.** La orden
guarda máquina y encargado, pero no horas, no turnos, no "la máquina estuvo parada
dos horas", no "de 200 salieron 196 conformes y 4 a reproceso". Sin horas, además,
P1 no se puede calcular aunque se quisiera.

**P8. Maquila externa** (ver A4): mismo hueco, visto desde planta.

**P9. Nadie en Kaiser supo explicar el ÷2 de su propia hoja.** En la reunión del
7-oct lo dejaron en que *"solo el tío lo sabe"*. La columna B (oculta) es el
pedido entero y la C que se ve es la mitad. No se puede dar por validada esa hoja
hasta que alguien lo explique.

### Preguntas para Álvaro y planta

1. **¿Cuánto cuesta una hora de planta?** ¿Quieren que el costo del módulo incluya
   mano de obra y energía, o les vale con el material? Si lo quieren: ¿por horas
   apuntadas en la orden, por una tasa fija por kilo producido, o repartiendo el
   gasto del mes entre lo fabricado?
2. **¿Quién llena la hoja de producción y cuándo?** ¿El operario al cerrar el
   turno, o el jefe al terminar la orden? *(Decide si el sistema pide avances
   parciales o solo el cierre.)*
3. **Las 27 piezas intermedias: ¿se fabrican o se compran?** Si se fabrican,
   **¿cuántas salen de una plancha?** Esa sola cifra cierra el BOM de los módulos
   sin pesar nada.
4. **¿Cuál de los dos módulos de levante 1 piso es el válido?** ¿El otro se da de
   baja?
5. **El ÷2 de la hoja: ¿qué es?** ¿Dos galpones, dos caras, dos operarios?
6. **¿Cuánto pesa una platina de guillotina?**
7. **Los productos que se miden en KG: ¿los 50 kg son el rollo?** Si sí, hay que
   normalizarlos; si no, hay 49 pesos mal.
8. **Merma: ¿qué porcentaje es normal, y por producto?** ¿Quién decide si un
   retazo sirve o es chatarra, y lo pesan o lo estiman? ¿A cuánto venden la
   chatarra?
9. **¿Qué se fabrica contra pedido y qué para stock?**
10. **¿Siempre hay un semielaborado en medio** (como la división de levante) o
    solo en algunos productos?
11. **Si una orden se parte entre dos turnos o dos días, ¿cómo se registra hoy?**
12. **Capacidad de aves de los otros cinco módulos.** Sin ese dato, el cotizador
    les pide la cantidad a mano en vez de deducirla —que es lo correcto, pero no
    es lo que les enamoró en la demo.
13. **¿Hay control de calidad?** ¿Se separa lo conforme de lo que va a reproceso,
    y queda registro?

---

## 4. Lo que hay que pedirles antes de la reunión

1. **La ficha de evaluación de procesos de Planta/Producción**, en el mismo
   formato que las de Almacén y Comercial. Y, ya puestos, las de
   Logística/Compras, Contabilidad y Facturación.
2. **El maestro de productos de STARSOFT/P&P** —no un archivo de stock—, con
   servicios incluidos.
3. **El export de P&P para la migración.** Sigue siendo la dependencia crítica y
   no está de nuestro lado: sin ese archivo, la ventaja principal frente a
   STARSOFT (ellos no migran movimientos; nosotros sí) no se puede demostrar con
   datos reales.
4. **La carpeta de fichas técnicas en PDF.** El cargador masivo está listo
   (`pnpm run fichas:cargar -- <carpeta> --dry-run`); lo que falta son los PDFs.
5. **El costo de hora de planta y la planilla de producción**, si quieren costo
   real y no solo material.

## 5. Si solo se puede preguntar una cosa por área

- **Almacén** → ¿rollo y metro cuadrado son el mismo artículo o dos?
- **Comercial** → ¿quién autoriza un descuento, y dónde se ve lo que ya le
  vendimos a ese cliente?
- **Producción** → ¿el costo del módulo lleva mano de obra, o solo material?
