/**
 * QA funcional · Fase 3 — Inventario
 *
 * Ajustes, traslados entre sedes, tarjeta de stock, trazabilidad, consolidado e
 * inventario valorizado.
 *
 * Lo que más importa aquí es la CONSERVACIÓN: un traslado no crea ni destruye
 * mercadería, solo la mueve. Si el total entre sedes cambia al trasladar, el
 * inventario está inventando o perdiendo stock —y ya pasó una vez: la sede
 * destino heredaba el stock global de la empresa al recibir su primer traslado.
 *
 * Y la otra invariante: el último saldo del kardex de cada sede tiene que coincidir
 * con su ProductoStock. Si se separan, alguien tocó el stock por fuera del kardex.
 *
 * Limpia todo lo que crea y restaura el estado del producto.
 */
import { PrismaClient } from '@prisma/client';

/** Fecha de hoy en Lima (no en UTC): entre las 19:00 y medianoche no son la misma. */
const hoyLima = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1, SEDE_DESTINO = 3;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const r3 = (n) => Math.round(Number(n) * 1000) / 1000;

async function api(ruta, { token, ...init } = {}) {
  const r = await fetch(API + ruta, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const texto = await r.text();
  let j = {};
  try { j = JSON.parse(texto); } catch { j = { raw: texto.slice(0, 200) }; }
  return { status: r.status, body: j, data: j?.data };
}
async function login(email = 'gerencia@kaisercorp.com.pe') {
  const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'kaiser123' }) });
  if (r.status >= 400 || !r.data) throw new Error(`login falló (HTTP ${r.status}): ${r.body?.message ?? ''}. ¿Backend arriba en ${API}?`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const sel = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  if (sel.status >= 400 || !sel.data?.accessToken) {
    throw new Error(`select-sede de ${email} falló (HTTP ${sel.status}): ${sel.body?.message ?? 'sin mensaje'}`);
  }
  return sel.data.accessToken;
}

const stockSede = async (productoId, sedeId) => {
  const ps = await prisma.productoStock.findFirst({ where: { productoId, sedeId }, select: { stock: true } });
  return ps ? Number(ps.stock) : 0;
};
const saldoKardex = async (productoId, sedeId) => {
  const m = await prisma.movimientoKardex.findFirst({
    where: { productoId, sedeId }, orderBy: [{ fecha: 'desc' }, { id: 'desc' }], select: { stockActual: true } });
  return m ? Number(m.stockActual) : null;
};

async function main() {
  const token = await login();
  const marca = `[QA-F3-${Date.now()}]`;
  const prod = await prisma.producto.findFirst({
    where: { estado: 'ACTIVO' }, orderBy: { id: 'asc' },
    select: { id: true, codigo: true, descripcion: true, stock: true, costoPromedio: true } });

  const inicial = {
    global: Number(prod.stock),
    origen: await stockSede(prod.id, SEDE),
    destino: await stockSede(prod.id, SEDE_DESTINO),
    costo: Number(prod.costoPromedio ?? 0),
    movimientos: await prisma.movimientoKardex.count({ where: { productoId: prod.id } }),
  };
  console.log(`Producto: ${prod.codigo} · ${prod.descripcion}`);
  console.log(`Inicial · sede 1: ${inicial.origen} · sede 3: ${inicial.destino} · total ${r3(inicial.origen + inicial.destino)}\n`);

  try {
    // ── 1. Ajuste positivo ────────────────────────────────────────────────
    console.log('1) Ajuste manual positivo');
    const pos = await api('/kardex/ajuste', {
      token, method: 'POST',
      body: JSON.stringify({ productoId: prod.id, sedeId: SEDE, tipoAjuste: 'POSITIVO', cantidad: 25,
        motivo: `${marca} sobrante en conteo físico` }),
    });
    ok(pos.status < 300, `aceptado (HTTP ${pos.status})`);
    ok(await stockSede(prod.id, SEDE) === r3(inicial.origen + 25), `stock ${inicial.origen} → ${await stockSede(prod.id, SEDE)}`);
    const movPos = await prisma.movimientoKardex.findFirst({
      where: { productoId: prod.id, sedeId: SEDE }, orderBy: { id: 'desc' },
      select: { tipoMovimiento: true, cantidad: true, concepto: true, stockAnterior: true, stockActual: true } });
    // Un ajuste se registra con tipo AJUSTE y el signo de la cantidad marca la
    // dirección; no se usa INGRESO/SALIDA, que quedan para compras y ventas.
    ok(movPos?.tipoMovimiento === 'AJUSTE', `movimiento de tipo ${movPos?.tipoMovimiento}`);
    ok(Number(movPos?.cantidad) === 25, `con cantidad positiva ${movPos?.cantidad}`);
    ok(Number(movPos?.stockAnterior) === inicial.origen && Number(movPos?.stockActual) === r3(inicial.origen + 25),
      `el movimiento encadena ${movPos?.stockAnterior} → ${movPos?.stockActual}`);

    // ── 2. Ajuste negativo ────────────────────────────────────────────────
    console.log('\n2) Ajuste manual negativo');
    const neg = await api('/kardex/ajuste', {
      token, method: 'POST',
      body: JSON.stringify({ productoId: prod.id, sedeId: SEDE, tipoAjuste: 'NEGATIVO', cantidad: 10,
        motivo: `${marca} merma por manipulación` }),
    });
    ok(neg.status < 300, `aceptado (HTTP ${neg.status})`);
    const trasNeg = await stockSede(prod.id, SEDE);
    ok(trasNeg === r3(inicial.origen + 15), `stock ${trasNeg} (+25 −10)`);
    const movNeg = await prisma.movimientoKardex.findFirst({
      where: { productoId: prod.id, sedeId: SEDE }, orderBy: { id: 'desc' },
      select: { tipoMovimiento: true, cantidad: true } });
    ok(movNeg?.tipoMovimiento === 'AJUSTE', `movimiento de tipo ${movNeg?.tipoMovimiento}`);
    ok(Number(movNeg?.cantidad) === -10, `con cantidad negativa ${movNeg?.cantidad}`);

    // ── 3. Un ajuste no puede dejar el stock en negativo ──────────────────
    console.log('\n3) Lo que no debe permitirse');
    const exceso = await api('/kardex/ajuste', {
      token, method: 'POST',
      body: JSON.stringify({ productoId: prod.id, sedeId: SEDE, tipoAjuste: 'NEGATIVO', cantidad: 999999,
        motivo: `${marca} no debería entrar` }),
    });
    ok(exceso.status === 400, `un negativo mayor que el stock se rechaza (HTTP ${exceso.status})`);
    ok(String(exceso.body?.message ?? '').includes(String(trasNeg)),
      `y el mensaje dice cuánto hay: "${String(exceso.body?.message ?? '').slice(0, 110)}"`);
    ok(await stockSede(prod.id, SEDE) === trasNeg, 'el stock no se movió');
    const movsTrasRechazo = await prisma.movimientoKardex.count({
      where: { productoId: prod.id, concepto: { contains: 'no debería entrar' } } });
    ok(movsTrasRechazo === 0, 'y no dejó movimiento de kardex');
    const sinMotivo = await api('/kardex/ajuste', {
      token, method: 'POST',
      body: JSON.stringify({ productoId: prod.id, sedeId: SEDE, tipoAjuste: 'POSITIVO', cantidad: 1 }),
    });
    ok(sinMotivo.status === 400, `un ajuste sin motivo se rechaza (HTTP ${sinMotivo.status})`);

    // ── 4. Traslado entre sedes: la mercadería se mueve, no se crea ───────
    console.log('\n4) Traslado entre sedes (la invariante que importa)');
    const antes = { o: await stockSede(prod.id, SEDE), d: await stockSede(prod.id, SEDE_DESTINO) };
    const totalAntes = r3(antes.o + antes.d);
    const tras = await api('/kardex/traslado', {
      token, method: 'POST',
      body: JSON.stringify({ sedeOrigenId: SEDE, sedeDestinoId: SEDE_DESTINO,
        observacion: `${marca} traslado de prueba`, items: [{ productoId: prod.id, cantidad: 12 }] }),
    });
    ok(tras.status < 300, `aceptado (HTTP ${tras.status})`);
    const despues = { o: await stockSede(prod.id, SEDE), d: await stockSede(prod.id, SEDE_DESTINO) };
    ok(despues.o === r3(antes.o - 12), `origen ${antes.o} → ${despues.o}`);
    ok(despues.d === r3(antes.d + 12), `destino ${antes.d} → ${despues.d}`);
    ok(r3(despues.o + despues.d) === totalAntes,
      `el total entre sedes se conserva: ${totalAntes} → ${r3(despues.o + despues.d)}`);
    const movsTras = await prisma.movimientoKardex.findMany({
      where: { productoId: prod.id, concepto: { startsWith: 'Traslado' } },
      orderBy: { id: 'desc' }, take: 2, select: { tipoMovimiento: true, sedeId: true, cantidad: true } });
    const salida = movsTras.find((m) => m.sedeId === SEDE);
    const ingreso = movsTras.find((m) => m.sedeId === SEDE_DESTINO);
    ok(!!salida && !!ingreso, 'deja un movimiento en cada sede, no uno solo');
    ok(Number(salida?.cantidad) === 12 && Number(ingreso?.cantidad) === 12, 'por la misma cantidad en las dos');

    console.log('\n5) Traslados que no deben pasar');
    const misma = await api('/kardex/traslado', {
      token, method: 'POST',
      body: JSON.stringify({ sedeOrigenId: SEDE, sedeDestinoId: SEDE, items: [{ productoId: prod.id, cantidad: 1 }] }) });
    ok(misma.status >= 400, `trasladar a la misma sede se rechaza (HTTP ${misma.status})`);
    const demasiado = await api('/kardex/traslado', {
      token, method: 'POST',
      body: JSON.stringify({ sedeOrigenId: SEDE, sedeDestinoId: SEDE_DESTINO, items: [{ productoId: prod.id, cantidad: 999999 }] }) });
    ok(demasiado.status >= 400, `trasladar más de lo que hay se rechaza (HTTP ${demasiado.status})`);
    ok(await stockSede(prod.id, SEDE) === despues.o, 'y el stock sigue igual tras los rechazos');

    // ── 6. Tarjeta de stock: TODO movimiento tiene que figurar ────────────
    console.log('\n6) Tarjeta de stock: que no falte ningún movimiento');
    // La tarjeta va acotada a la sede de la sesión (sede 1), así que se compara
    // contra los movimientos de esa sede, no contra todos.
    const enBase = await prisma.movimientoKardex.count({ where: { productoId: prod.id, sedeId: SEDE } });
    const tarjeta = await api(`/kardex/producto/${prod.id}?limit=500`, { token });
    ok(tarjeta.status === 200, `responde (HTTP ${tarjeta.status})`);
    const lista = tarjeta.data?.movimientos ?? tarjeta.data?.items ?? (Array.isArray(tarjeta.data) ? tarjeta.data : []);
    ok(lista.length === enBase, `la tarjeta muestra ${lista.length} y la sede ${SEDE} tiene ${enBase}`);
    const enOtraSede = await prisma.movimientoKardex.count({ where: { productoId: prod.id, sedeId: SEDE_DESTINO } });
    ok(enOtraSede > 0 && !lista.some((m) => m.sede?.id === SEDE_DESTINO || m.sedeId === SEDE_DESTINO),
      `y no mezcla los ${enOtraSede} de la otra sede`);
    const nuestros = lista.filter((m) => String(m.concepto ?? '').includes('QA-F3') || String(m.observacion ?? '').includes('QA-F3'));
    ok(nuestros.length >= 3, `los movimientos que acabamos de crear figuran (${nuestros.length})`);

    // ── 7. El saldo del kardex frente al stock de cada sede ──────────────
    console.log('\n7) El kardex y el stock dicen lo mismo');
    for (const sid of [SEDE, SEDE_DESTINO]) {
      const s = await stockSede(prod.id, sid);
      const k = await saldoKardex(prod.id, sid);
      ok(k === s, `sede ${sid}: stock ${s} · último saldo de kardex ${k}`);
    }

    // ── 8. Trazabilidad ───────────────────────────────────────────────────
    console.log('\n8) Trazabilidad');
    const tz = await api(`/kardex/trazabilidad/${prod.codigo}`, { token });
    ok(tz.status === 200, `responde por código (HTTP ${tz.status})`);
    const d = tz.data ?? {};
    ok(Array.isArray(d.lineaDeTiempo) && d.lineaDeTiempo.length >= 4,
      `línea de tiempo con ${d.lineaDeTiempo?.length} movimientos`);
    ok(Array.isArray(d.porUsuario) && d.porUsuario.length >= 1, `agrupa por quién registró (${d.porUsuario?.length})`);
    ok(Array.isArray(d.descuadres) && d.descuadres.length === 0,
      `sin descuadres (${d.descuadres?.length})`);
    ok(typeof d.resumen?.registradosTarde === 'number',
      `cuenta los registrados tarde: ${d.resumen?.registradosTarde}`);
    ok(typeof d.resumen?.mayorDesfaseEnDias === 'number',
      `y el mayor desfase: ${d.resumen?.mayorDesfaseEnDias} días`);
    const sumaSedes = r3(await stockSede(prod.id, SEDE) + await stockSede(prod.id, SEDE_DESTINO));
    ok(Number(d.resumen?.stockActual) === sumaSedes,
      `el stock del resumen (${d.resumen?.stockActual}) es la suma de las sedes (${sumaSedes})`);
    ok(Array.isArray(d.resumen?.stockPorSede) && d.resumen.stockPorSede.length === 2,
      `y viene desglosado por sede: ${JSON.stringify(d.resumen?.stockPorSede?.map((x) => `${x.sedeId}=${x.stock}`))}`);
    // El saldo encadenado: el stockActual de cada movimiento es el stockAnterior
    // del siguiente en la misma sede. Es lo que delata que alguien tocó el stock
    // por fuera del kardex.
    const porSede = {};
    let roturas = 0;
    for (const m of d.lineaDeTiempo) {   // ya viene de más antiguo a más nuevo
      const sid = m.sede?.id;
      if (porSede[sid] !== undefined && Math.abs(porSede[sid] - m.stockAnterior) > 0.001) roturas++;
      porSede[sid] = m.stockActual;
    }
    ok(roturas === 0, `la cadena de saldos no se rompe en ninguna sede (${roturas} roturas)`);
    const porId = await api(`/kardex/trazabilidad/${prod.id}`, { token });
    ok(porId.status === 200, `también responde por id (HTTP ${porId.status})`);

    // ── 9. Consolidado ────────────────────────────────────────────────────
    console.log('\n9) Consolidado de movimientos');
    const hoy = hoyLima();
    for (const tipo of ['TODOS', 'INGRESOS', 'SALIDAS', 'TRASLADOS']) {
      const c = await api(`/kardex/consolidado?tipo=${tipo}&desde=${hoy}&hasta=${hoy}`, { token });
      const movs = c.data?.movimientos ?? [];
      ok(c.status === 200, `${tipo}: HTTP ${c.status}, ${movs.length} movimientos`);
      if (tipo === 'TODOS') {
        // Esto valía 0 antes de arreglar el filtro de fechas: pedir "hoy" daba la
        // tarde de ayer, porque el rango se construía en UTC y se cerraba en hora
        // local. Los movimientos que acabamos de crear tienen que estar aquí.
        ok(movs.length >= 4, `  y encuentra los de hoy (${movs.length})`);
        ok(movs.some((m) => m.tipoMovimiento === 'AJUSTE'), '  los ajustes figuran en el consolidado');
        // Un traslado no tiene tipo propio: son una SALIDA y un INGRESO que se
        // reconocen por el concepto. Eso es lo que la pestaña de TRASLADOS
        // buscaba mal, filtrando por un tipo de movimiento que nadie escribe.
        ok(movs.some((m) => String(m.concepto ?? '').startsWith('Traslado')),
          '  y los traslados también');
      }
      if (tipo === 'INGRESOS') ok(movs.every((m) => m.tipoMovimiento !== 'SALIDA'), '  INGRESOS no trae salidas');
      if (tipo === 'SALIDAS') ok(movs.every((m) => m.tipoMovimiento !== 'INGRESO'), '  SALIDAS no trae ingresos');
    }
    const excel = await fetch(`${API}/kardex/consolidado?tipo=TODOS&desde=${hoy}&hasta=${hoy}&formato=excel`,
      { headers: { Authorization: `Bearer ${token}` } });
    const ct = excel.headers.get('content-type') ?? '';
    const bytes = (await excel.arrayBuffer()).byteLength;
    ok(excel.status === 200 && ct.includes('spreadsheet') && bytes > 3000,
      `la descarga a Excel sale de verdad (HTTP ${excel.status}, ${bytes} bytes, ${ct.split(';')[0]})`);

    // ── 10. Inventario valorizado ─────────────────────────────────────────
    console.log('\n10) Inventario valorizado');
    const inv = await api('/kardex/inventario-valorizado', { token });
    ok(inv.status === 200, `responde (HTTP ${inv.status})`);
    const items = Array.isArray(inv.data) ? inv.data : (inv.data?.items ?? inv.data?.productos ?? []);
    ok(items.length > 0, `${items.length} productos`);
    const mio = items.find((x) => x.codigo === prod.codigo);
    ok(!!mio, 'el producto de prueba figura');
    ok(Number(mio?.stock ?? mio?.stockActual) > 0, `con stock ${mio?.stock ?? mio?.stockActual}`);
    ok(Number(mio?.valorTotal ?? 0) > 0, `y valor ${mio?.valorTotal}`);
    ok('costoPromedio' in (mio ?? {}), `con costo ${mio?.costoPromedio}`);
    const conProveedor = items.filter((x) => x.ultimoProveedor);
    ok(conProveedor.length > 0, `y ${conProveedor.length} traen su último proveedor (gerencia tiene permiso de compras)`);
    ok(items.some((x) => Array.isArray(x.lotes)), 'la estructura de lotes viene incluida');
    // El valorizado tiene que cuadrar con el stock real de la sede.
    const stockEsperado = await stockSede(prod.id, SEDE);
    const stockInv = Number(mio?.stock ?? mio?.stockActual);
    ok(stockInv === stockEsperado, `el valorizado dice ${stockInv} y la sede tiene ${stockEsperado}`);
  } finally {
    // ── Limpieza ───────────────────────────────────────────────────────────
    console.log('\n11) Limpieza');
    await prisma.movimientoKardex.deleteMany({
      where: { productoId: prod.id, OR: [{ concepto: { contains: 'QA-F3' } }, { observacion: { contains: 'QA-F3' } }] } });
    // Los traslados no llevan la marca en el concepto: se borran los creados ahora.
    await prisma.movimientoKardex.deleteMany({
      where: { productoId: prod.id, creadoEn: { gte: new Date(Date.now() - 30 * 60 * 1000) } } });
    await prisma.producto.update({ where: { id: prod.id }, data: { stock: inicial.global, costoPromedio: inicial.costo } });
    await prisma.productoStock.updateMany({ where: { productoId: prod.id, sedeId: SEDE }, data: { stock: inicial.origen } });
    await prisma.productoStock.updateMany({ where: { productoId: prod.id, sedeId: SEDE_DESTINO }, data: { stock: inicial.destino } });
    if (inicial.destino === 0) {
      await prisma.productoStock.deleteMany({ where: { productoId: prod.id, sedeId: SEDE_DESTINO, stock: 0 } });
    }
    const fin = {
      origen: await stockSede(prod.id, SEDE), destino: await stockSede(prod.id, SEDE_DESTINO),
      movimientos: await prisma.movimientoKardex.count({ where: { productoId: prod.id } }),
      costo: Number((await prisma.producto.findUnique({ where: { id: prod.id }, select: { costoPromedio: true } })).costoPromedio),
    };
    ok(fin.origen === inicial.origen && fin.destino === inicial.destino,
      `stock restaurado: sede 1 ${fin.origen}, sede 3 ${fin.destino}`);
    ok(fin.movimientos === inicial.movimientos, `movimientos restaurados a ${fin.movimientos}`);
    ok(fin.costo === inicial.costo, `costo promedio restaurado a ${fin.costo}`);
    await prisma.$disconnect();
  }

  console.log(fallos === 0 ? '\n✔ FASE 3 COMPLETA: todo correcto' : `\n✘ FASE 3: ${fallos} comprobaciones fallidas`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
