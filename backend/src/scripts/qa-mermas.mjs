/**
 * QA funcional · Almacén de mermas, merma reutilizable y sobrante
 *
 * Lo que pidió planta el 7-oct, con sus palabras: «al finalizar la producción
 * quieren saber si hay merma o no; si hay merma, que haya un almacén de mermas;
 * y en esa merma tiene que verse si hay artículos reutilizables o no».
 *
 * La invariante que guía todo: NO INVENTAR EXISTENCIAS. La salida de kardex de
 * una orden es `consumido + merma`, no lo teórico, así que lo que no se llegó a
 * usar nunca salió del almacén. Por eso el sobrante se REGISTRA pero no genera
 * movimiento de inventario: ingresarlo duplicaría mercadería que ya estaba.
 * El retazo sí entra, porque la merma sí salió: es una transformación.
 *
 * Todo por la API real (no escribiendo filas), con sus propios productos, su
 * propia sede de mermas y su propia receta. Lo borra todo al terminar.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const r3 = (n) => Math.round(Number(n) * 1000) / 1000;

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
  if (r.status >= 400 || !r.data) throw new Error(`login falló (HTTP ${r.status}): ${r.body?.message ?? ''}`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const sel = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  if (sel.status >= 400 || !sel.data?.accessToken) throw new Error(`select-sede falló (HTTP ${sel.status})`);
  return sel.data.accessToken;
}
const stockEn = async (productoId, sedeId) => {
  const ps = await prisma.productoStock.findFirst({ where: { productoId, sedeId }, select: { stock: true } });
  return ps ? Number(ps.stock) : 0;
};

async function main() {
  const token = await login();
  const marca = `QAM${Date.now().toString().slice(-8)}`;
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true, tipoAfectacionIGV: true, moneda: true } });
  const empresaId = ref.empresaId;
  const creado = { productos: [], recetas: [], ordenes: [], sedes: [] };
  const recuperacionOriginal = (await prisma.empresa.findUnique({ where: { id: empresaId }, select: { mermaPorcentajeRecuperacion: true } }))?.mermaPorcentajeRecuperacion ?? 0;

  const nuevoProducto = async (sufijo, { stock: st = 0, costo = 0 } = {}) => {
    const p = await prisma.producto.create({
      data: {
        codigo: `${marca}${sufijo}`, descripcion: `[QA-MERMA] ${sufijo}`,
        precioUnitario: 1, valorUnitario: 1, stock: st, costoPromedio: costo,
        empresaId, unidadMedidaId: ref.unidadMedidaId,
        tipoAfectacionIGV: ref.tipoAfectacionIGV, moneda: ref.moneda ?? 'PEN',
      },
      select: { id: true, codigo: true },
    });
    if (st > 0) await prisma.productoStock.create({ data: { productoId: p.id, sedeId: SEDE, stock: st } });
    creado.productos.push(p.id);
    return p;
  };

  /** Ejecuta una orden por la API con los repartos de merma indicados. */
  const ejecutar = async (ordenId, cuerpo) =>
    api(`/produccion/ordenes/${ordenId}/ejecutar`, { token, method: 'POST', body: JSON.stringify(cuerpo) });

  const crearOrdenYEjecutar = async (insumoId, finalId, reparto) => {
    const o = await api('/produccion/ordenes', {
      token, method: 'POST',
      body: JSON.stringify({ productoFinalId: finalId, loteProduccion: `${marca}-L${creado.ordenes.length + 1}`, cantidadObjetivo: 1,
        componentes: [{ productoInsumoId: insumoId, cantidadTeorica: 110, unidad: 'UND' }] }),
    });
    if (!o.data?.id) throw new Error(`no se pudo crear la orden (HTTP ${o.status}): ${o.body?.message ?? ''}`);
    creado.ordenes.push(o.data.id);
    const res = await ejecutar(o.data.id, { cantidadProducida: 1, componentes: [{ productoInsumoId: insumoId, ...reparto }] });
    return { ordenId: o.data.id, res };
  };

  try {
    console.log('\n♻️  QA · Almacén de mermas, retazo y sobrante\n');

    // ── 1. Sin almacén de mermas, la orden NO puede fallar ───────────────────
    console.log('1) Sin almacén de mermas configurado');
    const insumoA = await nuevoProducto('INA', { stock: 500, costo: 10 });
    const finalA = await nuevoProducto('FINA');
    const sinAlmacen = await crearOrdenYEjecutar(insumoA.id, finalA.id, { cantidadConsumida: 100, mermaCantidad: 3, mermaReutilizableCantidad: 2, sobranteCantidad: 1 });
    ok(sinAlmacen.res.status < 400, `la orden se cierra igual sin almacén de mermas (HTTP ${sinAlmacen.res.status})`);
    ok(Array.isArray(sinAlmacen.res.data?.avisos) && sinAlmacen.res.data.avisos.length > 0, 'y deja un aviso en vez de callarlo');
    ok(r3(await stockEn(insumoA.id, SEDE)) === r3(500 - 103), `salió consumido + merma = 103, no lo teórico (quedan ${await stockEn(insumoA.id, SEDE)})`);

    // ── 2. El sobrante NO inventa existencias ────────────────────────────────
    console.log('\n2) El sobrante se registra pero no toca el inventario');
    const compA = await prisma.ordenProduccionComponente.findFirst({ where: { ordenProduccionId: sinAlmacen.ordenId }, select: { sobranteCantidad: true, mermaReutilizableCantidad: true } });
    ok(Number(compA?.sobranteCantidad) === 1, `el sobrante queda guardado (${Number(compA?.sobranteCantidad)})`);
    ok(Number(compA?.mermaReutilizableCantidad) === 2, `la merma reutilizable queda guardada (${Number(compA?.mermaReutilizableCantidad)})`);
    const movSobrante = await prisma.movimientoProduccion.findFirst({ where: { ordenProduccionId: sinAlmacen.ordenId, tipoMovimiento: 'DEVOLUCION_SOBRANTE' } });
    ok(!!movSobrante, 'hay movimiento de producción del sobrante (para la liquidación)');
    ok(movSobrante?.movimientoKardexId == null, 'pero SIN movimiento de kardex: lo que no se usó nunca salió del almacén');
    const ingresosInsumo = await prisma.movimientoKardex.count({ where: { productoId: insumoA.id, tipoMovimiento: 'INGRESO' } });
    ok(ingresosInsumo === 0, `el insumo no recibió ningún ingreso fantasma (${ingresosInsumo})`);

    // ── 3. Con almacén de mermas: el retazo entra ────────────────────────────
    console.log('\n3) Con almacén de mermas: el retazo entra como producto propio');
    const sedeMerma = await prisma.sede.create({ data: { empresaId, nombre: `[QA] Mermas ${marca}`, tipo: 'ALMACEN_MERMA', activo: true } });
    creado.sedes.push(sedeMerma.id);
    const insumoB = await nuevoProducto('INB', { stock: 500, costo: 10 });
    const finalB = await nuevoProducto('FINB');
    const conAlmacen = await crearOrdenYEjecutar(insumoB.id, finalB.id, { cantidadConsumida: 100, mermaCantidad: 3, mermaReutilizableCantidad: 2, sobranteCantidad: 1 });
    ok(conAlmacen.res.status < 400, `la orden se ejecuta (HTTP ${conAlmacen.res.status})`);
    ok(!conAlmacen.res.data?.avisos, 'y ya no hay aviso');

    const retazo = await prisma.producto.findFirst({ where: { empresaId, esRetazo: true, productoOrigenId: insumoB.id, codigo: { endsWith: '-RET' } }, select: { id: true, codigo: true, costoPromedio: true, precioUnitario: true } });
    if (retazo) creado.productos.push(retazo.id);
    ok(!!retazo, 'se creó el producto retazo');
    ok(retazo?.codigo === `${insumoB.codigo}-RET`, `con código propio, no el del insumo (${retazo?.codigo})`);
    ok(Number(retazo?.precioUnitario) === 0, 'y sin precio de venta: un retazo no se vende por catálogo');
    ok(r3(await stockEn(retazo.id, sedeMerma.id)) === 2, `los 2 kg de retazo entraron al almacén de mermas (${await stockEn(retazo.id, sedeMerma.id)})`);
    const descarte = await prisma.producto.findFirst({ where: { empresaId, esRetazo: true, productoOrigenId: insumoB.id, codigo: { endsWith: '-DESC' } }, select: { id: true, codigo: true, costoPromedio: true } });
    if (descarte) creado.productos.push(descarte.id);
    ok(!!descarte, 'el descarte tiene su PROPIO producto, no mezclado con el retazo');
    ok(r3(await stockEn(descarte?.id ?? 0, sedeMerma.id)) === 1, `con su 1 kg aparte (${await stockEn(descarte?.id ?? 0, sedeMerma.id)})`);
    ok(Number(descarte?.costoPromedio) === 0, 'y a costo cero: mezclarlo con el retazo abarataría el retazo y mentiría');
    ok(r3(await stockEn(retazo.id, SEDE)) === 0, 'y NO al almacén de origen');

    const movReu = await prisma.movimientoProduccion.findFirst({ where: { ordenProduccionId: conAlmacen.ordenId, tipoMovimiento: 'INGRESO_MERMA_REUTILIZABLE' } });
    const movDes = await prisma.movimientoProduccion.findFirst({ where: { ordenProduccionId: conAlmacen.ordenId, tipoMovimiento: 'INGRESO_MERMA_DESCARTE' } });
    ok(Number(movReu?.cantidad) === 2, `2 de retazo aprovechable (${Number(movReu?.cantidad)})`);
    ok(Number(movDes?.cantidad) === 1, `1 de descarte (${Number(movDes?.cantidad)})`);
    ok(Number(movDes?.costoTotal) === 0, 'el descarte entra a costo cero: su valor ya está en el producto terminado');

    // ── 4. Con recuperación 0 el costo es el de siempre ──────────────────────
    console.log('\n4) El porcentaje de recuperación');
    const ordenB = await prisma.ordenProduccion.findUnique({ where: { id: conAlmacen.ordenId }, select: { costoMerma: true, costoProduccion: true, costoConsumo: true } });
    ok(Number(ordenB.costoConsumo) === 1000, `consumo 100 × 10 = 1000 (${Number(ordenB.costoConsumo)})`);
    ok(Number(ordenB.costoMerma) === 30, `con recuperación 0 la merma entera se capitaliza: 3 × 10 = 30 (${Number(ordenB.costoMerma)})`);
    ok(Number(retazo?.costoPromedio) === 0, 'y el retazo nace sin costo, como todo hoy');

    await prisma.empresa.update({ where: { id: empresaId }, data: { mermaPorcentajeRecuperacion: 0.5 } });
    const insumoC = await nuevoProducto('INC', { stock: 500, costo: 10 });
    const finalC = await nuevoProducto('FINC');
    const con50 = await crearOrdenYEjecutar(insumoC.id, finalC.id, { cantidadConsumida: 100, mermaCantidad: 3, mermaReutilizableCantidad: 2 });
    ok(con50.res.status < 400, `la orden con 50 % se ejecuta (HTTP ${con50.res.status})`);
    const ordenC = await prisma.ordenProduccion.findUnique({ where: { id: con50.ordenId }, select: { costoMerma: true } });
    // 3×10 = 30 de merma, menos 2×10×0.5 = 10 que se va con el retazo → 20.
    ok(Number(ordenC.costoMerma) === 20, `con 50 % el producto terminado carga menos merma: 30 − 10 = 20 (${Number(ordenC.costoMerma)})`);
    const retazoC = await prisma.producto.findFirst({ where: { empresaId, esRetazo: true, productoOrigenId: insumoC.id, codigo: { endsWith: '-RET' } }, select: { id: true, costoPromedio: true } });
    if (retazoC) creado.productos.push(retazoC.id);
    ok(Number(retazoC?.costoPromedio) === 5, `y el retazo se lleva la mitad del costo del insumo (${Number(retazoC?.costoPromedio)})`);

    // ── 5. La liquidación lo cuenta ──────────────────────────────────────────
    console.log('\n5) La liquidación distingue las tres cosas');
    const liq = await api(`/produccion/ordenes/${conAlmacen.ordenId}/resumen-materiales`, { token });
    const fila = liq.data?.componentes?.[0];
    ok(liq.status < 400, `la liquidación responde (HTTP ${liq.status})`);
    ok(Number(fila?.mermaReutilizable) === 2, `separa el retazo (${Number(fila?.mermaReutilizable)})`);
    ok(Number(fila?.mermaDescarte) === 1, `del descarte (${Number(fila?.mermaDescarte)})`);
    ok(Number(fila?.sobranteRegistrado) === 1, `y el sobrante que planta pesó (${Number(fila?.sobranteRegistrado)})`);
    ok(Number(liq.data?.totales?.mermaReutilizable) === 2, 'y lo totaliza');

    // ── 6. La pantalla de Mermas ─────────────────────────────────────────────
    // Lo segundo que pidió planta: poder MIRAR el almacén de mermas sin
    // recorrer orden por orden. Dos filas por insumo —retazo y descarte— y de
    // qué insumo salió cada una, que es la pregunta de almacén.
    console.log('\n6) La lista del almacén de mermas');
    const lista = await api(`/produccion/mermas?insumoId=${insumoB.id}`, { token });
    ok(lista.status < 400, `la lista responde (HTTP ${lista.status})`);
    const filas = lista.data?.movimientos ?? [];
    const filaReu = filas.find((m) => m.tipo === 'REUTILIZABLE');
    const filaDes = filas.find((m) => m.tipo === 'DESCARTE');
    ok(filas.length === 2, `dos líneas para el mismo insumo, no una (${filas.length})`);
    ok(Number(filaReu?.cantidad) === 2, `el retazo con sus 2 (${Number(filaReu?.cantidad)})`);
    ok(Number(filaDes?.cantidad) === 1, `y el descarte con su 1 (${Number(filaDes?.cantidad)})`);
    ok(Number(filaDes?.costoTotal) === 0, 'el descarte vale 0: su valor ya está en el producto terminado');
    ok(filaReu?.insumoOrigen?.id === insumoB.id, `dice de qué insumo salió (${filaReu?.insumoOrigen?.codigo})`);
    ok(filaReu?.producto?.codigo === `${insumoB.codigo}-RET`, 'y con qué código entró');
    ok(filaReu?.sede?.id === sedeMerma.id, 'en el almacén de mermas, no en el de origen');
    ok(filaReu?.orden?.lote?.length > 0, `con la orden que la generó (${filaReu?.orden?.lote})`);
    ok(Number(lista.data?.totales?.cantidadReutilizable) === 2, 'totaliza el retazo');
    ok(Number(lista.data?.totales?.cantidadDescarte) === 1, 'y el descarte aparte');
    ok(
      Number(lista.data?.totales?.valorRecuperado) === Number(filaReu?.costoTotal),
      'y el valor recuperado es SOLO el del retazo',
    );
    const soloReu = await api(`/produccion/mermas?insumoId=${insumoB.id}&tipo=REUTILIZABLE`, { token });
    ok(
      (soloReu.data?.movimientos ?? []).every((m) => m.tipo === 'REUTILIZABLE'),
      'el filtro por tipo deja solo lo reutilizable',
    );
    // Almacén es quien pesa el retazo y lo vende como chatarra: negarle la
    // lista haría inútil el almacén de mermas. Mismo criterio que la genealogía.
    const tokenAlmacen = await login('almacen@kaisercorp.com.pe');
    const comoAlmacen = await api('/produccion/mermas?limit=1', { token: tokenAlmacen });
    ok(comoAlmacen.status < 400, `almacén puede leerla (HTTP ${comoAlmacen.status})`);

    // ── 7. Lo que no se puede hacer ──────────────────────────────────────────
    console.log('\n7) Lo que el sistema no deja');
    const insumoD = await nuevoProducto('IND', { stock: 500, costo: 10 });
    const finalD = await nuevoProducto('FIND');
    const mala = await crearOrdenYEjecutar(insumoD.id, finalD.id, { cantidadConsumida: 100, mermaCantidad: 2, mermaReutilizableCantidad: 5 });
    ok(mala.res.status === 400, `el retazo no puede superar a la merma total (HTTP ${mala.res.status})`);
    const negativa = await ejecutar(creado.ordenes.at(-1), { cantidadProducida: 1, componentes: [{ productoInsumoId: insumoD.id, cantidadConsumida: 10, sobranteCantidad: -3 }] });
    ok(negativa.status === 400, `un sobrante negativo se rechaza (HTTP ${negativa.status})`);

    // ── 8. El almacén de mermas no se puede vender ───────────────────────────
    console.log('\n8) El almacén de mermas no entra en lo vendible');
    const todas = await api('/sede', { token });
    const sinMerma = await api('/sede?excluirMerma=true', { token });
    const idsTodas = (todas.data ?? []).map((s) => s.id);
    const idsSin = (sinMerma.data ?? []).map((s) => s.id);
    ok(idsTodas.includes(sedeMerma.id), 'el inventario SÍ ve el almacén de mermas');
    ok(!idsSin.includes(sedeMerma.id), 'pero los selectores de venta y despacho no');
  } finally {
    console.log('\n9) Limpieza');
    await prisma.empresa.update({ where: { id: empresaId }, data: { mermaPorcentajeRecuperacion: recuperacionOriginal } });
    for (const id of creado.ordenes) {
      await prisma.movimientoProduccion.deleteMany({ where: { ordenProduccionId: id } });
      await prisma.ordenProduccionComponente.deleteMany({ where: { ordenProduccionId: id } });
      await prisma.ordenProduccion.deleteMany({ where: { id } });
    }
    for (const id of creado.recetas) {
      await prisma.recetaComponente.deleteMany({ where: { recetaId: id } });
      await prisma.recetaProduccion.deleteMany({ where: { id } });
    }
    for (const id of creado.productos) {
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.updateMany({ where: { id }, data: { productoOrigenId: null } });
    }
    // Barrido por prefijo: los productos de retazo y descarte los crea el
    // servicio, no el test, así que no todos están en la lista.
    const delMarca = await prisma.producto.findMany({ where: { codigo: { startsWith: marca } }, select: { id: true } });
    for (const { id } of delMarca) {
      await prisma.movimientoProduccion.deleteMany({ where: { productoId: id } });
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.updateMany({ where: { id }, data: { productoOrigenId: null } });
    }
    for (const { id } of delMarca) await prisma.producto.deleteMany({ where: { id } });
    for (const id of creado.sedes) await prisma.sede.deleteMany({ where: { id } });
    const quedan = await prisma.producto.count({ where: { codigo: { startsWith: marca } } });
    ok(quedan === 0, `los productos de prueba eliminados (quedan ${quedan})`);
    ok((await prisma.sede.count({ where: { nombre: { contains: marca } } })) === 0, 'la sede de mermas de prueba eliminada');
    await prisma.$disconnect();
  }

  console.log(fallos === 0 ? `\n✔ Mermas: ${fallos === 0 ? 'todo correcto' : ''}` : `\n✘ ${fallos} comprobaciones fallidas`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
