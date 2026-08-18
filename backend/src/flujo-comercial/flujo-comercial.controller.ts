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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  // Ventas envía el pedido al encargado de autorizar (correo interno + voucher + datos de pago/entrega).
  @Post('pedidos/:id/enviar-correo')
  @UseInterceptors(FileInterceptor('comprobantePago'))
  enviarCorreo(
    @User() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // En multipart los campos llegan como strings; normalizar.
    const destinatarios = body?.destinatarios
      ? (Array.isArray(body.destinatarios) ? body.destinatarios : String(body.destinatarios).split(',').map((s: string) => s.trim()).filter(Boolean))
      : undefined;
    const data = {
      destinatarios,
      nroOperacion: body?.nroOperacion,
      banco: body?.banco,
      direccionEntrega: body?.direccionEntrega,
      clienteDireccionId: body?.clienteDireccionId ? Number(body.clienteDireccionId) : undefined,
      nota: body?.nota,
    };
    const voucher = file?.buffer
      ? { buffer: file.buffer, mimetype: file.mimetype, originalname: file.originalname }
      : undefined;
    return this.service.enviarAAutorizador(user.empresaId, id, data, voucher);
  }
}
