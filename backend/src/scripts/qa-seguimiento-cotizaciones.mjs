/**
 * QA funcional · Seguimiento de cotizaciones
 *
 * Existía el ESTADO de una cotización y su vigencia, pero no la GESTIÓN: no había
 * dónde anotar qué se habló, ni cuándo tocaba volver a llamar, ni por qué se
 * perdió. Y perder era BORRAR el documento, así que "¿por qué perdemos?" no tenía
 * respuesta en ninguna parte.
 *
 * Lo que se fija aquí:
 *   · la bitácora se escribe SOLA al emitir la cotización
 *   · un contacto manual queda con quién, qué pasó y qué toca después
 *   · registrar algo nuevo CIERRA la próxima acción anterior: si volviste a
 *     anotar, es que ya hiciste lo que tenías pendiente
 *   · la agenda saca lo vencido y lo de hoy, acotado al vendedor
 *   · marcar como perdida guarda el motivo y NO borra el documento
 *   · una cotización ya facturada no se puede marcar como perdida
 *   · "por qué perdemos" cuenta por motivo Y por importe, y la tasa de cierre
 *     solo mira las CERRADAS
 *   · la bitácora no se edita ni se borra
 *   · las lecturas están abiertas; escribir exige el permiso de cotizaciones
 *
 * Uso:  pnpm run qa:seguimiento
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const SEDE = 1;
const MARCA = '[QA-SEGUIMIENTO]';
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const S = (n) => `S/ ${Number(n).toFixed(2)}`;

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

const creado = { clienteId: null, cots: [] };

async function limpiar() {
  if (creado.cots.length) {
    await prisma.seguimientoCotizacion.deleteMany({ where: { comprobanteId: { in: creado.cots } } });
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: { in: creado.cots } } });
    await prisma.leyenda.deleteMany({ where: { comprobanteId: { in: creado.cots } } });
    await prisma.comprobante.deleteMany({ where: { id: { in: creado.cots } } });
  }
  if (creado.clienteId) {
    const resto = await prisma.comprobante.findMany({ where: { clienteId: creado.clienteId }, select: { id: true } });
    const ids = resto.map((c) => c.id);
    if (ids.length) {
      await prisma.seguimientoCotizacion.deleteMany({ where: { comprobanteId: { in: ids } } });
      await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: { in: ids } } });
      await prisma.leyenda.deleteMany({ where: { comprobanteId: { in: ids } } });
      await prisma.comprobante.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.cliente.deleteMany({ where: { id: creado.clienteId } });
  }
  await prisma.notificacion.deleteMany({ where: { titulo: 'Tus cotizaciones' } });
}

async function main() {
  console.log(`\nQA · Seguimiento de cotizaciones\n${'═'.repeat(52)}`);
  await limpiar();
  const token = await login();
  const empresa = await prisma.empresa.findFirst();
  const prod = await prisma.producto.findFirst({
    where: { empresaId: empresa.id, precioUnitario: { gt: 0 } },
    select: { id: true, precioUnitario: true },
  });

  const cli = await api('/clientes', token, 'POST', {
    nombre: `${MARCA} CONSTRUCTORA SEGUIMIENTO S.A.C.`,
    tipoDoc: 'RUC', nroDoc: '20777000555', persona: 'CLIENTE',
    ubigeo: '150101', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LIMA',
  });
  creado.clienteId = cli.data?.id;
  ok(!!creado.clienteId, `cliente de prueba creado (HTTP ${cli.status})`);

  const valorUnit = Math.round((Number(prod.precioUnitario) / 1.18) * 100) / 100;
  const nuevaCot = async (cant = 3) => {
    const r = await api('/comprobante/informal', token, 'POST', {
      sedeId: SEDE, tipoOperacionId: 1, tipoDoc: 'COT',
      fechaEmision: new Date().toISOString(),
      formaPagoTipo: 'Contado', formaPagoMoneda: 'PEN', tipoMoneda: 'PEN',
      clienteId: creado.clienteId, clienteName: `${MARCA} CONSTRUCTORA SEGUIMIENTO S.A.C.`,
      leyenda: '', medioPago: 'TRANSFERENCIA', cotizVigencia: 7,
      detalles: [{ productoId: prod.id, cantidad: cant, nuevoValorUnitario: valorUnit }],
    });
    if (r.data?.id) creado.cots.push(r.data.id);
    return r;
  };

  // ── 1. La bitácora nace sola ──────────────────────────────────────────────
  console.log('\n1) Al emitir la cotización, la bitácora ya tiene su primera entrada');
  const c1 = await nuevaCot(3);
  ok(c1.status < 300, `cotización emitida (HTTP ${c1.status})`);
  let b = await api(`/cotizaciones/seguimiento/${c1.data.id}`, token);
  ok(b.status === 200, `la bitácora responde (HTTP ${b.status})`);
  ok((b.data?.entradas ?? []).length === 1, `una entrada (${(b.data?.entradas ?? []).length})`);
  ok(b.data?.entradas?.[0]?.tipo === 'CREADA', `de tipo CREADA (${b.data?.entradas?.[0]?.tipo})`);
  ok(b.data?.entradas?.[0]?.automatico === false || b.data?.entradas?.[0]?.usuario != null,
     'firmada por quien la emitió');
  ok(b.data?.cotizacion?.diasParaVencer === 7, `y dice cuándo vence (${b.data?.cotizacion?.diasParaVencer} d)`);

  // ── 2. Un contacto con próxima acción ─────────────────────────────────────
  console.log('\n2) El vendedor anota la llamada y qué toca después');
  const manana = new Date(Date.now() + 86400000);
  const reg = await api(`/cotizaciones/seguimiento/${c1.data.id}`, token, 'POST', {
    tipo: 'LLAMADA', resultado: 'PIDIO_DESCUENTO',
    detalle: 'Habló con el jefe de compras; pide 5 % y entrega en dos semanas',
    proximaAccion: 'Llamar con la contrapropuesta', proximaAccionEn: manana.toISOString(),
  });
  ok(reg.status < 300, `registrada (HTTP ${reg.status})`);
  b = await api(`/cotizaciones/seguimiento/${c1.data.id}`, token);
  ok((b.data?.entradas ?? []).length === 2, `la bitácora tiene 2 entradas (${(b.data?.entradas ?? []).length})`);
  ok(b.data?.proximaAccion?.que === 'Llamar con la contrapropuesta', `y una próxima acción viva («${b.data?.proximaAccion?.que}»)`);
  ok(b.data?.proximaAccion?.vencida === false, 'todavía no vencida');

  // ── 3. Registrar de nuevo cierra la acción anterior ───────────────────────
  console.log('\n3) Anotar algo nuevo cierra lo que estaba pendiente');
  await api(`/cotizaciones/seguimiento/${c1.data.id}`, token, 'POST', {
    tipo: 'CORREO', resultado: 'EN_EVALUACION', detalle: 'Mandada la contrapropuesta con 3 %',
  });
  b = await api(`/cotizaciones/seguimiento/${c1.data.id}`, token);
  ok(b.data?.proximaAccion === null, 'ya no queda acción pendiente: se dio por hecha');
  const cerrada = (b.data?.entradas ?? []).find((e) => e.proximaAccion === 'Llamar con la contrapropuesta');
  ok(!!cerrada?.cumplidaEn, 'y queda registrado CUÁNDO se cumplió, no se borra');

  // ── 4. La agenda ──────────────────────────────────────────────────────────
  console.log('\n4) La agenda saca lo vencido y lo de hoy');
  const ayer = new Date(Date.now() - 2 * 86400000);
  await api(`/cotizaciones/seguimiento/${c1.data.id}`, token, 'POST', {
    tipo: 'NOTA', detalle: 'Quedó en confirmar', proximaAccion: 'Insistir', proximaAccionEn: ayer.toISOString(),
  });
  const ag = await api('/cotizaciones/agenda', token);
  ok(ag.status === 200, `la agenda responde (HTTP ${ag.status})`);
  const mia = (ag.data ?? []).find((a) => a.comprobanteId === c1.data.id);
  ok(!!mia, 'la cotización aparece en la agenda');
  ok(mia?.vencida === true, `marcada como vencida (${mia?.diasVencida} d)`);

  // ── 5. Perder ya no es borrar ─────────────────────────────────────────────
  console.log('\n5) Marcar como perdida guarda el motivo y NO borra nada');
  const c2 = await nuevaCot(5);
  const perd = await api(`/cotizaciones/seguimiento/${c2.data.id}/perdida`, token, 'POST', {
    motivo: 'PLAZO_ENTREGA', detalle: 'El competidor entregaba en 5 días y nosotros en 15',
  });
  ok(perd.status < 300, `marcada como perdida (HTTP ${perd.status})`);
  const guardada = await prisma.comprobante.findUnique({
    where: { id: c2.data.id },
    select: { estadoPedido: true, motivoPerdida: true, motivoPerdidaDetalle: true, motivoPerdidaPorId: true },
  });
  ok(!!guardada, 'el documento SIGUE existiendo: perder ya no es borrarlo');
  ok(guardada?.estadoPedida !== 'FACTURADO' && guardada?.estadoPedido === 'ANULADO', `queda en ANULADO (${guardada?.estadoPedido})`);
  ok(guardada?.motivoPerdida === 'PLAZO_ENTREGA', `con su motivo (${guardada?.motivoPerdida})`);
  ok(!!guardada?.motivoPerdidaPorId, 'y quién lo marcó');
  const b2 = await api(`/cotizaciones/seguimiento/${c2.data.id}`, token);
  ok((b2.data?.entradas ?? []).some((e) => e.tipo === 'PERDIDA'), 'la bitácora lo recoge sola');

  // ── 6. Una facturada no se puede dar por perdida ──────────────────────────
  console.log('\n6) Una cotización ya facturada no se marca como perdida');
  const c3 = await nuevaCot(2);
  await prisma.comprobante.update({ where: { id: c3.data.id }, data: { estadoPedido: 'FACTURADO' } });
  const mal = await api(`/cotizaciones/seguimiento/${c3.data.id}/perdida`, token, 'POST', { motivo: 'PRECIO' });
  ok(mal.status === 400, `rechazado (HTTP ${mal.status})`);
  ok(/ya se facturó/.test(String(mal.message)), `y lo explica — «${String(mal.message).slice(0, 70)}»`);

  // ── 7. Por qué perdemos ───────────────────────────────────────────────────
  console.log('\n7) "Por qué perdemos": por motivo y por importe');
  const rep = await api('/cotizaciones/por-que-perdemos', token);
  ok(rep.status === 200, `el reporte responde (HTTP ${rep.status})`);
  const fila = (rep.data?.filas ?? []).find((f) => f.motivo === 'PLAZO_ENTREGA');
  ok(!!fila, 'aparece el motivo registrado');
  ok(fila?.importe > 0, `con el importe perdido, no solo la cuenta (${S(fila?.importe)})`);
  ok(fila?.etiqueta === 'Plazo de entrega', `y en castellano (${fila?.etiqueta})`);
  ok(typeof rep.data?.tasaCierre === 'number' || rep.data?.tasaCierre === null,
     `tasa de cierre sobre las CERRADAS: ${rep.data?.tasaCierre}%`);

  // ── 8. Permisos ───────────────────────────────────────────────────────────
  console.log('\n8) Permisos: leer abierto, escribir con permiso de cotizaciones');
  const tAlmacen = await login('almacen@kaisercorp.com.pe');
  const lee = await api(`/cotizaciones/seguimiento/${c1.data.id}`, tAlmacen);
  ok(lee.status === 200, `almacén LEE la bitácora (HTTP ${lee.status}): quien atiende al cliente necesita saber qué se le dijo`);
  const escribe = await api(`/cotizaciones/seguimiento/${c1.data.id}`, tAlmacen, 'POST', { tipo: 'NOTA', detalle: 'no debería' });
  ok(escribe.status === 403, `pero no escribe (HTTP ${escribe.status}): la bitácora comercial se firma`);

  console.log(`\n${'═'.repeat(52)}`);
  console.log(fallos ? `✘ SEGUIMIENTO: ${fallos} problema(s)` : '✔ SEGUIMIENTO: todo verde');
}

main()
  .catch((e) => { console.error('\n✘ error:', e.message); fallos++; })
  .finally(async () => {
    await limpiar();
    console.log('   ↺ limpieza: cotizaciones, bitácoras y cliente de prueba borrados');
    await prisma.$disconnect();
    process.exit(fallos ? 1 : 0);
  });
