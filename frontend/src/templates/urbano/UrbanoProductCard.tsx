import { getFashionColors, getFashionSizes } from './fashionVariants';
import { getProductPricing } from '../shared/pricing';

interface UrbanoProductCardProps {
    producto: any;
    slug: string;
    onClick: () => void;
    onAddToCart: () => void;
}

export default function UrbanoProductCard({ producto, onClick }: UrbanoProductCardProps) {
    const { enOferta, precioRegular, precioFinal, porcentajeDescuento } = getProductPricing(producto);
    const colors = getFashionColors(producto);
    const sizes = getFashionSizes(producto);
    const image = producto.imagenUrl || producto.imagenesExtra?.[0] || '/assets/templates/urbano/coleccion1.png';

    return (
        <div className="flex flex-col h-full group cursor-pointer" onClick={onClick} style={{ fontFamily: '"Inter", sans-serif' }}>
            {/* Image Container — object-contain centrado para que todas las fotos
                se vean al mismo tamaño/posición sin recortes ni "saltos". */}
            <div className="w-full aspect-[4/5] bg-[#F4F5F6] overflow-hidden mb-4 relative flex items-center justify-center p-4">
                {enOferta && (
                    <span className="absolute top-3 left-3 z-10 bg-black text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1">
                        -{porcentajeDescuento}%
                    </span>
                )}
                <img
                    src={image}
                    alt={producto.descripcion}
                    className="max-h-full max-w-full object-contain mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-105"
                />
            </div>

            {/* Product Info — altura uniforme para que precio y tallas/colores queden a la par */}
            <div className="flex flex-1 flex-col items-start w-full px-1">
                <h3 className="text-xs sm:text-[13px] font-bold text-gray-900 line-clamp-2 min-h-[2.6em] mb-1 w-full">
                    {producto.descripcion}
                </h3>

                <div className="flex items-baseline gap-2 mb-3">
                    <p className={`text-[11px] font-bold ${enOferta ? 'text-gray-900' : 'text-gray-500'}`}>
                        S/. {precioFinal.toFixed(2)}
                    </p>
                    {enOferta && (
                        <span className="text-[10px] font-medium text-gray-400 line-through">
                            S/. {precioRegular.toFixed(2)}
                        </span>
                    )}
                </div>

                {(colors.length > 0 || sizes.length > 0) && (
                    <div className="mt-auto flex w-full items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                            {colors.slice(0, 5).map((color) => (
                                <div
                                    key={color.name}
                                    className="h-3.5 w-3.5 border border-gray-200"
                                    style={{ backgroundColor: color.hex }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                        {sizes.length > 0 && (
                            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                {sizes.slice(0, 4).join(' / ')}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
