
import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';

interface ProductModifiersSelectorProps {
    modifiers: any[];
    selections: Record<number, number[]>;
    onChange: (selections: Record<number, number[]>) => void;
}

export default function ProductModifiersSelector({ modifiers, selections, onChange }: ProductModifiersSelectorProps) {
    // If no modifiers, render nothing
    if (!modifiers || modifiers.length === 0) return null;

    const toggleOpcion = (grupoId: number, opcionId: number, seleccionMax: number) => {
        const actuales = selections[grupoId] || [];
        let nuevasSelecciones: number[] = [];

        if (actuales.includes(opcionId)) {
            // Deselect logic (if allowed? usually radios mandate one selection if min 1)
            // But let's allow deselecting for now, validation happens on add to cart.
            nuevasSelecciones = actuales.filter((id) => id !== opcionId);
        } else {
            if (seleccionMax === 1) {
                // Radio behavior
                nuevasSelecciones = [opcionId];
            } else if (actuales.length < seleccionMax) {
                // Checkbox behavior
                nuevasSelecciones = [...actuales, opcionId];
            } else {
                return; // Max reached
            }
        }

        onChange({
            ...selections,
            [grupoId]: nuevasSelecciones
        });
    };

    return (
        <div className="space-y-6 mb-8">
            {modifiers.map((grupo) => (
                <div key={grupo.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-900 text-sm">{grupo.nombre}</h4>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            {grupo.esObligatorio ? 'Requerido' : 'Opcional'}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {grupo.opciones.map((op: any) => {
                            const isSelected = (selections[grupo.id] || []).includes(op.id);
                            return (
                                <div
                                    key={op.id}
                                    onClick={() => toggleOpcion(grupo.id, op.id, grupo.seleccionMax)}
                                    className={`relative flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 ${isSelected
                                            ? 'border-[#1E1B4B] bg-[#1E1B4B]/5'
                                            : 'border-gray-100 hover:border-gray-200'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 transition-colors ${isSelected
                                            ? 'border-[#1E1B4B] bg-[#1E1B4B]'
                                            : 'border-gray-300'
                                        }`}>
                                        {isSelected && <Icon icon="mdi:check" className="text-white w-3 h-3" />}
                                    </div>

                                    <div className="flex-1">
                                        <span className={`block text-sm font-bold ${isSelected ? 'text-[#1E1B4B]' : 'text-gray-700'}`}>
                                            {op.nombre}
                                        </span>
                                    </div>

                                    {Number(op.precioExtra) > 0 && (
                                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isSelected
                                                ? 'bg-[#1E1B4B] text-white'
                                                : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            + S/ {Number(op.precioExtra).toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
