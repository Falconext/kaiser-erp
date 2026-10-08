/**
 * QA funcional · La liquidación de tres niveles
 *
 * Álvaro lo precisó así: «una cosa es la receta, que es el cálculo teórico, y
 * otra lo que realmente se usa de material». Son TRES cifras, no dos:
 *
 *   receta  → el estándar (kilo por metro cuadrado)
 *   orden   → ese estándar aplicado a esta cantidad
 *   real    → lo que de verdad salió, con su merma y su sobrante
 *
 * Hasta ahora la liquidación solo enfrentaba orden contra real. Faltaba la
 * primera columna, que es donde se ve si el estándar está bien calibrado.
 *
 * Comprueba además las dos reglas que evitan que la pantalla mienta:
 *   · sin receta, la cantidad de receta va en `null` y no en 0,
 *   · sin costo, el importe va en `null` y no en 0.00.
 *
 * Todo por la API real. Crea lo suyo y lo borra.
 */
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const r3 = (n) => Math.round(Number(n) * 1000) / 1000;

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
  if (r.status >= 400 || !r.data) throw new Error(`login falló (HTTP ${r.status})`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const sel = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  return sel.data.accessToken;
}

async function main() {
  const token = await login();
  const marca = `QAL${Date.now().toString().slice(-8)}`;
  const ref = await prisma.producto.findFirst({ select: { empresaId: true, unidadMedidaId: true, tipoAfectacionIGV: true, moneda: true } });
  const empresaId = ref.empresaId;
  const creado = { productos: [], recetas: [], ordenes: [] };

  const nuevoProducto = async (sufijo, { stock: st = 0, costo = 0 } = {}) => {
    const p = await prisma.producto.create({
      data: { codigo: `${marca}${sufijo}`, descripcion: `[QA-LIQ] ${sufijo}`, precioUnitario: 1, valorUnitario: 1,
        stock: st, costoPromedio: costo, empresaId, unidadMedidaId: ref.unidadMedidaId,
        tipoAfectacionIGV: ref.tipoAfectacionIGV, moneda: ref.moneda ?? 'PEN' },
      select: { id: true, codigo: true },
    });
    if (st > 0) await prisma.productoStock.create({ data: { productoId: p.id, sedeId: SEDE, stock: st } });
    creado.productos.push(p.id);
    return p;
  };

  try {
    console.log('\n📋 QA · Liquidación de tres niveles\n');

    // Un insumo que escala y otro por lote, más uno SIN COSTO a propósito.
    const alambre = await nuevoProducto('ALA', { stock: 5000, costo: 4 });   // 2 por unidad
    const grapas  = await nuevoProducto('GRA', { stock: 500, costo: 50 });   // 6 por LOTE
    const sinCost = await nuevoProducto('SIN', { stock: 500, costo: 0 });    // 1 por unidad, sin costo
    const modulo  = await nuevoProducto('MOD');

    // ── 1. La receta con sus dos tipos de cantidad ───────────────────────────
    console.log('1) La receta: una cantidad por unidad y otra por lote');
    const rec = await api('/produccion/recetas', { token, method: 'POST', body: JSON.stringify({
      productoFinalId: modulo.id, codigo: `${marca}-REC`, nombre: 'Receta QA liquidación',
      rendimientoObjetivo: 1, unidadRendimiento: 'UND',
      componentes: [
        { productoInsumoId: alambre.id, cantidadBase: 2, unidadBase: 'KG', tipoCantidad: 'POR_UNIDAD' },
        { productoInsumoId: grapas.id, cantidadBase: 6, unidadBase: 'CJ', tipoCantidad: 'POR_LOTE' },
        { productoInsumoId: sinCost.id, cantidadBase: 1, unidadBase: 'UND' },
      ] }) });
    ok(rec.status < 400, `la receta se crea (HTTP ${rec.status})`);
    creado.recetas.push(rec.data?.id);
    const leida = await api(`/produccion/recetas/${rec.data.id}`, { token });
    const porCod = Object.fromEntries((leida.data?.componentes ?? []).map((c) => [c.productoInsumo.codigo, c]));
    ok(porCod[grapas.codigo]?.tipoCantidad === 'POR_LOTE', 'las grapas quedan marcadas POR_LOTE');
    ok(porCod[alambre.codigo]?.tipoCantidad === 'POR_UNIDAD', 'el alambre queda POR_UNIDAD (el defecto)');
    ok(leida.data?.diagnostico?.sinCosto?.length === 1, `el diagnóstico avisa de 1 componente sin costo (${leida.data?.diagnostico?.sinCosto?.length})`);

    // ── 2. La orden para 10 módulos: lo por lote NO se multiplica ────────────
    console.log('\n2) La explosión para 10 módulos');
    const orden = await api('/produccion/ordenes', { token, method: 'POST', body: JSON.stringify({
      recetaId: rec.data.id, loteProduccion: `${marca}-L1`, cantidadObjetivo: 10 }) });
    ok(orden.status < 400, `la orden se crea (HTTP ${orden.status})`);
    creado.ordenes.push(orden.data?.id);
    const comps = await prisma.ordenProduccionComponente.findMany({
      where: { ordenProduccionId: orden.data.id },
      include: { productoInsumo: { select: { codigo: true } } } });
    const teoPor = Object.fromEntries(comps.map((c) => [c.productoInsumo.codigo, Number(c.cantidadTeorica)]));
    ok(teoPor[alambre.codigo] === 20, `el alambre escala: 2 × 10 = 20 (${teoPor[alambre.codigo]})`);
    ok(teoPor[grapas.codigo] === 6, `las grapas NO escalan: siguen en 6 (${teoPor[grapas.codigo]})`);

    // ── 3. Se ejecuta con desviación real ────────────────────────────────────
    console.log('\n3) La ejecución, con desviación sobre lo planificado');
    const eje = await api(`/produccion/ordenes/${orden.data.id}/ejecutar`, { token, method: 'POST', body: JSON.stringify({
      cantidadProducida: 10,
      componentes: [
        { productoInsumoId: alambre.id, cantidadConsumida: 21, mermaCantidad: 1, mermaReutilizableCantidad: 1 },
        { productoInsumoId: grapas.id, cantidadConsumida: 6 },
        { productoInsumoId: sinCost.id, cantidadConsumida: 10 },
      ] }) });
    ok(eje.status < 400, `se ejecuta (HTTP ${eje.status})`);

    // ── 4. Los tres niveles ──────────────────────────────────────────────────
    console.log('\n4) Los tres niveles en la liquidación');
    const liq = await api(`/produccion/ordenes/${orden.data.id}/resumen-materiales`, { token });
    ok(liq.status < 400, `la liquidación responde (HTTP ${liq.status})`);
    const fila = Object.fromEntries((liq.data?.componentes ?? []).map((c) => [c.codigo, c]));
    const a = fila[alambre.codigo], g = fila[grapas.codigo], s = fila[sinCost.codigo];
    ok(r3(a?.cantidadReceta) === 20, `receta del alambre para 10 módulos: 20 (${a?.cantidadReceta})`);
    ok(r3(a?.cantidadTeorica) === 20, `orden: 20 (${a?.cantidadTeorica})`);
    ok(r3(a?.cantidadConsumida) === 21, `real: 21 (${a?.cantidadConsumida})`);
    ok(r3(g?.cantidadReceta) === 6, `receta de las grapas: 6, sin multiplicar (${g?.cantidadReceta})`);

    // ── 5. Las dos desviaciones ──────────────────────────────────────────────
    console.log('\n5) Las dos desviaciones responden preguntas distintas');
    ok(r3(a?.desvioOrdenVsReceta) === 0, `la orden siguió el estándar: desvío 0 (${a?.desvioOrdenVsReceta})`);
    // consumido 21 + merma 1 = 22 contra 20 planificados.
    ok(r3(a?.desvioRealVsOrden) === 2, `pero se gastaron 2 de más: 22 − 20 (${a?.desvioRealVsOrden})`);
    ok(r3(a?.desvioRealVsOrdenPct) === 10, `un 10 % por encima (${r3(a?.desvioRealVsOrdenPct)})`);

    // ── 6. Lo que falta se dice, no se pone en cero ──────────────────────────
    console.log('\n6) Sin costo es null, no 0.00');
    ok(s?.sinCosto === true, 'el insumo sin costo queda marcado');
    ok(s?.costoUnitario === null, `y su costo unitario va en null, no en 0 (${JSON.stringify(s?.costoUnitario)})`);
    ok(s?.mermaValorizada === null, 'igual que su merma valorizada');
    ok(liq.data?.totales?.sinCosto === 1, `los totales avisan de que 1 componente no se puede valorizar (${liq.data?.totales?.sinCosto})`);
    ok(a?.costoUnitario === 4, `el que sí tiene costo lo conserva (${a?.costoUnitario})`);

    // ── 7. El rendimiento: el «kilo por metro cuadrado» ──────────────────────
    console.log('\n7) El rendimiento real contra el estándar');
    const rend = liq.data?.rendimiento;
    ok(rend?.insumoPrincipal === alambre.codigo, `el insumo principal es el de más valor consumido (${rend?.insumoPrincipal})`);
    ok(r3(rend?.estandar) === 2, `estándar de la receta: 2 por módulo (${rend?.estandar})`);
    ok(r3(rend?.real) === 2.2, `real: 22 ÷ 10 = 2.2 (${r3(rend?.real)})`);
    ok(r3(rend?.desvioPct) === 10, `10 % por encima del estándar (${r3(rend?.desvioPct)})`);

    // ── 8. Una orden SIN receta no inventa un estándar ───────────────────────
    console.log('\n8) Sin receta no hay con qué comparar, y se dice');
    const insManual = await nuevoProducto('MAN', { stock: 500, costo: 7 });
    const finManual = await nuevoProducto('FMAN');
    const sinRec = await api('/produccion/ordenes', { token, method: 'POST', body: JSON.stringify({
      productoFinalId: finManual.id, loteProduccion: `${marca}-L2`, cantidadObjetivo: 5,
      componentes: [{ productoInsumoId: insManual.id, cantidadTeorica: 50, unidad: 'UND' }] }) });
    creado.ordenes.push(sinRec.data?.id);
    await api(`/produccion/ordenes/${sinRec.data.id}/ejecutar`, { token, method: 'POST', body: JSON.stringify({
      cantidadProducida: 5, componentes: [{ productoInsumoId: insManual.id, cantidadConsumida: 48 }] }) });
    const liq2 = await api(`/produccion/ordenes/${sinRec.data.id}/resumen-materiales`, { token });
    const f2 = (liq2.data?.componentes ?? [])[0];
    ok(f2?.cantidadReceta === null, `la cantidad de receta va en null, no en 0 (${JSON.stringify(f2?.cantidadReceta)})`);
    ok(f2?.desvioOrdenVsReceta === null, 'y la desviación contra receta tampoco se inventa');
    ok(r3(f2?.desvioRealVsOrden) === -2, `pero la de real contra orden sí: 48 − 50 (${f2?.desvioRealVsOrden})`);
    ok(liq2.data?.rendimiento?.estandar === null, 'el rendimiento da real pero no estándar');
    ok(r3(liq2.data?.rendimiento?.real) === 9.6, `real: 48 ÷ 5 = 9.6 (${r3(liq2.data?.rendimiento?.real)})`);

    // ── 9. El Excel ──────────────────────────────────────────────────────────
    // Una fila por componente. Lo que se comprueba es que la hoja SALGA y que
    // las celdas de lo que no se puede calcular vayan vacías: en un Excel un
    // 0.00 inventado entra en la siguiente suma que alguien escriba al lado, y
    // ahí ya no hay quien lo distinga de un costo de verdad.
    console.log('\n9) El Excel de la liquidación');
    const xls = await fetch(`${API}/produccion/ordenes/${orden.data.id}/resumen-materiales/excel`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const buf = Buffer.from(await xls.arrayBuffer());
    ok(xls.status === 200, `la descarga responde (HTTP ${xls.status})`);
    ok(buf.slice(0, 2).toString() === 'PK', 'y es un xlsx de verdad (firma PK)');
    ok(
      (xls.headers.get('content-disposition') ?? '').includes('.xlsx'),
      'con nombre de archivo propio de la orden',
    );
    const hoja = XLSX.read(buf, { type: 'buffer' });
    const celdas = XLSX.utils.sheet_to_json(hoja.Sheets[hoja.SheetNames[0]], { header: 1, defval: null });
    const cabeceras = celdas.find((f) => Array.isArray(f) && f.includes('Receta')) ?? [];
    ok(cabeceras.includes('Receta') && cabeceras.includes('Orden') && cabeceras.includes('Consumido'),
      'la hoja lleva las tres columnas de la liquidación');
    ok(cabeceras.includes('Orden vs receta') || cabeceras.includes('Desvío orden vs receta'),
      'y las desviaciones');
    const iCosto = cabeceras.indexOf('Costo unit.');
    const filaSinCosto = celdas.find((f) => Array.isArray(f) && f[0] === sinCost.codigo);
    ok(filaSinCosto != null, 'el componente sin costo está en la hoja');
    ok(filaSinCosto?.[iCosto] === null, `y su costo va VACÍO, no en 0 (${JSON.stringify(filaSinCosto?.[iCosto])})`);
  } finally {
    console.log('\n10) Limpieza');
    for (const id of creado.ordenes.filter(Boolean)) {
      await prisma.movimientoProduccion.deleteMany({ where: { ordenProduccionId: id } });
      await prisma.ordenProduccionComponente.deleteMany({ where: { ordenProduccionId: id } });
      await prisma.ordenProduccion.deleteMany({ where: { id } });
    }
    for (const id of creado.recetas.filter(Boolean)) {
      await prisma.recetaComponente.deleteMany({ where: { recetaId: id } });
      await prisma.recetaProduccion.deleteMany({ where: { id } });
    }
    const delMarca = await prisma.producto.findMany({ where: { codigo: { startsWith: marca } }, select: { id: true } });
    for (const { id } of delMarca) {
      await prisma.movimientoProduccion.deleteMany({ where: { productoId: id } });
      await prisma.movimientoKardex.deleteMany({ where: { productoId: id } });
      await prisma.productoStock.deleteMany({ where: { productoId: id } });
      await prisma.producto.updateMany({ where: { id }, data: { productoOrigenId: null } });
    }
    for (const { id } of delMarca) await prisma.producto.deleteMany({ where: { id } });
    const quedan = await prisma.producto.count({ where: { codigo: { startsWith: marca } } });
    ok(quedan === 0, `los productos de prueba eliminados (quedan ${quedan})`);
    await prisma.$disconnect();
  }

  console.log(fallos === 0 ? '\n✔ Liquidación: todo correcto' : `\n✘ ${fallos} comprobaciones fallidas`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
