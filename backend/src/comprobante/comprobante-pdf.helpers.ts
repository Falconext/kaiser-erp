import * as QRCode from 'qrcode';

/**
 * Extrae el hash de la firma digital (ds:DigestValue) del XML UBL firmado que
 * guardamos en `comprobante.sunatXml`. Es el mismo valor que aparece como
 * "FIRMA DIGITAL" en la representación impresa del comprobante.
 */
export function extraerHashFirma(sunatXml?: string | null): string {
  if (!sunatXml) return '';
  const m = sunatXml.match(/<ds:DigestValue>([^<]+)<\/ds:DigestValue>/);
  return m?.[1]?.trim() || '';
}

/**
 * Construye la cadena estándar del QR SUNAT y la devuelve como data URI PNG,
 * listo para incrustar en el HTML/PDF. Formato:
 * RUC | tipoDoc | serie | correlativo | IGV | total | fecha | tipoDocCliente | nroDocCliente | hash
 */
export async function generarQrSunat(params: {
  ruc: string;
  tipoDocCodigo: string; // '01','03','07','08'
  serie: string;
  correlativo: string; // ya con padding
  mtoIGV: number | string;
  mtoTotal: number | string;
  fechaEmision: string; // YYYY-MM-DD
  tipoDocClienteCodigo?: string; // '1' DNI, '6' RUC, etc.
  nroDocCliente?: string;
  hash?: string;
}): Promise<string | undefined> {
  try {
    const igv = Number(params.mtoIGV || 0).toFixed(2);
    const total = Number(params.mtoTotal || 0).toFixed(2);
    const data = [
      params.ruc || '',
      params.tipoDocCodigo || '',
      params.serie || '',
      params.correlativo || '',
      igv,
      total,
      params.fechaEmision || '',
      params.tipoDocClienteCodigo || '',
      params.nroDocCliente || '',
      params.hash || '',
    ].join('|');

    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 220,
    });
  } catch {
    return undefined;
  }
}
