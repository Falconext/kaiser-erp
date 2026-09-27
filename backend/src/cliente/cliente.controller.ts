import {
  BadRequestException,
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
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ClienteService } from './cliente.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import type { Response } from 'express';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { ListClienteDto } from './dto/list-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { excelUploadOptions } from '../common/utils/multer.config';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { RequierePermiso } from '../common/decorators/permiso.decorator';

@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('clientes')
export class ClienteController {
  constructor(private readonly service: ClienteService) {}

  @RequierePermiso('clientes', 'compras')
  @Post()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async crear(
    @Body() dto: CreateClienteDto,
    @User() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cliente = await this.service.crear({
      ...dto,
      empresaId: user.empresaId,
    });
    res.locals.message = 'Cliente creado correctamente';
    return cliente;
  }

  @Get()
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async listar(
    @User() user: any,
    @Query() query: ListClienteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const resultado = await this.service.listar({
      empresaId: user.empresaId,
      search: query.search,
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
      persona: query.persona,
    });
    res.locals.message = 'Clientes listados correctamente';
    return resultado;
  }

  // Rutas literales primero — siempre antes que :id para evitar conflictos de matching
  @Get('consultar')
  async consultar(
    @Query('numero') numero: string,
    @Query('tipo') tipo: string,
  ) {
    if (!numero || !tipo) {
      throw new BadRequestException(
        'Parámetros "numero" y "tipo" son requeridos',
      );
    }
    return this.service.consultarDocumento(numero.toString(), tipo);
  }

  @Get('consultar/:tipo/:numero')
  async consultarPath(
    @Param('tipo') tipo: string,
    @Param('numero') numero: string,
  ) {
    if (!numero || !tipo) {
      throw new BadRequestException(
        'Parámetros "numero" y "tipo" son requeridos',
      );
    }
    return this.service.consultarDocumento(numero.toString(), tipo);
  }

  @Get('exportar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async exportarArchivoEmpresa(
    @User() user: any,
    @Query('search') search: string | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.service.exportar(user.empresaId, search);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename=clientes.xlsx');
    res.status(200).send(buffer);
  }

  @RequierePermiso('clientes', 'compras')
  @Post('importar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  @UseInterceptors(FileInterceptor('file', excelUploadOptions))
  async cargarMasivo(@UploadedFile() file: any, @User() user: any) {
    if (!file) {
      return {
        total: 0,
        exitosos: 0,
        fallidos: 0,
        detalles: [{ error: 'No se proporcionó un archivo Excel' }],
      };
    }
    return this.service.cargaMasiva(file.buffer, user.empresaId);
  }

  // Rutas con parámetros dinámicos al final
  @Get(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async obtenerPorId(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cliente = await this.service.obtenerPorId(id, user.empresaId);
    res.locals.message = 'Cliente obtenido correctamente';
    return cliente;
  }

  // ── Direcciones del cliente (sedes/sucursales) ──
  @Get(':id/direcciones')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async listarDirecciones(@Param('id', ParseIntPipe) id: number, @User() user: any) {
    return this.service.listarDirecciones(id, user.empresaId);
  }

  @RequierePermiso('clientes', 'compras')
  @Post(':id/direcciones')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async crearDireccion(@Param('id', ParseIntPipe) id: number, @User() user: any, @Body() body: any) {
    return this.service.crearDireccion(id, user.empresaId, body);
  }

  @RequierePermiso('clientes', 'compras')
  @Put(':id/direcciones/sincronizar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async sincronizarDirecciones(@Param('id', ParseIntPipe) id: number, @User() user: any, @Body() body: { direcciones: any[] }) {
    return this.service.sincronizarDirecciones(id, user.empresaId, body?.direcciones || []);
  }

  @RequierePermiso('clientes', 'compras')
  @Put(':id/direcciones/:direccionId')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async actualizarDireccion(
    @Param('id', ParseIntPipe) id: number,
    @Param('direccionId', ParseIntPipe) direccionId: number,
    @User() user: any,
    @Body() body: any,
  ) {
    return this.service.actualizarDireccion(id, direccionId, user.empresaId, body);
  }

  @RequierePermiso('clientes', 'compras')
  @Delete(':id/direcciones/:direccionId')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async eliminarDireccion(
    @Param('id', ParseIntPipe) id: number,
    @Param('direccionId', ParseIntPipe) direccionId: number,
    @User() user: any,
  ) {
    return this.service.eliminarDireccion(id, direccionId, user.empresaId);
  }

  // ── Contactos del cliente (comprador, jefe de planta, logística...) ──
  @Get(':id/contactos')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async listarContactos(@Param('id', ParseIntPipe) id: number, @User() user: any) {
    return this.service.listarContactos(id, user.empresaId);
  }

  @RequierePermiso('clientes', 'compras')
  @Post(':id/contactos')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async crearContacto(@Param('id', ParseIntPipe) id: number, @User() user: any, @Body() body: any) {
    return this.service.crearContacto(id, user.empresaId, body);
  }

  @RequierePermiso('clientes', 'compras')
  @Put(':id/contactos/sincronizar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async sincronizarContactos(@Param('id', ParseIntPipe) id: number, @User() user: any, @Body() body: { contactos: any[] }) {
    return this.service.sincronizarContactos(id, user.empresaId, body?.contactos || []);
  }

  @RequierePermiso('clientes', 'compras')
  @Put(':id/contactos/:contactoId')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async actualizarContacto(
    @Param('id', ParseIntPipe) id: number,
    @Param('contactoId', ParseIntPipe) contactoId: number,
    @User() user: any,
    @Body() body: any,
  ) {
    return this.service.actualizarContacto(id, contactoId, user.empresaId, body);
  }

  @RequierePermiso('clientes', 'compras')
  @Delete(':id/contactos/:contactoId')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async eliminarContacto(
    @Param('id', ParseIntPipe) id: number,
    @Param('contactoId', ParseIntPipe) contactoId: number,
    @User() user: any,
  ) {
    return this.service.eliminarContacto(id, contactoId, user.empresaId);
  }

  @RequierePermiso('clientes', 'compras')
  @Put(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any,
    @Body() body: Omit<UpdateClienteDto, 'id'>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const actualizado = await this.service.actualizar({
      id,
      empresaId: user.empresaId,
      ...body,
    });
    res.locals.message = 'Cliente actualizado correctamente';
    return actualizado;
  }

  @RequierePermiso('clientes', 'compras')
  @Patch(':id/estado')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any,
    @Body() body: { estado: 'ACTIVO' | 'INACTIVO' },
    @Res({ passthrough: true }) res: Response,
  ) {
    const actualizado = await this.service.cambiarEstado(
      id,
      user.empresaId,
      body.estado,
    );
    res.locals.message = `Cliente ${body.estado === 'ACTIVO' ? 'activado' : 'desactivado'} correctamente`;
    return actualizado;
  }

  @RequierePermiso('clientes', 'compras')
  @Delete(':id')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async eliminar(
    @Param('id', ParseIntPipe) id: number,
    @User() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const eliminado = await this.service.eliminar(id, user.empresaId);
    res.locals.message = 'Cliente eliminado correctamente';
    return eliminado;
  }
}
