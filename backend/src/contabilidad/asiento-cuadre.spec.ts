import { totalesCuadre, validarCuadre } from './asiento-cuadre';

describe('validarCuadre', () => {
  const venta = [
    { cuenta: '1212', debe: 1180, haber: 0 },
    { cuenta: '40111', debe: 0, haber: 180 },
    { cuenta: '70111', debe: 0, haber: 1000 },
  ];

  it('acepta un asiento de venta que cuadra', () => {
    expect(validarCuadre(venta)).toEqual([]);
    expect(totalesCuadre(venta)).toEqual({ debe: 1180, haber: 1180 });
  });

  it('rechaza el descuadre y dice de cuánto es', () => {
    const errores = validarCuadre([
      { cuenta: '1212', debe: 1180, haber: 0 },
      { cuenta: '70111', debe: 0, haber: 1000 },
    ]);
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/no cuadra/);
    expect(errores[0]).toMatch(/180\.00/);
  });

  it('no se deja engañar por los flotantes', () => {
    // 0.1 + 0.2 !== 0.3 en JavaScript; en céntimos sí.
    expect(
      validarCuadre([
        { cuenta: '1011', debe: 0.1, haber: 0 },
        { cuenta: '1011', debe: 0.2, haber: 0 },
        { cuenta: '7599', debe: 0, haber: 0.3 },
      ]),
    ).toEqual([]);
  });

  it('exige al menos dos líneas', () => {
    expect(validarCuadre([{ cuenta: '1011', debe: 5, haber: 0 }])).toEqual([
      'Un asiento necesita al menos dos líneas',
    ]);
  });

  it('una línea va al debe o al haber, no a los dos ni a ninguno', () => {
    const errores = validarCuadre([
      { cuenta: '1011', debe: 5, haber: 5 },
      { cuenta: '7599', debe: 0, haber: 0 },
    ]);
    expect(errores.some((e) => /no a los dos/.test(e))).toBe(true);
    expect(errores.some((e) => /sin importe/.test(e))).toBe(true);
  });

  it('rechaza negativos, la cuenta vacía y más de dos decimales', () => {
    const errores = validarCuadre([
      { cuenta: '', debe: -1, haber: 0 },
      { cuenta: '7599', debe: 0, haber: 1.005 },
    ]);
    expect(errores.some((e) => /falta la cuenta/.test(e))).toBe(true);
    expect(errores.some((e) => /negativos/.test(e))).toBe(true);
    expect(errores.some((e) => /dos decimales/.test(e))).toBe(true);
  });

  it('un asiento en ceros no es un asiento', () => {
    expect(
      validarCuadre([
        { cuenta: '1011', debe: 0, haber: 0 },
        { cuenta: '7599', debe: 0, haber: 0 },
      ]),
    ).toEqual(['Línea 1: sin importe', 'Línea 2: sin importe']);
  });
});
