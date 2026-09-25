-- IngresoManual era el único modelo del análisis financiero sin sede, lo que
-- rompía el P&L (PrismaClientValidationError) al filtrar por sede.
ALTER TABLE "IngresoManual" ADD COLUMN "sedeId" INTEGER;

CREATE INDEX "IngresoManual_empresaId_sedeId_idx" ON "IngresoManual"("empresaId", "sedeId");

ALTER TABLE "IngresoManual" ADD CONSTRAINT "IngresoManual_sedeId_fkey"
  FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;
