import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// jsdom no trae TextEncoder/TextDecoder, y react-router los usa al cargarse.
// Sin esto, cualquier suite que importe react-router-dom muere al arrancar.
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}

// Las llamadas a la API se mockean en cada test; esto solo evita que el
// cliente HTTP resuelva una URL distinta según la máquina donde se corra.
process.env.VITE_API_URL = process.env.VITE_API_URL || 'http://localhost:4201/api';
