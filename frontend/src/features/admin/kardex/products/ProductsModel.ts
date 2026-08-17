import { IFormProduct, IProduct } from "@/interfaces/products";

export type { IFormProduct, IProduct };

export interface IProductsViewModelState {
    currentPage: number;
    itemsPerPage: number;
    searchClient: string; // Used for "Buscar nombre y código" input
    // Modals
    isOpenModal: boolean;
    isOpenModalCatalog: boolean;
    isOpenModalCategory: boolean;
    isOpenModalBrands: boolean;
    isOpenModalConfirm: boolean;
    isOpenModalDelete: boolean;
    isOpenModalDeleteAll: boolean;

    // Selection/Editing
    selectedDeleteId: number | null;
    formValues: IFormProduct;
    isEdit: boolean;
    errors: {
        codigo: string;
        descripcion: string;
        categoriaId: number;
        description: string;
        precioUnitario: string;
        stock: string;
        unidadMedida: string;
    };

    // UI State
    isHoveredExp: boolean;
    isHoveredImp: boolean;
    openAccionesId: number | null;
    anchorEl: HTMLElement | null;
    uploadTarget: { id: number; tipo: 'principal' } | null;
    uploading: boolean;
    visibleColumns: string[];
    showColumnFilter: boolean;
    vistaActual: 'cards' | 'tabla' | 'lista';
    marcaIdFilter: number | undefined;
    soloStockBajo: boolean;
}

export const initialProductForm: IFormProduct = {
    productoId: 0,
    descripcion: "",
    categoriaId: "",
    precioUnitario: 0,
    categoriaNombre: "",
    afectacionNombre: "Gravado – Operación Onerosa",
    tipoAfectacionIGV: "10",
    moneda: "PEN",
    stock: 0,
    localizacion: '',
    porcentajeVenta: 100,
    porcentajeProvision: 0,
    stockMinimo: 0,
    stockMaximo: 0,
    visibleEnSede: true,
    vendibleEnSede: true,
    disponibleParaVenta: true,
    precioUnitarioSede: null,
    precioOfertaSede: null,
    ubicacionSede: '',
    codigo: "",
    unidadMedidaId: 1,
    unidadMedidaNombre: "UNIDAD",
    marcaId: null,
    marcaNombre: "",
    estado: "",
    costoPromedio: 0,
    costoUnitario: 0,
    costoFijo: 0,
    comisionPorVenta: 0,
    comisionPorcentaje: 0,
    // Campos Farmacia
    principioActivo: "",
    concentracion: "",
    presentacion: "",
    laboratorio: "",
    // Campos Bodega/Supermercado
    codigoBarras: "",
    codigosBarrasExtra: [],
    codProdSunat: "",
    unidadCompra: "",
    unidadVenta: "",
    factorConversion: 1,
    // Campos Ofertas
    precioOferta: 0,
    fechaInicioOferta: "",
    fechaFinOferta: "",
    // Precios por Mayorista
    preciosMayorista: [],
    atributosTecnicos: {},
    opcionesAtributos: [],
    variantesConfig: []
};

// Mapea un producto (fila del listado o detalle) al shape del formulario de
// edición. Compartido por el modal (handleGetProduct) y la página de editar.
export const buildEditFormValues = (originalProduct: any): IFormProduct => {
    const sedeStockConfig = (originalProduct as any).sedeStockConfig || {};
    return {
        ...initialProductForm,
        ...originalProduct,
        productoId: originalProduct.id,
        stock: Number((originalProduct as any).stockBase ?? originalProduct.stock ?? 0),
        unidadMedidaId: originalProduct.unidadMedida?.id || originalProduct.unidadMedidaId,
        unidadMedidaNombre: originalProduct.unidadMedida?.nombre,
        categoriaId: originalProduct.categoria?.id || originalProduct.categoriaId,
        categoriaNombre: originalProduct.categoria?.nombre,
        marcaId: (originalProduct as any).marca?.id || (originalProduct as any).marcaId,
        marcaNombre: (originalProduct as any).marca?.nombre,
        precioUnitario: Number(originalProduct.precioUnitario),
        costoUnitario: Number(originalProduct.costoUnitario || originalProduct.costoPromedio || 0),
        costoPromedio: Number(originalProduct.costoPromedio || 0),
        costoFijo: Number((originalProduct as any).costoFijo || 0),
        comisionPorVenta: Number((originalProduct as any).comisionPorVenta || 0),
        comisionPorcentaje: Number((originalProduct as any).comisionPorcentaje || 0),
        stockMinimo: Number(sedeStockConfig.stockMinimo ?? originalProduct.stockMinimo ?? 0),
        stockMaximo: Number(sedeStockConfig.stockMaximo ?? originalProduct.stockMaximo ?? 0),
        visibleEnSede: sedeStockConfig.visibleEnSede ?? true,
        vendibleEnSede: sedeStockConfig.vendibleEnSede ?? true,
        precioUnitarioSede: sedeStockConfig.precioUnitarioSede ?? null,
        precioOfertaSede: sedeStockConfig.precioOfertaSede ?? null,
        ubicacionSede: sedeStockConfig.ubicacionSede ?? '',
        imagenUrl: (originalProduct as any)?.imagenUrl || '',
        imagenUrlDisplay: (originalProduct as any)?.imagenUrlDisplay || (originalProduct as any)?.imagenUrl || '',
        principioActivo: (originalProduct as any).principioActivo || '',
        concentracion: (originalProduct as any).concentracion || '',
        presentacion: (originalProduct as any).presentacion || '',
        laboratorio: (originalProduct as any).laboratorio || '',
        unidadCompra: (originalProduct as any).unidadCompra || '',
        unidadVenta: (originalProduct as any).unidadVenta || '',
        factorConversion: Number((originalProduct as any).factorConversion || 1),
        localizacion: originalProduct.localizacion || '',
        porcentajeVenta: Number((originalProduct as any).porcentajeVenta ?? 100),
        porcentajeProvision: Number((originalProduct as any).porcentajeProvision ?? 0),
        preciosMayorista: Array.isArray((originalProduct as any).preciosMayorista)
            ? (originalProduct as any).preciosMayorista
            : [],
        atributosTecnicos: (originalProduct as any).atributosTecnicos || {},
        opcionesAtributos: Array.isArray((originalProduct as any).opcionesAtributos)
            ? (originalProduct as any).opcionesAtributos
            : [],
        valoresAtributos: (originalProduct as any).valoresAtributos || {},
        variantes: Array.isArray((originalProduct as any).variantes)
            ? (originalProduct as any).variantes
            : [],
        variantesConfig: Array.isArray((originalProduct as any).variantes)
            ? (originalProduct as any).variantes.map((variante: any) => ({
                id: variante.id,
                valoresAtributos: variante.valoresAtributos || {},
                codigo: variante.codigo || '',
                precioUnitario: Number(variante.precioUnitario || originalProduct.precioUnitario || 0),
                stock: Number(variante.stock || 0),
                imagenUrl: variante.imagenUrl || '',
                imagenUrlDisplay: variante.imagenUrlDisplay || variante.imagenUrl || '',
                codigoBarras: variante.codigoBarras || '',
                estado: variante.estado || 'ACTIVO',
            }))
            : [],
    } as IFormProduct;
};
