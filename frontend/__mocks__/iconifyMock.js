// `@iconify/react` se publica como ESM y Jest no transforma node_modules.
// Los iconos son decorativos: basta con un elemento que no rompa el render y
// que deje ver en el DOM qué icono se pidió.
const React = require('react');
const Icon = React.forwardRef(function Icon({ icon, ...resto }, ref) {
  return React.createElement('span', { ref, 'data-icon': icon, ...resto });
});
module.exports = {
  __esModule: true,
  Icon,
  InlineIcon: Icon,
  loadIcon: () => Promise.resolve(null),
  addIcon: () => {},
  addCollection: () => {},
};
