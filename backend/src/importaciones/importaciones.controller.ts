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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ImportacionesService } from './importaciones.service';
import {
  ActualizarGastoImportacionDto,
  ActualizarImportacionDto,
  CambiarEstadoImportacionDto,
  CrearGastoImportacionDto,
  CrearImportacionDto,
  NacionalizarImportacionDto,
} from './dto/importacion.dto';

@Controller('importaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
export class ImportacionesController {
  constructor(private readonly service: ImportacionesService) {}

  @Post()
  async crear(@Request() req, @Body() body: CrearImportacionDto) {
    return this.service.crear(req.user.empresaId, req.user.id, body, req.user.sedeId);
  }

  @Get()
  async listar(@Request() req, @Query() query) {
    return this.service.listar(req.user.empresaId, query);
  }

  @Get(':id')
  async obtener(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.obtener(req.user.empresaId, id);
  }

  @Put(':id')
  async actualizar(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarImportacionDto,
  ) {
    return this.service.actualizar(req.user.empresaId, id, body);
  }

  @Patch(':id/estado')
  async cambiarEstado(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CambiarEstadoImportacionDto,
  ) {
    return this.service.cambiarEstado(req.user.empresaId, id, body.estado);
  }

  @Post(':id/gastos')
  async agregarGasto(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CrearGastoImportacionDto,
  ) {
    return this.service.agregarGasto(req.user.empresaId, id, body);
  }

  @Put(':id/gastos/:gastoId')
  async actualizarGasto(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('gastoId', ParseIntPipe) gastoId: number,
    @Body() body: ActualizarGastoImportacionDto,
  ) {
    return this.service.actualizarGasto(req.user.empresaId, id, gastoId, body);
  }

  @Delete(':id/gastos/:gastoId')
  async eliminarGasto(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('gastoId', ParseIntPipe) gastoId: number,
  ) {
    return this.service.eliminarGasto(req.user.empresaId, id, gastoId);
  }

  @Post(':id/liquidar')
  async liquidar(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.liquidar(req.user.empresaId, id);
  }

  @Post(':id/nacionalizar')
  async nacionalizar(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: NacionalizarImportacionDto,
  ) {
    return this.service.nacionalizar(
      req.user.empresaId,
      req.user.id,
      id,
      body,
      req.user.sedeId,
    );
  }
}
