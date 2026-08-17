import React from 'react';
import { Icon } from '@iconify/react';

interface Props {
    componentRef: React.RefObject<HTMLDivElement | null>;
    productos: any[];
    theme: 'moderna' | 'tecnica' | 'minimal' | 'menu' | 'premium-tech';
    company: any;
    showPrice?: boolean;
    showStock?: boolean;
}

export default function CatalogoPrintTemplate({ componentRef, productos, theme, company, showPrice = true, showStock = false }: Props) {
    // Agrupar por categoría
    const groupedProducts = productos.reduce((acc, curr) => {
        const cat = curr.categoria?.nombre || 'General';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
    }, {} as Record<string, any[]>);

    const rawBase64 = company?.logo;
    const logoUrl = (() => {
        if (!rawBase64) return undefined;
        const t = rawBase64.trim();
        if (t.startsWith('data:')) return t;
        if (/^https?:\/\//i.test(t) || t.startsWith('/')) return t;
        return `data:${t.startsWith('/9j/') ? 'image/jpeg' : 'image/png'};base64,${t}`;
    })();

    return (
        <div ref={componentRef} className="p-10 print:px-12 print:py-10 bg-white w-full print:w-[210mm]" style={{ color: '#111827', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <style>
                {`
                    @media print {
                        @page { margin: 15mm; size: A4; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
                        .page-break { page-break-before: always; }
                        .avoid-break { page-break-inside: avoid; }
                    }
                `}
            </style>

            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-gray-100 pb-6 mb-8">
                <div className="flex items-center gap-4">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-16 w-16 object-contain" crossOrigin="anonymous" />
                    ) : (
                        <div className="h-16 w-16 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-400">
                            LOGO
                        </div>
                    )}
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">{company?.razonSocial || 'Mi Empresa'}</h1>
                        <p className="text-gray-500 mt-1 font-medium">Catálogo de Productos</p>
                    </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                    <p>{company?.direccion || ''}</p>
                    <p>RUC: {company?.ruc || ''}</p>
                    {company?.configuracion?.whatsappTienda && (
                        <p className="font-bold text-gray-800 mt-1">WhatsApp: {company.configuracion.whatsappTienda}</p>
                    )}
                </div>
            </div>

            {/* Content based on theme */}
            <div className="space-y-10">
                {(Object.entries(groupedProducts) as [string, any[]][]).map(([categoria, items]) => (
                    <div key={categoria} className="avoid-break mb-8">
                        {theme === 'premium-tech' ? (
                            <div className="mb-6">
                                <h2 className="text-[11px] font-extrabold tracking-[0.2em] text-[#4facfe] uppercase mb-2">{categoria}</h2>
                                <div className="w-full h-px bg-gray-200"></div>
                            </div>
                        ) : (
                            <h2 className="text-2xl font-bold border-b border-gray-200 pb-2 mb-6 text-gray-800 uppercase tracking-wider">{categoria}</h2>
                        )}

                        {theme === 'moderna' && (
                            <div className="grid grid-cols-4 gap-6">
                                {items.map(p => (
                                    <div key={p.id} className="avoid-break flex flex-col items-center text-center">
                                        <div className="w-full aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3 border border-gray-100 flex items-center justify-center p-1">
                                            {p.imagenUrl ? (
                                                <>
                                                    <img src={p.imagenUrl} alt={p.descripcion || p.nombre || p.codigo} className="w-full h-full object-cover rounded-lg" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); e.currentTarget.nextElementSibling?.classList.add('flex'); }} />
                                                    <div className="hidden flex-col items-center justify-center text-gray-300 opacity-50 w-full h-full">
                                                        <Icon icon="solar:gallery-broken" className="text-3xl" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-gray-300 opacity-50 w-full h-full">
                                                    <Icon icon="solar:gallery-broken" className="text-3xl" />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-sm leading-tight text-gray-800 line-clamp-2 h-10">{p.descripcion || p.nombre || p.codigo}</h3>
                                        {showPrice && <p className="text-blue-600 font-extrabold mt-1">S/ {Number(p.precioUnitario || 0).toFixed(2)}</p>}
                                        {showStock && <p className="text-[11px] font-semibold text-gray-500 mt-0.5">Stock: {Number(p.stock ?? 0)}</p>}
                                    </div>
                                ))}
                            </div>
                        )}

                        {theme === 'tecnica' && (
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-600 font-bold border-b-2 border-gray-200">
                                    <tr>
                                        <th className="py-3 px-4 w-16">Img</th>
                                        <th className="py-3 px-4 w-32">Código</th>
                                        <th className="py-3 px-4">Producto / Modelo</th>
                                        <th className="py-3 px-4 w-32 text-center">Marca</th>
                                        {showStock && <th className="py-3 px-4 w-24 text-center">Stock</th>}
                                        {showPrice && <th className="py-3 px-4 w-28 text-right">Precio</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map(p => (
                                        <tr key={p.id} className="avoid-break hover:bg-gray-50">
                                            <td className="py-2 px-4">
                                                <div className="w-10 h-10 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden">
                                                    {p.imagenUrl ? (
                                                        <>
                                                            <img src={p.imagenUrl} className="w-full h-full object-cover" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                                                            <Icon icon="solar:gallery-minimalistic-broken" className="hidden text-gray-300 text-xl opacity-50" />
                                                        </>
                                                    ) : <Icon icon="solar:gallery-minimalistic-broken" className="text-gray-300 text-xl opacity-50" />}
                                                </div>
                                            </td>
                                            <td className="py-2 px-4 font-mono text-xs text-gray-500">{p.codigo || '-'}</td>
                                            <td className="py-2 px-4 font-semibold text-gray-800">{p.descripcion || p.nombre || p.codigo}</td>
                                            <td className="py-2 px-4 text-center text-gray-600 text-xs">{p.marca?.nombre || '-'}</td>
                                            {showStock && <td className="py-2 px-4 text-center font-semibold text-gray-600">{Number(p.stock ?? 0)}</td>}
                                            {showPrice && <td className="py-2 px-4 text-right font-bold text-blue-600 whitespace-nowrap">S/ {Number(p.precioUnitario || 0).toFixed(2)}</td>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {theme === 'minimal' && (
                            <div className="grid grid-cols-2 gap-x-12 gap-y-3">
                                {items.map(p => (
                                    <div key={p.id} className="avoid-break flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                                        <div className="pr-4 flex-1">
                                            <p className="font-bold text-gray-800 text-sm">{p.descripcion || p.nombre || p.codigo}</p>
                                            {p.codigo && <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Ref: {p.codigo}</p>}
                                        </div>
                                        <div className="whitespace-nowrap text-right">
                                            {showPrice && <div className="font-extrabold text-gray-900">S/ {Number(p.precioUnitario || 0).toFixed(2)}</div>}
                                            {showStock && <div className="text-[10px] font-semibold text-gray-500">Stock: {Number(p.stock ?? 0)}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {theme === 'menu' && (
                            <div className="grid grid-cols-2 gap-8">
                                {items.map(p => (
                                    <div key={p.id} className="avoid-break flex gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 overflow-hidden shadow-sm">
                                            {p.imagenUrl ? (
                                                <>
                                                    <img src={p.imagenUrl} className="w-full h-full object-cover" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); e.currentTarget.nextElementSibling?.classList.add('flex'); }} />
                                                    <div className="hidden w-full h-full bg-gray-50 items-center justify-center">
                                                        <Icon icon="solar:camera-broken" className="text-gray-300 text-2xl opacity-50" />
                                                    </div>
                                                </>
                                            ) : <div className="w-full h-full bg-gray-50 flex items-center justify-center"><Icon icon="solar:camera-broken" className="text-gray-300 text-2xl opacity-50" /></div>}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-center">
                                            <div className="flex justify-between items-start mb-1 gap-2">
                                                <h3 className="font-bold text-gray-900 leading-tight flex-1">{p.descripcion || p.nombre || p.codigo}</h3>
                                                {showPrice && <span className="font-bold text-orange-600 whitespace-nowrap bg-orange-50 px-2 py-0.5 rounded text-sm">S/ {Number(p.precioUnitario || 0).toFixed(2)}</span>}
                                            </div>
                                            {p.descripcionLarga && <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed mt-1">{String(p.descripcionLarga).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim()}</p>}
                                            {showStock && <p className="text-[11px] font-semibold text-gray-500 mt-1">Stock: {Number(p.stock ?? 0)}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {theme === 'premium-tech' && (
                            <div className="grid grid-cols-3 gap-x-8 gap-y-14 px-4">
                                {items.map(p => {
                                    const precioStr = Number(p.precioUnitario || 0).toFixed(2);
                                    const [enteros, decimales] = precioStr.split('.');
                                    return (
                                        <div key={p.id} className="avoid-break flex flex-col items-center">
                                            <div className="w-full aspect-[4/3] bg-white flex items-center justify-center relative group">
                                                {showPrice && (
                                                    <div className="absolute -top-3 -right-3 w-[65px] h-[65px] rounded-full bg-gradient-to-br from-[#4facfe] to-[#00f2fe] text-white flex flex-col items-center justify-center shadow-lg z-10 border-4 border-white transform rotate-3">
                                                        <div className="flex items-start leading-none font-bold">
                                                            <span className="text-[10px] mt-1 mr-0.5">S/</span>
                                                            <span className="text-lg">{enteros}</span>
                                                            <span className="text-[9px] mt-1">.{decimales}</span>
                                                        </div>
                                                    </div>
                                                )}

                                                {p.imagenUrl ? (
                                                    <>
                                                        <img src={p.imagenUrl} className="w-[85%] h-[85%] object-contain drop-shadow-xl" crossOrigin="anonymous" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); e.currentTarget.nextElementSibling?.classList.add('flex'); }} />
                                                        <div className="hidden w-full h-full items-center justify-center">
                                                            <Icon icon="solar:laptop-broken" className="text-gray-200 text-5xl" />
                                                        </div>
                                                    </>
                                                ) : (
                                                    <Icon icon="solar:smartphone-broken" className="text-gray-200 text-5xl" />
                                                )}
                                            </div>

                                            <div className="mt-5 text-center px-2 w-full">
                                                <div className="text-[13px] leading-tight">
                                                    <span className="font-extrabold text-gray-900">{p.marca?.nombre || 'TECH'}</span>{' '}
                                                    <span className="font-medium text-gray-500">{p.descripcion || p.nombre || p.codigo}</span>
                                                </div>
                                                <div className="flex items-center justify-center mt-3 mb-2 gap-2 opacity-60">
                                                    <div className="w-8 h-px bg-gray-300"></div>
                                                    <Icon icon="solar:settings-linear" className="text-gray-400 text-[10px]" />
                                                    <div className="w-8 h-px bg-gray-300"></div>
                                                </div>
                                                <p className="text-[9px] text-gray-400 leading-relaxed line-clamp-3">
                                                    {p.descripcion || 'Dispositivo de alto rendimiento, optimizado para brindarte la mejor experiencia y durabilidad garantizada.'}
                                                </p>
                                                {showStock && <p className="text-[9px] font-semibold text-gray-500 mt-1">Stock: {Number(p.stock ?? 0)}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
                Catálogo generado automáticamente el {new Date().toLocaleDateString('es-PE')}
            </div>
        </div>
    );
}
