import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import useAlertStore from '@/zustand/alert';
import { ShalomAgenciaSelect } from '@/components/ShalomAgenciaSelect';
import { mensajeErrorShalom, shalomService, type ShalomInstancia } from '@/services/shalom.service';

const inp =
    'w-full h-10 px-3 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 transition-all placeholder:text-slate-400';
const lbl = 'block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5';

/**
 * Conexión de la cuenta Shalom Pro del negocio.
 *
 * El rastreo funciona sin cuenta; esto habilita **crear guías** desde el panel.
 * Se oculta solo si el plan no lo incluye (`habilitadoPorPlan`).
 */
export default function ShalomProConexion({ nombreSugerido, className, sinTitulo, onDisponible }: { nombreSugerido?: string; className?: string; sinTitulo?: boolean; onDisponible?: (listo: boolean) => void }) {
    const { alert } = useAlertStore();
    const [instancia, setInstancia] = useState<ShalomInstancia | null>(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [verPassword, setVerPassword] = useState(false);
    const [form, setForm] = useState({
        nombre: '',
        username: '',
        password: '',
        securityCode: '',
        agenciaOrigenId: '',
        agenciaOrigenNombre: '',
        clavesRetiro: '',
        tamanoDefault: 'XS',
    });

    const aplicar = useCallback((data: ShalomInstancia) => {
        setInstancia(data);
        setForm((prev) => ({
            ...prev,
            nombre: data.nombre ?? prev.nombre,
            username: data.email ?? prev.username,
            password: '',
            agenciaOrigenId: data.agenciaOrigenId ?? '',
            agenciaOrigenNombre: data.agenciaOrigenNombre ?? '',
            // Se guarda "1010,1011"; se muestra con espacio para que se lea como lista.
            clavesRetiro: String(data.clavesRetiro ?? '').split(',').filter(Boolean).join(', '),
            tamanoDefault: data.tamanoDefault || 'XS',
        }));
    }, []);

    useEffect(() => {
        let vivo = true;
        shalomService
            .getInstancia()
            .then((data) => { if (vivo) aplicar(data); })
            .catch(() => { if (vivo) setInstancia(null); })
            .finally(() => { if (vivo) setCargando(false); });
        return () => { vivo = false; };
    }, [aplicar]);

    useEffect(() => {
        if (nombreSugerido) setForm((prev) => (prev.nombre ? prev : { ...prev, nombre: nombreSugerido }));
    }, [nombreSugerido]);

    const set = (campo: keyof typeof form, valor: string) =>
        setForm((prev) => ({ ...prev, [campo]: valor }));

    const ejecutar = async (accion: () => Promise<ShalomInstancia>, exito: string) => {
        if (guardando) return;
        setGuardando(true);
        try {
            aplicar(await accion());
            alert(exito, 'success');
        } catch (error: unknown) {
            alert(mensajeErrorShalom(error, 'No se pudo completar la operación'), 'error');
        } finally {
            setGuardando(false);
        }
    };

    const conectar = () => {
        if (!form.username.trim()) return alert('Ingresa el correo de tu cuenta Shalom Pro', 'error');
        if (!form.password.trim() && !instancia?.credencialesGuardadas)
            return alert('Ingresa la contraseña de tu cuenta Shalom Pro', 'error');
        return ejecutar(
            () => shalomService.conectar({
                nombre: form.nombre.trim() || undefined,
                username: form.username.trim(),
                password: form.password.trim() || undefined,
                securityCode: form.securityCode.trim() || undefined,
                agenciaOrigenId: form.agenciaOrigenId || undefined,
                agenciaOrigenNombre: form.agenciaOrigenNombre || undefined,
            }),
            'Cuenta Shalom Pro conectada',
        );
    };

    const guardarConfig = () =>
        ejecutar(
            () => shalomService.actualizarConfig({
                agenciaOrigenId: form.agenciaOrigenId,
                agenciaOrigenNombre: form.agenciaOrigenNombre,
                clavesRetiro: form.clavesRetiro.trim(),
                tamanoDefault: form.tamanoDefault,
                ...(form.securityCode.trim() ? { securityCode: form.securityCode.trim() } : {}),
            }),
            'Configuración de envíos actualizada',
        );

    const disponible = !cargando && Boolean(instancia?.habilitadoPorPlan);
    // Igual que Olva: si el plan no lo incluye, el panel no debe ofrecer la
    // tarjeta.
    useEffect(() => { onDisponible?.(disponible); }, [disponible, onDisponible]);

    if (!instancia?.habilitadoPorPlan || cargando) return null;

    const conectada = instancia.conectada && instancia.estado !== 'ERROR';

    return (
        <div className={`lg:col-span-2 lg:order-3 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm dark:border-red-900/30 dark:bg-[#111827] ${className ?? ''}`}>
            <div className="border-b border-red-100/70 bg-gradient-to-br from-red-50 via-white to-orange-50 p-5 dark:border-red-900/30 dark:from-red-950/30 dark:via-[#111827] dark:to-orange-950/20">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500 text-white shadow-lg shadow-red-500/20">
                        <Icon icon="solar:box-bold-duotone" width={24} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            {!sinTitulo && <h2 className="text-lg font-black text-gray-950 dark:text-white">Crear guías en Shalom Pro</h2>}
                            {conectada && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                    <Icon icon="solar:check-circle-bold" width={13} /> Conectada
                                </span>
                            )}
                            {instancia.estado === 'ERROR' && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                    <Icon icon="solar:danger-triangle-bold" width={13} /> Con error
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                            Conecta tu cuenta de <strong>Shalom Pro</strong> y genera las guías de tus pedidos desde el panel:
                            el N° de orden y la clave se guardan solos en el despacho, listos para el rastreo.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4 p-5">
                {instancia.estado === 'ERROR' && instancia.error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                        <Icon icon="solar:danger-triangle-bold" width={16} className="mt-0.5 shrink-0" />
                        <span>{instancia.error}</span>
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className={lbl}>Nombre de la conexión</label>
                        <input type="text" value={form.nombre} onChange={(e) => set('nombre', e.target.value)}
                            placeholder="Ej: Tienda principal" className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Correo de Shalom Pro</label>
                        <input type="email" autoComplete="off" value={form.username}
                            onChange={(e) => set('username', e.target.value)}
                            placeholder="correo@tunegocio.com" className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Contraseña de Shalom Pro</label>
                        <div className="relative">
                            <input type={verPassword ? 'text' : 'password'} autoComplete="new-password"
                                value={form.password} onChange={(e) => set('password', e.target.value)}
                                placeholder={instancia.credencialesGuardadas ? 'Guardada — escribe solo para cambiarla' : '••••••••'}
                                className={`${inp} pr-10`} />
                            <button type="button" onClick={() => setVerPassword((v) => !v)}
                                className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 transition-colors hover:text-slate-600">
                                <Icon icon={verPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} className="text-base" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={lbl}>Código de seguridad (opcional)</label>
                        <input type="text" autoComplete="off" value={form.securityCode}
                            onChange={(e) => set('securityCode', e.target.value)}
                            placeholder={instancia.securityCodeGuardado ? 'Guardado' : 'Solo si tu cuenta lo pide'}
                            className={inp} />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={lbl}>Agencia de origen (desde dónde despachas)</label>
                        <ShalomAgenciaSelect
                            value={form.agenciaOrigenNombre}
                            onChange={(v) => setForm((prev) => ({ ...prev, agenciaOrigenNombre: v, agenciaOrigenId: '' }))}
                            onSelectAgencia={(a) => setForm((prev) => ({ ...prev, agenciaOrigenId: a.terId, agenciaOrigenNombre: [a.nombre, a.provincia, a.departamento].filter(Boolean).join(' - ') }))}
                            placeholder="Buscar tu agencia Shalom de origen..."
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className={lbl}>Tamaño de paquete por defecto</label>
                        <select value={form.tamanoDefault} onChange={(e) => set('tamanoDefault', e.target.value)} className={inp} data-testid="tamano-default">
                            {[
                                ['SOBRE', 'SOBRE (documentos)'], ['XXS', 'PAQUETE XXS (muy pequeño)'], ['XS', 'PAQUETE XS (pequeño)'],
                                ['S', 'PAQUETE S'], ['M', 'PAQUETE M'], ['L', 'PAQUETE L (grande)'],
                            ].map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                        </select>
                        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                            El tamaño decide cuánto cobra Shalom por el flete en cada ruta (ej. Lima → Arequipa: sobre y XXS S/ 8, XS S/ 10, S S/ 12).
                            Es el que se usa cuando en el despacho no eliges otro; ahí siempre puedes cambiarlo y ver el precio de cada tamaño.
                        </p>
                    </div>
                    <div className="sm:col-span-2">
                        <label className={lbl}>Claves de retiro para tus envíos (opcional)</label>
                        <input type="text" inputMode="numeric" autoComplete="off" value={form.clavesRetiro}
                            onChange={(e) => set('clavesRetiro', e.target.value.replace(/[^\d,\s]/g, ''))}
                            placeholder="Ej: 1010, 1011"
                            className={inp} data-testid="claves-retiro" />
                        <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                            La clave de 4 dígitos que le mandas al cliente para recoger. Shalom no permite repetir la
                            de ayer, así que si pones dos (o más) el sistema las alterna solo: hoy usa la que no se usó
                            ayer y todas las guías del día salen con la misma. Si lo dejas vacío, se genera una clave
                            distinta por envío; y en cada guía puedes escribir otra a mano.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={conectar} disabled={guardando}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-black text-white shadow-lg shadow-red-500/20 transition-opacity hover:opacity-90 disabled:opacity-50">
                        <Icon icon={guardando ? 'eos-icons:loading' : 'solar:link-circle-bold'} width={18} />
                        {conectada ? 'Actualizar credenciales' : 'Conectar cuenta'}
                    </button>
                    {conectada && (
                        <>
                            <button type="button" onClick={guardarConfig} disabled={guardando}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                <Icon icon="solar:diskette-bold" width={18} /> Guardar agencia, tamaño y claves
                            </button>
                            <button type="button" onClick={() => ejecutar(shalomService.reconectar, 'Sesión de Shalom Pro renovada')} disabled={guardando}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                                <Icon icon="solar:refresh-bold" width={18} /> Reconectar
                            </button>
                            <button type="button" onClick={() => ejecutar(shalomService.desconectar, 'Cuenta Shalom Pro desconectada')} disabled={guardando}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/20">
                                <Icon icon="solar:link-broken-bold" width={18} /> Desconectar
                            </button>
                        </>
                    )}
                </div>

                {/* Generación automática: solo tiene sentido con la cuenta ya conectada. */}
                {conectada && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800/40 dark:bg-amber-900/15">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="font-bold text-gray-900 dark:text-white">Generar la guía al cerrar la venta</p>
                                <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-400">
                                    Cuando eliges Shalom en la coordinación de envío, la guía se registra sola al
                                    guardar la venta y el N° de orden queda en el despacho — sin pasar por el panel.
                                    <b> Crea envíos reales en tu cuenta Shalom Pro</b>, así que actívalo cuando estés
                                    listo. Si la guía falla, la venta se guarda igual y te avisamos.
                                </p>
                            </div>
                            <button
                                type="button"
                                disabled={guardando}
                                onClick={() => ejecutar(
                                    () => shalomService.actualizarConfig({ autoGuiaActivo: !instancia.autoGuiaActivo }),
                                    !instancia.autoGuiaActivo
                                        ? 'Las ventas con Shalom generarán la guía automáticamente.'
                                        : 'Generación automática desactivada.',
                                )}
                                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${guardando ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${instancia.autoGuiaActivo ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${instancia.autoGuiaActivo ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        {!instancia.autoGuiaActivo && (
                            <p className="mt-3 text-xs italic text-slate-500">
                                Desactivado: generas cada guía a mano desde Editar Despacho.
                            </p>
                        )}
                    </div>
                )}

                <div className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500 dark:bg-slate-800/40 dark:text-gray-400">
                    <Icon icon="solar:info-circle-bold" width={16} className="mt-0.5 shrink-0 text-red-400" />
                    <span>
                        Usamos tus credenciales solo para abrir sesión en Shalom Pro y registrar tus envíos.
                        Puedes desconectar la cuenta cuando quieras — el rastreo seguirá funcionando igual.
                    </span>
                </div>
            </div>
        </div>
    );
}
