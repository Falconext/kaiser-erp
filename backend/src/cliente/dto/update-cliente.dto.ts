import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateClienteDto {
  @IsInt()
  id: number;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsEnum(['DNI', 'RUC', 'CE', 'PASAPORTE', 'OTRO'])
  tipoDoc?: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | 'OTRO';

  @IsOptional()
  @IsString()
  nroDoc?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  ubigeo?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  distrito?: string;

  @IsOptional()
  @IsEnum(['CLIENTE', 'CLIENTE_PROVEEDOR', 'PROVEEDOR', 'EMPRESA'])
  persona?: 'CLIENTE' | 'CLIENTE_PROVEEDOR' | 'PROVEEDOR' | 'EMPRESA';

  @IsOptional()
  @IsString()
  contactoNombre?: string;

  @IsOptional()
  @IsString()
  contactoEmail?: string;

  @IsOptional()
  @IsString()
  contactoTelefono?: string;

  @IsOptional()
  @IsString()
  contactoDireccion?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  /// Crédito concedido, en soles. Vacío = sin límite (lo que tienen todos hoy).
  /// Cero SÍ es un límite: "a este cliente no se le vende al crédito".
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : Number(value),
  )
  @IsNumber()
  @Min(0)
  limiteCredito?: number;

  /// Plazo acordado en días. Informativo: alimenta el aviso de vencido.
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  diasCredito?: number;

  /// Lista de precios que se le aplica. Vacío = precio de lista del producto.
  @IsOptional()
  @Transform(({ value }) =>
    value === '' || value === null ? undefined : Number(value),
  )
  @IsInt()
  listaPrecioId?: number;
}
