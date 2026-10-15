#!/usr/bin/env node
/**
 * Reservar stock: apartar mercadería para un pedido que todavía no se factura.
 *
 * Es lo que Javier planteó en la reunión con STARSOFT —dos vendedores cotizan
 * el mismo rollo, se lo lleva aquel cuyo cliente deposite primero— y de lo poco
 * que ellos dijeron no tener: «si existe algún proceso que me permita reservar
 * y luego liberar, no lo tenemos considerado por el momento».
 *
 * Este guion existe por un fallo que no vio nadie hasta el QA funcional del
 * 14-oct-2026: la función estaba entera, estaba en el menú… y **ninguna reserva
 * podía crearse jamás**. `Producto.porcentajeProvision` nace en 0, el cupo se
 * calculaba siempre como `stock × 0 / 100`, y cualquier intento moría con
 * «disponible para reservar: 0». Tener la función y no poder usarla es peor que
 * no tenerla: se enseña en la demo y revienta el día que alguien la toca.
 *
 * Lo que fija, y por qué cada cosa:
 *   1. reservar BAJA el disponible que ve el vendedor al cotizar — si no, la
 *      reserva es un apunte decorativo y el stock se vende dos veces;
 *   2. no se puede reservar más de lo que hay;
 *   3. en `porcentajeProvision = 0` NO hay tope (el límite es el stock), que es
 *      el estado de los 407 productos del catálogo;
 *   4. con un porcentaje puesto, el tope SÍ se aplica — hacer la regla opt-in
 *      no puede haberla desactivado;
 *   5. liberar devuelve el disponible.
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
async function login(email = 'ventas@kaisercorp.com.pe') {
  const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'kaiser123' }) });
  if (!r.data?.requiresSedeSelection) return r.data.accessToken;
  const s = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  return s.data.accessToken;
}

/**
 * Lo que el vendedor ve como disponible al cotizar: el listado de productos ya
 * descuenta lo reservado. Se mira por la API y no por `ProductoStock` a
 * propósito — lo que importa no es la fila de la base, es la cifra que sale en
 * la pantalla cuando alguien está cotizando.
 */
async function disponibleEnCatalogo(token, codigo) {
  const r = await api(`/productos?search=${encodeURIComponent(codigo)}&limit=5`, { token });
  const lista = r.data?.productos || r.data?.data || (Array.isArray(r.data) ? r.data : []);
  const p = lista.find((x) => x.codigo === codigo);
  return p ? Number(p.stock) : null;
}

async function main() {
  console.log('\nQA · Reservas de stock');
  console.log('='.repeat(50));
  const token = await login();
  const empresa = await prisma.empresa.findFirst({ select: { id: true } });
  const empresaId = empresa.id;
  const marca = `QRES${Date.now().toString().slice(-7)}`;
  const creado = { productos: [], reservas: [] };

  const ref = await prisma.producto.findFirst({
    where: { empresaId }, select: { unidadMedidaId: true, tipoAfectacionIGV: true, moneda: true },
  });

  const nuevoProducto = async (suf, stock, porcentajeProvision = 0) => {
    const p = await prisma.producto.create({
      data: {
        codigo: `${marca}${suf}`, descripcion: `[QA-RES] ${suf}`, empresaId,
        unidadMedidaId: ref.unidadMedidaId, tipoAfectacionIGV: ref.tipoAfectacionIGV,
        moneda: ref.moneda, precioUnitario: 10, valorUnitario: 10, costoPromedio: 5,
        stock, porcentajeProvision,
      },
      select: { id: true, codigo: true },
    });
    creado.productos.push(p.id);
    await prisma.productoStock.create({ data: { productoId: p.id, sedeId: SEDE, stock } });
    return p;
  };

  const reservar = async (productoId, cantidad, motivo = 'QA reservas') =>
    api('/reservas', { token, method: 'POST', body: JSON.stringify({ productoId, cantidad, motivo, estado: 'PENDIENTE' }) });

  try {
    // ── 1. Reservar con el valor de fábrica ─────────────────────────────────
    console.log('\n1) Un producto recién creado se puede reservar');
    const a = await nuevoProducto('SIN', 20);
    ok((await disponibleEnCatalogo(token, a.codigo)) === 20, 'parte de 20 disponibles');
    const r1 = await reservar(a.id, 5);
    if (r1.data?.id) creado.reservas.push(r1.data.id);
    ok(r1.status < 400, `reservar 5 funciona (HTTP ${r1.status})`);
    ok(
      !String(JSON.stringify(r1.body?.message)).includes('cupo'),
      'sin tropezar con el cupo de provisión, que nace en 0 y no debe topar nada',
    );

    // ── 2. El disponible baja ───────────────────────────────────────────────
    console.log('\n2) Lo reservado deja de ofrecerse al cotizar');
    const tras = await disponibleEnCatalogo(token, a.codigo);
    ok(tras === 15, `el catálogo pasa de 20 a 15 (${tras}) — es lo que pidió Javier`);
    const fila = await prisma.productoStock.findFirst({ where: { productoId: a.id, sedeId: SEDE }, select: { stock: true } });
    ok(Number(fila.stock) === 20, `pero el almacén sigue teniendo 20 (${fila.stock}): la mercadería no se ha movido`);

    // ── 3. No se reserva lo que no hay ──────────────────────────────────────
    console.log('\n3) No se puede apartar más de lo que hay');
    const r3 = await reservar(a.id, 50);
    ok(r3.status === 400, `reservar 50 de 15 disponibles se rechaza (HTTP ${r3.status})`);
    ok(
      String(JSON.stringify(r3.body?.message)).includes('Stock insuficiente'),
      `y lo dice por el stock: ${String(JSON.stringify(r3.body?.message)).slice(0, 70)}`,
    );

    // ── 4. El tope por porcentaje, cuando se configura ──────────────────────
    // Hacer la regla opt-in no puede haberla desactivado: con un número puesto
    // tiene que seguir topando.
    console.log('\n4) Con un % de provisión configurado, el tope sí aplica');
    const b = await nuevoProducto('TOP', 100, 10); // 10 % de 100 = 10
    const r4 = await reservar(b.id, 25);
    ok(r4.status === 400, `con 10 % de 100, reservar 25 se rechaza (HTTP ${r4.status})`);
    ok(
      String(JSON.stringify(r4.body?.message)).includes('cupo'),
      `y es por el cupo, no por el stock: ${String(JSON.stringify(r4.body?.message)).slice(0, 70)}`,
    );
    const r4b = await reservar(b.id, 8);
    if (r4b.data?.id) creado.reservas.push(r4b.data.id);
    ok(r4b.status < 400, `pero 8, que cabe en el cupo, sí (HTTP ${r4b.status})`);

    // ── 5. Liberar devuelve el disponible ───────────────────────────────────
    console.log('\n5) Liberar la reserva devuelve la mercadería a la venta');
    const idReserva = r1.data?.id;
    const del = await api(`/reservas/${idReserva}`, { token, method: 'DELETE' });
    ok(del.status < 400, `se libera (HTTP ${del.status})`);
    if (del.status < 400) creado.reservas = creado.reservas.filter((x) => x !== idReserva);
    const vuelta = await disponibleEnCatalogo(token, a.codigo);
    ok(vuelta === 20, `y el catálogo vuelve a 20 (${vuelta})`);
  } finally {
    console.log('\n6) Limpieza');
    for (const id of creado.reservas) await prisma.reserva.deleteMany({ where: { id } }).catch(() => {});
    for (const id of creado.productos) {
      await prisma.reserva.deleteMany({ where: { productoId: id } });
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.deleteMany({ where: { id } });
    }
    ok(
      (await prisma.producto.count({ where: { codigo: { startsWith: marca } } })) === 0,
      'sin restos del QA',
    );
  }

  console.log(fallos === 0 ? '\n✔ Reservas: apartar stock funciona y se nota al cotizar' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error(String(e).split('\n').slice(0, 6).join('\n')); await prisma.$disconnect(); process.exit(1); });
