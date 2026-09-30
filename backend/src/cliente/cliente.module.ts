import { Module } from '@nestjs/common';
import { ClienteService } from './cliente.service';
import { ClienteController } from './cliente.controller';
import { ProveedoresController } from './proveedores.controller';
import { CreditoClienteService } from './credito.service';
import {
  CreditoController,
  CreditoPanelController,
} from './credito.controller';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [
    ClienteController,
    ProveedoresController,
    CreditoController,
    CreditoPanelController,
  ],
  providers: [ClienteService, CreditoClienteService, RolesGuard],
  exports: [ClienteService, CreditoClienteService],
})
export class ClienteModule {}
