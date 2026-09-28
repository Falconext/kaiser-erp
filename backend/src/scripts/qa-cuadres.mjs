/**
 * QA funcional · Fase 10 — Cuadres cruzados
 *
 * Cada número tiene que coincidir con el mismo número visto desde otro módulo. Es
 * donde aparecen los fallos que ninguna prueba de un módulo aislado encuentra: el
 * tipo de cambio que no se aplicaba al anular una compra y el valor de la merma que
 * se evaporaba en producción eran exactamente esto —cuadraban dentro de su módulo
 * y descuadraban al cruzarlos.
 *
 * SOLO LEE. No crea, no borra, no corrige nada: se puede correr contra producción.
 * Para corregir lo que encuentre está `pnpm run cuadres:corregir`.
 *
 * Uso:  pnpm run qa:cuadres            (mes actual)
 *       pnpm run qa:cuadres -- 8 2026  (mes y año concretos)
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0, avisos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const aviso = (m) => { console.log(`   ⚠ ${m}`); avisos++; };
const S = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** Tolerancia de un céntimo: los redondeos de IGV no son un descuadre. */
const cuadra = (a, b, tol = 0.05) => Math.abs(Number(a) - Number(b)) <= tol;
const uno = async (sql) => (await prisma.$queryRawUnsafe(sql))[0];

async function api(ruta, token) {
  const r = await fetch(API + ruta, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j?.data, body: j };
}
async function login() {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gerencia@kaisercorp.com.pe', password: 'kaiser123' }) });
  const j = await r.json();
  if (r.status >= 400 || !j.data) throw new Error(`login falló (HTTP ${r.status}): ${j?.message ?? ''}`);
  if (!j.data.requiresSedeSelection) return j.data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
    body: JSON.stringify({ sedeId: SEDE }) });
  const c = await r2.json();
  if (r2.status >= 400 || !c?.data?.accessToken) throw new Error(`select-sede falló (HTTP ${r2.status}): ${c?.message ?? ''}`);
  return c.data.accessToken;
}

async function main() {
  const token = await login();
  const hoy = new Date();
  const mes = Number(process.argv[2]) || hoy.getMonth() + 1;
  const anio = Number(process.argv[3]) || hoy.getFullYear();
  const desde = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const hasta = `${anio}-${String(mes).padStart(2, '0')}-${ultimoDia}`;
  // El día de Lima empieza a las 05:00 UTC; el rango en SQL usa esos límites.
  const rangoSql = `c."fechaEmision" >= '${desde}T05:00:00Z' AND c."fechaEmision" <= '${hasta}T23:59:59Z'::timestamp + interval '5 hours'`;
  console.log(`Cuadres cruzados · ${desde} a ${hasta}\n`);

  // ── 1. El inventario contra su propio kardex ────────────────────────────
  console.log('1) Inventario: el stock de cada sede es el último saldo de su kardex');
  const conMovs = await uno(`SELECT COUNT(DISTINCT ("productoId","sedeId"))::int n FROM "MovimientoKardex"`);
  const descuadres = await prisma.$queryRawUnsafe(`
    WITH ultimo AS (
      SELECT DISTINCT ON (m."productoId", m."sedeId")
             m."productoId", m."sedeId", m."stockActual", m.id AS "movId", m.concepto, m.fecha
      FROM "MovimientoKardex" m
      ORDER BY m."productoId", m."sedeId", m.fecha DESC, m.id DESC
    )
    SELECT pr.codigo, ps."sedeId", ps.stock AS tabla, u."stockActual" AS kardex, u."movId", u.concepto
    FROM "ProductoStock" ps
    JOIN ultimo u ON u."productoId" = ps."productoId" AND u."sedeId" = ps."sedeId"
    JOIN "Producto" pr ON pr.id = ps."productoId"
    WHERE ABS(ps.stock - u."stockActual") > 0.001
    ORDER BY ABS(ps.stock - u."stockActual") DESC`);
  ok(descuadres.length === 0,
    `${conMovs.n} combinaciones producto/sede con movimientos · descuadradas: ${descuadres.length}`);
  for (const d of descuadres.slice(0, 10)) {
    console.log(`      ${d.codigo} sede ${d.sedeId}: la tabla dice ${d.tabla}, su kardex dice ${d.kardex} (último mov #${d.movId})`);
  }

  console.log('\n2) El stock global del producto es la suma de sus sedes');
  const globales = await prisma.$queryRawUnsafe(`
    SELECT pr.codigo, pr.stock AS global, COALESCE(t.s, 0) AS sedes,
           (SELECT COUNT(*) FROM "MovimientoKardex" m WHERE m."productoId" = pr.id)::int movs
    FROM "Producto" pr
    LEFT JOIN (SELECT "productoId", SUM(stock) s FROM "ProductoStock" GROUP BY 1) t ON t."productoId" = pr.id
    WHERE ABS(pr.stock - COALESCE(t.s, 0)) > 0.001
    ORDER BY ABS(pr.stock - COALESCE(t.s, 0)) DESC`);
  ok(globales.length === 0, `productos con el campo global descuadrado: ${globales.length}`);
  for (const g of globales.slice(0, 6)) {
    console.log(`      ${g.codigo}: global ${g.global} · suma de sedes ${g.sedes} · diferencia ${Number(g.global) - Number(g.sedes)}`);
  }
  if (globales.length > 6) console.log(`      … y ${globales.length - 6} más`);

  const negativos = await uno(`SELECT COUNT(*)::int n FROM "ProductoStock" WHERE stock < 0`);
  ok(negativos.n === 0, `sedes con stock negativo: ${negativos.n}`);

  // ── 3. Ventas contra el P&L ─────────────────────────────────────────────
  console.log('\n3) Ventas del periodo = lo que dice el P&L');
  const pnl = await api(`/analisis-financiero/pnl?mes=${mes}&anio=${anio}`, token);
  ok(pnl.status === 200, `el P&L responde (HTTP ${pnl.status})`);
  // El P&L cuenta como venta todo documento que no sea cotización —las notas de
  // venta también venden— y excluye los informales ya convertidos, para no contar
  // dos veces la misma operación. Y suma el NETO, sin IGV: el impuesto no es
  // ingreso de la empresa, se cobra al cliente y se entrega a SUNAT.
  const neto = `(c."mtoOperGravadas" + COALESCE(c."mtoOperExoneradas",0) + COALESCE(c."mtoOperInafectas",0) + COALESCE(c."mtoOperExportacion",0))`;
  const enPen = `CASE WHEN c."tipoMoneda" = 'USD' AND COALESCE(c."tipoCambio",0) > 0 THEN c."tipoCambio" ELSE 1 END`;
  const noConvertido = `NOT EXISTS (SELECT 1 FROM "Comprobante" d WHERE d."comprobanteOrigenId" = c.id)`;
  const ventasBase = await uno(`
    SELECT COALESCE(SUM(${neto} * ${enPen}),0)::float neto, COUNT(*)::int n
    FROM "Comprobante" c
    WHERE c."tipoDoc" NOT IN ('COT','07') AND c."estadoEnvioSunat" <> 'ANULADO'
      AND ${noConvertido} AND ${rangoSql}`);
  const notas = await uno(`
    SELECT COALESCE(SUM(${neto} * ${enPen}),0)::float neto, COUNT(*)::int n
    FROM "Comprobante" c
    WHERE c."tipoDoc" = '07' AND c."estadoEnvioSunat" <> 'ANULADO' AND ${rangoSql}`);
  const ventasNetasEsperadas = ventasBase.neto - notas.neto;
  console.log(`   ${ventasBase.n} documentos de venta por ${S(ventasBase.neto)} · ${notas.n} notas de crédito por ${S(notas.neto)}`);
  console.log(`   el P&L dice ventas netas ${S(pnl.data?.ventasNetas ?? 0)}`);
  ok(cuadra(pnl.data?.ventasNetas ?? 0, ventasNetasEsperadas, 1),
    `cuadra con ${S(ventasNetasEsperadas)} (diferencia ${S((pnl.data?.ventasNetas ?? 0) - ventasNetasEsperadas)})`);
  // Y que no haya vuelto a colarse el IGV: el total con impuesto es otra cifra.
  const conIgv = await uno(`
    SELECT COALESCE(SUM(c."mtoImpVenta" * ${enPen}),0)::float total
    FROM "Comprobante" c
    WHERE c."tipoDoc" NOT IN ('COT','07') AND c."estadoEnvioSunat" <> 'ANULADO'
      AND ${noConvertido} AND ${rangoSql}`);
  ok(!cuadra(pnl.data?.ventasNetas ?? 0, conIgv.total, 1),
    `y NO es el total con IGV (${S(conIgv.total)}), que inflaría el ingreso un 18 %`);

  console.log('\n4) Costo de mercadería del P&L = salidas valorizadas del kardex');
  // Mismo universo de documentos que usa el P&L: todo salvo cotizaciones, sin los
  // informales ya convertidos. Si se compara solo contra facturas, falta el costo
  // de las notas de venta y la diferencia es del criterio, no del sistema.
  const salidas = await uno(`
    SELECT COALESCE(SUM(ABS(m.cantidad) * COALESCE(m."costoUnitario",0)),0)::float valor, COUNT(*)::int n
    FROM "MovimientoKardex" m
    JOIN "Comprobante" c ON c.id = m."comprobanteId"
    WHERE m."tipoMovimiento" = 'SALIDA'
      AND c."tipoDoc" NOT IN ('COT','07') AND c."estadoEnvioSunat" <> 'ANULADO'
      AND ${noConvertido} AND ${rangoSql}`);
  console.log(`   ${salidas.n} salidas de kardex por ventas, valorizadas en ${S(salidas.valor)}`);
  console.log(`   el P&L dice costo base ${S(pnl.data?.costoBaseProductos ?? 0)} (+ costos fijos ${S(pnl.data?.costosFijosProducto ?? 0)})`);
  // Ahora deben coincidir: el P&L costea con el costo que registró el kardex.
  ok(cuadra(pnl.data?.costoBaseProductos ?? 0, salidas.valor, 1),
    `cuadran (diferencia ${S((pnl.data?.costoBaseProductos ?? 0) - salidas.valor)})`);

  // ── 5. Cuentas por cobrar y por pagar ───────────────────────────────────
  console.log('\n5) Cuentas por cobrar: el saldo de cada comprobante = total − cobrado');
  const cxc = await prisma.$queryRawUnsafe(`
    SELECT c.serie, c.correlativo, c.saldo::float, c."mtoImpVenta"::float total, COALESCE(g.m,0)::float cobrado
    FROM "Comprobante" c
    LEFT JOIN (SELECT "comprobanteId", SUM(monto) m FROM "Pago" GROUP BY 1) g ON g."comprobanteId" = c.id
    WHERE c."tipoDoc" IN ('01','03') AND c."estadoEnvioSunat" <> 'ANULADO'
      AND ABS(COALESCE(c.saldo,0) - (COALESCE(c."mtoImpVenta",0) - COALESCE(g.m,0))) > 0.05`);
  ok(cxc.length === 0, `comprobantes con el saldo descuadrado: ${cxc.length}`);
  for (const c of cxc.slice(0, 5)) console.log(`      ${c.serie}-${c.correlativo}: saldo ${S(c.saldo)} · total ${S(c.total)} − cobrado ${S(c.cobrado)}`);

  console.log('\n6) Cuentas por pagar: el saldo de cada compra = total − pagado');
  const cxp = await prisma.$queryRawUnsafe(`
    SELECT c.serie, c.numero, c.saldo::float, c.total::float, COALESCE(g.m,0)::float pagado
    FROM "Compra" c
    LEFT JOIN (SELECT "compraId", SUM(monto) m FROM "PagoCompra" GROUP BY 1) g ON g."compraId" = c.id
    WHERE c.estado <> 'ANULADO'
      AND ABS(COALESCE(c.saldo,0) - (COALESCE(c.total,0) - COALESCE(g.m,0))) > 0.05`);
  ok(cxp.length === 0, `compras con el saldo descuadrado: ${cxp.length}`);
  for (const c of cxp.slice(0, 5)) console.log(`      ${c.serie}-${c.numero}: saldo ${S(c.saldo)} · total ${S(c.total)} − pagado ${S(c.pagado)}`);

  // ── 7. La cabecera de cada comprobante contra sus líneas ────────────────
  console.log('\n7) La cabecera de cada comprobante = la suma de sus líneas');
  const cabeceras = await prisma.$queryRawUnsafe(`
    SELECT c.serie, c.correlativo, c."mtoOperGravadas"::float cabecera, d.v::float lineas
    FROM "Comprobante" c
    JOIN (SELECT "comprobanteId", SUM("mtoValorVenta") v FROM "DetalleComprobante" GROUP BY 1) d ON d."comprobanteId" = c.id
    WHERE c."tipoDoc" IN ('01','03') AND ABS(COALESCE(c."mtoOperGravadas",0) - d.v) > 0.05`);
  ok(cabeceras.length === 0, `comprobantes cuya cabecera no cuadra con sus líneas: ${cabeceras.length}`);
  for (const c of cabeceras.slice(0, 5)) console.log(`      ${c.serie}-${c.correlativo}: cabecera ${S(c.cabecera)} · líneas ${S(c.lineas)}`);

  // ── 8. Toda venta formal deja rastro en el almacén ──────────────────────
  console.log('\n8) Toda factura y boleta dejó movimiento de kardex');
  const sinKardex = await prisma.$queryRawUnsafe(`
    SELECT c.serie, c.correlativo, c."mtoImpVenta"::float total, c."origenDato"
    FROM "Comprobante" c
    WHERE c."tipoDoc" IN ('01','03') AND c."estadoEnvioSunat" <> 'ANULADO'
      AND NOT EXISTS (SELECT 1 FROM "MovimientoKardex" m WHERE m."comprobanteId" = c.id)`);
  const emitidos = await uno(`SELECT COUNT(*)::int n FROM "Comprobante" c WHERE c."tipoDoc" IN ('01','03') AND c."estadoEnvioSunat" <> 'ANULADO'`);
  ok(sinKardex.length === 0, `de ${emitidos.n} comprobantes emitidos, sin movimiento de kardex: ${sinKardex.length}`);
  for (const c of sinKardex.slice(0, 5)) console.log(`      ${c.serie}-${c.correlativo} por ${S(c.total)} ${c.origenDato ?? ''}`);

  // ── 9. Caja ─────────────────────────────────────────────────────────────
  console.log('\n9) Caja: los pagos en efectivo del periodo');
  const efectivo = await uno(`
    SELECT COALESCE(SUM(p.monto),0)::float total, COUNT(*)::int n FROM "Pago" p
    WHERE UPPER(COALESCE(p."medioPago",'')) LIKE '%EFECTIVO%'
      AND p.fecha >= '${desde}T05:00:00Z' AND p.fecha <= '${hasta}T23:59:59Z'::timestamp + interval '5 hours'`);
  console.log(`   ${efectivo.n} pagos en efectivo por ${S(efectivo.total)}`);
  // La caja de Kaiser no guarda un movimiento por cobro: guarda un turno
  // (apertura/cierre) con los totales desglosados por medio de pago.
  const turnos = await uno(`
    SELECT COUNT(*)::int n,
           COALESCE(SUM(COALESCE("montoEfectivo",0)),0)::float efectivo,
           COALESCE(SUM(COALESCE("totalVentas",0)),0)::float ventas
    FROM "MovimientoCaja"
    WHERE fecha >= '${desde}T05:00:00Z' AND fecha <= '${hasta}T23:59:59Z'::timestamp + interval '5 hours'`)
    .catch(() => null);
  if (turnos && turnos.n > 0) {
    console.log(`   ${turnos.n} turno(s) de caja · efectivo declarado ${S(turnos.efectivo)} · ventas del turno ${S(turnos.ventas)}`);
    // No tienen por qué coincidir al céntimo: la caja recoge también ingresos que
    // no nacen de un comprobante. Se informa la diferencia, no se exige cero.
    if (!cuadra(turnos.efectivo, efectivo.total, 1)) {
      aviso(`el efectivo declarado en caja y los pagos en efectivo difieren en ${S(turnos.efectivo - efectivo.total)}`);
    } else ok(true, 'el efectivo de caja coincide con los pagos en efectivo');
  } else {
    aviso(`no hay turnos de caja en el periodo: no hay nada que cruzar`);
  }

  // ── 10. SIRE ────────────────────────────────────────────────────────────
  console.log('\n10) SIRE de ventas = los comprobantes formales del periodo');
  const sire = await fetch(`${API}/contabilidad/sire/ventas-txt?mes=${mes}&anio=${anio}`,
    { headers: { Authorization: `Bearer ${token}` } });
  if (sire.status === 200) {
    const txt = await sire.text();
    const lineas = txt.split('\n').filter((l) => l.trim()).length;
    console.log(`   el TXT trae ${lineas} líneas`);
    // El SIRE solo lleva los comprobantes FORMALES: las notas de venta no van a
    // los libros electrónicos de SUNAT.
    const formales = await uno(`
      SELECT COUNT(*)::int n FROM "Comprobante" c
      WHERE c."tipoDoc" IN ('01','03','07','08') AND c."estadoEnvioSunat" <> 'ANULADO' AND ${rangoSql}`);
    ok(lineas === formales.n,
      `una línea por comprobante formal del periodo (${formales.n} formales, ${lineas} líneas)`);
  } else {
    aviso(`el SIRE de ventas responde HTTP ${sire.status}`);
  }

  // ── 11. El reporte de gestión contra el P&L ─────────────────────────────
  console.log('\n11) «Ventas del periodo» dice lo mismo en el reporte y en el P&L');
  const rep = await api(`/reportes/ventas?fechaInicio=${desde}&fechaFin=${hasta}`, token);
  ok(rep.status === 200, `el reporte de ventas responde (HTTP ${rep.status})`);
  console.log(`   el reporte dice ${S(rep.data?.totalVentas ?? 0)} · facturado ${S(rep.data?.totalFacturado ?? 0)}`);
  // Las dos pantallas responden a la misma pregunta. Si dan cifras distintas, quien
  // las abra a la vez no sabe cuál creer —y pasaba: el reporte sumaba con IGV.
  ok(cuadra(rep.data?.totalVentas ?? 0, pnl.data?.ventasNetas ?? 0, 1),
    `coincide con el P&L (${S(pnl.data?.ventasNetas ?? 0)})`);
  ok(cuadra(rep.data?.totalFacturado ?? 0, conIgv.total, 1),
    `y el facturado con IGV va aparte, no mezclado (${S(conIgv.total)})`);
  const suma = (rep.data?.filas ?? []).reduce((a, f) => a + Number(f.ventas ?? 0), 0);
  ok(cuadra(suma, rep.data?.totalVentas ?? 0, 1),
    `las filas por vendedor suman el total (${S(suma)})`);
  const part = (rep.data?.filas ?? []).reduce((a, f) => a + Number(f.participacion ?? 0), 0);
  ok(Math.abs(part - 100) < 0.5 || (rep.data?.filas ?? []).length === 0,
    `y las participaciones suman 100 % (${part.toFixed(2)} %)`);

  console.log('');
  console.log(fallos === 0
    ? `✔ CUADRES: todo coincide${avisos ? ` (${avisos} aviso(s) que conviene mirar)` : ''}`
    : `✘ CUADRES: ${fallos} descuadre(s)${avisos ? ` y ${avisos} aviso(s)` : ''}`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
