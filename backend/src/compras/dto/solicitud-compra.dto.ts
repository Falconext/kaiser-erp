import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SolicitudCompraItemDto {
  @IsOptional()
  @IsNumber()
  productoId?: number;

  @IsString()
  descripcion: string;

  @IsNumber()
  cantidad: number;

  @IsOptional()
  @IsString()
  unidad?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class CrearSolicitudCompraDto {
  @IsOptional()
  @IsNumber()
  sedeId?: number;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsString()
  motivo?: string;

  @IsOptional()
  @IsDateString()
  fechaRequerida?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SolicitudCompraItemDto)
  items: SolicitudCompraItemDto[];
}

export class ActualizarSolicitudCompraDto extends CrearSolicitudCompraDto {}

export class CambiarEstadoSolicitudDto {
  @IsIn(['APROBADA', 'ANULADA'])
  estado: 'APROBADA' | 'ANULADA';
}

export class CotizacionProveedorItemDto {
  @IsNumber()
  solicitudItemId: number;

  @IsNumber()
  precioUnitario: number;

  @IsOptional()
  @IsNumber()
  cantidad?: number;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsNumber()
  plazoEntregaDias?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class CrearCotizacionProveedorDto {
  @IsNumber()
  proveedorId: number;

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsNumber()
  tipoCambio?: number;

  @IsOptional()
  @IsNumber()
  plazoEntregaDias?: number;

  @IsOptional()
  @IsString()
  condicionesPago?: string;

  @IsOptional()
  @IsNumber()
  validezDias?: number;

  @IsOptional()
  @IsBoolean()
  incluyeIgv?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CotizacionProveedorItemDto)
  items: CotizacionProveedorItemDto[];
}

export class ActualizarCotizacionProveedorDto extends CrearCotizacionProveedorDto {}

export class SeleccionarCotizacionDto {
  @IsNumber()
  cotizacionId: number;

  @IsOptional()
  @IsDateString()
  fechaEntrega?: string;

  @IsOptional()
  @IsString()
  lugarEntrega?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
