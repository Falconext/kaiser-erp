/**
 * QA · "Llévese todo" — la exportación completa de datos.
 *
 * Existe por la objeción que frena la venta en Kaiser: la gerencia y contabilidad
 * prefieren un ERP de escritorio porque *"si dejamos de contratar el servicio o
 * migramos a otro ERP, como todo está en la nube no podríamos acceder a nuestra
 * información"*.
 *
 * Es una objeción legítima y hasta ahora tenían razón: había doce exportaciones
 * sueltas y ninguna que sacara todo. Esta prueba vigila que la respuesta siga
 * siendo cierta, porque es de las que se rompen en silencio: basta con añadir una
 * tabla y olvidarse de incluirla para que el cliente crea que se lo lleva todo y
 * no sea verdad.
 *
 * Tres cosas se comprueban, y la tercera es la que importa:
 *   1. Que el archivo salga y lo puedan pedir solo desde gerencia.
 *   2. Que ninguna pestaña venga con error y que NO lleve contraseñas.
 *   3. Que lo exportado CUADRE con lo que hay en la base. No que "haya filas":
 *      que sean exactamente las que existen.
 *
 * Uso:  node src/scripts/qa-exportacion.mjs
 */
import { PrismaClient } from '@prisma/client';
import xlsxPkg from 'xlsx';
const XLSX = xlsxPkg.default ?? xlsxPkg;

const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
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
async function login(email, password = 'kaiser123') {
  const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  if (r.status >= 400 || !r.data) throw new Error(`login de ${email} falló (HTTP ${r.status}). ¿Backend arriba?`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const s = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  return s.data.accessToken;
}

async function main() {
  console.log('\n═══ QA · Exportación completa de datos ═══\n');
  const empresa = await prisma.empresa.findFirst({ select: { id: true } });
  const eid = empresa.id;

  console.log('1. Quién puede pedirla');
  const gerencia = await login('gerencia@kaisercorp.com.pe');
  const r = await fetch(`${API}/empresa/exportar-todo`, { headers: { Authorization: `Bearer ${gerencia}` } });
  ok(r.status === 200, `gerencia la descarga (HTTP ${r.status})`);

  // Un operativo NO: es la foto completa del negocio en un archivo.
  const otro = await prisma.usuario.findFirst({
    where: { empresaId: eid, rol: 'USUARIO_EMPRESA' }, select: { email: true } });
  if (otro) {
    const t = await login(otro.email).catch(() => null);
    if (t) {
      const r2 = await fetch(`${API}/empresa/exportar-todo`, { headers: { Authorization: `Bearer ${t}` } });
      ok(r2.status === 403, `un usuario operativo NO puede (HTTP ${r2.status})`);
    }
  }
  const sinToken = await fetch(`${API}/empresa/exportar-todo`);
  ok(sinToken.status === 401, `sin sesión tampoco (HTTP ${sinToken.status})`);

  console.log('\n2. El archivo');
  const buf = Buffer.from(await r.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const hoja = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n]);
  ok(buf.length > 10000, `pesa ${(buf.length / 1024).toFixed(0)} KB`);
  ok(wb.SheetNames[0] === 'RESUMEN', 'abre por la portada, que explica qué es esto');
  const conError = wb.SheetNames.filter((n) => {
    const f = hoja(n);
    return f.length === 1 && f[0].error;
  });
  ok(conError.length === 0, `ninguna pestaña con error${conError.length ? ': ' + conError.join(', ') : ''}`);
  const crudo = JSON.stringify(wb.SheetNames.map(hoja));
  ok(!/\$2[aby]\$/.test(crudo), 'no lleva ningún hash de contraseña');
  ok(!/"password"/i.test(crudo), 'ni ninguna columna de contraseña');

  console.log('\n3. Que CUADRE con la base (no que "haya filas")');
  const esperado = [
    ['CLIENTES',        await prisma.cliente.count({ where: { empresaId: eid } })],
    ['PRODUCTOS',       await prisma.producto.count({ where: { empresaId: eid } })],
    ['INVENTARIO',      await prisma.productoStock.count({ where: { producto: { empresaId: eid } } })],
    ['KARDEX',          await prisma.movimientoKardex.count({ where: { empresaId: eid } })],
    ['VENTAS',          await prisma.comprobante.count({ where: { empresaId: eid } })],
    ['VENTAS_DETALLE',  await prisma.detalleComprobante.count({ where: { comprobante: { empresaId: eid } } })],
    ['COMPRAS',         await prisma.compra.count({ where: { empresaId: eid } })],
    ['COMPRAS_DETALLE', await prisma.detalleCompra.count({ where: { compra: { empresaId: eid } } })],
    ['PAGOS_RECIBIDOS', await prisma.pago.count({ where: { comprobante: { empresaId: eid } } })],
    ['PRODUCCION',      await prisma.ordenProduccion.count({ where: { empresaId: eid } })],
    ['RECETAS',         await prisma.recetaComponente.count({ where: { receta: { empresaId: eid } } })],
    ['SEDES',           await prisma.sede.count({ where: { empresaId: eid } })],
    ['USUARIOS',        await prisma.usuario.count({ where: { empresaId: eid } })],
  ];
  for (const [nombre, n] of esperado) {
    ok(hoja(nombre).length === n, `${nombre}: ${hoja(nombre).length} exportadas = ${n} en la base`);
  }

  console.log('\n4. Que los importes viajen, no solo los nombres');
  const ventas = hoja('VENTAS');
  const totalExcel = ventas.reduce((a, v) => a + Number(v.total || 0), 0);
  const agg = await prisma.comprobante.aggregate({
    where: { empresaId: eid }, _sum: { mtoImpVenta: true } });
  const totalBase = Number(agg._sum.mtoImpVenta ?? 0);
  ok(Math.abs(totalExcel - totalBase) < 0.05,
    `la suma de las ventas exportadas (${totalExcel.toFixed(2)}) = la de la base (${totalBase.toFixed(2)})`);

  const inv = hoja('INVENTARIO');
  const valorizado = inv.reduce((a, x) => a + Number(x.valorizado || 0), 0);
  ok(valorizado > 0, `el inventario sale valorizado (S/ ${valorizado.toFixed(2)}), no solo en cantidades`);

  const kdx = hoja('KARDEX');
  ok(kdx.every((m) => m.fecha && m.tipo), 'cada movimiento del kardex lleva fecha y tipo');
  ok(kdx.some((m) => m.registrado_por), 'y consta quién lo registró: el rastro se lo lleva también');

  console.log(fallos === 0
    ? '\n✔ QA COMPLETO: el cliente se lleva TODO lo suyo, y cuadra\n'
    : `\n✘ ${fallos} comprobación(es) fallaron\n`);
  await prisma.$disconnect();
  process.exit(fallos ? 1 : 0);
}

main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect(); process.exit(1); });
