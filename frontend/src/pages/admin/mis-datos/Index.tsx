/**
 * "Mis datos" — la pantalla desde la que Kaiser se lleva toda su información.
 *
 * No es una pantalla técnica y no debe parecerlo. Nace de una objeción concreta de
 * la gerencia y de contabilidad: *"si dejamos de contratar el servicio, como todo
 * está en la nube no podríamos acceder a nuestra información"*. Quien la plantea no
 * es informático, así que aquí no se habla de respaldos, ni de bases de datos, ni
 * de formatos: se habla de que sus datos son suyos y se los puede llevar ahora.
 *
 * Por eso el texto está en primera persona del cliente, el botón dice lo que hace
 * y lo que se descarga es un Excel que se abre sin instalar nada.
 */
import { useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';

/** Lo que el archivo contiene, en el lenguaje de quien lo va a abrir. */
const CONTENIDO = [
  { icono: 'solar:users-group-rounded-bold-duotone', titulo: 'Clientes y proveedores', detalle: 'Con su RUC, dirección, contacto y sector' },
  { icono: 'solar:box-bold-duotone', titulo: 'Catálogo de productos', detalle: 'Códigos, descripciones, precios y costos' },
  { icono: 'solar:garage-bold-duotone', titulo: 'Inventario valorizado', detalle: 'Cuánto hay de cada producto en cada almacén, y cuánto vale' },
  { icono: 'solar:clipboard-list-bold-duotone', titulo: 'Kardex completo', detalle: 'Cada ingreso y salida, con su fecha, su documento y quién lo registró' },
  { icono: 'solar:bill-list-bold-duotone', titulo: 'Ventas y cobros', detalle: 'Comprobantes con su detalle, saldos por cobrar y pagos recibidos' },
  { icono: 'solar:cart-large-2-bold-duotone', titulo: 'Compras', detalle: 'Facturas de proveedor con su detalle y saldos por pagar' },
  { icono: 'solar:settings-minimalistic-bold-duotone', titulo: 'Producción', detalle: 'Órdenes de fabricación con sus costos, y las recetas' },
  { icono: 'solar:shield-user-bold-duotone', titulo: 'Sedes y usuarios', detalle: 'Sin contraseñas: esas no salen nunca del sistema' },
];

export default function MisDatosIndex() {
  const [descargando, setDescargando] = useState(false);
  const [ultima, setUltima] = useState<{ registros: number; hora: string } | null>(null);
  const { alert } = useAlertStore();
  const { auth } = useAuthStore();
  const empresa = auth?.empresa;

  const descargar = async () => {
    setDescargando(true);
    try {
      const resp = await apiClient.get('/empresa/exportar-todo', {
        responseType: 'blob',
        // Una empresa con años de historia tarda: mejor esperar que cortar.
        timeout: 300_000,
      });

      // El nombre viene del servidor para que lleve la razón social y la fecha.
      const cabecera = String(resp.headers?.['content-disposition'] ?? '');
      const nombre = cabecera.match(/filename="?([^"]+)"?/)?.[1]
        ?? `Mis-datos-${new Date().toISOString().slice(0, 10)}.xlsx`;

      const url = window.URL.createObjectURL(new Blob([resp.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.download = nombre;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      const registros = Number(resp.headers?.['x-registros-exportados'] ?? 0);
      setUltima({
        registros,
        hora: new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }),
      });
      alert(
        registros
          ? `Se descargaron ${registros.toLocaleString('es-PE')} registros`
          : 'Descarga completa',
        'success',
      );
    } catch {
      alert('No se pudo generar la descarga. Inténtelo de nuevo.', 'error');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Mis datos</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Toda la información de {empresa?.nombreComercial ?? 'su empresa'} en un archivo de Excel.
        </p>
      </div>

      {/* El mensaje principal: la respuesta a la objeción, dicha sin tecnicismos. */}
      <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-900/10 p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Icon icon="solar:shield-check-bold-duotone" className="text-2xl text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-emerald-900 dark:text-emerald-200">
              Su información es suya, y se la puede llevar cuando quiera
            </h2>
            <p className="text-sm text-emerald-800/80 dark:text-emerald-200/70 mt-1.5 leading-relaxed">
              Descargue un archivo de Excel con todo lo que el sistema tiene registrado
              de su empresa. Se abre en Excel sin instalar nada, puede guardarlo donde
              quiera y sirve para cargarlo en otro sistema. No hace falta pedir permiso
              ni avisar a nadie.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Qué se lleva */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 sm:p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Qué contiene el archivo</h3>
          <ul className="space-y-3.5">
            {CONTENIDO.map((c) => (
              <li key={c.titulo} className="flex items-start gap-3">
                <Icon icon={c.icono} className="text-xl text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.titulo}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.detalle}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* La acción */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
            <button
              onClick={descargar}
              disabled={descargando}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              <Icon
                icon={descargando ? 'svg-spinners:180-ring-with-bg' : 'solar:download-minimalistic-bold-duotone'}
                className="text-xl"
              />
              {descargando ? 'Preparando el archivo…' : 'Descargar toda mi información'}
            </button>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
              {descargando
                ? 'Esto puede tardar un momento si hay muchos años de información. No cierre la página.'
                : 'El archivo se arma en el momento, con la información de hoy.'}
            </p>

            {ultima && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">Última descarga</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">
                  {ultima.registros.toLocaleString('es-PE')} registros
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{ultima.hora}</p>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 px-1 leading-relaxed">
            Las contraseñas de los usuarios no se incluyen en la descarga.
          </p>
        </div>
      </div>
    </div>
  );
}
