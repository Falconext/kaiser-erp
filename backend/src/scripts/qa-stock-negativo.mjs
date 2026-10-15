#!/usr/bin/env node
/**
 * Ninguna pantalla puede dejar el almacén en negativo.
 *
 * Nació de una sospecha que resultó INFUNDADA, y por eso vale la pena fijarla:
 * en la base había 9 existencias en −1 y parecía que el sistema dejaba sacar
 * stock inexistente. No: esos nueve los metió un guion llamando al servicio por
 * dentro. Las CUATRO vías por las que una PERSONA saca material lo impiden,
 * cada una a su manera, y este guion comprueba que siga siendo así:
 *
 *   · `POST kardex/ajuste`   → `rechazarSiNegativo: true` («un ajuste nunca
 *                              debe dejar el almacén en negativo»)
 *   · `POST kardex/traslado` → su propio control por sede de origen
 *   · ejecutar una orden     → `Stock insuficiente` en `registrarMovimiento`
 *                              de producción
 *   · `PUT productos/:id`    → teclear el stock en la ficha del producto es un
 *                              ajuste más, y hasta el 14-oct-2026 era el ÚNICO
 *                              que no lo comprobaba
 *
 * ⚠ Esa cuarta vía es la lección del guion: durante semanas dijo «ninguna vía
 * de usuario lo permite» y estaba en verde SIN HABER PROBADO la vía más usada
 * de todas —la pantalla de Inventario, donde el stock se corrige a mano—. Un
 * QA que enumera vías tiene que enumerarlas todas; si no, lo que fija es la
 * lista, no el sistema.
 *
 * ⚠ Lo que SÍ puede quedar negativo, a propósito, es el `registrarMovimiento`
 * genérico del kardex: `rechazarSiNegativo` nace apagada porque hay salidas que
 * legítimamente dejan negativo —anular una compra cuya mercadería ya se vendió—
 * y bloquearlas dejaría la operación sin salida. Eso NO es un fallo y este
 * guion no lo trata como tal; lo que fija es que las tres vías de usuario sí
 * se protejan, para que nadie quite esa bandera sin que salte algo.
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
async function login() {
  const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'gerencia@kaisercorp.com.pe', password: 'kaiser123' }) });
  if (!r.data?.requiresSedeSelection) return r.data.accessToken;
  const s = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  return s.data.accessToken;
}
const stockDe = async (id, sedeId = SEDE) =>
  Number((await prisma.productoStock.findFirst({ where: { productoId: id, sedeId }, select: { stock: true } }))?.stock ?? 0);

async function main() {
  console.log('\n📦  QA · nadie puede dejar el almacén en negativo\n');
  const token = await login();
  const marca = `QNEG${Date.now().toString().slice(-7)}`;
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true, tipoAfectacionIGV: true, moneda: true } });
  const empresaId = ref.empresaId;
  const creado = { productos: [], recetas: [], ordenes: [] };

  const nuevoProducto = async (suf, stock) => {
    const p = await prisma.producto.create({
      data: {
        codigo: `${marca}${suf}`, descripcion: `[QA-NEG] ${suf}`, empresaId,
        unidadMedidaId: ref.unidadMedidaId, tipoAfectacionIGV: ref.tipoAfectacionIGV,
        moneda: ref.moneda, precioUnitario: 10, valorUnitario: 10, costoPromedio: 5, stock,
      },
      select: { id: true, codigo: true },
    });
    creado.productos.push(p.id);
    await prisma.productoStock.create({ data: { productoId: p.id, sedeId: SEDE, stock } });
    return p;
  };

  try {
    // ── 1. El AJUSTE negativo ───────────────────────────────────────────────
    console.log('1) Un ajuste no puede pasarse de lo que hay');
    const a = await nuevoProducto('AJU', 5);
    const r1 = await api('/kardex/ajuste', {
      token, method: 'POST',
      body: JSON.stringify({ productoId: a.id, tipoAjuste: 'NEGATIVO', cantidad: 8, motivo: 'QA negativo' }),
    });
    ok(r1.status === 400, `sacar 8 de 5 se rechaza (HTTP ${r1.status})`);
    ok((await stockDe(a.id)) === 5, `y el stock NO se movió: sigue en 5 (${await stockDe(a.id)})`);
    const r1b = await api('/kardex/ajuste', {
      token, method: 'POST',
      body: JSON.stringify({ productoId: a.id, tipoAjuste: 'NEGATIVO', cantidad: 5, motivo: 'QA exacto' }),
    });
    ok(r1b.status < 400, `pero sacar los 5 exactos sí (HTTP ${r1b.status})`);
    ok((await stockDe(a.id)) === 0, `dejando 0, no negativo (${await stockDe(a.id)})`);

    // ── 2. El TRASLADO ──────────────────────────────────────────────────────
    console.log('\n2) Un traslado no puede llevarse lo que no hay en el origen');
    const otraSede = await prisma.sede.findFirst({ where: { empresaId, id: { not: SEDE } }, select: { id: true, nombre: true } });
    if (!otraSede) {
      ok(false, 'hace falta una segunda sede para probar el traslado');
    } else {
      const b = await nuevoProducto('TRA', 3);
      const r2 = await api('/kardex/traslado', {
        token, method: 'POST',
        body: JSON.stringify({ sedeOrigenId: SEDE, sedeDestinoId: otraSede.id, items: [{ productoId: b.id, cantidad: 10 }] }),
      });
      ok(r2.status === 400, `trasladar 10 de 3 se rechaza (HTTP ${r2.status})`);
      ok((await stockDe(b.id)) === 3, `y el origen sigue en 3 (${await stockDe(b.id)})`);
      ok(
        (await stockDe(b.id, otraSede.id)) === 0,
        `y el destino no recibió nada (${await stockDe(b.id, otraSede.id)})`,
      );
    }

    // ── 3. La ORDEN DE PRODUCCIÓN ───────────────────────────────────────────
    // Es la vía que más importa: planta ejecuta órdenes con material que a
    // veces no está cargado en el sistema.
    console.log('\n3) Una orden no puede consumir insumo que no hay');
    const insumo = await nuevoProducto('INS', 2);
    const final = await nuevoProducto('FIN', 0);
    const receta = await prisma.recetaProduccion.create({
      data: {
        empresaId, productoFinalId: final.id, codigo: `${marca}-R`, nombre: 'QA negativo',
        rendimientoObjetivo: 1, unidadRendimiento: 'UND',
        componentes: { create: [{ productoInsumoId: insumo.id, cantidadBase: 10, unidadBase: 'UND', tipoCantidad: 'POR_UNIDAD', orden: 1 }] },
      },
      select: { id: true },
    });
    creado.recetas.push(receta.id);

    const orden = await api('/produccion/ordenes', {
      token, method: 'POST',
      body: JSON.stringify({ recetaId: receta.id, loteProduccion: `${marca}-L1`, cantidadObjetivo: 1, sedeId: SEDE }),
    });
    ok(orden.status < 400, `la orden se crea aunque falte stock (HTTP ${orden.status}) ${orden.status>=400?JSON.stringify(orden.body?.message):''}`);
    if (orden.data?.id) {
      creado.ordenes.push(orden.data.id);
      const ejec = await api(`/produccion/ordenes/${orden.data.id}/ejecutar`, {
        token, method: 'POST',
        body: JSON.stringify({ cantidadProducida: 1, componentes: [{ productoInsumoId: insumo.id, cantidadConsumida: 10, mermaCantidad: 0 }] }),
      });
      ok(ejec.status === 400, `pero consumir 10 de 2 se rechaza al ejecutar (HTTP ${ejec.status})`);
      // ⚠ Se comprueba el MENSAJE, no solo el 400: un cuerpo mal formado
      // también devuelve 400, y entonces el guion pasaría sin haber probado
      // nada. Pasó en la primera versión de este mismo QA.
      ok(
        /insuficiente/i.test(JSON.stringify(ejec.body?.message ?? '')),
        `y es por el stock, no por el DTO: ${String(JSON.stringify(ejec.body?.message)).slice(0, 64)}`,
      );
      ok((await stockDe(insumo.id)) === 2, `y el insumo sigue en 2 (${await stockDe(insumo.id)})`);
      ok((await stockDe(final.id)) === 0, `sin fabricar nada (${await stockDe(final.id)})`);
    }

    // ── 4. La FICHA DEL PRODUCTO ────────────────────────────────────────────
    // La vía que más se usa: almacén corrige el stock escribiéndolo en la ficha.
    // Pasa por `producto.service`, no por `kardex/ajuste`, y durante semanas fue
    // la única que no llevaba `rechazarSiNegativo`.
    console.log('\n4) La ficha del producto tampoco puede dejarlo bajo cero');
    const f = await nuevoProducto('FIC', 6);
    const r4 = await api(`/productos/${f.id}`, {
      token, method: 'PUT',
      body: JSON.stringify({ stock: -3, sedeId: SEDE }),
    });
    ok(r4.status === 400, `poner el stock en -3 se rechaza (HTTP ${r4.status})`);
    ok(
      String(JSON.stringify(r4.body?.message)).includes('Stock insuficiente'),
      `y lo dice por el stock, no por otra cosa: ${String(JSON.stringify(r4.body?.message)).slice(0, 72)}`,
    );
    ok((await stockDe(f.id)) === 6, `el stock no se movió: sigue en 6 (${await stockDe(f.id)})`);
    const r4b = await api(`/productos/${f.id}`, {
      token, method: 'PUT',
      body: JSON.stringify({ stock: 2, sedeId: SEDE }),
    });
    ok(r4b.status < 400, `pero bajarlo a 2 sí se puede (HTTP ${r4b.status})`);
    ok((await stockDe(f.id)) === 2, `y queda en 2 (${await stockDe(f.id)})`);

    // ── 5. Ningún producto del QA quedó negativo ────────────────────────────
    console.log('\n5) Resultado');
    const negs = await prisma.productoStock.count({ where: { productoId: { in: creado.productos }, stock: { lt: 0 } } });
    ok(negs === 0, `ninguno de los ${creado.productos.length} productos de prueba quedó negativo (${negs})`);
  } finally {
    console.log('\n6) Limpieza');
    for (const id of creado.ordenes) {
      await prisma.movimientoProduccion.deleteMany({ where: { ordenProduccionId: id } }).catch(() => {});
      await prisma.ordenProduccionComponente.deleteMany({ where: { ordenProduccionId: id } }).catch(() => {});
      await prisma.ordenProduccion.deleteMany({ where: { id } }).catch(() => {});
    }
    for (const id of creado.recetas) {
      await prisma.recetaComponente.deleteMany({ where: { recetaId: id } });
      await prisma.recetaProduccion.deleteMany({ where: { id } });
    }
    for (const id of creado.productos) {
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.deleteMany({ where: { id } });
    }
    ok(
      (await prisma.producto.count({ where: { codigo: { startsWith: marca } } })) === 0,
      'sin restos del QA',
    );
  }

  console.log(fallos === 0 ? '\n✔ Stock negativo: ninguna vía de usuario lo permite' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error(String(e).split('\n').slice(0, 6).join('\n')); await prisma.$disconnect(); process.exit(1); });
