/**
 * QA funcional · El precio del módulo: peso × precio por kilo × factor
 *
 * Así cotiza Kaiser de verdad. El precio de catálogo de un módulo envejece en
 * cuanto se mueve el acero; el peso no cambia, y el factor es lo que se
 * negocia con el cliente.
 *
 * La regla que más importa, y la que este guion vigila en cada caso: **si
 * falta cualquier dato, el precio es el de catálogo y se dice qué falta —
 * nunca 0**. Un 0 en una cotización se manda al cliente y se factura.
 *
 * Siembra sus propios productos, su propia receta y sus propios valores de
 * empresa, así que no depende de que Kaiser haya contestado los pesos que
 * tiene pendientes. Restaura la configuración y lo borra todo al terminar.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

async function api(ruta, { token, ...init } = {}) {
  const r = await fetch(API + ruta, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const t = await r.text();
  let j = {}; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 200) }; }
  return { status: r.status, body: j, data: j?.data };
}
async function login(email = 'gerencia@kaisercorp.com.pe') {
  const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'kaiser123' }) });
  if (r.status >= 400 || !r.data) throw new Error(`login falló (HTTP ${r.status})`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const sel = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  return sel.data.accessToken;
}

async function main() {
  const token = await login();
  const marca = `QAM6${Date.now().toString().slice(-7)}`;
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true, tipoAfectacionIGV: true, moneda: true } });
  const empresaId = ref.empresaId;
  const creado = { productos: [], recetas: [], comprobantes: [] };

  // La configuración de precio de la empresa se restaura al terminar.
  const previo = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { precioBaseKg: true, precioBaseKgMoneda: true, factorPrecioDefault: true, factorPrecioMinimo: true },
  });

  const nuevoProducto = async (sufijo, extra = {}) => {
    const p = await prisma.producto.create({
      data: {
        codigo: `${marca}${sufijo}`, descripcion: `[QA-MODULO] ${sufijo}`,
        precioUnitario: 500, valorUnitario: 500, stock: 100, costoPromedio: 1,
        empresaId, unidadMedidaId: ref.unidadMedidaId,
        tipoAfectacionIGV: ref.tipoAfectacionIGV, moneda: ref.moneda, ...extra,
      },
      select: { id: true, codigo: true },
    });
    creado.productos.push(p.id);
    return p;
  };

  try {
    console.log('\n💰 QA · El precio del módulo\n');

    // ── 0. El decorado: un módulo de 10 kg ──────────────────────────────────
    // 2 insumos × 2 unidades × 2500 g = 10 kg por módulo. Un tercero POR_LOTE,
    // que NO debe contar en el peso de una unidad.
    const insA = await nuevoProducto('INA', { pesoGramos: 2500 });
    const insB = await nuevoProducto('INB', { pesoGramos: 2500 });
    const insLote = await nuevoProducto('INL', { pesoGramos: 9000 });
    const modulo = await nuevoProducto('MOD', {
      esModulo: true, capacidadAves: 168, precioUnitario: 500, valorUnitario: 500,
    });
    const receta = await prisma.recetaProduccion.create({
      data: {
        empresaId, productoFinalId: modulo.id, codigo: `${marca}-REC`,
        nombre: 'QA módulo', rendimientoObjetivo: 1, unidadRendimiento: 'UND',
        componentes: {
          create: [
            { productoInsumoId: insA.id, cantidadBase: 2, unidadBase: 'UND', tipoCantidad: 'POR_UNIDAD', orden: 1 },
            { productoInsumoId: insB.id, cantidadBase: 2, unidadBase: 'UND', tipoCantidad: 'POR_UNIDAD', orden: 2 },
            { productoInsumoId: insLote.id, cantidadBase: 3, unidadBase: 'UND', tipoCantidad: 'POR_LOTE', orden: 3 },
          ],
        },
      },
      select: { id: true },
    });
    creado.recetas.push(receta.id);

    await prisma.empresa.update({
      where: { id: empresaId },
      data: { precioBaseKg: 1, factorPrecioDefault: 2, factorPrecioMinimo: 1.5 },
    });

    // ── 1. El cálculo ───────────────────────────────────────────────────────
    console.log('1) Peso × precio por kilo × factor');
    const r1 = await api(`/produccion/modulos/${modulo.id}/precio`, { token });
    ok(r1.status < 400, `responde (HTTP ${r1.status})`);
    ok(Number(r1.data?.pesoKg) === 10, `el peso sale de la receta: 10 kg (${Number(r1.data?.pesoKg)})`);
    ok(r1.data?.origen === 'PESO_X_FACTOR', `el origen es el cálculo, no el catálogo (${r1.data?.origen})`);
    ok(Number(r1.data?.precio) === 20, `10 × 1 × 2 = 20 (${Number(r1.data?.precio)})`);
    ok((r1.data?.faltan ?? []).length === 0, 'y no falta nada');

    // El POR_LOTE no debe estar en el peso de UNA unidad.
    ok(Number(r1.data?.pesoKg) !== 37, 'el insumo POR_LOTE no infla el peso de un módulo');

    // ── 2. El factor se puede pedir distinto ────────────────────────────────
    console.log('\n2) El factor es lo que se negocia');
    const r2 = await api(`/produccion/modulos/${modulo.id}/precio?factor=3`, { token });
    ok(Number(r2.data?.precio) === 30, `con factor 3: 10 × 1 × 3 = 30 (${Number(r2.data?.precio)})`);
    ok(r2.data?.bajoMinimo === false, 'y 3 no está bajo el mínimo');
    const r3 = await api(`/produccion/modulos/${modulo.id}/precio?factor=1.2`, { token });
    ok(r3.data?.bajoMinimo === true, 'pero 1.2 sí lo está y se avisa');
    ok(Number(r3.data?.factorMinimo) === 1.5, `y se dice cuál es el mínimo (${Number(r3.data?.factorMinimo)})`);

    // ── 3. Lo que falta se dice; el precio NUNCA es 0 ───────────────────────
    console.log('\n3) Sin datos cae al catálogo y lo dice — nunca 0');
    await prisma.empresa.update({ where: { id: empresaId }, data: { precioBaseKg: null } });
    const sinBase = await api(`/produccion/modulos/${modulo.id}/precio`, { token });
    ok(Number(sinBase.data?.precio) === 500, `usa el precio de catálogo: 500 (${Number(sinBase.data?.precio)})`);
    ok(sinBase.data?.origen === 'CATALOGO', 'y lo dice en el origen');
    ok((sinBase.data?.faltan ?? []).includes('precioBaseKg'), 'y nombra lo que falta');
    await prisma.empresa.update({ where: { id: empresaId }, data: { precioBaseKg: 1 } });

    // Un componente sin peso: el precio NO se calcula a medias.
    await prisma.producto.update({ where: { id: insB.id }, data: { pesoGramos: null } });
    const sinPeso = await api(`/produccion/modulos/${modulo.id}/precio`, { token });
    ok(sinPeso.data?.pesoKg === null, 'un solo componente sin peso deja el peso en null, no a medias');
    ok(Number(sinPeso.data?.precio) === 500, `y el precio cae al catálogo (${Number(sinPeso.data?.precio)})`);
    ok(
      (sinPeso.data?.faltan ?? []).some((f) => String(f).includes(insB.codigo)),
      'diciendo QUÉ componente, que es lo accionable',
    );
    await prisma.producto.update({ where: { id: insB.id }, data: { pesoGramos: 2500 } });

    // ── 2-bis. SIN PRECIO EN NINGUNA PARTE ──────────────────────────────────
    // Lo destapó encender el cotizador con los datos reales de Kaiser: el
    // módulo de levante se sembró con precio de catálogo 0 («estructura sí,
    // números no»), así que al caer al catálogo devolvía… 0. Un 0 se manda al
    // cliente y se factura, que es justo lo que este cálculo existe para no
    // hacer.
    console.log('\n2-bis) Sin precio por kilo Y sin precio de catálogo');
    await prisma.empresa.update({ where: { id: empresaId }, data: { precioBaseKg: null } });
    await prisma.producto.update({ where: { id: modulo.id }, data: { precioUnitario: 0, valorUnitario: 0 } });
    const sinNada = await api(`/produccion/modulos/${modulo.id}/precio`, { token });
    ok(sinNada.data?.precio === null, `el precio es NULL, no 0 (${JSON.stringify(sinNada.data?.precio)})`);
    ok(
      (sinNada.data?.faltan ?? []).includes('precioCatalogo'),
      'y dice que tampoco hay precio de catálogo',
    );
    await prisma.producto.update({ where: { id: modulo.id }, data: { precioUnitario: 500, valorUnitario: 500 } });
    const conCat = await api(`/produccion/modulos/${modulo.id}/precio`, { token });
    ok(Number(conCat.data?.precio) === 500, `con catálogo de verdad sí cae a él (${Number(conCat.data?.precio)})`);
    await prisma.empresa.update({ where: { id: empresaId }, data: { precioBaseKg: 1 } });

    // ── 3-ter. LA MONEDA ────────────────────────────────────────────────────
    // `precioBaseKg` es un número suelto. Kaiser cotiza estos módulos en
    // DÓLARES (pedido PE20-00003384, cotización de Granja Los Sauces), así que
    // sin decir en qué moneda está, el precio sale equivocado por el tipo de
    // cambio entero: 242,60 dólares impresos como 242,60 soles.
    console.log('\n3-ter) La moneda del precio por kilo');
    await prisma.empresa.update({
      where: { id: empresaId },
      data: { precioBaseKg: 1, precioBaseKgMoneda: 'USD' },
    });

    const enUsd = await api(`/produccion/modulos/${modulo.id}/precio`, { token });
    ok(enUsd.data?.monedaBase === 'USD', `dice en qué moneda está el precio por kilo (${enUsd.data?.monedaBase})`);
    ok(enUsd.data?.moneda === 'USD', 'y sin pedir otra, devuelve el precio en esa');
    ok(Number(enUsd.data?.precio) === 20, `10 kg × 1 × 2 = 20 dólares (${Number(enUsd.data?.precio)})`);

    const aSoles = await api(`/produccion/modulos/${modulo.id}/precio?moneda=PEN&tipoCambio=3.75`, { token });
    ok(aSoles.data?.moneda === 'PEN', 'con tipo de cambio convierte a la moneda del documento');
    ok(Number(aSoles.data?.precio) === 75, `20 × 3,75 = 75 soles (${Number(aSoles.data?.precio)})`);
    ok(aSoles.data?.monedaBase === 'USD', 'sin perder de vista de dónde salió');

    // ⚠ Lo importante: sin tipo de cambio NO se inventa uno.
    const sinTc = await api(`/produccion/modulos/${modulo.id}/precio?moneda=PEN`, { token });
    ok(Number(sinTc.data?.precio) === 20, `sin tipo de cambio NO convierte: sigue en 20 (${Number(sinTc.data?.precio)})`);
    ok(sinTc.data?.moneda === 'USD', 'y lo devuelve en su moneda, no en la pedida');
    ok(
      (sinTc.data?.faltan ?? []).includes('tipoCambio'),
      'diciendo que falta el tipo de cambio, para que la pantalla avise',
    );

    // El precio de CATÁLOGO no se convierte nunca: está en la moneda base.
    await prisma.empresa.update({ where: { id: empresaId }, data: { precioBaseKg: null } });
    const cat = await api(`/produccion/modulos/${modulo.id}/precio?moneda=PEN&tipoCambio=3.75`, { token });
    ok(cat.data?.origen === 'CATALOGO', 'sin precio por kilo cae al catálogo');
    ok(Number(cat.data?.precio) === 500, `y el catálogo NO se convierte: 500, no 1875 (${Number(cat.data?.precio)})`);
    ok(cat.data?.monedaBase === 'PEN', 'porque el precio de catálogo está en la moneda base');

    // ⚠ Una moneda que no existe no se convierte. Lo cazó el QA funcional
    // probando entradas basura: `?moneda=XXX&tipoCambio=3.75` devolvía 75 con
    // la etiqueta 'XXX' — un número convertido con una moneda inventada.
    await prisma.empresa.update({
      where: { id: empresaId },
      data: { precioBaseKg: 1, precioBaseKgMoneda: 'USD' },
    });
    for (const mala of ['XXX', 'EUR']) {
      const r = await api(`/produccion/modulos/${modulo.id}/precio?moneda=${mala}&tipoCambio=3.75`, { token });
      ok(Number(r.data?.precio) === 20, `moneda ${mala}: no convierte, sigue en 20 (${Number(r.data?.precio)})`);
      ok(r.data?.moneda === 'USD', `moneda ${mala}: devuelve la real, no la inventada (${r.data?.moneda})`);
      ok((r.data?.faltan ?? []).includes('monedaDesconocida'), `moneda ${mala}: y lo dice en faltan`);
    }

    // ⚠ Y una moneda basura GUARDADA no hace que el precio se divida.
    // `precioBaseKgMoneda` es una columna de texto: el DTO la valida al
    // entrar, pero una migración o un UPDATE a mano pueden dejar cualquier
    // cosa. Con 'XXX' el cálculo caía en la rama PEN → USD y dividía: 20
    // salía como 5,33, en silencio.
    await prisma.empresa.update({ where: { id: empresaId }, data: { precioBaseKgMoneda: 'XXX' } });
    const guardadaMala = await api(`/produccion/modulos/${modulo.id}/precio?moneda=PEN&tipoCambio=3.75`, { token });
    ok(
      Number(guardadaMala.data?.precio) === 20,
      `una moneda basura en la BD no divide el precio: 20, no 5.33 (${Number(guardadaMala.data?.precio)})`,
    );
    ok(guardadaMala.data?.monedaBase === 'PEN', 'se normaliza a la moneda base del sistema');

    // ⚠ Y una moneda inválida NO se guarda. `PUT /empresa/mia` recibe
    // `Partial<UpdateEmpresaDto>`, que en runtime es `Object`, así que el
    // ValidationPipe se salta esa ruta y el @IsIn del DTO no corre: un PUT
    // con 'EUR' respondía 200 y dejaba 'EUR' en la columna. Se normaliza en
    // el servicio, que es por donde pasan las dos rutas.
    for (const mala of ['EUR', 'soles', '']) {
      await api('/empresa/mia', {
        token, method: 'PUT',
        body: JSON.stringify({ precioBaseKgMoneda: mala }),
      });
      const emp = await prisma.empresa.findUnique({
        where: { id: empresaId }, select: { precioBaseKgMoneda: true },
      });
      ok(
        emp?.precioBaseKgMoneda === 'PEN',
        `guardar la moneda ${JSON.stringify(mala)} la normaliza a PEN (quedó ${JSON.stringify(emp?.precioBaseKgMoneda)})`,
      );
    }
    // Y una válida sí se guarda, no sea que la normalización se lo coma todo.
    await api('/empresa/mia', { token, method: 'PUT', body: JSON.stringify({ precioBaseKgMoneda: 'USD' }) });
    const empOk = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { precioBaseKgMoneda: true } });
    ok(empOk?.precioBaseKgMoneda === 'USD', `pero USD sí se guarda (${empOk?.precioBaseKgMoneda})`);

    await prisma.empresa.update({
      where: { id: empresaId },
      data: { precioBaseKg: 1, precioBaseKgMoneda: 'PEN' },
    });

    // ── 3-bis. La PIEZA SUELTA ──────────────────────────────────────────────
    // La mitad de lo que se cotiza por este camino son repuestos: el granjero
    // que cambia pisos o cortinas de un módulo que ya tiene (reunión 7-oct,
    // pedido PE20-00003384). Una pieza no tiene receta, tiene peso, y le toca
    // el MISMO factor que al módulo entero.
    console.log('\n3-bis) Una pieza suelta, sin receta');
    const pieza = await nuevoProducto('PZA', { pesoGramos: 4000, precioUnitario: 77, valorUnitario: 77 });
    const pz = await api(`/produccion/modulos/${pieza.id}/precio`, { token });
    ok(pz.status < 400, `responde (HTTP ${pz.status})`);
    ok(Number(pz.data?.pesoKg) === 4, `el peso sale del propio producto: 4 kg (${Number(pz.data?.pesoKg)})`);
    ok(pz.data?.origen === 'PESO_X_FACTOR', `y se tarifa por peso, no por catálogo (${pz.data?.origen})`);
    ok(Number(pz.data?.precio) === 8, `4 × 1 × 2 = 8, el mismo factor del módulo (${Number(pz.data?.precio)})`);
    ok(pz.data?.esModulo === false, 'sin necesidad de marcarla como módulo');

    // Una pieza sin peso tampoco se inventa un precio.
    const piezaSinPeso = await nuevoProducto('PZB', { precioUnitario: 55, valorUnitario: 55 });
    const pzs = await api(`/produccion/modulos/${piezaSinPeso.id}/precio`, { token });
    ok(pzs.data?.pesoKg === null, 'una pieza sin peso deja el peso en null');
    ok(Number(pzs.data?.precio) === 55, `y cae al catálogo (${Number(pzs.data?.precio)})`);
    ok(
      (pzs.data?.faltan ?? []).some((f) => String(f).includes(piezaSinPeso.codigo)),
      'nombrando la pieza, que es lo accionable',
    );

    // ── 4. La explosión: qué lleva ──────────────────────────────────────────
    console.log('\n4) «Qué lleva», explotado');
    const exp = await api(`/produccion/modulos/${modulo.id}/explosion?cantidad=10`, { token });
    ok(exp.status < 400, `responde (HTTP ${exp.status})`);
    const porCod = Object.fromEntries((exp.data?.componentes ?? []).map((c) => [c.codigo, c]));
    ok(Number(porCod[insA.codigo]?.requerido) === 20, `lo POR_UNIDAD escala: 2 × 10 = 20 (${Number(porCod[insA.codigo]?.requerido)})`);
    ok(Number(porCod[insLote.codigo]?.requerido) === 3, `lo POR_LOTE no: sigue en 3 (${Number(porCod[insLote.codigo]?.requerido)})`);
    ok(Number(exp.data?.pesoKgPorUnidad) === 10, `y el peso por unidad es el mismo: 10 kg (${Number(exp.data?.pesoKgPorUnidad)})`);
    ok(porCod[insA.codigo]?.alcanza === true, 'dice si alcanza el stock de cada componente');

    // ── 5. Quién puede consultarlo ──────────────────────────────────────────
    console.log('\n5) Quién puede poner precio a un módulo');
    const tokenVentas = await login('ventas@kaisercorp.com.pe');
    const comoVentas = await api(`/produccion/modulos/${modulo.id}/precio`, { token: tokenVentas });
    ok(comoVentas.status < 400, `ventas SÍ puede (HTTP ${comoVentas.status}): es quien cotiza`);
    const expVentas = await api(`/produccion/modulos/${modulo.id}/explosion`, { token: tokenVentas });
    ok(expVentas.status < 400, `y ver qué lleva (HTTP ${expVentas.status})`);

    // ── 6. El snapshot en la cotización ─────────────────────────────────────
    // Lo que se cotizó queda fijo aunque el acero suba o el factor se
    // renegocie. Sin esto, dentro de un mes nadie puede reconstruir de dónde
    // salió la cifra que se le mandó al cliente.
    console.log('\n6) La cotización guarda el peso y el factor con los que se calculó');
    const cliente = await prisma.cliente.findFirst({ where: { empresaId }, select: { id: true } });

    /**
     * ⚠ Las cotizaciones de prueba se INSERTAN con una serie que no existe en
     * `Serie` y se EDITAN por la API, en vez de crearlas con POST.
     *
     * Crearlas por la API consumiría correlativos de COT1 —la serie real— y
     * borrarlas después dejaría huecos que `qa:series` caza con razón. Pasó en
     * el primer intento de este guion: tres cotizaciones de prueba acabaron en
     * COT1-34, 35 y 36. Es el mismo criterio que ya seguían `qa:credito` y
     * `qa:vendedor-campo`.
     *
     * Y editar sirve igual: `actualizarCotizacion` pasa por el MISMO
     * `cargarProductosYDetalles` que la creación, que es donde vive todo lo
     * que hay que comprobar.
     */
    const cotizacionDePrueba = async () => {
      const c = await prisma.comprobante.create({
        data: {
          empresaId, sedeId: SEDE, clienteId: cliente?.id ?? null,
          tipoDoc: 'COT', serie: `${marca.slice(0, 4)}9`,
          correlativo: 900000 + Math.floor(Math.random() * 90000),
          fechaEmision: new Date(), tipoMoneda: 'PEN',
          formaPagoTipo: 'CONTADO', formaPagoMoneda: 'PEN',
          mtoOperGravadas: 100, mtoIGV: 18, valorVenta: 100,
          totalImpuestos: 18, subTotal: 118, mtoImpVenta: 118, saldo: 118,
          estadoEnvioSunat: 'NO_APLICA',
          detalles: {
            create: [{
              productoId: modulo.id, unidad: 'NIU', descripcion: 'QA módulo', cantidad: 1,
              mtoValorUnitario: 100, mtoValorVenta: 100, mtoBaseIgv: 100,
              porcentajeIgv: 18, igv: 18, tipAfeIgv: 10, totalImpuestos: 18, mtoPrecioUnitario: 118,
            }],
          },
        },
        select: { id: true },
      });
      creado.comprobantes.push(c.id);
      return c.id;
    };

    const cuerpoCotiz = (extra = {}) => ({
      tipoDoc: 'COT',
      tipoOperacionId: 1,
      clienteId: cliente?.id,
      clienteName: 'QA módulos',
      fechaEmision: new Date().toISOString(),
      tipoMoneda: 'PEN',
      formaPagoTipo: 'CONTADO',
      formaPagoMoneda: 'PEN',
      leyenda: '',
      detalles: [
        { productoId: modulo.id, cantidad: 2, nuevoValorUnitario: 24, filas: 3, factor: 2 },
      ],
      ...extra,
    });
    const cotId = await cotizacionDePrueba();
    const cot = await api(`/comprobante/${cotId}`, { token, method: 'PATCH', body: JSON.stringify(cuerpoCotiz()) });
    ok(cot.status < 400, `la cotización se guarda (HTTP ${cot.status}) ${cot.body?.message ?? ''}`);
    const det = await prisma.detalleComprobante.findFirst({
      where: { comprobanteId: cotId },
      select: {
        filas: true, pesoKgSnapshot: true, factorAplicado: true,
        precioBaseKgSnapshot: true, monedaBaseSnapshot: true, tipoCambioAplicado: true,
      },
    });
    ok(Number(det?.pesoKgSnapshot) === 10, `guarda el peso con el que se calculó (${Number(det?.pesoKgSnapshot)})`);
    ok(Number(det?.factorAplicado) === 2, `y el factor (${Number(det?.factorAplicado)})`);
    ok(det?.filas === 3, `y las filas de módulos apilados (${det?.filas})`);
    // Las otras dos mitades de la cuenta: sin ellas, peso y factor no
    // reconstruyen nada, porque el acero sube y el dólar se mueve a diario.
    ok(Number(det?.precioBaseKgSnapshot) === 1, `y el precio por kilo del día (${Number(det?.precioBaseKgSnapshot)})`);
    ok(det?.monedaBaseSnapshot === 'PEN', `y en qué moneda estaba (${det?.monedaBaseSnapshot})`);
    ok(
      det?.tipoCambioAplicado === null,
      'sin conversión, el TC queda en NULL — que no es lo mismo que un TC de 1',
    );
    // La cuenta entera se puede rehacer desde lo guardado.
    ok(
      Number(det?.pesoKgSnapshot) * Number(det?.precioBaseKgSnapshot) * Number(det?.factorAplicado) === 20,
      'y los tres juntos rehacen el precio: 10 × 1 × 2 = 20',
    );

    // ── 6-bis. El TC cuando SÍ hubo conversión ──────────────────────────────
    // El caso real de Kaiser: precio por kilo en dólares, cotización en soles.
    // `Comprobante.tipoCambio` se guarda como 1 porque el documento es PEN, así
    // que si la línea no guarda el TC, no queda en ninguna parte.
    console.log('\n6-bis) El tipo de cambio aplicado queda guardado');
    await prisma.empresa.update({ where: { id: empresaId }, data: { precioBaseKgMoneda: 'USD' } });
    const cotTc = await cotizacionDePrueba();
    const rTc = await api(`/comprobante/${cotTc}`, {
      token, method: 'PATCH',
      body: JSON.stringify(cuerpoCotiz({
        detalles: [{ productoId: modulo.id, cantidad: 1, nuevoValorUnitario: 75, factor: 2, tipoCambioAplicado: 3.75 }],
      })),
    });
    ok(rTc.status < 400, `se guarda (HTTP ${rTc.status})`);
    const detTc = await prisma.detalleComprobante.findFirst({
      where: { comprobanteId: cotTc },
      select: { precioBaseKgSnapshot: true, monedaBaseSnapshot: true, tipoCambioAplicado: true },
    });
    ok(detTc?.monedaBaseSnapshot === 'USD', `guarda que el kilo estaba en dólares (${detTc?.monedaBaseSnapshot})`);
    ok(Number(detTc?.tipoCambioAplicado) === 3.75, `y el tipo de cambio con el que se convirtió (${Number(detTc?.tipoCambioAplicado)})`);
    const comprob = await prisma.comprobante.findUnique({ where: { id: cotTc }, select: { tipoCambio: true } });
    ok(
      Number(comprob?.tipoCambio ?? 1) === 1 && Number(detTc?.tipoCambioAplicado) === 3.75,
      'y lo guarda la LÍNEA, porque el comprobante en soles lleva tipoCambio = 1',
    );
    // Editar no se lo come: actualizarCotizacion borra los detalles y los recrea.
    await api(`/comprobante/${cotTc}`, {
      token, method: 'PATCH',
      body: JSON.stringify(cuerpoCotiz({
        detalles: [{ productoId: modulo.id, cantidad: 1, nuevoValorUnitario: 75, factor: 2, tipoCambioAplicado: 3.75 }],
        observaciones: 'editada',
      })),
    });
    const detTc2 = await prisma.detalleComprobante.findFirst({
      where: { comprobanteId: cotTc },
      select: { precioBaseKgSnapshot: true, monedaBaseSnapshot: true, tipoCambioAplicado: true },
    });
    ok(
      Number(detTc2?.tipoCambioAplicado) === 3.75 && detTc2?.monedaBaseSnapshot === 'USD' &&
        Number(detTc2?.precioBaseKgSnapshot) === 1,
      'y editar la cotización no se los come',
    );
    await prisma.empresa.update({ where: { id: empresaId }, data: { precioBaseKgMoneda: 'PEN' } });

    // El peso lo calcula el SERVIDOR: mandarlo desde el cliente no lo cambia.
    const falsoId = await cotizacionDePrueba();
    await api(`/comprobante/${falsoId}`, {
      token, method: 'PATCH',
      body: JSON.stringify(cuerpoCotiz({
        detalles: [{ productoId: modulo.id, cantidad: 1, nuevoValorUnitario: 24, factor: 2, pesoKgSnapshot: 999 }],
      })),
    });
    const detFalso = await prisma.detalleComprobante.findFirst({
      where: { comprobanteId: falsoId },
      select: { pesoKgSnapshot: true },
    });
    ok(
      Number(detFalso?.pesoKgSnapshot) === 10,
      `un peso mandado desde el cliente se ignora: sigue siendo 10 (${Number(detFalso?.pesoKgSnapshot)})`,
    );

    // ── 7. El factor bajo mínimo ────────────────────────────────────────────
    console.log('\n7) Un factor por debajo del mínimo hay que autorizarlo');
    const bajoId = await cotizacionDePrueba();
    const bajo = await api(`/comprobante/${bajoId}`, {
      token, method: 'PATCH',
      body: JSON.stringify(cuerpoCotiz({
        detalles: [{ productoId: modulo.id, cantidad: 1, nuevoValorUnitario: 12, factor: 1.2 }],
      })),
    });
    ok(bajo.status === 400, `se rechaza sin autorización (HTTP ${bajo.status})`);
    ok(
      String(bajo.body?.message ?? '').includes('1.5'),
      `y el mensaje dice cuál es el mínimo: ${String(bajo.body?.message ?? '').slice(0, 70)}`,
    );

    const autorizado = await api(`/comprobante/${bajoId}`, {
      token, method: 'PATCH',
      body: JSON.stringify(cuerpoCotiz({
        detalles: [{ productoId: modulo.id, cantidad: 1, nuevoValorUnitario: 12, factor: 1.2 }],
        autorizarFactorBajoMinimo: true,
      })),
    });
    ok(autorizado.status < 400, `gerencia sí puede autorizarlo (HTTP ${autorizado.status})`);

    // Un vendedor no, aunque marque la casilla.
    const cotVendedor = await api(`/comprobante/${bajoId}`, {
      token: tokenVentas, method: 'PATCH',
      body: JSON.stringify(cuerpoCotiz({
        detalles: [{ productoId: modulo.id, cantidad: 1, nuevoValorUnitario: 12, factor: 1.2 }],
        autorizarFactorBajoMinimo: true,
      })),
    });
    ok(cotVendedor.status === 400, `un vendedor no puede autorizarse a sí mismo (HTTP ${cotVendedor.status})`);

    // ── 8. Los textos variables de la cotización ────────────────────────────
    console.log('\n8) Las notas de la cotización se guardan y sobreviven a la edición');
    const notasId = await cotizacionDePrueba();
    const notas = {
      capacidadTotal: '20 160 aves',
      incluye: 'Bebederos y comederos',
      plazos: '15 días hábiles',
      observaciones: '',
    };
    const conNotas = await api(`/comprobante/${notasId}`, {
      token, method: 'PATCH', body: JSON.stringify(cuerpoCotiz({ cotizNotas: notas })),
    });
    ok(conNotas.status < 400, `se guardan (HTTP ${conNotas.status})`);
    const guardada = await prisma.comprobante.findUnique({
      where: { id: notasId }, select: { cotizNotas: true },
    });
    ok(guardada?.cotizNotas?.capacidadTotal === '20 160 aves', 'con su texto');
    ok(guardada?.cotizNotas?.plazos === '15 días hábiles', 'y los demás campos');

    // Editar sin mandarlas NO las borra: `undefined` = no tocar, igual que la
    // moneda. Si no, cualquier edición desde otra pantalla las perdería.
    await api(`/comprobante/${notasId}`, {
      token, method: 'PATCH', body: JSON.stringify(cuerpoCotiz()),
    });
    const trasEditar = await prisma.comprobante.findUnique({
      where: { id: notasId }, select: { cotizNotas: true },
    });
    ok(
      trasEditar?.cotizNotas?.capacidadTotal === '20 160 aves',
      'y editar sin mandarlas no las borra',
    );

    // ── 9. El cotizador encuentra los módulos ───────────────────────────────
    // El modal de "Cotizar módulo" lista SOLO los productos marcados: sin el
    // filtro tendría que traerse los 419 del catálogo y filtrar en el
    // navegador.
    console.log('\n9) El listado sabe filtrar por módulo');
    const soloModulos = await api('/productos?esModulo=true&limit=100', { token });
    ok(soloModulos.status < 400, `responde (HTTP ${soloModulos.status})`);
    const lista = soloModulos.data?.productos ?? [];
    ok(lista.length > 0, `devuelve al menos el de prueba (${lista.length})`);
    ok(
      lista.every((p) => p.esModulo === true),
      'y SOLO módulos: ninguno sin marcar se cuela',
    );
    ok(
      lista.some((p) => p.id === modulo.id),
      'el módulo de prueba está entre ellos',
    );
    const todos = await api('/productos?limit=5', { token });
    ok(
      (todos.data?.productos ?? []).length > 0,
      'y sin el filtro el listado sigue trayendo de todo',
    );

    // ── 10. Aves → módulos ──────────────────────────────────────────────────
    console.log('\n10) La capacidad en aves viaja con el producto');
    const prod = await prisma.producto.findUnique({
      where: { id: modulo.id }, select: { capacidadAves: true, esModulo: true },
    });
    ok(prod?.esModulo === true, 'el producto queda marcado como módulo');
    ok(prod?.capacidadAves === 168, `con su capacidad en aves (${prod?.capacidadAves})`);
  } finally {
    console.log('\n11) Limpieza');
    await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        precioBaseKg: previo?.precioBaseKg ?? null,
        precioBaseKgMoneda: previo?.precioBaseKgMoneda ?? 'PEN',
        factorPrecioDefault: previo?.factorPrecioDefault ?? null,
        factorPrecioMinimo: previo?.factorPrecioMinimo ?? null,
      },
    });
    for (const id of creado.comprobantes) {
      await prisma.seguimientoCotizacion.deleteMany({ where: { comprobanteId: id } });
      await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: id } });
      await prisma.movimientoKardex.deleteMany({ where: { comprobanteId: id } });
      await prisma.leyenda.deleteMany({ where: { comprobanteId: id } }).catch(() => {});
      await prisma.pago.deleteMany({ where: { comprobanteId: id } }).catch(() => {});
      await prisma.comprobante.deleteMany({ where: { id } });
    }
    for (const id of creado.recetas) {
      await prisma.recetaComponente.deleteMany({ where: { recetaId: id } });
      await prisma.recetaProduccion.deleteMany({ where: { id } });
    }
    const mios = await prisma.producto.findMany({ where: { codigo: { startsWith: marca } }, select: { id: true } });
    for (const { id } of mios) {
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.updateMany({ where: { productoAdicionalPorFilaId: id }, data: { productoAdicionalPorFilaId: null } });
      await prisma.producto.deleteMany({ where: { id } });
    }
    ok((await prisma.producto.count({ where: { codigo: { startsWith: marca } } })) === 0, 'los productos de prueba eliminados');
    const emp = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { precioBaseKg: true, precioBaseKgMoneda: true } });
    ok(
      String(emp?.precioBaseKg ?? null) === String(previo?.precioBaseKg ?? null) &&
        String(emp?.precioBaseKgMoneda) === String(previo?.precioBaseKgMoneda ?? 'PEN'),
      'y la configuración de precio de la empresa, restaurada (importe y moneda)',
    );
  }

  console.log(fallos === 0 ? '\n✔ Precio del módulo: todo correcto' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error('\n✘', e.message); await prisma.$disconnect(); process.exit(1); });
