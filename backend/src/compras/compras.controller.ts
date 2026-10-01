import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Res,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  BadRequestException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ComprasService } from './compras.service';
import { ImportarComprasService } from './importar-compras.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { RegistrarPagoCompraDto } from './dto/registrar-pago-compra.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermisosGuard } from '../common/guards/permisos.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequierePermiso } from '../common/decorators/permiso.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  xmlUploadOptions,
  documentUploadOptions,
  imageUploadOptions,
  spreadsheetUploadOptions,
} from '../common/utils/multer.config';

@Controller('compras')
@UseGuards(JwtAuthGuard, RolesGuard, PermisosGuard)
@Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
@RequierePermiso('compras')
export class ComprasController {
  constructor(
    private readonly comprasService: ComprasService,
    private readonly importarCompras: ImportarComprasService,
  ) {}

  @RequierePermiso('compras:escribir')
  @Post('parse-xml')
  @UseInterceptors(FileInterceptor('file', xmlUploadOptions))
  async parseXml(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file)
      throw new BadRequestException('No se proporcionó ningún archivo XML');
    return this.comprasService.parseXmlSunat(req.user.empresaId, file.buffer);
  }

  @RequierePermiso('compras:escribir')
  @Post()
  async crear(@Request() req, @Body() body: CrearCompraDto) {
    return this.comprasService.crear(
      req.user.empresaId,
      req.user.id,
      body,
      req.user.sedeId,
      req.user.rol,
    );
  }

  @Get()
  async listar(@Request() req, @Query() query) {
    const isAdmin = ['ADMIN_EMPRESA', 'ADMIN_SISTEMA'].includes(req.user.rol);
    // Admin puede pasar ?sedeId=X para filtrar, o dejar vacío para ver todas las sedes
    const sedeId = isAdmin
      ? query.sedeId
        ? Number(query.sedeId)
        : null
      : req.user.sedeId;
    return this.comprasService.listar(req.user.empresaId, query, sedeId);
  }

  // Último precio de compra (neto) por producto, para avisar al comprador si el
  // costo ingresado difiere del de la última compra. Acepta ?productoIds=1,2,3.
  @Get('ultimo-precio')
  async ultimoPrecio(
    @Request() req,
    @Query('productoIds') productoIds?: string,
  ) {
    const ids = String(productoIds || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    return this.comprasService.ultimoPrecioCompra(req.user.empresaId, ids);
  }

  @Get(':id')
  async obtenerPorId(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.comprasService.obtenerPorId(
      req.user.empresaId,
      id,
      req.user.sedeId,
    );
  }

  // Editar compra: revierte los efectos de inventario anteriores y re-aplica los
  // nuevos (stock/kardex, lotes, series). No modifica los pagos ya registrados.
  @RequierePermiso('compras:escribir')
  @Put(':id')
  async actualizar(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CrearCompraDto,
  ) {
    return this.comprasService.actualizar(
      req.user.empresaId,
      req.user.id,
      id,
      body,
      req.user.sedeId,
    );
  }

  // Anular compra (borrado lógico): marca estado ANULADO y revierte el stock con
  // un movimiento de kardex compensatorio. No borra el registro (auditoría).
  @RequierePermiso('compras:escribir')
  @Delete(':id')
  async anular(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.comprasService.anular(
      req.user.empresaId,
      req.user.id,
      id,
      req.user.sedeId,
    );
  }

  @RequierePermiso('compras:escribir')
  @Post(':id/pagos')
  async registrarPago(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RegistrarPagoCompraDto,
  ) {
    return this.comprasService.registrarPago(
      req.user.empresaId,
      req.user.id,
      id,
      body,
      req.user.sedeId,
    );
  }

  @RequierePermiso('compras:escribir')
  @Post(':id/registrar-pago')
  async registrarPagoAlias(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RegistrarPagoCompraDto,
  ) {
    return this.comprasService.registrarPago(
      req.user.empresaId,
      req.user.id,
      id,
      body,
      req.user.sedeId,
    );
  }

  /**
   * Anula un abono. Escribe, así que exige el permiso de compras: deshacer un
   * pago cambia el saldo de la compra y lo que el proveedor tiene cobrado.
   */
  // ── Importación masiva desde Excel ──────────────────────────────────────

  /** Plantilla precargada con el catálogo: el usuario solo llena cantidad y costo. */
  @Get('importar/plantilla')
  async plantillaImportar(@Request() req, @Res() res: Response) {
    const buffer = await this.importarCompras.plantilla(req.user.empresaId);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=plantilla_importar_compras.xlsx',
    );
    res.end(buffer);
  }

  /** Vista previa: parsea y valida el Excel SIN grabar nada. */
  @RequierePermiso('compras:escribir')
  @Post('importar/previsualizar')
  @UseInterceptors(FileInterceptor('file', spreadsheetUploadOptions))
  async previsualizarImportar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('No se recibió ningún archivo Excel/CSV.');
    }
    return this.importarCompras.previsualizar(
      req.user.empresaId,
      req.user.sedeId,
      file.buffer,
      this.opcionesImportar(body),
    );
  }

  /** Importa las compras válidas: una compra por proveedor + documento + sede. */
  @RequierePermiso('compras:escribir')
  @Post('importar')
  @UseInterceptors(FileInterceptor('file', spreadsheetUploadOptions))
  async importar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('No se recibió ningún archivo Excel/CSV.');
    }
    return this.importarCompras.importar(
      req.user.empresaId,
      req.user.id,
      req.user.rol,
      req.user.sedeId,
      file.buffer,
      this.opcionesImportar(body),
    );
  }

  /** En multipart los flags llegan como string; se normalizan aquí. */
  private opcionesImportar(body: any) {
    const flag = (v: any, def: boolean) =>
      v === undefined || v === null || v === '' ? def : String(v) === 'true';
    return {
      incluyeIgvDefault: flag(body?.incluyeIgvDefault, false),
      crearProductos: flag(body?.crearProductos, false),
      marcarPagado: flag(body?.marcarPagado, false),
      metodoPago: body?.metodoPago ? String(body.metodoPago) : undefined,
    };
  }

  /**
   * Aprueba una compra pendiente: aquí entra el stock. Exige `compras:escribir`
   * — es el visto bueno que compromete inventario.
   */
  @RequierePermiso('compras:escribir')
  @Patch(':id/aprobar')
  async aprobar(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.comprasService.aprobarCompra(
      req.user.empresaId,
      req.user.id,
      id,
    );
  }

  /** Rechaza una compra pendiente, con el motivo para quien la registró. */
  @RequierePermiso('compras:escribir')
  @Patch(':id/rechazar')
  async rechazar(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { motivo?: string },
  ) {
    return this.comprasService.rechazarCompra(
      req.user.empresaId,
      req.user.id,
      id,
      body?.motivo,
    );
  }

  /**
   * Lee una foto de factura/boleta con IA y devuelve los datos para precargar
   * el formulario. NO registra la compra: el usuario revisa y confirma.
   */
  @RequierePermiso('compras:escribir')
  @Post('parse-imagen')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions))
  async parseImagen(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ninguna imagen');
    }
    return this.comprasService.parseImagenFactura(
      req.user.empresaId,
      file.buffer,
      file.mimetype,
    );
  }

  @RequierePermiso('compras:escribir')
  @Delete(':id/pagos/:pagoId')
  async anularPago(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('pagoId', ParseIntPipe) pagoId: number,
  ) {
    return this.comprasService.anularPago(
      req.user.empresaId,
      req.user.id,
      id,
      pagoId,
    );
  }

  @Get(':id/pagos')
  async historialPagos(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.comprasService.getHistorialPagos(
      req.user.empresaId,
      id,
      req.user.sedeId,
    );
  }
  // ── Documentos de la recepción ──────────────────────────────────────────

  @Get(':id/documentos')
  async listarDocumentos(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.comprasService.listarDocumentos(req.user.empresaId, id);
  }

  @RequierePermiso('compras:escribir')
  @Post(':id/documentos')
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  async subirDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { tipo?: string; nombre?: string; observacion?: string },
  ) {
    if (!file)
      throw new BadRequestException('No se proporcionó ningún archivo');
    return this.comprasService.subirDocumento(
      req.user.empresaId,
      id,
      {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname,
        size: file.size,
      },
      body || {},
      req.user.id,
    );
  }

  @RequierePermiso('compras:escribir')
  @Delete(':id/documentos/:documentoId')
  async eliminarDocumento(
    @Param('id', ParseIntPipe) id: number,
    @Param('documentoId', ParseIntPipe) documentoId: number,
    @Request() req,
  ) {
    return this.comprasService.eliminarDocumento(
      req.user.empresaId,
      id,
      documentoId,
    );
  }
}
