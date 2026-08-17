/**
 * Helper para detectar funcionalidades automáticamente según el rubro
 * ⚡ DETECCIÓN AUTOMÁTICA - Sin configuración manual
 */

export interface RubroFeatures {
    gestionLotes: boolean;           // Farmacia / Fabricación
    requiereVencimientos: boolean;   // Farmacia/Alimentos
    usaCodigoBarras: boolean;        // Bodega/Supermarket
    permiteFraccionamiento: boolean; // Farmacia
    gestionOfertas: boolean;         // Supermarket
    fichaTecnicaComputo: boolean;    // Accesorios/repuestos de cómputo
    controlSeriesGarantia: boolean;  // Cómputo/electrónica
    controlStock: boolean;           // Todos (siempre true)
    descripcionRica: boolean;        // Cualquier rubro con tienda virtual
    usaVariantes: boolean;           // Variantes (color/talla): Moda y rubros configurados
    trazabilidadVehicular: boolean;          // Seguridad Electrónica / GPS / Alarmas vehiculares
    gestionContratosVehiculares: boolean;    // Contratos y suscripciones anuales por vehículo
}

/**
 * Farmacia retail: farmacia, botica o medicamentos. Habilita receta médica y fraccionamiento.
 * NO incluye droguería (mayorista sin dispensación al público).
 */
export function esFarmaciaRetailRubro(nombre: string | null | undefined): boolean {
    if (!nombre) return false;
    const n = nombre.toLowerCase();
    return n.includes('farmacia') || n.includes('botica') || n.includes('medicament');
}

/**
 * Droguería: mayorista farmacéutico. Habilita FEFO + vencimientos + cadena de frío.
 * Sin receta médica ni fraccionamiento.
 */
export function esDrogueriaRubro(nombre: string | null | undefined): boolean {
    if (!nombre) return false;
    const n = nombre.toLowerCase();
    return n.includes('drogueria') || n.includes('droguería');
}

/**
 * Cualquier rubro farmacéutico regulado (farmacia, botica o droguería).
 * Activa FEFO, vencimientos y cadena de frío.
 */
export function usaLotesFarmaciaRubro(nombre: string | null | undefined): boolean {
    return esFarmaciaRetailRubro(nombre) || esDrogueriaRubro(nombre);
}

export function esRubroFabricacion(
    nombreRubro: string | null | undefined,
): boolean {
    if (!nombreRubro) return false;
    const nombre = nombreRubro.toLowerCase();
    return (
        nombre.includes('fabricación') ||
        nombre.includes('fabricacion') ||
        nombre.includes('manufactura') ||
        nombre.includes('industria') ||
        nombre.includes('producción') ||
        nombre.includes('produccion')
    );
}

export function esRubroComputo(nombreRubro: string | null | undefined): boolean {
    if (!nombreRubro) return false;
    const nombre = nombreRubro.toLowerCase();
    return (
        nombre.includes('computo') ||
        nombre.includes('cómputo') ||
        nombre.includes('computadora') ||
        nombre.includes('computadoras') ||
        nombre.includes('informatica') ||
        nombre.includes('informática') ||
        nombre.includes('tecnologia') ||
        nombre.includes('tecnología') ||
        nombre.includes('repuesto') ||
        nombre.includes('accesorio') ||
        nombre.includes('hardware') ||
        nombre.includes('laptop') ||
        nombre.includes('pc ') ||
        nombre.includes('celular') ||
        nombre.includes('telefon') || // teléfono / telefonía / telefonos
        nombre.includes('móvil') ||
        nombre.includes('movil') ||
        nombre.includes('smartphone')
    );
}

type FeatureOverrides = {
    usaCodigoBarrasManual?: boolean | null;
};

type RubroFeatureMap = Partial<Record<keyof RubroFeatures, boolean>>;

type RubroInput =
    | string
    | null
    | undefined
    | {
        nombre?: string | null;
        features?: RubroFeatureMap | Array<{ featureKey: string; enabledByDefault?: boolean; enabled?: boolean }>;
    };

function getRubroNombre(input: RubroInput): string | null | undefined {
    return typeof input === 'string' ? input : input?.nombre;
}

function getConfiguredFeatures(input: RubroInput): RubroFeatureMap {
    if (!input || typeof input === 'string') return {};
    const features = input.features;
    if (!features) return {};
    if (Array.isArray(features)) {
        return features.reduce<RubroFeatureMap>((acc, feature) => {
            acc[feature.featureKey as keyof RubroFeatures] = Boolean(feature.enabledByDefault ?? feature.enabled);
            return acc;
        }, {});
    }
    return features;
}

function hasConfiguredFeatures(input: RubroInput): boolean {
    if (!input || typeof input === 'string') return false;
    const features = input.features;
    if (!features) return false;
    return Array.isArray(features) ? features.length > 0 : Object.keys(features).length > 0;
}

function applyConfiguredFeatures(base: RubroFeatures, input: RubroInput): RubroFeatures {
    if (hasConfiguredFeatures(input)) {
        return {
            gestionLotes: false,
            requiereVencimientos: false,
            usaCodigoBarras: false,
            permiteFraccionamiento: false,
            gestionOfertas: false,
            fichaTecnicaComputo: false,
            controlSeriesGarantia: false,
            controlStock: true,
            descripcionRica: false,
            usaVariantes: false,
            trazabilidadVehicular: false,
            gestionContratosVehiculares: false,
            ...getConfiguredFeatures(input),
        };
    }

    return {
        ...base,
        ...getConfiguredFeatures(input),
        controlStock: getConfiguredFeatures(input).controlStock ?? base.controlStock,
    };
}

/**
 * Detecta automáticamente las funcionalidades según el nombre del rubro
 */
export function detectarFuncionesRubro(
    rubro: RubroInput,
    overrides?: FeatureOverrides,
): RubroFeatures {
    const nombreRubro = getRubroNombre(rubro);
    if (!nombreRubro) {
        return applyConfiguredFeatures({
            gestionLotes: false,
            requiereVencimientos: false,
            usaCodigoBarras:
                typeof overrides?.usaCodigoBarrasManual === 'boolean'
                    ? overrides.usaCodigoBarrasManual
                    : false,
            permiteFraccionamiento: false,
            gestionOfertas: false,
            fichaTecnicaComputo: false,
            controlSeriesGarantia: false,
            controlStock: true,
            descripcionRica: false,
            usaVariantes: false,
            trazabilidadVehicular: false,
            gestionContratosVehiculares: false,
        }, rubro);
    }

    const nombre = nombreRubro.toLowerCase();

    // FARMACIA / BOTICA / MEDICAMENTOS (retail — vende al público, requiere receta)
    const esFarmacia = nombre.includes('farmacia') || nombre.includes('botica') || nombre.includes('medicament');

    // DROGUERÍA (mayorista — distribuye a empresas, sin dispensación al público)
    const esDrogueria = nombre.includes('drogueria') || nombre.includes('droguería');

    // BODEGA / SUPERMARKET / MINIMARKET  
    const esBodega =
        nombre.includes('bodega') ||
        nombre.includes('supermarket') ||
        nombre.includes('supermercado') ||
        nombre.includes('minimarket') ||
        nombre.includes('abarrotes');

    // ALIMENTOS (restaurante, panadería, etc.)
    const esAlimentos =
        nombre.includes('restaurante') ||
        nombre.includes('panadería') ||
        nombre.includes('panaderia') ||
        nombre.includes('pastelería') ||
        nombre.includes('pasteleria');

    // FABRICACIÓN / MANUFACTURA
    const esFabricacion = esRubroFabricacion(nombreRubro);
    const esComputo = esRubroComputo(nombreRubro);

    // MODA / TEXTIL / CALZADO (usa variantes color/talla por defecto)
    const esModa =
        nombre.includes('moda') ||
        nombre.includes('ropa') ||
        nombre.includes('textil') ||
        nombre.includes('confeccion') ||
        nombre.includes('confección') ||
        nombre.includes('calzado') ||
        nombre.includes('zapater') ||
        nombre.includes('boutique');

    // SEGURIDAD VEHICULAR / GPS / ALARMAS
    const esVehicular =
        nombre.includes('vehicular') ||
        nombre.includes('vehiculo') ||
        nombre.includes('vehículo') ||
        nombre.includes('alarma') ||
        nombre.includes('gps') ||
        nombre.includes('rastreo') ||
        nombre.includes('monitoreo') ||
        (nombre.includes('seguridad') && (
            nombre.includes('integral') ||
            nombre.includes('electronica') ||
            nombre.includes('electrónica') ||
            nombre.includes('tecsi')
        ));

    const usaCodigoBarras =
        typeof overrides?.usaCodigoBarrasManual === 'boolean'
            ? overrides.usaCodigoBarrasManual
            : esBodega;

    return applyConfiguredFeatures({
        // Lotes: Farmacia, droguería y fabricación
        gestionLotes: esFarmacia || esFabricacion || esDrogueria,

        // Vencimientos: Farmacia, droguería y alimentos
        requiereVencimientos: esFarmacia || esAlimentos || esDrogueria,

        // Código de barras: Bodega/Supermarket
        usaCodigoBarras,

        // Fraccionamiento (venta por unidad de caja): solo Farmacia retail, NO droguería
        permiteFraccionamiento: esFarmacia,

        // Ofertas/Promociones: Supermarket
        gestionOfertas: esBodega,

        // Cómputo: ficha técnica y trazabilidad por serie/garantía
        fichaTecnicaComputo: esComputo,
        controlSeriesGarantia: esComputo,

        // Control de stock: TODOS
        controlStock: true,

        // Descripción rica: activado por configuración de rubro (default false)
        descripcionRica: false,

        // Variantes (color/talla): por defecto solo Moda; otros rubros lo habilitan por configuración
        usaVariantes: esModa,

        // Vehicular: GPS/Alarmas/Seguridad electrónica
        trazabilidadVehicular: esVehicular,
        gestionContratosVehiculares: esVehicular,
    }, rubro);
}

/**
 * Hook para usar en componentes de React
 */
export function useRubroFeatures(
    rubro: RubroInput,
    overrides?: FeatureOverrides,
): RubroFeatures {
    return detectarFuncionesRubro(rubro, overrides);
}

/**
 * Helpers rápidos para casos específicos
 */
export const RubroHelpers = {
    usaLotes: (_nombreRubro: string | null | undefined) => true,

    usaCodigoBarras: (nombreRubro: string | null | undefined) => {
        if (!nombreRubro) return false;
        const nombre = nombreRubro.toLowerCase();
        return (
            nombre.includes('bodega') ||
            nombre.includes('supermarket') ||
            nombre.includes('supermercado') ||
            nombre.includes('minimarket')
        );
    },

    esRestaurante: (nombreRubro: string | null | undefined) => {
        if (!nombreRubro) return false;
        return nombreRubro.toLowerCase().includes('restaurante');
    },

    esComputo: esRubroComputo,
};
