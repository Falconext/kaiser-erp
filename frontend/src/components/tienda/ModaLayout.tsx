import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModaHeader from './ModaHeader';
import ModaHero from './ModaHero';
import ModaBestSelling from './ModaBestSelling';
import ModaHomeSections from './ModaHomeSections';
import ModaFooter from './ModaFooter';
import ShoppingCartModal from './ShoppingCartModal';

interface ModaLayoutProps {
  tienda: any;
  slug: string;
  productos: any[];
  allCategories: any[];
  cp: string;
  diseno: any;
  carrito: any[];
  setCarrito: (carrito: any[]) => void;
  mostrarCarrito: boolean;
  setMostrarCarrito: (value: boolean) => void;
  agregarAlCarrito: (producto: any) => void;
  actualizarCantidad: (id: number | string, cantidad: number) => void;
  loading: boolean;
}

export default function ModaLayout({
  tienda,
  slug,
  productos,
  allCategories,
  cp,
  diseno,
  carrito,
  setCarrito,
  mostrarCarrito,
  setMostrarCarrito,
  agregarAlCarrito,
  actualizarCantidad,
  loading,
}: ModaLayoutProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const cartCount = carrito.reduce((sum, item) => sum + Number(item.cantidad || 1), 0);

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const q = search.trim();
    if (q) navigate(`/tienda/${slug}/catalogo?search=${encodeURIComponent(q)}`);
  };

  const irACheckout = () => {
    navigate(`/tienda/${slug}/checkout`, { state: { carrito, tienda } });
  };

  return (
    <div
      className="min-h-screen bg-[#FAF9F6] text-[14px] text-gray-900"
      style={{ fontFamily: "'Poppins', sans-serif", fontSize: 14 }}
    >
      <ModaHeader diseno={diseno}
        tienda={tienda}
        slug={slug}
        cp={cp}
        carritoSize={cartCount}
        onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
        searchQuery={search}
        setSearchQuery={setSearch}
        onSearchSubmit={handleSearchSubmit}
        allCategories={allCategories}
      />

      <main className="w-full">
        {loading ? (
          <div className="h-[calc(100vh-94px)] min-h-[560px] bg-neutral-200 animate-pulse" />
        ) : (
          <>
            <ModaHero cp={cp} slug={slug} diseno={diseno} productos={productos.slice(0, 3)} />
            <ModaBestSelling slug={slug} cp={cp} productos={productos} genero="hombre" titulo="Más vendidos hombre" />
            <ModaBestSelling slug={slug} cp={cp} productos={productos} genero="mujer" titulo="Más vendidos mujer" offset={10} />
            <ModaHomeSections slug={slug} productos={productos} diseno={diseno} />
          </>
        )}
      </main>

      <ModaFooter diseno={diseno} tiendaNombre={tienda?.nombre || 'Styliq'} />

      <ShoppingCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        tienda={tienda}
        actualizarCantidad={actualizarCantidad}
        onCheckout={irACheckout}
        slug={slug}
        setCarrito={setCarrito}
      />
    </div>
  );
}
