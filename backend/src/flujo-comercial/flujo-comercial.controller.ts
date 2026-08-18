import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import { FlujoComercialService } from './flujo-comercial.service';

/**
 * API del flujo comercial de Kaiser: catálogo de autorizadores y transiciones
 * de estado de la Nota de Pedido (PENDIENTE → AUTORIZADO → ENTREGADO → FACTURADO,
 * o ANULADO). Ver FlujoComercialService.
 */
@UseGuards(JwtAuthGuard)
@Controller('flujo-comercial')
export class FlujoComercialController {
  constructor(private readonly service: FlujoComercialService) {}

  // ── Autorizadores ──
  @Get('autorizadores')
  listarAutorizadores(@User() user: any) {
    return this.service.listarAutorizadores(user.empresaId);
  }

  @Post('autorizadores')
  crearAutorizador(
    @User() user: any,
    @Body() body: { nombre: string; telefono?: string; email?: string },
  ) {
    return this.service.crearAutorizador(user.empresaId, body);
  }

  @Put('autorizadores/:id')
  actualizarAutorizador(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { nombre?: string; telefono?: string; email?: string; activo?: boolean },
  ) {
    return this.service.actualizarAutorizador(user.empresaId, id, body);
  }

  @Delete('autorizadores/:id')
  eliminarAutorizador(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.eliminarAutorizador(user.empresaId, id);
  }

  // ── Transiciones de estado del pedido ──
  @Post('pedidos/:id/autorizar')
  autorizar(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('autorizadoPorId', ParseIntPipe) autorizadoPorId: number,
  ) {
    return this.service.autorizar(user.empresaId, id, autorizadoPorId);
  }

  @Post('pedidos/:id/entregar')
  entregar(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.marcarEntregado(user.empresaId, id);
  }

  @Post('pedidos/:id/facturar')
  facturar(@User() user: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.marcarFacturado(user.empresaId, id);
  }

  @Post('pedidos/:id/anular')
  anular(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('motivo') motivo?: string,
  ) {
    return this.service.anular(user.empresaId, id, motivo);
  }

  // Ventas envía el pedido al encargado de autorizar (correo interno + guarda datos de pago/entrega).
  @Post('pedidos/:id/enviar-correo')
  enviarCorreo(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: {
      destinatarios?: string[];
      nroOperacion?: string;
      banco?: string;
      direccionEntrega?: string;
      clienteDireccionId?: number;
      nota?: string;
    },
  ) {
    return this.service.enviarAAutorizador(user.empresaId, id, body || {});
  }
}
