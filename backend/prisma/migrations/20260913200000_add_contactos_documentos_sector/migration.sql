-- Sector económico del cliente (reportes por sector)
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "sector" TEXT;

-- Contactos múltiples por cliente
CREATE TABLE IF NOT EXISTS "ClienteContacto" (
  "id" SERIAL PRIMARY KEY,
  "clienteId" INTEGER NOT NULL REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "nombre" TEXT NOT NULL,
  "cargo" TEXT,
  "telefono" TEXT,
  "email" TEXT,
  "area" TEXT,
  "observacion" TEXT,
  "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "ClienteContacto_clienteId_activo_idx" ON "ClienteContacto"("clienteId", "activo");

-- Documentos adjuntos de producto (ficha técnica PDF, certificados, manuales)
CREATE TABLE IF NOT EXISTS "ProductoDocumento" (
  "id" SERIAL PRIMARY KEY,
  "productoId" INTEGER NOT NULL REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tipo" TEXT NOT NULL DEFAULT 'FICHA_TECNICA',
  "nombre" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "key" TEXT,
  "mimeType" TEXT,
  "tamano" INTEGER,
  "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
  "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ProductoDocumento_productoId_tipo_idx" ON "ProductoDocumento"("productoId", "tipo");

-- Sede en gastos operativos y campañas (análisis financiero por sede)
ALTER TABLE "GastoOperativo" ADD COLUMN IF NOT EXISTS "sedeId" INTEGER REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "GastoOperativo_empresaId_sedeId_idx" ON "GastoOperativo"("empresaId", "sedeId");
ALTER TABLE "CampanaMarketing" ADD COLUMN IF NOT EXISTS "sedeId" INTEGER REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "CampanaMarketing_empresaId_sedeId_idx" ON "CampanaMarketing"("empresaId", "sedeId");
ALTER TABLE "GastoOperativo" ADD COLUMN IF NOT EXISTS "proveedor" TEXT;
ALTER TABLE "GastoOperativo" ADD COLUMN IF NOT EXISTS "numeroDocumento" TEXT;
ALTER TABLE "GastoOperativo" ADD COLUMN IF NOT EXISTS "numeroOperacion" TEXT;
