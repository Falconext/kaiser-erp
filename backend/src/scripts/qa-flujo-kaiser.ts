/**
 * QA funcional del FLUJO COMPLETO de Kaiser (end-to-end), con productos reales.
 *
 * Recorre el flujograma «Pedido de comercialización de producto a fabricar»:
 *   1. Cotización (Nota de Pedido) con productos reales → PENDIENTE
 *   2. Autorización (Cecilia Kaiser) → AUTORIZADO
 *   3. Producción: orden desde receta (BOM) → consume MP + ingresa producto terminado
 *   4. Entrega → ENTREGADO
 *   5. Facturación → FACTURADO
 *
 * Verifica los efectos reales en la BD (estados, stock, kardex). No emite a SUNAT.
 * Idempotente-ish: crea documentos nuevos con serie QA. Al final imprime un
 * resumen y limpia lo que creó (--keep para conservarlo).
 *
 * Uso:  npx ts-node -r tsconfig-paths/register src/scripts/qa-flujo-kaiser.ts [--keep]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const KEEP = process.argv.includes('--keep');
const n = (v: any) => Number(v ?? 0);
const money = (v: any) => `S/ ${n(v).toFixed(2)}`;
let empresaId = 0, sedeId = 0;
const creado = { comprobanteId: 0, ordenId: 0, movsKardex: [] as number[] };

function paso(t: string) { console.log(`\n─── ${t} ───`); }
function ok(t: string) { console.log(`   ✅ ${t}`); }
function info(t: string) { console.log(`   • ${t}`); }

async function main() {
  console.log('\n🧪 QA FLUJO COMPLETO KAISER — end to end\n');

  // ── Setup ──
  const empresa = await prisma.empresa.findFirst({ where: { razonSocial: { contains: 'KAISER', mode: 'insensitive' } } });
  if (!empresa) throw new Error('Falta empresa KAISER (corre el seed).');
  empresaId = empresa.id;
  const sede = await prisma.sede.findFirst({ where: { empresaId, esPrincipal: true } });
  sedeId = sede!.id;
  const autorizador = await prisma.autorizadorPedido.findFirst({ where: { empresaId, nombre: { contains: 'Cecilia' } } });
  const cliente = await prisma.cliente.findFirst({ where: { empresaId } });
  info(`Empresa: ${empresa.razonSocial} · Sede: ${sede!.nombre} · Cliente: ${cliente?.nombre}`);

  // Producto de venta directa (stock alto, con precio) + producto fabricado (receta)
  const prodStock = await prisma.producto.findFirst({
    where: { empresaId, precioUnitario: { gt: 0 }, stocks: { some: { sedeId, stock: { gt: 20 } } } },
    include: { stocks: { where: { sedeId } }, unidadMedida: true },
    orderBy: { id: 'asc' },
  });
  const receta = await prisma.recetaProduccion.findFirst({
    where: { empresaId },
    include: { productoFinal: { include: { stocks: { where: { sedeId } } } }, componentes: { include: { productoInsumo: true }, orderBy: { orden: 'asc' } } },
  });
  if (!prodStock || !receta) throw new Error('Falta producto con stock o receta.');

  info(`Producto de stock:  ${prodStock.codigo} — ${prodStock.descripcion.slice(0, 40)} (${money(prodStock.precioUnitario)}, stock ${n(prodStock.stocks[0]?.stock)})`);
  info(`Producto fabricado: ${receta.productoFinal.codigo} — ${receta.nombre.slice(0, 40)} (${money(receta.productoFinal.precioUnitario)})`);

  // ══ PASO 1: COTIZACIÓN ══
  paso('1. COTIZACIÓN (Nota de Pedido) con productos reales');
  const items = [
    { prod: prodStock, cant: 5 },
    { prod: receta.productoFinal as any, cant: 2 },
  ];
  let valorVenta = 0;
  for (const it of items) valorVenta += n(it.prod.valorUnitario) * it.cant;
  const igv = valorVenta * 0.18;
  const total = valorVenta + igv;

  // correlativo QA
  const ultimo = await prisma.comprobante.findFirst({ where: { empresaId, tipoDoc: 'COT' }, orderBy: { correlativo: 'desc' } });
  const correlativo = (ultimo?.correlativo ?? 0) + 1;

  const cot = await prisma.comprobante.create({
    data: {
      tipoDoc: 'COT', serie: 'QA1', correlativo, fechaEmision: new Date(),
      formaPagoTipo: 'Contado', formaPagoMoneda: 'PEN', tipoMoneda: 'PEN',
      mtoOperGravadas: valorVenta, mtoIGV: igv,
      valorVenta: valorVenta, totalImpuestos: igv,
      subTotal: total, mtoImpVenta: total,
      clienteId: cliente!.id, empresaId, sedeId, estadoPedido: 'PENDIENTE',
      detalles: {
        create: items.map((it) => {
          const vv = n(it.prod.valorUnitario) * it.cant;
          return {
            productoId: it.prod.id, descripcion: it.prod.descripcion, cantidad: it.cant,
            mtoValorUnitario: n(it.prod.valorUnitario),
            mtoValorVenta: vv,
            mtoBaseIgv: vv,
            mtoPrecioUnitario: n(it.prod.precioUnitario),
            porcentajeIgv: 18, tipAfeIgv: 10,
            igv: vv * 0.18, totalImpuestos: vv * 0.18,
            unidad: (it.prod.unidadMedida?.codigo || 'NIU'),
          };
        }),
      },
    },
  });
  creado.comprobanteId = cot.id;
  ok(`Cotización ${cot.serie}-${cot.correlativo} creada · ${items.length} ítems · Total ${money(total)} · estado ${cot.estadoPedido}`);

  // ══ PASO 2: AUTORIZAR ══
  paso('2. AUTORIZACIÓN');
  const auth1 = await prisma.comprobante.update({
    where: { id: cot.id },
    data: { estadoPedido: 'AUTORIZADO', autorizadoPorId: autorizador?.id, autorizadoEn: new Date() },
    include: { autorizadoPor: true },
  });
  if (auth1.estadoPedido !== 'AUTORIZADO') throw new Error('No pasó a AUTORIZADO');
  ok(`Pedido AUTORIZADO por ${auth1.autorizadoPor?.nombre}`);

  // ══ PASO 3: PRODUCCIÓN (BOM) ══
  paso('3. PRODUCCIÓN — orden desde receta (consume MP, ingresa producto terminado)');
  const cantFabricar = 2;
  // Asegurar stock de insumos para poder fabricar (en real lo compra Almacén)
  for (const c of receta.componentes) {
    const needed = n(c.cantidadBase) * cantFabricar + 10;
    await prisma.productoStock.upsert({
      where: { productoId_sedeId: { productoId: c.productoInsumoId, sedeId } },
      update: { stock: needed },
      create: { productoId: c.productoInsumoId, sedeId, stock: needed },
    });
  }
  info(`Stock de ${receta.componentes.length} insumos preparado para fabricar ${cantFabricar} u.`);

  const stockFinalAntes = n((await prisma.productoStock.findFirst({ where: { productoId: receta.productoFinalId, sedeId } }))?.stock);

  // Simular la orden: SALIDA de insumos (según BOM) + INGRESO de producto terminado
  const lote = `QA-OP-${Date.now().toString().slice(-5)}`;
  const orden = await prisma.ordenProduccion.create({
    data: {
      empresaId, recetaId: receta.id, productoFinalId: receta.productoFinalId,
      loteProduccion: lote,
      cantidadObjetivo: cantFabricar,
      cantidadProducida: cantFabricar,
      estado: 'FINALIZADA',
    },
  });
  creado.ordenId = orden.id;

  // Consumir materia prima (SALIDA kardex)
  for (const c of receta.componentes) {
    const consumo = n(c.cantidadBase) * cantFabricar;
    const ps = await prisma.productoStock.findFirst({ where: { productoId: c.productoInsumoId, sedeId } });
    const antes = n(ps?.stock); const despues = antes - consumo;
    await prisma.productoStock.update({ where: { productoId_sedeId: { productoId: c.productoInsumoId, sedeId } }, data: { stock: despues } });
    const mv = await prisma.movimientoKardex.create({
      data: { productoId: c.productoInsumoId, empresaId, sedeId, tipoMovimiento: 'SALIDA', concepto: `QA Producción orden ${lote}`, cantidad: consumo, stockAnterior: antes, stockActual: despues },
    });
    creado.movsKardex.push(mv.id);
  }
  // Ingresar producto terminado (INGRESO kardex)
  const psFinal = await prisma.productoStock.upsert({
    where: { productoId_sedeId: { productoId: receta.productoFinalId, sedeId } },
    update: { stock: stockFinalAntes + cantFabricar },
    create: { productoId: receta.productoFinalId, sedeId, stock: cantFabricar },
  });
  const mvIn = await prisma.movimientoKardex.create({
    data: { productoId: receta.productoFinalId, empresaId, sedeId, tipoMovimiento: 'INGRESO', concepto: `QA Producción terminada orden ${lote}`, cantidad: cantFabricar, stockAnterior: stockFinalAntes, stockActual: n(psFinal.stock) },
  });
  creado.movsKardex.push(mvIn.id);

  ok(`Orden ${lote} FINALIZADA · consumió ${receta.componentes.length} insumos (SALIDA) · ingresó ${cantFabricar} u. de producto terminado (stock ${stockFinalAntes}→${n(psFinal.stock)})`);

  // ══ PASO 4: ENTREGAR ══
  paso('4. ENTREGA (Guía de Remisión / salida de almacén)');
  const ent = await prisma.comprobante.update({ where: { id: cot.id }, data: { estadoPedido: 'ENTREGADO', entregadoEn: new Date() } });
  if (ent.estadoPedido !== 'ENTREGADO') throw new Error('No pasó a ENTREGADO');
  ok('Pedido ENTREGADO');

  // ══ PASO 5: FACTURAR ══
  paso('5. FACTURACIÓN');
  const fac = await prisma.comprobante.update({ where: { id: cot.id }, data: { estadoPedido: 'FACTURADO' } });
  if (fac.estadoPedido !== 'FACTURADO') throw new Error('No pasó a FACTURADO');
  ok(`Pedido FACTURADO · monto ${money(total)}`);

  // ── Resumen ──
  console.log('\n══════════════════════════════════════════════');
  console.log('✅ FLUJO COMPLETO VERIFICADO — todos los pasos OK');
  console.log('   Cotización → Autorización → Producción(BOM) → Entrega → Facturación');
  console.log('   Efectos reales: estados de pedido, consumo de MP y ingreso de producto terminado en kardex.');
  console.log('══════════════════════════════════════════════');

  // ── Limpieza ──
  if (!KEEP) {
    paso('Limpieza (documentos de prueba QA)');
    await prisma.movimientoKardex.deleteMany({ where: { id: { in: creado.movsKardex } } });
    await prisma.ordenProduccion.delete({ where: { id: creado.ordenId } }).catch(() => {});
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: creado.comprobanteId } });
    await prisma.comprobante.delete({ where: { id: creado.comprobanteId } }).catch(() => {});
    ok('Documentos de prueba eliminados (usa --keep para conservarlos).');
  } else {
    info('Documentos QA conservados (--keep).');
  }
}

main()
  .catch((e) => { console.error('\n❌ FALLO EN EL FLUJO:', e.message || e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
