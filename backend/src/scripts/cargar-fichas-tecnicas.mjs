/**
 * Carga masiva de fichas técnicas (y certificados o manuales) desde una carpeta.
 *
 * Por qué existe: el ERP sube los documentos de producto de uno en uno desde la
 * pantalla del producto. Kaiser tiene 407 productos; hacerlo a mano no es
 * viable. Este script empareja cada PDF de una carpeta con su producto y lo
 * sube por el endpoint real (`POST /productos/:id/documentos`), el mismo que
 * usa la interfaz.
 *
 * El emparejamiento va por el NOMBRE DEL ARCHIVO, en este orden:
 *   1. Código exacto del producto           20510GACC0004.pdf
 *   2. Código en cualquier parte del nombre  FICHA 20510GACC0004 rev2.pdf
 *   3. Descripción normalizada (sin tildes, sin signos, sin dobles espacios)
 *      ALAMBRE GALV 3Z ACC 3.00 MM.pdf
 *
 * Lo que NO hace: inventarse el contenido. Los PDFs los pone Kaiser. Si falta
 * la ficha de un producto, sale en el informe como pendiente.
 *
 * Uso:
 *   node src/scripts/cargar-fichas-tecnicas.mjs <carpeta> [opciones]
 *
 *   --api=http://localhost:4201/api   API destino
 *   --usuario=... --clave=...         credenciales (por defecto, gerencia)
 *   --tipo=FICHA_TECNICA              FICHA_TECNICA | CERTIFICADO | MANUAL | OTRO
 *   --dry-run                         solo informa, no sube nada
 *   --forzar                          vuelve a subir aunque ya exista
 *
 * Conviene correrlo primero con --dry-run: enseña qué archivo va a qué producto
 * y cuáles no encuentran dueño, sin tocar nada.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

const args = process.argv.slice(2);
const carpeta = args.find((a) => !a.startsWith('--'));
const opt = (n, def = undefined) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  return a ? a.slice(n.length + 3) : def;
};
const flag = (n) => args.includes(`--${n}`);

const API = (opt('api', process.env.API_URL || 'http://localhost:4201/api')).replace(/\/$/, '');
const USUARIO = opt('usuario', process.env.KAISER_USER || 'gerencia@kaisercorp.com.pe');
const CLAVE = opt('clave', process.env.KAISER_PASS || 'kaiser123');
const TIPO = (opt('tipo', 'FICHA_TECNICA')).toUpperCase();
const DRY = flag('dry-run');
const FORZAR = flag('forzar');

const EXTENSIONES = new Set(['.pdf']);

/** Para comparar nombres: sin tildes, sin signos, en mayúsculas, sin dobles espacios. */
const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

async function api(ruta, { token, ...init } = {}) {
  const r = await fetch(`${API}${ruta}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers || {}),
    },
  });
  const texto = await r.text();
  let json;
  try { json = JSON.parse(texto); } catch { json = { raw: texto }; }
  if (!r.ok || json?.code === 0) {
    throw new Error(`${r.status} ${ruta} · ${json?.message || texto.slice(0, 160)}`);
  }
  return json?.data ?? json;
}

async function main() {
  if (!carpeta) {
    console.error('Falta la carpeta con los PDFs.\n  node src/scripts/cargar-fichas-tecnicas.mjs <carpeta> [--dry-run]');
    process.exit(1);
  }
  const info = await stat(carpeta).catch(() => null);
  if (!info?.isDirectory()) {
    console.error(`No es una carpeta: ${carpeta}`);
    process.exit(1);
  }

  const archivos = (await readdir(carpeta))
    .filter((f) => EXTENSIONES.has(extname(f).toLowerCase()))
    .sort();
  if (archivos.length === 0) {
    console.error(`No hay PDFs en ${carpeta}`);
    process.exit(1);
  }

  const { accessToken } = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: USUARIO, password: CLAVE }),
  });

  const productos = (await api('/productos?page=1&limit=5000', { token: accessToken }))?.productos ?? [];
  if (productos.length === 0) throw new Error('El catálogo vino vacío');

  const porCodigo = new Map();
  const porDescripcion = new Map();
  for (const p of productos) {
    if (p.codigo) porCodigo.set(normalizar(p.codigo), p);
    const d = normalizar(p.descripcion);
    if (d) (porDescripcion.get(d) ?? porDescripcion.set(d, []).get(d)).push(p);
  }
  // Códigos ordenados de más largo a más corto: evita que un código corto
  // casado por "contiene" gane a uno más específico.
  const codigosOrdenados = [...porCodigo.keys()].sort((a, b) => b.length - a.length);

  const emparejar = (nombreArchivo) => {
    const base = normalizar(basename(nombreArchivo, extname(nombreArchivo)));
    const exacto = porCodigo.get(base);
    if (exacto) return { producto: exacto, via: 'código exacto' };

    const sinEspacios = base.replace(/ /g, '');
    for (const cod of codigosOrdenados) {
      if (sinEspacios.includes(cod.replace(/ /g, ''))) {
        return { producto: porCodigo.get(cod), via: 'código en el nombre' };
      }
    }
    const porDesc = porDescripcion.get(base);
    if (porDesc?.length === 1) return { producto: porDesc[0], via: 'descripción' };
    if (porDesc?.length > 1) return { ambiguo: porDesc, via: 'descripción' };
    return {};
  };

  console.log(`\nCarpeta   : ${carpeta}`);
  console.log(`PDFs      : ${archivos.length}`);
  console.log(`Catálogo  : ${productos.length} productos`);
  console.log(`Tipo      : ${TIPO}${DRY ? '   (SIMULACIÓN — no se sube nada)' : ''}\n`);

  const resultado = { subidos: 0, omitidos: 0, ambiguos: [], huerfanos: [], errores: [] };

  for (const archivo of archivos) {
    const { producto, ambiguo, via } = emparejar(archivo);

    if (ambiguo) {
      resultado.ambiguos.push({ archivo, opciones: ambiguo.map((p) => p.codigo) });
      console.log(`  ?  ${archivo}  →  ambiguo: ${ambiguo.map((p) => p.codigo).join(', ')}`);
      continue;
    }
    if (!producto) {
      resultado.huerfanos.push(archivo);
      console.log(`  ✗  ${archivo}  →  sin producto`);
      continue;
    }

    const etiqueta = `${producto.codigo} · ${String(producto.descripcion).slice(0, 44)}`;

    if (!FORZAR) {
      const docs = await api(`/productos/${producto.id}/documentos`, { token: accessToken }).catch(() => []);
      const yaEsta = (Array.isArray(docs) ? docs : []).some(
        (d) => normalizar(d.nombre) === normalizar(basename(archivo, extname(archivo))) || normalizar(d.url).endsWith(normalizar(archivo)),
      );
      if (yaEsta) {
        resultado.omitidos++;
        console.log(`  =  ${archivo}  →  ${etiqueta}   (ya estaba)`);
        continue;
      }
    }

    if (DRY) {
      resultado.subidos++;
      console.log(`  ·  ${archivo}  →  ${etiqueta}   [${via}]`);
      continue;
    }

    try {
      const buffer = await readFile(join(carpeta, archivo));
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: 'application/pdf' }), archivo);
      form.append('tipo', TIPO);
      form.append('nombre', basename(archivo, extname(archivo)));
      await api(`/productos/${producto.id}/documentos`, { token: accessToken, method: 'POST', body: form });
      resultado.subidos++;
      console.log(`  ✔  ${archivo}  →  ${etiqueta}   [${via}]`);
    } catch (e) {
      resultado.errores.push({ archivo, error: e.message });
      console.log(`  !  ${archivo}  →  ${e.message}`);
    }
  }

  const conFicha = resultado.subidos + resultado.omitidos;
  console.log(`\n${DRY ? 'Se subirían' : 'Subidos'}: ${resultado.subidos} · ya estaban: ${resultado.omitidos} · ambiguos: ${resultado.ambiguos.length} · sin producto: ${resultado.huerfanos.length} · errores: ${resultado.errores.length}`);
  console.log(`Cobertura : ${conFicha} de ${productos.length} productos del catálogo\n`);

  if (resultado.huerfanos.length) {
    console.log('Sin producto (renombra el archivo con el código del producto):');
    resultado.huerfanos.forEach((f) => console.log(`   ${f}`));
    console.log('');
  }
  if (resultado.ambiguos.length) {
    console.log('Ambiguos (varios productos con la misma descripción; usa el código):');
    resultado.ambiguos.forEach((a) => console.log(`   ${a.archivo} → ${a.opciones.join(', ')}`));
    console.log('');
  }
  if (resultado.errores.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`\nFalló: ${e.message}\n`);
  process.exit(1);
});
