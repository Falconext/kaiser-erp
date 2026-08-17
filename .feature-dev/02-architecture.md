# Análisis Financiero (P&L) — Technical Architecture Document

## 1. Prisma Model: `GastoOperativo`

```prisma
enum CategoriaGasto {
  PUBLICIDAD
  SUELDOS
  ENVIOS
  COMISIONES
  ALQUILER
  OTROS
  PERSONALIZADA
}

model GastoOperativo {
  id            Int             @id @default(autoincrement())
  empresaId     Int
  mes           Int             // 1–12
  anio          Int
  categoria     CategoriaGasto
  etiqueta      String?         // required when categoria = PERSONALIZADA
  monto         Decimal         @db.Decimal(12, 2)
  descripcion   String?
  creadoEn      DateTime        @default(now())
  actualizadoEn DateTime        @updatedAt
  empresa       Empresa         @relation(fields: [empresaId], references: [id], onDelete: Cascade)

  @@index([empresaId, anio, mes])
  @@index([empresaId, categoria])
}
```

## 2. API Endpoints (6 total)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/analisis-financiero/pnl?mes=6&anio=2025` | P&L completo del mes |
| GET | `/analisis-financiero/evolucion?meses=6` | 6 meses para gráfico |
| GET | `/analisis-financiero/gastos?mes=6&anio=2025` | Lista gastos del mes |
| POST | `/analisis-financiero/gastos` | Crear gasto |
| PATCH | `/analisis-financiero/gastos/:id` | Editar gasto |
| DELETE | `/analisis-financiero/gastos/:id` | Eliminar gasto |

### GET /pnl Response:
```typescript
{
  periodo: { mes, anio, label: "Junio 2025" },
  ventasNetas: number,
  costoMercaderia: number,
  gananciaBruta: number,
  margenBruto: number,       // %
  gastosTotales: number,
  gastosPorCategoria: [{ categoria, etiqueta, monto }],
  gananciaNeta: number,
  margenNeto: number,        // puede ser negativo
  comparacion: {
    mesAnterior: { gananciaNeta, margenNeto } | null,
    variacionMonto: number | null,
    variacionPorcentaje: number | null,
  }
}
```

## 3. P&L Calculation Logic

```
ventasNetas      = SUM(mtoImpVenta WHERE tipoDoc NOT IN ['07'] AND NOT ANULADO)
                 - SUM(mtoImpVenta WHERE tipoDoc = '07')
costoMercaderia  = SUM(total FROM Compra WHERE NOT ANULADO)
gananciaBruta    = ventasNetas - costoMercaderia
gastosTotales    = SUM(monto FROM GastoOperativo WHERE mes+anio)
gananciaNeta     = gananciaBruta - gastosTotales
margenNeto       = ventasNetas > 0 ? (gananciaNeta / ventasNetas) * 100 : 0
```

Date ranges use UTC-5 (Lima) boundaries — same pattern que `finanzas.service.ts`.

## 4. Service Methods

```typescript
class AnalisisFinancieroService {
  getPnl(empresaId, mes, anio)         // Promise.all: ventas + compras + gastos
  getEvolucion(empresaId, meses)       // single query window, grouped in-app
  listarGastos(empresaId, mes, anio)
  crearGasto(empresaId, dto)
  actualizarGasto(empresaId, id, dto)  // pre-check tenant isolation
  eliminarGasto(empresaId, id)         // pre-check tenant isolation
}
```

## 5. Security

- `empresaId` solo desde JWT, nunca de query/body params
- Pre-check `findFirst({ where: { id, empresaId } })` en PATCH/DELETE
- Validación con class-validator: mes 1–12, anio 2020–2100, monto 0.01–9,999,999
- `etiqueta` requerida solo cuando `categoria = PERSONALIZADA`

## 6. Frontend Web Structure

```
src/features/admin/finanzas/
├── FinanzasTabs.tsx                    ← NEW tab switcher
├── rentabilidad/
│   ├── RentabilidadModel.ts
│   ├── RentabilidadView.tsx
│   ├── useRentabilidadViewModel.ts
│   └── components/
│       ├── PnlTable.tsx
│       ├── EvolucionChart.tsx
│       ├── GastosPanel.tsx
│       └── GastoFormModal.tsx
└── flujo-caja/                         ← existing code moved here
    ├── FinanceDashboardModel.ts
    ├── FinanceDashboardView.tsx
    └── useFinanceDashboardViewModel.ts
```

Nuevo Zustand store: `src/zustand/analisisFinanciero.ts`

## 7. Mobile Structure

Nueva pantalla: `src/screens/AnalisisFinancieroScreen.tsx`
- Selector mes `← Junio 2025 →`
- Hero card Ventas Netas
- 2 cards: Ganancia Bruta | Ganancia Neta (verde/rojo)
- Lista de gastos + FAB `+ Registrar gasto`
- `GastoQuickAddSheet` (bottom sheet)

## 8. Files Modified in Existing Codebase

| Archivo | Acción |
|---------|--------|
| `schema.prisma` | + enum CategoriaGasto + model GastoOperativo + relation en Empresa |
| `app.module.ts` | + AnalisisFinancieroModule |
| `src/pages/admin/finanzas/Dashboard.tsx` | Wrap con tab container |
| Mobile navigation types + AppNavigation | + AnalisisFinanciero screen |

## 9. Edge Cases Handled

- Mes sin ventas: margen = 0, G.Neta negativa mostrada en rojo
- Mes sin compras: válido (costoMercaderia = 0)
- Enero → previo = Diciembre año anterior
- Gastos sin datos previos: comparación devuelve null (no crash)
- Múltiples gastos misma categoría en un mes: permitido y correcto
