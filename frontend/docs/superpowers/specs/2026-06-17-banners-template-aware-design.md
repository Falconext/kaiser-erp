# Banners Template-Aware — Diseño

**Fecha:** 2026-06-17  
**Estado:** Aprobado

## Resumen

El módulo de banners de la tienda virtual debe adaptarse automáticamente a la plantilla (`plantilla`) activa de la empresa. En lugar de mostrar siempre el mismo layout de 6 posiciones fijas, el panel admin muestra únicamente los slots que la plantilla usa, con su guía visual y límites correctos. Plantillas con slider muestran un carrusel; plantillas sin banners no muestran nada.

---

## 1. Modelo de datos (`resolveTemplate.ts`)

### Cambio principal

Reemplazar `showBanners: boolean` por `bannerSlots: BannerSlotDef[]`.

```ts
export interface BannerSlotDef {
  orden: number;        // coincide con Banner.orden en DB (sin cambio backend)
  tipo: 'hero' | 'side' | 'promo' | 'membership' | 'slider';
  label: string;        // nombre visible en admin
  description: string;  // texto de ayuda en la guía
  recomendado: string;  // dimensiones recomendadas, ej: "1200×500px"
}
```

`TemplateConfig` también recibe dos campos nuevos:

```ts
bannerIsSlider: boolean   // true = carrusel automático, false = layout clásico
bannerSlots: BannerSlotDef[]  // vacío = plantilla sin banners
```

`bannerIsSlider` es el booleano de lectura rápida. `bannerSlots` describe cada posición para la guía del admin. Cuando `bannerIsSlider: true`, los slots son hasta 3 entradas de tipo `'slider'`; cuando `false`, son las posiciones clásicas (hero, side, promo, membership). Límite de slides en modo slider: **3 fijo** (no necesita `maxCount` por slot).

### Asignación por plantilla

Las plantillas con layout clásico (hero + tarjetas laterales + promos):

| Plantilla | Slots |
|-----------|-------|
| `moderna` | hero(0), side(1), side(2), promo(3), promo(4), membership(5) |
| `minimal` | hero(0), side(1), side(2), promo(3), promo(4), membership(5) |
| `elegante` | hero(0), side(1), side(2), promo(3), promo(4), membership(5) |
| `mercado` | hero(0), side(1), side(2), promo(3), promo(4), membership(5) |
| `gadgets` | hero(0), side(1), side(2), promo(3), promo(4), membership(5) |
| `tecnica` | _(sin banners)_ |
| `salud` | _(sin banners)_ |
| `menu` | _(sin banners)_ |

Las plantillas con slider declaran sus slides así:
```ts
bannerSlots: [
  { orden: 0, tipo: 'slider', label: 'Slide 1', recomendado: '1400×500px', description: 'Primera diapositiva del carrusel', maxCount: 3 },
]
```
> **A confirmar en implementación:** qué plantilla(s) existentes usan slider, o si se crea una nueva. La estructura lo soporta sin cambios adicionales.

> Regla: si en el futuro se agrega un slot a una plantilla, declararlo en `bannerSlots` es suficiente — el admin y la tienda lo reconocen automáticamente.

### Utilidades nuevas

```ts
// Devuelve true si hay algún slot tipo 'slider'
export function isSliderTemplate(plantillaId?: string | null): boolean

// Devuelve el maxCount del primer slot slider, o 0
export function sliderMaxCount(plantillaId?: string | null): number
```

---

## 2. Panel admin — `Configuracion.tsx` + ViewModel

### Comportamiento según plantilla

| Caso | UI mostrada |
|------|-------------|
| `bannerSlots.length === 0` | Aviso: "Esta plantilla no usa banners" |
| Slots tipo `hero/side/promo/membership` | Guía visual generada desde `bannerSlots`, formulario con selector de orden filtrado |
| Slots tipo `slider` | Sección "Slides del carrusel", contador "X / 3 slides", upload habilitado solo si no se alcanzó `maxCount` |

### Guía visual (generada, no hardcodeada)

- Se renderiza iterando `bannerSlots` para mostrar cada posición con su `label`, `description` y `recomendado`
- Para slots tipo `slider`: se muestran como lista vertical de slides ordenados, con miniatura y botón de reordenar (drag o flechas arriba/abajo)
- Para slots clásicos: se mantiene el layout visual actual (hero grande + side apilados) pero generado desde los datos

### Selector de orden

El `<select>` de "Orden / Posición" solo muestra los órdenes declarados en `bannerSlots`. Órdenes fuera de los slots de la plantilla no aparecen.

### Límite de upload

- Plantilla slider: botón "Subir slide" oculto si `banners.filter(b => b.orden <= maxCount-1).length >= maxCount`
- Plantillas clásicas: comportamiento igual al actual (máx 6 total, validado por `featuresService`)

---

## 3. Componente tienda — `[slug].tsx`

### Lógica de renderizado

```tsx
const cfg = resolveTemplate(tienda?.plantilla);

// Slider
if (cfg.bannerSlots.some(s => s.tipo === 'slider') && cfg.bannerSlots[0].maxCount) {
  return <CarouselBanners tienda={tienda} />;
}

// Clásico
if (cfg.bannerSlots.some(s => s.tipo === 'hero')) {
  return <SliderBanners tienda={tienda} diseno={diseno} />;
}

// Sin banners → null
```

### `CarouselBanners.tsx` (nuevo componente)

- Lee `tienda.banners` filtrados por `orden < maxCount`, ordenados por `orden`
- Auto-avance cada 4 segundos con pausa al hover
- Dots de navegación en la parte inferior
- Swipe gesture en mobile (touch events)
- Transición CSS suave (fade o slide)
- Fallback: si no hay banners subidos, no renderiza nada (sin placeholder)

### Componentes existentes sin cambio

`SliderBanners`, `PromoBanners`, `MembershipBanner` — no se modifican. Solo cambia qué componente elige `[slug].tsx`.

---

## 4. Lo que NO cambia

- Modelo `Banner` en Prisma/DB — sin migraciones
- `banners.service.ts` y `banners.controller.ts` — sin cambios backend
- `featuresService` — sigue validando `tieneBanners` y `maxBanners` del plan

---

## 5. Archivos a modificar/crear

| Archivo | Acción |
|---------|--------|
| `src/components/tienda/resolveTemplate.ts` | Modificar: añadir `BannerSlotDef`, reemplazar `showBanners`, declarar slots por plantilla, añadir helpers |
| `src/features/admin/tienda/useConfiguracionTiendaViewModel.ts` | Modificar: exponer `bannerSlots` desde plantilla activa, ajustar lógica de límite de upload |
| `src/pages/admin/tienda/Configuracion.tsx` | Modificar: sección banners dinámica según `bannerSlots` |
| `src/pages/tienda/[slug].tsx` | Modificar: lógica de selección de componente banner |
| `src/components/tienda/CarouselBanners.tsx` | Crear: carrusel con auto-avance, dots, swipe |
