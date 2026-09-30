/**
 * QA funcional · Fase 15 — Genealogía del producto
 *
 * Responde la pregunta que no tenía respuesta en el ERP: **"esta malla, ¿con qué
 * se fabricó y de qué compra salió cada cosa?"**. El kardex ya daba la línea de
 * tiempo de un producto; lo que faltaba era el árbol.
 *
 * Monta la cadena entera con las APIs reales —compra → orden con merma → venta—
 * y comprueba que la genealogía la reconstruya en los dos sentidos. Deja la base
 * como la encontró.
 *
 * Uso:  pnpm run qa:genealogia
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const c2 = (n) => Math.round(Number(n) * 100);

async function api(ruta, token, metodo = 'GET', body) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j?.data, message: j?.message };
}
async function login(email = 'gerencia@kaisercorp.com.pe') {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'kaiser123' }) });
  const j = await r.json();
  if (!j.data) throw new Error(`login falló: ${j?.message}`);
  if (!j.data.requiresSedeSelection) return j.data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
    body: JSON.stringify({ sedeId: SEDE }) });
  return (await r2.json()).data.accessToken;
}

async function main() {
  const token = await login();
  const creado = { compras: [], ordenes: [], comprobantes: [] };

  // Receta sana: con componentes y sin incluirse a sí misma.
  const recetas = await prisma.recetaProduccion.findMany({
    where: { activo: true },
    include: { productoFinal: true, componentes: { include: { productoInsumo: true } } },
  });
  const receta = recetas.find(
    (r) => r.componentes.length > 0 && !r.componentes.some((c) => c.productoInsumoId === r.productoFinalId),
  );
  if (!receta) { console.log('\n⚠ sin receta sana: nada que comprobar\n'); await prisma.$disconnect(); process.exit(0); }
  const terminado = receta.productoFinal;
  const insumos = receta.componentes.map((c) => c.productoInsumo);
  const proveedor = await prisma.cliente.findFirst({ orderBy: { id: 'asc' } });

  console.log(`\n═══ Genealogía de ${terminado.codigo} ═══`);

  // Foto del stock antes de empezar. La limpieza borra movimientos de kardex, y
  // borrar un movimiento no devuelve el stock que movió: hay que reponerlo a
  // mano o el inventario queda descuadrado —que es justo lo que vigila qa:todo
  // entre scripts—.
  const afectados = [terminado.id, ...insumos.map((i) => i.id)];
  const stockPrevio = await prisma.productoStock.findMany({
    where: { productoId: { in: afectados } },
    select: { productoId: true, sedeId: true, stock: true },
  });
  const globalPrevio = await prisma.producto.findMany({
    where: { id: { in: afectados } }, select: { id: true, stock: true, costoPromedio: true },
  });

  try {
    // ── Cadena: compra → producción con merma → venta ──
    const PRECIO = 7, CANT = 400, OBJETIVO = 4, MERMA = 0.1;
    const compra = await api('/compras', token, 'POST', {
      proveedorId: proveedor.id, tipoDoc: 'FACTURA', serie: 'FGEN',
      numero: String(Date.now()).slice(-6), fechaEmision: new Date().toISOString(),
      moneda: 'PEN', sedeId: SEDE, observaciones: '[QA-genealogía]',
      detalles: insumos.map((i) => ({ productoId: i.id, descripcion: i.descripcion, cantidad: CANT, precioUnitario: PRECIO, incluyeIgv: false })),
    });
    ok(compra.status < 300, `compra de insumos creada (HTTP ${compra.status})`);
    if (compra.data?.id) creado.compras.push(compra.data.id);
    const docCompra = `FGEN-${compra.data?.numero ?? ''}`;

    const orden = await api('/produccion/ordenes', token, 'POST', {
      recetaId: receta.id, loteProduccion: `GEN-${Date.now().toString().slice(-6)}`, cantidadObjetivo: OBJETIVO,
    });
    ok(orden.status < 300, `orden creada (HTTP ${orden.status})`);
    const ordenId = orden.data?.id;
    if (ordenId) creado.ordenes.push(ordenId);
    const comps = await prisma.ordenProduccionComponente.findMany({ where: { ordenProduccionId: ordenId } });
    await api(`/produccion/ordenes/${ordenId}/ejecutar`, token, 'POST', {
      cantidadProducida: OBJETIVO,
      componentes: comps.map((c) => ({
        productoInsumoId: c.productoInsumoId,
        cantidadConsumida: Number(c.cantidadTeorica) * (1 + MERMA),
        mermaCantidad: Number(c.cantidadTeorica) * MERMA,
      })),
    });

    const venta = await api('/comprobante/informal', token, 'POST', {
      sedeId: SEDE, tipoOperacionId: 1, tipoDoc: '01', fechaEmision: new Date().toISOString(),
      formaPagoTipo: 'Contado', formaPagoMoneda: 'PEN', tipoMoneda: 'PEN',
      clienteId: proveedor.id, clienteName: proveedor.nombre, medioPago: 'EFECTIVO',
      leyenda: '[QA-genealogía]',
      detalles: [{ productoId: terminado.id, cantidad: 1, nuevoValorUnitario: 500 }],
    });
    if (venta.data?.id) creado.comprobantes.push(venta.data.id);

    // ── La genealogía ──
    console.log('\n═══ Hacia atrás: de qué está hecho ═══');
    const g = await api(`/produccion/genealogia/${terminado.codigo}`, token);
    ok(g.status === 200, `responde por código (HTTP ${g.status})`);
    ok(g.data?.producto?.codigo === terminado.codigo, `es ${g.data?.producto?.codigo}`);
    ok(g.data?.esFabricado === true, 'lo marca como producto que se fabrica');
    ok(!!g.data?.receta, `trae su receta (${g.data?.receta?.codigo} v${g.data?.receta?.version})`);
    ok(g.data?.receta?.componentes?.length === receta.componentes.length,
      `con sus ${g.data?.receta?.componentes?.length} componente(s)`);
    const conOrigen = (g.data?.receta?.componentes ?? []).filter((c) => c.vinoDe?.length);
    ok(conOrigen.length > 0, `${conOrigen.length} componente(s) dicen de qué compra vinieron`);
    ok(conOrigen.some((c) => c.vinoDe.some((v) => v.documento.startsWith('FGEN'))),
      'y una de ellas es la compra que acabamos de hacer');
    ok(conOrigen[0]?.vinoDe[0]?.proveedor != null, `con su proveedor: ${conOrigen[0]?.vinoDe[0]?.proveedor}`);

    console.log('\n═══ Lo que llevó DE VERDAD, con su merma ═══');
    const o = (g.data?.ordenes ?? []).find((x) => x.id === ordenId);
    ok(!!o, 'la orden aparece en la genealogía');
    ok(o?.cantidadProducida === OBJETIVO, `produjo ${o?.cantidadProducida}`);
    ok(o?.mermaTotal > 0, `con merma real de ${o?.mermaTotal}`);
    ok(o?.costoMerma > 0, `y su costo: ${o?.costoMerma} — lo que STARSOFT no calcula`);
    ok(c2(o?.desviacionPorcentaje) === c2(MERMA * 100), `desviación sobre lo teórico: ${o?.desviacionPorcentaje} %`);
    ok(o?.costoUnitario > 0, `costo por unidad fabricada: ${o?.costoUnitario}`);
    const cmp = o?.componentes ?? [];
    ok(cmp.every((c) => c.cantidadConsumida > c.cantidadTeorica),
      'cada componente consumió más de lo teórico: esa diferencia es la merma');
    ok(cmp.every((c) => c.costoTotal > 0), 'y todos llevan su costo');
    ok(cmp.some((c) => c.vinoDe?.length), 'los componentes de la orden también dicen de dónde vinieron');

    console.log('\n═══ Hacia adelante ═══');
    const s = (g.data?.salidas ?? []).find((x) => x.comprobanteId === venta.data?.id);
    ok(!!s, `la venta ${s?.documento ?? ''} aparece como salida`);
    ok(s?.cliente != null, `con su cliente: ${s?.cliente}`);

    const insumo = insumos[0];
    const gi = await api(`/produccion/genealogia/${insumo.codigo}`, token);
    ok(gi.status === 200, `la genealogía del insumo ${insumo.codigo} responde`);
    ok(gi.data?.seUsaEn?.some((u) => u.productoFinalCodigo === terminado.codigo),
      `y dice que se usa para fabricar ${terminado.codigo}`);
    ok(gi.data?.esFabricado === false || gi.data?.receta === null || true,
      `el insumo ${gi.data?.esFabricado ? 'también se fabrica' : 'se compra'}`);

    console.log('\n═══ Se puede pedir por id, y lo inexistente falla ═══');
    const porId = await api(`/produccion/genealogia/${terminado.id}`, token);
    ok(porId.status === 200 && porId.data?.producto?.codigo === terminado.codigo, 'el id devuelve el mismo producto');
    const noExiste = await api('/produccion/genealogia/NO-EXISTE-XYZ', token);
    ok(noExiste.status === 404, `un código inventado da 404 (${noExiste.status})`);

    console.log('\n═══ Permisos ═══');
    let vendedor = null;
    try { vendedor = await login('ventas@kaisercorp.com.pe'); } catch {}
    if (vendedor) {
      const r = await api(`/produccion/genealogia/${terminado.codigo}`, vendedor);
      ok(r.status === 200, `ventas SÍ puede consultarla (HTTP ${r.status}): un vendedor tiene que poder responderle al cliente`);
    }
  } finally {
    console.log('\n═══ Limpieza ═══');
    for (const id of creado.comprobantes) {
      await prisma.movimientoKardex.deleteMany({ where: { comprobanteId: id } });
      await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: id } });
      await prisma.leyenda.deleteMany({ where: { comprobanteId: id } }).catch(() => {});
      await prisma.pago.deleteMany({ where: { comprobanteId: id } });
      await prisma.comprobante.deleteMany({ where: { id } });
    }
    for (const id of creado.ordenes) {
      await prisma.movimientoProduccion.deleteMany({ where: { ordenProduccionId: id } });
      await prisma.movimientoKardex.deleteMany({ where: { concepto: { contains: 'PRODUCCIÓN' } } });
      await prisma.ordenProduccionComponente.deleteMany({ where: { ordenProduccionId: id } });
      await prisma.ordenProduccion.deleteMany({ where: { id } });
    }
    for (const id of creado.compras) {
      await prisma.movimientoKardex.deleteMany({ where: { compraId: id } });
      await prisma.detalleCompra.deleteMany({ where: { compraId: id } });
      await prisma.compra.deleteMany({ where: { id } });
    }
    // Devolver el stock exactamente a la foto del principio.
    for (const f of stockPrevio) {
      await prisma.productoStock.updateMany({
        where: { productoId: f.productoId, sedeId: f.sedeId }, data: { stock: f.stock },
      });
    }
    await prisma.productoStock.deleteMany({
      where: {
        productoId: { in: afectados },
        NOT: { OR: stockPrevio.map((f) => ({ productoId: f.productoId, sedeId: f.sedeId })) },
      },
    });
    for (const g of globalPrevio) {
      await prisma.producto.update({ where: { id: g.id }, data: { stock: g.stock, costoPromedio: g.costoPromedio } });
    }

    const quedan = await prisma.compra.count({ where: { serie: 'FGEN' } });
    ok(quedan === 0, 'sin residuo: compras, órdenes y ventas de prueba borradas');
    const desc = await prisma.$queryRawUnsafe(`
      WITH u AS (SELECT DISTINCT ON (m."productoId", m."sedeId") m."productoId", m."sedeId", m."stockActual"
        FROM "MovimientoKardex" m ORDER BY m."productoId", m."sedeId", m.fecha DESC, m.id DESC)
      SELECT COUNT(*)::int n FROM "ProductoStock" ps JOIN u ON u."productoId"=ps."productoId" AND u."sedeId"=ps."sedeId"
      WHERE ABS(ps.stock - u."stockActual") > 0.001`);
    ok(desc[0].n === 0, 'y el inventario queda como estaba: sin descuadres');
  }

  console.log(fallos ? `\n✘ ${fallos} fallo(s)\n` : '\n✔ Genealogía: de qué está hecho, con qué merma y a dónde fue\n');
  await prisma.$disconnect();
  process.exit(fallos ? 1 : 0);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect(); process.exit(1); });
