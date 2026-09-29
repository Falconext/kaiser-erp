/**
 * Esquema de la migración de Kaiser.
 *
 * Es la ÚNICA fuente de verdad: de aquí salen las plantillas Excel que se
 * entregan a Kaiser, la validación de los archivos que devuelven y la tabla de
 * campos del documento MIGRACION.md. Si se agrega una columna, se agrega aquí
 * y los tres se actualizan solos.
 *
 * El orden del arreglo es el orden de carga: respeta las dependencias
 * (un comprobante necesita su cliente y sus productos ya cargados).
 */

export type TipoColumna = 'texto' | 'entero' | 'decimal' | 'fecha' | 'opcion';

export interface Columna {
  /** Nombre exacto del encabezado en el Excel (minúsculas, sin tildes). */
  nombre: string;
  tipo: TipoColumna;
  requerida: boolean;
  /** Qué significa, en lenguaje de negocio. Va en la plantilla y en el doc. */
  ayuda: string;
  ejemplo: string;
  /** Para tipo 'opcion': valores admitidos. */
  valores?: string[];
}

export interface Hoja {
  /** Nombre de la pestaña en el Excel. */
  hoja: string;
  titulo: string;
  descripcion: string;
  /** Columnas que identifican una fila, para que reimportar no duplique. */
  clave: string[];
  /** Si Kaiser no puede exportarla, la migración sigue sin esta hoja. */
  opcional: boolean;
  columnas: Columna[];
  /** Filas de ejemplo que van en la plantilla para que se entienda el formato. */
  ejemplos: Record<string, string | number>[];
}

const col = (
  nombre: string,
  tipo: TipoColumna,
  requerida: boolean,
  ayuda: string,
  ejemplo: string,
  valores?: string[],
): Columna => ({ nombre, tipo, requerida, ayuda, ejemplo, valores });

export const TIPOS_DOC_IDENTIDAD = ['RUC', 'DNI', 'CE', 'PASAPORTE', 'OTROS'];
export const TIPOS_COMPROBANTE_VENTA = [
  'FACTURA', 'BOLETA', 'NOTA_VENTA', 'NOTA_CREDITO',
];
/** Catálogo 09 de SUNAT: motivos de nota de crédito. */
export const MOTIVOS_NOTA_CREDITO = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '13',
];
/** Los documentos a los que una nota de crédito puede afectar. */
export const TIPOS_DOC_AFECTADO = ['FACTURA', 'BOLETA'];
export const MONEDAS = ['PEN', 'USD'];

export const ESQUEMA: Hoja[] = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    hoja: 'CLIENTES',
    titulo: 'Clientes y proveedores',
    descripcion:
      'Un solo padrón para ambos: la columna `rol` distingue si la empresa ' +
      'es cliente, proveedor o las dos cosas. Es la primera hoja que se carga ' +
      'porque las ventas y las compras la referencian por documento.',
    clave: ['num_doc'],
    opcional: false,
    columnas: [
      col('tipo_doc', 'opcion', true, 'Tipo de documento de identidad', 'RUC', TIPOS_DOC_IDENTIDAD),
      col('num_doc', 'texto', true, 'Número de documento. Es la clave: si se reimporta, actualiza en vez de duplicar', '20600998877'),
      col('nombre', 'texto', true, 'Razón social o nombre completo', 'AGRÍCOLA OLMOS EXPORT S.A.'),
      col('rol', 'opcion', true, 'Si compra, vende o ambas', 'CLIENTE', ['CLIENTE', 'PROVEEDOR', 'AMBOS']),
      col('direccion', 'texto', false, 'Dirección fiscal', 'Km 12 Carretera Olmos - Motupe'),
      col('ubigeo', 'texto', false, 'Ubigeo INEI de 6 dígitos. Habilita los reportes por zona', '140308'),
      col('departamento', 'texto', false, 'Se completa solo si viene el ubigeo', 'LAMBAYEQUE'),
      col('provincia', 'texto', false, 'Se completa solo si viene el ubigeo', 'LAMBAYEQUE'),
      col('distrito', 'texto', false, 'Se completa solo si viene el ubigeo', 'OLMOS'),
      col('sector', 'texto', false, 'Rubro del cliente. Alimenta el reporte de ventas por sector', 'AGROEXPORTACION'),
      col('email', 'texto', false, 'Correo principal', 'compras@olmosexport.pe'),
      col('telefono', 'texto', false, 'Teléfono principal', '074 123456'),
    ],
    ejemplos: [
      {
        tipo_doc: 'RUC', num_doc: '20600998877', nombre: 'AGRÍCOLA OLMOS EXPORT S.A.', rol: 'CLIENTE',
        direccion: 'Km 12 Carretera Olmos - Motupe', ubigeo: '140308', departamento: 'LAMBAYEQUE',
        provincia: 'LAMBAYEQUE', distrito: 'OLMOS', sector: 'AGROEXPORTACION',
        email: 'compras@olmosexport.pe', telefono: '074 123456',
      },
      {
        tipo_doc: 'RUC', num_doc: '20512345678', nombre: 'ACEROS Y ALAMBRES DEL PACÍFICO S.A.C.', rol: 'PROVEEDOR',
        direccion: 'Av. Argentina 3200, Callao', ubigeo: '070101', departamento: 'CALLAO',
        provincia: 'CALLAO', distrito: 'CALLAO', sector: 'INDUSTRIAL',
        email: 'ventas@acerospacifico.pe', telefono: '01 4567890',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    hoja: 'PRODUCTOS',
    titulo: 'Catálogo de productos',
    descripcion:
      'Solo hace falta si el catálogo NO se cargó ya con `pnpm run import:kaiser` ' +
      'desde el Excel de almacén. Si se cargó, esta hoja se puede omitir o usar ' +
      'para completar precios y costos.',
    clave: ['codigo'],
    opcional: true,
    columnas: [
      col('codigo', 'texto', true, 'Código interno del producto. Es la clave', '20110PUAS0001'),
      col('descripcion', 'texto', true, 'Nombre del producto', 'ALAMBRE GALV. PUAS 16/16 III ZINC - 200 MT'),
      col('unidad', 'texto', true, 'Unidad de venta (NIU, KGM, MTR, RLL…)', 'NIU'),
      col('categoria', 'texto', false, 'Línea de producto. Se crea si no existe', 'Alambres y derivados'),
      col('precio_venta', 'decimal', false, 'Precio unitario de venta CON IGV', '69.75'),
      col('costo', 'decimal', false, 'Costo unitario de compra. Va a costoPromedio', '43.78'),
      col('codigo_barras', 'texto', false, 'Si se maneja', ''),
    ],
    ejemplos: [
      {
        codigo: '20110PUAS0001', descripcion: 'ALAMBRE GALV. PUAS 16/16 III ZINC - 200 MT',
        unidad: 'NIU', categoria: 'Alambres y derivados', precio_venta: 69.75, costo: 43.78, codigo_barras: '',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    hoja: 'INVENTARIO',
    titulo: 'Saldo inicial de inventario',
    descripcion:
      'La foto del stock al día del corte, valorizada. Genera el movimiento de ' +
      'kardex de apertura: de ahí en adelante el kardex lo construye el ERP con ' +
      'las operaciones del día a día.',
    clave: ['codigo_producto', 'almacen'],
    opcional: false,
    columnas: [
      col('codigo_producto', 'texto', true, 'Debe existir en el catálogo', '20110PUAS0001'),
      col('almacen', 'texto', true, 'Nombre de la sede/almacén. Debe existir en el ERP', 'Sede Principal - La Victoria'),
      col('cantidad', 'decimal', true, 'Stock físico contado al corte', '1976'),
      col('costo_unitario', 'decimal', true, 'Costo unitario con el que entra al kardex', '43.78'),
      col('fecha_corte', 'fecha', true, 'Fecha de la toma de inventario (AAAA-MM-DD)', '2026-10-31'),
      col('lote', 'texto', false, 'Si se maneja por lotes', ''),
    ],
    ejemplos: [
      {
        codigo_producto: '20110PUAS0001', almacen: 'Sede Principal - La Victoria',
        cantidad: 1976, costo_unitario: 43.78, fecha_corte: '2026-10-31', lote: '',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    hoja: 'VENTAS',
    titulo: 'Ventas históricas',
    descripcion:
      'Cabecera de cada comprobante emitido. Se migran como documentos ya ' +
      'emitidos y NO se reenvían a SUNAT: el histórico ya fue declarado por el ' +
      'sistema anterior. La columna `saldo_pendiente` es la que arma las cuentas ' +
      'por cobrar. En esta misma hoja van las NOTAS DE CRÉDITO (tipo_doc ' +
      'NOTA_CREDITO), con su motivo y el documento que corrigen: el ERP las resta ' +
      'de las ventas del periodo, y sin ellas el histórico comercial sale inflado.',
    clave: ['tipo_doc', 'serie', 'numero'],
    opcional: false,
    columnas: [
      col('tipo_doc', 'opcion', true, 'Tipo de comprobante', 'FACTURA', TIPOS_COMPROBANTE_VENTA),
      col('serie', 'texto', true, 'Serie del comprobante', 'F001'),
      col('numero', 'texto', true, 'Correlativo', '1245'),
      col('fecha_emision', 'fecha', true, 'AAAA-MM-DD', '2026-08-14'),
      col('cliente_doc', 'texto', true, 'Documento del cliente. Debe existir en la hoja CLIENTES', '20600998877'),
      col('moneda', 'opcion', true, 'Moneda del comprobante', 'PEN', MONEDAS),
      col('tipo_cambio', 'decimal', false, 'Obligatorio si la moneda es USD', '3.52'),
      col('gravado', 'decimal', true, 'Base imponible (sin IGV)', '10000.00'),
      col('igv', 'decimal', true, 'IGV del comprobante', '1800.00'),
      col('total', 'decimal', true, 'Importe total. Debe cuadrar con gravado + igv', '11800.00'),
      col('saldo_pendiente', 'decimal', false,
        'Lo que el cliente aún debe, YA NETO de notas de crédito y de los pagos ' +
        'recibidos. 0 si está pagado. Importante: las notas de crédito de la hoja ' +
        'entran saldadas y no vuelven a restar, así que este número tiene que ser ' +
        'la deuda real de hoy o las cuentas por cobrar saldrán mal',
        '0'),
      col('vendedor_email', 'texto', false, 'Correo del vendedor en el ERP. Alimenta el ranking', 'ventas@kaisercorp.com.pe'),
      // ── Solo para las notas de crédito ──────────────────────────────────
      // Se piden por separado en vez de deducirlas: una nota de crédito sin saber
      // a qué documento afecta y por qué no es migrable, y SUNAT exige ambos.
      col('motivo', 'opcion', false,
        'Solo en NOTA_CREDITO. Motivo del catálogo 09 de SUNAT: 01 anulación, ' +
        '02 error en el RUC, 03 error en la descripción, 04 descuento global, ' +
        '05 descuento por ítem, 06 devolución total, 07 devolución por ítem, ' +
        '08 bonificación, 09 disminución del valor, 10 otros, 13 ajuste MYPE',
        '06', MOTIVOS_NOTA_CREDITO),
      col('doc_afectado_tipo', 'opcion', false,
        'Solo en NOTA_CREDITO: qué tipo de documento corrige', 'FACTURA',
        TIPOS_DOC_AFECTADO),
      col('doc_afectado_serie', 'texto', false,
        'Solo en NOTA_CREDITO: serie del documento que corrige', 'F001'),
      col('doc_afectado_numero', 'texto', false,
        'Solo en NOTA_CREDITO: número del documento que corrige', '1245'),
      col('observaciones', 'texto', false, 'Referencia libre', ''),
    ],
    ejemplos: [
      {
        tipo_doc: 'FACTURA', serie: 'F001', numero: '1245', fecha_emision: '2026-08-14',
        cliente_doc: '20600998877', moneda: 'PEN', tipo_cambio: '', gravado: 10000, igv: 1800,
        total: 11800, saldo_pendiente: 0, vendedor_email: 'ventas@kaisercorp.com.pe', observaciones: '',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    hoja: 'VENTAS_DETALLE',
    titulo: 'Detalle de las ventas',
    descripcion:
      'Los ítems de cada comprobante de la hoja VENTAS. Sin esta hoja las ventas ' +
      'se migran solo como cabecera: se conservan los importes y las cuentas por ' +
      'cobrar, pero no el análisis por producto.',
    clave: ['tipo_doc', 'serie', 'numero', 'codigo_producto'],
    opcional: true,
    columnas: [
      col('tipo_doc', 'opcion', true, 'Debe coincidir con la hoja VENTAS', 'FACTURA', TIPOS_COMPROBANTE_VENTA),
      col('serie', 'texto', true, 'Debe coincidir con la hoja VENTAS', 'F001'),
      col('numero', 'texto', true, 'Debe coincidir con la hoja VENTAS', '1245'),
      col('codigo_producto', 'texto', true, 'Debe existir en el catálogo', '20110PUAS0001'),
      col('cantidad', 'decimal', true, 'Unidades vendidas', '100'),
      col('precio_unitario', 'decimal', true, 'Precio unitario CON IGV', '69.75'),
    ],
    ejemplos: [
      {
        tipo_doc: 'FACTURA', serie: 'F001', numero: '1245',
        codigo_producto: '20110PUAS0001', cantidad: 100, precio_unitario: 69.75,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    hoja: 'COMPRAS',
    titulo: 'Compras históricas',
    descripcion:
      'Facturas de proveedor. La columna `saldo_pendiente` arma las cuentas por ' +
      'pagar. No mueven stock: el inventario entra por la hoja INVENTARIO, para ' +
      'no contar dos veces.',
    clave: ['proveedor_doc', 'serie', 'numero'],
    opcional: false,
    columnas: [
      col('proveedor_doc', 'texto', true, 'Documento del proveedor. Debe existir en CLIENTES', '20512345678'),
      col('serie', 'texto', true, 'Serie del comprobante del proveedor', 'F001'),
      col('numero', 'texto', true, 'Correlativo', '000402'),
      col('fecha_emision', 'fecha', true, 'AAAA-MM-DD', '2026-08-28'),
      col('fecha_vencimiento', 'fecha', false, 'Para el control de cuentas por pagar', '2026-09-27'),
      col('moneda', 'opcion', true, 'Moneda de la compra', 'PEN', MONEDAS),
      col('tipo_cambio', 'decimal', false, 'Obligatorio si la moneda es USD', '3.52'),
      col('subtotal', 'decimal', true, 'Base imponible (sin IGV)', '9000.00'),
      col('igv', 'decimal', true, 'IGV de la compra', '1620.00'),
      col('total', 'decimal', true, 'Debe cuadrar con subtotal + igv', '10620.00'),
      col('saldo_pendiente', 'decimal', false, 'Lo que aún se le debe al proveedor', '10620.00'),
    ],
    ejemplos: [
      {
        proveedor_doc: '20512345678', serie: 'F001', numero: '000402', fecha_emision: '2026-08-28',
        fecha_vencimiento: '2026-09-27', moneda: 'PEN', tipo_cambio: '', subtotal: 9000,
        igv: 1620, total: 10620, saldo_pendiente: 10620,
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  {
    hoja: 'COMPRAS_DETALLE',
    titulo: 'Líneas de las compras',
    descripcion:
      'Qué se compró en cada factura de proveedor. Es opcional —los saldos por ' +
      'pagar salen de la cabecera y no dependen de esta hoja—, pero sin ella la ' +
      'compra queda sin líneas y se pierde qué se le compró a cada proveedor.',
    clave: ['proveedor_doc', 'serie', 'numero', 'codigo_producto'],
    opcional: true,
    columnas: [
      col('proveedor_doc', 'texto', true, 'El mismo de la hoja COMPRAS', '20601030405'),
      col('serie', 'texto', true, 'Serie de la factura del proveedor', 'F001'),
      col('numero', 'texto', true, 'Número de la factura del proveedor', '500'),
      col('codigo_producto', 'texto', true, 'Debe existir en el catálogo', '20110PUAS0001'),
      col('cantidad', 'decimal', true, 'Cantidad comprada', '500'),
      col('precio_unitario', 'decimal', true, 'Costo unitario sin IGV', '40.00'),
    ],
    ejemplos: [
      {
        proveedor_doc: '20601030405', serie: 'F001', numero: '500',
        codigo_producto: '20110PUAS0001', cantidad: 500, precio_unitario: 40,
      },
    ],
  },
];

export const hojaPorNombre = (nombre: string): Hoja | undefined =>
  ESQUEMA.find((h) => h.hoja.toUpperCase() === String(nombre).toUpperCase());
