import React from 'react';
import moment from 'moment';
import { BRAND } from '@/lib/branding';

interface TrasladoPrintPageProps {
    componentRef: React.Ref<HTMLDivElement>;
    company: any;
    sedeOrigen: any;
    sedeDestino: any;
    user: any;
    date: Date;
    products: any[];
    observacion: string;
}

const TrasladoPrintPage: React.FC<TrasladoPrintPageProps> = ({
    componentRef,
    company,
    sedeOrigen,
    sedeDestino,
    user,
    date,
    products,
    observacion
}) => {
    const rawBase64 = company?.empresa?.logo;
    const logoDataUrl = (() => {
        if (!rawBase64) return undefined;
        const t = rawBase64.trim();
        if (t.startsWith('data:')) return t;
        if (/^https?:\/\//i.test(t) || t.startsWith('/')) return t;
        return `data:${t.startsWith('/9j/') ? 'image/jpeg' : 'image/png'};base64,${t}`;
    })();

    return (
        <div className="hidden h-full bg-white">
            <div
                ref={componentRef}
                className="px-8 pt-8 pb-12 text-sm bg-white text-black h-full"
                style={{
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    color: '#000'
                }}
            >
                <div className="w-full text-xs font-sans">
                    {/* Header with Logo and Company Info */}
                    <div className="flex justify-between items-start mb-6">
                        {logoDataUrl ? (
                            <img src={logoDataUrl} alt="logo" className="w-[150px] h-[150px] object-contain object-left grayscale" />
                        ) : (
                            <div className="w-[150px] h-[150px] bg-gray-100 flex items-center justify-center border border-gray-300">
                                <span className="text-gray-400 font-bold uppercase text-center">{company?.empresa?.nombreComercial || 'LOGO'}</span>
                            </div>
                        )}
                        <div className="flex-1 ml-4 justify-center flex flex-col">
                            <h6 className="text-xl font-bold uppercase">{company?.empresa?.nombreComercial || company?.empresa?.razonSocial}</h6>
                            <p className="text-xs uppercase mt-1">
                                {company?.empresa?.direccion}<br />
                                RAZON SOCIAL: {company?.empresa?.razonSocial}<br />
                                CELULAR: {company?.celular || company?.empresa?.telefono}<br />
                            </p>
                        </div>
                        <div className="border-2 border-black px-6 pt-5 pb-4 text-center ml-4 rounded-xl shrink-0 w-64">
                            <div className="text-sm font-bold">RUC: {company?.empresa?.ruc}</div>
                            <div className="text-xl font-black mt-2 mb-2 uppercase">REPORTE DE<br/>TRASLADO INTERNO</div>
                            {/* <div className="text-sm">N° 000001</div> */}
                        </div>
                    </div>

                    {/* Data Section: Origen (Left) and Destino (Right) */}
                    <div className="flex gap-4 mb-6 items-stretch">
                        <div className="w-1/2 flex flex-col">
                            <div className="font-bold text-gray-800 mb-1 border-b-2 border-black pb-1 uppercase tracking-wider text-[11px]">Sede de Origen</div>
                            <div className="border-2 border-black rounded-lg p-3 flex-1 h-auto bg-gray-50/20">
                                <div className="grid grid-cols-[80px_1fr] gap-y-2">
                                    <span className="font-bold">NOMBRE:</span>
                                    <span className="break-words uppercase">{sedeOrigen?.nombre}</span>
                                    <span className="font-bold">DIRECCIÓN:</span>
                                    <span className="break-words uppercase">{sedeOrigen?.direccion || '-'}</span>
                                    <span className="font-bold">ENCARGADO:</span>
                                    <span className="break-words uppercase">{user?.nombre} {user?.apellidos}</span>
                                </div>
                            </div>
                        </div>

                        <div className="w-1/2 flex flex-col">
                            <div className="font-bold text-gray-800 mb-1 border-b-2 border-black pb-1 uppercase tracking-wider text-[11px]">Sede de Destino</div>
                            <div className="border-2 border-black rounded-lg p-3 flex-1 h-auto bg-gray-50/20">
                                <div className="grid grid-cols-[80px_1fr] gap-y-2">
                                    <span className="font-bold">NOMBRE:</span>
                                    <span className="break-words uppercase">{sedeDestino?.nombre}</span>
                                    <span className="font-bold">DIRECCIÓN:</span>
                                    <span className="break-words uppercase">{sedeDestino?.direccion || '-'}</span>
                                    <span className="font-bold">FECHA:</span>
                                    <span className="uppercase">{moment(date).format('DD/MM/YYYY HH:mm')}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Product Table */}
                    <div className="w-full mb-6">
                        <div className="flex bg-gray-200 text-black font-bold border-2 border-black text-xs py-2 uppercase">
                            <div className="w-[8%] text-center border-r-2 border-black">N°</div>
                            <div className="w-[12%] text-center border-r-2 border-black">CANT.</div>
                            <div className="w-[12%] text-center border-r-2 border-black">UNIDAD</div>
                            <div className="w-[15%] text-center border-r-2 border-black">CÓDIGO</div>
                            <div className="flex-1 text-center px-2">DESCRIPCIÓN DEL PRODUCTO</div>
                        </div>

                        <div className="border-x-2 border-b-2 border-black">
                            {products?.map((item: any, i: number) => (
                                <div key={i} className={`flex border-b border-gray-400 text-xs ${i % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/50'} last:border-b-0`}>
                                    <div className="w-[8%] text-center border-r-2 border-black py-2 font-medium">{i + 1}</div>
                                    <div className="w-[12%] text-center border-r-2 border-black py-2 font-bold">{Number(item.cantidad).toFixed(2)}</div>
                                    <div className="w-[12%] text-center border-r-2 border-black py-2">{item.unidadMedida?.nombre || item.unidadMedida || 'NIU'}</div>
                                    <div className="w-[15%] text-center border-r-2 border-black py-2 font-mono text-[10px]">{item.codigo || '-'}</div>
                                    <div className="flex-1 text-left px-3 py-2 font-medium uppercase">{item.descripcion}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Resumen & Firmas */}
                    <div className="flex gap-4">
                        <div className="w-2/3">
                            <div className="border-2 border-black rounded-lg p-3 min-h-[100px]">
                                <div className="font-bold mb-1 uppercase text-[11px] underline">OBSERVACIONES DEL TRASLADO:</div>
                                <div className="text-xs uppercase">{observacion || 'SIN OBSERVACIONES.'}</div>
                                <div className="mt-4 text-[10px] text-gray-500 italic uppercase">
                                    ESTE DOCUMENTO ACREDITA EL MOVIMIENTO INTERNO DE INVENTARIO ENTRE LAS SEDES MENCIONADAS.
                                </div>
                            </div>
                        </div>
                        <div className="w-1/3 flex flex-col items-center justify-end pt-10">
                            <div className="border-t-2 border-black w-3/4 flex flex-col items-center pt-2">
                                <span className="font-bold text-xs uppercase text-center">FIRMA RESPONSABLE</span>
                                <span className="text-[10px] text-gray-600 mt-1 uppercase text-center">{user?.nombre} {user?.apellidos}</span>
                            </div>
                        </div>
                    </div>

                    {/* Custom Footer */}
                    <div className="mt-12 text-center text-[10px] border-t border-gray-300 pt-4 text-gray-500 uppercase">
                        <div className="flex justify-between items-center px-4">
                            <div>EMITIDO DESDE PUNTO DE VENTA {BRAND.name.toUpperCase()}</div>
                            <div>PÁGINA 1 DE 1</div>
                            <div>{moment().format('DD/MM/YYYY HH:mm')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrasladoPrintPage;
