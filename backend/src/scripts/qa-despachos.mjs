/**
 * QA funcional · Aviso de despacho pendiente
 *
 * Ari lo preguntó en la reunión —"si despacho 4 de 10, ¿el sistema me avisa de
 * las 6 que faltan?"— y STARSOFT contestó que no: *"no te envía alertas, sino que
 * genera el reporte y analizas nuestra información"*.
 *
 * Lo que se comprueba, con el caso exacto que preguntó:
 *
 *   · una venta sin guía sale como SIN_DESPACHAR, con todo pendiente
 *   · una guía de 4 de 10 la deja PARCIAL, con 6 pendientes y 40 % despachado
 *   · completar el resto la saca de la lista
 *   · una guía ANULADA no cuenta como despacho
 *   · despachar de MÁS no deja el pendiente en negativo: se marca aparte
 *   · el aviso nombra el documento y las cantidades, no un "tienes pendientes"
 *   · no se repite si ya hay uno sin leer de las últimas 20 horas
 *   · `diasGracia` protege lo de hoy: una venta de hoy sin guía no es una alerta
 *   · el aviso llega a almacén, no solo a gerencia
 *
 * Crea su cliente, su venta y sus guías, y lo borra todo al terminar. Usa NV y
 * una serie de guías propia para no morder la numeración real.
 *
 * Uso:  pnpm run qa:despachos
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const SEDE = 1;
const MARCA = '[QA-DESPACHOS]';
const SERIE_GUIA = 'TQA1';
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
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

const creado = { clienteId: null, comprobanteId: null, guias: [] };

async function limpiar() {
  if (creado.guias.length) {
    await prisma.detalleGuiaRemision.deleteMany({ where: { guiaRemisionId: { in: creado.guias } } });
    await prisma.guiaRemision.deleteMany({ where: { id: { in: creado.guias } } });
  }
  await prisma.guiaRemision.deleteMany({ where: { serie: SERIE_GUIA } });
  await prisma.notificacion.deleteMany({ where: { titulo: 'Despachos pendientes' } });
  if (creado.clienteId) {
    const ids = (await prisma.comprobante.findMany({
      where: { clienteId: creado.clienteId }, select: { id: true },
    })).map((c) => c.id);
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
      await prisma.producto.update({
        where: { id: m.productoId },
        data: { stock: { increment: signo * Number(m.cantidad) } },
      });
    }
    await prisma.movimientoKardex.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.comisionVendedor.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.pago.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.leyenda.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.comprobante.deleteMany({ where: { id: { in: ids } } });
    await prisma.cliente.deleteMany({ where: { id: creado.clienteId } });
  }
}

/** Una guía escrita directo: el endpoint pide 20 campos de SUNAT que no son el tema. */
async function crearGuia(empresa, sede, usuarioId, correlativo, cantidad, productoId, codigo, opts = {}) {
  const g = await prisma.guiaRemision.create({
    data: {
      empresaId: empresa.id, sedeId: sede.id, usuarioId,
      clienteId: creado.clienteId,
      comprobanteId: opts.sinEnlace ? null : creado.comprobanteId,
      tipoGuia: 'REMITENTE', tipoDocumento: '09',
      serie: SERIE_GUIA, correlativo,
      fechaEmision: new Date(), horaEmision: '10:00:00',
      remitenteRuc: empresa.ruc, remitenteRazonSocial: empresa.razonSocial,
      remitenteDireccion: 'Av. de Prueba 300',
      destinatarioTipoDoc: '6', destinatarioNumDoc: '20777000333',
      destinatarioRazonSocial: `${MARCA} FERRETERA DE PRUEBA S.A.C.`,
      tipoTraslado: '01', modoTransporte: '02',
      partidaUbigeo: '150101', partidaDireccion: 'Av. de Prueba 300',
      llegadaUbigeo: '150101', llegadaDireccion: 'Av. Destino 400',
      fechaInicioTraslado: new Date(),
      pesoTotal: 1,
      unidadPeso: 'KGM',
      estadoSunat: opts.anulada ? 'ANULADO' : 'PENDIENTE',
      observaciones: MARCA,
      origenDato: MARCA,
      detalles: {
        create: [{
          numeroOrden: 1, productoId, codigoProducto: codigo,
          descripcion: 'Producto de prueba', cantidad, unidadMedida: 'NIU',
        }],
      },
    },
  });
  creado.guias.push(g.id);
  return g;
}

async function main() {
  console.log(`\nQA · Aviso de despacho pendiente\n${'═'.repeat(52)}`);
  await limpiar(); // por si una pasada anterior se interrumpió
  const token = await login();
  const empresa = await prisma.empresa.findFirst();
  const sede = await prisma.sede.findFirst({ where: { empresaId: empresa.id } });
  const gerencia = await prisma.usuario.findFirst({ where: { empresaId: empresa.id, rol: 'ADMIN_EMPRESA' }, select: { id: true } });

  const prod = await prisma.producto.findFirst({
    where: { empresaId: empresa.id, precioUnitario: { gt: 0 }, stock: { gt: 100 } },
    orderBy: { stock: 'desc' },
    select: { id: true, codigo: true, precioUnitario: true },
  });
  if (!prod) throw new Error('no hay producto con stock para la prueba');
  const valorUnit = Math.round((Number(prod.precioUnitario) / 1.18) * 100) / 100;

  const cli = await api('/clientes', token, 'POST', {
    nombre: `${MARCA} FERRETERA DE PRUEBA S.A.C.`,
    tipoDoc: 'RUC', nroDoc: '20777000333', persona: 'CLIENTE',
    ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA',
    direccion: 'Av. Destino 400',
  });
  ok(cli.status < 300, `cliente de prueba creado (HTTP ${cli.status})`);
  creado.clienteId = cli.data?.id;
  if (!creado.clienteId) throw new Error('sin cliente no se puede seguir');

  // ── 1. Una venta de 10 unidades, sin guía ─────────────────────────────────
  console.log('\n1) Un pedido de 10 unidades y ninguna guía');
  const venta = await api('/comprobante/informal', token, 'POST', {
    sedeId: SEDE, tipoOperacionId: 1, tipoDoc: 'NP',
    fechaEmision: new Date().toISOString(),
    formaPagoTipo: 'Contado', formaPagoMoneda: 'PEN', tipoMoneda: 'PEN',
    clienteId: creado.clienteId, clienteName: `${MARCA} FERRETERA DE PRUEBA S.A.C.`,
    leyenda: MARCA, medioPago: 'EFECTIVO',
    detalles: [{ productoId: prod.id, cantidad: 10, nuevoValorUnitario: valorUnit }],
  });
  ok(venta.status < 300, `pedido emitido (HTTP ${venta.status})`);
  creado.comprobanteId = venta.data?.id;
  if (!creado.comprobanteId) throw new Error('sin venta no se puede seguir');

  const r1 = await api('/despachos/pendientes', token);
  ok(r1.status === 200, `la lista de pendientes responde (HTTP ${r1.status})`);
  const f1 = (r1.data?.filas ?? []).find((f) => f.comprobanteId === creado.comprobanteId);
  ok(!!f1, 'el pedido aparece como pendiente');
  ok(f1?.estado === 'SIN_DESPACHAR', `y como SIN_DESPACHAR (${f1?.estado})`);
  ok(f1 ? cerca(f1.unidadesPendientes, 10) : false, `con 10 unidades pendientes (${f1?.unidadesPendientes})`);
  ok(f1 ? cerca(f1.porcentajeDespachado, 0) : false, `y 0 % despachado (${f1?.porcentajeDespachado} %)`);

  // ── 2. Cuatro de diez ─────────────────────────────────────────────────────
  console.log('\n2) Se despachan 4 de 10 — el caso que preguntó Ari');
  await crearGuia(empresa, sede, gerencia.id, 9001, 4, prod.id, prod.codigo);
  const r2 = await api('/despachos/pendientes', token);
  const f2 = (r2.data?.filas ?? []).find((f) => f.comprobanteId === creado.comprobanteId);
  ok(f2?.estado === 'PARCIAL', `pasa a PARCIAL (${f2?.estado})`);
  ok(f2 ? cerca(f2.unidadesPendientes, 6) : false, `y avisa de las 6 que faltan (${f2?.unidadesPendientes})`);
  ok(f2 ? cerca(f2.porcentajeDespachado, 40) : false, `40 % despachado (${f2?.porcentajeDespachado} %)`);
  const linea = f2?.detalle?.[0];
  ok(linea ? cerca(linea.vendida, 10) && cerca(linea.despachada, 4) && cerca(linea.pendiente, 6) : false,
     `la línea lo desglosa: vendidas ${linea?.vendida}, despachadas ${linea?.despachada}, faltan ${linea?.pendiente}`);
  ok((f2?.guias ?? []).length === 1, `y enlaza la guía que la despachó (${(f2?.guias ?? []).length})`);

  // ── 3. Una guía anulada no cuenta ─────────────────────────────────────────
  console.log('\n3) Una guía ANULADA no cuenta como despacho');
  await crearGuia(empresa, sede, gerencia.id, 9002, 6, prod.id, prod.codigo, { anulada: true });
  const r3 = await api('/despachos/pendientes', token);
  const f3 = (r3.data?.filas ?? []).find((f) => f.comprobanteId === creado.comprobanteId);
  ok(f3 ? cerca(f3.unidadesPendientes, 6) : false, `siguen faltando 6 (${f3?.unidadesPendientes})`);

  // ── 4. Una guía sin enlace tampoco ────────────────────────────────────────
  console.log('\n4) Una guía sin enlazar al comprobante tampoco cuenta');
  await crearGuia(empresa, sede, gerencia.id, 9003, 6, prod.id, prod.codigo, { sinEnlace: true });
  const r4 = await api('/despachos/pendientes', token);
  const f4 = (r4.data?.filas ?? []).find((f) => f.comprobanteId === creado.comprobanteId);
  ok(f4 ? cerca(f4.unidadesPendientes, 6) : false,
     `siguen faltando 6: sin FK no hay forma de saber qué despacha (${f4?.unidadesPendientes})`);

  // ── 5. El aviso dice las cantidades ───────────────────────────────────────
  console.log('\n5) El aviso nombra el documento y las cantidades');
  // diasGracia 0 para que la venta de hoy entre.
  const av = await api('/despachos/avisar?diasGracia=0', token, 'POST');
  ok(av.status < 300, `el aviso se genera (HTTP ${av.status})`);
  ok((av.data?.avisados ?? 0) >= 1, `avisa de ${av.data?.avisados} documento(s)`);
  const miDoc = (await prisma.comprobante.findUnique({
    where: { id: creado.comprobanteId }, select: { serie: true, correlativo: true },
  }));
  const miDocStr = `${miDoc.serie}-${String(miDoc.correlativo).padStart(8, '0')}`;
  ok((av.data?.documentos ?? []).includes(miDocStr), `y el pedido de la prueba está entre ellos (${miDocStr})`);
  ok((av.data?.destinatarios ?? 0) >= 2, `y llega a ${av.data?.destinatarios} personas, no solo a gerencia`);

  const notif = await prisma.notificacion.findFirst({
    where: { titulo: 'Despachos pendientes' }, orderBy: { id: 'desc' },
    select: { mensaje: true, tipo: true, usuarioId: true },
  });
  ok(!!notif, 'la notificación queda guardada');
  ok(/TQA1|NV|de 10/.test(String(notif?.mensaje)), `y el mensaje trae el caso concreto`);
  console.log(`      «${String(notif?.mensaje).slice(0, 170)}»`);
  ok(notif?.tipo === 'WARNING', `marcada como WARNING por haber despachos a medias (${notif?.tipo})`);

  const almacen = await prisma.usuario.findFirst({ where: { email: 'almacen@kaisercorp.com.pe' }, select: { id: true } });
  const paraAlmacen = await prisma.notificacion.count({
    where: { titulo: 'Despachos pendientes', usuarioId: almacen?.id },
  });
  ok(paraAlmacen > 0, 'almacén la recibe: es quien tiene que sacar la mercadería');

  // ── 6. No se repite ───────────────────────────────────────────────────────
  console.log('\n6) No se repite si ya hay uno sin leer');
  const av2 = await api('/despachos/avisar?diasGracia=0', token, 'POST');
  ok(av2.data?.yaAvisado === true, 'el segundo aviso se salta');
  ok((av2.data?.avisados ?? -1) === 0, `sin crear notificaciones nuevas (${av2.data?.avisados})`);

  // ── 7. diasGracia protege lo de hoy ───────────────────────────────────────
  console.log('\n7) Con un día de gracia, lo de hoy no es una alerta');
  await prisma.notificacion.deleteMany({ where: { titulo: 'Despachos pendientes' } });
  const av3 = await api('/despachos/avisar?diasGracia=1', token, 'POST');
  ok(
    !(av3.data?.documentos ?? []).includes(miDocStr),
    `el pedido de HOY queda fuera del aviso (${miDocStr}): un aviso que salta siempre no se lee`,
  );
  // Lo que sí entra con un día de gracia es lo viejo de verdad, y eso depende de
  // los datos de la base: no se afirma un número, solo que lo de hoy no está.
  console.log(`      (con 1 día de gracia el aviso cubre ${av3.data?.avisados} documento(s) anteriores)`);

  // ── 8. Completar el despacho la saca de la lista ───────────────────────────
  console.log('\n8) Completar el despacho la saca de la lista');
  await crearGuia(empresa, sede, gerencia.id, 9004, 6, prod.id, prod.codigo);
  const r5 = await api('/despachos/pendientes', token);
  const f5 = (r5.data?.filas ?? []).find((f) => f.comprobanteId === creado.comprobanteId);
  ok(!f5, 'ya no aparece entre los pendientes');
  const r6 = await api('/despachos/pendientes?incluirCompletos=true', token);
  const f6 = (r6.data?.filas ?? []).find((f) => f.comprobanteId === creado.comprobanteId);
  ok(f6?.estado === 'COMPLETO', `pero sí en el seguimiento, como COMPLETO (${f6?.estado})`);
  ok(f6 ? cerca(f6.porcentajeDespachado, 100) : false, `al 100 % (${f6?.porcentajeDespachado} %)`);

  // ── 9. Despachar de más se ve, y no deja negativos ────────────────────────
  console.log('\n9) Despachar de MÁS se marca aparte, sin pendientes negativos');
  await crearGuia(empresa, sede, gerencia.id, 9005, 3, prod.id, prod.codigo);
  const r7 = await api(`/despachos/pendientes/${creado.comprobanteId}`, token);
  ok(r7.data?.conExceso === true, 'se marca el exceso');
  ok(cerca(r7.data?.unidadesPendientes ?? -1, 0), `y el pendiente queda en 0, no en -3 (${r7.data?.unidadesPendientes})`);
  ok(cerca(r7.data?.detalle?.[0]?.deMas ?? -1, 3), `con 3 unidades de más (${r7.data?.detalle?.[0]?.deMas})`);

  // ── 10. Lecturas abiertas ─────────────────────────────────────────────────
  console.log('\n10) Permisos: leer abierto, disparar el aviso con permiso');
  const tVentas = await login('ventas@kaisercorp.com.pe');
  const lee = await api('/despachos/pendientes', tVentas);
  ok(lee.status === 200, `ventas LEE los pendientes (HTTP ${lee.status}): el cliente le pregunta a él`);
  // Ventas SÍ puede disparar el aviso, y está bien: en Kaiser ventas emite guías
  // (tiene el permiso `guias-remision`). Quien no debe es contabilidad.
  const tConta = await login('contabilidad@kaisercorp.com.pe');
  const leeConta = await api('/despachos/pendientes', tConta);
  ok(leeConta.status === 200, `contabilidad también LEE (HTTP ${leeConta.status})`);
  const dispara = await api('/despachos/avisar', tConta, 'POST');
  ok(dispara.status === 403, `pero no dispara el aviso (HTTP ${dispara.status}): eso escribe notificaciones`);

  console.log(`\n${'═'.repeat(52)}`);
  console.log(fallos ? `✘ DESPACHOS: ${fallos} problema(s)` : '✔ DESPACHOS: todo verde');
}

main()
  .catch((e) => { console.error('\n✘ error:', e.message); fallos++; })
  .finally(async () => {
    await limpiar();
    console.log('   ↺ limpieza: venta, guías, avisos y cliente de prueba borrados');
    await prisma.$disconnect();
    process.exit(fallos ? 1 : 0);
  });
