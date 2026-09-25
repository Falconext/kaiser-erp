import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export const TIPOS_GASTO_IMPORTACION = [
  'FLETE_INTERNACIONAL',
  'SEGURO',
  'AD_VALOREM',
  'IGV_IMPORTACION',
  'IPM',
  'ISC',
  'PERCEPCION',
  'AGENCIA_ADUANA',
  'ALMACEN_ADUANERO',
  'TRANSPORTE_INTERNO',
  'GASTOS_BANCARIOS',
  'OTROS',
] as const;

export const BASES_PRORRATEO = ['VALOR', 'PESO', 'VOLUMEN', 'CANTIDAD'] as const;

export class ItemImportacionDto {
  @IsInt()
  productoId: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber()
  cantidad: number;

  @IsOptional()
  @IsString()
  unidad?: string;

  // Precio FOB unitario, en la moneda de la importación
  @IsNumber()
  precioFobUnitario: number;

  @IsOptional()
  @IsNumber()
  pesoKg?: number;

  @IsOptional()
  @IsNumber()
  volumenM3?: number;

  @IsOptional()
  @IsString()
  partidaArancelaria?: string;

  @IsOptional()
  @IsNumber()
  adValoremPorcentaje?: number;
}

export class CrearImportacionDto {
  @IsInt()
  proveedorId: number;

  @IsOptional()
  @IsInt()
  sedeId?: number;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsNumber()
  tipoCambio?: number;

  @IsOptional()
  @IsString()
  incoterm?: string;

  @IsOptional()
  @IsString()
  numeroFactura?: string;

  @IsOptional()
  @IsString()
  numeroDua?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  fechaEmbarque?: string;

  @IsOptional()
  @IsDateString()
  fechaLlegada?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemImportacionDto)
  items: ItemImportacionDto[];
}

export class ActualizarImportacionDto extends CrearImportacionDto {}

export class CambiarEstadoImportacionDto {
  @IsIn(['EN_TRANSITO', 'EN_ADUANA', 'ANULADA'])
  estado: 'EN_TRANSITO' | 'EN_ADUANA' | 'ANULADA';
}

export class CrearGastoImportacionDto {
  @IsIn(TIPOS_GASTO_IMPORTACION as unknown as string[])
  tipo: (typeof TIPOS_GASTO_IMPORTACION)[number];

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  proveedorNombre?: string;

  @IsOptional()
  @IsString()
  numeroDocumento?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  moneda?: string;

  @IsOptional()
  @IsNumber()
  tipoCambio?: number;

  @IsNumber()
  monto: number;

  @IsOptional()
  @IsBoolean()
  afectaCosto?: boolean;

  @IsOptional()
  @IsIn(BASES_PRORRATEO as unknown as string[])
  baseProrrateo?: (typeof BASES_PRORRATEO)[number];
}

export class ActualizarGastoImportacionDto extends CrearGastoImportacionDto {}

export class NacionalizarImportacionDto {
  @IsOptional()
  @IsInt()
  sedeId?: number;

  @IsOptional()
  @IsDateString()
  fechaNacionalizacion?: string;
}
