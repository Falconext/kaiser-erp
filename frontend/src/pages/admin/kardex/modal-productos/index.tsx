import React from 'react';
import { IPropsProducts } from '@/features/admin/kardex/products/ProductModalModel';
import { ProductModalView } from '@/features/admin/kardex/products/components/ProductModalView';

const ModalProduct: React.FC<IPropsProducts> = (props) => {
    return <ProductModalView {...props} />;
};

export default ModalProduct;