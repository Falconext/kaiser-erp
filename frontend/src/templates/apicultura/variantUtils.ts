import { getProductPricing } from '@/templates/shared/pricing';

export type ApiculturaVariantValue = {
  label: string;
  hex?: string;
};

export type ApiculturaVariantOption = {
  name: string;
  type: 'color' | 'peso' | 'presentacion' | 'tipo' | 'talla' | 'default';
  values: ApiculturaVariantValue[];
};

export type ApiculturaVariantChoice = {
  key: string;
  id?: number | string;
  attrs: Record<string, string>;
  label: string;
  precioFinal: number;
  precioRegular: number;
  enOferta: boolean;
  porcentajeDescuento: number;
  stock: number;
  image: string;
  raw: any;
};

export type ApiculturaVariantData = {
  options: ApiculturaVariantOption[];
  choices: ApiculturaVariantChoice[];
  defaultSelection: Record<string, string>;
  signature: string;
};

const normalizeText = (value: any) =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const unique = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeText(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toNumber = (...values: any[]) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const attrType = (name: string): ApiculturaVariantOption['type'] => {
  const key = normalizeText(name);
  if (/color|colour|tono/.test(key)) return 'color';
  if (/peso|weight|gram|gr|kg|kil/.test(key)) return 'peso';
  if (/presentacion|presentaci|formato|envase/.test(key)) return 'presentacion';
  if (/tipo|variedad|sabor/.test(key)) return 'tipo';
  if (/talla|tamano|size/.test(key)) return 'talla';
  return 'default';
};

const colorCatalog: Record<string, string> = {
  amarillo: '#FACC15',
  ambar: '#D97706',
  amber: '#D97706',
  blanco: '#FFFFFF',
  cafe: '#8B5E34',
  marron: '#8B5E34',
  dorado: '#D4AF37',
  naranja: '#F97316',
  natural: '#F8C146',
  negro: '#111827',
  rojo: '#DC2626',
  verde: '#16A34A',
};

export function colorValueHex(value: string, producto?: any) {
  const attrs = producto?.atributosTecnicos || {};
  const map = attrs?.coloresTienda && typeof attrs.coloresTienda === 'object' ? attrs.coloresTienda : {};
  const exact = map[value];
  if (exact) return exact;
  return colorCatalog[normalizeText(value)] || '#FACC15';
}

function optionNameMap(producto: any) {
  const options = Array.isArray(producto?.opcionesAtributos) ? producto.opcionesAtributos : [];
  return new Map(options.map((option: any) => [normalizeText(option?.nombre), String(option?.nombre || '').trim()]));
}

function normalizeAttrs(producto: any, variant: any, fallbackIndex: number) {
  const optionsMap = optionNameMap(producto);
  const rawAttrs = variant?.valoresAtributos || variant?.atributos || variant?.opciones || {};
  const attrs: Record<string, string> = {};

  if (rawAttrs && typeof rawAttrs === 'object' && !Array.isArray(rawAttrs)) {
    Object.entries(rawAttrs).forEach(([name, value]) => {
      const cleanName = optionsMap.get(normalizeText(name)) || String(name || '').trim();
      const cleanValue = String(value || '').trim();
      if (cleanName && cleanValue) attrs[cleanName] = cleanValue;
    });
  }

  [
    ['Presentación', variant?.presentacion || variant?.presentación || variant?.formato || variant?.envase],
    ['Peso', variant?.peso || variant?.pesoNeto || variant?.weight],
    ['Tamaño', variant?.tamano || variant?.tamaño || variant?.size],
    ['Tipo', variant?.tipo || variant?.variedad || variant?.sabor],
    ['Color', variant?.color || variant?.tono],
    ['Talla', variant?.talla],
  ].forEach(([name, value]) => {
    const cleanValue = String(value || '').trim();
    if (cleanValue && !Object.values(attrs).some((current) => normalizeText(current) === normalizeText(cleanValue))) {
      attrs[String(name)] = cleanValue;
    }
  });

  const labelValue = variant?.nombre || variant?.valor || variant?.descripcion || variant?.label;
  if (Object.keys(attrs).length === 0 && labelValue) {
    attrs.Presentación = String(labelValue).trim();
  }

  if (Object.keys(attrs).length === 0) {
    attrs.Presentación = `Variante ${fallbackIndex + 1}`;
  }

  return attrs;
}

function normalizeChoices(producto: any): ApiculturaVariantChoice[] {
  const rawVariants = Array.isArray(producto?.variantes) && producto.variantes.length > 0
    ? producto.variantes
    : Array.isArray(producto?.variantesConfig) ? producto.variantesConfig : [];
  const basePricing = getProductPricing(producto);

  return rawVariants
    .filter((variant: any) => variant?.estado !== 'INACTIVO' && variant?.activo !== false)
    .map((variant: any, index: number) => {
      const attrs = normalizeAttrs(producto, variant, index);
      const extra = toNumber(variant?.precioExtra, variant?.precioAdicional, variant?.montoExtra);
      const hasDirectPrice = variant?.precioUnitario !== undefined || variant?.precioVenta !== undefined || variant?.precio !== undefined || variant?.precioOferta !== undefined;
      const pricing = hasDirectPrice
        ? getProductPricing({
            ...producto,
            precioRegular: variant?.precioRegular ?? variant?.precioOriginal ?? variant?.precioUnitario ?? variant?.precioVenta ?? variant?.precio,
            precioUnitario: variant?.precioUnitario ?? variant?.precioVenta ?? variant?.precio,
            precioOferta: variant?.precioOferta,
            enOferta: variant?.enOferta,
          })
        : {
            ...basePricing,
            precioFinal: basePricing.precioFinal + extra,
            precioRegular: basePricing.precioRegular + extra,
          };
      const precioFinal = Number(pricing.precioFinal || 0);
      const precioRegular = Number(pricing.precioRegular || precioFinal || 0);
      const enOferta = Boolean(pricing.enOferta && precioRegular > precioFinal);
      const porcentajeDescuento = enOferta ? Math.round(((precioRegular - precioFinal) / precioRegular) * 100) : 0;
      const label = Object.values(attrs).filter(Boolean).join(' / ');

      return {
        key: String(variant?.id || variant?.codigo || variant?.sku || label || index),
        id: variant?.id,
        attrs,
        label,
        precioFinal,
        precioRegular,
        enOferta,
        porcentajeDescuento,
        stock: toNumber(variant?.stock, variant?.stockDisponible, variant?.cantidad, producto?.stock),
        image: variant?.imagenUrlDisplay || variant?.imagenUrl || variant?.imagen || '',
        raw: variant,
      };
    });
}

export function getApiculturaVariantData(producto: any): ApiculturaVariantData {
  const choices = normalizeChoices(producto);
  const configuredOptions = Array.isArray(producto?.opcionesAtributos) ? producto.opcionesAtributos : [];
  const names = unique([
    ...configuredOptions.map((option: any) => String(option?.nombre || '').trim()),
    ...choices.flatMap((choice) => Object.keys(choice.attrs)),
  ]);

  const options = names
    .map((name) => {
      const configured = configuredOptions.find((option: any) => normalizeText(option?.nombre) === normalizeText(name));
      const values = unique([
        ...(Array.isArray(configured?.valores) ? configured.valores.map((value: any) => String(value || '').trim()) : []),
        ...choices.map((choice) => choice.attrs[name]).filter(Boolean),
      ]);
      return {
        name,
        type: attrType(name),
        values: values.map((label) => ({
          label,
          hex: attrType(name) === 'color' ? colorValueHex(label, producto) : undefined,
        })),
      };
    })
    .filter((option) => option.name && option.values.length > 0);

  const firstChoice = choices.find((choice) => choice.stock > 0) || choices[0];
  const defaultSelection = firstChoice?.attrs || {};
  return {
    options,
    choices,
    defaultSelection,
    signature: choices.map((choice) => `${choice.key}:${choice.label}:${choice.precioFinal}:${choice.stock}`).join('|'),
  };
}

export function findApiculturaVariant(choices: ApiculturaVariantChoice[], selection: Record<string, string>) {
  const selectedEntries = Object.entries(selection).filter(([, value]) => Boolean(value));
  if (selectedEntries.length === 0) return choices[0] || null;
  return choices.find((choice) =>
    selectedEntries.every(([name, value]) => normalizeText(choice.attrs[name]) === normalizeText(value)),
  ) || null;
}

export function optionValueAvailable(
  choices: ApiculturaVariantChoice[],
  selection: Record<string, string>,
  optionName: string,
  value: string,
) {
  const nextSelection = { ...selection, [optionName]: value };
  return choices.some((choice) =>
    Object.entries(nextSelection)
      .filter(([, selected]) => Boolean(selected))
      .every(([name, selected]) => normalizeText(choice.attrs[name]) === normalizeText(selected)),
  );
}

export function buildVariantCartItem(producto: any, variant: ApiculturaVariantChoice | null, cantidad: number) {
  const basePricing = getProductPricing(producto);
  const precioFinal = variant?.precioFinal ?? basePricing.precioFinal;
  const precioRegular = variant?.precioRegular ?? basePricing.precioRegular;
  const variantLabel = variant?.label ? ` - ${variant.label}` : '';
  const variantKey = variant?.id || variant?.key;

  return {
    ...producto,
    ...(variant?.raw || {}),
    id: variantKey ? `${producto.id}-var-${variantKey}` : producto.id,
    cartId: variantKey ? `${producto.id}-var-${variantKey}` : producto.id,
    productoId: producto.id,
    varianteId: variant?.id,
    variante: variant?.attrs,
    varianteLabel: variant?.label,
    descripcion: `${producto.descripcion}${variantLabel}`,
    cantidad,
    precioUnitario: precioFinal,
    precioRegular,
    enOferta: Boolean((variant?.enOferta ?? basePricing.enOferta) && precioRegular > precioFinal),
    imagenUrl: variant?.image || producto.imagenUrl,
  };
}
