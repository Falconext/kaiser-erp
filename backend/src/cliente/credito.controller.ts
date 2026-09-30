import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreditoClienteService } from './credito.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { User } from '../common/decorators/user.decorator';

interface UsuarioJwt {
  id: number;
  empresaId: number;
}

/**
 * Consulta del crédito de un cliente.
 *
 * Todo son LECTURAS y quedan abiertas a cualquier usuario autenticado, como el
 * resto de las consultas: el vendedor que va a tomar un pedido es justo quien
 * necesita saber si el cliente tiene cupo, y enterarse por un 403 al guardar no
 * es enterarse. Quien pone el límite es el formulario del cliente, que sí exige
 * el permiso de clientes.
 */
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Controller('clientes')
export class CreditoController {
  constructor(private readonly credito: CreditoClienteService) {}

  /** Panel de crédito: límite, deuda, disponible y los documentos que la forman. */
  @Get(':id/credito')
  estado(@User() user: UsuarioJwt, @Param('id', ParseIntPipe) id: number) {
    return this.credito.estado(user.empresaId, id);
  }

  /**
   * ¿Cabe una venta más de `importe` (con IGV)? Lo llama la pantalla de venta
   * antes de guardar, para avisar en el momento en vez de al final.
   */
  @Get(':id/credito/evaluar')
  evaluar(
    @User() user: UsuarioJwt,
    @Param('id', ParseIntPipe) id: number,
    @Query('importe') importe?: string,
  ) {
    return this.credito.evaluar(user.empresaId, id, Number(importe ?? 0) || 0);
  }
}

/** Los clientes pasados de su límite. Va aparte porque no cuelga de un id. */
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Controller('credito')
export class CreditoPanelController {
  constructor(private readonly credito: CreditoClienteService) {}

  @Get('excedidos')
  excedidos(@User() user: UsuarioJwt) {
    return this.credito.excedidos(user.empresaId);
  }

  /** La bandeja del autorizador: pedidos tomados sobre el límite, sin V°B°. */
  @Get('pedidos-retenidos')
  pedidosRetenidos(@User() user: UsuarioJwt) {
    return this.credito.pedidosRetenidos(user.empresaId);
  }
}
