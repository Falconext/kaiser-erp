import { Module } from '@nestjs/common';
import { SeguimientoCotizacionService } from './seguimiento.service';
import {
  SeguimientoCotizacionController,
  SeguimientoPanelController,
} from './seguimiento.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SeguimientoCotizacionController, SeguimientoPanelController],
  providers: [SeguimientoCotizacionService],
  exports: [SeguimientoCotizacionService],
})
export class CotizacionesModule {}
