/**
 * QA funcional · Listas de precio con nombre
 *
 * Es el hueco 3 frente a STARSOFT: ellos asignan una lista a cada cliente y el
 * vendedor cotiza con ese precio. Aquí existía `preciosMayorista` —tramos por
 * cantidad, que valen para cualquiera y no se asignan a nadie— y nada más.
 *
 * Lo que se comprueba:
 *
 *   · sin lista asignada, el precio es el del catálogo: nada cambia para los
 *     clientes que ya existen
 *   · con lista y precio del producto en ella, manda la lista
 *   · con lista SIN ese producto pero con ajuste porcentual, manda el ajuste
 *   · con lista sin el producto y sin ajuste, vuelve el precio de catálogo
 *   · el listado de productos aplica la lista en UNA consulta y dice de dónde
 *     salió cada precio (`precioLista.origen`)
 *   · una lista desactivada deja de aplicarse sin tener que desasignarla
 *   · una lista con clientes asignados NO se puede borrar
 *   · dos listas no pueden llamarse igual
 *   · las lecturas están abiertas; escribir exige el permiso de clientes
 *
 * Crea su lista, su cliente y sus precios, y los borra al terminar.
 *
 * Uso:  pnpm run qa:listas-precio
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const SEDE = 1;
const MARCA = '[QA-LISTAS]';
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const S = (n) => `S/ ${Number(n).toFixed(2)}`;
const cerca = (a, b, tol = 0.02) => Math.abs(Number(a) - Number(b)) <= tol;

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
async function api(ruta, token, metodo = 'GET', body) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j?.data, message: j?.message };
}

const creado = { listas: [], clienteId: null };

async function limpiar() {
  if (creado.clienteId) {
    await prisma.cliente.updateMany({ where: { id: creado.clienteId }, data: { listaPrecioId: null } });
    await prisma.comprobante.deleteMany({ where: { clienteId: creado.clienteId } });
    await prisma.cliente.deleteMany({ where: { id: creado.clienteId } });
  }
  // Por NOMBRE, no solo por los ids que apuntó el script: si una creación salió
  // bien y la respuesta vino con otra forma, ese id no está en la lista.
  const listas = await prisma.listaPrecio.findMany({
    where: { nombre: { contains: MARCA } }, select: { id: true },
  });
  const ids = [...new Set([...creado.listas, ...listas.map((l) => l.id)])];
  if (ids.length) {
    await prisma.cliente.updateMany({ where: { listaPrecioId: { in: ids } }, data: { listaPrecioId: null } });
    await prisma.listaPrecioItem.deleteMany({ where: { listaPrecioId: { in: ids } } });
    await prisma.listaPrecio.deleteMany({ where: { id: { in: ids } } });
  }
}

async function main() {
  console.log(`\nQA · Listas de precio con nombre\n${'═'.repeat(50)}`);
  const token = await login();
  const empresa = await prisma.empresa.findFirst();

  const prods = await prisma.producto.findMany({
    where: { empresaId: empresa.id, precioUnitario: { gt: 10 } },
    orderBy: { id: 'asc' }, take: 2,
    select: { id: true, codigo: true, descripcion: true, precioUnitario: true },
  });
  if (prods.length < 2) throw new Error('hacen falta dos productos con precio');
  const [pEnLista, pFueraDeLista] = prods;
  const catalogoEn = Number(pEnLista.precioUnitario);
  const catalogoFuera = Number(pFueraDeLista.precioUnitario);
  console.log(`   productos: ${pEnLista.codigo} a ${S(catalogoEn)} · ${pFueraDeLista.codigo} a ${S(catalogoFuera)}`);

  const cli = await api('/clientes', token, 'POST', {
    nombre: `${MARCA} DISTRIBUIDORA DEL NORTE S.A.C.`,
    tipoDoc: 'RUC', nroDoc: '20777000222', persona: 'CLIENTE',
    ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA',
    direccion: 'Av. de Prueba 200',
  });
  ok(cli.status < 300, `cliente de prueba creado (HTTP ${cli.status})`);
  creado.clienteId = cli.data?.id;
  if (!creado.clienteId) throw new Error('sin cliente no se puede seguir');

  // ── 1. Sin lista, el precio es el del catálogo ────────────────────────────
  console.log('\n1) Sin lista asignada, manda el catálogo');
  const p0 = await api(`/listas-precio/precio/${creado.clienteId}/${pEnLista.id}`, token);
  ok(p0.status === 200, `el precio responde (HTTP ${p0.status})`);
  ok(cerca(p0.data?.precio, catalogoEn), `es el de catálogo (${S(p0.data?.precio)})`);
  ok(p0.data?.lista === null, 'y no hay lista que lo explique');

  const l0 = await api(`/productos?limit=5&search=${pEnLista.codigo}&clienteId=${creado.clienteId}`, token);
  const enListado0 = (l0.data?.productos ?? []).find((x) => x.id === pEnLista.id);
  ok(!!enListado0, 'el producto aparece en el listado');
  ok(enListado0 ? cerca(enListado0.precioUnitario, catalogoEn) : false, 'con el precio de catálogo');
  ok(enListado0?.precioLista === null, 'y sin marca de lista');

  // ── 2. Una lista con precio propio ────────────────────────────────────────
  console.log('\n2) Una lista con precio propio para el producto');
  const lista = await api('/listas-precio', token, 'POST', {
    nombre: `${MARCA} Distribuidor`,
    descripcion: 'Precio acordado con distribuidores',
  });
  ok(lista.status < 300, `lista creada (HTTP ${lista.status})`);
  const listaId = lista.data?.id;
  if (listaId) creado.listas.push(listaId);

  const dup = await api('/listas-precio', token, 'POST', { nombre: `${MARCA} Distribuidor` });
  ok(dup.status === 400, `dos listas con el mismo nombre se rechazan (HTTP ${dup.status})`);

  const precioAcordado = Math.round(catalogoEn * 0.8 * 100) / 100;
  const fijar = await api(`/listas-precio/${listaId}/productos/${pEnLista.id}`, token, 'PUT', { precio: precioAcordado });
  ok(fijar.status < 300, `precio de ${S(precioAcordado)} fijado en la lista (HTTP ${fijar.status})`);

  const cero = await api(`/listas-precio/${listaId}/productos/${pEnLista.id}`, token, 'PUT', { precio: 0 });
  ok(cero.status === 400, `un precio de 0 se rechaza (HTTP ${cero.status})`);

  const asignar = await api(`/listas-precio/asignar/${creado.clienteId}`, token, 'PATCH', { listaPrecioId: listaId });
  ok(asignar.status < 300, `lista asignada al cliente (HTTP ${asignar.status})`);

  const p1 = await api(`/listas-precio/precio/${creado.clienteId}/${pEnLista.id}`, token);
  ok(cerca(p1.data?.precio, precioAcordado), `ahora el precio es el de la lista (${S(p1.data?.precio)})`);
  ok(cerca(p1.data?.precioDeLista, catalogoEn), `y sigue diciendo el de catálogo (${S(p1.data?.precioDeLista)})`);
  ok(/Distribuidor/.test(String(p1.data?.motivo)), `el motivo nombra la lista — «${p1.data?.motivo}»`);

  // ── 3. Un producto que la lista no contempla ──────────────────────────────
  console.log('\n3) Un producto que la lista NO contempla');
  const p2 = await api(`/listas-precio/precio/${creado.clienteId}/${pFueraDeLista.id}`, token);
  ok(cerca(p2.data?.precio, catalogoFuera), `vuelve el catálogo (${S(p2.data?.precio)})`);
  ok(/no fija precio/.test(String(p2.data?.motivo)), `y lo dice — «${p2.data?.motivo}»`);

  // ── 4. Con ajuste porcentual, el resto de la lista también baja ───────────
  console.log('\n4) Con ajuste porcentual, la lista cubre TODO el catálogo');
  await api(`/listas-precio/${listaId}`, token, 'PUT', { ajustePorcentaje: -10 });
  const p3 = await api(`/listas-precio/precio/${creado.clienteId}/${pFueraDeLista.id}`, token);
  const esperado = Math.round(catalogoFuera * 0.9 * 100) / 100;
  ok(cerca(p3.data?.precio, esperado), `el producto fuera de lista sale a -10 % (${S(p3.data?.precio)} ≈ ${S(esperado)})`);
  const p4 = await api(`/listas-precio/precio/${creado.clienteId}/${pEnLista.id}`, token);
  ok(cerca(p4.data?.precio, precioAcordado), 'y el que SÍ tiene precio propio no lo pierde: el precio explícito gana al ajuste');

  // ── 5. El listado de productos aplica la lista ────────────────────────────
  console.log('\n5) El listado de productos aplica la lista y dice de dónde sale');
  const l1 = await api(`/productos?limit=5&search=${pEnLista.codigo}&clienteId=${creado.clienteId}`, token);
  const l1b = await api(`/productos?limit=5&search=${pFueraDeLista.codigo}&clienteId=${creado.clienteId}`, token);
  const enL = (l1.data?.productos ?? []).find((x) => x.id === pEnLista.id);
  const fueraL = (l1b.data?.productos ?? []).find((x) => x.id === pFueraDeLista.id);
  ok(enL ? cerca(enL.precioUnitario, precioAcordado) : false, `el de la lista sale a ${S(enL?.precioUnitario)}`);
  ok(enL?.precioLista?.origen === 'lista', `y marca el origen "lista" (${enL?.precioLista?.origen})`);
  ok(enL ? cerca(enL.precioLista?.precioCatalogo, catalogoEn) : false, 'guardando el precio de catálogo al lado');
  ok(fueraL ? cerca(fueraL.precioUnitario, esperado) : false, `el otro sale con el ajuste (${S(fueraL?.precioUnitario)})`);
  ok(fueraL?.precioLista?.origen === 'ajuste', `y marca el origen "ajuste" (${fueraL?.precioLista?.origen})`);

  const sinCliente = await api(`/productos?limit=5&search=${pEnLista.codigo}`, token);
  const sinC = (sinCliente.data?.productos ?? []).find((x) => x.id === pEnLista.id);
  ok(sinC ? cerca(sinC.precioUnitario, catalogoEn) : false, 'sin clienteId el listado no cambia nada');

  // ── 6. Desactivar la lista la apaga sin desasignarla ──────────────────────
  console.log('\n6) Desactivar la lista la apaga sin tener que desasignarla');
  await api(`/listas-precio/${listaId}`, token, 'PUT', { activa: false });
  const p5 = await api(`/listas-precio/precio/${creado.clienteId}/${pEnLista.id}`, token);
  ok(cerca(p5.data?.precio, catalogoEn), `vuelve el catálogo (${S(p5.data?.precio)})`);
  ok(p5.data?.lista === null, 'y la lista deja de aparecer');
  await api(`/listas-precio/${listaId}`, token, 'PUT', { activa: true });

  // ── 7. Una lista con clientes no se borra ─────────────────────────────────
  console.log('\n7) Una lista con clientes asignados NO se borra');
  const borrar = await api(`/listas-precio/${listaId}`, token, 'DELETE');
  ok(borrar.status === 400, `rechazado (HTTP ${borrar.status})`);
  ok(/asignada a 1 cliente/.test(String(borrar.message)), `y dice a cuántos — «${String(borrar.message).slice(0, 90)}»`);

  await api(`/listas-precio/asignar/${creado.clienteId}`, token, 'PATCH', { listaPrecioId: null });
  const borrar2 = await api(`/listas-precio/${listaId}`, token, 'DELETE');
  ok(borrar2.status < 300, `sin clientes, sí se borra (HTTP ${borrar2.status})`);
  creado.listas = creado.listas.filter((x) => x !== listaId);

  // ── 8. Permisos ───────────────────────────────────────────────────────────
  console.log('\n8) Permisos: leer abierto, escribir con permiso de clientes');
  const l2 = await api('/listas-precio', token, 'POST', { nombre: `${MARCA} Constructora` });
  if (l2.data?.id) creado.listas.push(l2.data.id);
  const tAlmacen = await login('almacen@kaisercorp.com.pe');
  const lee = await api('/listas-precio', tAlmacen);
  ok(lee.status === 200, `almacén LEE las listas (HTTP ${lee.status}): es una consulta`);
  const escribe = await api('/listas-precio', tAlmacen, 'POST', { nombre: `${MARCA} No debería` });
  ok(escribe.status === 403, `pero no las crea (HTTP ${escribe.status}): a qué precio se vende no lo decide almacén`);
  if (escribe.data?.id) creado.listas.push(escribe.data.id);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(fallos ? `✘ LISTAS DE PRECIO: ${fallos} problema(s)` : '✔ LISTAS DE PRECIO: todo verde');
}

main()
  .catch((e) => { console.error('\n✘ error:', e.message); fallos++; })
  .finally(async () => {
    await limpiar();
    console.log('   ↺ limpieza: listas, precios y cliente de prueba borrados');
    await prisma.$disconnect();
    process.exit(fallos ? 1 : 0);
  });
