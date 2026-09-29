/**
 * Comprobación previa al despliegue. SOLO LEE: no escribe nada, no migra nada.
 *
 * De las cuatro migraciones pendientes, tres son aditivas y no pueden fallar
 * (ADD COLUMN con valor por defecto, CREATE TABLE nueva). La cuarta crea un índice
 * ÚNICO sobre (empresaId, tipoDoc, serie, correlativo) en `Comprobante`, y **si hay
 * duplicados el índice no se crea y el despliegue se cae a medias**. Eso es lo que
 * este script busca antes de que pase.
 *
 * Uso — apuntando a la base de PRODUCCIÓN:
 *   DATABASE_URL="<url de producción>" node src/scripts/preflight-deploy.mjs
 *
 * La URL no se imprime nunca, solo el host.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
let bloqueantes = 0, avisos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) bloqueantes++; };
const aviso = (m) => { console.log(`   ⚠ ${m}`); avisos++; };
/**
 * El preflight corre contra el esquema de producción, que es el ANTERIOR al
 * despliegue: no puede dar por hecha ninguna columna que traiga esta tanda.
 * `origenDato` fue exactamente eso y reventaba la última comprobación.
 */
async function columnaExiste(tabla, columna) {
  const r = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int n FROM information_schema.columns
     WHERE table_name = $1 AND column_name = $2`,
    tabla,
    columna,
  );
  return r[0].n > 0;
}

const uno = async (sql) => (await prisma.$queryRawUnsafe(sql))[0];

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  const host = (url.match(/@([^:/?]+)/) ?? [])[1] ?? '(desconocido)';
  const base = (url.match(/\/([^/?]+)(\?|$)/) ?? [])[1] ?? '(desconocida)';
  console.log(`Comprobación previa al despliegue · host ${host} · base ${base}`);
  console.log('Solo lectura: este script no escribe nada.\n');

  // ── 1. Lo que puede tumbar el despliegue ────────────────────────────────
  console.log('1) BLOQUEANTE: el índice único de correlativos');
  const dups = await prisma.$queryRawUnsafe(`
    SELECT "empresaId", "tipoDoc", serie, correlativo, COUNT(*)::int n
    FROM "Comprobante" GROUP BY 1,2,3,4 HAVING COUNT(*) > 1
    ORDER BY n DESC LIMIT 20`);
  ok(dups.length === 0,
    `comprobantes con número repetido: ${dups.length}` +
      (dups.length ? ' — HAY QUE RESOLVERLOS ANTES DE DESPLEGAR' : ''));
  for (const d of dups) {
    console.log(`      ${d.serie}-${String(d.correlativo).padStart(8, '0')} (${d.tipoDoc}) aparece ${d.n} veces`);
  }
  if (dups.length) {
    console.log('\n      Cada grupo hay que dejarlo en uno: revisa cuál es el válido');
    console.log('      (el que tiene CDR de SUNAT) y da de baja o renumera los demás.');
    console.log('      El despliegue sin esto deja la base a medio migrar.');
  }

  // Con `uno(...)`, no con `$queryRawUnsafe` a secas: eso devuelve un array y
  // `array.n` es undefined, así que la comprobación se saltaba en silencio. En un
  // preflight, una comprobación que no se ejecuta es peor que no tenerla.
  const yaExiste = await uno(`
    SELECT COUNT(*)::int n FROM pg_indexes
    WHERE tablename = 'Comprobante' AND indexname LIKE '%correlativo%'`);
  if (yaExiste.n > 0) {
    aviso('el índice único ya existe en esta base: esa migración no hará nada');
  } else {
    ok(true, 'el índice aún no existe: la migración lo creará');
  }

  // ── 2. El estado en el que se va a desplegar ────────────────────────────
  console.log('\n2) Con qué se va a encontrar el despliegue');
  const c = await uno(`SELECT COUNT(*)::int n FROM "Comprobante"`);
  const k = await uno(`SELECT COUNT(*)::int n FROM "MovimientoKardex"`);
  const pr = await uno(`SELECT COUNT(*)::int n FROM "Producto"`);
  const co = await uno(`SELECT COUNT(*)::int n FROM "Compra"`);
  console.log(`   ${c.n} comprobantes · ${k.n} movimientos de kardex · ${pr.n} productos · ${co.n} compras`);

  // ── 3. Lo que los arreglos van a cambiar en pantalla ────────────────────
  console.log('\n3) Lo que las cifras van a cambiar (para que no sorprenda)');
  const igv = await uno(`
    SELECT COALESCE(SUM("mtoImpVenta"),0)::float con,
           COALESCE(SUM("mtoOperGravadas" + COALESCE("mtoOperExoneradas",0) + COALESCE("mtoOperInafectas",0) + COALESCE("mtoOperExportacion",0)),0)::float sin
    FROM "Comprobante" WHERE "tipoDoc" NOT IN ('COT','07') AND "estadoEnvioSunat" <> 'ANULADO'`);
  const dif = igv.con - igv.sin;
  console.log(`   Las ventas históricas pasarán de S/ ${igv.con.toLocaleString('es-PE',{minimumFractionDigits:2})} (con IGV)`);
  console.log(`   a S/ ${igv.sin.toLocaleString('es-PE',{minimumFractionDigits:2})} (netas): S/ ${dif.toLocaleString('es-PE',{minimumFractionDigits:2})} menos.`);
  console.log('   No se pierde dinero: el P&L, el dashboard y el reporte dejan de contar el');
  console.log('   IGV como ingreso. Conviene avisar a quien mire esas pantallas.');

  // ── 4. Descuadres que conviene conocer antes, no después ────────────────
  console.log('\n4) Descuadres existentes (no bloquean, pero los verás al entrar)');
  const desc = await uno(`
    WITH ultimo AS (
      SELECT DISTINCT ON (m."productoId", m."sedeId") m."productoId", m."sedeId", m."stockActual"
      FROM "MovimientoKardex" m ORDER BY m."productoId", m."sedeId", m.fecha DESC, m.id DESC
    )
    SELECT COUNT(*)::int n FROM "ProductoStock" ps JOIN ultimo u
      ON u."productoId" = ps."productoId" AND u."sedeId" = ps."sedeId"
    WHERE ABS(ps.stock - u."stockActual") > 0.001`);
  if (desc.n) aviso(`${desc.n} producto/sede con el stock distinto de su kardex · los lista y corrige \`cuadres:corregir\``);
  else ok(true, 'el stock coincide con el kardex en todas las sedes');

  const glob = await uno(`
    SELECT COUNT(*)::int n FROM "Producto" pr
    LEFT JOIN (SELECT "productoId", SUM(stock) s FROM "ProductoStock" GROUP BY 1) t ON t."productoId" = pr.id
    WHERE ABS(pr.stock - COALESCE(t.s,0)) > 0.001`);
  if (glob.n) aviso(`${glob.n} productos con el stock global descuadrado · lo recalcula \`cuadres:corregir\``);
  else ok(true, 'el stock global coincide con la suma de las sedes');

  // Lo migrado del sistema anterior no trae kardex a propósito, y se reconoce
  // por `origenDato` — que en una base sin desplegar todavía no existe.
  const filtraMigrado = (await columnaExiste('Comprobante', 'origenDato'))
    ? `AND COALESCE(c."origenDato",'') NOT ILIKE '%migracion%'`
    : '';
  const ventasSinKardex = await uno(`
    SELECT COUNT(*)::int n FROM "Comprobante" c
    WHERE c."tipoDoc" NOT IN ('COT','07') AND c."estadoEnvioSunat" <> 'ANULADO'
      AND EXISTS (SELECT 1 FROM "DetalleComprobante" d WHERE d."comprobanteId" = c.id AND d."productoId" IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM "MovimientoKardex" m WHERE m."comprobanteId" = c.id)
      AND c."comprobanteOrigenId" IS NULL
      ${filtraMigrado}`);
  if (!filtraMigrado) {
    aviso('sin la columna `origenDato` no se puede descontar lo migrado: la cifra de arriba puede incluirlo');
  }
  if (ventasSinKardex.n) aviso(`${ventasSinKardex.n} ventas sin movimiento de kardex · las registra \`cuadres:corregir\``);
  else ok(true, 'todas las ventas dejaron movimiento de kardex');

  console.log('');
  if (bloqueantes) {
    console.log(`✘ NO DESPLEGAR: ${bloqueantes} problema(s) bloqueante(s).`);
  } else {
    console.log(`✔ Sin bloqueantes${avisos ? ` · ${avisos} aviso(s) que conviene mirar` : ''}.`);
    console.log('  El despliegue puede aplicar las cuatro migraciones.');
  }
  await prisma.$disconnect();
  process.exit(bloqueantes ? 1 : 0);
}
main().catch(async (e) => { console.error('✘', e.message); await prisma.$disconnect().catch(() => {}); process.exit(1); });
