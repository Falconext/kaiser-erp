import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RecetaComponenteDto {
  @IsNumber()
  @Type(() => Number)
  productoInsumoId: number;

  @IsNumber()
  @Type(() => Number)
  cantidadBase: number;

  @IsString()
  unidadBase: string;

  /// POR_UNIDAD = por cada unidad producida; POR_LOTE = una vez por orden.
  /// Tiene que estar declarado aquí o el ValidationPipe (whitelist) lo borra
  /// del body sin avisar y todo componente llegaría como POR_UNIDAD.
  @IsOptional()
  @IsIn(['POR_UNIDAD', 'POR_LOTE'])
  tipoCantidad?: 'POR_UNIDAD' | 'POR_LOTE';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  mermaEsperadaPorcentaje?: number;

  @IsOptional()
  @IsBoolean()
  esOpcional?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  orden?: number;
}

export class CreateRecetaDto {
  @IsNumber()
  @Type(() => Number)
  productoFinalId: number;

  @IsString()
  codigo: string;

  @IsString()
  nombre: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  version?: number;

  @IsNumber()
  @Type(() => Number)
  rendimientoObjetivo: number;

  @IsString()
  unidadRendimiento: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  mermaObjetivoPorcentaje?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecetaComponenteDto)
  componentes: RecetaComponenteDto[];
}
