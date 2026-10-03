/**
 * Segunda parte de la demo de Producción: la cadena de DOS NIVELES que Kaiser
 * fabrica de verdad, y que su sistema actual no sabe representar.
 *
 *   alambre  →  DIVISIÓN LEVANTE (semielaborado)  →  MÓDULO DE LEVANTE
 *
 * Deja montado:
 *   · la receta de nivel 2 (la división sale de alambre 2.50),
 *   · una orden FINALIZADA de divisiones, con su merma real — es la pantalla
 *     que pidió planta: «una segunda revisada, una especie de liquidación, para
 *     poder tener las mermas»,
 *   · una orden PLANIFICADA de 200 módulos, que al pedir el resumen de
 *     materiales dice qué falta comprar.
 *
 * Todo con datos reales de la hoja de planta: el peso unitario de la división
 * (0,65 kg de alambre) sale de su propia columna. Lo único inventado es la
 * merma de la orden ejecutada, y va marcada como ejemplo en las observaciones.
 *
 * NO se inventa stock: la orden que se ejecuta consume alambre que Kaiser ya
 * tiene en el almacén, y por eso se puede ejecutar de verdad —moviendo kardex—
 * en vez de dejar números escritos a mano sin movimiento detrás, que es
 * justamente el problema que tienen abierto con SUNAT.
 *
 *   pnpm run seed:ordenes-levante                 → en seco
 *   pnpm run seed:ordenes-levante -- --aplicar    → escribe
 *   pnpm run seed:ordenes-levante -- --revertir   → deshace
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';

/**
 * La ejecución de la orden va por el ENDPOINT real, no escribiendo filas.
 * Crear a mano una orden "finalizada" dejaría un consumo declarado sin
 * movimiento de kardex detrás — que es exactamente la observación que Kaiser
 * tiene abierta con SUNAT. Si la demo lo hiciera, estaríamos enseñando el
 * problema en vez de la solución.
 */
const api = async (ruta, { token, method = 'GET', body } = {}) => {
  const r = await fetch(`${API}${ruta}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, ...json };
};

const entrar = async () => {
  const r1 = await api('/auth/login', {
    method: 'POST',
    body: { email: 'gerencia@kaisercorp.com.pe', password: 'kaiser123' },
  });
  if (r1.data?.accessToken) return r1.data.accessToken;
  const r2 = await api('/auth/select-sede', {
    method: 'POST', token: r1.data?.tempToken, body: { sedeId: r1.data?.sedes?.[0]?.id },
  });
  if (!r2.data?.accessToken) throw new Error('No pude entrar a la API para ejecutar la orden');
  return r2.data.accessToken;
};
const aplicar = process.argv.includes('--aplicar');
const revertir = process.argv.includes('--revertir');

const CODIGO_RECETA_DIV = 'REC-DIVISION-250';
const LOTE_DIV = 'LOTE-DIV-DEMO-01';
const LOTE_MOD = 'LOTE-MOD-DEMO-01';

/** La división se hace de alambre: 0,65 kg por pieza (columna de la hoja). */
const INSUMO_DIVISION = { codigo: '10210GTRZ0008', kgPorPieza: 0.65, unidad: 'KG' };
const DIVISIONES_A_FABRICAR = 500;
/** Salieron 492 de 500: 8 piezas se perdieron. Ejemplo, para que la merma se vea. */
const DIVISIONES_PRODUCIDAS = 492;
const MODULOS_A_FABRICAR = 200;

const log = (s = '') => console.log(s);
const num = (d) => Number(d ?? 0);

const porCodigo = (empresaId, codigo) =>
  prisma.producto.findFirst({
    where: { empresaId, codigo },
    select: { id: true, codigo: true, descripcion: true, stock: true },
  });

// ── Reversión ───────────────────────────────────────────────────────────────
const deshacer = async (empresaId) => {
  for (const lote of [LOTE_DIV, LOTE_MOD]) {
    const orden = await prisma.ordenProduccion.findFirst({
      where: { empresaId, loteProduccion: lote },
      select: { id: true, estado: true },
    });
    if (!orden) { log(`   ·  ${lote} no existe`); continue; }

    const movs = await prisma.movimientoProduccion.count({
      where: { ordenProduccionId: orden.id },
    });
    log(`   ✔  orden ${lote} (${orden.estado}, ${movs} movimiento(s) de producción)`);
    if (movs) {
      log('      ⚠ movió kardex: revisa el stock de alambre después de revertir');
    }
    if (aplicar) {
      await prisma.movimientoProduccion.deleteMany({ where: { ordenProduccionId: orden.id } });
      await prisma.ordenProduccionComponente.deleteMany({ where: { ordenProduccionId: orden.id } });
      await prisma.ordenProduccion.delete({ where: { id: orden.id } });
    }
  }

  const receta = await prisma.recetaProduccion.findFirst({
    where: { empresaId, codigo: CODIGO_RECETA_DIV }, select: { id: true },
  });
  if (receta) {
    log(`   ✔  receta ${CODIGO_RECETA_DIV}`);
    if (aplicar) {
      await prisma.recetaComponente.deleteMany({ where: { recetaId: receta.id } });
      await prisma.recetaProduccion.delete({ where: { id: receta.id } });
    }
  }
};

// ── Carga ───────────────────────────────────────────────────────────────────
const cargar = async (empresaId, sedeId, usuarioId) => {
  const division = await porCodigo(empresaId, '10461IMPL0019');
  const alambre = await porCodigo(empresaId, INSUMO_DIVISION.codigo);
  const modulo = await porCodigo(empresaId, '10460GALI0002');
  if (!division || !alambre || !modulo) {
    throw new Error('Faltan productos: corre antes  pnpm run seed:receta-levante -- --aplicar');
  }

  // ── 1. Receta de nivel 2 ──────────────────────────────────────────────────
  log('1) Receta del semielaborado (división ← alambre)\n');
  let receta = await prisma.recetaProduccion.findFirst({
    where: { empresaId, codigo: CODIGO_RECETA_DIV }, select: { id: true },
  });
  if (receta) log(`   ·  ${CODIGO_RECETA_DIV} ya existe`);
  else {
    log(`   +  ${CODIGO_RECETA_DIV}: 1 división = ${INSUMO_DIVISION.kgPorPieza} kg de ${alambre.codigo}`);
    if (aplicar) {
      receta = await prisma.recetaProduccion.create({
        data: {
          empresaId, productoFinalId: division.id,
          codigo: CODIGO_RECETA_DIV, nombre: 'División levante 1 piso 2.50',
          rendimientoObjetivo: 1, unidadRendimiento: 'PZ',
          observaciones: 'Peso unitario tomado de la hoja de planta (2-oct-2026).',
        },
      });
      await prisma.recetaComponente.create({
        data: {
          recetaId: receta.id, productoInsumoId: alambre.id, orden: 0,
          cantidadBase: INSUMO_DIVISION.kgPorPieza, unidadBase: INSUMO_DIVISION.unidad,
        },
      });
    }
  }

  // ── 2. Orden FINALIZADA de divisiones, con merma ──────────────────────────
  const kgTeorico = DIVISIONES_A_FABRICAR * INSUMO_DIVISION.kgPorPieza;
  // Se consumió algo más de lo teórico: es lo que pasa en planta y es justo lo
  // que su sistema actual no sabe anotar.
  const kgConsumido = Number((kgTeorico * 1.03).toFixed(2));
  const kgMerma = Number((kgConsumido - DIVISIONES_PRODUCIDAS * INSUMO_DIVISION.kgPorPieza).toFixed(2));

  log('\n2) Orden ejecutada de divisiones (la liquidación)\n');
  log(`   lote ${LOTE_DIV}`);
  log(`   objetivo ${DIVISIONES_A_FABRICAR} pz · producido ${DIVISIONES_PRODUCIDAS} pz`);
  log(`   alambre teórico ${kgTeorico} kg · consumido ${kgConsumido} kg · merma ${kgMerma} kg`);
  log(`   stock de alambre antes: ${num(alambre.stock)} kg  ${num(alambre.stock) >= kgConsumido ? '✔ alcanza' : '✘ NO alcanza'}`);
  if (num(alambre.stock) < kgConsumido) throw new Error('No hay alambre suficiente para la orden de ejemplo');

  const yaDiv = await prisma.ordenProduccion.findFirst({
    where: { empresaId, loteProduccion: LOTE_DIV }, select: { id: true },
  });
  if (yaDiv) log('   ·  la orden ya existe');
  else if (aplicar) {
    const token = await entrar();
    const creada = await api('/produccion/ordenes', {
      token, method: 'POST',
      body: {
        recetaId: receta.id,
        productoFinalId: division.id,
        loteProduccion: LOTE_DIV,
        cantidadObjetivo: DIVISIONES_A_FABRICAR,
        observaciones: 'Orden de ejemplo para la demo. La merma es ilustrativa.',
      },
    });
    if (creada.status >= 300) throw new Error(`No se pudo crear la orden: ${creada.message}`);
    const ordenId = creada.data.id;
    log(`   ✔  orden creada (id ${ordenId})`);

    const ejec = await api(`/produccion/ordenes/${ordenId}/ejecutar`, {
      token, method: 'POST',
      body: {
        cantidadProducida: DIVISIONES_PRODUCIDAS,
        mermaTotal: kgMerma,
        observaciones: 'Ejecución de ejemplo: el consumo de alambre mueve kardex.',
        componentes: [{
          productoInsumoId: alambre.id,
          cantidadConsumida: kgConsumido,
          mermaCantidad: kgMerma,
        }],
      },
    });
    if (ejec.status >= 300) throw new Error(`No se pudo ejecutar la orden: ${ejec.message}`);
    log('   ✔  ejecutada por la API: el kardex se movió de verdad');
  }

  // ── 3. Orden PLANIFICADA de módulos ───────────────────────────────────────
  log('\n3) Orden planificada de módulos (la explosión de materiales)\n');
  const recetaMod = await prisma.recetaProduccion.findFirst({
    where: { empresaId, codigo: 'REC-LEVANTE-1P' },
    include: { componentes: { include: { productoInsumo: { select: { id: true, codigo: true, stock: true } } } } },
  });
  if (!recetaMod) throw new Error('No está la receta del módulo. Corre seed:receta-levante primero.');

  log(`   lote ${LOTE_MOD} · ${MODULOS_A_FABRICAR} módulos`);
  let faltantes = 0;
  for (const c of recetaMod.componentes) {
    const req = num(c.cantidadBase) * MODULOS_A_FABRICAR;
    const hay = num(c.productoInsumo.stock);
    if (hay < req) faltantes++;
  }
  log(`   ${faltantes} de ${recetaMod.componentes.length} componentes no alcanzan — eso es lo que enseña el resumen`);

  const yaMod = await prisma.ordenProduccion.findFirst({
    where: { empresaId, loteProduccion: LOTE_MOD }, select: { id: true },
  });
  if (yaMod) log('   ·  la orden ya existe');
  else if (aplicar) {
    const orden = await prisma.ordenProduccion.create({
      data: {
        empresaId, recetaId: recetaMod.id, productoFinalId: modulo.id,
        loteProduccion: LOTE_MOD,
        cantidadObjetivo: MODULOS_A_FABRICAR,
        estado: 'PLANIFICADA',
        fechaProgramada: new Date(),
        usuarioResponsableId: usuarioId,
        observaciones:
          'Pedido de ejemplo. Queda PLANIFICADA a propósito: el material no ' +
          'alcanza, que es justo lo que el resumen de materiales debe avisar ' +
          'antes de empezar a fabricar.',
        componentes: {
          create: recetaMod.componentes.map((c) => ({
            productoInsumoId: c.productoInsumoId,
            cantidadTeorica: num(c.cantidadBase) * MODULOS_A_FABRICAR,
            cantidadConsumida: 0,
            unidad: c.unidadBase,
          })),
        },
      },
    });
    log(`   ✔  orden creada (id ${orden.id}) con ${recetaMod.componentes.length} componentes`);
  }
};

const main = async () => {
  const empresa = await prisma.empresa.findFirst({ select: { id: true, razonSocial: true } });
  const sede = await prisma.sede.findFirst({ where: { empresaId: empresa.id }, select: { id: true } });
  const usuario = await prisma.usuario.findFirst({ where: { empresaId: empresa.id }, select: { id: true } });

  log(`\n🏭 Órdenes de la demo · ${empresa.razonSocial}`);
  log(`   ${revertir ? 'REVERTIR' : 'CARGAR'} · ${aplicar ? 'APLICANDO' : 'en seco'}\n`);

  if (revertir) await deshacer(empresa.id);
  else await cargar(empresa.id, sede?.id, usuario?.id);

  log(aplicar ? '\n✔ listo\n' : '\n   ← en seco. Añade  -- --aplicar  para escribir.\n');
};

main()
  .catch((e) => { console.error('\n✘', e.message, '\n'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
