import { useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';

interface Plan {
  id: number;
  nombre: string;
  descripcion?: string;
  limiteUsuarios?: number;
  costo?: number;
  tieneTienda?: boolean;
  tieneTicketera?: boolean;
}

interface PlanesSelectorProps {
  planes: Plan[];
  selectedPlanId?: number;
  onPlanSelect: (planId: number) => void;
  error?: string | null | undefined;
}

const PlanesSelector: React.FC<PlanesSelectorProps> = ({
  planes,
  selectedPlanId,
  onPlanSelect,
  error
}) => {
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);
  const normalizedError = typeof error === 'string' ? error : '';

  const getPlanColor = (planNombre: string) => {
    switch (planNombre.toUpperCase()) {
      case 'BASICO':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-900/30',
          text: 'text-blue-800 dark:text-blue-400',
          accent: 'text-blue-600'
        };
      case 'PRO':
        return {
          bg: 'bg-purple-50 dark:bg-violet-900/20',
          border: 'border-purple-200 dark:border-violet-900/30',
          text: 'text-purple-800 dark:text-violet-400',
          accent: 'text-purple-600'
        };
      case 'PREMIUM':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-900/30',
          text: 'text-amber-800 dark:text-amber-400',
          accent: 'text-amber-600'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-slate-900',
          border: 'border-gray-200 dark:border-slate-700',
          text: 'text-gray-800 dark:text-white',
          accent: 'text-gray-600'
        };
    }
  };

  const getPlanIcon = (planNombre: string) => {
    switch (planNombre.toUpperCase()) {
      case 'BASICO':
        return 'mdi:account-outline';
      case 'PRO':
        return 'mdi:account-star';
      case 'PREMIUM':
        return 'mdi:crown';
      default:
        return 'mdi:package-variant';
    }
  };

  if (!planes || planes.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        <Icon icon="mdi:information-outline" className="mx-auto text-4xl mb-2" />
        <p>No hay planes disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-slate-200">
        Seleccionar Plan de Suscripción *
      </label>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {planes.map((plan) => {
          const colors = getPlanColor(plan.nombre);
          const icon = getPlanIcon(plan.nombre);
          const isSelected = selectedPlanId === plan.id;
          const isHovered = hoveredPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`
                relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200
                ${isSelected
                  ? `${colors.border} ${colors.bg} ring-2 ring-blue-500 ring-opacity-50`
                  : `border-gray-200 bg-white hover:${colors.bg} hover:${colors.border}`
                }
                ${isHovered ? 'transform scale-105 shadow-lg dark:shadow-none' : 'shadow-sm dark:shadow-none'}
              `}
              onClick={() => onPlanSelect(plan.id)}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
            >
              {/* Badge seleccionado */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                  <Icon icon="mdi:check" className="w-4 h-4" />
                </div>
              )}

              {/* Header del plan */}
              <div className="text-center mb-3">
                <Icon
                  icon={icon}
                  className={`mx-auto text-3xl mb-2 ${colors.accent}`}
                />
                <h3 className={`font-bold text-lg ${colors.text}`}>
                  {plan.nombre}
                </h3>
              </div>

              {/* Precio */}
              <div className="text-center mb-3">
                <div className={`text-2xl font-bold ${colors.accent}`}>
                  S/ {plan.costo || 0}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">por mes</div>
              </div>

              {/* Características */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Icon icon="mdi:account-group" className="mr-2 text-gray-400 dark:text-gray-500" />
                  <span>
                    {plan.limiteUsuarios ? `${plan.limiteUsuarios} usuarios` : 'Usuarios ilimitados'}
                  </span>
                </div>

                {plan.descripcion && (
                  <div className="flex items-start text-gray-600 dark:text-gray-400">
                    <Icon icon="mdi:information-outline" className="mr-2 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs leading-relaxed">{plan.descripcion}</span>
                  </div>
                )}
              </div>

              {/* Botón de selección */}
              <div className="mt-4">
                <button
                  type="button"
                  className={`w-full py-2 px-4 rounded-md text-sm font-medium transition-colors
                    ${isSelected
                      ? 'bg-green-500 text-white'
                      : `${colors.accent} border border-current hover:bg-opacity-10`
                    }
                  `}
                >
                  {isSelected ? 'Seleccionado' : 'Seleccionar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {normalizedError && (
        <p className="text-sm text-red-600 mt-2">{normalizedError}</p>
      )}
    </div>
  );
};

export default PlanesSelector;
