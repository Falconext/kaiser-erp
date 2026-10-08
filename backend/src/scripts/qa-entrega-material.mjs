/**
 * QA funcional · La entrega de material a planta
 *
 * La pieza que faltaba para que el sobrante pueda volver al almacén.
 *
 * Hasta ahora la única salida de inventario de una orden ocurría al CERRARLA,
 * y era `consumido + merma`. Lo que planta no llegaba a usar nunca había
 * salido, así que «devolverlo» habría inventado existencias que ya estaban:
 * por eso el sobrante quedaba en un apunte sin kardex detrás.
 *
 * Con la entrega, lo que sale es lo que almacén saca —«ya está la orden, por
 * favor entregar los 180 kilos»— y al cerrar solo se mueve la diferencia.
 *
 * Lo que más importa de aquí es la ÚLTIMA sección: una orden que no usa la
 * entrega tiene que comportarse exactamente como antes. Son todas las que ya
 * existen.
 *
 * Todo por la API real, con sus propios productos y su propia orden. Lo borra
 * todo al terminar.
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
  if (r.status >= 400 || !r.data) throw new Error(`login falló (HTTP ${r.status})`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const sel = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  return sel.data.accessToken;
}
const stockEn = async (productoId, sedeId) => {
  const ps = await prisma.productoStock.findFirst({ where: { productoId, sedeId }, select: { stock: true } });
  return ps ? Number(ps.stock) : 0;
};

async function main() {
  const token = await login();
  const marca = `QAE${Date.now().toString().slice(-8)}`;
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true, tipoAfectacionIGV: true, moneda: true } });
  const empresaId = ref.empresaId;
  const creado = { ordenes: [] };

  const nuevoProducto = async (sufijo, { stock = 0, costo = 0 } = {}) => {
    const p = await prisma.producto.create({
      data: {
        codigo: `${marca}${sufijo}`, descripcion: `[QA-ENTREGA] ${sufijo}`,
        precioUnitario: 1, valorUnitario: 1, stock, costoPromedio: costo,
        empresaId, unidadMedidaId: ref.unidadMedidaId,
        tipoAfectacionIGV: ref.tipoAfectacionIGV, moneda: ref.moneda,
      },
      select: { id: true, codigo: true },
    });
    if (stock) await prisma.productoStock.create({ data: { productoId: p.id, sedeId: SEDE, stock } });
    return p;
  };
  const crearOrden = async (insumoId, finalId, lote, teorica) => {
    const r = await api('/produccion/ordenes', {
      token, method: 'POST',
      body: JSON.stringify({
        productoFinalId: finalId, loteProduccion: lote, cantidadObjetivo: 1,
        componentes: [{ productoInsumoId: insumoId, cantidadTeorica: teorica, unidad: 'UND' }],
      }),
    });
    if (r.data?.id) creado.ordenes.push(r.data.id);
    return r;
  };
  const entregar = (ordenId, insumoId, cantidad) =>
    api(`/produccion/ordenes/${ordenId}/entregar`, {
      token, method: 'POST',
      body: JSON.stringify({ componentes: [{ productoInsumoId: insumoId, cantidad }] }),
    });
  const ejecutar = (ordenId, insumoId, { consumida, merma = 0, sobrante = 0 }) =>
    api(`/produccion/ordenes/${ordenId}/ejecutar`, {
      token, method: 'POST',
      body: JSON.stringify({
        cantidadProducida: 1,
        componentes: [{ productoInsumoId: insumoId, cantidadConsumida: consumida, mermaCantidad: merma, sobranteCantidad: sobrante }],
      }),
    });

  try {
    console.log('\n📦 QA · La entrega de material a planta\n');

    // ── 1. Entregar saca del almacén ────────────────────────────────────────
    console.log('1) Entregar es la salida de verdad del almacén');
    const insA = await nuevoProducto('INA', { stock: 500, costo: 10 });
    const finA = await nuevoProducto('FIA');
    const oA = await crearOrden(insA.id, finA.id, `${marca}-L1`, 100);
    ok(oA.status < 400, `la orden se crea (HTTP ${oA.status})`);
    ok(oA.data?.estado === 'PLANIFICADA', `nace PLANIFICADA (${oA.data?.estado})`);

    const antes = await stockEn(insA.id, SEDE);
    const ent = await entregar(oA.data.id, insA.id, 180);
    ok(ent.status < 400, `se entregan 180 (HTTP ${ent.status})`);
    ok(r3(antes - (await stockEn(insA.id, SEDE))) === 180, `salieron del almacén ahí mismo (${r3(antes - (await stockEn(insA.id, SEDE)))})`);
    ok(ent.data?.estado === 'EN_PROCESO', `y la orden pasa a EN_PROCESO sola (${ent.data?.estado})`);

    const compA = await prisma.ordenProduccionComponente.findFirst({ where: { ordenProduccionId: oA.data.id } });
    ok(Number(compA?.entregadoCantidad) === 180, `queda anotado cuánto se entregó (${Number(compA?.entregadoCantidad)})`);
    const movEnt = await prisma.movimientoProduccion.findFirst({
      where: { ordenProduccionId: oA.data.id, tipoMovimiento: 'ENTREGA_MATERIAL' },
    });
    ok(!!movEnt, 'con su movimiento de producción');
    ok(movEnt?.movimientoKardexId != null, 'y su apunte de kardex detrás: esto SÍ movió inventario');

    // Se puede entregar otra vez: en una tanda larga planta vuelve a pedir.
    const ent2 = await entregar(oA.data.id, insA.id, 20);
    ok(ent2.status < 400, `se puede entregar otra vez (HTTP ${ent2.status})`);
    const compA2 = await prisma.ordenProduccionComponente.findFirst({ where: { ordenProduccionId: oA.data.id } });
    ok(Number(compA2?.entregadoCantidad) === 200, `y se acumula: 180 + 20 = 200 (${Number(compA2?.entregadoCantidad)})`);

    // ── 2. Al cerrar, el sobrante VUELVE ────────────────────────────────────
    console.log('\n2) Lo entregado y no usado vuelve al almacén');
    const antesCierre = await stockEn(insA.id, SEDE);
    const ejeA = await ejecutar(oA.data.id, insA.id, { consumida: 150, merma: 10 });
    ok(ejeA.status < 400, `la orden se ejecuta: consumió 150 y mermó 10 (HTTP ${ejeA.status})`);
    const despuesCierre = await stockEn(insA.id, SEDE);
    // Entregados 200, usados 160 → vuelven 40. Y NO sale nada más: lo usado ya
    // había salido en la entrega.
    ok(r3(despuesCierre - antesCierre) === 40, `vuelven 40 al almacén (${r3(despuesCierre - antesCierre)})`);
    ok(r3(despuesCierre) === r3(500 - 160), `el neto cuadra con lo usado: 500 − 160 (${r3(despuesCierre)})`);

    const movDev = await prisma.movimientoProduccion.findFirst({
      where: { ordenProduccionId: oA.data.id, tipoMovimiento: 'DEVOLUCION_SOBRANTE' },
    });
    ok(Number(movDev?.cantidad) === 40, `la devolución queda registrada (${Number(movDev?.cantidad)})`);
    ok(movDev?.movimientoKardexId != null, 'y AHORA SÍ con kardex detrás — que era lo que faltaba');
    const compCerrado = await prisma.ordenProduccionComponente.findFirst({ where: { ordenProduccionId: oA.data.id } });
    ok(Number(compCerrado?.sobranteCantidad) === 40, `el sobrante guardado es el que volvió, no uno declarado (${Number(compCerrado?.sobranteCantidad)})`);

    // ── 3. Si planta pidió de menos, sale la diferencia ─────────────────────
    console.log('\n3) Si se usó más de lo entregado, sale la diferencia');
    const insB = await nuevoProducto('INB', { stock: 500, costo: 10 });
    const finB = await nuevoProducto('FIB');
    const oB = await crearOrden(insB.id, finB.id, `${marca}-L2`, 100);
    await entregar(oB.data.id, insB.id, 100);
    const antesB = await stockEn(insB.id, SEDE);
    const ejeB = await ejecutar(oB.data.id, insB.id, { consumida: 120, merma: 5 });
    ok(ejeB.status < 400, `se ejecuta con 125 usados contra 100 entregados (HTTP ${ejeB.status})`);
    ok(r3(antesB - (await stockEn(insB.id, SEDE))) === 25, `salen los 25 que faltaban (${r3(antesB - (await stockEn(insB.id, SEDE)))})`);
    ok(r3(await stockEn(insB.id, SEDE)) === r3(500 - 125), `y el neto es lo usado: 500 − 125 (${r3(await stockEn(insB.id, SEDE))})`);
    const devB = await prisma.movimientoProduccion.count({
      where: { ordenProduccionId: oB.data.id, tipoMovimiento: 'DEVOLUCION_SOBRANTE' },
    });
    ok(devB === 0, 'y no hay devolución que registrar');

    // ── 4. Sin entrega, todo como antes ─────────────────────────────────────
    // Esto es lo que protege a las órdenes que ya existen.
    console.log('\n4) Una orden SIN entrega se comporta exactamente como antes');
    const insC = await nuevoProducto('INC', { stock: 500, costo: 10 });
    const finC = await nuevoProducto('FIC');
    const oC = await crearOrden(insC.id, finC.id, `${marca}-L3`, 100);
    const antesC = await stockEn(insC.id, SEDE);
    const ejeC = await ejecutar(oC.data.id, insC.id, { consumida: 80, merma: 5, sobrante: 15 });
    ok(ejeC.status < 400, `se ejecuta (HTTP ${ejeC.status})`);
    ok(r3(antesC - (await stockEn(insC.id, SEDE))) === 85, `sale consumido + merma = 85, como siempre (${r3(antesC - (await stockEn(insC.id, SEDE)))})`);
    const devC = await prisma.movimientoProduccion.findFirst({
      where: { ordenProduccionId: oC.data.id, tipoMovimiento: 'DEVOLUCION_SOBRANTE' },
    });
    ok(Number(devC?.cantidad) === 15, `el sobrante declarado se registra (${Number(devC?.cantidad)})`);
    ok(devC?.movimientoKardexId === null, 'y SIN kardex: ese material nunca salió del almacén');

    // ── 5. La liquidación lo cuenta ─────────────────────────────────────────
    console.log('\n5) La liquidación muestra lo entregado');
    const liq = await api(`/produccion/ordenes/${oA.data.id}/resumen-materiales`, { token });
    const fila = liq.data?.componentes?.[0];
    ok(Number(fila?.cantidadEntregada) === 200, `por componente (${Number(fila?.cantidadEntregada)})`);
    ok(Number(liq.data?.totales?.entregado) === 200, 'y en los totales');
    const liqC = await api(`/produccion/ordenes/${oC.data.id}/resumen-materiales`, { token });
    ok(Number(liqC.data?.componentes?.[0]?.cantidadEntregada) === 0, 'y en una orden sin entrega queda en 0');

    // ── 6. Lo que no se deja ────────────────────────────────────────────────
    console.log('\n6) Lo que el sistema no deja');
    const yaCerrada = await entregar(oA.data.id, insA.id, 10);
    ok(yaCerrada.status === 400, `entregar a una orden FINALIZADA se rechaza (HTTP ${yaCerrada.status})`);
    const insD = await nuevoProducto('IND', { stock: 10, costo: 1 });
    const ajeno = await entregar(oC.data.id, insD.id, 1);
    ok(ajeno.status === 400, `un insumo que no es de la orden tampoco (HTTP ${ajeno.status})`);
    const cero = await entregar(oB.data.id, insB.id, 0);
    ok(cero.status === 400, `entregar 0 no tiene sentido y se rechaza (HTTP ${cero.status})`);

    // Almacén es quien entrega: tiene que poder hacerlo.
    const tokenAlmacen = await login('almacen@kaisercorp.com.pe');
    const oE = await crearOrden(insD.id, finC.id, `${marca}-L4`, 5);
    const comoAlmacen = await api(`/produccion/ordenes/${oE.data.id}/entregar`, {
      token: tokenAlmacen, method: 'POST',
      body: JSON.stringify({ componentes: [{ productoInsumoId: insD.id, cantidad: 2 }] }),
    });
    ok(comoAlmacen.status < 400, `almacén puede entregar (HTTP ${comoAlmacen.status})`);
    const tokenVentas = await login('ventas@kaisercorp.com.pe');
    const comoVentas = await api(`/produccion/ordenes/${oE.data.id}/entregar`, {
      token: tokenVentas, method: 'POST',
      body: JSON.stringify({ componentes: [{ productoInsumoId: insD.id, cantidad: 1 }] }),
    });
    ok(comoVentas.status === 403, `y ventas no (HTTP ${comoVentas.status})`);
  } finally {
    console.log('\n7) Limpieza');
    for (const id of creado.ordenes) {
      await prisma.movimientoProduccion.deleteMany({ where: { ordenProduccionId: id } });
      await prisma.ordenProduccionComponente.deleteMany({ where: { ordenProduccionId: id } });
      await prisma.ordenProduccion.deleteMany({ where: { id } });
    }
    const mios = await prisma.producto.findMany({ where: { codigo: { startsWith: marca } }, select: { id: true } });
    for (const { id } of mios) {
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.updateMany({ where: { productoOrigenId: id }, data: { productoOrigenId: null } });
      await prisma.producto.deleteMany({ where: { id } });
    }
    const quedan = await prisma.producto.count({ where: { codigo: { startsWith: marca } } });
    ok(quedan === 0, `los productos de prueba eliminados (quedan ${quedan})`);
  }

  console.log(fallos === 0 ? '\n✔ Entrega de material: todo correcto' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error('\n✘', e.message); await prisma.$disconnect(); process.exit(1); });
