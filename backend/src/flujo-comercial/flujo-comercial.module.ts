import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ComprobanteModule } from '../comprobante/comprobante.module';
import { FlujoComercialService } from './flujo-comercial.service';
import { FlujoComercialController } from './flujo-comercial.controller';

@Module({
  imports: [PrismaModule, ComprobanteModule],
  providers: [FlujoComercialService],
  controllers: [FlujoComercialController],
  exports: [FlujoComercialService],
})
export class FlujoComercialModule {}
