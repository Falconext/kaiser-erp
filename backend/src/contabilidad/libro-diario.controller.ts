import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrigenAsiento } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequierePermiso } from '../common/decorators/permiso.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { LibroDiarioService } from './libro-diario.service';
import { GeneracionAsientosService } from './generacion-asientos.service';
import {
  CrearAsientoDto,
  ExtornarAsientoDto,
  GenerarAsientosDto,
} from './dto/asiento.dto';

/** Lo que `JwtStrategy.validate()` deja en `req.user`. */
interface UsuarioJwt {
  id: number;
  empresaId: number;
  sedeId: number | null;
  rol: string;
}

/**
 * Libro Diario. Las lecturas quedan abiertas a cualquier usuario autenticado
 * (criterio de toda la API: consultar no exige permiso, escribir sí); registrar,
 * extornar y cerrar períodos piden `contabilidad`.
 */
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Controller('contabilidad')
export class LibroDiarioController {
  constructor(
    private readonly diario: LibroDiarioService,
    private readonly generacion: GeneracionAsientosService,
  ) {}

  private periodo(anio?: string, mes?: string) {
    const hoy = this.diario.periodoDe(new Date());
    const a = anio ? Number(anio) : hoy.anio;
    const m = mes ? Number(mes) : hoy.mes;
    if (!Number.isInteger(a) || !Number.isInteger(m))
      throw new BadRequestException('anio y mes deben ser enteros');
    return { anio: a, mes: m };
  }

  @Get('plan-cuentas')
  planCuentas(
    @User() user: UsuarioJwt,
    @Query('imputables') imputables?: string,
  ) {
    return this.diario.planCuentas(user.empresaId, imputables === 'true');
  }

  @Get('periodos')
  periodos(@User() user: UsuarioJwt) {
    return this.diario.listarPeriodos(user.empresaId);
  }

  @Get('asientos')
  listar(
    @User() user: UsuarioJwt,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
    @Query('sedeId') sedeId?: string,
    @Query('origen') origen?: string,
  ) {
    const p = this.periodo(anio, mes);
    if (origen && !(origen in OrigenAsiento))
      throw new BadRequestException(`Origen desconocido: ${origen}`);
    return this.diario.listar(user.empresaId, p.anio, p.mes, {
      sedeId: sedeId ? Number(sedeId) : undefined,
      origen: origen as OrigenAsiento | undefined,
    });
  }

  @Get('asientos/:id')
  obtener(@User() user: UsuarioJwt, @Param('id', ParseIntPipe) id: number) {
    return this.diario.obtener(user.empresaId, id);
  }

  @Post('asientos')
  @RequierePermiso('contabilidad')
  crear(@User() user: UsuarioJwt, @Body() dto: CrearAsientoDto) {
    return this.diario.registrarManual(
      user.empresaId,
      user.id,
      user.sedeId ?? null,
      dto,
    );
  }

  @Post('asientos/:id/extornar')
  @RequierePermiso('contabilidad')
  extornar(
    @User() user: UsuarioJwt,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExtornarAsientoDto,
  ) {
    return this.diario.extornar(user.empresaId, user.id, id, dto ?? {});
  }

  /**
   * Genera por lote los asientos de las ventas y compras del período.
   *
   * Va aparte de la transacción de cada documento a propósito: facturar no
   * puede depender de que la contabilidad esté bien configurada, y un error
   * contable no puede tumbar una venta. Contabilidad revisa y genera cuando
   * cierra el mes, que es como se trabaja.
   *
   * Con `?simular=true` no escribe: devuelve lo que haría, para la vista previa.
   */
  @Post('generar')
  @RequierePermiso('contabilidad')
  generar(
    @User() user: UsuarioJwt,
    @Body() dto: GenerarAsientosDto,
    @Query('simular') simular?: string,
  ) {
    const p = this.periodo(
      dto?.anio ? String(dto.anio) : undefined,
      dto?.mes ? String(dto.mes) : undefined,
    );
    if (dto?.origenes?.some((o) => !(o in OrigenAsiento)))
      throw new BadRequestException('Origen desconocido en la lista');
    return this.generacion.generar(user.empresaId, user.id, {
      anio: p.anio,
      mes: p.mes,
      sedeId: dto?.sedeId ?? undefined,
      origenes: dto?.origenes as OrigenAsiento[] | undefined,
      simular: simular === 'true',
    });
  }

  @Post('periodos/:anio/:mes/cerrar')
  @RequierePermiso('contabilidad')
  cerrar(
    @User() user: UsuarioJwt,
    @Param('anio', ParseIntPipe) anio: number,
    @Param('mes', ParseIntPipe) mes: number,
  ) {
    return this.diario.cerrarPeriodo(user.empresaId, anio, mes, user.id);
  }

  /** Reabrir deshace un cierre declarado: solo gerencia. */
  @Post('periodos/:anio/:mes/reabrir')
  @Roles('ADMIN_EMPRESA')
  @RequierePermiso('contabilidad')
  reabrir(
    @User() user: UsuarioJwt,
    @Param('anio', ParseIntPipe) anio: number,
    @Param('mes', ParseIntPipe) mes: number,
  ) {
    return this.diario.reabrirPeriodo(user.empresaId, anio, mes);
  }
}
