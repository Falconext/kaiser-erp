import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class LineaAsientoDto {
  /** Código de la cuenta en el plan (p. ej. "1212"). */
  @IsString()
  @IsNotEmpty()
  cuenta: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  debe: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  haber: number = 0;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  glosa?: string;

  // Campos del PLE 5.1 que dependen de la línea
  @IsOptional()
  @IsString()
  tipoDocSunat?: string;

  @IsOptional()
  @IsString()
  serie?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;
}

export class CrearAsientoDto {
  @IsDateString()
  fecha: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  glosa: string;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsNumber()
  tipoCambio?: number;

  @IsOptional()
  @IsInt()
  sedeId?: number;

  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => LineaAsientoDto)
  lineas: LineaAsientoDto[];
}

export class ExtornarAsientoDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}
