import { Module } from '@nestjs/common';
import { GuiaRemisionController } from './guia-remision.controller';
import { GuiaRemisionService } from './guia-remision.service';
import { SunatGuiaService } from './sunat-guia.service';
import { DespachoPendienteService } from './despacho-pendiente.service';
import { DespachoPendienteController } from './despacho-pendiente.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ComprobanteModule } from '../comprobante/comprobante.module';
import { KardexModule } from '../kardex/kardex.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    PrismaModule,
    ComprobanteModule,
    KardexModule,
    NotificacionesModule,
  ],
  controllers: [GuiaRemisionController, DespachoPendienteController],
  providers: [GuiaRemisionService, SunatGuiaService, DespachoPendienteService],
  exports: [GuiaRemisionService, DespachoPendienteService],
})
export class GuiaRemisionModule {}
