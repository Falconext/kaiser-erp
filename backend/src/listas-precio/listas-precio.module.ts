import { Module } from '@nestjs/common';
import { ListasPrecioService } from './listas-precio.service';
import { ListasPrecioController } from './listas-precio.controller';

@Module({
  controllers: [ListasPrecioController],
  providers: [ListasPrecioService],
  exports: [ListasPrecioService],
})
export class ListasPrecioModule {}
