/**
 * Shared prop interfaces for all template pages.
 * Every template receives these standardized shapes — no coupling to
 * individual router files.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Home Page (used by [slug].tsx)
// ─────────────────────────────────────────────────────────────────────────────
export interface TemplateHomePageProps {
  tienda: any;
  slug: string;
  productos: any[];
  allCategories: any[];
  cp: string;
  diseno: any;
  carrito: any[];
  setCarrito: (c: any[]) => void;
  mostrarCarrito: boolean;
  setMostrarCarrito: (v: boolean) => void;
  agregarAlCarrito: (p: any) => void;
  actualizarCantidad: (id: any, qty: number) => void;
  loading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalog Page (used by Catalogo.tsx)
// ─────────────────────────────────────────────────────────────────────────────
export interface TemplateCatalogoPageProps {
  // Store info
  tienda: any;
  slug: string;
  diseno: any;
  cp: string;
  navigate: (to: string) => void;

  // Products
  productos: any[];
  sortedProductos: any[];
  /** Lista completa sin filtros (para círculos de categoría y mega-menú del header). */
  allProductos?: any[];
  loading: boolean;
  total: number;
  page: number;
  cargarProductos: (p: number) => void;

  // Filters
  allCategorías: any[];
  allMarcas: any[];
  filteredMarcas: any[];
  selectedCategorías: string[];
  setSelectedCategorías: React.Dispatch<React.SetStateAction<string[]>>;
  selectedMarcas: string[];
  setSelectedMarcas: React.Dispatch<React.SetStateAction<string[]>>;
  priceRange: [number, number];
  setPriceRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  minPrice: number;
  maxPrice: number;
  sortBy: string;
  setSortBy: (v: string) => void;
  hasActiveFilters: boolean;
  toggleCategory: (name: string) => void;
  toggleBrand: (name: string) => void;

  // Search
  search: string;
  setSearch: (s: string) => void;

  // Cart
  carrito: any[];
  setCarrito: (c: any[]) => void;
  mostrarCarrito: boolean;
  setMostrarCarrito: (v: boolean) => void;
  actualizarCantidad: (id: any, qty: number) => void;
  irACheckout: () => void;
  handleAgregarProducto: (p: any) => void;
  agregarAlCarritoDirecto: (p: any, mods?: any[]) => void;

  // Mobile UI
  showMobileFilters: boolean;
  setShowMobileFilters: (v: boolean) => void;

  // Personalization modal
  showPersonalizarModal: boolean;
  setShowPersonalizarModal: (v: boolean) => void;
  productoAPersonalizar: any;
  setProductoAPersonalizar: (p: any) => void;
  modificadoresProducto: any[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkout Page (used by Checkout.tsx)
// ─────────────────────────────────────────────────────────────────────────────
export interface TemplateCheckoutPageProps {
  slug: string;
  tienda: any;
  diseno: any;
  cp: string;

  // Cart
  carritoState: any[];
  setCarritoState: (c: any[]) => void;
  updateQuantity: (id: any, qty: number) => void;
  removeItem: (id: any) => void;

  // Form
  formData: any;
  erroresForm: any;
  handleChange: (e: React.ChangeEvent<any>) => void;

  // Payment & shipping config
  configPago: any;
  configEnvio: any;

  // Sending state
  enviando: boolean;

  // Suggested products
  suggestedProducts: any[];
  search: string;
  setSearch: (s: string) => void;
  searchResults: any[];

  // Totals
  calcularSubtotal: () => number;
  calcularCostoEnvio: () => number;
  calcularTotal: () => number;

  // Free delivery
  freeDeliveryThreshold: number;
  freeDeliveryRemaining: number;
  freeDeliveryProgress: number;

  // Actions
  onSubmit: () => void;
  onAddToCart: (p: any) => void;

  // Modals
  showConfirmModal: boolean;
  setShowConfirmModal: (v: boolean) => void;
  showPaymentModal: boolean;
  pedidoCreado: any;
  setShowPaymentModal: (v: boolean) => void;
  enviarPedido: () => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seguimiento Page (used by SeguimientoPedido.tsx)
// ─────────────────────────────────────────────────────────────────────────────
export interface TemplateSeguimientoPageProps {
  slug: string;
  tienda: any;
  diseno: any;
  cp: string;
  codigo: string;
  setCodigo: (c: string) => void;
  pedido: any;
  loading: boolean;
  error: string;
  buscarPedido: (codigo: string) => Promise<void>;
  handleSubmit: (e: React.FormEvent) => void;
  compartirSeguimiento: () => void;
  copiedLink: boolean;
  getEstadoSeguimiento: (pedido: any) => string;
  getEstadoColor: (estado: string) => string;
  getEstadoLabel: (estado: string) => string;
  lastUpdated: Date | null;
  TERMINAL_STATES: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-export React for use in interface files
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
export type { React };
