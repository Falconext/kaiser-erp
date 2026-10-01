/**
 * Corrige los descuadres que encuentra `qa:cuadres`.
 *
 * Va en SECO por defecto: imprime lo que haría y no escribe nada. Con `--aplicar`
 * ejecuta. Cada reparación deja rastro con el marcador [cuadre] para poder
 * encontrarla después.
 *
 * Tres reparaciones, y no son iguales:
 *
 *  1. `producto.stock` recalculado como la suma de sus sedes. Es un campo
 *     DERIVADO —la verdad está en `ProductoStock`—, así que recalcularlo no es un
 *     ajuste de inventario: es reparar una copia desactualizada. Sin riesgo.
 *
 *  2. Una sede cuyo stock no coincide con su propio kardex. Aquí sí hay que
 *     decidir quién dice la verdad, y es el kardex: es el rastro auditable, cada
 *     movimiento con su documento y su responsable. Corregir el stock a lo que
 *     dice el kardex ES un ajuste de inventario, así que se registra como tal,
 *     con su motivo. No se toca la fila a mano.
 *
 *  3. Notas de venta que vendieron mercadería sin registrar la salida. Es
 *     exactamente la queja de la jefa de almacén —"hay ventas que no figuran en la
 *     tarjeta de stock"— reproducida en los propios datos de la demo. Se registran
 *     las salidas que faltan. Tres productos no tienen stock para cubrirlas, así
 *     que primero reciben su inventario inicial: es lo que el seed debió hacer, y
 *     dejar la demo con stock negativo sería peor.
 *
 * Uso:  pnpm run cuadres:corregir            (en seco)
 *       pnpm run cuadres:corregir -- --aplicar
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');
/** Las NV sin marca de origen se descartan salvo que se pidan explícitamente. */
const INCLUIR_NV = process.argv.includes('--incluir-nv');
const MARCA = '[cuadre]';
const S = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const r3 = (n) => Math.round(Number(n) * 1000) / 1000;


/**
 * Recompone la cadena de saldos de un producto en una sede.
 *
 * Hace falta porque insertar un movimiento con fecha pasada lo mete EN MEDIO de la
 * cadena, y los movimientos posteriores se quedan con los saldos que tenían. La
 * primera versión de esta corrección registró las salidas que faltaban con la fecha
 * de su venta —lo correcto, para que aparezcan en la tarjeta de stock el día que
 * toca— y dejó tres productos con el stock y el kardex diciendo cosas distintas.
 *
 * Se recorre en orden de fecha, se encadena cada saldo con el anterior y se deja
 * `ProductoStock` en el saldo final. El punto de partida es el `stockAnterior` del
 * primer movimiento, que es el único dato de arranque que hay.
 */
async function recomponerCadena(productoId, sedeId) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM "ProductoStock"
      WHERE "productoId" = ${productoId} AND "sedeId" = ${sedeId} FOR UPDATE`;
    const movs = await tx.movimientoKardex.findMany({
      where: { productoId, sedeId },
      orderBy: [{ fecha: 'asc' }, { id: 'asc' }],
      select: { id: true, tipoMovimiento: true, cantidad: true, stockAnterior: true, stockActual: true },
    });
    if (movs.length === 0) return null;
    let saldo = Number(movs[0].stockAnterior);
    let tocados = 0;
    for (const m of movs) {
      const cant = Number(m.cantidad);
      const delta =
        m.tipoMovimiento === 'INGRESO' ? cant
        : m.tipoMovimiento === 'SALIDA' || m.tipoMovimiento === 'TRANSFERENCIA' ? -Math.abs(cant)
        : cant; // AJUSTE ya viene firmado
      const anterior = saldo;
      saldo = r3(saldo + delta);
      if (Math.abs(Number(m.stockAnterior) - anterior) > 0.001 || Math.abs(Number(m.stockActual) - saldo) > 0.001) {
        await tx.movimientoKardex.update({
          where: { id: m.id }, data: { stockAnterior: anterior, stockActual: saldo } });
        tocados++;
      }
    }
    await tx.productoStock.updateMany({ where: { productoId, sedeId }, data: { stock: saldo } });
    return { movimientos: movs.length, tocados, saldo };
  });
}

async function main() {
  console.log(APLICAR ? '⚙  MODO APLICAR: se va a escribir en la base.\n' : '👀 En seco: no se escribe nada. Añade --aplicar para ejecutar.\n');
  const empresa = await prisma.empresa.findFirst({ select: { id: true } });
  const usuario = await prisma.usuario.findFirst({ where: { rol: 'ADMIN_EMPRESA' }, select: { id: true } });

  // ── 1. La sede que no coincide con su kardex ────────────────────────────
  console.log('1) Sedes cuyo stock no coincide con su propio kardex');
  const descuadres = await prisma.$queryRawUnsafe(`
    WITH ultimo AS (
      SELECT DISTINCT ON (m."productoId", m."sedeId") m."productoId", m."sedeId", m."stockActual"
      FROM "MovimientoKardex" m ORDER BY m."productoId", m."sedeId", m.fecha DESC, m.id DESC
    )
    SELECT ps."productoId", ps."sedeId", pr.codigo, pr.descripcion,
           ps.stock::float tabla, u."stockActual"::float kardex
    FROM "ProductoStock" ps
    JOIN ultimo u ON u."productoId" = ps."productoId" AND u."sedeId" = ps."sedeId"
    JOIN "Producto" pr ON pr.id = ps."productoId"
    WHERE ABS(ps.stock - u."stockActual") > 0.001`);
  console.log(`   ${descuadres.length} a ajustar (el kardex manda: es el rastro auditable)`);
  for (const d of descuadres) {
    const delta = r3(d.kardex - d.tabla);
    console.log(`     ${d.codigo} sede ${d.sedeId}: tabla ${d.tabla} → ${d.kardex} (ajuste de ${delta > 0 ? '+' : ''}${delta})`);
    if (!APLICAR) continue;
    // Se hace como ajuste de inventario, no tocando la fila: tiene que quedar en
    // el kardex quién lo cambió y por qué.
    await prisma.$transaction(async (tx) => {
      const fila = await tx.productoStock.findFirst({
        where: { productoId: d.productoId, sedeId: d.sedeId }, select: { stock: true } });
      const anterior = Number(fila?.stock ?? 0);
      const nuevo = r3(d.kardex);
      await tx.movimientoKardex.create({
        data: {
          productoId: d.productoId, empresaId: empresa.id, sedeId: d.sedeId,
          tipoMovimiento: 'AJUSTE', cantidad: r3(nuevo - anterior),
          concepto: `${MARCA} Ajuste por descuadre entre el stock y el kardex`,
          observacion: `La tabla de stock decía ${anterior} y el kardex ${nuevo}. Se toma el kardex, que es el rastro auditable.`,
          stockAnterior: anterior, stockActual: nuevo,
          usuarioId: usuario?.id ?? null, fecha: new Date(),
        },
      });
      await tx.productoStock.updateMany({
        where: { productoId: d.productoId, sedeId: d.sedeId }, data: { stock: nuevo } });
    });
  }
  if (APLICAR && descuadres.length) console.log(`   ✔ ${descuadres.length} ajustado(s), con su movimiento de kardex`);

  // ── 2. Ventas sin salida de almacén ─────────────────────────────────────
  console.log('\n2) Comprobantes de venta que no registraron la salida');
  const sinMov = await prisma.comprobante.findMany({
    // Se excluyen los documentos de PRE-VENTA además de las notas de crédito:
    // una cotización (COT), una orden de trabajo (OT) y una nota de pedido (NP)
    // son compromisos, no salidas — la mercadería sigue en el almacén hasta que
    // el pedido se despacha o se factura. Antes solo se excluían COT y 07, así
    // que este paso proponía descontar el stock de pedidos pendientes y dejaba
    // el inventario por debajo de lo que había en estantería. Mismo criterio que
    // el dashboard, la generación de asientos y el P&L (ver TIPOS_PREVENTA).
    where: { tipoDoc: { notIn: ['COT', '07', 'NP', 'OT'] }, estadoEnvioSunat: { not: 'ANULADO' },
      movimientosKardex: { none: {} }, detalles: { some: { productoId: { not: null } } } },
    select: { id: true, serie: true, correlativo: true, tipoDoc: true, sedeId: true, fechaEmision: true,
      detalles: { where: { productoId: { not: null } },
        select: { productoId: true, cantidad: true,
          producto: { select: { codigo: true, costoPromedio: true, factorConversion: true } } } } },
    orderBy: { id: 'asc' },
  });
  // No todo documento sin movimiento está mal, y corregir los que están bien sería
  // duplicar inventario. Se descartan dos casos legítimos:
  //   · el convertido desde un informal que YA descontó (la salida vive en el origen);
  //   · el importado del histórico (el sistema anterior ya lo declaró, y así está
  //     documentado en MIGRACION.md).
  const candidatos = [];
  const descartados = { convertidos: 0, importados: 0, notasDeVenta: 0 };
  for (const c of sinMov) {
    if (c.comprobanteOrigenId) {
      const enOrigen = await prisma.movimientoKardex.count({
        where: { comprobanteId: c.comprobanteOrigenId, tipoMovimiento: 'SALIDA' } });
      if (enOrigen > 0) { descartados.convertidos++; continue; }
    }
    if (/migracion|import/i.test(String(c.origenDato ?? ''))) { descartados.importados++; continue; }
    // Tercera red de seguridad, y la que faltaba: una nota de venta sin marca de
    // origen es casi siempre histórico cargado por `importar-nota-venta` —que hasta
    // hoy no marcaba `origenDato`—. Una NV creada de verdad en el ERP descuenta
    // stock al emitirse, así que si llegó aquí sin movimiento, no es una venta del
    // día. Inventarle la salida descuadra el inventario de productos que sí existen.
    if (c.tipoDoc === 'NV' && !INCLUIR_NV) { descartados.notasDeVenta++; continue; }
    candidatos.push(c);
  }
  console.log(`   ${sinMov.length} documentos sin movimiento · ${candidatos.length} a corregir`);
  if (descartados.convertidos) console.log(`     (${descartados.convertidos} descartados: su informal de origen ya descontó)`);
  if (descartados.importados) console.log(`     (${descartados.importados} descartados: importados del histórico)`);
  if (descartados.notasDeVenta) {
    console.log(`     (${descartados.notasDeVenta} descartados: notas de venta sin marca de origen — histórico.`);
    console.log(`      Si de verdad son ventas del ERP que perdieron su salida: --incluir-nv)`);
  }
  console.log(`   ${candidatos.reduce((a, c) => a + c.detalles.length, 0)} líneas a registrar`);

  // ¿Quién necesita inventario inicial para que la salida no deje negativo?
  const necesidad = new Map();
  for (const c of candidatos) {
    for (const d of c.detalles) {
      const factor = Number(d.producto.factorConversion ?? 1);
      const cant = Number(d.cantidad) * (factor > 1 ? factor : 1);
      const k = `${d.productoId}|${c.sedeId ?? 1}`;
      necesidad.set(k, (necesidad.get(k) ?? 0) + cant);
    }
  }
  const aporte = [];
  for (const [k, cant] of necesidad) {
    const [pid, sid] = k.split('|').map(Number);
    const fila = await prisma.productoStock.findFirst({ where: { productoId: pid, sedeId: sid }, select: { stock: true } });
    const hay = Number(fila?.stock ?? 0);
    if (hay < cant) {
      const pr = await prisma.producto.findUnique({ where: { id: pid }, select: { codigo: true } });
      aporte.push({ productoId: pid, sedeId: sid, codigo: pr.codigo, hay, necesita: cant, inicial: r3(cant - hay) });
    }
  }
  if (aporte.length) {
    console.log(`\n   ${aporte.length} producto(s) sin stock para cubrir esas ventas. Reciben inventario inicial:`);
    for (const a of aporte) console.log(`     ${a.codigo.padEnd(16)} tiene ${a.hay}, necesita ${a.necesita} → inventario inicial de ${a.inicial}`);
    console.log('     (es lo que el seed debió hacer; dejar la demo en negativo sería peor)');
  }

  if (APLICAR) {
    for (const a of aporte) {
      await prisma.$transaction(async (tx) => {
        await tx.productoStock.upsert({
          where: { productoId_sedeId: { productoId: a.productoId, sedeId: a.sedeId } },
          create: { productoId: a.productoId, sedeId: a.sedeId, stock: a.inicial },
          update: { stock: r3(a.hay + a.inicial) },
        });
        await tx.movimientoKardex.create({
          data: { productoId: a.productoId, empresaId: empresa.id, sedeId: a.sedeId,
            tipoMovimiento: 'INGRESO', cantidad: a.inicial,
            concepto: `${MARCA} Inventario inicial`,
            observacion: 'Alta de saldo inicial: el producto se vendió sin tener existencias registradas.',
            stockAnterior: a.hay, stockActual: r3(a.hay + a.inicial),
            usuarioId: usuario?.id ?? null, fecha: new Date('2026-08-31T12:00:00Z') },
        });
      });
    }

    let creados = 0;
    for (const c of candidatos) {
      for (const d of c.detalles) {
        const sedeId = c.sedeId ?? 1;
        const factor = Number(d.producto.factorConversion ?? 1);
        const cant = Number(d.cantidad) * (factor > 1 ? factor : 1);
        const costo = Number(d.producto.costoPromedio ?? 0);
        await prisma.$transaction(async (tx) => {
          await tx.$queryRaw`
            SELECT id FROM "ProductoStock"
            WHERE "productoId" = ${d.productoId} AND "sedeId" = ${sedeId} FOR UPDATE`;
          const fila = await tx.productoStock.findFirst({
            where: { productoId: d.productoId, sedeId }, select: { stock: true } });
          const anterior = Number(fila?.stock ?? 0);
          const nuevo = r3(anterior - cant);
          await tx.movimientoKardex.create({
            data: { productoId: d.productoId, empresaId: empresa.id, sedeId,
              tipoMovimiento: 'SALIDA', cantidad: cant, costoUnitario: costo,
              valorTotal: r3(cant * costo), comprobanteId: c.id,
              concepto: `Venta ${c.tipoDoc === 'NV' ? 'Nota de venta' : c.tipoDoc} ${c.serie}-${c.correlativo}`,
              observacion: `${MARCA} Salida que faltaba: la venta no había registrado el movimiento.`,
              stockAnterior: anterior, stockActual: nuevo,
              usuarioId: usuario?.id ?? null, fecha: c.fechaEmision },
          });
          await tx.productoStock.updateMany({
            where: { productoId: d.productoId, sedeId }, data: { stock: nuevo } });
          creados++;
        });
      }
    }
    console.log(`   ✔ ${creados} salidas registradas`);

    // Se recompone la cadena de cada producto tocado: las salidas se registraron
    // con la fecha de su venta, así que entraron en medio del histórico y los
    // movimientos posteriores tenían que recalcularse.
    const tocados = new Set();
    for (const c of candidatos) for (const d of c.detalles) tocados.add(`${d.productoId}|${c.sedeId ?? 1}`);
    for (const a of aporte) tocados.add(`${a.productoId}|${a.sedeId}`);
    let movsAjustados = 0;
    for (const k of tocados) {
      const [pid, sid] = k.split('|').map(Number);
      const r = await recomponerCadena(pid, sid);
      movsAjustados += r?.tocados ?? 0;
    }
    console.log(`   ✔ cadena recompuesta en ${tocados.size} producto/sede · ${movsAjustados} movimientos reencadenados`);
    // Y el campo global vuelve a cuadrar tras todo lo anterior.
    const tot = await prisma.$queryRawUnsafe(`
      SELECT pr.id, COALESCE(t.s,0)::float sedes FROM "Producto" pr
      LEFT JOIN (SELECT "productoId", SUM(stock) s FROM "ProductoStock" GROUP BY 1) t ON t."productoId" = pr.id
      WHERE ABS(pr.stock - COALESCE(t.s,0)) > 0.001`);
    for (const t of tot) await prisma.producto.update({ where: { id: t.id }, data: { stock: r3(t.sedes) } });
    if (tot.length) console.log(`   ✔ ${tot.length} campos globales vueltos a cuadrar`);
  }

  console.log(APLICAR
    ? '\n✔ Correcciones aplicadas. Corre `pnpm run qa:cuadres` para comprobarlo.'
    : '\n👀 Nada escrito. Con --aplicar se ejecuta.');
  // ── 3. El campo global, recalculado. VA AL FINAL A PROPÓSITO ────────────
  //
  // `producto.stock` es un campo DERIVADO: la verdad está en `ProductoStock`.
  // Por eso tiene que recalcularse DESPUÉS de los dos pasos anteriores, que
  // son justamente los que cambian `ProductoStock`.
  //
  // Estaba primero, y con eso la reparación no reparaba: en un producto con la
  // sede en 14 y su kardex en 2148, el paso del global lo bajaba a 14 (la suma
  // de las sedes de ese momento) y acto seguido el ajuste subía la sede a 2148.
  // Quedaba sede 2148 · global 14 — el mismo descuadre al revés.
  console.log('\n3) `producto.stock` como suma de sus sedes (campo derivado)');
  const globales = await prisma.$queryRawUnsafe(`
    SELECT pr.id, pr.codigo, pr.stock::float global, COALESCE(t.s, 0)::float sedes
    FROM "Producto" pr
    LEFT JOIN (SELECT "productoId", SUM(stock) s FROM "ProductoStock" GROUP BY 1) t ON t."productoId" = pr.id
    WHERE ABS(pr.stock - COALESCE(t.s, 0)) > 0.001
    ORDER BY ABS(pr.stock - COALESCE(t.s, 0)) DESC`);
  console.log(`   ${globales.length} productos a recalcular`);
  if (!APLICAR) {
    console.log('   (en seco estas cifras no incluyen los pasos 1 y 2, que no se');
    console.log('    han escrito: al aplicar, el global sale de las sedes ya corregidas)');
  }
  for (const g of globales.slice(0, 5)) console.log(`     ${g.codigo}: ${g.global} → ${g.sedes}`);
  if (globales.length > 5) console.log(`     … y ${globales.length - 5} más`);
  if (APLICAR) {
    for (const g of globales) {
      await prisma.producto.update({ where: { id: g.id }, data: { stock: r3(g.sedes) } });
    }
    console.log(`   ✔ ${globales.length} recalculados`);
  }

  await prisma.$disconnect();
}
main().catch(async (e) => { console.error('✘', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
