import { Icon } from '@iconify/react';
import { useMapaConsumoViewModel } from './useMapaConsumoViewModel';
import {
    CLASES_NIVEL, DIMENSIONES_DONDE, DIMENSIONES_QUE,
    TILES_COLS, TILES_FILAS, nivelIntensidad,
} from './MapaConsumoModel';
import { formatSoles, formatCompacto } from './ReportesVentasModel';
import MapaConsumoGoogle from './MapaConsumoGoogle';
import { GOOGLE_MAPS_KEY } from '@/components/maps/googleMaps';

const MapaConsumoView = () => {
    const vm = useMapaConsumoViewModel();
    const m = vm.matriz;

    return (
        <div className="p-4 md:p-6 space-y-5">
            <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white">Mapa de consumo</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                    Qué se vende, en qué zona del país y a qué clientes
                </p>
            </div>

            {/* Controles */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1.5">Qué mido</p>
                        <div className="flex gap-1.5">
                            {DIMENSIONES_QUE.map((d) => (
                                <button
                                    key={d.key}
                                    onClick={() => vm.setQue(d.key)}
                                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                                        vm.que === d.key
                                            ? 'bg-violet-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                >
                                    <Icon icon={d.icon} width={14} /> {d.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1.5">Cruzado con</p>
                        <div className="flex gap-1.5 flex-wrap">
                            {DIMENSIONES_DONDE.map((d) => (
                                <button
                                    key={d.key}
                                    onClick={() => vm.setDonde(d.key)}
                                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                                        vm.donde === d.key
                                            ? 'bg-violet-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                >
                                    <Icon icon={d.icon} width={14} /> {d.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1.5">Periodo</p>
                        <div className="flex items-center gap-2">
                            <input type="date" value={vm.fechaInicio} onChange={(e) => vm.setFechaInicio(e.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                            <span className="text-slate-400 text-xs">a</span>
                            <input type="date" value={vm.fechaFin} onChange={(e) => vm.setFechaFin(e.target.value)}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                        </div>
                    </div>
                    {vm.cargando && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600">
                            <Icon icon="svg-spinners:180-ring" width={14} /> Cargando…
                        </span>
                    )}
                </div>
            </div>

            {m && m.totalGeneral === 0 && !vm.cargando && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-300">
                    No hay ventas en ese periodo.
                </div>
            )}

            {/* Tres bloques en una fila: mosaico, mapa y ranking. El mapa NO va a ancho
                completo aunque quepa — el Perú es alto y estrecho, así que en una caja
                muy ancha `fitBounds` tiene que alejar para que entre a lo alto y la
                mitad del recuadro acaba siendo océano y Brasil. En una columna angosta
                el encuadre aprovecha el alto y el país llena el marco. */}
            {m && m.totalGeneral !== 0 && (
                <div className="grid grid-cols-1 xl:grid-cols-[auto,minmax(300px,0.95fr),1.25fr] gap-5 items-start">
                    {/* ── Mosaico del Perú ── */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-center justify-between mb-3 gap-4">
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
                                {vm.esMapeable ? 'Perú por departamento' : 'Reparto'}
                                {GOOGLE_MAPS_KEY && <span className="ml-1 font-semibold text-slate-400">· mosaico</span>}
                            </h3>
                            {vm.zonaFoco && (
                                <button onClick={() => vm.setZonaFoco(null)}
                                    className="text-[11px] font-bold text-violet-600 hover:underline">
                                    Ver todo el país
                                </button>
                            )}
                        </div>

                        {vm.esMapeable ? (
                            <>
                                <div
                                    className="grid gap-1"
                                    style={{
                                        gridTemplateColumns: `repeat(${TILES_COLS}, 58px)`,
                                        gridTemplateRows: `repeat(${TILES_FILAS}, 40px)`,
                                    }}
                                >
                                    {vm.tiles.map((t) => {
                                        const activo = vm.zonaFoco === t.clave;
                                        return (
                                            <button
                                                key={t.clave}
                                                type="button"
                                                disabled={!t.conVentas}
                                                onClick={() => vm.setZonaFoco(activo ? null : t.clave)}
                                                title={`${t.nombre} · ${formatSoles(t.total)}`}
                                                style={{ gridRow: t.fila + 1, gridColumn: t.col + 1 }}
                                                className={`rounded-lg px-1 py-1 text-[9px] font-black leading-tight transition ${CLASES_NIVEL[t.nivel]} ${
                                                    activo ? 'ring-2 ring-offset-1 ring-violet-600 dark:ring-offset-slate-900' : ''
                                                } ${t.conVentas ? 'cursor-pointer hover:scale-105' : 'cursor-default opacity-60'}`}
                                            >
                                                <div>{t.corto}</div>
                                                {t.conVentas && (
                                                    <div className="font-bold opacity-90">{formatCompacto(t.total)}</div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="mt-3 flex items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-slate-400">Menos</span>
                                    {CLASES_NIVEL.map((c, i) => (
                                        <span key={i} className={`h-3 w-5 rounded ${c.split(' ')[0]}`} />
                                    ))}
                                    <span className="text-[10px] font-semibold text-slate-400">Más</span>
                                </div>
                                <p className="mt-2 max-w-[320px] text-[10px] leading-relaxed text-slate-400">
                                    Mosaico, no mapa: cada departamento ocupa lo mismo para que el color
                                    se lea por ventas y no por extensión.
                                </p>
                            </>
                        ) : (
                            <div className="space-y-1.5 min-w-[260px]">
                                {m.columnas.map((c) => {
                                    const nivel = nivelIntensidad(c.total, m.columnas[0]?.total ?? 0);
                                    return (
                                        <div key={c.clave} className="flex items-center gap-2">
                                            <span className="w-32 truncate text-[11px] font-semibold text-slate-600 dark:text-slate-300" title={c.etiqueta}>
                                                {c.etiqueta}
                                            </span>
                                            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                                                <div className={CLASES_NIVEL[nivel].split(' ')[0] + ' h-full'}
                                                    style={{ width: `${Math.max(2, (c.total / (m.columnas[0]?.total || 1)) * 100)}%` }} />
                                            </div>
                                            <span className="w-16 text-right text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                                {formatCompacto(c.total)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {vm.zonasFueraDelMapa.length > 0 && vm.esMapeable && (
                            <div className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800">
                                <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Fuera del mapa</p>
                                {vm.zonasFueraDelMapa.map((z) => (
                                    <div key={z.etiqueta} className="flex justify-between text-[11px]">
                                        <span className="text-slate-500">{z.etiqueta}</span>
                                        <span className="font-bold text-slate-600 dark:text-slate-300">{formatSoles(z.total)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Mapa real ── */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">Dónde se consume</h3>
                            {vm.zonaFoco && (
                                <button onClick={() => vm.setZonaFoco(null)}
                                    className="text-[11px] font-bold text-violet-600 hover:underline whitespace-nowrap">
                                    Ver todo el país
                                </button>
                            )}
                        </div>
                        <MapaConsumoGoogle
                            zonas={vm.zonasMapa}
                            porDepartamento={vm.esMapeable}
                            seleccionada={vm.zonaFoco}
                            onSeleccionar={vm.setZonaFoco}
                            height={520}
                        />
                    </div>

                    {/* ── Ranking de la zona ── */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-baseline justify-between gap-3 mb-3">
                            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white">
                                {vm.etiquetaFoco
                                    ? `Qué compra ${vm.etiquetaFoco}`
                                    : `Ranking nacional por ${vm.que === 'producto' ? 'producto' : 'categoría'}`}
                            </h3>
                            <span className="text-xs font-bold text-slate-400">
                                Total {formatSoles(m.totalGeneral)}
                            </span>
                        </div>

                        {vm.rankingFoco.length === 0 ? (
                            <p className="py-6 text-center text-sm text-slate-400">Sin ventas en esta zona.</p>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    <tr>
                                        <th className="py-2 w-8">#</th>
                                        <th className="py-2">{vm.que === 'producto' ? 'Producto' : 'Categoría'}</th>
                                        {vm.zonaFoco && <th className="py-2 text-right">Unid.</th>}
                                        <th className="py-2 text-right">Venta</th>
                                        <th className="py-2 w-20"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vm.rankingFoco.slice(0, 15).map((r, i) => {
                                        const tope = vm.rankingFoco[0]?.monto || 1;
                                        return (
                                            <tr key={r.etiqueta + i} className="border-t border-slate-100 dark:border-slate-800">
                                                <td className="py-2 text-xs font-black text-slate-300">{i + 1}</td>
                                                <td className="py-2 pr-3 text-xs font-semibold text-slate-700 dark:text-slate-200">{r.etiqueta}</td>
                                                {vm.zonaFoco && (
                                                    <td className="py-2 text-right text-xs font-semibold text-slate-500">
                                                        {Number.isInteger(r.unidades) ? r.unidades : r.unidades.toFixed(2)}
                                                    </td>
                                                )}
                                                {/* nowrap: en la columna estrecha "S/ 38,953.98" se partía en dos
                                                    líneas y descuadraba el alto de cada fila. */}
                                                <td className="py-2 whitespace-nowrap text-right text-xs font-black text-slate-800 dark:text-white">{formatSoles(r.monto)}</td>
                                                <td className="py-2 pl-2 w-20">
                                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                                        <div className="h-full rounded-full bg-violet-500"
                                                            style={{ width: `${Math.max(2, (r.monto / tope) * 100)}%` }} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}

                        {!vm.zonaFoco && vm.esMapeable && (
                            <p className="mt-3 text-[11px] text-slate-400">
                                Pulsa un departamento del mosaico para ver qué compra esa zona.
                            </p>
                        )}
                        {(m.restoFilas > 0.01 || m.restoColumnas > 0.01) && (
                            <p className="mt-2 text-[10px] text-slate-400">
                                Se muestran los {m.filas.length} principales de {m.totalFilasMostradas};
                                el resto suma {formatSoles(m.restoFilas)}.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapaConsumoView;
