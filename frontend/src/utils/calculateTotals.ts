export const calculateTotals = (products: any) => {
    const totals = products.reduce(
        (acc: any, item: any) => {
            const sale = parseFloat(item.sale) || 0;
            const igv = parseFloat(item.igv) || 0;
            const total = parseFloat(item.total) || 0;
            const unitPrice = parseFloat(item.precioUnitario) || 0;
            const quantity = parseFloat(item.cantidad) || 1;
            const discount = parseFloat(item.descuento) || 0;

            const discountAmount = unitPrice * quantity * (discount / 100);

            return {
                opGravada: acc.opGravada + sale,
                igv: acc.igv + igv,
                total: acc.total + total,
                discount: acc.discount + discountAmount,
                hasDiscount: acc.hasDiscount || discount > 0,
            };
        },
        {
            opGravada: 0,
            igv: 0,
            total: 0,
            discount: 0,
            hasDiscount: false,
        }
    );

    return {
        opGravada: totals.opGravada.toFixed(2),
        igv: totals.igv.toFixed(2),
        total: totals.total.toFixed(2),
        discount: totals.discount.toFixed(2),
        hasDiscount: totals.hasDiscount,
    };
};