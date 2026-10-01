/**
 * Genera el Excel de plantillas que se le entrega a Kaiser para que su equipo
 * (o el proveedor de P&P) exporte el histórico con el formato correcto.
 *
 * Sale del mismo `esquema.ts` que usa el validador, así que la plantilla y lo
 * que el migrador acepta nunca se desincronizan.
 *
 * Cada pestaña trae:
 *   · Los encabezados exactos que el migrador espera.
 *   · Una o dos filas de ejemplo (se borran antes de llenar).
 * Y hay una pestaña INSTRUCCIONES con el significado de cada columna.
 *
 * Uso:  npx ts-node -r tsconfig-paths/register src/migracion/generar-plantillas.ts [carpeta_destino]
 */
import * as XLSX from 'xlsx';
import { join } from 'path';
import { ESQUEMA } from './esquema';

const DESTINO = process.argv[2] || process.cwd();
const NOMBRE = 'PLANTILLAS-MIGRACION-KAISER.xlsx';

function hojaInstrucciones(): XLSX.WorkSheet {
  const filas: (string | number)[][] = [];
  const sep = () => filas.push(['', '', '', '', '']);

  filas.push(['MIGRACIÓN DEL HISTÓRICO — KAISER CORPORATION S.A.']);
  sep();
  filas.push(['Cómo usar este archivo']);
  filas.push([
    '1.',
    'Llena una pestaña por cada tipo de información que quieras migrar.',
  ]);
  filas.push([
    '2.',
    'No cambies los nombres de las columnas ni el orden de las pestañas.',
  ]);
  filas.push([
    '3.',
    'Borra las filas de EJEMPLO antes de entregar el archivo.',
  ]);
  filas.push([
    '4.',
    'Las fechas van como AAAA-MM-DD (por ejemplo 2026-08-14).',
  ]);
  filas.push([
    '5.',
    'Los importes van con punto decimal y sin símbolo de moneda.',
  ]);
  filas.push([
    '6.',
    'Si una pestaña marcada como OPCIONAL no se puede exportar, déjala vacía.',
  ]);
  sep();
  filas.push([
    'Se valida el archivo antes de cargar nada. Si algo está mal, se devuelve',
  ]);
  filas.push([
    'la lista exacta de fila y columna a corregir, y no se escribe en el sistema.',
  ]);
  sep();
  sep();

  for (const h of ESQUEMA) {
    filas.push([`PESTAÑA: ${h.hoja}`, h.opcional ? 'OPCIONAL' : 'OBLIGATORIA']);
    filas.push([h.titulo]);
    filas.push([h.descripcion]);
    filas.push([`Identificador (no se duplica): ${h.clave.join(' + ')}`]);
    sep();
    filas.push(['Columna', '¿Obligatoria?', 'Tipo', 'Qué va aquí', 'Ejemplo']);
    for (const c of h.columnas) {
      filas.push([
        c.nombre,
        c.requerida ? 'Sí' : 'No',
        c.valores ? c.valores.join(' / ') : c.tipo,
        c.ayuda,
        c.ejemplo,
      ]);
    }
    sep();
    sep();
  }

  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 14 },
    { wch: 30 },
    { wch: 74 },
    { wch: 34 },
  ];
  return ws;
}

function hojaDeDatos(h: (typeof ESQUEMA)[number]): XLSX.WorkSheet {
  const encabezados = h.columnas.map((c) => c.nombre);
  const filas = h.ejemplos.map((e) =>
    encabezados.map((k) => (e as any)[k] ?? ''),
  );
  // Una fila que grita "bórrame", para que nadie la deje por accidente.
  const marca = encabezados.map((_, i) =>
    i === 0 ? '↑ EJEMPLO — BORRAR ESTAS FILAS ↑' : '',
  );
  const ws = XLSX.utils.aoa_to_sheet([encabezados, ...filas, marca]);
  ws['!cols'] = h.columnas.map((c) => ({
    wch: Math.max(c.nombre.length + 2, 16),
  }));
  return ws;
}

function main() {
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hojaInstrucciones(), 'INSTRUCCIONES');
  for (const h of ESQUEMA) {
    XLSX.utils.book_append_sheet(libro, hojaDeDatos(h), h.hoja);
  }

  const ruta = join(DESTINO, NOMBRE);
  XLSX.writeFile(libro, ruta);

  const obligatorias = ESQUEMA.filter((h) => !h.opcional).length;
  console.log(`\n✔ Plantillas generadas: ${ruta}`);
  console.log(
    `  ${ESQUEMA.length} pestañas (${obligatorias} obligatorias) + INSTRUCCIONES`,
  );
  console.log(
    `  ${ESQUEMA.reduce((a, h) => a + h.columnas.length, 0)} columnas documentadas\n`,
  );
}

main();
