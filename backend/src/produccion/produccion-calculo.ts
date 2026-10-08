/**
 * Las dos reglas de cálculo de producción que no dependen de la base.
 *
 * Viven fuera del servicio por lo mismo que `asiento-cuadre.ts`: se pueden
 * probar solas, y la misma cuenta sirve en los varios sitios que la necesitan
 * —la explosión aparece al crear la orden y otra vez al liquidarla— en vez de
 * estar copiada en cada uno. Las dos se escribieron después de encontrarlas
 * mal en producción, y el spec de al lado guarda esos casos.
 */

export type TipoCantidadReceta = 'POR_UNIDAD' | 'POR_LOTE';

/**
 * Cuánto insumo pide la receta para una cantidad dada.
 *
 * `POR_UNIDAD` escala con lo que se fabrique. `POR_LOTE` NO: son 8,5 kg de
 * sujetador y 6 cajas de grapas para TODA la tanda, cueste lo que cueste, y
 * multiplicarlos por el tamaño del lote da un consumo que planta no reconoce.
 *
 * Antes de que existiera `POR_LOTE`, los de tanda se guardaban DIVIDIDOS entre
 * el tamaño del lote para que la explosión —que solo sabía multiplicar— los
 * devolviera enteros. Esa ficción solo cuadra si el lote vuelve a ser del
 * mismo tamaño, y es la razón de que esta función exista.
 */
export function explotarCantidad(
  cantidadBase: number,
  tipoCantidad: TipoCantidadReceta | string | null | undefined,
  factor: number,
): number {
  const base = Number(cantidadBase ?? 0);
  if (!Number.isFinite(base)) return 0;
  if (tipoCantidad === 'POR_LOTE') return base;
  const f = Number(factor);
  return Number.isFinite(f) ? base * f : 0;
}

/**
 * El factor de la explosión: cuántas veces cabe el rendimiento de la receta en
 * lo que se quiere fabricar. Una receta que rinde 10 y una orden de 200 dan 20.
 *
 * Un rendimiento en 0 o inválido cae a 1 en vez de a infinito: la receta está
 * mal cargada, pero eso no puede convertir la orden en una cifra absurda.
 */
export function factorExplosion(
  cantidadObjetivo: number,
  rendimientoObjetivo: number | null | undefined,
): number {
  const objetivo = Number(cantidadObjetivo ?? 0);
  const rendimiento = Number(rendimientoObjetivo ?? 0);
  if (!Number.isFinite(objetivo)) return 0;
  return objetivo / (Number.isFinite(rendimiento) && rendimiento > 0 ? rendimiento : 1);
}

/**
 * El porcentaje de recuperación de la merma, acotado a [0, 1].
 *
 * Un porcentaje mal puesto no puede hacer que el retazo valga más que el
 * insumo del que salió, ni que el producto terminado cargue un costo negativo.
 */
export function normalizarRecuperacion(
  porcentaje: number | null | undefined,
): number {
  const p = Number(porcentaje ?? 0);
  if (!Number.isFinite(p)) return 0;
  return Math.min(1, Math.max(0, p));
}

export interface RepartoCostoMerma {
  /** El porcentaje que se acabó aplicando, ya acotado. */
  porcentaje: number;
  /** Lo que se lleva el retazo al almacén de mermas. */
  costoRecuperado: number;
  /** Lo que se queda encarecido el producto terminado. */
  costoCapitalizado: number;
  /** A cuánto entra cada unidad de retazo. */
  costoUnitarioRetazo: number;
}

/**
 * Cómo se reparte el valor de la merma entre el producto terminado y el
 * retazo que vuelve al almacén.
 *
 * La merma SALE del inventario, así que su valor tiene que ir a algún sitio.
 * Antes no iba a ninguno: salían 20 soles de insumos y el terminado se
 * valorizaba en 18. Esos 2 soles no quedaban en inventario, ni en el costo del
 * producto, ni en un gasto — desaparecían, y el margen salía inflado.
 *
 * ⚠ Solo se recupera valor de la parte REUTILIZABLE. El descarte entra a costo
 * cero: su valor se queda capitalizado en el producto terminado, que es donde
 * estaba antes de que existiera el almacén de mermas.
 *
 * Con el porcentaje en 0 —el valor con el que nace la empresa— esto da
 * exactamente lo de siempre: la merma entera encarece lo fabricado. Por eso
 * encender el almacén de mermas no mueve ninguna cifra hasta que alguien pone
 * un número.
 */
export function repartirCostoMerma(entrada: {
  merma: number;
  mermaReutilizable: number;
  costoUnitario: number;
  porcentajeRecuperacion: number | null | undefined;
}): RepartoCostoMerma {
  const merma = Number(entrada.merma ?? 0);
  const reutilizable = Number(entrada.mermaReutilizable ?? 0);
  const costoUnitario = Number(entrada.costoUnitario ?? 0);
  const porcentaje = normalizarRecuperacion(entrada.porcentajeRecuperacion);

  const costoRecuperado = reutilizable * costoUnitario * porcentaje;
  return {
    porcentaje,
    costoRecuperado,
    costoCapitalizado: merma * costoUnitario - costoRecuperado,
    costoUnitarioRetazo: costoUnitario * porcentaje,
  };
}

// ── Precio del módulo ───────────────────────────────────────────────────────

export type OrigenPrecioModulo = 'PESO_X_FACTOR' | 'CATALOGO';

export interface PrecioModulo {
  pesoKg: number | null;
  precioBaseKg: number | null;
  factor: number | null;
  /** El precio que se va a usar. NUNCA 0 por falta de datos. */
  precio: number;
  origen: OrigenPrecioModulo;
  /** Qué falta para poder calcularlo por peso. Vacío = se calculó. */
  faltan: string[];
}

/**
 * El precio de un módulo: **peso × precio por kilo × factor**.
 *
 * Así es como Kaiser cotiza de verdad. El precio de catálogo de un módulo
 * envejece en cuanto se mueve el acero; el peso no cambia, y el factor es lo
 * que se negocia.
 *
 * ⚠ La regla que importa: **si falta cualquier dato, el precio es el de
 * catálogo y `faltan` dice por qué — nunca 0**. Un 0 en una cotización se
 * manda al cliente y se factura; un precio de catálogo desactualizado es
 * discutible, pero no es un regalo. Es el mismo criterio que el `null` de la
 * liquidación y el «sin costo» de la pantalla.
 */
export function calcularPrecioModulo(entrada: {
  pesoKg: number | null | undefined;
  precioBaseKg: number | null | undefined;
  factor: number | null | undefined;
  precioCatalogo: number;
  /** Códigos de los componentes de la receta que no tienen peso. */
  componentesSinPeso?: string[];
}): PrecioModulo {
  const faltan: string[] = [];

  const pesoKg = numeroPositivo(entrada.pesoKg);
  const precioBaseKg = numeroPositivo(entrada.precioBaseKg);
  const factor = numeroPositivo(entrada.factor);

  if (pesoKg === null) faltan.push('peso');
  if (precioBaseKg === null) faltan.push('precioBaseKg');
  if (factor === null) faltan.push('factor');
  for (const codigo of entrada.componentesSinPeso ?? []) {
    faltan.push(`sin peso: ${codigo}`);
  }

  if (pesoKg === null || precioBaseKg === null || factor === null) {
    return {
      pesoKg,
      precioBaseKg,
      factor,
      precio: Number(entrada.precioCatalogo ?? 0),
      origen: 'CATALOGO',
      faltan,
    };
  }

  return {
    pesoKg,
    precioBaseKg,
    factor,
    precio: pesoKg * precioBaseKg * factor,
    origen: 'PESO_X_FACTOR',
    faltan,
  };
}

/**
 * Cuántos módulos hacen falta para un número de aves. Se redondea HACIA
 * ARRIBA: un módulo a medias no existe, y dejar 200 aves fuera porque la
 * división no fue exacta es el error que el cliente nota en la granja.
 */
export function modulosParaAves(
  aves: number,
  capacidadAves: number | null | undefined,
): number | null {
  const a = Number(aves ?? 0);
  const cap = numeroPositivo(capacidadAves);
  if (cap === null || !Number.isFinite(a) || a <= 0) return null;
  return Math.ceil(a / cap);
}

function numeroPositivo(valor: number | null | undefined): number | null {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : null;
}
