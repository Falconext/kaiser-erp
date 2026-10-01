import { useJsApiLoader, Libraries } from '@react-google-maps/api';

// Clave pública de Google Maps (Maps JavaScript API + Geocoding). Se define en
// frontend/.env.local como VITE_GOOGLE_MAPS_API_KEY (y en Vercel para prod).
export const GOOGLE_MAPS_KEY: string = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

// Referencia estable (module-level) para que useJsApiLoader no recargue el script.
const LIBRARIES: Libraries = ['geometry'];

/** Carga única del SDK; todos los mapas comparten el mismo id y libraries. */
export function useGoogleMaps() {
    return useJsApiLoader({ id: 'gmaps-script', googleMapsApiKey: GOOGLE_MAPS_KEY, libraries: LIBRARIES, language: 'es', region: 'PE' });
}

/** Centro y zoom por defecto: todo el Perú. */
export const PERU_CENTER = { lat: -9.19, lng: -75.0152 };
export const PERU_ZOOM = 5;

// Estilo claro: mapa recesivo (grises suaves, sin POIs) para que manden los marcadores.
export const MAP_STYLE_LIGHT: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#f3f4f6' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#cbd5e1' }] },
    { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#93c5fd' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#eef2f7' }] },
];

// Estilo oscuro alineado al dark mode del panel (#0A0D14 / #111827).
export const MAP_STYLE_DARK: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
    { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#64748b' }, { weight: 1.2 }] },
    { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#475569' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#273449' }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1220' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
];

/**
 * Geocodifica un lugar del Perú con caché en localStorage (una sola consulta
 * por destino por navegador). Devuelve null si Google no lo encuentra.
 */
export async function geocodificarLugarPe(texto: string): Promise<{ lat: number; lng: number } | null> {
    const key = `GEOCODE_PE_${texto.trim().toUpperCase()}`;
    try {
        const cached = localStorage.getItem(key);
        if (cached) return cached === 'null' ? null : JSON.parse(cached);
    } catch { /* sin storage */ }
    if (!(window as any).google?.maps?.Geocoder) return null;
    const geocoder = new google.maps.Geocoder();
    const result = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        geocoder.geocode({ address: `${texto}, Perú`, region: 'pe' }, (res, status) => {
            if (status === 'OK' && res && res[0]) {
                const loc = res[0].geometry.location;
                resolve({ lat: loc.lat(), lng: loc.lng() });
            } else resolve(null);
        });
    });
    try { localStorage.setItem(key, result ? JSON.stringify(result) : 'null'); } catch { /* no-op */ }
    return result;
}


/**
 * Capitales de los 25 departamentos. Van en duro y no por geocodificación porque
 * son 25 puntos fijos que no cambian: pedírselos a Google cada vez que alguien
 * abre el mapa gasta cuota de la Geocoding API (que se factura) para obtener
 * siempre lo mismo. La geocodificación se reserva para provincia y distrito,
 * que sí son muchos y variables.
 *
 * La clave es el nombre en mayúsculas sin tildes: así lo agrupa el backend.
 */
export const COORDS_DEPARTAMENTOS: Record<string, { lat: number; lng: number }> = {
    AMAZONAS: { lat: -6.2290, lng: -77.8720 },
    ANCASH: { lat: -9.5278, lng: -77.5278 },
    APURIMAC: { lat: -13.6350, lng: -72.8810 },
    AREQUIPA: { lat: -16.4090, lng: -71.5375 },
    AYACUCHO: { lat: -13.1588, lng: -74.2239 },
    CAJAMARCA: { lat: -7.1638, lng: -78.5003 },
    CALLAO: { lat: -12.0566, lng: -77.1181 },
    CUSCO: { lat: -13.5320, lng: -71.9675 },
    HUANCAVELICA: { lat: -12.7869, lng: -74.9762 },
    HUANUCO: { lat: -9.9306, lng: -76.2422 },
    ICA: { lat: -14.0678, lng: -75.7286 },
    JUNIN: { lat: -12.0686, lng: -75.2103 },
    'LA LIBERTAD': { lat: -8.1090, lng: -79.0215 },
    LAMBAYEQUE: { lat: -6.7714, lng: -79.8409 },
    LIMA: { lat: -12.0464, lng: -77.0428 },
    LORETO: { lat: -3.7491, lng: -73.2538 },
    'MADRE DE DIOS': { lat: -12.5933, lng: -69.1891 },
    MOQUEGUA: { lat: -17.1950, lng: -70.9350 },
    PASCO: { lat: -10.6825, lng: -76.2561 },
    PIURA: { lat: -5.1945, lng: -80.6328 },
    PUNO: { lat: -15.8402, lng: -70.0219 },
    'SAN MARTIN': { lat: -6.4870, lng: -76.3600 },
    TACNA: { lat: -18.0066, lng: -70.2463 },
    TUMBES: { lat: -3.5669, lng: -80.4515 },
    UCAYALI: { lat: -8.3791, lng: -74.5539 },
};
