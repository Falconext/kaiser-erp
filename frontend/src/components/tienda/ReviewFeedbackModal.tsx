import { Icon } from '@iconify/react';

interface ReviewFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  color?: string;
}

export default function ReviewFeedbackModal({ isOpen, onClose, color = '#6A6CFF' }: ReviewFeedbackModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="relative px-6 pb-6 pt-8 text-center">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <Icon icon="solar:close-circle-bold" width={20} />
          </button>

          <div
            className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${color}, #111827)` }}
          >
            <Icon icon="solar:star-fall-bold-duotone" width={38} />
          </div>

          <h3 className="text-2xl font-black text-gray-900">¡Gracias por tu reseña!</h3>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-gray-500">
            Tu comentario fue enviado correctamente. La tienda lo revisará antes de publicarlo.
          </p>

          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-left">
            <div className="flex gap-3">
              <Icon icon="solar:shield-check-bold-duotone" width={20} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs font-semibold leading-5 text-amber-700">
                Esto ayuda a mantener reseñas reales, útiles y confiables para otros clientes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl text-sm font-black text-white transition hover:opacity-90"
            style={{ background: color }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
