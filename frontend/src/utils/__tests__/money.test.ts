import { esDolares, simboloMoneda, formatMoneda, factorConversionPen } from '../money';

describe('esDolares', () => {
    it.each(['USD', 'usd', 'US$', 'DÓLARES (US$)', 'Dolares'])('reconoce %s', (v) => {
        expect(esDolares(v)).toBe(true);
    });

    it.each(['PEN', 'SOLES (S/)', '', null, undefined])('descarta %s', (v) => {
        expect(esDolares(v as any)).toBe(false);
    });
});

describe('simboloMoneda', () => {
    it('devuelve US$ para dólares y S/ para el resto', () => {
        expect(simboloMoneda('USD')).toBe('US$');
        expect(simboloMoneda('PEN')).toBe('S/');
        expect(simboloMoneda(undefined)).toBe('S/');
    });
});

describe('formatMoneda', () => {
    it('antepone el símbolo de la moneda del documento', () => {
        expect(formatMoneda(12, 'USD')).toBe('US$ 12.00');
        expect(formatMoneda(12, 'PEN')).toBe('S/ 12.00');
    });

    it('siempre usa dos decimales y trata los vacíos como cero', () => {
        expect(formatMoneda(1234.5, 'PEN')).toBe('S/ 1,234.50');
        expect(formatMoneda(null, 'USD')).toBe('US$ 0.00');
    });
});

describe('factorConversionPen', () => {
    it('no convierte importes que ya están en soles', () => {
        expect(factorConversionPen('PEN', 3.406)).toBe(1);
        expect(factorConversionPen(undefined, 3.406)).toBe(1);
    });

    it('usa el tipo de cambio cuando la moneda es dólares', () => {
        expect(factorConversionPen('USD', 3.406)).toBe(3.406);
        expect(factorConversionPen('DÓLARES (US$)', '3.52')).toBe(3.52);
    });

    it('cae a 1 si el tipo de cambio no sirve', () => {
        for (const tc of [0, -1, NaN, null, undefined, 'abc']) {
            expect(factorConversionPen('USD', tc as any)).toBe(1);
        }
    });

    it('lleva a soles un costo en dólares para compararlo con el precio anterior', () => {
        // Caso real: última compra E001-000077 a USD 1.55 con TC 3.52 → el backend
        // devuelve S/ 5.46. Un costo nuevo de USD 2.00 a TC 3.406 son S/ 6.81:
        // la compra SUBIÓ, aunque en dólares el número sea menor.
        const anteriorPEN = 1.55 * 3.52;
        const actualPEN = 2.0 * factorConversionPen('USD', 3.406);
        expect(actualPEN).toBeCloseTo(6.812, 3);
        expect(actualPEN).toBeGreaterThan(anteriorPEN);
    });
});
