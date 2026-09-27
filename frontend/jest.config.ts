export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
        '^@/(.*)$': '<rootDir>/src/$1',
        // Solo ESM; ver el comentario del mock.
        '^@react-pdf/renderer$': '<rootDir>/__mocks__/reactPdfMock.js',
        // También ESM; se importa como '@iconify/react' y como
        // '@iconify/react/dist/iconify.js' según el archivo.
        '^@iconify/react(/.*)?$': '<rootDir>/__mocks__/iconifyMock.js',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: 'tsconfig.json',
            // Vite expone la configuración en `import.meta.env`, que en
            // CommonJS (como corre Jest) es un error de sintaxis. Ver el
            // comentario del transformador.
            astTransformers: {
                before: ['<rootDir>/jest/import-meta.ts'],
            },
        }],
    },
};
