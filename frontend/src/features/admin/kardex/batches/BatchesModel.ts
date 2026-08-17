// Interface placeholder for Batches
export interface Lote {
    id: number;
    codigo: string;
    fechaVencimiento: Date;
    stock: number;
}

export interface IBatchesViewModelState {
    lotes: Lote[];
    loading: boolean;
}
