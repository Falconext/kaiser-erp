import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SedeService } from './sede.service';
import { CreateSedeDto } from './dto/create-sede.dto';
import { UpdateSedeDto } from './dto/update-sede.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { RequierePermiso } from '../common/decorators/permiso.decorator';

@UseGuards(JwtAuthGuard, PermisosGuard)
@Controller('sede')
export class SedeController {
  constructor(private readonly sedeService: SedeService) {}

  @RequierePermiso('sedes')
  @Post()
  create(@Body() createSedeDto: CreateSedeDto, @Request() req) {
    return this.sedeService.create(createSedeDto, req.user.empresaId);
  }

  @Get()
  findAll(@Request() req) {
    return this.sedeService.findAll(req.user.empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sedeService.findOne(+id);
  }

  @RequierePermiso('sedes')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSedeDto: UpdateSedeDto,
    @Request() req,
  ) {
    return this.sedeService.update(+id, updateSedeDto, req.user.empresaId);
  }

  @RequierePermiso('sedes')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sedeService.remove(+id);
  }

  /**
   * Sincroniza el stock de una sede copiando desde la sede principal.
   * Solo actualiza productos con stock = 0 para no pisar datos reales.
   * Usar para corregir sedes que quedaron con stock 0.
   * POST /sede/:id/sincronizar-stock
   */
  @RequierePermiso('sedes')
  @Post(':id/sincronizar-stock')
  sincronizarStock(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.sedeService.sincronizarStockDesdePrincipal(
      id,
      req.user.empresaId,
    );
  }
}
