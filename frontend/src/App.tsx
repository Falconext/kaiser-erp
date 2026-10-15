import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Alert from './components/Alert'
import LoginPage from './pages/Login'
import { ProtectedRoute } from './app/ProtectedRoute'
import { ProduccionRoute } from './app/ProduccionRoute'
import { PermisoRoute } from './app/PermisoRoute'
import AdminIndex from './pages/admin/Index'
import AdminLayout from './layouts/AdminLayout'
import ClientesPage from './pages/admin/Clientes'
import CreditoClientesPage from './pages/admin/credito/Credito'
import ListasPrecioPage from './pages/admin/listas-precio/ListasPrecio'
import DespachosPendientesPage from './pages/admin/despachos/DespachosPendientes'
import ProgramacionDespachoPage from './pages/admin/despachos/ProgramacionDespacho'
import MiDiaPage from './pages/admin/mi-dia/MiDia'
import PorQuePerdemosPage from './pages/admin/cotizaciones/PorQuePerdemos'
import MisComisionesPage from './pages/admin/mis-comisiones/MisComisionesPage'
import ReporteContabilidad from './pages/admin/contabilidad/Reporte'
import ReporteInformales from './pages/admin/contabilidad/ReporteInformales'
import ArqueoCaja from './pages/admin/contabilidad/Arqueo'
import LibroDiario from './pages/admin/contabilidad/LibroDiario'
import PlanillaContable from './pages/admin/contabilidad/Planilla'
import LibroMayor from './pages/admin/contabilidad/LibroMayor'
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
import MapaConsumoView from './features/admin/reportes/MapaConsumoView'
import SedesIndex from './pages/admin/sedes/Index'
import NotificacionesIndex from './pages/admin/notificaciones/Index'
import PanelVentasView from './pages/admin/despacho/PanelVentasView'
import CouriersView from './features/admin/despacho/couriers/CouriersView'
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
import ProduccionMermasPage from './pages/admin/produccion/Mermas'
import DevolucionesPage from './pages/admin/kardex/Devoluciones'
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
          {/* ── Permisos de ruta ──────────────────────────────────────────────
              Cada pantalla lleva el permiso de su módulo, el mismo que decide
              si aparece en el menú: si no está en tu menú, tampoco se llega
              escribiendo la URL. Antes solo lo llevaban Compras, Contabilidad,
              Producción y parte de Inventario, así que almacén podía abrir
              Cotizaciones a mano y encontrarse botones que el backend le iba a
              negar.

              Algunas aceptan VARIOS permisos, y no por comodidad: contabilidad
              lleva el inventario valorizado sin tener el permiso de almacén, y
              quien despacha necesita los couriers sin ser del área comercial.

              Quedan A PROPÓSITO sin permiso las pantallas de LO MÍO —Mi día,
              mis comisiones, mi perfil, mis datos, notificaciones—, que el
              backend ya acota por el id del token, y tres lecturas que se
              decidieron abiertas en su momento: el panel de ventas (las ventas
              de la empresa se comparten: el ranking de vendedores vive de eso),
              el crédito del cliente y los despachos pendientes. */}
          <Route index element={<AdminIndex />} />
          <Route path="perfil" element={<PerfilIndex />} />
          <Route path="mis-datos" element={<MisDatosIndex />} />
          <Route path="empresas" element={<PermisoRoute permisos={['usuarios']}><EmpresasIndex /></PermisoRoute>} />
          <Route path="empresas/crear" element={<Navigate to="/administrador/empresas" replace />} />
          <Route path="empresas/editar/:id" element={<Navigate to="/administrador/empresas" replace />} />
          <Route path="clientes" element={<PermisoRoute permisos={['clientes']}><ClientesPage /></PermisoRoute>} />
          {/* Crédito de clientes. La LECTURA queda abierta a cualquier autenticado:
              el vendedor que va a tomar un pedido es quien necesita saber si el
              cliente tiene cupo. El límite se pone en la ficha del cliente, que
              sí exige el permiso de clientes. */}
          {/* "Mi día" del vendedor. Sin PermisoRoute a propósito: cada quien ve
              LO SUYO y eso no hay que autorizarlo — el backend se acota por el id
              del token, no por un parámetro. */}
          <Route path="mi-dia" element={<MiDiaPage />} />
          <Route path="facturacion/cotizaciones/por-que-perdemos" element={<PermisoRoute permisos={['cotizaciones']}><PorQuePerdemosPage /></PermisoRoute>} />
          <Route path="clientes/credito" element={<CreditoClientesPage />} />
          <Route path="clientes/listas-precio" element={<PermisoRoute permisos={['clientes']}><ListasPrecioPage /></PermisoRoute>} />
          {/* Despachos pendientes. Lectura abierta: el vendedor al que un cliente
              llama preguntando por su mercadería tiene que poder contestar sin
              pedirle el favor a almacén. */}
          <Route path="facturacion/guia-remision/pendientes" element={<DespachosPendientesPage />} />
          <Route
            path="facturacion/guia-remision/programacion"
            element={
              <PermisoRoute permisos={['guias-remision', 'kardex:escribir']}>
                <ProgramacionDespachoPage />
              </PermisoRoute>
            }
          />

          {/* Compras */}
          <Route path="compras" element={<PermisoRoute permisos={['compras']}><ComprasIndex /></PermisoRoute>} />
          <Route path="compras/proveedores" element={<PermisoRoute permisos={['compras']}><ProveedoresPage /></PermisoRoute>} />
          <Route path="compras/ordenes" element={<PermisoRoute permisos={['compras']}><OrdenesCompraPage /></PermisoRoute>} />
          <Route path="compras/importaciones" element={<PermisoRoute permisos={['compras']}><ImportacionesPage /></PermisoRoute>} />
          <Route path="compras/importaciones/:id" element={<PermisoRoute permisos={['compras']}><ImportacionDetallePage /></PermisoRoute>} />
          <Route path="compras/solicitudes" element={<PermisoRoute permisos={['compras']}><SolicitudesCompraView /></PermisoRoute>} />
          <Route path="compras/solicitudes/:id" element={<PermisoRoute permisos={['compras']}><SolicitudDetalleView /></PermisoRoute>} />

          {/* Despacho / Guía de remisión */}
          <Route path="guia-remision" element={<PermisoRoute permisos={['guias-remision']}><GuiaRemision /></PermisoRoute>} />
          <Route path="facturacion/guia-remision" element={<PermisoRoute permisos={['guias-remision']}><GuiaRemision /></PermisoRoute>} />

          {/* Contabilidad / SIRE */}
          <Route path="contabilidad" element={<Navigate to="/administrador/contabilidad/reporte" replace />} />
          <Route path="contabilidad/reporte" element={<PermisoRoute permisos={['contabilidad']}><ReporteContabilidad /></PermisoRoute>} />
          <Route path="contabilidad/reporte-informales" element={<PermisoRoute permisos={['contabilidad']}><ReporteInformales /></PermisoRoute>} />
          <Route path="contabilidad/arqueo" element={<PermisoRoute permisos={['contabilidad']}><ArqueoCaja /></PermisoRoute>} />
          <Route path="contabilidad/libro-diario" element={<PermisoRoute permisos={['contabilidad']}><LibroDiario /></PermisoRoute>} />
          <Route path="contabilidad/libro-mayor" element={<PermisoRoute permisos={['contabilidad']}><LibroMayor /></PermisoRoute>} />
          <Route path="contabilidad/planilla" element={<PermisoRoute permisos={['contabilidad']}><PlanillaContable /></PermisoRoute>} />
          <Route path="contabilidad/configuracion" element={<PermisoRoute permisos={['contabilidad']}><ConfiguracionContable /></PermisoRoute>} />
          <Route path="sire/ventas" element={<PermisoRoute permisos={['contabilidad']}><LibroVentas /></PermisoRoute>} />
          <Route path="sire/compras" element={<PermisoRoute permisos={['contabilidad']}><LibroCompras /></PermisoRoute>} />

          {/* Caja / Cobros */}
          <Route path="caja" element={<PermisoRoute permisos={['caja']}><CajaIndex /></PermisoRoute>} />
          <Route path="ventas/caja" element={<PermisoRoute permisos={['caja']}><CajaIndex /></PermisoRoute>} />
          <Route path="pagos" element={<PermisoRoute permisos={['pagos']}><Pagos /></PermisoRoute>} />
          <Route path="pagos/cuentas-cobrar" element={<PermisoRoute permisos={['pagos']}><CuentasPorCobrar /></PermisoRoute>} />
          <Route path="ventas/pagos" element={<PermisoRoute permisos={['pagos']}><Pagos /></PermisoRoute>} />
          <Route path="ventas/pagos/cuentas-cobrar" element={<PermisoRoute permisos={['pagos']}><CuentasPorCobrar /></PermisoRoute>} />

          {/* Facturación SUNAT */}
          <Route path="facturacion/comprobantes" element={<PermisoRoute permisos={['comprobantes']}><ComprobantesPage /></PermisoRoute>} />
          <Route path="facturacion/comprobantes-informales" element={<PermisoRoute permisos={['comprobantes']}><ComprobantesInformales /></PermisoRoute>} />
          <Route path="facturacion/nuevo" element={<PermisoRoute permisos={['comprobantes']}><Invoice /></PermisoRoute>} />

          {/* Nota de Pedido — flujo comercial de Kaiser (estados + autorización) */}
          <Route path="pedidos" element={<PermisoRoute permisos={['pedidos']}><PedidosPage /></PermisoRoute>} />

          {/* Cotizaciones (flujo de venta principal B2B) */}
          <Route path="cotizaciones" element={<PermisoRoute permisos={['cotizaciones']}><Cotizaciones /></PermisoRoute>} />
          <Route path="cotizaciones/nuevo" element={<PermisoRoute permisos={['cotizaciones']}><Invoice /></PermisoRoute>} />
          <Route path="facturacion/cotizaciones" element={<PermisoRoute permisos={['cotizaciones']}><Cotizaciones /></PermisoRoute>} />
          <Route path="facturacion/cotizaciones/nuevo" element={<PermisoRoute permisos={['cotizaciones']}><Invoice /></PermisoRoute>} />

          {/* Finanzas */}
          <Route path="finanzas/dashboard" element={<PermisoRoute permisos={['reportes']}><FinanceDashboard /></PermisoRoute>} />
          <Route path="reportes/ventas" element={<PermisoRoute permisos={['reportes']}><ReportesVentasView /></PermisoRoute>} />
          <Route path="reportes/mapa-consumo" element={<PermisoRoute permisos={['reportes']}><MapaConsumoView /></PermisoRoute>} />
          <Route path="mis-comisiones" element={<MisComisionesPage />} />

          {/* Inventario / Kardex */}
          <Route path="kardex" element={<PermisoRoute permisos={['kardex', 'contabilidad']}><KardexIndex /></PermisoRoute>} />
          <Route path="kardex/productos" element={<PermisoRoute permisos={['kardex', 'contabilidad']}><KardexProductos /></PermisoRoute>} />
          <Route path="kardex/productos/nuevo" element={<PermisoRoute permisos={['kardex:escribir']}><ProductoNuevo /></PermisoRoute>} />
          <Route path="kardex/productos/editar/:id" element={<PermisoRoute permisos={['kardex:escribir']}><ProductoNuevo /></PermisoRoute>} />
          <Route path="kardex/traslados" element={<PermisoRoute permisos={['kardex:escribir']}><KardexTraslados /></PermisoRoute>} />
          <Route path="kardex/trazabilidad" element={<PermisoRoute permisos={['kardex', 'contabilidad']}><KardexTrazabilidad /></PermisoRoute>} />
          <Route path="kardex/consolidado" element={<PermisoRoute permisos={['kardex', 'contabilidad']}><KardexConsolidado /></PermisoRoute>} />
          <Route path="kardex/lotes" element={<PermisoRoute permisos={['kardex', 'contabilidad']}><Lotes /></PermisoRoute>} />
          <Route path="kardex/libro-control" element={<PermisoRoute permisos={['kardex', 'contabilidad']}><LibroControl /></PermisoRoute>} />
          <Route path="kardex/series-garantias" element={<PermisoRoute permisos={['kardex', 'contabilidad']}><SeriesGarantias /></PermisoRoute>} />
          <Route path="kardex/dashboard" element={<PermisoRoute permisos={['kardex', 'contabilidad']}><InventarioDashboard /></PermisoRoute>} />
          {/* Reservar stock vive bajo `kardex/` para que el sidebar sepa dónde
              está: el módulo activo se decide por prefijo de ruta, y colgando
              de `/administrador/reservas` el menú saltaba al Dashboard al
              entrar. La ruta antigua se mantiene por los enlaces guardados. */}
          <Route
            path="kardex/reservas"
            element={<PermisoRoute permisos={['kardex']}><ReservasPage /></PermisoRoute>}
          />
          <Route path="reservas" element={<ReservasPage />} />
          {/* Devoluciones: la lectura la abre también comercial —"que el área
              comercial pueda verlas y que todos estén informados", pidió
              almacén—; confirmar o rechazar exige `kardex:escribir` y se
              resuelve dentro de la página. */}
          <Route
            path="kardex/devoluciones"
            element={
              <PermisoRoute permisos={['kardex', 'comprobantes']}>
                <DevolucionesPage />
              </PermisoRoute>
            }
          />

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
                {/* 'kardex:escribir' además de 'produccion': quien ENTREGA el
                    material a planta es almacén, no producción, y el endpoint
                    `ordenes/:id/entregar` ya lo abría a los dos. Sin esto, el
                    guard del frontend le cerraba la puerta justo a quien saca
                    el material —el backend decía que sí y la pantalla que no—.
                    Lo que escribe producción (crear, ejecutar, anular) se
                    oculta dentro de la página con `usePuedeEscribir`. */}
                <PermisoRoute permisos={['produccion', 'kardex:escribir']}>
                  <ProduccionOrdenesPage />
                </PermisoRoute>
              </ProduccionRoute>
            }
          />
          <Route
            path="produccion/mermas"
            element={
              <ProduccionRoute>
                {/* 'kardex' y 'contabilidad' además de 'produccion', igual que
                    la genealogía y por lo mismo: planta genera la merma,
                    almacén la pesa y la vende como chatarra, y contabilidad la
                    valoriza. Es una lectura. */}
                <PermisoRoute permisos={['produccion', 'kardex', 'contabilidad']}>
                  <ProduccionMermasPage />
                </PermisoRoute>
              </ProduccionRoute>
            }
          />

          {/* Ventas / Despacho */}
          <Route path="ventas" element={<PanelVentasView />} />
          <Route path="ventas/couriers" element={<PermisoRoute permisos={['ventas', 'guias-remision']}><CouriersView /></PermisoRoute>} />
          {/* Cuelga de `ventas` para que el sidebar la reconozca con la regla
              del prefijo más largo. La ruta antigua queda como alias: estaba
              enrutada desde antes, aunque sin entrada en el menú. */}
          <Route path="ventas/despacho/config" element={<PermisoRoute permisos={['ventas', 'guias-remision']}><DespachoConfigPage /></PermisoRoute>} />
          <Route path="despacho/config" element={<PermisoRoute permisos={['ventas', 'guias-remision']}><DespachoConfigPage /></PermisoRoute>} />
          <Route path="repartidores" element={<PermisoRoute permisos={['guias-remision', 'ventas']}><RepartidoresView /></PermisoRoute>} />

          {/* Usuarios / Sedes / Notificaciones */}
          <Route path="usuarios" element={<PermisoRoute permisos={['usuarios']}><UsuariosIndex /></PermisoRoute>} />
          <Route path="usuarios/vendedores" element={<PermisoRoute permisos={['usuarios', 'reportes']}><VendedoresView /></PermisoRoute>} />
          <Route path="usuarios/repartidores" element={<PermisoRoute permisos={['usuarios', 'guias-remision']}><RepartidoresView /></PermisoRoute>} />
          <Route path="usuarios/clientes" element={<PermisoRoute permisos={['usuarios', 'clientes']}><ClientesPage /></PermisoRoute>} />
          <Route path="usuarios/proveedores" element={<PermisoRoute permisos={['compras']}><ProveedoresPage /></PermisoRoute>} />
          <Route path="sedes" element={<PermisoRoute permisos={['sedes']}><SedesIndex /></PermisoRoute>} />
          <Route path="notificaciones" element={<NotificacionesIndex />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
