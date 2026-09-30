import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service';
import { LibroDiarioService, type LineaAsiento } from './libro-diario.service';

/**
 * Planilla importada.
 *
 * El ERP **no calcula la planilla**. Kaiser la calcula en su propio software y
 * aquí solo se recibe: se convierte en gasto del mes y en el asiento de
 * provisión, y se guarda el detalle por trabajador para que la contadora pueda
 * auditar de dónde salió cada importe.
 *
 * La razón de no calcularla: son 224 conceptos remunerativos con su fórmula y su
 * referencia legal, más PLAME y T-Registro, y todo eso cambia cada año. Si una
 * AFP sale mal es una multa de SUNAT y un reclamo laboral, no un bug que se
 * arregla el martes. Lo que la gerencia de Kaiser elogió del competidor no fue
 * que calculara la boleta: fue que "contabilidad jalaba no más". Eso es esto.
 */

/** Las columnas del Excel. Se aceptan varios nombres porque cada software exporta el suyo. */
const COLUMNAS: Record<string, string[]> = {
  dni: ['dni', 'documento', 'nrodoc', 'numerodocumento'],
  nombres: [
    'nombres',
    'nombre',
    'trabajador',
    'apellidosynombres',
    'apellidosynombre',
  ],
  basico: ['basico', 'sueldobasico', 'remuneracionbasica', 'basica'],
  asignacionFamiliar: ['asignacionfamiliar', 'asigfamiliar', 'asignacion'],
  horasExtras: ['horasextras', 'horaextra', 'hrsextras', 'sobretiempo'],
  comisiones: ['comisiones', 'comision'],
  bonificaciones: ['bonificaciones', 'bonificacion', 'bonos', 'bono'],
  gratificacion: ['gratificacion', 'gratificaciones', 'grati'],
  vacaciones: ['vacaciones', 'vacacion'],
  cts: ['cts', 'compensaciontiempodeservicios'],
  totalIngresos: [
    'totalingresos',
    'totalingreso',
    'totalremuneracion',
    'totalhaberes',
  ],
  afp: ['afp', 'aportacionafp', 'descuentoafp'],
  onp: ['onp', 'aportaciononp', 'descuentoonp'],
  rentaQuinta: [
    'renta5ta',
    'rentaquinta',
    'renta5',
    'quintacategoria',
    'impuestorenta',
  ],
  otrosDescuentos: ['otrosdescuentos', 'otrodescuento', 'otros'],
  totalDescuentos: ['totaldescuentos', 'totaldescuento'],
  neto: ['neto', 'netoapagar', 'totalneto', 'liquido'],
  essalud: ['essalud', 'aporteessalud', 'essaludempleador', 'seguro'],
};

const TEXTO = new Set(['dni', 'nombres']);

/** Lo que una celda de Excel puede traer y se puede leer como texto. */
const comoTexto = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return '';
};

const normalizar = (s: unknown) =>
  comoTexto(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

const numero = (v: unknown): number => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const t = comoTexto(v).replace(/\s/g, '').replace(/,/g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
};

const r2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const centimos = (n: number) => Math.round((Number(n) || 0) * 100);

export interface FilaPlanilla {
  fila: number;
  dni: string | null;
  nombres: string;
  basico: number;
  asignacionFamiliar: number;
  horasExtras: number;
  comisiones: number;
  bonificaciones: number;
  gratificacion: number;
  vacaciones: number;
  cts: number;
  totalIngresos: number;
  afp: number;
  onp: number;
  rentaQuinta: number;
  otrosDescuentos: number;
  totalDescuentos: number;
  neto: number;
  essalud: number;
}

export interface LecturaPlanilla {
  filas: FilaPlanilla[];
  errores: string[];
  avisos: string[];
  columnasReconocidas: string[];
  columnasIgnoradas: string[];
  totales: {
    trabajadores: number;
    basico: number;
    asignacionFamiliar: number;
    horasExtras: number;
    comisiones: number;
    bonificaciones: number;
    gratificacion: number;
    vacaciones: number;
    cts: number;
    totalIngresos: number;
    afp: number;
    onp: number;
    rentaQuinta: number;
    otrosDescuentos: number;
    totalDescuentos: number;
    neto: number;
    essalud: number;
  };
}

@Injectable()
export class PlanillaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly diario: LibroDiarioService,
  ) {}

  // ───────────────────────── Plantilla ─────────────────────────

  /** El Excel que Kaiser tiene que rellenar (o al que adaptar su exportación). */
  plantilla(): Buffer {
    const cabecera = [
      'DNI',
      'NOMBRES',
      'BASICO',
      'ASIGNACION_FAMILIAR',
      'HORAS_EXTRAS',
      'COMISIONES',
      'BONIFICACIONES',
      'GRATIFICACION',
      'VACACIONES',
      'CTS',
      'TOTAL_INGRESOS',
      'AFP',
      'ONP',
      'RENTA_5TA',
      'OTROS_DESCUENTOS',
      'TOTAL_DESCUENTOS',
      'NETO',
      'ESSALUD',
    ];
    const ejemplo = [
      [
        '44556677',
        'PEREZ GARCIA, JUAN',
        2500,
        113,
        180,
        0,
        200,
        0,
        0,
        0,
        2993,
        389.09,
        0,
        95.5,
        0,
        484.59,
        2508.41,
        269.37,
      ],
      [
        '33445566',
        'QUISPE MAMANI, ROSA',
        1800,
        113,
        0,
        450,
        0,
        0,
        0,
        0,
        2363,
        307.19,
        0,
        41.2,
        50,
        398.39,
        1964.61,
        212.67,
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet([cabecera, ...ejemplo]);
    ws['!cols'] = cabecera.map((c, i) => ({
      wch: i === 1 ? 30 : Math.max(12, c.length + 2),
    }));

    const instrucciones = [
      ['PLANILLA · cómo llenar este archivo'],
      [''],
      [
        'El ERP NO calcula la planilla. Kaiser la calcula donde la calcula hoy y',
      ],
      [
        'este archivo solo la trae para convertirla en gasto y en asiento contable.',
      ],
      [''],
      ['Reglas'],
      [
        '1) Una fila por trabajador. La primera fila son los nombres de columna: no los cambies.',
      ],
      ['2) Los importes en soles, con punto decimal. Sin símbolo de moneda.'],
      [
        '3) TOTAL_INGRESOS menos TOTAL_DESCUENTOS tiene que dar NETO. Si no cuadra, la fila se rechaza.',
      ],
      [
        '4) ESSALUD es el aporte del EMPLEADOR (9 %). No es un descuento del trabajador.',
      ],
      ['5) Las columnas que no uses, déjalas en 0. No borres la columna.'],
      [
        '6) Se puede volver a subir el mismo mes: hay que extornar el asiento anterior primero.',
      ],
      [''],
      ['Qué asiento se genera'],
      ['  Debe  621x  sueldos, asignación, horas extras, bonificaciones'],
      ['  Debe  6212  comisiones'],
      ['  Debe  6214/6215/6291  gratificación / vacaciones / CTS'],
      ['  Debe  6271  EsSalud (aporte del empleador)'],
      ['    Haber 4111  neto a pagar a los trabajadores'],
      ['    Haber 4071  AFP retenida'],
      ['    Haber 4032  ONP retenida'],
      ['    Haber 40173 renta de 5ta retenida'],
      ['    Haber 4699  otros descuentos'],
      ['    Haber 4031  EsSalud por pagar'],
      [''],
      [
        'Las cuentas se cambian en Contabilidad › Configuración contable, sin tocar el sistema.',
      ],
    ];
    const wsi = XLSX.utils.aoa_to_sheet(instrucciones);
    wsi['!cols'] = [{ wch: 95 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PLANILLA');
    XLSX.utils.book_append_sheet(wb, wsi, 'INSTRUCCIONES');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ───────────────────────── Lectura ─────────────────────────

  /**
   * Lee el Excel sin escribir nada. Devuelve las filas, los totales y **todo lo
   * que está mal**, no solo el primer error: quien corrige la planilla quiere la
   * lista entera, no ir de una en una.
   */
  leer(buffer: Buffer): LecturaPlanilla {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException(
        'No se pudo abrir el archivo. ¿Es un Excel válido?',
      );
    }
    const hoja =
      wb.Sheets[
        wb.SheetNames.find((n) => normalizar(n).includes('planilla')) ??
          wb.SheetNames[0]
      ];
    if (!hoja)
      throw new BadRequestException('El archivo no tiene ninguna hoja.');

    const crudo = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, {
      defval: '',
    });
    if (!crudo.length)
      throw new BadRequestException('La hoja está vacía: no hay ninguna fila.');

    // Qué columna del archivo corresponde a cada campo.
    const cabeceras = Object.keys(crudo[0]);
    const mapa = new Map<string, string>();
    const reconocidas: string[] = [];
    for (const [campo, alias] of Object.entries(COLUMNAS)) {
      const encontrada = cabeceras.find((h) => alias.includes(normalizar(h)));
      if (encontrada) {
        mapa.set(campo, encontrada);
        reconocidas.push(encontrada);
      }
    }
    const ignoradas = cabeceras.filter(
      (h) => !reconocidas.includes(h) && String(h).trim(),
    );

    const errores: string[] = [];
    const avisos: string[] = [];
    for (const obligatoria of ['nombres', 'neto']) {
      if (!mapa.has(obligatoria)) {
        errores.push(
          `Falta la columna ${obligatoria.toUpperCase()}. Descarga la plantilla para ver los nombres que se esperan.`,
        );
      }
    }
    if (errores.length)
      return {
        filas: [],
        errores,
        avisos,
        columnasReconocidas: reconocidas,
        columnasIgnoradas: ignoradas,
        totales: this.sumar([]),
      };

    const valor = (row: Record<string, unknown>, campo: string) => {
      const col = mapa.get(campo);
      if (!col) return TEXTO.has(campo) ? '' : 0;
      return TEXTO.has(campo)
        ? comoTexto(row[col]).trim()
        : r2(numero(row[col]));
    };

    const filas: FilaPlanilla[] = [];
    crudo.forEach((row, i) => {
      const nFila = i + 2; // +1 por la cabecera, +1 porque Excel empieza en 1
      const nombres = String(valor(row, 'nombres'));
      const esVacia =
        !nombres &&
        !numero(valor(row, 'neto')) &&
        !numero(valor(row, 'totalIngresos'));
      if (esVacia) return;
      if (!nombres) {
        errores.push(`Fila ${nFila}: falta el nombre del trabajador.`);
        return;
      }

      const f: FilaPlanilla = {
        fila: nFila,
        dni: String(valor(row, 'dni')) || null,
        nombres,
        basico: Number(valor(row, 'basico')),
        asignacionFamiliar: Number(valor(row, 'asignacionFamiliar')),
        horasExtras: Number(valor(row, 'horasExtras')),
        comisiones: Number(valor(row, 'comisiones')),
        bonificaciones: Number(valor(row, 'bonificaciones')),
        gratificacion: Number(valor(row, 'gratificacion')),
        vacaciones: Number(valor(row, 'vacaciones')),
        cts: Number(valor(row, 'cts')),
        totalIngresos: Number(valor(row, 'totalIngresos')),
        afp: Number(valor(row, 'afp')),
        onp: Number(valor(row, 'onp')),
        rentaQuinta: Number(valor(row, 'rentaQuinta')),
        otrosDescuentos: Number(valor(row, 'otrosDescuentos')),
        totalDescuentos: Number(valor(row, 'totalDescuentos')),
        neto: Number(valor(row, 'neto')),
        essalud: Number(valor(row, 'essalud')),
      };

      // Si no vienen los totales, se calculan; si vienen, se comprueban.
      const sumaIngresos = r2(
        f.basico +
          f.asignacionFamiliar +
          f.horasExtras +
          f.comisiones +
          f.bonificaciones +
          f.gratificacion +
          f.vacaciones +
          f.cts,
      );
      const sumaDescuentos = r2(
        f.afp + f.onp + f.rentaQuinta + f.otrosDescuentos,
      );
      if (!f.totalIngresos) f.totalIngresos = sumaIngresos;
      else if (
        centimos(f.totalIngresos) !== centimos(sumaIngresos) &&
        sumaIngresos > 0
      ) {
        avisos.push(
          `Fila ${nFila} (${f.nombres}): TOTAL_INGRESOS dice ${f.totalIngresos.toFixed(2)} y los conceptos suman ${sumaIngresos.toFixed(2)}. Se usa el declarado.`,
        );
      }
      if (!f.totalDescuentos) f.totalDescuentos = sumaDescuentos;
      else if (
        centimos(f.totalDescuentos) !== centimos(sumaDescuentos) &&
        sumaDescuentos > 0
      ) {
        avisos.push(
          `Fila ${nFila} (${f.nombres}): TOTAL_DESCUENTOS dice ${f.totalDescuentos.toFixed(2)} y los descuentos suman ${sumaDescuentos.toFixed(2)}. Se usa el declarado.`,
        );
      }

      // Esta sí es bloqueante: si el neto no cuadra, el asiento no cuadraría.
      const netoEsperado = r2(f.totalIngresos - f.totalDescuentos);
      if (centimos(f.neto) !== centimos(netoEsperado)) {
        errores.push(
          `Fila ${nFila} (${f.nombres}): ingresos ${f.totalIngresos.toFixed(2)} − descuentos ${f.totalDescuentos.toFixed(2)} = ${netoEsperado.toFixed(2)}, pero NETO dice ${f.neto.toFixed(2)}.`,
        );
        return;
      }
      if (f.neto < 0) {
        errores.push(`Fila ${nFila} (${f.nombres}): el neto es negativo.`);
        return;
      }
      filas.push(f);
    });

    if (!filas.length && !errores.length) {
      errores.push('No se reconoció ninguna fila con datos.');
    }
    return {
      filas,
      errores,
      avisos,
      columnasReconocidas: reconocidas,
      columnasIgnoradas: ignoradas,
      totales: this.sumar(filas),
    };
  }

  private sumar(filas: FilaPlanilla[]): LecturaPlanilla['totales'] {
    const s = (f: (x: FilaPlanilla) => number) =>
      r2(filas.reduce((a, x) => a + f(x), 0));
    return {
      trabajadores: filas.length,
      basico: s((x) => x.basico),
      asignacionFamiliar: s((x) => x.asignacionFamiliar),
      horasExtras: s((x) => x.horasExtras),
      comisiones: s((x) => x.comisiones),
      bonificaciones: s((x) => x.bonificaciones),
      gratificacion: s((x) => x.gratificacion),
      vacaciones: s((x) => x.vacaciones),
      cts: s((x) => x.cts),
      totalIngresos: s((x) => x.totalIngresos),
      afp: s((x) => x.afp),
      onp: s((x) => x.onp),
      rentaQuinta: s((x) => x.rentaQuinta),
      otrosDescuentos: s((x) => x.otrosDescuentos),
      totalDescuentos: s((x) => x.totalDescuentos),
      neto: s((x) => x.neto),
      essalud: s((x) => x.essalud),
    };
  }

  // ───────────────────────── Importación ─────────────────────────

  async importar(params: {
    empresaId: number;
    usuarioId: number;
    anio: number;
    mes: number;
    buffer: Buffer;
    nombreArchivo?: string;
    simular?: boolean;
  }) {
    const { empresaId, usuarioId, anio, mes, buffer, simular = false } = params;
    if (!Number.isInteger(mes) || mes < 1 || mes > 12)
      throw new BadRequestException('Mes inválido');
    if (!Number.isInteger(anio) || anio < 2000)
      throw new BadRequestException('Año inválido');

    const lectura = this.leer(buffer);
    const previa = await this.prisma.planillaImportada.findUnique({
      where: { empresaId_anio_mes: { empresaId, anio, mes } },
      select: { id: true, trabajadores: true, asientoId: true, creadoEn: true },
    });

    const resumen = {
      anio,
      mes,
      simulado: simular,
      ...lectura,
      // Las filas completas solo hacen falta para la vista previa; en la
      // respuesta de la importación real sobran.
      filas: simular ? lectura.filas : [],
      yaImportada: previa
        ? {
            id: previa.id,
            trabajadores: previa.trabajadores,
            asientoId: previa.asientoId,
            creadoEn: previa.creadoEn,
          }
        : null,
      planillaId: null as number | null,
      gastoId: null as number | null,
      asiento: null as { id: number; cuo: string; totalDebe: number } | null,
    };

    if (simular || lectura.errores.length) return resumen;

    if (previa) {
      throw new BadRequestException(
        `La planilla de ${String(mes).padStart(2, '0')}/${anio} ya se importó (${previa.trabajadores} trabajadores). Extorna su asiento y bórrala antes de volver a subirla.`,
      );
    }

    const t = lectura.totales;
    // El gasto del mes: lo que le cuesta la planilla a la empresa, que es el
    // total de ingresos MÁS el aporte del empleador. El neto no es el costo.
    const costoEmpresa = r2(t.totalIngresos + t.essalud);

    const gasto = await this.prisma.gastoOperativo.create({
      data: {
        empresaId,
        mes,
        anio,
        fecha: new Date(Date.UTC(anio, mes - 1, 28, 12, 0, 0)),
        categoria: 'SUELDOS',
        etiqueta: `Planilla ${String(mes).padStart(2, '0')}/${anio}`,
        monto: costoEmpresa,
        moneda: 'PEN',
        descripcion: `Planilla importada · ${t.trabajadores} trabajador(es)`,
        recurrenteDiario: false,
      },
      select: { id: true },
    });

    const planilla = await this.prisma.planillaImportada.create({
      data: {
        empresaId,
        anio,
        mes,
        gastoId: gasto.id,
        archivoNombre: params.nombreArchivo ?? null,
        trabajadores: t.trabajadores,
        totalIngresos: t.totalIngresos,
        totalDescuentos: t.totalDescuentos,
        totalNeto: t.neto,
        totalEssalud: t.essalud,
        importadoPorId: usuarioId,
        detalles: {
          create: lectura.filas.map((f) => ({
            dni: f.dni,
            nombres: f.nombres,
            basico: f.basico,
            asignacionFamiliar: f.asignacionFamiliar,
            horasExtras: f.horasExtras,
            comisiones: f.comisiones,
            bonificaciones: f.bonificaciones,
            gratificacion: f.gratificacion,
            vacaciones: f.vacaciones,
            cts: f.cts,
            totalIngresos: f.totalIngresos,
            afp: f.afp,
            onp: f.onp,
            rentaQuinta: f.rentaQuinta,
            otrosDescuentos: f.otrosDescuentos,
            totalDescuentos: f.totalDescuentos,
            neto: f.neto,
            essalud: f.essalud,
          })),
        },
      },
      select: { id: true },
    });

    const asiento = await this.asentar(
      empresaId,
      usuarioId,
      anio,
      mes,
      t,
      planilla.id,
    );
    await this.prisma.planillaImportada.update({
      where: { id: planilla.id },
      data: { asientoId: asiento.id },
    });

    resumen.planillaId = planilla.id;
    resumen.gastoId = gasto.id;
    resumen.asiento = {
      id: asiento.id,
      cuo: asiento.cuo,
      totalDebe: asiento.totalDebe,
    };
    return resumen;
  }

  /** El asiento de provisión de la planilla, con las cuentas del mapeo. */
  private async asentar(
    empresaId: number,
    usuarioId: number,
    anio: number,
    mes: number,
    t: LecturaPlanilla['totales'],
    planillaId: number,
  ) {
    const config = await this.prisma.configuracionContable.findMany({
      where: { empresaId },
      select: {
        clave: true,
        valor: true,
        cuenta: { select: { codigo: true } },
      },
    });
    const porClave = new Map(config.map((c) => [c.clave, c]));
    const cuenta = (clave: string) => {
      const c = porClave.get(clave)?.cuenta?.codigo;
      if (!c) {
        throw new BadRequestException(
          `Falta configurar la cuenta para ${clave}. Contabilidad › Configuración contable.`,
        );
      }
      return c;
    };
    const usaClase9 =
      String(porClave.get('USA_CLASE_9')?.valor ?? 'false') === 'true';

    const glosa = `Planilla ${String(mes).padStart(2, '0')}/${anio} · ${t.trabajadores} trabajador(es)`;
    const lineas: LineaAsiento[] = [];
    const agregar = (
      clave: string,
      importe: number,
      alDebe: boolean,
      texto: string,
    ) => {
      if (centimos(importe) <= 0) return;
      lineas.push({
        cuenta: cuenta(clave),
        debe: alDebe ? importe : 0,
        haber: alDebe ? 0 : importe,
        glosa: texto,
      });
    };

    // Debe: lo que le cuesta a la empresa.
    const remuneraciones = r2(
      t.basico + t.asignacionFamiliar + t.horasExtras + t.bonificaciones,
    );
    agregar(
      'SUELDOS',
      remuneraciones,
      true,
      'Sueldos, asignación, horas extras y bonos',
    );
    agregar('COMISIONES_VENDEDORES', t.comisiones, true, 'Comisiones');
    agregar('GRATIFICACIONES', t.gratificacion, true, 'Gratificaciones');
    agregar('VACACIONES', t.vacaciones, true, 'Vacaciones');
    agregar('CTS', t.cts, true, 'Compensación por tiempo de servicios');
    agregar('ESSALUD_GASTO', t.essalud, true, 'EsSalud, aporte del empleador');

    // Haber: lo que queda por pagar, a quién.
    agregar(
      'SUELDOS_POR_PAGAR',
      t.neto,
      false,
      'Neto a pagar a los trabajadores',
    );
    agregar('AFP_POR_PAGAR', t.afp, false, 'AFP retenida');
    agregar('ONP_POR_PAGAR', t.onp, false, 'ONP retenida');
    agregar(
      'RENTA_QUINTA_POR_PAGAR',
      t.rentaQuinta,
      false,
      'Renta de 5ta retenida',
    );
    agregar(
      'OTROS_DESCUENTOS_POR_PAGAR',
      t.otrosDescuentos,
      false,
      'Otros descuentos',
    );
    agregar('ESSALUD_POR_PAGAR', t.essalud, false, 'EsSalud por pagar');

    // Destino del gasto: la planilla es administrativa salvo que la contadora
    // diga otra cosa, y ese reparto por área no está en los datos.
    if (usaClase9) {
      const totalGasto = r2(t.totalIngresos + t.essalud);
      agregar(
        'DESTINO_GASTO_ADMINISTRATIVO',
        totalGasto,
        true,
        'Destino de la planilla',
      );
      agregar('CARGAS_IMPUTABLES', totalGasto, false, 'Cargas imputables');
    }

    return this.diario.registrar(empresaId, usuarioId, {
      fecha: new Date(Date.UTC(anio, mes - 1, 28, 12, 0, 0)),
      glosa,
      origen: 'PLANILLA',
      origenId: planillaId,
      sedeId: null,
      lineas,
    });
  }

  // ───────────────────────── Consulta ─────────────────────────

  async historial(empresaId: number) {
    const planillas = await this.prisma.planillaImportada.findMany({
      where: { empresaId },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      include: {
        importadoPor: { select: { nombre: true } },
        _count: { select: { detalles: true } },
      },
    });
    const asientos = await this.prisma.asiento.findMany({
      where: { empresaId, origen: 'PLANILLA' },
      select: {
        id: true,
        cuo: true,
        estado: true,
        origenId: true,
        totalDebe: true,
      },
    });
    const porId = new Map(asientos.map((a) => [a.id, a]));
    return planillas.map((p) => {
      const a = p.asientoId ? porId.get(p.asientoId) : null;
      return {
        id: p.id,
        anio: p.anio,
        mes: p.mes,
        trabajadores: p.trabajadores,
        totalIngresos: Number(p.totalIngresos),
        totalDescuentos: Number(p.totalDescuentos),
        totalNeto: Number(p.totalNeto),
        totalEssalud: Number(p.totalEssalud),
        costoEmpresa: r2(Number(p.totalIngresos) + Number(p.totalEssalud)),
        archivoNombre: p.archivoNombre,
        importadoPor: p.importadoPor?.nombre ?? null,
        creadoEn: p.creadoEn,
        gastoId: p.gastoId,
        asiento: a
          ? {
              id: a.id,
              cuo: a.cuo,
              estado: a.estado,
              totalDebe: Number(a.totalDebe),
            }
          : null,
      };
    });
  }

  async detalle(empresaId: number, id: number) {
    const p = await this.prisma.planillaImportada.findFirst({
      where: { id, empresaId },
      include: {
        detalles: { orderBy: { nombres: 'asc' } },
        importadoPor: { select: { nombre: true } },
      },
    });
    if (!p) throw new NotFoundException('Planilla no encontrada');
    return {
      ...p,
      totalIngresos: Number(p.totalIngresos),
      totalDescuentos: Number(p.totalDescuentos),
      totalNeto: Number(p.totalNeto),
      totalEssalud: Number(p.totalEssalud),
      detalles: p.detalles.map((d) => ({
        ...d,
        basico: Number(d.basico),
        asignacionFamiliar: Number(d.asignacionFamiliar),
        horasExtras: Number(d.horasExtras),
        comisiones: Number(d.comisiones),
        bonificaciones: Number(d.bonificaciones),
        gratificacion: Number(d.gratificacion),
        vacaciones: Number(d.vacaciones),
        cts: Number(d.cts),
        totalIngresos: Number(d.totalIngresos),
        afp: Number(d.afp),
        onp: Number(d.onp),
        rentaQuinta: Number(d.rentaQuinta),
        otrosDescuentos: Number(d.otrosDescuentos),
        totalDescuentos: Number(d.totalDescuentos),
        neto: Number(d.neto),
        essalud: Number(d.essalud),
      })),
    };
  }

  /**
   * Borra una planilla importada. Exige que su asiento esté extornado: primero
   * se deshace la contabilidad y luego el dato, nunca al revés.
   */
  async eliminar(empresaId: number, id: number) {
    const p = await this.prisma.planillaImportada.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        asientoId: true,
        gastoId: true,
        anio: true,
        mes: true,
      },
    });
    if (!p) throw new NotFoundException('Planilla no encontrada');
    if (p.asientoId) {
      const a = await this.prisma.asiento.findUnique({
        where: { id: p.asientoId },
        select: { estado: true, cuo: true },
      });
      if (a && a.estado === 'REGISTRADO') {
        throw new BadRequestException(
          `El asiento ${a.cuo} sigue vigente. Extórnalo en el Libro Diario antes de borrar la planilla.`,
        );
      }
    }
    if (p.gastoId) {
      await this.prisma.gastoOperativo
        .delete({ where: { id: p.gastoId } })
        .catch(() => undefined);
    }
    await this.prisma.planillaImportada.delete({ where: { id: p.id } });
    return {
      message: `Planilla de ${String(p.mes).padStart(2, '0')}/${p.anio} eliminada`,
    };
  }
}
