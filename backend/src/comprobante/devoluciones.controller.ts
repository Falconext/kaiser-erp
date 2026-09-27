import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { DevolucionesService } from './devoluciones.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequierePermiso } from '../common/decorators/permiso.decorator';

/**
 * Devoluciones de mercadería por nota de crédito.
 *
 * Las lecturas quedan abiertas: comercial necesita ver qué se devolvió y qué
 * anotó almacén, que es justo lo que pidieron ("el área comercial poder verlas
 * y que todos estén informados"). Confirmar o rechazar sí exige almacén.
 */
@Controller('devoluciones')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
export class DevolucionesController {
  constructor(private readonly service: DevolucionesService) {}

  @Get()
  listar(
    @Request() req,
    @Query('estado') estado?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.listar(req.user.empresaId, {
      estado,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.obtener(id, req.user.empresaId);
  }

  @RequierePermiso('kardex:escribir')
  @Patch(':id/confirmar')
  confirmar(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body()
    dto: {
      observaciones?: string;
      lineas: {
        detalleId: number;
        cantidadRecibida: number;
        cantidadDanada?: number;
        observacion?: string;
      }[];
    },
  ) {
    return this.service.confirmar(id, req.user.empresaId, req.user.id, dto);
  }

  @RequierePermiso('kardex:escribir')
  @Patch(':id/rechazar')
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body('motivo') motivo: string,
  ) {
    return this.service.rechazar(id, req.user.empresaId, req.user.id, motivo);
  }
}
