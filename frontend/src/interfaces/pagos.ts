export interface IPago {
  id: number;
  comprobanteId: number;
  comprobante: {
    cliente: {
      nombre: string;
    };
  };
  usuarioId?: number;
  empresaId: number;
  fecha: string;
  monto: number;
  medioPago: string;
  observacion?: string;
  referencia?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IPagosFilters {
  comprobanteId?: number;
  empresaId?: number;
  page?: number;
  limit?: number;
  fechaInicio?: string;
  fechaFin?: string;
  medioPago?: string;
  search?: string;
}

export interface IRegistroPago {
  comprobanteId: number;
  comprobante: {
    cliente: {
      nombre: string;
    };
  };
  monto: number;
  medioPago: string;
  observacion?: string;
  referencia?: string;
}
