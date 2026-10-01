import { useEffect, useMemo, useState } from 'react';
import { GoogleMap, InfoWindow, Marker } from '@react-google-maps/api';
import { Icon } from '@iconify/react';
import { useThemeStore } from '@/zustand/theme';
import {
    COORDS_DEPARTAMENTOS, GOOGLE_MAPS_KEY, MAP_STYLE_DARK, MAP_STYLE_LIGHT,
    PERU_CENTER, PERU_ZOOM, geocodificarLugarPe, useGoogleMaps,
} from '@/components/maps/googleMaps';
import { formatSoles, formatCompacto } from './ReportesVentasModel';
import { normalizarZona } from './MapaConsumoModel';

export interface ZonaMapa {
    clave: string;
    etiqueta: string;
    total: number;
}

interface Props {
    zonas: ZonaMapa[];
    /** true cuando el eje es departamento: ahí hay coordenadas en duro. */
    porDepartamento: boolean;
    seleccionada: string | null;
    onSeleccionar: (clave: string | null) => void;
    height?: number;
}

type ZonaUbicada = ZonaMapa & { lat: number; lng: number; aproximado: boolean };

/**
 * Radio de la burbuja por ventas. Escala RAÍZ, no lineal: el ojo compara
 * burbujas por su área, así que un radio proporcional al importe haría que una
 * zona que vende el doble se viera cuatro veces más grande. Y acotada por abajo,
 * para que la zona más floja siga siendo visible y clicable.
 */
const radio = (venta: number, max: number) => 9 + Math.round(Math.sqrt(Math.max(venta, 0) / Math.max(max, 1)) * 17);

export default function MapaConsumoGoogle({
    zonas, porDepartamento, seleccionada, onSeleccionar, height = 460,
}: Props) {
    const { isLoaded, loadError } = useGoogleMaps();
    const isDark = useThemeStore((s: any) => Boolean(s.isDarkMode));
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [geo, setGeo] = useState<Record<string, { lat: number; lng: number } | null>>({});
    const [abierta, setAbierta] = useState<string | null>(null);

    // Solo se geocodifica lo que no está en la tabla de departamentos (provincias,
    // distritos). Una vez por zona y con caché en localStorage.
    useEffect(() => {
        if (!isLoaded) return;
        const pendientes = zonas.filter(
            (z) => !COORDS_DEPARTAMENTOS[normalizarZona(z.etiqueta)] && geo[z.clave] === undefined,
        );
        if (!pendientes.length) return;
        let cancelado = false;
        (async () => {
            const res: Record<string, { lat: number; lng: number } | null> = {};
            for (const z of pendientes) res[z.clave] = await geocodificarLugarPe(z.etiqueta);
            if (!cancelado) setGeo((prev) => ({ ...prev, ...res }));
        })();
        return () => { cancelado = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoaded, zonas]);

    const ubicadas: ZonaUbicada[] = useMemo(
        () => zonas.flatMap((z): ZonaUbicada[] => {
            const fija = COORDS_DEPARTAMENTOS[normalizarZona(z.etiqueta)];
            if (fija) return [{ ...z, ...fija, aproximado: false }];
            const g = geo[z.clave];
            return g ? [{ ...z, ...g, aproximado: true }] : [];
        }),
        [zonas, geo],
    );

    const maxVenta = Math.max(...ubicadas.map((z) => z.total), 1);
    const sinUbicar = zonas.length - ubicadas.length;

    // Encuadre automático sobre lo que hay; si no hay nada, todo el Perú.
    useEffect(() => {
        if (!map) return;
        if (ubicadas.length === 0) { map.setCenter(PERU_CENTER); map.setZoom(PERU_ZOOM); return; }
        if (ubicadas.length === 1) {
            map.setCenter({ lat: ubicadas[0].lat, lng: ubicadas[0].lng });
            map.setZoom(7);
            return;
        }
        const b = new google.maps.LatLngBounds();
        ubicadas.forEach((z) => b.extend({ lat: z.lat, lng: z.lng }));
        map.fitBounds(b, 56);
    }, [map, ubicadas]);

    useEffect(() => { setAbierta(seleccionada); }, [seleccionada]);

    if (!GOOGLE_MAPS_KEY) {
        return (
            <div className="grid place-items-center rounded-xl border border-dashed border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-800/50 dark:bg-amber-950/20" style={{ height }}>
                <div>
                    <Icon icon="solar:map-point-wave-linear" width={28} className="mx-auto text-amber-500" />
                    <p className="mt-2 text-sm font-bold text-amber-800 dark:text-amber-300">Falta la clave de Google Maps</p>
                    <p className="mt-1 max-w-sm text-xs text-amber-700 dark:text-amber-400">
                        Define <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> en
                        {' '}<code className="font-mono">frontend/.env</code> y recarga. Mientras tanto,
                        abajo tienes el mismo dato en mosaico.
                    </p>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="grid place-items-center rounded-xl border border-dashed border-red-300 bg-red-50 p-6 text-center dark:border-red-800/50 dark:bg-red-950/20" style={{ height }}>
                <div>
                    <Icon icon="solar:danger-triangle-linear" width={28} className="mx-auto text-red-500" />
                    <p className="mt-2 text-sm font-bold text-red-700 dark:text-red-300">No se pudo cargar Google Maps</p>
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        Revisa que la clave tenga habilitadas Maps JavaScript API y Geocoding API,
                        y que este dominio esté permitido.
                    </p>
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="grid place-items-center rounded-xl bg-slate-50 dark:bg-slate-800/40" style={{ height }}>
                <Icon icon="svg-spinners:180-ring" width={26} className="text-violet-500" />
            </div>
        );
    }

    return (
        <div className="relative">
            <GoogleMap
                onLoad={setMap}
                mapContainerStyle={{ width: '100%', height, borderRadius: 12 }}
                center={PERU_CENTER}
                zoom={PERU_ZOOM}
                options={{
                    styles: isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT,
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: 'cooperative',
                }}
            >
                {ubicadas.map((z) => {
                    const activa = seleccionada === z.clave;
                    const r = radio(z.total, maxVenta);
                    return (
                        <Marker
                            key={z.clave}
                            position={{ lat: z.lat, lng: z.lng }}
                            onClick={() => onSeleccionar(activa ? null : z.clave)}
                            title={`${z.etiqueta} · ${formatSoles(z.total)}`}
                            icon={{
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: activa ? r + 3 : r,
                                fillColor: activa ? '#5b21b6' : '#7c3aed',
                                fillOpacity: activa ? 0.95 : 0.72,
                                strokeColor: '#ffffff',
                                strokeWeight: activa ? 3 : 1.5,
                            }}
                            label={{
                                text: formatCompacto(z.total),
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: '700',
                            }}
                        >
                            {abierta === z.clave && (
                                <InfoWindow onCloseClick={() => { setAbierta(null); onSeleccionar(null); }}>
                                    <div style={{ minWidth: 140 }}>
                                        <div style={{ fontWeight: 800, fontSize: 12, color: '#111' }}>{z.etiqueta}</div>
                                        <div style={{ fontSize: 12, color: '#6d28d9', fontWeight: 700 }}>{formatSoles(z.total)}</div>
                                        {z.aproximado && (
                                            <div style={{ fontSize: 10, color: '#92400e', marginTop: 2 }}>
                                                Ubicación aproximada
                                            </div>
                                        )}
                                    </div>
                                </InfoWindow>
                            )}
                        </Marker>
                    );
                })}
            </GoogleMap>

            {sinUbicar > 0 && (
                <p className="mt-2 text-[11px] text-slate-400">
                    {sinUbicar} zona(s) sin ubicar en el mapa
                    {porDepartamento ? '' : ' (se geocodifican al abrir; puede tardar unos segundos)'}.
                </p>
            )}
        </div>
    );
}
