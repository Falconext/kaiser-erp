export interface ProductoCategoria {
    nombre: string;
    precioUnitario: number;
    costoUnitario: number;
    margen: number;
    unidadesVendidas: number;
    ingresoTotal: number;
    gananciaTotal: number;
}

export interface CategoriaRentabilidad {
    nombre: string;
    ingresoTotal: number;
    gananciaTotal: number;
    margenPromedio: number;
    unidadesVendidas: number;
    cantidadProductos: number;
    productos: ProductoCategoria[];
}

export interface CategoriasResponse {
    periodo: { mes: number; anio: number; label: string };
    ingresoTotal: number;
    gananciaTotal: number;
    margenPromedio: number;
    totalCategorias: number;
    mejorCategoria: string | null;
    categorias: CategoriaRentabilidad[];
}

export function formatSoles(value: number): string {
    return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPct(value: number): string {
    return `${value.toFixed(1)}%`;
}

// Palette for categories — cycles if more than 10
export const CAT_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
];

export function catColor(index: number): string {
    return CAT_COLORS[index % CAT_COLORS.length];
}
