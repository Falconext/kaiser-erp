/**
 * Huella de la base para medir si un QA deja residuo.
 *
 * Imprime una sola línea JSON con los conteos y sumas de todo lo que la Fase 2
 * toca. Se corre antes y después de cada pasada: si la huella cambia, el QA se
 * dejó algo puesto aunque haya dicho "todo correcto".
 *
 * Uso:  node src/scripts/qa-huella.mjs
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const uno = async (sql) => (await prisma.$queryRawUnsafe(sql))[0];

const h = {
  compras: await uno(`SELECT COUNT(*)::int n, COALESCE(SUM(total),0)::text suma, COALESCE(SUM(saldo),0)::text saldo FROM "Compra"`),
  detalleCompra: await uno(`SELECT COUNT(*)::int n FROM "DetalleCompra"`),
  pagoCompra: await uno(`SELECT COUNT(*)::int n, COALESCE(SUM(monto),0)::text suma FROM "PagoCompra"`),
  ordenCompra: await uno(`SELECT COUNT(*)::int n, COALESCE(MAX(numero),0)::int ultimo FROM "OrdenCompra"`),
  detalleOrden: await uno(`SELECT COUNT(*)::int n FROM "DetalleOrdenCompra"`),
  solicitud: await uno(`SELECT COUNT(*)::int n FROM "SolicitudCompra"`),
  solicitudItem: await uno(`SELECT COUNT(*)::int n FROM "SolicitudCompraItem"`),
  cotizacion: await uno(`SELECT COUNT(*)::int n FROM "CotizacionProveedor"`),
  cotizacionItem: await uno(`SELECT COUNT(*)::int n FROM "CotizacionProveedorItem"`),
  kardex: await uno(`SELECT COUNT(*)::int n, COALESCE(SUM("valorTotal"),0)::text valor FROM "MovimientoKardex"`),
  productoStock: await uno(`SELECT COUNT(*)::int n, COALESCE(SUM(stock),0)::text suma FROM "ProductoStock"`),
  producto: await uno(`SELECT COUNT(*)::int n, COALESCE(SUM(stock),0)::text stock, COALESCE(SUM("costoPromedio"),0)::text costo FROM "Producto"`),
  compraDocumento: await uno(`SELECT COUNT(*)::int n FROM "CompraDocumento"`),
  comprobantes: await uno(`SELECT COUNT(*)::int n, COALESCE(MAX(correlativo),0)::int ultimo FROM "Comprobante"`),
  descartados: await uno(`SELECT COUNT(*)::int n FROM "ComprobanteDescartado"`),
  pagoCompraObs: await uno(`SELECT COUNT(*) FILTER (WHERE observacion IS NOT NULL)::int n FROM "PagoCompra"`),
  usuarios: await uno(`SELECT COUNT(*)::int n, COALESCE(SUM(LENGTH(permisos)),0)::int perms FROM "Usuario"`),
  notificacion: await uno(`SELECT COUNT(*)::int n FROM "Notificacion"`),
  // Huérfanos: tienen que ser cero siempre, pase lo que pase.
  huerfanos: await uno(`SELECT
      (SELECT COUNT(*) FROM "MovimientoKardex" m LEFT JOIN "Producto" p ON p.id=m."productoId" WHERE p.id IS NULL)::int mov,
      (SELECT COUNT(*) FROM "DetalleCompra" d LEFT JOIN "Compra" c ON c.id=d."compraId" WHERE c.id IS NULL)::int det,
      (SELECT COUNT(*) FROM "DetalleOrdenCompra" d LEFT JOIN "OrdenCompra" o ON o.id=d."ordenCompraId" WHERE o.id IS NULL)::int detOrden,
      (SELECT COUNT(*) FROM "CotizacionProveedor" q LEFT JOIN "SolicitudCompra" s ON s.id=q."solicitudId" WHERE s.id IS NULL)::int cot,
      (SELECT COUNT(*) FROM "MovimientoKardex" m WHERE m."compraId" IS NOT NULL AND m."compraId" NOT IN (SELECT id FROM "Compra"))::int movCompra`),
};
console.log(JSON.stringify(h));
await prisma.$disconnect();
