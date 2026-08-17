import { IInvoices } from "@/interfaces/invoices";
import { PaymentType } from "@/hooks/usePaymentFlow";

export interface ICotizacionRow extends Omit<IInvoices, 'acciones'> {
    acciones?: React.ReactNode;
    client?: string;
    total?: string;
    estado?: string;
    xmlSunat?: string;
    cdrSunat?: string;
    documentoAfiliado?: string;
    fechaEmisión?: string;
}

export type PrintFormatSize = 'TICKET' | 'A4' | 'A5';

export interface IPrintFormatOption {
    id: string;
    value: string;
}

export interface IEstadoInvoiceOption {
    id: number;
    value: string;
}

export interface IComprobanteWhatsApp {
    id: number;
    serie: string;
    correlativo: number;
    comprobante: string;
    total: number;
    clienteNombre: string;
    clienteCelular: string;
    clienteEmail?: string;
    pdfUrl?: string;
}
