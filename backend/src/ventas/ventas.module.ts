import { Module } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';
import { MiDiaService } from './mi-dia.service';
import { MiDiaController } from './mi-dia.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ClienteModule } from '../cliente/cliente.module';
import { GuiaRemisionModule } from '../guia-remision/guia-remision.module';
import { CotizacionesModule } from '../cotizaciones/cotizaciones.module';

@Module({
  imports: [
    PrismaModule,
    ClienteModule,
    GuiaRemisionModule,
    CotizacionesModule,
  ],
  controllers: [VentasController, MiDiaController],
  providers: [VentasService, MiDiaService],
})
export class VentasModule {}
