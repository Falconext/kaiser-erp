# "Si dejamos de pagar, perdemos nuestra información"

La objeción que frena la venta en Kaiser. La plantean **la gerente y la jefa de
contabilidad**, y es el motivo por el que prefieren un ERP de escritorio.

Dicha con sus palabras, según lo que nos llegó desde dentro:

> La tía de contabilidad y la gerente quieren un ERP de escritorio porque dicen que
> la información se queda en los servidores. Y que si dejan de contratar los
> servicios o migran a otro ERP, como todo está en la nube no es posible acceder a
> esa info si no se paga la suscripción.

## Lo primero: tienen razón

Conviene decirlo sin rodeos, porque de ahí sale la estrategia. **No es
desconocimiento.** Es la pregunta que hace cualquier comprador serio de software, y
tiene nombre propio en la industria: dependencia del proveedor.

Y hasta hoy, en Kaiser ERP, **tenían razón de hecho**: había doce exportaciones
sueltas —kardex, arqueo, comisiones, conciliación— y **ninguna que sacara todo**. Si
Kaiser dejaba de pagar, su información se quedaba dentro.

Dos consecuencias prácticas:

1. **No se gana discutiendo.** Quien plantea esto no quiere un argumento, quiere una
   garantía. Responder "eso no pasa" suena exactamente a lo que teme.
2. **Es la carta más fuerte de STARSOFT y puede que ni lo sepan.** Su SQL Server en
   el servidor de Kaiser responde la objeción de verdad. Si el tema se queda en el
   terreno del discurso, gana el escritorio.

## Lo segundo: quiénes son

Son las dos personas que firman. Y son de perfil no técnico. Eso no cambia el fondo
—la objeción es válida— pero sí la forma: **la respuesta tiene que poder verse, no
explicarse.** Un botón que se pulsa y un archivo que se abre en Excel convence; una
lámina sobre arquitectura en la nube, no.

---

## La respuesta: cuatro capas

### 1. El botón (hecho)

`GET /empresa/exportar-todo` — Excel completo con toda la información de la empresa,
una pestaña por tipo de información, descargable por gerencia cuando quiera.

En los datos de la demo salen **14 pestañas y 1 446 registros**: clientes,
catálogo, inventario valorizado, kardex con su rastro, ventas con su detalle,
compras con el suyo, cobros, órdenes de producción, recetas, sedes y usuarios.

Tres decisiones deliberadas:

- **Excel, no JSON ni un volcado SQL.** Quien hace esta pregunta es contabilidad, y
  contabilidad abre Excel. El archivo tiene que poder abrirse delante de ella.
- **Abre por una portada** que dice qué es el archivo y cuántos registros trae de
  cada cosa, para que se entienda sin que nadie lo explique.
- **No lleva contraseñas**, ni siquiera el hash. Es un archivo que va a circular.

Protegido por `pnpm run qa:exportacion`, que no comprueba que "haya filas" sino que
**cuadren con la base tabla por tabla**, y que la suma de las ventas exportadas sea
idéntica a la de la base. Es una prueba que existe contra un fallo silencioso
concreto: añadir una tabla al ERP y olvidarse de incluirla en la exportación, con lo
que el cliente creería llevárselo todo sin ser verdad. Verificado por mutación.

### 2. La simetría con la migración

Es el argumento más potente y no cuesta nada, porque ya está construido:

> Entramos leyendo un Excel de siete hojas, con los datos que usted nos dé. Y se
> sale igual: un Excel de catorce pestañas, con todo lo suyo. **Lo que entra, sale.**

Refuerza además el punto donde STARSOFT dijo seis veces que no puede: nosotros
importamos histórico de otro sistema, y exportamos el nuestro. La puerta abre en las
dos direcciones.

### 3. La garantía por contrato (pendiente, y no es técnica)

Una cláusula de salida: al terminar la relación, por el motivo que sea, Kaiser
recibe **el volcado completo de su base de datos** además del Excel, en un plazo
comprometido y sin coste.

Cuesta cero y desactiva la objeción en su propio terreno, que es el del contrato y
no el de la tecnología. **Esto lo decide Diego**, no el código.

### 4. La opción nuclear (pendiente de decisión)

Kaiser ERP es Node + PostgreSQL. **Puede correr en el servidor de Kaiser.**

Ofrecerlo —aunque sea como opción que probablemente no tomen— elimina de un golpe la
única ventaja real de STARSOFT. Y el efecto suele ser el contrario al que se teme:
cuando la puerta está abierta, deja de ser urgente cruzarla.

Tiene coste: despliegue, respaldos, actualizaciones y soporte en una máquina que no
controlamos. Conviene decidir antes si se ofrece, con qué precio y con qué límites.

---

## Lo que falta

| | Estado |
|---|---|
| Exportación completa (backend) | ✔ hecho y probado |
| Pantalla «Mis datos» con el botón | ✔ hecho y probado en el navegador |
| Cláusula de salida en el contrato | pendiente, decisión de Diego |
| Postura sobre instalación local | pendiente, decisión de Diego |
| Respaldo automático descargable | no empezado |

### La pantalla

**Inventario › … › Mis datos**, en el menú lateral, visible solo para gerencia.

No es una pantalla técnica y no lo parece: no habla de respaldos, ni de bases de
datos, ni de formatos. Dice *«Su información es suya, y se la puede llevar cuando
quiera»*, lista en castellano llano lo que contiene el archivo, y tiene un botón que
dice lo que hace. Al terminar muestra cuántos registros se descargaron —1 446 con
los datos de la demo—, que es la prueba visible de que no se quedó nada dentro.

Probada en el navegador de punta a punta, y ahí apareció un fallo que no se ve de
otra forma: el contador decía **«0 registros»**. Era CORS — el navegador no entrega
al JavaScript las cabeceras propias salvo que el servidor las declare en
`exposedHeaders`, y no estaban. Afectaba también al nombre del archivo, y a **todas**
las descargas del ERP: las demás funcionaban de casualidad porque el frontend se
inventa el nombre. Corregido en `main.ts`.

---

## Un segundo tema del mismo mensaje: planillas

De la misma fuente:

> Otra cosa que escuché de Karim, que es la gerente: que en STARSOFT había un módulo
> de planillas, y de ahí recursos humanos sacaba el pago de la nómina al toque. Y
> contabilidad jalaba no más. **Dice que eso le encantó.**

**Kaiser ERP no tiene nada de planillas.** Ni un modelo en el esquema.

Y esto viene de la gerente, en positivo, sobre el competidor. Pesa.

### Mi recomendación: no construir un módulo de planillas

Una planilla peruana no es una tabla de sueldos: es AFP con sus comisiones, ESSALUD,
quinta categoría, CTS, gratificaciones, PLAME. Está regulado, cambia, y **un cálculo
mal hecho es responsabilidad legal de Kaiser**. Es meses de trabajo en un dominio
que no es el nuestro, y prometerlo para la demo es peor que no tenerlo.

Hay una salida mejor, y sale de la propia frase de la gerente. Lo que le encantó no
fue el cálculo de la planilla: fue que **"contabilidad jalaba no más"** — la
integración, no la nómina. Eso sí es barato:

- **Importar la planilla ya calculada** (del software que usen, o de un Excel) y que
  entre sola al gasto y a la contabilidad.
- Es una hoja más en el mismo formato que ya maneja la migración.

Se le da el 80 % del valor que ella nombró, sin asumir el riesgo del 20 % regulado.

Si aun así Kaiser exige planillas completas, la respuesta honesta es que no lo
tenemos y se integra con quien lo haga. **Conceder un módulo es mucho mejor que
prometerlo y fallar en el primer pago de nómina.**
