import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class DetalleCompraDto {
  @IsOptional()
  @IsNumber()
  productoId?: number;

  @IsString()
  descripcion: string;

  @IsNumber()
  cantidad: number;

  @IsNumber()
  precioUnitario: number;

  @IsOptional()
  @IsString()
  lote?: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsOptional()
  @IsString()
  codigoXml?: string;

  // Series / IMEI del producto (una por unidad). Opcionales: si vienen, se dan
  // de alta como ProductoSerie DISPONIBLE enlazadas a esta compra.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  numerosSerie?: string[];

  // Meses de garantía a aplicar a las series registradas en esta línea.
  @IsOptional()
  @IsNumber()
  garantiaMeses?: number;

  // true = el precioUnitario ya incluye IGV → el costo neto = precio / 1.18
  @IsOptional()
  incluyeIgv?: boolean;

  /**
   * Afectación IGV de la línea (Catálogo 07) para ítems libres: '20' exonerado,
   * '30' inafecto. En líneas con producto manda la afectación del catálogo.
   *
   * Tiene que estar declarada aquí: el ValidationPipe global va con whitelist y
   * borra del body lo que el DTO no declare, sin avisar — el servicio la leería
   * siempre como undefined y todo saldría gravado.
   */
  @IsOptional()
  @IsString()
  tipoAfectacionIGV?: string;
}

export class CrearCompraDto {
  @IsNumber()
  proveedorId: number;

  @IsString()
  tipoDoc: string;

  @IsString()
  serie: string;

  @IsString()
  numero: string;

  @IsDateString()
  fechaEmision: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsString()
  moneda: string;

  @IsOptional()
  @IsNumber()
  tipoCambio?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsNumber()
  igv?: number;

  @IsOptional()
  @IsNumber()
  total?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleCompraDto)
  detalles: DetalleCompraDto[];

  // Sede/almacén destino del stock de la compra.
  @IsOptional()
  @IsNumber()
  sedeId?: number;

  @IsOptional()
  @IsNumber()
  montoPagadoInicial?: number;

  @IsOptional()
  @IsString()
  metodoPagoInicial?: string;

  // Pago por banco (pago inicial): cuenta bancaria usada y N° de operación.
  @IsOptional()
  @IsNumber()
  cuentaBancariaIdInicial?: number;

  @IsOptional()
  @IsString()
  referenciaInicial?: string;

  /**
   * Consumo propio: gasolina, útiles, comida, servicios. No es mercadería para
   * vender, así que NO entra al inventario y pesa como gasto del mes.
   *
   * Si no viene, `crear()` lo infiere: es gasto cuando ninguna línea apunta al
   * catálogo. Se comprueba con `typeof === 'boolean'` y no por truthy — un
   * `false` explícito ("esto sí es mercadería") debe ganar a la inferencia.
   */
  @IsOptional()
  @IsBoolean()
  esGasto?: boolean;

  // URL en S3 de la foto de la factura leída por IA. Tiene que estar declarada:
  // el ValidationPipe global va con whitelist y borra del body lo que el DTO no
  // declare, sin avisar.
  @IsOptional()
  @IsString()
  fotoUrl?: string;

  @IsOptional()
  @IsString()
  formaPago?: string; // CONTADO o CREDITO

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CuotaCompraDto)
  cuotas?: CuotaCompraDto[];
}

export class CuotaCompraDto {
  @IsNumber()
  monto: number;

  @IsDateString()
  fechaVencimiento: string;
}
