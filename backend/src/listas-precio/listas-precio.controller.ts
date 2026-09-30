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
  UseGuards,
} from '@nestjs/common';
import { ListasPrecioService } from './listas-precio.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { RequierePermiso } from '../common/decorators/permiso.decorator';
import { User } from '../common/decorators/user.decorator';

interface UsuarioJwt {
  id: number;
  empresaId: number;
}

/**
 * Listas de precio.
 *
 * Las LECTURAS quedan abiertas a cualquier autenticado, como el resto de las
 * consultas: el vendedor que cotiza necesita el precio que le toca a su cliente.
 * Lo que ESCRIBE exige `clientes` —quien define a qué precio se le vende a quién
 * es comercial, no el vendedor de turno.
 */
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Controller('listas-precio')
export class ListasPrecioController {
  constructor(private readonly service: ListasPrecioService) {}

  @Get()
  listar(@User() user: UsuarioJwt, @Query('incluirInactivas') inc?: string) {
    return this.service.listar(user.empresaId, inc === 'true');
  }

  @Get(':id')
  obtener(@User() user: UsuarioJwt, @Param('id', ParseIntPipe) id: number) {
    return this.service.obtener(user.empresaId, id);
  }

  /** El precio que le toca a un cliente por un producto, con el porqué. */
  @Get('precio/:clienteId/:productoId')
  precio(
    @User() user: UsuarioJwt,
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Param('productoId', ParseIntPipe) productoId: number,
  ) {
    return this.service.precioPara(user.empresaId, clienteId, productoId);
  }

  @RequierePermiso('clientes')
  @Post()
  crear(
    @User() user: UsuarioJwt,
    @Body()
    dto: { nombre: string; descripcion?: string; ajustePorcentaje?: number },
  ) {
    return this.service.crear(user.empresaId, dto);
  }

  @RequierePermiso('clientes')
  @Put(':id')
  actualizar(
    @User() user: UsuarioJwt,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    dto: {
      nombre?: string;
      descripcion?: string;
      ajustePorcentaje?: number | null;
      activa?: boolean;
    },
  ) {
    return this.service.actualizar(user.empresaId, id, dto);
  }

  @RequierePermiso('clientes')
  @Delete(':id')
  eliminar(@User() user: UsuarioJwt, @Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(user.empresaId, id);
  }

  @RequierePermiso('clientes')
  @Put(':id/productos/:productoId')
  fijarPrecio(
    @User() user: UsuarioJwt,
    @Param('id', ParseIntPipe) id: number,
    @Param('productoId', ParseIntPipe) productoId: number,
    @Body() dto: { precio: number },
  ) {
    return this.service.fijarPrecio(
      user.empresaId,
      id,
      productoId,
      Number(dto?.precio),
    );
  }

  @RequierePermiso('clientes')
  @Delete(':id/productos/:productoId')
  quitarPrecio(
    @User() user: UsuarioJwt,
    @Param('id', ParseIntPipe) id: number,
    @Param('productoId', ParseIntPipe) productoId: number,
  ) {
    return this.service.quitarPrecio(user.empresaId, id, productoId);
  }

  @RequierePermiso('clientes')
  @Patch('asignar/:clienteId')
  asignar(
    @User() user: UsuarioJwt,
    @Param('clienteId', ParseIntPipe) clienteId: number,
    @Body() dto: { listaPrecioId: number | null },
  ) {
    const id =
      dto?.listaPrecioId === null || dto?.listaPrecioId === undefined
        ? null
        : Number(dto.listaPrecioId);
    return this.service.asignarACliente(user.empresaId, clienteId, id);
  }
}
