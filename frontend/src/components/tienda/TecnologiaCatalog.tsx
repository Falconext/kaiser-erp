import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import ProductCardTecnologia from './ProductCardTecnologia';

// Re-using the types from StorePreviewPage (simplified for this component)
interface DemoProduct {
  id: number;
  descripcion: string;
  precioUnitario: number;
  precioOriginal?: number;
  imagenUrl: string;
  stock: number;
  categoria: { nombre: string };
  marca: { nombre: string };
}

interface RubroDemo {
  storeName: string;
  slogan: string;
  categories: string[];
  products: DemoProduct[];
}

interface TecnologiaCatalogProps {
  demo: RubroDemo;
  cp: string;
  onProduct: (p: DemoProduct) => void;
  onAddToCart: (p: DemoProduct) => void;
}

export default function TecnologiaCatalog({ demo, cp, onProduct, onAddToCart }: TecnologiaCatalogProps) {
  const [activeCategory, setActiveCategory] = useState('Todos');
  const filtered = activeCategory === 'Todos' ? demo.products : demo.products.filter(p => p.categoria.nombre === activeCategory);

  return (
    <div className="bg-[#FAF5F5] min-h-screen pb-16 font-sans">
      
      {/* Dark Header Banner */}
      <div className="bg-[#111111] relative overflow-hidden text-white pt-20 pb-24 px-6 mb-12">
        <div className="absolute inset-0 z-0 opacity-40">
           <img src="/assets/templates/tecnologia/widget1.png" className="w-full h-full object-cover mix-blend-luminosity" alt="Background" />
           <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/80 to-transparent"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <nav className="flex justify-center items-center gap-2 text-xs font-bold text-gray-400 mb-6 uppercase tracking-widest">
            <span className="hover:text-white cursor-pointer transition-colors">Inicio</span>
            <Icon icon="solar:alt-arrow-right-linear" width={12} />
            <span className="text-white">Catálogo de Piezas</span>
          </nav>
          
          <h1 className="text-4xl md:text-5xl font-black mb-4">CATÁLOGO DE PRODUCTOS</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">Encuentra los mejores repuestos y accesorios para tu vehículo con la garantía y respaldo que mereces.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 xl:px-8">
        
        {/* Results Info & Sort */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 pb-4 border-b border-gray-200 gap-4">
          <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
            Mostrando <span className="text-gray-900">{filtered.length}</span> de <span className="text-gray-900">{demo.products.length}</span> resultados
          </p>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-500">Ordenar por:</span>
            <select className="bg-transparent border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-900 outline-none focus:border-red-600 transition-colors cursor-pointer">
              <option>Relevancia</option>
              <option>Precio: Menor a Mayor</option>
              <option>Precio: Mayor a Menor</option>
              <option>Más recientes</option>
            </select>
          </div>
        </div>

        {/* Sidebar + Grid */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
            
            {/* Vehicle Filter Widget (Visual demo) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-black text-gray-900 mb-4 uppercase tracking-wide flex items-center gap-2">
                <Icon icon="solar:car-bold" className="text-red-600" /> 
                Tu Vehículo
              </h3>
              <div className="space-y-3">
                <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 outline-none cursor-pointer">
                  <option>Seleccionar Año</option>
                  <option>2023</option>
                  <option>2022</option>
                  <option>2021</option>
                </select>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 outline-none cursor-pointer">
                  <option>Seleccionar Marca</option>
                  <option>Toyota</option>
                  <option>Nissan</option>
                  <option>Honda</option>
                </select>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 outline-none cursor-pointer">
                  <option>Seleccionar Modelo</option>
                </select>
                <button className="w-full py-2 bg-black text-white font-bold rounded-lg text-sm hover:bg-gray-800 transition-colors mt-2">
                  Buscar Piezas
                </button>
              </div>
            </div>

            {/* Categories */}
            <div>
              <h3 className="font-black text-gray-900 mb-4 uppercase tracking-wide border-l-4 border-red-600 pl-3">
                Categorías
              </h3>
              <div className="space-y-3 flex flex-col">
                {demo.categories.filter(c => c !== 'Todos').map(cat => (
                  <label key={cat} className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${activeCategory === cat || activeCategory === 'Todos' ? 'bg-red-600 border-red-600' : 'bg-white border-gray-300 group-hover:border-red-400'}`}>
                      {(activeCategory === cat || activeCategory === 'Todos') && <Icon icon="solar:check-read-linear" className="text-white text-xs" />}
                    </div>
                    <span className={`text-sm font-bold transition-colors ${activeCategory === cat || activeCategory === 'Todos' ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'}`}>
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Brands */}
            <div>
              <h3 className="font-black text-gray-900 mb-4 uppercase tracking-wide border-l-4 border-red-600 pl-3">
                Marcas Populares
              </h3>
              <div className="space-y-3 flex flex-col">
                {['Mobil', 'Castrol', 'Michelin', 'Bosch'].map(brand => (
                  <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-5 h-5 rounded border bg-white border-gray-300 flex items-center justify-center transition-colors group-hover:border-red-400">
                    </div>
                    <span className="text-sm font-bold text-gray-500 group-hover:text-gray-900 transition-colors">
                      {brand}
                    </span>
                  </label>
                ))}
              </div>
            </div>

          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(p => (
                <div key={p.id} onClick={() => onProduct(p)}>
                  <ProductCardTecnologia 
                    producto={p} 
                    slug="" 
                    diseno={{ colorPrimario: cp }} 
                    onAddToCart={() => onAddToCart(p)} 
                  />
                </div>
              ))}
            </div>
            
            {filtered.length === 0 && (
              <div className="w-full py-20 flex flex-col items-center justify-center text-gray-400">
                <Icon icon="solar:box-linear" className="text-6xl mb-4 opacity-50" />
                <p className="font-bold text-lg">No se encontraron productos en esta categoría.</p>
              </div>
            )}
            
            {/* Pagination Demo */}
            {filtered.length > 0 && (
              <div className="w-full flex justify-center mt-12">
                <div className="flex gap-2">
                  <button className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-red-600 text-gray-400 hover:text-red-600 transition-all font-bold">1</button>
                  <button className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold shadow-md shadow-red-600/20">2</button>
                  <button className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:border-red-600 text-gray-400 hover:text-red-600 transition-all font-bold">3</button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
