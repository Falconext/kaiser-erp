export interface ProductoResumen {
  id: number;
  descripcion: string;
  unidades: number;
  ingresos: number;
  costoMercaderia: number;
  costoEnvio: number;
  ads: number;
  ganancia: number;
  margen: number;
  estado: 'bien' | 'alerta' | 'perdida';
}

export interface ResumenMes {
  ingresos: number;
  costoMercaderia: number;
  costoEnvios: number;
  gastoPublicidad: number;
  comisiones: number;
  gananciaReal: number;
  margen: number;
  totalVentas: number;
  ticketPromedio: number;
  productosDistintos: number;
}

export interface ResumenEcommerceResponse {
  fechaInicio?: string;
  fechaFin?: string;
  resumen: ResumenMes;
  productos: ProductoResumen[];
}

export const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export function fmt(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
