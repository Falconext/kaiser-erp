/**
 * Mapea las unidades de medida internas a los códigos oficiales del
 * Catálogo 03 de SUNAT (unidades de medida). SUNAT rechaza el comprobante si
 * el `unitCode` no está en su catálogo (error 2936).
 *
 * Los productos de Kaiser usan códigos como RLL (rollo), PZ, UND, CJ, PQ que NO
 * son válidos para SUNAT; se convierten a NIU (unidad) u otro código estándar.
 * Los que ya son válidos (KGM, MTR, MTK, MTQ, LTR, GRM, TNE, NIU, ZZ…) pasan tal cual.
 */

// Códigos válidos del Catálogo 03 que usamos (SUNAT acepta muchos más).
const SUNAT_VALIDOS = new Set([
  'NIU', 'ZZ', 'KGM', 'GRM', 'TNE', 'LTR', 'MTR', 'MTK', 'MTQ',
  'BX', 'PK', 'SET', 'DZN', 'GLL', 'BG', 'CEN', 'MLL', 'GLI',
]);

// Equivalencias de nuestros códigos internos → Catálogo 03.
const MAPA: Record<string, string> = {
  RLL: 'NIU', // Rollo → Unidad (SUNAT no tiene "rollo")
  ROL: 'NIU',
  UND: 'NIU', // Unidad
  UN: 'NIU',
  PZ: 'NIU', // Pieza → Unidad
  PZA: 'NIU',
  PIEZA: 'NIU',
  CJ: 'BX', // Caja → Box (BX)
  CJA: 'BX',
  CAJA: 'BX',
  PQ: 'PK', // Paquete → Pack (PK)
  PQT: 'PK',
  PAQUETE: 'PK',
  KG: 'KGM', // Kilogramo
  KGR: 'KGM',
  GR: 'GRM', // Gramo
  LT: 'LTR', // Litro
  L: 'LTR',
  M: 'MTR', // Metro
  ML: 'MTR',
  M2: 'MTK', // Metro cuadrado
  M3: 'MTQ', // Metro cúbico
  DOC: 'DZN', // Docena
  DZ: 'DZN',
  GLN: 'GLL', // Galón
  JGO: 'SET', // Juego → Set
  JUEGO: 'SET',
  PAR: 'PR', // Par
};

/**
 * Devuelve un código de unidad válido para SUNAT (Catálogo 03).
 * Si ya es válido lo deja igual; si es interno lo traduce; si no lo reconoce → NIU.
 */
export function toSunatUnit(codigo?: string | null): string {
  const c = String(codigo ?? '').trim().toUpperCase();
  if (!c) return 'NIU';
  if (SUNAT_VALIDOS.has(c)) return c;
  return MAPA[c] ?? 'NIU';
}
