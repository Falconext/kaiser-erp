import { Module } from '@nestjs/common';
import { ProduccionController } from './produccion.controller';
import { ProduccionService } from './produccion.service';
import { GenealogiaService } from './genealogia.service';
import { PrecioModuloService } from './precio-modulo.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductoModule } from '../producto/producto.module';

@Module({
  imports: [PrismaModule, ProductoModule],
  controllers: [ProduccionController],
  providers: [ProduccionService, GenealogiaService, PrecioModuloService],
  exports: [ProduccionService, GenealogiaService, PrecioModuloService],
})
export class ProduccionModule {}
