/**
 * Reintento para la numeración correlativa.
 *
 * Numerar con "el último + 1" es una carrera: varias peticiones simultáneas leen
 * el mismo máximo. El índice único impide el duplicado —que es lo importante— y
 * el reintento recalcula el número para que el usuario no pierda el documento.
 *
 * El detalle que no es obvio: sin espera aleatoria los reintentos van en
 * lockstep. Todas releen el mismo máximo a la vez, vuelven a pedir el mismo
 * número, y solo una gana por ronda; con N peticiones hacen falta N rondas. Con
 * un desfase de unos milisegundos se separan y cada una coge un número distinto.
 */

/** Espera aleatoria corta y creciente, para deshacer el lockstep. */
async function esperaConJitter(intento: number): Promise<void> {
  const base = 10 * (intento + 1);
  await new Promise((r) => setTimeout(r, base + Math.random() * base));
}

/**
 * Corre `operacion` reintentando mientras choque contra un índice único (P2002).
 * `operacion` debe recalcular el número en cada intento.
 */
export async function reintentarSiChocaNumeracion<T>(
  operacion: () => Promise<T>,
  maxIntentos = 10,
): Promise<T> {
  for (let intento = 0; ; intento++) {
    try {
      return await operacion();
    } catch (err: any) {
      if (err?.code !== 'P2002' || intento >= maxIntentos - 1) throw err;
      await esperaConJitter(intento);
    }
  }
}
