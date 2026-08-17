import { Icon } from '@iconify/react';
import { useState, useEffect } from 'react';

interface ProductCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any;
    modifiers: any[];
    onConfirm: (product: any, selectedModifiers: any[]) => void;
}

export default function ProductCustomizationModal({ isOpen, onClose, product, modifiers, onConfirm }: ProductCustomizationModalProps) {
    const [selecciones, setSelecciones] = useState<Record<number, number[]>>({});

    useEffect(() => {
        if (isOpen && modifiers.length > 0) {
            // Initialize defaults
            const defaults: Record<number, number[]> = {};
            modifiers.forEach((grupo: any) => {
                const defaultOpciones = grupo.opciones
                    .filter((op: any) => op.esDefault)
                    .map((op: any) => op.id);
                defaults[grupo.id] = defaultOpciones;
            });
            setSelecciones(defaults);
        }
    }, [isOpen, modifiers]);

    const toggleOpcion = (grupoId: number, opcionId: number, seleccionMax: number) => {
        setSelecciones((prev) => {
            const actuales = prev[grupoId] || [];

            if (actuales.includes(opcionId)) {
                // Deseleccionar
                return { ...prev, [grupoId]: actuales.filter((id) => id !== opcionId) };
            } else {
                // Seleccionar
                if (seleccionMax === 1) {
                    // Radio: solo una opción
                    return { ...prev, [grupoId]: [opcionId] };
                } else if (actuales.length < seleccionMax) {
                    // Checkbox: agregar si no excede máximo
                    return { ...prev, [grupoId]: [...actuales, opcionId] };
                }
                return prev;
            }
        });
    };

    const handleConfirm = () => {
        // Validar selecciones obligatorias
        for (const grupo of modifiers) {
            const seleccionadas = selecciones[grupo.id] || [];
            if (grupo.esObligatorio && seleccionadas.length < (grupo.seleccionMin || 1)) {
                alert(`Debes seleccionar al menos ${grupo.seleccionMin || 1} opción(es) en "${grupo.nombre}"`);
                return;
            }
        }

        // Construir lista de modificadores seleccionados
        const modificadoresSeleccionados: any[] = [];
        modifiers.forEach((grupo) => {
            const seleccionadas = selecciones[grupo.id] || [];
            grupo.opciones.forEach((opcion: any) => {
                if (seleccionadas.includes(opcion.id)) {
                    modificadoresSeleccionados.push({
                        grupoId: grupo.id,
                        grupoNombre: grupo.nombre,
                        opcionId: opcion.id,
                        opcionNombre: opcion.nombre,
                        precioExtra: opcion.precioExtra,
                    });
                }
            });
        });

        onConfirm(product, modificadoresSeleccionados);
    };

    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[1000000] flex items-end sm:items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
                <div className="p-4 border-b flex items-center gap-3">
                    {product.imagenUrl && (
                        <img src={product.imagenUrl} className="w-16 h-16 object-cover rounded-lg" />
                    )}
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{product.descripcion}</h3>
                        <p className="text-sm font-bold">S/ {Number(product.precioUnitario).toFixed(2)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><Icon icon="mdi:close" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {modifiers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No hay opciones disponibles</div>
                    ) : (
                        modifiers.map((grupo) => (
                            <div key={grupo.id} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-gray-900">{grupo.nombre}</h4>
                                    <span className="text-xs text-gray-500">{grupo.esObligatorio ? 'Obligatorio' : 'Opcional'} {grupo.seleccionMax > 1 && `(Max ${grupo.seleccionMax})`}</span>
                                </div>
                                <div className="space-y-2">
                                    {grupo.opciones.map((op: any) => {
                                        const isSelected = (selecciones[grupo.id] || []).includes(op.id);
                                        return (
                                            <div
                                                key={op.id}
                                                onClick={() => toggleOpcion(grupo.id, op.id, grupo.seleccionMax)}
                                                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'border-black bg-gray-50' : 'border-gray-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-black bg-black' : 'border-gray-300'}`}>
                                                        {isSelected && <Icon icon="mdi:check" className="text-white w-3 h-3" />}
                                                    </div>
                                                    <span className="text-sm">{op.nombre}</span>
                                                </div>
                                                {Number(op.precioExtra) > 0 && <span className="text-xs font-medium text-gray-500">+ S/ {op.precioExtra}</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50">
                    <button
                        onClick={handleConfirm}
                        className="w-full bg-black text-white py-3 font-bold uppercase rounded-lg hover:bg-gray-900 transition-colors"
                    >
                        Agregar al Carrito
                    </button>
                </div>
            </div>
        </div>
    );
}
