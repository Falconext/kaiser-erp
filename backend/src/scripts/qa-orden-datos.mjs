/**
 * QA funcional · Los datos de la orden: sede, pedido, máquina y encargado
 *
 * Lo que faltaba en `OrdenProduccion`. De los cuatro, el que de verdad movía
 * dinero es la SEDE: hasta ahora se resolvía al EJECUTAR, con la del usuario
 * que pulsaba "Finalizar". En una empresa con dos almacenes eso significa que
 * la misma orden descontaba de uno o de otro según quién la cerrara. Ahora se
 * fija al crear y la ejecución la respeta.
 *
 * Las órdenes que ya existen no tienen sede, y tienen que seguir cayendo a la
 * del usuario: la compatibilidad también se comprueba aquí.
 *
 * Todo por la API real, con su propia sede, sus propios productos y su propio
 * pedido. No emite nada a SUNAT ni consume correlativos: el comprobante de
 * origen se inserta con una serie que no existe en `Serie`. Lo borra todo al
 * terminar.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE_TOKEN = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const r3 = (n) => Math.round(Number(n) * 1000) / 1000;

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
  if (r.status >= 400 || !r.data) throw new Error(`login falló (HTTP ${r.status})`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const sel = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE_TOKEN }) });
  return sel.data.accessToken;
}
const stockEn = async (productoId, sedeId) => {
  const ps = await prisma.productoStock.findFirst({ where: { productoId, sedeId }, select: { stock: true } });
  return ps ? Number(ps.stock) : 0;
};

async function main() {
  const token = await login();
  const marca = `QAO${Date.now().toString().slice(-8)}`;
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true, tipoAfectacionIGV: true, moneda: true } });
  const empresaId = ref.empresaId;
  const creado = { productos: [], ordenes: [], sedes: [], comprobantes: [] };

  const nuevoProducto = async (sufijo, { stock = 0, costo = 0 } = {}) => {
    const p = await prisma.producto.create({
      data: {
        codigo: `${marca}${sufijo}`, descripcion: `[QA-ORDEN] ${sufijo}`,
        precioUnitario: 1, valorUnitario: 1, stock, costoPromedio: costo,
        empresaId, unidadMedidaId: ref.unidadMedidaId,
        tipoAfectacionIGV: ref.tipoAfectacionIGV, moneda: ref.moneda,
      },
      select: { id: true, codigo: true },
    });
    creado.productos.push(p.id);
    return p;
  };

  try {
    console.log('\n🏭 QA · Sede, pedido, máquina y encargado en la orden\n');

    // ── 0. El decorado ──────────────────────────────────────────────────────
    const sedeTaller = await prisma.sede.create({
      data: { empresaId, nombre: `${marca} Taller`, codigo: marca.slice(-4), tipo: 'ALMACEN', activo: true },
      select: { id: true, nombre: true },
    });
    creado.sedes.push(sedeTaller.id);

    const insumo = await nuevoProducto('INS', { stock: 300, costo: 10 });
    const final = await nuevoProducto('FIN');
    // El insumo tiene existencias EN LAS DOS sedes: si la ejecución se
    // equivoca de almacén, no falla por falta de stock —descuenta del sitio
    // equivocado y nadie se entera—. Esa es justo la trampa que se comprueba.
    await prisma.productoStock.create({ data: { productoId: insumo.id, sedeId: sedeTaller.id, stock: 200 } });
    await prisma.productoStock.create({ data: { productoId: insumo.id, sedeId: SEDE_TOKEN, stock: 100 } });
    await prisma.producto.update({ where: { id: insumo.id }, data: { stock: 300 } });

    const cliente = await prisma.cliente.findFirst({ where: { empresaId }, select: { id: true } });
    const pedido = await prisma.comprobante.create({
      data: {
        empresaId, sedeId: SEDE_TOKEN, clienteId: cliente?.id ?? null,
        tipoDoc: 'COT', serie: `${marca.slice(0, 4)}9`,
        correlativo: 900000 + Math.floor(Math.random() * 9000),
        fechaEmision: new Date(), tipoMoneda: 'PEN',
        formaPagoTipo: 'CONTADO', formaPagoMoneda: 'PEN',
        mtoOperGravadas: 100, mtoIGV: 18, valorVenta: 100,
        totalImpuestos: 18, subTotal: 118, mtoImpVenta: 118, saldo: 118,
        estadoEnvioSunat: 'NO_APLICA',
        detalles: {
          create: [{
            productoId: final.id, unidad: 'NIU', descripcion: '[QA-ORDEN] módulo', cantidad: 7,
            mtoValorUnitario: 100, mtoValorVenta: 100, mtoBaseIgv: 100,
            porcentajeIgv: 18, igv: 18, tipAfeIgv: 10, totalImpuestos: 18, mtoPrecioUnitario: 118,
          }],
        },
      },
      select: { id: true, serie: true, correlativo: true },
    });
    creado.comprobantes.push(pedido.id);
    console.log(`   decorado: sede ${sedeTaller.nombre} (${sedeTaller.id}), pedido ${pedido.serie}-${pedido.correlativo}`);

    const crearOrden = async (body) => {
      const r = await api('/produccion/ordenes', { token, method: 'POST', body: JSON.stringify(body) });
      if (r.data?.id) creado.ordenes.push(r.data.id);
      return r;
    };

    // ── 1. Los cuatro datos se guardan ──────────────────────────────────────
    console.log('\n1) La orden guarda sede, pedido, máquina y encargado');
    const o1 = await crearOrden({
      productoFinalId: final.id,
      loteProduccion: `${marca}-L1`,
      cantidadObjetivo: 5,
      sedeId: sedeTaller.id,
      comprobanteId: pedido.id,
      maquina: 'Prensa 3',
      encargadoNombre: 'Ana Quispe',
      componentes: [{ productoInsumoId: insumo.id, cantidadTeorica: 50, unidad: 'UND' }],
    });
    ok(o1.status < 400, `se crea (HTTP ${o1.status})`);
    ok(o1.data?.sedeId === sedeTaller.id, `con su sede de fabricación (${o1.data?.sedeId})`);
    ok(o1.data?.comprobanteId === pedido.id, `y el pedido que la origina (${o1.data?.comprobanteId})`);
    ok(o1.data?.maquina === 'Prensa 3', `máquina (${o1.data?.maquina})`);
    ok(o1.data?.encargadoNombre === 'Ana Quispe', `encargado (${o1.data?.encargadoNombre})`);
    ok(o1.data?.sede?.nombre === sedeTaller.nombre, 'y la devuelve resuelta, no solo el id');

    // ── 2. La bitácora del pedido ───────────────────────────────────────────
    console.log('\n2) Queda anotado en la bitácora del pedido');
    const bitacora = await prisma.seguimientoCotizacion.findMany({
      where: { comprobanteId: pedido.id }, orderBy: { id: 'desc' },
    });
    const entrada = bitacora.find((b) => b.tipo === 'PRODUCCION');
    ok(!!entrada, `hay una entrada de tipo PRODUCCION (${bitacora.length} en total)`);
    ok(
      (entrada?.detalle ?? '').includes(`${marca}-L1`),
      `y dice con qué lote: ${(entrada?.detalle ?? '').slice(0, 60)}`,
    );
    ok(entrada?.usuarioId === null, 'sin usuario: la escribió el sistema, no una persona');

    // ── 3. El prellenado desde el pedido ────────────────────────────────────
    console.log('\n3) Abrir la orden desde el pedido no obliga a reteclear');
    const o2 = await crearOrden({
      loteProduccion: `${marca}-L2`,
      comprobanteId: pedido.id,
      componentes: [{ productoInsumoId: insumo.id, cantidadTeorica: 10, unidad: 'UND' }],
    });
    ok(o2.status < 400, `se crea sin producto ni cantidad en el body (HTTP ${o2.status})`);
    ok(o2.data?.productoFinalId === final.id, 'toma el producto de la línea del pedido');
    ok(Number(o2.data?.cantidadObjetivo) === 7, `y su cantidad: 7 (${Number(o2.data?.cantidadObjetivo)})`);

    // ── 4. La ejecución respeta la sede de la ORDEN ─────────────────────────
    // El token entra por la sede 1; la orden dice taller. Antes ganaba el
    // token y el consumo salía del almacén equivocado.
    console.log('\n4) La ejecución descuenta de la sede de la orden, no de la del usuario');
    const tallerAntes = await stockEn(insumo.id, sedeTaller.id);
    const sedeTokenAntes = await stockEn(insumo.id, SEDE_TOKEN);
    const eje = await api(`/produccion/ordenes/${o1.data.id}/ejecutar`, {
      token, method: 'POST',
      body: JSON.stringify({
        cantidadProducida: 5,
        componentes: [{ productoInsumoId: insumo.id, cantidadConsumida: 40, mermaCantidad: 2 }],
        maquina: 'Prensa 5',
        encargadoNombre: 'Luis Ramos',
        pesoRefRollo: 51.5,
        diametroCm: 60,
        alturaRolloM: 1.2,
      }),
    });
    ok(eje.status < 400, `la orden se ejecuta (HTTP ${eje.status})`);
    const tallerDespues = await stockEn(insumo.id, sedeTaller.id);
    const sedeTokenDespues = await stockEn(insumo.id, SEDE_TOKEN);
    ok(r3(tallerAntes - tallerDespues) === 42, `salieron 42 del taller: consumido + merma (${r3(tallerAntes - tallerDespues)})`);
    ok(r3(sedeTokenAntes - sedeTokenDespues) === 0, `y NADA de la sede del usuario (${r3(sedeTokenAntes - sedeTokenDespues)})`);
    const mov = await prisma.movimientoKardex.findFirst({
      where: { productoId: insumo.id, tipoMovimiento: 'SALIDA' }, orderBy: { id: 'desc' },
      select: { sedeId: true },
    });
    ok(mov?.sedeId === sedeTaller.id, `el apunte de kardex lleva la sede del taller (${mov?.sedeId})`);
    const finalEnTaller = await stockEn(final.id, sedeTaller.id);
    ok(r3(finalEnTaller) === 5, `y lo fabricado entró al mismo almacén (${r3(finalEnTaller)})`);

    // ── 5. Máquina, encargado y medidas al cerrar ───────────────────────────
    console.log('\n5) Planta corrige máquina y encargado al terminar');
    const cerrada = await prisma.ordenProduccion.findUnique({
      where: { id: o1.data.id },
      select: { maquina: true, encargadoNombre: true, pesoRefRollo: true, diametroCm: true, alturaRolloM: true },
    });
    ok(cerrada?.maquina === 'Prensa 5', `la máquina de la ejecución pisa la de la creación (${cerrada?.maquina})`);
    ok(cerrada?.encargadoNombre === 'Luis Ramos', `y el encargado (${cerrada?.encargadoNombre})`);
    ok(Number(cerrada?.pesoRefRollo) === 51.5, `peso del rollo de referencia (${Number(cerrada?.pesoRefRollo)})`);
    ok(Number(cerrada?.diametroCm) === 60, `diámetro (${Number(cerrada?.diametroCm)})`);
    ok(Number(cerrada?.alturaRolloM) === 1.2, `altura (${Number(cerrada?.alturaRolloM)})`);

    // ── 6. Las órdenes de antes no cambian de comportamiento ────────────────
    console.log('\n6) Una orden SIN sede sigue cayendo a la del usuario');
    const o3 = await crearOrden({
      productoFinalId: final.id,
      loteProduccion: `${marca}-L3`,
      cantidadObjetivo: 1,
      componentes: [{ productoInsumoId: insumo.id, cantidadTeorica: 10, unidad: 'UND' }],
    });
    ok(o3.data?.sedeId === null, 'nace sin sede, como todas las que ya existen');
    const tokenAntes3 = await stockEn(insumo.id, SEDE_TOKEN);
    const eje3 = await api(`/produccion/ordenes/${o3.data.id}/ejecutar`, {
      token, method: 'POST',
      body: JSON.stringify({ cantidadProducida: 1, componentes: [{ productoInsumoId: insumo.id, cantidadConsumida: 10 }] }),
    });
    ok(eje3.status < 400, `se ejecuta igual (HTTP ${eje3.status})`);
    ok(r3(tokenAntes3 - (await stockEn(insumo.id, SEDE_TOKEN))) === 10, 'y descuenta de la sede del usuario, como antes');

    // ── 7. Lo que no se acepta ──────────────────────────────────────────────
    console.log('\n7) Lo que el sistema no deja');
    const sedeAjena = await crearOrden({
      productoFinalId: final.id, loteProduccion: `${marca}-L4`, cantidadObjetivo: 1,
      sedeId: 999999,
      componentes: [{ productoInsumoId: insumo.id, cantidadTeorica: 1, unidad: 'UND' }],
    });
    ok(sedeAjena.status === 400, `una sede que no es de la empresa se rechaza (HTTP ${sedeAjena.status})`);
    const pedidoAjeno = await crearOrden({
      productoFinalId: final.id, loteProduccion: `${marca}-L5`, cantidadObjetivo: 1,
      comprobanteId: 999999,
      componentes: [{ productoInsumoId: insumo.id, cantidadTeorica: 1, unidad: 'UND' }],
    });
    ok(pedidoAjeno.status === 400, `y un comprobante que no es suyo tampoco (HTTP ${pedidoAjeno.status})`);
    const sinCantidad = await crearOrden({
      productoFinalId: final.id, loteProduccion: `${marca}-L6`,
      componentes: [{ productoInsumoId: insumo.id, cantidadTeorica: 1, unidad: 'UND' }],
    });
    ok(sinCantidad.status === 400, `sin cantidad y sin pedido del que sacarla, falla (HTTP ${sinCantidad.status})`);

    // ── 8. La lista ─────────────────────────────────────────────────────────
    console.log('\n8) La lista de órdenes trae las columnas nuevas');
    const lista = await api('/produccion/ordenes?limit=50', { token });
    const fila = (lista.data?.data ?? []).find((o) => o.id === o1.data.id);
    ok(!!fila, 'la orden aparece en la lista');
    ok(fila?.sede?.nombre === sedeTaller.nombre, `con su sede (${fila?.sede?.nombre})`);
    ok(
      fila?.comprobante?.serie === pedido.serie && fila?.comprobante?.correlativo === pedido.correlativo,
      `y su pedido (${fila?.comprobante?.serie}-${fila?.comprobante?.correlativo})`,
    );
    ok(fila?.maquina === 'Prensa 5' && fila?.encargadoNombre === 'Luis Ramos', 'más máquina y encargado');
  } finally {
    console.log('\n9) Limpieza');
    for (const id of creado.ordenes) {
      await prisma.movimientoProduccion.deleteMany({ where: { ordenProduccionId: id } });
      await prisma.ordenProduccionComponente.deleteMany({ where: { ordenProduccionId: id } });
      await prisma.ordenProduccion.deleteMany({ where: { id } });
    }
    for (const id of creado.comprobantes) {
      await prisma.seguimientoCotizacion.deleteMany({ where: { comprobanteId: id } });
      await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: id } });
      await prisma.comprobante.deleteMany({ where: { id } });
    }
    // Por PREFIJO: con un almacén de mermas configurado, ejecutar con merma
    // crea también el producto `-DESC` del descarte, que no está en
    // `creado.productos` porque lo crea el servicio.
    const mios = await prisma.producto.findMany({
      where: { codigo: { startsWith: marca } }, select: { id: true },
    });
    for (const { id } of mios) {
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.updateMany({ where: { productoOrigenId: id }, data: { productoOrigenId: null } });
      await prisma.producto.deleteMany({ where: { id } });
    }
    for (const id of creado.sedes) await prisma.sede.deleteMany({ where: { id } });
    const quedan = await prisma.producto.count({ where: { codigo: { startsWith: marca } } });
    ok(quedan === 0, `los productos de prueba eliminados (quedan ${quedan})`);
    ok((await prisma.sede.count({ where: { nombre: { contains: marca } } })) === 0, 'la sede de prueba eliminada');
    ok((await prisma.comprobante.count({ where: { id: { in: creado.comprobantes } } })) === 0, 'el pedido de prueba eliminado');
  }

  console.log(fallos === 0 ? '\n✔ Datos de la orden: todo correcto' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error('\n✘', e.message); await prisma.$disconnect(); process.exit(1); });
