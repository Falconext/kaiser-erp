-- La numeración de SUNAT no admite dos documentos con el mismo número, pero la
-- tabla solo tenía índices no únicos. El reintento por P2002 que ya existía en
-- `crearComprobanteConReintento` no podía dispararse nunca, así que dos
-- emisiones simultáneas leían el mismo correlativo y las dos se guardaban.
--
-- Si esto falla al aplicarse, hay duplicados que resolver primero:
--   SELECT "empresaId","tipoDoc",serie,correlativo,COUNT(*)
--   FROM "Comprobante" GROUP BY 1,2,3,4 HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX "Comprobante_empresaId_tipoDoc_serie_correlativo_key"
  ON "Comprobante"("empresaId", "tipoDoc", "serie", "correlativo");
