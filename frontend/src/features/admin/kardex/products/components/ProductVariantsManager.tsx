import React, { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { useProductModalViewModel } from '../useProductModalViewModel';
import Button from '@/components/Button';
import useAlertStore from '@/zustand/alert';

type ViewProps = ReturnType<typeof useProductModalViewModel>;

type VariantOption = {
  nombre: string;
  valores: string[];
};

type VariantConfig = {
  id?: number;
  valoresAtributos: Record<string, string>;
  codigo?: string;
  precioUnitario?: number;
  stock?: number;
  imagenUrl?: string | null;
  imagenUrlDisplay?: string | null;
  codigoBarras?: string | null;
  estado?: 'ACTIVO' | 'INACTIVO';
};

type FashionColor = {
  name: string;
  hex: string;
  aliases?: string[];
};

const FASHION_COLOR_CATALOG: FashionColor[] = [
  { name: 'Negro', hex: '#111827', aliases: ['black', 'negra'] },
  { name: 'Blanco', hex: '#FFFFFF', aliases: ['white', 'blanca'] },
  { name: 'Gris', hex: '#9CA3AF', aliases: ['gray', 'grey', 'plomo'] },
  { name: 'Azul', hex: '#2563EB', aliases: ['blue', 'azulino'] },
  { name: 'Celeste', hex: '#38BDF8', aliases: ['sky', 'azul claro'] },
  { name: 'Rojo', hex: '#DC2626', aliases: ['red', 'roja'] },
  { name: 'Vino', hex: '#7F1D1D', aliases: ['guinda', 'borgoña', 'burdeos'] },
  { name: 'Verde', hex: '#16A34A', aliases: ['green', 'verde militar'] },
  { name: 'Amarillo', hex: '#FACC15', aliases: ['yellow'] },
  { name: 'Naranja', hex: '#F97316', aliases: ['orange'] },
  { name: 'Rosa', hex: '#F472B6', aliases: ['pink', 'rosado', 'rosada'] },
  { name: 'Morado', hex: '#7C3AED', aliases: ['purple', 'lila', 'violeta'] },
  { name: 'Beige', hex: '#D6C3A5', aliases: ['crema', 'arena'] },
  { name: 'Marrón', hex: '#8B5E34', aliases: ['marron', 'brown', 'café', 'cafe'] },
  { name: 'Dorado', hex: '#D4AF37', aliases: ['gold'] },
  { name: 'Plateado', hex: '#C0C0C0', aliases: ['silver', 'plata'] },
  { name: 'Multicolor', hex: 'linear-gradient(135deg,#ef4444,#f59e0b,#22c55e,#3b82f6,#8b5cf6)', aliases: ['multi color', 'estampado'] },
];

const comboKey = (combo: Record<string, string>) =>
  Object.entries(combo)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');

const normalizeCodeToken = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(0, 4)
    .toUpperCase();

const normalizePlainText = (value: string) =>
  String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const uniqueValues = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizePlainText(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const findFashionColor = (value: string) => {
  const key = normalizePlainText(value);
  return FASHION_COLOR_CATALOG.find((color) =>
    normalizePlainText(color.name) === key ||
    (color.aliases || []).some((alias) => normalizePlainText(alias) === key),
  );
};

const normalizeFashionColorValue = (value: string) => {
  const clean = String(value || '').trim();
  if (!clean) return '';
  return findFashionColor(clean)?.name || clean.replace(/\s+/g, ' ');
};

const generateCombinations = (options: VariantOption[]) => {
  const validOptions = options.filter((option) => option.nombre && option.valores.length > 0);
  if (validOptions.length === 0) return [];

  return validOptions.reduce<Record<string, string>[]>(
    (acc, option) =>
      acc.flatMap((combo) =>
        option.valores.map((value) => ({
          ...combo,
          [option.nombre]: value,
        })),
      ),
    [{}],
  );
};

export const ProductVariantsManager: React.FC<{ vm: ViewProps }> = ({ vm }) => {
  const isModaRubro = Boolean((vm as any)?.isModaRubro);
  const {
    formValues,
    setFormValues,
    variantImageFiles,
    setVariantImageFiles,
    variantImagePreviews,
    setVariantImagePreviews,
    variantGalleryImageFiles,
    setVariantGalleryImageFiles,
    variantGalleryImagePreviews,
    setVariantGalleryImagePreviews,
  } = vm;

  // Texto en edición de cada opción. Solo se confirma (parsea) al salir del campo,
  // para no re-derivar la matriz/imágenes en cada tecla y perder fotos por colores intermedios.
  const [editingValues, setEditingValues] = useState<Record<number, string>>({});
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#CBD5E1');
  // Valores para "aplicar a todas las variantes" de un solo golpe.
  const [bulkPrecio, setBulkPrecio] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  const opcionesAtributos: VariantOption[] = Array.isArray((formValues as any).opcionesAtributos)
    ? (formValues as any).opcionesAtributos
    : [];
  const variantesConfig: VariantConfig[] = Array.isArray((formValues as any).variantesConfig)
    ? (formValues as any).variantesConfig
    : [];
  const variantesExistentes: VariantConfig[] = Array.isArray((formValues as any).variantes)
    ? (formValues as any).variantes.map((variant: any) => ({
        id: variant.id,
        valoresAtributos: variant.valoresAtributos || {},
        codigo: variant.codigo || '',
        precioUnitario: Number(variant.precioUnitario || formValues.precioUnitario || 0),
        stock: Number(variant.stock || 0),
        imagenUrl: variant.imagenUrl || '',
        imagenUrlDisplay: variant.imagenUrlDisplay || variant.imagenUrl || '',
        codigoBarras: variant.codigoBarras || '',
        estado: variant.estado || 'ACTIVO',
      }))
    : [];

  const hasColorOption = useMemo(
    () => opcionesAtributos.some((option) => /color|colour/i.test(option.nombre || '')),
    [opcionesAtributos],
  );

  const colorOptionName = useMemo(() => {
    const colorOption = opcionesAtributos.find((option) =>
      /color|colour/i.test(option.nombre || ''),
    );
    return colorOption?.nombre || opcionesAtributos[0]?.nombre || 'Color';
  }, [opcionesAtributos]);

  const combinations = useMemo(() => generateCombinations(opcionesAtributos), [opcionesAtributos]);
  // Solo agrupamos imágenes por color cuando existe una opción "Color" real. Para
  // productos solo-talla (p. ej. zapatillas sin color) no mostramos "Imágenes por color"
  // y se usa la imagen principal del producto para todas las tallas.
  const colorValues = useMemo(
    () => (hasColorOption
      ? Array.from(new Set(combinations.map((combo) => combo[colorOptionName]).filter(Boolean)))
      : []),
    [hasColorOption, colorOptionName, combinations],
  );

  const galleryByColor: Record<string, string[]> = useMemo(() => {
    const attrs = ((formValues as any).atributosTecnicos || {}) as Record<string, any>;
    const raw = attrs.galeriaPorColor;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  }, [formValues]);

  const colorMap: Record<string, string> = useMemo(() => {
    const attrs = ((formValues as any).atributosTecnicos || {}) as Record<string, any>;
    const raw = attrs.coloresTienda;
    return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  }, [formValues]);

  const colorOptionIndex = useMemo(
    () => opcionesAtributos.findIndex((option) => /color|colour/i.test(option.nombre || '')),
    [opcionesAtributos],
  );

  const selectedColorValues = useMemo(
    () => (colorOptionIndex >= 0 ? opcionesAtributos[colorOptionIndex]?.valores || [] : []),
    [colorOptionIndex, opcionesAtributos],
  );

  const getColorSwatchValue = (color: string) => colorMap[color] || findFashionColor(color)?.hex || '#CBD5E1';

  const buildColorMap = (options: VariantOption[], previousMap: Record<string, string> = colorMap) => {
    const colorOption = options.find((option) => /color|colour/i.test(option.nombre || ''));
    if (!colorOption) return {};
    return (colorOption.valores || []).reduce<Record<string, string>>((acc, color) => {
      const known = findFashionColor(color);
      acc[color] = previousMap[color] || known?.hex || '#CBD5E1';
      return acc;
    }, {});
  };

  const buildConfig = (options: VariantOption[], previous: VariantConfig[] = variantesConfig) => {
    const combos = generateCombinations(options);
    const previousRows = previous.length > 0 ? previous : variantesExistentes;
    const previousByKey = new Map(previousRows.map((row) => [comboKey(row.valoresAtributos || {}), row]));
    const imageByColor = new Map<string, Pick<VariantConfig, 'imagenUrl' | 'imagenUrlDisplay'>>();
    const nextColorOptionName = options.find((option) => /color|colour/i.test(option.nombre || ''))?.nombre || colorOptionName;

    previousRows.forEach((row) => {
      const color = row.valoresAtributos?.[nextColorOptionName] || row.valoresAtributos?.[colorOptionName];
      if (color && (row.imagenUrl || row.imagenUrlDisplay) && !imageByColor.has(color)) {
        imageByColor.set(color, {
          imagenUrl: row.imagenUrl,
          imagenUrlDisplay: row.imagenUrlDisplay,
        });
      }
    });

    return combos.map((combo, index) => {
      const key = comboKey(combo);
      const previousRow = previousByKey.get(key);
      const colorImage = imageByColor.get(combo[nextColorOptionName]);
      const codeSuffix = Object.values(combo).map(normalizeCodeToken).filter(Boolean).join('-');

      return {
        valoresAtributos: combo,
        codigo: previousRow?.codigo || `${formValues.codigo || 'VAR'}-${codeSuffix || index + 1}`.slice(0, 60),
        precioUnitario: Number(previousRow?.precioUnitario ?? formValues.precioUnitario ?? 0),
        stock: Number(previousRow?.stock ?? 0),
        imagenUrl: previousRow?.imagenUrl || colorImage?.imagenUrl || '',
        imagenUrlDisplay: previousRow?.imagenUrlDisplay || colorImage?.imagenUrlDisplay || '',
        codigoBarras: previousRow?.codigoBarras || '',
        estado: previousRow?.estado || 'ACTIVO',
      };
    });
  };

  const commitOptionsAndConfig = (nextOptions: VariantOption[], previousConfig = variantesConfig) => {
    const nextConfig = buildConfig(nextOptions, previousConfig);
    const stockTotal = nextConfig.reduce((sum, row) => sum + Number(row.stock || 0), 0);
    const nextColorMap = buildColorMap(nextOptions);
    setFormValues({
      ...formValues,
      opcionesAtributos: nextOptions,
      variantesConfig: nextConfig,
      stock: nextConfig.length > 0 ? stockTotal : formValues.stock,
      atributosTecnicos: {
        ...((formValues as any).atributosTecnicos || {}),
        coloresTienda: nextColorMap,
      },
    } as any);
  };

  const updateOptionName = (index: number, name: string) => {
    const next = [...opcionesAtributos];
    next[index] = { ...next[index], nombre: name };
    commitOptionsAndConfig(next);
  };

  const updateOptionValues = (index: number, valuesStr: string) => {
    const next = [...opcionesAtributos];
    const oldValues = next[index]?.valores || [];
    const isColorOption = /color|colour/i.test(next[index]?.nombre || '');
    const newValues = uniqueValues(valuesStr
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => isColorOption ? normalizeFashionColorValue(value) : value));
    next[index] = { ...next[index], valores: newValues };

    // Si es la opción de color y solo se renombró (misma cantidad de valores),
    // migrar la imagen del color viejo al nuevo para no perderla ni re-subirla.
    let previousConfig = variantesConfig;

    if (isColorOption && oldValues.length === newValues.length) {
      const renames: Record<string, string> = {};
      oldValues.forEach((oldVal, i) => {
        if (oldVal && newValues[i] && oldVal !== newValues[i]) renames[oldVal] = newValues[i];
      });

      if (Object.keys(renames).length > 0) {
        const nextFiles = { ...variantImageFiles };
        const nextPreviews = { ...variantImagePreviews };
        Object.entries(renames).forEach(([oldColor, newColor]) => {
          if (nextFiles[oldColor] !== undefined) { nextFiles[newColor] = nextFiles[oldColor]; delete nextFiles[oldColor]; }
          if (nextPreviews[oldColor] !== undefined) { nextPreviews[newColor] = nextPreviews[oldColor]; delete nextPreviews[oldColor]; }
        });
        setVariantImageFiles(nextFiles);
        setVariantImagePreviews(nextPreviews);

        // Renombrar el color en la config previa para conservar la imagenUrl ya subida
        const base = variantesConfig.length > 0 ? variantesConfig : variantesExistentes;
        previousConfig = base.map((row) => {
          const color = row.valoresAtributos?.[colorOptionName];
          return color && renames[color]
            ? { ...row, valoresAtributos: { ...row.valoresAtributos, [colorOptionName]: renames[color] } }
            : row;
        });
      }
    }

    commitOptionsAndConfig(next, previousConfig);
  };

  const addOption = () => {
    const defaultName = opcionesAtributos.length === 0 ? 'Color' : opcionesAtributos.length === 1 ? 'Talla' : '';
    commitOptionsAndConfig([...opcionesAtributos, { nombre: defaultName, valores: [] }]);
  };

  const removeOption = (index: number) => {
    commitOptionsAndConfig(opcionesAtributos.filter((_, optionIndex) => optionIndex !== index));
  };

  const applyFashionPreset = () => {
    commitOptionsAndConfig([
      { nombre: 'Color', valores: ['Negro', 'Blanco', 'Beige'] },
      { nombre: 'Talla', valores: ['S', 'M', 'L'] },
    ]);
  };

  const applyPresentacionPreset = () => {
    commitOptionsAndConfig([
      { nombre: 'Presentación', valores: ['500g', '750g', '1kg'] },
    ]);
  };

  const setColorValues = (values: string[]) => {
    const normalized = uniqueValues(values.map(normalizeFashionColorValue).filter(Boolean));
    if (colorOptionIndex >= 0) {
      const next = [...opcionesAtributos];
      next[colorOptionIndex] = { ...next[colorOptionIndex], valores: normalized };
      commitOptionsAndConfig(next);
      return;
    }
    commitOptionsAndConfig([{ nombre: 'Color', valores: normalized }, ...opcionesAtributos]);
  };

  const toggleCatalogColor = (colorName: string) => {
    const exists = selectedColorValues.some((value) => normalizePlainText(value) === normalizePlainText(colorName));
    setColorValues(exists
      ? selectedColorValues.filter((value) => normalizePlainText(value) !== normalizePlainText(colorName))
      : [...selectedColorValues, colorName]);
  };

  const addCustomColor = () => {
    if (!customColorName.trim()) {
      useAlertStore.getState().alert('Ingresa el nombre del color personalizado', 'error');
      return;
    }
    if (!/^#[0-9A-F]{6}$/i.test(customColorHex.trim())) {
      useAlertStore.getState().alert('El color personalizado debe tener formato HEX. Ej: #0F4C5C', 'error');
      return;
    }
    const normalizedName = normalizeFashionColorValue(customColorName);
    const nextColorMap = {
      ...colorMap,
      [normalizedName]: customColorHex.trim(),
    };
    const normalized = uniqueValues([...selectedColorValues, normalizedName]);
    const nextOptions = colorOptionIndex >= 0
      ? opcionesAtributos.map((option, index) => index === colorOptionIndex ? { ...option, valores: normalized } : option)
      : [{ nombre: 'Color', valores: normalized }, ...opcionesAtributos];
    const nextConfig = buildConfig(nextOptions);
    const stockTotal = nextConfig.reduce((sum, row) => sum + Number(row.stock || 0), 0);
    setFormValues({
      ...formValues,
      opcionesAtributos: nextOptions,
      variantesConfig: nextConfig,
      stock: nextConfig.length > 0 ? stockTotal : formValues.stock,
      atributosTecnicos: {
        ...((formValues as any).atributosTecnicos || {}),
        coloresTienda: buildColorMap(nextOptions, nextColorMap),
      },
    } as any);
    setCustomColorName('');
    setCustomColorHex('#CBD5E1');
  };

  const updateVariant = (key: string, patch: Partial<VariantConfig>) => {
    // Usamos la forma funcional de setFormValues para leer SIEMPRE la config más
    // reciente. Al escanear con lector el foco salta variante por variante y dispara
    // varios updateVariant en ráfaga; con el spread de `formValues` (closure) cada
    // llamada partía de un snapshot viejo y descartaba los códigos de barras recién
    // escritos, por eso "no se seteaban" hasta un segundo guardado.
    setFormValues((prev: any) => {
      const prevOptions: VariantOption[] = Array.isArray(prev?.opcionesAtributos)
        ? prev.opcionesAtributos
        : opcionesAtributos;
      const prevConfig: VariantConfig[] = Array.isArray(prev?.variantesConfig)
        ? prev.variantesConfig
        : variantesConfig;
      const nextConfig = buildConfig(prevOptions, prevConfig).map((row) =>
        comboKey(row.valoresAtributos) === key ? { ...row, ...patch } : row,
      );
      const stockTotal = nextConfig.reduce((sum, row) => sum + Number(row.stock || 0), 0);
      return {
        ...prev,
        variantesConfig: nextConfig,
        stock: stockTotal,
      };
    });
  };

  // Aplica un mismo valor (precio y/o stock) a TODAS las variantes a la vez.
  // Útil cuando hay muchas combinaciones que comparten precio.
  const patchAllVariants = (patch: Partial<VariantConfig>, recomputeStock = false) => {
    setFormValues((prev: any) => {
      const prevOptions: VariantOption[] = Array.isArray(prev?.opcionesAtributos)
        ? prev.opcionesAtributos
        : opcionesAtributos;
      const prevConfig: VariantConfig[] = Array.isArray(prev?.variantesConfig)
        ? prev.variantesConfig
        : variantesConfig;
      const nextConfig = buildConfig(prevOptions, prevConfig).map((row) => ({ ...row, ...patch }));
      const next: any = { ...prev, variantesConfig: nextConfig };
      if (recomputeStock) {
        next.stock = nextConfig.reduce((sum, row) => sum + Number(row.stock || 0), 0);
      }
      return next;
    });
  };

  const applyPriceToAll = () => {
    if (bulkPrecio.trim() === '') return;
    const value = Number(bulkPrecio);
    if (Number.isNaN(value) || value < 0) return;
    patchAllVariants({ precioUnitario: value });
  };

  const applyStockToAll = () => {
    if (bulkStock.trim() === '') return;
    const value = Number(bulkStock);
    if (Number.isNaN(value) || value < 0) return;
    patchAllVariants({ stock: value }, true);
  };

  const handleColorImage = (color: string, file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      useAlertStore.getState().alert('El archivo debe ser una imagen', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      useAlertStore.getState().alert('La imagen no debe superar 2MB', 'error');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setVariantImageFiles({ ...variantImageFiles, [color]: file });
    setVariantImagePreviews({ ...variantImagePreviews, [color]: previewUrl });
  };

  const updateGalleryByColor = (nextGallery: Record<string, string[]>) => {
    setFormValues({
      ...formValues,
      atributosTecnicos: {
        ...((formValues as any).atributosTecnicos || {}),
        galeriaPorColor: nextGallery,
      },
    } as any);
  };

  const handleColorGalleryImages = (color: string, files?: FileList | null) => {
    const selected = Array.from(files || []);
    if (!selected.length) return;
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        useAlertStore.getState().alert('Todos los archivos deben ser imágenes', 'error');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        useAlertStore.getState().alert('Cada imagen no debe superar 2MB', 'error');
        return;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    setVariantGalleryImageFiles({
      ...variantGalleryImageFiles,
      [color]: [...(variantGalleryImageFiles[color] || []), ...validFiles],
    });
    setVariantGalleryImagePreviews({
      ...variantGalleryImagePreviews,
      [color]: [...(variantGalleryImagePreviews[color] || []), ...validPreviews],
    });
  };

  const removeExistingGalleryImage = (color: string, url: string) => {
    updateGalleryByColor({
      ...galleryByColor,
      [color]: (galleryByColor[color] || []).filter((image) => image !== url),
    });
  };

  const removePendingGalleryImage = (color: string, index: number) => {
    const nextFiles = { ...variantGalleryImageFiles };
    const nextPreviews = { ...variantGalleryImagePreviews };
    nextFiles[color] = (nextFiles[color] || []).filter((_, imageIndex) => imageIndex !== index);
    nextPreviews[color] = (nextPreviews[color] || []).filter((_, imageIndex) => imageIndex !== index);
    if (!nextFiles[color]?.length) delete nextFiles[color];
    if (!nextPreviews[color]?.length) delete nextPreviews[color];
    setVariantGalleryImageFiles(nextFiles);
    setVariantGalleryImagePreviews(nextPreviews);
  };

  const removeColorImage = (color: string) => {
    const nextFiles = { ...variantImageFiles };
    const nextPreviews = { ...variantImagePreviews };
    delete nextFiles[color];
    delete nextPreviews[color];
    setVariantImageFiles(nextFiles);
    setVariantImagePreviews(nextPreviews);

    const nextConfig = buildConfig(opcionesAtributos).map((row) =>
      row.valoresAtributos?.[colorOptionName] === color
        ? { ...row, imagenUrl: '', imagenUrlDisplay: '' }
        : row,
    );
    setFormValues({ ...formValues, variantesConfig: nextConfig } as any);
  };

  const usaVariantes = isModaRubro || Boolean(vm.features?.usaVariantes);
  if (vm.isFarmacia || vm.isRestaurante || !usaVariantes) return null;

  const rows = buildConfig(opcionesAtributos);

  return (
    <div className="col-span-1 md:col-span-2 mt-4 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-5 dark:border-violet-900/40 dark:from-violet-950/20 dark:to-slate-950/10">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h5 className="flex items-center gap-2 text-sm font-black text-violet-900 dark:text-violet-300">
            <Icon icon="solar:layers-minimalistic-bold-duotone" width={20} />
            {isModaRubro ? 'Variantes avanzadas para moda' : 'Variantes del producto'}
          </h5>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {isModaRubro
              ? 'Crea matriz Color × Talla con stock, SKU, precio e imagen por color para ropa, calzado y carteras.'
              : 'Crea variantes (presentación, peso, tamaño) con stock, SKU, precio e imagen propia.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" outline color="primary" onClick={isModaRubro ? applyFashionPreset : applyPresentacionPreset} className="px-3 py-1.5 text-xs">
            <Icon icon="solar:magic-stick-3-bold-duotone" width={15} className="mr-1.5" />
            {isModaRubro ? 'Preset moda' : 'Preset presentación'}
          </Button>
          <Button type="button" outline color="primary" onClick={addOption} className="px-3 py-1.5 text-xs">
            <Icon icon="solar:add-circle-bold" width={15} className="mr-1.5" />
            Añadir opción
          </Button>
        </div>
      </div>

      {(isModaRubro || hasColorOption) && (
      <div className="mt-4 rounded-2xl border border-violet-100 bg-white/80 p-4 dark:border-violet-900/40 dark:bg-slate-900/50">
        <div className="mb-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h6 className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">
              Colores disponibles para tienda virtual
            </h6>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Usa estos colores para que los filtros y swatches de la tienda salgan ordenados.
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            {selectedColorValues.length} seleccionados
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {FASHION_COLOR_CATALOG.map((color) => {
            const selected = selectedColorValues.some((value) => normalizePlainText(value) === normalizePlainText(color.name));
            return (
              <button
                key={color.name}
                type="button"
                onClick={() => toggleCatalogColor(color.name)}
                className={`flex min-h-[42px] items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
                  selected
                    ? 'border-violet-400 bg-violet-50 text-violet-900 ring-2 ring-violet-100 dark:border-violet-500 dark:bg-violet-950/30 dark:text-violet-200 dark:ring-violet-950'
                    : 'border-gray-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-black/10 shadow-inner"
                  style={{ background: color.hex }}
                />
                <span className="truncate text-xs font-black">{color.name}</span>
                {selected && <Icon icon="solar:check-circle-bold" width={15} className="ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-950/20 md:grid-cols-[1fr_132px_auto]">
          <input
            type="text"
            value={customColorName}
            onChange={(event) => setCustomColorName(event.target.value)}
            placeholder="Color personalizado. Ej: Azul petróleo"
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-900">
            <span
              className="h-5 w-5 shrink-0 rounded-full border border-black/10"
              style={{ background: customColorHex }}
            />
            <input
              type="text"
              value={customColorHex}
              onChange={(event) => setCustomColorHex(event.target.value.toUpperCase())}
              placeholder="#CBD5E1"
              maxLength={7}
              className="min-w-0 flex-1 bg-transparent text-xs font-black text-slate-800 outline-none dark:text-white"
            />
          </div>
          <button
            type="button"
            onClick={addCustomColor}
            className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-violet-700 dark:bg-white dark:text-slate-950 dark:hover:bg-violet-200"
          >
            Agregar color
          </button>
        </div>

        {selectedColorValues.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedColorValues.map((color) => {
              const swatch = getColorSwatchValue(color);
              return (
                <span
                  key={color}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ background: swatch }}
                  />
                  {color}
                </span>
              );
            })}
          </div>
        )}
      </div>
      )}

      <div className="mt-4 space-y-3">
        {opcionesAtributos.length === 0 && (
          isModaRubro ? (
            <button
              type="button"
              onClick={applyFashionPreset}
              className="w-full rounded-2xl border border-dashed border-violet-200 bg-white/70 p-5 text-left transition hover:border-violet-400 hover:bg-violet-50 dark:border-violet-900/40 dark:bg-slate-900/40 dark:hover:bg-violet-950/20"
            >
              <span className="block text-sm font-black text-gray-900 dark:text-white">Configurar tallas y colores</span>
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">Ejemplo: Color Negro/Blanco/Beige y Talla S/M/L.</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={applyPresentacionPreset}
              className="w-full rounded-2xl border border-dashed border-amber-200 bg-white/70 p-5 text-left transition hover:border-amber-400 hover:bg-amber-50 dark:border-amber-900/40 dark:bg-slate-900/40 dark:hover:bg-amber-950/20"
            >
              <span className="block text-sm font-black text-gray-900 dark:text-white">Configurar presentaciones (peso)</span>
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">Ejemplo: Presentación 500g / 750g / 1kg. Cada una con su stock y precio.</span>
            </button>
          )
        )}

        {opcionesAtributos.map((option, index) => (
          <div key={index} className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900 md:grid-cols-[180px_1fr_40px]">
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">Opción</span>
              <input
                type="text"
                placeholder="Color / Talla"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={option.nombre}
                onChange={(event) => updateOptionName(index, event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">Valores separados por coma</span>
              <input
                type="text"
                placeholder="Ej: Negro, Blanco, Beige"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                value={editingValues[index] ?? (option.valores || []).join(', ')}
                onChange={(event) => setEditingValues((prev) => ({ ...prev, [index]: event.target.value }))}
                onBlur={() => {
                  if (editingValues[index] !== undefined) {
                    updateOptionValues(index, editingValues[index]);
                    setEditingValues((prev) => {
                      const next = { ...prev };
                      delete next[index];
                      return next;
                    });
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') (event.target as HTMLInputElement).blur();
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => removeOption(index)}
              className="mt-5 flex h-10 w-10 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/30"
              title="Eliminar opción"
            >
              <Icon icon="solar:trash-bin-trash-bold" width={18} />
            </button>
          </div>
        ))}
      </div>

      {colorValues.length > 0 && (
        <div className="mt-5 rounded-2xl border border-white/70 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-950/20">
          <div className="mb-3 flex items-center justify-between">
            <h6 className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Imágenes por color</h6>
            <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-300">Se aplican a todas sus tallas</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {colorValues.map((color) => {
              const rowWithImage = rows.find(
                (row) => row.valoresAtributos?.[colorOptionName] === color && (row.imagenUrlDisplay || row.imagenUrl),
              );
              const preview = variantImagePreviews[color] || rowWithImage?.imagenUrlDisplay || rowWithImage?.imagenUrl || '';
              const savedGallery = galleryByColor[color] || [];
              const pendingGallery = variantGalleryImagePreviews[color] || [];
              return (
                <div key={color} className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-black text-gray-800 dark:text-white">{color}</span>
                    {(preview || variantImageFiles[color]) && (
                      <button type="button" onClick={() => removeColorImage(color)} className="text-[10px] font-bold text-red-500">
                        Quitar
                      </button>
                    )}
                  </div>
                  <label className="flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center text-[11px] font-bold text-gray-500 dark:text-gray-400 transition hover:border-violet-400 dark:border-slate-700 dark:bg-slate-800">
                    {preview ? (
                      <img src={preview} alt={color} className="h-full w-full object-cover" />
                    ) : (
                      <span>
                        <Icon icon="solar:gallery-add-bold-duotone" width={22} className="mx-auto mb-1" />
                        Subir imagen
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleColorImage(color, event.target.files?.[0])}
                    />
                  </label>
                  <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-2 dark:border-white/10 dark:bg-slate-950/30">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Galería del color
                      </span>
                      <label className="cursor-pointer rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700 transition hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300">
                        + Fotos
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(event) => {
                            handleColorGalleryImages(color, event.target.files);
                            event.currentTarget.value = '';
                          }}
                        />
                      </label>
                    </div>
                    {savedGallery.length === 0 && pendingGallery.length === 0 ? (
                      <p className="py-3 text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                        Agrega fotos frontal, espalda o detalle para este color.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {savedGallery.map((url) => (
                          <div key={url} className="group relative h-16 overflow-hidden rounded-lg bg-white dark:bg-slate-800">
                            <img src={url} alt={`${color} galería`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeExistingGalleryImage(color, url)}
                              className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                              title="Quitar foto"
                            >
                              <Icon icon="solar:close-circle-bold" width={13} />
                            </button>
                          </div>
                        ))}
                        {pendingGallery.map((url, index) => (
                          <div key={`${url}-${index}`} className="group relative h-16 overflow-hidden rounded-lg bg-white dark:bg-slate-800 ring-2 ring-violet-300">
                            <img src={url} alt={`${color} nueva foto`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removePendingGalleryImage(color, index)}
                              className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white group-hover:flex"
                              title="Quitar foto"
                            >
                              <Icon icon="solar:close-circle-bold" width={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-gray-100 bg-violet-50/60 px-4 py-2 text-[11px] font-semibold text-violet-700 dark:border-slate-800 dark:bg-violet-950/20 dark:text-violet-300">
            <span>💡</span>
            <span>Consejo: haz clic en el primer campo <b>Barras</b> y escanea cada prenda con el lector — el foco salta solo a la siguiente variante.</span>
          </div>
          {/* Aplicar el mismo precio/stock a todas las variantes de una sola vez */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-[11px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400">Aplicar a todas ({rows.length})</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500">S/</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={bulkPrecio}
                onChange={(event) => setBulkPrecio(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyPriceToAll(); } }}
                placeholder="Precio"
                className="w-24 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={applyPriceToAll}
                disabled={bulkPrecio.trim() === ''}
                className="rounded-lg btn-accent px-3 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                Aplicar precio
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                value={bulkStock}
                onChange={(event) => setBulkStock(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyStockToAll(); } }}
                placeholder="Stock"
                className="w-24 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={applyStockToAll}
                disabled={bulkStock.trim() === ''}
                className="rounded-lg border border-violet-300 px-3 py-1.5 text-[11px] font-bold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950/30"
              >
                Aplicar stock
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-[10px] font-black uppercase tracking-wide text-gray-500 dark:text-gray-400 dark:border-slate-700 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3">Variante</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Barras</th>
                  <th className="px-4 py-3">Activo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const key = comboKey(row.valoresAtributos);
                  return (
                    <tr key={key} className="border-b border-gray-100 last:border-0 dark:border-slate-800">
                      <td className="px-4 py-3">
                        <div className="font-black text-gray-900 dark:text-white">
                          {Object.values(row.valoresAtributos).join(' / ')}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          {Object.entries(row.valoresAtributos).map(([name, value]) => `${name}: ${value}`).join(' · ')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={row.codigo || ''}
                          onChange={(event) => updateVariant(key, { codigo: event.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.01"
                          value={row.precioUnitario ?? 0}
                          onChange={(event) => updateVariant(key, { precioUnitario: Number(event.target.value || 0) })}
                          className="w-28 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={row.stock ?? 0}
                          onChange={(event) => updateVariant(key, { stock: Number(event.target.value || 0) })}
                          className="w-24 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={row.codigoBarras || ''}
                          onChange={(event) => updateVariant(key, { codigoBarras: event.target.value })}
                          data-barras-idx={rowIndex}
                          onKeyDown={(event) => {
                            // Los lectores USB envían Enter al final del código: saltamos
                            // al campo de barras de la siguiente variante para escanear en cadena.
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              const next = document.querySelector<HTMLInputElement>(
                                `input[data-barras-idx="${rowIndex + 1}"]`,
                              );
                              if (next) { next.focus(); next.select(); }
                              else (event.target as HTMLInputElement).blur();
                            }
                          }}
                          placeholder="Escanea o escribe"
                          className="w-36 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => updateVariant(key, { estado: row.estado === 'INACTIVO' ? 'ACTIVO' : 'INACTIVO' })}
                          className={`rounded-full px-3 py-1 text-[11px] font-black ${
                            row.estado === 'INACTIVO'
                              ? 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {row.estado === 'INACTIVO' ? 'Inactivo' : 'Activo'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
