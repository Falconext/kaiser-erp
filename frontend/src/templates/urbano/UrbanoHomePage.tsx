import { useNavigate } from 'react-router-dom';
import UrbanoCatalogoPage from './UrbanoCatalogoPage';
import UrbanoCartModal from '@/components/tienda/UrbanoCartModal';
import type { TemplateHomePageProps } from '@/templates/shared/types';

export default function UrbanoHomePage({
  tienda,
  slug,
  productos,
  allCategories,
  cp,
  carrito,
  setCarrito,
  setMostrarCarrito,
  mostrarCarrito,
  agregarAlCarrito,
  actualizarCantidad,
  diseno,
}: TemplateHomePageProps) {
  const navigate = useNavigate();
  const irACheckout = () => {
    if (slug === 'preview') {
      window.dispatchEvent(new CustomEvent('preview-nav', { detail: 'checkout' }));
      return;
    }
    navigate(`/tienda/${slug}/checkout`, { state: { carrito, tienda } });
  };

  return (
    <>
      <UrbanoCatalogoPage
        slug={slug}
        tienda={tienda}
        diseno={diseno}
        productos={productos}
        allCategories={allCategories}
        cp={cp}
        carritoSize={carrito.reduce((sum: number, item: any) => sum + Number(item.cantidad || 1), 0)}
        onOpenCart={() => setMostrarCarrito(!mostrarCarrito)}
        onAddToCart={agregarAlCarrito}
        searchQuery=""
        setSearchQuery={() => {}}
        onSearchSubmit={(event: any) => event?.preventDefault?.()}
      />
      <UrbanoCartModal
        isOpen={mostrarCarrito}
        onClose={() => setMostrarCarrito(false)}
        carrito={carrito}
        tienda={tienda}
        actualizarCantidad={actualizarCantidad}
        onCheckout={irACheckout}
        slug={slug}
        setCarrito={setCarrito}
      />
    </>
  );
}
