import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  BadRequestException,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequierePermiso } from '../common/decorators/permiso.decorator';
import { ProduccionService } from './produccion.service';
import { GenealogiaService } from './genealogia.service';
import { CreateRecetaDto } from './dto/create-receta.dto';
import { UpdateRecetaDto } from './dto/update-receta.dto';
import { CreateOrdenProduccionDto } from './dto/create-orden-produccion.dto';
import { UpdateEstadoOrdenDto } from './dto/update-estado-orden.dto';
import { RegistrarEjecucionOrdenDto } from './dto/registrar-ejecucion-orden.dto';
import { EntregarMaterialOrdenDto } from './dto/entregar-material-orden.dto';
import { UpdateMetodoSalidaDto } from './dto/update-metodo-salida.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { excelUploadOptions } from '../common/utils/multer.config';

type RequestConUsuario = {
  user: {
    id: number;
    nombre?: string;
    email?: string;
    empresaId?: number;
    sedeId?: number;
    rol?: string;
  };
};

@Controller('produccion')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
@RequierePermiso('produccion')
export class ProduccionController {
  constructor(
    private readonly produccionService: ProduccionService,
    private readonly genealogiaService: GenealogiaService,
  ) {}

  private resolverEmpresaId(req: RequestConUsuario, empresaIdQuery?: string) {
    const empresaToken = req?.user?.empresaId;
    if (empresaToken) return Number(empresaToken);

    if (req?.user?.rol === 'ADMIN_SISTEMA' && empresaIdQuery) {
      return Number(empresaIdQuery);
    }

    throw new BadRequestException('No se encontró empresa activa.');
  }

  /**
   * De qué está hecho un producto y a dónde fue.
   *
   * Lleva `@RequierePermiso('produccion', 'kardex')` a propósito: un vendedor al
   * que un cliente le pregunta con qué está fabricada una malla tiene que poder
   * contestarlo sin pedirle el favor a planta. Es una lectura: no cambia nada.
   */
  @Get('genealogia/:idOcodigo')
  @RequierePermiso('produccion', 'kardex')
  genealogia(
    @Request() req: RequestConUsuario,
    @Param('idOcodigo') idOcodigo: string,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.genealogiaService.genealogia(empresaId, idOcodigo);
  }

  @Post('recetas')
  crearReceta(
    @Request() req: RequestConUsuario,
    @Body() dto: CreateRecetaDto,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.crearReceta(empresaId, dto);
  }

  @Get('recetas')
  listarRecetas(
    @Request() req: RequestConUsuario,
    @Query('activo') activo?: string,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.listarRecetas(empresaId, activo);
  }

  @Get('recetas/:id')
  obtenerReceta(
    @Request() req: RequestConUsuario,
    @Param('id', ParseIntPipe) recetaId: number,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.obtenerReceta(empresaId, recetaId);
  }

  @Patch('recetas/:id')
  actualizarReceta(
    @Request() req: RequestConUsuario,
    @Param('id', ParseIntPipe) recetaId: number,
    @Body() dto: UpdateRecetaDto,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.actualizarReceta(empresaId, recetaId, dto);
  }

  @Post('ordenes')
  crearOrden(
    @Request() req: RequestConUsuario,
    @Body() dto: CreateOrdenProduccionDto,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.crearOrden(empresaId, dto);
  }

  @Get('ordenes')
  listarOrdenes(
    @Request() req: RequestConUsuario,
    @Query() query: any,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.listarOrdenes(empresaId, query);
  }

  @Get('ordenes/:id')
  obtenerOrden(
    @Request() req: RequestConUsuario,
    @Param('id', ParseIntPipe) ordenId: number,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.obtenerOrden(empresaId, ordenId);
  }

  @Patch('ordenes/:id/estado')
  actualizarEstadoOrden(
    @Request() req: RequestConUsuario,
    @Param('id', ParseIntPipe) ordenId: number,
    @Body() dto: UpdateEstadoOrdenDto,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.actualizarEstadoOrden(
      empresaId,
      ordenId,
      dto,
    );
  }

  @Post('ordenes/:id/ejecutar')
  ejecutarOrden(
    @Request() req: RequestConUsuario,
    @Param('id', ParseIntPipe) ordenId: number,
    @Body() dto: RegistrarEjecucionOrdenDto,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.registrarEjecucionOrden(
      empresaId,
      ordenId,
      req.user.id,
      dto,
      req.user.sedeId,
    );
  }

  /// Almacén entrega material a planta. Escribe inventario, así que lo abre
  /// también quien tiene `kardex:escribir`: es almacén quien saca el material,
  /// no producción.
  @Post('ordenes/:id/entregar')
  @RequierePermiso('produccion', 'kardex:escribir')
  entregarMaterial(
    @Request() req: RequestConUsuario,
    @Param('id', ParseIntPipe) ordenId: number,
    @Body() dto: EntregarMaterialOrdenDto,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.entregarMaterialOrden(
      empresaId,
      ordenId,
      req.user.id,
      dto,
      req.user.sedeId,
    );
  }

  @Get('ordenes/:id/resumen-materiales')
  resumenMateriales(
    @Request() req: RequestConUsuario,
    @Param('id', ParseIntPipe) ordenId: number,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.resumenMaterialesOrden(empresaId, ordenId);
  }

  /// El mismo resumen en Excel, una fila por componente. Se exporta lo que la
  /// pantalla muestra, con las celdas vacías donde no hay dato: en una hoja de
  /// cálculo un 0.00 inventado entra en la siguiente suma que alguien escriba
  /// al lado.
  @Get('ordenes/:id/resumen-materiales/excel')
  async exportarResumenMateriales(
    @Request() req: RequestConUsuario,
    @Param('id', ParseIntPipe) ordenId: number,
    @Res() res: Response,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    const file = await this.produccionService.exportarLiquidacionOrden(
      empresaId,
      ordenId,
    );
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.status(200).send(file.buffer);
  }

  /// Los ingresos al almacén de mermas. Lo abre también quien tiene `kardex` o
  /// `contabilidad`, con el mismo criterio que la genealogía: planta genera la
  /// merma, almacén la pesa y la vende como chatarra, y contabilidad la
  /// valoriza. Negarle la lista a almacén haría inútil el almacén de mermas.
  @Get('mermas')
  @RequierePermiso('produccion', 'kardex', 'contabilidad')
  listarMermas(
    @Request() req: RequestConUsuario,
    @Query('tipo') tipo?: string,
    @Query('insumoId') insumoId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.listarMermasProduccion(empresaId, {
      tipo,
      insumoId: insumoId ? Number(insumoId) : undefined,
      desde,
      hasta,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('config')
  obtenerConfig(
    @Request() req: RequestConUsuario,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.obtenerConfiguracionProduccion(empresaId);
  }

  @Patch('config')
  actualizarConfig(
    @Request() req: RequestConUsuario,
    @Body() dto: UpdateMetodoSalidaDto,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.actualizarConfiguracionProduccion(
      empresaId,
      dto,
      req.user.id,
    );
  }

  @Get('config/historial')
  historialConfig(
    @Request() req: RequestConUsuario,
    @Query('limit') limit?: string,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.listarHistorialConfiguracionProduccion(
      empresaId,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('plantilla-carga')
  async descargarPlantillaCarga(
    @Request() req: RequestConUsuario,
    @Query('empresaId') empresaIdQuery: string | undefined,
    @Res() res: Response,
  ) {
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    const buffer =
      await this.produccionService.generarPlantillaCargaMasiva(empresaId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=plantilla_fabricacion_vendify.xlsx',
    );
    res.status(200).send(buffer);
  }

  @Post('importar-plantilla')
  @UseInterceptors(FileInterceptor('file', excelUploadOptions))
  async importarPlantilla(
    @Request() req: RequestConUsuario,
    @UploadedFile() file: Express.Multer.File,
    @Query('empresaId') empresaIdQuery?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException(
        'No se recibió archivo para importar plantilla.',
      );
    }
    const empresaId = this.resolverEmpresaId(req, empresaIdQuery);
    return this.produccionService.importarPlantillaFabricacion(
      file.buffer,
      empresaId,
      req.user.id,
      req.user.sedeId,
    );
  }
}
