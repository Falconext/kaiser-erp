'use client';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useEffect } from 'react';
import useAlertStore from '@/zustand/alert';
import { slideLeft } from '@/lib/motion/presets';
import { useReducedMotionPreference } from '@/lib/motion/reducedMotion';

interface IAlertProps {
   id: number;
   title?: string;
   message: string | string[] | unknown;
   type: string;
}

const Toast = ({ id, title, message, type }: IAlertProps) => {
   const { removeAlert } = useAlertStore();
   const reduceMotion = useReducedMotionPreference();

   const handleClose = () => {
      removeAlert(id);
   };

   useEffect(() => {
      if (type === 'success' || type === 'error' || type === 'warning') {
          const timer = setTimeout(() => {
              removeAlert(id);
          }, 4000);
          return () => clearTimeout(timer);
      }
   }, [id, removeAlert, type]);

   // Configuración de estilos según el tipo (mismos colores SOLO para iconos)
  const getTypeStyles = () => {
     switch (type) {
        case 'success':
           return {
              icon: 'mdi:check-circle',
              iconColor: 'text-green-500',
              ringColor: 'ring-green-500/30',
              titleColor: 'text-white',
              messageColor: 'text-gray-300'
           };
        case 'error':
           return {
              icon: 'mdi:alert-circle',
              iconColor: 'text-red-500',
              ringColor: 'ring-red-500/30',
              titleColor: 'text-white',
              messageColor: 'text-gray-300'
           };
        case 'warning':
           return {
              icon: 'mdi:alert',
              iconColor: 'text-yellow-500',
              ringColor: 'ring-yellow-500/30',
              titleColor: 'text-white',
              messageColor: 'text-gray-300'
           };
        case 'notification':
        default:
           return {
              icon: 'mdi:information',
              iconColor: 'text-blue-500',
              ringColor: 'ring-blue-500/30',
              titleColor: 'text-white',
              messageColor: 'text-gray-300'
           };
     }
  };

   const styles = getTypeStyles();

   const normalizedMessage =
      typeof message === 'string'
         ? message
         : Array.isArray(message)
         ? message.filter((item): item is string => typeof item === 'string')
         : 'Se produjo un mensaje no válido.';

   return (
     <motion.div
        layout
        variants={slideLeft}
        initial="initial"
        animate={reduceMotion ? { opacity: 1 } : "animate"}
        exit={reduceMotion ? { opacity: 0 } : "exit"}
        className={`rounded-2xl shadow-xl p-4 pr-5 min-w-[320px] max-w-md mb-3 bg-[#121212]/95 backdrop-blur border border-white/5`}
     >
        <div className="flex items-start gap-3">
           {/* Icono */}
           <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-white/5 ${styles.ringColor} ring-4`}>
              <Icon icon={styles.icon} className={`w-6 h-6 ${styles.iconColor}`} />
           </div>

           {/* Contenido */}
           <div className="flex-1 min-w-0">
              <h3 className={`font-bold text-base ${styles.titleColor} mb-1`}>
                 {title}
              </h3>
              <div className={`text-sm ${styles.messageColor}`}>
                 {typeof normalizedMessage === 'string' ? (
                    <p>{normalizedMessage}</p>
                 ) : (
                    <ul className="list-disc list-inside space-y-1">
                       {normalizedMessage.map((text, index) => (
                          <li key={index}>{text}</li>
                       ))}
                    </ul>
                 )}
              </div>
           </div>

           {/* Botón cerrar */}
           <button
              onClick={handleClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-200 transition-colors"
           >
              <Icon icon="mdi:close" className="w-5 h-5" />
           </button>
        </div>
     </motion.div>
  );
};

export default Toast;
