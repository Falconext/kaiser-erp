import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import apiClient from '@/utils/apiClient';

interface EmpresaVencimiento {
  id: number;
  ruc: string;
  razonSocial: string;
  fechaExpiracion: string;
  diasRestantes: number;
  plan: {
    nombre: string;
    costo: number;
    tipoFacturacion: string;
  };
}

interface AlertasVencimientoProps {
  diasAntes?: number;
  className?: string;
}

const AlertasVencimiento = ({ diasAntes = 7, className = '' }: AlertasVencimientoProps) => {
  const [empresas, setEmpresas] = useState<EmpresaVencimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const cargarEmpresasProximasVencer = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/empresa/proximas-vencer?dias=${diasAntes}`);
      setEmpresas(response.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar empresas próximas a vencer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEmpresasProximasVencer();
  }, [diasAntes]);

  const getColorSeveridad = (diasRestantes: number) => {
    if (diasRestantes <= 1) return 'text-red-600 bg-red-50 dark:text-rose-400 dark:bg-rose-900/20';
    if (diasRestantes <= 3) return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20';
    return 'text-yellow-600 bg-yellow-50 dark:text-amber-400 dark:bg-amber-900/20';
  };

  const getIconoSeveridad = (diasRestantes: number) => {
    if (diasRestantes <= 1) return 'mdi:alert-circle';
    if (diasRestantes <= 3) return 'mdi:alert';
    return 'mdi:clock-alert';
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-none p-4 ${className}`}>
        <div className="flex items-center space-x-2 animate-pulse">
          <div className="w-5 h-5 bg-gray-300 dark:bg-slate-700 rounded"></div>
          <div className="h-4 bg-gray-300 dark:bg-slate-700 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-rose-900/20 border border-red-200 dark:border-rose-900/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-red-700 dark:text-rose-400">
          <Icon icon="mdi:alert-circle" />
          <span className="text-sm">Error: {error}</span>
        </div>
      </div>
    );
  }

  if (empresas.length === 0) {
    return (
      <div className={`bg-green-50 dark:bg-emerald-900/20 border border-green-200 dark:border-emerald-900/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-green-700 dark:text-emerald-400">
          <Icon icon="mdi:check-circle" />
          <span className="text-sm font-medium">
            No hay empresas próximas a vencer en los próximos {diasAntes} días
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-none ${className}`}>
      <div
        className="p-4 border-b dark:border-slate-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon
              icon="mdi:alert-circle-outline"
              className="text-orange-500 w-5 h-5"
            />
            <h3 className="font-semibold text-gray-800 dark:text-white">
              Alertas de Vencimiento
            </h3>
            <span className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs px-2 py-1 rounded-full">
              {empresas.length}
            </span>
          </div>
          <Icon
            icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
            className="text-gray-400 dark:text-gray-500 w-5 h-5"
          />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Empresas que vencen en los próximos {diasAntes} días
        </p>
      </div>

      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {empresas.map((empresa) => (
            <div
              key={empresa.id}
              className="p-4 border-b dark:border-slate-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon
                      icon={getIconoSeveridad(empresa.diasRestantes)}
                      className={`w-4 h-4 ${getColorSeveridad(empresa.diasRestantes).split(' ')[0]}`}
                    />
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {empresa.razonSocial}
                    </h4>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>RUC: {empresa.ruc}</p>
                    <p>
                      Plan: {empresa.plan.nombre} - S/ {empresa.plan.costo}
                      <span className="text-gray-500 dark:text-gray-400 ml-1">
                        / {empresa.plan.tipoFacturacion.toLowerCase()}
                      </span>
                    </p>
                    <p>
                      Vence: {new Date(empresa.fechaExpiracion).toLocaleDateString('es-PE')}
                    </p>
                  </div>
                </div>
                
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getColorSeveridad(empresa.diasRestantes)}`}>
                  {empresa.diasRestantes === 0
                    ? 'Hoy'
                    : empresa.diasRestantes === 1
                    ? '1 día'
                    : `${empresa.diasRestantes} días`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isExpanded && empresas.length > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t dark:border-slate-700">
          <button
            onClick={cargarEmpresasProximasVencer}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center space-x-1"
          >
            <Icon icon="mdi:refresh" className="w-4 h-4" />
            <span>Actualizar</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default AlertasVencimiento;