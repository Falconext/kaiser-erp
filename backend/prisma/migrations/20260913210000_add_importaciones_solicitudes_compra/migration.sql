-- CreateEnum
CREATE TYPE "EstadoImportacion" AS ENUM ('BORRADOR', 'EN_TRANSITO', 'EN_ADUANA', 'LIQUIDADA', 'NACIONALIZADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "TipoGastoImportacion" AS ENUM ('FLETE_INTERNACIONAL', 'SEGURO', 'AD_VALOREM', 'IGV_IMPORTACION', 'IPM', 'ISC', 'PERCEPCION', 'AGENCIA_ADUANA', 'ALMACEN_ADUANERO', 'TRANSPORTE_INTERNO', 'GASTOS_BANCARIOS', 'OTROS');

-- CreateEnum
CREATE TYPE "BaseProrrateo" AS ENUM ('VALOR', 'PESO', 'VOLUMEN', 'CANTIDAD');

-- CreateEnum
CREATE TYPE "EstadoSolicitudCompra" AS ENUM ('PENDIENTE', 'EN_COTIZACION', 'APROBADA', 'CONVERTIDA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoCotizacionProveedor" AS ENUM ('RECIBIDA', 'SELECCIONADA', 'DESCARTADA');

-- AlterTable
ALTER TABLE "OrdenCompra" ADD COLUMN     "cotizacionProveedorId" INTEGER,
ADD COLUMN     "solicitudCompraId" INTEGER;

-- CreateTable
CREATE TABLE "Importacion" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "sedeId" INTEGER,
    "usuarioId" INTEGER,
    "proveedorId" INTEGER NOT NULL,
    "numero" TEXT NOT NULL,
    "descripcion" TEXT,
    "numeroFactura" TEXT,
    "numeroDua" TEXT,
    "incoterm" TEXT NOT NULL DEFAULT 'FOB',
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "tipoCambio" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "fechaEmbarque" TIMESTAMP(3),
    "fechaLlegada" TIMESTAMP(3),
    "fechaNacionalizacion" TIMESTAMP(3),
    "estado" "EstadoImportacion" NOT NULL DEFAULT 'BORRADOR',
    "valorFob" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "valorFobPen" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalGastosCosto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalGastosNoCosto" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "costoTotalNacionalizado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "factorCosto" DECIMAL(10,6) NOT NULL DEFAULT 1,
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Importacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportacionItem" (
    "id" SERIAL NOT NULL,
    "importacionId" INTEGER NOT NULL,
    "productoId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'UND',
    "precioFobUnitario" DECIMAL(14,4) NOT NULL,
    "pesoKg" DECIMAL(12,3),
    "volumenM3" DECIMAL(12,4),
    "partidaArancelaria" TEXT,
    "adValoremPorcentaje" DECIMAL(6,2),
    "costoFobPen" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "gastosAsignados" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "costoTotalPen" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "costoUnitarioFinal" DECIMAL(14,4) NOT NULL DEFAULT 0,

    CONSTRAINT "ImportacionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportacionGasto" (
    "id" SERIAL NOT NULL,
    "importacionId" INTEGER NOT NULL,
    "tipo" "TipoGastoImportacion" NOT NULL,
    "descripcion" TEXT,
    "proveedorNombre" TEXT,
    "numeroDocumento" TEXT,
    "fecha" TIMESTAMP(3),
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "tipoCambio" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "monto" DECIMAL(14,2) NOT NULL,
    "montoPen" DECIMAL(14,2) NOT NULL,
    "afectaCosto" BOOLEAN NOT NULL DEFAULT true,
    "baseProrrateo" "BaseProrrateo" NOT NULL DEFAULT 'VALOR',
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportacionGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudCompra" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "sedeId" INTEGER,
    "solicitanteId" INTEGER,
    "numero" TEXT NOT NULL,
    "area" TEXT,
    "motivo" TEXT,
    "fechaRequerida" TIMESTAMP(3),
    "estado" "EstadoSolicitudCompra" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitudCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudCompraItem" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "productoId" INTEGER,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'UND',
    "observacion" TEXT,

    CONSTRAINT "SolicitudCompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionProveedor" (
    "id" SERIAL NOT NULL,
    "empresaId" INTEGER NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "proveedorId" INTEGER NOT NULL,
    "referencia" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "tipoCambio" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "plazoEntregaDias" INTEGER,
    "condicionesPago" TEXT,
    "validezDias" INTEGER,
    "incluyeIgv" BOOLEAN NOT NULL DEFAULT false,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalPen" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estado" "EstadoCotizacionProveedor" NOT NULL DEFAULT 'RECIBIDA',
    "observaciones" TEXT,
    "archivoUrl" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CotizacionProveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CotizacionProveedorItem" (
    "id" SERIAL NOT NULL,
    "cotizacionId" INTEGER NOT NULL,
    "solicitudItemId" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(14,4) NOT NULL,
    "cantidad" DECIMAL(12,3),
    "marca" TEXT,
    "plazoEntregaDias" INTEGER,
    "observacion" TEXT,

    CONSTRAINT "CotizacionProveedorItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Importacion_empresaId_estado_idx" ON "Importacion"("empresaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "Importacion_empresaId_numero_key" ON "Importacion"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "ImportacionItem_importacionId_idx" ON "ImportacionItem"("importacionId");

-- CreateIndex
CREATE INDEX "ImportacionGasto_importacionId_idx" ON "ImportacionGasto"("importacionId");

-- CreateIndex
CREATE INDEX "SolicitudCompra_empresaId_estado_idx" ON "SolicitudCompra"("empresaId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitudCompra_empresaId_numero_key" ON "SolicitudCompra"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "SolicitudCompraItem_solicitudId_idx" ON "SolicitudCompraItem"("solicitudId");

-- CreateIndex
CREATE INDEX "CotizacionProveedor_solicitudId_idx" ON "CotizacionProveedor"("solicitudId");

-- CreateIndex
CREATE INDEX "CotizacionProveedor_empresaId_proveedorId_idx" ON "CotizacionProveedor"("empresaId", "proveedorId");

-- CreateIndex
CREATE UNIQUE INDEX "CotizacionProveedorItem_cotizacionId_solicitudItemId_key" ON "CotizacionProveedorItem"("cotizacionId", "solicitudItemId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_cotizacionProveedorId_key" ON "OrdenCompra"("cotizacionProveedorId");

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_solicitudCompraId_fkey" FOREIGN KEY ("solicitudCompraId") REFERENCES "SolicitudCompra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_cotizacionProveedorId_fkey" FOREIGN KEY ("cotizacionProveedorId") REFERENCES "CotizacionProveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Importacion" ADD CONSTRAINT "Importacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Importacion" ADD CONSTRAINT "Importacion_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Importacion" ADD CONSTRAINT "Importacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Importacion" ADD CONSTRAINT "Importacion_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacionItem" ADD CONSTRAINT "ImportacionItem_importacionId_fkey" FOREIGN KEY ("importacionId") REFERENCES "Importacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacionItem" ADD CONSTRAINT "ImportacionItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportacionGasto" ADD CONSTRAINT "ImportacionGasto_importacionId_fkey" FOREIGN KEY ("importacionId") REFERENCES "Importacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudCompra" ADD CONSTRAINT "SolicitudCompra_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudCompra" ADD CONSTRAINT "SolicitudCompra_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "Sede"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudCompra" ADD CONSTRAINT "SolicitudCompra_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudCompraItem" ADD CONSTRAINT "SolicitudCompraItem_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudCompraItem" ADD CONSTRAINT "SolicitudCompraItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedor" ADD CONSTRAINT "CotizacionProveedor_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_cotizacionId_fkey" FOREIGN KEY ("cotizacionId") REFERENCES "CotizacionProveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CotizacionProveedorItem" ADD CONSTRAINT "CotizacionProveedorItem_solicitudItemId_fkey" FOREIGN KEY ("solicitudItemId") REFERENCES "SolicitudCompraItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

