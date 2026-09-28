/**
 * QA funcional · Fase 1 — Maestros
 *
 * Productos, clientes/proveedores, sedes, series y catálogos SUNAT. Es la base:
 * un error aquí contamina compras, ventas y contabilidad.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
const SEDE_LOGIN = SEDE;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

async function api(ruta, { token, ...init } = {}) {
  const r = await fetch(API + ruta, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j, data: j?.data };
}
async function login(email = 'gerencia@kaisercorp.com.pe') {
  const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'kaiser123' }) });
  if (r.status >= 400 || !r.data) {
    throw new Error(
      `login de ${email} falló (HTTP ${r.status}): ${r.body?.message ?? 'sin mensaje'}. ` +
      `¿Está el backend arriba en ${API} y no reiniciándose?`,
    );
  }
  const { data } = r;
  if (!data.requiresSedeSelection) return data.accessToken;
  const sel = await api('/auth/select-sede', { token: data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE_LOGIN }) });
  if (sel.status >= 400 || !sel.data?.accessToken) {
    throw new Error(`select-sede de ${email} falló (HTTP ${sel.status}): ${sel.body?.message ?? 'sin mensaje'}`);
  }
  return sel.data.accessToken;
}

async function main() {
  const token = await login();
  const creados = { productos: [], clientes: [] };
  const marca = `[QA-${Date.now()}]`;

  // ── 1. Catálogos SUNAT ──────────────────────────────────────────────────
  console.log('\n1) Catálogos SUNAT sembrados');
  const [u, td, mn] = await Promise.all([
    prisma.unidadMedida.count(),
    prisma.tipoDocumento.count(),
    prisma.motivoNota.count(),
  ]);
  ok(u > 0, `unidades de medida: ${u}`);
  ok(td > 0, `tipos de documento: ${td}`);
  ok(mn >= 11, `motivos de nota: ${mn} (SUNAT define 11 de crédito)`);
  const ubigeos = await prisma.ubigeo.count();
  ok(ubigeos > 1000, `ubigeos: ${ubigeos}`);

  // ── 2. Empresa y series ─────────────────────────────────────────────────
  console.log('\n2) Empresa y series de comprobantes');
  const emp = await prisma.empresa.findFirst({ select: { ruc: true, razonSocial: true, tipoEmpresa: true } });
  ok(/^\d{11}$/.test(emp?.ruc ?? ''), `RUC de 11 dígitos: ${emp?.ruc}`);
  ok(emp?.ruc !== '20100000001', 'el RUC no es el marcador de posición del seed');
  ok(emp?.tipoEmpresa === 'FORMAL', `tipo de empresa: ${emp?.tipoEmpresa}`);
  const sedes = await prisma.sede.findMany({ select: { nombre: true, codigo: true, esPrincipal: true } });
  ok(sedes.length >= 1, `sedes: ${sedes.map((s) => `${s.nombre} (${s.codigo})`).join(', ')}`);
  ok(sedes.filter((s) => s.esPrincipal).length === 1, 'hay exactamente una sede principal');
  const codigos = sedes.map((s) => s.codigo);
  ok(new Set(codigos).size === codigos.length, 'los códigos de sede no se repiten');

  // ── 3. Productos: integridad del catálogo ───────────────────────────────
  console.log('\n3) Catálogo de productos');
  const total = await prisma.producto.count();
  ok(total > 0, `productos: ${total}`);
  const dupes = await prisma.$queryRawUnsafe(
    `SELECT codigo, COUNT(*)::int n FROM "Producto" WHERE codigo IS NOT NULL GROUP BY codigo HAVING COUNT(*) > 1 LIMIT 5`,
  );
  ok(dupes.length === 0, `sin códigos duplicados${dupes.length ? ': ' + dupes.map((d) => d.codigo).join(', ') : ''}`);
  const sinPrecio = await prisma.producto.count({ where: { precioUnitario: { lte: 0 } } });
  ok(sinPrecio === 0, `productos con precio 0 o negativo: ${sinPrecio}`);
  const negativos = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int n FROM "ProductoStock" WHERE stock < 0`,
  );
  ok(negativos[0].n === 0, `stock negativo en alguna sede: ${negativos[0].n}`);

  // ── 4. Alta de producto por la API ──────────────────────────────────────
  console.log('\n4) Alta y edición de producto');
  const codigo = `QA${Date.now().toString().slice(-8)}`;
  const nuevo = await api('/productos', {
    token, method: 'POST',
    body: JSON.stringify({
      codigo, descripcion: `${marca} Producto de prueba`,
      precioUnitario: 150.5, costoPromedio: 100, stock: 0,
      tipoAfectacionIGV: '10', sedeId: SEDE,
    }),
  });
  ok(nuevo.status === 201 || nuevo.status === 200, `creado (HTTP ${nuevo.status})`);
  const pid = nuevo.data?.id;
  if (pid) creados.productos.push(pid);

  if (pid) {
    const dup = await api('/productos', {
      token, method: 'POST',
      body: JSON.stringify({ codigo, descripcion: 'otro', precioUnitario: 10, stock: 0, tipoAfectacionIGV: '10', sedeId: SEDE }),
    });
    ok(dup.status >= 400, `el código duplicado se rechaza (HTTP ${dup.status})`);

    const edit = await api(`/productos/${pid}`, {
      token, method: 'PUT',
      body: JSON.stringify({ descripcion: `${marca} Producto editado`, precioUnitario: 175 }),
    });
    ok(edit.status === 200, `editado (HTTP ${edit.status})`);
    const tras = await prisma.producto.findUnique({ where: { id: pid }, select: { descripcion: true, precioUnitario: true } });
    ok(Number(tras?.precioUnitario) === 175, `el precio quedó en ${tras?.precioUnitario}`);
  }

  // ── 5. Clientes y proveedores ───────────────────────────────────────────
  console.log('\n5) Clientes y proveedores');
  const cli = await prisma.cliente.count();
  ok(cli > 0, `clientes en el padrón: ${cli}`);
  // El tipo de documento es una relación (tipoDocumentoId), no una columna de
  // texto: se comprueba contra el catálogo SUNAT.
  const malos = await prisma.$queryRawUnsafe(
    `SELECT c."nroDoc", td.codigo FROM "Cliente" c JOIN "TipoDocumento" td ON td.id = c."tipoDocumentoId"
     WHERE (td.codigo = '6' AND c."nroDoc" !~ '^[0-9]{11}$')
        OR (td.codigo = '1' AND c."nroDoc" !~ '^[0-9]{8}$') LIMIT 5`,
  );
  ok(malos.length === 0, `documentos con formato inválido: ${malos.length}${malos.length ? ' → ' + malos.map((m) => m.nroDoc).join(', ') : ''}`);

  const ruc = `20${Date.now().toString().slice(-9)}`;
  const nc = await api('/clientes', {
    token, method: 'POST',
    body: JSON.stringify({
      nombre: `${marca} CLIENTE DE PRUEBA S.A.C.`, tipoDoc: 'RUC', nroDoc: ruc,
      direccion: 'Av. de prueba 123', persona: 'CLIENTE',
      ubigeo: '150115', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LA VICTORIA',
    }),
  });
  ok(nc.status === 201 || nc.status === 200, `cliente creado (HTTP ${nc.status})`);
  if (nc.data?.id) creados.clientes.push(nc.data.id);

  const rucMalo = await api('/clientes', {
    token, method: 'POST',
    body: JSON.stringify({
      nombre: 'MAL RUC', tipoDoc: 'RUC', nroDoc: '123', persona: 'CLIENTE',
      ubigeo: '150115', departamento: 'LIMA', provincia: 'LIMA', distrito: 'LA VICTORIA',
    }),
  });
  ok(rucMalo.status >= 400, `un RUC de 3 dígitos se rechaza (HTTP ${rucMalo.status})`);

  // ── limpieza ────────────────────────────────────────────────────────────
  console.log('\n6) Limpieza');
  for (const id of creados.productos) {
    await prisma.productoStock.deleteMany({ where: { productoId: id } });
    await prisma.producto.delete({ where: { id } }).catch(() => {});
  }
  for (const id of creados.clientes) await prisma.cliente.delete({ where: { id } }).catch(() => {});
  const quedan = await prisma.producto.count({ where: { descripcion: { contains: '[QA-' } } });
  ok(quedan === 0, `sin restos del QA (${quedan})`);
  ok((await prisma.producto.count()) === total, `el catálogo vuelve a ${total} productos`);

  console.log(`\n${fallos === 0 ? '✔ FASE 1 COMPLETA: todo correcto' : `✘ ${fallos} comprobación(es) fallaron`}`);
  process.exitCode = fallos ? 1 : 0;
}
main().catch((e) => { console.error('✖', String(e?.message ?? e).slice(0, 300)); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
