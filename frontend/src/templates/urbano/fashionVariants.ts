type VariantValueMap = Record<string, string>;

export type FashionColorOption = {
  name: string;
  hex: string;
  image: string | null;
};

const COLOR_HEX: Record<string, string> = {
  amarillo: '#FACC15',
  arena: '#D6B98C',
  azul: '#2563EB',
  beige: '#D9C7A7',
  black: '#111111',
  blanco: '#F8FAFC',
  blue: '#2563EB',
  bronce: '#8C5A2B',
  cafe: '#7C4A2D',
  camel: '#C28B57',
  celeste: '#93C5FD',
  cobre: '#B87333',
  crema: '#F5E6C8',
  dorado: '#D4AF37',
  gris: '#6B7280',
  guinda: '#7F1D1D',
  marron: '#7C4A2D',
  morado: '#7C3AED',
  multicolor: '#9CA3AF',
  naranja: '#F97316',
  negro: '#111111',
  plata: '#C0C0C0',
  plateado: '#C0C0C0',
  red: '#DC2626',
  rojo: '#DC2626',
  rosa: '#F9A8D4',
  rosado: '#F9A8D4',
  verde: '#16A34A',
  vino: '#7F1D1D',
  white: '#F8FAFC',
};

const normalizeText = (value: any) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const normalizeArray = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const variantValues = (variant: any): VariantValueMap => {
  const raw = variant?.valoresAtributos;
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
};

const isColorName = (name: string) => {
  const normalized = normalizeText(name);
  return normalized.includes('color') || normalized.includes('colour');
};

const isSizeName = (name: string) => {
  const normalized = normalizeText(name);
  return normalized.includes('talla') || normalized.includes('size') || normalized.includes('tamano');
};

const uniquePush = (values: string[], value: any) => {
  const clean = String(value || '').trim();
  if (clean && !values.some((current) => normalizeText(current) === normalizeText(clean))) {
    values.push(clean);
  }
};

const valuesFromOptions = (producto: any, predicate: (name: string) => boolean) => {
  const result: string[] = [];
  normalizeArray(producto?.opcionesAtributos).forEach((option) => {
    if (!predicate(option?.nombre)) return;
    normalizeArray(option?.valores).forEach((value) => uniquePush(result, value));
  });
  return result;
};

const valuesFromVariants = (producto: any, predicate: (name: string) => boolean) => {
  const result: string[] = [];
  normalizeArray(producto?.variantes).forEach((variant) => {
    Object.entries(variantValues(variant)).forEach(([name, value]) => {
      if (predicate(name)) uniquePush(result, value);
    });
  });
  return result;
};

export const colorToHex = (name: string) => {
  const normalized = normalizeText(name);
  return COLOR_HEX[normalized] || '#E5E7EB';
};

// Mapa nombre-de-color -> hex configurado por el comerciante en el admin
// (`atributosTecnicos.coloresTienda`). Es la FUENTE DE VERDAD de los swatches:
// incluye colores personalizados (ej. "Cobre") que no están en COLOR_HEX.
const colorMapFromProducto = (producto: any): Record<string, string> => {
  const raw = producto?.atributosTecnicos?.coloresTienda;
  const obj =
    typeof raw === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
          } catch {
            return {};
          }
        })()
      : raw;
  if (!obj || typeof obj !== 'object') return {};
  const map: Record<string, string> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      map[normalizeText(key)] = value.trim();
    }
  });
  return map;
};

// Hex "placeholder" que el admin asigna cuando el comerciante NO personalizó
// el color (gris por defecto). Si el color sí es conocido, preferimos el hex
// real para que, p.ej., "Cobre" salga cobre y no gris.
const PLACEHOLDER_HEX = new Set(['#cbd5e1', '#e5e7eb']);

// Resuelve el hex de un color respetando primero lo que el comerciante guardó
// en el producto, luego la paleta conocida, y por último un gris neutro.
export const resolveColorHex = (
  name: string,
  colorMap?: Record<string, string>,
) => {
  const normalized = normalizeText(name);
  const known = COLOR_HEX[normalized];
  const custom = colorMap?.[normalized];
  if (custom && !(known && PLACEHOLDER_HEX.has(custom.toLowerCase()))) {
    return custom;
  }
  return known || custom || '#E5E7EB';
};

// Imagen representativa de un color: la primera variante de ese color con imagen.
// En la tienda la imagen es por color (todas las tallas comparten la misma foto).
export const getFashionColorImage = (producto: any, colorValue: string): string | null => {
  const target = normalizeText(colorValue);
  if (!target) return null;
  const match = normalizeArray(producto?.variantes).find((variant) => {
    const values = variantValues(variant);
    const key = Object.keys(values).find(isColorName);
    return key ? normalizeText(values[key]) === target && Boolean(variant?.imagenUrl) : false;
  });
  return match?.imagenUrl || null;
};

export const getFashionColorGallery = (producto: any, colorValue: string): string[] => {
  const target = normalizeText(colorValue);
  const attrs = producto?.atributosTecnicos || {};
  const rawGallery =
    attrs?.galeriaPorColor ||
    attrs?.galeriaImagenesPorColor ||
    attrs?.imagenesPorColor ||
    {};
  const gallery = typeof rawGallery === 'string'
    ? (() => {
        try {
          const parsed = JSON.parse(rawGallery);
          return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        } catch {
          return {};
        }
      })()
    : rawGallery;

  const direct = Array.isArray(gallery?.[colorValue]) ? gallery[colorValue] : null;
  const normalizedKey = Object.keys(gallery || {}).find((key) => normalizeText(key) === target);
  const byNormalized = normalizedKey && Array.isArray(gallery?.[normalizedKey]) ? gallery[normalizedKey] : null;
  const principal = getFashionColorImage(producto, colorValue);
  const urls = [principal, ...(direct || byNormalized || [])].filter(Boolean) as string[];
  const seen = new Set<string>();
  return urls.filter((url) => {
    const key = (() => {
      try { return new URL(url).pathname; } catch { return url; }
    })();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getFashionColors = (producto: any): FashionColorOption[] => {
  // Si el producto DECLARA opciones, la opción "Color" es la única fuente de verdad:
  // así, un producto solo-talla (sin opción Color) no muestra colores, aunque su
  // listado traiga variantes fantasma con colores que no coinciden con las opciones.
  // Solo los productos sin opciones declaradas (legacy) derivan de las variantes.
  const hasOptions = normalizeArray(producto?.opcionesAtributos).length > 0;
  const values = hasOptions
    ? valuesFromOptions(producto, isColorName)
    : valuesFromVariants(producto, isColorName);
  const colorMap = colorMapFromProducto(producto);
  return values.map((name) => ({
    name,
    hex: resolveColorHex(name, colorMap),
    image: getFashionColorImage(producto, name),
  }));
};

export const getFashionSizes = (producto: any): string[] => {
  // Misma regla que en colores: la opción "Talla" declarada manda; si no hay opciones
  // declaradas, se cae a las variantes (legacy). Evita tallas fantasma como "Única".
  const hasOptions = normalizeArray(producto?.opcionesAtributos).length > 0;
  return hasOptions
    ? valuesFromOptions(producto, isSizeName)
    : valuesFromVariants(producto, isSizeName);
};

export const getDefaultVariantSelection = (producto: any) => {
  const variantes = normalizeArray(producto?.variantes);
  if (!variantes.length) return {};

  // Color por defecto = primer color de las opciones (orden del admin) que tenga
  // alguna variante con stock; si ninguno tiene stock, el primer color de la lista.
  const colors = valuesFromOptions(producto, isColorName);
  if (colors.length) {
    const colorKey = Object.keys(variantValues(variantes[0])).find(isColorName) || 'Color';
    const preferred = colors.find((color) =>
      variantes.some((v) => variantValues(v)[colorKey] === color && Number(v?.stock ?? 0) > 0),
    ) || colors[0];
    const firstOfColor = variantes.find((v) => variantValues(v)[colorKey] === preferred && Number(v?.stock ?? 0) > 0)
      || variantes.find((v) => variantValues(v)[colorKey] === preferred);
    if (firstOfColor) return variantValues(firstOfColor);
  }

  const firstVariant = variantes.find((variant) => Number(variant?.stock ?? 0) > 0) || variantes[0];
  return firstVariant ? variantValues(firstVariant) : {};
};

export const findFashionVariant = (producto: any, selection: VariantValueMap) => {
  const selectedEntries = Object.entries(selection).filter(([, value]) => value);
  if (!selectedEntries.length) return null;
  return normalizeArray(producto?.variantes).find((variant) => {
    const values = variantValues(variant);
    return selectedEntries.every(([name, value]) => values[name] === value);
  }) || null;
};

export const isFashionVariantAvailable = (producto: any, selection: VariantValueMap) => {
  const variants = normalizeArray(producto?.variantes);
  const selectedEntries = Object.entries(selection).filter(([, value]) => value);
  if (!variants.length || !selectedEntries.length) return true;

  return variants.some((variant) => {
    const values = variantValues(variant);
    const matches = selectedEntries.every(([name, value]) => values[name] === value);
    return matches && Number(variant?.stock ?? 0) > 0;
  });
};

export const getVariantOptionNames = (producto: any) => {
  const options = normalizeArray(producto?.opcionesAtributos);
  const color = options.find((option) => isColorName(option?.nombre))?.nombre;
  const size = options.find((option) => isSizeName(option?.nombre))?.nombre;
  const firstVariantValues = variantValues(normalizeArray(producto?.variantes)[0]);

  return {
    color: color || Object.keys(firstVariantValues).find(isColorName) || 'Color',
    size: size || Object.keys(firstVariantValues).find(isSizeName) || 'Talla',
  };
};
