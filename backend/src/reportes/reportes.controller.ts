import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import * as XLSX from 'xlsx';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { ReportesService } from './reportes.service';

const DIMENSION_LABEL: Record<string, string> = {
  vendedor: 'Vendedor',
  cliente: 'Cliente',
  producto: 'Producto',
  categoria: 'Categoría',
  sector: 'Sector',
  departamento: 'Departamento',
  provincia: 'Provincia',
  distrito: 'Distrito',
};

/**
 * Reportes de gestión para gerencia: ventas por vendedor / cliente / producto /
 * categoría / sector / ubigeo. Ver `ReportesService` para el criterio de
 * "venta válida" (idéntico al Dashboard).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reportes')
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  private filtros(user: any, q: Record<string, string | undefined>) {
    return {
      empresaId: user.empresaId,
      fechaInicio: q.fechaInicio as string,
      fechaFin: q.fechaFin as string,
      sedeId: q.sedeId ? Number(q.sedeId) : undefined,
      moneda: q.moneda || undefined,
    };
  }

  @Get('ventas')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  ventas(
    @User() user: any,
    @Query('dimension') dimension: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('sedeId') sedeId?: string,
    @Query('moneda') moneda?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.ventasPor(
      dimension || 'vendedor',
      this.filtros(user, { fechaInicio, fechaFin, sedeId, moneda }),
      limit ? Number(limit) : undefined,
    );
  }

  @Get('ventas/detalle')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  detalle(
    @User() user: any,
    @Query('dimension') dimension: string,
    @Query('clave') clave: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('sedeId') sedeId?: string,
    @Query('moneda') moneda?: string,
  ) {
    return this.service.detalle(
      dimension || 'vendedor',
      clave,
      this.filtros(user, { fechaInicio, fechaFin, sedeId, moneda }),
    );
  }

  @Get('ventas/exportar')
  @Roles('ADMIN_EMPRESA', 'USUARIO_EMPRESA')
  async exportar(
    @User() user: any,
    @Res() res: Response,
    @Query('dimension') dimension: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('sedeId') sedeId?: string,
    @Query('moneda') moneda?: string,
  ) {
    const reporte = await this.service.ventasPor(
      dimension || 'vendedor',
      this.filtros(user, { fechaInicio, fechaFin, sedeId, moneda }),
    );
    const label = DIMENSION_LABEL[reporte.dimension] ?? reporte.dimension;
    const esProducto = reporte.dimension === 'producto';

    const filas = reporte.filas.map((f, i) => {
      const row: Record<string, any> = {
        '#': i + 1,
        [label.toUpperCase()]: f.nombre,
      };
      if (reporte.dimension === 'cliente') {
        row['RUC/DNI'] = f.extra?.nroDoc ?? '';
        row['SECTOR'] = f.extra?.sector ?? '';
        row['DEPARTAMENTO'] = f.extra?.departamento ?? '';
      }
      if (esProducto) {
        row['CÓDIGO'] = f.extra?.codigo ?? '';
        row['CATEGORÍA'] = f.extra?.categoria ?? '';
      }
      if (
        reporte.dimension === 'provincia' ||
        reporte.dimension === 'distrito'
      ) {
        row['DEPARTAMENTO'] = f.extra?.departamento ?? '';
      }
      if (reporte.dimension === 'distrito') {
        row['PROVINCIA'] = f.extra?.provincia ?? '';
      }
      row['VENTAS (S/)'] = f.ventas;
      row['PARTICIPACIÓN %'] = f.participacion;
      row['DOCUMENTOS'] = f.documentos;
      if (esProducto) row['UNIDADES'] = f.unidades ?? 0;
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(filas);
    worksheet['!cols'] = [
      { wch: 5 },
      { wch: 40 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
      { wch: 12 },
    ];
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        [''],
        ['TOTAL VENTAS (S/)', reporte.totalVentas],
        ['TOTAL DOCUMENTOS', reporte.totalDocumentos],
        [
          'PERIODO',
          `${reporte.periodo.fechaInicio} a ${reporte.periodo.fechaFin}`,
        ],
        ['DIMENSIÓN', label],
      ],
      { origin: -1 },
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `Ventas por ${label}`.slice(0, 31),
    );
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

    const fileName = `ventas-por-${reporte.dimension}-${reporte.periodo.fechaInicio}-${reporte.periodo.fechaFin}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    return res.end(buffer, 'binary');
  }
}
