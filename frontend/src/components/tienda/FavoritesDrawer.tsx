import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'framer-motion';

interface FavoritesDrawerProps {
  open: boolean;
  slug: string;
  cp: string;
  favoritos: any[];
  onClose: () => void;
  onProduct: (item: any) => void;
  onRemove: (id: any, slug: string) => void;
  title?: string;
}

export default function FavoritesDrawer({
  open,
  slug,
  cp,
  favoritos,
  onClose,
  onProduct,
  onRemove,
  title = 'Mis favoritos',
}: FavoritesDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] isolate">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-white text-gray-900 shadow-2xl flex flex-col border-l border-gray-200"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center border border-gray-100" style={{ backgroundColor: `${cp}15` }}>
                   <Icon icon="solar:heart-bold" width={20} style={{ color: cp }} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight text-gray-900">{title}</h2>
                  <p className="text-xs text-gray-500 font-medium">{favoritos.length} {favoritos.length === 1 ? 'artículo' : 'artículos'}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Icon icon="solar:close-circle-bold" width={24} />
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {favoritos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                  <Icon icon="solar:heart-linear" width={64} className="mb-4 text-gray-300" />
                  <p className="text-lg font-bold text-gray-700">Aún no tienes favoritos</p>
                  <p className="text-sm mt-1 text-gray-500">Toca el corazón en cualquier producto para guardarlo aquí.</p>
                </div>
              ) : (
                favoritos.map((item) => (
                  <div key={`${item.slug || slug}-${item.id}`} className="flex gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group hover:border-gray-200 hover:shadow-md transition-all">
                    <button 
                      onClick={() => onRemove(item.id, slug)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm border border-red-100 hover:bg-red-500 hover:text-white"
                      title="Quitar favorito"
                    >
                      <Icon icon="solar:trash-bin-trash-bold" width={14} />
                    </button>
                    
                    <button 
                      onClick={() => onProduct(item)}
                      className="w-20 h-20 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-100 p-1 cursor-pointer hover:border-gray-300 transition-colors"
                    >
                      {item.imagenUrl ? (
                        <img src={item.imagenUrl} alt={item.descripcion} className="w-full h-full object-contain mix-blend-multiply" />
                      ) : (
                        <Icon icon="solar:box-linear" className="text-gray-300 w-8 h-8" />
                      )}
                    </button>
                    
                    <div className="flex-1 flex flex-col justify-between items-start">
                      <button onClick={() => onProduct(item)} className="text-left w-full group-hover:text-gray-600 transition-colors">
                        <h3 className="text-sm font-bold leading-tight line-clamp-2 text-gray-800">
                          {item.descripcion}
                        </h3>
                      </button>
                      
                      <div className="flex items-center justify-between w-full mt-2">
                        <div className="flex items-baseline gap-2">
                          <span className="font-black text-gray-900 text-lg">S/ {Number(item.precioUnitario).toFixed(2)}</span>
                          {item.enOferta && Number(item.precioRegular) > Number(item.precioUnitario) && (
                            <span className="text-xs font-bold text-gray-400 line-through">S/ {Number(item.precioRegular).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
