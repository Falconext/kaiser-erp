# Análisis Financiero — Diseño Técnico
**Fecha:** 2026-06-04  
**Ruta afectada:** `/administrador/finanzas`  
**Plataformas:** Web (React) + Mobile (Expo)  
**Estado:** Aprobado

---

## 1. Problema

El dashboard actual muestra **ganancia bruta** (Ventas − Costo Mercadería), pero el empresario de ecommerce también tiene gastos operativos que no se registran en Falconext: publicidad, sueldos, comisiones de pasarela, envíos pagados al courier, alquiler, etc.

El empresario sabe que gana, pero no sabe cuánto gana **realmente**. Necesita un número: su ganancia neta.

---

## 2. Solución

Reemplazar la vista actual de `/administrador/finanzas` con un módulo de **Análisis Financiero** que combina datos existentes (ventas, compras) con gastos operativos que el empresario registra manualmente por mes, produciendo un **Estado de Resultados simple**.

El módulo existente no desaparece — el Flujo de Caja pasa a ser el segundo tab.

---

## 3. Modelo de datos

### Nueva tabla: `GastoOperativo`

```prisma
model GastoOperativo {
  id          Int      @id @default(autoincrement())
  empresaId   Int
  empresa     Empresa  @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  sedeId      Int?
  categoria   String   // clave fija o nombre personalizado
  descripcion String?
  monto       Decimal  @db.Decimal(12, 2)
  mes         Int      // 1–12
  anio        Int
  creadoEn    DateTime @default(now())
  actualizadoEn DateTime @updatedAt

  @@index([empresaId, anio, mes])
}
```

### Categorías fijas (constantes en código, no en BD)

| Key | Label | Ícono |
|---|---|---|
| `PUBLICIDAD` | Publicidad | 🎯 |
| `SUELDOS` | Sueldos | 👥 |
| `ENVIOS` | Envíos | 🚚 |
| `COMISIONES` | Comisiones | 💳 |
| `ALQUILER` | Alquiler | 🏠 |
| `OTROS` | Otros | 📦 |

Las categorías personalizadas se guardan como string libre en `categoria`. El frontend las recupera haciendo `distinct` sobre `categoria` de gastos previos de la empresa para ofrecer sugerencias.

---

## 4. Backend — nuevo módulo `analisis-financiero`

### Endpoints

#### `GET /analisis-financiero/rentabilidad`
Query params: `mes` (1–12), `anio`, `sedeId?`

Respuesta:
```ts
{
  periodo: { mes: number, anio: number, label: string },
  ventasNetas: number,          // comprobantes (excl. NC) del mes
  costoMercaderia: number,      // compras registradas del mes
  gananciaBruta: number,        // ventasNetas - costoMercaderia
  margenBruto: number,          // % sobre ventasNetas
  gastosOperativos: {
    total: number,
    detalle: Array<{ categoria: string, label: string, monto: number, porcentaje: number }>
  },
  gananciaNeta: number,         // gananciaBruta - gastosOperativos.total
  margenNeto: number,           // % sobre ventasNetas
  anterior: {                   // mismo período mes anterior
    ventasNetas: number,
    gananciaBruta: number,
    gananciaNeta: number,
    margenNeto: number
  },
  historial: Array<{            // últimos 6 meses para gráfico
    mes: number, anio: number, label: string,
    ventasNetas: number, gananciaBruta: number,
    gananciaNeta: number, margenNeto: number
  }>
}
```

#### `GET /analisis-financiero/gastos`
Query params: `mes`, `anio`, `sedeId?`
Devuelve lista de `GastoOperativo` del período.

#### `GET /analisis-financiero/categorias-custom`
Devuelve strings únicos de categorías personalizadas de la empresa (para sugerencias).

#### `POST /analisis-financiero/gastos`
Body: `{ categoria, descripcion?, monto, mes, anio, sedeId? }`

#### `PUT /analisis-financiero/gastos/:id`
Body: `{ categoria?, descripcion?, monto? }`

#### `DELETE /analisis-financiero/gastos/:id`

### Módulo NestJS
- `AnalisisFinancieroModule` importa `PrismaModule`
- `AnalisisFinancieroService` — lógica de P&L
- `AnalisisFinancieroController` — todos los endpoints, guard `JwtAuthGuard`

---

## 5. Frontend Web

### Ruta
`/administrador/finanzas` — el componente `FinanceDashboardView.tsx` se reemplaza.

### Estructura de componentes

```
src/features/admin/finanzas/
├── AnalisisFinancieroModel.ts          ← tipos e interfaces
├── useAnalisisFinancieroViewModel.ts   ← estado, llamadas API, handlers
├── AnalisisFinancieroView.tsx          ← orquestador con tabs
├── tabs/
│   ├── RentabilidadTab.tsx             ← Tab 1 (nuevo)
│   └── FlujoCajaTab.tsx                ← Tab 2 (flujo de caja existente migrado)
└── components/
    ├── PLWaterfall.tsx                 ← waterfall visual del P&L
    ├── KpiRentabilidad.tsx             ← 4 cards superiores
    ├── GastosTable.tsx                 ← lista de gastos con editar/eliminar
    ├── GastoFormModal.tsx              ← modal agregar/editar gasto
    └── EvolucionChart.tsx              ← área chart 6 meses
```

### Tab Rentabilidad — layout

**Fila 1:** 4 KPI cards — Ventas Netas / Ganancia Bruta / Gastos Operativos / Ganancia Neta Real  
- Ganancia Neta: verde si > 0, rojo si < 0
- Cada card muestra `%` de variación vs mes anterior con flecha ↑↓

**Fila 2:** 2 columnas  
- Izquierda: `PLWaterfall` — barras horizontales proporcionales mostrando la cascada Ventas → G.Bruta → G.Neta con cada gasto restando visualmente  
- Derecha: `GastosTable` — lista de gastos del mes con botón `[+ Agregar gasto]`, editar y eliminar por línea

**Fila 3:** `EvolucionChart` — área chart últimos 6 meses con 3 líneas: Ventas Netas, Ganancia Bruta, Ganancia Neta

**Selector de período:** navegación `← Junio 2026 →` por mes (no rango libre, porque los gastos son mensuales)

### Tab Flujo de Caja
Contenido actual de `FinanceDashboardView.tsx` migrado sin cambios funcionales. Solo se adapta visualmente al nuevo layout de tabs.

---

## 6. Frontend Mobile

### Nueva pantalla: `AnalisisFinancieroScreen`

Accesible desde el menú lateral (tab o stack según navegación existente).

**Secciones:**

1. **Selector de mes** — `← Junio 2026 →`
2. **3 KPI cards:**
   - Ventas Netas (con % vs mes ant.)
   - Ganancia Bruta (con margen %)
   - Ganancia Neta Real — card grande, color dinámico verde/rojo
3. **Lista de gastos del mes** — por categoría con monto, ícono, editar/eliminar swipe
4. **Botón fijo abajo:** `[+ Registrar gasto]`

### Bottom sheet: `GastoFormSheet`

Campos:
- **Categoría** — picker con íconos de las 6 fijas + categorías custom previas + opción `+ Nueva categoría`
- **Monto** — input numérico
- **Descripción** — opcional
- **Mes** — automático (mes seleccionado), editable

---

## 7. Flujo de datos

```
Mobile/Web selecciona mes
  → GET /analisis-financiero/rentabilidad?mes=6&anio=2026
  → Backend consulta en paralelo:
      comprobante.aggregate (ventasNetas del mes)
      compra.aggregate (costoMercadería del mes)
      gastoOperativo.findMany (gastos del mes)
      [últimos 6 meses para historial]
  → Calcula P&L y devuelve respuesta unificada
  → Frontend renderiza sin lógica de cálculo propia
```

---

## 8. Lo que NO se incluye en esta versión

- Impuestos (IGV, IR) — queda fuera del alcance
- Proyección a fin de mes — v2
- Exportar P&L a PDF — v2 (el módulo de finanzas ya tiene PDF de flujo de caja)
- Balance de situación (activos/pasivos) — fuera de alcance

---

## 9. Impacto en código existente

| Archivo | Acción |
|---|---|
| `FinanceDashboardView.tsx` | Reemplazar por `AnalisisFinancieroView.tsx` |
| `useFinanceDashboardViewModel.ts` | Conservar lógica de flujo de caja, mover a `FlujoCajaTab` |
| `FinanceDashboardModel.ts` | Extender con nuevos tipos |
| `prisma/schema.prisma` | Agregar modelo `GastoOperativo` |
| `backend/src/finanzas/` | Se mantiene para flujo de caja |
| `backend/src/analisis-financiero/` | Nuevo módulo |
| `mobile/src/screens/` | Nueva pantalla `AnalisisFinancieroScreen` |
| `mobile/src/services/api.ts` | Nuevas funciones de API |
