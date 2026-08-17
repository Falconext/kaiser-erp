import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { buildComprobantePrintPageStyle } from '@/utils/printStyles';

const ReciboPagoParcial = ({
    comprobante,
    montoPagado,
    medioPago,
    numeroRecibo,
    company,
}: any) => {
    const componentRef = useRef(null);

    const printFn = useReactToPrint({
        // @ts-ignore
        contentRef: componentRef,
        pageStyle: buildComprobantePrintPageStyle({ width: 80, height: 297 }),
    });

    const logoDataUrl = (() => {
        const raw = company?.empresa?.logo;
        if (!raw) return '';
        const t = raw.trim();
        if (t.startsWith('data:')) return t;
        if (/^https?:\/\//i.test(t) || t.startsWith('/')) return t;
        return `data:${t.startsWith('/9j/') ? 'image/jpeg' : 'image/png'};base64,${t}`;
    })();
    const fechaActual = new Date();
    const horaActual = fechaActual.toLocaleTimeString();
    const fechaFormato = fechaActual.toLocaleDateString();

    return (
        <>
            <div className='hidden'>
                <div ref={componentRef} className="print-area p-5 text-sm">
                    <div className="">
                        {logoDataUrl && <img src={logoDataUrl} alt="logo" className="mx-auto w-24 h-24 object-contain" />}
                        <h2 className="text-center text-xs font-bold">{company?.empresa?.nombreComercial.toUpperCase()}</h2>
                        <p className="text-center text-xs">
                            RAZON SOCIAL: {company?.empresa?.razonSocial?.toUpperCase()}<br />
                            DIRECCION: {company?.empresa?.direccion?.toUpperCase()}<br />
                            RUC: {company?.empresa?.ruc?.toUpperCase()}
                        </p>
                        <hr className="my-1 border-dashed border-[#222]" />

                        <h2 className="text-center font-bold text-xs">RECIBO DE PAGO PARCIAL</h2>
                        <hr className="my-1 border-dashed border-[#222]" />

                        <div className="text-center text-xs mb-2">
                            <p><span className="font-bold">Recibo Nro:</span> {numeroRecibo}</p>
                            <p><span className="font-bold">Fecha:</span> {fechaFormato} {horaActual}</p>
                        </div>
                        <hr className="my-1 border-dashed border-[#222]" />

                        <div className="text-xs mb-2">
                            <p><span className="font-bold">Comprobante Original:</span></p>
                            <p className="ml-2">Tipo: {comprobante?.tipoDoc}</p>
                            <p className="ml-2">Serie: {comprobante?.serie}-{comprobante?.correlativo}</p>
                            <p className="ml-2">Cliente: {comprobante?.cliente?.nombre}</p>
                            <p className="ml-2">RUC/DNI: {comprobante?.cliente?.nroDoc}</p>
                        </div>
                        <hr className="my-1 border-dashed border-[#222]" />

                        <div className="text-xs mb-2">
                            <p className="flex justify-between">
                                <span className="font-bold">Total Comprobante:</span>
                                <span>S/ {Number(comprobante?.mtoImpVenta || 0).toFixed(2)}</span>
                            </p>
                            <p className="flex justify-between">
                                <span className="font-bold">Saldo Anterior:</span>
                                <span>S/ {Number(comprobante?.saldo || 0).toFixed(2)}</span>
                            </p>
                        </div>
                        <hr className="my-1 border-dashed border-[#222]" />

                        <div className="text-xs mb-2">
                            <p className="flex justify-between font-bold text-sm bg-gray-100 p-1">
                                <span>MONTO PAGADO:</span>
                                <span>S/ {Number(montoPagado).toFixed(2)}</span>
                            </p>
                            <p className="flex justify-between mt-1">
                                <span className="font-bold">Método de Pago:</span>
                                <span>{medioPago?.toUpperCase()}</span>
                            </p>
                        </div>
                        <hr className="my-1 border-dashed border-[#222]" />

                        <div className="text-xs">
                            <p className="text-center font-bold mb-2">
                                Nuevo Saldo Pendiente:
                            </p>
                            <p className="text-center text-lg font-bold">
                                S/ {(Number(comprobante?.saldo || 0) - Number(montoPagado)).toFixed(2)}
                            </p>
                        </div>

                        <hr className="my-1 border-dashed border-[#222]" />
                        <p className="text-xs text-center mt-4">
                            Este comprobante acredita el pago parcial de la factura mencionada.<br />
                            Autorizado mediante Resolución de Intendencia<br />
                            N° 080-005-000153/SUNAT.
                        </p>
                    </div>
                </div>
            </div>
            <button
                onClick={printFn}
                className="btn-accent px-4 py-2 rounded text-sm"
            >
                🖨️ Imprimir Recibo
            </button>
        </>
    );
};

export default ReciboPagoParcial;
