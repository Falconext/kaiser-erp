export interface FiltroVendedores {
    fechaInicio: string;
    fechaFin: string;
}

export function fechaHoy(): string {
    return new Date().toISOString().split('T')[0];
}

export function primerDiaMes(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
}

export const TIPO_DOC_LABEL: Record<string, string> = {
    '01': 'Factura',
    '03': 'Boleta',
};

export const MEDALLAS = ['🥇', '🥈', '🥉'];
