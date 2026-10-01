/**
 * QA funcional de lo portado desde falconext-mype al módulo de Compras:
 * importación masiva, aprobación (maker-checker), lectura por IA y anulación
 * de abonos.
 *
 * Va contra la API real con un token de gerencia y comprueba el EFECTO en la
 * base, no solo que el endpoint responda 200: una importación que devuelve
 * éxito pero no mueve el kardex es exactamente el fallo que este QA busca.
 *
 * Deja la base como la encontró: lo que crea, lo anula o lo borra al final.
 *
 *   pnpm run qa:compras-portadas
 */
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const API = process.env.API_URL || 'http://localhost:4201/api';
const prisma = new PrismaClient();
let fallos = 0, pruebas = 0;
const creados = { compras: [] };

const ok = (cond, titulo, detalle = '') => {
  pruebas++;
  if (cond) console.log(`   ✔ ${titulo}`);
  else { fallos++; console.log(`   ✘ ${titulo}${detalle ? `\n       ${detalle}` : ''}`); }
};

/** Mismo login que el resto de QA del repo, incluido el paso de sede. */
async function login(email = 'gerencia@kaisercorp.com.pe') {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: process.env.QA_PASS || 'kaiser123' }),
  });
  const j = await r.json();
  if (!j.data) throw new Error(`login falló: ${j?.message}`);
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
  return { status: r.status, json: j, texto, bytes: texto.length };
};

async function main() {
  console.log('\nQA · Compras portadas desde falconext-mype');
  console.log('═'.repeat(58));

  const token = await login();
  const call = api(token);
  const usuario = await prisma.usuario.findFirst({
    where: { email: 'gerencia@kaisercorp.com.pe' },
    select: { id: true, empresaId: true },
  });
  const empresaId = usuario.empresaId;

  // ── 1. Plantilla ─────────────────────────────────────────────────────────
  console.log('\n1) Plantilla de importación');
  const plantilla = await call('/compras/importar/plantilla');
  ok(plantilla.status === 200, 'se descarga (200)');
  ok(plantilla.bytes > 5000, `trae el catálogo (${(plantilla.bytes / 1024).toFixed(0)} KB)`, 'pesa demasiado poco: ¿va vacía?');

  // ── 2. Rechazo de archivo inválido ───────────────────────────────────────
  console.log('\n2) Validación del archivo');
  const fdMalo = new FormData();
  fdMalo.append('file', new Blob(['esto no es un excel']), 'malo.xlsx');
  const malo = await call('/compras/importar/previsualizar', { method: 'POST', body: fdMalo });
  ok(malo.status === 400, 'un archivo que no es Excel se rechaza con 400', `dio ${malo.status}`);
  ok(/columnas|plantilla/i.test(malo.json?.message ?? ''), 'y el mensaje dice qué falta');

  // ── 3. Vista previa con datos reales ─────────────────────────────────────
  console.log('\n3) Vista previa (no debe escribir nada)');
  const prods = await prisma.producto.findMany({
    where: { empresaId, estado: 'ACTIVO' }, select: { id: true, codigo: true, stock: true },
    take: 2, orderBy: { id: 'asc' },
  });
  const sede = await prisma.sede.findFirst({ where: { empresaId }, select: { id: true, nombre: true } });
  const numero = String(90000 + Math.floor(Math.random() * 9000));
  const filas = prods.map((p, i) => ({
    CODIGO: p.codigo, CANTIDAD: (i + 1) * 2, 'COSTO UNITARIO': 10 + i,
    SEDE: sede.nombre, SERIE: 'FQA', NUMERO: numero, FECHA: '2026-09-20',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), 'Compras');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const comprasAntes = await prisma.compra.count({ where: { empresaId } });
  const fd1 = new FormData();
  fd1.append('file', new Blob([buf]), 'qa.xlsx');
  const prev = await call('/compras/importar/previsualizar', { method: 'POST', body: fd1 });
  const dPrev = prev.json?.data ?? prev.json;
  ok(prev.status === 200 || prev.status === 201, 'responde 200/201', `dio ${prev.status}`);
  ok((dPrev?.compras?.length ?? 0) === 1, 'agrupa las 2 filas en UNA compra', `agrupó ${dPrev?.compras?.length}`);
  const lineas = dPrev?.compras?.[0]?.lineas ?? [];
  ok(lineas.filter((l) => l.productoId).length === 2, 'empareja los 2 productos por código');
  ok(await prisma.compra.count({ where: { empresaId } }) === comprasAntes, 'NO escribió nada en la base');

  // ── 4. Importación real + efecto en el kardex ────────────────────────────
  console.log('\n4) Importación real y su efecto en inventario');
  // Se relee el stock JUSTO antes de importar, no el de la consulta del paso 3:
  // entre medias hay una previsualización y el backend puede haber recargado, y
  // comparar contra una foto vieja hacía fallar el QA por un residuo ajeno.
  // Se relee el stock JUSTO antes de importar, no el de la consulta del paso 3:
  // entre medias hay una previsualización y el backend puede haber recargado.
  const stockAntes = new Map(
    await Promise.all(prods.map(async (p) => [
      p.id,
      Number((await prisma.producto.findUnique({ where: { id: p.id }, select: { stock: true } })).stock),
    ])),
  );
  // Y también el stock POR SEDE: el global es la suma de las sedes, así que
  // restituir solo `Producto.stock` dejaba residuo en `ProductoStock` y cada
  // pasada del QA inflaba el inventario un poco más.
  // Stock EN LA SEDE de destino justo antes de importar: es contra esto que se
  // comprueba el ingreso, porque la compra entra a una sede concreta.
  const stockSedeAntes2 = new Map(
    await Promise.all(prods.map(async (p) => [
      p.id,
      Number((await prisma.productoStock.findFirst({
        where: { productoId: p.id, sedeId: sede.id }, select: { stock: true },
      }))?.stock ?? 0),
    ])),
  );
  const stockSedeAntes = new Map(
    (await prisma.productoStock.findMany({
      where: { productoId: { in: prods.map((p) => p.id) } },
      select: { id: true, stock: true },
    })).map((r) => [r.id, Number(r.stock)]),
  );
  const fd2 = new FormData();
  fd2.append('file', new Blob([buf]), 'qa.xlsx');
  const imp = await call('/compras/importar', { method: 'POST', body: fd2 });
  const dImp = imp.json?.data ?? imp.json;
  ok(imp.status === 200 || imp.status === 201, 'responde 200/201', `dio ${imp.status}: ${imp.json?.message ?? ''}`);

  const compra = await prisma.compra.findFirst({
    where: { empresaId, serie: 'FQA', numero },
    select: { id: true, total: true, estado: true, detalles: { select: { productoId: true, cantidad: true } } },
  });
  ok(!!compra, 'la compra existe en la base');
  if (compra) {
    creados.compras.push(compra.id);
    ok(compra.detalles.length === 2, 'con sus 2 líneas');
    // Se comprueba el stock DE LA SEDE, no el global: la compra entra a una sede
    // concreta y el global es la suma de todas. Medir el global obligaría a que
    // esa suma estuviera cuadrada, que es otra cosa —y se comprueba aparte—.
    for (const p of prods) {
      const esperado = stockSedeAntes2.get(p.id) + ((prods.indexOf(p) + 1) * 2);
      const fila = await prisma.productoStock.findFirst({
        where: { productoId: p.id, sedeId: sede.id }, select: { stock: true },
      });
      const actual = Number(fila?.stock ?? 0);
      ok(Math.abs(actual - esperado) < 0.001,
         `el stock de ${p.codigo} en la sede subió a ${esperado}`, `quedó en ${actual}`);
    }

    // Invariante del proyecto: el stock global de un producto es la suma de sus
    // sedes. Si se separan, el kardex y el valorizado dejan de coincidir.
    for (const p of prods) {
      const global = Number((await prisma.producto.findUnique({ where: { id: p.id }, select: { stock: true } })).stock);
      const filas = await prisma.productoStock.findMany({ where: { productoId: p.id }, select: { stock: true } });
      const suma = filas.reduce((a, f) => a + Number(f.stock), 0);
      ok(Math.abs(global - suma) < 0.001,
         `${p.codigo}: el stock global cuadra con la suma de sedes`,
         `global ${global} vs sedes ${suma} (descuadre de ${(global - suma).toFixed(3)})`);
    }
    const movs = await prisma.movimientoKardex.count({ where: { compraId: compra.id, tipoMovimiento: 'INGRESO' } });
    ok(movs === 2, 'se registraron 2 movimientos de kardex', `hubo ${movs}`);
  }

  // ── 5. Anular un abono ───────────────────────────────────────────────────
  console.log('\n5) Anular un abono');
  if (compra) {
    const pago = await call(`/compras/${compra.id}/pagos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monto: 5, metodoPago: 'EFECTIVO', fecha: '2026-09-21' }),
    });
    ok(pago.status === 200 || pago.status === 201, 'se registra un abono de S/ 5', `dio ${pago.status}: ${pago.json?.message ?? ''}`);
    const pagoId = (await prisma.pagoCompra.findFirst({ where: { compraId: compra.id }, orderBy: { id: 'desc' }, select: { id: true } }))?.id;
    if (pagoId) {
      const saldoConPago = Number((await prisma.compra.findUnique({ where: { id: compra.id }, select: { saldo: true } })).saldo);
      const anul = await call(`/compras/${compra.id}/pagos/${pagoId}`, { method: 'DELETE' });
      ok(anul.status === 200, 'se anula (200)', `dio ${anul.status}`);
      const saldoFinal = Number((await prisma.compra.findUnique({ where: { id: compra.id }, select: { saldo: true } })).saldo);
      ok(Math.abs(saldoFinal - (saldoConPago + 5)) < 0.01, 'el saldo se restablece (+5)', `era ${saldoConPago}, quedó ${saldoFinal}`);
      ok(!(await prisma.pagoCompra.findUnique({ where: { id: pagoId } })), 'el abono desaparece del historial');
    }
  }

  // ── 6. Aprobación: los pendientes no mueven stock ni aceptan pagos ───────
  console.log('\n6) Aprobación (maker-checker)');
  const prod = prods[0];
  const stockPre = Number((await prisma.producto.findUnique({ where: { id: prod.id }, select: { stock: true } })).stock);
  const pendiente = await prisma.compra.create({
    data: {
      empresaId, sedeId: sede.id, proveedorId: (await prisma.cliente.findFirst({ where: { empresaId }, select: { id: true } })).id,
      tipoDoc: '01', serie: 'FQA', numero: String(Number(numero) + 1), fechaEmision: new Date(),
      moneda: 'PEN', subtotal: 100, igv: 18, total: 118, saldo: 118,
      estado: 'PENDIENTE_APROBACION', usuarioId: usuario.id,
      detalles: { create: [{ productoId: prod.id, descripcion: 'QA', cantidad: 3, precioUnitario: 33.9, subtotal: 100, igv: 18, total: 118 }] },
    },
    select: { id: true },
  });
  creados.compras.push(pendiente.id);
  const stockTrasCrear = Number((await prisma.producto.findUnique({ where: { id: prod.id }, select: { stock: true } })).stock);
  ok(stockTrasCrear === stockPre, 'una compra PENDIENTE no mueve stock');

  const pagoPend = await call(`/compras/${pendiente.id}/pagos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ monto: 10, metodoPago: 'EFECTIVO', fecha: '2026-09-21' }),
  });
  ok(pagoPend.status >= 400, 'y NO admite pagos', `aceptó el pago (${pagoPend.status})`);

  const apr = await call(`/compras/${pendiente.id}/aprobar`, { method: 'PATCH' });
  ok(apr.status === 200, 'se aprueba (200)', `dio ${apr.status}: ${apr.json?.message ?? ''}`);
  const stockPost = Number((await prisma.producto.findUnique({ where: { id: prod.id }, select: { stock: true } })).stock);
  ok(Math.abs(stockPost - (stockPre + 3)) < 0.001, 'AL APROBAR entra el stock (+3)', `era ${stockPre}, quedó ${stockPost}`);
  const cAprob = await prisma.compra.findUnique({ where: { id: pendiente.id }, select: { estado: true, aprobadoPorUsuarioId: true } });
  ok(cAprob.estado === 'REGISTRADO', 'pasa a REGISTRADO');
  ok(cAprob.aprobadoPorUsuarioId === usuario.id, 'y queda registrado quién aprobó');

  // Rechazo
  const pend2 = await prisma.compra.create({
    data: {
      empresaId, sedeId: sede.id, proveedorId: (await prisma.cliente.findFirst({ where: { empresaId }, select: { id: true } })).id,
      tipoDoc: '01', serie: 'FQA', numero: String(Number(numero) + 2), fechaEmision: new Date(),
      moneda: 'PEN', subtotal: 100, igv: 18, total: 118, saldo: 118,
      estado: 'PENDIENTE_APROBACION', usuarioId: usuario.id,
      detalles: { create: [{ productoId: prod.id, descripcion: 'QA rechazo', cantidad: 7, precioUnitario: 14.3, subtotal: 100, igv: 18, total: 118 }] },
    }, select: { id: true },
  });
  creados.compras.push(pend2.id);
  const stockAntesRech = Number((await prisma.producto.findUnique({ where: { id: prod.id }, select: { stock: true } })).stock);
  const rech = await call(`/compras/${pend2.id}/rechazar`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motivo: 'QA: precio equivocado' }),
  });
  ok(rech.status === 200, 'se rechaza (200)', `dio ${rech.status}`);
  const cRech = await prisma.compra.findUnique({ where: { id: pend2.id }, select: { estado: true, motivoRechazo: true } });
  ok(cRech.estado === 'RECHAZADA', 'pasa a RECHAZADA');
  ok(cRech.motivoRechazo === 'QA: precio equivocado', 'guarda el motivo');
  const stockTrasRech = Number((await prisma.producto.findUnique({ where: { id: prod.id }, select: { stock: true } })).stock);
  ok(stockTrasRech === stockAntesRech, 'rechazar NO mueve stock (nunca lo tuvo)');

  // ── 7. IGV según la afectación de la línea ───────────────────────────────
  console.log('\n7) IGV por afectación de línea');
  const prodIgv = prods[0];
  const afeOriginal = (await prisma.producto.findUnique({
    where: { id: prodIgv.id }, select: { tipoAfectacionIGV: true },
  })).tipoAfectacionIGV;

  const crearCompra = async (serie, detalles) => {
    const r = await call('/compras', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        proveedorId: (await prisma.cliente.findFirst({ where: { empresaId }, select: { id: true } })).id,
        tipoDoc: '01', serie, numero: String(70000 + Math.floor(Math.random() * 9000)),
        fechaEmision: '2026-09-22', moneda: 'PEN', detalles,
      }),
    });
    const id = r.json?.data?.data?.id ?? r.json?.data?.id;
    if (id) creados.compras.push(id);
    return id ? await prisma.compra.findUnique({
      where: { id }, select: { id: true, subtotal: true, igv: true, total: true, esGasto: true },
    }) : null;
  };

  // Gravado: S/ 118 con IGV incluido → 100 + 18.
  const cG = await crearCompra('QIG', [
    { productoId: prodIgv.id, descripcion: 'gravado', cantidad: 1, precioUnitario: 118, incluyeIgv: true },
  ]);
  ok(cG && Math.abs(Number(cG.igv) - 18) < 0.05, 'producto GRAVADO: S/118 con IGV → IGV 18.00',
     `dio ${cG ? Number(cG.igv).toFixed(2) : 'nada'}`);

  // El MISMO producto marcado exonerado: no debe inventar IGV.
  await prisma.producto.update({ where: { id: prodIgv.id }, data: { tipoAfectacionIGV: '20' } });
  const cE = await crearCompra('QIE', [
    { productoId: prodIgv.id, descripcion: 'exonerado', cantidad: 1, precioUnitario: 118, incluyeIgv: true },
  ]);
  ok(cE && Math.abs(Number(cE.igv)) < 0.01, 'producto EXONERADO: IGV 0.00 (antes inventaba 18.00)',
     `dio ${cE ? Number(cE.igv).toFixed(2) : 'nada'}`);
  ok(cE && Math.abs(Number(cE.subtotal) - 118) < 0.05, 'y el neto es el importe completo, sin extraer IGV');
  await prisma.producto.update({ where: { id: prodIgv.id }, data: { tipoAfectacionIGV: afeOriginal } });

  // Ítem libre inafecto (recargo al consumo de un restaurante).
  const cR = await crearCompra('QIR', [
    { descripcion: 'Consumo', cantidad: 1, precioUnitario: 493.39, incluyeIgv: true },
    { descripcion: 'Rec. Cons. (5%)', cantidad: 1, precioUnitario: 20.91, tipoAfectacionIGV: '30' },
  ]);
  ok(cR && Math.abs(Number(cR.subtotal) - 439.04) < 0.06, 'línea INAFECTA: neto 439.04', `dio ${cR ? Number(cR.subtotal).toFixed(2) : '-'}`);
  ok(cR && Math.abs(Number(cR.igv) - 75.26) < 0.06, 'IGV 75.26 (solo sobre la parte gravada)', `dio ${cR ? Number(cR.igv).toFixed(2) : '-'}`);
  ok(cR && Math.abs(Number(cR.total) - 514.30) < 0.06, 'total 514.30, igual que la factura');
  ok(cR && cR.esGasto === true, 'y se infiere como consumo propio (ninguna línea es del catálogo)');

  // ── 8. Consumo propio en el P&L ──────────────────────────────────────────
  console.log('\n8) Consumo propio en el resultado del mes');
  const pnl = async () => {
    const r = await call('/analisis-financiero/pnl?anio=2026&mes=9');
    return Number(r.json?.data?.gastosTotales ?? 0);
  };
  const gastosAntes = await pnl();
  const cP = await crearCompra('QPL', [
    { descripcion: 'Gasolina (QA)', cantidad: 1, precioUnitario: 118, incluyeIgv: true },
  ]);
  const gastosDespues = await pnl();
  const netoP = cP ? Number(cP.subtotal) : 0;
  ok(Math.abs((gastosDespues - gastosAntes) - netoP) < 0.06,
     `los gastos suben el NETO (S/ ${netoP.toFixed(2)}), no el total`,
     `subieron ${(gastosDespues - gastosAntes).toFixed(2)}`);
  ok(Math.abs((gastosDespues - gastosAntes) - Number(cP?.total ?? 0)) > 0.01,
     'el IGV NO se cuenta como gasto (es crédito fiscal)');

  // ── 9. Endpoint de IA montado ────────────────────────────────────────────
  console.log('\n9) Lectura de factura por IA');
  const fdImg = new FormData();
  fdImg.append('file', new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }), 'x.png');
  const ia = await call('/compras/parse-imagen', { method: 'POST', body: fdImg });
  ok(ia.status !== 404, 'el endpoint existe (no 404)', `dio 404`);
  ok(ia.status !== 401, 'y acepta el token');

  // ── Limpieza ─────────────────────────────────────────────────────────────
  console.log('\n10) Limpieza');
  for (const id of creados.compras) {
    await prisma.movimientoKardex.deleteMany({ where: { compraId: id } }).catch(() => {});
    await prisma.pagoCompra.deleteMany({ where: { compraId: id } }).catch(() => {});
    await prisma.detalleCompra.deleteMany({ where: { compraId: id } }).catch(() => {});
    await prisma.compra.delete({ where: { id } }).catch(() => {});
  }
  // Devolver el stock que el QA movió: primero por sede y luego el global,
  // en ese orden, porque el global se deriva de las sedes.
  for (const [id, stock] of stockSedeAntes) {
    await prisma.productoStock.update({ where: { id }, data: { stock } }).catch(() => {});
  }
  for (const p of prods) {
    await prisma.producto.update({ where: { id: p.id }, data: { stock: stockAntes.get(p.id) } });
  }
  console.log(`   · ${creados.compras.length} compra(s) de prueba eliminadas y stock restituido`);

  console.log('\n' + '═'.repeat(58));
  console.log(fallos ? `✘ ${fallos} de ${pruebas} comprobaciones fallaron\n` : `✔ ${pruebas} comprobaciones, todo correcto\n`);
  await prisma.$disconnect();
  process.exitCode = fallos ? 1 : 0;
}

main().catch(async (e) => { console.error('\n✘', e.message, '\n'); await prisma.$disconnect(); process.exitCode = 1; });
