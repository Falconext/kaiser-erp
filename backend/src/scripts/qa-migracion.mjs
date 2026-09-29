/**
 * QA funcional · Fase 11 — Migración del histórico
 *
 * El código de `src/migracion/` es el que corre el fin de semana del corte, con
 * los datos reales de Kaiser y su sistema anterior ya apagado. Hasta hoy nunca
 * se había ejecutado: ni un test, ni un script. Este es ese ensayo.
 *
 * Se prueba con datos SINTÉTICOS a propósito. Los códigos llevan el prefijo
 * QAMIG- y los RUC empiezan por 20999, de modo que no puedan emparejar con nada
 * del catálogo real: la migración ACTUALIZA lo que encuentra por código, así que
 * un código real aquí sobreescribiría el stock y el costo de un producto de
 * Kaiser. Ya pasó una vez en esta campaña (una prueba de permisos con IDs reales
 * borró movimientos de verdad) y la regla que salió de ahí es esta: una prueba
 * identifica lo suyo por PERTENENCIA, nunca por cercanía en el tiempo.
 *
 * Lo que se verifica, en orden:
 *   1. Las plantillas salen con las 6 hojas + INSTRUCCIONES.
 *   2. CONTROL NEGATIVO: un libro con 7 errores plantados a mano tiene que ser
 *      rechazado, y con el detalle exacto. Si el validador los deja pasar, no
 *      sirve de nada que el libro bueno pase.
 *   3. El libro bueno valida sin un solo error.
 *   4. La carga cuadra las cuatro cifras que `MIGRACION.md` promete cuadrar
 *      contra P&P, más las dos invariantes del kardex.
 *   5. IDEMPOTENCIA: recargar el MISMO archivo no duplica nada. Es la promesa
 *      que sostiene todo lo demás — es lo que permite ensayar, corregir y
 *      recargar el fin de semana del corte sin rehacer la base.
 *   6. Recargar con cantidades CAMBIADAS corrige en vez de acumular.
 *   7. La reversión borra lo migrado y NO toca lo que emitió el ERP.
 *   8. Y al final la base queda como estaba: huella global idéntica.
 *
 * Uso:  node src/scripts/qa-migracion.mjs
 */
import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'child_process';
import { mkdtempSync, existsSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
// `xlsx` es CommonJS: en un .mjs el módulo real llega bajo `.default`.
import xlsxPkg from 'xlsx';
const XLSX = xlsxPkg.default ?? xlsxPkg;

const prisma = new PrismaClient();
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
/** Un fallo sin la salida del proceso no se puede diagnosticar. */
const okCorrida = (r, m) => {
  ok(!r.fallo, m);
  if (r.fallo) console.log(r.salida.split('\n').filter(Boolean).slice(-12).map((l) => '        ' + l).join('\n'));
};
const r2 = (n) => Math.round(Number(n) * 100) / 100;
const casi = (a, b, t = 0.02) => Math.abs(Number(a) - Number(b)) <= t;

// ─── Datos sintéticos ────────────────────────────────────────────────────────
// Un producto en DOS almacenes: es el caso que destapó el bug del stock global.
const P1 = 'QAMIG-P001';   // en las dos sedes
const P2 = 'QAMIG-P002';   // en una sola
const RUC_CLI = '20999000001';
const RUC_PRV = '20999000002';
const SERIE_V = 'F900';    // serie propia: no puede chocar con la numeración real
const SERIE_C = 'FQA1';
const SERIE_NC = 'FCQA';   // serie propia de la nota de crédito
const CORTE = '2026-09-30';

/** Cantidades y costos del saldo inicial. El global tiene que ser la SUMA. */
const INV = [
  { codigo: P1, almacen: null, cantidad: 100, costo: 40 },   // sede 1 (se rellena)
  { codigo: P1, almacen: null, cantidad: 50,  costo: 46 },   // sede 2
  { codigo: P2, almacen: null, cantidad: 30,  costo: 12.5 },
];
const STOCK_P1 = 150;                       // 100 + 50
const COSTO_P1 = r2((100 * 40 + 50 * 46) / 150);  // ponderado = 42.00

let SEDE_SEC = '';   // nombre de la sede que NO es la principal

function libro(sedes, { conErrores = false, factor = 1 } = {}) {
  const hojas = {};
  hojas.CLIENTES = [
    { tipo_doc: 'RUC', num_doc: RUC_CLI, nombre: 'QA MIGRACION CLIENTE SAC', rol: 'CLIENTE',
      direccion: 'Av. Industrial 100', ubigeo: '150115', departamento: 'LIMA',
      provincia: 'LIMA', distrito: 'LA VICTORIA', sector: 'CONSTRUCCION' },
    { tipo_doc: 'RUC', num_doc: RUC_PRV, nombre: 'QA MIGRACION PROVEEDOR SAC', rol: 'PROVEEDOR',
      direccion: 'Av. Argentina 200', ubigeo: '150101' },
  ];
  hojas.PRODUCTOS = [
    // `costo` VACÍO a propósito: es opcional, y es el escenario en que el bug
    // del costo cero aparecía. El costo real tiene que salir de INVENTARIO.
    { codigo: P1, descripcion: 'QA MIG Alambre galvanizado #12', unidad: 'KGM',
      categoria: 'QA MIGRACION', precio_venta: 60, costo: '' },
    { codigo: P2, descripcion: 'QA MIG Malla plastica 1m', unidad: 'NIU',
      categoria: 'QA MIGRACION', precio_venta: 20, costo: '' },
  ];
  hojas.INVENTARIO = INV.map((r, i) => ({
    codigo_producto: r.codigo,
    almacen: r.almacen ?? sedes[i === 1 ? 1 : 0].nombre,
    cantidad: r.cantidad * factor,
    costo_unitario: r.costo,
    fecha_corte: CORTE,
    lote: '',
  }));
  // Una venta en soles y otra en dólares (con tipo de cambio), una al crédito.
  hojas.VENTAS = [
    // A PROPÓSITO en la sede que NO es la principal: es el caso que importa. En
    // Kaiser el 95 % se factura desde Chacra Cerro y la marcada como principal es
    // La Victoria, así que un respaldo silencioso mandaría casi todo el histórico
    // a la sede equivocada.
    { tipo_doc: 'FACTURA', serie: SERIE_V, numero: '1', fecha_emision: '2026-08-14',
      cliente_doc: RUC_CLI, moneda: 'PEN', tipo_cambio: '', gravado: 1000, igv: 180,
      total: 1180, saldo_pendiente: 0, almacen: SEDE_SEC, vendedor_email: '', observaciones: '' },
    { tipo_doc: 'FACTURA', serie: SERIE_V, numero: '2', fecha_emision: '2026-08-20',
      cliente_doc: RUC_CLI, moneda: 'USD', tipo_cambio: 3.75, gravado: 2000, igv: 360,
      total: 2360, saldo_pendiente: 2360, vendedor_email: '', observaciones: 'Credito 30 dias' },
    // Nota de crédito por devolución total de la factura 1. El ERP resta las '07'
    // de las ventas del periodo; si no entrara, el histórico saldría inflado.
    { tipo_doc: 'NOTA_CREDITO', serie: SERIE_NC, numero: '1', fecha_emision: '2026-08-25',
      cliente_doc: RUC_CLI, moneda: 'PEN', tipo_cambio: '', gravado: 400, igv: 72,
      // El saldo va con valor A PROPÓSITO: si P&P lo exporta así (o alguien lo
      // rellena por inercia), el cargador tiene que forzarlo a 0. Con 0 aquí la
      // comprobación de abajo pasaría sola y no probaría nada.
      total: 472, saldo_pendiente: 472, vendedor_email: '', observaciones: '',
      motivo: '06', doc_afectado_tipo: 'FACTURA',
      doc_afectado_serie: SERIE_V, doc_afectado_numero: '1' },
  ];
  hojas.VENTAS_DETALLE = [
    { tipo_doc: 'FACTURA', serie: SERIE_V, numero: '1', codigo_producto: P1, cantidad: 10, precio_unitario: 100 },
    { tipo_doc: 'FACTURA', serie: SERIE_V, numero: '2', codigo_producto: P2, cantidad: 20, precio_unitario: 100 },
  ];
  hojas.COMPRAS = [
    { proveedor_doc: RUC_PRV, serie: SERIE_C, numero: '500', fecha_emision: '2026-08-01',
      fecha_vencimiento: '2026-08-31', moneda: 'PEN', tipo_cambio: '', subtotal: 5000,
      igv: 900, total: 5900, saldo_pendiente: 5900, almacen: SEDE_SEC },
  ];
  hojas.COMPRAS_DETALLE = [
    { proveedor_doc: RUC_PRV, serie: SERIE_C, numero: '500',
      codigo_producto: P1, cantidad: 100, precio_unitario: 40 },
    { proveedor_doc: RUC_PRV, serie: SERIE_C, numero: '500',
      codigo_producto: P2, cantidad: 80, precio_unitario: 12.5 },
  ];

  if (conErrores) {
    // Siete errores, uno por cada clase de validación que el archivo debe atajar.
    hojas.CLIENTES.push(
      { tipo_doc: 'RUC', num_doc: '123', nombre: 'RUC CORTO', rol: 'CLIENTE' },            // 1 RUC != 11
      { tipo_doc: 'RUC', num_doc: RUC_CLI, nombre: 'REPETIDO', rol: 'CLIENTE' },           // 2 clave repetida
      { tipo_doc: 'DNI', num_doc: '12345678', nombre: 'UBIGEO MALO', rol: 'CLIENTE', ubigeo: '99' }, // 3 ubigeo
    );
    hojas.VENTAS.push(
      { tipo_doc: 'FACTURA', serie: SERIE_V, numero: '3', fecha_emision: '2026-08-21',
        cliente_doc: RUC_CLI, moneda: 'USD', tipo_cambio: '', gravado: 100, igv: 18,
        total: 118, saldo_pendiente: 0 },                                                  // 4 USD sin TC
      { tipo_doc: 'FACTURA', serie: SERIE_V, numero: '4', fecha_emision: '2026-08-22',
        cliente_doc: RUC_CLI, moneda: 'PEN', gravado: 1000, igv: 180, total: 9999,
        saldo_pendiente: 0 },                                                              // 5 no cuadra
      { tipo_doc: 'FACTURA', serie: SERIE_V, numero: '5', fecha_emision: '2026-08-23',
        cliente_doc: '20999999999', moneda: 'PEN', gravado: 100, igv: 18, total: 118 },     // 6 cliente inexistente
      { tipo_doc: 'FACTURA', serie: SERIE_V, numero: '6', fecha_emision: '2026-08-24',
        cliente_doc: RUC_CLI, moneda: 'PEN', gravado: 100, igv: 18, total: 118,
        saldo_pendiente: 500 },                                                            // 7 saldo > total
      // 8 nota de crédito sin motivo ni documento afectado
      { tipo_doc: 'NOTA_CREDITO', serie: SERIE_NC, numero: '9', fecha_emision: '2026-08-26',
        cliente_doc: RUC_CLI, moneda: 'PEN', gravado: 100, igv: 18, total: 118,
        saldo_pendiente: 0 },
      // 9 nota que corrige un documento que no está en la hoja
      { tipo_doc: 'NOTA_CREDITO', serie: SERIE_NC, numero: '10', fecha_emision: '2026-08-27',
        cliente_doc: RUC_CLI, moneda: 'PEN', gravado: 100, igv: 18, total: 118,
        saldo_pendiente: 0, motivo: '06', doc_afectado_tipo: 'FACTURA',
        doc_afectado_serie: 'F999', doc_afectado_numero: '777' },
      // 10 factura con campos que solo van en una nota
      { tipo_doc: 'FACTURA', serie: SERIE_V, numero: '7', fecha_emision: '2026-08-28',
        cliente_doc: RUC_CLI, moneda: 'PEN', gravado: 100, igv: 18, total: 118,
        saldo_pendiente: 0, motivo: '06' },
    );
    // 11 línea de compra que no cuelga de ninguna cabecera
    hojas.COMPRAS_DETALLE.push(
      { proveedor_doc: RUC_PRV, serie: 'FZZZ', numero: '999',
        codigo_producto: P1, cantidad: 1, precio_unitario: 1 },
    );
  }

  const wb = XLSX.utils.book_new();
  for (const [n, filas] of Object.entries(hojas)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), n);
  }
  return wb;
}

const corre = (args) => {
  try {
    return { salida: execFileSync('npx', ['ts-node', '-r', 'tsconfig-paths/register',
      'src/migracion/migrar.ts', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), fallo: false };
  } catch (e) {
    return { salida: (e.stdout || '') + (e.stderr || ''), fallo: true };
  }
};

const huellaGlobal = async () => {
  const t = await prisma.$queryRawUnsafe(
    `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  const out = {};
  for (const { tablename } of t) {
    const r = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int n FROM "${tablename}"`);
    out[tablename] = r[0].n;
  }
  return out;
};

async function limpiar(empresaId) {
  // Por PERTENENCIA: solo lo que este script creó, identificado por su código.
  const prods = await prisma.producto.findMany({
    where: { empresaId, codigo: { in: [P1, P2] } }, select: { id: true } });
  const ids = prods.map((p) => p.id);
  if (ids.length) {
    await prisma.detalleComprobante.deleteMany({ where: { productoId: { in: ids } } });
    await prisma.detalleCompra.deleteMany({ where: { productoId: { in: ids } } });
    await prisma.movimientoKardex.deleteMany({ where: { productoId: { in: ids } } });
    await prisma.productoStock.deleteMany({ where: { productoId: { in: ids } } });
    await prisma.producto.deleteMany({ where: { id: { in: ids } } });
  }
  const cls = await prisma.cliente.findMany({
    where: { empresaId, nroDoc: { in: [RUC_CLI, RUC_PRV] } }, select: { id: true } });
  if (cls.length) {
    const cids = cls.map((c) => c.id);
    const cps = await prisma.comprobante.findMany({ where: { clienteId: { in: cids } }, select: { id: true } });
    if (cps.length) {
      const pids = cps.map((c) => c.id);
      await prisma.comisionVendedor.deleteMany({ where: { comprobanteId: { in: pids } } });
      await prisma.pago.deleteMany({ where: { comprobanteId: { in: pids } } });
      await prisma.leyenda.deleteMany({ where: { comprobanteId: { in: pids } } });
      await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: { in: pids } } });
      await prisma.comprobante.deleteMany({ where: { id: { in: pids } } });
    }
    const cms = await prisma.compra.findMany({ where: { proveedorId: { in: cids } }, select: { id: true } });
    if (cms.length) {
      const mids = cms.map((c) => c.id);
      await prisma.detalleCompra.deleteMany({ where: { compraId: { in: mids } } });
      await prisma.compra.deleteMany({ where: { id: { in: mids } } });
    }
    await prisma.cliente.deleteMany({ where: { id: { in: cids } } });
  }
  await prisma.categoria.deleteMany({ where: { empresaId, nombre: 'QA MIGRACION', productos: { none: {} } } });
}

async function main() {
  console.log('\n═══ QA funcional · Fase 11 — Migración del histórico ═══\n');
  const empresa = await prisma.empresa.findFirst();
  const sedes = await prisma.sede.findMany({ where: { empresaId: empresa.id }, orderBy: { id: 'asc' } });
  if (sedes.length < 2) { console.log('✘ hacen falta 2 sedes para probar el saldo por almacén'); process.exit(1); }
  const principal = sedes.find((x) => x.esPrincipal) ?? sedes[0];
  SEDE_SEC = (sedes.find((x) => x.id !== principal.id) ?? sedes[1]).nombre;
  console.log(`   empresa ${empresa.id} · sedes: ${sedes.map((s) => s.nombre).join(' | ')}`);
  console.log(`   principal: ${principal.nombre} · se facturará en: ${SEDE_SEC}\n`);

  // Estado previo: si una corrida anterior dejó residuo, fuera antes de la huella.
  await limpiar(empresa.id);
  const yaMigrado = await prisma.comprobante.count({ where: { origenDato: '[migracion]' } });
  if (yaMigrado) { console.log(`✘ ya hay ${yaMigrado} comprobante(s) marcados [migracion]: aborto para no mezclar`); process.exit(1); }

  const huellaAntes = await huellaGlobal();
  const dir = mkdtempSync(join(tmpdir(), 'qa-mig-'));

  // ── 1. plantillas ──────────────────────────────────────────────────────────
  console.log('1. Plantillas que recibe Kaiser');
  execFileSync('npx', ['ts-node', '-r', 'tsconfig-paths/register',
    'src/migracion/generar-plantillas.ts', dir], { stdio: 'ignore' });
  const rutaPlant = join(dir, 'PLANTILLAS-MIGRACION-KAISER.xlsx');
  ok(existsSync(rutaPlant), 'se genera PLANTILLAS-MIGRACION-KAISER.xlsx');
  const wbP = XLSX.readFile(rutaPlant);
  for (const h of ['INSTRUCCIONES', 'CLIENTES', 'PRODUCTOS', 'INVENTARIO', 'VENTAS', 'VENTAS_DETALLE', 'COMPRAS', 'COMPRAS_DETALLE'])
    ok(wbP.SheetNames.includes(h), `trae la pestaña ${h}`);

  // ── 2. control negativo ────────────────────────────────────────────────────
  console.log('\n2. Control negativo: un archivo con 11 errores DEBE ser rechazado');
  const rutaMal = join(dir, 'con-errores.xlsx');
  XLSX.writeFile(libro(sedes, { conErrores: true }), rutaMal);
  const mal = corre(['--dry-run', rutaMal]);
  ok(mal.fallo || /error/i.test(mal.salida), 'la validación NO deja pasar el archivo');
  const esperados = [
    [/RUC debe tener 11/i, 'RUC de 3 dígitos'],
    [/repetido/i, 'documento repetido en el archivo'],
    [/ubigeo/i, 'ubigeo que no tiene 6 dígitos'],
    [/tipo_cambio/i, 'venta en USD sin tipo de cambio'],
    [/no cuadra/i, 'gravado + IGV que no da el total'],
    [/no existe en la hoja CLIENTES/i, 'venta a un cliente que no está'],
    [/mayor que el total/i, 'saldo pendiente mayor que el total'],
    [/obligatorio en una NOTA_CREDITO/i, 'nota de crédito sin motivo ni documento afectado'],
    [/corrige un documento que no está/i, 'nota que corrige algo que no está en el archivo'],
    [/solo se llena en una NOTA_CREDITO/i, 'factura con campos que son de una nota'],
    [/no hay una compra con esos datos/i, 'línea de compra sin su cabecera'],
  ];
  for (const [re, qué] of esperados) ok(re.test(mal.salida), `detecta: ${qué}`);
  ok(!/creados|actualizados/i.test(mal.salida), 'y no escribe nada en la base');
  const trasDryRun = await prisma.producto.count({ where: { codigo: { in: [P1, P2] } } });
  ok(trasDryRun === 0, 'ningún producto entró durante la validación');

  // ── 3. archivo limpio ──────────────────────────────────────────────────────
  console.log('\n3. El archivo bueno valida sin errores');
  const ruta = join(dir, 'kaiser.xlsx');
  XLSX.writeFile(libro(sedes), ruta);
  const bien = corre(['--dry-run', ruta]);
  okCorrida(bien, 'la validación pasa');
  ok(!/·.*(obligatorio|no cuadra|no existe|repetido)/i.test(bien.salida), 'sin un solo error de fila');

  // ── 4. carga y cuadre ──────────────────────────────────────────────────────
  console.log('\n4. Carga: las cuatro cifras que se cuadran contra P&P');
  const carga = corre([ruta]);
  okCorrida(carga, 'la carga termina sin excepción');

  const p1 = await prisma.producto.findFirst({ where: { empresaId: empresa.id, codigo: P1 } });
  const p2 = await prisma.producto.findFirst({ where: { empresaId: empresa.id, codigo: P2 } });
  ok(!!p1 && !!p2, 'los dos productos entraron al catálogo');

  const s1 = await prisma.productoStock.findFirst({ where: { productoId: p1.id, sedeId: sedes[0].id } });
  const s2 = await prisma.productoStock.findFirst({ where: { productoId: p1.id, sedeId: sedes[1].id } });
  ok(casi(s1?.stock, 100), `saldo en ${sedes[0].nombre} = 100`);
  ok(casi(s2?.stock, 50), `saldo en ${sedes[1].nombre} = 50`);
  // EL BUG: antes el stock global se quedaba en 50 (la última fila pisaba).
  ok(casi(p1.stock, STOCK_P1), `stock global = ${STOCK_P1} (la SUMA de los dos almacenes, no la última fila)`);
  // EL OTRO BUG: costo cero cuando la columna opcional venía vacía.
  ok(casi(p1.costoPromedio, COSTO_P1), `costoPromedio = ${COSTO_P1} (ponderado 100×40 + 50×46, desde INVENTARIO)`);
  ok(Number(p1.costoPromedio) > 0, 'el inventario NO entró con costo cero');

  const aperturas = await prisma.movimientoKardex.findMany({ where: { productoId: p1.id } });
  ok(aperturas.length === 2, 'un movimiento de apertura por almacén (2)');
  ok(aperturas.every((m) => m.tipoMovimiento === 'INGRESO'), 'ambos son INGRESO');
  ok(aperturas.every((m) => Number(m.stockAnterior) === 0), 'arrancan de saldo 0: es una apertura');
  ok(aperturas.every((m) => Number(m.valorTotal) > 0), 'los dos entran valorizados');
  const valorInv = aperturas.reduce((a, m) => a + Number(m.valorTotal), 0);
  ok(casi(valorInv, 100 * 40 + 50 * 46), `valor del inventario de ${P1} = ${100 * 40 + 50 * 46} (cuadre 1)`);

  // Invariante del kardex: último saldo por sede == ProductoStock de esa sede.
  for (const sd of [sedes[0], sedes[1]]) {
    const ult = await prisma.movimientoKardex.findFirst({
      where: { productoId: p1.id, sedeId: sd.id }, orderBy: [{ fecha: 'desc' }, { id: 'desc' }] });
    const ps = await prisma.productoStock.findFirst({ where: { productoId: p1.id, sedeId: sd.id } });
    ok(casi(ult?.stockActual, ps?.stock), `kardex y stock cuadran en ${sd.nombre}`);
  }

  const cps = await prisma.comprobante.findMany({
    where: { empresaId: empresa.id, serie: SERIE_V }, include: { detalles: true } });
  ok(cps.length === 2, 'los 2 comprobantes históricos entraron (cuadre 2)');
  ok(cps.every((c) => c.estadoEnvioSunat === 'NO_APLICA'), 'marcados NO_APLICA: no se reenvían a SUNAT');
  ok(cps.every((c) => c.origenDato === '[migracion]'), 'marcados [migracion] para poder revertir');
  ok(cps.every((c) => c.detalles.length === 1), 'cada uno con su línea de detalle');
  // ── la sede: el hueco que se cerró tras confirmarlo con Kaiser ──
  const sedePrincipal = sedes.find((x) => x.esPrincipal) ?? sedes[0];
  const sedeSec = sedes.find((x) => x.id !== sedePrincipal.id) ?? sedes[1];
  const f1 = cps.find((c) => c.correlativo === 1);
  const f2 = cps.find((c) => c.correlativo === 2);
  ok(f1?.sedeId === sedeSec.id, `la venta con almacén "${SEDE_SEC}" quedó en esa sede, no en la principal`);
  ok(f2?.sedeId === sedePrincipal.id, 'la venta sin almacén cae en la PRINCIPAL (no en la primera que salga)');

  const usd = cps.find((c) => c.tipoMoneda === 'USD' || Number(c.tipoCambio) > 1);
  ok(!!usd && casi(usd.tipoCambio, 3.75), 'la venta en dólares guarda su tipo de cambio');
  const porCobrar = cps.reduce((a, c) => a + Number(c.saldo), 0);
  ok(casi(porCobrar, 2360), 'cuentas por cobrar = 2360 (cuadre 3)');
  ok(cps.filter((c) => c.estadoPago === 'PENDIENTE_PAGO').length === 1, 'solo la del crédito queda pendiente');

  // ── la nota de crédito ──
  const nc = await prisma.comprobante.findFirst({
    where: { empresaId: empresa.id, serie: SERIE_NC },
    include: { motivo: true } });
  ok(!!nc, 'la nota de crédito entró');
  ok(nc?.tipoDoc === '07', "se guarda como tipoDoc '07'");
  ok(nc?.motivo?.codigo === '06', 'con su motivo 06 (devolución total) del catálogo 09');
  ok(nc?.motivo?.tipo === 'CREDITO', 'del catálogo de CRÉDITO, no del de débito (los códigos se repiten)');
  ok(nc?.tipDocAfectado === '01', "apunta al tipo del documento que corrige ('01' = factura)");
  ok(nc?.numDocAfectado === `${SERIE_V}-1`, `apunta a ${SERIE_V}-1`);
  ok(Number(nc?.saldo) === 0 && nc?.estadoPago === 'COMPLETADO',
    'entra SALDADA aunque el archivo traiga saldo 472: no puede figurar como deuda');
  ok(nc?.estadoEnvioSunat === 'NO_APLICA', 'y tampoco se reenvía a SUNAT');
  // La invariante que justifica todo esto: las ventas del periodo son las
  // facturas MENOS las notas. Si la nota no entrara, saldrían 1180+2360 y no
  // habría nada que las corrigiera.
  const netas = r2(1180 + 2360 - 472);
  const suma = cps.reduce((a, c) => a + Number(c.mtoImpVenta), 0) - Number(nc?.mtoImpVenta ?? 0);
  ok(casi(suma, netas), `ventas netas del periodo = ${netas} (1180 + 2360 − 472 de la nota)`);

  const compras = await prisma.compra.findMany({
    where: { empresaId: empresa.id, serie: SERIE_C, numero: '500' },
    include: { detalles: true } });
  ok(compras.length === 1, 'la compra histórica entró (cuadre 4)');
  ok(casi(compras[0]?.saldo, 5900), 'con su saldo por pagar de 5900');
  ok(casi(compras[0]?.total, 5900) && casi(compras[0]?.igv, 900), 'con su IGV separado del subtotal');
  ok((compras[0]?.observaciones ?? '').includes('[migracion]'), 'marcada [migracion] para poder revertir');
  ok(compras[0]?.sedeId === sedeSec.id, 'la compra también guarda su sede (antes no guardaba ninguna)');
  // ── las líneas de la compra: antes se perdía QUÉ se le compró a cada proveedor ──
  ok(compras[0]?.detalles.length === 2, 'con sus 2 líneas de detalle');
  const l1 = compras[0]?.detalles.find((d) => Number(d.cantidad) === 100);
  ok(!!l1 && casi(l1.precioUnitario, 40), 'la línea de 100 unidades a 40 está');
  ok(!!l1 && casi(l1.subtotal, 4000) && casi(l1.igv, 720) && casi(l1.total, 4720),
    'con subtotal, IGV y total calculados (4000 + 720 = 4720)');
  ok(compras[0]?.detalles.every((d) => d.productoId), 'las dos vinculadas a su producto del catálogo');
  const sumaLineas = compras[0]?.detalles.reduce((a, d) => a + Number(d.subtotal), 0) ?? 0;
  ok(casi(sumaLineas, 5000), 'la suma de las líneas cuadra con el subtotal de la cabecera (5000)');

  // ── 5. idempotencia ────────────────────────────────────────────────────────
  console.log('\n5. Idempotencia: recargar el MISMO archivo no duplica');
  const antes = {
    prod: await prisma.producto.count({ where: { codigo: { in: [P1, P2] } } }),
    kdx: await prisma.movimientoKardex.count({ where: { productoId: { in: [p1.id, p2.id] } } }),
    cmp: await prisma.comprobante.count({ where: { serie: SERIE_V } }),
    det: await prisma.detalleComprobante.count({ where: { comprobanteId: { in: cps.map((c) => c.id) } } }),
    cpr: await prisma.compra.count({ where: { id: { in: compras.map((c) => c.id) } } }),
    cli: await prisma.cliente.count({ where: { nroDoc: { in: [RUC_CLI, RUC_PRV] } } }),
    nc: await prisma.comprobante.count({ where: { serie: SERIE_NC } }),
    detc: await prisma.detalleCompra.count({ where: { compraId: { in: compras.map((c) => c.id) } } }),
  };
  const otra = corre([ruta]);
  okCorrida(otra, 'la segunda carga termina sin excepción');
  const desp = {
    prod: await prisma.producto.count({ where: { codigo: { in: [P1, P2] } } }),
    kdx: await prisma.movimientoKardex.count({ where: { productoId: { in: [p1.id, p2.id] } } }),
    cmp: await prisma.comprobante.count({ where: { serie: SERIE_V } }),
    det: await prisma.detalleComprobante.count({ where: { comprobanteId: { in: cps.map((c) => c.id) } } }),
    cpr: await prisma.compra.count({ where: { id: { in: compras.map((c) => c.id) } } }),
    cli: await prisma.cliente.count({ where: { nroDoc: { in: [RUC_CLI, RUC_PRV] } } }),
    nc: await prisma.comprobante.count({ where: { serie: SERIE_NC } }),
    detc: await prisma.detalleCompra.count({ where: { compraId: { in: compras.map((c) => c.id) } } }),
  };
  for (const k of Object.keys(antes)) ok(antes[k] === desp[k], `${k}: ${antes[k]} → ${desp[k]} (sin duplicar)`);
  const p1b = await prisma.producto.findUnique({ where: { id: p1.id } });
  ok(casi(p1b.stock, STOCK_P1), `el stock sigue en ${STOCK_P1}, no se acumuló a ${STOCK_P1 * 2}`);
  ok(casi(p1b.costoPromedio, COSTO_P1), 'y el costo tampoco se movió');

  // ── 6. recarga con datos corregidos ────────────────────────────────────────
  console.log('\n6. Recargar con cantidades corregidas: ajusta, no acumula');
  const rutaDoble = join(dir, 'kaiser-corregido.xlsx');
  XLSX.writeFile(libro(sedes, { factor: 2 }), rutaDoble);
  const tercera = corre([rutaDoble]);
  okCorrida(tercera, 'la carga corregida termina sin excepción');
  const p1c = await prisma.producto.findUnique({ where: { id: p1.id } });
  ok(casi(p1c.stock, STOCK_P1 * 2), `el stock pasa a ${STOCK_P1 * 2}: refleja la corrección`);
  ok(casi(p1c.costoPromedio, COSTO_P1), 'el costo ponderado no cambia (las proporciones son las mismas)');
  const kdx2 = await prisma.movimientoKardex.count({ where: { productoId: p1.id } });
  ok(kdx2 === 2, 'sigue habiendo 2 aperturas, no 4');

  // ── 7. reversión ───────────────────────────────────────────────────────────
  console.log('\n7. Reversión: borra lo migrado y NO toca lo del ERP');
  // OJO con el filtro: `origenDato: { not: '[migracion]' }` EXCLUYE los NULL,
  // que es la mayoría (34 de 45 en la demo). Con ese filtro la aserción vigilaba
  // una cuarta parte de los comprobantes y habría dado "intactos" aunque la
  // reversión se hubiera llevado el resto. Hay que nombrar los NULL a mano.
  const noMigrados = { empresaId: empresa.id, OR: [{ origenDato: null }, { origenDato: { not: '[migracion]' } }] };
  const ajenosAntes = await prisma.comprobante.count({ where: noMigrados });
  const kdxAjenoAntes = await prisma.movimientoKardex.count({ where: { productoId: { notIn: [p1.id, p2.id] } } });
  const rev = corre(['--revertir']);
  okCorrida(rev, 'la reversión termina sin excepción');
  ok(await prisma.comprobante.count({ where: { serie: SERIE_V } }) === 0, 'los comprobantes migrados desaparecieron');
  ok(await prisma.comprobante.count({ where: { serie: SERIE_NC } }) === 0, 'la nota de crédito también');
  ok(await prisma.compra.count({ where: { id: { in: compras.map((c) => c.id) } } }) === 0, 'las compras migradas también');
  ok(await prisma.detalleCompra.count({ where: { compraId: { in: compras.map((c) => c.id) } } }) === 0, 'y sus líneas de detalle');
  ok(await prisma.movimientoKardex.count({ where: { productoId: p1.id } }) === 0, 'y los movimientos de apertura');
  const ajenosDesp = await prisma.comprobante.count({ where: noMigrados });
  ok(ajenosAntes === ajenosDesp, `los ${ajenosAntes} comprobantes del ERP siguen intactos`);
  ok(kdxAjenoAntes === await prisma.movimientoKardex.count({ where: { productoId: { notIn: [p1.id, p2.id] } } }),
    `los ${kdxAjenoAntes} movimientos de kardex ajenos, intactos`);

  // ── 8. la base queda como estaba ───────────────────────────────────────────
  console.log('\n8. La base vuelve a su estado original');
  await limpiar(empresa.id);
  const huellaDesp = await huellaGlobal();
  const difs = Object.keys({ ...huellaAntes, ...huellaDesp })
    .filter((k) => (huellaAntes[k] ?? 0) !== (huellaDesp[k] ?? 0))
    .map((k) => `${k}: ${huellaAntes[k] ?? 0} → ${huellaDesp[k] ?? 0}`);
  ok(difs.length === 0, `huella global de ${Object.keys(huellaDesp).length} tablas idéntica${difs.length ? ': ' + difs.join(', ') : ''}`);

  rmSync(dir, { recursive: true, force: true });
  console.log(fallos === 0
    ? '\n✔ FASE 11 COMPLETA: la migración del histórico funciona de punta a punta\n'
    : `\n✘ ${fallos} fallo(s) en la migración\n`);
  await prisma.$disconnect();
  process.exit(fallos ? 1 : 0);
}

main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect(); process.exit(1); });
