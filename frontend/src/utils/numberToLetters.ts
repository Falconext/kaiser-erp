export const numberToWords = (num: number): string => {
    const units = [
        '', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
        'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE',
        'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUN', 'VEINTIDOS', 'VEINTITRES',
        'VEINTICUATRO', 'VEINTICINCO', 'VEINTISEIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'
    ];

    const tens = [
        '', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA',
        'OCHENTA', 'NOVENTA'
    ];

    const hundreds = [
        '', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
        'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'
    ];

    const convertLessThan1000 = (num: number): string => {
        let result = '';

        if (num >= 100) {
            const hundred = Math.floor(num / 100);
            result += hundreds[hundred];
            if (hundred === 1 && num % 100 !== 0) result = 'CIENTO';
            num %= 100;
            if (num > 0) result += ' ';
        }

        if (num > 20) {
            const ten = Math.floor(num / 10);
            result += tens[ten];
            num %= 10;
            if (num > 0) result += ' Y ';
        }

        if (num > 0) {
            result += units[num];
        }

        return result;
    };

    const convertToWords = (num: number): string => {
        if (num === 0) return 'CERO';

        let result = '';
        let thousandIndex = 0;

        while (num > 0) {
            const part = num % 1000;
            if (part > 0) {
                let partInWords = convertLessThan1000(part);
                if (thousandIndex === 1 && part === 1) {
                    partInWords = 'MIL';
                } else if (thousandIndex === 1) {
                    partInWords += ' MIL';
                } else if (thousandIndex === 2) {
                    partInWords += part === 1 ? ' MILLON' : ' MILLONES';
                }
                result = partInWords + (result ? ' ' + result : '');
            }
            num = Math.floor(num / 1000);
            thousandIndex++;
        }

        return result;
    };

    // Separar la parte entera y decimal del número
    const [integerPart, decimalPart] = num.toString().split('.');
    const integerWords = convertToWords(parseInt(integerPart));
    // Mostrar los decimales como dígitos directamente
    const decimalWords = decimalPart ? `CON ${decimalPart.padEnd(2, '0')}/100` : 'CON 00/100';

    return `${integerWords} ${decimalWords}`;
};