import { Icon } from '@iconify/react';
import { buildStorePurchaseWhatsappUrl } from '@/utils/storeWhatsapp';

/**
 * Botón flotante de WhatsApp para la tienda virtual (todos los templates).
 * Se muestra abajo a la derecha y abre wa.me con el número de la tienda (dueño).
 * Si no hay número configurado, no se renderiza.
 */
export default function StoreWhatsAppButton({ tienda }: { tienda?: any }) {
  const nombre = tienda?.nombreComercial || tienda?.razonSocial || 'la tienda';
  const numero = tienda?.whatsappTienda ?? tienda?.diseno?.whatsappTienda;
  const href = buildStorePurchaseWhatsappUrl(numero, `Hola, vengo de ${nombre} y quisiera más información.`);

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      title="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-900/30 transition-transform hover:scale-110 active:scale-95"
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-40" aria-hidden />
      <Icon icon="ic:baseline-whatsapp" width={30} className="relative" />
    </a>
  );
}
