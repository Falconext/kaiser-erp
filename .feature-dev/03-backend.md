# Backend Implementation: Análisis Financiero

## Files Created
- `backend/src/analisis-financiero/analisis-financiero.module.ts`
- `backend/src/analisis-financiero/analisis-financiero.controller.ts`
- `backend/src/analisis-financiero/analisis-financiero.service.ts`
- `backend/src/analisis-financiero/dto/query-periodo.dto.ts`
- `backend/src/analisis-financiero/dto/crear-gasto.dto.ts`
- `backend/src/analisis-financiero/dto/actualizar-gasto.dto.ts`

## Files Modified
- `backend/prisma/schema.prisma` — enum CategoriaGasto + model GastoOperativo + relation Empresa
- `backend/src/app.module.ts` — AnalisisFinancieroModule registered

## Key Decisions
- Tenant isolation via findFirst({ id, empresaId }) before every PATCH/DELETE
- getPnl() uses Promise.all([ventas, compras, gastos]) — no sequential awaits
- getEvolucion() uses single window query + JS grouping (no N queries)
- periodoToRange() uses UTC-5 Lima boundaries (UTC+5h offset)
- mes/anio not patchable in actualizarGasto to prevent data integrity issues

## Pending
- Run: `cd backend && pnpm run start:dev` (triggers prisma generate + migrate)
- Or manually: `npx prisma migrate dev --name add_gasto_operativo`
