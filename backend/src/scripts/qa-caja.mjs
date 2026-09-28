/**
 * QA funcional · Fase 8 — Cobros y caja
 *
 * Apertura, ventas del turno, egresos, arqueo y cierre.
 *
 * La invariante de la fase es el ARQUEO: lo que hay en el cajón tiene que ser lo
 * que el sistema dice que debería haber. Y eso es
 *
 *     fondo de apertura  +  cobros del turno  −  egresos del turno
 *
 * Si la diferencia que informa el cierre no es esa, el arqueo no sirve para nada:
 * el cajero no puede saber si le falta dinero, porque el número ya viene con un
 * sobrante o un faltante de fábrica —y un faltante real se esconde dentro.
 *
 * Deja la caja como estaba: cierra lo que abre y borra sus movimientos.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const S = (n) => `S/ ${Number(n).toFixed(2)}`;

async function api(ruta, { token, ...init } = {}) {
  const r = await fetch(API + ruta, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const t = await r.text();
  let j = {}; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 160) }; }
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

async function main() {
  const token = await login();
  const desde = new Date();
  const N = Date.now().toString().slice(-8);
  const FONDO = 500, VENTA = 240, EGRESO = 30;
  const creado = { productos: [], comprobantes: [] };

  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true } });
  const prod = await prisma.producto.create({
    data: { codigo: `QCJ${N}`, descripcion: '[QA-F8] producto', precioUnitario: 240, valorUnitario: 203.39,
      stock: 100, costoPromedio: 100, empresaId: ref.empresaId, unidadMedidaId: ref.unidadMedidaId,
      tipoAfectacionIGV: '10', factorConversion: 1 } });
  await prisma.productoStock.create({ data: { productoId: prod.id, sedeId: SEDE, stock: 100 } });
  creado.productos.push(prod.id);

  try {
    // ── 1. Estado y apertura ──────────────────────────────────────────────
    console.log('1) Apertura del turno');
    const abiertaAntes = await prisma.movimientoCaja.findFirst({
      where: { tipoMovimiento: 'APERTURA', estado: 'ACTIVO' }, orderBy: { fecha: 'desc' } });
    const ap = await api('/caja/abrir', { token, method: 'POST',
      body: JSON.stringify({ montoInicial: FONDO, observaciones: `[QA-F8] ${N}` }) });
    ok(ap.status < 300, `abierta con fondo de ${S(FONDO)} (HTTP ${ap.status})`);
    const aperturaId = ap.data?.id;
    const dobleApertura = await api('/caja/abrir', { token, method: 'POST', body: JSON.stringify({ montoInicial: 100 }) });
    ok(dobleApertura.status >= 400, `abrir dos veces se rechaza (HTTP ${dobleApertura.status})`);
    const estado = await api('/caja/estado', { token });
    ok(estado.status === 200, `el estado responde (HTTP ${estado.status})`);

    // ── 2. Una venta en efectivo dentro del turno ─────────────────────────
    console.log('\n2) Una venta al contado en efectivo');
    const nv = await api('/comprobante/informal', { token, method: 'POST',
      body: JSON.stringify({ sedeId: SEDE, tipoOperacionId: 1, tipoDoc: 'NV',
        fechaEmision: new Date().toISOString(), formaPagoTipo: 'Contado', formaPagoMoneda: 'PEN',
        tipoMoneda: 'PEN', clienteId: 1, clienteName: 'VARIOS', leyenda: '[QA-F8]', medioPago: 'EFECTIVO',
        detalles: [{ productoId: prod.id, cantidad: 1, nuevoValorUnitario: 203.39 }] }) });
    ok(nv.status < 300, `nota de venta emitida (HTTP ${nv.status})`);
    if (nv.data?.id) creado.comprobantes.push(nv.data.id);
    const cobrado = Number(nv.data?.mtoImpVenta ?? VENTA);
    console.log(`   cobrado en efectivo: ${S(cobrado)}`);

    // ── 3. Un egreso del turno ────────────────────────────────────────────
    console.log('\n3) Un egreso del turno (sale dinero del cajón)');
    const eg = await api('/caja/egreso', { token, method: 'POST',
      body: JSON.stringify({ monto: EGRESO, categoriaGasto: 'MOVILIDAD', descripcionGasto: `[QA-F8] taxi ${N}` }) });
    ok(eg.status < 300, `egreso de ${S(EGRESO)} registrado (HTTP ${eg.status})`);
    const egCero = await api('/caja/egreso', { token, method: 'POST',
      body: JSON.stringify({ monto: 0, categoriaGasto: 'MOVILIDAD' }) });
    ok(egCero.status === 400, `un egreso de 0 se rechaza (HTTP ${egCero.status})`);
    const egSinCategoria = await api('/caja/egreso', { token, method: 'POST', body: JSON.stringify({ monto: 10 }) });
    ok(egSinCategoria.status === 400, `un egreso sin categoría se rechaza (HTTP ${egSinCategoria.status})`);

    // ── 4. El arqueo ──────────────────────────────────────────────────────
    console.log('\n4) El arqueo: lo que debería haber en el cajón');
    const esperado = FONDO + cobrado - EGRESO;
    console.log(`   fondo ${S(FONDO)} + cobros ${S(cobrado)} − egresos ${S(EGRESO)} = ${S(esperado)}`);
    const arqueo = await api(`/caja/arqueo?fechaInicio=${new Date().toISOString().slice(0, 10)}&fechaFin=${new Date().toISOString().slice(0, 10)}`, { token });
    ok(arqueo.status === 200, `el arqueo responde (HTTP ${arqueo.status})`);

    // Se cierra declarando EXACTAMENTE lo que debería haber: la diferencia tiene
    // que ser cero. Si no lo es, el arqueo está mal construido.
    console.log('\n5) Cierre declarando exactamente lo que debería haber');
    const cierre = await api('/caja/cerrar', { token, method: 'POST',
      body: JSON.stringify({ montoEfectivo: esperado, montoYape: 0, montoPlin: 0,
        montoTransferencia: 0, montoTarjeta: 0, observaciones: `[QA-F8] ${N}` }) });
    ok(cierre.status < 300, `cerrada (HTTP ${cierre.status})`);
    const guardado = await prisma.movimientoCaja.findFirst({
      where: { tipoMovimiento: 'CIERRE', observaciones: { contains: `[QA-F8] ${N}` } },
      select: { id: true, montoFinal: true, totalIngresos: true, diferencia: true } });
    console.log(`   declarado ${S(guardado?.montoFinal)} · ingresos del turno ${S(guardado?.totalIngresos)} · diferencia informada ${S(guardado?.diferencia)}`);
    ok(Math.abs(Number(guardado?.diferencia ?? 999)) < 0.05,
      `la diferencia es cero: el cajón cuadra (informó ${S(guardado?.diferencia)})`);

    // Y al contrario: si falta dinero, el arqueo tiene que decirlo con el importe exacto.
    console.log('\n6) Y si falta dinero, el arqueo lo dice');
    const ap2 = await api('/caja/abrir', { token, method: 'POST',
      body: JSON.stringify({ montoInicial: FONDO, observaciones: `[QA-F8b] ${N}` }) });
    ok(ap2.status < 300, `segundo turno abierto (HTTP ${ap2.status})`);
    const FALTA = 40;
    const cierre2 = await api('/caja/cerrar', { token, method: 'POST',
      body: JSON.stringify({ montoEfectivo: FONDO - FALTA, montoYape: 0, montoPlin: 0,
        montoTransferencia: 0, montoTarjeta: 0, observaciones: `[QA-F8b] ${N}` }) });
    ok(cierre2.status < 300, `cerrado (HTTP ${cierre2.status})`);
    const g2 = await prisma.movimientoCaja.findFirst({
      where: { tipoMovimiento: 'CIERRE', observaciones: { contains: `[QA-F8b] ${N}` } },
      select: { diferencia: true, totalIngresos: true } });
    console.log(`   turno sin ventas · fondo ${S(FONDO)} · declarado ${S(FONDO - FALTA)}`);
    ok(Math.abs(Number(g2?.diferencia ?? 0) + FALTA) < 0.05,
      `informa el faltante exacto: ${S(g2?.diferencia)} (se esperaba ${S(-FALTA)})`);

    console.log('\n7) Cerrar sin caja abierta');
    const sinAbrir = await api('/caja/cerrar', { token, method: 'POST',
      body: JSON.stringify({ montoEfectivo: 0, montoYape: 0, montoPlin: 0, montoTransferencia: 0, montoTarjeta: 0 }) });
    ok(sinAbrir.status === 400, `se rechaza (HTTP ${sinAbrir.status})`);
  } finally {
    console.log('\n8) Limpieza');
    await prisma.movimientoCaja.deleteMany({ where: { observaciones: { contains: `[QA-F8` } } });
    await prisma.movimientoCaja.deleteMany({ where: { descripcionGasto: { contains: `[QA-F8` } } });
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
    const quedan = await prisma.movimientoCaja.count({ where: { fecha: { gte: desde } } });
    ok(quedan === 0, `sin movimientos de caja de prueba (${quedan})`);
    await prisma.$disconnect();
  }

  console.log(fallos === 0 ? '\n✔ FASE 8 COMPLETA: todo correcto' : `\n✘ FASE 8: ${fallos} comprobaciones fallidas`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
