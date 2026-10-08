import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ComponenteEntregadoDto {
  @IsNumber()
  @Type(() => Number)
  productoInsumoId: number;

  /** Lo que almacén saca y le pasa a planta. Puede no ser lo teórico. */
  @IsNumber()
  @Type(() => Number)
  cantidad: number;
}

/**
 * La entrega de material a planta: «ya está la orden, por favor entregar los
 * 180 kilos».
 *
 * Es lo que convierte al sobrante en un movimiento de verdad. Sin entrega, la
 * salida del almacén ocurre al CERRAR la orden y es `consumido + merma`, así
 * que lo que no se usó nunca salió y devolverlo inventaría existencias que ya
 * estaban. Con entrega, lo que sale es lo que se entregó, y entonces el
 * sobrante sí tiene de dónde volver.
 */
export class EntregarMaterialOrdenDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ComponenteEntregadoDto)
  componentes: ComponenteEntregadoDto[];

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}
