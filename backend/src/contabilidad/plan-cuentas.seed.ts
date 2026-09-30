import { NaturalezaCuenta } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Plan de cuentas de Kaiser: un subconjunto del PCGE 2019 (vigente desde 2020)
 * con lo que una fabricante-distribuidora usa de verdad. No son las 700 cuentas
 * del plan completo: son las que reciben movimiento desde el ERP más las que
 * hacen falta para que un asiento manual tenga a dónde ir.
 *
 * Se siembra por empresa y es idempotente (`upsert` sin `update`): si la
 * contadora renombra o desactiva una cuenta, el siguiente arranque NO se la pisa.
 *
 * El nivel sale de la longitud del código (2 cuenta, 3 subcuenta, 4 divisionaria,
 * 5 subdivisionaria) y una cuenta es imputable cuando ninguna otra del plan
 * cuelga de ella.
 */
type Fila = readonly [
  codigo: string,
  denominacion: string,
  naturaleza?: NaturalezaCuenta,
];

const D = NaturalezaCuenta.DEUDORA;
const A = NaturalezaCuenta.ACREEDORA;

export const PLAN_CUENTAS_KAISER: readonly Fila[] = [
  // ── Activo ──
  ['10', 'Efectivo y equivalentes de efectivo'],
  ['101', 'Caja'],
  ['1011', 'Caja'],
  ['104', 'Cuentas corrientes en instituciones financieras'],
  ['1041', 'Cuentas corrientes operativas'],
  ['107', 'Fondos sujetos a restricción'],
  ['1071', 'Fondos sujetos a restricción (detracciones)'],
  ['12', 'Cuentas por cobrar comerciales – Terceros'],
  ['121', 'Facturas, boletas y otros comprobantes por cobrar'],
  ['1212', 'Emitidas en cartera'],
  ['1213', 'En cobranza'],
  ['16', 'Cuentas por cobrar diversas – Terceros'],
  ['168', 'Otras cuentas por cobrar diversas'],
  ['20', 'Mercaderías'],
  ['201', 'Mercaderías'],
  ['2011', 'Mercaderías'],
  ['21', 'Productos terminados'],
  ['211', 'Productos manufacturados'],
  ['2111', 'Productos manufacturados'],
  ['24', 'Materias primas'],
  ['241', 'Materias primas para productos manufacturados'],
  ['2411', 'Materias primas'],
  ['25', 'Materiales auxiliares, suministros y repuestos'],
  ['252', 'Suministros'],
  ['2521', 'Suministros'],
  // ── Pasivo ──
  [
    '40',
    'Tributos, contraprestaciones y aportes al sistema público de pensiones y de salud por pagar',
  ],
  ['401', 'Gobierno nacional'],
  ['4011', 'Impuesto general a las ventas'],
  ['40111', 'IGV – Cuenta propia'],
  ['40113', 'IGV – Régimen de percepciones'],
  ['40114', 'IGV – Régimen de retenciones'],
  ['4017', 'Impuesto a la renta'],
  ['40171', 'Renta de tercera categoría'],
  ['40172', 'Renta de cuarta categoría'],
  ['40173', 'Renta de quinta categoría'],
  ['403', 'Instituciones públicas'],
  ['4031', 'EsSalud'],
  ['4032', 'ONP'],
  ['407', 'Administradoras de fondos de pensiones'],
  ['41', 'Remuneraciones y participaciones por pagar'],
  ['411', 'Remuneraciones por pagar'],
  ['4111', 'Sueldos y salarios por pagar'],
  ['4114', 'Gratificaciones por pagar'],
  ['4115', 'Vacaciones por pagar'],
  ['415', 'Beneficios sociales de los trabajadores por pagar'],
  ['4151', 'Compensación por tiempo de servicios'],
  ['42', 'Cuentas por pagar comerciales – Terceros'],
  ['421', 'Facturas, boletas y otros comprobantes por pagar'],
  ['4212', 'Emitidas'],
  ['45', 'Obligaciones financieras'],
  ['451', 'Préstamos de instituciones financieras y otras entidades'],
  ['4511', 'Instituciones financieras'],
  ['46', 'Cuentas por pagar diversas – Terceros'],
  ['469', 'Otras cuentas por pagar diversas'],
  ['4699', 'Otras cuentas por pagar'],
  // ── Patrimonio ──
  ['50', 'Capital'],
  ['501', 'Capital social'],
  ['5011', 'Acciones'],
  ['59', 'Resultados acumulados'],
  ['591', 'Utilidades no distribuidas'],
  ['5911', 'Utilidades acumuladas'],
  // ── Gastos por naturaleza ──
  ['60', 'Compras'],
  ['601', 'Mercaderías'],
  ['6011', 'Mercaderías'],
  ['602', 'Materias primas'],
  ['6021', 'Materias primas para productos manufacturados'],
  ['603', 'Materiales auxiliares, suministros y repuestos'],
  ['6032', 'Suministros'],
  ['61', 'Variación de existencias', A],
  ['611', 'Mercaderías', A],
  ['6111', 'Mercaderías', A],
  ['612', 'Materias primas', A],
  ['6121', 'Materias primas para productos manufacturados', A],
  ['613', 'Materiales auxiliares, suministros y repuestos', A],
  ['6132', 'Suministros', A],
  ['62', 'Gastos de personal, directores y gerentes'],
  ['621', 'Remuneraciones'],
  ['6211', 'Sueldos y salarios'],
  ['6212', 'Comisiones'],
  ['6214', 'Gratificaciones'],
  ['6215', 'Vacaciones'],
  ['627', 'Seguridad, previsión social y otras contribuciones'],
  ['6271', 'Régimen de prestaciones de salud (EsSalud)'],
  ['629', 'Beneficios sociales de los trabajadores'],
  ['6291', 'Compensación por tiempo de servicios'],
  ['63', 'Gastos de servicios prestados por terceros'],
  ['631', 'Transporte, correos y gastos de viaje'],
  ['6311', 'Transporte'],
  ['634', 'Mantenimiento y reparaciones'],
  ['6343', 'Inmuebles, maquinaria y equipo'],
  ['635', 'Alquileres'],
  ['6352', 'Edificaciones'],
  ['636', 'Servicios básicos'],
  ['6361', 'Energía eléctrica'],
  ['6363', 'Agua'],
  ['6364', 'Teléfono'],
  ['6365', 'Internet'],
  ['637', 'Publicidad, publicaciones, relaciones públicas'],
  ['6371', 'Publicidad'],
  ['639', 'Otros servicios prestados por terceros'],
  ['6391', 'Gastos bancarios'],
  ['64', 'Gastos por tributos'],
  ['641', 'Gobierno nacional'],
  ['6411', 'Impuesto general a las ventas y selectivo al consumo'],
  ['65', 'Otros gastos de gestión'],
  ['659', 'Otros gastos de gestión'],
  ['6599', 'Otros gastos de gestión'],
  ['67', 'Gastos financieros'],
  ['673', 'Intereses por préstamos y otras obligaciones'],
  ['6731', 'Préstamos de instituciones financieras'],
  ['69', 'Costo de ventas'],
  ['691', 'Mercaderías'],
  ['6911', 'Mercaderías'],
  ['692', 'Productos terminados'],
  ['6921', 'Productos manufacturados'],
  // ── Ingresos ──
  ['70', 'Ventas'],
  ['701', 'Mercaderías'],
  ['7011', 'Mercaderías'],
  ['70111', 'Mercaderías – Terceros'],
  ['702', 'Productos terminados'],
  ['7021', 'Productos manufacturados'],
  ['70211', 'Productos manufacturados – Terceros'],
  ['709', 'Devoluciones sobre ventas', D],
  ['7091', 'Mercaderías', D],
  ['7092', 'Productos terminados', D],
  ['71', 'Variación de la producción almacenada', A],
  ['711', 'Variación de productos terminados', A],
  ['7111', 'Productos manufacturados', A],
  ['75', 'Otros ingresos de gestión'],
  ['759', 'Otros ingresos de gestión'],
  ['7599', 'Otros ingresos de gestión'],
  ['77', 'Ingresos financieros'],
  ['779', 'Otros ingresos financieros'],
  // ── Destino (clase 9): opcional, lo decide la contadora ──
  ['79', 'Cargas imputables a cuentas de costos y gastos', A],
  ['791', 'Cargas imputables a cuentas de costos y gastos', A],
  ['94', 'Gastos administrativos'],
  ['941', 'Gastos administrativos'],
  ['95', 'Gastos de ventas'],
  ['951', 'Gastos de ventas'],
];

/** Naturaleza por defecto según la clase, salvo que la fila diga otra cosa. */
function naturalezaDe(
  codigo: string,
  explicita?: NaturalezaCuenta,
): NaturalezaCuenta {
  if (explicita) return explicita;
  return '457'.includes(codigo[0]) ? A : D;
}

/**
 * Qué cuenta usa cada cosa que el ERP asienta. Las fases siguientes
 * (ventas, compras, cobros, planilla) leen de aquí, nunca del código.
 */
export const MAPEO_CONTABLE_DEFECTO: ReadonlyArray<{
  clave: string;
  cuenta?: string;
  valor?: string;
  descripcion: string;
}> = [
  {
    clave: 'CLIENTES',
    cuenta: '1212',
    descripcion: 'Cuentas por cobrar a clientes',
  },
  {
    clave: 'PROVEEDORES',
    cuenta: '4212',
    descripcion: 'Cuentas por pagar a proveedores',
  },
  { clave: 'IGV_VENTAS', cuenta: '40111', descripcion: 'IGV de las ventas' },
  {
    clave: 'IGV_COMPRAS',
    cuenta: '40111',
    descripcion: 'IGV crédito fiscal de las compras',
  },
  {
    clave: 'VENTA_MERCADERIA',
    cuenta: '70111',
    descripcion: 'Venta de producto revendido',
  },
  {
    clave: 'VENTA_PRODUCTO_TERMINADO',
    cuenta: '70211',
    descripcion: 'Venta de producto fabricado (con receta)',
  },
  {
    clave: 'DEVOLUCION_VENTA_MERCADERIA',
    cuenta: '7091',
    descripcion: 'Nota de crédito sobre mercadería',
  },
  {
    clave: 'DEVOLUCION_VENTA_PRODUCTO_TERMINADO',
    cuenta: '7092',
    descripcion: 'Nota de crédito sobre producto fabricado',
  },
  {
    clave: 'COSTO_VENTA_MERCADERIA',
    cuenta: '6911',
    descripcion: 'Costo de lo revendido',
  },
  {
    clave: 'COSTO_VENTA_PRODUCTO_TERMINADO',
    cuenta: '6921',
    descripcion: 'Costo de lo fabricado',
  },
  {
    clave: 'COMPRA_MERCADERIA',
    cuenta: '6011',
    descripcion: 'Compra de mercadería (naturaleza)',
  },
  {
    clave: 'COMPRA_MATERIA_PRIMA',
    cuenta: '6021',
    descripcion: 'Compra de materia prima (naturaleza)',
  },
  {
    clave: 'EXISTENCIA_MERCADERIA',
    cuenta: '2011',
    descripcion: 'Mercadería en almacén (destino)',
  },
  {
    clave: 'EXISTENCIA_PRODUCTO_TERMINADO',
    cuenta: '2111',
    descripcion: 'Producto terminado en almacén',
  },
  {
    clave: 'EXISTENCIA_MATERIA_PRIMA',
    cuenta: '2411',
    descripcion: 'Materia prima en almacén (destino)',
  },
  {
    clave: 'VARIACION_MERCADERIA',
    cuenta: '6111',
    descripcion: 'Contrapartida del destino de mercadería',
  },
  {
    clave: 'VARIACION_MATERIA_PRIMA',
    cuenta: '6121',
    descripcion: 'Contrapartida del destino de materia prima',
  },
  { clave: 'CAJA', cuenta: '1011', descripcion: 'Efectivo' },
  { clave: 'BANCOS', cuenta: '1041', descripcion: 'Cuentas corrientes' },
  {
    clave: 'DETRACCIONES',
    cuenta: '1071',
    descripcion: 'Cuenta de detracciones del Banco de la Nación',
  },
  { clave: 'SUELDOS', cuenta: '6211', descripcion: 'Gasto de sueldos' },
  {
    clave: 'COMISIONES_VENDEDORES',
    cuenta: '6212',
    descripcion: 'Comisiones de vendedores',
  },
  {
    clave: 'ESSALUD_GASTO',
    cuenta: '6271',
    descripcion: 'Aporte del empleador a EsSalud',
  },
  {
    clave: 'SUELDOS_POR_PAGAR',
    cuenta: '4111',
    descripcion: 'Neto a pagar de la planilla',
  },
  {
    clave: 'ESSALUD_POR_PAGAR',
    cuenta: '4031',
    descripcion: 'EsSalud por pagar',
  },
  {
    clave: 'ONP_POR_PAGAR',
    cuenta: '4032',
    descripcion: 'ONP retenida por pagar',
  },
  {
    clave: 'RENTA_QUINTA_POR_PAGAR',
    cuenta: '40173',
    descripcion: 'Renta de 5ta retenida por pagar',
  },
  {
    clave: 'AFP_POR_PAGAR',
    cuenta: '407',
    descripcion: 'AFP retenida por pagar',
  },
  // Conceptos de planilla que no son sueldo: entran como líneas del mismo
  // asiento de provisión cuando la planilla importada los trae.
  // Contrapartida del asiento de apertura: el inventario que la empresa ya
  // tenía cuando arrancó la contabilidad no lo compró en el período, así que su
  // contrapartida es patrimonio, no un gasto.
  // Producción: el producto terminado que entra al almacén no es un ingreso de
  // venta, es producción almacenada. Va contra la 71, no contra la 70.
  {
    clave: 'PRODUCCION_ALMACENADA',
    cuenta: '7111',
    descripcion: 'Variación de la producción almacenada',
  },
  {
    clave: 'APERTURA_CONTRAPARTIDA',
    cuenta: '5911',
    descripcion: 'Contrapartida del asiento de apertura (saldos iniciales)',
  },
  {
    clave: 'GRATIFICACIONES',
    cuenta: '6214',
    descripcion: 'Gasto de gratificaciones',
  },
  { clave: 'VACACIONES', cuenta: '6215', descripcion: 'Gasto de vacaciones' },
  {
    clave: 'CTS',
    cuenta: '6291',
    descripcion: 'Gasto de compensación por tiempo de servicios',
  },
  {
    clave: 'GRATIFICACIONES_POR_PAGAR',
    cuenta: '4114',
    descripcion: 'Gratificaciones por pagar',
  },
  {
    clave: 'VACACIONES_POR_PAGAR',
    cuenta: '4115',
    descripcion: 'Vacaciones por pagar',
  },
  { clave: 'CTS_POR_PAGAR', cuenta: '4151', descripcion: 'CTS por pagar' },
  {
    clave: 'OTROS_DESCUENTOS_POR_PAGAR',
    cuenta: '4699',
    descripcion: 'Otros descuentos de planilla por pagar',
  },
  {
    clave: 'GASTO_PUBLICIDAD',
    cuenta: '6371',
    descripcion: 'Gasto operativo: PUBLICIDAD',
  },
  {
    clave: 'GASTO_ENVIOS',
    cuenta: '6311',
    descripcion: 'Gasto operativo: ENVIOS',
  },
  {
    clave: 'GASTO_COMISIONES',
    cuenta: '6212',
    descripcion: 'Gasto operativo: COMISIONES',
  },
  {
    clave: 'GASTO_ALQUILER',
    cuenta: '6352',
    descripcion: 'Gasto operativo: ALQUILER',
  },
  {
    clave: 'GASTO_OTROS',
    cuenta: '6599',
    descripcion: 'Gasto operativo: OTROS / PERSONALIZADA',
  },
  { clave: 'INGRESO_OTROS', cuenta: '7599', descripcion: 'Ingresos manuales' },
  {
    clave: 'DESTINO_GASTO_ADMINISTRATIVO',
    cuenta: '941',
    descripcion: 'Destino del gasto administrativo (clase 9)',
  },
  {
    clave: 'DESTINO_GASTO_VENTAS',
    cuenta: '951',
    descripcion: 'Destino del gasto de ventas (clase 9)',
  },
  {
    clave: 'CARGAS_IMPUTABLES',
    cuenta: '791',
    descripcion: 'Contrapartida del destino (clase 9)',
  },
  {
    clave: 'USA_CLASE_9',
    valor: 'false',
    descripcion:
      'Generar el asiento de destino de los gastos (94/95 contra 791). Lo decide la contadora.',
  },
];

export async function seedPlanContable(prisma: PrismaService) {
  const empresas = await prisma.empresa.findMany({ select: { id: true } });
  if (empresas.length === 0) return;

  const codigos = new Set(PLAN_CUENTAS_KAISER.map(([c]) => c));
  const esImputable = (codigo: string) =>
    ![...codigos].some((otro) => otro !== codigo && otro.startsWith(codigo));
  const padreDe = (codigo: string): string | null => {
    for (let n = codigo.length - 1; n >= 2; n--) {
      const p = codigo.slice(0, n);
      if (codigos.has(p)) return p;
    }
    return null;
  };

  for (const { id: empresaId } of empresas) {
    const ids = new Map<string, number>();
    // De más corto a más largo para que el padre exista antes que la hija.
    const filas = [...PLAN_CUENTAS_KAISER].sort(
      (a, b) => a[0].length - b[0].length,
    );
    for (const [codigo, denominacion, nat] of filas) {
      const padre = padreDe(codigo);
      const cuenta = await prisma.cuentaContable.upsert({
        where: { empresaId_codigo: { empresaId, codigo } },
        update: {},
        create: {
          empresaId,
          codigo,
          denominacion,
          nivel: codigo.length,
          naturaleza: naturalezaDe(codigo, nat),
          imputable: esImputable(codigo),
          padreId: padre ? (ids.get(padre) ?? null) : null,
        },
        select: { id: true },
      });
      ids.set(codigo, cuenta.id);
    }

    for (const m of MAPEO_CONTABLE_DEFECTO) {
      await prisma.configuracionContable.upsert({
        where: { empresaId_clave: { empresaId, clave: m.clave } },
        update: {},
        create: {
          empresaId,
          clave: m.clave,
          cuentaId: m.cuenta ? (ids.get(m.cuenta) ?? null) : null,
          valor: m.valor ?? null,
          descripcion: m.descripcion,
        },
      });
    }
  }
}
