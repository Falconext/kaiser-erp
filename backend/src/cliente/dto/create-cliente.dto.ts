import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateClienteDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['DNI', 'RUC', 'CE', 'PASAPORTE', 'OTRO'])
  tipoDoc: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | 'OTRO';

  @IsString()
  @IsNotEmpty()
  nroDoc: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  direccion?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  telefono?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  ubigeo: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  departamento: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  provincia: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  distrito: string;

  @IsEnum(['CLIENTE', 'CLIENTE_PROVEEDOR', 'PROVEEDOR', 'EMPRESA'])
  persona?: 'CLIENTE' | 'CLIENTE_PROVEEDOR' | 'PROVEEDOR' | 'EMPRESA';

  // Persona de contacto (comprador/coordinador) — se muestra en la cotización.
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  contactoNombre?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  contactoEmail?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  contactoTelefono?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  contactoDireccion?: string;

  // Sector económico del cliente (AGROEXPORTACION, AVICOLA, PECUARIO, MINERIA,
  // CONSTRUCCION, INDUSTRIA, COMERCIO, OTRO). Sirve para reportes por sector.
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
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

  // Campos médicos opcionales (farmacia/clínica)
  @IsOptional()
  @IsString()
  grupoSanguineo?: string;

  @IsOptional()
  @IsString()
  alergias?: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value))
  fechaNacimiento?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  medicoTratanteId?: number;
}
