import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ComponenteEjecutadoDto {
  @IsNumber()
  @Type(() => Number)
  productoInsumoId: number;

  @IsNumber()
  @Type(() => Number)
  cantidadConsumida: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  mermaCantidad?: number;

  /// De la merma, cuánto sirve para volver a usarse. Lo decide quien pesa: el
  /// mismo alambre da retazo aprovechable en un corte y chatarra en el
  /// siguiente. Declarado aquí o el ValidationPipe (whitelist) lo borra.
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  mermaReutilizableCantidad?: number;

  /// Entregado a planta y no usado. No es merma: no se consumió.
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sobranteCantidad?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class RegistrarEjecucionOrdenDto {
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsNumber()
  @Type(() => Number)
  cantidadProducida: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  mermaTotal?: number;

  /**
   * Máquina y encargado: planta los sabe al terminar, no al planificar, así
   * que se pueden mandar aquí además de en la creación. Lo que llegue aquí
   * pisa lo que tuviera la orden.
   */
  @IsOptional()
  @IsString()
  maquina?: string;

  @IsOptional()
  @IsString()
  encargadoNombre?: string;

  /** Medidas del rollo de referencia, que se miden al cerrar. */
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  pesoRefRollo?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  diametroCm?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  alturaRolloM?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponenteEjecutadoDto)
  componentes: ComponenteEjecutadoDto[];
}
