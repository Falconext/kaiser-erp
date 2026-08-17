# Gestión de Lotes Completa — Sub-proyecto B

**Fecha:** 2026-06-01  
**Estado:** Aprobado  
**Alcance:** Frontend (LotesView + ModalNuevaCompra) + Backend (endpoint mejorado)

---

## Contexto

La página `/kardex/lotes` existe en el router pero muestra "En construcción". El módulo de compras tiene campos de lote opcionales gateados por plan, ignorando el rubro farmacéutico. Este spec completa ambas piezas.

---

## Parte 1 — Backend: `obtenerLotesConFiltros`

Reemplaza `obtenerTodosLotes` (sin filtros, sin paginación, sin KPIs).

### Endpoint
`GET /productos/lotes/todos?page=1&limit=20&search=amox&estado=POR_VENCER`

| Param | Valores |
|---|---|
| `page` | number, default 1 |
| `limit` | number, default 20 |
| `search` | string — busca en `producto.descripcion` y `lote.lote` |
| `estado` | `TODOS` \| `VIGENTE` \| `POR_VENCER` \| `VENCIDO` |

### Response
```ts
{
  kpis: {
    totalActivos: number,       // lotes activo=true, stockActual > 0
    porVencer30d: number,       // vencen en <= 30 días
    vencidosConStock: number,   // fechaVencimiento < hoy, stockActual > 0
    valorTotalInventario: number // sum(stockActual * costoUnitario)
  },
  lotes: ILoteGestion[],
  total: number,
  page: number,
  limit: number
}

interface ILoteGestion {
  id, lote, fechaVencimiento, stockActual, stockInicial,
  costoUnitario, proveedor, activo, creadoEn,
  diasAlVencimiento: number,     // negativo = vencido
  valorEnStock: number,          // stockActual * costoUnitario
  totalVentas: number,           // count DetalleComprobante con loteId
  producto: { id, descripcion, codigo, imagenUrl, categoriaId }
}
```

---

## Parte 2 — Frontend: página `/kardex/lotes`

### Archivos
- `src/features/admin/kardex/batches/LotesModel.ts` — tipos
- `src/features/admin/kardex/batches/useLotesViewModel.ts` — lógica
- `src/features/admin/kardex/batches/LotesView.tsx` — vista (reemplaza el stub)
- `src/features/admin/kardex/batches/BatchesView.tsx` — delega a LotesView

### Secciones de LotesView

**Banner de alerta** (solo si `kpis.vencidosConStock > 0`)  
Fondo rojo con mensaje: "⚠️ Tienes X lotes vencidos con stock — requieren acción inmediata."

**4 KPI cards**
- Lotes activos (azul)
- Por vencer <30d (amarillo)
- Vencidos con stock (rojo)
- Valor total en inventario (verde, en S/)

**Filtros**
- Input búsqueda (debounced 400ms)
- Select estado: Todos / Vigentes / Por vencer / Vencidos

**Tabla**

| Columna | Detalle |
|---|---|
| Producto | descripcion + código |
| Lote | código del lote |
| Vencimiento | fecha + badge días (verde/amarillo/rojo) |
| Stock | stockActual |
| Disponible | stockActual - reservado (si disponible) |
| Costo U. | costoUnitario |
| Valor total | valorEnStock |
| Ventas | totalVentas (conteo) |
| Estado | badge VIGENTE / POR VENCER / VENCIDO |
| Acciones | Ajustar stock · Editar · Desactivar |

**Exportar Excel** — botón cabecera, genera XLSX desde los datos en memoria (sin endpoint nuevo).

**Acciones por lote** — modales inline (reutilizar lógica de ModalLotes):
- Ajustar stock: `PATCH /productos/lotes/:id/ajustar-stock`
- Editar metadatos: `PATCH /productos/lotes/:id`
- Desactivar: `PATCH /productos/lotes/:id/desactivar`

---

## Parte 3 — Compras: lote obligatorio para rubros farmacéuticos

### Cambio 1 — `tieneGestionLotes`
```ts
// Antes
const tieneGestionLotes = planNombre.includes('NEGOCIO') || ...

// Después
const tieneGestionLotes = planNombre.includes('NEGOCIO') || planNombre.includes('CORPORAT')
  || auth?.rol === 'ADMIN_SISTEMA'
  || usaLotesFarmaciaRubro((auth as any)?.empresa?.rubro?.nombre);
```

### Cambio 2 — Lote obligatorio si rubro farmacéutico
Si `usaLotesFarmaciaRubro`, antes de guardar validar que cada ítem tenga `lote` y `fechaVencimiento`. Error claro: `"El producto X requiere lote y fecha de vencimiento (rubro farmacéutico)"`.

---

## Lo que NO cambia
- `ModalLotes` dentro del kardex de producto — funciona, no tocar
- Endpoints de ajuste y edición de lote — funcionan
- Flujo de compras en general — solo se añade validación
