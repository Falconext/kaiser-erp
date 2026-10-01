/**
 * QA de la PRECARGA del modal al "Coordinar envío" de una venta que TODAVÍA NO
 * tiene seguimiento (GET /envio-despacho/comprobante/:id responde data:null).
 *
 * Es el caso que se rompió: desde 49462fd la fila de EnvioDespacho nace recién
 * al guardar, y toda la precarga vivía dentro de `if (payload)`, así que el
 * destinatario se abría vacío aunque el cliente tuviera DNI y celular.
 *
 * Los tests cubren las cuatro formas de cliente que existen en el POS, para que
 * no vuelva a pasar "con este ni con otro".
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cliente de la venta: lo cambia cada test antes de renderizar.
let clienteActual: any = null;
// Despacho devuelto por el GET: null = la venta aún no tiene seguimiento.
let despachoActual: any = null;

const getMock = jest.fn((url: string) => {
    if (url.startsWith('/envio-despacho/comprobante/')) return Promise.resolve({ data: { code: 1, message: 'OK', data: despachoActual } });
    if (url.startsWith('/comprobante/')) return Promise.resolve({ data: { data: {
        tipoDoc: 'NV', adelanto: 0, saldo: 0, mtoImpVenta: 360, serie: 'NV01', correlativo: 64,
        estadoPago: 'COMPLETADO', tipoMoneda: 'PEN', cliente: clienteActual, usuario: { nombre: 'Demo Ropa' },
    } } });
    return Promise.resolve({ data: {} });
});
jest.mock('@/utils/apiClient', () => ({ __esModule: true, default: { get: (u: string) => getMock(u), put: jest.fn(() => Promise.resolve({ data: { code: 1 } })), patch: jest.fn(() => Promise.resolve({ data: { code: 1 } })), delete: jest.fn(), post: jest.fn() } }));
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
jest.mock('@/services/shalom.service', () => ({ shalomService: { getInstancia: () => Promise.reject(new Error('n/a')), claveRetiro: jest.fn(), crearGuia: jest.fn() }, mensajeErrorShalom: (_e: any, m: string) => m }));
jest.mock('@/services/olva.service', () => ({ olvaService: { getConfig: () => Promise.reject(new Error('n/a')), crearGuia: jest.fn() }, mensajeErrorOlva: (_e: any, m: string) => m }));

import { EditarDespachoModal } from '../EditarDespachoModal';

const CLIENTE_CON_DNI = { id: 1, nombre: 'ORTEGA ROLDAN, DIEGO JESUS', nroDoc: '47065472', telefono: '991065217' };
const CLIENTE_VARIOS = { id: 2, nombre: 'CLIENTES VARIOS', nroDoc: '10000000', telefono: '' };
const CLIENTE_WSP = { id: 3, nombre: 'Wsp 987657123', nroDoc: '0', telefono: '987657123' };

/** Abre el modal y entra a la pestaña Shalom PRO, que es donde va el destinatario. */
const abrirEnShalom = async () => {
    render(<EditarDespachoModal comprobanteId={64} onClose={() => {}} onSuccess={() => {}} />);
    const tab = await screen.findByText('Shalom PRO');
    fireEvent.click(tab);
    return {
        dni: await screen.findByPlaceholderText('8 dígitos'),
        nombre: screen.getByPlaceholderText('APELLIDOS, NOMBRES (se llena con RENIEC)'),
        celular: screen.getByPlaceholderText('9XXXXXXXX'),
    };
};

describe('Coordinar envío · precarga del destinatario cuando la venta aún no tiene despacho', () => {
    beforeEach(() => { despachoActual = null; getMock.mockClear(); });

    it('cliente con DNI y celular: precarga DNI, nombre y celular', async () => {
        clienteActual = CLIENTE_CON_DNI;
        const { dni, nombre, celular } = await abrirEnShalom();
        expect(dni).toHaveValue('47065472');
        expect(nombre).toHaveValue('ORTEGA ROLDAN, DIEGO JESUS');
        expect(celular).toHaveValue('991065217');
    });

    it('cliente genérico "CLIENTES VARIOS": no inventa destinatario', async () => {
        clienteActual = CLIENTE_VARIOS;
        const { dni, nombre, celular } = await abrirEnShalom();
        // 10000000 es el documento del genérico del POS, no un DNI real.
        expect(dni).toHaveValue('');
        expect(nombre).toHaveValue('');
        expect(celular).toHaveValue('');
    });

    it('cliente sólo por WhatsApp: toma el celular pero deja DNI y nombre vacíos', async () => {
        clienteActual = CLIENTE_WSP;
        const { dni, nombre, celular } = await abrirEnShalom();
        expect(celular).toHaveValue('987657123');
        expect(dni).toHaveValue('');
        expect(nombre).toHaveValue('');
    });

    it('si el despacho ya existe, manda lo guardado y NO lo pisa con la ficha del cliente', async () => {
        clienteActual = CLIENTE_CON_DNI;
        despachoActual = {
            transportista: 'SHALOM_PRO', tipoEnvio: 'AGENCIA',
            dniDestinatario: '10101010', nombreDestinatario: 'QUIEN RECIBE, OTRO', celularDest: '900000000',
        };
        const { dni, nombre, celular } = await abrirEnShalom();
        expect(dni).toHaveValue('10101010');
        expect(nombre).toHaveValue('QUIEN RECIBE, OTRO');
        expect(celular).toHaveValue('900000000');
    });

    it('despacho existente sin destinatario: lo completa con la ficha del cliente', async () => {
        clienteActual = CLIENTE_CON_DNI;
        despachoActual = { transportista: 'SHALOM_PRO', tipoEnvio: 'AGENCIA', agenciaDestino: 'AEROPUERTO' };
        const { dni, nombre, celular } = await abrirEnShalom();
        expect(dni).toHaveValue('47065472');
        expect(nombre).toHaveValue('ORTEGA ROLDAN, DIEGO JESUS');
        expect(celular).toHaveValue('991065217');
    });

    it('un celular que no es de 9 dígitos no se precarga', async () => {
        clienteActual = { id: 4, nombre: 'PEREZ, JUAN', nroDoc: '12345678', telefono: '014455667' };
        const { celular, dni } = await abrirEnShalom();
        expect(celular).toHaveValue('');
        expect(dni).toHaveValue('12345678');
    });
});
