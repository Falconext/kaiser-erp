# Requirements: Módulo de Análisis Financiero — P&L Operativo

## Problem Statement

El empresario de ecommerce peruano sabe que gana dinero pero no sabe **cuánto está ganando realmente**. El dashboard actual muestra ganancia bruta (Ventas − Costo Mercadería), pero no descuenta los gastos operativos reales: publicidad (Meta Ads, TikTok), sueldos, comisiones de pasarela, envíos pagados al courier, alquiler, etc.

El empresario típicamente absorbe el costo de envío inflando el precio del producto, pero además tiene gastos fijos mensuales que nunca ve reflejados en ningún número. Necesita un Estado de Resultados simple que responda: "¿Cuánto gané este mes de verdad?"

## Acceptance Criteria

- [ ] El empresario puede navegar mes a mes y ver su P&L completo
- [ ] El P&L muestra: Ventas Netas → Ganancia Bruta → Gastos Operativos → Ganancia Neta Real con margen %
- [ ] El empresario puede registrar, editar y eliminar gastos operativos por mes y categoría
- [ ] Existen 6 categorías predefinidas: Publicidad, Sueldos, Envíos, Comisiones, Alquiler, Otros
- [ ] El empresario puede crear categorías personalizadas adicionales
- [ ] La ganancia neta aparece en verde (positiva) o rojo (negativa)
- [ ] Hay un gráfico de evolución de los últimos 6 meses (Ventas / G.Bruta / G.Neta)
- [ ] Comparativa vs mes anterior con % de variación en cada KPI
- [ ] La funcionalidad existe en web (completa) y mobile (resumen + registro rápido de gastos)
- [ ] El módulo reemplaza la vista actual de `/administrador/finanzas` con 2 tabs: Rentabilidad (nuevo) + Flujo de Caja (existente conservado)

## Scope

### In Scope
- Nuevo modelo `GastoOperativo` en BD (Prisma)
- Nuevo módulo NestJS `analisis-financiero` con 6 endpoints
- Reemplazo de `FinanceDashboardView.tsx` manteniendo la lógica de flujo de caja como segundo tab
- Nueva pantalla `AnalisisFinancieroScreen` en la app mobile (Expo)
- CRUD de gastos operativos (web + mobile)
- P&L waterfall visual
- Gráfico de evolución 6 meses
- Soporte multi-sede (filtro por sedeId)

### Out of Scope
- Cálculo de impuestos (IGV, IR)
- Proyección a fin de mes
- Exportar P&L a PDF (v2)
- Balance de situación (activos/pasivos)
- Integración automática con costos de envío desde el panel de despacho (v2)

## Technical Constraints

- Backend: NestJS + Prisma + PostgreSQL. Seguir patrón de módulos existentes
- Frontend Web: React 19 + Vite + TailwindCSS v3.4 + Tremor. Patrón Model/ViewModel/View
- Frontend Mobile: Expo SDK 54 + React Navigation. Ionicons. StyleSheet API
- Todos los responses del backend wrapped en `{ code: 1, data }` via ResponseInterceptor global
- Auth: `JwtAuthGuard` en todos los endpoints, `@User()` decorator para empresaId/sedeId
- El período de gastos es **mensual** (mes + año), no por rango de fechas libre
- Los datos de ventas y compras ya existen — solo agregar la capa de gastos operativos
- Seguir el estilo visual existente del proyecto (dark mode, rounded-3xl, colores del theme)

## Dependencies

- Módulo `finanzas` existente: su lógica de flujo de caja se migra al segundo tab sin cambios
- Módulo `dashboard` existente: los KPIs de ganancia bruta/margen del overview quedan como están
- Módulo `comprobante`: fuente de datos de ventas netas del mes
- Módulo `compras`: fuente de datos del costo de mercadería del mes
- App mobile: agregar `AnalisisFinancieroScreen` al stack de navegación existente

## Methodology: traditional

## Complexity: medium
