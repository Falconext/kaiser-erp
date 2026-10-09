#!/usr/bin/env node
/**
 * QA de la validación de `PUT /empresa/mia`.
 *
 * Las dos rutas que actualizan la empresa recibían el cuerpo como
 * `Partial<UpdateEmpresaDto>` y `Omit<UpdateEmpresaDto,'id'>`. Los dos son
 * tipos de TypeScript: en runtime emiten `Object`, así que el ValidationPipe
 * global las saltaba enteras — ni validaba ni aplicaba whitelist a NINGÚN
 * campo. Un PUT con `precioBaseKgMoneda: 'EUR'` respondía 200 y lo guardaba.
 *
 * Este guion fija las dos mitades del arreglo:
 *  · que la validación AHORA corra (lo inválido se rechaza, lo de más se borra);
 *  · y sobre todo que **no haya roto el formulario**: se manda una por una cada
 *    forma de payload que el frontend usa de verdad, y todas tienen que pasar.
 *    Eso es lo que hacía arriesgado el cambio.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
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
  const s = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: 1 }) });
  return s.data.accessToken;
}
const put = (token, body) => api('/empresa/mia', { token, method: 'PUT', body: JSON.stringify(body) });

/**
 * Cada forma de payload que el frontend manda de verdad, sacada una por una de
 * los sitios que llaman a `actualizarMiEmpresa`. Si el cambio rompiera el
 * formulario de empresa, se vería aquí.
 */
const PAYLOADS_REALES = [
  ['interruptor suelto',        { usaCodigoBarrasManual: false }],
  ['toggle de cotización',      { cotizMostrarEmail: true }],
  ['envío automático',          { enviarComprobanteEmail: false }],
  ['lotes FEFO',                { usarPrecioLoteFefo: false }],
  ['venta sin stock',           { permitirVentaSinStock: false }],
  ['cobranza en campo',         { cobranzaCampo: false }],
  ['tamaño del logo en ticket', { ticketLogoSize: 80 }],
  ['logo en base64',            { logo: 'data:image/png;base64,iVBORw0KGgo=' }],
  ['% de merma',                { mermaPorcentajeRecuperacion: 0 }],
  ['precio por peso completo',  { precioBaseKg: 1.84, precioBaseKgMoneda: 'USD', factorPrecioDefault: 2.8, factorPrecioMinimo: 2.6 }],
  ['director técnico',          { directorTecnico: 'QA' }],
  ['WhatsApp',                  { whatsappProvider: 'DISABLED', whatsappPhoneNumberId: null, whatsappBusinessId: null, whatsappActivo: false }],
  ['Shalom',                    { shalomEmail: 'qa@kaiser.test', shalomPassword: 'x' }],
  ['página web',                { paginaWeb: 'https://kaiser.test' }],
  ['formato de cotización',     { cotizFormatoConfig: { textos: { agradecimiento: 'QA' } } }],
  ['formato de nota de venta',  { notaVentaFormatoConfig: { textos: {} } }],
  ['credenciales QPSE',         { billingProvider: 'QPSE', usuarioPse: 'qa', contrasenaPse: 'qa' }],
  ['cuenta de detracción',      { cuentaDetraccionBN: '00-000-000000' }],
];

async function main() {
  console.log('\n🏢  QA · validación de PUT /empresa/mia\n');
  const token = await login();
  const emp = await prisma.empresa.findFirst();
  const previo = { ...emp };

  try {
    // ── 1. Lo que el frontend manda de verdad SIGUE pasando ───────────────
    console.log('1) Las 18 formas de payload que usa el formulario');
    for (const [nombre, body] of PAYLOADS_REALES) {
      const r = await put(token, body);
      ok(r.status < 400, `${nombre.padEnd(28)} HTTP ${r.status}${r.status >= 400 ? ' · ' + JSON.stringify(r.body?.message).slice(0, 90) : ''}`);
    }

    // ── 2. Y ahora lo inválido SÍ se rechaza ──────────────────────────────
    console.log('\n2) Lo inválido se rechaza (antes respondía 200)');
    const malos = [
      ['moneda que no existe',   { precioBaseKgMoneda: 'EUR' }],
      ['proveedor inventado',    { billingProvider: 'PIRATA' }],
      ['WhatsApp inventado',     { whatsappProvider: 'TELEGRAM' }],
      ['texto en campo numérico', { ticketLogoSize: 'abc' }],
      ['% de merma fuera de rango', { mermaPorcentajeRecuperacion: 500 }],
      ['factor negativo',        { precioBaseKg: -5 }],
    ];
    for (const [nombre, body] of malos) {
      const r = await put(token, body);
      ok(r.status === 400, `${nombre.padEnd(28)} HTTP ${r.status} (se esperaba 400)`);
    }

    // ⚠ Lo que la validación NO atrapa, y conviene saberlo: el pipe global va
    // con `transformOptions: { enableImplicitConversion: true }`, así que a un
    // campo `@IsString()` se le hace `String(valor)` ANTES de validar. Mandar
    // un objeto a `directorTecnico` responde 200 y guarda «[object Object]».
    // No es de esta ruta, es de toda la aplicación, y no es un agujero de
    // seguridad —los `@IsIn`, `@Min`/`@Max` y los numéricos sí cortan—, pero
    // un campo de texto libre acepta basura. Queda fijado para que se vea.
    console.log('\n2-bis) Lo que la conversión implícita deja pasar');
    const prevDT = (await prisma.empresa.findUnique({ where: { id: emp.id }, select: { directorTecnico: true } })).directorTecnico;
    const obj = await put(token, { directorTecnico: { a: 1 } });
    ok(obj.status === 200, `un objeto en un campo de texto NO se rechaza (HTTP ${obj.status})`);
    const guardado = await prisma.empresa.findUnique({ where: { id: emp.id }, select: { directorTecnico: true } });
    ok(
      guardado.directorTecnico === '[object Object]',
      `se convierte a texto: ${JSON.stringify(guardado.directorTecnico)} — es enableImplicitConversion, no esta ruta`,
    );
    await prisma.empresa.update({ where: { id: emp.id }, data: { directorTecnico: prevDT } });

    // ── 3. La whitelist borra lo que el DTO no declara ────────────────────
    console.log('\n3) La whitelist');
    const r = await put(token, { directorTecnico: 'QA2', campoInventado: 'xxx', estado: 'BORRADO' });
    ok(r.status < 400, `un campo de más no rompe la petición (HTTP ${r.status})`);
    const tras = await prisma.empresa.findUnique({ where: { id: emp.id }, select: { directorTecnico: true, estado: true } });
    ok(tras.directorTecnico === 'QA2', 'lo declarado sí se guarda');
    ok(
      tras.estado === previo.estado,
      `y un campo NO declarado se descarta: 'estado' sigue en ${JSON.stringify(previo.estado)}`,
    );

    // ── 4. El id no se puede suplantar ────────────────────────────────────
    console.log('\n4) El id lo pone el token, no el cuerpo');
    const r2 = await put(token, { id: 99999, directorTecnico: 'QA3' });
    ok(r2.status < 400, `mandar un id ajeno no rompe (HTTP ${r2.status})`);
    const mia = await prisma.empresa.findUnique({ where: { id: emp.id }, select: { directorTecnico: true } });
    ok(mia.directorTecnico === 'QA3', 'y se actualiza LA MÍA, no la del id mandado');
    ok((await prisma.empresa.count({ where: { id: 99999 } })) === 0, 'la empresa 99999 no existe ni se creó');
  } finally {
    console.log('\n5) Restaurar');
    await prisma.empresa.update({
      where: { id: previo.id },
      data: {
        usaCodigoBarrasManual: previo.usaCodigoBarrasManual, cotizMostrarEmail: previo.cotizMostrarEmail,
        enviarComprobanteEmail: previo.enviarComprobanteEmail, usarPrecioLoteFefo: previo.usarPrecioLoteFefo,
        permitirVentaSinStock: previo.permitirVentaSinStock, cobranzaCampo: previo.cobranzaCampo,
        ticketLogoSize: previo.ticketLogoSize, logo: previo.logo,
        mermaPorcentajeRecuperacion: previo.mermaPorcentajeRecuperacion,
        precioBaseKg: previo.precioBaseKg, precioBaseKgMoneda: previo.precioBaseKgMoneda,
        factorPrecioDefault: previo.factorPrecioDefault, factorPrecioMinimo: previo.factorPrecioMinimo,
        directorTecnico: previo.directorTecnico, whatsappProvider: previo.whatsappProvider,
        whatsappPhoneNumberId: previo.whatsappPhoneNumberId, whatsappBusinessId: previo.whatsappBusinessId,
        whatsappActivo: previo.whatsappActivo, shalomEmail: previo.shalomEmail,
        shalomPassword: previo.shalomPassword, paginaWeb: previo.paginaWeb,
        cotizFormatoConfig: previo.cotizFormatoConfig ?? undefined,
        notaVentaFormatoConfig: previo.notaVentaFormatoConfig ?? undefined,
        billingProvider: previo.billingProvider, usuarioPse: previo.usuarioPse,
        contrasenaPse: previo.contrasenaPse, cuentaDetraccionBN: previo.cuentaDetraccionBN,
      },
    });
    const fin = await prisma.empresa.findUnique({ where: { id: previo.id }, select: { directorTecnico: true, precioBaseKgMoneda: true, paginaWeb: true } });
    ok(
      fin.directorTecnico === previo.directorTecnico && fin.precioBaseKgMoneda === previo.precioBaseKgMoneda && fin.paginaWeb === previo.paginaWeb,
      'la empresa queda como estaba',
    );
  }

  console.log(fallos === 0 ? '\n✔ Validación de empresa: todo correcto' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
