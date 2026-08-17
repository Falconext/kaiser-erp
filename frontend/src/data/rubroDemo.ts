export interface DemoProduct {
  id: number;
  descripcion: string;
  precioUnitario: number;
  precioOriginal?: number;
  imagenUrl: string;
  stock: number;
  categoria: { nombre: string };
  marca: { nombre: string };
}

export interface RubroDemo {
  storeName: string;
  slogan: string;
  heroKeyword: string;
  heroDesc: string;
  categories: string[];
  products: DemoProduct[];
  plantillaDefault: string;
  colorDefault: string;
}

const img = (w: number, h: number, bg: string, fg: string, text: string) =>
  `https://placehold.co/${w}x${h}/${bg.replace('#', '')}/${fg.replace('#', '')}?text=${encodeURIComponent(text)}`;

// ─── Ferretería / Materiales ──────────────────────────────────────────────────
const ferreteriaDemo: RubroDemo = {
  storeName: 'Ferretería El Maestro',
  slogan: 'Todo para tu construcción',
  heroKeyword: 'Las Mejores Herramientas',
  heroDesc: 'Herramientas profesionales, materiales de calidad y todo lo que necesitas para tu obra o proyecto. Entrega rápida a todo el país.',
  categories: ['Todos', 'Herramientas', 'Pinturas', 'Electricidad', 'Plomería', 'Tornillería'],
  plantillaDefault: 'construccion',
  colorDefault: '#E65100',
  products: [
    { id: 1, descripcion: 'Taladro Percutor 800W Bosch', precioUnitario: 289.90, precioOriginal: 350.00, imagenUrl: img(400,400,'FFF3E0','E65100','Taladro'), stock: 8, categoria: { nombre: 'Herramientas' }, marca: { nombre: 'Bosch' } },
    { id: 2, descripcion: 'Pintura Látex Interior 4L Blanco', precioUnitario: 45.00, precioOriginal: 0, imagenUrl: img(400,400,'F3F4F6','374151','Pintura'), stock: 30, categoria: { nombre: 'Pinturas' }, marca: { nombre: 'Vencedor' } },
    { id: 3, descripcion: 'Cemento Sol Rojo 42.5kg', precioUnitario: 28.50, precioOriginal: 0, imagenUrl: img(400,400,'FEF2F2','DC2626','Cemento'), stock: 50, categoria: { nombre: 'Construcción' }, marca: { nombre: 'Sol' } },
    { id: 4, descripcion: 'Amoladora 4.5" Stanley 900W', precioUnitario: 159.90, precioOriginal: 199.90, imagenUrl: img(400,400,'EFF6FF','1D4ED8','Amoladora'), stock: 5, categoria: { nombre: 'Herramientas' }, marca: { nombre: 'Stanley' } },
    { id: 5, descripcion: 'Cable THW 2.5mm x 100m Rojo', precioUnitario: 89.00, precioOriginal: 0, imagenUrl: img(400,400,'FEF2F2','B91C1C','Cable'), stock: 15, categoria: { nombre: 'Electricidad' }, marca: { nombre: 'Indeco' } },
    { id: 6, descripcion: 'Tubo PVC 4" x 3m Desagüe', precioUnitario: 18.90, precioOriginal: 0, imagenUrl: img(400,400,'F0FDF4','15803D','Tubo PVC'), stock: 40, categoria: { nombre: 'Plomería' }, marca: { nombre: 'Nicoll' } },
    { id: 7, descripcion: 'Caja de Tornillos 3x20mm (200u)', precioUnitario: 12.50, precioOriginal: 0, imagenUrl: img(400,400,'FAFAF9','57534E','Tornillos'), stock: 100, categoria: { nombre: 'Tornillería' }, marca: { nombre: 'Genérico' } },
    { id: 8, descripcion: 'Sierra Circular 7.25" 1400W', precioUnitario: 349.00, precioOriginal: 420.00, imagenUrl: img(400,400,'FFFBEB','B45309','Sierra'), stock: 3, categoria: { nombre: 'Herramientas' }, marca: { nombre: 'Makita' } },
  ],
};

// ─── Bodega / Abarrotes / Supermercado ───────────────────────────────────────
const bodegaDemo: RubroDemo = {
  storeName: 'Bodega Don José',
  slogan: 'Los mejores precios del barrio',
  heroKeyword: 'Los Mejores Precios',
  heroDesc: 'Abarrotes, bebidas, lácteos y limpieza al mejor precio del barrio. Compra por delivery o recoge en tienda.',
  categories: ['Todos', 'Abarrotes', 'Bebidas', 'Lácteos', 'Snacks', 'Limpieza'],
  plantillaDefault: 'mercado',
  colorDefault: '#16A34A',
  products: [
    { id: 1, descripcion: 'Arroz Costeño Extra 5kg', precioUnitario: 18.50, precioOriginal: 22.00, imagenUrl: img(400,400,'FEF9C3','854D0E','Arroz'), stock: 80, categoria: { nombre: 'Abarrotes' }, marca: { nombre: 'Costeño' } },
    { id: 2, descripcion: 'Aceite Vegetal Capri 1L', precioUnitario: 8.90, precioOriginal: 0, imagenUrl: img(400,400,'FFF9C4','D97706','Aceite'), stock: 60, categoria: { nombre: 'Abarrotes' }, marca: { nombre: 'Capri' } },
    { id: 3, descripcion: 'Leche Gloria Entera 400g', precioUnitario: 4.20, precioOriginal: 0, imagenUrl: img(400,400,'EFF6FF','1E40AF','Leche'), stock: 100, categoria: { nombre: 'Lácteos' }, marca: { nombre: 'Gloria' } },
    { id: 4, descripcion: 'Inca Kola 2.5L', precioUnitario: 9.50, precioOriginal: 11.00, imagenUrl: img(400,400,'FEFCE8','CA8A04','Inca Kola'), stock: 45, categoria: { nombre: 'Bebidas' }, marca: { nombre: 'Inca Kola' } },
    { id: 5, descripcion: 'Detergente Ariel 4kg', precioUnitario: 32.00, precioOriginal: 38.00, imagenUrl: img(400,400,'EDE9FE','6D28D9','Ariel'), stock: 25, categoria: { nombre: 'Limpieza' }, marca: { nombre: 'Ariel' } },
    { id: 6, descripcion: 'Fideos Don Vittorio 500g', precioUnitario: 3.20, precioOriginal: 0, imagenUrl: img(400,400,'FFF7ED','C2410C','Fideos'), stock: 120, categoria: { nombre: 'Abarrotes' }, marca: { nombre: 'Don Vittorio' } },
    { id: 7, descripcion: 'Galletas Oreo 432g', precioUnitario: 12.90, precioOriginal: 0, imagenUrl: img(400,400,'1C1917','FAFAF9','Oreo'), stock: 40, categoria: { nombre: 'Snacks' }, marca: { nombre: 'Oreo' } },
    { id: 8, descripcion: 'Azúcar Rubia 1kg', precioUnitario: 3.80, precioOriginal: 0, imagenUrl: img(400,400,'FEF3C7','92400E','Azucar'), stock: 200, categoria: { nombre: 'Abarrotes' }, marca: { nombre: 'Cartavio' } },
  ],
};

// ─── Farmacia / Botica ────────────────────────────────────────────────────────
const farmaciaDemo: RubroDemo = {
  storeName: 'Botica San Martín',
  slogan: 'Tu salud, nuestra prioridad',
  heroKeyword: 'Tu Mejor Salud',
  heroDesc: 'Medicamentos, vitaminas y productos de cuidado personal. Atención farmacéutica de confianza con entrega a domicilio.',
  categories: ['Todos', 'Analgésicos', 'Vitaminas', 'Cuidado Personal', 'Primeros Auxilios', 'Pediátrico'],
  plantillaDefault: 'salud',
  colorDefault: '#0EA5E9',
  products: [
    { id: 1, descripcion: 'Paracetamol 500mg x 100 tab', precioUnitario: 8.50, precioOriginal: 0, imagenUrl: img(400,400,'EFF6FF','1D4ED8','Paracetamol'), stock: 200, categoria: { nombre: 'Analgésicos' }, marca: { nombre: 'Genfar' } },
    { id: 2, descripcion: 'Vitamina C 1000mg x 30 tab', precioUnitario: 18.90, precioOriginal: 24.00, imagenUrl: img(400,400,'FEF9C3','D97706','Vit. C'), stock: 50, categoria: { nombre: 'Vitaminas' }, marca: { nombre: 'Bayer' } },
    { id: 3, descripcion: 'Alcohol 70° x 250ml', precioUnitario: 4.50, precioOriginal: 0, imagenUrl: img(400,400,'F0FDF4','15803D','Alcohol'), stock: 80, categoria: { nombre: 'Primeros Auxilios' }, marca: { nombre: 'Farvet' } },
    { id: 4, descripcion: 'Omeprazol 20mg x 30 cáp', precioUnitario: 12.00, precioOriginal: 0, imagenUrl: img(400,400,'F3F4F6','374151','Omeprazol'), stock: 60, categoria: { nombre: 'Analgésicos' }, marca: { nombre: 'Genfar' } },
    { id: 5, descripcion: 'Shampoo Head & Shoulders 400ml', precioUnitario: 22.90, precioOriginal: 27.00, imagenUrl: img(400,400,'E0F2FE','0369A1','H&S'), stock: 30, categoria: { nombre: 'Cuidado Personal' }, marca: { nombre: 'H&S' } },
    { id: 6, descripcion: 'Pañales Huggies T3 x 40u', precioUnitario: 39.90, precioOriginal: 45.00, imagenUrl: img(400,400,'FDF2F8','9D174D','Huggies'), stock: 25, categoria: { nombre: 'Pediátrico' }, marca: { nombre: 'Huggies' } },
    { id: 7, descripcion: 'Ibuprofeno 400mg x 20 tab', precioUnitario: 6.00, precioOriginal: 0, imagenUrl: img(400,400,'F5F3FF','6D28D9','Ibuprofeno'), stock: 150, categoria: { nombre: 'Analgésicos' }, marca: { nombre: 'Roemmers' } },
    { id: 8, descripcion: 'Termómetro Digital Infrarojo', precioUnitario: 45.00, precioOriginal: 60.00, imagenUrl: img(400,400,'FEF2F2','DC2626','Termometro'), stock: 10, categoria: { nombre: 'Primeros Auxilios' }, marca: { nombre: 'Omron' } },
  ],
};

// ─── Restaurante / Cafetería ──────────────────────────────────────────────────
const restauranteDemo: RubroDemo = {
  storeName: 'Restaurante La Sazón',
  slogan: 'Sabor casero a tu puerta',
  heroKeyword: 'La Mejor Sazón',
  heroDesc: 'Platos tradicionales peruanos preparados al momento. Pedidos por delivery con llegada en menos de 45 minutos.',
  categories: ['Todos', 'Platos del Día', 'Entradas', 'Bebidas', 'Postres', 'Combos'],
  plantillaDefault: 'menu',
  colorDefault: '#EA580C',
  products: [
    { id: 1, descripcion: 'Lomo Saltado con Arroz', precioUnitario: 22.00, precioOriginal: 0, imagenUrl: img(400,300,'FFF7ED','C2410C','Lomo+Saltado'), stock: 20, categoria: { nombre: 'Platos del Día' }, marca: { nombre: 'La Sazón' } },
    { id: 2, descripcion: 'Ceviche Mixto (1 persona)', precioUnitario: 28.00, precioOriginal: 35.00, imagenUrl: img(400,300,'ECFDF5','065F46','Ceviche'), stock: 15, categoria: { nombre: 'Entradas' }, marca: { nombre: 'La Sazón' } },
    { id: 3, descripcion: 'Pollo a la Brasa 1/4', precioUnitario: 18.00, precioOriginal: 0, imagenUrl: img(400,300,'FFFBEB','92400E','Pollo Brasa'), stock: 25, categoria: { nombre: 'Platos del Día' }, marca: { nombre: 'La Sazón' } },
    { id: 4, descripcion: 'Ají de Gallina con Arroz', precioUnitario: 20.00, precioOriginal: 0, imagenUrl: img(400,300,'FEF9C3','854D0E','Aji Gallina'), stock: 18, categoria: { nombre: 'Platos del Día' }, marca: { nombre: 'La Sazón' } },
    { id: 5, descripcion: 'Chicha Morada 1L', precioUnitario: 8.00, precioOriginal: 0, imagenUrl: img(400,300,'F5F3FF','4C1D95','Chicha'), stock: 40, categoria: { nombre: 'Bebidas' }, marca: { nombre: 'La Sazón' } },
    { id: 6, descripcion: 'Suspiro Limeño', precioUnitario: 10.00, precioOriginal: 0, imagenUrl: img(400,300,'FDF2F8','9D174D','Suspiro'), stock: 12, categoria: { nombre: 'Postres' }, marca: { nombre: 'La Sazón' } },
    { id: 7, descripcion: 'Combo Familiar Brasa', precioUnitario: 65.00, precioOriginal: 80.00, imagenUrl: img(400,300,'FEF3C7','D97706','Combo Fam.'), stock: 10, categoria: { nombre: 'Combos' }, marca: { nombre: 'La Sazón' } },
    { id: 8, descripcion: 'Sopa Criolla', precioUnitario: 14.00, precioOriginal: 0, imagenUrl: img(400,300,'FFF7ED','EA580C','Sopa Criolla'), stock: 20, categoria: { nombre: 'Platos del Día' }, marca: { nombre: 'La Sazón' } },
  ],
};

// ─── Ropa / Moda / Boutique ───────────────────────────────────────────────────
const ropaDemo: RubroDemo = {
  storeName: 'VENDIFY',
  slogan: 'Moda que te define',
  heroKeyword: 'La Mejor Moda',
  heroDesc: 'Las últimas tendencias en ropa y accesorios. Colecciones exclusivas para cada estilo, con envío gratis en pedidos mayores a S/150.',
  categories: ['Todos', 'Camisas', 'Pantalones', 'Vestidos', 'Calzado', 'Accesorios'],
  plantillaDefault: 'elegante',
  colorDefault: '#7C3AED',
  products: [
    { id: 1, descripcion: 'Camisa Oxford Slim Fit Azul', precioUnitario: 89.90, precioOriginal: 120.00, imagenUrl: img(400,500,'EFF6FF','1E3A8A','Camisa'), stock: 15, categoria: { nombre: 'Camisas' }, marca: { nombre: 'Tommy' } },
    { id: 2, descripcion: 'Vestido Floral Midi', precioUnitario: 129.00, precioOriginal: 0, imagenUrl: img(400,500,'FDF2F8','BE185D','Vestido'), stock: 8, categoria: { nombre: 'Vestidos' }, marca: { nombre: 'Zara' } },
    { id: 3, descripcion: 'Jean Skinny Negro Tiro Alto', precioUnitario: 99.90, precioOriginal: 140.00, imagenUrl: img(400,500,'1C1917','F5F5F4','Jean Negro'), stock: 20, categoria: { nombre: 'Pantalones' }, marca: { nombre: 'Levis' } },
    { id: 4, descripcion: 'Zapatillas Blancas Urban', precioUnitario: 159.00, precioOriginal: 0, imagenUrl: img(400,500,'F9FAFB','6B7280','Zapatillas'), stock: 12, categoria: { nombre: 'Calzado' }, marca: { nombre: 'Nike' } },
    { id: 5, descripcion: 'Blusa Satinada Champagne', precioUnitario: 75.00, precioOriginal: 95.00, imagenUrl: img(400,500,'FEF3C7','92400E','Blusa'), stock: 10, categoria: { nombre: 'Camisas' }, marca: { nombre: 'Mango' } },
    { id: 6, descripcion: 'Cartera Cuero Marrón', precioUnitario: 189.00, precioOriginal: 240.00, imagenUrl: img(400,500,'FEF2F2','991B1B','Cartera'), stock: 6, categoria: { nombre: 'Accesorios' }, marca: { nombre: 'Coach' } },
    { id: 7, descripcion: 'Pantalón Chino Beige', precioUnitario: 119.00, precioOriginal: 0, imagenUrl: img(400,500,'FEF9C3','854D0E','Chino'), stock: 14, categoria: { nombre: 'Pantalones' }, marca: { nombre: 'H&M' } },
    { id: 8, descripcion: 'Vestido Noche Lentejuelas', precioUnitario: 249.00, precioOriginal: 320.00, imagenUrl: img(400,500,'1E1B4B','E0E7FF','Vestido Noche'), stock: 4, categoria: { nombre: 'Vestidos' }, marca: { nombre: 'Zara' } },
  ],
};

// ─── Tecnología / Computación ────────────────────────────────────────────────
const tecnologiaDemo: RubroDemo = {
  storeName: 'TechStore Peru',
  slogan: 'Tecnología al alcance de todos',
  heroKeyword: 'Los Mejores Dispositivos',
  heroDesc: 'Laptops, celulares, accesorios y gaming al mejor precio del mercado. Stock disponible con garantía y soporte técnico.',
  categories: ['Todos', 'Laptops', 'Celulares', 'Accesorios', 'Audio', 'Gaming'],
  plantillaDefault: 'tecnica',
  colorDefault: '#1E3A5F',
  products: [
    { id: 1, descripcion: 'Laptop Lenovo IdeaPad 15" Intel i5', precioUnitario: 1899.00, precioOriginal: 2200.00, imagenUrl: img(400,400,'EFF6FF','1E40AF','Laptop'), stock: 5, categoria: { nombre: 'Laptops' }, marca: { nombre: 'Lenovo' } },
    { id: 2, descripcion: 'iPhone 15 128GB Negro', precioUnitario: 3499.00, precioOriginal: 0, imagenUrl: img(400,400,'1C1917','F5F5F4','iPhone'), stock: 8, categoria: { nombre: 'Celulares' }, marca: { nombre: 'Apple' } },
    { id: 3, descripcion: 'Audífonos Sony WH-1000XM5', precioUnitario: 799.00, precioOriginal: 999.00, imagenUrl: img(400,400,'F3F4F6','111827','Sony WH'), stock: 6, categoria: { nombre: 'Audio' }, marca: { nombre: 'Sony' } },
    { id: 4, descripcion: 'Monitor Samsung 27" FHD 165Hz', precioUnitario: 899.00, precioOriginal: 1099.00, imagenUrl: img(400,400,'0F172A','38BDF8','Monitor'), stock: 4, categoria: { nombre: 'Accesorios' }, marca: { nombre: 'Samsung' } },
    { id: 5, descripcion: 'Teclado Mecánico RGB Redragon', precioUnitario: 179.00, precioOriginal: 0, imagenUrl: img(400,400,'1E1B4B','818CF8','Teclado'), stock: 12, categoria: { nombre: 'Gaming' }, marca: { nombre: 'Redragon' } },
    { id: 6, descripcion: 'Samsung Galaxy A55 5G 256GB', precioUnitario: 1299.00, precioOriginal: 1499.00, imagenUrl: img(400,400,'1E3A5F','7DD3FC','Galaxy A55'), stock: 10, categoria: { nombre: 'Celulares' }, marca: { nombre: 'Samsung' } },
    { id: 7, descripcion: 'SSD Kingston 1TB SATA', precioUnitario: 249.00, precioOriginal: 0, imagenUrl: img(400,400,'F0FDF4','15803D','SSD'), stock: 20, categoria: { nombre: 'Accesorios' }, marca: { nombre: 'Kingston' } },
    { id: 8, descripcion: 'Silla Gamer RGB Reclinable', precioUnitario: 599.00, precioOriginal: 750.00, imagenUrl: img(400,400,'FEF2F2','991B1B','Silla Gamer'), stock: 3, categoria: { nombre: 'Gaming' }, marca: { nombre: 'DXRacer' } },
  ],
};

// ─── Automotriz / Repuestos ───────────────────────────────────────────────────
const automotrizDemo: RubroDemo = {
  storeName: 'AutoPartes Express',
  slogan: 'Repuestos originales y alternativos',
  heroKeyword: 'Los Mejores Repuestos',
  heroDesc: 'Repuestos originales y alternativos para todas las marcas. Encuentra lo que necesitas para tu vehículo al mejor precio.',
  categories: ['Todos', 'Motor', 'Frenos', 'Eléctrico', 'Accesorios', 'Lubricantes'],
  plantillaDefault: 'tecnica',
  colorDefault: '#1C1917',
  products: [
    { id: 1, descripcion: 'Aceite Motor Mobil 1 5W-30 4L', precioUnitario: 89.90, precioOriginal: 110.00, imagenUrl: '/assets/templates/autopartes/producto.png', stock: 30, categoria: { nombre: 'Lubricantes' }, marca: { nombre: 'Mobil' } },
    { id: 2, descripcion: 'Pastillas de Freno Toyota Corolla', precioUnitario: 45.00, precioOriginal: 0, imagenUrl: '/assets/templates/autopartes/producto.png', stock: 20, categoria: { nombre: 'Frenos' }, marca: { nombre: 'TRW' } },
    { id: 3, descripcion: 'Batería Bosch 60Ah 12V', precioUnitario: 299.00, precioOriginal: 350.00, imagenUrl: '/assets/templates/autopartes/producto.png', stock: 8, categoria: { nombre: 'Eléctrico' }, marca: { nombre: 'Bosch' } },
    { id: 4, descripcion: 'Filtro de Aire Motor Honda', precioUnitario: 28.00, precioOriginal: 0, imagenUrl: '/assets/templates/autopartes/producto.png', stock: 25, categoria: { nombre: 'Motor' }, marca: { nombre: 'Bosch' } },
    { id: 5, descripcion: 'Amortiguador Monroe Trasero', precioUnitario: 159.00, precioOriginal: 200.00, imagenUrl: '/assets/templates/autopartes/producto.png', stock: 6, categoria: { nombre: 'Motor' }, marca: { nombre: 'Monroe' } },
    { id: 6, descripcion: 'Cámara de Reversa Universal HD', precioUnitario: 89.00, precioOriginal: 0, imagenUrl: '/assets/templates/autopartes/producto.png', stock: 15, categoria: { nombre: 'Accesorios' }, marca: { nombre: 'Genérico' } },
    { id: 7, descripcion: 'Llantas 195/65R15 Pirelli', precioUnitario: 280.00, precioOriginal: 320.00, imagenUrl: '/assets/templates/autopartes/producto.png', stock: 16, categoria: { nombre: 'Motor' }, marca: { nombre: 'Pirelli' } },
    { id: 8, descripcion: 'Extintor Vehicular 1kg CO2', precioUnitario: 35.00, precioOriginal: 0, imagenUrl: '/assets/templates/autopartes/producto.png', stock: 40, categoria: { nombre: 'Accesorios' }, marca: { nombre: 'Solkaflam' } },
  ],
};

// ─── Salud y Belleza ─────────────────────────────────────────────────────────
const saludDemo: RubroDemo = {
  storeName: 'Belleza & Más',
  slogan: 'Tu bienestar es nuestra misión',
  heroKeyword: 'Tu Mejor Versión',
  heroDesc: 'Skincare, maquillaje, perfumes y tratamientos spa de las mejores marcas. Brilla con productos que realmente funcionan.',
  categories: ['Todos', 'Skincare', 'Maquillaje', 'Cabello', 'Perfumes', 'Spa'],
  plantillaDefault: 'elegante',
  colorDefault: '#DB2777',
  products: [
    { id: 1, descripcion: 'Sérum Vitamina C 30ml Neutrogena', precioUnitario: 89.90, precioOriginal: 110.00, imagenUrl: img(400,500,'FFFBEB','D97706','Serum Vit C'), stock: 20, categoria: { nombre: 'Skincare' }, marca: { nombre: 'Neutrogena' } },
    { id: 2, descripcion: 'Labial Matte Maybelline Rojo', precioUnitario: 29.90, precioOriginal: 0, imagenUrl: img(400,500,'FEF2F2','DC2626','Labial'), stock: 35, categoria: { nombre: 'Maquillaje' }, marca: { nombre: 'Maybelline' } },
    { id: 3, descripcion: 'Shampoo Kerastase Nutritive 250ml', precioUnitario: 69.00, precioOriginal: 85.00, imagenUrl: img(400,500,'FDF2F8','BE185D','Kerastase'), stock: 15, categoria: { nombre: 'Cabello' }, marca: { nombre: 'Kérastase' } },
    { id: 4, descripcion: 'Perfume BOSS Bottled 100ml', precioUnitario: 189.00, precioOriginal: 230.00, imagenUrl: img(400,500,'F3F4F6','374151','Perfume Boss'), stock: 8, categoria: { nombre: 'Perfumes' }, marca: { nombre: 'Hugo Boss' } },
    { id: 5, descripcion: 'Set Maquillaje Completo L\'Oreal', precioUnitario: 149.00, precioOriginal: 0, imagenUrl: img(400,500,'FDF4FF','7E22CE','Loreal Set'), stock: 10, categoria: { nombre: 'Maquillaje' }, marca: { nombre: "L'Oreal" } },
    { id: 6, descripcion: 'Crema Hidratante Cetaphil 250ml', precioUnitario: 45.00, precioOriginal: 55.00, imagenUrl: img(400,500,'EFF6FF','1D4ED8','Cetaphil'), stock: 25, categoria: { nombre: 'Skincare' }, marca: { nombre: 'Cetaphil' } },
    { id: 7, descripcion: 'Mascarilla Capilar Elvive 300ml', precioUnitario: 22.90, precioOriginal: 0, imagenUrl: img(400,500,'F0FDF4','15803D','Elvive'), stock: 30, categoria: { nombre: 'Cabello' }, marca: { nombre: 'Elvive' } },
    { id: 8, descripcion: 'Kit Spa Facial Completo', precioUnitario: 89.00, precioOriginal: 120.00, imagenUrl: img(400,500,'FFF1F2','9F1239','Kit Spa'), stock: 12, categoria: { nombre: 'Spa' }, marca: { nombre: 'Varios' } },
  ],
};

// ─── Deportes y Recreación ────────────────────────────────────────────────────
const deportesDemo: RubroDemo = {
  storeName: 'SportZone Peru',
  slogan: 'Equípate para ganar',
  heroKeyword: 'El Mejor Equipo',
  heroDesc: 'Zapatillas, ropa deportiva, equipos de entrenamiento y nutrición. Todo lo que necesitas para alcanzar tu mejor rendimiento.',
  categories: ['Todos', 'Zapatillas', 'Ropa Deportiva', 'Equipos', 'Nutrición', 'Accesorios'],
  plantillaDefault: 'moderna',
  colorDefault: '#DC2626',
  products: [
    { id: 1, descripcion: 'Zapatillas Nike Air Max 270', precioUnitario: 399.00, precioOriginal: 499.00, imagenUrl: img(400,400,'EFF6FF','1E40AF','Nike Air'), stock: 10, categoria: { nombre: 'Zapatillas' }, marca: { nombre: 'Nike' } },
    { id: 2, descripcion: 'Short Adidas Entrenamiento', precioUnitario: 89.00, precioOriginal: 0, imagenUrl: img(400,400,'111827','FFFFFF','Short Adidas'), stock: 20, categoria: { nombre: 'Ropa Deportiva' }, marca: { nombre: 'Adidas' } },
    { id: 3, descripcion: 'Mancuernas 10kg Par', precioUnitario: 149.00, precioOriginal: 0, imagenUrl: img(400,400,'F3F4F6','111827','Mancuernas'), stock: 8, categoria: { nombre: 'Equipos' }, marca: { nombre: 'CAP' } },
    { id: 4, descripcion: 'Proteína Whey Gold 5lb Chocolate', precioUnitario: 299.00, precioOriginal: 350.00, imagenUrl: img(400,400,'FEF3C7','92400E','Whey Gold'), stock: 12, categoria: { nombre: 'Nutrición' }, marca: { nombre: 'ON Gold' } },
    { id: 5, descripcion: 'Balón Fútbol Nike Strike T5', precioUnitario: 79.00, precioOriginal: 99.00, imagenUrl: img(400,400,'F0FDF4','15803D','Balon'), stock: 15, categoria: { nombre: 'Equipos' }, marca: { nombre: 'Nike' } },
    { id: 6, descripcion: 'Polo Dry-Fit Compresión', precioUnitario: 59.00, precioOriginal: 0, imagenUrl: img(400,400,'FEF2F2','DC2626','Polo Dry-Fit'), stock: 25, categoria: { nombre: 'Ropa Deportiva' }, marca: { nombre: 'Under Armour' } },
    { id: 7, descripcion: 'Banda de Resistencia Set x5', precioUnitario: 45.00, precioOriginal: 0, imagenUrl: img(400,400,'F5F3FF','6D28D9','Bandas'), stock: 30, categoria: { nombre: 'Accesorios' }, marca: { nombre: 'Genérico' } },
    { id: 8, descripcion: 'Cuerda de Salto Profesional', precioUnitario: 29.90, precioOriginal: 0, imagenUrl: img(400,400,'FFFBEB','D97706','Cuerda'), stock: 20, categoria: { nombre: 'Accesorios' }, marca: { nombre: 'Everlast' } },
  ],
};

// ─── Panadería / Pastelería ───────────────────────────────────────────────────
const panaderiaDemo: RubroDemo = {
  storeName: 'Panadería La Especial',
  slogan: 'Recién horneado, todos los días',
  heroKeyword: 'Lo Mejor del Horno',
  heroDesc: 'Panes artesanales, tortas, pasteles y galletas hechos con amor cada mañana. Encarga tu torta personalizada con anticipación.',
  categories: ['Todos', 'Panes', 'Tortas', 'Pasteles', 'Galletas', 'Bebidas'],
  plantillaDefault: 'menu',
  colorDefault: '#B45309',
  products: [
    { id: 1, descripcion: 'Pan Francés x Kilo', precioUnitario: 6.50, precioOriginal: 0, imagenUrl: img(400,300,'FEF9C3','854D0E','Pan Frances'), stock: 100, categoria: { nombre: 'Panes' }, marca: { nombre: 'La Especial' } },
    { id: 2, descripcion: 'Torta de Chocolate 1kg', precioUnitario: 65.00, precioOriginal: 80.00, imagenUrl: img(400,300,'3B1F14','FDE68A','Torta Choc'), stock: 5, categoria: { nombre: 'Tortas' }, marca: { nombre: 'La Especial' } },
    { id: 3, descripcion: 'Empanadas de Pollo x6', precioUnitario: 18.00, precioOriginal: 0, imagenUrl: img(400,300,'FEF3C7','D97706','Empanadas'), stock: 20, categoria: { nombre: 'Pasteles' }, marca: { nombre: 'La Especial' } },
    { id: 4, descripcion: 'Cupcakes Decorados x12', precioUnitario: 45.00, precioOriginal: 55.00, imagenUrl: img(400,300,'FDF2F8','BE185D','Cupcakes'), stock: 8, categoria: { nombre: 'Pasteles' }, marca: { nombre: 'La Especial' } },
    { id: 5, descripcion: 'Galletas de Mantequilla x24', precioUnitario: 22.00, precioOriginal: 0, imagenUrl: img(400,300,'FFFBEB','92400E','Galletas'), stock: 15, categoria: { nombre: 'Galletas' }, marca: { nombre: 'La Especial' } },
    { id: 6, descripcion: 'Café Americano 500ml', precioUnitario: 8.00, precioOriginal: 0, imagenUrl: img(400,300,'292524','FDE68A','Cafe'), stock: 30, categoria: { nombre: 'Bebidas' }, marca: { nombre: 'La Especial' } },
    { id: 7, descripcion: 'Queque Marmoleado 500g', precioUnitario: 28.00, precioOriginal: 0, imagenUrl: img(400,300,'FEF3C7','B45309','Queque'), stock: 10, categoria: { nombre: 'Tortas' }, marca: { nombre: 'La Especial' } },
    { id: 8, descripcion: 'Pan de Molde Integral 500g', precioUnitario: 9.50, precioOriginal: 12.00, imagenUrl: img(400,300,'F0FDF4','15803D','Pan Molde'), stock: 25, categoria: { nombre: 'Panes' }, marca: { nombre: 'La Especial' } },
  ],
};

// ─── Artesanía / Decoración / Arte ───────────────────────────────────────────
const artesaniaDemo: RubroDemo = {
  storeName: 'Arte & Alma',
  slogan: 'Objetos únicos hechos con amor',
  heroKeyword: 'Arte Único y Original',
  heroDesc: 'Artesanías peruanas, joyería artesanal y decoración única. Cada pieza cuenta una historia y está hecha a mano con los mejores materiales.',
  categories: ['Todos', 'Cerámica', 'Textiles', 'Joyería', 'Cuadros', 'Madera'],
  plantillaDefault: 'elegante',
  colorDefault: '#B45309',
  products: [
    { id: 1, descripcion: 'Jarrón Cerámico Artesanal', precioUnitario: 89.00, precioOriginal: 0, imagenUrl: img(400,500,'FFF7ED','C2410C','Jarron'), stock: 5, categoria: { nombre: 'Cerámica' }, marca: { nombre: 'Artesano' } },
    { id: 2, descripcion: 'Camino de Mesa Tejido a Mano', precioUnitario: 55.00, precioOriginal: 70.00, imagenUrl: img(400,500,'FFFBEB','D97706','Camino'), stock: 8, categoria: { nombre: 'Textiles' }, marca: { nombre: 'Artesano' } },
    { id: 3, descripcion: 'Collar de Plata con Turquesa', precioUnitario: 120.00, precioOriginal: 0, imagenUrl: img(400,500,'E0F2FE','0369A1','Collar'), stock: 6, categoria: { nombre: 'Joyería' }, marca: { nombre: 'Artesano' } },
    { id: 4, descripcion: 'Cuadro Acrílico 40x50cm', precioUnitario: 180.00, precioOriginal: 220.00, imagenUrl: img(400,500,'F5F3FF','6D28D9','Cuadro'), stock: 3, categoria: { nombre: 'Cuadros' }, marca: { nombre: 'Artesano' } },
    { id: 5, descripcion: 'Tallado en Madera Andino', precioUnitario: 95.00, precioOriginal: 0, imagenUrl: img(400,500,'FEF3C7','92400E','Tallado'), stock: 4, categoria: { nombre: 'Madera' }, marca: { nombre: 'Artesano' } },
    { id: 6, descripcion: 'Tapiz Cusqueño 80x120cm', precioUnitario: 245.00, precioOriginal: 300.00, imagenUrl: img(400,500,'FEF2F2','991B1B','Tapiz'), stock: 2, categoria: { nombre: 'Textiles' }, marca: { nombre: 'Artesano' } },
    { id: 7, descripcion: 'Pulsera Huayruros y Plata', precioUnitario: 45.00, precioOriginal: 0, imagenUrl: img(400,500,'F0FDF4','15803D','Pulsera'), stock: 15, categoria: { nombre: 'Joyería' }, marca: { nombre: 'Artesano' } },
    { id: 8, descripcion: 'Set Mates Burilados x3', precioUnitario: 65.00, precioOriginal: 80.00, imagenUrl: img(400,500,'FEFCE8','CA8A04','Mates'), stock: 7, categoria: { nombre: 'Cerámica' }, marca: { nombre: 'Artesano' } },
  ],
};

// ─── Agricultura / Ganadería ──────────────────────────────────────────────────
const agriculturaDemo: RubroDemo = {
  storeName: 'AgroTienda Peru',
  slogan: 'Del campo a tu negocio',
  heroKeyword: 'Los Mejores Insumos',
  heroDesc: 'Semillas, fertilizantes, herramientas agrícolas y más. Todo lo que necesita tu campo para una cosecha exitosa.',
  categories: ['Todos', 'Semillas', 'Fertilizantes', 'Herramientas', 'Animales', 'Riego'],
  plantillaDefault: 'moderna',
  colorDefault: '#15803D',
  products: [
    { id: 1, descripcion: 'Semillas Tomate Híbrido x50g', precioUnitario: 25.00, precioOriginal: 0, imagenUrl: img(400,400,'F0FDF4','15803D','Semillas'), stock: 50, categoria: { nombre: 'Semillas' }, marca: { nombre: 'Hazera' } },
    { id: 2, descripcion: 'Fertilizante NPK 20-20-20 25kg', precioUnitario: 85.00, precioOriginal: 100.00, imagenUrl: img(400,400,'FFFBEB','D97706','Fertilizante'), stock: 30, categoria: { nombre: 'Fertilizantes' }, marca: { nombre: 'Yara' } },
    { id: 3, descripcion: 'Motocultor 7HP Honda', precioUnitario: 1850.00, precioOriginal: 2200.00, imagenUrl: img(400,400,'FEF2F2','991B1B','Motocultor'), stock: 3, categoria: { nombre: 'Herramientas' }, marca: { nombre: 'Honda' } },
    { id: 4, descripcion: 'Sistema Riego Goteo 100 Plantas', precioUnitario: 189.00, precioOriginal: 0, imagenUrl: img(400,400,'EFF6FF','1E40AF','Riego Goteo'), stock: 10, categoria: { nombre: 'Riego' }, marca: { nombre: 'Netafim' } },
    { id: 5, descripcion: 'Pesticida Orgánico Neem 1L', precioUnitario: 35.00, precioOriginal: 0, imagenUrl: img(400,400,'F5F3FF','6D28D9','Neem'), stock: 25, categoria: { nombre: 'Fertilizantes' }, marca: { nombre: 'BioGreen' } },
    { id: 6, descripcion: 'Macetas Plástico T20 x10u', precioUnitario: 22.00, precioOriginal: 28.00, imagenUrl: img(400,400,'FEF9C3','854D0E','Macetas'), stock: 60, categoria: { nombre: 'Herramientas' }, marca: { nombre: 'Genérico' } },
    { id: 7, descripcion: 'Balanza Digital 200kg', precioUnitario: 299.00, precioOriginal: 0, imagenUrl: img(400,400,'F3F4F6','374151','Balanza'), stock: 8, categoria: { nombre: 'Herramientas' }, marca: { nombre: 'Jadever' } },
    { id: 8, descripcion: 'Vitaminas Avícolas 1kg', precioUnitario: 45.00, precioOriginal: 55.00, imagenUrl: img(400,400,'ECFDF5','065F46','Vitaminas Av.'), stock: 20, categoria: { nombre: 'Animales' }, marca: { nombre: 'Farvet' } },
  ],
};

// ─── Genérico fallback ────────────────────────────────────────────────────────
const genericoDemo: RubroDemo = {
  storeName: 'Mi Tienda Virtual',
  slogan: 'Los mejores productos para ti',
  heroKeyword: 'Los Mejores Productos',
  heroDesc: 'Descubre nuestra selección de productos de calidad al mejor precio. Envío rápido y garantía en todos tus pedidos.',
  categories: ['Todos', 'Destacados', 'Ofertas', 'Nuevos', 'Popular'],
  plantillaDefault: 'moderna',
  colorDefault: '#6A6CFF',
  products: [
    { id: 1, descripcion: 'Producto Estrella A', precioUnitario: 49.90, precioOriginal: 65.00, imagenUrl: img(400,400,'EEF2FF','4F46E5','Producto A'), stock: 20, categoria: { nombre: 'Destacados' }, marca: { nombre: 'Marca A' } },
    { id: 2, descripcion: 'Oferta Especial B', precioUnitario: 29.90, precioOriginal: 0, imagenUrl: img(400,400,'F0FDF4','15803D','Producto B'), stock: 35, categoria: { nombre: 'Ofertas' }, marca: { nombre: 'Marca B' } },
    { id: 3, descripcion: 'Nuevo Producto C', precioUnitario: 89.90, precioOriginal: 110.00, imagenUrl: img(400,400,'FDF2F8','BE185D','Producto C'), stock: 12, categoria: { nombre: 'Nuevos' }, marca: { nombre: 'Marca C' } },
    { id: 4, descripcion: 'Más Vendido D', precioUnitario: 15.00, precioOriginal: 0, imagenUrl: img(400,400,'FFFBEB','D97706','Producto D'), stock: 50, categoria: { nombre: 'Popular' }, marca: { nombre: 'Marca D' } },
    { id: 5, descripcion: 'Producto Premium E', precioUnitario: 199.00, precioOriginal: 250.00, imagenUrl: img(400,400,'F3F4F6','374151','Producto E'), stock: 8, categoria: { nombre: 'Destacados' }, marca: { nombre: 'Marca E' } },
    { id: 6, descripcion: 'Súper Oferta F', precioUnitario: 9.90, precioOriginal: 15.00, imagenUrl: img(400,400,'FEF2F2','DC2626','Producto F'), stock: 100, categoria: { nombre: 'Ofertas' }, marca: { nombre: 'Marca F' } },
    { id: 7, descripcion: 'Colección Nueva G', precioUnitario: 65.00, precioOriginal: 0, imagenUrl: img(400,400,'E0F2FE','0369A1','Producto G'), stock: 15, categoria: { nombre: 'Nuevos' }, marca: { nombre: 'Marca G' } },
    { id: 8, descripcion: 'Tendencia H', precioUnitario: 35.00, precioOriginal: 45.00, imagenUrl: img(400,400,'F5F3FF','6D28D9','Producto H'), stock: 25, categoria: { nombre: 'Popular' }, marca: { nombre: 'Marca H' } },
  ],
};

// ─── Resolver por nombre de rubro ─────────────────────────────────────────────
export function getRubroDemo(rubroNombre: string = ''): RubroDemo {
  const n = rubroNombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  if (n.includes('ferret') || n.includes('herrami') || n.includes('construcc') || n.includes('material'))
    return ferreteriaDemo;
  if (n.includes('botic') || n.includes('farmac') || n.includes('drogue') || n.includes('salud med'))
    return farmaciaDemo;
  if (n.includes('restaur') || n.includes('cafet') || n.includes('cevich') || n.includes('comida'))
    return restauranteDemo;
  if (n.includes('ropa') || n.includes('moda') || n.includes('boutique') || n.includes('vestim') || n.includes('textil') || n.includes('confec'))
    return ropaDemo;
  if (n.includes('tecnol') || n.includes('comput') || n.includes('electron') || n.includes('celular') || n.includes('gaming') || n.includes('repuest') && n.includes('comput'))
    return tecnologiaDemo;
  if (n.includes('autom') || n.includes('repuest') || n.includes('motor') || n.includes('moto'))
    return automotrizDemo;
  if (n.includes('bode') || n.includes('abarrot') || n.includes('superm') || n.includes('minori') || n.includes('comercio'))
    return bodegaDemo;
  if (n.includes('salud') || n.includes('belleza') || n.includes('cosmetic') || n.includes('cuidado'))
    return saludDemo;
  if (n.includes('deport') || n.includes('recreac') || n.includes('fitness') || n.includes('gym'))
    return deportesDemo;
  if (n.includes('panad') || n.includes('pastel') || n.includes('dulce') || n.includes('heladeri') || n.includes('chocolat'))
    return panaderiaDemo;
  if (n.includes('artesani') || n.includes('decorac') || n.includes('arte') || n.includes('manualid') || n.includes('joyeri'))
    return artesaniaDemo;
  if (n.includes('agricult') || n.includes('ganaد') || n.includes('ganad') || n.includes('agro') || n.includes('campo'))
    return agriculturaDemo;

  return genericoDemo;
}
