import { Module } from '@nestjs/common';
import { ProduccionController } from './produccion.controller';
import { ProduccionService } from './produccion.service';
import { GenealogiaService } from './genealogia.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductoModule } from '../producto/producto.module';

@Module({
  imports: [PrismaModule, ProductoModule],
  controllers: [ProduccionController],
  providers: [ProduccionService, GenealogiaService],
  exports: [ProduccionService, GenealogiaService],
})
export class ProduccionModule {}
