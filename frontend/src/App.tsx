import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Alert from './components/Alert'
import LoginPage from './pages/Login'
import { ProtectedRoute } from './app/ProtectedRoute'
import { ProduccionRoute } from './app/ProduccionRoute'
import { PermisoRoute } from './app/PermisoRoute'
import AdminIndex from './pages/admin/Index'
import AdminLayout from './layouts/AdminLayout'
import ClientesPage from './pages/admin/Clientes'
import MisComisionesPage from './pages/admin/mis-comisiones/MisComisionesPage'
import ReporteContabilidad from './pages/admin/contabilidad/Reporte'
import ReporteInformales from './pages/admin/contabilidad/ReporteInformales'
import ArqueoCaja from './pages/admin/contabilidad/Arqueo'
import LibroDiario from './pages/admin/contabilidad/LibroDiario'
import ConfiguracionContable from './pages/admin/contabilidad/ConfiguracionContable'
import CajaIndex from './pages/admin/caja/Index'
import ComprobantesPage from './pages/admin/facturacion/Comprobantes'
import ComprobantesInformales from './pages/admin/facturacion/ComprobantesInformales'
import Invoice from './pages/admin/facturacion/Nuevo'
import Pagos from './pages/admin/facturacion/Pagos'
import CuentasPorCobrar from './pages/admin/facturacion/CuentasPorCobrar'
import Cotizaciones from './pages/admin/cotizaciones/Cotizaciones'
import EmpresasIndex from './pages/admin/empresa/Index'
import MisDatosIndex from './pages/admin/mis-datos/Index'
import PerfilIndex from './pages/admin/perfil/Index'
import KardexIndex from './pages/admin/kardex/Index'
import InventarioDashboard from './pages/admin/kardex/Dashboard'
import KardexProductos from './pages/admin/kardex/Productos'
import ProductoNuevo from './pages/admin/kardex/ProductoNuevo'
import KardexTraslados from './pages/admin/kardex/Traslados'
import KardexTrazabilidad from './pages/admin/kardex/Trazabilidad'
import KardexConsolidado from './pages/admin/kardex/Consolidado'
import Lotes from './pages/admin/kardex/Lotes'
import LibroControl from './pages/admin/kardex/LibroControl'
import SeriesGarantias from './pages/admin/kardex/SeriesGarantias'
import UsuariosIndex from './pages/admin/usuarios/Index'
import VendedoresView from './features/admin/users/VendedoresView'
import ReportesVentasView from './features/admin/reportes/ReportesVentasView'
import SedesIndex from './pages/admin/sedes/Index'
import NotificacionesIndex from './pages/admin/notificaciones/Index'
import PanelVentasView from './pages/admin/despacho/PanelVentasView'
import DespachoConfigPage from './pages/admin/despacho/DespachoConfigPage'
import RepartidoresView from './pages/admin/repartidores/RepartidoresView'
import FinanceDashboard from './pages/admin/finanzas/Dashboard'
import ComprasIndex from './pages/admin/compras/Index'
import ProveedoresPage from './pages/admin/compras/Proveedores'
import OrdenesCompraPage from './pages/admin/compras/OrdenesCompra'
import ImportacionesPage from './pages/admin/compras/Importaciones'
import ImportacionDetallePage from './pages/admin/compras/ImportacionDetalle'
import SolicitudesCompraView from './features/admin/compras/solicitudes/SolicitudesView'
import SolicitudDetalleView from './features/admin/compras/solicitudes/SolicitudDetalleView'
import GuiaRemision from './pages/admin/guia-remision/GuiaRemision'
import LibroVentas from './pages/admin/sire/LibroVentas'
import LibroCompras from './pages/admin/sire/LibroCompras'
import SedeSelectionScreen from './features/auth/sede-selection/SedeSelectionScreen'
import ForgotPasswordPage from './pages/ForgotPassword'
import ResetPasswordPage from './pages/ResetPassword'
import ProduccionRecetasPage from './pages/admin/produccion/Recetas'
import ProduccionOrdenesPage from './pages/admin/produccion/Ordenes'
import ProduccionGenealogiaPage from './pages/admin/produccion/Genealogia'
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
          <Route path="mis-datos" element={<MisDatosIndex />} />
          <Route path="empresas" element={<EmpresasIndex />} />
          <Route path="empresas/crear" element={<Navigate to="/administrador/empresas" replace />} />
          <Route path="empresas/editar/:id" element={<Navigate to="/administrador/empresas" replace />} />
          <Route path="clientes" element={<ClientesPage />} />

          {/* Compras */}
          <Route path="compras" element={<PermisoRoute permisos={['compras']}><ComprasIndex /></PermisoRoute>} />
          <Route path="compras/proveedores" element={<PermisoRoute permisos={['compras']}><ProveedoresPage /></PermisoRoute>} />
          <Route path="compras/ordenes" element={<PermisoRoute permisos={['compras']}><OrdenesCompraPage /></PermisoRoute>} />
          <Route path="compras/importaciones" element={<PermisoRoute permisos={['compras']}><ImportacionesPage /></PermisoRoute>} />
          <Route path="compras/importaciones/:id" element={<PermisoRoute permisos={['compras']}><ImportacionDetallePage /></PermisoRoute>} />
          <Route path="compras/solicitudes" element={<PermisoRoute permisos={['compras']}><SolicitudesCompraView /></PermisoRoute>} />
          <Route path="compras/solicitudes/:id" element={<PermisoRoute permisos={['compras']}><SolicitudDetalleView /></PermisoRoute>} />

          {/* Despacho / Guía de remisión */}
          <Route path="guia-remision" element={<GuiaRemision />} />
          <Route path="facturacion/guia-remision" element={<GuiaRemision />} />

          {/* Contabilidad / SIRE */}
          <Route path="contabilidad" element={<Navigate to="/administrador/contabilidad/reporte" replace />} />
          <Route path="contabilidad/reporte" element={<PermisoRoute permisos={['contabilidad']}><ReporteContabilidad /></PermisoRoute>} />
          <Route path="contabilidad/reporte-informales" element={<PermisoRoute permisos={['contabilidad']}><ReporteInformales /></PermisoRoute>} />
          <Route path="contabilidad/arqueo" element={<PermisoRoute permisos={['contabilidad']}><ArqueoCaja /></PermisoRoute>} />
          <Route path="contabilidad/libro-diario" element={<PermisoRoute permisos={['contabilidad']}><LibroDiario /></PermisoRoute>} />
          <Route path="contabilidad/configuracion" element={<PermisoRoute permisos={['contabilidad']}><ConfiguracionContable /></PermisoRoute>} />
          <Route path="sire/ventas" element={<PermisoRoute permisos={['contabilidad']}><LibroVentas /></PermisoRoute>} />
          <Route path="sire/compras" element={<PermisoRoute permisos={['contabilidad']}><LibroCompras /></PermisoRoute>} />

          {/* Caja / Cobros */}
          <Route path="caja" element={<PermisoRoute permisos={['caja']}><CajaIndex /></PermisoRoute>} />
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
          <Route path="finanzas/dashboard" element={<PermisoRoute permisos={['reportes']}><FinanceDashboard /></PermisoRoute>} />
          <Route path="reportes/ventas" element={<PermisoRoute permisos={['reportes']}><ReportesVentasView /></PermisoRoute>} />
          <Route path="mis-comisiones" element={<MisComisionesPage />} />

          {/* Inventario / Kardex */}
          <Route path="kardex" element={<KardexIndex />} />
          <Route path="kardex/productos" element={<KardexProductos />} />
          <Route path="kardex/productos/nuevo" element={<ProductoNuevo />} />
          <Route path="kardex/productos/editar/:id" element={<ProductoNuevo />} />
          <Route path="kardex/traslados" element={<KardexTraslados />} />
          <Route path="kardex/trazabilidad" element={<PermisoRoute permisos={['kardex']}><KardexTrazabilidad /></PermisoRoute>} />
          <Route path="kardex/consolidado" element={<PermisoRoute permisos={['kardex']}><KardexConsolidado /></PermisoRoute>} />
          <Route path="kardex/lotes" element={<Lotes />} />
          <Route path="kardex/libro-control" element={<LibroControl />} />
          <Route path="kardex/series-garantias" element={<SeriesGarantias />} />
          <Route path="kardex/dashboard" element={<InventarioDashboard />} />
          <Route path="reservas" element={<ReservasPage />} />

          {/* Producción (BOM / órdenes) */}
          {/* ProduccionRoute valida el rubro; PermisoRoute, el permiso del
              usuario — `produccion.controller` exige @RequierePermiso('produccion'). */}
          <Route
            path="produccion/recetas"
            element={
              <ProduccionRoute>
                <PermisoRoute permisos={['produccion']}>
                  <ProduccionRecetasPage />
                </PermisoRoute>
              </ProduccionRoute>
            }
          />
            <Route
              path="produccion/genealogia"
              element={
                <ProduccionRoute>
                  {/* 'kardex' además de 'produccion': un vendedor al que un cliente
                      le pregunta de qué está hecha una malla tiene que poder
                      contestarlo sin pedirle el favor a planta. Es una lectura. */}
                  <PermisoRoute permisos={['produccion', 'kardex']}>
                    <ProduccionGenealogiaPage />
                  </PermisoRoute>
                </ProduccionRoute>
              }
            />
          <Route
            path="produccion/ordenes"
            element={
              <ProduccionRoute>
                <PermisoRoute permisos={['produccion']}>
                  <ProduccionOrdenesPage />
                </PermisoRoute>
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
