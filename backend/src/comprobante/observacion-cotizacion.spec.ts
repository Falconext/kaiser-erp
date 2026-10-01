/**
 * La observación por producto tiene que llegar a los TRES sitios donde el
 * cliente la ve, y sobrevivir a una edición.
 *
 * Dos fallos que motivan esto, los dos reportados desde el uso real:
 *
 *  1. El PDF que se manda por correo salía SIN las observaciones, mientras que
 *     la vista de imprimir del navegador sí las mostraba. Son dos generadores
 *     distintos: la vista es React y el PDF lo arma el backend con su propia
 *     plantilla (`cotizacion.hbs`), que no las pintaba. Y el cargador del PDF
 *     tampoco traía la del catálogo, que es el respaldo.
 *  2. Al EDITAR una cotización se perdían: `actualizarCotizacion` borra los
 *     detalles y los recrea, y el `createMany` no copiaba el campo.
 *
 * Aquí se fija la regla de resolución, que es lo compartido: manda el snapshot
 * de la línea y el catálogo es el respaldo. Lo que se cotizó es lo que se
 * imprime, aunque el catálogo cambie después.
 */

/** Mismo criterio que `obsDeItem` en la vista de imprimir y que el PDF. */
const resolver = (d: any): string =>
  String(d?.observacionCotizacion ?? d?.producto?.observacionCotizacion ?? '').trim();

describe('observación por producto · de dónde sale', () => {
  it('manda la de la LÍNEA cuando existe', () => {
    expect(
      resolver({
        observacionCotizacion: 'Lo acordado con el cliente',
        producto: { observacionCotizacion: 'Texto del catálogo' },
      }),
    ).toBe('Lo acordado con el cliente');
  });

  it('cae al CATÁLOGO cuando la línea no tiene', () => {
    expect(
      resolver({
        observacionCotizacion: null,
        producto: { observacionCotizacion: 'Rollo de 100 metros lineales' },
      }),
    ).toBe('Rollo de 100 metros lineales');
  });

  it('una línea en BLANCO sí tapa la del catálogo (y es a propósito)', () => {
    // `??` solo cae al catálogo con null/undefined, no con cadena vacía. Así,
    // borrar el texto en la línea es una forma deliberada de que ese producto
    // salga sin observación aunque el catálogo tenga una.
    //
    // La contrapartida: si el formulario mandara '' por defecto en vez de
    // omitir el campo, NINGUNA observación de catálogo llegaría a imprimirse.
    // Hoy no pasa —las líneas sin tocar se guardan como null, que es lo que
    // deja ver la del catálogo—, pero es la pieza que hay que mirar si alguna
    // vez vuelven a desaparecer.
    expect(
      resolver({
        observacionCotizacion: '   ',
        producto: { observacionCotizacion: 'Texto del catálogo' },
      }),
    ).toBe('');
  });

  it('sin ninguna de las dos devuelve cadena vacía, no "null"', () => {
    expect(resolver({ observacionCotizacion: null, producto: null })).toBe('');
    expect(resolver({})).toBe('');
  });

  it('un ítem libre (sin producto) usa solo la suya', () => {
    expect(
      resolver({ observacionCotizacion: 'Servicio a medida', productoId: null }),
    ).toBe('Servicio a medida');
  });
});
