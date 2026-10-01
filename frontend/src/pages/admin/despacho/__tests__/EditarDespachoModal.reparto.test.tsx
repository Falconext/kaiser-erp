/**
 * QA del modal "Editar Despacho" en modo Reparto propio: muestra la sección del
 * motorizado, resuelve el distrito desde ubigeos, calcula el cobro en destino y
 * envía los campos nuevos en el PUT con el formato que espera el backend.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

const putMock = jest.fn((_url: string, _body: any) => Promise.resolve({ data: { code: 1 } }));
const getMock = jest.fn((url: string) => {
    if (url.startsWith('/envio-despacho/comprobante/')) return Promise.resolve({ data: { data: {
        transportista: 'PROPIOS', tipoEnvio: 'DOMICILIO', agenciaDestino: 'predio el porvenir mz b lt 5', celularDest: '957039998',
        nroPaquetes: 1, turnoEnvio: 'MANANA', fechaEstimada: '2026-09-21T12:00:00.000Z', montoCOD: 0, costoEnvio: 0,
        tipoVentaReparto: '', distrito: '', distritoUbigeo: '', coordenadas: '', formaPagoCobro: '', revisarProducto: false,
        sedeOrigenNombre: 'Sede Principal',
    } } });
    if (url.startsWith('/comprobante/')) return Promise.resolve({ data: { data: { tipoDoc: 'NV', adelanto: 0, saldo: 35, mtoImpVenta: 35, cliente: { id: 1, nombre: 'ROSA QA', nroDoc: '12345678', telefono: '957039998' }, usuario: { nombre: 'VENDEDOR' } } } });
    return Promise.resolve({ data: {} });
});
jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: (u: string) => getMock(u), put: (u: string, b: any) => putMock(u, b), patch: (u: string, b: any) => putMock(u, b), delete: jest.fn(() => Promise.resolve({ data: { code: 1 } })), post: jest.fn() } }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: () => ({ alert: jest.fn() }) }));
jest.mock('@/zustand/repartidores', () => ({ useRepartidoresStore: () => ({ repartidores: [{ id: 7, nombre: 'PEDRO MOTO', celular: '999', sede: null }], fetchRepartidores: () => Promise.resolve() }) }));
const getUbigeos = jest.fn();
jest.mock('@/zustand/extentions', () => ({ useExtentionsStore: () => ({ ubigeos: [
    { codigo: '150102', departamento: 'Lima', provincia: 'Lima ', distrito: 'Ancón' },
    { codigo: '150103', departamento: 'Lima', provincia: 'Lima ', distrito: 'Ate' },
    { codigo: '040103', departamento: 'Arequipa', provincia: 'Arequipa', distrito: 'Cayma' },
], getUbigeos }) }));
jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('@/components/Date', () => ({ Calendar: (p: any) => <input aria-label={p.text} value={p.value} onChange={(e) => p.onChange(e.target.value)} /> }));
jest.mock('@/components/Select', () => ({ __esModule: true, default: (p: any) => <select aria-label="turno" value={p.value} onChange={(e) => p.onChange(e.target.value)}>{(p.options || []).map((o: any) => <option key={o.id} value={o.id}>{o.value}</option>)}</select> }));
jest.mock('@/components/ShalomAgenciaSelect', () => ({ ShalomAgenciaSelect: () => null }));
jest.mock('@/components/ShalomProductoSelect', () => ({ ShalomProductoSelect: () => null }));
jest.mock('@/components/OlvaAgenciaSelect', () => ({ OlvaAgenciaSelect: () => null }));
jest.mock('@/components/EstablecimientoCombobox', () => ({ EstablecimientoCombobox: (p: any) => <input aria-label="Establecimiento" value={p.value} onChange={(e) => p.onChange(e.target.value)} /> }));
jest.mock('@/services/shalom.service', () => ({ shalomService: { getInstancia: () => Promise.reject(new Error('n/a')), crearGuia: jest.fn() }, mensajeErrorShalom: (_e: any, m: string) => m }));
jest.mock('@/services/olva.service', () => ({ olvaService: { getConfig: () => Promise.reject(new Error('n/a')), crearGuia: jest.fn() }, mensajeErrorOlva: (_e: any, m: string) => m }));

import { EditarDespachoModal } from '../EditarDespachoModal';

const abrir = async () => {
    render(<EditarDespachoModal comprobanteId={123} onClose={() => {}} onSuccess={() => {}} />);
    await screen.findByTestId('seccion-reparto-propio');
};

describe('Editar Despacho · Reparto propio', () => {
    beforeEach(() => { putMock.mockClear(); getUbigeos.mockClear(); });

    it('con Reparto propio muestra la sección, la sede de origen y relabela la dirección', async () => {
        await abrir();
        expect(screen.getByText('Reparto propio / motorizado')).toBeInTheDocument();
        expect(screen.getByText('Sede Principal')).toBeInTheDocument();
        expect(screen.getByText('Dirección de entrega')).toBeInTheDocument();
        expect(screen.queryByText('Agencia de destino / Dirección')).not.toBeInTheDocument();
        expect(screen.getByDisplayValue('predio el porvenir mz b lt 5')).toBeInTheDocument();
        expect(screen.getByText('Contraentrega')).toBeInTheDocument();
        expect(screen.getByText('Solo entrega')).toBeInTheDocument();
    });

    it('al cambiar a Shalom PRO la sección desaparece', async () => {
        await abrir();
        fireEvent.click(screen.getByText('Shalom PRO'));
        expect(screen.queryByTestId('seccion-reparto-propio')).not.toBeInTheDocument();
        expect(screen.getByText('Agencia de destino / Dirección')).toBeInTheDocument();
    });

    it('distrito: busca en ubigeos priorizando Lima y guarda nombre + código', async () => {
        await abrir();
        const input = screen.getByPlaceholderText('Escribe el distrito (ej: Ate, Comas, Ancón)');
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: 'an' } });
        const opcion = await screen.findByText('Ancón');
        fireEvent.click(opcion);
        expect((screen.getByPlaceholderText('Escribe el distrito (ej: Ate, Comas, Ancón)') as HTMLInputElement).value).toBe('Ancón');
        fireEvent.click(screen.getByText('Contraentrega'));
        fireEvent.click(screen.getByTestId('guardar-despacho'));
        await waitFor(() => expect(putMock).toHaveBeenCalled());
        const [url, body] = (putMock.mock.calls[0] as any);
        expect(url).toBe('/envio-despacho/comprobante/123/upsert');
        expect(body.distrito).toBe('Ancón');
        expect(body.distritoUbigeo).toBe('150102');
        expect(body.tipoVentaReparto).toBe('CONTRAENTREGA');
    });

    it('contraentrega: pide monto y forma de pago; solo entrega fuerza NO_COBRAR', async () => {
        await abrir();
        fireEvent.click(screen.getByText('Contraentrega'));
        expect(screen.getByText('Monto a cobrar al entregar (S/)')).toBeInTheDocument();
        const sel = screen.getByText('El cliente paga con').parentElement!.querySelector('select') as HTMLSelectElement;
        expect(sel.value).toBe('EFECTIVO'); // default al elegir contraentrega
        fireEvent.change(sel, { target: { value: 'YAPE' } });
        const monto = screen.getByPlaceholderText('0.00 = lo que falta por pagar del comprobante');
        fireEvent.change(monto, { target: { value: '35' } });
        fireEvent.click(screen.getByLabelText('El cliente puede revisar el producto antes de pagar.'));
        fireEvent.click(screen.getByTestId('guardar-despacho'));
        await waitFor(() => expect(putMock).toHaveBeenCalled());
        let body = (putMock.mock.calls[0] as any)[1];
        expect(body.formaPagoCobro).toBe('YAPE');
        expect(body.montoCOD).toBe(35);
        expect(body.revisarProducto).toBe(true);
        expect(body.sedeOrigenNombre).toBeUndefined(); // solo lectura, no viaja
        // ahora solo entrega
        putMock.mockClear();
        fireEvent.click(screen.getByText('Solo entrega'));
        expect(screen.queryByText('Monto a cobrar al entregar (S/)')).not.toBeInTheDocument();
        fireEvent.click(screen.getByTestId('guardar-despacho'));
        await waitFor(() => expect(putMock).toHaveBeenCalled());
        body = (putMock.mock.calls[0] as any)[1];
        expect(body.tipoVentaReparto).toBe('SOLO_ENTREGA');
        expect(body.formaPagoCobro).toBe('NO_COBRAR');
    });

    it('sin tocar los campos nuevos, el PUT no manda selects vacíos (evita 400 de @IsIn)', async () => {
        await abrir();
        fireEvent.click(screen.getByTestId('guardar-despacho'));
        await waitFor(() => expect(putMock).toHaveBeenCalled());
        const body = (putMock.mock.calls[0] as any)[1];
        expect(body.tipoVentaReparto).toBeUndefined();
        expect(body.formaPagoCobro).toBeUndefined();
        expect(body.revisarProducto).toBe(false);
        expect(body.turnoEnvio).toBe('MANANA');
        expect(body.fechaEstimada).toBe('2026-09-21'); // mediodía UTC se lee como 21 en Lima
    });

    it('elegir Reparto propio pasa el tipo de envío a domicilio y muestra "Nombre de quien recibe"', async () => {
        await abrir();
        // el despacho venía "Para agencia" (tipoEnvio AGENCIA) → al pulsar el chip se vuelve domicilio
        fireEvent.click(screen.getByText('Shalom PRO'));
        fireEvent.click(screen.getByText('Para agencia'));
        fireEvent.click(screen.getByText('Reparto propio'));
        expect(screen.getByText('Dirección de entrega')).toBeInTheDocument();
        const nombre = screen.getByPlaceholderText('Nombre y apellido de quien recibe el pedido') as HTMLInputElement;
        expect(nombre.value).toBe('ROSA QA'); // precargado desde la ficha real del cliente
        fireEvent.change(nombre, { target: { value: 'ROSA QUISPE' } });
        fireEvent.click(screen.getByTestId('guardar-despacho'));
        await waitFor(() => expect(putMock).toHaveBeenCalled());
        const body = (putMock.mock.calls[0] as any)[1];
        expect(body.tipoEnvio).toBe('DOMICILIO');
        expect(body.nombreDestinatario).toBe('ROSA QUISPE');
    });

    it('cliente "CLIENTES VARIOS": no precarga el nombre de quien recibe y lo pide', async () => {
        getMock.mockImplementationOnce((url: string) => Promise.resolve({ data: { data: { transportista: 'PROPIOS', tipoEnvio: 'DOMICILIO', agenciaDestino: 'x', celularDest: '957039998', nroPaquetes: 1, montoCOD: 0, costoEnvio: 0, sedeOrigenNombre: 'Sede Principal' } } }))
            .mockImplementationOnce(() => Promise.resolve({ data: { data: { tipoDoc: 'NV', adelanto: 0, cliente: { id: 9, nombre: 'CLIENTES VARIOS', nroDoc: '10000000', telefono: '' }, usuario: { nombre: 'V' } } } }));
        render(<EditarDespachoModal comprobanteId={124} onClose={() => {}} onSuccess={() => {}} />);
        await screen.findByTestId('seccion-reparto-propio');
        const nombre = screen.getByPlaceholderText('Venta a "Clientes varios": escribe el nombre de quien recibe') as HTMLInputElement;
        expect(nombre.value).toBe('');
    });

    it('al elegir Reparto propio preselecciona Contraentrega si la venta tiene saldo, y Solo entrega si está pagada', async () => {
        // venta con saldo 35 (mock por defecto) y despacho sin tipo → CONTRAENTREGA + EFECTIVO
        getMock.mockImplementationOnce((url: string) => Promise.resolve({ data: { data: { transportista: 'SHALOM_PRO', tipoEnvio: 'AGENCIA', agenciaDestino: '', celularDest: '957039998', nroPaquetes: 1, montoCOD: 0, costoEnvio: 0, sedeOrigenNombre: 'Sede Principal' } } }));
        render(<EditarDespachoModal comprobanteId={125} onClose={() => {}} onSuccess={() => {}} />);
        await screen.findByText('Reparto propio');
        await waitFor(() => expect(getMock).toHaveBeenCalledWith('/comprobante/125'));
        fireEvent.click(screen.getByText('Reparto propio'));
        expect(screen.getByText('Monto a cobrar al entregar (S/)')).toBeInTheDocument();
        // Despacho recién creado (sin destino ni guía): el modal se presenta como "Coordinar envío".
        expect(screen.getAllByText('Coordinar envío').length).toBeGreaterThan(0);
        fireEvent.click(screen.getByTestId('guardar-despacho'));
        await waitFor(() => expect(putMock).toHaveBeenCalled());
        const body = (putMock.mock.calls[0] as any)[1];
        expect(body.tipoVentaReparto).toBe('CONTRAENTREGA');
        expect(body.formaPagoCobro).toBe('EFECTIVO');
        expect(body.tipoEnvio).toBe('DOMICILIO');
    });

    it('carga los ubigeos una sola vez al entrar en Reparto propio', async () => {
        await abrir();
        expect(getUbigeos).not.toHaveBeenCalled(); // el mock ya trae ubigeos
    });
});
