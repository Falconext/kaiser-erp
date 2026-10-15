import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * El visto bueno de almacén sobre una devolución.
 *
 * Existe como CLASE y no como tipo inline en el `@Body()` por la razón que ya
 * documenta CLAUDE.md para `Partial<T>` y `Omit<T>`: un tipo de TypeScript no
 * sobrevive al runtime —`design:paramtypes` emite `Object`—, el ValidationPipe
 * no encuentra qué validar y **salta la ruta entera**, whitelist incluida. Así
 * estaba esta ruta: un `cantidadRecibida: "muchas"` entraba sin que nada lo
 * mirara y reventaba más adentro, al calcular.
 */
export class LineaDevolucionDto {
  @IsInt()
  @Type(() => Number)
  detalleId: number;

  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Type(() => Number)
  cantidadRecibida: number;

  /** De lo recibido, cuánto vino inservible. Al stock vuelve la diferencia. */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Type(() => Number)
  cantidadDanada?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}

export class ConfirmarDevolucionDto {
  /** Lo que almacén anota para que comercial lo vea: lote, estado, acuerdos. */
  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineaDevolucionDto)
  lineas: LineaDevolucionDto[];
}

export class RechazarDevolucionDto {
  @IsString()
  motivo: string;
}
