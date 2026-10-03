import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  IsDecimal,
  IsEnum,
  IsIn,
} from 'class-validator';

/**
 * Catálogo 61 de SUNAT: qué documento puede sustentar un traslado. La factura
 * o boleta que origina el envío es el caso normal; los demás cubren importación
 * (DAM, DS), detracciones y los regímenes especiales.
 */
/**
 * Un campo opcional que el formulario deja en blanco llega como "" — los inputs
 * de HTML no distinguen "vacío" de "sin valor". `@IsOptional()` solo perdona
 * `undefined` y `null`, así que ese "" le pasaba el turno al validador de
 * formato y tumbaba la petición entera con un error sobre un campo que el
 * usuario tenía derecho a no llenar.
 *
 * Normalizar a `undefined` antes de validar es lo que hace que "opcional"
 * signifique opcional de verdad.
 */
const VacioComoIndefinido = () =>
  Transform(({ value }) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  );

export const TIPOS_DOC_RELACIONADO = [
  '01', // Factura
  '03', // Boleta de venta
  '04', // Liquidación de compra
  '09', // Guía de remisión remitente
  '12', // Ticket de máquina registradora
  '31', // Guía de remisión transportista
  '48', // Comprobante de operaciones - Ley 29972
  '49', // Constancia de depósito IVAP (Ley 28211)
  '50', // Declaración Aduanera de Mercancías (DAM)
  '52', // Declaración Simplificada (DS)
  '80', // Constancia de depósito - Detracción
  '81', // Código de autorización emitido por el SCOP
];

/**
 * Documento relacionado al traslado (Catálogo 61): típicamente la factura o
 * boleta que origina el envío, pero también DAM, declaración simplificada o
 * constancia de detracción.
 */
export class DocumentoRelacionadoGuiaDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(TIPOS_DOC_RELACIONADO)
  tipo: string;

  @IsString()
  @IsNotEmpty()
  numero: string;

  /** RUC de quien emitió el documento. Se omite para DAM/DS, que no lo llevan. */
  @IsOptional()
  @IsString()
  emisorNumDoc?: string;
}

/** Vehículo adicional al principal. */
export class VehiculoSecundarioDto {
  @IsString()
  @IsNotEmpty()
  placa: string;

  /** TUCE / Certificado de Habilitación Vehicular. */
  @IsOptional()
  @IsString()
  tuce?: string;
}

/** Conductor adicional al principal. */
export class ConductorSecundarioDto {
  @IsOptional()
  @IsString()
  tipoDoc?: string;

  @IsString()
  @IsNotEmpty()
  numDoc: string;

  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  apellidos?: string;

  @IsString()
  @IsNotEmpty()
  licencia: string;
}

/**
 * Descripción legible de cada tipo del Catálogo 61. SUNAT la trata como texto
 * libre en cbc:DocumentType, pero el esquema la espera junto al código.
 */
export const DOC_RELACIONADO_LABEL: Record<string, string> = {
  '01': 'Factura',
  '03': 'Boleta de venta',
  '04': 'Liquidación de compra',
  '09': 'Guía de remisión remitente',
  '12': 'Ticket de máquina registradora',
  '31': 'Guía de remisión transportista',
  '48': 'Comprobante de operaciones - Ley 29972',
  '49': 'Constancia de depósito IVAP',
  '50': 'Declaración Aduanera de Mercancías',
  '52': 'Declaración Simplificada',
  '80': 'Constancia de depósito - Detracción',
  '81': 'Autorización SCOP',
  '82': 'Declaración jurada de mudanza',
};

export enum TipoGuiaRemision {
  REMITENTE = 'REMITENTE',
  TRANSPORTISTA = 'TRANSPORTISTA',
}

export class CreateDetalleGuiaDto {
  @IsOptional()
  @IsNumber()
  productoId?: number;

  @IsString()
  @IsNotEmpty()
  codigoProducto: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsNumber()
  @Min(0.01)
  cantidad: number;

  @IsOptional()
  @IsString()
  unidadMedida?: string = 'NIU';

  /** Código del producto en el catálogo de SUNAT (UNSPSC). */
  @IsOptional()
  @IsString()
  codigoProductoSunat?: string;
}

export class CreateGuiaRemisionDto {
  @IsEnum(TipoGuiaRemision)
  @IsOptional()
  tipoGuia?: TipoGuiaRemision = TipoGuiaRemision.REMITENTE;

  @IsString()
  @IsNotEmpty()
  serie: string;

  @IsOptional()
  @IsNumber()
  correlativo?: number;

  @IsDateString()
  fechaEmision: string;

  @IsOptional()
  @IsString()
  horaEmision?: string;

  // Remitente
  @IsString()
  @IsNotEmpty()
  remitenteRuc: string;

  @IsString()
  @IsNotEmpty()
  remitenteRazonSocial: string;

  @IsString()
  @IsNotEmpty()
  remitenteDireccion: string;

  // Destinatario
  @IsString()
  @IsNotEmpty()
  destinatarioTipoDoc: string;

  @IsString()
  @IsNotEmpty()
  destinatarioNumDoc: string;

  @IsString()
  @IsNotEmpty()
  destinatarioRazonSocial: string;

  @IsOptional()
  @IsNumber()
  clienteId?: number;

  /**
   * El comprobante que esta guía despacha. Antes el vínculo era una frase en
   * `observaciones` ("Traslado por venta F0A1-00000005"), que sirve para que lo
   * lea una persona y para nada más: sin él no se puede saber qué queda por
   * despachar de una venta. Opcional: hay guías sin comprobante (traslados entre
   * sedes, motivo 04).
   */
  @IsOptional()
  @IsNumber()
  comprobanteId?: number;

  // Comprador (Para motivo 03: Venta con entrega a terceros)
  @IsOptional()
  @IsString()
  compradorTipoDoc?: string;

  @IsOptional()
  @IsString()
  compradorNumDoc?: string;

  @IsOptional()
  @IsString()
  compradorRazonSocial?: string;

  // Shipment
  @IsString()
  @IsNotEmpty()
  tipoTraslado: string;

  @IsString()
  @IsNotEmpty()
  modoTransporte: string;

  @IsNumber()
  @Min(0.01)
  pesoTotal: number;

  @IsOptional()
  @IsString()
  unidadPeso?: string = 'KGM';

  // Transportista (condicional para transporte público)
  @IsOptional()
  @IsString()
  transportistaRuc?: string;

  @IsOptional()
  @IsString()
  transportistaRazonSocial?: string;

  @IsOptional()
  @IsString()
  transportistaMTC?: string;

  // Para GRE-T: RUC/razón social del remitente real de los bienes
  // (la empresa que envía la carga, diferente al transportista)
  @IsOptional()
  @IsString()
  greTRemitenteNumDoc?: string;

  @IsOptional()
  @IsString()
  greTRemitenteRazonSocial?: string;

  // Conductor/Vehículo (condicional para transporte privado)
  @IsOptional()
  @IsString()
  conductorTipoDoc?: string;

  @IsOptional()
  @IsString()
  conductorNumDoc?: string;

  @IsOptional()
  @IsString()
  conductorNombre?: string;

  @IsOptional()
  @IsString()
  conductorApellidos?: string;

  @IsOptional()
  @IsString()
  conductorLicencia?: string;

  @IsOptional()
  @IsString()
  vehiculoPlaca?: string;

  @IsOptional()
  @IsString()
  vehiculoAutorizacion?: string;

  // Autorización especial del vehículo y quién la emitió (ej. MTC). Van juntas:
  // SUNAT las manda en cac:ShipmentDocumentReference.
  @IsOptional()
  @IsString()
  vehiculoNroAutorizacion?: string;

  @IsOptional()
  @IsString()
  vehiculoEntidadEmisora?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VehiculoSecundarioDto)
  vehiculosSecundarios?: VehiculoSecundarioDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConductorSecundarioDto)
  conductoresSecundarios?: ConductorSecundarioDto[];

  /** Fecha de entrega de los bienes al transportista. */
  @VacioComoIndefinido()
  @IsOptional()
  @IsDateString()
  fechaEntregaBienes?: string;

  /** Documentos que sustentan el traslado (Catálogo 61). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocumentoRelacionadoGuiaDto)
  documentosRelacionados?: DocumentoRelacionadoGuiaDto[];

  // Punto de partida
  @IsString()
  @IsNotEmpty()
  partidaUbigeo: string;

  @IsString()
  @IsNotEmpty()
  partidaDireccion: string;

  @IsOptional()
  @IsString()
  partidaCodigoEstablecimiento?: string;

  // Punto de llegada
  @IsString()
  @IsNotEmpty()
  llegadaUbigeo: string;

  @IsString()
  @IsNotEmpty()
  llegadaDireccion: string;

  @IsOptional()
  @IsString()
  llegadaCodigoEstablecimiento?: string;

  // Fecha de traslado
  @IsDateString()
  fechaInicioTraslado: string;

  // Flags opcionales
  @IsOptional()
  @IsBoolean()
  retornoVehiculoVacio?: boolean = false;

  @IsOptional()
  @IsBoolean()
  retornoEnvasesVacios?: boolean = false;

  @IsOptional()
  @IsBoolean()
  transbordoProgramado?: boolean = false;

  @IsOptional()
  @IsBoolean()
  trasladoTotal?: boolean = false;

  @IsOptional()
  @IsBoolean()
  vehiculoM1oL?: boolean = false;

  @IsOptional()
  @IsBoolean()
  datosTransportista?: boolean = false;

  // Observaciones
  @IsOptional()
  @IsString()
  observaciones?: string;

  // Detalles
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDetalleGuiaDto)
  detalles: CreateDetalleGuiaDto[];
}
