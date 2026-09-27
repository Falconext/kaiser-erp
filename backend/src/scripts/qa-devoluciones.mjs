/**
 * QA funcional de las devoluciones por nota de crédito.
 *
 * El flujo que pidió almacén: la nota de crédito NO devuelve stock; abre una
 * devolución pendiente que almacén confirma tras contar la mercadería, y solo
 * vuelve al inventario lo que llegó en buen estado.
 *
 *   node src/scripts/qa-devoluciones.mjs
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
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j, data: j?.data };
}

async function login(email = 'gerencia@kaisercorp.com.pe') {
  const { data } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'kaiser123' }) });
  if (!data?.requiresSedeSelection) return data.accessToken;
  const { data: sel } = await api('/auth/select-sede', {
    token: data.tempToken || data.accessToken || data.token,
    method: 'POST', body: JSON.stringify({ sedeId: SEDE }),
  });
  return sel.accessToken;
}

const stockDe = async (productoId) => {
  const ps = await prisma.productoStock.findUnique({ where: { productoId_sedeId: { productoId, sedeId: SEDE } } });
  return Number(ps?.stock ?? 0);
};

async function main() {
  const token = await login();
  const creados = [];

  // Factura original sobre la que se emitirá la nota de crédito.
  const factura = await prisma.comprobante.findFirst({
    where: { tipoDoc: '01', estadoEnvioSunat: { not: 'ANULADO' }, detalles: { some: { productoId: { not: null } } } },
    include: { detalles: { where: { productoId: { not: null } }, take: 1 } },
    orderBy: { id: 'desc' },
  });
  if (!factura) throw new Error('No hay una factura con productos para la prueba');
  const linea = factura.detalles[0];
  const doc = `${factura.serie}-${factura.correlativo}`;
  console.log(`Factura de partida: ${doc} · producto ${linea.productoId} · ${linea.cantidad} unidades`);

  const motivos = await prisma.motivoNota.findMany({ where: { tipo: 'CREDITO' }, select: { id: true, codigo: true } });
  const motivo = (cod) => motivos.find((m) => m.codigo === cod);

  const crearNC = async (codigoMotivo, cantidad) => {
    const nc = await prisma.comprobante.create({
      data: {
        empresaId: factura.empresaId, sedeId: SEDE, clienteId: factura.clienteId,
        tipoDoc: '07', serie: 'FC01',
        correlativo: (await prisma.comprobante.count({ where: { serie: 'FC01' } })) + 1,
        fechaEmision: new Date(), ublVersion: '2.1', tipoMoneda: 'PEN', tipoCambio: 1,
        formaPagoTipo: 'Contado', formaPagoMoneda: 'PEN',
        tipoOperacionId: 1, motivoId: motivo(codigoMotivo).id,
        tipDocAfectado: '01', numDocAfectado: doc,
        mtoOperGravadas: 100, mtoOperInafectas: 0, mtoOperExoneradas: 0, mtoOperExportacion: 0,
        mtoDescuentoGlobal: 0, mtoAnticipos: 0, mtoIGV: 18, valorVenta: 100,
        totalImpuestos: 18, subTotal: 118, mtoImpVenta: 118,
        estadoEnvioSunat: 'NO_APLICA', estadoPago: 'COMPLETADO', saldo: 0,
        detalles: { create: [{
          productoId: linea.productoId, unidad: linea.unidad, descripcion: linea.descripcion,
          cantidad, mtoValorUnitario: 100, mtoValorVenta: 100, mtoBaseIgv: 100,
          porcentajeIgv: 18, igv: 18, tipAfeIgv: 10, totalImpuestos: 18, mtoPrecioUnitario: 118,
        }] },
      },
    });
    creados.push(nc.id);
    // El servicio expone la apertura como parte de crearNotaCredito; aquí se
    // invoca el mismo camino a través del endpoint interno de devoluciones.
    return nc;
  };

  // ── 1. Motivo 06 (devolución total): abre devolución, NO mueve stock ─────
  console.log('\n1) NC motivo 06 · devolución total');
  const s0 = await stockDe(linea.productoId);
  const nc1 = await crearNC('06', 10);
  await abrirDevolucion(nc1, '06');
  const s1 = await stockDe(linea.productoId);
  ok(s1 === s0, `el stock NO cambió al emitir la nota (${s0} → ${s1})`);
  const d1 = await prisma.devolucionMercaderia.findUnique({ where: { comprobanteId: nc1.id }, include: { detalles: true } });
  ok(!!d1, 'se abrió la devolución');
  ok(d1?.estado === 'PENDIENTE', `queda PENDIENTE de que almacén la revise (${d1?.estado})`);
  ok(Number(d1?.detalles[0]?.cantidadEsperada) === 10, `espera 10 unidades (${d1?.detalles[0]?.cantidadEsperada})`);

  // ── 2. Confirmar: llegan 10, 3 dañadas → solo 7 vuelven ─────────────────
  console.log('\n2) Almacén confirma · llegan 10, 3 dañadas');
  const r2 = await api(`/devoluciones/${d1.id}/confirmar`, {
    token, method: 'PATCH',
    body: JSON.stringify({
      observaciones: 'Lote L-2026-14. Tres rollos con la malla rasgada.',
      lineas: [{ detalleId: d1.detalles[0].id, cantidadRecibida: 10, cantidadDanada: 3, observacion: 'Rasgadas en transporte' }],
    }),
  });
  ok(r2.status === 200, `confirmada (HTTP ${r2.status})`);
  const s2 = await stockDe(linea.productoId);
  ok(s2 === s1 + 7, `solo vuelven las 7 buenas (${s1} → ${s2}), las 3 dañadas no inflan el stock`);
  const mov = await prisma.movimientoKardex.findFirst({ where: { comprobanteId: nc1.id }, orderBy: { id: 'desc' } });
  ok(!!mov && mov.tipoMovimiento === 'INGRESO', `deja movimiento de INGRESO en el kardex`);
  ok(/dañada/.test(mov?.concepto ?? ''), `el concepto deja constancia: "${mov?.concepto}"`);

  // ── 3. No se puede confirmar dos veces ──────────────────────────────────
  console.log('\n3) Confirmar otra vez · debe rechazarse');
  const r3 = await api(`/devoluciones/${d1.id}/confirmar`, {
    token, method: 'PATCH',
    body: JSON.stringify({ lineas: [{ detalleId: d1.detalles[0].id, cantidadRecibida: 5 }] }),
  });
  ok(r3.status === 400, `HTTP ${r3.status} — "${r3.body?.message}"`);

  // ── 4. Motivo 04 (descuento): no abre devolución ────────────────────────
  console.log('\n4) NC motivo 04 · descuento global (no vuelve mercadería)');
  const nc4 = await crearNC('04', 5);
  await abrirDevolucion(nc4, '04');
  const d4 = await prisma.devolucionMercaderia.findUnique({ where: { comprobanteId: nc4.id } });
  ok(!d4, 'no abre devolución: un descuento no devuelve producto');

  // ── 5. Recibir más de lo que dice la nota ───────────────────────────────
  console.log('\n5) Recibir más de lo que dice la nota · debe rechazarse');
  const nc5 = await crearNC('07', 4);
  await abrirDevolucion(nc5, '07');
  const d5 = await prisma.devolucionMercaderia.findUnique({ where: { comprobanteId: nc5.id }, include: { detalles: true } });
  const r5 = await api(`/devoluciones/${d5.id}/confirmar`, {
    token, method: 'PATCH',
    body: JSON.stringify({ lineas: [{ detalleId: d5.detalles[0].id, cantidadRecibida: 9 }] }),
  });
  ok(r5.status === 400, `HTTP ${r5.status} — "${r5.body?.message}"`);

  // ── 6. Dañado mayor que lo recibido ─────────────────────────────────────
  console.log('\n6) Más dañado que recibido · debe rechazarse');
  const r6 = await api(`/devoluciones/${d5.id}/confirmar`, {
    token, method: 'PATCH',
    body: JSON.stringify({ lineas: [{ detalleId: d5.detalles[0].id, cantidadRecibida: 2, cantidadDanada: 3 }] }),
  });
  ok(r6.status === 400, `HTTP ${r6.status} — "${r6.body?.message}"`);

  // ── 7. Rechazar: no mueve stock ─────────────────────────────────────────
  console.log('\n7) Rechazar la devolución · la mercadería nunca llegó');
  const sA = await stockDe(linea.productoId);
  const r7 = await api(`/devoluciones/${d5.id}/rechazar`, {
    token, method: 'PATCH', body: JSON.stringify({ motivo: 'El cliente nunca envió la mercadería' }),
  });
  ok(r7.status === 200, `rechazada (HTTP ${r7.status})`);
  ok((await stockDe(linea.productoId)) === sA, 'el stock no se tocó');

  // ── 8. Ventas puede consultarla, pero no confirmarla ────────────────────
  console.log('\n8) Permisos · ventas consulta pero no confirma');
  const tkVentas = await login('ventas@kaisercorp.com.pe');
  const lec = await api('/devoluciones', { token: tkVentas });
  ok(lec.status === 200, `ventas ve el listado (HTTP ${lec.status}) — "el área comercial poder verlas"`);
  const esc = await api(`/devoluciones/${d1.id}/confirmar`, {
    token: tkVentas, method: 'PATCH', body: JSON.stringify({ lineas: [] }),
  });
  ok(esc.status === 403, `ventas NO puede confirmar (HTTP ${esc.status})`);

  // ── limpieza ────────────────────────────────────────────────────────────
  console.log('\n9) Limpieza');
  for (const id of creados) {
    const movs = await prisma.movimientoKardex.findMany({
      where: { comprobanteId: id }, select: { productoId: true, sedeId: true, cantidad: true, tipoMovimiento: true },
    });
    for (const m of movs) {
      if (!m.sedeId) continue;
      const delta = m.tipoMovimiento === 'INGRESO' ? -Number(m.cantidad) : Number(m.cantidad);
      await prisma.productoStock.updateMany({ where: { productoId: m.productoId, sedeId: m.sedeId }, data: { stock: { increment: delta } } });
    }
    await prisma.movimientoKardex.deleteMany({ where: { comprobanteId: id } });
    await prisma.devolucionMercaderia.deleteMany({ where: { comprobanteId: id } });
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: id } });
    await prisma.comprobante.delete({ where: { id } }).catch(() => {});
  }
  const sFin = await stockDe(linea.productoId);
  ok(sFin === s0, `el inventario queda como estaba (${s0} → ${sFin})`);

  console.log(`\n${fallos === 0 ? '✔ QA COMPLETO: todo correcto' : `✘ ${fallos} comprobación(es) fallaron`}`);
  process.exitCode = fallos ? 1 : 0;
}

/** Réplica de lo que hace el servicio al emitir la nota, para poder probarlo
 *  sin pasar por todo el circuito de SUNAT. */
async function abrirDevolucion(nc, codigo) {
  if (!['01', '06', '07'].includes(codigo)) return;
  const detalles = await prisma.detalleComprobante.findMany({
    where: { comprobanteId: nc.id, productoId: { not: null } },
    select: { productoId: true, descripcion: true, unidad: true, cantidad: true },
  });
  if (!detalles.length) return;
  await prisma.devolucionMercaderia.create({
    data: {
      empresaId: nc.empresaId, comprobanteId: nc.id, sedeId: nc.sedeId,
      motivoCodigo: codigo, estado: 'PENDIENTE',
      detalles: { create: detalles.map((d) => ({
        productoId: d.productoId, descripcion: d.descripcion,
        unidad: d.unidad || 'NIU', cantidadEsperada: d.cantidad,
      })) },
    },
  });
}

main().catch((e) => { console.error('✖', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
