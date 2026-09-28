import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

/**
 * Pago a un proveedor.
 *
 * Existe porque el endpoint recibía `any` y validaba con `Number(data.monto)`:
 * sin `monto` el resultado es NaN, y `NaN <= 0` es `false`, así que NaN se colaba
 * por las dos comprobaciones del servicio y llegaba hasta Prisma. La respuesta
 * era un 500 con el nombre de la excepción interna. En un endpoint que mueve
 * dinero, la validación va antes de la lógica.
 */
export class RegistrarPagoCompraDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto debe ser mayor a 0' })
  monto: number;

  /** El frontend lo llama `medioPago`; la columna es `metodoPago`. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  medioPago?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referencia?: string;

  /** Nota del pago: "parcial acordado por faltante", etc. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;

  /** Fecha real del pago, que no siempre es la de registro. */
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsNumber()
  cuentaBancariaId?: number;
}
