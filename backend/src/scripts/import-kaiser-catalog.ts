/**
 * Importador del catálogo de Kaiser desde el Excel de stock del almacén.
 *
 *   Fuente: "STOCK ALMACEN CHACRA CERRO.xlsx" (9 hojas)
 *   Hojas de stock : ALAMB, REJA, MALLA MET, MALLA PLAST, OTROS
 *   Maestro medidas: PESOMEDORIG (peso Kg, largo/ancho/alto cm, volumen m³)
 *   Recetas (BOM)  : PROD INTERM  → RecetaProduccion + RecetaComponente
 *   Importaciones  : PROX IMPO    → asegura producto en catálogo + reporte
 *
 * Qué siembra (todo idempotente — seguro de re-ejecutar):
 *   1. Categorías (una por línea de producto)
 *   2. Unidades de medida (RLL, PZ, KG, UND, M2, CJ, PQ, LT)
 *   3. Productos (con peso/dimensiones de PESOMEDORIG en atributosTecnicos)
 *   4. Stock inicial en la sede-almacén "Chacra Cerro" (ProductoStock + MovimientoKardex INGRESO)
 *   5. Recetas de producción (BOM) de PROD INTERM
 *
 * Limpieza de datos automática:
 *   · Stock guardado como fecha por Excel (formato yyyy.m) → se recupera año+mes/10.
 *   · Números como texto ("428.15", "4,80") → parseados.
 *   · Códigos normalizados a MAYÚSCULAS (evita duplicados ANEG/Aneg).
 *   Todo lo dudoso se vuelca a un REPORTE markdown para revisión manual.
 *
 * Precios: el Excel no trae precios → se cargan en 0 (gravado IGV '10'), a
 * completar luego desde el ERP. El objetivo aquí es catálogo + inventario.
 *
 * Uso:  npx ts-node -r tsconfig-paths/register src/scripts/import-kaiser-catalog.ts [ruta_excel]
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as os from 'os';

const prisma = new PrismaClient();

const EXCEL_PATH =
  process.argv[2] ||
  join(os.homedir(), 'Downloads', 'STOCK ALMACEN CHACRA CERRO.xlsx');

// ─── Configuración de mapeo ──────────────────────────────────────────────────
const CATEGORIAS: Record<string, string> = {
  ALAMB: 'Alambres y derivados',
  REJA: 'Reja de acero',
  'MALLA MET': 'Malla metálica',
  'MALLA PLAST': 'Malla plástica',
  OTROS: 'Otros y accesorios',
};

// Hojas de stock: fila de encabezado (0-based) y columnas (code, desc, und, stock, obsDesde)
const HOJAS_STOCK: Record<
  string,
  { header: number; code: number; desc: number; und: number; stock: number; obs: number }
> = {
  ALAMB: { header: 1, code: 0, desc: 1, und: 2, stock: 3, obs: 4 },
  REJA: { header: 1, code: 0, desc: 1, und: 2, stock: 3, obs: 4 },
  'MALLA MET': { header: 1, code: 0, desc: 1, und: 2, stock: 3, obs: 4 },
  'MALLA PLAST': { header: 1, code: 0, desc: 1, und: 2, stock: 3, obs: 4 },
  OTROS: { header: 1, code: 0, desc: 1, und: 2, stock: 3, obs: 4 },
};

// Unidades del Excel → catálogo interno (codigo, nombre). PZA se colapsa en PZ.
const UNIDADES: Record<string, { codigo: string; nombre: string }> = {
  RLL: { codigo: 'RLL', nombre: 'ROLLO' },
  PZ: { codigo: 'PZ', nombre: 'PIEZA' },
  PZA: { codigo: 'PZ', nombre: 'PIEZA' },
  KG: { codigo: 'KG', nombre: 'KILOGRAMO' },
  UND: { codigo: 'UND', nombre: 'UNIDAD' },
  M2: { codigo: 'M2', nombre: 'METRO CUADRADO' },
  CJ: { codigo: 'CJ', nombre: 'CAJA' },
  PQ: { codigo: 'PQ', nombre: 'PAQUETE' },
  LT: { codigo: 'LT', nombre: 'LITRO' },
};
const UNIDAD_DEFECTO = { codigo: 'UND', nombre: 'UNIDAD' };

// ─── Reporte de incidencias ──────────────────────────────────────────────────
type Incidencia = { hoja: string; codigo: string; tipo: string; detalle: string };
const reporte: Incidencia[] = [];
const rep = (hoja: string, codigo: string, tipo: string, detalle: string) =>
  reporte.push({ hoja, codigo, tipo, detalle });

// ─── Helpers de limpieza ─────────────────────────────────────────────────────
const norm = (v: unknown): string => (v == null ? '' : String(v).trim());
const normCode = (v: unknown): string => norm(v).toUpperCase().replace(/\s+/g, '');

/** Convierte una celda XLSX a número, recuperando el bug "stock como fecha". */
function parseStock(
  cell: XLSX.CellObject | undefined,
): { value: number; recovered: boolean } | null {
  if (!cell || cell.v == null) return null;
  // Fecha (bug de Excel con formato yyyy.m → el usuario escribió "año.mes")
  if (cell.v instanceof Date) {
    const z = String(cell.z || '');
    const w = String(cell.w || '');
    if (/^\d+(\.\d+)?$/.test(w)) return { value: parseFloat(w), recovered: true };
    if (/yyyy/i.test(z)) {
      const d = cell.v;
      const frac = /\.mm/i.test(z) ? (d.getMonth() + 1) / 100 : (d.getMonth() + 1) / 10;
      return { value: d.getFullYear() + frac, recovered: true };
    }
    return null;
  }
  if (typeof cell.v === 'number') return { value: cell.v, recovered: false };
  // Texto: "428.15", "4,80", "2,481.50"
  const raw = norm(cell.v);
  const cleaned = raw.replace(/[^0-9.,-]/g, '');
  if (!cleaned) return null;
  // heurística coma decimal vs miles
  let s = cleaned;
  if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : { value: n, recovered: false };
}

/** Extrae el primer número de un texto ("cajax 25 und= 4,80 kg" → 4.80 con 2° match). */
function firstNumber(v: unknown): number | null {
  const m = norm(v).replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// Lee una hoja como matriz de CellObject (para acceder a .w/.z/.v)
function sheetCell(ws: XLSX.WorkSheet, r: number, c: number): XLSX.CellObject | undefined {
  const addr = XLSX.utils.encode_cell({ r, c });
  return ws[addr] as XLSX.CellObject | undefined;
}
function sheetRange(ws: XLSX.WorkSheet): XLSX.Range {
  return XLSX.utils.decode_range(ws['!ref'] || 'A1');
}

// ─── Estado compartido ───────────────────────────────────────────────────────
let empresaId: number;
let sedeAlmacenId: number;
const unidadIdPorCodigo = new Map<string, number>();
const categoriaIdPorNombre = new Map<string, number>();
const pesoMedPorCodigo = new Map<
  string,
  { peso: number | null; largo: number | null; ancho: number | null; alto: number | null; volumen: number | null; obs: string }
>();

// Ubicación física del stock dentro de la sede (se guarda en ProductoStock.ubicacion).
const UBICACION_STOCK = 'Chacra Cerro';

async function ensureEmpresaYSede() {
  const empresa = await prisma.empresa.findFirst({
    where: { OR: [{ razonSocial: { contains: 'KAISER', mode: 'insensitive' } }] },
    orderBy: { id: 'asc' },
  });
  if (!empresa) throw new Error('No se encontró la empresa KAISER. Corre el seed primero.');
  empresaId = empresa.id;

  // Kaiser opera por ahora con una sola sede (Comercial cotiza; el stock físico
  // vive en el almacén Chacra Cerro, guardado como `ubicacion` del stock). Por eso
  // el inventario se carga en la SEDE PRINCIPAL para que Comercial pueda cotizar
  // sin fricción. Si en el futuro separan almacenes (MP vs producto terminado),
  // aquí se puede resolver otra sede.
  const sede =
    (await prisma.sede.findFirst({ where: { empresaId, esPrincipal: true } })) ||
    (await prisma.sede.findFirst({ where: { empresaId }, orderBy: { id: 'asc' } }));
  if (!sede) throw new Error('La empresa KAISER no tiene sedes. Corre el seed primero.');
  sedeAlmacenId = sede.id;
  console.log(`   🏬 Cargando stock en sede: ${sede.nombre} (id ${sede.id}) · ubicación "${UBICACION_STOCK}"`);
}

async function ensureUnidades() {
  const distintas = new Map<string, string>();
  for (const { codigo, nombre } of Object.values(UNIDADES)) distintas.set(codigo, nombre);
  distintas.set(UNIDAD_DEFECTO.codigo, UNIDAD_DEFECTO.nombre);
  for (const [codigo, nombre] of distintas) {
    const um = await prisma.unidadMedida.upsert({
      where: { codigo },
      update: {},
      create: { codigo, nombre },
    });
    unidadIdPorCodigo.set(codigo, um.id);
  }
}

async function ensureCategoria(nombre: string): Promise<number> {
  if (categoriaIdPorNombre.has(nombre)) return categoriaIdPorNombre.get(nombre)!;
  let cat = await prisma.categoria.findFirst({ where: { empresaId, nombre } });
  if (!cat) cat = await prisma.categoria.create({ data: { empresaId, nombre } });
  categoriaIdPorNombre.set(nombre, cat.id);
  return cat.id;
}

function unidadId(undTexto: string): number {
  const key = norm(undTexto).toUpperCase();
  const map = UNIDADES[key] || UNIDAD_DEFECTO;
  return unidadIdPorCodigo.get(map.codigo) || unidadIdPorCodigo.get(UNIDAD_DEFECTO.codigo)!;
}

// ─── PESOMEDORIG: maestro de peso y medidas ──────────────────────────────────
function cargarPesoMedidas(wb: XLSX.WorkBook) {
  const ws = wb.Sheets['PESOMEDORIG'];
  if (!ws) return;
  const rng = sheetRange(ws);
  for (let r = 1; r <= rng.e.r; r++) {
    const code = normCode(sheetCell(ws, r, 1)?.v);
    if (!code) continue;
    const peso = firstNumber(sheetCell(ws, r, 4)?.v);
    const largo = firstNumber(sheetCell(ws, r, 5)?.w ?? sheetCell(ws, r, 5)?.v);
    const ancho = firstNumber(sheetCell(ws, r, 6)?.w ?? sheetCell(ws, r, 6)?.v);
    const alto = firstNumber(sheetCell(ws, r, 7)?.w ?? sheetCell(ws, r, 7)?.v);
    const volumen = firstNumber(sheetCell(ws, r, 8)?.w ?? sheetCell(ws, r, 8)?.v);
    const obs = norm(sheetCell(ws, r, 9)?.v);
    pesoMedPorCodigo.set(code, { peso, largo, ancho, alto, volumen, obs });
  }
  console.log(`   📐 PESOMEDORIG: ${pesoMedPorCodigo.size} códigos con peso/medidas`);
}

// ─── Upsert de un producto + stock en la sede almacén ────────────────────────
async function upsertProducto(opts: {
  hoja: string;
  codigo: string;
  descripcion: string;
  undTexto: string;
  categoriaNombre: string;
  stock: number | null;
}) {
  const codigo = normCode(opts.codigo);
  const pm = pesoMedPorCodigo.get(codigo);
  const atributos: Prisma.InputJsonValue = {
    ...(pm?.largo != null ? { largo_cm: pm.largo } : {}),
    ...(pm?.ancho != null ? { ancho_cm: pm.ancho } : {}),
    ...(pm?.alto != null ? { alto_cm: pm.alto } : {}),
    ...(pm?.volumen != null ? { volumen_m3: pm.volumen } : {}),
    fuente: 'STOCK ALMACEN CHACRA CERRO.xlsx',
  };
  const categoriaId = await ensureCategoria(opts.categoriaNombre);
  const data = {
    descripcion: opts.descripcion,
    categoriaId,
    unidadMedidaId: unidadId(opts.undTexto),
    // El SKU de Kaiser también es su código de barras: se puebla `codigoBarras`
    // con el mismo código para que el lector/búsqueda por código de barras (POS,
    // cotizador) encuentre el producto.
    codigoBarras: codigo,
    tipoAfectacionIGV: '10',
    precioUnitario: new Prisma.Decimal(0),
    valorUnitario: new Prisma.Decimal(0),
    moneda: 'PEN',
    pesoGramos: pm?.peso != null ? new Prisma.Decimal(pm.peso * 1000) : null,
    atributosTecnicos: atributos,
    publicarEnTienda: false,
    estado: 'ACTIVO' as const,
  };
  const prod = await prisma.producto.upsert({
    where: { empresaId_codigo: { empresaId, codigo } },
    update: data,
    create: { empresaId, codigo, ...data },
  });

  // Stock en la sede almacén (fuente de verdad multi-sede) + espejo en producto.stock
  const stockVal = opts.stock == null ? 0 : opts.stock;
  await prisma.productoStock.upsert({
    where: { productoId_sedeId: { productoId: prod.id, sedeId: sedeAlmacenId } },
    update: { stock: new Prisma.Decimal(stockVal), ubicacion: UBICACION_STOCK },
    create: {
      productoId: prod.id,
      sedeId: sedeAlmacenId,
      stock: new Prisma.Decimal(stockVal),
      ubicacion: UBICACION_STOCK,
    },
  });
  await prisma.producto.update({ where: { id: prod.id }, data: { stock: new Prisma.Decimal(stockVal) } });

  // Movimiento de kardex de inventario inicial (idempotente: solo si no existe ya uno de este concepto)
  if (stockVal > 0) {
    const yaCargado = await prisma.movimientoKardex.findFirst({
      where: { productoId: prod.id, sedeId: sedeAlmacenId, concepto: 'Inventario inicial (import Excel)' },
    });
    if (!yaCargado) {
      await prisma.movimientoKardex.create({
        data: {
          productoId: prod.id,
          empresaId,
          sedeId: sedeAlmacenId,
          tipoMovimiento: 'INGRESO',
          concepto: 'Inventario inicial (import Excel)',
          cantidad: new Prisma.Decimal(stockVal),
          stockAnterior: new Prisma.Decimal(0),
          stockActual: new Prisma.Decimal(stockVal),
          observacion: 'Carga inicial desde STOCK ALMACEN CHACRA CERRO.xlsx',
        },
      });
    }
  }
  return prod.id;
}

// ─── Importar hojas de stock ─────────────────────────────────────────────────
async function importarStock(wb: XLSX.WorkBook) {
  let total = 0;
  for (const [hoja, cfg] of Object.entries(HOJAS_STOCK)) {
    const ws = wb.Sheets[hoja];
    if (!ws) { rep(hoja, '-', 'hoja-faltante', 'No existe la hoja'); continue; }
    const rng = sheetRange(ws);
    let n = 0;
    for (let r = cfg.header + 1; r <= rng.e.r; r++) {
      const codigo = normCode(sheetCell(ws, r, cfg.code)?.v);
      const desc = norm(sheetCell(ws, r, cfg.desc)?.v);
      if (!codigo || !desc) continue;
      // código legacy fuera de patrón [5 dígitos][4 letras][seq]
      if (!/^\d{5}[A-Z]{4}\d{3,4}$/.test(codigo)) {
        rep(hoja, codigo, 'codigo-no-estandar', `desc="${desc}"`);
      }
      const undTexto = norm(sheetCell(ws, r, cfg.und)?.v) || UNIDAD_DEFECTO.codigo;
      const st = parseStock(sheetCell(ws, r, cfg.stock));
      if (st?.recovered) rep(hoja, codigo, 'stock-recuperado-de-fecha', `stock=${st.value}`);
      if (st == null) rep(hoja, codigo, 'stock-vacio', `desc="${desc}"`);
      else if (st.value === 0) rep(hoja, codigo, 'stock-cero', `desc="${desc}"`);
      await upsertProducto({
        hoja,
        codigo,
        descripcion: desc,
        undTexto,
        categoriaNombre: CATEGORIAS[hoja],
        stock: st?.value ?? null,
      });
      n++; total++;
    }
    console.log(`   📦 ${hoja}: ${n} productos`);
  }
  return total;
}

// ─── PROD INTERM: recetas de producción (BOM) ────────────────────────────────
async function importarRecetas(wb: XLSX.WorkBook) {
  const ws = wb.Sheets['PROD INTERM'];
  if (!ws) return 0;
  const rng = sheetRange(ws);
  const CAT_FAB = 'Productos fabricados';
  const CAT_COMP = 'Componentes e insumos';

  type Comp = { codigo: string; texto: string; cantidad: number; pesoUnit: number | null };
  type Bloque = { codigo: string; nombre: string; inventario: number | null; comps: Comp[] };
  const bloques: Bloque[] = [];
  let actual: Bloque | null = null;

  for (let r = 0; r <= rng.e.r; r++) {
    const c0 = norm(sheetCell(ws, r, 0)?.v); // N°
    const cod = normCode(sheetCell(ws, r, 1)?.v);
    const prod = norm(sheetCell(ws, r, 2)?.v);
    if (c0.toUpperCase() === 'N°' || prod.toUpperCase() === 'PRODUCTO') continue; // header repetido
    const esFinal = /^\d+(\.\d+)?$/.test(c0) && cod && prod;
    if (esFinal) {
      actual = {
        codigo: cod,
        nombre: prod.replace(/,?\s*compuesto por:?\s*$/i, '').trim(),
        inventario: firstNumber(sheetCell(ws, r, 4)?.v),
        comps: [],
      };
      bloques.push(actual);
    } else if (actual && cod && prod) {
      // componente de la receta en curso
      actual.comps.push({
        codigo: cod,
        texto: prod,
        cantidad: firstNumber(prod) ?? 1,
        pesoUnit: firstNumber(sheetCell(ws, r, 5)?.v),
      });
    } else if (actual && !cod && prod && /fierro|plancha|magnelis|a36/i.test(prod)) {
      rep('PROD INTERM', actual.codigo, 'insumo-sin-codigo', prod);
    }
  }

  let creadas = 0;
  for (const b of bloques) {
    try {
      // producto final
      const finalId = await upsertProducto({
        hoja: 'PROD INTERM',
        codigo: b.codigo,
        descripcion: b.nombre || b.codigo,
        undTexto: 'UND',
        categoriaNombre: CAT_FAB,
        stock: b.inventario,
      });
      // componentes → asegurar producto insumo
      const compIds: { id: number; cantidad: number; orden: number }[] = [];
      let orden = 0;
      for (const comp of b.comps) {
        const insumoId = await upsertProducto({
          hoja: 'PROD INTERM',
          codigo: comp.codigo,
          descripcion: comp.texto,
          undTexto: 'UND',
          categoriaNombre: CAT_COMP,
          stock: null,
        });
        compIds.push({ id: insumoId, cantidad: comp.cantidad, orden: orden++ });
      }
      if (compIds.length === 0) {
        rep('PROD INTERM', b.codigo, 'receta-sin-componentes', b.nombre);
        continue;
      }
      // receta (idempotente por empresaId+codigo+version)
      const receta = await prisma.recetaProduccion.upsert({
        where: { empresaId_codigo_version: { empresaId, codigo: b.codigo, version: 1 } },
        update: { nombre: b.nombre || b.codigo, productoFinalId: finalId },
        create: {
          empresaId,
          productoFinalId: finalId,
          codigo: b.codigo,
          nombre: b.nombre || b.codigo,
          version: 1,
          rendimientoObjetivo: new Prisma.Decimal(1),
          unidadRendimiento: 'UND',
          observaciones: 'Importado de PROD INTERM (revisar cantidades/mermas)',
        },
      });
      // limpiar componentes previos y recrear
      await prisma.recetaComponente.deleteMany({ where: { recetaId: receta.id } });
      for (const c of compIds) {
        await prisma.recetaComponente.create({
          data: {
            recetaId: receta.id,
            productoInsumoId: c.id,
            orden: c.orden,
            cantidadBase: new Prisma.Decimal(c.cantidad),
            unidadBase: 'UND',
          },
        });
      }
      creadas++;
    } catch (e: any) {
      rep('PROD INTERM', b.codigo, 'receta-error', e?.message || String(e));
    }
  }
  console.log(`   🏭 PROD INTERM: ${creadas} recetas (BOM)`);
  return creadas;
}

// ─── PROX IMPO: asegurar productos en catálogo + reporte ─────────────────────
async function importarProxImpo(wb: XLSX.WorkBook) {
  const ws = wb.Sheets['PROX IMPO'];
  if (!ws) return 0;
  const rng = sheetRange(ws);
  let n = 0;
  for (let r = 1; r <= rng.e.r; r++) {
    const codigo = normCode(sheetCell(ws, r, 1)?.v);
    const desc = norm(sheetCell(ws, r, 2)?.v);
    if (!codigo || !desc || codigo === 'MUESTRA') continue;
    const cant = firstNumber(sheetCell(ws, r, 3)?.v);
    const und = norm(sheetCell(ws, r, 4)?.v) || 'UND';
    const eta = norm(sheetCell(ws, r, 5)?.w ?? sheetCell(ws, r, 5)?.v);
    // asegurar en catálogo (stock 0 — aún no llega al almacén)
    if (/^\d{5}[A-Z]{4}\d{3,4}$/.test(codigo)) {
      const existe = await prisma.producto.findUnique({
        where: { empresaId_codigo: { empresaId, codigo } },
      });
      if (!existe) {
        await upsertProducto({
          hoja: 'PROX IMPO',
          codigo,
          descripcion: desc,
          undTexto: und,
          categoriaNombre: 'Malla plástica',
          stock: 0,
        });
      }
    }
    rep('PROX IMPO', codigo, 'en-importacion', `cant=${cant ?? '?'} ${und} · ETA ${eta || '?'}`);
    n++;
  }
  console.log(`   🚢 PROX IMPO: ${n} items en tránsito (ver reporte)`);
  return n;
}

// ─── Reporte markdown ────────────────────────────────────────────────────────
function escribirReporte() {
  const porTipo = reporte.reduce<Record<string, Incidencia[]>>((acc, i) => {
    (acc[i.tipo] ||= []).push(i);
    return acc;
  }, {});
  let md = `# Reporte de importación — Kaiser catálogo\n\nGenerado: ${new Date().toISOString()}\nFuente: ${EXCEL_PATH}\n\n`;
  md += `## Resumen\n\n| Tipo de incidencia | Cantidad |\n|---|---|\n`;
  for (const [tipo, arr] of Object.entries(porTipo)) md += `| ${tipo} | ${arr.length} |\n`;
  md += `\n`;
  for (const [tipo, arr] of Object.entries(porTipo)) {
    md += `## ${tipo} (${arr.length})\n\n| Hoja | Código | Detalle |\n|---|---|---|\n`;
    for (const i of arr) md += `| ${i.hoja} | ${i.codigo} | ${i.detalle.replace(/\|/g, '\\|')} |\n`;
    md += `\n`;
  }
  const out = join(process.cwd(), 'import-kaiser-report.md');
  writeFileSync(out, md, 'utf8');
  console.log(`\n📄 Reporte escrito en: ${out}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Importando catálogo Kaiser desde:\n   ${EXCEL_PATH}\n`);
  if (!existsSync(EXCEL_PATH)) throw new Error(`No se encontró el archivo: ${EXCEL_PATH}`);
  const wb = XLSX.readFile(EXCEL_PATH, { cellDates: true, cellNF: true, cellText: true });

  await ensureEmpresaYSede();
  await ensureUnidades();
  cargarPesoMedidas(wb);

  const nStock = await importarStock(wb);
  const nRecetas = await importarRecetas(wb);
  const nImpo = await importarProxImpo(wb);
  escribirReporte();

  console.log(`\n✅ Importación completa:`);
  console.log(`   • ${nStock} productos de stock`);
  console.log(`   • ${nRecetas} recetas de producción`);
  console.log(`   • ${nImpo} items en importación`);
  console.log(`   • ${reporte.length} incidencias en el reporte\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error en la importación:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
