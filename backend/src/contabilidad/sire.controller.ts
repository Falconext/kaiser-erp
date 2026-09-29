import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequierePermiso } from '../common/decorators/permiso.decorator';
import { User } from '../common/decorators/user.decorator';
import { SireService } from './sire.service';

interface UsuarioJwt {
  id: number;
  empresaId: number;
  sedeId: number | null;
  rol: string;
}

/**
 * SIRE: los libros electrónicos de SUNAT (RVIE de ventas, RCE de compras).
 *
 * Portado de falconext-mype, donde el módulo siguió evolucionando mientras la
 * copia de Kaiser se quedó en la versión inicial. Lo que llega de nuevo no es
 * sólo exportar: es **contrastar con SUNAT**. SUNAT ya sabe qué comprobantes
 * tienes; este módulo descarga su propuesta y dice qué le falta al libro y qué
 * le sobra, que es el trabajo que la contadora hace hoy a mano.
 *
 * El permiso `contabilidad` se mantiene a nivel de clase, igual que en el
 * controlador del que salieron estos endpoints: sacarlos a un archivo aparte no
 * es motivo para ampliar quién los ve.
 */
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@RequierePermiso('contabilidad')
@Controller('contabilidad')
export class SireController {
  constructor(private readonly sire: SireService) {}

  private periodo(mes: string, anio: string) {
    const m = parseInt(mes, 10);
    const a = parseInt(anio, 10);
    if (!m || m < 1 || m > 12)
      throw new BadRequestException('mes inválido (1-12)');
    if (!a || a < 2020) throw new BadRequestException('anio inválido');
    return { mes: m, anio: a };
  }

  private descargar(
    res: Response,
    nombre: string,
    buffer: Buffer,
    tipo: string,
  ) {
    res.setHeader('Content-Type', tipo);
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    return res.end(buffer);
  }

  // ─────────────────────── Antes de exportar ───────────────────────

  /**
   * Totales del período para cuadrar en pantalla —comprobantes, bases, IGV y
   * total— sin tener que bajarse el archivo y sumarlo a mano.
   */
  @Get('sire/ventas-resumen')
  ventasResumen(
    @User() user: UsuarioJwt,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Query('empresarial') empresarial?: string,
  ) {
    const p = this.periodo(mes, anio);
    return this.sire.obtenerResumenVentas(
      user.empresaId,
      p.mes,
      p.anio,
      empresarial === 'true',
      user.sedeId ?? undefined,
    );
  }

  @Get('sire/compras-resumen')
  comprasResumen(
    @User() user: UsuarioJwt,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
  ) {
    const p = this.periodo(mes, anio);
    return this.sire.obtenerResumenCompras(
      user.empresaId,
      p.mes,
      p.anio,
      user.sedeId ?? undefined,
    );
  }

  /**
   * Revisión previa: lo que queda fuera del libro, huecos de numeración,
   * documentos de identidad inválidos y notas de crédito sin documento
   * afectado. Es lo que SUNAT rechaza después.
   */
  @Get('sire/ventas-revision')
  ventasRevision(
    @User() user: UsuarioJwt,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Query('empresarial') empresarial?: string,
  ) {
    const p = this.periodo(mes, anio);
    return this.sire.obtenerRevisionVentas(
      user.empresaId,
      p.mes,
      p.anio,
      empresarial === 'true',
      user.sedeId ?? undefined,
    );
  }

  @Get('sire/compras-revision')
  comprasRevision(
    @User() user: UsuarioJwt,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
  ) {
    const p = this.periodo(mes, anio);
    return this.sire.obtenerRevisionCompras(
      user.empresaId,
      p.mes,
      p.anio,
      user.sedeId ?? undefined,
    );
  }

  /** IGV del período: débito de ventas menos crédito fiscal de compras. */
  @Get('sire/igv-periodo')
  igvPeriodo(
    @User() user: UsuarioJwt,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Query('empresarial') empresarial?: string,
  ) {
    const p = this.periodo(mes, anio);
    return this.sire.obtenerIgvPeriodo(
      user.empresaId,
      p.mes,
      p.anio,
      empresarial === 'true',
      user.sedeId ?? undefined,
    );
  }

  // ─────────────────────── Contrastar con SUNAT ───────────────────────

  /**
   * Compara la propuesta de SUNAT con lo que hay en el sistema. El archivo
   * viaja como texto en el cuerpo: el navegador lo lee en ISO-8859-1 —que es
   * como lo entrega SUNAT— y lo manda así, evitando multipart.
   */
  @Post('sire/ventas-comparar')
  ventasComparar(
    @User() user: UsuarioJwt,
    @Body()
    body: {
      mes: number;
      anio: number;
      contenido: string;
      empresarial?: boolean;
    },
  ) {
    if (!body?.contenido || typeof body.contenido !== 'string')
      throw new BadRequestException('Falta el contenido del archivo.');
    const p = this.periodo(String(body.mes), String(body.anio));
    return this.sire.compararConPropuesta({
      empresaId: user.empresaId,
      mes: p.mes,
      anio: p.anio,
      contenido: body.contenido,
      empresarial: body.empresarial ?? false,
      sedeId: user.sedeId ?? undefined,
    });
  }

  @Post('sire/compras-comparar')
  comprasComparar(
    @User() user: UsuarioJwt,
    @Body() body: { mes: number; anio: number; contenido: string },
  ) {
    if (!body?.contenido || typeof body.contenido !== 'string')
      throw new BadRequestException('Falta el contenido del archivo.');
    const p = this.periodo(String(body.mes), String(body.anio));
    return this.sire.compararComprasConPropuesta({
      empresaId: user.empresaId,
      mes: p.mes,
      anio: p.anio,
      contenido: body.contenido,
      sedeId: user.sedeId ?? undefined,
    });
  }

  /** Trae del SIRE las compras del período y las cruza con lo registrado. */
  @Post('sire/compras-sincronizar')
  comprasSincronizar(
    @User() user: UsuarioJwt,
    @Body() body: { mes: number; anio: number },
  ) {
    const p = this.periodo(String(body?.mes), String(body?.anio));
    return this.sire.sincronizarComprasDesdeSire(
      user.empresaId,
      p.mes,
      p.anio,
      user.sedeId ?? undefined,
    );
  }

  /** ¿Están configuradas las credenciales del SIRE de esta empresa? */
  @Get('sire/estado-conexion')
  estadoConexion(@User() user: UsuarioJwt) {
    return this.sire.estadoSire(user.empresaId);
  }

  /** Pide un token al SIRE y devuelve el diagnóstico de SUNAT tal cual. */
  @Post('sire/probar-conexion')
  probarConexion(@User() user: UsuarioJwt) {
    return this.sire.probarConexionSire(user.empresaId);
  }

  // ─────────────────────── Escribe ───────────────────────

  /**
   * El contador aprueba o deniega compras de cara al RCE. Es lo único de este
   * controlador que escribe: una compra DENEGADA queda fuera del libro con su
   * motivo.
   */
  @Post('sire/compras-revisar')
  @RequierePermiso('contabilidad')
  comprasRevisar(
    @User() user: UsuarioJwt,
    @Body()
    body: {
      ids: number[];
      estado: 'PENDIENTE' | 'APROBADA' | 'DENEGADA';
      motivo?: string;
    },
  ) {
    if (!['PENDIENTE', 'APROBADA', 'DENEGADA'].includes(String(body?.estado)))
      throw new BadRequestException(
        'Estado inválido: usa PENDIENTE, APROBADA o DENEGADA.',
      );
    return this.sire.revisarCompras(user.empresaId, user.id, body);
  }

  // ─────────────────────── Exportar ───────────────────────

  @Get('sire/ventas-txt')
  async ventasTxt(
    @User() user: UsuarioJwt,
    @Res() res: Response,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Query('empresarial') empresarial?: string,
  ) {
    const p = this.periodo(mes, anio);
    const buffer = await this.sire.generarTxtVentas(
      user.empresaId,
      p.mes,
      p.anio,
      empresarial === 'true',
      user.sedeId ?? undefined,
    );
    const periodo = `${p.anio}${String(p.mes).padStart(2, '0')}`;
    return this.descargar(
      res,
      `SIRE_RVIE_${periodo}.txt`,
      buffer,
      'text/plain; charset=utf-8',
    );
  }

  @Get('sire/ventas-excel')
  async ventasExcel(
    @User() user: UsuarioJwt,
    @Res() res: Response,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
    @Query('empresarial') empresarial?: string,
  ) {
    const p = this.periodo(mes, anio);
    const buffer = await this.sire.generarExcelVentas(
      user.empresaId,
      p.mes,
      p.anio,
      empresarial === 'true',
      user.sedeId ?? undefined,
    );
    const periodo = `${p.anio}${String(p.mes).padStart(2, '0')}`;
    return this.descargar(
      res,
      `SIRE_RVIE_${periodo}.xlsx`,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  @Get('sire/compras-txt')
  async comprasTxt(
    @User() user: UsuarioJwt,
    @Res() res: Response,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
  ) {
    const p = this.periodo(mes, anio);
    const buffer = await this.sire.generarTxtCompras(
      user.empresaId,
      p.mes,
      p.anio,
      user.sedeId ?? undefined,
    );
    const periodo = `${p.anio}${String(p.mes).padStart(2, '0')}`;
    return this.descargar(
      res,
      `SIRE_RCE_${periodo}.txt`,
      buffer,
      'text/plain; charset=utf-8',
    );
  }

  @Get('sire/compras-excel')
  async comprasExcel(
    @User() user: UsuarioJwt,
    @Res() res: Response,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
  ) {
    const p = this.periodo(mes, anio);
    const buffer = await this.sire.generarExcelCompras(
      user.empresaId,
      p.mes,
      p.anio,
      user.sedeId ?? undefined,
    );
    const periodo = `${p.anio}${String(p.mes).padStart(2, '0')}`;
    return this.descargar(
      res,
      `SIRE_RCE_${periodo}.xlsx`,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  @Post('sire/ventas-correo')
  @RequierePermiso('contabilidad')
  async ventasCorreo(
    @User() user: UsuarioJwt,
    @Body()
    body: {
      mes: number;
      anio: number;
      empresarial?: boolean;
      destinatario: string;
    },
  ) {
    if (!body?.destinatario)
      throw new BadRequestException('destinatario es requerido');
    await this.sire.enviarPorCorreo({
      tipo: 'ventas',
      mes: body.mes,
      anio: body.anio,
      empresarial: body.empresarial ?? false,
      empresaId: user.empresaId,
      destinatario: body.destinatario,
      sedeId: user.sedeId ?? undefined,
    });
    return { message: `Libro de ventas enviado a ${body.destinatario}` };
  }

  @Post('sire/compras-correo')
  @RequierePermiso('contabilidad')
  async comprasCorreo(
    @User() user: UsuarioJwt,
    @Body() body: { mes: number; anio: number; destinatario: string },
  ) {
    if (!body?.destinatario)
      throw new BadRequestException('destinatario es requerido');
    await this.sire.enviarPorCorreo({
      tipo: 'compras',
      mes: body.mes,
      anio: body.anio,
      empresaId: user.empresaId,
      destinatario: body.destinatario,
      sedeId: user.sedeId ?? undefined,
    });
    return { message: `Registro de compras enviado a ${body.destinatario}` };
  }
}
