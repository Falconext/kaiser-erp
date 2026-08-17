export interface IDoctor {
  id: number;
  nombre: string;
  cmp?: string;
  especialidad?: string;
  telefono?: string;
  email?: string;
  estado: 'ACTIVO' | 'INACTIVO';
  empresaId: number;
}

export const INITIAL_DOCTOR: IDoctor = {
  id: 0,
  nombre: '',
  cmp: '',
  especialidad: '',
  telefono: '',
  email: '',
  estado: 'ACTIVO',
  empresaId: 0,
};

export const ESPECIALIDADES = [
  'Medicina General',
  'Pediatría',
  'Ginecología',
  'Cardiología',
  'Neurología',
  'Traumatología',
  'Dermatología',
  'Oftalmología',
  'Otorrinolaringología',
  'Psiquiatría',
  'Oncología',
  'Endocrinología',
  'Gastroenterología',
  'Nefrología',
  'Neumología',
  'Reumatología',
  'Urología',
  'Cirugía General',
  'Anestesiología',
  'Medicina Interna',
  'Otra',
];
