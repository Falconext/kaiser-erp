-- El modal de registro de pago ya pedía una observación, pero no existía la
-- columna: el texto que escribía el usuario se descartaba sin aviso.
ALTER TABLE "PagoCompra" ADD COLUMN "observacion" TEXT;
