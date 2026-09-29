import { forwardRef, Module } from '@nestjs/common';
import { EmpresaService } from './empresa.service';
import { ExportacionTotalService } from './exportacion-total.service';
import { SedeModule } from '../sede/sede.module';
import { EmpresaController } from './empresa.controller';
import { RolesGuard } from '../common/guards/roles.guard';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ComprobanteModule } from '../comprobante/comprobante.module';

@Module({
  imports: [SedeModule, WhatsAppModule, forwardRef(() => ComprobanteModule)],
  controllers: [EmpresaController],
  providers: [ExportacionTotalService, EmpresaService, RolesGuard],
  exports: [ExportacionTotalService, EmpresaService],
})
export class EmpresaModule {}
