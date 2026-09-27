/**
 * QA funcional de "la guía mueve kardex". Contra la API real, sin atajos.
 *
 * Escenarios:
 *  1. Motivo 04 (traslado entre establecimientos) → salida de origen + ingreso en destino
 *  2. Motivo 01 (venta) → NO mueve stock (la factura ya lo hizo)
 *  3. Motivo 06 (devolución) → ingreso
 *  4. Anular la guía del caso 1 → devuelve el stock
 *  5. Anular sin motivo → lo rechaza
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const COD = '22530COVI0001';
const SEDE_ORIGEN = 1, SEDE_DESTINO = 3;

let fallos = 0;
const ok = (c, msg) => { console.log(`   ${c ? '✔' : '✘'} ${msg}`); if (!c) fallos++; };

async function api(ruta, { token, ...init } = {}) {
  const r = await fetch(API + ruta, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j, data: j?.data };
}
const stock = async (sedeId) => {
  const pr = await prisma.producto.findFirst({ where: { codigo: COD }, select: { id: true } });
  const ps = await prisma.productoStock.findUnique({ where: { productoId_sedeId: { productoId: pr.id, sedeId } } });
  return { productoId: pr.id, stock: Number(ps?.stock ?? 0) };
};
const movimientosDe = (guiaId) => !guiaId ? Promise.resolve([]) : prisma.movimientoKardex.findMany({
  where: { guiaRemisionId: guiaId }, select: { tipoMovimiento: true, sedeId: true, cantidad: true, concepto: true },
  orderBy: { id: 'asc' },
});

function cuerpoGuia({ tipoTraslado, correlativo, productoId, cantidad, llegadaCod }) {
  return {
    tipoGuia: 'REMITENTE', serie: 'T001', correlativo,
    fechaEmision: '2026-09-27', fechaInicioTraslado: '2026-09-27',
    tipoDocumento: '09',
    remitenteRuc: '20492641431', remitenteRazonSocial: 'KAISER CORPORATION S.A.',
    remitenteDireccion: 'Jr. Francia 1028, La Victoria, Lima',
    destinatarioTipoDoc: '6', destinatarioNumDoc: '20492641431',
    destinatarioRazonSocial: 'KAISER CORPORATION S.A.',
    tipoTraslado, modoTransporte: '02', pesoTotal: 50, unidadPeso: 'KGM',
    conductorTipoDoc: '1', conductorNumDoc: '41258963', conductorNombre: 'Luis',
    conductorApellidos: 'Quispe Mamani', conductorLicencia: 'Q41258963',
    vehiculoPlaca: 'BTK-842',
    partidaUbigeo: '150115', partidaDireccion: 'Jr. Francia 1028, La Victoria', partidaCodigoEstablecimiento: '0000',
    llegadaUbigeo: '150110', llegadaDireccion: 'Chacra Cerro, Comas', llegadaCodigoEstablecimiento: llegadaCod,
    detalles: [{ productoId, codigoProducto: COD, descripcion: 'MALLA CORTAVIENTOS', cantidad, unidadMedida: 'NIU' }],
  };
}

async function main() {
  // Con más de una sede, el login devuelve un token temporal y hay que elegir
  // sede: es el flujo multi-sede del ERP.
  const { data: login } = await api('/auth/login', {
    method: 'POST', body: JSON.stringify({ email: 'gerencia@kaisercorp.com.pe', password: 'kaiser123' }),
  });
  let token = login.accessToken;
  if (login.requiresSedeSelection) {
    const { data: sel } = await api('/auth/select-sede', {
      token: login.tempToken || login.accessToken || login.token,
      method: 'POST', body: JSON.stringify({ sedeId: SEDE_ORIGEN }),
    });
    token = sel.accessToken;
  }
  if (!token) throw new Error('No se obtuvo token: ' + JSON.stringify(login).slice(0, 200));

  const ult = await prisma.guiaRemision.findFirst({ where: { serie: 'T001' }, orderBy: { correlativo: 'desc' } });
  let corr = (ult?.correlativo ?? 0);
  const creadas = [];

  // ── 1. Traslado entre establecimientos ──────────────────────────────────
  console.log('\n1) Motivo 04 · traslado entre establecimientos');
  const o0 = await stock(SEDE_ORIGEN), d0 = await stock(SEDE_DESTINO);
  console.log(`   stock antes → origen ${o0.stock} · destino ${d0.stock}`);
  const r1 = await api('/guia-remision', {
    token, method: 'POST',
    body: JSON.stringify(cuerpoGuia({ tipoTraslado: '04', correlativo: ++corr, productoId: o0.productoId, cantidad: 10, llegadaCod: '0001' })),
  });
  ok(r1.status === 201 || r1.status === 200, `guía creada (HTTP ${r1.status})`);
  const g1 = r1.data?.id; creadas.push(g1);
  const o1 = await stock(SEDE_ORIGEN), d1 = await stock(SEDE_DESTINO);
  console.log(`   stock después → origen ${o1.stock} · destino ${d1.stock}`);
  ok(o1.stock === o0.stock - 10, `origen bajó 10 (${o0.stock} → ${o1.stock})`);
  ok(d1.stock === d0.stock + 10, `destino subió 10 (${d0.stock} → ${d1.stock})`);
  const m1 = await movimientosDe(g1);
  ok(m1.length === 2, `2 movimientos en el kardex, atados a la guía (hay ${m1.length})`);
  m1.forEach((m) => console.log(`      ${m.tipoMovimiento} sede ${m.sedeId} · ${m.concepto}`));

  // ── 2. Venta: no debe mover ─────────────────────────────────────────────
  console.log('\n2) Motivo 01 · venta (la factura ya movió el stock)');
  const o2a = await stock(SEDE_ORIGEN);
  const r2 = await api('/guia-remision', {
    token, method: 'POST',
    body: JSON.stringify(cuerpoGuia({ tipoTraslado: '01', correlativo: ++corr, productoId: o2a.productoId, cantidad: 7, llegadaCod: '0000' })),
  });
  ok(r2.status === 201 || r2.status === 200, `guía creada (HTTP ${r2.status})`);
  const g2 = r2.data?.id; creadas.push(g2);
  const o2b = await stock(SEDE_ORIGEN);
  ok(o2b.stock === o2a.stock, `el stock NO se tocó (${o2a.stock} → ${o2b.stock}) — sin doble descuento`);
  ok((await movimientosDe(g2)).length === 0, 'sin movimientos de kardex');

  // ── 3. Devolución ───────────────────────────────────────────────────────
  console.log('\n3) Motivo 06 · devolución');
  const o3a = await stock(SEDE_ORIGEN);
  const r3 = await api('/guia-remision', {
    token, method: 'POST',
    body: JSON.stringify(cuerpoGuia({ tipoTraslado: '06', correlativo: ++corr, productoId: o3a.productoId, cantidad: 4, llegadaCod: '0000' })),
  });
  ok(r3.status === 201 || r3.status === 200, `guía creada (HTTP ${r3.status})`);
  const g3 = r3.data?.id; creadas.push(g3);
  const o3b = await stock(SEDE_ORIGEN);
  ok(o3b.stock === o3a.stock + 4, `el stock subió 4 (${o3a.stock} → ${o3b.stock})`);

  // ── 4. Anular el traslado ───────────────────────────────────────────────
  console.log('\n4) Anular la guía del caso 1 · debe devolver el stock');
  const o4a = await stock(SEDE_ORIGEN), d4a = await stock(SEDE_DESTINO);
  const r4 = await api(`/guia-remision/${g1}/anular`, {
    token, method: 'PATCH', body: JSON.stringify({ motivo: 'Error en la cantidad despachada' }),
  });
  ok(r4.status === 200, `anulada (HTTP ${r4.status})`);
  const o4b = await stock(SEDE_ORIGEN), d4b = await stock(SEDE_DESTINO);
  ok(o4b.stock === o4a.stock + 10, `origen recuperó 10 (${o4a.stock} → ${o4b.stock})`);
  ok(d4b.stock === d4a.stock - 10, `destino devolvió 10 (${d4a.stock} → ${d4b.stock})`);
  const g1f = await prisma.guiaRemision.findUnique({ where: { id: g1 }, select: { estadoSunat: true, motivoAnulacion: true } });
  ok(g1f.estadoSunat === 'ANULADO', `estado ANULADO (${g1f.estadoSunat})`);
  ok(g1f.motivoAnulacion === 'Error en la cantidad despachada', `motivo guardado: "${g1f.motivoAnulacion}"`);
  ok((await movimientosDe(g1)).length === 4, 'los 2 movimientos originales siguen + 2 de reversión (el kardex no se borra)');

  // ── 5. Anular sin motivo ────────────────────────────────────────────────
  console.log('\n5) Anular sin motivo · debe rechazarse');
  const r5 = await api(`/guia-remision/${g3}/anular`, { token, method: 'PATCH', body: JSON.stringify({ motivo: '   ' }) });
  ok(r5.status === 400, `rechazado con HTTP ${r5.status} — "${r5.body?.message}"`);

  // ── limpieza ────────────────────────────────────────────────────────────
  console.log('\n6) Limpieza de las guías del QA');
  for (const id of creadas) {
    if (!id) continue;
    const g = await prisma.guiaRemision.findUnique({ where: { id }, select: { estadoSunat: true } });
    if (g?.estadoSunat !== 'ANULADO') {
      const r = await api(`/guia-remision/${id}/anular`, { token, method: 'PATCH', body: JSON.stringify({ motivo: 'Guía de prueba del QA' }) });
      if (r.status !== 200) console.log(`      aviso: no se pudo anular ${id} (HTTP ${r.status})`);
    }
    // Devolver al stock lo que estos movimientos dejaron, antes de borrarlos:
    // un QA no puede dejar el inventario distinto de como lo encontró.
    const movs = await prisma.movimientoKardex.findMany({
      where: { guiaRemisionId: id },
      select: { productoId: true, sedeId: true, cantidad: true, tipoMovimiento: true },
    });
    for (const m of movs) {
      if (!m.sedeId) continue;
      const delta = m.tipoMovimiento === 'SALIDA' ? Number(m.cantidad)
        : m.tipoMovimiento === 'INGRESO' ? -Number(m.cantidad)
        : -Number(m.cantidad); // AJUSTE: la cantidad ya lleva signo
      await prisma.productoStock.updateMany({
        where: { productoId: m.productoId, sedeId: m.sedeId },
        data: { stock: { increment: delta } },
      });
    }
    await prisma.movimientoKardex.deleteMany({ where: { guiaRemisionId: id } });
    await prisma.detalleGuiaRemision.deleteMany({ where: { guiaRemisionId: id } });
    await prisma.guiaRemision.delete({ where: { id } }).catch(() => {});
  }
  console.log(`   ${creadas.filter(Boolean).length} guías de prueba eliminadas`);

  const oFin = await stock(SEDE_ORIGEN), dFin = await stock(SEDE_DESTINO);
  console.log('\n7) El QA no deja rastro');
  ok(oFin.stock === o0.stock, `stock de origen igual que al empezar (${o0.stock} → ${oFin.stock})`);
  ok(dFin.stock === d0.stock, `stock de destino igual que al empezar (${d0.stock} → ${dFin.stock})`);

  console.log(`\n${fallos === 0 ? '✔ QA COMPLETO: todo correcto' : `✘ ${fallos} comprobación(es) fallaron`}`);
  process.exitCode = fallos ? 1 : 0;
}
main().catch((e) => { console.error('✖', e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
