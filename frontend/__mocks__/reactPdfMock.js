// `@react-pdf/renderer` se publica solo como ESM y Jest no transforma
// node_modules. En los tests de ViewModel el PDF no es lo que se prueba: basta
// con que exista la superficie que el código usa.
const noop = () => null;
module.exports = {
  pdf: () => ({ toBlob: async () => new Blob(['pdf']) }),
  Document: noop, Page: noop, Text: noop, View: noop, Image: noop,
  StyleSheet: { create: (estilos) => estilos },
  Font: { register: () => {} },
  PDFDownloadLink: noop, PDFViewer: noop,
};
