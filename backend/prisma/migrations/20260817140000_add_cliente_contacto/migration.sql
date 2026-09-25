-- Persona de contacto (comprador/coordinador) dentro de la empresa cliente.
-- Se muestra en el bloque "DATOS DE CONTACTO" de la cotización.
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "contactoNombre" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "contactoEmail" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "contactoTelefono" TEXT;
ALTER TABLE "Cliente" ADD COLUMN IF NOT EXISTS "contactoDireccion" TEXT;
