import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { KardexModule } from '../kardex/kardex.module';
import { ImportacionesController } from './importaciones.controller';
import { ImportacionesService } from './importaciones.service';

@Module({
  imports: [PrismaModule, KardexModule],
  controllers: [ImportacionesController],
  providers: [ImportacionesService],
})
export class ImportacionesModule {}
