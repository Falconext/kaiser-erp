/**
 * QA de los normalizadores del bloque 2. Son los que deciden qué se GUARDA en
 * los campos Json? de la guía, y la distinción que importa es:
 *   · `undefined` = el formulario no mandó el campo → no se pisa lo guardado.
 *   · `[]`        = el usuario borró todo → sí se guarda vacío.
 * Con los dos casos confundidos, editar una guía para quitarle un conductor
 * secundario lo dejaba puesto.
 */
import { GuiaRemisionService } from './guia-remision.service';

// Los normalizadores son funciones puras: no tocan Prisma ni SUNAT.
const svc = new GuiaRemisionService(
  {} as any,
  {} as any,
  {} as any,
  {} as any,
  {} as any,
);
const docs = (v?: any) => (svc as any).normalizarDocumentosRelacionados(v);
const vehs = (v?: any) => (svc as any).normalizarVehiculosSecundarios(v);
const conds = (v?: any) => (svc as any).normalizarConductoresSecundarios(v);

describe('Normalizadores del bloque 2 de la guía', () => {
  it('sin el campo devuelven undefined, no un array vacío', () => {
    expect(docs(undefined)).toBeUndefined();
    expect(vehs(undefined)).toBeUndefined();
    expect(conds(undefined)).toBeUndefined();
    // Un valor que no es array tampoco se interpreta como "borrar".
    expect(docs('F001-1' as any)).toBeUndefined();
  });

  it('un array vacío sí se guarda: es el usuario borrándolo todo', () => {
    expect(docs([])).toEqual([]);
    expect(vehs([])).toEqual([]);
    expect(conds([])).toEqual([]);
  });

  it('el documento relacionado va en mayúsculas y sin el RUC si no lo hay', () => {
    expect(
      docs([
        { tipo: ' 01 ', numero: ' f0a1-00000023 ', emisorNumDoc: ' 20492641431 ' },
        { tipo: '09', numero: 'T001-9' },
      ]),
    ).toEqual([
      { tipo: '01', numero: 'F0A1-00000023', emisorNumDoc: '20492641431' },
      { tipo: '09', numero: 'T001-9' },
    ]);
  });

  it('descarta documentos sin tipo o sin número', () => {
    expect(
      docs([
        { tipo: '01', numero: '' },
        { tipo: '', numero: 'F001-1' },
        { tipo: '01', numero: 'F001-2' },
      ]),
    ).toEqual([{ tipo: '01', numero: 'F001-2' }]);
  });

  it('la placa del vehículo secundario se normaliza y el TUCE es opcional', () => {
    expect(vehs([{ placa: ' a2b985 ', tuce: ' 0042000686 ' }, { placa: 'c3d111' }])).toEqual([
      { placa: 'A2B985', tuce: '0042000686' },
      { placa: 'C3D111' },
    ]);
    expect(vehs([{ placa: '  ' }])).toEqual([]);
  });

  it('el conductor secundario exige documento y licencia, y el tipoDoc cae a DNI', () => {
    expect(
      conds([
        { numDoc: ' 10101010 ', nombres: ' juan ', apellidos: 'perez', licencia: ' q1 ' },
        { numDoc: '20202020', licencia: '' },
        { numDoc: '', licencia: 'Q3' },
      ]),
    ).toEqual([
      {
        tipoDoc: '1',
        numDoc: '10101010',
        nombres: 'juan',
        apellidos: 'perez',
        licencia: 'Q1',
      },
    ]);
  });
});
