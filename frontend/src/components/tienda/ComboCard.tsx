import { Icon } from '@iconify/react';

interface ComboCardProps {
    combo: any;
    onAddToCart: (combo: any) => void;
    diseno: any;
}

export default function ComboCard({ combo, onAddToCart, diseno }: ComboCardProps) {
    const descuento = Math.round(Number(combo.descuentoPorcentaje || 0));
    const ahorro = Number(combo.precioRegular) - Number(combo.precioCombo);

    const getBordeRadius = () => {
        switch (diseno.bordeRadius) {
            case 'none': return 'rounded-none';
            case 'small': return 'rounded';
            case 'large': return 'rounded-2xl';
            case 'full': return 'rounded-3xl';
            default: return 'rounded-xl';
        }
    };

    const getBotonStyle = () => {
        switch (diseno.estiloBoton) {
            case 'square': return 'rounded-none';
            case 'pill': return 'rounded-full';
            default: return 'rounded-lg';
        }
    };

    const borderRadius = getBordeRadius();
    const btnRadius = getBotonStyle();

    return (
        <div className={`bg-white ${borderRadius} shadow-md overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300 group`}>
            {/* Imagen y Badge de Descuento */}
            <div className="relative overflow-hidden">
                {combo.imagenUrl ? (
                    <img
                        src={combo.imagenUrl}
                        alt={combo.nombre}
                        className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                        <Icon icon="mdi:food" className="w-20 h-20 text-white/30" />
                    </div>
                )}

                {/* Badge de Descuento */}
                <div className="absolute top-3 right-3 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-1 animate-pulse">
                    <Icon icon="mdi:tag" />
                    -{descuento}%
                </div>

                {/* Badge "COMBO" */}
                <div className="absolute top-3 left-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                    Combo
                </div>
            </div>

            <div className="p-5">
                {/* Título */}
                <h3 className="font-bold text-xl mb-2 text-gray-900 line-clamp-1">{combo.nombre}</h3>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">{combo.descripcion || 'Combo especial con productos seleccionados'}</p>

                {/* Productos Incluidos */}
                <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                        <Icon icon="mdi:package-variant" className="text-orange-500" />
                        Incluye:
                    </p>
                    <ul className="space-y-1.5">
                        {combo.items?.slice(0, 3).map((item: any) => (
                            <li key={item.id} className="flex items-center gap-2 text-xs text-gray-700">
                                <Icon icon="mdi:check-circle" className="text-green-500 flex-shrink-0" width={16} />
                                <span className="font-medium">{item.cantidad}x</span>
                                <span className="truncate">{item.producto.descripcion}</span>
                            </li>
                        ))}
                        {combo.items?.length > 3 && (
                            <li className="text-xs text-gray-500 italic">
                                +{combo.items.length - 3} producto{combo.items.length - 3 > 1 ? 's' : ''} más
                            </li>
                        )}
                    </ul>
                </div>

                {/* Precios */}
                <div className="mb-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="text-xs text-gray-500 line-through">
                                Precio normal: S/ {Number(combo.precioRegular).toFixed(2)}
                            </p>
                            <p className="text-3xl font-bold" style={{ color: diseno.colorPrimario || '#f97316' }}>
                                S/ {Number(combo.precioCombo).toFixed(2)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-600 font-semibold">Ahorras</p>
                            <p className="text-lg font-bold text-green-600">
                                S/ {ahorro.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Botón Agregar */}
                <button
                    onClick={() => onAddToCart(combo)}
                    className={`w-full text-white py-3 ${btnRadius} font-semibold hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg`}
                    style={{ backgroundColor: diseno.colorPrimario || '#f97316' }}
                >
                    <Icon icon="mdi:cart-plus" width={20} />
                    Agregar al carrito
                </button>
            </div>
        </div>
    );
}
