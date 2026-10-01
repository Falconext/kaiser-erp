/**
 * Lectura y validación de los archivos de migración.
 *
 * Separado del importador a propósito: permite correr la migración en seco
 * (`--dry-run`) y entregarle a Kaiser la lista exacta de lo que hay que
 * corregir ANTES de tocar la base de datos. En una migración real, este paso
 * se repite varias veces hasta que el archivo sale limpio.
 */
import * as XLSX from 'xlsx';
import { Columna, Hoja, ESQUEMA } from './esquema';

export interface ErrorFila {
  hoja: string;
  /** Número de fila tal como se ve en Excel (1 = encabezados). */
  fila: number;
  columna: string;
  valor: string;
  motivo: string;
}

export interface HojaLeida {
  hoja: Hoja;
  filas: Record<string, any>[];
  /** Fila de Excel de cada elemento de `filas`, para poder señalar el error. */
  numerosDeFila: number[];
  errores: ErrorFila[];
  ausente: boolean;
}

/** Quita tildes y espacios para comparar encabezados con tolerancia. */
const normalizar = (s: unknown): string =>
  String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_');

/**
 * Excel devuelve las fechas como número de serie o como texto en cualquier
 * formato. Se aceptan AAAA-MM-DD, DD/MM/AAAA y el serial de Excel.
 */
export function parsearFecha(valor: unknown): Date | null {
  if (valor == null || valor === '') return null;
  if (valor instanceof Date) return isNaN(valor.getTime()) ? null : valor;

  if (typeof valor === 'number' && valor > 0) {
    // Serial de Excel: días desde 1899-12-30.
    const ms = Math.round((valor - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  const t = String(valor).trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1], 12));
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

/** Acepta "1,234.56", "1234,56" y números ya tipados. */
export function parsearNumero(valor: unknown): number | null {
  if (valor == null || valor === '') return null;
  if (typeof valor === 'number') return isFinite(valor) ? valor : null;
  let t = String(valor).trim().replace(/\s/g, '');
  if (t.includes(',') && t.includes('.')) t = t.replace(/,/g, '');
  else if (t.includes(',') && !t.includes('.')) t = t.replace(',', '.');
  const n = Number(t);
  return isFinite(n) ? n : null;
}

function validarCelda(
  c: Columna,
  bruto: unknown,
): { valor: any; motivo?: string } {
  const vacio = bruto == null || String(bruto).trim() === '';

  if (vacio) {
    if (c.requerida) return { valor: null, motivo: 'obligatorio y está vacío' };
    return { valor: null };
  }

  switch (c.tipo) {
    case 'entero':
    case 'decimal': {
      const n = parsearNumero(bruto);
      if (n == null) return { valor: null, motivo: 'no es un número válido' };
      if (c.tipo === 'entero' && !Number.isInteger(n))
        return { valor: null, motivo: 'debe ser un número entero' };
      if (n < 0) return { valor: null, motivo: 'no puede ser negativo' };
      return { valor: n };
    }
    case 'fecha': {
      const d = parsearFecha(bruto);
      if (!d)
        return { valor: null, motivo: 'fecha no reconocida (usa AAAA-MM-DD)' };
      return { valor: d };
    }
    case 'opcion': {
      const v = String(bruto).trim().toUpperCase();
      if (c.valores && !c.valores.includes(v))
        return {
          valor: null,
          motivo: `debe ser uno de: ${c.valores.join(', ')}`,
        };
      return { valor: v };
    }
    default:
      return { valor: String(bruto).trim() };
  }
}

/** Reglas que dependen de más de una columna de la misma fila. */
function validarFilaCompleta(
  hoja: Hoja,
  fila: Record<string, any>,
  nFila: number,
): ErrorFila[] {
  const errs: ErrorFila[] = [];
  const err = (columna: string, motivo: string, valor: any = '') =>
    errs.push({
      hoja: hoja.hoja,
      fila: nFila,
      columna,
      valor: String(valor ?? ''),
      motivo,
    });

  // En moneda extranjera el tipo de cambio es obligatorio: sin él los importes
  // en soles quedan mal y el SIRE sale incompleto.
  if (fila.moneda === 'USD' && !fila.tipo_cambio) {
    err('tipo_cambio', 'obligatorio cuando la moneda es USD');
  }

  // Los totales tienen que cuadrar, con 1 céntimo de tolerancia por redondeos.
  const cuadra = (base: string, imp: string, tot: string) => {
    const b = fila[base],
      i = fila[imp],
      t = fila[tot];
    if (b == null || i == null || t == null) return;
    if (Math.abs(b + i - t) > 0.01) {
      err(
        tot,
        `no cuadra: ${base} (${b}) + ${imp} (${i}) = ${(b + i).toFixed(2)}`,
        t,
      );
    }
  };
  if (hoja.hoja === 'VENTAS') cuadra('gravado', 'igv', 'total');
  if (hoja.hoja === 'COMPRAS') cuadra('subtotal', 'igv', 'total');

  // El saldo pendiente no puede superar el total del documento.
  if (
    fila.saldo_pendiente != null &&
    fila.total != null &&
    fila.saldo_pendiente > fila.total + 0.01
  ) {
    err(
      'saldo_pendiente',
      `no puede ser mayor que el total (${fila.total})`,
      fila.saldo_pendiente,
    );
  }

  if (fila.ubigeo != null && !/^\d{6}$/.test(String(fila.ubigeo))) {
    err('ubigeo', 'debe tener exactamente 6 dígitos', fila.ubigeo);
  }

  if (
    hoja.hoja === 'CLIENTES' &&
    fila.tipo_doc === 'RUC' &&
    !/^\d{11}$/.test(String(fila.num_doc))
  ) {
    err('num_doc', 'un RUC debe tener 11 dígitos', fila.num_doc);
  }
  if (
    hoja.hoja === 'CLIENTES' &&
    fila.tipo_doc === 'DNI' &&
    !/^\d{8}$/.test(String(fila.num_doc))
  ) {
    err('num_doc', 'un DNI debe tener 8 dígitos', fila.num_doc);
  }

  // Una nota de crédito sin saber a qué documento afecta y por qué no sirve: no se
  // puede cuadrar contra nada y SUNAT exige los dos datos. Se piden aquí, y no en
  // el esquema, porque son obligatorios SOLO cuando la fila es una nota.
  if (hoja.hoja === 'VENTAS' && fila.tipo_doc === 'NOTA_CREDITO') {
    const exigidos: [string, string][] = [
      ['motivo', 'el motivo del catálogo 09'],
      ['doc_afectado_tipo', 'el tipo del documento que corrige'],
      ['doc_afectado_serie', 'la serie del documento que corrige'],
      ['doc_afectado_numero', 'el número del documento que corrige'],
    ];
    for (const [campo, queEs] of exigidos) {
      if (!fila[campo]) err(campo, `obligatorio en una NOTA_CREDITO: ${queEs}`);
    }
  }
  // Y al revés: rellenarlos en una factura es señal de que la fila está mal.
  if (
    hoja.hoja === 'VENTAS' &&
    fila.tipo_doc &&
    fila.tipo_doc !== 'NOTA_CREDITO'
  ) {
    for (const campo of [
      'motivo',
      'doc_afectado_tipo',
      'doc_afectado_serie',
      'doc_afectado_numero',
    ]) {
      if (fila[campo])
        err(
          campo,
          `solo se llena en una NOTA_CREDITO (esta fila es ${fila.tipo_doc})`,
          fila[campo],
        );
    }
  }

  return errs;
}

export function leerYValidar(rutaExcel: string): HojaLeida[] {
  const libro = XLSX.readFile(rutaExcel, { cellDates: true });
  const pestanas = new Map(libro.SheetNames.map((n) => [normalizar(n), n]));

  return ESQUEMA.map((hoja): HojaLeida => {
    const nombreReal = pestanas.get(normalizar(hoja.hoja));
    if (!nombreReal) {
      return { hoja, filas: [], numerosDeFila: [], ausente: true, errores: [] };
    }

    const crudas: Record<string, any>[] = XLSX.utils.sheet_to_json(
      libro.Sheets[nombreReal],
      { defval: '', raw: false, dateNF: 'yyyy-mm-dd' },
    );

    const errores: ErrorFila[] = [];
    const filas: Record<string, any>[] = [];
    const numerosDeFila: number[] = [];
    const clavesVistas = new Map<string, number>();

    crudas.forEach((cruda, i) => {
      const nFila = i + 2; // +1 por el encabezado, +1 porque Excel cuenta desde 1
      const porNombre = new Map(
        Object.entries(cruda).map(([k, v]) => [normalizar(k), v]),
      );

      // Una fila totalmente vacía se ignora sin ruido: Excel las arrastra.
      if ([...porNombre.values()].every((v) => String(v ?? '').trim() === ''))
        return;

      const fila: Record<string, any> = {};
      for (const c of hoja.columnas) {
        const { valor, motivo } = validarCelda(
          c,
          porNombre.get(normalizar(c.nombre)),
        );
        if (motivo) {
          errores.push({
            hoja: hoja.hoja,
            fila: nFila,
            columna: c.nombre,
            valor: String(porNombre.get(normalizar(c.nombre)) ?? ''),
            motivo,
          });
        }
        fila[c.nombre] = valor;
      }

      errores.push(...validarFilaCompleta(hoja, fila, nFila));

      // Duplicados dentro del mismo archivo: se avisan aquí, no al escribir.
      const clave = hoja.clave
        .map((k) => String(fila[k] ?? '').toUpperCase())
        .join('|');
      if (clave.replace(/\|/g, '')) {
        const previa = clavesVistas.get(clave);
        if (previa) {
          errores.push({
            hoja: hoja.hoja,
            fila: nFila,
            columna: hoja.clave.join(' + '),
            valor: clave,
            motivo: `repetido: ya aparece en la fila ${previa}`,
          });
        } else {
          clavesVistas.set(clave, nFila);
        }
      }

      filas.push(fila);
      numerosDeFila.push(nFila);
    });

    return { hoja, filas, numerosDeFila, errores, ausente: false };
  });
}

/** Referencias entre hojas: un comprobante sin su cliente no se puede cargar. */
export function validarReferencias(leidas: HojaLeida[]): ErrorFila[] {
  const errs: ErrorFila[] = [];
  const de = (n: string) => leidas.find((l) => l.hoja.hoja === n);

  const docsCliente = new Set(
    (de('CLIENTES')?.filas ?? []).map((f) => String(f.num_doc)),
  );
  const codigosProducto = new Set(
    (de('PRODUCTOS')?.filas ?? []).map((f) => String(f.codigo).toUpperCase()),
  );

  const revisar = (
    hojaNombre: string,
    columna: string,
    universo: Set<string>,
    queEs: string,
    mayusculas = false,
  ) => {
    const l = de(hojaNombre);
    if (!l || l.ausente || universo.size === 0) return;
    l.filas.forEach((f, i) => {
      const v = String(f[columna] ?? '');
      if (!v) return;
      if (!universo.has(mayusculas ? v.toUpperCase() : v)) {
        errs.push({
          hoja: hojaNombre,
          fila: l.numerosDeFila[i],
          columna,
          valor: v,
          motivo: `no existe en ${queEs}`,
        });
      }
    });
  };

  revisar('VENTAS', 'cliente_doc', docsCliente, 'la hoja CLIENTES');
  revisar('COMPRAS', 'proveedor_doc', docsCliente, 'la hoja CLIENTES');
  revisar(
    'INVENTARIO',
    'codigo_producto',
    codigosProducto,
    'la hoja PRODUCTOS',
    true,
  );
  revisar(
    'VENTAS_DETALLE',
    'codigo_producto',
    codigosProducto,
    'la hoja PRODUCTOS',
    true,
  );
  revisar('COMPRAS_DETALLE', 'proveedor_doc', docsCliente, 'la hoja CLIENTES');
  revisar(
    'COMPRAS_DETALLE',
    'codigo_producto',
    codigosProducto,
    'la hoja PRODUCTOS',
    true,
  );

  // Cada línea de detalle tiene que colgar de una venta declarada.
  const ventas = de('VENTAS');
  const detalle = de('VENTAS_DETALLE');
  if (ventas && detalle && !detalle.ausente) {
    const cabeceras = new Set(
      ventas.filas.map((f) =>
        `${f.tipo_doc}|${f.serie}|${f.numero}`.toUpperCase(),
      ),
    );
    detalle.filas.forEach((f, i) => {
      const k = `${f.tipo_doc}|${f.serie}|${f.numero}`.toUpperCase();
      if (!cabeceras.has(k)) {
        errs.push({
          hoja: 'VENTAS_DETALLE',
          fila: detalle.numerosDeFila[i],
          columna: 'tipo_doc + serie + numero',
          valor: k,
          motivo: 'no hay una cabecera con ese comprobante en la hoja VENTAS',
        });
      }
    });
  }

  // Cada línea de compra tiene que colgar de una cabecera declarada.
  const compras = de('COMPRAS');
  const detCompra = de('COMPRAS_DETALLE');
  if (compras && detCompra && !detCompra.ausente) {
    const cabecerasCompra = new Set(
      compras.filas.map((f) =>
        `${f.proveedor_doc}|${f.serie}|${f.numero}`.toUpperCase(),
      ),
    );
    detCompra.filas.forEach((f, i) => {
      const k = `${f.proveedor_doc}|${f.serie}|${f.numero}`.toUpperCase();
      if (!cabecerasCompra.has(k)) {
        errs.push({
          hoja: 'COMPRAS_DETALLE',
          fila: detCompra.numerosDeFila[i],
          columna: 'proveedor_doc + serie + numero',
          valor: k,
          motivo: 'no hay una compra con esos datos en la hoja COMPRAS',
        });
      }
    });
  }

  // Una nota de crédito tiene que apuntar a un documento que esté en el archivo.
  // Si no, el ERP se queda con una nota que resta de las ventas sin que exista lo
  // que corrige, y el histórico comercial deja de cuadrar contra P&P.
  if (ventas && !ventas.ausente) {
    const emitidos = new Set(
      ventas.filas
        .filter((f) => f.tipo_doc !== 'NOTA_CREDITO')
        .map((f) => `${f.tipo_doc}|${f.serie}|${f.numero}`.toUpperCase()),
    );
    ventas.filas.forEach((f, i) => {
      if (f.tipo_doc !== 'NOTA_CREDITO') return;
      if (
        !f.doc_afectado_tipo ||
        !f.doc_afectado_serie ||
        !f.doc_afectado_numero
      )
        return;
      const k =
        `${f.doc_afectado_tipo}|${f.doc_afectado_serie}|${f.doc_afectado_numero}`.toUpperCase();
      if (!emitidos.has(k)) {
        errs.push({
          hoja: 'VENTAS',
          fila: ventas.numerosDeFila[i],
          columna:
            'doc_afectado_tipo + doc_afectado_serie + doc_afectado_numero',
          valor: k,
          motivo:
            'la nota de crédito corrige un documento que no está en la hoja VENTAS',
        });
      }
    });
  }

  return errs;
}
