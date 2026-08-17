import Modal from "@/components/Modal";
import { IPropsProducts } from "../ProductModalModel";
import { useProductModalViewModel } from "../useProductModalViewModel";
import { ProductFormContent } from "./ProductFormContent";

export const ProductModalView: React.FC<IPropsProducts> = (props) => {
    const vm = useProductModalViewModel(props);

    if (!vm.isOpenModal) return null;

    return (
        <Modal
            position="right"
            width={vm.isRestaurante ? "900px" : vm.isFarmacia ? "500px" : "1400px"}
            isOpenModal={vm.isOpenModal}
            height="auto"
            closeModal={vm.closeModal}
            title={vm.isEdit ? `Editar ${vm.labels.titulo}` : `Nuevo ${vm.labels.titulo}`}
            icon="solar:box-minimalistic-bold-duotone"
        >
            <ProductFormContent vm={vm} forceBarcode />
        </Modal>
    );
};
