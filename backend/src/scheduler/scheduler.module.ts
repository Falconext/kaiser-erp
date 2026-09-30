import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { VerificarPendientesSunatService } from './services/verificar-pendientes-sunat.service';
import { AvisarMercaderiaPorLlegarService } from './services/avisar-mercaderia-por-llegar.service';
import { PurgarTokensExpiradosService } from './services/purgar-tokens-expirados.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ComprobanteModule } from '../comprobante/comprobante.module';
import { S3Module } from '../s3/s3.module';
import { GuiaRemisionModule } from '../guia-remision/guia-remision.module';
import { CotizacionesModule } from '../cotizaciones/cotizaciones.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    NotificacionesModule,
    forwardRef(() => ComprobanteModule),
    forwardRef(() => GuiaRemisionModule),
    CotizacionesModule,
    S3Module,
    WhatsAppModule,
  ],
  providers: [
    SchedulerService,
    VerificarPendientesSunatService,
    AvisarMercaderiaPorLlegarService,
    PurgarTokensExpiradosService,
    PrismaService,
  ],
  exports: [VerificarPendientesSunatService],
})
export class SchedulerModule {}
