import React from 'react';

interface Option {
  nombre: string;
  valores: string[];
}

interface Variant {
  id: number;
  precioUnitario: number | string;
  stock: number;
  valoresAtributos: Record<string, string>;
  imagenUrl?: string | null;
}

interface Props {
  opciones: Option[];
  variantes: Variant[];
  selecciones: Record<string, string>;
  onChange: (opcion: string, valor: string) => void;
}

export default function ProductVariantsShopify({ opciones, variantes, selecciones, onChange }: Props) {
  if (!opciones || opciones.length === 0) return null;

  const matchesSelection = (variant: Variant, selection: Record<string, string>) =>
    Object.entries(selection).every(([key, value]) => !value || variant.valoresAtributos?.[key] === value);

  const getValueImage = (optionName: string, value: string) =>
    variantes?.find((variant) => variant.valoresAtributos?.[optionName] === value && variant.imagenUrl)?.imagenUrl || null;

  return (
    <div className="mb-6 space-y-4">
      {opciones.map((op, idx) => (
        <div key={idx}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-900">{op.nombre}</span>
            <span className="text-xs text-gray-500">{selecciones[op.nombre] || 'Seleccionar'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {op.valores.map((val) => {
              const isSelected = selecciones[op.nombre] === val;
              const nextSelection = { ...selecciones, [op.nombre]: val };
              const available = !variantes?.length || variantes.some((variant) => matchesSelection(variant, nextSelection) && Number(variant.stock || 0) > 0);
              const image = getValueImage(op.nombre, val);
              const isColorOption = op.nombre.toLowerCase().includes('color');
              return (
                <button
                  key={val}
                  onClick={() => onChange(op.nombre, val)}
                  disabled={!available}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
                    isSelected
                      ? 'border-black bg-black text-white shadow-md'
                      : available
                        ? 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                        : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                  }`}
                >
                  {isColorOption && image && (
                    <img src={image} alt={val} className="h-7 w-7 rounded-lg object-cover bg-white" />
                  )}
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
