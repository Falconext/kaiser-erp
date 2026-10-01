import { useEffect, useMemo, useState } from 'react';
import { GoogleMap, InfoWindow, Marker } from '@react-google-maps/api';
import { Icon } from '@iconify/react';
import { useThemeStore } from '@/zustand/theme';
import { GOOGLE_MAPS_KEY, MAP_STYLE_DARK, MAP_STYLE_LIGHT, PERU_CENTER, PERU_ZOOM, geocodificarLugarPe, useGoogleMaps } from '@/components/maps/googleMaps';
import { formatPct, formatSoles } from './formatos';
import { AnalisisCouriersResponse, courierStyle } from './CouriersModel';

type Destino = AnalisisCouriersResponse['destinos'][number];
type DestinoUbicado = Destino & { lat: number; lng: number; aproximado: boolean };

interface Props {
    destinos: Destino[];
    /** Destino resaltado desde la lista (hover/click). */
    seleccionado?: string | null;
    onSeleccionar?: (destino: string | null) => void;
    height?: number;
}

/** Radio del marcador según envíos (escala raíz, acotada). */
const radio = (envios: number, max: number) => 9 + Math.round(Math.sqrt(envios / Math.max(max, 1)) * 15);

/**
 * Mapa de destinos de envío: una burbuja por ciudad/agencia, tamaño por volumen y
 * color del courier principal. Coordenadas del backend (tabla estática) y, para lo
 * que falte, geocodificación en el navegador con caché.
 */
export default function DestinosMap({ destinos, seleccionado, onSeleccionar, height = 420 }: Props) {
    const { isLoaded, loadError } = useGoogleMaps();
    const isDark = useThemeStore((s: any) => Boolean(s.isDarkMode));
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [extra, setExtra] = useState<Record<string, { lat: number; lng: number } | null>>({});
    const [abierto, setAbierto] = useState<string | null>(null);

    // Geocodificar los destinos sin coordenadas (una vez por destino, con caché).
    useEffect(() => {
        if (!isLoaded) return;
        const pendientes = destinos.filter(d => d.lat == null && extra[d.destino] === undefined);
        if (!pendientes.length) return;
        let cancel = false;
        (async () => {
            const res: Record<string, { lat: number; lng: number } | null> = {};
            for (const d of pendientes) {
                res[d.destino] = await geocodificarLugarPe([d.distrito ?? d.destino, d.provincia, d.departamento].filter(Boolean).join(', '));
            }
            if (!cancel) setExtra(prev => ({ ...prev, ...res }));
        })();
        return () => { cancel = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, destinos]);

    const ubicados: DestinoUbicado[] = useMemo(() => destinos.flatMap((d): DestinoUbicado[] => {
        if (d.lat != null && d.lng != null) return [{ ...d, lat: d.lat, lng: d.lng, aproximado: false }];
        const g = extra[d.destino];
        return g ? [{ ...d, lat: g.lat, lng: g.lng, aproximado: true }] : [];
    }), [destinos, extra]);
    const maxEnvios = Math.max(...ubicados.map(d => d.envios), 1);
    const sinUbicar = destinos.length - ubicados.length;

    // Encuadre automático a los destinos (o todo el Perú si no hay).
    useEffect(() => {
        if (!map) return;
        if (ubicados.length === 0) { map.setCenter(PERU_CENTER); map.setZoom(PERU_ZOOM); return; }
        if (ubicados.length === 1) { map.setCenter({ lat: ubicados[0].lat, lng: ubicados[0].lng }); map.setZoom(9); return; }
        const b = new google.maps.LatLngBounds();
        ubicados.forEach(d => b.extend({ lat: d.lat, lng: d.lng }));
        map.fitBounds(b, 48);
    }, [map, ubicados]);

    // Selección desde la lista: abre la burbuja y centra el mapa en ella.
    useEffect(() => {
        if (seleccionado === undefined) return;
        setAbierto(seleccionado);
        const d = seleccionado ? ubicados.find(u => u.destino === seleccionado) : null;
        if (map && d) map.panTo({ lat: d.lat, lng: d.lng });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seleccionado]);

    const opciones = useMemo<google.maps.MapOptions>(() => ({
        styles: isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'cooperative',
        backgroundColor: isDark ? '#111827' : '#f3f4f6',
        clickableIcons: false,
    }), [isDark]);

    // Re-aplicar el estilo al cambiar de tema (el mapa ya montado no vuelve a leer `options`).
    useEffect(() => {
        map?.setOptions({ styles: isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT, backgroundColor: isDark ? '#111827' : '#f3f4f6' });
    }, [map, isDark]);

    if (!GOOGLE_MAPS_KEY) {
        return (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-slate-700 text-center p-6">
                <Icon icon="solar:map-bold-duotone" className="text-3xl text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Configura <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> para ver el mapa de destinos.</p>
            </div>
        );
    }
    if (loadError) {
        return <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl bg-gray-50 dark:bg-slate-800/40 text-sm text-rose-500">No se pudo cargar Google Maps.</div>;
    }
    if (!isLoaded) {
        return <div className="h-full min-h-[240px] animate-pulse rounded-2xl bg-gray-100 dark:bg-slate-800" style={{ height }} />;
    }

    const abiertoData = ubicados.find(d => d.destino === abierto) ?? null;

    return (
        <div className="relative overflow-hidden rounded-2xl" style={{ height }}>
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={PERU_CENTER}
                zoom={PERU_ZOOM}
                options={opciones}
                onLoad={setMap}
                onUnmount={() => setMap(null)}
                onClick={() => { setAbierto(null); onSeleccionar?.(null); }}
            >
                {ubicados.map(d => {
                    const st = courierStyle(d.courierPrincipal);
                    const activo = abierto === d.destino;
                    return (
                        <Marker
                            key={d.destino}
                            position={{ lat: d.lat, lng: d.lng }}
                            title={`${d.destino} · ${d.envios} envíos`}
                            zIndex={activo ? 1000 : d.envios}
                            onClick={() => { setAbierto(d.destino); onSeleccionar?.(d.destino); }}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: radio(d.envios, maxEnvios),
                                fillColor: st.color,
                                fillOpacity: activo ? 0.95 : 0.72,
                                strokeColor: '#ffffff',
                                strokeWeight: activo ? 3 : 2,
                            }}
                            label={{ text: String(d.envios), color: '#ffffff', fontSize: '11px', fontWeight: '800' }}
                        />
                    );
                })}

                {abiertoData && (
                    <InfoWindow
                        position={{ lat: abiertoData.lat, lng: abiertoData.lng }}
                        options={{ pixelOffset: new google.maps.Size(0, -radio(abiertoData.envios, maxEnvios) - 6), disableAutoPan: false }}
                        onCloseClick={() => { setAbierto(null); onSeleccionar?.(null); }}
                    >
                        <div className="min-w-[180px] font-sans text-gray-800">
                            <p className="text-sm font-black leading-tight">{abiertoData.destino}</p>
                            {abiertoData.departamento && abiertoData.departamento !== abiertoData.destino && (
                                <p className="text-[11px] text-gray-500">{abiertoData.departamento}</p>
                            )}
                            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                                <div><p className="text-[9px] uppercase font-bold text-gray-400">Envíos</p><p className="text-sm font-black">{abiertoData.envios}</p></div>
                                <div><p className="text-[9px] uppercase font-bold text-gray-400">Entrega</p><p className="text-sm font-black text-emerald-600">{formatPct(abiertoData.envios ? (abiertoData.entregados / abiertoData.envios) * 100 : 0)}</p></div>
                                <div><p className="text-[9px] uppercase font-bold text-gray-400">Flete</p><p className="text-sm font-black">{formatSoles(abiertoData.costoEnvio)}</p></div>
                            </div>
                            <p className="mt-2 text-[11px] font-bold" style={{ color: courierStyle(abiertoData.courierPrincipal).color }}>
                                Principalmente por {abiertoData.courierPrincipal}{abiertoData.aproximado ? ' · ubicación aproximada' : ''}
                            </p>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* Leyenda */}
            <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2 rounded-xl bg-white/90 dark:bg-[#111827]/90 px-3 py-2 text-[11px] font-semibold text-gray-600 dark:text-gray-300 shadow-sm backdrop-blur">
                {Array.from(new Set(ubicados.map(d => d.courierPrincipal))).map(c => (
                    <span key={c} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: courierStyle(c).color }} />{c}</span>
                ))}
                <span className="text-gray-400">· tamaño = envíos</span>
                {sinUbicar > 0 && <span className="text-gray-400">· {sinUbicar} sin ubicar</span>}
            </div>
        </div>
    );
}
