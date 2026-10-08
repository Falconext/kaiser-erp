import {
  explotarCantidad,
  factorExplosion,
  normalizarRecuperacion,
  repartirCostoMerma,
} from './produccion-calculo';

/**
 * Los dos casos que estos specs guardan no son hipotéticos: los dos se
 * encontraron mal en la base de Kaiser.
 */
describe('explotarCantidad · POR_UNIDAD escala, POR_LOTE no', () => {
  it('multiplica lo que va por unidad', () => {
    // 10 divisiones por módulo, 200 módulos.
    expect(explotarCantidad(10, 'POR_UNIDAD', 200)).toBe(2000);
  });

  it('deja lo que va por lote tal cual', () => {
    // 8.5 kg de sujetador para TODA la tanda, se fabriquen 10 o 210.
    expect(explotarCantidad(8.5, 'POR_LOTE', 200)).toBe(8.5);
    expect(explotarCantidad(8.5, 'POR_LOTE', 1)).toBe(8.5);
  });

  it('trata lo que no tiene tipo como POR_UNIDAD, que es el defecto del modelo', () => {
    expect(explotarCantidad(2, undefined, 50)).toBe(100);
    expect(explotarCantidad(2, null, 50)).toBe(100);
  });

  it('es el caso real que estaba mal: 4 kg de driza no son 800', () => {
    // La hoja de planta da 4 KG de driza de nylón para la tanda entera. Con la
    // driza cargada como POR_UNIDAD, una orden de 200 módulos pedía 800 kg de
    // cuerda: más de tres veces el peso del módulo entero.
    expect(explotarCantidad(4, 'POR_UNIDAD', 200)).toBe(800);
    expect(explotarCantidad(4, 'POR_LOTE', 200)).toBe(4);
  });

  it('una cantidad inválida da 0 y no NaN', () => {
    expect(explotarCantidad(Number.NaN, 'POR_UNIDAD', 10)).toBe(0);
    expect(explotarCantidad(5, 'POR_UNIDAD', Number.NaN)).toBe(0);
  });
});

describe('factorExplosion', () => {
  it('divide lo que se quiere fabricar entre el rendimiento de la receta', () => {
    expect(factorExplosion(200, 10)).toBe(20);
    expect(factorExplosion(200, 1)).toBe(200);
  });

  it('un rendimiento en 0 cae a 1 en vez de a infinito', () => {
    // La receta está mal cargada, pero eso no puede convertir la orden en una
    // cifra absurda: un Infinity aquí se propaga a todo el consumo teórico.
    expect(factorExplosion(200, 0)).toBe(200);
    expect(factorExplosion(200, null)).toBe(200);
    expect(factorExplosion(200, -5)).toBe(200);
  });
});

describe('normalizarRecuperacion', () => {
  it('acota a [0, 1]', () => {
    expect(normalizarRecuperacion(0)).toBe(0);
    expect(normalizarRecuperacion(0.5)).toBe(0.5);
    expect(normalizarRecuperacion(1)).toBe(1);
    // Un porcentaje mal puesto no puede hacer que el retazo valga más que el
    // insumo del que salió, ni que el terminado cargue un costo negativo.
    expect(normalizarRecuperacion(1.4)).toBe(1);
    expect(normalizarRecuperacion(-0.3)).toBe(0);
    expect(normalizarRecuperacion(null)).toBe(0);
  });
});

describe('repartirCostoMerma · con recuperación 0 % y 50 %', () => {
  // 3 unidades de merma a 10 soles, de las cuales 2 son retazo aprovechable.
  const caso = { merma: 3, mermaReutilizable: 2, costoUnitario: 10 };

  it('con 0 % la merma ENTERA encarece el producto terminado', () => {
    // Es el valor con el que nace la empresa, y la razón de que encender el
    // almacén de mermas no mueva ninguna cifra hasta que alguien ponga un
    // número: el reparto es idéntico al de antes de que existiera.
    const r = repartirCostoMerma({ ...caso, porcentajeRecuperacion: 0 });
    expect(r.costoCapitalizado).toBe(30);
    expect(r.costoRecuperado).toBe(0);
    expect(r.costoUnitarioRetazo).toBe(0);
  });

  it('con 50 % el retazo se lleva su parte y el terminado carga menos', () => {
    const r = repartirCostoMerma({ ...caso, porcentajeRecuperacion: 0.5 });
    // 2 reutilizables × 10 × 50 % = 10 se van con el retazo.
    expect(r.costoRecuperado).toBe(10);
    // Y el terminado carga 30 − 10 = 20, no los 30 de antes.
    expect(r.costoCapitalizado).toBe(20);
    expect(r.costoUnitarioRetazo).toBe(5);
  });

  it('el DESCARTE no recupera valor aunque el porcentaje sea alto', () => {
    // Toda la merma es descarte: no hay nada reutilizable de lo que recuperar.
    // Su valor se queda en el producto terminado, que es donde estaba.
    const r = repartirCostoMerma({
      merma: 3,
      mermaReutilizable: 0,
      costoUnitario: 10,
      porcentajeRecuperacion: 0.8,
    });
    expect(r.costoRecuperado).toBe(0);
    expect(r.costoCapitalizado).toBe(30);
  });

  it('nunca deja el costo capitalizado en negativo', () => {
    // Ni con el porcentaje por encima de 1 ni con todo reutilizable: lo máximo
    // que se puede ir al retazo es el valor de la merma.
    const r = repartirCostoMerma({
      merma: 3,
      mermaReutilizable: 3,
      costoUnitario: 10,
      porcentajeRecuperacion: 5,
    });
    expect(r.porcentaje).toBe(1);
    expect(r.costoCapitalizado).toBe(0);
    expect(r.costoRecuperado).toBe(30);
  });

  it('sin costo del insumo no inventa valor', () => {
    const r = repartirCostoMerma({
      merma: 3,
      mermaReutilizable: 2,
      costoUnitario: 0,
      porcentajeRecuperacion: 0.5,
    });
    expect(r.costoCapitalizado).toBe(0);
    expect(r.costoRecuperado).toBe(0);
    expect(r.costoUnitarioRetazo).toBe(0);
  });
});
