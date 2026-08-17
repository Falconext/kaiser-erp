import React, { useCallback } from 'react'
import Button from '../Button';
import useEscapeKey from '@/hooks/useEscapeKey';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { fadeIn, scaleIn } from '@/lib/motion/presets';
import { useReducedMotionPreference } from '@/lib/motion/reducedMotion';

type Props = {
  isOpenModal: boolean;
  setIsOpenModal: (v: boolean) => void;
  confirmSubmit: () => void;
  title: string;
  information: string;
  children?: React.ReactNode;
  confirmText?: string;
  confirmColor?: string;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
};

export default function ModalConfirm({
  isOpenModal,
  setIsOpenModal,
  confirmSubmit,
  title,
  information,
  children,
  confirmText = 'Confirmar',
  confirmColor = 'danger',
  confirmDisabled = false,
  confirmLoading = false,
}: Props) {
  const reduceMotion = useReducedMotionPreference();
  const handleClose = useCallback(() => {
    if (isOpenModal) {
      setIsOpenModal(false);
    }
  }, [isOpenModal, setIsOpenModal]);

  useEscapeKey(() => handleClose(), isOpenModal);

  const content = (
    <AnimatePresence>
      {isOpenModal && (
        <motion.div
          className="fixed inset-0 z-[9999999] bg-black/40 grid place-items-center"
          variants={fadeIn}
          initial="initial"
          animate={reduceMotion ? { opacity: 1 } : 'animate'}
          exit={reduceMotion ? { opacity: 0 } : 'exit'}
        >
      <motion.div
        className="bg-white dark:bg-[#111827] rounded-xl p-6 w-[520px] max-w-[95vw] shadow-2xl border dark:border-transparent"
        variants={scaleIn}
        initial="initial"
        animate={reduceMotion ? { opacity: 1 } : 'animate'}
        exit={reduceMotion ? { opacity: 0 } : 'exit'}
      >
        <h3 className="text-lg font-semibold mb-2 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{information}</p>
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
        <div className="mt-6 text-right space-x-2 flex justify-end">
          <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
            <Button outline className="px-4 py-2 rounded" onClick={() => setIsOpenModal(false)}>Cancelar</Button>
          </motion.div>
          
          <Button
            color={confirmColor}
            onClick={confirmSubmit}
            disabled={confirmDisabled || confirmLoading}
          >
            {confirmLoading ? 'Procesando...' : confirmText}
          </Button>
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
