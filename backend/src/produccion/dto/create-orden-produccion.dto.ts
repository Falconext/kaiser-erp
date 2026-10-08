import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrdenComponenteManualDto {
  @IsNumber()
  @Type(() => Number)
  productoInsumoId: number;

  @IsNumber()
  @Type(() => Number)
  cantidadTeorica: number;

  @IsString()
  unidad: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  costoUnitario?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class CreateOrdenProduccionDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  recetaId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  productoFinalId?: number;

  @IsString()
  loteProduccion: string;

  /**
   * Opcional SOLO para poder prellenarla desde `comprobanteId`: si no llega ni
   * por el body ni por el pedido, la creación falla igual.
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cantidadObjetivo?: number;

  @IsOptional()
  @IsDateString()
  fechaProgramada?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  usuarioResponsableId?: number;

  /**
   * Dónde se fabrica. Si no llega, la ejecución sigue cayendo a la sede del
   * usuario que cierra la orden, que es como funcionaba antes.
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sedeId?: number;

  /**
   * La cotización o el pedido que origina la orden. Si llega sin producto ni
   * cantidad, se prellenan de su primera línea con producto.
   */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  comprobanteId?: number;

  @IsOptional()
  @IsString()
  maquina?: string;

  @IsOptional()
  @IsString()
  encargadoNombre?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrdenComponenteManualDto)
  componentes?: OrdenComponenteManualDto[];
}
