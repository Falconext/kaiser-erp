import React, { forwardRef } from 'react';
import moment from 'moment';
import QRCode from 'qrcode';
import { IGuiaRemision } from '@/zustand/guia-remision';
import { useAuthStore } from '@/zustand/auth';

interface GuiaRemisionPrintProps {
    guia: IGuiaRemision;
    company: any;
}

const GuiaRemisionPrint = forwardRef<HTMLDivElement, GuiaRemisionPrintProps>(({ guia, company }, ref) => {
    const { auth } = useAuthStore();
    const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState('');

    React.useEffect(() => {
        if (guia) {
            const qrData = `${company?.ruc}|09|${guia.serie}|${guia.correlativo}|0.00|${Number(guia.pesoTotal).toFixed(2)}|${moment(guia.fechaEmision).format('YYYY-MM-DD')}|${guia.destinatarioTipoDoc}|${guia.destinatarioNumDoc}|`;
            QRCode.toDataURL(qrData).then(setQrCodeDataUrl).catch(console.error);
        }
    }, [guia, company]);

    const logoUrl = (() => {
        const raw = company?.logo;
        if (!raw) return null;
        const t = raw.trim();
        if (t.startsWith('data:')) return t;
        if (/^https?:\/\//i.test(t) || t.startsWith('/')) return t;
        return `data:${t.startsWith('/9j/') ? 'image/jpeg' : 'image/png'};base64,${t}`;
    })();

    const logoSizePx = Number(company?.ticketLogoSize) || 96;

    // Helper para formatear fechas
    const fmtDate = (date: string) => date ? moment.utc(date).format('DD/MM/YYYY') : '-';

    return (
        <div className="hidden print:block w-full bg-white text-xs font-sans text-black" ref={ref}>
            <div className="p-8 max-w-[210mm] mx-auto">
                {/* Header */}
                <div className="flex justify-between items-stretch mb-4 gap-4">
                    {/* Logo Box */}
                    <div className="w-1/4 flex items-center justify-center p-2">
                        {logoUrl && <img src={logoUrl} alt="Logo" className="max-w-full object-contain" style={{ maxHeight: `${logoSizePx}px` }} />}
                    </div>

                    {/* Company Info */}
                    <div className="w-2/4 text-center flex flex-col justify-center">
                        <h1 className="text-xl font-bold uppercase mb-1">{company?.razonSocial || 'EMPRESA DEMO'}</h1>
                        <p className="text-[10px] leading-tight uppercase">
                            {company?.direccion}<br />
                            {company?.ubigeoCode && <span>{company.ubigeoCode} - </span>}
                            {company?.departamento} - {company?.provincia} - {company?.distrito}<br />
                            <span className="font-bold">CORREO:</span> {company?.email}<br />
                            <span className="font-bold">CELULAR:</span> {company?.celular || company?.telefono}
                        </p>
                    </div>

                    {/* RUC Box */}
                    <div className="w-1/4 border border-gray-400 rounded-lg overflow-hidden flex flex-col">
                        <div className="bg-white p-2 text-center flex-1 flex flex-col justify-center">
                            <h2 className="text-base font-bold">RUC {company?.ruc}</h2>
                            <h3 className="text-sm font-bold bg-gray-200 py-1 my-1">GUÍA DE REMISIÓN<br />ELECTRÓNICA REMITENTE</h3>
                            <p className="text-base font-bold">{guia?.serie}-{String(guia?.correlativo).padStart(8, '0')}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <p className="text-[10px] font-bold uppercase mb-1">{company?.razonSocial}</p>
                    <p className="text-[10px] uppercase">{company?.direccion} - {company?.departamento} - {company?.provincia} - {company?.distrito}</p>
                    <p className="text-[10px] uppercase font-bold text-center mt-1">PRODUCTOS FARMACÉUTICOS, MATERIAL MÉDICO, INSTRUMENTAL MÉDICO, EQUIPOS MÉDICOS Y AFINES</p>
                </div>

                {/* Destinatario y Datos Documento Grid */}
                <div className="flex gap-4 mb-4">
                    {/* Destinatario */}
                    <div className="w-1/2 border border-gray-400 rounded-lg overflow-hidden">
                        <div className="bg-gray-200 px-2 py-1 font-bold border-b border-gray-400 text-xs">DESTINATARIO</div>
                        <div className="p-2 text-[10px] grid grid-cols-[80px_1fr] gap-y-1">
                            <span className="font-bold">DESTINATARIO:</span>
                            <span className="uppercase">{guia?.destinatarioRazonSocial}</span>
                            <span className="font-bold">RUC:</span>
                            <span>{guia?.destinatarioNumDoc}</span>
                        </div>
                    </div>

                    {/* Datos Documento */}
                    <div className="w-1/2 border border-gray-400 rounded-lg overflow-hidden">
                        <div className="bg-gray-200 px-2 py-1 font-bold border-b border-gray-400 text-xs text-gray-600">DATOS DEL DOCUMENTO</div>
                        <div className="p-2 text-[10px] grid grid-cols-[140px_1fr] gap-y-1">
                            <span className="font-bold">FECHA EMISIÓN:</span>
                            <span>{fmtDate(guia?.fechaEmision)}</span>
                            <span className="font-bold">FECHA DE INICIO DE TRASLADO:</span>
                            <span>{fmtDate(guia?.fechaInicioTraslado)}</span>
                            <span className="font-bold">DOCUMENTO RELACIONADO:</span>
                            <span></span>
                        </div>
                    </div>
                </div>

                {/* Punto Partida y Llegada */}
                <div className="border border-gray-400 rounded-lg mb-4 overflow-hidden text-[10px]">
                    <div className="grid grid-cols-[120px_1fr] border-b border-gray-300 p-1">
                        <span className="font-bold pl-1">PUNTO DE PARTIDA:</span>
                        <span className="uppercase">{guia?.partidaDireccion}</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] p-1">
                        <span className="font-bold pl-1">PUNTO DE LLEGADA:</span>
                        <span className="uppercase">{guia?.llegadaDireccion}</span>
                    </div>
                </div>

                {/* Conductor/Vehiculo y Transportista Grid */}
                <div className="flex gap-4 mb-4">
                    {/* Conductor / Vehiculo */}
                    <div className="w-1/2 border border-gray-400 rounded-lg overflow-hidden">
                        <div className="bg-gray-200 px-2 py-1 font-bold border-b border-gray-400 text-xs text-gray-600">CONDUCTOR / VEHICULO</div>
                        <div className="p-2 text-[10px] grid grid-cols-[110px_1fr] gap-y-1">
                            {guia?.modoTransporte === '02' ? (
                                <>
                                    <span className="font-bold">CONDUCTOR:</span>
                                    <span className="uppercase">{guia?.conductorNombre}</span>
                                    <span className="font-bold">RUC/DNI CONDUCTOR:</span>
                                    <span>{guia?.conductorNumDoc}</span>
                                    <span className="font-bold">PLACA:</span>
                                    <span className="uppercase">{guia?.vehiculoPlaca}</span>
                                    <span className="font-bold">LICENCIA CONDUCIR:</span>
                                    <span className="uppercase">{guia?.conductorLicencia}</span>
                                </>
                            ) : <span>TRANSPORTE PÚBLICO</span>}
                        </div>
                    </div>

                    {/* Transportista */}
                    <div className="w-1/2 border border-gray-400 rounded-lg overflow-hidden">
                        <div className="bg-gray-200 px-2 py-1 font-bold border-b border-gray-400 text-xs text-gray-600">TRANSPORTISTA</div>
                        <div className="p-2 text-[10px] grid grid-cols-[120px_1fr] gap-y-1">
                            {guia?.modoTransporte === '01' ? (
                                <>
                                    <span className="font-bold">TRANSPORTISTA:</span>
                                    <span className="uppercase">{guia?.transportistaRazonSocial}</span>
                                    <span className="font-bold">RUC/DNI TRANSPORTISTA:</span>
                                    <span>{guia?.transportistaRuc}</span>
                                    <span className="font-bold">N° REGISTRO MTC:</span>
                                    <span className="uppercase">{guia?.transportistaMTC}</span>
                                </>
                            ) : (
                                <>
                                    <span className="font-bold">TRANSPORTISTA:</span>
                                    <span className="uppercase">{company?.razonSocial}</span>
                                    <span className="font-bold">RUC/DNI TRANSPORTISTA:</span>
                                    <span>{company?.ruc}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-2 text-[10px]">
                    <div>
                        <span className="font-bold">MOTIVO DE TRASLADO: </span>
                        <span className="uppercase">{guia?.tipoTraslado === '01' ? 'VENTA' : guia?.tipoTraslado === '02' ? 'COMPRA' : 'OTROS'}</span>
                    </div>
                    <div>
                        <span className="font-bold">MODALIDAD DE TRASLADO: </span>
                        <span className="uppercase">{guia?.modoTransporte === '01' ? 'PÚBLICA' : 'PRIVADA'}</span>
                    </div>
                </div>
                <div className="mb-2 text-[10px]">
                    <span className="font-bold">TRASLADO EN VEHÍCULOS DE CATEGORÍA M1 O L: </span>
                    <span>{guia?.vehiculoM1oL ? 'Sí' : 'No'}</span>
                </div>

                {/* Items Table */}
                <div className="border border-gray-400 rounded-lg mb-4 overflow-hidden min-h-[300px]">
                    <table className="w-full text-[10px]">
                        <thead className="bg-gray-300 font-bold border-b border-gray-400">
                            <tr>
                                <th className="py-1 px-2 text-center border-r border-gray-400 w-10">N°</th>
                                <th className="py-1 px-2 text-center border-r border-gray-400 w-16">CANT.</th>
                                <th className="py-1 px-2 text-center border-r border-gray-400 w-20">UNIDAD</th>
                                <th className="py-1 px-2 text-center border-r border-gray-400 w-24">CÓDIGO</th>
                                <th className="py-1 px-2 text-left border-r border-gray-400">DESCRIPCIÓN</th>
                                <th className="py-1 px-2 text-center border-r border-gray-400 w-16">LOTE</th>
                                <th className="py-1 px-2 text-center w-20">F.VCTO</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guia?.detalles?.map((item, idx) => (
                                <tr key={idx} className="">
                                    <td className="py-1 px-2 text-center border-r border-gray-300 border-b">{idx + 1}</td>
                                    <td className="py-1 px-2 text-right border-r border-gray-300 border-b">{Number(item.cantidad).toFixed(3)}</td>
                                    <td className="py-1 px-2 text-center border-r border-gray-300 border-b">{item.unidadMedida}</td>
                                    <td className="py-1 px-2 text-center border-r border-gray-300 border-b">{item.codigoProducto}</td>
                                    <td className="py-1 px-2 text-left border-r border-gray-300 border-b">{item.descripcion}</td>
                                    <td className="py-1 px-2 text-center border-r border-gray-300 border-b">-</td>
                                    <td className="py-1 px-2 text-center border-b">-</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Observations */}
                <div className="border border-gray-400 rounded-lg p-2 mb-4 text-[10px]">
                    <span className="font-bold">OBSERVACIONES:</span> {guia?.observaciones}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-4">
                    <div className="w-[100px]">
                        {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="QR" className="w-full h-auto" />}
                    </div>
                    <div className="flex-1 text-center">
                    </div>
                    <div className="w-[300px] border border-gray-400 rounded-lg bg-gray-200 p-3 flex justify-between items-center">
                        <span className="font-bold text-sm">TOTAL PESO BRUTO ({guia?.unidadPeso}):</span>
                        <span className="font-bold text-lg">{Number(guia?.pesoTotal).toFixed(3)}</span>
                    </div>
                </div>

                <div className="mt-8 text-center text-[9px] font-bold">
                    <p>"GRACIAS POR ELEGIR {company?.razonSocial} PARA CUBRIR SUS REQUERIMIENTOS DE MATERIALES MEDICOS"</p>
                    <p>VUELVA PRONTO</p>
                </div>

                <div className="mt-2 text-[8px] flex justify-between text-gray-500">
                    <span>USUARIO: {auth?.nombre || 'ADMIN'} {moment().format('DD/MM/YYYY HH:mm')}</span>
                    <span>Representación impresa de la GUÍA DE REMISIÓN ELECTRÓNICA REMITENTE. Autorizado mediante resolución N° 054-006-0001490 /SUNAT. Consulte su comprobante en www.smartclic.pe</span>
                </div>
                <div className="text-center mt-2">
                    <div className="font-bold text-sm">SmartClic ™</div>
                    <div className="text-[9px]">Comprobante emitido a través de www.smartclic.pe</div>
                </div>

            </div>
        </div>
    );
});

GuiaRemisionPrint.displayName = 'GuiaRemisionPrint';

export default GuiaRemisionPrint;
