/**
 * QA funcional · El precio del módulo: peso × precio por kilo × factor
 *
 * Así cotiza Kaiser de verdad. El precio de catálogo de un módulo envejece en
 * cuanto se mueve el acero; el peso no cambia, y el factor es lo que se
 * negocia con el cliente.
 *
 * La regla que más importa, y la que este guion vigila en cada caso: **si
 * falta cualquier dato, el precio es el de catálogo y se dice qué falta —
 * nunca 0**. Un 0 en una cotización se manda al cliente y se factura.
 *
 * Siembra sus propios productos, su propia receta y sus propios valores de
 * empresa, así que no depende de que Kaiser haya contestado los pesos que
 * tiene pendientes. Restaura la configuración y lo borra todo al terminar.
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
  const t = await r.text();
  let j = {}; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 200) }; }
  return { status: r.status, body: j, data: j?.data };
}
async function login(email = 'gerencia@kaisercorp.com.pe') {
  const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'kaiser123' }) });
  if (r.status >= 400 || !r.data) throw new Error(`login falló (HTTP ${r.status})`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const sel = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  return sel.data.accessToken;
}

async function main() {
  const token = await login();
  const marca = `QAM6${Date.now().toString().slice(-7)}`;
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true, tipoAfectacionIGV: true, moneda: true } });
  const empresaId = ref.empresaId;
  const creado = { productos: [], recetas: [] };

  // La configuración de precio de la empresa se restaura al terminar.
  const previo = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { precioBaseKg: true, factorPrecioDefault: true, factorPrecioMinimo: true },
  });

  const nuevoProducto = async (sufijo, extra = {}) => {
    const p = await prisma.producto.create({
      data: {
        codigo: `${marca}${sufijo}`, descripcion: `[QA-MODULO] ${sufijo}`,
        precioUnitario: 500, valorUnitario: 500, stock: 100, costoPromedio: 1,
        empresaId, unidadMedidaId: ref.unidadMedidaId,
        tipoAfectacionIGV: ref.tipoAfectacionIGV, moneda: ref.moneda, ...extra,
      },
      select: { id: true, codigo: true },
    });
    creado.productos.push(p.id);
    return p;
  };

  try {
    console.log('\n💰 QA · El precio del módulo\n');

    // ── 0. El decorado: un módulo de 10 kg ──────────────────────────────────
    // 2 insumos × 2 unidades × 2500 g = 10 kg por módulo. Un tercero POR_LOTE,
    // que NO debe contar en el peso de una unidad.
    const insA = await nuevoProducto('INA', { pesoGramos: 2500 });
    const insB = await nuevoProducto('INB', { pesoGramos: 2500 });
    const insLote = await nuevoProducto('INL', { pesoGramos: 9000 });
    const modulo = await nuevoProducto('MOD', {
      esModulo: true, capacidadAves: 168, precioUnitario: 500, valorUnitario: 500,
    });
    const receta = await prisma.recetaProduccion.create({
      data: {
        empresaId, productoFinalId: modulo.id, codigo: `${marca}-REC`,
        nombre: 'QA módulo', rendimientoObjetivo: 1, unidadRendimiento: 'UND',
        componentes: {
          create: [
            { productoInsumoId: insA.id, cantidadBase: 2, unidadBase: 'UND', tipoCantidad: 'POR_UNIDAD', orden: 1 },
            { productoInsumoId: insB.id, cantidadBase: 2, unidadBase: 'UND', tipoCantidad: 'POR_UNIDAD', orden: 2 },
            { productoInsumoId: insLote.id, cantidadBase: 3, unidadBase: 'UND', tipoCantidad: 'POR_LOTE', orden: 3 },
          ],
        },
      },
      select: { id: true },
    });
    creado.recetas.push(receta.id);

    await prisma.empresa.update({
      where: { id: empresaId },
      data: { precioBaseKg: 1, factorPrecioDefault: 2, factorPrecioMinimo: 1.5 },
    });

    // ── 1. El cálculo ───────────────────────────────────────────────────────
    console.log('1) Peso × precio por kilo × factor');
    const r1 = await api(`/produccion/modulos/${modulo.id}/precio`, { token });
    ok(r1.status < 400, `responde (HTTP ${r1.status})`);
    ok(Number(r1.data?.pesoKg) === 10, `el peso sale de la receta: 10 kg (${Number(r1.data?.pesoKg)})`);
    ok(r1.data?.origen === 'PESO_X_FACTOR', `el origen es el cálculo, no el catálogo (${r1.data?.origen})`);
    ok(Number(r1.data?.precio) === 20, `10 × 1 × 2 = 20 (${Number(r1.data?.precio)})`);
    ok((r1.data?.faltan ?? []).length === 0, 'y no falta nada');

    // El POR_LOTE no debe estar en el peso de UNA unidad.
    ok(Number(r1.data?.pesoKg) !== 37, 'el insumo POR_LOTE no infla el peso de un módulo');

    // ── 2. El factor se puede pedir distinto ────────────────────────────────
    console.log('\n2) El factor es lo que se negocia');
    const r2 = await api(`/produccion/modulos/${modulo.id}/precio?factor=3`, { token });
    ok(Number(r2.data?.precio) === 30, `con factor 3: 10 × 1 × 3 = 30 (${Number(r2.data?.precio)})`);
    ok(r2.data?.bajoMinimo === false, 'y 3 no está bajo el mínimo');
    const r3 = await api(`/produccion/modulos/${modulo.id}/precio?factor=1.2`, { token });
    ok(r3.data?.bajoMinimo === true, 'pero 1.2 sí lo está y se avisa');
    ok(Number(r3.data?.factorMinimo) === 1.5, `y se dice cuál es el mínimo (${Number(r3.data?.factorMinimo)})`);

    // ── 3. Lo que falta se dice; el precio NUNCA es 0 ───────────────────────
    console.log('\n3) Sin datos cae al catálogo y lo dice — nunca 0');
    await prisma.empresa.update({ where: { id: empresaId }, data: { precioBaseKg: null } });
    const sinBase = await api(`/produccion/modulos/${modulo.id}/precio`, { token });
    ok(Number(sinBase.data?.precio) === 500, `usa el precio de catálogo: 500 (${Number(sinBase.data?.precio)})`);
    ok(sinBase.data?.origen === 'CATALOGO', 'y lo dice en el origen');
    ok((sinBase.data?.faltan ?? []).includes('precioBaseKg'), 'y nombra lo que falta');
    await prisma.empresa.update({ where: { id: empresaId }, data: { precioBaseKg: 1 } });

    // Un componente sin peso: el precio NO se calcula a medias.
    await prisma.producto.update({ where: { id: insB.id }, data: { pesoGramos: null } });
    const sinPeso = await api(`/produccion/modulos/${modulo.id}/precio`, { token });
    ok(sinPeso.data?.pesoKg === null, 'un solo componente sin peso deja el peso en null, no a medias');
    ok(Number(sinPeso.data?.precio) === 500, `y el precio cae al catálogo (${Number(sinPeso.data?.precio)})`);
    ok(
      (sinPeso.data?.faltan ?? []).some((f) => String(f).includes(insB.codigo)),
      'diciendo QUÉ componente, que es lo accionable',
    );
    await prisma.producto.update({ where: { id: insB.id }, data: { pesoGramos: 2500 } });

    // ── 4. La explosión: qué lleva ──────────────────────────────────────────
    console.log('\n4) «Qué lleva», explotado');
    const exp = await api(`/produccion/modulos/${modulo.id}/explosion?cantidad=10`, { token });
    ok(exp.status < 400, `responde (HTTP ${exp.status})`);
    const porCod = Object.fromEntries((exp.data?.componentes ?? []).map((c) => [c.codigo, c]));
    ok(Number(porCod[insA.codigo]?.requerido) === 20, `lo POR_UNIDAD escala: 2 × 10 = 20 (${Number(porCod[insA.codigo]?.requerido)})`);
    ok(Number(porCod[insLote.codigo]?.requerido) === 3, `lo POR_LOTE no: sigue en 3 (${Number(porCod[insLote.codigo]?.requerido)})`);
    ok(Number(exp.data?.pesoKgPorUnidad) === 10, `y el peso por unidad es el mismo: 10 kg (${Number(exp.data?.pesoKgPorUnidad)})`);
    ok(porCod[insA.codigo]?.alcanza === true, 'dice si alcanza el stock de cada componente');

    // ── 5. Quién puede consultarlo ──────────────────────────────────────────
    console.log('\n5) Quién puede poner precio a un módulo');
    const tokenVentas = await login('ventas@kaisercorp.com.pe');
    const comoVentas = await api(`/produccion/modulos/${modulo.id}/precio`, { token: tokenVentas });
    ok(comoVentas.status < 400, `ventas SÍ puede (HTTP ${comoVentas.status}): es quien cotiza`);
    const expVentas = await api(`/produccion/modulos/${modulo.id}/explosion`, { token: tokenVentas });
    ok(expVentas.status < 400, `y ver qué lleva (HTTP ${expVentas.status})`);

    // ── 6. Aves → módulos ───────────────────────────────────────────────────
    console.log('\n6) La capacidad en aves viaja con el producto');
    const prod = await prisma.producto.findUnique({
      where: { id: modulo.id }, select: { capacidadAves: true, esModulo: true },
    });
    ok(prod?.esModulo === true, 'el producto queda marcado como módulo');
    ok(prod?.capacidadAves === 168, `con su capacidad en aves (${prod?.capacidadAves})`);
  } finally {
    console.log('\n7) Limpieza');
    await prisma.empresa.update({
      where: { id: empresaId },
      data: {
        precioBaseKg: previo?.precioBaseKg ?? null,
        factorPrecioDefault: previo?.factorPrecioDefault ?? null,
        factorPrecioMinimo: previo?.factorPrecioMinimo ?? null,
      },
    });
    for (const id of creado.recetas) {
      await prisma.recetaComponente.deleteMany({ where: { recetaId: id } });
      await prisma.recetaProduccion.deleteMany({ where: { id } });
    }
    const mios = await prisma.producto.findMany({ where: { codigo: { startsWith: marca } }, select: { id: true } });
    for (const { id } of mios) {
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.updateMany({ where: { productoAdicionalPorFilaId: id }, data: { productoAdicionalPorFilaId: null } });
      await prisma.producto.deleteMany({ where: { id } });
    }
    ok((await prisma.producto.count({ where: { codigo: { startsWith: marca } } })) === 0, 'los productos de prueba eliminados');
    const emp = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { precioBaseKg: true } });
    ok(
      String(emp?.precioBaseKg ?? null) === String(previo?.precioBaseKg ?? null),
      'y la configuración de precio de la empresa, restaurada',
    );
  }

  console.log(fallos === 0 ? '\n✔ Precio del módulo: todo correcto' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error('\n✘', e.message); await prisma.$disconnect(); process.exit(1); });
