// Mapa de consumo: qué se vende, en qué zona y a qué clientes.
// Backend: GET /api/reportes/ventas/matriz (ver backend/src/reportes).

import type { Dimension } from './ReportesVentasModel';

export interface CeldaMatriz {
    montoPEN: number;
    unidades: number;
}

export interface EjeMatriz {
    clave: string;
    etiqueta: string;
    total: number;
}

export interface MatrizVentas {
    dimensionFila: Dimension;
    dimensionColumna: Dimension;
    filas: EjeMatriz[];
    columnas: EjeMatriz[];
    /** valores[i][j] = cruce de filas[i] con columnas[j] */
    valores: CeldaMatriz[][];
    totalGeneral: number;
    restoFilas: number;
    restoColumnas: number;
    totalFilasMostradas: number;
    totalColumnasMostradas: number;
}

/** Qué se mide en las filas de la matriz. */
export const DIMENSIONES_QUE: { key: Dimension; label: string; icon: string }[] = [
    { key: 'producto', label: 'Producto', icon: 'solar:box-linear' },
    { key: 'categoria', label: 'Categoría', icon: 'solar:folder-2-linear' },
];

/** Contra qué se cruza: dónde o a quién. */
export const DIMENSIONES_DONDE: { key: Dimension; label: string; icon: string }[] = [
    { key: 'departamento', label: 'Departamento', icon: 'solar:map-linear' },
    { key: 'provincia', label: 'Provincia', icon: 'solar:map-point-linear' },
    { key: 'sector', label: 'Sector', icon: 'solar:buildings-2-linear' },
    { key: 'cliente', label: 'Cliente', icon: 'solar:users-group-rounded-linear' },
];

/**
 * Mapa de mosaico ("tile grid map") del Perú: un cuadro por departamento,
 * colocado en la posición relativa que le toca — norte arriba, costa a la
 * izquierda, selva a la derecha.
 *
 * NO es un mapa geográfico: no lleva las fronteras reales. Se eligió a
 * propósito, y tiene dos ventajas sobre el mapa de verdad para lo que aquí se
 * mira. Una, no hace falta descargar ni empaquetar la geometría del país.
 * Y dos, y más importante: todos los departamentos ocupan lo mismo, así que
 * el color se lee por ventas y no por extensión — en un mapa real, Loreto
 * pinta treinta veces más superficie que Lambayeque aunque venda la décima
 * parte, y la vista engaña.
 *
 * La clave es el nombre en mayúsculas sin tildes, que es como lo agrupa el
 * backend (`claveDocumento` hace trim + toUpperCase sobre `Cliente.departamento`).
 */
export interface TileDepartamento {
    clave: string;
    nombre: string;
    corto: string;
    fila: number;
    col: number;
}

export const TILES_PERU: TileDepartamento[] = [
    { clave: 'TUMBES', nombre: 'Tumbes', corto: 'TUM', fila: 0, col: 0 },
    { clave: 'LORETO', nombre: 'Loreto', corto: 'LOR', fila: 0, col: 3 },

    { clave: 'PIURA', nombre: 'Piura', corto: 'PIU', fila: 1, col: 0 },
    { clave: 'AMAZONAS', nombre: 'Amazonas', corto: 'AMA', fila: 1, col: 2 },

    { clave: 'LAMBAYEQUE', nombre: 'Lambayeque', corto: 'LAM', fila: 2, col: 0 },
    { clave: 'CAJAMARCA', nombre: 'Cajamarca', corto: 'CAJ', fila: 2, col: 1 },
    { clave: 'SAN MARTIN', nombre: 'San Martín', corto: 'SMA', fila: 2, col: 2 },

    { clave: 'LA LIBERTAD', nombre: 'La Libertad', corto: 'LLI', fila: 3, col: 0 },
    { clave: 'HUANUCO', nombre: 'Huánuco', corto: 'HUC', fila: 3, col: 2 },
    { clave: 'UCAYALI', nombre: 'Ucayali', corto: 'UCA', fila: 3, col: 3 },

    { clave: 'ANCASH', nombre: 'Áncash', corto: 'ANC', fila: 4, col: 0 },
    { clave: 'PASCO', nombre: 'Pasco', corto: 'PAS', fila: 4, col: 2 },

    { clave: 'CALLAO', nombre: 'Callao', corto: 'CAL', fila: 5, col: 0 },
    { clave: 'LIMA', nombre: 'Lima', corto: 'LIM', fila: 5, col: 1 },
    { clave: 'JUNIN', nombre: 'Junín', corto: 'JUN', fila: 5, col: 2 },
    { clave: 'MADRE DE DIOS', nombre: 'Madre de Dios', corto: 'MDD', fila: 5, col: 4 },

    { clave: 'HUANCAVELICA', nombre: 'Huancavelica', corto: 'HUV', fila: 6, col: 1 },
    { clave: 'AYACUCHO', nombre: 'Ayacucho', corto: 'AYA', fila: 6, col: 2 },
    { clave: 'CUSCO', nombre: 'Cusco', corto: 'CUS', fila: 6, col: 3 },

    { clave: 'ICA', nombre: 'Ica', corto: 'ICA', fila: 7, col: 0 },
    { clave: 'APURIMAC', nombre: 'Apurímac', corto: 'APU', fila: 7, col: 2 },
    { clave: 'PUNO', nombre: 'Puno', corto: 'PUN', fila: 7, col: 4 },

    { clave: 'AREQUIPA', nombre: 'Arequipa', corto: 'ARE', fila: 8, col: 1 },
    { clave: 'MOQUEGUA', nombre: 'Moquegua', corto: 'MOQ', fila: 9, col: 2 },
    { clave: 'TACNA', nombre: 'Tacna', corto: 'TAC', fila: 10, col: 3 },
];

export const TILES_FILAS = 11;
export const TILES_COLS = 5;

/** Quita tildes y pasa a mayúsculas: así es como el backend arma la clave. */
export const normalizarZona = (s: string): string =>
    String(s ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .trim()
        .toUpperCase();

/**
 * Escala de color por intensidad. Cinco escalones y no un degradado continuo:
 * el ojo no distingue un 12 % de un 15 % de opacidad, y con escalones el lector
 * puede contar cuántos niveles hay por encima de una zona sin mirar la cifra.
 */
export const nivelIntensidad = (valor: number, maximo: number): number => {
    if (!(maximo > 0) || valor <= 0) return 0;
    const r = valor / maximo;
    if (r > 0.66) return 4;
    if (r > 0.38) return 3;
    if (r > 0.17) return 2;
    return 1;
};

export const CLASES_NIVEL = [
    'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600',
    'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
    'bg-violet-300 text-violet-900 dark:bg-violet-900/60 dark:text-violet-100',
    'bg-violet-500 text-white dark:bg-violet-700',
    'bg-violet-700 text-white dark:bg-violet-500',
];
