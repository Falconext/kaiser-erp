-- Deja rastro de los números de comprobante asignados y luego descartados
-- (rechazo de datos de SUNAT, casi siempre). El comprobante se elimina porque no
-- está emitido y no debe entrar a los libros, pero el número ya se consumió: si
-- el rechazo llega después de haber emitido otro documento, el hueco en la serie
-- es permanente. Un hueco sin explicación es un hallazgo en una fiscalización.
CREATE TABLE "ComprobanteDescartado" (
  "id"           SERIAL PRIMARY KEY,
  "empresaId"    INTEGER NOT NULL,
  "tipoDoc"      TEXT NOT NULL,
  "serie"        TEXT NOT NULL,
  "correlativo"  INTEGER NOT NULL,
  "motivo"       TEXT NOT NULL,
  "errorSunat"   TEXT,
  "fechaEmision" TIMESTAMP(3),
  "usuarioId"    INTEGER,
  "descartadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ComprobanteDescartado_empresaId_tipoDoc_serie_correlativo_key"
  ON "ComprobanteDescartado"("empresaId", "tipoDoc", "serie", "correlativo");
CREATE INDEX "ComprobanteDescartado_empresaId_serie_idx"
  ON "ComprobanteDescartado"("empresaId", "serie");
ALTER TABLE "ComprobanteDescartado" ADD CONSTRAINT "ComprobanteDescartado_empresaId_fkey"
  FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ComprobanteDescartado" ADD CONSTRAINT "ComprobanteDescartado_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
