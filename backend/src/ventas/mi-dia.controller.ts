import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MiDiaService } from './mi-dia.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { User } from '../common/decorators/user.decorator';

interface UsuarioJwt {
  id: number;
  empresaId: number;
  rol?: string;
  sedeId?: number;
}

/**
 * "Mi día" del vendedor.
 *
 * No lleva `@RequierePermiso`: cada quien ve LO SUYO, y eso no hay que
 * autorizarlo. Quien manda es el id del token, no un parámetro —pedir los datos
 * de otro vendedor no está en la API, así que no hace falta defenderlo.
 *
 * Gerencia sí ve el consolidado (`?todos=true`), que es para lo que sirve ser
 * gerencia; a cualquier otro rol se le ignora el parámetro.
 */
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Controller('ventas')
export class MiDiaController {
  constructor(private readonly service: MiDiaService) {}

  @Get('mi-dia')
  miDia(@User() user: UsuarioJwt, @Query('todos') todos?: string) {
    const esGerencia = user.rol === 'ADMIN_EMPRESA';
    return this.service.resumen(user.empresaId, user.id, {
      todos: esGerencia && todos === 'true',
      sedeId: user.sedeId,
    });
  }
}
