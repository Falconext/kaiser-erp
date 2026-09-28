-- El costeo de una orden de producción no quedaba guardado en ninguna parte, y el
-- valor de la merma se perdía: salía del inventario y no entraba ni al costo del
-- producto terminado ni a un gasto. Estos tres campos lo dejan explícito y
-- auditable, con la merma separada del consumo para poder analizarla.
ALTER TABLE "OrdenProduccion" ADD COLUMN "costoConsumo"    DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "OrdenProduccion" ADD COLUMN "costoMerma"      DECIMAL(65,30) DEFAULT 0;
ALTER TABLE "OrdenProduccion" ADD COLUMN "costoProduccion" DECIMAL(65,30) DEFAULT 0;
