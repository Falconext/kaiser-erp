import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Alert from './components/Alert'
import LoginPage from './pages/Login'
import { ProtectedRoute } from './app/ProtectedRoute'
import { ProduccionRoute } from './app/ProduccionRoute'
import AdminIndex from './pages/admin/Index'
import AdminLayout from './layouts/AdminLayout'
import ClientesPage from './pages/admin/Clientes'
import ReporteContabilidad from './pages/admin/contabilidad/Reporte'
import ReporteInformales from './pages/admin/contabilidad/ReporteInformales'
import ArqueoCaja from './pages/admin/contabilidad/Arqueo'
import CajaIndex from './pages/admin/caja/Index'
import ComprobantesPage from './pages/admin/facturacion/Comprobantes'
import ComprobantesInformales from './pages/admin/facturacion/ComprobantesInformales'
import Invoice from './pages/admin/facturacion/Nuevo'
import Pagos from './pages/admin/facturacion/Pagos'
import CuentasPorCobrar from './pages/admin/facturacion/CuentasPorCobrar'
import Cotizaciones from './pages/admin/cotizaciones/Cotizaciones'
import EmpresasIndex from './pages/admin/empresa/Index'
import PerfilIndex from './pages/admin/perfil/Index'
import KardexIndex from './pages/admin/kardex/Index'
import InventarioDashboard from './pages/admin/kardex/Dashboard'
import KardexProductos from './pages/admin/kardex/Productos'
import ProductoNuevo from './pages/admin/kardex/ProductoNuevo'
import KardexTraslados from './pages/admin/kardex/Traslados'
import Lotes from './pages/admin/kardex/Lotes'
import LibroControl from './pages/admin/kardex/LibroControl'
import SeriesGarantias from './pages/admin/kardex/SeriesGarantias'
import UsuariosIndex from './pages/admin/usuarios/Index'
import VendedoresView from './features/admin/users/VendedoresView'
import SedesIndex from './pages/admin/sedes/Index'
import NotificacionesIndex from './pages/admin/notificaciones/Index'
import PanelVentasView from './pages/admin/despacho/PanelVentasView'
import DespachoConfigPage from './pages/admin/despacho/DespachoConfigPage'
import RepartidoresView from './pages/admin/repartidores/RepartidoresView'
import FinanceDashboard from './pages/admin/finanzas/Dashboard'
import ComprasIndex from './pages/admin/compras/Index'
import ProveedoresPage from './pages/admin/compras/Proveedores'
import OrdenesCompraPage from './pages/admin/compras/OrdenesCompra'
import GuiaRemision from './pages/admin/guia-remision/GuiaRemision'
import LibroVentas from './pages/admin/sire/LibroVentas'
import LibroCompras from './pages/admin/sire/LibroCompras'
import SedeSelectionScreen from './features/auth/sede-selection/SedeSelectionScreen'
import ForgotPasswordPage from './pages/ForgotPassword'
import ResetPasswordPage from './pages/ResetPassword'
import ProduccionRecetasPage from './pages/admin/produccion/Recetas'
import ProduccionOrdenesPage from './pages/admin/produccion/Ordenes'
import ReservasPage from './pages/admin/reservas/ReservasPage'
import PedidosPage from './pages/admin/pedidos/Pedidos'

// ─── Kaiser ERP — rutas ──────────────────────────────────────────────────────
// Solo el ERP interno. Retiradas las rutas de tienda pública, panel SaaS
// (sistema/planes/módulos/resellers), reseller, marketing y e-commerce.
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <Alert />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
        <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
        {/* Redirects de compatibilidad para enlaces viejos */}
        <Route path="/forgot-password" element={<Navigate to="/recuperar-contrasena" replace />} />
        <Route path="/reset-password" element={<Navigate to="/restablecer-contrasena" replace />} />
        <Route path="/sede-seleccion" element={<SedeSelectionScreen />} />
        <Route
          path="/administrador"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminIndex />} />
          <Route path="perfil" element={<PerfilIndex />} />
          <Route path="empresas" element={<EmpresasIndex />} />
          <Route path="empresas/crear" element={<Navigate to="/administrador/empresas" replace />} />
          <Route path="empresas/editar/:id" element={<Navigate to="/administrador/empresas" replace />} />
          <Route path="clientes" element={<ClientesPage />} />

          {/* Compras */}
          <Route path="compras" element={<ComprasIndex />} />
          <Route path="compras/proveedores" element={<ProveedoresPage />} />
          <Route path="compras/ordenes" element={<OrdenesCompraPage />} />

          {/* Despacho / Guía de remisión */}
          <Route path="guia-remision" element={<GuiaRemision />} />
          <Route path="facturacion/guia-remision" element={<GuiaRemision />} />

          {/* Contabilidad / SIRE */}
          <Route path="contabilidad" element={<Navigate to="/administrador/contabilidad/reporte" replace />} />
          <Route path="contabilidad/reporte" element={<ReporteContabilidad />} />
          <Route path="contabilidad/reporte-informales" element={<ReporteInformales />} />
          <Route path="contabilidad/arqueo" element={<ArqueoCaja />} />
          <Route path="sire/ventas" element={<LibroVentas />} />
          <Route path="sire/compras" element={<LibroCompras />} />

          {/* Caja / Cobros */}
          <Route path="caja" element={<CajaIndex />} />
          <Route path="ventas/caja" element={<CajaIndex />} />
          <Route path="pagos" element={<Pagos />} />
          <Route path="pagos/cuentas-cobrar" element={<CuentasPorCobrar />} />
          <Route path="ventas/pagos" element={<Pagos />} />
          <Route path="ventas/pagos/cuentas-cobrar" element={<CuentasPorCobrar />} />

          {/* Facturación SUNAT */}
          <Route path="facturacion/comprobantes" element={<ComprobantesPage />} />
          <Route path="facturacion/comprobantes-informales" element={<ComprobantesInformales />} />
          <Route path="facturacion/nuevo" element={<Invoice />} />

          {/* Nota de Pedido — flujo comercial de Kaiser (estados + autorización) */}
          <Route path="pedidos" element={<PedidosPage />} />

          {/* Cotizaciones (flujo de venta principal B2B) */}
          <Route path="cotizaciones" element={<Cotizaciones />} />
          <Route path="cotizaciones/nuevo" element={<Invoice />} />
          <Route path="facturacion/cotizaciones" element={<Cotizaciones />} />
          <Route path="facturacion/cotizaciones/nuevo" element={<Invoice />} />

          {/* Finanzas */}
          <Route path="finanzas/dashboard" element={<FinanceDashboard />} />

          {/* Inventario / Kardex */}
          <Route path="kardex" element={<KardexIndex />} />
          <Route path="kardex/productos" element={<KardexProductos />} />
          <Route path="kardex/productos/nuevo" element={<ProductoNuevo />} />
          <Route path="kardex/productos/editar/:id" element={<ProductoNuevo />} />
          <Route path="kardex/traslados" element={<KardexTraslados />} />
          <Route path="kardex/lotes" element={<Lotes />} />
          <Route path="kardex/libro-control" element={<LibroControl />} />
          <Route path="kardex/series-garantias" element={<SeriesGarantias />} />
          <Route path="kardex/dashboard" element={<InventarioDashboard />} />
          <Route path="reservas" element={<ReservasPage />} />

          {/* Producción (BOM / órdenes) */}
          <Route
            path="produccion/recetas"
            element={
              <ProduccionRoute>
                <ProduccionRecetasPage />
              </ProduccionRoute>
            }
          />
          <Route
            path="produccion/ordenes"
            element={
              <ProduccionRoute>
                <ProduccionOrdenesPage />
              </ProduccionRoute>
            }
          />

          {/* Ventas / Despacho */}
          <Route path="ventas" element={<PanelVentasView />} />
          <Route path="despacho/config" element={<DespachoConfigPage />} />
          <Route path="repartidores" element={<RepartidoresView />} />

          {/* Usuarios / Sedes / Notificaciones */}
          <Route path="usuarios" element={<UsuariosIndex />} />
          <Route path="usuarios/vendedores" element={<VendedoresView />} />
          <Route path="usuarios/repartidores" element={<RepartidoresView />} />
          <Route path="usuarios/clientes" element={<ClientesPage />} />
          <Route path="usuarios/proveedores" element={<ProveedoresPage />} />
          <Route path="sedes" element={<SedesIndex />} />
          <Route path="notificaciones" element={<NotificacionesIndex />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
