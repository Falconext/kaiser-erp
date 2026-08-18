import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ComprobanteModule } from '../comprobante/comprobante.module';
import { S3Module } from '../s3/s3.module';
import { FlujoComercialService } from './flujo-comercial.service';
import { FlujoComercialController } from './flujo-comercial.controller';

@Module({
  imports: [PrismaModule, ComprobanteModule, S3Module],
  providers: [FlujoComercialService],
  controllers: [FlujoComercialController],
  exports: [FlujoComercialService],
})
export class FlujoComercialModule {}
