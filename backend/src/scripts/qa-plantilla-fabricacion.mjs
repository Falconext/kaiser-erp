/**
 * QA funcional · La plantilla de fabricación entiende POR_LOTE
 *
 * `tipoCantidad` existía en el modelo, en los DTO y en la explosión, pero NO en
 * la plantilla de Excel con la que Kaiser carga recetas en bloque: una receta
 * importada por ahí entraba ENTERA como POR_UNIDAD. Es justo el defecto que
 * hubo que corregir a mano en la receta del módulo de levante —los cuatro
 * consumibles de tanda divididos entre 210— y habría vuelto en la primera
 * receta que cargaran por Excel.
 *
 * Comprueba las dos mitades: que la plantilla que se descarga traiga la
 * columna, y que al importarla el tipo llegue a la base. Más la
 * compatibilidad: un Excel viejo, SIN esa columna, se importa igual y todo
 * queda POR_UNIDAD, que es el defecto del modelo.
 *
 * Crea sus propios productos y su propia receta, y los borra al terminar.
 */
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
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
async function login() {
  const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'gerencia@kaisercorp.com.pe', password: 'kaiser123' }) });
  if (r.status >= 400 || !r.data) throw new Error(`login falló (HTTP ${r.status})`);
  if (!r.data.requiresSedeSelection) return r.data.accessToken;
  const sel = await api('/auth/select-sede', { token: r.data.tempToken, method: 'POST', body: JSON.stringify({ sedeId: SEDE }) });
  return sel.data.accessToken;
}

/** Sube un workbook al endpoint real de importación (multipart). */
async function importar(token, wb, nombre) {
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const form = new FormData();
  form.append('file', new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }), nombre);
  const r = await fetch(`${API}/produccion/importar-plantilla`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  });
  const t = await r.text();
  let j = {}; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; }
  return { status: r.status, body: j, data: j?.data };
}

const libro = (productos, recetas) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productos), 'PRODUCTOS');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recetas), 'RECETAS');
  return wb;
};

async function main() {
  const token = await login();
  const marca = `QAP${Date.now().toString().slice(-8)}`;
  const creado = { recetas: [], productos: [] };

  try {
    console.log('\n📄 QA · La plantilla de fabricación y POR_LOTE\n');

    // ── 1. La plantilla que se descarga ─────────────────────────────────────
    console.log('1) La plantilla trae la columna');
    const resp = await fetch(`${API}/produccion/plantilla-carga`, { headers: { Authorization: `Bearer ${token}` } });
    const buf = Buffer.from(await resp.arrayBuffer());
    ok(resp.status === 200, `se descarga (HTTP ${resp.status})`);
    const wb = XLSX.read(buf, { type: 'buffer' });
    const filas = XLSX.utils.sheet_to_json(wb.Sheets['RECETAS'], { defval: null });
    ok(!!wb.Sheets['RECETAS'], 'tiene hoja RECETAS');
    ok(
      Object.prototype.hasOwnProperty.call(filas[0] ?? {}, 'TIPO_CANTIDAD'),
      `con columna TIPO_CANTIDAD (${Object.keys(filas[0] ?? {}).join(', ').slice(0, 70)}…)`,
    );
    ok(
      filas.every((f) => f.TIPO_CANTIDAD === 'POR_UNIDAD'),
      'y los ejemplos la traen rellena, para que se vea qué poner',
    );
    const leeme = XLSX.utils.sheet_to_json(wb.Sheets['LEEME'], { header: 1 }).flat().join(' ');
    ok(leeme.includes('POR_LOTE'), 'el LEEME explica qué es POR_LOTE');
    ok(
      leeme.includes('dividido entre el tamaño del lote'),
      'y avisa de no dividirlo entre el lote para que "cuadre"',
    );

    // ── 2. Importar con la columna ──────────────────────────────────────────
    console.log('\n2) Al importarla, el tipo llega a la base');
    const productos = [
      { TIPO: 'INSUMO', CODIGO: `${marca}INS`, DESCRIPCION: `[QA-PLANTILLA] insumo`, UMB: 'KG', COSTO_UNITARIO: 5, PRECIO_VENTA: 0, STOCK_INICIAL: 0, AFECTACION: '10' },
      { TIPO: 'INSUMO', CODIGO: `${marca}LOT`, DESCRIPCION: `[QA-PLANTILLA] consumible de tanda`, UMB: 'CJ', COSTO_UNITARIO: 50, PRECIO_VENTA: 0, STOCK_INICIAL: 0, AFECTACION: '10' },
      { TIPO: 'TERMINADO', CODIGO: `${marca}FIN`, DESCRIPCION: `[QA-PLANTILLA] producto final`, UMB: 'UND', COSTO_UNITARIO: 0, PRECIO_VENTA: 100, STOCK_INICIAL: 0, AFECTACION: '10' },
    ];
    const base = {
      RECETA_CODIGO: `${marca}-REC`, RECETA_NOMBRE: 'QA plantilla', RECETA_VERSION: 1,
      PRODUCTO_FINAL_CODIGO: `${marca}FIN`, RENDIMIENTO_OBJETIVO: 1, UMB_RENDIMIENTO: 'UND',
      MERMA_OBJETIVO_PORCENTAJE: 0,
    };
    const conColumna = await importar(token, libro(productos, [
      { ...base, INSUMO_CODIGO: `${marca}INS`, CANTIDAD_BASE: 2, UMB_BASE: 'KG', TIPO_CANTIDAD: 'POR_UNIDAD', ORDEN: 1 },
      { ...base, INSUMO_CODIGO: `${marca}LOT`, CANTIDAD_BASE: 6, UMB_BASE: 'CJ', TIPO_CANTIDAD: 'POR_LOTE', ORDEN: 2 },
    ]), 'plantilla.xlsx');
    ok(conColumna.status < 400, `la importación responde (HTTP ${conColumna.status})`);

    const rec = await prisma.recetaProduccion.findFirst({
      where: { codigo: `${marca}-REC` },
      include: { componentes: { include: { productoInsumo: { select: { codigo: true } } } } },
    });
    if (rec) creado.recetas.push(rec.id);
    ok(!!rec, 'la receta se creó');
    const porCod = Object.fromEntries((rec?.componentes ?? []).map((c) => [c.productoInsumo.codigo, c]));
    ok(porCod[`${marca}INS`]?.tipoCantidad === 'POR_UNIDAD', `el componente normal queda POR_UNIDAD (${porCod[`${marca}INS`]?.tipoCantidad})`);
    ok(porCod[`${marca}LOT`]?.tipoCantidad === 'POR_LOTE', `y el de tanda, POR_LOTE (${porCod[`${marca}LOT`]?.tipoCantidad})`);
    ok(Number(porCod[`${marca}LOT`]?.cantidadBase) === 6, `con su cantidad sin dividir: 6 (${Number(porCod[`${marca}LOT`]?.cantidadBase)})`);

    // ── 3. La explosión lo respeta ──────────────────────────────────────────
    console.log('\n3) Y la orden que sale de esa receta no lo multiplica');
    const orden = await api('/produccion/ordenes', {
      token, method: 'POST',
      body: JSON.stringify({ recetaId: rec.id, loteProduccion: `${marca}-L1`, cantidadObjetivo: 50 }),
    });
    ok(orden.status < 400, `la orden se crea para 50 unidades (HTTP ${orden.status})`);
    const comps = await prisma.ordenProduccionComponente.findMany({
      where: { ordenProduccionId: orden.data?.id },
      include: { productoInsumo: { select: { codigo: true } } },
    });
    const porCodOrden = Object.fromEntries(comps.map((c) => [c.productoInsumo.codigo, Number(c.cantidadTeorica)]));
    ok(porCodOrden[`${marca}INS`] === 100, `lo POR_UNIDAD escala: 2 × 50 = 100 (${porCodOrden[`${marca}INS`]})`);
    ok(porCodOrden[`${marca}LOT`] === 6, `lo POR_LOTE no: 6, no 300 (${porCodOrden[`${marca}LOT`]})`);

    // ── 4. Una plantilla vieja se importa igual ─────────────────────────────
    console.log('\n4) Un Excel sin la columna se importa como antes');
    const sinColumna = await importar(token, libro([], [
      { ...base, RECETA_CODIGO: `${marca}-OLD`, INSUMO_CODIGO: `${marca}INS`, CANTIDAD_BASE: 3, UMB_BASE: 'KG', ORDEN: 1 },
    ]), 'vieja.xlsx');
    ok(sinColumna.status < 400, `se importa igual (HTTP ${sinColumna.status})`);
    const vieja = await prisma.recetaProduccion.findFirst({
      where: { codigo: `${marca}-OLD` }, include: { componentes: true },
    });
    if (vieja) creado.recetas.push(vieja.id);
    ok(!!vieja, 'y crea su receta');
    ok(
      (vieja?.componentes ?? []).every((c) => c.tipoCantidad === 'POR_UNIDAD'),
      'con todo POR_UNIDAD, que es el defecto del modelo',
    );

    // ── 5. Editar sin mandar el tipo no lo borra ────────────────────────────
    // Actualizar una receta BORRA sus componentes y los recrea. Un cliente que
    // no conozca `tipoCantidad` —la pantalla de recetas lo fue, y cualquier
    // Excel con el formato viejo lo sigue siendo— devolvía todos los POR_LOTE
    // a POR_UNIDAD sin avisar, y la siguiente orden salía con el consumo
    // multiplicado por el tamaño del lote.
    console.log('\n5) Editar la receta sin mandar el tipo NO lo borra');
    const sinTipo = await api(`/produccion/recetas/${rec.id}`, {
      token, method: 'PATCH',
      body: JSON.stringify({
        componentes: [
          { productoInsumoId: porCod[`${marca}INS`].productoInsumoId, cantidadBase: 2, unidadBase: 'KG', orden: 1 },
          { productoInsumoId: porCod[`${marca}LOT`].productoInsumoId, cantidadBase: 6, unidadBase: 'CJ', orden: 2 },
        ],
      }),
    });
    ok(sinTipo.status < 400, `la receta se actualiza (HTTP ${sinTipo.status})`);
    const tras = await prisma.recetaComponente.findMany({
      where: { recetaId: rec.id },
      include: { productoInsumo: { select: { codigo: true } } },
    });
    const trasCod = Object.fromEntries(tras.map((c) => [c.productoInsumo.codigo, c.tipoCantidad]));
    ok(trasCod[`${marca}LOT`] === 'POR_LOTE', `el POR_LOTE sobrevive a la edición (${trasCod[`${marca}LOT`]})`);
    ok(trasCod[`${marca}INS`] === 'POR_UNIDAD', 'y el POR_UNIDAD sigue igual');

    // Pero mandarlo explícitamente SÍ lo cambia: es la diferencia entre "no me
    // consta" y "ponlo en POR_UNIDAD".
    const conTipo = await api(`/produccion/recetas/${rec.id}`, {
      token, method: 'PATCH',
      body: JSON.stringify({
        componentes: [
          { productoInsumoId: porCod[`${marca}LOT`].productoInsumoId, cantidadBase: 6, unidadBase: 'CJ', tipoCantidad: 'POR_UNIDAD', orden: 1 },
        ],
      }),
    });
    ok(conTipo.status < 400, `se puede cambiar a propósito (HTTP ${conTipo.status})`);
    const cambiado = await prisma.recetaComponente.findFirst({
      where: { recetaId: rec.id, productoInsumo: { codigo: `${marca}LOT` } },
      select: { tipoCantidad: true },
    });
    ok(cambiado?.tipoCantidad === 'POR_UNIDAD', `y entonces sí cambia (${cambiado?.tipoCantidad})`);
  } finally {
    console.log('\n6) Limpieza');
    const ordenes = await prisma.ordenProduccion.findMany({ where: { loteProduccion: { startsWith: marca } }, select: { id: true } });
    for (const o of ordenes) {
      await prisma.movimientoProduccion.deleteMany({ where: { ordenProduccionId: o.id } });
      await prisma.ordenProduccionComponente.deleteMany({ where: { ordenProduccionId: o.id } });
      await prisma.ordenProduccion.deleteMany({ where: { id: o.id } });
    }
    for (const id of creado.recetas) {
      await prisma.recetaComponente.deleteMany({ where: { recetaId: id } });
      await prisma.recetaProduccion.deleteMany({ where: { id } });
    }
    const prods = await prisma.producto.findMany({ where: { codigo: { startsWith: marca } }, select: { id: true } });
    for (const p of prods) {
      await prisma.movimientoKardex.deleteMany({ where: { productoId: p.id } });
      await prisma.productoStock.deleteMany({ where: { productoId: p.id } });
      await prisma.producto.deleteMany({ where: { id: p.id } });
    }
    ok((await prisma.producto.count({ where: { codigo: { startsWith: marca } } })) === 0, 'los productos de prueba eliminados');
    ok((await prisma.recetaProduccion.count({ where: { codigo: { startsWith: marca } } })) === 0, 'las recetas de prueba eliminadas');
  }

  console.log(fallos === 0 ? '\n✔ Plantilla de fabricación: todo correcto' : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}

main().catch(async (e) => { console.error('\n✘', e.message); await prisma.$disconnect(); process.exit(1); });
