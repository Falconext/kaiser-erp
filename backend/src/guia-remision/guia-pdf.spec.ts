/**
 * QA de la representación impresa de la guía. Portado de falconext-mype y
 * adaptado a la maquetación de Kaiser (filas `label-row`, no dos columnas).
 *
 * Fija tres cosas que estaban mal y que el PDF es el único sitio donde se ven:
 *   · con transporte PÚBLICO el vehículo y el conductor se escondían —vivían en
 *     el `{{else}}` del bloque del transportista— aunque sí viajaban a SUNAT;
 *   · una guía de TRANSPORTISTA se imprimía rotulada como de remitente;
 *   · documentos relacionados, TUCE e indicadores no salían.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

const plantilla = Handlebars.compile(
  fs.readFileSync(
    path.join(__dirname, '../comprobante/templates/guia-remision.hbs'),
    'utf8',
  ),
);

const datos = (extra: Record<string, any> = {}) => ({
  ruc: '20492641431',
  razonSocial: 'KAISER CORPORATION S.A.',
  serie: 'T001',
  correlativo: '00000030',
  tituloGuia: 'REMITENTE',
  esTransportista: false,
  fechaEmision: '2026-10-01',
  fechaTraslado: '2026-10-01',
  motivoTraslado: 'VENTA',
  modalidadTraslado: 'TRANSPORTE PÚBLICO',
  destinatarioRazonSocial: 'CONSTRUCTORA QA S.A.C.',
  destinatarioTipoDoc: 'RUC',
  destinatarioNumDoc: '20170040938',
  partidaDireccion: 'JR. FRANCIA 1028',
  partidaUbigeo: '150115',
  llegadaDireccion: 'AV. LARCO 1000',
  llegadaUbigeo: '150122',
  pesoTotal: '850',
  unidadPeso: 'KG',
  esTransportePublico: true,
  transportistaRazonSocial: 'TRANSPORTES QA S.A.C.',
  transportistaRuc: '20400849906',
  transportistaMTC: '1598621CNG',
  vehiculoPlaca: 'V8C859',
  vehiculoAutorizacion: '15M23028581E',
  conductorNombre: 'TAMAYO CUSSI ALEJANDRO',
  conductorNumDoc: '40538989',
  conductorLicencia: 'H40538989',
  vehiculosSecundarios: [{ orden: 1, placa: 'A2B985', tuce: '0042000686' }],
  conductoresSecundarios: [],
  documentosRelacionados: [],
  detalles: [
    { item: 1, codigo: 'CEM-01', descripcion: 'CEMENTO', cantidad: '25', unidad: 'NIU' },
  ],
  ...extra,
});

describe('PDF de la guía · vehículo y conductor en transporte público', () => {
  it('con transporte público imprime el transportista Y el vehículo con su conductor', () => {
    const html = plantilla(datos({ mostrarVehiculoConductor: true }));
    expect(html).toContain('TRANSPORTES QA S.A.C.');
    expect(html).toContain('1598621CNG');
    // Lo que antes se perdía:
    expect(html).toContain('V8C859');
    expect(html).toContain('15M23028581E');
    expect(html).toContain('TAMAYO CUSSI ALEJANDRO');
    expect(html).toContain('H40538989');
    expect(html).toContain('A2B985');
  });

  it('sin vehículo ni conductor no se imprime ese bloque', () => {
    const html = plantilla(
      datos({
        mostrarVehiculoConductor: false,
        vehiculoPlaca: '',
        vehiculoAutorizacion: '',
        conductorNombre: '',
        vehiculosSecundarios: [],
      }),
    );
    expect(html).toContain('TRANSPORTES QA S.A.C.');
    expect(html).not.toContain('V8C859');
  });

  it('en transporte privado el vehículo sale una sola vez y sin transportista', () => {
    const html = plantilla(
      datos({
        esTransportePublico: false,
        mostrarVehiculoConductor: true,
        modalidadTraslado: 'TRANSPORTE PRIVADO',
      }),
    );
    expect(html).toContain('VEHÍCULO (PLACA)');
    expect(html).toContain('CONDUCTOR:');
    expect(html.match(/V8C859/g)).toHaveLength(1);
    expect(html).not.toContain('TRANSPORTES QA S.A.C.');
  });

  it('un vehículo M1/L no pide placa ni conductor, y lo dice', () => {
    const html = plantilla(
      datos({
        esTransportePublico: false,
        esVehiculoM1oL: true,
        mostrarVehiculoConductor: false,
        vehiculoPlaca: '',
        vehiculoAutorizacion: '',
        vehiculosSecundarios: [],
      }),
    );
    expect(html).toContain('CATEGORÍA M1 O L');
    expect(html).not.toContain('V8C859');
  });
});

describe('PDF de la guía · rótulo según el tipo', () => {
  it('la guía de transportista NO se rotula como de remitente', () => {
    const html = plantilla(
      datos({
        tituloGuia: 'TRANSPORTISTA',
        esTransportista: true,
        remitenteBienesRazonSocial: 'KAISER CORPORATION S.A.',
        remitenteBienesNumDoc: '20492641431',
      }),
    );
    expect(html).toContain('TRANSPORTISTA ELECTRÓNICA');
    expect(html).not.toContain('REMITENTE ELECTRÓNICA');
    // Y dice de quién son los bienes, que en la GRE-T no es el emisor.
    expect(html).toContain('REMITENTE DE LOS BIENES');
  });

  it('la de remitente sigue rotulada como tal y sin el bloque de la GRE-T', () => {
    const html = plantilla(datos({ mostrarVehiculoConductor: true }));
    expect(html).toContain('REMITENTE ELECTRÓNICA');
    expect(html).not.toContain('REMITENTE DE LOS BIENES');
  });
});

describe('PDF de la guía · documentos relacionados, códigos e indicadores', () => {
  it('imprime el documento relacionado con su etiqueta, número y RUC', () => {
    const html = plantilla(
      datos({
        documentosRelacionados: [
          { etiqueta: 'Factura', numero: 'F0A1-00000023', emisor: '20492641431' },
        ],
      }),
    );
    expect(html).toContain('DOCUMENTOS RELACIONADOS');
    expect(html).toContain('Factura');
    expect(html).toContain('F0A1-00000023');
    expect(html).toContain('20492641431');
  });

  it('un documento sin emisor no imprime "RUC"', () => {
    const html = plantilla(
      datos({
        documentosRelacionados: [
          { etiqueta: 'Guía remitente', numero: 'T001-00000009', emisor: '' },
        ],
      }),
    );
    expect(html).toContain('T001-00000009');
    const bloque = html.slice(html.indexOf('DOCUMENTOS RELACIONADOS'));
    expect(bloque.slice(0, 600)).not.toContain('RUC 2');
  });

  it('sin documentos relacionados el bloque no sale', () => {
    const html = plantilla(datos());
    expect(html).not.toContain('DOCUMENTOS RELACIONADOS');
  });

  it('el código SUNAT del bien sale en su columna', () => {
    const html = plantilla(
      datos({
        detalles: [
          { item: 1, codigo: 'CEM-01', codigoSunat: '30111500', descripcion: 'CEMENTO', cantidad: '25', unidad: 'NIU' },
        ],
      }),
    );
    expect(html).toContain('COD. SUNAT');
    expect(html).toContain('30111500');
  });

  it('sin QR explica por qué y en qué estado está, en vez de dejar un hueco', () => {
    const html = plantilla(datos({ estadoSunat: 'PENDIENTE' }));
    expect(html).toContain('se genera cuando la guía es aceptada');
    expect(html).toContain('PENDIENTE');
  });

  it('con QR aceptado no sale ese aviso', () => {
    const html = plantilla(
      datos({ qrCode: 'data:image/png;base64,iVBORw0KGgo=', estadoSunat: 'EMITIDO' }),
    );
    // Handlebars escapa el atributo (= y / salen como entidades, que el
    // navegador decodifica): se comprueba la imagen, no la cadena literal.
    expect(html).toContain('class="qr-img"');
    expect(html).toContain('iVBORw0KGgo');
    expect(html).not.toContain('se genera cuando la guía es aceptada');
  });

  it('imprime solo los indicadores encendidos', () => {
    const html = plantilla(
      datos({ hayIndicadores: true, transbordoProgramado: true, retornoEnvasesVacios: true }),
    );
    expect(html).toContain('TRANSBORDO PROGRAMADO');
    expect(html).toContain('RETORNO CON ENVASES VACÍOS');
    expect(html).not.toContain('RETORNO DE VEHÍCULO VACÍO');
  });

  it('sin ningún indicador el bloque no sale', () => {
    const html = plantilla(datos());
    expect(html).not.toContain('INDICADORES DEL TRASLADO');
  });
});
