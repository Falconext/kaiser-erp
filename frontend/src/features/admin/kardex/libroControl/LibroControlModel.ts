export type TipoMovimientoLibro = 'ENTRADA' | 'SALIDA';

export interface IMovimientoLibroControl {
    fecha: string;
    tipo: TipoMovimientoLibro;
    // Entrada
    proveedor?: string;
    proveedorDoc?: string;
    // Salida
    paciente?: string;
    dniPaciente?: string;
    nombrePaciente?: string;
    numeroReceta?: string;
    medico?: string;
    // Ambos
    documento?: string;
    productoId: number;
    productoNombre: string;
    concentracion: string | null;
    formaFarmaceutica: string | null;
    lote?: string;
    cantidad: number;
    saldo: number;
}

export interface IProductoControlado {
    id: number;
    descripcion: string;
    concentracion: string | null;
}

export interface ILibroControlResponse {
    movimientos: IMovimientoLibroControl[];
    productosControlados: IProductoControlado[];
}
