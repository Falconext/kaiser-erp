/**
 * QA del modal "Editar Despacho" respecto al estado de cobro de la venta: la
 * franja superior dice si ya está pagada o cuánto falta, el campo de adelanto
 * solo aparece cuando hay algo que registrar, Shalom COD avisa si la venta ya
 * está pagada y propone el saldo como monto a cobrar cuando sí hay saldo.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

let comprobante: any = {};
const putMock = jest.fn((_url: string, _body: any) => Promise.resolve({ data: { code: 1 } }));
const getMock = jest.fn((url: string) => {
    if (url.startsWith('/envio-despacho/comprobante/')) return Promise.resolve({ data: { data: {
        transportista: 'SHALOM_PRO', tipoEnvio: 'AGENCIA', agenciaDestino: 'AREQUIPA', celularDest: '957039998',
        nroPaquetes: 1, montoCOD: 0, costoEnvio: null,
    } } });
    if (url.startsWith('/comprobante/')) return Promise.resolve({ data: { data: comprobante } });
    return Promise.resolve({ data: {} });
});
jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: (u: string) => getMock(u), put: (u: string, b: any) => putMock(u, b), patch: (u: string, b: any) => putMock(u, b), delete: jest.fn(() => Promise.resolve({ data: { code: 1 } })), post: jest.fn() } }));
jest.mock('@/zustand/alert', () => ({ __esModule: true, default: () => ({ alert: jest.fn() }) }));
jest.mock('@/zustand/repartidores', () => ({ useRepartidoresStore: () => ({ repartidores: [], fetchRepartidores: () => Promise.resolve() }) }));
jest.mock('@/zustand/extentions', () => ({ useExtentionsStore: () => ({ ubigeos: [], getUbigeos: jest.fn() }) }));
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

const base = { serie: 'NV01', correlativo: 47, tipoDoc: 'NV', tipoMoneda: 'PEN', cliente: { id: 1, nombre: 'ROSA QA', nroDoc: '12345678', telefono: '957039998' }, usuario: { nombre: 'VENDEDOR' } };
const abrir = async () => {
    render(<EditarDespachoModal comprobanteId={47} onClose={() => {}} onSuccess={() => {}} />);
    await screen.findByTestId('venta-cobro');
};

describe('Editar Despacho · estado de cobro de la venta', () => {
    beforeEach(() => { putMock.mockClear(); });

    it('venta pagada: franja verde, sin campo de adelanto y explicación del courier', async () => {
        comprobante = { ...base, mtoImpVenta: 185, saldo: 0, adelanto: 0, estadoPago: 'COMPLETADO' };
        await abrir();
        expect(screen.getByTestId('venta-cobro')).toHaveTextContent('Venta NV01-47 · PAGADA por completo');
        expect(screen.getByTestId('venta-cobro')).toHaveTextContent('Total S/ 185.00 · Pagado S/ 185.00');
        expect(screen.getByTestId('sin-monto-por-pagada')).toBeInTheDocument();
        expect(screen.queryByText('Monto cobrado / adelanto (S/)')).not.toBeInTheDocument();
        expect(screen.getByTestId('courier-hint')).toHaveTextContent('Shalom PRO');
        expect(screen.getByText('PRO · Guía en tu cuenta Shalom')).toBeInTheDocument();
        expect(screen.queryByTestId('aviso-cod-pagada')).not.toBeInTheDocument();
    });

    it('venta pagada + Shalom COD: avisa que cobraría dos veces y no propone monto', async () => {
        comprobante = { ...base, mtoImpVenta: 185, saldo: 0, adelanto: 0, estadoPago: 'COMPLETADO' };
        await abrir();
        fireEvent.click(screen.getByText('Shalom COD'));
        expect(screen.getByTestId('aviso-cod-pagada')).toBeInTheDocument();
        expect(screen.getByText('COD · Saldo por cobrar (control interno)')).toBeInTheDocument();
        expect(screen.getByText('Saldo por cobrar S/ (no hay)')).toBeInTheDocument();
        const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
        expect(input.value).toBe('');
    });

    it('venta con saldo: franja ámbar, campo de adelanto con ayuda y COD propone el saldo', async () => {
        comprobante = { ...base, mtoImpVenta: 180, saldo: 160, adelanto: 20, estadoPago: 'PAGO_PARCIAL' };
        await abrir();
        expect(screen.getByTestId('venta-cobro')).toHaveTextContent('Saldo pendiente S/ 160.00');
        expect(screen.getByTestId('venta-cobro')).toHaveTextContent('Total S/ 180.00 · Pagado S/ 20.00');
        expect(screen.queryByTestId('sin-monto-por-pagada')).not.toBeInTheDocument();
        expect(screen.getByText('Monto cobrado / adelanto (S/)')).toBeInTheDocument();
        expect(screen.getByText(/el saldo de S\/ 160.00 sigue pendiente/)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Shalom COD'));
        expect(screen.queryByTestId('aviso-cod-pagada')).not.toBeInTheDocument();
        expect(screen.getByText('Saldo por cobrar al cliente S/ (saldo S/ 160.00)')).toBeInTheDocument();
        expect((screen.getByPlaceholderText('0.00') as HTMLInputElement).value).toBe('160');
        fireEvent.click(screen.getByTestId('guardar-despacho'));
        await screen.findByTestId('guardar-despacho');
        expect(putMock).toHaveBeenCalled();
        expect((putMock.mock.calls[0] as any)[1].montoCOD).toBe(160);
    });

    it('venta en dólares muestra US$', async () => {
        comprobante = { ...base, tipoMoneda: 'USD', mtoImpVenta: 100, saldo: 40, adelanto: 60, estadoPago: 'PAGO_PARCIAL' };
        await abrir();
        expect(screen.getByTestId('venta-cobro')).toHaveTextContent('Saldo pendiente US$ 40.00');
    });
});

describe('Editar Despacho · título por estado y código de seguimiento', () => {
    it('despacho recién creado (solo courier por defecto) se presenta como "Coordinar envío"', async () => {
        comprobante = { ...base, mtoImpVenta: 50, saldo: 0, adelanto: 0, estadoPago: 'COMPLETADO' };
        getMock.mockImplementationOnce((url: string) => Promise.resolve({ data: { data: url.startsWith('/envio-despacho/') ? { transportista: 'SHALOM_PRO', tipoEnvio: 'AGENCIA', nroPaquetes: 1, direccionDestino: 'AV. DEL CLIENTE 1' } : comprobante } }));
        await abrir();
        expect(screen.getAllByText('Coordinar envío').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Coordinar envío').length).toBeGreaterThan(0);
    });

    it('con Shalom no hay campo genérico de rastreo y al guardar el N° de orden se copia a codigoGuia', async () => {
        comprobante = { ...base, mtoImpVenta: 50, saldo: 0, adelanto: 0, estadoPago: 'COMPLETADO' };
        await abrir();
        expect(screen.getByText('Editar despacho')).toBeInTheDocument();
        expect(screen.queryByTestId('codigo-seguimiento')).not.toBeInTheDocument();
        fireEvent.change(screen.getByPlaceholderText('Ej: 78560415'), { target: { value: '96381540' } });
        fireEvent.click(screen.getByTestId('guardar-despacho'));
        await screen.findByTestId('guardar-despacho');
        expect((putMock.mock.calls[putMock.mock.calls.length - 1] as any)[1]).toMatchObject({ nroOrden: '96381540', codigoGuia: '96381540' });
    });

    it('con Reparto propio aparece "Código de seguimiento (opcional)" y no se inventa codigoGuia', async () => {
        comprobante = { ...base, mtoImpVenta: 50, saldo: 0, adelanto: 0, estadoPago: 'COMPLETADO' };
        await abrir();
        fireEvent.click(screen.getByText('Reparto propio'));
        expect(screen.getByTestId('codigo-seguimiento')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('guardar-despacho'));
        await screen.findByTestId('guardar-despacho');
        expect((putMock.mock.calls[putMock.mock.calls.length - 1] as any)[1].codigoGuia).toBe('');
    });
});

describe('Editar Despacho · clave de retiro', () => {
    const shalomMod = jest.requireMock('@/services/shalom.service');
    const conCuenta = (clave: any) => {
        shalomMod.shalomService.getInstancia = () => Promise.resolve({ habilitadoPorPlan: true, conectada: true });
        shalomMod.shalomService.claveRetiro = () => Promise.resolve(clave);
        shalomMod.shalomService.crearGuia = jest.fn(() => Promise.resolve({ nroOrden: '96659999', claveOrden: 'ABCD', claveEnvio: clave.clave }));
    };

    it('precarga la clave del día y explica de dónde sale', async () => {
        comprobante = { ...base, mtoImpVenta: 50, saldo: 0, adelanto: 0, estadoPago: 'COMPLETADO' };
        conCuenta({ clave: '1011', origen: 'CONFIGURADA', usadasAyer: ['1010'], claveHoy: null, configuradas: ['1010', '1011'] });
        await abrir();
        await screen.findByTestId('clave-ayuda');
        expect((screen.getByTestId('clave-retiro') as HTMLInputElement).value).toBe('1011');
        expect(screen.getByTestId('clave-ayuda')).toHaveTextContent('Clave de hoy según tu configuración (1010 / 1011)');
        expect(screen.getByText('Clave de retiro (se la mandas al cliente)')).toBeInTheDocument();
        expect(screen.getByText('Código de orden Shalom (rastreo)')).toBeInTheDocument();
    });

    it('si escribe la clave de ayer avisa, sugiere la otra y bloquea Generar guía', async () => {
        comprobante = { ...base, mtoImpVenta: 50, saldo: 0, adelanto: 0, estadoPago: 'COMPLETADO' };
        conCuenta({ clave: '1011', origen: 'CONFIGURADA', usadasAyer: ['1010'], claveHoy: null, configuradas: ['1010', '1011'] });
        await abrir();
        await screen.findByTestId('clave-ayuda');
        fireEvent.change(screen.getByTestId('clave-retiro'), { target: { value: '1010' } });
        expect(screen.getByTestId('clave-ayuda')).toHaveTextContent('La clave 1010 fue la de ayer');
        expect(screen.getByTestId('clave-ayuda')).toHaveTextContent('Usa 1011');
        expect(screen.getByText('Generar guía en Shalom').closest('button')).toBeDisabled();
        fireEvent.change(screen.getByTestId('clave-retiro'), { target: { value: '2468' } });
        expect(screen.getByText('Generar guía en Shalom').closest('button')).not.toBeDisabled();
        expect(screen.getByTestId('clave-ayuda')).toHaveTextContent('Usarás 2468 en esta guía');
        // Shalom no acepta años del calendario como clave.
        fireEvent.change(screen.getByTestId('clave-retiro'), { target: { value: '2024' } });
        expect(screen.getByTestId('clave-ayuda')).toHaveTextContent('no acepta un año como clave');
        expect(screen.getByText('Generar guía en Shalom').closest('button')).toBeDisabled();
    });

    it('manda la clave escrita al generar la guía', async () => {
        comprobante = { ...base, mtoImpVenta: 50, saldo: 0, adelanto: 0, estadoPago: 'COMPLETADO' };
        conCuenta({ clave: '4321', origen: 'ALEATORIA', usadasAyer: [], claveHoy: null, configuradas: [] });
        await abrir();
        await screen.findByTestId('clave-ayuda');
        expect(screen.getByTestId('clave-ayuda')).toHaveTextContent('Clave generada al azar');
        fireEvent.change(screen.getByTestId('clave-retiro'), { target: { value: '2468' } });
        fireEvent.click(screen.getByText('Generar guía en Shalom'));
        await screen.findByDisplayValue('96659999');
        expect(shalomMod.shalomService.crearGuia).toHaveBeenCalledWith(47, expect.objectContaining({ clave: '2468' }));
    });
});
