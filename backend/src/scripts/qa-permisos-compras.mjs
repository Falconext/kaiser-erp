/**
 * QA funcional · permisos de compras (lectura vs escritura)
 *
 * Contabilidad lleva el Registro de Compras: necesita abrir la factura del
 * proveedor para cuadrar el crédito fiscal, pero no debe poder modificarla.
 * Almacén la registra. Ventas y producción no ven compras en absoluto: el precio
 * al que Kaiser compra es información comercial.
 *
 * IMPORTANTE — por qué los ids son inexistentes: la primera versión de esta
 * prueba usó ids reales, y con el token de gerencia las escrituras SE
 * EJECUTARON: anuló una compra de la demo, anuló una orden y nacionalizó una
 * importación (tres movimientos de kardex incluidos). Un probe de permisos tiene
 * que ser incapaz de mutar. Con un id que no existe, quien tiene permiso recibe
 * 404 y quien no, 403 — que es justo lo que se quiere distinguir.
 *
 * Al final compara una huella de las tablas implicadas para demostrarlo.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const NO_EXISTE = 99999999;
let fallos = 0;

const ROLES = ['gerencia', 'almacen', 'contabilidad', 'ventas', 'produccion'];
/** Quién debe poder leer compras y quién escribir. */
const LEE = new Set(['gerencia', 'almacen', 'contabilidad']);
const ESCRIBE = new Set(['gerencia', 'almacen']);

async function token(rol) {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${rol}@kaisercorp.com.pe`, password: 'kaiser123' }) });
  const j = await r.json();
  if (r.status >= 400 || !j.data) throw new Error(`login de ${rol} falló (HTTP ${r.status}): ${j?.message ?? ''}`);
  if (!j.data.requiresSedeSelection) return j.data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
    body: JSON.stringify({ sedeId: 1 }) });
  const cuerpo = await r2.json();
  if (r2.status >= 400 || !cuerpo?.data?.accessToken) {
    throw new Error(`select-sede falló (HTTP ${r2.status}): ${cuerpo?.message ?? 'sin mensaje'}`);
  }
  return cuerpo.data.accessToken;
}
async function probe(metodo, ruta, tk) {
  const r = await fetch(`${API}/${ruta}`, { method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
    body: metodo === 'GET' ? undefined : '{}' });
  return r.status;
}
async function huella() {
  const uno = async (s) => (await prisma.$queryRawUnsafe(s))[0];
  return JSON.stringify({
    compras: await uno(`SELECT COUNT(*)::int n, COUNT(*) FILTER (WHERE estado='ANULADO')::int anul FROM "Compra"`),
    ordenes: await uno(`SELECT COUNT(*)::int n, COUNT(*) FILTER (WHERE estado='ANULADA')::int anul FROM "OrdenCompra"`),
    import: await uno(`SELECT COUNT(*)::int n, COUNT(*) FILTER (WHERE estado='NACIONALIZADA')::int nac FROM "Importacion"`),
    kardex: await uno(`SELECT COUNT(*)::int n FROM "MovimientoKardex"`),
    stock: await uno(`SELECT COALESCE(SUM(stock),0)::text s FROM "ProductoStock"`),
    solicitudes: await uno(`SELECT COUNT(*)::int n FROM "SolicitudCompra"`),
    clientes: await uno(`SELECT COUNT(*)::int n FROM "Cliente"`),
  });
}

// Todas con id inexistente donde la ruta lleva id.
const LECTURAS = [
  ['GET', 'compras?limit=1', 'listado de compras'],
  ['GET', `compras/${NO_EXISTE}`, 'detalle de una compra'],
  ['GET', `compras/${NO_EXISTE}/documentos`, 'expediente documental'],
  ['GET', `compras/${NO_EXISTE}/pagos`, 'historial de pagos'],
  ['GET', 'compras/ordenes', 'órdenes de compra'],
  ['GET', 'compras/solicitudes', 'solicitudes de compra'],
  ['GET', `compras/solicitudes/${NO_EXISTE}/comparativo`, 'comparativo de proveedores'],
  ['GET', 'importaciones', 'importaciones'],
];
const ESCRITURAS = [
  ['POST', 'compras', 'crear compra'],
  ['PUT', `compras/${NO_EXISTE}`, 'editar compra'],
  ['DELETE', `compras/${NO_EXISTE}`, 'anular compra'],
  ['POST', `compras/${NO_EXISTE}/pagos`, 'registrar pago'],
  ['POST', `compras/${NO_EXISTE}/documentos`, 'adjuntar documento'],
  ['POST', 'compras/ordenes', 'crear orden'],
  ['POST', `compras/ordenes/${NO_EXISTE}/recibir`, 'recibir orden'],
  ['PATCH', `compras/ordenes/${NO_EXISTE}/anular`, 'anular orden'],
  ['POST', 'compras/solicitudes', 'crear solicitud'],
  ['POST', `compras/solicitudes/${NO_EXISTE}/cotizaciones`, 'agregar cotización'],
  ['POST', `compras/solicitudes/${NO_EXISTE}/seleccionar`, 'elegir cotización'],
  ['POST', 'importaciones', 'crear importación'],
  ['POST', `importaciones/${NO_EXISTE}/nacionalizar`, 'nacionalizar importación'],
];

async function main() {
  const antes = await huella();
  const tk = {};
  for (const r of ROLES) tk[r] = await token(r);

  const cab = (t) => {
    console.log(`\n${t}`);
    console.log('  ' + 'acción'.padEnd(30) + ROLES.map((r) => r.padEnd(14)).join(''));
  };
  const linea = async (grupo, permitido) => {
    for (const [metodo, ruta, nombre] of grupo) {
      const cods = [];
      for (const r of ROLES) cods.push(await probe(metodo, ruta, tk[r]));
      const esperado = ROLES.map((r) => (permitido.has(r) ? 'pasa' : '403'));
      const real = cods.map((c) => (c === 403 ? '403' : 'pasa'));
      const bien = esperado.every((e, i) => e === real[i]);
      if (!bien) fallos++;
      console.log(`  ${bien ? '✔' : '✘'} ` + nombre.padEnd(28) + cods.map((c, i) => `${c}${real[i] === esperado[i] ? '' : '!'}`.padEnd(14)).join(''));
    }
  };
  cab('LECTURAS — contabilidad entra (lleva el Registro de Compras)');
  await linea(LECTURAS, LEE);
  cab('ESCRITURAS — solo almacén y gerencia');
  await linea(ESCRITURAS, ESCRIBE);

  // Los proveedores se escriben por el padrón de clientes: ventas por `clientes`,
  // almacén por `compras:escribir`. Contabilidad, que solo lee compras, no.
  cab('PROVEEDORES — se escriben por el padrón de clientes');
  await linea([['POST', 'clientes', 'crear proveedor/cliente']], new Set(['gerencia', 'almacen', 'ventas']));

  const despues = await huella();
  console.log(`\nHuella de las tablas implicadas: ${antes === despues ? '✔ intacta, la prueba no muta nada' : '✘ CAMBIÓ'}`);
  if (antes !== despues) { fallos++; console.log(`  antes:   ${antes}\n  después: ${despues}`); }
  console.log(fallos === 0 ? '\n✔ PERMISOS DE COMPRAS: todo correcto' : `\n✘ ${fallos} filas incorrectas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('✘', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
