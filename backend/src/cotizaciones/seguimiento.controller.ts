import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  MotivoPerdida,
  ResultadoSeguimiento,
  TipoSeguimiento,
} from '@prisma/client';
import { SeguimientoCotizacionService } from './seguimiento.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { RequierePermiso } from '../common/decorators/permiso.decorator';
import { User } from '../common/decorators/user.decorator';
import {
  finDelDiaLima,
  inicioDelDiaLima,
  parseFechaSoloDia,
} from '../common/utils/fecha';

interface UsuarioJwt {
  id: number;
  empresaId: number;
  rol?: string;
}

/**
 * Seguimiento de cotizaciones.
 *
 * Las LECTURAS quedan abiertas, como el resto: cualquiera que atienda a un
 * cliente necesita saber qué se le dijo. Escribir en la bitácora exige
 * `cotizaciones` — es el registro de la gestión comercial, y se firma con nombre.
 */
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Controller('cotizaciones/seguimiento')
export class SeguimientoCotizacionController {
  constructor(private readonly service: SeguimientoCotizacionService) {}

  /** La bitácora completa de una cotización. */
  @Get(':comprobanteId')
  bitacora(
    @User() user: UsuarioJwt,
    @Param('comprobanteId', ParseIntPipe) comprobanteId: number,
  ) {
    return this.service.bitacora(user.empresaId, comprobanteId);
  }

  /** Anota un contacto. Lo automático lo escribe el sistema, esto es lo de fuera. */
  @RequierePermiso('cotizaciones')
  @Post(':comprobanteId')
  registrar(
    @User() user: UsuarioJwt,
    @Param('comprobanteId', ParseIntPipe) comprobanteId: number,
    @Body()
    dto: {
      tipo: TipoSeguimiento;
      resultado?: ResultadoSeguimiento;
      detalle?: string;
      proximaAccion?: string;
      proximaAccionEn?: string;
    },
  ) {
    return this.service.registrar(user.empresaId, comprobanteId, {
      usuarioId: user.id,
      tipo: dto.tipo,
      resultado: dto.resultado,
      detalle: dto.detalle,
      proximaAccion: dto.proximaAccion,
      // `new Date('2026-10-03')` es medianoche UTC, que en Lima son las 19:00 del
      // 2: la agenda guardaba y mostraba el día ANTERIOR al que eligió el
      // vendedor. `parseFechaSoloDia` la ancla al mediodía UTC, con lo que el día
      // calendario aguanta en cualquier zona de UTC-12 a UTC+12.
      proximaAccionEn: dto.proximaAccionEn
        ? parseFechaSoloDia(dto.proximaAccionEn)
        : null,
    });
  }

  /** Marcar como perdida, con su motivo. Sustituye a borrar la cotización. */
  @RequierePermiso('cotizaciones')
  @Post(':comprobanteId/perdida')
  perdida(
    @User() user: UsuarioJwt,
    @Param('comprobanteId', ParseIntPipe) comprobanteId: number,
    @Body() dto: { motivo: MotivoPerdida; detalle?: string },
  ) {
    return this.service.marcarPerdida(
      user.empresaId,
      comprobanteId,
      user.id,
      dto,
    );
  }
}

/** Reportes y agenda: no cuelgan de una cotización concreta. */
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Controller('cotizaciones')
export class SeguimientoPanelController {
  constructor(private readonly service: SeguimientoCotizacionService) {}

  /** Por qué perdemos: cuántas y cuánto dinero, por motivo. */
  @Get('por-que-perdemos')
  porQuePerdemos(
    @User() user: UsuarioJwt,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.porQuePerdemos(user.empresaId, {
      // El rango va contra `lte`/`gte`: `hasta` tiene que ser el FIN del día de
      // Lima o el propio día pedido se queda fuera del informe.
      desde: desde ? inicioDelDiaLima(desde) : undefined,
      hasta: hasta ? finDelDiaLima(hasta) : undefined,
    });
  }

  /**
   * Lo que toca hacer. Por defecto lo del usuario que pregunta; gerencia puede
   * pedir el consolidado del equipo.
   */
  @Get('agenda')
  agenda(
    @User() user: UsuarioJwt,
    @Query('dias') dias?: string,
    @Query('todos') todos?: string,
  ) {
    const esGerencia = user.rol === 'ADMIN_EMPRESA';
    const n = Number(dias);
    return this.service.agenda(user.empresaId, {
      usuarioId: esGerencia && todos === 'true' ? undefined : user.id,
      dias: Number.isFinite(n) && n >= 0 ? n : 0,
    });
  }
}
