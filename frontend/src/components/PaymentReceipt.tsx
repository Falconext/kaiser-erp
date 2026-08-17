import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { PaymentType } from '@/hooks/usePaymentFlow';
import { Icon } from '@iconify/react';
import { BRAND } from '@/lib/branding';

interface IPaymentReceiptProps {
  comprobante: any;
  payment: {
    tipo: PaymentType;
    monto: number;
    medioPago: string;
    observacion?: string;
    referencia?: string;
    dirigidoA?: string;
    vendedorNombre?: string;
  };
  numeroRecibo: string;
  saldo: any;
  nuevoSaldo: number;
  company: any;
  detalles?: any[];
  cliente?: any;
  pagosHistorial?: any[];
  totalPagado?: number;
  comprobanteDetails?: any;
  onClose?: () => void;
  onPrint?: () => void;
}

const PaymentReceipt = ({
  comprobante,
  payment,
  numeroRecibo,
  nuevoSaldo,
  company,
  detalles,
  cliente,
  onClose,
  onPrint,
}: IPaymentReceiptProps) => {
  const componentRef = useRef(null);

  const logoRaw = company?.empresa?.logo;
  const logoDataUrl = (() => {
    if (!logoRaw) return '';
    const t = logoRaw.trim();
    if (t.startsWith('data:')) return t;
    if (/^https?:\/\//i.test(t) || t.startsWith('/')) return t;
    return `data:${t.startsWith('/9j/') ? 'image/jpeg' : 'image/png'};base64,${t}`;
  })();

  const empresaRuc = company?.empresa?.ruc || company?.empresa?.nroDoc || '';

  const fechaActual = new Date();
  const horaActual = fechaActual.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  const fechaFormato = fechaActual.toLocaleDateString('es-PE');

  const printFn = useReactToPrint({
    // @ts-ignore
    contentRef: componentRef,
    pageStyle: `
      @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
      @page { size: 80mm 297mm; margin: 0; }
      * {
        font-family: 'VT323', 'Courier New', Courier, monospace !important;
        text-transform: uppercase !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body { width: 80mm; margin: 0; }
    `,
  });

  const getTitleByType = () => {
    switch (payment.tipo) {
      case 'ADELANTO': return 'RECIBO DE ADELANTO';
      case 'PAGO_PARCIAL': return 'RECIBO DE PAGO PARCIAL';
      case 'PAGO_TOTAL': return 'RECIBO DE PAGO TOTAL';
      default: return 'RECIBO DE PAGO';
    }
  };

  const getIconByType = () => {
    switch (payment.tipo) {
      case 'ADELANTO': return 'solar:wallet-money-bold-duotone';
      case 'PAGO_TOTAL': return 'solar:check-circle-bold-duotone';
      default: return 'solar:card-bold-duotone';
    }
  };

  const handlePrint = () => {
    printFn();
    onPrint?.();
  };

  const serieCorrelativo = `${comprobante?.serie || comprobante?.data?.serie || ''}-${comprobante?.correlativo || comprobante?.data?.correlativo || ''}`;
  const clienteNombre = (cliente || comprobante?.cliente || comprobante?.data?.cliente)?.nombre || '';
  const totalComprobante = Number(comprobante?.data?.mtoImpVenta || comprobante?.mtoImpVenta || 0);

  return (
    <>
      {/* Zona de impresión — oculta en pantalla */}
      <div className="hidden">
        <div
          ref={componentRef}
          className="print-area p-5 text-sm"
          style={{ fontFamily: 'VT323, Menlo, Monaco, Consolas, "Courier New", monospace', lineHeight: 1.2, letterSpacing: '0.2px' }}
        >
          <div>
            {logoDataUrl && <img src={logoDataUrl} alt="logo" className="mx-auto w-16 h-16" style={{ filter: 'grayscale(100%)' }} />}
            <h2 className="text-center text-[18px] mt-3">{company?.empresa?.nombreComercial?.toUpperCase()}</h2>
            <p className="text-center text-[18px]">
              RAZON SOCIAL: {company?.empresa?.razonSocial?.toUpperCase()}<br />
              DIRECCION: {company?.empresa?.direccion?.toUpperCase()}<br />
              RUC: {empresaRuc}
            </p>
            <hr className="my-1 border-dashed border-[#222]" />
            <h2 className="text-center text-[18px]">{getTitleByType()}</h2>
            <hr className="my-1 border-dashed border-[#222]" />
            <div className="text-center text-[18px] mb-2">
              <p>Recibo Nro: {numeroRecibo}</p>
              <p>Fecha: {fechaFormato} {horaActual}</p>
            </div>
            <hr className="my-1 border-dashed border-[#222]" />
            <div className="text-[18px] mb-2">
              <p>Comprobante Original:</p>
              <p>Serie - Nro: {serieCorrelativo}</p>
              <p>CLIENTE: {clienteNombre?.toUpperCase()}</p>
              <p>RUC/DNI: {(comprobante?.data?.cliente)?.nroDoc}</p>
            </div>
            <hr className="my-1 border-dashed border-[#222]" />
            <div className="">
              <div className="flex text-center">
                <span className="w-1/5 text-[18px]">Cant.</span>
                <span className="w-3/5 text-[18px]">Descripción</span>
                <span className="w-1/5 text-[18px]">P.U.</span>
                <span className="w-1/5 text-[18px]">Importe</span>
              </div>
              {(detalles || comprobante?.data?.detalles || comprobante?.detalles)?.map((item: any, i: any) => (
                <div key={i} className="flex flex-col mb-1">
                  <div className="flex">
                    <span className="w-1/5 text-[18px] text-center">{item?.cantidad || 0}</span>
                    <span className="w-3/5 text-[18px] text-left">{item?.descripcion?.toUpperCase() || ''}</span>
                    <span className="w-1/5 text-[18px] text-left">{Number(item?.mtoPrecioUnitario || item?.mtoValorUnitario || 0).toFixed(2)}</span>
                    <span className="w-1/5 text-[18px] text-right">{Number((item?.mtoPrecioUnitario || 0) * (item?.cantidad || 1)).toFixed(2)}</span>
                  </div>
                  {item?.lotes?.length > 0 ? item.lotes.map((lote: any, li: number) => (
                    <div key={li} className="text-left w-full pl-8 text-[16px]">LOTE: {lote.lote} | VENC: {new Date(lote.fechaVencimiento).toLocaleDateString('es-PE')}</div>
                  )) : item?.lote ? (
                    <div className="text-left w-full pl-8 text-[16px]">LOTE: {item.lote?.lote ?? item.lote} {(item.lote?.fechaVencimiento || item.fechaVencimiento) ? `| VENC: ${new Date(item.lote?.fechaVencimiento ?? item.fechaVencimiento).toLocaleDateString('es-PE')}` : ''}</div>
                  ) : null}
                  {item?.numeroReceta && (
                    <div className="text-left w-full pl-8 text-[14px] text-gray-600">RECETA: {item.numeroReceta}{item.medicoNombre ? ` | DR. ${item.medicoNombre}` : ''}{item.dniPaciente ? ` | PAC DNI: ${item.dniPaciente}` : ''}</div>
                  )}
                </div>
              ))}
            </div>
            <hr className="my-1 border-dashed border-[#222]" />
            <div className="text-[18px] mb-2">
              <p className="flex justify-between"><span>Total Comprobante:</span><span>S/ {totalComprobante.toFixed(2)}</span></p>
              <p className="flex justify-between"><span>{payment.tipo === 'ADELANTO' ? 'Saldo Antes de Adelanto:' : 'Saldo Anterior:'}</span><span>S/ {Number(nuevoSaldo + payment.monto).toFixed(2)}</span></p>
            </div>
            <hr className="my-1 border-dashed border-[#222]" />
            <div className="text-[18px] mb-2">
              <p className="flex justify-between bg-gray-100"><span>{payment.tipo === 'ADELANTO' ? 'Adelanto:' : 'Monto Pagado:'}</span><span>S/ {Number(payment.monto).toFixed(2)}</span></p>
              <p className="flex justify-between mt-1"><span>Método de Pago:</span><span>{payment.medioPago?.toUpperCase()}</span></p>
              {payment.vendedorNombre && <p className="flex justify-between mt-1"><span>Vendedor:</span><span>{payment.vendedorNombre}</span></p>}
              {payment.dirigidoA && <p className="flex justify-between mt-1"><span>Dirigido a:</span><span>{payment.dirigidoA === 'ADMINISTRADOR' ? 'Administrador' : payment.dirigidoA === 'EMPRESA' ? 'Empresa' : 'Vendedor'}</span></p>}
              {payment.referencia && <p className="flex justify-between mt-1"><span>Referencia:</span><span>{payment.referencia}</span></p>}
              {payment.observacion && <div className="mt-1"><p>Observación:</p><p>{payment.observacion}</p></div>}
              {Number(nuevoSaldo ?? 0) > 0 && (() => {
                const fVenc = comprobante?.data?.fechaVencimientoCredito || comprobante?.data?.fechaVencimiento || (comprobante?.data?.cuotas?.length > 0 ? comprobante?.data?.cuotas[0].fechaVencimiento : null);
                if (fVenc) {
                  return <p className="flex justify-between mt-1"><span>Fecha Vencimiento:</span><span>{new Date(fVenc).toLocaleDateString('es-PE')}</span></p>;
                }
                return null;
              })()}
            </div>
            <hr className="my-1 border-dashed border-[#222]" />
            <div className="text-[18px] text-center">
              <p>{payment.tipo === 'ADELANTO' ? 'Nuevo Saldo a Pagar:' : 'Nuevo Saldo Pendiente:'}</p>
              <p>S/ {Number(nuevoSaldo ?? 0).toFixed(2)}</p>
            </div>
            <hr className="my-1 border-dashed border-[#222]" />
            <p className="text-[18px] text-center mt-4">
              Sistema punto de venta - {company?.empresa?.reseller?.nombre || BRAND.name}.<br />
              Desarrollado por {company?.empresa?.reseller?.whiteLabelNombre || company?.empresa?.reseller?.nombre || BRAND.name}.<br />
              {company?.empresa?.reseller?.whiteLabelWebsite || BRAND.website}.
            </p>
            <hr className="my-1 border-dashed border-[#222]" />
            <p className="text-[18px] text-center">GRACIAS POR SU COMPRA, VUELVA PRONTO!</p>
          </div>
        </div>
      </div>

      {/* Modal visual en pantalla */}
      <div className="fixed inset-0 top-[-30px] bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 dark:border-transparent">

          {/* Header */}
          <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                <Icon icon={getIconByType()} className="text-xl" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Pago Registrado</h3>
                <p className="text-xs text-gray-400 dark:text-slate-500">{getTitleByType()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Icon icon="mdi:close" className="text-xl" />
            </button>
          </div>

          {/* Contenido */}
          <div className="px-5 py-4 space-y-2.5">
            {logoDataUrl && (
              <div className="flex justify-center pb-1">
                <img src={logoDataUrl} alt="logo" className="w-10 h-10 object-contain rounded-lg" />
              </div>
            )}
            <Row label="Comprobante" value={serieCorrelativo} />
            {clienteNombre && <Row label="Cliente" value={clienteNombre.toUpperCase()} />}
            <Row label="Total comprobante" value={`S/ ${totalComprobante.toFixed(2)}`} />

            <div className="border-t border-gray-100 dark:border-slate-700 pt-2.5 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400 dark:text-slate-500">
                  {payment.tipo === 'ADELANTO' ? 'Adelanto' : 'Monto pagado'}
                </span>
                <span className="text-xl font-black text-gray-900 dark:text-white">S/ {payment.monto?.toFixed(2)}</span>
              </div>
              <Row label="Método de pago" value={payment.medioPago?.toUpperCase()} />
              {payment.vendedorNombre && <Row label="Vendedor" value={payment.vendedorNombre} />}
              {payment.dirigidoA && <Row label="Dirigido a" value={payment.dirigidoA === 'ADMINISTRADOR' ? 'Administrador' : payment.dirigidoA === 'EMPRESA' ? 'Empresa' : 'Vendedor'} />}
              {payment.referencia && <Row label="Referencia" value={payment.referencia.toUpperCase()} />}
              {payment.observacion && <Row label="Observación" value={payment.observacion} />}
              {Number(nuevoSaldo ?? 0) > 0 && (() => {
                const fVenc = comprobante?.data?.fechaVencimientoCredito || comprobante?.data?.fechaVencimiento || (comprobante?.data?.cuotas?.length > 0 ? comprobante?.data?.cuotas[0].fechaVencimiento : null);
                if (fVenc) {
                  return <Row label="Fecha Vencimiento" value={new Date(fVenc).toLocaleDateString('es-PE')} />;
                }
                return null;
              })()}
            </div>

            <div className="border-t border-gray-100 dark:border-slate-700 pt-2.5 flex justify-between items-center">
              <span className="text-sm text-gray-400 dark:text-slate-500">
                {payment.tipo === 'ADELANTO' ? 'Nuevo saldo a pagar' : 'Saldo pendiente'}
              </span>
              <span className="text-xl font-black text-gray-900 dark:text-white">
                S/ {Number(nuevoSaldo ?? 0).toFixed(2)}
              </span>
            </div>
            {nuevoSaldo === 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Icon icon="solar:check-circle-bold" width="13" height="13" />
                Comprobante pagado en su totalidad
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="p-4 border-t border-gray-100 dark:border-slate-700 flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors font-medium text-sm"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-2.5 btn-accent rounded-xl transition-colors font-medium text-sm flex items-center justify-center gap-2"
            >
              <Icon icon="solar:printer-bold" width="15" height="15" />
              Imprimir
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-gray-400 dark:text-slate-500">{label}</span>
    <span className="font-medium text-gray-700 dark:text-slate-200 text-right max-w-[60%]">{value}</span>
  </div>
);

export default PaymentReceipt;
