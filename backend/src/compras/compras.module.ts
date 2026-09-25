import { Module } from '@nestjs/common';
import { ComprasController } from './compras.controller';
import { ComprasService } from './compras.service';
import { PrismaModule } from '../prisma/prisma.module';
import { KardexModule } from '../kardex/kardex.module';
import { ProductoModule } from '../producto/producto.module';
import { ComprobanteModule } from '../comprobante/comprobante.module';
import { OrdenCompraController } from './orden-compra.controller';
import { OrdenCompraService } from './orden-compra.service';
import { SolicitudCompraController } from './solicitud-compra.controller';
import { SolicitudCompraService } from './solicitud-compra.service';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [
    PrismaModule,
    KardexModule,
    ProductoModule,
    ComprobanteModule,
    S3Module,
  ],
  controllers: [
    OrdenCompraController,
    SolicitudCompraController,
    ComprasController,
  ],
  providers: [ComprasService, OrdenCompraService, SolicitudCompraService],
})
export class ComprasModule {}
