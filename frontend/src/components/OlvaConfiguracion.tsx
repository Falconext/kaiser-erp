import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import useAlertStore from '@/zustand/alert';
import { OlvaAgenciaSelect } from '@/components/OlvaAgenciaSelect';
import { mensajeErrorOlva, olvaService, type OlvaConfig } from '@/services/olva.service';

const lbl = 'block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';

/**
 * Configuración del courier Olva del negocio.
 *
 * A diferencia de Shalom Pro no hay cuenta que conectar: el proveedor autentica
 * con la API key global de la plataforma. Aquí el negocio solo elige desde qué
 * agencia despacha (necesario para generar guías) y activa el rastreo
 * automático. Se oculta si el plan no incluye el módulo.
 */
export default function OlvaConfiguracion({ className, sinTitulo, onDisponible }: { className?: string; sinTitulo?: boolean; onDisponible?: (listo: boolean) => void }) {
    const { alert } = useAlertStore();
    const [config, setConfig] = useState<OlvaConfig | null>(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({ agenciaOrigenCodigo: '', agenciaOrigenNombre: '' });

    const aplicar = useCallback((data: OlvaConfig) => {
        setConfig(data);
        setForm({
            agenciaOrigenCodigo: data.agenciaOrigenCodigo ?? '',
            agenciaOrigenNombre: data.agenciaOrigenNombre ?? '',
        });
    }, []);

    useEffect(() => {
        let vivo = true;
        olvaService.getConfig()
            .then((data) => { if (vivo) aplicar(data); })
            .catch(() => { if (vivo) setConfig(null); })
            .finally(() => { if (vivo) setCargando(false); });
        return () => { vivo = false; };
    }, [aplicar]);

    const ejecutar = async (accion: () => Promise<OlvaConfig>, exito: string) => {
        setGuardando(true);
        try {
            aplicar(await accion());
            alert(exito, 'success');
        } catch (error: unknown) {
            alert(mensajeErrorOlva(error, 'No se pudo guardar la configuración de Olva'), 'error');
        } finally {
            setGuardando(false);
        }
    };

    const guardarAgencia = () =>
        ejecutar(
            () => olvaService.actualizarConfig({
                agenciaOrigenCodigo: form.agenciaOrigenCodigo,
                agenciaOrigenNombre: form.agenciaOrigenNombre,
            }),
            'Agencia Olva de origen guardada',
        );

    const alternarAutoTracking = () =>
        ejecutar(
            () => olvaService.actualizarConfig({ autoTrackingActivo: !config?.autoTrackingActivo }),
            config?.autoTrackingActivo
                ? 'Rastreo automático de Olva desactivado'
                : 'Rastreo automático de Olva activado',
        );

    const disponible = !cargando && Boolean(config?.habilitado);
    // Avisa a quien lo monta si hay algo que mostrar: así el panel no abre una
    // tarjeta hacia un modal vacío cuando el plan no incluye Olva.
    useEffect(() => { onDisponible?.(disponible); }, [disponible, onDisponible]);

    if (!config?.habilitado || cargando) return null;

    return (
        <div className={`lg:col-span-2 lg:order-3 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm dark:border-amber-900/30 dark:bg-[#111827] ${className ?? ''}`}>
            <div className="border-b border-amber-100/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 dark:border-amber-900/30 dark:from-amber-950/30 dark:via-[#111827] dark:to-orange-950/20">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/20">
                        <Icon icon="solar:delivery-bold-duotone" width={24} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            {!sinTitulo && <h2 className="text-lg font-black text-gray-950 dark:text-white">Envíos Olva Courier</h2>}
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                <Icon icon="solar:check-circle-bold" width={13} /> Rastreo activo
                            </span>
                            {config.habilitadoPorPlan && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                                    Guías habilitadas
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                            El rastreo de tus envíos Olva funciona <strong>automáticamente</strong> — solo registra el <strong>N° de guía</strong> en cada despacho.
                            {config.habilitadoPorPlan
                                ? ' Además puedes generar la guía desde el panel: elige tu agencia de origen aquí.'
                                : ' Generar guías desde el panel necesita la API key de Olva configurada en el servidor.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 p-5">
                {!config.apiConfigurada && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                        <Icon icon="solar:danger-triangle-bold" width={16} className="mt-0.5 shrink-0" />
                        <span>La API de Olva aún no está configurada en el servidor. Contacta al administrador.</span>
                    </div>
                )}

                {config.habilitadoPorPlan && (
                    <div>
                        <label className={lbl}>Agencia de origen (desde dónde despachas)</label>
                        <OlvaAgenciaSelect
                            value={form.agenciaOrigenNombre}
                            onChange={(v) => setForm((prev) => ({ ...prev, agenciaOrigenNombre: v, agenciaOrigenCodigo: '' }))}
                            onSelectAgencia={(a) => setForm({
                                agenciaOrigenCodigo: a.codigo,
                                agenciaOrigenNombre: [a.nombre, a.provincia, a.departamento].filter(Boolean).join(' - '),
                            })}
                            placeholder="Buscar tu agencia Olva de origen..."
                        />
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    {config.habilitadoPorPlan && (
                        <button type="button" onClick={guardarAgencia} disabled={guardando || !form.agenciaOrigenCodigo}
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-black text-white shadow-lg shadow-amber-500/20 transition-opacity hover:opacity-90 disabled:opacity-50">
                            <Icon icon={guardando ? 'eos-icons:loading' : 'solar:diskette-bold'} width={18} />
                            Guardar agencia de origen
                        </button>
                    )}
                    <button type="button" onClick={alternarAutoTracking} disabled={guardando}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                        <Icon icon={config.autoTrackingActivo ? 'solar:pause-circle-bold' : 'solar:play-circle-bold'} width={18} />
                        {config.autoTrackingActivo ? 'Desactivar rastreo automático' : 'Activar rastreo automático'}
                    </button>
                </div>

                <div className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500 dark:bg-slate-800/40 dark:text-gray-400">
                    <Icon icon="solar:info-circle-bold" width={16} className="mt-0.5 shrink-0 text-amber-400" />
                    <span>
                        Con el rastreo automático activo, el estado de cada pedido avanza solo en tu panel
                        (En camino → En agencia → Entregado) y se avisa al cliente por WhatsApp.
                    </span>
                </div>
            </div>
        </div>
    );
}
