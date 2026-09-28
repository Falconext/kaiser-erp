import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { RequierePermiso } from '../common/decorators/permiso.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { documentUploadOptions } from '../common/utils/multer.config';
import { SolicitudCompraService } from './solicitud-compra.service';
import { S3Service } from '../s3/s3.service';
import {
  ActualizarCotizacionProveedorDto,
  ActualizarSolicitudCompraDto,
  CambiarEstadoSolicitudDto,
  CrearCotizacionProveedorDto,
  CrearSolicitudCompraDto,
  SeleccionarCotizacionDto,
} from './dto/solicitud-compra.dto';

@Controller('compras/solicitudes')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@RequierePermiso('compras')
@Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
export class SolicitudCompraController {
  constructor(
    private readonly service: SolicitudCompraService,
    private readonly s3: S3Service,
  ) {}

  @RequierePermiso('compras:escribir')
  @Post()
  async crear(@Request() req, @Body() body: CrearSolicitudCompraDto) {
    return this.service.crear(
      req.user.empresaId,
      req.user.id,
      body,
      req.user.sedeId,
    );
  }

  @Get()
  async listar(@Request() req, @Query() query) {
    return this.service.listar(req.user.empresaId, query);
  }

  @Get(':id')
  async obtener(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.obtener(req.user.empresaId, id);
  }

  @RequierePermiso('compras:escribir')
  @Put(':id')
  async actualizar(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarSolicitudCompraDto,
  ) {
    return this.service.actualizar(req.user.empresaId, id, body);
  }

  @RequierePermiso('compras:escribir')
  @Patch(':id/estado')
  async cambiarEstado(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CambiarEstadoSolicitudDto,
  ) {
    return this.service.cambiarEstado(req.user.empresaId, id, body);
  }

  @RequierePermiso('compras:escribir')
  @Post(':id/cotizaciones')
  async agregarCotizacion(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CrearCotizacionProveedorDto,
  ) {
    return this.service.agregarCotizacion(req.user.empresaId, id, body);
  }

  @RequierePermiso('compras:escribir')
  @Put(':id/cotizaciones/:cotId')
  async actualizarCotizacion(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('cotId', ParseIntPipe) cotId: number,
    @Body() body: ActualizarCotizacionProveedorDto,
  ) {
    return this.service.actualizarCotizacion(
      req.user.empresaId,
      id,
      cotId,
      body,
    );
  }

  @RequierePermiso('compras:escribir')
  @Delete(':id/cotizaciones/:cotId')
  async eliminarCotizacion(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('cotId', ParseIntPipe) cotId: number,
  ) {
    return this.service.eliminarCotizacion(req.user.empresaId, id, cotId);
  }

  @RequierePermiso('compras:escribir')
  @Post(':id/cotizaciones/:cotId/archivo')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  async subirArchivo(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('cotId', ParseIntPipe) cotId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const key = `compras/solicitudes/${id}/cotizaciones/${cotId}-${Date.now()}-${file.originalname}`;
    const url = await this.s3.uploadPDF(file.buffer, key, file.mimetype);
    return this.service.actualizarArchivoCotizacion(
      req.user.empresaId,
      id,
      cotId,
      url,
    );
  }

  @Get(':id/comparativo')
  async comparativo(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.comparativo(req.user.empresaId, id);
  }

  @RequierePermiso('compras:escribir')
  @Post(':id/seleccionar')
  async seleccionar(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SeleccionarCotizacionDto,
  ) {
    return this.service.seleccionar(
      req.user.empresaId,
      req.user.id,
      id,
      body,
      req.user.sedeId,
    );
  }
}
