/**
 * Datos de demostración para lo que quedaba vacío en el circuito comercial:
 * límites de crédito, listas de precio y notas de pedido con su V°B°.
 *
 * Los tres módulos existen y están probados, pero sin datos las pantallas abren
 * en blanco —"todavía no hay ningún cliente con límite"— y en una demo eso se
 * lee como que no está hecho.
 *
 * Lo que siembra, y por qué así:
 *
 *  · LÍMITES DE CRÉDITO a cinco clientes, con tres situaciones distintas para que
 *    la pantalla tenga las tres: con cupo de sobra, apurado, y uno EXCEDIDO. Un
 *    panel donde todo está en verde no demuestra nada.
 *  · TRES LISTAS DE PRECIO con los nombres que usaría Kaiser (Distribuidor,
 *    Constructora, Agroexportación), cada una con precios propios en los productos
 *    de su sector y un ajuste porcentual para el resto del catálogo.
 *  · TRES NOTAS DE PEDIDO en los estados del flujo: una PENDIENTE normal, una ya
 *    AUTORIZADA por Karim, y una RETENIDA por pasarse del límite de crédito —que
 *    es el caso que STARSOFT enseñó y el que hay que poder enseñar de vuelta.
 *
 * Es idempotente: todo lo suyo lleva la marca y se borra al volver a ejecutarlo.
 *
 *   pnpm run seed:comercial-demo
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const SEDE = 1;
const MARCA = '[demo-comercial]';
const IGV = 1.18;
const r2 = (n) => Math.round(n * 100) / 100;
const S = (n) => `S/ ${Number(n).toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

async function login() {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'gerencia@kaisercorp.com.pe', password: 'kaiser123' }),
  });
  const j = await r.json();
  if (!j.data) throw new Error(`login falló: ${j?.message}. ¿Está el backend arriba?`);
  if (!j.data.requiresSedeSelection) return j.data.accessToken;
  const r2_ = await fetch(`${API}/auth/select-sede`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
    body: JSON.stringify({ sedeId: SEDE }),
  });
  return (await r2_.json()).data.accessToken;
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

/**
 * Límites por cliente, en soles. `holgura` dice qué situación se busca, y el
 * límite se calcula CONTRA LA DEUDA REAL de cada uno: poner números fijos haría
 * que la demo se descuadrara en cuanto cambien las ventas sembradas.
 */
const CREDITOS = [
  { ruc: '20530012345', holgura: 'amplia',   dias: 30 }, // Valle de Ica
  { ruc: '20600998877', holgura: 'apurada',  dias: 45 }, // Olmos
  { ruc: '20481122334', holgura: 'excedida', dias: 30 }, // Avícola Norte Verde
  { ruc: '20455667788', holgura: 'amplia',   dias: 15 }, // Granjas del Sur
  { ruc: '20556677889', holgura: 'apurada',  dias: 30 }, // Ferretera Lima
];

const LISTAS = [
  {
    nombre: 'Distribuidor',
    descripcion: 'Ferreterías y distribuidores con volumen mensual comprometido',
    ajuste: -12,
    clientes: ['20556677889', '20612255963'],
    productos: ['20110PUAS0001', '20120GANA0008', '20590TENS0001'],
    descuento: 0.82,
  },
  {
    nombre: 'Constructora',
    descripcion: 'Obra civil y minería — precio por proyecto',
    ajuste: -8,
    clientes: ['20512345678', '20487654321'],
    productos: ['10210GTRZ0011', '20510TREN0003', '20510GACC0003'],
    descuento: 0.88,
  },
  {
    nombre: 'Agroexportación',
    descripcion: 'Campañas de agroexportación con compromiso de temporada',
    ajuste: -10,
    clientes: ['20530012345', '20600998877'],
    productos: ['22530COVI0001', '22030CSUE0002', '22630MTER0002', '20840FAGR0012'],
    descuento: 0.85,
  },
];

async function limpiar(token) {
  // Pedidos de la demo comercial.
  const pedidos = await prisma.comprobante.findMany({
    where: { origenDato: MARCA }, select: { id: true },
  });
  const ids = pedidos.map((p) => p.id);
  if (ids.length) {
    // Devolver el stock antes de borrar el kardex, o cada pasada dejaría el
    // inventario más bajo que la anterior.
    const movs = await prisma.movimientoKardex.findMany({
      where: { comprobanteId: { in: ids } },
      select: { productoId: true, sedeId: true, cantidad: true, tipoMovimiento: true },
    });
    for (const m of movs) {
      if (!m.sedeId) continue;
      const signo = m.tipoMovimiento === 'SALIDA' ? 1 : -1;
      await prisma.productoStock.updateMany({
        where: { productoId: m.productoId, sedeId: m.sedeId },
        data: { stock: { increment: signo * Number(m.cantidad) } },
      });
    }
    await prisma.movimientoKardex.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.comisionVendedor.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.pago.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.leyenda.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.comprobante.deleteMany({ where: { id: { in: ids } } });
    // El stock global es la SUMA de las sedes, no el de una.
    const tocados = [...new Set(movs.map((m) => m.productoId))];
    for (const pid of tocados) {
      const g = await prisma.productoStock.aggregate({ where: { productoId: pid }, _sum: { stock: true } });
      await prisma.producto.update({ where: { id: pid }, data: { stock: Number(g._sum.stock ?? 0) } });
    }
  }

  // Listas de precio de la demo.
  const listas = await prisma.listaPrecio.findMany({
    where: { nombre: { in: LISTAS.map((l) => l.nombre) } }, select: { id: true },
  });
  const lids = listas.map((l) => l.id);
  if (lids.length) {
    await prisma.cliente.updateMany({ where: { listaPrecioId: { in: lids } }, data: { listaPrecioId: null } });
    await prisma.listaPrecioItem.deleteMany({ where: { listaPrecioId: { in: lids } } });
    await prisma.listaPrecio.deleteMany({ where: { id: { in: lids } } });
  }

  // Límites de crédito.
  await prisma.cliente.updateMany({
    where: { nroDoc: { in: CREDITOS.map((c) => c.ruc) } },
    data: { limiteCredito: null, diasCredito: null },
  });

  return { pedidos: ids.length, listas: lids.length };
}

async function main() {
  const token = await login();
  const empresa = await prisma.empresa.findFirst();
  const sede = await prisma.sede.findFirst({ where: { empresaId: empresa.id } });

  const borrado = await limpiar(token);
  if (borrado.pedidos || borrado.listas) {
    console.log(`↺ Limpieza previa: ${borrado.pedidos} pedido(s), ${borrado.listas} lista(s).`);
  }

  // ── 1. Límites de crédito ────────────────────────────────────────────────
  console.log('\n── Límites de crédito ──');
  const limites = new Map();
  for (const c of CREDITOS) {
    const cli = await prisma.cliente.findFirst({
      where: { empresaId: empresa.id, nroDoc: c.ruc }, select: { id: true, nombre: true },
    });
    if (!cli) { console.log(`  ⚠ ${c.ruc} no existe, se omite`); continue; }

    const est = await api(`/clientes/${cli.id}/credito`, token);
    const deuda = Number(est.data?.deuda ?? 0);

    // El límite se fija CONTRA la deuda real, no en duro: así la demo sigue
    // contando la misma historia aunque cambien las ventas sembradas.
    // Con deuda cero no hay "apurado" ni "excedido" que enseñar, así que se le
    // pone un cupo normal: un límite de S/ 500 a una ferretería industrial no se
    // lo cree nadie, y un número que no se cree estropea la demo más que ayudarla.
    const limite =
      deuda <= 0               ? (c.holgura === 'amplia' ? 60000 : 25000)
      : c.holgura === 'amplia'   ? Math.ceil((deuda + 40000) / 1000) * 1000
      : c.holgura === 'apurada' ? Math.ceil((deuda * 1.08 + 500) / 100) * 100
      : /* excedida */           Math.floor((deuda * 0.7) / 100) * 100;

    await prisma.cliente.update({
      where: { id: cli.id },
      data: { limiteCredito: limite, diasCredito: c.dias },
    });
    limites.set(c.ruc, { clienteId: cli.id, nombre: cli.nombre, limite, deuda });
    const etiqueta = c.holgura === 'excedida' ? 'EXCEDIDO' : c.holgura;
    console.log(`  ${cli.nombre.padEnd(38).slice(0, 38)} límite ${S(limite).padStart(14)} · debe ${S(deuda).padStart(13)} · ${etiqueta}`);
  }

  // ── 2. Listas de precio ──────────────────────────────────────────────────
  console.log('\n── Listas de precio ──');
  for (const L of LISTAS) {
    const creada = await api('/listas-precio', token, 'POST', {
      nombre: L.nombre, descripcion: L.descripcion, ajustePorcentaje: L.ajuste,
    });
    if (creada.status >= 300) { console.log(`  ⚠ ${L.nombre}: ${creada.message}`); continue; }
    const listaId = creada.data.id;

    let puestos = 0;
    for (const codigo of L.productos) {
      const p = await prisma.producto.findFirst({
        where: { empresaId: empresa.id, codigo }, select: { id: true, precioUnitario: true },
      });
      if (!p) continue;
      const precio = r2(Number(p.precioUnitario) * L.descuento);
      const r = await api(`/listas-precio/${listaId}/productos/${p.id}`, token, 'PUT', { precio });
      if (r.status < 300) puestos += 1;
    }

    let asignados = 0;
    for (const ruc of L.clientes) {
      const cli = await prisma.cliente.findFirst({
        where: { empresaId: empresa.id, nroDoc: ruc }, select: { id: true },
      });
      if (!cli) continue;
      const r = await api(`/listas-precio/asignar/${cli.id}`, token, 'PATCH', { listaPrecioId: listaId });
      if (r.status < 300) asignados += 1;
    }
    console.log(`  ${L.nombre.padEnd(18)} ${String(puestos).padStart(2)} precio(s) propios · resto ${L.ajuste}% · ${asignados} cliente(s)`);
  }

  // ── 3. Notas de pedido con su V°B° ───────────────────────────────────────
  console.log('\n── Notas de pedido ──');
  const karim = await prisma.autorizadorPedido.findFirst({
    where: { empresaId: empresa.id, nombre: { contains: 'Karim' } }, select: { id: true, nombre: true },
  });

  const prodPedido = async (codigo) =>
    prisma.producto.findFirst({
      where: { empresaId: empresa.id, codigo },
      select: { id: true, codigo: true, precioUnitario: true, unidadVenta: true },
    });

  /** Un pedido al crédito. `importe` solo orienta la cantidad. */
  const crearPedido = async ({ ruc, codigo, cantidad, dia, autorizar, forzar }) => {
    const cli = await prisma.cliente.findFirst({
      where: { empresaId: empresa.id, nroDoc: ruc }, select: { id: true, nombre: true },
    });
    const p = await prodPedido(codigo);
    if (!cli || !p) return null;
    const valorUnit = r2(Number(p.precioUnitario) / IGV);

    const r = await api('/comprobante/informal', token, 'POST', {
      sedeId: SEDE, tipoOperacionId: 1, tipoDoc: 'NP',
      fechaEmision: new Date(Date.UTC(2026, 8, dia, 15, 0, 0)).toISOString(),
      formaPagoTipo: 'Credito', formaPagoMoneda: 'PEN', tipoMoneda: 'PEN',
      clienteId: cli.id, clienteName: cli.nombre,
      leyenda: '',
      medioPago: 'TRANSFERENCIA',
      ...(forzar ? { autorizarExcesoCredito: true } : {}),
      detalles: [{ productoId: p.id, cantidad, nuevoValorUnitario: valorUnit }],
    });
    if (r.status >= 300) {
      console.log(`  ⚠ pedido de ${cli.nombre}: ${JSON.stringify(r.message).slice(0, 110)}`);
      return null;
    }
    // La marca va en `origenDato`, NUNCA en observaciones: las observaciones se
    // imprimen en el documento que ve el cliente.
    await prisma.comprobante.update({ where: { id: r.data.id }, data: { origenDato: MARCA } });

    const g = await prisma.comprobante.findUnique({
      where: { id: r.data.id },
      select: { serie: true, correlativo: true, excedeLimiteCredito: true, mtoImpVenta: true },
    });
    const doc = `${g.serie}-${String(g.correlativo).padStart(8, '0')}`;

    let estado = 'PENDIENTE';
    if (autorizar && karim) {
      const a = await api(`/flujo-comercial/pedidos/${r.data.id}/autorizar`, token, 'POST', {
        autorizadoPorId: karim.id,
      });
      if (a.status < 300) estado = `AUTORIZADO por ${karim.nombre}`;
    }
    console.log(
      `  ${doc}  ${cli.nombre.padEnd(34).slice(0, 34)} ${S(g.mtoImpVenta).padStart(13)}  ${estado}` +
        (g.excedeLimiteCredito ? '  ← RETENIDO por crédito' : ''),
    );
    return r.data.id;
  };

  // Uno normal, pendiente de V°B°.
  await crearPedido({ ruc: '20455667788', codigo: '20120GANA0008', cantidad: 12, dia: 24, autorizar: false });
  // Uno ya autorizado por Karim: el flujo completo se ve en el listado.
  await crearPedido({ ruc: '20530012345', codigo: '22530COVI0001', cantidad: 4, dia: 22, autorizar: true });
  // Y el que se pasa del límite: se guarda marcado y espera V°B°. Es el caso que
  // STARSOFT enseñó y el que hay que poder enseñar de vuelta.
  await crearPedido({ ruc: '20481122334', codigo: '20630DIAM0001', cantidad: 20, dia: 27, autorizar: false, forzar: true });

  // ── Resumen ──────────────────────────────────────────────────────────────
  const retenidos = await api('/credito/pedidos-retenidos', token);
  const excedidos = await api('/credito/excedidos', token);
  console.log('\n✔ Listo');
  console.log(`  clientes con límite ....... ${(excedidos.data?.todos ?? []).length}`);
  console.log(`  de ellos, excedidos ....... ${(excedidos.data?.excedidos ?? []).length}`);
  console.log(`  pedidos esperando V°B° .... ${(retenidos.data ?? []).length}`);
  console.log(`  listas de precio .......... ${LISTAS.length}\n`);
}

main()
  .catch((e) => { console.error('\n✘ error:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
