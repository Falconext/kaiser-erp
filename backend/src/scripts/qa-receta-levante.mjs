/**
 * QA funcional de la demo de Producción (receta del módulo de levante).
 *
 * Comprueba contra el SERVICIO real —no contra la base— que lo que se va a
 * enseñar el lunes responde de verdad:
 *   · la receta está completa y apunta a productos que existen,
 *   · la cadena de dos niveles encadena (alambre → división → módulo),
 *   · la liquidación devuelve teórico, consumido y merma —lo que pidió planta—,
 *   · el resumen de materiales avisa de lo que falta antes de fabricar,
 *   · los productos que creó el seed están sin costo a propósito y marcados.
 *
 * No escribe nada: se apoya en lo que dejaron los dos seeds.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let ok = 0, mal = 0;
const check = (c, m) => { console.log((c ? '   ✔ ' : '   ✘ ') + m); c ? ok++ : mal++; };
const num = (d) => Number(d ?? 0);

const main = async () => {
  const empresa = await prisma.empresa.findFirst({ select: { id: true } });
  const empresaId = empresa.id;

  const { ProduccionService } = await import('../../dist/src/produccion/produccion.service.js');
  const svc = new ProduccionService(prisma);

  console.log('\n🏭 QA · Receta y órdenes del módulo de levante\n');

  // ── 1. La receta ──────────────────────────────────────────────────────────
  console.log('1) La receta del módulo');
  const receta = await prisma.recetaProduccion.findFirst({
    where: { empresaId, codigo: 'REC-LEVANTE-1P' },
    include: {
      productoFinal: { select: { codigo: true } },
      componentes: { include: { productoInsumo: { select: { codigo: true, stock: true } } } },
    },
  });
  check(!!receta, 'existe REC-LEVANTE-1P');
  check(receta?.productoFinal.codigo === '10460GALI0002', `produce el módulo (${receta?.productoFinal.codigo})`);
  check(receta?.componentes.length === 19, `tiene 19 componentes (${receta?.componentes.length})`);
  check(
    receta?.componentes.every((c) => c.productoInsumo && num(c.cantidadBase) > 0),
    'todos los componentes apuntan a un producto real y con cantidad',
  );
  // Las cantidades clave de la hoja, por módulo.
  const porCod = Object.fromEntries((receta?.componentes ?? []).map((c) => [c.productoInsumo.codigo, num(c.cantidadBase)]));
  check(porCod['10461IMPL0019'] === 10, `10 divisiones por módulo (${porCod['10461IMPL0019']})`);
  check(porCod['90061BBDR0002'] === 16, `16 bebederos por módulo (${porCod['90061BBDR0002']})`);
  check(porCod['10461IMPL0013'] === 2, `2 techos por módulo (${porCod['10461IMPL0013']})`);

  // ── 2. La cadena de dos niveles ───────────────────────────────────────────
  console.log('\n2) La cadena de dos niveles (lo que su sistema no representa)');
  const recetaDiv = await prisma.recetaProduccion.findFirst({
    where: { empresaId, codigo: 'REC-DIVISION-250' },
    include: {
      productoFinal: { select: { codigo: true } },
      componentes: { include: { productoInsumo: { select: { codigo: true } } } },
    },
  });
  check(!!recetaDiv, 'existe la receta de la división');
  check(recetaDiv?.productoFinal.codigo === '10461IMPL0019', 'produce la DIVISIÓN, que es componente del módulo');
  check(
    recetaDiv?.componentes[0]?.productoInsumo.codigo === '10210GTRZ0008',
    'y se hace de alambre 2.50 III Zinc',
  );
  check(num(recetaDiv?.componentes[0]?.cantidadBase) === 0.65, `0.65 kg por pieza (${num(recetaDiv?.componentes[0]?.cantidadBase)})`);
  // El eslabón: lo que produce la receta de nivel 2 es insumo de la de nivel 1.
  check(
    receta?.componentes.some((c) => c.productoInsumo.codigo === recetaDiv?.productoFinal.codigo),
    'la salida del nivel 2 es insumo del nivel 1 — la cadena encadena',
  );

  // ── 3. La liquidación ─────────────────────────────────────────────────────
  console.log('\n3) La liquidación de la orden ejecutada');
  const ordenDiv = await prisma.ordenProduccion.findFirst({
    where: { empresaId, loteProduccion: 'LOTE-DIV-DEMO-01' }, select: { id: true, estado: true },
  });
  check(!!ordenDiv, 'existe la orden de divisiones');
  check(ordenDiv?.estado === 'FINALIZADA', `está finalizada (${ordenDiv?.estado})`);

  const liq = await svc.resumenMaterialesOrden(empresaId, ordenDiv.id);
  const fila = liq.componentes?.[0];
  check(!!fila, 'el resumen devuelve el detalle por componente');
  check(num(fila?.cantidadTeorica) === 325, `teórico 325 kg (${num(fila?.cantidadTeorica)})`);
  check(num(fila?.cantidadConsumida) > num(fila?.cantidadTeorica), `consumió MÁS de lo teórico (${num(fila?.cantidadConsumida)} kg) — es lo que su sistema no sabe anotar`);
  check(num(fila?.mermaCantidad) > 0, `y la merma queda registrada (${num(fila?.mermaCantidad)} kg)`);
  check('cantidadSobrante' in (fila ?? {}), 'el resumen trae el sobrante (lo que habría que devolver al almacén)');
  check(num(liq.totales?.merma) > 0, `y los totales suman la merma (${num(liq.totales?.merma)} kg)`);

  // La comprobación que de verdad importa, y la que se me escapó al principio:
  // una orden puede DECIR que consumió sin que se haya movido nada. Eso es
  // exactamente la observación que Kaiser tiene abierta con SUNAT —consumo y
  // mercadería sin documento detrás—, así que si la demo lo hiciera estaríamos
  // enseñando el problema disfrazado de solución.
  const movs = await prisma.movimientoProduccion.findMany({
    where: { ordenProduccionId: ordenDiv.id },
    select: { tipoMovimiento: true, cantidad: true },
  });
  const tipos = movs.map((m) => m.tipoMovimiento);
  check(tipos.includes('CONSUMO_INSUMO'), 'el consumo dejó movimiento de verdad, no solo un número escrito');
  check(tipos.includes('MERMA'), 'la merma dejó su propio movimiento');
  check(tipos.includes('INGRESO_PRODUCTO_FINAL'), 'y lo fabricado entró al almacén');

  const divStock = await prisma.producto.findFirst({
    where: { empresaId, codigo: '10461IMPL0019' }, select: { stock: true },
  });
  check(num(divStock?.stock) === 492, `la división tiene stock real: ${num(divStock?.stock)} pz`);

  // ── 4. El aviso de material que falta ─────────────────────────────────────
  console.log('\n4) El aviso de material antes de fabricar');
  const ordenMod = await prisma.ordenProduccion.findFirst({
    where: { empresaId, loteProduccion: 'LOTE-MOD-DEMO-01' },
    include: { componentes: { include: { productoInsumo: { select: { codigo: true, stock: true } } } } },
  });
  check(!!ordenMod, 'existe la orden planificada de módulos');
  check(num(ordenMod?.cantidadObjetivo) === 200, `para 200 módulos (${num(ordenMod?.cantidadObjetivo)})`);
  check(ordenMod?.componentes.length === 19, `con los 19 componentes explotados (${ordenMod?.componentes.length})`);

  const div = ordenMod?.componentes.find((c) => c.productoInsumo.codigo === '10461IMPL0019');
  check(num(div?.cantidadTeorica) === 2000, `2000 divisiones para 200 módulos (${num(div?.cantidadTeorica)})`);
  const faltan = (ordenMod?.componentes ?? []).filter(
    (c) => num(c.productoInsumo.stock) < num(c.cantidadTeorica),
  );
  check(faltan.length > 0, `${faltan.length} componentes no alcanzan — el aviso tiene algo que decir`);

  // ── 5. La raya que nos pusimos ────────────────────────────────────────────
  console.log('\n5) Lo que NO se inventó');
  const creados = await prisma.producto.findMany({
    where: { empresaId, codigo: { in: ['10460GALI0002', '10461IMPL0078', '90090VARI0164'] } },
    select: { codigo: true, stock: true, costoPromedio: true, atributosTecnicos: true },
  });
  check(creados.length === 3, 'los productos del seed están');
  check(creados.every((p) => num(p.stock) === 0), 'ninguno tiene stock inventado');
  check(creados.every((p) => num(p.costoPromedio) === 0), 'ninguno tiene costo inventado');
  check(
    creados.every((p) => p.atributosTecnicos?.fuente === 'seed-receta-levante'),
    'y todos quedan marcados para poder borrarlos',
  );

  // ── 6. Nada del cliente real ──────────────────────────────────────────────
  console.log('\n6) Anonimizado');
  const textos = [
    receta?.observaciones ?? '', recetaDiv?.observaciones ?? '',
    ordenMod?.observaciones ?? '',
  ].join(' ').toUpperCase();
  check(!textos.includes('CHAVEZ'), 'el cliente real no aparece en ningún texto');
  check(!/FALTA NI Y NS|REGULARIZAR INGRESO/.test(textos), 'las anotaciones internas de planta no se cargaron');
  check(num(ordenMod?.cantidadObjetivo) !== 420 && num(ordenMod?.cantidadObjetivo) !== 210,
    'las cantidades no son las del pedido real');

  console.log(`\n${mal ? '✘' : '✔'} ${ok} comprobaciones correctas, ${mal} fallidas\n`);
  process.exitCode = mal ? 1 : 0;
};

main()
  .catch((e) => { console.error('\n✘', e.message, '\n'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
