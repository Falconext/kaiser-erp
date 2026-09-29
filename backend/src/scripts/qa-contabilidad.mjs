/**
 * QA funcional · Fase 9 — Contabilidad y finanzas, y la anulación de comprobantes
 *
 * Los libros electrónicos de SUNAT (SIRE), las ocho dimensiones del reporte de
 * gestión y la anulación, que es el último camino de la Fase 6 que quedaba sin probar.
 *
 * Lo que importa de cada parte:
 *   · El SIRE tiene que traer una línea por comprobante FORMAL del periodo, ni una
 *     más ni una menos: es lo que Kaiser declara.
 *   · Las ocho dimensiones tienen que sumar siempre el mismo total. Si agrupar por
 *     cliente da una cifra distinta que agrupar por vendedor, una de las dos miente.
 *   · Anular tiene que devolver el stock y borrar los cobros. Y una factura ya
 *     aceptada por SUNAT NO se anula: se emite una nota de crédito. Permitirlo sería
 *     dejar en los libros un documento que SUNAT sigue teniendo por válido.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const S = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const cuadra = (a, b, tol = 0.05) => Math.abs(Number(a) - Number(b)) <= tol;

async function api(ruta, { token, ...init } = {}) {
  const r = await fetch(API + ruta, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const t = await r.text();
  let j = {}; try { j = JSON.parse(t); } catch { j = { raw: t }; }
  return { status: r.status, body: j, data: j?.data, texto: t };
}
async function login() {
  const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'gerencia@kaisercorp.com.pe', password: 'kaiser123' }) });
  if (r.status >= 400 || !r.data) throw new Error(`login falló (HTTP ${r.status}): ${r.body?.message ?? ''}`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const sel = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  if (sel.status >= 400 || !sel.data?.accessToken) throw new Error(`select-sede falló (HTTP ${sel.status})`);
  return sel.data.accessToken;
}
const stock = async (id) => {
  const ps = await prisma.productoStock.findFirst({ where: { productoId: id, sedeId: SEDE }, select: { stock: true } });
  return ps ? Number(ps.stock) : 0;
};

async function main() {
  const token = await login();
  const hoy = new Date();
  const mes = hoy.getMonth() + 1, anio = hoy.getFullYear();
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const hasta = `${anio}-${String(mes).padStart(2, '0')}-${new Date(anio, mes, 0).getDate()}`;
  const creado = { productos: [], comprobantes: [] };

  try {
    // ── 1. SIRE: los libros electrónicos ──────────────────────────────────
    console.log(`1) SIRE del periodo ${mes}/${anio}`);
    const formales = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int n FROM "Comprobante" c
      WHERE c."tipoDoc" IN ('01','03','07','08') AND c."estadoEnvioSunat" <> 'ANULADO'
        AND c."fechaEmision" >= '${desde}T05:00:00Z'
        AND c."fechaEmision" <= '${hasta}T23:59:59Z'::timestamp + interval '5 hours'`);
    const compras = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*)::int n FROM "Compra" c
      WHERE c.estado <> 'ANULADO'
        AND c."fechaEmision" >= '${desde}T05:00:00Z'
        AND c."fechaEmision" <= '${hasta}T23:59:59Z'::timestamp + interval '5 hours'`);

    const ventas = await api(`/contabilidad/sire/ventas-txt?mes=${mes}&anio=${anio}`, { token });
    ok(ventas.status === 200, `libro de VENTAS responde (HTTP ${ventas.status})`);
    const lv = ventas.texto.split('\n').filter((l) => l.trim()).length;
    ok(lv === formales[0].n, `una línea por comprobante formal (${formales[0].n} formales, ${lv} líneas)`);

    const cmp = await api(`/contabilidad/sire/compras-txt?mes=${mes}&anio=${anio}`, { token });
    ok(cmp.status === 200, `libro de COMPRAS responde (HTTP ${cmp.status})`);
    const lc = cmp.texto.split('\n').filter((l) => l.trim()).length;
    ok(lc === compras[0].n, `una línea por compra del periodo (${compras[0].n} compras, ${lc} líneas)`);
    // El formato SIRE es de campos separados por barra vertical.
    if (lc > 0) {
      const primera = cmp.texto.split('\n').find((l) => l.trim());
      const campos = primera.split('|').length;
      ok(campos > 10, `el formato trae ${campos} campos separados por «|»`);
    }
    const mesMalo = await api(`/contabilidad/sire/ventas-txt?mes=13&anio=${anio}`, { token });
    ok(mesMalo.status >= 400, `un mes inválido se rechaza (HTTP ${mesMalo.status})`);

    // ── 2. Las ocho dimensiones del reporte ───────────────────────────────
    console.log('\n2) Reporte de gestión: las ocho dimensiones suman lo mismo');
    const DIMS = ['vendedor', 'cliente', 'producto', 'categoria', 'sector', 'departamento', 'provincia', 'distrito'];
    let referencia = null;
    for (const d of DIMS) {
      const r = await api(`/reportes/ventas?fechaInicio=${desde}&fechaFin=${hasta}&dimension=${d}`, { token });
      if (r.status !== 200) { ok(false, `${d}: HTTP ${r.status}`); continue; }
      const total = Number(r.data?.totalVentas ?? 0);
      const suma = (r.data?.filas ?? []).reduce((a, f) => a + Number(f.ventas ?? 0), 0);
      const part = (r.data?.filas ?? []).reduce((a, f) => a + Number(f.participacion ?? 0), 0);
      if (referencia === null) referencia = total;
      const bien = cuadra(total, referencia, 1) && cuadra(suma, total, 1)
        && (Math.abs(part - 100) < 0.5 || (r.data?.filas ?? []).length === 0);
      ok(bien, `${d.padEnd(13)} ${String((r.data?.filas ?? []).length).padStart(3)} filas · total ${S(total)} · suman ${S(suma)} · participación ${part.toFixed(1)} %`);
    }
    const dimMala = await api(`/reportes/ventas?fechaInicio=${desde}&fechaFin=${hasta}&dimension=inventada`, { token });
    ok(dimMala.status === 400, `una dimensión inventada se rechaza (HTTP ${dimMala.status})`);

    // ── 3. Anulación de comprobante ───────────────────────────────────────
    console.log('\n3) Anulación de comprobante');
    const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true } });
    const N = Date.now().toString().slice(-8);
    const prod = await prisma.producto.create({
      data: { codigo: `QCT${N}`, descripcion: '[QA-F9] producto', precioUnitario: 118, valorUnitario: 100,
        stock: 60, costoPromedio: 40, empresaId: ref.empresaId, unidadMedidaId: ref.unidadMedidaId,
        tipoAfectacionIGV: '10', factorConversion: 1 } });
    await prisma.productoStock.create({ data: { productoId: prod.id, sedeId: SEDE, stock: 60 } });
    creado.productos.push(prod.id);

    const nv = await api('/comprobante/informal', { token, method: 'POST',
      body: JSON.stringify({ sedeId: SEDE, tipoOperacionId: 1, tipoDoc: 'NV',
        fechaEmision: new Date().toISOString(), formaPagoTipo: 'Contado', formaPagoMoneda: 'PEN',
        tipoMoneda: 'PEN', clienteId: 1, clienteName: 'VARIOS', leyenda: '[QA-F9]', medioPago: 'EFECTIVO',
        detalles: [{ productoId: prod.id, cantidad: 15, nuevoValorUnitario: 100 }] }) });
    ok(nv.status < 300, `nota de venta emitida (HTTP ${nv.status})`);
    const nvId = nv.data?.id;
    if (nvId) creado.comprobantes.push(nvId);
    const trasVenta = await stock(prod.id);
    ok(trasVenta === 45, `descontó stock: 60 → ${trasVenta}`);

    // Un cobro, para comprobar que la anulación no deja ingresos fantasma.
    const pago = await api(`/pago/comprobante/${nvId}/registrar`, { token, method: 'POST',
      body: JSON.stringify({ monto: 500, medioPago: 'EFECTIVO' }) });
    const pagosAntes = await prisma.pago.count({ where: { comprobanteId: nvId } });
    console.log(`   cobro registrado: HTTP ${pago.status} · ${pagosAntes} pago(s) en la venta`);

    const anular = await api(`/comprobante/${nvId}/anular`, { token, method: 'PATCH',
      body: JSON.stringify({ motivo: 'Prueba de anulación del QA' }) });
    ok(anular.status < 300, `anulada (HTTP ${anular.status})`);
    ok(await stock(prod.id) === 60, `el stock volvió a ${await stock(prod.id)}`);
    ok(await prisma.pago.count({ where: { comprobanteId: nvId } }) === 0,
      'los cobros se borraron: no quedan ingresos de una venta anulada');
    const tras = await prisma.comprobante.findUnique({ where: { id: nvId }, select: { estadoEnvioSunat: true } });
    ok(tras?.estadoEnvioSunat === 'ANULADO', `queda en ${tras?.estadoEnvioSunat}`);
    const movs = await prisma.movimientoKardex.count({ where: { comprobanteId: nvId } });
    ok(movs >= 2, `el kardex conserva la salida y su reversión (${movs} movimientos)`);

    console.log('\n4) Una factura aceptada por SUNAT NO se anula: exige nota de crédito');
    const aceptada = await prisma.comprobante.findFirst({
      where: { tipoDoc: { in: ['01', '03'] }, estadoEnvioSunat: 'EMITIDO', sunatCdrResponse: { not: null } },
      select: { id: true, tipoDoc: true, serie: true, correlativo: true } });
    if (aceptada) {
      const no = await api(`/comprobante/${aceptada.id}/anular`, { token, method: 'PATCH',
        body: JSON.stringify({ motivo: 'no debería poder' }) });
      ok(no.status === 400,
        `${aceptada.serie}-${aceptada.correlativo} rechaza la anulación directa (HTTP ${no.status})`);
      ok(/nota de cr[eé]dito/i.test(String(no.body?.message)),
        `y explica qué hacer: "${String(no.body?.message).slice(0, 72)}"`);
      const sigue = await prisma.comprobante.findUnique({ where: { id: aceptada.id }, select: { estadoEnvioSunat: true } });
      ok(sigue?.estadoEnvioSunat === 'EMITIDO', 'y sigue emitida');
    } else {
      ok(false, 'no hay comprobante aceptado por SUNAT con el que probarlo');
    }
  } finally {
    console.log('\n5) Limpieza');
    for (const id of creado.comprobantes) {
      await prisma.movimientoKardex.deleteMany({ where: { comprobanteId: id } });
      await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: id } });
      await prisma.leyenda.deleteMany({ where: { comprobanteId: id } });
      await prisma.pago.deleteMany({ where: { comprobanteId: id } });
      await prisma.comprobante.deleteMany({ where: { id } });
    }
    for (const id of creado.productos) {
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoLote.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.deleteMany({ where: { id } });
    }
    const quedan = await prisma.producto.count({ where: { codigo: { startsWith: 'QCT' } } });
    ok(quedan === 0, `sin productos de prueba (${quedan})`);
    await prisma.$disconnect();
  }

  console.log(fallos === 0 ? '\n✔ FASE 9 COMPLETA: todo correcto' : `\n✘ FASE 9: ${fallos} comprobaciones fallidas`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
