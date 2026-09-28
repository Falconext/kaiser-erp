import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequierePermiso } from '../common/decorators/permiso.decorator';
import { OrdenCompraService } from './orden-compra.service';
import {
  ActualizarOrdenCompraDto,
  CrearOrdenCompraDto,
  RecibirOrdenCompraDto,
} from './dto/orden-compra.dto';

@Controller('compras/ordenes')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
@RequierePermiso('compras')
export class OrdenCompraController {
  constructor(private readonly service: OrdenCompraService) {}

  @RequierePermiso('compras:escribir')
  @Post()
  async crear(@Request() req, @Body() body: CrearOrdenCompraDto) {
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

  @Get(':id/pdf')
  async pdf(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const file = await this.service.pdf(req.user.empresaId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.end(file.buffer);
  }

  @RequierePermiso('compras:escribir')
  @Put(':id')
  async actualizar(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarOrdenCompraDto,
  ) {
    return this.service.actualizar(req.user.empresaId, id, body);
  }

  @RequierePermiso('compras:escribir')
  @Patch(':id/anular')
  async anular(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.anular(req.user.empresaId, id);
  }

  @RequierePermiso('compras:escribir')
  @Post(':id/recibir')
  async recibir(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RecibirOrdenCompraDto,
  ) {
    return this.service.recibir(
      req.user.empresaId,
      req.user.id,
      id,
      body,
      req.user.sedeId,
    );
  }
}
