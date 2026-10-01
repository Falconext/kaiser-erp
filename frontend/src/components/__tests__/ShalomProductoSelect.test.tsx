/**
 * Selector de tamaño Shalom: lista fija (no depende del catálogo por cuenta) y,
 * con agencia de destino, precio por tamaño desde la cotización de la ruta.
 */
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const productos = [
    { id: 900001, key: 'SOBRE', nombre: 'SOBRE (documentos)', porDefecto: false },
    { id: 900002, key: 'XXS', nombre: 'PAQUETE XXS (muy pequeño)', porDefecto: true },
    { id: 900003, key: 'XS', nombre: 'PAQUETE XS (pequeño)', porDefecto: false },
];
const tarifaMock = jest.fn((_destinoId: string | number) => Promise.resolve({ origen: 507, destino: 7, leadTime: '48 horas', tamanos: [
    { id: 900001, key: 'SOBRE', nombre: 'SOBRE (documentos)', precio: 8 },
    { id: 900002, key: 'XXS', nombre: 'PAQUETE XXS (muy pequeño)', precio: 8 },
    { id: 900003, key: 'XS', nombre: 'PAQUETE XS (pequeño)', precio: 10 },
] }));
jest.mock('@/services/shalom.service', () => ({ shalomService: { productos: () => Promise.resolve(productos), tarifa: (d: any) => tarifaMock(d) } }));

import { ShalomProductoSelect } from '../ShalomProductoSelect';

it('sin destino: lista fija con el predeterminado de la empresa y sin precios', async () => {
    render(<ShalomProductoSelect value={undefined} onChange={() => {}} />);
    await waitFor(() => expect(screen.getByText('Usar el predeterminado (XXS)')).toBeInTheDocument());
    expect(screen.getByText('PAQUETE XS (pequeño)')).toBeInTheDocument();
    expect(screen.getByTestId('shalom-tamano-ayuda')).toHaveTextContent('Elige la agencia de destino');
    expect(tarifaMock).not.toHaveBeenCalled();
});

it('con destino: cotiza la ruta y muestra el precio de cada tamaño y el del elegido', async () => {
    render(<ShalomProductoSelect value={900002} onChange={() => {}} destinoId="7" />);
    await waitFor(() => expect(screen.getByText('PAQUETE XXS (muy pequeño) · S/ 8.00')).toBeInTheDocument());
    expect(tarifaMock).toHaveBeenCalledWith('7');
    expect(screen.getByText('PAQUETE XS (pequeño) · S/ 10.00')).toBeInTheDocument();
    expect(screen.getByTestId('shalom-tamano-ayuda')).toHaveTextContent('Flete para esta ruta: S/ 8.00 · llega en ~48 horas');
});
