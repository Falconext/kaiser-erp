import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/utils/apiClient';
import { useAuthStore } from '@/zustand/auth';
import { Icon } from '@iconify/react';

export default function TiendaHome() {
  const navigate = useNavigate();
  const { auth } = useAuthStore();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ACCESS_TOKEN');
    if (!token || !auth) {
      navigate('/tienda/login', { replace: true });
      return;
    }
    cargarConfig();
  }, [auth]);

  const cargarConfig = async () => {
    try {
      const { data } = await apiClient.get('/tienda/config');
      setConfig(data.data);
    } catch (error) {
      console.error('Error cargando configuración de tienda', error);
    } finally {
      setLoading(false);
    }
  };

  const irATiendaPublica = () => {
    if (config?.slugTienda) {
      navigate(`/tienda/${config.slugTienda}`);
    }
  };

  const irAConfig = () => {
    navigate('/administrador/tienda/configuracion');
  };

  const irAPedidos = () => {
    navigate('/administrador/tienda/pedidos');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Icon icon="eos-icons:loading" className="w-12 h-12 text-gray-400" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white p-8 rounded-lg shadow max-w-md text-center">
          <Icon icon="mdi:store-off" className="w-14 h-14 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold mb-2">No se pudo cargar tu tienda</h2>
          <p className="text-gray-600 mb-4">
            Intenta ir a la configuración de tienda desde el panel administrativo.
          </p>
          <button
            onClick={irAConfig}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            Ir a configuración
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">Panel de Tu Tienda Virtual</h1>
          <p className="text-gray-600 mb-4">
            Aquí puedes acceder rápidamente a tu tienda pública y a las herramientas de gestión.
          </p>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <Icon icon="mdi:storefront" className="w-6 h-6 text-emerald-500" />
              <div>
                <p className="font-medium">Nombre comercial</p>
                <p className="text-gray-700">{auth?.empresa?.nombreComercial || auth?.empresa?.razonSocial}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Icon icon="mdi:link-variant" className="w-6 h-6 text-indigo-500" />
              <div>
                <p className="font-medium">URL de tu tienda</p>
                {config.slugTienda ? (
                  <p className="text-sm text-gray-700 break-all">
                    {window.location.origin}/tienda/{config.slugTienda}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Configura un slug para activar tu tienda pública.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={irATiendaPublica}
              disabled={!config.slugTienda}
              className="px-4 py-2 rounded-md text-white bg-black hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Icon icon="mdi:open-in-new" />
              Ver tienda pública
            </button>
            <button
              onClick={irAPedidos}
              className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
            >
              <Icon icon="mdi:cart" />
              Ver pedidos
            </button>
            <button
              onClick={irAConfig}
              className="px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 flex items-center gap-2"
            >
              <Icon icon="mdi:cog" />
              Configuración de tienda
            </button>
          </div>
        </div>

        <div className="w-full md:w-64 bg-gray-50 rounded-xl p-4 border border-dashed border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Resumen rápido</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Plan con tienda virtual activa
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Catálogo público con productos publicados
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Pagos con Yape / Plin / Efectivo
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
