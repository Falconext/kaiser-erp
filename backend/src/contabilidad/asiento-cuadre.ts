/**
 * La regla que no se negocia: un asiento que no cuadra no se guarda.
 *
 * Es una función pura, sin Prisma, para poder probarla sola y para que la misma
 * comprobación sirva al asiento manual de la contadora y a los que genere el
 * ERP por lote. Trabaja en céntimos enteros: sumar flotantes de dos decimales
 * produce descuadres de 0.0000001 que no son descuadres.
 */
export interface LineaCuadre {
  cuenta: string;
  debe: number;
  haber: number;
}

const centimos = (n: number) => Math.round(Number(n) * 100);

export function totalesCuadre(lineas: LineaCuadre[]) {
  const debe = lineas.reduce((s, l) => s + centimos(l.debe), 0) / 100;
  const haber = lineas.reduce((s, l) => s + centimos(l.haber), 0) / 100;
  return { debe, haber };
}

/** Devuelve la lista de problemas; vacía si el asiento es válido. */
export function validarCuadre(lineas: LineaCuadre[]): string[] {
  const errores: string[] = [];
  if (!Array.isArray(lineas) || lineas.length < 2) {
    return ['Un asiento necesita al menos dos líneas'];
  }
  lineas.forEach((l, i) => {
    const n = i + 1;
    const debe = Number(l.debe ?? 0);
    const haber = Number(l.haber ?? 0);
    if (!l.cuenta || !String(l.cuenta).trim())
      errores.push(`Línea ${n}: falta la cuenta`);
    if (!Number.isFinite(debe) || !Number.isFinite(haber)) {
      errores.push(`Línea ${n}: importe inválido`);
      return;
    }
    if (debe < 0 || haber < 0)
      errores.push(`Línea ${n}: los importes no pueden ser negativos`);
    if (debe > 0 && haber > 0)
      errores.push(`Línea ${n}: una línea va al debe o al haber, no a los dos`);
    if (debe === 0 && haber === 0) errores.push(`Línea ${n}: sin importe`);
    if (
      centimos(debe) !== debe * 100 &&
      Math.abs(centimos(debe) - debe * 100) > 1e-6
    ) {
      errores.push(`Línea ${n}: el debe tiene más de dos decimales`);
    }
    if (
      centimos(haber) !== haber * 100 &&
      Math.abs(centimos(haber) - haber * 100) > 1e-6
    ) {
      errores.push(`Línea ${n}: el haber tiene más de dos decimales`);
    }
  });
  if (errores.length) return errores;

  const { debe, haber } = totalesCuadre(lineas);
  if (debe === 0) errores.push('El asiento no mueve importe alguno');
  if (centimos(debe) !== centimos(haber)) {
    errores.push(
      `El asiento no cuadra: debe ${debe.toFixed(2)} ≠ haber ${haber.toFixed(2)} (diferencia ${(debe - haber).toFixed(2)})`,
    );
  }
  return errores;
}
