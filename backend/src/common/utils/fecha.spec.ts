import { parseFechaEmision, parseFechaSoloDia, inicioDelDiaLima, finDelDiaLima } from './fecha';

/**
 * Kaiser opera en America/Lima (UTC-5). Lo que se protege aquí es que un
 * comprobante no se emita con la fecha del día anterior.
 *
 * Pasó de verdad: al emitir una factura contra el sandbox de SUNAT mandando
 * `fechaEmision: '2026-09-28'`, el XML viajó con IssueDate 2026-09-27, porque
 * `new Date('2026-09-28')` es medianoche UTC y en Lima eso es el día 27 a las
 * 19:00. La interfaz manda la fecha con hora y zona y por eso nunca lo sufrió,
 * pero cualquier integración o script que mande solo el día sí.
 */
describe('parseFechaEmision', () => {
  /** El día calendario tal como se ve en Lima. */
  const diaEnLima = (d: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(d);

  it('una fecha sin hora conserva su día en Lima', () => {
    expect(diaEnLima(parseFechaEmision('2026-09-28'))).toBe('2026-09-28');
  });

  it('no se corre ni en fin de mes ni en fin de año', () => {
    expect(diaEnLima(parseFechaEmision('2026-01-01'))).toBe('2026-01-01');
    expect(diaEnLima(parseFechaEmision('2026-03-01'))).toBe('2026-03-01');
    expect(diaEnLima(parseFechaEmision('2026-12-31'))).toBe('2026-12-31');
  });

  it('si trae hora y zona se respeta lo que envía el emisor', () => {
    const d = parseFechaEmision('2026-09-28T14:23:11-05:00');
    expect(d.toISOString()).toBe('2026-09-28T19:23:11.000Z');
    expect(diaEnLima(d)).toBe('2026-09-28');
  });

  it('una hora de madrugada en Lima sigue siendo ese día', () => {
    expect(diaEnLima(parseFechaEmision('2026-09-28T00:30:00-05:00'))).toBe('2026-09-28');
  });

  it('un Date ya construido se devuelve intacto', () => {
    const d = new Date('2026-09-28T10:00:00Z');
    expect(parseFechaEmision(d)).toBe(d);
  });

  it('así se comportaba antes: sin el helper, el día se corría', () => {
    // Deja constancia del fallo que motivó todo esto.
    expect(diaEnLima(new Date('2026-09-28'))).toBe('2026-09-27');
  });
});

describe('parseFechaSoloDia', () => {
  it('ancla al mediodía UTC para que el día aguante cualquier zona', () => {
    expect(parseFechaSoloDia('2026-09-28').toISOString()).toBe('2026-09-28T12:00:00.000Z');
  });

  it('acepta una fecha con hora y se queda con el día', () => {
    expect(parseFechaSoloDia('2026-09-28T23:45:00Z').toISOString()).toBe('2026-09-28T12:00:00.000Z');
  });
});

describe('inicioDelDiaLima / finDelDiaLima', () => {
  it('el día de Lima empieza a las 05:00 UTC, no a medianoche UTC', () => {
    expect(inicioDelDiaLima('2026-09-28').toISOString()).toBe(
      '2026-09-28T05:00:00.000Z',
    );
  });

  it('y acaba a las 04:59:59.999 UTC del día siguiente', () => {
    expect(finDelDiaLima('2026-09-28').toISOString()).toBe(
      '2026-09-29T04:59:59.999Z',
    );
  });

  it('un movimiento de las 14:00 de Lima cae dentro de su propio día', () => {
    // Es el caso que fallaba: el consolidado pedido "de hoy" no lo encontraba.
    const mov = new Date('2026-09-28T14:00:00-05:00');
    expect(mov >= inicioDelDiaLima('2026-09-28')).toBe(true);
    expect(mov <= finDelDiaLima('2026-09-28')).toBe(true);
  });

  it('las 23:30 de Lima no se escapan al día siguiente', () => {
    const mov = new Date('2026-09-28T23:30:00-05:00');
    expect(mov <= finDelDiaLima('2026-09-28')).toBe(true);
    expect(mov >= inicioDelDiaLima('2026-09-29')).toBe(false);
  });

  it('las 00:30 de Lima pertenecen a su día, no al anterior', () => {
    const mov = new Date('2026-09-28T00:30:00-05:00');
    expect(mov >= inicioDelDiaLima('2026-09-28')).toBe(true);
    expect(mov <= finDelDiaLima('2026-09-27')).toBe(false);
  });

  it('un rango de un solo día cubre 24 horas completas', () => {
    const ms =
      finDelDiaLima('2026-09-28').getTime() -
      inicioDelDiaLima('2026-09-28').getTime();
    expect(ms).toBe(24 * 3600_000 - 1);
  });

  it('acepta un Date y respeta el día tal como se ve en Lima', () => {
    // 2026-09-29T02:00Z son las 21:00 del 28 en Lima: el día es el 28.
    const d = new Date('2026-09-29T02:00:00.000Z');
    expect(inicioDelDiaLima(d).toISOString()).toBe('2026-09-28T05:00:00.000Z');
  });
});
