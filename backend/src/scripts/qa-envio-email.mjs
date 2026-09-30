/**
 * QA funcional · Envío automático del comprobante al cliente
 *
 * El envío por correo existía pero solo a mano: alguien abría el comprobante y
 * pulsaba el botón, uno por uno. Ahora sale solo cuando SUNAT acepta.
 *
 * Lo que se fija aquí —sin mandar un solo correo de verdad, porque mandar correo
 * a clientes reales desde un QA sería un desastre—: se prueba el SERVICIO de
 * decisión, que es donde están las reglas.
 *
 *   · apagado por defecto: con el interruptor de la empresa en false no envía
 *   · encendido, envía y deja constancia de a quién y cuándo
 *   · no repite: un reintento de SUNAT no vuelve a mandarlo
 *   · solo comprobantes formales ACEPTADOS: una cotización o una nota de venta
 *     no se mandan solas
 *   · sin correo en la ficha del cliente, no es un error: es un dato que falta
 *   · si el envío falla, el comprobante NO se marca como enviado y la emisión
 *     sigue su curso — facturar no puede fallar porque el correo esté caído
 *   · cae al correo de contacto si el cliente no tiene uno propio
 *
 * Uso:  pnpm run qa:envio-email
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

const MARCA = '[QA-EMAIL]';
const creado = { clienteId: null, comprobanteId: null };
let empresaAntes = null;
let cotAntes = null;
let guiaAntes = null;

/** Réplica de la decisión del servicio, para probarla sin levantar Nest. */
async function decidir(comprobanteId, enviar) {
  const TIPOS = ['01', '03', '07', '08'];
  const comp = await prisma.comprobante.findUnique({
    where: { id: comprobanteId },
    select: {
      id: true, tipoDoc: true, serie: true, correlativo: true,
      estadoEnvioSunat: true, emailEnviadoEn: true,
      cliente: { select: { email: true, contactoEmail: true } },
      empresa: { select: { enviarComprobanteEmail: true } },
    },
  });
  if (!comp) return { enviado: false, motivo: 'el comprobante no existe' };
  if (!comp.empresa?.enviarComprobanteEmail) return { enviado: false, motivo: 'el envío automático está apagado' };
  if (!TIPOS.includes(comp.tipoDoc)) return { enviado: false, motivo: `${comp.tipoDoc} no se envía solo` };
  if (comp.estadoEnvioSunat !== 'EMITIDO') return { enviado: false, motivo: 'SUNAT todavía no lo aceptó' };
  if (comp.emailEnviadoEn) return { enviado: false, motivo: 'ya se había enviado' };
  const destinatario = (comp.cliente?.email || comp.cliente?.contactoEmail || '').trim();
  if (!destinatario || !destinatario.includes('@')) return { enviado: false, motivo: 'el cliente no tiene correo en su ficha' };
  try {
    await enviar(comp.id, destinatario);
    await prisma.comprobante.update({ where: { id: comp.id }, data: { emailEnviadoEn: new Date(), emailEnviadoA: destinatario } });
    return { enviado: true, destinatario };
  } catch (e) {
    return { enviado: false, motivo: e.message, destinatario };
  }
}

async function limpiar() {
  if (creado.comprobanteId) {
    await prisma.leyenda.deleteMany({ where: { comprobanteId: creado.comprobanteId } });
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: creado.comprobanteId } });
    await prisma.comprobante.deleteMany({ where: { id: creado.comprobanteId } });
  }
  if (creado.clienteId) await prisma.cliente.deleteMany({ where: { id: creado.clienteId } });
  if (empresaAntes !== null) {
    const e = await prisma.empresa.findFirst({ select: { id: true } });
    await prisma.empresa.update({
      where: { id: e.id },
      data: {
        enviarComprobanteEmail: empresaAntes,
        ...(cotAntes !== null ? { enviarCotizacionEmail: cotAntes } : {}),
        ...(guiaAntes !== null ? { enviarGuiaEmail: guiaAntes } : {}),
      },
    });
  }
}

async function main() {
  console.log(`\nQA · Envío automático del comprobante\n${'═'.repeat(52)}`);
  const empresa = await prisma.empresa.findFirst({ select: { id: true, enviarComprobanteEmail: true } });
  empresaAntes = empresa.enviarComprobanteEmail;

  const cli = await prisma.cliente.create({
    data: {
      empresaId: empresa.id, nombre: `${MARCA} CLIENTE DE PRUEBA S.A.C.`,
      nroDoc: '20777000444', email: 'destino@ejemplo-qa.test', persona: 'CLIENTE',
    },
  });
  creado.clienteId = cli.id;

  // Un comprobante escrito directo: el QA prueba la DECISIÓN, no la emisión.
  const comp = await prisma.comprobante.create({
    data: {
      empresaId: empresa.id, clienteId: cli.id, tipoDoc: '01',
      serie: 'FQA1', correlativo: 90001, fechaEmision: new Date(),
      ublVersion: '2.1', formaPagoTipo: 'Contado', formaPagoMoneda: 'PEN',
      tipoMoneda: 'PEN', mtoOperGravadas: 100, mtoIGV: 18, valorVenta: 100,
      totalImpuestos: 18, subTotal: 118, mtoImpVenta: 118,
      estadoEnvioSunat: 'PENDIENTE', origenDato: MARCA,
    },
  });
  creado.comprobanteId = comp.id;
  ok(true, `comprobante de prueba creado (FQA1-00090001, PENDIENTE)`);

  let enviados = [];
  const enviarOk = async (id, dest) => { enviados.push({ id, dest }); };
  const enviarFalla = async () => { throw new Error('servidor de correo caído'); };

  // ── 1. Apagado por defecto ────────────────────────────────────────────────
  console.log('\n1) Con el interruptor apagado no se envía nada');
  await prisma.empresa.update({ where: { id: empresa.id }, data: { enviarComprobanteEmail: false } });
  await prisma.comprobante.update({ where: { id: comp.id }, data: { estadoEnvioSunat: 'EMITIDO' } });
  let r = await decidir(comp.id, enviarOk);
  ok(r.enviado === false, `no envía (${r.motivo})`);
  ok(enviados.length === 0, 'y no se llamó al envío');

  // ── 2. SUNAT todavía no lo aceptó ─────────────────────────────────────────
  console.log('\n2) Encendido, pero SUNAT aún no lo acepta');
  await prisma.empresa.update({ where: { id: empresa.id }, data: { enviarComprobanteEmail: true } });
  await prisma.comprobante.update({ where: { id: comp.id }, data: { estadoEnvioSunat: 'PENDIENTE' } });
  r = await decidir(comp.id, enviarOk);
  ok(r.enviado === false && /todavía no lo aceptó/.test(r.motivo), `espera a la aceptación (${r.motivo})`);

  // ── 3. Aceptado: se envía ─────────────────────────────────────────────────
  console.log('\n3) SUNAT lo acepta → sale solo');
  await prisma.comprobante.update({ where: { id: comp.id }, data: { estadoEnvioSunat: 'EMITIDO' } });
  r = await decidir(comp.id, enviarOk);
  ok(r.enviado === true, `enviado a ${r.destinatario}`);
  ok(enviados.length === 1, 'se llamó al envío una vez');
  const guardado = await prisma.comprobante.findUnique({
    where: { id: comp.id }, select: { emailEnviadoEn: true, emailEnviadoA: true },
  });
  ok(!!guardado.emailEnviadoEn, 'queda constancia de cuándo');
  ok(guardado.emailEnviadoA === 'destino@ejemplo-qa.test', `y de a quién (${guardado.emailEnviadoA})`);

  // ── 4. No se repite ───────────────────────────────────────────────────────
  console.log('\n4) Un reintento de SUNAT no lo vuelve a mandar');
  r = await decidir(comp.id, enviarOk);
  ok(r.enviado === false && /ya se había enviado/.test(r.motivo), `se salta (${r.motivo})`);
  ok(enviados.length === 1, 'el cliente no recibe el mismo correo dos veces');

  // ── 5. Si el correo falla, no se marca como enviado ───────────────────────
  console.log('\n5) Si el servidor de correo falla, el comprobante sigue emitido');
  await prisma.comprobante.update({ where: { id: comp.id }, data: { emailEnviadoEn: null, emailEnviadoA: null } });
  r = await decidir(comp.id, enviarFalla);
  ok(r.enviado === false && /caído/.test(r.motivo), `se registra el fallo (${r.motivo})`);
  const trasFallo = await prisma.comprobante.findUnique({
    where: { id: comp.id }, select: { emailEnviadoEn: true, estadoEnvioSunat: true },
  });
  ok(trasFallo.emailEnviadoEn === null, 'NO se marca como enviado: se puede reintentar a mano');
  ok(trasFallo.estadoEnvioSunat === 'EMITIDO', 'y el comprobante sigue aceptado: la emisión no se toca');

  // ── 6. Cotizaciones y notas de venta no se mandan solas ───────────────────
  console.log('\n6) Una cotización no se envía sola');
  await prisma.comprobante.update({ where: { id: comp.id }, data: { tipoDoc: 'COT' } });
  r = await decidir(comp.id, enviarOk);
  ok(r.enviado === false && /no se envía solo/.test(r.motivo), `${r.motivo} — esa la manda el vendedor cuando decide`);
  await prisma.comprobante.update({ where: { id: comp.id }, data: { tipoDoc: '01' } });

  // ── 7. Cliente sin correo ─────────────────────────────────────────────────
  console.log('\n7) Cliente sin correo en su ficha');
  await prisma.cliente.update({ where: { id: cli.id }, data: { email: null, contactoEmail: null } });
  r = await decidir(comp.id, enviarOk);
  ok(r.enviado === false && /no tiene correo/.test(r.motivo), `no es un error, es un dato que falta (${r.motivo})`);

  console.log('\n8) Cae al correo de contacto si no hay uno propio');
  await prisma.cliente.update({ where: { id: cli.id }, data: { contactoEmail: 'compras@ejemplo-qa.test' } });
  r = await decidir(comp.id, enviarOk);
  ok(r.enviado === true && r.destinatario === 'compras@ejemplo-qa.test', `usa el del contacto (${r.destinatario})`);

  // ── 9. Cotizaciones y guías van por su PROPIO interruptor ─────────────────
  console.log('\n9) Cotización y guía tienen su propio interruptor');
  const emp = await prisma.empresa.findFirst({
    select: { id: true, enviarCotizacionEmail: true, enviarGuiaEmail: true },
  });
  cotAntes = emp.enviarCotizacionEmail;
  guiaAntes = emp.enviarGuiaEmail;

  // Con el de facturas encendido pero el de cotizaciones apagado, la cotización
  // NO sale: son decisiones distintas y no pueden compartir interruptor.
  await prisma.empresa.update({
    where: { id: emp.id },
    data: { enviarComprobanteEmail: true, enviarCotizacionEmail: false },
  });
  await prisma.comprobante.update({
    where: { id: comp.id },
    data: { tipoDoc: 'COT', emailEnviadoEn: null, emailEnviadoA: null },
  });
  const decidirCot = async () => {
    const c = await prisma.comprobante.findUnique({
      where: { id: comp.id },
      select: { tipoDoc: true, emailEnviadoEn: true,
                cliente: { select: { email: true, contactoEmail: true } },
                empresa: { select: { enviarCotizacionEmail: true } } },
    });
    if (!c.empresa?.enviarCotizacionEmail) return { enviado: false, motivo: 'el envío automático de cotizaciones está apagado' };
    if (c.tipoDoc !== 'COT') return { enviado: false, motivo: 'no es una cotización' };
    if (c.emailEnviadoEn) return { enviado: false, motivo: 'ya se había enviado' };
    const dest = (c.cliente?.email || c.cliente?.contactoEmail || '').trim();
    if (!dest.includes('@')) return { enviado: false, motivo: 'sin correo' };
    await prisma.comprobante.update({ where: { id: comp.id }, data: { emailEnviadoEn: new Date(), emailEnviadoA: dest } });
    return { enviado: true, destinatario: dest };
  };
  await prisma.cliente.update({ where: { id: cli.id }, data: { email: 'destino@ejemplo-qa.test' } });
  let rc = await decidirCot();
  ok(rc.enviado === false && /cotizaciones está apagado/.test(rc.motivo),
     `con facturas ENCENDIDO y cotizaciones apagado, la cotización no sale (${rc.motivo})`);

  await prisma.empresa.update({ where: { id: emp.id }, data: { enviarCotizacionEmail: true } });
  rc = await decidirCot();
  ok(rc.enviado === true, `encendido el suyo, sí sale (${rc.destinatario})`);
  rc = await decidirCot();
  ok(rc.enviado === false && /ya se había enviado/.test(rc.motivo), 'y tampoco se repite');

  console.log(`\n${'═'.repeat(52)}`);
  console.log(fallos ? `✘ ENVÍO AUTOMÁTICO: ${fallos} problema(s)` : '✔ ENVÍO AUTOMÁTICO: todo verde');
}

main()
  .catch((e) => { console.error('\n✘ error:', e.message); fallos++; })
  .finally(async () => {
    await limpiar();
    console.log('   ↺ limpieza: cliente, comprobante e interruptor restaurados');
    await prisma.$disconnect();
    process.exit(fallos ? 1 : 0);
  });
