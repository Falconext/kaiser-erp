export type BrandConfig = {
  key?: string;
  authBrand?: string;
  isWhiteLabel?: boolean;
  name: string;
  legalName: string;
  website: string;
  email: string;
  phone: string;
  whatsapp: string;
  logo: string;
  logoWhite: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  socials: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
  dashboardUrl: string;
};

// Namespace versionado de la caché de branding en localStorage.
const LOCAL_STORAGE_KEY = 'PUBLIC_BRANDING_CONFIG_KAISER';

// ─── MARCA: KAISER CORPORATION ───────────────────────────────────────────────
// ERP interno de Kaiser Corporation S.A. (una sola empresa, sin white-label).
const BRAND_NAME = 'Kaiser';
const BRAND_PRIMARY = '#214878';   // Navy corporativo Kaiser (isotipo)
const BRAND_SECONDARY = '#17335A'; // Navy oscuro (énfasis)
const BRAND_LOGO = '/svg/kaiser.svg';
// ─────────────────────────────────────────────────────────────────────────────

const staticBrands: Record<string, BrandConfig> = {
  default: {
    key: 'default',
    isWhiteLabel: false,
    name: BRAND_NAME,
    legalName: 'Kaiser Corporation S.A.',
    website: 'https://www.kaisercorp.com.pe',
    email: 'ventas@kaisercorp.com.pe',
    phone: '',
    whatsapp: '',
    logo: BRAND_LOGO,
    logoWhite: BRAND_LOGO,
    favicon: BRAND_LOGO,
    primaryColor: BRAND_PRIMARY,
    secondaryColor: BRAND_SECONDARY,
    socials: {},
    dashboardUrl: '/',
  },
};

// Los resellers white-label se resuelven en runtime por host vía el backend
// (/branding/public); ya no hay mapeo estático de hosts a marcas.
const getHostDefaultBrandKey = (): string => '';

const envDefaultBrandKey = (
  getHostDefaultBrandKey() ||
  import.meta.env.VITE_PUBLIC_BRAND ||
  'default'
).toLowerCase();
const envDefaultBrand = staticBrands[envDefaultBrandKey] || staticBrands.default;
const hostDefaultIsWhiteLabel = Boolean(getHostDefaultBrandKey()) && envDefaultBrand.isWhiteLabel;
const isPublicBrandingFetchDisabled =
  String(import.meta.env.VITE_DISABLE_PUBLIC_BRANDING_FETCH || '').toLowerCase() === 'true';

// Marcas legacy que ya no existen: si el backend/caché las devuelve (p. ej.
// un backend sin reiniciar), se ignoran y se usa la marca Vendify.
// OJO: se filtra SOLO por `key` (las marcas estáticas viejas tenían key
// 'falconext'/'krezka'). NO por `name`, porque un reseller white-label puede
// llamarse legítimamente "Falconext" y su key es su código (p. ej. 'res-003').
const LEGACY_BRANDS = new Set(['falconext', 'krezka']);
const esMarcaLegacy = (b: any): boolean =>
  LEGACY_BRANDS.has(String(b?.key ?? '').toLowerCase());

// ERP mono-empresa (Kaiser): sin white-label ni resolución por host.
// Siempre se usa la marca Kaiser estática (envDefaultBrand).
const getRuntimeBranding = (): BrandConfig | null => null;

export const BRAND: BrandConfig = getRuntimeBranding() || envDefaultBrand;

export const getBrandByKey = (key?: string | null): BrandConfig => {
  const runtime = getRuntimeBranding();
  if (runtime && key && runtime.key?.toLowerCase() === String(key).toLowerCase()) {
    return runtime;
  }
  return staticBrands[(key ?? '').toLowerCase()] || runtime || BRAND;
};

export const BRANDING_STORAGE_KEY = LOCAL_STORAGE_KEY;
