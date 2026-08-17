import re

with open('src/pages/tienda/AutopartesProductoDetalle.tsx', 'r') as f:
    content = f.read()

translations = {
    '>Home<': '>Inicio<',
    '>Catalog<': '>Catálogo<',
    '>Sale<': '>Oferta<',
    '>Part Number:<': '>Código:<',
    '>Guaranteed Fit<': '>Garantía de Compatibilidad<',
    '>Quantity<': '>Cantidad<',
    "'Out of Stock'": "'Agotado'",
    "'Add to Cart'": "'Agregar al Carrito'",
    'Technical Specifications': 'Especificaciones Técnicas',
    'Compatibility<': 'Compatibilidad<',
    '>Description<': '>Descripción<',
    '>Specifications<': '>Especificaciones<',
    'No description available for this part.': 'No hay descripción disponible para este producto.',
    'Related Parts': 'Productos Relacionados',
    'Showing <span className="font-bold text-gray-900">{sortedProductos.length}</span> of {total} results': 'Mostrando <span className="font-bold text-gray-900">{sortedProductos.length}</span> de {total} resultados'
}

for eng, spa in translations.items():
    content = content.replace(eng, spa)

with open('src/pages/tienda/AutopartesProductoDetalle.tsx', 'w') as f:
    f.write(content)
