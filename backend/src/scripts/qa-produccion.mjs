/**
 * QA funcional · Fase 4 — Producción
 *
 * Receta (BOM) → orden → ejecución con merma → costeo del terminado.
 *
 * La invariante que guía la fase es la conservación del VALOR: lo que sale del
 * inventario en insumos tiene que aparecer en el costo del producto terminado. Si
 * no cuadra, el valor se evapora: el terminado queda barato, el margen sale
 * inflado y el P&L miente. Es el equivalente en producción de lo que ya apareció
 * en compras con el tipo de cambio.
 *
 * Crea sus propios productos y receta, y lo borra todo.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const S = (n) => `S/ ${Number(n).toFixed(4)}`;
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
  if (r.status >= 400 || !r.data) throw new Error(`login de ${email} falló (HTTP ${r.status}): ${r.body?.message ?? ''}`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const sel = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  if (sel.status >= 400 || !sel.data?.accessToken) throw new Error(`select-sede falló (HTTP ${sel.status}): ${sel.body?.message ?? ''}`);
  return sel.data.accessToken;
}
const stock = async (productoId) => {
  const ps = await prisma.productoStock.findFirst({ where: { productoId, sedeId: SEDE }, select: { stock: true } });
  return ps ? Number(ps.stock) : 0;
};

async function main() {
  const token = await login();
  const marca = `QAP${Date.now().toString().slice(-8)}`;
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true, tipoAfectacionIGV: true } });
  const creado = { productos: [], recetas: [], ordenes: [] };

  /** Un producto nuevo, con stock y costo conocidos: nada heredado que confunda. */
  const nuevoProducto = async (sufijo, { stock: st, costo }) => {
    const p = await prisma.producto.create({
      data: { codigo: `${marca}${sufijo}`, descripcion: `[QA-F4] ${sufijo}`, precioUnitario: 1, valorUnitario: 1,
        stock: st, costoPromedio: costo, empresaId: ref.empresaId, unidadMedidaId: ref.unidadMedidaId,
        tipoAfectacionIGV: ref.tipoAfectacionIGV ?? '10', factorConversion: 1 } });
    await prisma.productoStock.create({ data: { productoId: p.id, sedeId: SEDE, stock: st } });
    creado.productos.push(p.id);
    return p;
  };

  try {
    // Dos insumos con costos distintos y redondos, y un terminado que empieza vacío.
    const insA = await nuevoProducto('INSA', { stock: 1000, costo: 2 });
    const insB = await nuevoProducto('INSB', { stock: 1000, costo: 5 });
    const fin = await nuevoProducto('FINAL', { stock: 0, costo: 0 });
    console.log(`Insumo A: costo ${S(2)} · Insumo B: costo ${S(5)} · Terminado: parte de 0\n`);

    // ── 1. Receta ─────────────────────────────────────────────────────────
    console.log('1) Receta (BOM)');
    const rec = await api('/produccion/recetas', {
      token, method: 'POST',
      body: JSON.stringify({
        productoFinalId: fin.id, codigo: `${marca}-REC`, nombre: '[QA-F4] receta de prueba',
        rendimientoObjetivo: 10, unidadRendimiento: 'UN', mermaObjetivoPorcentaje: 5,
        componentes: [
          { productoInsumoId: insA.id, cantidadBase: 4, unidadBase: 'KGM', mermaEsperadaPorcentaje: 2, orden: 1 },
          { productoInsumoId: insB.id, cantidadBase: 2, unidadBase: 'KGM', mermaEsperadaPorcentaje: 0, orden: 2 },
        ],
      }),
    });
    ok(rec.status < 300, `creada (HTTP ${rec.status})`);
    const recetaId = rec.data?.id;
    if (!recetaId) throw new Error(`no se creó la receta: ${JSON.stringify(rec.body).slice(0, 300)}`);
    creado.recetas.push(recetaId);
    const recLeida = await api(`/produccion/recetas/${recetaId}`, { token });
    ok(recLeida.data?.componentes?.length === 2, `con sus 2 insumos (${recLeida.data?.componentes?.length})`);
    const dup = await api('/produccion/recetas', {
      token, method: 'POST',
      body: JSON.stringify({ productoFinalId: fin.id, codigo: `${marca}-REC`, nombre: 'otra',
        rendimientoObjetivo: 1, unidadRendimiento: 'UN', componentes: [{ productoInsumoId: insA.id, cantidadBase: 1, unidadBase: 'KGM' }] }),
    });
    ok(dup.status >= 400, `el código de receta duplicado se rechaza (HTTP ${dup.status})`);

    // ── 2. Orden de producción ────────────────────────────────────────────
    console.log('\n2) Orden de producción');
    const ord = await api('/produccion/ordenes', {
      token, method: 'POST',
      body: JSON.stringify({ recetaId, loteProduccion: `${marca}-L1`, cantidadObjetivo: 10 }),
    });
    ok(ord.status < 300, `creada (HTTP ${ord.status})`);
    const ordenId = ord.data?.id;
    if (!ordenId) throw new Error(`no se creó la orden: ${JSON.stringify(ord.body).slice(0, 300)}`);
    creado.ordenes.push(ordenId);
    const comps = await prisma.ordenProduccionComponente.findMany({
      where: { ordenProduccionId: ordenId }, orderBy: { productoInsumoId: 'asc' },
      select: { productoInsumoId: true, cantidadTeorica: true, costoUnitario: true } });
    ok(comps.length === 2, `explota la receta en ${comps.length} componentes`);
    const cA = comps.find((c) => c.productoInsumoId === insA.id);
    const cB = comps.find((c) => c.productoInsumoId === insB.id);
    ok(Number(cA?.cantidadTeorica) === 4 && Number(cB?.cantidadTeorica) === 2,
      `con las cantidades de la receta (A=${cA?.cantidadTeorica}, B=${cB?.cantidadTeorica})`);
    ok(Number(cA?.costoUnitario) === 2 && Number(cB?.costoUnitario) === 5,
      `y el costo de cada insumo (A=${S(cA?.costoUnitario)}, B=${S(cB?.costoUnitario)})`);
    const loteDup = await api('/produccion/ordenes', {
      token, method: 'POST', body: JSON.stringify({ recetaId, loteProduccion: `${marca}-L1`, cantidadObjetivo: 1 }) });
    ok(loteDup.status >= 400, `el lote de producción duplicado se rechaza (HTTP ${loteDup.status})`);

    // ── 3. Ejecución con merma ────────────────────────────────────────────
    console.log('\n3) Ejecución: consume insumos, genera terminado, registra merma');
    const antes = { a: await stock(insA.id), b: await stock(insB.id), f: await stock(fin.id) };
    // Se consume 4 de A con 1 de merma, y 2 de B sin merma. Se producen 10.
    const CONS_A = 4, MERMA_A = 1, CONS_B = 2, PRODUCIDO = 10;
    const eje = await api(`/produccion/ordenes/${ordenId}/ejecutar`, {
      token, method: 'POST',
      body: JSON.stringify({ cantidadProducida: PRODUCIDO, observaciones: '[QA-F4] ejecución',
        componentes: [
          { productoInsumoId: insA.id, cantidadConsumida: CONS_A, mermaCantidad: MERMA_A },
          { productoInsumoId: insB.id, cantidadConsumida: CONS_B, mermaCantidad: 0 },
        ] }),
    });
    ok(eje.status < 300, `ejecutada (HTTP ${eje.status})`);
    const despues = { a: await stock(insA.id), b: await stock(insB.id), f: await stock(fin.id) };
    ok(despues.a === r3(antes.a - CONS_A - MERMA_A), `insumo A: ${antes.a} → ${despues.a} (consumo ${CONS_A} + merma ${MERMA_A})`);
    ok(despues.b === r3(antes.b - CONS_B), `insumo B: ${antes.b} → ${despues.b} (consumo ${CONS_B})`);
    ok(despues.f === r3(antes.f + PRODUCIDO), `terminado: ${antes.f} → ${despues.f}`);
    const ordTras = await prisma.ordenProduccion.findUnique({ where: { id: ordenId } });
    ok(ordTras?.estado === 'FINALIZADA', `la orden queda en ${ordTras?.estado}`);
    ok(Number(ordTras?.cantidadProducida) === PRODUCIDO, `con cantidad producida ${ordTras?.cantidadProducida}`);
    ok(Number(ordTras?.mermaTotal) === MERMA_A, `y merma total ${ordTras?.mermaTotal}`);

    console.log('\n4) La merma quedó registrada como tal');
    const movsProd = await prisma.movimientoProduccion.findMany({
      where: { ordenProduccionId: ordenId }, select: { tipoMovimiento: true, productoId: true, cantidad: true, costoUnitario: true, costoTotal: true } });
    const consumos = movsProd.filter((m) => m.tipoMovimiento === 'CONSUMO_INSUMO');
    const mermas = movsProd.filter((m) => m.tipoMovimiento === 'MERMA');
    const ingresos = movsProd.filter((m) => m.tipoMovimiento === 'INGRESO_PRODUCTO_FINAL');
    ok(consumos.length === 2, `${consumos.length} movimientos de consumo`);
    ok(mermas.length === 1 && Number(mermas[0].cantidad) === MERMA_A, `1 movimiento de merma por ${mermas[0]?.cantidad}`);
    ok(ingresos.length === 1, `1 ingreso de producto terminado`);

    // ── 5. LA INVARIANTE: el valor que sale es el valor que entra ─────────
    console.log('\n5) Conservación del valor (lo que sale del inventario = lo que entra al terminado)');
    const valorConsumido = CONS_A * 2 + CONS_B * 5;          // 4×2 + 2×5 = 18
    const valorMerma = MERMA_A * 2;                          // 1×2 = 2
    const valorSalidaTotal = valorConsumido + valorMerma;    // 20
    const valorTerminado = Number(ingresos[0]?.costoTotal ?? 0);
    console.log(`   consumido ${S(valorConsumido)} + merma ${S(valorMerma)} = ${S(valorSalidaTotal)} sale del inventario`);
    console.log(`   el terminado se valoriza en ${S(valorTerminado)}`);
    ok(Math.abs(valorTerminado - valorSalidaTotal) < 0.01,
      `cuadra (diferencia ${S(valorTerminado - valorSalidaTotal)})`);
    ok(Math.abs(Number(ingresos[0]?.costoUnitario) - valorSalidaTotal / PRODUCIDO) < 0.0001,
      `costo unitario del terminado ${S(ingresos[0]?.costoUnitario)} (se espera ${S(valorSalidaTotal / PRODUCIDO)})`);

    // Y lo mismo medido en el kardex, que es lo que alimenta el inventario valorizado.
    const kx = await prisma.movimientoKardex.findMany({
      where: { productoId: { in: [insA.id, insB.id, fin.id] } },
      select: { productoId: true, tipoMovimiento: true, cantidad: true, costoUnitario: true, valorTotal: true } });
    const salidaKardex = kx.filter((m) => m.tipoMovimiento === 'SALIDA')
      .reduce((a, m) => a + Number(m.cantidad) * Number(m.costoUnitario ?? 0), 0);
    const entradaKardex = kx.filter((m) => m.tipoMovimiento === 'INGRESO' && m.productoId === fin.id)
      .reduce((a, m) => a + Number(m.cantidad) * Number(m.costoUnitario ?? 0), 0);
    console.log(`   en el kardex: salen ${S(salidaKardex)} de insumos, entran ${S(entradaKardex)} de terminado`);
    ok(Math.abs(salidaKardex - entradaKardex) < 0.01,
      `el kardex también cuadra (diferencia ${S(salidaKardex - entradaKardex)})`);

    // El costeo tiene que quedar guardado en la orden, con la merma aparte: es la
    // cifra que le interesa a un fabricante y antes no se registraba en ningún sitio.
    const costos = await prisma.ordenProduccion.findUnique({ where: { id: ordenId },
      select: { costoConsumo: true, costoMerma: true, costoProduccion: true } });
    ok(Math.abs(Number(costos?.costoConsumo) - valorConsumido) < 0.01,
      `la orden guarda el costo de consumo ${S(costos?.costoConsumo)}`);
    ok(Math.abs(Number(costos?.costoMerma) - valorMerma) < 0.01,
      `y el de la merma por separado ${S(costos?.costoMerma)}`);
    ok(Math.abs(Number(costos?.costoProduccion) - valorSalidaTotal) < 0.01,
      `y el total ${S(costos?.costoProduccion)} = consumo + merma`);

    console.log('\n6) El costo registrado en cada componente');
    const compsTras = await prisma.ordenProduccionComponente.findMany({
      where: { ordenProduccionId: ordenId }, orderBy: { productoInsumoId: 'asc' },
      select: { productoInsumoId: true, cantidadTeorica: true, cantidadConsumida: true, mermaCantidad: true, costoUnitario: true, costoTotal: true } });
    for (const c of compsTras) {
      const nombre = c.productoInsumoId === insA.id ? 'A' : 'B';
      const esperado = (Number(c.cantidadConsumida) + Number(c.mermaCantidad)) * Number(c.costoUnitario);
      ok(Math.abs(Number(c.costoTotal) - esperado) < 0.01,
        `insumo ${nombre}: costoTotal ${S(c.costoTotal)} = (consumido ${c.cantidadConsumida} + merma ${c.mermaCantidad}) × ${S(c.costoUnitario)} = ${S(esperado)}`);
    }

    console.log('\n7) Lo que no debe permitirse');
    const reEje = await api(`/produccion/ordenes/${ordenId}/ejecutar`, {
      token, method: 'POST',
      body: JSON.stringify({ cantidadProducida: 1, componentes: [{ productoInsumoId: insA.id, cantidadConsumida: 1 }] }) });
    ok(reEje.status >= 400, `ejecutar una orden finalizada se rechaza (HTTP ${reEje.status})`);
    const ord2 = await api('/produccion/ordenes', {
      token, method: 'POST', body: JSON.stringify({ recetaId, loteProduccion: `${marca}-L2`, cantidadObjetivo: 5 }) });
    if (ord2.data?.id) {
      creado.ordenes.push(ord2.data.id);
      const cero = await api(`/produccion/ordenes/${ord2.data.id}/ejecutar`, {
        token, method: 'POST',
        body: JSON.stringify({ cantidadProducida: 0, componentes: [{ productoInsumoId: insA.id, cantidadConsumida: 1 }] }) });
      ok(cero.status === 400, `producir 0 unidades se rechaza (HTTP ${cero.status})`);
      const ajeno = await api(`/produccion/ordenes/${ord2.data.id}/ejecutar`, {
        token, method: 'POST',
        body: JSON.stringify({ cantidadProducida: 1, componentes: [{ productoInsumoId: fin.id, cantidadConsumida: 1 }] }) });
      ok(ajeno.status === 400, `un insumo que no está en la orden se rechaza (HTTP ${ajeno.status})`);
      const negativa = await api(`/produccion/ordenes/${ord2.data.id}/ejecutar`, {
        token, method: 'POST',
        body: JSON.stringify({ cantidadProducida: 1, componentes: [{ productoInsumoId: insA.id, cantidadConsumida: -5 }] }) });
      ok(negativa.status === 400, `una cantidad consumida negativa se rechaza (HTTP ${negativa.status})`);
    }
  } finally {
    console.log('\n8) Limpieza');
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
      await prisma.productoLote.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.deleteMany({ where: { id } });
    }
    const quedan = await prisma.producto.count({ where: { codigo: { startsWith: marca } } });
    ok(quedan === 0, `los ${creado.productos.length} productos de prueba eliminados (quedan ${quedan})`);
    await prisma.$disconnect();
  }

  console.log(fallos === 0 ? '\n✔ FASE 4 COMPLETA: todo correcto' : `\n✘ FASE 4: ${fallos} comprobaciones fallidas`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
