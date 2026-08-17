import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

interface ModaNewArrivalsProps {
  diseno?: any;
  slug: string;
  productos: any[];
}

export default function ModaNewArrivals({ slug, productos, diseno }: ModaNewArrivalsProps) {
  const navigate = useNavigate();

  // Mocking the specific products shown in the design
  const topProducts = [
    {
      id: 101,
      title: "Pantalón Recto UrbanEase",
      price: 199.00,
      image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=800", 
      // Using a pants image with transparent/white background feel
    },
    {
      id: 102,
      title: "Top de Satén LuxeLayer",
      price: 87.00,
      image: "https://images.unsplash.com/photo-1603487742131-4160ecaea990?auto=format&fit=crop&q=80&w=800",
    }
  ];

  const bottomProducts = [
    {
      id: 103,
      title: "Vestido Blazer RoseMist",
      price: 179.00,
      image: "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: 104,
      title: "Top con Vuelos BlushAura",
      price: 63.00,
      image: "https://images.unsplash.com/photo-1551799517-eb8f03cb5e6a?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: 105,
      title: "Top Corsé BoldMuse",
      price: 49.00,
      image: "https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?auto=format&fit=crop&q=80&w=800",
    },
    {
      id: 106,
      title: "Camisa Corta VibeSync",
      price: 53.00,
      image: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=800",
    }
  ];

  return (
    <section className="w-full mb-20" style={{ fontFamily: '"Inter", sans-serif' }}>
      <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-8">
        Nuevos Ingresos
      </h2>

      <div className="flex flex-col gap-6">
        
        {/* Top Row: Card + Large Image + Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="col-span-1 bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 relative group cursor-pointer" onClick={() => navigate(`/tienda/${slug}/producto/${topProducts[0].id}`)}>
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-9 h-9 bg-[#2A2A2A] rounded-full flex items-center justify-center text-white hover:bg-black transition-colors">
                <Icon icon="solar:heart-linear" width={18} />
              </button>
              <button className="w-9 h-9 bg-[#2A2A2A] rounded-full flex items-center justify-center text-white hover:bg-black transition-colors">
                <Icon icon="solar:cart-large-2-linear" width={18} />
              </button>
            </div>
            <div className="w-full aspect-square flex items-center justify-center mb-4">
              <img src={topProducts[0].image} alt={topProducts[0].title} className="max-w-full max-h-full object-contain mix-blend-multiply" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">{topProducts[0].title}</h3>
            <p className="font-semibold text-sm text-gray-600">${topProducts[0].price.toFixed(2)}</p>
          </div>

          {/* Large Center Image */}
          <div className="col-span-1 md:col-span-2 rounded-[2rem] overflow-hidden bg-gray-100 shadow-sm border border-gray-100 aspect-square md:aspect-video">
            <img 
              src="https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?auto=format&fit=crop&q=80&w=1200" 
              alt="Clothes on Rack" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Card 3 */}
          <div className="col-span-1 bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 relative group cursor-pointer" onClick={() => navigate(`/tienda/${slug}/producto/${topProducts[1].id}`)}>
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="w-9 h-9 bg-[#2A2A2A] rounded-full flex items-center justify-center text-white hover:bg-black transition-colors">
                <Icon icon="solar:heart-linear" width={18} />
              </button>
              <button className="w-9 h-9 bg-[#2A2A2A] rounded-full flex items-center justify-center text-white hover:bg-black transition-colors">
                <Icon icon="solar:cart-large-2-linear" width={18} />
              </button>
            </div>
            <div className="w-full aspect-square flex items-center justify-center mb-4">
              <img src={topProducts[1].image} alt={topProducts[1].title} className="max-w-full max-h-full object-contain mix-blend-multiply" />
            </div>
            <h3 className="font-bold text-gray-900 text-sm mb-1">{topProducts[1].title}</h3>
            <p className="font-semibold text-sm text-gray-600">${topProducts[1].price.toFixed(2)}</p>
          </div>

        </div>

        {/* Bottom Row: 4 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {bottomProducts.map(product => (
            <div key={product.id} className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 relative group cursor-pointer" onClick={() => navigate(`/tienda/${slug}/producto/${product.id}`)}>
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-9 h-9 bg-[#2A2A2A] rounded-full flex items-center justify-center text-white hover:bg-black transition-colors">
                  <Icon icon="solar:heart-linear" width={18} />
                </button>
                <button className="w-9 h-9 bg-[#2A2A2A] rounded-full flex items-center justify-center text-white hover:bg-black transition-colors">
                  <Icon icon="solar:cart-large-2-linear" width={18} />
                </button>
              </div>
              <div className="w-full aspect-square flex items-center justify-center mb-4">
                <img src={product.image} alt={product.title} className="max-w-full max-h-full object-contain mix-blend-multiply" />
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{product.title}</h3>
              <p className="font-semibold text-sm text-gray-600">${product.price.toFixed(2)}</p>
            </div>
          ))}
        </div>

      </div>

    </section>
  );
}
