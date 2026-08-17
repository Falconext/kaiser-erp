# POS Farmacia-Aware — Sub-proyecto A

**Fecha:** 2026-06-01  
**Estado:** Aprobado (v3 — production-ready)  
**Rubros objetivo:** Farmacia, Botica, Droguería  
**Alcance:** Frontend (POS) + Backend (comprobante service + schema)

---

## Contexto

El POS actual funciona para cualquier rubro pero no tiene awareness de farmacia/droguería:
- Descuenta stock general sin respetar FEFO por lote
- No advierte de vencimientos próximos en caja
- No bloquea medicamentos controlados que requieren receta
- No informa al cajero de productos con cadena de frío

La infraestructura de lotes (`ProductoLote`, `MovimientoKardexLote`, FEFO en `producto-lote.service.ts`) ya existe. Este spec conecta esa infraestructura al flujo de venta.

---

## Distinción de rubros regulados

| Rubro | Descripción | Vende a |
|---|---|---|
| **Farmacia** | Propiedad exclusiva del Químico Farmacéutico | Público general |
| **Botica** | Propiedad de persona natural/jurídica; QF como director técnico | Público general |
| **Droguería** | Mayorista — importa, almacena y distribuye medicamentos/dispositivos | Otras empresas |

---

## Feature flags por rubro

Dos flags derivados de `rubro.nombre`:

- **`esFarmaciaRetail`** → `farmacia` OR `botica` — habilita TODAS las features incluyendo receta médica y fraccionamiento
- **`esDrogueria`** → `drogueria` OR `droguería` — habilita FEFO + vencimientos + cadena de frío; NO receta ni fraccionamiento
- **`usaLotesFarmacia`** → `esFarmaciaRetail OR esDrogueria` — flag unificado para features compartidas

Rubros fuera de estos tres no ven ningún cambio.

### Cambio en `rubro-features.ts`

```ts
const esDrogueria =
    nombre.includes('drogueria') || nombre.includes('droguería');

const esFarmaciaRetail =
    nombre.includes('farmacia') || nombre.includes('botica');

// Exportar helper para uso en guards backend/frontend
export function esFarmaciaRetailRubro(nombre: string | null | undefined): boolean {
    if (!nombre) return false;
    const n = nombre.toLowerCase();
    return n.includes('farmacia') || n.includes('botica');
}
```

Actualizar en `detectarFuncionesRubro`:
```ts
gestionLotes: esFarmaciaRetail || esFabricacion || esDrogueria,
requiereVencimientos: esFarmaciaRetail || esAlimentos || esDrogueria,
permiteFraccionamiento: esFarmaciaRetail,  // droguería NO
```

---

## Feature 1: Selección y descuento FEFO en POS

**Activo cuando:** `usaLotesFarmacia` (farmacia, botica, droguería)

### Frontend
Cuando `usaLotesFarmacia: true` y se agrega un producto al carrito:
1. El ViewModel llama a `GET /producto/catalogo-farmacia` (ver Feature 2) que ya incluye el lote FEFO.
2. El lote FEFO se adjunta al ítem del carrito como `loteId` y `loteNumero`.
3. Al emitir el comprobante, `loteId` se envía en cada `DetalleComprobante`.

### Backend — descuento por lote

**Regla:** No decrementar `producto.stock` directamente en `comprobante.service.ts`. Reutilizar `producto-lote.service` como única fuente de verdad para salidas de lote.

En `comprobante.service.ts`, cuando el detalle incluye `loteId`:
```ts
await prisma.$transaction(async (tx) => {
    // Lock row-level para evitar sobreventa concurrente
    const lote = await tx.productoLote.findUniqueOrThrow({
        where: { id: detalleDto.loteId },
        // Prisma no expone SELECT FOR UPDATE directamente;
        // usar rawQuery o serializable isolation según versión de Prisma
    });

    const disponible = lote.stockActual - lote.stockReservado; // respetar reservas
    if (disponible < detalleDto.cantidad) {
        throw new BadRequestException(`Stock insuficiente en lote ${lote.numeroLote}`);
    }

    // Delegar a producto-lote.service para centralizar la lógica de salida
    await productoLoteService.registrarSalida(tx, {
        loteId: lote.id,
        cantidad: detalleDto.cantidad,
        motivo: 'VENTA',
        comprobanteId, // se establece al final de la tx
    });
});
```

`productoLoteService.registrarSalida` ya actualiza `productoLote.stockActual`, sincroniza `producto.stock` total y marca el lote `activo: false` si `stockActual` llega a 0.

### FEFO: criterios de lotes válidos

Al consultar lotes disponibles (`GET /producto/:id/lotes-disponibles` y en `catalogo-farmacia`), filtrar:
```ts
where: {
    productoId,
    activo: true,
    stockActual: { gt: 0 },
    // No incluir lotes vencidos en POS de farmacia retail
    // Para droguería se puede incluir con advertencia (define por rubro si se filtra)
    fechaVencimiento: { gt: new Date() }, // o null (productos sin vencimiento)
}
order: { fechaVencimiento: 'asc' } // FEFO: primero el que vence antes
```

**Stock disponible real para FEFO:**
```
stockDisponibleVenta = lote.stockActual - lote.stockReservado
```
Usar `stockDisponibleVenta > 0` como condición adicional al filtro.

### Schema (ambos schemas Prisma)

Aplicar en **`prisma/schema.prisma`** Y **`prisma/schema.sqlite.prisma`**:
```prisma
model DetalleComprobante {
    // ... campos existentes ...
    loteId         Int?     // nullable — retrocompatible con históricos
    lote           ProductoLote? @relation(fields: [loteId], references: [id])
    numeroReceta   String?  // nullable
    dniPaciente    String?  // nullable
    medicoNombre   String?  // nullable
}
```

Todos los campos nuevos son **opcionales (nullable)** — los registros históricos no se ven afectados.

---

## Feature 2: Catálogo farmacia con paginación

**Activo cuando:** `usaLotesFarmacia`

**Endpoint nuevo en backend:** `GET /producto/catalogo-farmacia`

### Query params
```
?sedeId=X&page=1&limit=20&search=paracetamol&categoriaId=5
```

| Param | Tipo | Default |
|---|---|---|
| `sedeId` | number | requerido |
| `page` | number | 1 |
| `limit` | number | 20 |
| `search` | string | — |
| `categoriaId` | number | — |

### Response por producto
```ts
{
    id, nombre, precio, stock, refrigerado,
    requiereReceta, controlado,
    loteFefo: {
        loteId,
        loteNumero,
        fechaVencimiento,
        stockActual,
        stockReservado,
        stockDisponibleVenta,  // stockActual - stockReservado
        diasAlVencimiento,     // null si no tiene fechaVencimiento
    } | null  // null si no tiene lotes válidos
}
```

### Badge de vencimiento en card del POS
- `diasAlVencimiento <= 30` → badge amarillo `⚠️ Vence en X días`
- `diasAlVencimiento < 0` → badge rojo `🚫 Vencido` + producto no agregable al carrito
- `loteFefo === null` (sin stock en lotes) → badge rojo `Sin stock` + no agregable

---

## Feature 3: Bloqueo por receta médica

**Activo cuando:** `esFarmaciaRetail` ÚNICAMENTE (farmacia / botica)  
**NO aplica a droguería.**

### Frontend
Si un producto tiene `requiereReceta: true` O `controlado: true`, al agregarlo al carrito:
- Se agrega con flag `pendienteReceta: true`.
- Badge rojo `📋 Receta` en el ítem del carrito.
- Botón "Cobrar" deshabilitado mientras haya ítems con `pendienteReceta: true`.
- Badge en área de totales con conteo de ítems pendientes.

### Modal `ModalRecetaMedica.tsx`
Se abre al hacer clic en badge del ítem O al intentar cobrar con ítems pendientes.

| Campo | Requerido cuando |
|---|---|
| Número de receta | `requiereReceta: true` |
| DNI del paciente | `controlado: true` |
| Nombre del médico | `controlado: true` |

Al confirmar: `pendienteReceta: false` en el ítem; datos se envían al backend en `DetalleComprobanteDto`.

### Backend — validación obligatoria en `comprobante.service.ts`

El bloqueo frontend es UX; el backend es la guardia real:

```ts
for (const detalle of dto.detalles) {
    const producto = await this.getProducto(detalle.productoId);
    if (producto.requiereReceta && !detalle.numeroReceta) {
        throw new BadRequestException(
            `El producto "${producto.nombre}" requiere número de receta.`
        );
    }
    if (producto.controlado) {
        if (!detalle.dniPaciente) throw new BadRequestException(...);
        if (!detalle.medicoNombre) throw new BadRequestException(...);
    }
}
```

Esta validación solo corre cuando `empresa.rubro` es farmacia/botica (`esFarmaciaRetailRubro`).

---

## Feature 4: Badge de cadena de frío

**Activo cuando:** `usaLotesFarmacia` (farmacia, botica, droguería)

Si `producto.refrigerado: true`, mostrar badge azul `🧊 Cadena de frío` en la card y en el ítem del carrito. No bloquea la venta — es informativo.

Solo UI, no requiere cambios en backend.

---

## Resumen de features por rubro

| Feature | Farmacia | Botica | Droguería |
|---|---|---|---|
| FEFO al agregar al carrito | ✅ | ✅ | ✅ |
| Badge vencimiento próximo | ✅ | ✅ | ✅ |
| Catálogo-farmacia paginado | ✅ | ✅ | ✅ |
| Badge cadena de frío | ✅ | ✅ | ✅ |
| Bloqueo + modal receta médica | ✅ | ✅ | ❌ |
| Validación receta en backend | ✅ | ✅ | ❌ |
| Fraccionamiento | ✅ | ✅ | ❌ |

---

## Decisiones de arquitectura

| Decisión | Elección | Razón |
|---|---|---|
| Descuento de lote | Delegar a `productoLoteService.registrarSalida` | Una sola fuente de verdad; no duplicar lógica en comprobante |
| Concurrencia | `prisma.$transaction` con re-validación de stock dentro | Previene sobreventa ante requests simultáneos |
| Validación receta | Frontend + Backend (doble capa) | Frontend es UX; backend es guardia real de negocio |
| Campos nuevos en schema | Nullable en ambos schemas | Retrocompatibilidad con registros históricos |
| Stock disponible | `stockActual - stockReservado` | Respeta el módulo de reservas existente |
| Lotes FEFO | Filtrar `activo=true, stockActual>0, no vencidos` | Evitar asignar lotes inválidos en POS |

---

## Archivos a modificar

### Backend
| Archivo | Cambio |
|---|---|
| `prisma/schema.prisma` | Agregar `loteId`, `numeroReceta`, `dniPaciente`, `medicoNombre` a `DetalleComprobante` (nullable) |
| `prisma/schema.sqlite.prisma` | Mismo cambio para compatibilidad desktop |
| `comprobante/comprobante.service.ts` | Validación receta por rubro + delegar descuento a productoLoteService dentro de tx |
| `comprobante/dto/create-comprobante.dto.ts` | Agregar campos opcionales al DTO |
| `producto/producto.controller.ts` | Nuevo endpoint `GET /producto/catalogo-farmacia` |
| `producto/producto.service.ts` | Lógica del catálogo con paginación, filtros, lote FEFO, stock disponible |

### Frontend
| Archivo | Cambio |
|---|---|
| `src/utils/rubro-features.ts` | Agregar `esDrogueria`, `esFarmaciaRetailRubro`; actualizar `gestionLotes`, `requiereVencimientos` |
| `useFacturacionViewModel.ts` | Detectar `usaLotesFarmacia` y `esFarmaciaRetail`, usar `catalogo-farmacia`, bloquear cobro por recetas |
| `features/admin/facturacion/FacturacionModel.ts` | Tipos `ICartItemFarmacia`, `ILoteFefo`, `IDatosReceta` |
| `components/POSCatalogLayout.tsx` | Badges de vencimiento y refrigerado en product cards |
| `components/POSCartLayout.tsx` | Badge `📋 Receta` en ítems (solo `esFarmaciaRetail`), indicador de pendientes |
| `components/POSCalculations.tsx` | Bloqueo del botón cobrar si hay recetas pendientes |
| `pages/admin/facturacion/ModalRecetaMedica.tsx` (nuevo) | Modal captura datos de receta |

---

## Lo que NO cambia
- Flujo de venta para rubros sin farmacia/droguería — completamente intacto
- Emisión SUNAT — ningún cambio en XML/UBL
- Estructura de series/correlativos
- Flujo multi-sede
- Registros históricos de `DetalleComprobante` — campos nuevos son nullable

---

## Orden de implementación

1. `rubro-features.ts` — agregar detección droguería y `esFarmaciaRetailRubro`
2. Schema Prisma (ambos) — campos nullable en `DetalleComprobante` + migraciones
3. Backend: `productoLoteService.registrarSalida` — validar que la firma acepta `tx` (transacción)
4. Backend: endpoint `GET /producto/catalogo-farmacia` con paginación/filtros/FEFO
5. Backend: validación receta en `comprobante.service.ts` + descuento dentro de `$transaction`
6. Frontend: tipos en `FacturacionModel.ts`
7. Frontend: `useFacturacionViewModel` — integrar catálogo-farmacia y lógica de lotes/recetas
8. Frontend: badges visuales en `POSCatalogLayout` y `POSCartLayout`
9. Frontend: `ModalRecetaMedica.tsx` + bloqueo en `POSCalculations`
10. Pruebas manuales: farmacia (todas las features), droguería (sin receta), rubro genérico (sin cambios)
