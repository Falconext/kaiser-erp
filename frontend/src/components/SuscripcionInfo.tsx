import { useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { useEmpresasStore } from '@/zustand/empresas';

interface SuscripcionInfoProps {
  showTitle?: boolean;
  className?: string;
}

const SuscripcionInfo: React.FC<SuscripcionInfoProps> = ({ 
  showTitle = true, 
  className = '' 
}) => {
  const { suscripcion, miEmpresa, loading, obtenerSuscripcion, obtenerMiEmpresa } = useEmpresasStore();

  useEffect(() => {
    // Cargar datos de suscripción y empresa
    obtenerSuscripcion();
    obtenerMiEmpresa();
  }, []);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm dark:shadow-none ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-full"></div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-2/3"></div>
            <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Calcular días restantes si tenemos la información de la empresa
  const calcularDiasRestantes = () => {
    if (!miEmpresa?.fechaExpiracion) return 0;
    const fechaExp = new Date(miEmpresa.fechaExpiracion);
    const hoy = new Date();
    const diffTime = fechaExp.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const diasRestantes = calcularDiasRestantes();
  
  // Determinar estado de la suscripción
  const getEstadoSuscripcion = () => {
    if (diasRestantes <= 0) return 'VENCIDA';
    if (diasRestantes <= 7) return 'PROXIMA_VENCER';
    return 'ACTIVA';
  };

  const estadoSuscripcion = getEstadoSuscripcion();

  // Configuración de colores y iconos según el estado
  const getStatusConfig = () => {
    switch (estadoSuscripcion) {
      case 'VENCIDA':
        return {
          bgColor: 'bg-red-50 dark:bg-rose-900/20',
          textColor: 'text-red-800 dark:text-rose-400',
          badgeColor: 'bg-red-100 text-red-800 dark:bg-rose-900/20 dark:text-rose-400',
          icon: 'mdi:alert-circle',
          iconColor: 'text-red-500'
        };
      case 'PROXIMA_VENCER':
        return {
          bgColor: 'bg-yellow-50 dark:bg-amber-900/20',
          textColor: 'text-yellow-800 dark:text-amber-400',
          badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-amber-900/20 dark:text-amber-400',
          icon: 'mdi:clock-alert',
          iconColor: 'text-yellow-500'
        };
      default:
        return {
          bgColor: 'bg-green-50 dark:bg-emerald-900/20',
          textColor: 'text-green-800 dark:text-emerald-400',
          badgeColor: 'bg-green-100 text-green-800 dark:bg-emerald-900/20 dark:text-emerald-400',
          icon: 'mdi:check-circle',
          iconColor: 'text-green-500'
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm dark:shadow-none border ${statusConfig.bgColor} ${className}`}>
      {showTitle && (
        <div className="flex items-center mb-4">
          <Icon icon="mdi:calendar-check" className="mr-2 text-xl text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Estado de Suscripción</h3>
        </div>
      )}

      {miEmpresa ? (
        <div className="space-y-4">
          {/* Información del Plan */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center mb-2">
                <Icon icon="mdi:crown" className="mr-2 text-amber-500" />
                <span className="font-semibold text-gray-800 dark:text-white">
                  Plan: {miEmpresa.plan.nombre}
                  {miEmpresa.plan.costo && (
                    <span className="ml-2 text-green-600 font-bold">S/ {miEmpresa.plan.costo}</span>
                  )}
                </span>
              </div>
              {miEmpresa.plan.descripcion && (
                <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                  {miEmpresa.plan.descripcion}
                </p>
              )}
              {miEmpresa.plan.limiteUsuarios && (
                <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                  Límite de usuarios: {miEmpresa.plan.limiteUsuarios}
                </p>
              )}
            </div>
            
            {/* Badge de estado */}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.badgeColor}`}>
              {estadoSuscripcion === 'VENCIDA' ? 'Vencida' : 
               estadoSuscripcion === 'PROXIMA_VENCER' ? 'Próxima a vencer' : 'Activa'}
            </span>
          </div>

          {/* Información de fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div>
              <div className="flex items-center mb-1">
                <Icon icon="mdi:calendar-start" className="mr-2 text-sm text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Activación:</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                {new Date(miEmpresa.fechaActivacion).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div>
              <div className="flex items-center mb-1">
                <Icon icon="mdi:calendar-end" className="mr-2 text-sm text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Expiración:</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                {new Date(miEmpresa.fechaExpiracion).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Días restantes */}
          <div className={`p-4 rounded-lg ${statusConfig.bgColor} border-l-4 ${
            estadoSuscripcion === 'VENCIDA' ? 'border-red-500' :
            estadoSuscripcion === 'PROXIMA_VENCER' ? 'border-yellow-500' : 'border-green-500'
          }`}>
            <div className="flex items-center">
              <Icon icon={statusConfig.icon} className={`mr-2 ${statusConfig.iconColor}`} />
              <div>
                {estadoSuscripcion === 'VENCIDA' ? (
                  <p className={`font-semibold ${statusConfig.textColor}`}>
                    Su suscripción ha vencido
                  </p>
                ) : (
                  <p className={`font-semibold ${statusConfig.textColor}`}>
                    {diasRestantes === 1 ? '1 día restante' : `${diasRestantes} días restantes`}
                  </p>
                )}
                
                {estadoSuscripcion === 'VENCIDA' && (
                  <p className="text-sm text-red-600 mt-1">
                    Contacte al administrador para renovar su suscripción
                  </p>
                )}
                
                {estadoSuscripcion === 'PROXIMA_VENCER' && (
                  <p className="text-sm text-yellow-700 mt-1">
                    Su suscripción está próxima a vencer. Considere renovarla pronto.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Botones de acción si es necesario */}
          {(estadoSuscripcion === 'VENCIDA' || estadoSuscripcion === 'PROXIMA_VENCER') && (
            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <button
                className="w-full btn-accent font-medium py-2 px-4 rounded-lg transition-colors"
                onClick={() => {
                  // Aquí se podría integrar con el sistema de renovación
                  alert('Funcionalidad de renovación en desarrollo');
                }}
              >
                Renovar Suscripción
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <Icon icon="mdi:information-outline" className="mx-auto text-4xl text-gray-400 dark:text-gray-500 mb-2" />
          <p className="text-gray-600 dark:text-gray-400">No se pudo cargar la información de suscripción</p>
        </div>
      )}
    </div>
  );
};

export default SuscripcionInfo;