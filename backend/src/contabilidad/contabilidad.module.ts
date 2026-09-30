import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CajaModule } from '../caja/caja.module';
import { ContabilidadController } from './contabilidad.controller';
import { ContabilidadService } from './contabilidad.service';
import { ArqueoService } from './arqueo.service';
import { SireService } from './sire.service';
import { LibroDiarioController } from './libro-diario.controller';
import { SireController } from './sire.controller';
import { LibroDiarioService } from './libro-diario.service';
import { GeneracionAsientosService } from './generacion-asientos.service';

@Module({
  imports: [PrismaModule, CajaModule],
  controllers: [ContabilidadController, LibroDiarioController, SireController],
  providers: [
    ContabilidadService,
    ArqueoService,
    SireService,
    LibroDiarioService,
    GeneracionAsientosService,
  ],
  exports: [LibroDiarioService, GeneracionAsientosService],
})
export class ContabilidadModule {}
