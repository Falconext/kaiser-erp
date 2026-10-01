/**
 * Etiqueta 80×50: tamaño fijo en mm y los datos que el negocio pega en el
 * paquete (referencia, courier, orden, destinatario, DNI/celular/clave, destino).
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RotuloEtiqueta from '../RotuloEtiqueta';
import { leerRotuloFormato, guardarRotuloFormato, rotuloPageStyle } from '../rotuloFormato';

it('pinta 80×50 mm con todos los datos y salto de página cuando se pide', () => {
    render(<RotuloEtiqueta saltoDePagina d={{
        referencia: 'NV01-00000014', courier: 'Shalom PRO', nroOrden: '96696478', claveEnvio: '1010',
        nombreDestinatario: 'ORTEGA ROLDAN, DIEGO JESUS', dniDestinatario: '47065472', celular: '991065217',
        ubicacion: 'CUSCO - CUSCO - CUSCO', agenciaNombre: 'CUSCO PARQUE INDUSTRIAL', direccion: 'Av. Industrial 123',
    }} />);
    const el = screen.getByTestId('rotulo-etiqueta');
    expect(el).toHaveStyle({ width: '80mm', height: '50mm', pageBreakAfter: 'always' });
    expect(el).toHaveTextContent('NV01-00000014 · Shalom PRO · Orden 96696478');
    expect(el).toHaveTextContent('ORTEGA ROLDAN, DIEGO JESUS');
    expect(el).toHaveTextContent('DNI 47065472 · CEL 991065217 · CLAVE 1010');
    expect(el).toHaveTextContent('CUSCO PARQUE INDUSTRIAL');
    expect(el).toHaveTextContent('CUSCO - CUSCO - CUSCO');
});

it('sin datos opcionales no rompe y usa la dirección como destino', () => {
    render(<RotuloEtiqueta d={{ nombreDestinatario: 'ROSA QUISPE', celular: '987654321', direccion: 'Av. Los Olivos 123' }} />);
    const el = screen.getByTestId('rotulo-etiqueta');
    expect(el).toHaveTextContent('ROSA QUISPE');
    expect(el).toHaveTextContent('CEL');
    expect(el).not.toHaveTextContent('DNI');
    expect(el).toHaveTextContent('Av. Los Olivos 123');
    expect(el).not.toHaveTextContent('CLAVE');
});

it('el formato se recuerda por empresa y define el @page', () => {
    expect(leerRotuloFormato(63)).toBe('TICKET');
    guardarRotuloFormato(63, 'ETIQUETA_80X50');
    expect(leerRotuloFormato(63)).toBe('ETIQUETA_80X50');
    expect(leerRotuloFormato(64)).toBe('TICKET');
    expect(rotuloPageStyle('ETIQUETA_80X50')).toContain('size: 80mm 50mm');
    expect(rotuloPageStyle('TICKET')).toBeNull();
});
