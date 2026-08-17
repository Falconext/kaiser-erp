# Spec: Columnas de Valor de Inventario y Costo Total Fijo en Kardex

**Fecha:** 2026-06-05  
**Alcance:** Feature A — Kardex (lista de productos web)

---

## Objetivo

Agregar dos columnas calculadas al Kardex que permitan al usuario saber:
1. Cuánto dinero tiene inmovilizado en cada producto (inversión en stock).
2. Cuánto le cuesta realmente vender todo ese stock considerando los gastos fijos por unidad.

---

## Fórmulas

```
Valor Inventario  = stock × costoUnitario
Costo Total Fijo  = stock × (costoUnitario + costoComision + costoRegalo + costoEnvio)
```

Donde `costoComision`, `costoRegalo` y `costoEnvio` son montos fijos en S/ almacenados por producto. Son distintos de `porcentajeVenta` (que representa el % de productos habilitados para venta, no una comisión).

---

## Cambios — Backend

### Prisma schema (`schema.prisma`)
Agregar tres campos opcionales al modelo `Producto`:

```prisma
costoComision  Float?  @default(0)
costoRegalo    Float?  @default(0)
costoEnvio     Float?  @default(0)
```

### DTOs
- `CreateProductoDto`: agregar `costoComision?`, `costoRegalo?`, `costoEnvio?` como `number` opcionales.
- `UpdateProductoDto`: idem.

### Service
- `ProductoService.create` y `update`: incluir los tres campos en el upsert de Prisma.

---

## Cambios — Frontend

### Interfaces (`src/interfaces/products.ts`)
Agregar a `IProduct` e `IFormProduct`:
```ts
costoComision?: number
costoRegalo?:   number
costoEnvio?:    number
```

### initialProductForm (`ProductsModel.ts`)
```ts
costoComision: 0,
costoRegalo:   0,
costoEnvio:    0,
```

### Formulario del producto (`ProductBasicForm.tsx`)
En la sección de costos (junto a `costoUnitario`), agregar un bloque **"Gastos fijos por venta"** con tres inputs numéricos:

| Label            | Campo          | Tipo   |
|------------------|----------------|--------|
| Comisión fija    | costoComision  | number |
| Costo de regalo  | costoRegalo    | number |
| Costo de envío   | costoEnvio     | number |

Prefijo `S/` en cada input. **Solo visibles si `tieneTienda` está activo en el plan** — son campos de e-commerce (marketplace, delivery). Una ferretería o tienda física no los necesita.

### Tabla Kardex (`ProductsView.tsx`)

En el map de `productsTable`, calcular:

```ts
const costoComision = Number((item as any)?.costoComision || 0);
const costoRegalo   = Number((item as any)?.costoRegalo   || 0);
const costoEnvio    = Number((item as any)?.costoEnvio    || 0);
const stock         = Number(item?.stock || 0);

const valorInventario = stock * costo;
const costoTotalFijo  = stock * (costo + costoComision + costoRegalo + costoEnvio);
```

Dos entradas en `allData`:

```tsx
'Valor Inventario': valorInventario > 0
  ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700">
      S/ {valorInventario.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
    </span>
  : '-',

'Costo Total Fijo': costoTotalFijo > 0
  ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700">
      S/ {costoTotalFijo.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
    </span>
  : '-',
```

### ViewModel (`useProductsViewModel.ts`)

`Valor Inventario` se agrega para **todos** los usuarios.  
`Costo Total Fijo` solo se agrega si `tieneTienda`:

```ts
const base = ['Img', 'Producto', 'Categoria', 'Marca', 'Precio Venta', 'Costo',
  'Valor Inventario', 'Stock', 'Localización',
  '% Venta', '% Provisión', 'U.M', 'Estado', 'Acciones'];

// Solo con tieneTienda (e-commerce):
if (tieneTienda) base.splice(7, 0, 'Costo Total Fijo');
```

Ambas son toggleables desde el selector de columnas existente.

---

## Feature B — Mapa de implementación (sesión futura)

### Contexto
Para e-commerce, los costos de publicidad y comisión de marketplace varían diariamente. El usuario necesita ingresarlos cada día para que el sistema descuente del total de ventas y muestre la **ganancia neta real del día**.

### Entidades nuevas (Backend)

**Tabla `CostoVariableDiario`:**
```prisma
model CostoVariableDiario {
  id          Int      @id @default(autoincrement())
  fecha       DateTime
  empresaId   Int
  sedeId      Int?
  tipo        String   // 'PUBLICIDAD' | 'COMISION_MARKETPLACE' | 'OTRO'
  monto       Float
  descripcion String?
  creadoEn    DateTime @default(now())
}
```

**Endpoints necesarios:**
- `POST /costos-variables` — registrar costo del día
- `GET /costos-variables?fecha=YYYY-MM-DD` — listar costos del día
- `DELETE /costos-variables/:id` — eliminar un costo

### Frontend

**Página / sección:** Reporte Diario de Ventas (página existente que ya muestra ventas del día).

**Flujo:**
1. Usuario abre el reporte del día.
2. Botón `+ Agregar costo variable` abre un mini-modal: tipo (selector), monto, descripción opcional.
3. Los costos del día se listan bajo las ventas.
4. El resumen final calcula:
   ```
   Ganancia bruta del día  = suma(precioVenta - costoUnitario) por venta del día
   Total costos variables  = suma(costos variables ingresados del día)
   Ganancia neta del día   = ganancia bruta - total costos variables
   ```

### Archivos a crear/modificar
- `backend/src/costos-variables/` — nuevo módulo NestJS
- `frontend/src/pages/admin/reporte-diario/` — agregar sección de costos variables
- Migración Prisma para `CostoVariableDiario`
