/**
 * QA funcional · Fase 15 — Asientos de cobros, pagos, caja, gastos e ingresos
 *
 * Lo que comprueba, y por qué importa:
 *   · el cobro cierra la cuenta por cobrar: Σ haber del 1212 = lo cobrado,
 *     tanto si el cliente paga en dos veces como si paga de golpe;
 *   · el efectivo va al 1011 y lo que pasa por banco al 1041 — contar un Yape
 *     como efectivo descuadra el arqueo;
 *   · la detracción va al 1071 y NO a caja: ese dinero está en el Banco de la
 *     Nación y no se puede gastar;
 *   · la APERTURA y el CIERRE de caja **no** se asientan: declaran cuánto hay
 *     en el cajón, no mueven patrimonio, y asentarlos duplicaría el saldo;
 *   · un gasto recurrente diario se asienta UNA vez al mes por el total del mes,
 *     no 30 veces, y vuelve a asentarse el mes siguiente;
 *   · con la clase 9 activada cada gasto lleva su destino (941/951 contra 791),
 *     y con ella apagada no aparece ninguna cuenta de clase 9;
 *   · regenerar no duplica, y un usuario de ventas no puede generar.
 *
 * Trabaja sobre un período de pruebas (06/2019) con documentos propios y deja
 * la base como la encontró: borra sus asientos, sus filas y restaura el mapeo.
 *
 * Uso:  pnpm run qa:asientos-cobros
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:4201/api';
const EMPRESA = 1;
const SEDE = 1;
// Período de pruebas: lejos de los datos de la demo, para no pisar nada real.
const ANIO = 2019;
const MES = 6;
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };
const c2 = (n) => Math.round(Number(n) * 100);
/** Mediodía de Lima del día pedido: una fecha que no se corre de mes. */
const dia = (anio, mes, d) => new Date(Date.UTC(anio, mes - 1, d, 17, 0, 0));

async function api(ruta, token, metodo = 'GET', body) {
  const r = await fetch(API + ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, data: j?.data, message: j?.message };
}
async function login(email = 'gerencia@kaisercorp.com.pe', password = 'kaiser123') {
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }) });
  const j = await r.json();
  if (r.status >= 400 || !j.data) throw new Error(`login falló (HTTP ${r.status})`);
  if (!j.data.requiresSedeSelection) return j.data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${j.data.tempToken}` },
    body: JSON.stringify({ sedeId: SEDE }) });
  const c = await r2.json();
  return c.data.accessToken;
}

/** Busca una línea por código de cuenta dentro de un asiento. */
const linea = (a, codigo) => a.detalles.find((d) => d.cuenta.codigo === codigo);
/** El asiento de un documento concreto, por origen e id. */
const deDoc = (asientos, origen, origenId) =>
  asientos.find((a) => a.origen === origen && a.origenId === origenId);

/** Todos los orígenes de la Fase 2, para no depender del valor por defecto. */
const ORIGENES = ['COBRO', 'PAGO', 'CAJA', 'GASTO', 'INGRESO'];

async function main() {
  const token = await login();

  // ── Documentos reales sobre los que colgar los cobros y los pagos ──
  const comprobante = await prisma.comprobante.findFirst({
    where: {
      empresaId: EMPRESA,
      tipoDoc: { in: ['01', '03'] },
      tipoMoneda: 'PEN',
      estadoEnvioSunat: { notIn: ['RECHAZADO', 'ANULADO'] },
    },
    orderBy: { id: 'desc' },
    select: { id: true, serie: true, correlativo: true, sedeId: true, montoDetraccion: true },
  });
  const compra = await prisma.compra.findFirst({
    where: { empresaId: EMPRESA, estado: 'REGISTRADO', moneda: 'PEN' },
    orderBy: { id: 'desc' },
    select: { id: true, serie: true, numero: true },
  });
  const usuario = await prisma.usuario.findFirst({
    where: { empresaId: EMPRESA }, select: { id: true },
  });
  if (!comprobante || !compra || !usuario) {
    console.log('\n⚠ faltan comprobante, compra o usuario: nada que comprobar\n');
    await prisma.$disconnect();
    process.exit(0);
  }

  // Estado previo que hay que devolver tal cual al terminar.
  const clase9 = await prisma.configuracionContable.findUnique({
    where: { empresaId_clave: { empresaId: EMPRESA, clave: 'USA_CLASE_9' } },
    select: { id: true, valor: true },
  });
  const detraccionOriginal = comprobante.montoDetraccion;
  const periodosPrevios = await prisma.periodoContable.findMany({
    where: { empresaId: EMPRESA, anio: ANIO, mes: { in: [MES, MES + 1] } },
    select: { id: true, mes: true },
  });
  const asientosPrevios = new Set(
    (await prisma.asiento.findMany({
      where: { empresaId: EMPRESA, periodoId: { in: periodosPrevios.map((p) => p.id) } },
      select: { id: true },
    })).map((a) => a.id),
  );

  const creado = { pagos: [], pagosCompra: [], caja: [], gastos: [], ingresos: [] };
  /** Borra los asientos que este script haya provocado, en los dos períodos. */
  const limpiarAsientos = async () => {
    const periodos = await prisma.periodoContable.findMany({
      where: { empresaId: EMPRESA, anio: ANIO, mes: { in: [MES, MES + 1] } },
      select: { id: true },
    });
    if (!periodos.length) return;
    // Los extornos apuntan al original: primero se sueltan las referencias.
    await prisma.asiento.updateMany({
      where: { periodoId: { in: periodos.map((p) => p.id) }, id: { notIn: [...asientosPrevios, 0] } },
      data: { extornaAId: null },
    });
    await prisma.asiento.deleteMany({
      where: { periodoId: { in: periodos.map((p) => p.id) }, id: { notIn: [...asientosPrevios, 0] } },
    });
  };

  try {
    console.log(`\n═══ Período de pruebas ${MES}/${ANIO} ═══`);
    // Si alguien dejó asientos ahí, no se tocan: todas las comprobaciones van
    // por origen + origenId, no por recuento del período.
    if (asientosPrevios.size)
      console.log(`   · ${asientosPrevios.size} asiento(s) ajeno(s) en el período: se respetan`);

    // ── Documentos de prueba ──
    // Cobro en dos veces: 40 en efectivo y 60 por transferencia. La suma tiene
    // que cerrar contra el 1212 exactamente igual que un cobro único.
    const cobroEfectivo = await prisma.pago.create({
      data: { comprobanteId: comprobante.id, empresaId: EMPRESA, usuarioId: usuario.id,
        fecha: dia(ANIO, MES, 3), monto: 40, medioPago: 'EFECTIVO', observacion: 'QA asientos' },
      select: { id: true },
    });
    const cobroBanco = await prisma.pago.create({
      data: { comprobanteId: comprobante.id, empresaId: EMPRESA, usuarioId: usuario.id,
        fecha: dia(ANIO, MES, 4), monto: 60, medioPago: 'TRANSFERENCIA', observacion: 'QA asientos' },
      select: { id: true },
    });
    creado.pagos = [cobroEfectivo.id, cobroBanco.id];

    const pagoProveedor = await prisma.pagoCompra.create({
      data: { compraId: compra.id, empresaId: EMPRESA, usuarioId: usuario.id,
        fecha: dia(ANIO, MES, 5), monto: 55, metodoPago: 'EFECTIVO', observacion: 'QA asientos' },
      select: { id: true },
    });
    creado.pagosCompra = [pagoProveedor.id];

    const cajaBase = { empresaId: EMPRESA, usuarioId: usuario.id, sedeId: SEDE, estado: 'ACTIVO' };
    const cajaApertura = await prisma.movimientoCaja.create({
      data: { ...cajaBase, tipoMovimiento: 'APERTURA', fecha: dia(ANIO, MES, 2), montoInicial: 500 },
      select: { id: true },
    });
    const cajaIngreso = await prisma.movimientoCaja.create({
      data: { ...cajaBase, tipoMovimiento: 'INGRESO', fecha: dia(ANIO, MES, 6), monto: 30,
        descripcionGasto: 'QA ingreso de caja', metodoPago: 'EFECTIVO' },
      select: { id: true },
    });
    const cajaEgreso = await prisma.movimientoCaja.create({
      data: { ...cajaBase, tipoMovimiento: 'EGRESO', fecha: dia(ANIO, MES, 7), monto: 25,
        categoriaGasto: 'Servicios básicos', descripcionGasto: 'QA egreso de caja', metodoPago: 'EFECTIVO' },
      select: { id: true },
    });
    const cajaCierre = await prisma.movimientoCaja.create({
      data: { ...cajaBase, tipoMovimiento: 'CIERRE', fecha: dia(ANIO, MES, 8), montoFinal: 505,
        fechaCierre: dia(ANIO, MES, 8) },
      select: { id: true },
    });
    creado.caja = [cajaApertura.id, cajaIngreso.id, cajaEgreso.id, cajaCierre.id];

    // Gasto puntual de publicidad: con clase 9 su destino es VENTAS (951).
    const gastoPublicidad = await prisma.gastoOperativo.create({
      data: { empresaId: EMPRESA, mes: MES, anio: ANIO, fecha: dia(ANIO, MES, 15),
        categoria: 'PUBLICIDAD', monto: 80, moneda: 'PEN', medioPago: 'TRANSFERENCIA',
        descripcion: 'QA publicidad', numeroDocumento: 'QA-001' },
      select: { id: true },
    });
    // Recurrente diario: 10 al día del 1 de junio al 5 de julio. Junio son 30
    // días (300) y julio 5 (50): un asiento por mes, no uno por día.
    const gastoRecurrente = await prisma.gastoOperativo.create({
      data: { empresaId: EMPRESA, mes: MES, anio: ANIO, categoria: 'OTROS', monto: 10,
        moneda: 'PEN', medioPago: 'EFECTIVO', recurrenteDiario: true,
        fechaInicio: dia(ANIO, MES, 1), fechaFin: dia(ANIO, MES + 1, 5),
        descripcion: 'QA recurrente diario' },
      select: { id: true },
    });
    creado.gastos = [gastoPublicidad.id, gastoRecurrente.id];

    const ingreso = await prisma.ingresoManual.create({
      data: { empresaId: EMPRESA, concepto: 'QA préstamo del socio', tipo: 'PRESTAMO',
        monto: 45, fecha: dia(ANIO, MES, 9) },
      select: { id: true },
    });
    creado.ingresos = [ingreso.id];

    // ── Ronda A · sin clase 9 ──
    console.log('\n═══ Vista previa: no escribe ═══');
    if (clase9) {
      await prisma.configuracionContable.update({ where: { id: clase9.id }, data: { valor: 'false' } });
    }
    const sim = await api('/contabilidad/generar?simular=true', token, 'POST',
      { anio: ANIO, mes: MES, origenes: ORIGENES });
    ok(sim.status === 201 && sim.data?.simulado === true, `simula (HTTP ${sim.status})`);
    ok(sim.data?.totales?.generados >= 8,
      `anuncia al menos los 8 documentos del QA — 2 cobros, 1 pago, 2 de caja, 2 gastos y 1 ingreso (${sim.data?.totales?.generados})`);
    const trasSim = await api(`/contabilidad/asientos?anio=${ANIO}&mes=${MES}`, token);
    ok((trasSim.data?.asientos?.length ?? 0) === 0, 'tras simular no hay ningún asiento escrito');

    console.log('\n═══ Generar ═══');
    const gen = await api('/contabilidad/generar', token, 'POST',
      { anio: ANIO, mes: MES, origenes: ORIGENES });
    ok(gen.status === 201, `genera (HTTP ${gen.status}) ${gen.message ?? ''}`);
    ok(gen.data?.totales?.errores === 0,
      `sin errores (${gen.data?.totales?.errores}) ${JSON.stringify(gen.data?.errores ?? [])}`);
    ok(gen.data?.totales?.generados === sim.data?.totales?.generados,
      `escribe lo mismo que anunció (${gen.data?.totales?.generados})`);

    const diario = await api(`/contabilidad/asientos?anio=${ANIO}&mes=${MES}`, token);
    const asientos = diario.data?.asientos ?? [];
    ok(c2(diario.data.totales.debe) === c2(diario.data.totales.haber),
      `el período cuadra: ${diario.data.totales.debe}`);
    ok(asientos.every((a) => c2(a.totalDebe) === c2(a.totalHaber)), 'cada asiento cuadra por separado');
    ok(asientos.every((a) => a.detalles.every((d) => (d.debe > 0) !== (d.haber > 0))),
      'ninguna línea va al debe y al haber a la vez');

    console.log('\n═══ Cobros: el 1212 cierra ═══');
    const aParcial = deDoc(asientos, 'COBRO', cobroEfectivo.id);
    const aResto = deDoc(asientos, 'COBRO', cobroBanco.id);
    ok(!!aParcial && !!aResto, 'los dos cobros tienen su asiento');
    if (aParcial && aResto) {
      ok(c2(linea(aParcial, '1212')?.haber) === c2(40), `el cobro parcial baja el 1212 en 40 (${linea(aParcial, '1212')?.haber})`);
      ok(c2(linea(aResto, '1212')?.haber) === c2(60), `el resto baja el 1212 en 60 (${linea(aResto, '1212')?.haber})`);
      const contra1212 = [aParcial, aResto].reduce((s, a) => s + Number(linea(a, '1212')?.haber ?? 0), 0);
      ok(c2(contra1212) === c2(100), `los dos cobros suman los 100 contra el 1212 (${contra1212})`);
      ok(c2(linea(aParcial, '1011')?.debe) === c2(40), 'el efectivo entra a caja (1011)');
      ok(!linea(aParcial, '1041'), 'y no toca el banco');
      ok(c2(linea(aResto, '1041')?.debe) === c2(60), 'la transferencia entra al banco (1041)');
      ok(!linea(aResto, '1011'), 'y no toca la caja');
      ok(aParcial.detalles.every((d) => d.serie === comprobante.serie),
        'las líneas llevan el documento del PLE (serie y número)');
      ok(aParcial.sede?.id === comprobante.sedeId || (!comprobante.sedeId && !aParcial.sede),
        'el cobro hereda la sede del comprobante');
    }

    console.log('\n═══ Pago a proveedor ═══');
    const aPago = deDoc(asientos, 'PAGO', pagoProveedor.id);
    ok(!!aPago, 'el pago tiene su asiento');
    if (aPago) {
      ok(c2(linea(aPago, '4212')?.debe) === c2(55), `baja la cuenta por pagar (${linea(aPago, '4212')?.debe})`);
      ok(c2(linea(aPago, '1011')?.haber) === c2(55), 'y sale de caja, que fue en efectivo');
    }

    console.log('\n═══ Caja: ingreso y egreso, sin apertura ni cierre ═══');
    const aIngresoCaja = deDoc(asientos, 'CAJA', cajaIngreso.id);
    const aEgresoCaja = deDoc(asientos, 'CAJA', cajaEgreso.id);
    ok(!!aIngresoCaja && !!aEgresoCaja, 'el ingreso y el egreso de caja tienen asiento');
    if (aIngresoCaja) {
      ok(c2(linea(aIngresoCaja, '1011')?.debe) === c2(30), 'el ingreso entra a caja');
      ok(c2(linea(aIngresoCaja, '7599')?.haber) === c2(30), 'contra otros ingresos de gestión');
    }
    if (aEgresoCaja) {
      ok(c2(linea(aEgresoCaja, '6599')?.debe) === c2(25), '"Servicios básicos" cae en otros gastos (6599)');
      ok(c2(linea(aEgresoCaja, '1011')?.haber) === c2(25), 'y sale de caja');
    }
    ok(!deDoc(asientos, 'CAJA', cajaApertura.id), 'la APERTURA no se asienta: no es un hecho contable');
    ok(!deDoc(asientos, 'CAJA', cajaCierre.id), 'el CIERRE tampoco');
    ok((gen.data?.omitidos ?? []).every((o) => o.origenId !== cajaApertura.id || o.origen !== 'CAJA'),
      'y ni siquiera se listan como omitidos: se filtran antes');

    console.log('\n═══ Gastos, sin clase 9 ═══');
    const aPublicidad = deDoc(asientos, 'GASTO', gastoPublicidad.id);
    const aRecurrente = deDoc(asientos, 'GASTO', gastoRecurrente.id);
    ok(!!aPublicidad && !!aRecurrente, 'los dos gastos tienen asiento');
    if (aPublicidad) {
      ok(c2(linea(aPublicidad, '6371')?.debe) === c2(80), `publicidad al 6371 (${linea(aPublicidad, '6371')?.debe})`);
      ok(c2(linea(aPublicidad, '1041')?.haber) === c2(80), 'pagado por banco, porque el medio es transferencia');
      ok(linea(aPublicidad, '6371')?.numero === 'QA-001', 'lleva el número de documento del gasto');
    }
    if (aRecurrente) {
      ok(c2(aRecurrente.totalDebe) === c2(300),
        `el recurrente se asienta por el total del mes: 10 × 30 días = 300 (${aRecurrente.totalDebe})`);
      ok(asientos.filter((a) => a.origen === 'GASTO' && a.origenId === gastoRecurrente.id).length === 1,
        'y en UN solo asiento, no uno por día');
    }
    const clase9Cuentas = ['941', '951', '791'];
    ok(asientos.every((a) => a.detalles.every((d) => !clase9Cuentas.includes(d.cuenta.codigo))),
      'con la clase 9 apagada no aparece ninguna cuenta 94/95/79');

    console.log('\n═══ Ingreso manual ═══');
    const aIngreso = deDoc(asientos, 'INGRESO', ingreso.id);
    ok(!!aIngreso, 'el ingreso manual tiene su asiento');
    if (aIngreso) {
      ok(c2(linea(aIngreso, '1011')?.debe) === c2(45), 'entra por caja (el modelo no guarda medio de pago)');
      ok(c2(linea(aIngreso, '7599')?.haber) === c2(45), 'contra otros ingresos de gestión');
    }

    console.log('\n═══ Regenerar no duplica ═══');
    const otra = await api('/contabilidad/generar', token, 'POST',
      { anio: ANIO, mes: MES, origenes: ORIGENES });
    ok(otra.data?.totales?.generados === 0, `no vuelve a generar nada (${otra.data?.totales?.generados})`);
    ok(otra.data?.totales?.omitidos === gen.data?.totales?.generados,
      `omite exactamente los que generó (${otra.data?.totales?.omitidos})`);
    ok((otra.data?.omitidos ?? []).every((o) => /ya asentado en \d{6}-/.test(o.motivo)),
      'y dice en qué asiento está cada uno');
    const diario2 = await api(`/contabilidad/asientos?anio=${ANIO}&mes=${MES}`, token);
    ok(diario2.data?.asientos?.length === asientos.length, 'el diario no creció');

    // ── Ronda B · con clase 9 ──
    console.log('\n═══ Con la clase 9 activada ═══');
    await limpiarAsientos();
    if (clase9) {
      const puesto = await api('/contabilidad/configuracion', token, 'PUT',
        { items: [{ clave: 'USA_CLASE_9', valor: 'true' }] });
      ok(puesto.status === 200, `el toggle se guarda por la API (HTTP ${puesto.status})`);
      ok(
        (puesto.data ?? []).find((f) => f.clave === 'USA_CLASE_9')?.valor === 'true',
        'y vuelve activado en la respuesta',
      );
    }
    const gen9 = await api('/contabilidad/generar', token, 'POST',
      { anio: ANIO, mes: MES, origenes: ['GASTO', 'CAJA'] });
    ok(gen9.data?.totales?.errores === 0,
      `genera con destino sin errores ${JSON.stringify(gen9.data?.errores ?? [])}`);
    const diario9 = await api(`/contabilidad/asientos?anio=${ANIO}&mes=${MES}`, token);
    const asientos9 = diario9.data?.asientos ?? [];
    const pub9 = deDoc(asientos9, 'GASTO', gastoPublicidad.id);
    const rec9 = deDoc(asientos9, 'GASTO', gastoRecurrente.id);
    if (pub9) {
      ok(c2(linea(pub9, '951')?.debe) === c2(80), `publicidad va a gasto de VENTAS (951): ${linea(pub9, '951')?.debe}`);
      ok(c2(linea(pub9, '791')?.haber) === c2(80), 'contra cargas imputables (791)');
      ok(c2(pub9.totalDebe) === c2(160), 'el asiento lleva naturaleza y destino: 80 + 80');
    }
    if (rec9) {
      ok(c2(linea(rec9, '941')?.debe) === c2(300),
        `el recurrente (OTROS) va a gasto ADMINISTRATIVO (941): ${linea(rec9, '941')?.debe}`);
    }
    ok(c2(diario9.data.totales.debe) === c2(diario9.data.totales.haber), 'y el período sigue cuadrado');

    // ── Ronda C · detracción ──
    console.log('\n═══ La detracción no es caja libre ═══');
    await limpiarAsientos();
    await prisma.comprobante.update({
      where: { id: comprobante.id }, data: { montoDetraccion: 12 },
    });
    const genDet = await api('/contabilidad/generar', token, 'POST',
      { anio: ANIO, mes: MES, origenes: ['COBRO'] });
    ok(genDet.data?.totales?.generados >= 2, `asienta los dos cobros (${genDet.data?.totales?.generados})`);
    const diarioDet = await api(`/contabilidad/asientos?anio=${ANIO}&mes=${MES}`, token);
    const detParcial = deDoc(diarioDet.data?.asientos ?? [], 'COBRO', cobroEfectivo.id);
    const detResto = deDoc(diarioDet.data?.asientos ?? [], 'COBRO', cobroBanco.id);
    if (detParcial) {
      ok(c2(linea(detParcial, '1071')?.debe) === c2(12),
        `los 12 detraídos van al 1071, no a caja (${linea(detParcial, '1071')?.debe})`);
      ok(c2(linea(detParcial, '1011')?.debe) === c2(28), 'y a caja entran solo los 28 restantes');
      ok(c2(linea(detParcial, '1212')?.haber) === c2(40), 'el 1212 baja igual por los 40 cobrados');
    }
    ok(detResto && !linea(detResto, '1071'),
      'el segundo cobro ya no lleva detracción: se cubrió con el primero');
    await prisma.comprobante.update({
      where: { id: comprobante.id }, data: { montoDetraccion: detraccionOriginal },
    });

    // ── Ronda D · el recurrente el mes siguiente ──
    console.log('\n═══ El recurrente vuelve a asentarse el mes siguiente ═══');
    const genJulio = await api('/contabilidad/generar', token, 'POST',
      { anio: ANIO, mes: MES + 1, origenes: ['GASTO'] });
    ok(genJulio.data?.totales?.errores === 0,
      `julio se genera sin errores ${JSON.stringify(genJulio.data?.errores ?? [])}`);
    const diarioJulio = await api(`/contabilidad/asientos?anio=${ANIO}&mes=${MES + 1}`, token);
    const recJulio = deDoc(diarioJulio.data?.asientos ?? [], 'GASTO', gastoRecurrente.id);
    ok(!!recJulio, 'el mismo gasto recurrente tiene asiento propio en julio');
    if (recJulio) {
      // La ronda B dejó la clase 9 ACTIVADA y no se apaga después, así que este
      // asiento lleva sus dos pares: el gasto y su destino. Medir `totalDebe`
      // daba 100 y parecía un prorrateo mal hecho cuando eran 50 + 50. Se mide
      // la línea del gasto, que es lo que esta comprobación dice comprobar.
      const lineaGasto = recJulio.detalles.find((d) => d.cuenta.codigo === '6599');
      ok(c2(lineaGasto?.debe) === c2(50),
        `prorratea por los 5 días que cubre: 10 × 5 = ${lineaGasto?.debe}`);
      const lineaDestino = recJulio.detalles.find((d) => d.cuenta.codigo === '941');
      ok(c2(lineaDestino?.debe) === c2(50), `y su destino de clase 9 va por lo mismo (${lineaDestino?.debe})`);
      ok(c2(recJulio.totalDebe) === c2(100), `el asiento suma gasto + destino: ${recJulio.totalDebe}`);
    }
    ok(!deDoc(diarioJulio.data?.asientos ?? [], 'GASTO', gastoPublicidad.id),
      'y el gasto puntual de junio no se cuela en julio');

    // ── Ronda E · permisos ──
    console.log('\n═══ Permisos ═══');
    let vendedor = null;
    try { vendedor = await login('ventas@kaisercorp.com.pe', 'kaiser123'); } catch { /* sin cuenta de ventas */ }
    if (vendedor) {
      const r1 = await api('/contabilidad/generar?simular=true', vendedor, 'POST',
        { anio: ANIO, mes: MES, origenes: ORIGENES });
      ok(r1.status === 403, `ventas no puede generar (HTTP ${r1.status})`);
      const r2 = await api('/contabilidad/configuracion', vendedor, 'PUT',
        { items: [{ clave: 'CAJA', cuentaId: null }] });
      ok(r2.status === 403, `ventas no puede cambiar el mapeo (HTTP ${r2.status})`);
      const r3 = await api('/contabilidad/configuracion', vendedor);
      ok(r3.status === 200, `pero sí leerlo: las lecturas están abiertas (HTTP ${r3.status})`);
    }

    console.log('\n═══ Configuración contable ═══');
    const conf = await api('/contabilidad/configuracion', token);
    ok(conf.status === 200 && Array.isArray(conf.data), `devuelve el mapeo (HTTP ${conf.status})`);
    ok((conf.data ?? []).some((f) => f.clave === 'CAJA' && f.cuenta?.codigo === '1011'),
      'CAJA apunta al 1011');
    ok((conf.data ?? []).some((f) => f.clave === 'USA_CLASE_9' && f.tipo === 'VALOR'),
      'USA_CLASE_9 se declara como valor, no como cuenta');
    const mala = await api('/contabilidad/configuracion', token, 'PUT',
      { items: [{ clave: 'NO_EXISTE', cuentaId: 1 }] });
    ok(mala.status >= 400, `una clave inventada se rechaza (HTTP ${mala.status})`);
    // El 10 es "Efectivo y equivalentes", una cuenta de agrupación: no imputable.
    const agrupacion = await prisma.cuentaContable.findFirst({
      where: { empresaId: EMPRESA, imputable: false }, select: { id: true },
    });
    if (agrupacion) {
      const noImputable = await api('/contabilidad/configuracion', token, 'PUT',
        { items: [{ clave: 'CAJA', cuentaId: agrupacion.id }] });
      ok(noImputable.status >= 400,
        `una cuenta de agrupación se rechaza antes de romper un asiento (HTTP ${noImputable.status})`);
    }
  } finally {
    // ── Dejar la base como estaba ──
    await limpiarAsientos();
    const huerfanos = await prisma.periodoContable.findMany({
      where: {
        empresaId: EMPRESA, anio: ANIO, mes: { in: [MES, MES + 1] },
        id: { notIn: [...periodosPrevios.map((p) => p.id), 0] },
      },
      select: { id: true },
    });
    if (huerfanos.length) {
      await prisma.periodoContable.deleteMany({ where: { id: { in: huerfanos.map((p) => p.id) } } });
    }
    if (creado.ingresos.length)
      await prisma.ingresoManual.deleteMany({ where: { id: { in: creado.ingresos } } });
    if (creado.gastos.length)
      await prisma.gastoOperativo.deleteMany({ where: { id: { in: creado.gastos } } });
    if (creado.caja.length)
      await prisma.movimientoCaja.deleteMany({ where: { id: { in: creado.caja } } });
    if (creado.pagosCompra.length)
      await prisma.pagoCompra.deleteMany({ where: { id: { in: creado.pagosCompra } } });
    if (creado.pagos.length)
      await prisma.pago.deleteMany({ where: { id: { in: creado.pagos } } });
    await prisma.comprobante.update({
      where: { id: comprobante.id }, data: { montoDetraccion: detraccionOriginal },
    });
    if (clase9) {
      await prisma.configuracionContable.update({
        where: { id: clase9.id }, data: { valor: clase9.valor },
      });
    }
  }

  console.log(fallos ? `\n✘ ${fallos} fallo(s)\n` : '\n✔ Asientos de cobros, pagos, caja y gastos: todo verde\n');
  await prisma.$disconnect();
  process.exit(fallos ? 1 : 0);
}

main().catch(async (e) => { console.error('\n✘ error:', e.message); await prisma.$disconnect(); process.exit(1); });
