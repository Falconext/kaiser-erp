import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OlvaService } from './olva.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RequierePermiso } from '../common/decorators/permiso.decorator';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { User } from '../common/decorators/user.decorator';
import {
  ConfigOlvaDto,
  CotizarOlvaDto,
  CrearGuiaOlvaDto,
  TrackOlvaDto,
} from './dto/olva.dto';

/**
 * Las LECTURAS quedan abiertas a cualquier usuario autenticado (agencias,
 * rastreo, cotización, rótulo): un vendedor tiene que poder decirle al cliente
 * dónde va su paquete sin pedirle el favor a almacén.
 *
 * Las ESCRITURAS exigen `guias-remision`, el permiso del área de despacho,
 * siguiendo la regla del proyecto. Aquí no es un formalismo: `POST guia/:id`
 * crea un envío REAL en la cuenta del courier y `PATCH` cambia la cuenta
 * conectada de la empresa — un 403 es preferible a una guía que nadie pidió.
 */
@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('olva')
export class OlvaController {
  constructor(private readonly service: OlvaService) {}

  // ─── Catálogo (todos los planes con el módulo) ────────────────────────────

  @Get('agencias')
  getAgencias(@User() user: any) {
    return this.service.getAgencias(user?.empresaId);
  }

  @Get('agencias/cercanas')
  agenciasCercanas(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('limit') limit: string | undefined,
  ) {
    return this.service.agenciasCercanas(
      Number(lat),
      Number(lng),
      limit ? Number(limit) : 5,
    );
  }

  @Get('ubigeos')
  ubigeos() {
    return this.service.ubigeos();
  }

  @Get('categorias')
  categorias() {
    return this.service.categoriasArticulo();
  }

  @Get('tamanos')
  tamanos() {
    return this.service.tamanosEstandar();
  }

  /** Datos de RENIEC/SUNAT que expone Olva para autocompletar destinatarios. */
  @Get('persona/:tipoDoc/:nroDoc')
  buscarPersona(
    @Param('tipoDoc') tipoDoc: string,
    @Param('nroDoc') nroDoc: string,
  ) {
    return this.service.buscarPersona(tipoDoc, nroDoc);
  }

  // ─── Rastreo ──────────────────────────────────────────────────────────────

  @Post('track')
  @HttpCode(200)
  track(
    @Body() body: TrackOlvaDto,
    @Query('refresh') refreshQuery: string | undefined,
    @User() user: any,
  ) {
    // Read-through cache: responde al instante desde el snapshot persistido y
    // solo golpea a Olva si está viejo (>10 min) o se pide `refresh`.
    const refresh = body?.refresh === true || refreshQuery === '1';
    return this.service.trackConCache(
      body.trackingNumber,
      body.year,
      user?.empresaId,
      refresh,
    );
  }

  @Post('cotizar')
  @HttpCode(200)
  cotizar(@Body() dto: CotizarOlvaDto) {
    return this.service.cotizar(dto);
  }

  // ─── Configuración de la empresa ──────────────────────────────────────────

  @Get('config')
  getConfig(@User() user: any) {
    return this.service.getConfig(user?.empresaId);
  }

  @RequierePermiso('guias-remision')
  @Patch('config')
  actualizarConfig(@Body() dto: ConfigOlvaDto, @User() user: any) {
    return this.service.actualizarConfig(user.empresaId, dto);
  }

  // ─── Guías (característica `tieneOlvaGuias` del plan) ─────────────────────

  // Genera la guía en Olva desde el despacho del comprobante y guarda el N° de
  // guía devuelto (lo que el rastreo necesita después).
  @RequierePermiso('guias-remision')
  @Post('guia/:comprobanteId')
  @HttpCode(200)
  crearGuia(
    @Param('comprobanteId', ParseIntPipe) comprobanteId: number,
    @Body() dto: CrearGuiaOlvaDto,
    @User() user: any,
  ) {
    return this.service.crearGuiaDesdeDespacho(
      comprobanteId,
      user.empresaId,
      dto,
    );
  }
}
