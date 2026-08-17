/**
 * Configuración declarativa de los campos editables por plantilla.
 * Usado por el Live Editor (StoreLiveEditorDrawer) para renderizar los
 * formularios dinámicos sobre la tienda pública en "modo WordPress".
 */

export interface ImageFieldDef {
  key: string;
  label: string;
  hint: string;
  fallback: string;
}

export interface TextFieldDef {
  key: string;
  label: string;
  placeholder: string;
  /** Agrupador visual dentro del panel */
  group?: string;
  /** 'categorySelect' = desplegable con las categorías reales de la tienda; 'toggle' = interruptor on/off; 'date' = selector de fecha */
  type?: 'text' | 'categorySelect' | 'toggle' | 'date';
  /** Texto de ayuda debajo del control (usado por 'toggle') */
  hint?: string;
}

export interface ProductFieldDef {
  key: string;
  label: string;
}

export type LinkFieldTarget = 'catalog' | 'category' | 'search' | 'product' | 'url' | 'none';

export interface LinkFieldDef {
  key: string;
  label: string;
  group?: string;
  defaultType?: LinkFieldTarget;
}

// ─────────────────────────────────────────────────────────────────────────────
// IMÁGENES
// ─────────────────────────────────────────────────────────────────────────────
export const AUTOPARTES_IMAGE_FIELDS: ImageFieldDef[] = [
  { key: 'autopartesHeroImageUrl', label: 'Hero principal', hint: 'Banner grande superior', fallback: '/assets/templates/autopartes/banner1.png' },
  { key: 'autopartesSideTopImageUrl', label: 'Hero lateral superior', hint: 'Tarjeta derecha superior', fallback: '/assets/templates/autopartes/banner2.png' },
  { key: 'autopartesSideBottomImageUrl', label: 'Hero lateral inferior', hint: 'Tarjeta derecha inferior', fallback: '/assets/templates/autopartes/banner3.png' },
  { key: 'autopartesVehicleImageUrl', label: 'Selector de vehículo', hint: 'Fondo de búsqueda por auto', fallback: '/assets/templates/autopartes/banner4.png' },
  { key: 'autopartesPromoLeftImageUrl', label: 'Promo izquierda', hint: 'Campaña llantas/ruedas', fallback: '/assets/templates/autopartes/llantas.png' },
  { key: 'autopartesPromoRightImageUrl', label: 'Promo derecha', hint: 'Campaña luces/faros', fallback: '/assets/templates/autopartes/luces.png' },
  { key: 'autopartesCommunityImageUrl', label: 'Comunidad', hint: 'Bloque comunidad automotriz', fallback: '/assets/templates/autopartes/comunidad.png' },
  { key: 'autopartesSupportImageUrl', label: 'Asistencia', hint: 'Bloque soporte/asistencia', fallback: '/assets/templates/autopartes/asistencia.png' },
  { key: 'autopartesBrandsImageUrl', label: 'Marcas', hint: 'Banner lateral de marcas', fallback: '/assets/templates/autopartes/marcas.png' },
  { key: 'autopartesProductImageUrl', label: 'Producto destacado', hint: 'Imagen base para ofertas/top selling', fallback: '/assets/templates/autopartes/producto.png' },
  { key: 'autopartesCategoryImageUrl', label: 'Categorías destacadas', hint: 'Imagen circular de categorías', fallback: '/assets/templates/autopartes/producto.png' },
  { key: 'autopartesWidgetOneImageUrl', label: 'Widget 1', hint: 'Tarjeta inferior izquierda', fallback: '/assets/templates/autopartes/widget1.png' },
  { key: 'autopartesWidgetTwoImageUrl', label: 'Widget 2', hint: 'Tarjeta inferior centro', fallback: '/assets/templates/autopartes/widget2.png' },
  { key: 'autopartesWidgetThreeImageUrl', label: 'Widget 3', hint: 'Tarjeta inferior derecha', fallback: '/assets/templates/autopartes/widget3.png' },
];

export const MODA_IMAGE_FIELDS: ImageFieldDef[] = [
  { key: 'modaHeroImg', label: 'Banner del hero (escritorio)', hint: 'Se muestra en pantallas grandes', fallback: '/assets/templates/moda/banner.webp' },
  { key: 'modaHeroImgMobile', label: 'Banner del hero (móvil)', hint: 'Se muestra en celulares', fallback: '/assets/templates/moda/bannermobile.webp' },
  { key: 'modaPromoImg', label: 'Banner Promocional', hint: 'Fondo del bloque promo', fallback: '/assets/templates/moda/promo.png' },
  { key: 'modaTrend1Image', label: 'Tendencia 1', hint: 'Imagen de tendencia', fallback: '' },
  { key: 'modaTrend2Image', label: 'Tendencia 2', hint: 'Imagen de tendencia', fallback: '' },
  { key: 'modaTrend3Image', label: 'Tendencia 3', hint: 'Imagen de tendencia', fallback: '' },
  { key: 'modaTrend4Image', label: 'Tendencia 4', hint: 'Imagen de tendencia', fallback: '' },
  { key: 'modaStyle1Image', label: 'Estilo 1', hint: 'Imagen de estilo', fallback: '' },
  { key: 'modaStyle2Image', label: 'Estilo 2', hint: 'Imagen de estilo', fallback: '' },
  { key: 'modaStyle3Image', label: 'Estilo 3', hint: 'Imagen de estilo', fallback: '' },
  { key: 'modaStyle4Image', label: 'Estilo 4', hint: 'Imagen de estilo', fallback: '' },
  { key: 'modaStyle5Image', label: 'Estilo 5', hint: 'Imagen de estilo', fallback: '' },
  { key: 'modaCollection1Image', label: 'Colección 1', hint: 'Imagen de colección', fallback: '' },
  { key: 'modaCollection2Image', label: 'Colección 2', hint: 'Imagen de colección', fallback: '' },
  { key: 'modaCollection3Image', label: 'Colección 3', hint: 'Imagen de colección', fallback: '' },
  { key: 'modaCollection4Image', label: 'Colección 4', hint: 'Imagen de colección', fallback: '' },
];

export const MAYE_IMAGE_FIELDS: ImageFieldDef[] = [
  { key: 'mayeHeroImageUrl', label: 'Hero principal', hint: 'Banner grande superior', fallback: '/assets/templates/maye/laptoppc.png' },
  { key: 'mayeSideTopImageUrl', label: 'Hero lateral superior', hint: 'Tarjeta superior derecha', fallback: '/assets/templates/maye/colecciones.png' },
  { key: 'mayeSideBottomImageUrl', label: 'Hero lateral inferior', hint: 'Tarjeta inferior derecha', fallback: '/assets/templates/maye/tarjetas.png' },
  { key: 'mayeVehicleImageUrl', label: 'Buscador tech', hint: 'Fondo del bloque de búsqueda', fallback: '/assets/templates/maye/filtradocategorias.png' },
  { key: 'mayePromoLeftImageUrl', label: 'Promo izquierda', hint: 'Banner de componentes', fallback: '/assets/templates/maye/coleccion.png' },
  { key: 'mayePromoRightImageUrl', label: 'Promo derecha', hint: 'Banner de periféricos', fallback: '/assets/templates/maye/rgb.png' },
  { key: 'mayeCommunityImageUrl', label: 'Comunidad', hint: 'Bloque comunidad tech', fallback: '/assets/templates/maye/comunidadtec.png' },
  { key: 'mayeSupportImageUrl', label: 'Soporte', hint: 'Bloque asistencia técnica', fallback: '/assets/templates/maye/24horastec.png' },
  { key: 'mayeBrandsImageUrl', label: 'Marcas', hint: 'Banner lateral de marcas', fallback: '/assets/templates/maye/marcastec.png' },
  { key: 'mayeCategory1ImageUrl', label: 'Categoría 1', hint: 'Imagen circular: Laptops y PCs', fallback: '/assets/templates/maye/catlaptopspc.png' },
  { key: 'mayeCategory2ImageUrl', label: 'Categoría 2', hint: 'Imagen circular: Componentes', fallback: '/assets/templates/maye/componentes.png' },
  { key: 'mayeCategory3ImageUrl', label: 'Categoría 3', hint: 'Imagen circular: Periféricos', fallback: '/assets/templates/maye/perifericos.png' },
  { key: 'mayeWidgetOneImageUrl', label: 'Widget 1', hint: 'Miniatura para top ventas', fallback: '/assets/templates/maye/comprarahora1.png' },
  { key: 'mayeWidgetTwoImageUrl', label: 'Widget 2', hint: 'Miniatura para top ventas', fallback: '/assets/templates/maye/comprarahora2.png' },
  { key: 'mayeWidgetThreeImageUrl', label: 'Widget 3', hint: 'Miniatura para top ventas', fallback: '/assets/templates/maye/comprarahora3.png' },
  { key: 'mayeCatalogBannerUrl', label: 'Banner catálogo', hint: 'Banner superior de la página de catálogo', fallback: '/assets/templates/maye/catalogo.png' },
];

export const TECNOLOGIA_IMAGE_FIELDS: ImageFieldDef[] = [
  { key: 'tecnologiaHeroImageUrl', label: 'Banner principal', hint: 'Imagen grande del inicio (hero)', fallback: '/assets/templates/tecnologia/banner.png' },
];

export const FALCON_IMAGE_FIELDS: ImageFieldDef[] = [
  { key: 'falconHeroImageUrl', label: 'Hero principal', hint: 'Producto o imagen principal del banner', fallback: '/assets/templates/falcon/banner1.png' },
  { key: 'falconSideOneImageUrl', label: 'Banner lateral 1', hint: 'Tarjeta superior del hero', fallback: '/assets/templates/falcon/banner2.png' },
  { key: 'falconSideTwoImageUrl', label: 'Banner lateral 2', hint: 'Tarjeta inferior del hero', fallback: '/assets/templates/falcon/banner3.png' },
  { key: 'falconSpecialImageUrl', label: 'Oferta especial', hint: 'Producto destacado lateral', fallback: '/assets/templates/falcon/silla.png' },
  { key: 'falconPromoImageUrl', label: 'Banner promociones', hint: 'Imagen del banner de ahorros', fallback: '/assets/templates/falcon/ahorros.png' },
  { key: 'falconCountdownImageUrl', label: 'Banner cuenta regresiva', hint: 'Producto del bloque de oferta final', fallback: '/assets/templates/falcon/apurate.png' },
  { key: 'falconCatalogBannerUrl', label: 'Catálogo: banner', hint: 'Fondo superior de la página de catálogo', fallback: '/assets/templates/falcon/catalogo.png' },
  { key: 'falconDetailBannerUrl', label: 'Detalle y blog: banner', hint: 'Fondo superior de detalle de producto y blog', fallback: '' },
];

export const CONSTRUCCION_IMAGE_FIELDS: ImageFieldDef[] = [
  { key: 'construccionHeroImageUrl', label: 'Hero principal', hint: 'Imagen principal de portada', fallback: '/assets/brochure/ferreteria.png' },
  { key: 'construccionPromoOneImageUrl', label: 'Promo 1', hint: 'Tarjeta promocional izquierda', fallback: '' },
  { key: 'construccionPromoTwoImageUrl', label: 'Promo 2', hint: 'Tarjeta promocional central', fallback: '' },
  { key: 'construccionPromoThreeImageUrl', label: 'Promo 3', hint: 'Tarjeta promocional derecha', fallback: '' },
  { key: 'construccionWideBannerImageUrl', label: 'Banner ancho', hint: 'Campaña central grande', fallback: '' },
  { key: 'construccionHalfBannerOneImageUrl', label: 'Banner inferior 1', hint: 'Campaña inferior izquierda', fallback: '' },
  { key: 'construccionHalfBannerTwoImageUrl', label: 'Banner inferior 2', hint: 'Campaña inferior derecha', fallback: '' },
];

export const APICULTURA_IMAGE_FIELDS: ImageFieldDef[] = [
  { key: 'apiculturaHeroBackgroundUrl', label: 'Hero principal', hint: 'Fondo/poster del video principal', fallback: '/assets/templates/apicultura/bannerapicultura.png' },
  { key: 'apiculturaHeroImageUrl', label: 'Hero respaldo', hint: 'Imagen alternativa si no usas fondo principal', fallback: '/assets/templates/apicultura/bannerapicultura.png' },
  { key: 'apiculturaPromoLeftImageUrl', label: 'Promo izquierda', hint: 'Banner de oferta/campaña', fallback: '/assets/templates/apicultura/widget1.png' },
  { key: 'apiculturaPromoRightImageUrl', label: 'Promo derecha', hint: 'Banner de producto natural', fallback: '/assets/templates/apicultura/widget2.png' },
  { key: 'apiculturaWhyBannerUrl', label: 'Fondo beneficios', hint: 'Fondo del bloque por qué elegirnos', fallback: '/assets/templates/apicultura/elijeproducto.png' },
  { key: 'apiculturaWhyImageUrl', label: 'Producto central', hint: 'Imagen del bloque por qué elegirnos', fallback: '/assets/templates/apicultura/productobase.png' },
  { key: 'apiculturaAboutImageUrl', label: 'Imagen nosotros', hint: 'Imagen del bloque sobre la tienda', fallback: '/assets/templates/apicultura/nosotros.png' },
];

export const URBANO_IMAGE_FIELDS: ImageFieldDef[] = [
  { key: 'urbanoHeroImg', label: 'Hero Banner', hint: 'Fondo principal', fallback: '/assets/templates/urbano/banner.png' },
  { key: 'urbanoCat1Img', label: 'Categoría 1', hint: 'Primera imagen en split categories', fallback: '/assets/templates/urbano/coleccion5.png' },
  { key: 'urbanoCat2Img', label: 'Categoría 2', hint: 'Segunda imagen', fallback: '/assets/templates/urbano/coleccion6.png' },
  { key: 'urbanoCat3Img', label: 'Categoría 3', hint: 'Tercera imagen', fallback: '/assets/templates/urbano/coleccion7.png' },
  { key: 'urbanoCat4Img', label: 'Categoría 4', hint: 'Cuarta imagen', fallback: '/assets/templates/urbano/coleccion8.png' },
  { key: 'urbanoBottomBannerImg', label: 'Banner Inferior', hint: 'Imagen de fondo', fallback: '/assets/templates/urbano/wear.png' },
  { key: 'urbanoShopTheLookImg', label: 'Compra el look', hint: 'Foto de modelo y outfit', fallback: '/assets/templates/urbano/shoplook.png' },
  { key: 'urbanoFeatureModelImg', label: 'Feature Highlight', hint: 'Foto de contexto', fallback: '/assets/templates/urbano/coleccion9.png' },
  { key: 'urbanoGallery1', label: 'Galería 1', hint: 'Imágenes inferiores 1', fallback: '/assets/templates/urbano/coleccion2.png' },
  { key: 'urbanoGallery2', label: 'Galería 2', hint: 'Imágenes inferiores 2', fallback: '/assets/templates/urbano/coleccion3.png' },
  { key: 'urbanoGallery3', label: 'Galería 3', hint: 'Imágenes inferiores 3', fallback: '/assets/templates/urbano/coleccion4.png' },
  { key: 'urbanoGallery4', label: 'Galería 4', hint: 'Imágenes inferiores 4', fallback: '/assets/templates/urbano/coleccion5.png' },
  { key: 'urbanoGallery5', label: 'Galería 5', hint: 'Imágenes inferiores 5', fallback: '/assets/templates/urbano/coleccion6.png' },
];

// ─────────────────────────────────────────────────────────────────────────────
// TEXTOS
// ─────────────────────────────────────────────────────────────────────────────
const AUTOPARTES_TEXT_FIELDS: TextFieldDef[] = [
  { key: 'heroTitle', label: 'Título del banner', placeholder: 'Repuestos de Alto Rendimiento', group: 'Hero' },
  { key: 'heroSubtitle', label: 'Subtítulo del banner', placeholder: 'Encuentra los mejores repuestos...', group: 'Hero' },
  { key: 'comunidadTitle', label: 'Título de la comunidad', placeholder: 'Sé parte de nuestra comunidad', group: 'Comunidad' },
  { key: 'comunidadText', label: 'Texto descriptivo', placeholder: 'Únete para ofertas exclusivas', group: 'Comunidad' },
  { key: 'widgetOneTitle', label: 'Widget 1: Título', placeholder: 'Llantas y Ruedas', group: 'Widgets promocionales' },
  { key: 'widgetOneSubtitle', label: 'Widget 1: Subtítulo', placeholder: '¡Potencia tu Setup!', group: 'Widgets promocionales' },
  { key: 'widgetTwoTitle', label: 'Widget 2: Título', placeholder: 'ACEITE MOTOR', group: 'Widgets promocionales' },
  { key: 'widgetTwoSubtitle', label: 'Widget 2: Subtítulo', placeholder: '¡Rendimiento Suave!', group: 'Widgets promocionales' },
  { key: 'widgetThreeTitle', label: 'Widget 3: Título', placeholder: 'COMPRA 1 LLEVA 1!', group: 'Widgets promocionales' },
  { key: 'widgetThreeSubtitle', label: 'Widget 3: Subtítulo', placeholder: '¡Aprovecha ahora!', group: 'Widgets promocionales' },
];

const URBANO_TEXT_FIELDS: TextFieldDef[] = [
  { key: 'urbanoStoreName', label: 'Nombre de tienda (logo)', placeholder: 'BLNK o Nombre Empresa', group: 'Principal' },
  { key: 'urbanoHeroSubtitle', label: 'Hero subtítulo', placeholder: 'Nueva colección', group: 'Hero' },
  { key: 'urbanoHeroTitle', label: 'Hero título', placeholder: 'Estilo urbano para la ciudad', group: 'Hero' },
  { key: 'urbanoHeroBtn', label: 'Hero botón', placeholder: '[ VER COLECCIÓN ]', group: 'Hero' },
  { key: 'urbanoAnnouncementText', label: 'Barra superior', placeholder: '[ VER COLECCIÓN ]', group: 'Header' },
  { key: 'urbanoCat1Text', label: 'Categoría 1', placeholder: 'Automática', group: 'Categorías', type: 'categorySelect' },
  { key: 'urbanoCat2Text', label: 'Categoría 2', placeholder: 'Automática', group: 'Categorías', type: 'categorySelect' },
  { key: 'urbanoCat3Text', label: 'Categoría 3', placeholder: 'Automática', group: 'Categorías', type: 'categorySelect' },
  { key: 'urbanoCat4Text', label: 'Categoría 4', placeholder: 'Automática', group: 'Categorías', type: 'categorySelect' },
  { key: 'urbanoMarqueeText', label: 'Marquesina central', placeholder: 'MODA URBANA / NUEVA COLECCIÓN...', group: 'Bloques' },
  { key: 'urbanoShopTheLookTitle', label: 'Título "Compra el look"', placeholder: 'COMPRA EL LOOK', group: 'Bloques' },
  { key: 'urbanoBottomBannerText', label: 'Marquesina inferior', placeholder: 'VISTE A TU MANERA.', group: 'Bloques' },
  { key: 'urbanoBottomBannerBtn', label: 'Botón banner inferior', placeholder: '[ VER COLECCIÓN ]', group: 'Bloques' },
  { key: 'urbanoFeatureLabel', label: 'Etiqueta producto macro', placeholder: 'CASACA', group: 'Bloques' },
  { key: 'urbanoSlogan', label: 'Slogan footer', placeholder: 'Moda urbana minimalista...', group: 'Footer' },
  { key: 'urbanoFooterTitle', label: 'Footer: título contacto', placeholder: 'Atención', group: 'Footer' },
  { key: 'urbanoFooterHelpText', label: 'Footer: texto contacto', placeholder: 'Compra desde la tienda oficial...', group: 'Footer' },
  { key: 'urbanoFooterPhone', label: 'Footer: WhatsApp', placeholder: '+51 999 999 999', group: 'Footer' },
  { key: 'urbanoFooterEmail', label: 'Footer: email', placeholder: 'contacto@tutienda.com', group: 'Footer' },
  { key: 'urbanoInstagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/tu-tienda', group: 'Redes' },
  { key: 'urbanoTiktokUrl', label: 'TikTok', placeholder: 'https://tiktok.com/@tu-tienda', group: 'Redes' },
  { key: 'urbanoFacebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/tu-tienda', group: 'Redes' },
  { key: 'urbanoTwitterUrl', label: 'X / Twitter', placeholder: 'https://x.com/tu-tienda', group: 'Redes' },
];

const MAYE_TEXT_FIELDS: TextFieldDef[] = [
  { key: 'mayeHeaderCategoryLabel', label: 'Botón categorías', placeholder: 'Categorías', group: 'Header' },
  { key: 'mayeSearchPlaceholder', label: 'Placeholder buscador', placeholder: 'Buscar producto...', group: 'Header' },
  { key: 'mayeQuickLink1', label: 'Acceso rápido 1', placeholder: 'Laptops y PCs', group: 'Header', type: 'categorySelect' },
  { key: 'mayeQuickLink2', label: 'Acceso rápido 2', placeholder: 'Procesadores y RAM', group: 'Header', type: 'categorySelect' },
  { key: 'mayeQuickLink3', label: 'Acceso rápido 3', placeholder: 'Almacenamiento', group: 'Header', type: 'categorySelect' },
  { key: 'mayeQuickLink4', label: 'Acceso rápido 4', placeholder: 'Tarjetas Gráficas', group: 'Header', type: 'categorySelect' },
  { key: 'mayeHeroEyebrow', label: 'Etiqueta hero', placeholder: 'Más vendidos de la semana', group: 'Hero' },
  { key: 'heroTitle', label: 'Título hero', placeholder: 'Laptops y PCs\\nAlta Gama', group: 'Hero' },
  { key: 'heroSubtitle', label: 'Subtítulo hero', placeholder: 'Equipos y accesorios de última generación...', group: 'Hero' },
  { key: 'mayeHeroButton', label: 'Botón hero', placeholder: 'Ver catálogo', group: 'Hero' },
  { key: 'mayeSideTopLabel', label: 'Lateral superior: etiqueta', placeholder: 'Procesadores y RAM', group: 'Hero lateral' },
  { key: 'mayeSideTopBadge', label: 'Lateral superior: badge', placeholder: 'Ej: Promo vigente', group: 'Hero lateral' },
  { key: 'mayeSideTopTitle', label: 'Lateral superior: título', placeholder: '¡Colecciones!', group: 'Hero lateral' },
  { key: 'mayeSideTopButton', label: 'Lateral superior: botón', placeholder: 'Ver Ahora', group: 'Hero lateral' },
  { key: 'mayeSideBottomBadge', label: 'Lateral inferior: badge', placeholder: 'Ej: Oferta activa', group: 'Hero lateral' },
  { key: 'mayeSideBottomTitle', label: 'Lateral inferior: título', placeholder: 'Periféricos RGB', group: 'Hero lateral' },
  { key: 'mayeSideBottomButton', label: 'Lateral inferior: botón', placeholder: 'Comprar Ahora', group: 'Hero lateral' },
  { key: 'mayeFinderTitle', label: 'Buscador: título', placeholder: 'Busca tu Equipo Ideal', group: 'Buscador tech' },
  { key: 'mayeFinderText', label: 'Buscador: texto', placeholder: 'Colección de más de 10,000+ productos tecnológicos', group: 'Buscador tech' },
  { key: 'mayeFeaturedCategoriesTitle', label: 'Título categorías', placeholder: 'Categorías Destacadas', group: 'Categorías' },
  { key: 'mayeFeaturedCategoriesText', label: 'Texto categorías', placeholder: 'Encuentra los mejores equipos tecnológicos...', group: 'Categorías' },
  { key: 'mayeCategory1Title', label: 'Categoría destacada 1', placeholder: 'Laptops y PCs', group: 'Categorías', type: 'categorySelect' },
  { key: 'mayeCategory2Title', label: 'Categoría destacada 2', placeholder: 'Componentes de PC', group: 'Categorías', type: 'categorySelect' },
  { key: 'mayeCategory3Title', label: 'Categoría destacada 3', placeholder: 'Periféricos', group: 'Categorías', type: 'categorySelect' },
  { key: 'mayePromoLeftLabel', label: 'Promo izquierda: etiqueta', placeholder: 'Colección destacada', group: 'Promos' },
  { key: 'mayePromoLeftTitle', label: 'Promo izquierda: título', placeholder: 'Colección de Componentes de PC', group: 'Promos' },
  { key: 'mayePromoLeftButton', label: 'Promo izquierda: botón', placeholder: 'Ver Ahora', group: 'Promos' },
  { key: 'mayePromoRightLabel', label: 'Promo derecha: etiqueta', placeholder: 'Mejores Marcas', group: 'Promos' },
  { key: 'mayePromoRightSubtitle', label: 'Promo derecha: subtítulo', placeholder: 'Luces y Faros', group: 'Promos' },
  { key: 'mayePromoRightTitle', label: 'Promo derecha: título', placeholder: 'Mega Oferta', group: 'Promos' },
  { key: 'mayePromoRightButton', label: 'Promo derecha: botón', placeholder: 'Comprar Ahora', group: 'Promos' },
  { key: 'mayeFeaturedProductsLabel', label: 'Etiqueta productos', placeholder: 'Producto Destacado', group: 'Productos' },
  { key: 'mayeFeaturedProductsTitle', label: 'Título productos', placeholder: 'Productos por Categoría', group: 'Productos' },
  { key: 'mayeTrendingProductsTitle', label: 'Título más buscados', placeholder: 'Productos Más Buscados', group: 'Productos' },
  { key: 'comunidadText', label: 'Comunidad: etiqueta', placeholder: 'Únete al Club', group: 'Comunidad' },
  { key: 'comunidadTitle', label: 'Comunidad: título', placeholder: 'Sé parte de nuestra\\nComunidad Tech', group: 'Comunidad' },
  { key: 'mayeCommunityButton', label: 'Comunidad: botón', placeholder: 'Unirse Ahora', group: 'Comunidad' },
  { key: 'mayeSupportLabel', label: 'Soporte: etiqueta', placeholder: 'Soporte al Cliente', group: 'Comunidad' },
  { key: 'mayeSupportTitle', label: 'Soporte: título', placeholder: 'Asistencia Experta 24h Soporte', group: 'Comunidad' },
  { key: 'mayeSupportButton', label: 'Soporte: botón', placeholder: 'Empezar', group: 'Comunidad' },
  { key: 'mayeDealsLabel', label: 'Ofertas: etiqueta', placeholder: 'Mejores Ofertas', group: 'Ofertas' },
  { key: 'mayeDealsTitle', label: 'Ofertas: título', placeholder: 'Ofertas de la Semana', group: 'Ofertas' },
  { key: 'mayeBrandsFlashLabel', label: 'Marcas: promo', placeholder: 'Selección destacada', group: 'Marcas' },
  { key: 'mayeBrandsFlashTitle', label: 'Marcas: banner', placeholder: 'Accesorios\\npara Reparación\\nde Equipos', group: 'Marcas' },
  { key: 'mayeBrandsLabel', label: 'Marcas: etiqueta', placeholder: 'Nuestras Marcas', group: 'Marcas' },
  { key: 'mayeBrandsTitle', label: 'Marcas: título', placeholder: 'Comprar por Marcas', group: 'Marcas' },
  { key: 'mayeTopSellingLabel', label: 'Top ventas: etiqueta', placeholder: 'Top Ventas', group: 'Top ventas' },
  { key: 'mayeTopSellingTitle', label: 'Top ventas: título', placeholder: 'Productos Más Vendidos', group: 'Top ventas' },
  { key: 'mayeTopSellingText', label: 'Top ventas: texto', placeholder: 'Explora nuestros productos más populares...', group: 'Top ventas' },
  { key: 'tiktokLiveUrl', label: 'Producto: TikTok', placeholder: 'https://www.tiktok.com/@tu-tienda', group: 'Accesos de producto' },
  { key: 'googleReviewsUrl', label: 'Producto: opiniones Google', placeholder: 'https://g.page/r/tu-negocio/review', group: 'Accesos de producto' },
  { key: 'shalomUrl', label: 'Producto: agencias Shalom', placeholder: 'https://www.shalom.pe/agencias', group: 'Accesos de producto' },
  { key: 'ubicacionUrl', label: 'Producto: URL local de recojo', placeholder: 'https://maps.google.com/?q=...', group: 'Accesos de producto' },
  { key: 'ubicacionDireccion', label: 'Producto: dirección local de recojo', placeholder: 'Av. Principal 123, Lima', group: 'Accesos de producto' },
  { key: 'mayeFooterHelpTitle', label: 'Footer: título', placeholder: 'Información de Ayuda', group: 'Footer' },
  { key: 'mayeFooterHelpText', label: 'Footer: texto', placeholder: 'Muestra de manera destacada...', group: 'Footer' },
  { key: 'mayeFooterPhone', label: 'Footer: teléfono', placeholder: '+51 999 999 999', group: 'Footer' },
  { key: 'mayeFooterEmail', label: 'Footer: email', placeholder: 'contacto@tutienda.com', group: 'Footer' },
  { key: 'mayeFooterFeature1Title', label: 'Footer beneficio 1', placeholder: 'Despacho coordinado', group: 'Footer beneficios' },
  { key: 'mayeFooterFeature1Text', label: 'Footer beneficio 1 texto', placeholder: 'Envios o recojo segun tu tienda', group: 'Footer beneficios' },
  { key: 'mayeFooterFeature2Title', label: 'Footer beneficio 2', placeholder: 'Pagos confiables', group: 'Footer beneficios' },
  { key: 'mayeFooterFeature2Text', label: 'Footer beneficio 2 texto', placeholder: 'Medios de pago configurados', group: 'Footer beneficios' },
  { key: 'mayeFooterFeature3Title', label: 'Footer beneficio 3', placeholder: 'Atención postventa', group: 'Footer beneficios' },
  { key: 'mayeFooterFeature3Text', label: 'Footer beneficio 3 texto', placeholder: 'Cambios y garantia segun politica de tienda', group: 'Footer beneficios' },
  { key: 'mayeFooterFeature4Title', label: 'Footer beneficio 4', placeholder: 'Soporte de compra', group: 'Footer beneficios' },
  { key: 'mayeFooterFeature4Text', label: 'Footer beneficio 4 texto', placeholder: 'Contacto antes y despues del pedido', group: 'Footer beneficios' },
];

const TECNOLOGIA_TEXT_FIELDS: TextFieldDef[] = [
  { key: 'tecnologiaHeroLabel', label: 'Etiqueta hero', placeholder: 'Nuevos productos disponibles', group: 'Hero' },
  { key: 'tecnologiaHeroTitle', label: 'Título hero', placeholder: 'Obtén Los Mejores\\nDispositivos\\nAl Mejor Precio.', group: 'Hero' },
  { key: 'tecnologiaHeroSubtitle', label: 'Subtítulo hero', placeholder: 'Laptops, celulares, accesorios y gaming al mejor precio...', group: 'Hero' },
  { key: 'tecnologiaHeroButton', label: 'Botón principal', placeholder: 'Explorar Ahora', group: 'Hero' },
  { key: 'tecnologiaHeroPromoButton', label: 'Botón secundario', placeholder: 'Ver Promoción', group: 'Hero' },
  { key: 'tecnologiaPopularTitle', label: 'Título productos populares', placeholder: 'Productos Populares', group: 'Productos' },
  { key: 'tecnologiaPopularText', label: 'Texto productos populares', placeholder: '8 productos', group: 'Productos' },
  { key: 'tecnologiaSuggestedTitle', label: 'Título productos sugeridos', placeholder: 'Productos que te podrían interesar', group: 'Productos' },
  { key: 'tecnologiaSuggestedText', label: 'Texto productos sugeridos', placeholder: 'Productos recomendados para ti', group: 'Productos' },
  { key: 'tecnologiaFooterText', label: 'Footer: descripción', placeholder: 'Equipos, componentes y accesorios tecnológicos...', group: 'Footer' },
  { key: 'tecnologiaFooterPhone', label: 'Footer: teléfono', placeholder: '+51 999 999 999', group: 'Footer' },
  { key: 'tecnologiaFooterEmail', label: 'Footer: email', placeholder: 'contacto@tutienda.com', group: 'Footer' },
  { key: 'tecnologiaInstagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/tu-tienda', group: 'Redes' },
  { key: 'tecnologiaFacebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/tu-tienda', group: 'Redes' },
  { key: 'tecnologiaTiktokUrl', label: 'TikTok', placeholder: 'https://tiktok.com/@tu-tienda', group: 'Redes' },
  { key: 'tecnologiaTwitterUrl', label: 'X / Twitter', placeholder: 'https://x.com/tu-tienda', group: 'Redes' },
];

const FALCON_TEXT_FIELDS: TextFieldDef[] = [
  { key: 'falconSaleNote', label: 'Barra de oferta', placeholder: 'Oferta: S/ 20 de descuento en tu primera compra.', group: 'Header' },
  { key: 'falconCategoriesLabel', label: 'Botón categorías', placeholder: 'Todas las categorías', group: 'Header' },
  { key: 'falconSearchPlaceholder', label: 'Placeholder buscador', placeholder: 'Buscar productos...', group: 'Header' },
  { key: 'falconSearchButton', label: 'Botón buscador', placeholder: 'Buscar', group: 'Header' },
  { key: 'falconExploreLabel', label: 'Explorar categorías', placeholder: 'Explorar categorías', group: 'Header' },
  { key: 'falconNavHome', label: 'Menú: inicio', placeholder: 'Inicio', group: 'Header' },
  { key: 'falconNavProducts', label: 'Menú: productos', placeholder: 'Productos', group: 'Header' },
  { key: 'falconNavBlog', label: 'Menú: blog', placeholder: 'Blog', group: 'Header' },
  { key: 'falconNavOffers', label: 'Menú: ofertas', placeholder: 'Ofertas', group: 'Header' },
  { key: 'falconNavStore', label: 'Menú: tienda', placeholder: 'Tienda', group: 'Header' },
  { key: 'falconNavContact', label: 'Menú: contacto', placeholder: 'Contacto', group: 'Header' },
  { key: 'falconCartLabel', label: 'Texto carrito', placeholder: 'Mi carrito', group: 'Header' },
  { key: 'falconHeroEyebrow', label: 'Hero: etiqueta', placeholder: 'Nuevos ingresos', group: 'Hero' },
  { key: 'falconHeroHighlight', label: 'Hero: texto destacado', placeholder: '4K', group: 'Hero' },
  { key: 'falconHeroTitleTop', label: 'Hero: título superior', placeholder: 'LCD', group: 'Hero' },
  { key: 'falconHeroTitle', label: 'Hero: título', placeholder: 'Quantum Vision LCD', group: 'Hero' },
  { key: 'falconHeroSubtitle', label: 'Hero: subtítulo', placeholder: 'Tiempo limitado: solo en línea.', group: 'Hero' },
  { key: 'falconHeroButton', label: 'Hero: botón', placeholder: 'Comprar ahora', group: 'Hero' },
  { key: 'falconSideOneEyebrow', label: 'Lateral 1: etiqueta', placeholder: 'Móviles', group: 'Hero lateral' },
  { key: 'falconSideOneTitle', label: 'Lateral 1: título', placeholder: 'Nexus Mobile Pro 256GB', group: 'Hero lateral' },
  { key: 'falconSideTwoEyebrow', label: 'Lateral 2: etiqueta', placeholder: 'iPad Mini', group: 'Hero lateral' },
  { key: 'falconSideTwoTitle', label: 'Lateral 2: título', placeholder: '10 Inch iPad Mini Pro', group: 'Hero lateral' },
  { key: 'falconSideNote', label: 'Laterales: nota', placeholder: 'Tiempo limitado: solo en línea.', group: 'Hero lateral' },
  { key: 'falconSpecialEyebrow', label: 'Oferta especial: etiqueta', placeholder: 'Oferta especial', group: 'Productos' },
  { key: 'falconSpecialTitle', label: 'Oferta especial: título', placeholder: 'Aero Control Pro', group: 'Productos' },
  { key: 'falconFeatureTitle', label: 'Título destacados', placeholder: 'Productos destacados', group: 'Productos' },
  { key: 'falconPopularTitle', label: 'Título populares', placeholder: 'Productos populares', group: 'Productos' },
  { key: 'falconRecommendedTitle', label: 'Título recomendados', placeholder: 'Productos recomendados', group: 'Productos' },
  { key: 'falconProductAddLabel', label: 'Producto: agregar', placeholder: 'Agregar al carrito', group: 'Producto' },
  { key: 'falconProductBuyLabel', label: 'Producto: comprar', placeholder: 'Comprar ahora', group: 'Producto' },
  { key: 'falconBannerTitle', label: 'Banner promo: título', placeholder: '¡Grandes ahorros te esperan!', group: 'Banners' },
  { key: 'falconBannerHighlight', label: 'Banner promo: destacado', placeholder: 'Compra ya', group: 'Banners' },
  { key: 'falconBannerSubtitle', label: 'Banner promo: subtítulo', placeholder: 'ofertas imperdibles', group: 'Banners' },
  { key: 'falconBannerButton', label: 'Banner promo: botón', placeholder: 'Comprar ahora', group: 'Banners' },
  { key: 'falconCountdownIntro', label: 'Cuenta regresiva: destacado', placeholder: '¡Apúrate!', group: 'Banners' },
  { key: 'falconCountdownTitle', label: 'Cuenta regresiva: título', placeholder: 'La oferta termina en', group: 'Banners' },
  { key: 'falconCountdownButton', label: 'Cuenta regresiva: botón', placeholder: 'Comprar ahora', group: 'Banners' },
  { key: 'falconOfferEnd', label: 'Cuenta regresiva: fecha fin', placeholder: '', group: 'Banners', type: 'date' },
  { key: 'falconCountdownDaysLabel', label: 'Cuenta regresiva: etiqueta días', placeholder: 'Días', group: 'Banners' },
  { key: 'falconCountdownHoursLabel', label: 'Cuenta regresiva: etiqueta horas', placeholder: 'Hrs', group: 'Banners' },
  { key: 'falconCountdownMinutesLabel', label: 'Cuenta regresiva: etiqueta minutos', placeholder: 'Min', group: 'Banners' },
  { key: 'falconCountdownSecondsLabel', label: 'Cuenta regresiva: etiqueta segundos', placeholder: 'Seg', group: 'Banners' },
  { key: 'falconBrands', label: 'Marcas (separadas por coma)', placeholder: 'Infinix, OPPO, VIVO, SAMSUNG, ONEPLUS', group: 'Marcas' },
  { key: 'falconBlogTitle', label: 'Home blog: título', placeholder: 'Últimos artículos', group: 'Blog' },
  { key: 'falconBlogReadMoreLabel', label: 'Blog: leer más', placeholder: 'Leer más', group: 'Blog' },
  { key: 'falconBlogViewAllLabel', label: 'Blog: ver todo', placeholder: 'Ver todo', group: 'Blog' },
  { key: 'falconBlogSearchPlaceholder', label: 'Blog: buscador', placeholder: 'Buscar aquí', group: 'Blog' },
  { key: 'falconBlogCategoriesTitle', label: 'Blog: categorías', placeholder: 'Categorías del blog', group: 'Blog' },
  { key: 'falconBlogRecentTitle', label: 'Blog: recientes', placeholder: 'Publicaciones recientes', group: 'Blog' },
  { key: 'falconBlogTagsTitle', label: 'Blog: etiquetas', placeholder: 'Etiquetas', group: 'Blog' },
  { key: 'falconBlogRelatedTitle', label: 'Blog: relacionados', placeholder: 'Blogs relacionados', group: 'Blog' },
  { key: 'falconBlogCommentTitle', label: 'Blog: comentario título', placeholder: 'Deja un comentario', group: 'Blog' },
  { key: 'falconBlogCommentButton', label: 'Blog: comentario botón', placeholder: 'Enviar comentario', group: 'Blog' },
  { key: 'falconCatalogTitle', label: 'Catálogo: título', placeholder: 'Productos', group: 'Catálogo' },
  { key: 'falconCatalogSearchPlaceholder', label: 'Catálogo: buscar', placeholder: 'Buscar aquí', group: 'Catálogo' },
  { key: 'falconCatalogCategoriesTitle', label: 'Catálogo: categorías', placeholder: 'Categorías de producto', group: 'Catálogo' },
  { key: 'falconCatalogAvailabilityTitle', label: 'Catálogo: disponibilidad', placeholder: 'Disponibilidad', group: 'Catálogo' },
  { key: 'falconCatalogPriceTitle', label: 'Catálogo: precio', placeholder: 'Precio', group: 'Catálogo' },
  { key: 'falconCatalogTypeTitle', label: 'Catálogo: tipo', placeholder: 'Tipo de producto', group: 'Catálogo' },
  { key: 'falconCatalogSortLabel', label: 'Catálogo: orden', placeholder: 'Ordenar por:', group: 'Catálogo' },
  { key: 'falconCatalogEmptyText', label: 'Catálogo: vacío', placeholder: 'No se encontraron productos.', group: 'Catálogo' },
  { key: 'falconCartTitle', label: 'Carrito: título', placeholder: 'Carrito de compras', group: 'Carrito' },
  { key: 'falconCartEmptyText', label: 'Carrito: vacío', placeholder: 'Tu carrito está vacío', group: 'Carrito' },
  { key: 'falconCartViewLabel', label: 'Carrito: ver carrito', placeholder: 'Ver carrito', group: 'Carrito' },
  { key: 'falconCartCheckoutLabel', label: 'Carrito: finalizar', placeholder: 'Finalizar compra', group: 'Carrito' },
  { key: 'falconCartQuoteLabel', label: 'Carrito: cotizar', placeholder: 'Cotizar por WhatsApp', group: 'Carrito' },
  { key: 'falconCartFreeText', label: 'Carrito: envío gratis', placeholder: '¡Felicidades! Tienes envío gratis', group: 'Carrito' },
  { key: 'falconCheckoutTitle', label: 'Checkout: título', placeholder: 'Finalizar compra', group: 'Checkout' },
  { key: 'falconCheckoutDeliveryTitle', label: 'Checkout: entrega', placeholder: 'Método de entrega', group: 'Checkout' },
  { key: 'falconCheckoutCustomerTitle', label: 'Checkout: cliente', placeholder: 'Datos del cliente', group: 'Checkout' },
  { key: 'falconCheckoutPaymentTitle', label: 'Checkout: pago', placeholder: 'Método de pago', group: 'Checkout' },
  { key: 'falconCheckoutNotesTitle', label: 'Checkout: notas', placeholder: 'Indicaciones (opcional)', group: 'Checkout' },
  { key: 'falconCheckoutSummaryTitle', label: 'Checkout: resumen', placeholder: 'Resumen del pedido', group: 'Checkout' },
  { key: 'falconCheckoutConfirmLabel', label: 'Checkout: confirmar', placeholder: 'Confirmar pedido', group: 'Checkout' },
  { key: 'falconBenefit1Title', label: 'Beneficio 1: título', placeholder: 'Devoluciones fáciles', group: 'Beneficios' },
  { key: 'falconBenefit1Text', label: 'Beneficio 1: texto', placeholder: 'De vendedores seleccionados', group: 'Beneficios' },
  { key: 'falconBenefit2Title', label: 'Beneficio 2: título', placeholder: 'Envío rápido', group: 'Beneficios' },
  { key: 'falconBenefit2Text', label: 'Beneficio 2: texto', placeholder: 'Entrega en 24 horas máx.', group: 'Beneficios' },
  { key: 'falconBenefit3Title', label: 'Beneficio 3: título', placeholder: 'Pago seguro', group: 'Beneficios' },
  { key: 'falconBenefit3Text', label: 'Beneficio 3: texto', placeholder: 'Pagos 100% protegidos', group: 'Beneficios' },
  { key: 'falconFooterAbout', label: 'Footer: descripción', placeholder: 'Tecnología y gadgets de última generación...', group: 'Footer' },
  { key: 'falconFooterAddress', label: 'Footer: dirección', placeholder: 'Av. Principal 123, Lima, Perú', group: 'Footer' },
  { key: 'falconFooterFastTitle', label: 'Footer: categorías', placeholder: 'Encuéntralo rápido', group: 'Footer' },
  { key: 'falconFooterLinksTitle', label: 'Footer: enlaces', placeholder: 'Enlaces', group: 'Footer' },
  { key: 'falconFooterSupportTitle', label: 'Footer: atención', placeholder: 'Atención al cliente', group: 'Footer' },
  { key: 'falconFooterContactButton', label: 'Footer: botón contacto', placeholder: 'Contáctanos', group: 'Footer' },
  { key: 'falconFooterCopyright', label: 'Footer: copyright', placeholder: 'Todos los derechos reservados.', group: 'Footer' },
  { key: 'falconContactTitle', label: 'Contacto: título', placeholder: 'Contáctanos', group: 'Contacto' },
  { key: 'falconContactFormTitle', label: 'Contacto: título formulario', placeholder: 'Ponte en contacto con nosotros', group: 'Contacto' },
  { key: 'falconContactFormText', label: 'Contacto: texto formulario', placeholder: 'Completa el formulario y nuestro equipo te responderá lo antes posible.', group: 'Contacto' },
  { key: 'falconContactNamePlaceholder', label: 'Contacto: campo nombre', placeholder: 'Tu nombre *', group: 'Contacto' },
  { key: 'falconContactEmailPlaceholder', label: 'Contacto: campo correo', placeholder: 'Tu correo *', group: 'Contacto' },
  { key: 'falconContactPhonePlaceholder', label: 'Contacto: campo teléfono', placeholder: 'Tu teléfono', group: 'Contacto' },
  { key: 'falconContactMessagePlaceholder', label: 'Contacto: campo mensaje', placeholder: 'Tu mensaje', group: 'Contacto' },
  { key: 'falconContactSubmitLabel', label: 'Contacto: botón enviar', placeholder: 'Enviar mensaje', group: 'Contacto' },
  { key: 'falconContactSuccessText', label: 'Contacto: mensaje enviado', placeholder: '¡Gracias! Tu mensaje ha sido registrado.', group: 'Contacto' },
  { key: 'falconContactAddress', label: 'Contacto: dirección', placeholder: 'Av. Principal 123, Lima, Perú', group: 'Contacto' },
  { key: 'falconContactPhone', label: 'Contacto: teléfono', placeholder: '+51 999 999 999', group: 'Contacto' },
  { key: 'falconContactEmail', label: 'Contacto: correo', placeholder: 'contacto@tutienda.com', group: 'Contacto' },
  { key: 'falconContactHours', label: 'Contacto: horario', placeholder: 'Lun a Sáb: 9:00 a.m. – 7:00 p.m.', group: 'Contacto' },
  { key: 'falconContactAddressTitle', label: 'Contacto: título dirección', placeholder: 'Dirección', group: 'Contacto' },
  { key: 'falconContactPhoneTitle', label: 'Contacto: título teléfono', placeholder: 'Teléfono', group: 'Contacto' },
  { key: 'falconContactEmailTitle', label: 'Contacto: título correo', placeholder: 'Correo', group: 'Contacto' },
  { key: 'falconContactHoursTitle', label: 'Contacto: título horario', placeholder: 'Horario', group: 'Contacto' },
];

const CONSTRUCCION_TEXT_FIELDS: TextFieldDef[] = [
  { key: 'construccionLogoSubtitle', label: 'Subtítulo del logo', placeholder: 'Herramientas y accesorios', group: 'Header' },
  { key: 'construccionHeaderCategoryLabel', label: 'Botón categorías', placeholder: 'Comprar por categorías', group: 'Header' },
  { key: 'construccionSearchPlaceholder', label: 'Placeholder buscador', placeholder: 'Buscar...', group: 'Header' },
  { key: 'construccionCallLabel', label: 'Texto teléfono', placeholder: 'Llámanos:', group: 'Header' },
  { key: 'construccionNavHome', label: 'Menú: inicio', placeholder: 'Inicio', group: 'Header' },
  { key: 'construccionNavStore', label: 'Menú: tienda', placeholder: 'Tienda', group: 'Header' },
  { key: 'construccionNavCategories', label: 'Menú: categorías', placeholder: 'Categorías', group: 'Header' },
  { key: 'construccionNavProducts', label: 'Menú: productos', placeholder: 'Productos', group: 'Header' },
  { key: 'construccionNavOffers', label: 'Menú: ofertas', placeholder: 'Ofertas destacadas', group: 'Header' },
  { key: 'construccionNavCatalog', label: 'Menú: catálogo', placeholder: 'Catálogo', group: 'Header' },
  { key: 'construccionCartLabel', label: 'Texto carrito', placeholder: 'Mi carrito', group: 'Header' },
  { key: 'construccionHeroEyebrow', label: 'Hero: etiqueta', placeholder: 'Mejores descuentos de hasta 15%', group: 'Hero' },
  { key: 'construccionHeroTitle', label: 'Hero: título', placeholder: 'Herramientas de alto rendimiento', group: 'Hero' },
  { key: 'construccionHeroSubtitle', label: 'Hero: subtítulo', placeholder: 'Aprovecha hasta 15% de descuento', group: 'Hero' },
  { key: 'construccionHeroButton', label: 'Hero: botón', placeholder: 'Comprar ahora', group: 'Hero' },
  { key: 'construccionBenefitOneTitle', label: 'Beneficio 1: título', placeholder: 'Compra y devolución fáciles', group: 'Beneficios' },
  { key: 'construccionBenefitOneText', label: 'Beneficio 1: texto', placeholder: 'Compra y gestiona devoluciones sin fricción', group: 'Beneficios' },
  { key: 'construccionBenefitTwoTitle', label: 'Beneficio 2: título', placeholder: 'Pagos seguros', group: 'Beneficios' },
  { key: 'construccionBenefitTwoText', label: 'Beneficio 2: texto', placeholder: 'Seguridad al 100% en tus pagos', group: 'Beneficios' },
  { key: 'construccionBenefitThreeTitle', label: 'Beneficio 3: título', placeholder: 'Soporte disponible 24/7', group: 'Beneficios' },
  { key: 'construccionBenefitThreeText', label: 'Beneficio 3: texto', placeholder: 'Atención todos los días', group: 'Beneficios' },
  { key: 'construccionBenefitFourTitle', label: 'Beneficio 4: título', placeholder: 'Compra desde la app', group: 'Beneficios' },
  { key: 'construccionBenefitFourText', label: 'Beneficio 4: texto', placeholder: 'Descarga la app y recibe ofertas', group: 'Beneficios' },
  { key: 'construccionPromoOneBadge', label: 'Promo 1: badge', placeholder: 'Oferta', group: 'Promos' },
  { key: 'construccionPromoOneEyebrow', label: 'Promo 1: etiqueta', placeholder: 'Descubre herramientas', group: 'Promos' },
  { key: 'construccionPromoOneTitle', label: 'Promo 1: título', placeholder: 'Batería de litio', group: 'Promos' },
  { key: 'construccionPromoTwoEyebrow', label: 'Promo 2: etiqueta', placeholder: '15% de descuento', group: 'Promos' },
  { key: 'construccionPromoTwoTitle', label: 'Promo 2: título', placeholder: 'Herramientas eléctricas', group: 'Promos' },
  { key: 'construccionPromoThreeEyebrow', label: 'Promo 3: etiqueta', placeholder: '15% de descuento', group: 'Promos' },
  { key: 'construccionPromoThreeTitle', label: 'Promo 3: título', placeholder: 'Pack de maquinaria', group: 'Promos' },
  { key: 'construccionPromoButton', label: 'Promos: botón', placeholder: 'Comprar ahora', group: 'Promos' },
  { key: 'construccionTrendingTitle', label: 'Título productos tendencia', placeholder: 'Productos en tendencia', group: 'Productos' },
  { key: 'construccionTopCategoriesTitle', label: 'Título categorías destacadas', placeholder: 'Categorías destacadas', group: 'Productos' },
  { key: 'construccionSpecialProductsTitle', label: 'Título productos especiales', placeholder: 'Productos especiales', group: 'Productos' },
  { key: 'construccionCatalogTitle', label: 'Catálogo: título', placeholder: 'Nuestra tienda', group: 'Catálogo' },
  { key: 'construccionCatalogShowingLabel', label: 'Catálogo: resultados', placeholder: 'Mostrando', group: 'Catálogo' },
  { key: 'construccionCatalogSortLabel', label: 'Catálogo: orden', placeholder: 'Orden predeterminado', group: 'Catálogo' },
  { key: 'construccionCatalogFilterButton', label: 'Catálogo: botón filtros', placeholder: 'Filtros', group: 'Catálogo' },
  { key: 'construccionCatalogEmptyTitle', label: 'Catálogo: vacío título', placeholder: 'Sin productos', group: 'Catálogo' },
  { key: 'construccionCatalogEmptyText', label: 'Catálogo: vacío texto', placeholder: 'Prueba limpiando los filtros o cambiando la búsqueda.', group: 'Catálogo' },
  { key: 'construccionFilterCategoriesTitle', label: 'Filtros: categorías', placeholder: 'Comprar por categorías', group: 'Catálogo' },
  { key: 'construccionFilterHighlightsTitle', label: 'Filtros: destacados', placeholder: 'Destacados', group: 'Catálogo' },
  { key: 'construccionFilterPriceTitle', label: 'Filtros: precio', placeholder: 'Filtrar por precio', group: 'Catálogo' },
  { key: 'construccionWideBannerEyebrow', label: 'Banner ancho: etiqueta', placeholder: 'Oferta limitada en herramientas eléctricas', group: 'Banners' },
  { key: 'construccionWideBannerTitle', label: 'Banner ancho: título', placeholder: 'Obtén S/ 10 extra en herramientas eléctricas', group: 'Banners' },
  { key: 'construccionHalfBannerOneTitle', label: 'Banner inferior 1: título', placeholder: '10% de descuento en herramientas eléctricas', group: 'Banners' },
  { key: 'construccionHalfBannerTwoTitle', label: 'Banner inferior 2: título', placeholder: 'Obtén S/ 10 extra en sierras', group: 'Banners' },
  { key: 'construccionBannerButton', label: 'Banners: botón', placeholder: 'Comprar ahora', group: 'Banners' },
  { key: 'construccionBrandsTitle', label: 'Footer: título marcas', placeholder: 'Marcas', group: 'Footer' },
  { key: 'construccionNewsletterTitle', label: 'Newsletter: título', placeholder: 'Suscríbete a novedades', group: 'Footer' },
  { key: 'construccionNewsletterPlaceholder', label: 'Newsletter: placeholder', placeholder: 'Tu correo electrónico', group: 'Footer' },
  { key: 'construccionNewsletterButton', label: 'Newsletter: botón', placeholder: 'Suscribirme', group: 'Footer' },
  { key: 'construccionFooterInfoTitle', label: 'Footer: información', placeholder: 'Información', group: 'Footer' },
  { key: 'construccionFooterPoliciesTitle', label: 'Footer: políticas', placeholder: 'Políticas', group: 'Footer' },
  { key: 'construccionFooterHelpTitle', label: 'Footer: ayuda', placeholder: 'Ayuda', group: 'Footer' },
  { key: 'construccionFooterPaymentsText', label: 'Footer: medios de pago', placeholder: 'Visa · Mastercard · Yape · Plin', group: 'Footer' },
  { key: 'construccionCartEyebrow', label: 'Carrito: etiqueta', placeholder: 'Carrito de compra', group: 'Carrito' },
  { key: 'construccionCartTitle', label: 'Carrito: título', placeholder: 'Mi carrito', group: 'Carrito' },
  { key: 'construccionCartEmptyTitle', label: 'Carrito vacío: título', placeholder: 'Tu carrito está vacío', group: 'Carrito' },
  { key: 'construccionCartEmptyText', label: 'Carrito vacío: texto', placeholder: 'Agrega herramientas, materiales o accesorios para continuar con tu pedido.', group: 'Carrito' },
  { key: 'construccionCartContinueLabel', label: 'Carrito: seguir comprando', placeholder: 'Seguir comprando', group: 'Carrito' },
  { key: 'construccionCartShippingNote', label: 'Carrito: nota envío', placeholder: 'El costo de envío se calcula o coordina en el checkout según la configuración de la tienda.', group: 'Carrito' },
  { key: 'construccionCartCheckoutLabel', label: 'Carrito: ir a pagar', placeholder: 'Ir a pagar', group: 'Carrito' },
  { key: 'construccionCartWhatsappLabel', label: 'Carrito: WhatsApp', placeholder: 'Cotizar por WhatsApp', group: 'Carrito' },
  { key: 'construccionContactTitle', label: 'Contacto: título', placeholder: 'Ponte en contacto con nosotros', group: 'Contacto' },
  { key: 'construccionContactText', label: 'Contacto: texto', placeholder: 'Completa el formulario y te responderemos lo antes posible.', group: 'Contacto' },
  { key: 'construccionContactAddress', label: 'Contacto: dirección', placeholder: 'Av. Principal 123', group: 'Contacto' },
  { key: 'construccionContactPhone', label: 'Contacto: teléfono', placeholder: '+51 999 999 999', group: 'Contacto' },
  { key: 'construccionContactEmail', label: 'Contacto: email', placeholder: 'contacto@tutienda.com', group: 'Contacto' },
  { key: 'construccionContactHours', label: 'Contacto: horario', placeholder: 'Lun - Sáb 9:00 AM - 6:00 PM', group: 'Contacto' },
  { key: 'construccionContactSubmitLabel', label: 'Contacto: botón', placeholder: 'Enviar', group: 'Contacto' },
  { key: 'construccionCheckoutSecureText', label: 'Checkout: barra segura', placeholder: 'Compra segura y pedido directo a tienda', group: 'Checkout' },
  { key: 'construccionCheckoutContinueLabel', label: 'Checkout: seguir comprando', placeholder: 'Seguir comprando', group: 'Checkout' },
  { key: 'construccionCheckoutProductsTitle', label: 'Checkout: productos', placeholder: 'Productos del pedido', group: 'Checkout' },
  { key: 'construccionCheckoutDeliveryTitle', label: 'Checkout: entrega', placeholder: 'Método de entrega', group: 'Checkout' },
  { key: 'construccionCheckoutCustomerTitle', label: 'Checkout: cliente', placeholder: 'Datos del cliente', group: 'Checkout' },
  { key: 'construccionCheckoutPaymentTitle', label: 'Checkout: pago', placeholder: 'Método de pago', group: 'Checkout' },
  { key: 'construccionCheckoutNoteTitle', label: 'Checkout: nota', placeholder: 'Nota del pedido', group: 'Checkout' },
  { key: 'construccionCheckoutSummaryTitle', label: 'Checkout: resumen', placeholder: 'Pedido', group: 'Checkout' },
  { key: 'construccionCheckoutConfirmLabel', label: 'Checkout: confirmar', placeholder: 'Confirmar pedido', group: 'Checkout' },
  { key: 'construccionProductTrustOne', label: 'Detalle: confianza 1', placeholder: '100% original', group: 'Detalle producto' },
  { key: 'construccionProductTrustTwo', label: 'Detalle: confianza 2', placeholder: 'Mejor precio', group: 'Detalle producto' },
  { key: 'construccionProductTrustThree', label: 'Detalle: confianza 3', placeholder: 'Envío gratis', group: 'Detalle producto' },
  { key: 'construccionProductFastSellingText', label: 'Detalle: urgencia', placeholder: 'Se está vendiendo rápido', group: 'Detalle producto' },
  { key: 'construccionProductAddLabel', label: 'Detalle: agregar', placeholder: 'Agregar al carrito', group: 'Detalle producto' },
  { key: 'construccionProductBuyLabel', label: 'Detalle: comprar', placeholder: 'Comprar ahora', group: 'Detalle producto' },
  { key: 'construccionProductSecureTitle', label: 'Detalle: pago seguro', placeholder: 'Pago seguro garantizado', group: 'Detalle producto' },
  { key: 'construccionProductSecureMethods', label: 'Detalle: medios pago', placeholder: 'VISA · Mastercard · Yape · Plin', group: 'Detalle producto' },
  { key: 'construccionRelatedTitle', label: 'Detalle: relacionados', placeholder: 'Productos relacionados', group: 'Detalle producto' },
];

const APICULTURA_TEXT_FIELDS: TextFieldDef[] = [
  { key: 'apiculturaLogoText', label: 'Nombre logo', placeholder: 'Miel Dorada', group: 'Header' },
  { key: 'apiculturaSearchPlaceholder', label: 'Placeholder buscador', placeholder: 'Buscar miel, propóleo...', group: 'Header' },
  { key: 'apiculturaHeroEyebrow', label: 'Hero: texto cursivo', placeholder: 'Sabor natural de colmena', group: 'Hero' },
  { key: 'apiculturaHeroTitle', label: 'Hero: título', placeholder: 'Miel pura para cada día', group: 'Hero' },
  { key: 'apiculturaHeroVideoUrl', label: 'Hero: video URL', placeholder: '/assets/templates/apicultura/video/video.mp4', group: 'Hero' },
  { key: 'apiculturaHeroButton', label: 'Hero: botón', placeholder: 'Ver catálogo', group: 'Hero' },
  { key: 'apiculturaFeaturesEyebrow', label: 'Features: etiqueta', placeholder: 'Best Feature', group: 'Features' },
  { key: 'apiculturaFeaturesTitle', label: 'Features: título', placeholder: 'We Provide The Best Quality', group: 'Features' },
  { key: 'apiculturaLatestEyebrow', label: 'Últimos: etiqueta', placeholder: 'New Arrivals', group: 'Productos' },
  { key: 'apiculturaLatestTitle', label: 'Últimos: título', placeholder: 'Latest Products', group: 'Productos' },
  { key: 'apiculturaWhyEyebrow', label: 'Why choose: etiqueta', placeholder: 'Why Choose Us', group: 'Why choose' },
  { key: 'apiculturaWhyTitle', label: 'Why choose: título', placeholder: 'Why Choose Our Products', group: 'Why choose' },
  { key: 'apiculturaWhyOneTitle', label: 'Beneficio 1: título', placeholder: 'Honey Production', group: 'Why choose' },
  { key: 'apiculturaWhyOneText', label: 'Beneficio 1: texto', placeholder: 'Procesos cuidados...', group: 'Why choose' },
  { key: 'apiculturaWhyTwoTitle', label: 'Beneficio 2: título', placeholder: 'Naturally Sweet', group: 'Why choose' },
  { key: 'apiculturaWhyTwoText', label: 'Beneficio 2: texto', placeholder: 'Ingredientes naturales...', group: 'Why choose' },
  { key: 'apiculturaWhyThreeTitle', label: 'Beneficio 3: título', placeholder: 'Despacho confiable', group: 'Why choose' },
  { key: 'apiculturaWhyThreeText', label: 'Beneficio 3: texto', placeholder: 'Entrega o recojo...', group: 'Why choose' },
  { key: 'apiculturaWhyFourTitle', label: 'Beneficio 4: título', placeholder: '100% Natural', group: 'Why choose' },
  { key: 'apiculturaWhyFourText', label: 'Beneficio 4: texto', placeholder: 'Comunicación transparente...', group: 'Why choose' },
  { key: 'apiculturaAboutEyebrow', label: 'About: etiqueta', placeholder: 'About Us', group: 'About' },
  { key: 'apiculturaAboutTitle', label: 'About: título', placeholder: 'Natural honey for your daily routine', group: 'About' },
  { key: 'apiculturaAboutText', label: 'About: texto', placeholder: 'Presenta tu marca...', group: 'About' },
  { key: 'apiculturaAboutButton', label: 'About: botón', placeholder: 'Comprar ahora', group: 'About' },
  { key: 'apiculturaFeaturedEyebrow', label: 'Destacados: etiqueta', placeholder: 'Popular Products', group: 'Productos' },
  { key: 'apiculturaFeaturedTitle', label: 'Destacados: título', placeholder: 'Featured Products', group: 'Productos' },
  { key: 'apiculturaContactTitle', label: 'Contacto: título', placeholder: 'Get In Touch With Us', group: 'Contacto' },
  { key: 'apiculturaContactText', label: 'Contacto: texto', placeholder: 'Completa el formulario o usa nuestros canales.', group: 'Contacto' },
  { key: 'apiculturaContactAddress', label: 'Contacto: dirección', placeholder: 'Av. Principal 123', group: 'Contacto' },
  { key: 'apiculturaContactPhone', label: 'Contacto: teléfono', placeholder: '+51 999 999 999', group: 'Contacto' },
  { key: 'apiculturaContactEmail', label: 'Contacto: email', placeholder: 'contacto@tutienda.com', group: 'Contacto' },
  { key: 'apiculturaContactHours', label: 'Contacto: horario', placeholder: '9:00 AM - 6:00 PM', group: 'Contacto' },
  { key: 'apiculturaContactSubmitLabel', label: 'Contacto: botón', placeholder: 'Enviar', group: 'Contacto' },
  { key: 'apiculturaOcultarEnvio', label: 'Ocultar costo de envío', placeholder: '', group: 'Checkout', type: 'toggle', hint: 'Actívalo si coordinas el envío internamente. Oculta la línea "Envío" y el mensaje de delivery gratis en el checkout.' },
  { key: 'apiculturaNewsletterTitle', label: 'Newsletter: título', placeholder: 'Subscribe To Our Newsletter', group: 'Newsletter' },
  { key: 'apiculturaNewsletterText', label: 'Newsletter: texto', placeholder: 'Recibe novedades y promociones...', group: 'Newsletter' },
  { key: 'apiculturaNewsletterButton', label: 'Newsletter: botón', placeholder: 'Suscribirse', group: 'Newsletter' },
  { key: 'apiculturaCheckoutTitle', label: 'Checkout: título', placeholder: 'Finalizar compra', group: 'Checkout' },
  { key: 'apiculturaCheckoutCustomerTitle', label: 'Checkout: datos cliente', placeholder: 'Datos del cliente', group: 'Checkout' },
  { key: 'apiculturaCheckoutDeliveryTitle', label: 'Checkout: entrega y pago', placeholder: 'Entrega y pago', group: 'Checkout' },
  { key: 'apiculturaCheckoutSummaryTitle', label: 'Checkout: resumen', placeholder: 'Resumen del pedido', group: 'Checkout' },
  { key: 'apiculturaCheckoutThankTitle', label: 'Checkout: cierre título', placeholder: 'Gracias por comprar en nuestra tienda', group: 'Checkout' },
  { key: 'apiculturaCheckoutThankText', label: 'Checkout: cierre texto', placeholder: 'Recibirás el código de seguimiento...', group: 'Checkout' },
  { key: 'apiculturaFooterText', label: 'Footer: descripción', placeholder: 'Productos naturales, miel pura...', group: 'Footer' },
  { key: 'apiculturaFooterPhone', label: 'Footer: teléfono', placeholder: '+51 999 999 999', group: 'Footer' },
  { key: 'apiculturaFooterEmail', label: 'Footer: email', placeholder: 'contacto@tutienda.com', group: 'Footer' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTOS DESTACADOS
// ─────────────────────────────────────────────────────────────────────────────
const URBANO_PRODUCT_FIELDS: ProductFieldDef[] = [
  { key: 'urbanoShopTheLookProducts', label: "Productos en 'Compra el look'" },
  { key: 'urbanoFeatureProducts', label: "Productos en 'Completa el look'" },
];

const MAYE_PRODUCT_FIELDS: ProductFieldDef[] = [
  { key: 'mayeFeaturedProducts', label: 'Productos destacados de portada' },
  { key: 'mayeTrendingProducts', label: 'Productos más buscados' },
  { key: 'mayeDealsProducts', label: 'Productos en ofertas de la semana' },
  { key: 'mayeTopSellingProducts', label: 'Productos en top ventas' },
];

const TECNOLOGIA_PRODUCT_FIELDS: ProductFieldDef[] = [
  { key: 'tecnologiaPopularProducts', label: 'Productos populares de portada' },
  { key: 'tecnologiaSuggestedProducts', label: 'Productos sugeridos' },
];

const FALCON_PRODUCT_FIELDS: ProductFieldDef[] = [
  { key: 'falconFeaturedProducts', label: 'Productos destacados de portada' },
  { key: 'falconPopularProducts', label: 'Productos populares de portada' },
  { key: 'falconRecommendedProducts', label: 'Productos recomendados' },
];

const CONSTRUCCION_PRODUCT_FIELDS: ProductFieldDef[] = [
  { key: 'construccionTrendingProducts', label: 'Productos en tendencia' },
  { key: 'construccionTopCategoryProducts', label: 'Productos en categorías destacadas' },
  { key: 'construccionSpecialProducts', label: 'Productos especiales' },
];

const APICULTURA_PRODUCT_FIELDS: ProductFieldDef[] = [
  { key: 'apiculturaLatestProducts', label: 'Últimos productos de portada' },
  { key: 'apiculturaFeaturedProducts', label: 'Productos destacados de portada' },
];

const MODA_LINK_FIELDS: LinkFieldDef[] = [
  { key: 'modaHeroAction', label: 'Banner del hero', group: 'Hero', defaultType: 'catalog' },
];

const MAYE_LINK_FIELDS: LinkFieldDef[] = [
  { key: 'mayeHeroAction', label: 'Hero principal', group: 'Hero', defaultType: 'catalog' },
  { key: 'mayeSideTopAction', label: 'Banner lateral superior', group: 'Hero', defaultType: 'category' },
  { key: 'mayeSideBottomAction', label: 'Banner lateral inferior', group: 'Hero', defaultType: 'category' },
  { key: 'mayeFinderAction', label: 'Botón ver todo catálogo', group: 'Hero', defaultType: 'catalog' },
  { key: 'mayeCategory1Action', label: 'Categoría destacada 1', group: 'Categorías', defaultType: 'category' },
  { key: 'mayeCategory2Action', label: 'Categoría destacada 2', group: 'Categorías', defaultType: 'category' },
  { key: 'mayeCategory3Action', label: 'Categoría destacada 3', group: 'Categorías', defaultType: 'category' },
  { key: 'mayeAllCategoriesAction', label: 'Botón todas las categorías', group: 'Categorías', defaultType: 'catalog' },
  { key: 'mayePromoLeftAction', label: 'Promo izquierda', group: 'Promos', defaultType: 'catalog' },
  { key: 'mayePromoRightAction', label: 'Promo derecha', group: 'Promos', defaultType: 'catalog' },
  { key: 'mayeCommunityAction', label: 'Bloque comunidad', group: 'Comunidad', defaultType: 'catalog' },
  { key: 'mayeSupportAction', label: 'Bloque soporte', group: 'Comunidad', defaultType: 'catalog' },
  { key: 'mayeBrandsFlashAction', label: 'Promo de marcas', group: 'Marcas', defaultType: 'catalog' },
  { key: 'mayeBrandsMoreAction', label: 'Botón más marcas', group: 'Marcas', defaultType: 'catalog' },
  { key: 'mayeWidgetOneAction', label: 'Widget inferior 1', group: 'Widgets', defaultType: 'catalog' },
  { key: 'mayeWidgetTwoAction', label: 'Widget inferior 2', group: 'Widgets', defaultType: 'catalog' },
  { key: 'mayeWidgetThreeAction', label: 'Widget inferior 3', group: 'Widgets', defaultType: 'catalog' },
];

const TECNOLOGIA_LINK_FIELDS: LinkFieldDef[] = [
  { key: 'tecnologiaHeroAction', label: 'Hero principal', group: 'Hero', defaultType: 'catalog' },
  { key: 'tecnologiaHeroPromoAction', label: 'Botón secundario del hero', group: 'Hero', defaultType: 'catalog' },
  { key: 'tecnologiaPopularAction', label: 'Ver todo productos populares', group: 'Productos', defaultType: 'catalog' },
  { key: 'tecnologiaSuggestedAction', label: 'Ver todo productos sugeridos', group: 'Productos', defaultType: 'catalog' },
];

const FALCON_LINK_FIELDS: LinkFieldDef[] = [
  { key: 'falconHeroAction', label: 'Hero principal', group: 'Hero', defaultType: 'catalog' },
  { key: 'falconSideOneAction', label: 'Banner lateral 1', group: 'Hero', defaultType: 'catalog' },
  { key: 'falconSideTwoAction', label: 'Banner lateral 2', group: 'Hero', defaultType: 'catalog' },
  { key: 'falconBannerAction', label: 'Banner promociones', group: 'Banners', defaultType: 'catalog' },
  { key: 'falconCountdownAction', label: 'Cuenta regresiva', group: 'Banners', defaultType: 'catalog' },
];

const CONSTRUCCION_LINK_FIELDS: LinkFieldDef[] = [
  { key: 'construccionHeroAction', label: 'Hero principal', group: 'Hero', defaultType: 'catalog' },
  { key: 'construccionPromoOneAction', label: 'Promo 1', group: 'Promos', defaultType: 'catalog' },
  { key: 'construccionPromoTwoAction', label: 'Promo 2', group: 'Promos', defaultType: 'catalog' },
  { key: 'construccionPromoThreeAction', label: 'Promo 3', group: 'Promos', defaultType: 'catalog' },
  { key: 'construccionWideBannerAction', label: 'Banner ancho', group: 'Banners', defaultType: 'catalog' },
  { key: 'construccionHalfBannerOneAction', label: 'Banner inferior 1', group: 'Banners', defaultType: 'catalog' },
  { key: 'construccionHalfBannerTwoAction', label: 'Banner inferior 2', group: 'Banners', defaultType: 'catalog' },
];

const APICULTURA_LINK_FIELDS: LinkFieldDef[] = [
  { key: 'apiculturaHeroAction', label: 'Hero principal', group: 'Hero', defaultType: 'catalog' },
  { key: 'apiculturaPromoLeftAction', label: 'Promo izquierda', group: 'Promos', defaultType: 'catalog' },
  { key: 'apiculturaPromoRightAction', label: 'Promo derecha', group: 'Promos', defaultType: 'catalog' },
  { key: 'apiculturaAboutAction', label: 'Botón nosotros', group: 'About', defaultType: 'catalog' },
];

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRO POR PLANTILLA
// ─────────────────────────────────────────────────────────────────────────────
export interface LiveEditorPlantillaConfig {
  textFields: TextFieldDef[];
  imageFields: ImageFieldDef[];
  productFields: ProductFieldDef[];
  linkFields: LinkFieldDef[];
}

const EMPTY: LiveEditorPlantillaConfig = { textFields: [], imageFields: [], productFields: [], linkFields: [] };

export const LIVE_EDITOR_FIELDS: Record<string, LiveEditorPlantillaConfig> = {
  autopartes: { textFields: AUTOPARTES_TEXT_FIELDS, imageFields: AUTOPARTES_IMAGE_FIELDS, productFields: [], linkFields: [] },
  urbano: { textFields: URBANO_TEXT_FIELDS, imageFields: URBANO_IMAGE_FIELDS, productFields: URBANO_PRODUCT_FIELDS, linkFields: [] },
  moda: { textFields: [], imageFields: MODA_IMAGE_FIELDS, productFields: [], linkFields: MODA_LINK_FIELDS },
  maye: { textFields: MAYE_TEXT_FIELDS, imageFields: MAYE_IMAGE_FIELDS, productFields: MAYE_PRODUCT_FIELDS, linkFields: MAYE_LINK_FIELDS },
  tecnologia: { textFields: TECNOLOGIA_TEXT_FIELDS, imageFields: TECNOLOGIA_IMAGE_FIELDS, productFields: TECNOLOGIA_PRODUCT_FIELDS, linkFields: TECNOLOGIA_LINK_FIELDS },
  falcon: { textFields: FALCON_TEXT_FIELDS, imageFields: FALCON_IMAGE_FIELDS, productFields: FALCON_PRODUCT_FIELDS, linkFields: FALCON_LINK_FIELDS },
  construccion: { textFields: CONSTRUCCION_TEXT_FIELDS, imageFields: CONSTRUCCION_IMAGE_FIELDS, productFields: CONSTRUCCION_PRODUCT_FIELDS, linkFields: CONSTRUCCION_LINK_FIELDS },
  apicultura: { textFields: APICULTURA_TEXT_FIELDS, imageFields: APICULTURA_IMAGE_FIELDS, productFields: APICULTURA_PRODUCT_FIELDS, linkFields: APICULTURA_LINK_FIELDS },
};

export function getLiveEditorConfig(plantillaId?: string | null): LiveEditorPlantillaConfig {
  return LIVE_EDITOR_FIELDS[String(plantillaId || '')] ?? EMPTY;
}

export const COLOR_FIELDS: { key: string; label: string; fallback: string }[] = [
  { key: 'colorPrimario', label: 'Color principal', fallback: '#111827' },
  { key: 'colorSecundario', label: 'Color de fondo', fallback: '#ffffff' },
  { key: 'colorAccento', label: 'Color de acento / CTA', fallback: '#FF6B6B' },
];
