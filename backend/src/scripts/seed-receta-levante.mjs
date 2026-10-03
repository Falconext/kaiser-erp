/**
 * Carga la receta del MÓDULO DE LEVANTE 1 PISO a partir de la hoja real que
 * pasó Kaiser (planta) el 2-oct-2026, para que la pantalla de Producción tenga
 * algo de verdad que enseñar en la demo.
 *
 * ── Anonimizado a propósito ───────────────────────────────────────────────
 * La hoja venía con el pedido real de un cliente concreto, sus cantidades
 * exactas y anotaciones internas del tipo "falta NI y NS" o "x regularizar
 * ingreso" —que son, literalmente, el problema de sustento documental que
 * tienen abierto con SUNAT escrito a mano—. Nada de eso entra aquí:
 *   · el cliente es ficticio,
 *   · la base son 200 módulos redondos, no el pedido real,
 *   · las anotaciones no se cargan.
 * Lo que SÍ es real es la estructura: qué componentes lleva un módulo y en qué
 * cantidad. Eso es lo que hace que la demo valga, y no identifica a nadie.
 *
 * ── Dónde está la raya ────────────────────────────────────────────────────
 * Los productos que faltaban en el catálogo se crean con su código, su
 * descripción y su unidad —datos del propio cliente— pero con STOCK CERO y SIN
 * COSTO. El stock y el costo no me los dio nadie: inventarlos haría mentir al
 * inventario valorizado, al margen y al P&L, que es justo lo que la contadora
 * les está reclamando. Un producto sin costo se ve y se corrige; un costo
 * inventado parece calculado y nadie lo cuestiona.
 *
 * En seco por defecto, como el resto de scripts del repo:
 *   pnpm run seed:receta-levante                 → muestra qué haría
 *   pnpm run seed:receta-levante -- --aplicar    → escribe
 *   pnpm run seed:receta-levante -- --revertir   → deshace lo que creó
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const aplicar = process.argv.includes('--aplicar');
const revertir = process.argv.includes('--revertir');

/** Marca de origen, para poder identificar y borrar lo que creó este script. */
const FUENTE = 'seed-receta-levante';
const CODIGO_RECETA = 'REC-LEVANTE-1P';

/** Unidades del catálogo de Kaiser (código → id). Se resuelven al arrancar. */
let UM = {};

/**
 * Productos que la hoja usa y que NO estaban en el catálogo importado.
 * Son productos REALES de Kaiser —sus códigos salen de su propia hoja—; lo que
 * pasa es que la importación del catálogo se quedó corta y no trajo los
 * componentes de fabricación.
 */
const PRODUCTOS_FALTANTES = [
  { codigo: '10460GALI0002', um: 'UND', descripcion: 'MODULO MODELO LEVANTE 1 PISO' },
  { codigo: '10461IMPL0078', um: 'PZ',  descripcion: 'COMEDERO LEVANTE MAG. 0.80MM 1.20 X 2.44M' },
  { codigo: '10461IMPL0076', um: 'PZ',  descripcion: 'SOPORTE DE COMEDERO LEVANTE (ALAMBRE 2.50 III ZINC)' },
  { codigo: '10461IMPL0009', um: 'KG',  descripcion: 'SUJETADOR DE COMEDERO GALV 2.5 TIPO W' },
  { codigo: '90090VARI0005', um: 'KG',  descripcion: 'DRIZA DE NYLON 1/8"' },
  { codigo: '10461IMPL0010', um: 'PZ',  descripcion: 'TAPA DE COMEDERO CON REMACHE' },
  { codigo: '90061IMPL0215', um: 'PZ',  descripcion: 'PLATINA GALV. PARA GUILLOTINA 2.0MM' },
  { codigo: '90090VARI0164', um: 'PZ',  descripcion: 'PERNO C/COCHE ZN 1/4" X 3/4"' },
  { codigo: '90090VARI0431', um: 'PZ',  descripcion: 'TUERCA MARIPOSA ZN 1/4"' },
  { codigo: '90090VARI0432', um: 'PZ',  descripcion: 'ARANDELA PLANA ZN 1/4"' },
  { codigo: '10180PLAN0047', um: 'UND', descripcion: 'PLANCHA GALV. Z180 2.50 MM (1.20 X 2.40 M)' },
  { codigo: '21180PLAN0013', um: 'UND', descripcion: 'PLANCHA MAGNELIS 0.80MM X 0.305MT X 2.440MT' },
];

/**
 * La receta, POR MÓDULO. Sale de dividir entre 420 las cantidades de la hoja,
 * que estaba calculada para ese tamaño de pedido.
 *
 * ⚠ Pendiente de que lo confirme planta: la hoja trae dos columnas de cantidad
 * (420 y 210 módulos) y esta lectura asume que la primera es el total. Las
 * cantidades fraccionarias de consumibles (sujetador, driza, grapas) son
 * normales en una receta; la de la TAPA DE COMEDERO no cuadra —80 tapas para
 * 420 módulos— y está marcada abajo para preguntar.
 */
const RECETA = [
  { codigo: '10461IMPL0072', cantidad: 1,      um: 'PZ',  nota: 'PISO LEVANTE' },
  { codigo: '10461IMPL0013', cantidad: 2,      um: 'PZ',  nota: 'TECHO LEVANTE FRENTE' },
  { codigo: '10461IMPL0019', cantidad: 10,     um: 'PZ',  nota: 'DIVISION LEVANTE' },
  { codigo: '10461IMPL0031', cantidad: 1,      um: 'PZ',  nota: 'MEDIANERA (equivale al 10461IMPL0109 de la hoja)' },
  { codigo: '10461IMPL0078', cantidad: 2,      um: 'PZ',  nota: 'COMEDERO LEVANTE' },
  { codigo: '10461IMPL0079', cantidad: 2,      um: 'PZ',  nota: 'UNION DE COMEDERO' },
  { codigo: '10461IMPL0028', cantidad: 1,      um: 'PZ',  nota: 'SOPORTE PARA JAULA' },
  { codigo: '10461IMPL0076', cantidad: 2,      um: 'PZ',  nota: 'SOPORTE DE COMEDERO' },
  { codigo: '90061IMPL0015', cantidad: 2,      um: 'PZ',  nota: 'GUILLOTINA' },
  { codigo: '90061IMPL0215', cantidad: 2,      um: 'PZ',  nota: 'PLATINA PARA GUILLOTINA' },
  { codigo: '90061BBDR0002', cantidad: 16,     um: 'PZ',  nota: 'BEBEDERO CORTI (CHUPONES)' },
  { codigo: '10780VARI0010', cantidad: 1,      um: 'PZ',  nota: 'TUBO DE PVC 3/4 X 5 MTS' },
  { codigo: '90090VARI0164', cantidad: 2,      um: 'PZ',  nota: 'PERNO C/COCHE' },
  { codigo: '90090VARI0431', cantidad: 2,      um: 'PZ',  nota: 'TUERCA MARIPOSA' },
  { codigo: '90090VARI0432', cantidad: 2,      um: 'PZ',  nota: 'ARANDELA PLANA' },
  { codigo: '90090VARI0005', cantidad: 4,      um: 'PZ',  nota: 'DRIZA DE NYLON' },
  { codigo: '10461IMPL0009', cantidad: 0.0405, um: 'KG',  nota: 'SUJETADOR TIPO W (17 kg / 420 módulos)' },
  { codigo: '90090GRAP0005', cantidad: 0.0262, um: 'CJ',  nota: 'GRAPAS (11 cajas / 420 módulos)' },
  { codigo: '10461IMPL0010', cantidad: 0.19,   um: 'PZ',  nota: '⚠ TAPA DE COMEDERO: 80 para 420 módulos, confirmar con planta' },
];

const log = (s = '') => console.log(s);

// ── Reversión ───────────────────────────────────────────────────────────────
const deshacer = async (empresaId) => {
  const receta = await prisma.recetaProduccion.findFirst({
    where: { empresaId, codigo: CODIGO_RECETA },
    include: { ordenes: { select: { id: true } } },
  });

  if (receta?.ordenes.length) {
    log(`   ⚠  la receta tiene ${receta.ordenes.length} orden(es) de producción: se borran también`);
    if (aplicar) {
      for (const o of receta.ordenes) {
        await prisma.movimientoProduccion.deleteMany({ where: { ordenProduccionId: o.id } });
        await prisma.ordenProduccionComponente.deleteMany({ where: { ordenProduccionId: o.id } });
        await prisma.ordenProduccion.delete({ where: { id: o.id } });
      }
    }
  }
  if (receta) {
    log(`   ✔  receta ${CODIGO_RECETA}`);
    if (aplicar) {
      await prisma.recetaComponente.deleteMany({ where: { recetaId: receta.id } });
      await prisma.recetaProduccion.delete({ where: { id: receta.id } });
    }
  }

  const creados = await prisma.producto.findMany({
    where: { empresaId, codigo: { in: PRODUCTOS_FALTANTES.map((p) => p.codigo) } },
    select: { id: true, codigo: true, atributosTecnicos: true },
  });
  for (const p of creados) {
    // Solo se borra lo que creó ESTE script. Si alguien ya lo tenía, se respeta.
    if (p.atributosTecnicos?.fuente !== FUENTE) {
      log(`   ·  ${p.codigo} no lo creé yo, lo dejo`);
      continue;
    }
    const enUso = await prisma.movimientoKardex.count({ where: { productoId: p.id } });
    if (enUso) {
      log(`   ⚠  ${p.codigo} ya tiene ${enUso} movimiento(s) de kardex: NO lo borro`);
      continue;
    }
    log(`   ✔  producto ${p.codigo}`);
    if (aplicar) await prisma.producto.delete({ where: { id: p.id } });
  }
};

// ── Carga ───────────────────────────────────────────────────────────────────
const cargar = async (empresaId) => {
  log('1) Productos que faltaban en el catálogo\n');
  for (const p of PRODUCTOS_FALTANTES) {
    const ya = await prisma.producto.findFirst({
      where: { empresaId, codigo: p.codigo }, select: { id: true },
    });
    if (ya) { log(`   ·  ${p.codigo} ya existe, lo dejo como está`); continue; }

    log(`   +  ${p.codigo}  ${p.descripcion.slice(0, 46)}  [${p.um}]  stock 0, sin costo`);
    if (aplicar) {
      await prisma.producto.create({
        data: {
          empresaId,
          codigo: p.codigo,
          descripcion: p.descripcion,
          unidadMedidaId: UM[p.um],
          tipoAfectacionIGV: '10',
          // Sin precio ni costo: son insumos de fabricación, no se venden, y
          // nadie me dio esas cifras.
          precioUnitario: 0,
          valorUnitario: 0,
          costoPromedio: 0,
          stock: 0,
          publicarEnTienda: false,
          atributosTecnicos: {
            fuente: FUENTE,
            motivo: 'Componente de fabricación que no vino en la importación del catálogo',
            cargadoEn: new Date().toISOString().slice(0, 10),
          },
        },
      });
    }
  }

  log('\n2) Receta del módulo\n');
  const final = await prisma.producto.findFirst({
    where: { empresaId, codigo: '10460GALI0002' }, select: { id: true, descripcion: true },
  });
  if (!final && !aplicar) {
    log('   (en seco no existe todavía el producto final; al aplicar se crea antes)');
  }

  const yaReceta = await prisma.recetaProduccion.findFirst({
    where: { empresaId, codigo: CODIGO_RECETA }, select: { id: true },
  });
  if (yaReceta) {
    log(`   ·  la receta ${CODIGO_RECETA} ya existe. Córrelo con --revertir primero.`);
    return;
  }

  let faltan = 0;
  for (const c of RECETA) {
    const prod = await prisma.producto.findFirst({
      where: { empresaId, codigo: c.codigo }, select: { id: true, stock: true },
    });
    const estado = prod ? `stock ${prod.stock}` : (aplicar ? 'NO EXISTE' : 'se crea al aplicar');
    if (!prod && aplicar) faltan++;
    log(`   ${String(c.cantidad).padStart(8)} ${c.um.padEnd(4)} ${c.codigo}  ${c.nota.slice(0, 44).padEnd(44)} ${estado}`);
  }
  if (faltan) { log(`\n   ✘ faltan ${faltan} producto(s): no cargo la receta a medias.`); return; }

  if (aplicar && final) {
    const receta = await prisma.recetaProduccion.create({
      data: {
        empresaId,
        productoFinalId: final.id,
        codigo: CODIGO_RECETA,
        nombre: 'Módulo de levante 1 piso',
        rendimientoObjetivo: 1,
        unidadRendimiento: 'UND',
        mermaObjetivoPorcentaje: 0,
        observaciones:
          'Receta por módulo. Estructura tomada de la hoja de cálculo de planta ' +
          '(2-oct-2026), con el pedido y el cliente anonimizados. Pendiente de ' +
          'confirmar con planta la cantidad de TAPA DE COMEDERO.',
      },
    });
    let orden = 0;
    for (const c of RECETA) {
      const prod = await prisma.producto.findFirst({
        where: { empresaId, codigo: c.codigo }, select: { id: true },
      });
      await prisma.recetaComponente.create({
        data: {
          recetaId: receta.id,
          productoInsumoId: prod.id,
          orden: orden++,
          cantidadBase: c.cantidad,
          unidadBase: c.um,
        },
      });
    }
    log(`\n   ✔ receta creada con ${RECETA.length} componentes`);
  }
};

const main = async () => {
  const empresa = await prisma.empresa.findFirst({ select: { id: true, razonSocial: true } });
  if (!empresa) throw new Error('No hay empresa en la base');

  for (const u of await prisma.unidadMedida.findMany({ select: { id: true, codigo: true } })) {
    UM[u.codigo] = u.id;
  }
  for (const p of PRODUCTOS_FALTANTES) {
    if (!UM[p.um]) throw new Error(`No existe la unidad de medida "${p.um}"`);
  }

  log(`\n🏭 Receta del módulo de levante · ${empresa.razonSocial}`);
  log(`   ${revertir ? 'REVERTIR' : 'CARGAR'} · ${aplicar ? 'APLICANDO' : 'en seco'}\n`);

  if (revertir) await deshacer(empresa.id);
  else await cargar(empresa.id);

  log(aplicar ? '\n✔ listo\n' : '\n   ← en seco. Añade  -- --aplicar  para escribir.\n');
};

main()
  .catch((e) => { console.error('\n✘', e.message, '\n'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
