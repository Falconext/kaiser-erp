import {
  TITULOS_NOTAS_COTIZACION,
  notasDeCotizacion,
} from './comprobante.service';

/**
 * Los textos variables de una cotización de módulos.
 *
 * Lo que estos tests protegen no es el formato: es que **los dos generadores
 * del documento digan lo mismo**. La vista de React y `cotizacion.hbs` son dos
 * caminos distintos al mismo papel, y ya se separaron una vez con la
 * observación por producto — el PDF que recibía el cliente salía sin ella.
 */
describe('notasDeCotizacion', () => {
  it('ordena como la cotización real de Kaiser', () => {
    const notas = notasDeCotizacion({
      plazos: '15 días',
      incluye: 'Bebederos',
      capacidadTotal: '20 160 aves',
      formaPago: '50% adelanto',
      observaciones: 'Flete no incluido',
      especificaciones: 'Alambre #12',
    });
    expect(notas.map((n) => n.titulo)).toEqual([
      'Nota',
      'Incluye',
      'Especificaciones técnicas',
      'Observaciones',
      'Forma de pago',
      'Tiempo de entrega',
    ]);
  });

  it('deja fuera lo vacío', () => {
    // Una sección con su título y nada debajo queda peor que no ponerla.
    const notas = notasDeCotizacion({
      capacidadTotal: '20 160 aves',
      incluye: '',
      observaciones: '   ',
      plazos: null,
    });
    expect(notas).toEqual([{ titulo: 'Nota', texto: '20 160 aves' }]);
  });

  it('sin notas devuelve una lista vacía, no revienta', () => {
    expect(notasDeCotizacion(null)).toEqual([]);
    expect(notasDeCotizacion(undefined)).toEqual([]);
    expect(notasDeCotizacion('texto suelto')).toEqual([]);
    expect(notasDeCotizacion({})).toEqual([]);
  });

  it('ignora claves que no son del formato', () => {
    // El campo es JSON libre: que alguien meta algo de más no debe imprimirlo.
    const notas = notasDeCotizacion({ capacidadTotal: 'x', inventado: 'y' });
    expect(notas).toHaveLength(1);
  });

  it('las seis claves son las que la plantilla y la vista conocen', () => {
    // Si alguien añade una aquí, tiene que añadirla en los DOS generadores.
    expect(TITULOS_NOTAS_COTIZACION.map((t) => t.clave)).toEqual([
      'capacidadTotal',
      'incluye',
      'especificaciones',
      'observaciones',
      'formaPago',
      'plazos',
    ]);
  });
});
