/**
 * QA funcional · Fase 2 — Compras y recepción
 *
 * Recorre la cadena completa tal como la usa almacén: solicitud → cotizaciones
 * de proveedores → comparativo → orden de compra → recepción, y comprueba que
 * la recepción mueva el kardex, deje la cuenta por pagar y valorice bien.
 *
 * El caso que más importa es la compra en dólares: el kardex de Kaiser está en
 * soles, así que el costo tiene que entrar convertido. Y la anulación tiene que
 * salir al mismo valor al que entró, o el costo promedio del producto queda
 * torcido para siempre.
 *
 * Limpia todo lo que crea y restaura el stock y el costo del producto.
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
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j, data: j?.data };
}
async function login(email = 'gerencia@kaisercorp.com.pe') {
  const { data } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'kaiser123' }) });
  if (!data?.requiresSedeSelection) return data.accessToken;
  const { data: sel } = await api('/auth/select-sede', { token: data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  return sel.accessToken;
}

/** Saldo del último movimiento de kardex del producto en la sede. */
async function saldoKardex(productoId) {
  const m = await prisma.movimientoKardex.findFirst({
    where: { productoId, sedeId: SEDE }, orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    select: { stockActual: true },
  });
  return m ? Number(m.stockActual) : null;
}
async function stockSede(productoId) {
  const ps = await prisma.productoStock.findFirst({ where: { productoId, sedeId: SEDE }, select: { stock: true } });
  return ps ? Number(ps.stock) : 0;
}

async function main() {
  const token = await login();
  const marca = `[QA-F2-${Date.now()}]`;
  const creado = { solicitudes: [], ordenes: [], compras: [] };

  // Un producto real del catálogo y un proveedor real del padrón.
  const prod = await prisma.producto.findFirst({
    where: { empresaId: { not: null } }, orderBy: { id: 'asc' },
    select: { id: true, codigo: true, descripcion: true, stock: true, costoPromedio: true, empresaId: true },
  });
  const prov = await prisma.cliente.findFirst({
    where: { persona: 'PROVEEDOR' }, select: { id: true, nombre: true },
  }) ?? await prisma.cliente.findFirst({ select: { id: true, nombre: true } });

  const estadoInicial = {
    stockGlobal: Number(prod.stock),
    costoPromedio: Number(prod.costoPromedio ?? 0),
    stockSede: await stockSede(prod.id),
    saldoKardex: await saldoKardex(prod.id),
  };
  console.log(`Producto de prueba: ${prod.codigo} · ${prod.descripcion}`);
  console.log(`Proveedor: ${prov.nombre}`);
  console.log(`Estado inicial · stock sede ${estadoInicial.stockSede} · costo prom. ${S(estadoInicial.costoPromedio)}\n`);

  try {
    // ── 1. Solicitud de compra ────────────────────────────────────────────
    console.log('1) Solicitud de compra');
    const sol = await api('/compras/solicitudes', {
      token, method: 'POST',
      body: JSON.stringify({
        sedeId: SEDE, area: 'ALMACEN', motivo: `${marca} reposición de stock`,
        items: [{ productoId: prod.id, descripcion: prod.descripcion, cantidad: 100, unidad: 'KGM' }],
      }),
    });
    ok(sol.status === 201 || sol.status === 200, `creada (HTTP ${sol.status})`);
    const solId = sol.data?.id;
    if (!solId) throw new Error(`no se pudo crear la solicitud: ${JSON.stringify(sol.body).slice(0, 300)}`);
    creado.solicitudes.push(solId);
    const itemId = sol.data.items?.[0]?.id;
    ok(!!itemId, `con 1 ítem (id ${itemId})`);

    // Aprobar y seguir cotizando: es el orden que tiene sentido para almacén
    // —se autoriza la compra y luego se piden precios— y el que antes dejaba la
    // solicitud sin salida.
    const apr = await api(`/compras/solicitudes/${solId}/estado`, {
      token, method: 'PATCH', body: JSON.stringify({ estado: 'APROBADA' }),
    });
    ok(apr.status === 200, `aprobada (HTTP ${apr.status})`);

    // ── 2. Comparativo de proveedores ─────────────────────────────────────
    console.log('\n2) Cotizaciones de proveedores y comparativo');
    const caro = await api(`/compras/solicitudes/${solId}/cotizaciones`, {
      token, method: 'POST',
      body: JSON.stringify({ proveedorId: prov.id, referencia: `${marca} caro`, moneda: 'PEN', plazoEntregaDias: 5,
        items: [{ solicitudItemId: itemId, precioUnitario: 9.0, cantidad: 100 }] }),
    });
    const barato = await api(`/compras/solicitudes/${solId}/cotizaciones`, {
      token, method: 'POST',
      body: JSON.stringify({ proveedorId: prov.id, referencia: `${marca} barato`, moneda: 'PEN', plazoEntregaDias: 12,
        items: [{ solicitudItemId: itemId, precioUnitario: 7.5, cantidad: 100 }] }),
    });
    ok(caro.status < 300 && barato.status < 300, `2 cotizaciones registradas (${caro.status}, ${barato.status})`);
    if (caro.status >= 400) console.log(`      motivo: ${JSON.stringify(caro.body).slice(0, 400)}`);

    const comp = await api(`/compras/solicitudes/${solId}/comparativo`, { token });
    ok(comp.status === 200, `comparativo responde (HTTP ${comp.status})`);
    const provs = comp.data?.proveedores ?? [];
    ok(provs.length === 2, `compara ${provs.length} cotizaciones`);
    // Lo que se le pide al comparativo es señalar la mejor, no solo listarlas:
    // esa marca es la que la pantalla usa para resaltar la fila.
    const mejor = provs.filter((p) => p.esMejorTotal);
    const barataReal = provs.reduce((a, b) => (a.totalPen <= b.totalPen ? a : b));
    ok(mejor.length === 1, `marca una sola como mejor total (${mejor.length})`);
    ok(mejor[0]?.cotizacionId === barataReal.cotizacionId,
      `la marcada es de verdad la más barata: ${provs.map((p) => S(p.totalPen)).join(' vs ')}`);
    // Todo el comparativo se expresa en soles, o comparar dos monedas no tiene sentido.
    ok(provs.every((p) => p.totalPen > 0), 'todas traen total en soles (totalPen)');

    const idBarato = barato.data?.id;
    const sel = await api(`/compras/solicitudes/${solId}/seleccionar`, {
      token, method: 'POST', body: JSON.stringify({ cotizacionId: idBarato, lugarEntrega: 'Almacén principal' }),
    });
    ok(sel.status < 300, `se elige la más barata y se genera la orden (HTTP ${sel.status})`);
    const ordenId = sel.data?.ordenCompra?.id ?? sel.data?.id ?? sel.data?.ordenId;
    ok(!!ordenId, `orden de compra ${ordenId}`);
    if (ordenId) creado.ordenes.push(ordenId);

    const orden = await prisma.ordenCompra.findUnique({ where: { id: ordenId }, include: { detalles: true } });
    ok(Number(orden?.detalles?.[0]?.precioUnitario) === 7.5,
      `la orden hereda el precio de la cotización elegida: ${S(orden?.detalles?.[0]?.precioUnitario)}`);

    // ── 3. Recepción: kardex y cuenta por pagar ───────────────────────────
    console.log('\n3) Recepción de la orden');
    const antesStock = await stockSede(prod.id);
    const rec = await api(`/compras/ordenes/${ordenId}/recibir`, {
      token, method: 'POST',
      body: JSON.stringify({
        tipoDoc: 'FACTURA', serie: 'F999', numero: String(Date.now()).slice(-6),
        fechaEmision: new Date().toISOString().slice(0, 10),
        fechaVencimiento: new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10),
        sedeId: SEDE, formaPago: 'CREDITO',
      }),
    });
    ok(rec.status < 300, `recibida (HTTP ${rec.status})`);
    const compraId = rec.data?.compra?.id;
    ok(!!compraId, `generó la compra ${compraId}`);
    if (compraId) creado.compras.push(compraId);

    const ordenTras = await prisma.ordenCompra.findUnique({ where: { id: ordenId } });
    ok(ordenTras?.estado === 'RECIBIDA', `la orden queda en ${ordenTras?.estado}`);

    const mov = await prisma.movimientoKardex.findFirst({
      where: { compraId, productoId: prod.id },
      select: { tipoMovimiento: true, cantidad: true, costoUnitario: true, stockActual: true },
    });
    ok(!!mov, 'la recepción movió el kardex');
    ok(mov?.tipoMovimiento === 'INGRESO', `movimiento de tipo ${mov?.tipoMovimiento}`);
    ok(Number(mov?.cantidad) === 100, `cantidad ${mov?.cantidad}`);
    ok(Number(mov?.costoUnitario) === 7.5, `costo unitario en kardex ${S(mov?.costoUnitario)} (pactado S/ 7.50)`);
    const despuesStock = await stockSede(prod.id);
    ok(despuesStock === antesStock + 100, `stock de sede ${antesStock} → ${despuesStock}`);
    ok((await saldoKardex(prod.id)) === despuesStock, 'el saldo del kardex coincide con el stock de la sede');

    const compra = await prisma.compra.findUnique({ where: { id: compraId } });
    ok(Number(compra.total) > 0, `total de la compra ${S(compra.total)}`);
    ok(Number(compra.saldo) === Number(compra.total), `a crédito: saldo = total (${S(compra.saldo)})`);
    ok(!!compra.fechaVencimiento, `con fecha de vencimiento ${compra.fechaVencimiento?.toISOString().slice(0, 10)}`);
    ok(compra.estadoPago === 'PENDIENTE_PAGO', `estado de pago ${compra.estadoPago}`);

    // No se puede recibir dos veces la misma orden.
    const rec2 = await api(`/compras/ordenes/${ordenId}/recibir`, {
      token, method: 'POST',
      body: JSON.stringify({ tipoDoc: 'FACTURA', serie: 'F999', numero: '999999', fechaEmision: new Date().toISOString().slice(0, 10) }),
    });
    ok(rec2.status >= 400, `recibir dos veces se rechaza (HTTP ${rec2.status})`);

    // ── 4. Compra en dólares: el kardex va en soles ───────────────────────
    console.log('\n4) Compra en dólares (el kardex de Kaiser va en soles)');
    const TC = 3.75, PRECIO_USD = 10;
    const antesUsd = await stockSede(prod.id);
    const cUsd = await api('/compras', {
      token, method: 'POST',
      body: JSON.stringify({
        proveedorId: prov.id, tipoDoc: 'FACTURA', serie: 'F998', numero: String(Date.now()).slice(-6),
        fechaEmision: new Date().toISOString().slice(0, 10), moneda: 'USD', tipoCambio: TC,
        sedeId: SEDE, observaciones: `${marca} compra en dólares`,
        detalles: [{ productoId: prod.id, descripcion: prod.descripcion, cantidad: 50, precioUnitario: PRECIO_USD, incluyeIgv: false }],
      }),
    });
    ok(cUsd.status < 300, `compra en USD creada (HTTP ${cUsd.status})`);
    const compraUsdId = cUsd.data?.id;
    if (compraUsdId) creado.compras.push(compraUsdId);

    const movUsd = await prisma.movimientoKardex.findFirst({
      where: { compraId: compraUsdId, productoId: prod.id },
      select: { id: true, costoUnitario: true, cantidad: true },
    });
    const esperado = PRECIO_USD * TC;
    ok(Number(movUsd?.costoUnitario) === esperado,
      `el ingreso entra a ${S(movUsd?.costoUnitario)} (USD ${PRECIO_USD} × TC ${TC} = ${S(esperado)})`);

    // ── 5. Anulación: tiene que salir al mismo valor al que entró ─────────
    console.log('\n5) Anulación de la compra en dólares');
    const an = await api(`/compras/${compraUsdId}`, { token, method: 'DELETE' });
    ok(an.status < 300, `anulada (HTTP ${an.status})`);
    const movSalida = await prisma.movimientoKardex.findFirst({
      where: { compraId: compraUsdId, tipoMovimiento: 'SALIDA', productoId: prod.id },
      orderBy: { id: 'desc' }, select: { costoUnitario: true, cantidad: true },
    });
    ok(!!movSalida, 'la anulación registró el movimiento compensatorio');
    ok(Number(movSalida?.cantidad) === Number(movUsd?.cantidad),
      `sale la misma cantidad que entró (${movSalida?.cantidad})`);
    ok(Number(movSalida?.costoUnitario) === Number(movUsd?.costoUnitario),
      `sale al mismo valor que entró: entró ${S(movUsd?.costoUnitario)}, salió ${S(movSalida?.costoUnitario)}`);
    const trasAnular = await stockSede(prod.id);
    ok(trasAnular === antesUsd, `el stock vuelve a ${antesUsd} (quedó en ${trasAnular})`);

    // ── 6. Cuentas por pagar ──────────────────────────────────────────────
    console.log('\n6) Cuentas por pagar');
    const cxp = await api('/compras?estadoPago=PENDIENTE_PAGO&limit=200', { token });
    ok(cxp.status === 200, `listado responde (HTTP ${cxp.status})`);
    const lista = cxp.data?.items ?? cxp.data?.data ?? (Array.isArray(cxp.data) ? cxp.data : []);
    const mia = lista.find((c) => c.id === compraId);
    ok(!!mia, 'la compra a crédito aparece entre las pendientes de pago');
    const anuladaEnLista = lista.find((c) => c.id === compraUsdId);
    ok(!anuladaEnLista, 'la compra anulada ya no figura como pendiente de pago');

    const pago = await api(`/compras/${compraId}/pagos`, {
      token, method: 'POST',
      body: JSON.stringify({ monto: 100, metodoPago: 'TRANSFERENCIA', fecha: new Date().toISOString().slice(0, 10) }),
    });
    ok(pago.status < 300, `pago parcial registrado (HTTP ${pago.status})`);
    const tras = await prisma.compra.findUnique({ where: { id: compraId } });
    ok(Math.abs(Number(tras.saldo) - (Number(compra.total) - 100)) < 0.01,
      `el saldo baja a ${S(tras.saldo)} (total ${S(compra.total)} − 100)`);
    ok(tras.estadoPago === 'PAGO_PARCIAL', `estado de pago tras el abono: ${tras.estadoPago}`);
  } finally {
    // ── Limpieza ───────────────────────────────────────────────────────────
    console.log('\n7) Limpieza');
    for (const id of creado.compras) {
      await prisma.movimientoKardex.deleteMany({ where: { compraId: id } });
      await prisma.pagoCompra.deleteMany({ where: { compraId: id } });
      await prisma.detalleCompra.deleteMany({ where: { compraId: id } });
      await prisma.compraDocumento.deleteMany({ where: { compraId: id } });
      await prisma.ordenCompra.updateMany({ where: { compraId: id }, data: { compraId: null } });
      await prisma.compra.deleteMany({ where: { id } });
    }
    for (const id of creado.ordenes) {
      await prisma.detalleOrdenCompra.deleteMany({ where: { ordenCompraId: id } });
      await prisma.ordenCompra.deleteMany({ where: { id } });
    }
    for (const id of creado.solicitudes) {
      const cots = await prisma.cotizacionProveedor.findMany({ where: { solicitudId: id }, select: { id: true } });
      await prisma.cotizacionProveedorItem.deleteMany({ where: { cotizacionId: { in: cots.map((c) => c.id) } } });
      await prisma.cotizacionProveedor.deleteMany({ where: { solicitudId: id } });
      await prisma.solicitudCompraItem.deleteMany({ where: { solicitudId: id } });
      await prisma.solicitudCompra.deleteMany({ where: { id } });
    }
    // Devolver el producto a como estaba: stock, costo y saldo de sede.
    await prisma.producto.update({
      where: { id: prod.id },
      data: { stock: estadoInicial.stockGlobal, costoPromedio: estadoInicial.costoPromedio },
    });
    await prisma.productoStock.updateMany({
      where: { productoId: prod.id, sedeId: SEDE }, data: { stock: estadoInicial.stockSede },
    });
    const fin = {
      stockSede: await stockSede(prod.id),
      saldoKardex: await saldoKardex(prod.id),
      costo: Number((await prisma.producto.findUnique({ where: { id: prod.id }, select: { costoPromedio: true } })).costoPromedio),
    };
    ok(fin.stockSede === estadoInicial.stockSede, `stock de sede restaurado a ${fin.stockSede}`);
    ok(fin.costo === estadoInicial.costoPromedio, `costo promedio restaurado a ${S(fin.costo)}`);
    ok(fin.saldoKardex === estadoInicial.saldoKardex,
      `último saldo del kardex restaurado a ${fin.saldoKardex}`);
    await prisma.$disconnect();
  }

  console.log(fallos === 0 ? '\n✔ FASE 2 COMPLETA: todo correcto' : `\n✘ FASE 2: ${fallos} comprobaciones fallidas`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
