import AutopartesCheckout from '@/pages/tienda/AutopartesCheckout';
import type { TemplateCheckoutPageProps } from '@/templates/shared/types';
import PaymentConfirmationModal from '@/components/tienda/PaymentConfirmationModal';
import ConfirmOrderModal from '@/components/tienda/ConfirmOrderModal';

export default function AutopartesCheckoutPage(props: TemplateCheckoutPageProps) {
  return (
    <>
      <AutopartesCheckout {...props} carrito={props.carritoState} />
      {props.pedidoCreado && (
        <PaymentConfirmationModal
          isOpen={props.showPaymentModal}
          onClose={() => {
            props.setShowPaymentModal(false);
            window.location.href = `/tienda/${props.slug}/seguimiento?codigo=${props.pedidoCreado.codigoSeguimiento}`;
          }}
          orderData={{
            id: props.pedidoCreado.id,
            codigoSeguimiento: props.pedidoCreado.codigoSeguimiento,
            total: props.pedidoCreado.total || props.calcularTotal(),
            medioPago: props.formData.medioPago,
            tipoEntrega: props.formData.tipoEntrega,
            clienteNombre: props.formData.clienteNombre,
          }}
          paymentConfig={
            props.configPago
              ? {
                  yapeQR: props.configPago.yapeQR || props.configPago.yapeQrUrl || undefined,
                  plinQR: props.configPago.plinQR || props.configPago.plinQrUrl || undefined,
                  yapeNumero: props.configPago.yapeNumero || undefined,
                  plinNumero: props.configPago.plinNumero || undefined,
                  whatsappTienda: props.configPago?.whatsappTienda ?? props.tienda?.whatsappTienda ?? props.tienda?.diseno?.whatsappTienda,
                }
              : undefined
          }
          storeSlug={props.slug || ''}
        />
      )}
      <ConfirmOrderModal
        isOpen={props.showConfirmModal}
        onClose={() => props.setShowConfirmModal(false)}
        onConfirm={props.enviarPedido}
        total={props.calcularTotal()}
        loading={props.enviando}
        tiendaColor={props.tienda?.diseno?.colorPrimario || '#D92D20'}
      />
    </>
  );
}
