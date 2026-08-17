# Panel de Ventas — Design Spec
**Fecha:** 2026-06-08  
**Estado:** Aprobado

## Resumen

Reemplazar el Panel de Despacho (`/administrador/despacho`) por un **Panel de Ventas unificado** que consolida en una sola vista todas las ventas del día: comprobantes SUNAT (Boleta/Factura), notas de venta informales y pedidos de tienda online. El panel mantiene toda la funcionalidad de despacho existente (cambio de estado, asignación de repartidor, WhatsApp) y le suma visibilidad completa de ventas sin despacho.

---

## 1. Arquitectura General

### Backend — Nuevo módulo `ventas`

```
backend/src/ventas/
  ventas.module.ts
  ventas.service.ts
  ventas.controller.ts
```

**Endpoint:** `GET /ventas/panel?fecha=YYYY-MM-DD&sedeId=`

- Un solo endpoint que consolida las tres fuentes de datos en paralelo.
- Devuelve `{ data: VentaPanelItem[], total: number }` ordenado por fecha desc.
- `fecha` es obligatorio (formato `YYYY-MM-DD`, timezone Lima `America/Lima`).
- `sedeId` es opcional; si no se envía, retorna todas las sedes de la empresa.

### Frontend — Reemplazo del Panel de Despacho

```
src/pages/admin/despacho/
  DespachoView.tsx              ← reemplazado por PanelVentasView.tsx
  usePanelVentasViewModel.ts    ← nuevo hook (reemplaza lógica inline)
src/layouts/AdminLayout.tsx     ← renombrar "Panel Despacho" → "Panel de Ventas"
```

- Ruta sin cambios: `/administrador/despacho`
- `EditarDespachoModal.tsx` y `ModalTrazabilidad.tsx` se reutilizan sin modificación.
- El routing en `App.tsx` no cambia.

---

## 2. Modelo de Datos

### Tipo unificado `VentaPanelItem`

```ts
interface VentaPanelItem {
  id: number
  tipo: 'BOLETA' | 'FACTURA' | 'NOTA_CREDITO' | 'NOTA_DEBITO'  // SUNAT formales
       | 'TICKET' | 'NOTA_VENTA' | 'NOTA_PEDIDO' | 'RECIBO_HONORARIOS' | 'COMP_PAGO' | 'OTRO'  // informales
       | 'PEDIDO_TIENDA'
  referencia: string          // "B001-00000123" | codigoSeguimiento
  fecha: string               // ISO datetime
  cliente: string
  total: number
  estadoPago: 'PAGADO' | 'PENDIENTE' | 'PARCIAL'
  metodoPago: string          // "Efectivo" | "Yape" | "Mixto" | "—"
  estadoSunat: 'ACEPTADO' | 'PENDIENTE' | 'RECHAZADO' | 'NO_APLICA'
  estadoDespacho: 'PREPARANDO' | 'EN_CAMINO' | 'EN_DESTINO' | 'ENTREGADO' | 'DEVUELTO' | 'NO_APLICA'
  repartidor: string          // nombre del repartidor o "No aplica"
  vendedor: string
  sede: string
  comprobanteId: number | null
  pedidoId: number | null
}
```

---

## 3. Backend — Query y Normalización

### Query Prisma en paralelo

```ts
const [sunat, informales, pedidos] = await Promise.all([
  // Comprobantes SUNAT: Boleta (03), Factura (01), NC (07), ND (08)
  prisma.comprobante.findMany({
    where: {
      empresaId,
      ...(sedeId ? { sedeId } : {}),
      fechaEmision: { gte: inicioLima, lte: finLima },
      tipoDoc: { in: ['01', '03', '07', '08'] },
    },
    include: {
      cliente: true,
      usuario: { select: { nombre: true } },
      sede: { select: { nombre: true } },
      envioDespacho: { include: { repartidor: true } },
      pagos: { select: { metodoPago: true, monto: true } },
    },
  }),

  // Informales: TICKET, NV, NP, RH, CP, OT
  prisma.comprobante.findMany({
    where: {
      empresaId,
      ...(sedeId ? { sedeId } : {}),
      fechaEmision: { gte: inicioLima, lte: finLima },
      tipoDoc: { in: ['TICKET', 'NV', 'NP', 'RH', 'CP', 'OT'] },
    },
    include: {
      cliente: true,
      usuario: { select: { nombre: true } },
      sede: { select: { nombre: true } },
      envioDespacho: { include: { repartidor: true } },
      pagos: { select: { metodoPago: true, monto: true } },
    },
  }),

  // Pedidos de tienda online (todos: ENVIO + RECOJO + PRESENCIAL)
  prisma.pedidoTienda.findMany({
    where: {
      empresaId,
      ...(sedeId ? { sedeId } : {}),
      creadoEn: { gte: inicioLima, lte: finLima },
    },
    include: {
      repartidor: true,
      sede: { select: { nombre: true } },
    },
  }),
])
```

### Normalización por caso

| Campo | Comprobante SUNAT | Nota de Venta | Pedido Tienda |
|-------|-------------------|---------------|---------------|
| `tipo` | `BOLETA` si `03`, `FACTURA` si `01`, `NOTA_CREDITO` si `07`, `NOTA_DEBITO` si `08` | Mapear: `TICKET`→`TICKET`, `NV`→`NOTA_VENTA`, `NP`→`NOTA_PEDIDO`, `RH`→`RECIBO_HONORARIOS`, `CP`→`COMP_PAGO`, `OT`→`OTRO` | `PEDIDO_TIENDA` |
| `referencia` | `serie-correlativo` (correlativo con padding 8) | `serie-correlativo` | `codigoSeguimiento` |
| `estadoSunat` | normalizar `estadoEnvioSunat` → `ACEPTADO/PENDIENTE/RECHAZADO` | `NO_APLICA` | `NO_APLICA` |
| `estadoPago` | `montoPagado >= mtoImpVenta` → `PAGADO`; `montoPagado > 0` → `PARCIAL`; sino `PENDIENTE` | igual | `saldoPendiente <= 0.01` → `PAGADO`; `montoPagado > 0` → `PARCIAL`; sino `PENDIENTE` |
| `metodoPago` | primer registro de `pagos[]` → `metodoPago`; si múltiples → `"Mixto"`; si ninguno → `"—"` | igual | `metodoPago` del pedido o `"—"` |
| `estadoDespacho` | `envioDespacho?.estado` o `NO_APLICA` | `NO_APLICA` | mapear `estadoEnvio` con `toDespachoEstado()` existente |
| `repartidor` | `envioDespacho?.repartidor?.nombre` o `"No aplica"` | `"No aplica"` | `repartidor?.nombre` o `"No aplica"` |
| `vendedor` | `usuario.nombre` | `usuario.nombre` | `"Tienda online"` |
| `sede` | `sede.nombre` | `sede.nombre` | `sede?.nombre` o `"—"` |

---

## 4. Frontend — Componentes

### `usePanelVentasViewModel.ts`

Estado:
```ts
fecha: string                           // hoy por defecto (moment().format('YYYY-MM-DD'))
items: VentaPanelItem[]
loading: boolean
tab: 'TODO' | 'VENTAS' | 'CON_DESPACHO'
busqueda: string
```

Fetch: `GET /ventas/panel?fecha=&sedeId=` — re-dispara cuando cambia `fecha` o `sedeActiva.id`.

Filtrado client-side:
```ts
const filtrados = useMemo(() => {
  const search = busqueda.toLowerCase()
  let base = items.filter(i =>
    i.cliente.toLowerCase().includes(search) ||
    i.referencia.toLowerCase().includes(search)
  )
  if (tab === 'VENTAS')       return base.filter(i => i.estadoDespacho === 'NO_APLICA')
  if (tab === 'CON_DESPACHO') return base.filter(i => i.estadoDespacho !== 'NO_APLICA')
  return base
}, [items, tab, busqueda])
```

### `PanelVentasView.tsx` — Layout

```
┌────────────────────────────────────────────────────┐
│  Panel de Ventas           [📅 Fecha]  [Sede]      │
│                                                    │
│  [TODO 24]  [VENTAS 18]  [CON DESPACHO 6]          │
│                              [🔍 Buscar...]         │
│                                                    │
│  Fecha  │ Ref  │ Tipo  │ Cliente │ Total │ M.Pago  │
│         │      │       │         │       │ E.Pago  │
│         │      │       │         │       │ SUNAT   │
│         │      │       │         │       │ Despacho│
│         │      │       │         │       │ Reprtdr │
│  ───────┼──────┼───────┼─────────┼───────┼──────── │
│  10:32  │ B001 │ [BOLT]│ Juan P. │ 45.00 │ Yape    │
│         │ -123 │       │         │       │ [PAGADO]│
│         │      │       │         │       │ [ACEPT] │
│         │      │       │         │       │[NO APL] │
└────────────────────────────────────────────────────┘
```

### Badges de color

**Tipo:**
- `BOLETA` → blue
- `FACTURA` → indigo
- `NOTA_CREDITO` → rose
- `NOTA_DEBITO` → orange
- `TICKET` → teal
- `NOTA_VENTA` → amber
- `NOTA_PEDIDO` → amber
- `RECIBO_HONORARIOS` → amber
- `COMP_PAGO` → amber
- `OTRO` → slate
- `PEDIDO_TIENDA` → violet

**Estado SUNAT:**
- `ACEPTADO` → emerald
- `PENDIENTE` → yellow
- `RECHAZADO` → red
- `NO_APLICA` → slate

**Estado despacho:** reutiliza `ESTADO_COLOR` del panel de despacho existente + `NO_APLICA` → slate

**Estado pago:**
- `PAGADO` → emerald
- `PARCIAL` → amber
- `PENDIENTE` → red

### Acciones por fila (menú contextual)

- Ver detalle del comprobante → abre `ModalDetalleComprobante` existente
- Cambiar estado despacho → solo si `estadoDespacho !== 'NO_APLICA'`
- Enviar por WhatsApp → `ModalEnviarWhatsApp` existente
- Imprimir / PDF → lógica existente de impresión

---

## 5. Cambios en Sidebar

`src/layouts/AdminLayout.tsx`: cambiar el texto `"Panel Despacho"` → `"Panel de Ventas"` en las dos apariciones (sidebar expandido + sidebar colapsado).

---

## 6. Alcance y Límites

**En scope:**
- Nuevo módulo backend `ventas` con endpoint unificado
- `PanelVentasView.tsx` + `usePanelVentasViewModel.ts` reemplazando `DespachoView.tsx`
- Renombrado en sidebar
- Reutilización de `EditarDespachoModal`, `ModalTrazabilidad`, `ModalEnviarWhatsApp`

**Fuera de scope:**
- Exportar a Excel desde el panel (se puede agregar luego)
- Filtros avanzados por tipo/estado/vendedor (se pueden agregar luego)
- Modificar las páginas existentes de `Comprobantes.tsx` o `ComprobantesInformales.tsx`
- Paginación server-side (los volúmenes diarios típicos no lo requieren; se puede agregar si el cliente tiene >500 ventas/día)
