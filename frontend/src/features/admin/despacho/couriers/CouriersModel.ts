// Tablero de couriers (Shalom / Olva / propios) — espejo de
// AnalisisCouriersResponse en analisis-financiero.service.ts.

export interface CourierResumen {
    courier: string;
    envios: number;
    entregados: number;
    enCurso: number;
    devueltos: number;
    tasaEntrega: number;
    costoEnvio: number;
    costoPromedio: number;
    ingreso: number;
    horasPromedioEntrega: number | null;
    montoCOD: number;
    etapas: Record<string, number>;
}

export interface EnvioCourierItem {
    envioId: number;
    comprobanteId: number;
    documento: string;
    fecha: string;
    cliente: string;
    telefono: string | null;
    courier: string;
    transportista: string | null;
    nroOrden: string | null;
    claveOrden: string | null;
    destino: string;
    departamento: string | null;
    estado: string;
    etapa: string | null;
    etapaLabel: string;
    entregado: boolean;
    devuelto: boolean;
    fechaEstimada: string | null;
    diasEnCamino: number;
    retrasado: boolean;
    costoEnvio: number;
    montoCOD: number | null;
    total: number;
    repartidor: string | null;
    ultimaActualizacion: string | null;
}

export interface AnalisisCouriersResponse {
    periodo: { mes: number; anio: number; fechaInicio: string | null; fechaFin: string | null; label: string };
    resumen: {
        envios: number;
        entregados: number;
        enCurso: number;
        devueltos: number;
        retrasados: number;
        tasaEntrega: number;
        costoEnvioTotal: number;
        ingresoMovido: number;
        horasPromedioEntrega: number | null;
        montoCOD: number;
    };
    couriers: CourierResumen[];
    serieDiaria: Array<{ fecha: string; [courier: string]: number | string }>;
    destinos: Array<{
        destino: string;
        departamento: string | null;
        provincia: string | null;
        distrito: string | null;
        envios: number;
        entregados: number;
        costoEnvio: number;
        courierPrincipal: string;
        lat: number | null;
        lng: number | null;
    }>;
    enCurso: EnvioCourierItem[];
    recientes: EnvioCourierItem[];
}

/** Identidad visual de cada courier (el resto cae en el tono neutro). */
export const COURIER_STYLE: Record<string, { color: string; bg: string; text: string; ring: string; icon: string; sigla: string }> = {
    Shalom: { color: '#E11D48', bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', ring: 'border-rose-200 dark:border-rose-900/40', icon: 'solar:box-bold-duotone', sigla: 'SH' },
    Olva: { color: '#F97316', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', ring: 'border-orange-200 dark:border-orange-900/40', icon: 'solar:delivery-bold-duotone', sigla: 'OL' },
    Propios: { color: '#4F46E5', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', ring: 'border-indigo-200 dark:border-indigo-900/40', icon: 'solar:scooter-bold-duotone', sigla: 'MI' },
};
export const courierStyle = (c: string) =>
    COURIER_STYLE[c] ?? { color: '#64748B', bg: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-600 dark:text-slate-300', ring: 'border-slate-200 dark:border-slate-700', icon: 'solar:box-minimalistic-bold-duotone', sigla: c.slice(0, 2).toUpperCase() };

/** Orden y etiqueta de las etapas en curso por courier (para el embudo). */
export const ETAPAS_COURIER: Record<string, { key: string; label: string }[]> = {
    Shalom: [
        { key: 'registrado', label: 'Registrado' },
        { key: 'origen', label: 'En origen' },
        { key: 'transito', label: 'En tránsito' },
        { key: 'destino', label: 'En agencia' },
    ],
    Olva: [
        { key: 'registrado', label: 'Registrado' },
        { key: 'transito', label: 'En tránsito' },
        { key: 'reparto', label: 'En reparto' },
        { key: 'destino', label: 'En agencia' },
    ],
    Propios: [
        { key: 'PREPARANDO', label: 'Preparando' },
        { key: 'EN_CAMINO', label: 'En camino' },
        { key: 'EN_DESTINO', label: 'En destino' },
    ],
};

export function formatHoras(h: number | null): string {
    if (h == null) return '-';
    if (h < 24) return `${Math.round(h)} h`;
    const d = h / 24;
    return `${d.toFixed(d < 10 ? 1 : 0)} días`;
}
