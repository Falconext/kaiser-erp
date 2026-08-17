const URBANO_TEMPLATE_IMAGES = [
  '/assets/templates/urbano/coleccion1.png',
  '/assets/templates/urbano/coleccion2.png',
  '/assets/templates/urbano/coleccion3.png',
  '/assets/templates/urbano/coleccion4.png',
  '/assets/templates/urbano/coleccion5.png',
  '/assets/templates/urbano/coleccion6.png',
  '/assets/templates/urbano/coleccion7.png',
  '/assets/templates/urbano/coleccion8.png',
  '/assets/templates/urbano/coleccion9.png',
  '/assets/templates/urbano/coleccion10.png',
];

const DEFAULT_CATEGORIES = ['Poleras', 'Pantalones', 'Polos', 'Casacas'];
const DEFAULT_PRODUCTS = [
  ['Polera oversize grafica', 89.9, 'Poleras'],
  ['Pantalon cargo urbano', 139.9, 'Pantalones'],
  ['Polo basico street', 59.9, 'Polos'],
  ['Casaca tecnica negra', 189.9, 'Casacas'],
  ['Polera minimal gris', 99.9, 'Poleras'],
  ['Pantalon jogger premium', 119.9, 'Pantalones'],
  ['Polo boxy fit', 69.9, 'Polos'],
  ['Casaca utilitaria', 209.9, 'Casacas'],
  ['Hoodie urbano', 129.9, 'Poleras'],
  ['Pantalon recto', 149.9, 'Pantalones'],
];

export const isUrbanoTemplateProduct = (product: any) => Boolean(product?.__urbanoTemplateProduct);

export const getUrbanoTemplateCategories = (diseno: any = {}) => [
  {
    nombre: diseno.urbanoCat1Text || DEFAULT_CATEGORIES[0],
    imagenUrl: diseno.urbanoCat1Img || '/assets/templates/urbano/coleccion5.png',
  },
  {
    nombre: diseno.urbanoCat2Text || DEFAULT_CATEGORIES[1],
    imagenUrl: diseno.urbanoCat2Img || '/assets/templates/urbano/coleccion6.png',
  },
  {
    nombre: diseno.urbanoCat3Text || DEFAULT_CATEGORIES[2],
    imagenUrl: diseno.urbanoCat3Img || '/assets/templates/urbano/coleccion7.png',
  },
  {
    nombre: diseno.urbanoCat4Text || DEFAULT_CATEGORIES[3],
    imagenUrl: diseno.urbanoCat4Img || '/assets/templates/urbano/coleccion8.png',
  },
];

export const getUrbanoTemplateProducts = (diseno: any = {}) => {
  const categories = getUrbanoTemplateCategories(diseno);

  return DEFAULT_PRODUCTS.map(([descripcion, precioUnitario, category], index) => {
    const categoryIndex = DEFAULT_CATEGORIES.indexOf(String(category));
    const categoria = categories[categoryIndex >= 0 ? categoryIndex : index % categories.length]?.nombre || String(category);

    return {
      id: `urbano-template-${index + 1}`,
      __urbanoTemplateProduct: true,
      descripcion,
      precioUnitario,
      precioOriginal: 0,
      stock: 12,
      imagenUrl: URBANO_TEMPLATE_IMAGES[index % URBANO_TEMPLATE_IMAGES.length],
      categoria: { nombre: categoria },
      marca: { nombre: 'Vendify' },
      opcionesAtributos: [
        { nombre: 'Color', valores: ['Negro', 'Gris', 'Blanco'] },
        { nombre: 'Talla', valores: ['S', 'M', 'L', 'XL'] },
      ],
    };
  });
};
