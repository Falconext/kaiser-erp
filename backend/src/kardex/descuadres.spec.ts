import { detectarDescuadres, saldosPorSede } from './kardex.service';

/** Atajo: un movimiento de `sede` que va de `de` a `a`. */
const mov = (id: number, sede: number, de: number, a: number) => ({
  id, stockAnterior: de, stockActual: a, sede: { id: sede },
});

describe('detectarDescuadres', () => {
  it('una cadena correcta no da descuadres', () => {
    expect(detectarDescuadres([mov(1, 1, 0, 100), mov(2, 1, 100, 80)])).toHaveLength(0);
  });

  it('detecta el salto cuando el siguiente no arranca donde cerró el anterior', () => {
    const d = detectarDescuadres([mov(1, 1, 0, 100), mov(2, 1, 90, 100)]);
    expect(d).toEqual([{ despuesDelMovimiento: 1, esperado: 100, encontrado: 90 }]);
  });

  it('lo detecta aunque en medio haya un movimiento de otra sede', () => {
    // Este es el caso que se perdía: la versión anterior comparaba filas
    // consecutivas y saltaba al cambiar de sede, así que con dos almacenes —donde
    // los movimientos se intercalan— el descuadre quedaba invisible.
    const d = detectarDescuadres([
      mov(1, 1, 0, 100),
      mov(2, 3, 0, 5),      // otra sede, en medio
      mov(3, 1, 90, 100),   // la sede 1 debería arrancar en 100
    ]);
    expect(d).toEqual([{ despuesDelMovimiento: 1, esperado: 100, encontrado: 90 }]);
  });

  it('no inventa descuadres entre sedes distintas', () => {
    // Que la sede 3 empiece en 0 mientras la sede 1 va por 100 es normal.
    expect(detectarDescuadres([mov(1, 1, 0, 100), mov(2, 3, 0, 5)])).toHaveLength(0);
  });

  it('el primer movimiento de una sede nunca es un descuadre', () => {
    expect(detectarDescuadres([mov(1, 1, 50, 60)])).toHaveLength(0);
  });

  it('tolera diferencias de redondeo por debajo del milésimo', () => {
    expect(detectarDescuadres([mov(1, 1, 0, 100), mov(2, 1, 100.0005, 90)])).toHaveLength(0);
  });

  it('cuenta cada sede por separado con varias sedes intercaladas', () => {
    const d = detectarDescuadres([
      mov(1, 1, 0, 100),
      mov(2, 3, 0, 50),
      mov(3, 1, 100, 120),   // sede 1 bien
      mov(4, 3, 40, 45),     // sede 3 mal: cerró en 50
    ]);
    expect(d).toEqual([{ despuesDelMovimiento: 2, esperado: 50, encontrado: 40 }]);
  });

  it('agrupa los movimientos sin sede bajo la misma clave', () => {
    const sinSede = (id: number, de: number, a: number) => ({ id, stockAnterior: de, stockActual: a, sede: null });
    expect(detectarDescuadres([sinSede(1, 0, 10), sinSede(2, 9, 12)])).toHaveLength(1);
  });
});

describe('saldosPorSede', () => {
  it('se queda con el último saldo de cada sede', () => {
    const s = saldosPorSede([mov(1, 1, 0, 100), mov(2, 3, 0, 5), mov(3, 1, 100, 80)]);
    expect(s.get(1)).toBe(80);
    expect(s.get(3)).toBe(5);
  });

  it('la suma es el stock de la empresa, no el del último movimiento', () => {
    // El resumen de trazabilidad decía "12" cuando la empresa tenía 443 repartidas
    // entre dos almacenes: informaba el saldo del último movimiento.
    const s = saldosPorSede([mov(1, 1, 0, 431.15), mov(2, 3, 0, 12)]);
    expect([...s.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(443.15, 3);
  });
});
