// src/features/admin/facturacion/FacturacionModel.ts

export const tiposComprobanteFormales = [
    { id: "01", value: "FACTURA" }, { id: "03", value: "BOLETA" }, { id: "07", value: "NOTA DE CREDITO" },
    { id: "08", value: "NOTA DE DEBITO" }, { id: "TICKET", value: "TICKET" }, { id: "OT", value: "ORDEN DE TRABAJO" },
    { id: "NV", value: "NOTA DE VENTA" }, { id: "NP", value: "NOTA DE PEDIDO" }, { id: "CP", value: "COMPROBANTE DE PAGO" },
    { id: "RH", value: "RECIBO POR HONORARIO" }
];

export const tiposComprobantesInformales = [
    { id: "TICKET", value: "TICKET" }, { id: "OT", value: "ORDEN DE TRABAJO" }, { id: "NV", value: "NOTA DE VENTA" },
    { id: "NP", value: "NOTA DE PEDIDO" }, { id: "CP", value: "COMPROBANTE DE PAGO" }, { id: "RH", value: "RECIBO POR HONORARIO" },
];

export const tiposCotizacion = [{ id: "COT", value: "COTIZACIÓN" }];

export const metodosContado = ['Efectivo', 'Yape', 'Plin'];
export const metodosCredito = ['Transferencia', 'Tarjeta'];

export interface IRetencionData {
    montoDetraccion: number;
    porcentajeDetraccion: number;
}

// ── Farmacia / Botica / Droguería ──────────────────────────────────────────

export interface ILoteFefo {
    loteId: number;
    loteNumero: string;
    fechaVencimiento: string | null; // ISO string
    stockActual: number;
    stockDisponibleVenta: number;
    diasAlVencimiento: number | null;
}

export interface IDatosReceta {
    numeroReceta?: string;
    dniPaciente?: string;
    nombrePaciente?: string;
    medicoNombre?: string;
    medicoId?: number;
}

/** Ítem del carrito enriquecido para rubros farmacéuticos */
export interface ICartItemFarmacia {
    loteId?: number;
    loteNumero?: string;
    pendienteReceta: boolean;
    datosReceta?: IDatosReceta;
}

/** Producto del catálogo-farmacia (endpoint /productos/catalogo-farmacia) */
export interface ICatalogoFarmaciaItem {
    id: number;
    codigo: string;
    descripcion: string;
    imagenUrl: string | null;
    precioUnitario: number;
    igvPorcentaje: number;
    tipoAfectacionIGV: string;
    unidadCodigo: string;
    refrigerado: boolean;
    requiereReceta: boolean;
    controlado: boolean;
    categoriaId: number | null;
    // Fraccionamiento
    factorConversion: number;
    unidadCompra: string | null;
    unidadVenta: string | null;
    stockDisponibleVenta: number;
    stockReservado: number;
    loteFefo: ILoteFefo | null;
}
