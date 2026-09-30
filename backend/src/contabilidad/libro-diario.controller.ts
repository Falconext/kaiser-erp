import * as XLSX from 'xlsx';
import type { Response } from 'express';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
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
import { LibroMayorService } from './libro-mayor.service';
import { PleService } from './ple.service';
import {
  ActualizarConfiguracionContableDto,
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
    private readonly mayor: LibroMayorService,
    private readonly ple: PleService,
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

  /**
   * Mapeo clave → cuenta con el que se generan los asientos. La lectura queda
   * abierta: la usa la pantalla de configuración y sirve para entender de dónde
   * salió cada línea de un asiento.
   */
  @Get('configuracion')
  configuracion(@User() user: UsuarioJwt) {
    return this.diario.configuracion(user.empresaId);
  }

  @Put('configuracion')
  @RequierePermiso('contabilidad')
  guardarConfiguracion(
    @User() user: UsuarioJwt,
    @Body() dto: ActualizarConfiguracionContableDto,
  ) {
    return this.diario.actualizarConfiguracion(user.empresaId, dto.items);
  }

  // ───────────────────────── Libro Mayor ─────────────────────────

  /** El mayor de una cuenta: de qué saldo venía, qué la movió y en qué queda. */
  @Get('mayor')
  mayorDeCuenta(
    @User() user: UsuarioJwt,
    @Query('cuenta') cuenta: string,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
    @Query('sedeId') sedeId?: string,
  ) {
    if (!cuenta?.trim())
      throw new BadRequestException('Falta el código de cuenta');
    const p = this.periodo(anio, mes);
    return this.mayor.mayorDeCuenta(
      user.empresaId,
      cuenta.trim(),
      p.anio,
      p.mes,
      sedeId ? Number(sedeId) : undefined,
    );
  }

  /** Balance de comprobación: todas las cuentas con movimiento y su saldo. */
  @Get('mayor/balance')
  balance(
    @User() user: UsuarioJwt,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
    @Query('sedeId') sedeId?: string,
  ) {
    const p = this.periodo(anio, mes);
    return this.mayor.balance(
      user.empresaId,
      p.anio,
      p.mes,
      sedeId ? Number(sedeId) : undefined,
    );
  }

  /**
   * Los asientos del período en Excel, una fila por línea, para el sistema
   * contable de la contadora. No hay integración en vivo con ningún sistema:
   * hay un archivo, igual que el «SISTCONT» del competidor.
   */
  @Get('asientos/exportar')
  async exportar(
    @User() user: UsuarioJwt,
    @Res() res: Response,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
    @Query('sedeId') sedeId?: string,
  ) {
    const p = this.periodo(anio, mes);
    const filas = await this.mayor.exportar(
      user.empresaId,
      p.anio,
      p.mes,
      sedeId ? Number(sedeId) : undefined,
    );
    const ws = XLSX.utils.json_to_sheet(
      filas.map((f) => ({
        PERIODO: f.periodo,
        CUO: f.cuo,
        ASIENTO: f.asiento,
        FECHA: f.fecha.toISOString().slice(0, 10),
        CUENTA: f.cuenta,
        DENOMINACION: f.denominacion,
        GLOSA: f.glosa,
        ORIGEN: f.origen,
        TIPO_DOC: f.tipoDoc ?? '',
        DOCUMENTO: f.documento ?? '',
        FECHA_VENCIMIENTO: f.fechaVencimiento
          ? f.fechaVencimiento.toISOString().slice(0, 10)
          : '',
        MONEDA: f.moneda,
        TIPO_CAMBIO: f.tipoCambio ?? '',
        SEDE: f.sede ?? '',
        DEBE: f.debe,
        HABER: f.haber,
      })),
    );
    ws['!cols'] = [
      { wch: 9 },
      { wch: 15 },
      { wch: 8 },
      { wch: 11 },
      { wch: 9 },
      { wch: 38 },
      { wch: 44 },
      { wch: 10 },
      { wch: 9 },
      { wch: 14 },
      { wch: 12 },
      { wch: 8 },
      { wch: 11 },
      { wch: 22 },
      { wch: 13 },
      { wch: 13 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ASIENTOS');
    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    const periodo = `${p.anio}${String(p.mes).padStart(2, '0')}`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Asientos-${periodo}.xlsx"`,
    );
    res.setHeader('Content-Length', buffer.length.toString());
    return res.end(buffer);
  }

  /**
   * Libro Diario (5.1) o Mayor (6.1) en TXT del PLE.
   *
   * ⚠ Sin validar contra el Programa Validador de SUNAT: ver la cabecera de
   * `ple.service.ts`. Se entrega para tenerlo y pasarlo por el PVS, no para
   * presentarlo a ciegas.
   */
  @Get('ple/:libro')
  async plePorLibro(
    @User() user: UsuarioJwt,
    @Res() res: Response,
    @Param('libro') libro: string,
    @Query('anio') anio?: string,
    @Query('mes') mes?: string,
    @Query('sedeId') sedeId?: string,
  ) {
    if (libro !== 'diario' && libro !== 'mayor')
      throw new BadRequestException(
        'El libro debe ser "diario" (5.1) o "mayor" (6.1)',
      );
    const p = this.periodo(anio, mes);
    const sede = sedeId ? Number(sedeId) : undefined;
    const r =
      libro === 'diario'
        ? await this.ple.diario(user.empresaId, p.anio, p.mes, sede)
        : await this.ple.mayor(user.empresaId, p.anio, p.mes, sede);
    const empresa = await this.diario.empresaRuc(user.empresaId);
    const nombre = this.ple.nombreArchivo(
      empresa,
      p.anio,
      p.mes,
      libro === 'diario' ? '050100' : '060100',
      r.lineas > 0,
    );
    const buffer = this.ple.aBuffer(r.filas);
    res.setHeader('Content-Type', 'text/plain; charset=ISO-8859-1');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    return res.end(buffer);
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

  /**
   * Asiento de apertura del inventario. Con `?simular=true` solo calcula.
   *
   * Es lo que hace que las cuentas de existencias dejen de salir en negativo:
   * sin él, cada venta descarga un almacén que contablemente estaba vacío.
   */
  @Post('apertura')
  @RequierePermiso('contabilidad')
  apertura(
    @User() user: UsuarioJwt,
    @Body() dto: { fecha?: string; sedeId?: number },
    @Query('simular') simular?: string,
  ) {
    const fecha = dto?.fecha ? new Date(dto.fecha) : new Date();
    if (Number.isNaN(fecha.getTime()))
      throw new BadRequestException('Fecha inválida');
    return this.generacion.apertura(user.empresaId, user.id, {
      fecha,
      sedeId: dto?.sedeId,
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
