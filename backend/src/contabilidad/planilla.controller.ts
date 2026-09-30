import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequierePermiso } from '../common/decorators/permiso.decorator';
import { User } from '../common/decorators/user.decorator';
import { excelUploadOptions } from '../common/utils/multer.config';
import { PlanillaService } from './planilla.service';

interface UsuarioJwt {
  id: number;
  empresaId: number;
  sedeId: number | null;
  rol: string;
}

/**
 * Planilla importada: el ERP no la calcula, la recibe.
 *
 * Todo lo de aquí es de contabilidad, incluidas las lecturas: una planilla trae
 * el sueldo de cada trabajador con su nombre, y eso no es dato de consulta
 * general como el stock o el plan de cuentas. Es la excepción razonada a la
 * regla de la casa de dejar los GET abiertos.
 */
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@RequierePermiso('contabilidad')
@Controller('contabilidad/planilla')
export class PlanillaController {
  constructor(private readonly planilla: PlanillaService) {}

  private periodo(anio: unknown, mes: unknown) {
    const a = Number(anio);
    const m = Number(mes);
    if (!Number.isInteger(m) || m < 1 || m > 12)
      throw new BadRequestException('mes inválido (1-12)');
    if (!Number.isInteger(a) || a < 2000)
      throw new BadRequestException('anio inválido');
    return { anio: a, mes: m };
  }

  /** El Excel que hay que rellenar, con su hoja de instrucciones. */
  @Get('plantilla')
  plantilla(@Res() res: Response) {
    const buffer = this.planilla.plantilla();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Plantilla-planilla.xlsx"',
    );
    res.setHeader('Content-Length', buffer.length.toString());
    return res.end(buffer);
  }

  /**
   * Sube el Excel. Con `?simular=true` no escribe nada: devuelve lo que leyó,
   * los totales y **todos** los errores, para la vista previa.
   */
  @Post('importar')
  @UseInterceptors(FileInterceptor('file', excelUploadOptions))
  async importar(
    @User() user: UsuarioJwt,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { anio?: string; mes?: string },
    @Query('simular') simular?: string,
  ) {
    if (!file?.buffer?.length)
      throw new BadRequestException('Falta el archivo de la planilla.');
    const p = this.periodo(body?.anio, body?.mes);
    return this.planilla.importar({
      empresaId: user.empresaId,
      usuarioId: user.id,
      anio: p.anio,
      mes: p.mes,
      buffer: file.buffer,
      nombreArchivo: file.originalname,
      simular: simular === 'true',
    });
  }

  @Get()
  historial(@User() user: UsuarioJwt) {
    return this.planilla.historial(user.empresaId);
  }

  @Get(':id')
  detalle(@User() user: UsuarioJwt, @Param('id', ParseIntPipe) id: number) {
    return this.planilla.detalle(user.empresaId, id);
  }

  @Delete(':id')
  eliminar(@User() user: UsuarioJwt, @Param('id', ParseIntPipe) id: number) {
    return this.planilla.eliminar(user.empresaId, id);
  }
}
