import Modal from "react-modal";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useThemeStore } from "@/zustand/theme";
import EmitidoContent, { IEmitidoContentProps } from "./EmitidoContent";

/**
 * Wrapper de modal (react-modal) alrededor de EmitidoContent.
 * Nota: el flujo de facturación ahora muestra EmitidoContent como transición
 * dentro del modal "Continuar pago" (POSCalculations). Este wrapper se conserva
 * por compatibilidad para cualquier otro flujo que necesite el modal aislado.
 */
const ModalReponseInvoice = (props: IEmitidoContentProps) => {
    const isMobile = useIsMobile();
    const { isDarkMode } = useThemeStore();

    const customStyles = {
        content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            width: isMobile ? '92vw' : '460px',
            maxWidth: '500px',
            maxHeight: '96vh',
            border: isDarkMode ? '1px solid #1e293b' : 'none',
            backgroundColor: isDarkMode ? '#0f172a' : '#fff',
            borderRadius: '24px',
            marginRight: '-50%',
            padding: '0px',
            zIndex: 999999,
            overflow: 'auto',
            transform: 'translate(-50%, -50%)',
            boxShadow: isDarkMode
                ? '0 25px 60px -15px rgba(0, 0, 0, 0.6)'
                : '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
        },
        overlay: {
            backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.5)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
        },
    };

    return (
        <Modal ariaHideApp={false} isOpen style={customStyles}>
            <EmitidoContent {...props} />
        </Modal>
    );
};

export default ModalReponseInvoice;
