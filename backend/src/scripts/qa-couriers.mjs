/**
 * QA funcional de los couriers portados desde falconext-mype: Shalom, Olva y
 * el tablero de despacho por courier.
 *
 * Va contra la API real con un token de gerencia y comprueba el EFECTO, no solo
 * que el endpoint responda 200: una configuración que devuelve éxito pero no se
 * guarda, o un tablero que suma mal el flete, son exactamente los fallos que
 * este QA busca.
 *
 * Lo que NO hace, a propósito: **no crea guías reales**. `POST shalom/guia/:id`
 * y `POST olva/guia/:id` registran envíos de verdad en la cuenta del proveedor
 * y cuestan dinero. Se comprueba que la ruta existe y que rechaza bien cuando
 * falta la cuenta conectada, que es hasta donde se puede llegar sin gastar.
 *
 * Las consultas de catálogo (agencias, tamaños) SÍ salen a los proveedores: son
 * lecturas. Si el proveedor está caído, esos casos se marcan como no
 * verificables en vez de dar el QA por roto.
 *
 * Deja la base como la encontró.
 *
 *   pnpm run qa:couriers
 */
import { PrismaClient } from '@prisma/client';

const API = process.env.API_URL || 'http://localhost:4201/api';
const prisma = new PrismaClient();
let fallos = 0, pruebas = 0, saltadas = 0;
// Serie de la factura del caso 6.b. No existe en `Serie`, así que no consume
// correlativo real; se borra al terminar.
const SERIE_GUIA_QA = 'FQA8';
const creados = { despachos: [], facturas: [] };
let configPrevia = null;

const ok = (cond, titulo, detalle = '') => {
  pruebas++;
  if (cond) console.log(`   ✔ ${titulo}`);
  else { fallos++; console.log(`   ✘ ${titulo}${detalle ? `\n       ${detalle}` : ''}`); }
};
const saltar = (titulo, motivo) => {
  saltadas++;
  console.log(`   ⊘ ${titulo} — no verificable: ${motivo}`);
};

async function login(email = 'gerencia@kaisercorp.com.pe') {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: process.env.QA_PASS || 'kaiser123' }),
  });
  const j = await r.json();
  if (!j.data) throw new Error(`login falló (${email}): ${j?.message}`);
  if (!j.data.requiresSedeSelection) return j.data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
    body: JSON.stringify({ sedeId: j.data.sedes[0].id }),
  });
  return (await r2.json()).data.accessToken;
}

const api = (token) => async (ruta, opts = {}) => {
  const r = await fetch(`${API}${ruta}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  const texto = await r.text();
  let j = null; try { j = JSON.parse(texto); } catch { /* binario */ }
  return { status: r.status, json: j, texto };
};

async function main() {
  console.log('\nQA · Couriers (Shalom / Olva) portados desde falconext-mype');
  console.log('═'.repeat(62));

  const token = await login();
  const call = api(token);
  const empresa = await prisma.empresa.findFirst({ select: { id: true } });

  // ── 1. Catálogos de los proveedores ───────────────────────────────────────
  console.log('\n1) Los catálogos de los proveedores responden');
  const agShalom = await call('/shalom/agencias');
  if (agShalom.status !== 200) {
    saltar('agencias de Shalom', `HTTP ${agShalom.status}`);
  } else {
    const lista = agShalom.json?.data?.data ?? agShalom.json?.data ?? [];
    ok(Array.isArray(lista) && lista.length > 0, `Shalom devuelve ${lista.length} agencias`);
    ok(lista[0]?.terId != null, 'cada agencia trae su ter_id (lo exige crear la guía)',
      `primera: ${JSON.stringify(lista[0])?.slice(0, 120)}`);
  }

  const agOlva = await call('/olva/agencias');
  if (agOlva.status !== 200) {
    saltar('agencias de Olva', `HTTP ${agOlva.status}`);
  } else {
    const lista = agOlva.json?.data?.data ?? [];
    ok(Array.isArray(lista) && lista.length > 0, `Olva devuelve ${lista.length} agencias`);
  }

  const tamanos = await call('/olva/tamanos');
  if (tamanos.status === 200) {
    ok((tamanos.json?.data?.data ?? []).length > 0, 'Olva devuelve los tamaños estándar');
  } else {
    saltar('tamaños de Olva', `HTTP ${tamanos.status} (¿falta OLVA_API_KEY?)`);
  }

  const prodShalom = await call('/shalom/productos');
  ok(prodShalom.status === 200 && (prodShalom.json?.data ?? []).length > 0,
    'Shalom devuelve los tipos de paquete (SOBRE, XS, S…)', `HTTP ${prodShalom.status}`);

  // ── 2. La clave de retiro ─────────────────────────────────────────────────
  console.log('\n2) La clave de retiro de Shalom');
  const clave = await call('/shalom/clave-retiro');
  const c = clave.json?.data;
  ok(clave.status === 200 && /^\d{4}$/.test(String(c?.clave ?? '')),
    `genera una clave de 4 dígitos (origen: ${c?.origen})`, JSON.stringify(c));

  // ── 3. La configuración se guarda de verdad ───────────────────────────────
  console.log('\n3) La configuración de Olva persiste');
  const antes = await call('/olva/config');
  configPrevia = antes.json?.data ?? null;
  ok(antes.status === 200, 'GET olva/config responde');

  const UBIGEO_QA = '150101';
  const patch = await call('/olva/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agenciaOrigenCodigo: 'QA-000',
      agenciaOrigenNombre: 'QA · Agencia de prueba',
      agenciaOrigenUbigeo: UBIGEO_QA,
    }),
  });
  ok(patch.status === 200, 'PATCH olva/config responde', `HTTP ${patch.status}`);

  const enBase = await prisma.empresa.findUnique({
    where: { id: empresa.id },
    select: { olvaAgenciaOrigenCodigo: true, olvaAgenciaOrigenUbigeo: true, olvaAutoTrackingActivo: true },
  });
  ok(enBase?.olvaAgenciaOrigenCodigo === 'QA-000' && enBase?.olvaAgenciaOrigenUbigeo === UBIGEO_QA,
    'quedó escrito en la BASE, no solo en la respuesta',
    JSON.stringify(enBase));

  // ── 4. El rastreo automático es opt-in ────────────────────────────────────
  console.log('\n4) El rastreo automático nace apagado (opt-in)');
  const flags = await prisma.empresa.findUnique({
    where: { id: empresa.id },
    select: { shalomAutoTrackingActivo: true, olvaAutoTrackingActivo: true, shalomAutoGuiaActivo: true },
  });
  ok(flags.shalomAutoTrackingActivo === false, 'shalomAutoTrackingActivo = false');
  ok(flags.olvaAutoTrackingActivo === false, 'olvaAutoTrackingActivo = false');
  ok(flags.shalomAutoGuiaActivo === false,
    'shalomAutoGuiaActivo = false (nadie crea guías reales sin pedirlo)');

  // ── 5. Los campos nuevos del despacho se guardan ──────────────────────────
  console.log('\n5) Los campos de courier del despacho se guardan');
  const comp = await prisma.comprobante.findFirst({
    where: { tipoDoc: { in: ['01', '03'] } },
    select: { id: true, serie: true, correlativo: true },
    orderBy: { id: 'desc' },
  });
  if (!comp) {
    saltar('despacho de prueba', 'no hay comprobantes formales en la base');
  } else {
    const prev = await prisma.envioDespacho.findUnique({ where: { comprobanteId: comp.id } });
    if (prev) {
      saltar('despacho de prueba', `${comp.serie}-${comp.correlativo} ya tiene despacho; no se toca`);
    } else {
      const crear = await call(`/envio-despacho/comprobante/${comp.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transportista: 'SHALOM_PRO', tipoEnvio: 'AGENCIA',
          agenciaDestino: 'QA · Agencia destino', nombreDestinatario: 'QA Prueba',
          dniDestinatario: '00000000', celularDest: '999000000', turnoEnvio: 'MANANA',
          nroPaquetes: 1, contenidoPaquete: '1 Caja', estado: 'PREPARANDO',
          costoEnvio: 25, pesoKg: 2.5, shalomAgenciaDestinoId: '7',
        }),
      });
      ok(crear.status === 200 || crear.status === 201, 'se crea el despacho', `HTTP ${crear.status}: ${crear.texto.slice(0, 160)}`);
      const d = await prisma.envioDespacho.findUnique({ where: { comprobanteId: comp.id } });
      if (d) creados.despachos.push(d.id);
      ok(Number(d?.pesoKg) === 2.5, 'pesoKg (lo exige Olva para la guía) se guardó', `pesoKg=${d?.pesoKg}`);
      ok(d?.shalomAgenciaDestinoId === '7', 'shalomAgenciaDestinoId se guardó', `=${d?.shalomAgenciaDestinoId}`);
      // `shalomTamano` y `shalomFleteCotizado` NO los manda el formulario: los
      // sella `shalom.service` al CREAR la guía, con el tamaño que acabó
      // usándose y el flete que cotizó Shalom para esa ruta. Por eso el DTO del
      // despacho no los declara y aquí tienen que nacer vacíos.
      ok(d?.shalomTamano == null && d?.shalomFleteCotizado == null,
        'shalomTamano/flete nacen vacíos (los sella la guía, no el alta)',
        `tamano=${d?.shalomTamano} flete=${d?.shalomFleteCotizado}`);
      ok(d?.shalomEstado == null && d?.olvaEstado == null,
        'nace sin estado de rastreo (lo escribe el cron, no el alta)');

      // ── 6. El tablero cuenta ese envío ────────────────────────────────────
      console.log('\n6) El tablero de couriers lo refleja');
      // El período es el del COMPROBANTE, no el de hoy: el despacho cuelga de
      // una venta que puede ser de un mes anterior y entonces el tablero del mes
      // corriente sale vacío con razón. Pasó el 1 de octubre con una factura del
      // 30 de septiembre.
      const fechaComp = await prisma.comprobante.findUnique({
        where: { id: comp.id }, select: { fechaEmision: true },
      });
      const ref = fechaComp?.fechaEmision ?? new Date();
      const tab = await call(`/analisis-financiero/couriers?mes=${ref.getMonth() + 1}&anio=${ref.getFullYear()}`);
      const data = tab.json?.data;
      ok(tab.status === 200, 'GET analisis-financiero/couriers responde', `HTTP ${tab.status}`);
      const shalom = (data?.couriers ?? []).find((x) => /shalom/i.test(x.courier));
      ok(!!shalom, 'aparece Shalom entre los couriers del período',
        `couriers=${JSON.stringify(data?.couriers?.map((x) => x.courier))}`);
      ok(Number(shalom?.costoEnvio) >= 25, 'el flete del período incluye los S/ 25',
        `costoEnvio=${shalom?.costoEnvio}`);
      ok(Number(data?.resumen?.enCurso) >= 1, 'cuenta el envío como "en curso"',
        `enCurso=${data?.resumen?.enCurso}`);
    }
  }

  // ── 6.b La guía de remisión no se lleva el flete ──────────────────────────
  console.log('\n6.b) La guía de remisión excluye el "Servicio de envío"');
  {
    const prod = await prisma.producto.findFirst({ where: { empresaId: empresa.id }, select: { id: true, descripcion: true } });
    const sede2 = await prisma.sede.findFirst({ where: { empresaId: empresa.id }, select: { id: true } });
    const cli2 = await prisma.cliente.findFirst({ where: { empresaId: empresa.id }, select: { id: true } });
    const linea = (o) => ({ cantidad: 1, mtoValorUnitario: 100, mtoPrecioUnitario: 118, mtoValorVenta: 100,
      mtoBaseIgv: 100, igv: 18, totalImpuestos: 18, tipAfeIgv: 10, porcentajeIgv: 18, ...o });
    const fac = await prisma.comprobante.create({
      data: {
        empresaId: empresa.id, sedeId: sede2.id, clienteId: cli2.id, usuarioId: 1,
        tipoDoc: '01', serie: SERIE_GUIA_QA, correlativo: 98000099, fechaEmision: new Date(),
        tipoMoneda: 'PEN', mtoOperGravadas: 300, mtoIGV: 54, totalImpuestos: 54,
        valorVenta: 300, subTotal: 354, mtoImpVenta: 354, saldo: 354,
        estadoEnvioSunat: 'EMITIDO', estadoPago: 'PENDIENTE_PAGO',
        formaPagoTipo: 'CONTADO', formaPagoMoneda: 'PEN',
        detalles: { create: [
          linea({ productoId: prod.id, descripcion: prod.descripcion, unidad: 'NIU' }),
          // Mercadería vendida como ítem libre: SÍ se transporta.
          linea({ productoId: null, descripcion: 'QA · mercadería fuera de catálogo', unidad: 'NIU' }),
          // El flete que el POS añade a toda factura con despacho: NO se transporta.
          linea({ productoId: null, descripcion: 'Servicio de envío (Shalom PRO)', unidad: 'ZZ' }),
        ] },
      },
      select: { id: true },
    });
    creados.facturas.push(fac.id);
    const pre = await call(`/guia-remision/desde-comprobante/${fac.id}`);
    const det = pre.json?.data?.detalles ?? [];
    ok(pre.status === 200, 'el prefill de la guía responde', `HTTP ${pre.status}`);
    ok(!det.some((d) => /Servicio de envío/i.test(d.descripcion)),
      'el flete (unidad ZZ) no se cuela como mercadería a trasladar',
      `llegó: ${det.map((d) => d.descripcion).join(' | ')}`);
    ok(det.some((d) => /fuera de catálogo/i.test(d.descripcion)),
      'un ítem libre que SÍ es mercadería se conserva',
      `llegó: ${det.map((d) => d.descripcion).join(' | ')}`);
  }

  // ── 7. Crear guía sin cuenta conectada se rechaza con un motivo ───────────
  console.log('\n7) Sin cuenta Shalom Pro conectada no se crea la guía');
  const inst = await call('/shalom/instancia');
  const conectada = inst.json?.data?.conectada === true;
  if (conectada) {
    saltar('rechazo sin cuenta', 'la empresa YA tiene cuenta conectada; crear una guía real cuesta dinero');
  } else {
    const pend = await call('/shalom/pendientes');
    ok(pend.status === 400 && /conectado tu cuenta/i.test(pend.json?.message ?? ''),
      'explica que falta conectar la cuenta, no da un 500',
      `HTTP ${pend.status}: ${pend.json?.message}`);
  }

  // ── 8. Permisos: lectura abierta, escritura cerrada ───────────────────────
  console.log('\n8) Lecturas abiertas, escrituras con permiso del área');
  const tokenProd = await login('produccion@kaisercorp.com.pe');
  const callProd = api(tokenProd);
  const lectura = await callProd('/olva/config');
  ok(lectura.status === 200, 'producción PUEDE leer la configuración (GET 200)', `HTTP ${lectura.status}`);
  const escritura = await callProd('/olva/config', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  ok(escritura.status === 403, 'producción NO puede escribirla (PATCH 403)', `HTTP ${escritura.status}`);
  const escrituraShalom = await callProd('/shalom/instancia', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  ok(escrituraShalom.status === 403, 'tampoco puede tocar la cuenta Shalom (PATCH 403)', `HTTP ${escrituraShalom.status}`);
}

async function limpiar() {
  console.log('\n9) Limpieza');
  if (creados.despachos.length) {
    await prisma.envioDespacho.deleteMany({ where: { id: { in: creados.despachos } } });
  }
  if (creados.facturas.length) {
    await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: { in: creados.facturas } } });
    await prisma.comprobante.deleteMany({ where: { id: { in: creados.facturas } } });
  }
  const facturasSueltas = await prisma.comprobante.count({ where: { serie: SERIE_GUIA_QA } });
  ok(facturasSueltas === 0, `sin facturas de prueba sueltas (serie ${SERIE_GUIA_QA})`);
  const sueltos = await prisma.envioDespacho.count({ where: { agenciaDestino: { contains: 'QA ·' } } });
  ok(sueltos === 0, `sin despachos de prueba sueltos (${creados.despachos.length} borrados)`);

  // La configuración de Olva vuelve a como estaba.
  if (configPrevia) {
    await prisma.empresa.updateMany({
      data: {
        olvaAgenciaOrigenCodigo: configPrevia.agenciaOrigenCodigo ?? null,
        olvaAgenciaOrigenNombre: configPrevia.agenciaOrigenNombre ?? null,
        olvaAgenciaOrigenUbigeo: configPrevia.agenciaOrigenUbigeo ?? null,
      },
    });
    const ahora = await prisma.empresa.findFirst({ select: { olvaAgenciaOrigenCodigo: true } });
    ok(ahora?.olvaAgenciaOrigenCodigo === (configPrevia.agenciaOrigenCodigo ?? null),
      'la configuración de Olva quedó como estaba',
      `ahora=${ahora?.olvaAgenciaOrigenCodigo} antes=${configPrevia.agenciaOrigenCodigo}`);
  }
}

main()
  .catch((e) => { fallos++; console.log(`\n   ✘ el QA se cortó: ${e.message}`); })
  .finally(async () => {
    await limpiar().catch((e) => console.log(`   ⚠ limpieza incompleta: ${e.message}`));
    console.log('\n' + '═'.repeat(62));
    const saltadasTxt = saltadas ? `, ${saltadas} no verificable(s)` : '';
    console.log(`${fallos === 0 ? '✅' : '❌'} ${pruebas - fallos}/${pruebas} comprobaciones${saltadasTxt}\n`);
    await prisma.$disconnect();
    process.exit(fallos === 0 ? 0 : 1);
  });
