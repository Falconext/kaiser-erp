import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DespachoPendienteService } from './despacho-pendiente.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { RequierePermiso } from '../common/decorators/permiso.decorator';
import { User } from '../common/decorators/user.decorator';

interface UsuarioJwt {
  id: number;
  empresaId: number;
  sedeId?: number;
}

/**
 * Qué queda por despachar.
 *
 * Las LECTURAS quedan abiertas: el vendedor al que un cliente llama preguntando
 * por su mercadería tiene que poder contestar sin pedirle el favor a almacén.
 * Solo el disparo manual del aviso exige permiso, porque escribe notificaciones.
 */
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Controller('despachos')
export class DespachoPendienteController {
  constructor(private readonly service: DespachoPendienteService) {}

  @Get('pendientes')
  pendientes(
    @User() user: UsuarioJwt,
    @Query('sedeId') sedeId?: string,
    @Query('dias') dias?: string,
    @Query('incluirCompletos') incluirCompletos?: string,
  ) {
    const d = Number(dias);
    return this.service.pendientes(user.empresaId, {
      sedeId: sedeId ? Number(sedeId) : (user.sedeId ?? undefined),
      desde:
        d > 0 ? new Date(Date.now() - d * 24 * 60 * 60 * 1000) : undefined,
      soloPendientes: incluirCompletos !== 'true',
    });
  }

  @Get('pendientes/:comprobanteId')
  deComprobante(
    @User() user: UsuarioJwt,
    @Param('comprobanteId', ParseIntPipe) comprobanteId: number,
  ) {
    return this.service.deComprobante(user.empresaId, comprobanteId);
  }

  /** Dispara el aviso a mano. El scheduler lo hace una vez al día. */
  @RequierePermiso('guias-remision', 'kardex:escribir')
  @Post('avisar')
  avisar(@User() user: UsuarioJwt, @Query('diasGracia') diasGracia?: string) {
    const d = Number(diasGracia);
    return this.service.avisar(
      user.empresaId,
      Number.isFinite(d) && d >= 0 ? d : 1,
    );
  }
}
