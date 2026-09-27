/**
 * QA funcional del expediente documental de una compra.
 *
 * Almacén lo pidió así: "revisar la documentación: orden de compra, packing
 * list, factura, guía u otros documentos" y "esta documentación debería poder
 * subirse al ERP a fin de alimentar un archivo digital".
 *
 *   pnpm run qa:docs-compra
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;

let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

/** PDF mínimo válido, para no depender de ningún archivo del disco. */
const pdf = () => Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\n' +
  'trailer<</Root 1 0 R>>\n%%EOF\n',
);

async function api(ruta, { token, form, ...init } = {}) {
  const r = await fetch(API + ruta, {
    ...init,
    body: form ?? init.body,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(form ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers || {}),
    },
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j, data: j?.data };
}

async function login(email = 'gerencia@kaisercorp.com.pe') {
  const { data } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'kaiser123' }) });
  if (!data?.requiresSedeSelection) return data.accessToken;
  const { data: sel } = await api('/auth/select-sede', {
    token: data.tempToken || data.accessToken || data.token,
    method: 'POST', body: JSON.stringify({ sedeId: SEDE }),
  });
  return sel.accessToken;
}

const subir = (compraId, token, { tipo, nombre, archivo, observacion }) => {
  const form = new FormData();
  form.append('file', new Blob([pdf()], { type: 'application/pdf' }), archivo);
  if (tipo) form.append('tipo', tipo);
  if (nombre) form.append('nombre', nombre);
  if (observacion) form.append('observacion', observacion);
  return api(`/compras/${compraId}/documentos`, { token, method: 'POST', form });
};

async function main() {
  const token = await login();
  const compra = await prisma.compra.findFirst({ orderBy: { id: 'desc' }, select: { id: true, serie: true, numero: true } });
  if (!compra) throw new Error('No hay compras sobre las que probar');
  console.log(`Compra de prueba: ${compra.serie}-${compra.numero} (id ${compra.id})\n`);

  const subidos = [];

  // ── 1. El expediente completo de una recepción ──────────────────────────
  console.log('1) Subir el expediente de la recepción');
  const papeles = [
    { tipo: 'PACKING_LIST', nombre: 'Packing list del proveedor', archivo: 'packing-list.pdf' },
    { tipo: 'FACTURA', nombre: 'Factura del proveedor', archivo: 'factura-proveedor.pdf' },
    { tipo: 'GUIA_REMISION', nombre: 'Guía del transportista', archivo: 'guia-transportista.pdf' },
    { tipo: 'INCIDENCIA', nombre: 'Reporte de faltantes', archivo: 'faltantes.pdf',
      observacion: 'Faltaron 2 rollos de malla raschel; se reportó al proveedor.' },
  ];
  for (const p of papeles) {
    const r = await subir(compra.id, token, p);
    ok(r.status === 201 || r.status === 200, `${p.tipo}: ${p.nombre} (HTTP ${r.status})`);
    if (r.data?.id) subidos.push(r.data);
  }

  // ── 2. Se listan juntos ─────────────────────────────────────────────────
  console.log('\n2) El expediente se consulta de una vez');
  const lista = await api(`/compras/${compra.id}/documentos`, { token });
  ok(lista.status === 200, `HTTP ${lista.status}`);
  const docs = Array.isArray(lista.data) ? lista.data : [];
  ok(docs.length >= 4, `${docs.length} documentos en el expediente`);
  const tipos = new Set(docs.map((d) => d.tipo));
  ok(['PACKING_LIST', 'FACTURA', 'GUIA_REMISION', 'INCIDENCIA'].every((t) => tipos.has(t)),
     `están los cuatro tipos: ${[...tipos].join(', ')}`);
  const incidencia = docs.find((d) => d.tipo === 'INCIDENCIA');
  ok(/Faltaron 2 rollos/.test(incidencia?.observacion ?? ''),
     `la incidencia conserva lo que anotó almacén: "${incidencia?.observacion}"`);
  ok(!!docs[0]?.usuario?.nombre, `queda registrado quién lo subió (${docs[0]?.usuario?.nombre})`);
  ok(/^https?:\/\//.test(docs[0]?.url ?? ''), 'el archivo quedó en S3 con su URL');

  // ── 3. Un tipo inventado cae en OTRO ────────────────────────────────────
  console.log('\n3) Un tipo desconocido no rompe nada');
  const r3 = await subir(compra.id, token, { tipo: 'LO_QUE_SEA', nombre: 'Documento suelto', archivo: 'suelto.pdf' });
  ok(r3.data?.tipo === 'OTRO', `se guarda como OTRO (llegó "${r3.data?.tipo}")`);
  if (r3.data?.id) subidos.push(r3.data);

  // ── 4. Sin archivo ──────────────────────────────────────────────────────
  console.log('\n4) Sin archivo · debe rechazarse');
  const r4 = await api(`/compras/${compra.id}/documentos`, { token, method: 'POST', form: new FormData() });
  ok(r4.status === 400, `HTTP ${r4.status} — "${r4.body?.message}"`);

  // ── 5. Una compra de otra empresa ───────────────────────────────────────
  console.log('\n5) Compra inexistente · 404');
  const r5 = await subir(999999, token, { tipo: 'FACTURA', nombre: 'x', archivo: 'x.pdf' });
  ok(r5.status === 404, `HTTP ${r5.status}`);

  // ── 6. Permisos ─────────────────────────────────────────────────────────
  //
  // Todo el módulo de compras exige el permiso `compras`, así que ventas no
  // llega ni al expediente: no ve las compras en absoluto. Es coherente con el
  // resto del módulo, y distinto de las devoluciones, donde almacén sí pidió
  // expresamente que comercial pudiera verlas.
  console.log('\n6) Permisos · compras es de almacén y gerencia');
  const tkVentas = await login('ventas@kaisercorp.com.pe');
  const lec = await api(`/compras/${compra.id}/documentos`, { token: tkVentas });
  ok(lec.status === 403, `ventas no accede al expediente (HTTP ${lec.status}) — no ve compras`);
  const esc = await subir(compra.id, tkVentas, { tipo: 'FACTURA', nombre: 'x', archivo: 'x.pdf' });
  ok(esc.status === 403, `ventas NO puede adjuntar (HTTP ${esc.status})`);

  const tkAlmacen = await login('almacen@kaisercorp.com.pe');
  const escA = await subir(compra.id, tkAlmacen, { tipo: 'FACTURA', nombre: 'Subido por almacén', archivo: 'almacen.pdf' });
  ok(escA.status === 201 || escA.status === 200, `almacén SÍ puede adjuntar (HTTP ${escA.status})`);
  if (escA.data?.id) subidos.push(escA.data);

  // ── 7. Eliminar ─────────────────────────────────────────────────────────
  console.log('\n7) Eliminar un documento');
  const aBorrar = subidos[subidos.length - 1];
  const r7 = await api(`/compras/${compra.id}/documentos/${aBorrar.id}`, { token, method: 'DELETE' });
  ok(r7.status === 200, `eliminado (HTTP ${r7.status})`);
  const tras = await api(`/compras/${compra.id}/documentos`, { token });
  ok(!(tras.data ?? []).some((d) => d.id === aBorrar.id), 'ya no aparece en el expediente');
  subidos.pop();

  // ── limpieza ────────────────────────────────────────────────────────────
  console.log('\n8) Limpieza');
  for (const d of subidos) {
    await api(`/compras/${compra.id}/documentos/${d.id}`, { token, method: 'DELETE' });
  }
  const fin = await api(`/compras/${compra.id}/documentos`, { token });
  ok((fin.data ?? []).length === 0, `el expediente queda vacío (${(fin.data ?? []).length})`);

  console.log(`\n${fallos === 0 ? '✔ QA COMPLETO: todo correcto' : `✘ ${fallos} comprobación(es) fallaron`}`);
  process.exitCode = fallos ? 1 : 0;
}

main().catch((e) => { console.error('✖', String(e?.message ?? e).slice(0, 300)); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
