import { seedPlanContable } from '../../contabilidad/plan-cuentas.seed';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Presets de permisos por rol operativo de Kaiser. El control de accesos del ERP
 * es por ROL: la gerencia (ADMIN_EMPRESA) ve todo; cada rol operativo es un
 * USUARIO_EMPRESA acotado a estos códigos de módulo (ver utils/permissions en el
 * frontend). Ajustar aquí para cambiar qué ve cada área.
 */
export const PERMISOS_POR_ROL = {
  // `kardex` es de solo consulta: habilita ver stock y costos. Para MODIFICAR
  // inventario (ajustes, traslados, alta/edición de productos) hace falta
  // además `kardex:escribir`, que ventas y contabilidad no tienen: un vendedor
  // consulta stock al cotizar, pero no lo corrige.
  //
  // `compras` sigue el mismo criterio y por la misma razón contable: quien lleva
  // el Registro de Compras necesita abrir la factura del proveedor para cuadrar
  // el crédito fiscal, pero no debe poder modificarla. Contabilidad la lee,
  // almacén la registra. Ventas y producción no ven compras en absoluto: el
  // precio al que Kaiser compra es información comercial, no operativa.
  // `mi-dia` lo tienen todos: es el trabajo propio de cada uno, y ver lo suyo no
  // es un permiso que haya que conceder.
  VENTAS: [
    'mi-dia',
    'dashboard',
    'pedidos',
    'cotizaciones',
    'clientes',
    'comprobantes',
    'caja',
    'pagos',
    'guias-remision',
    'kardex',
  ],
  ALMACEN: [
    'mi-dia',
    'dashboard',
    'kardex',
    'kardex:escribir',
    'compras',
    'compras:escribir',
    'guias-remision',
  ],
  PRODUCCION: [
    'mi-dia',
    'dashboard',
    'kardex',
    'kardex:escribir',
    'produccion',
  ],
  CONTABILIDAD: [
    'mi-dia',
    'dashboard',
    'comprobantes',
    'contabilidad',
    'reportes',
    'pagos',
    'compras',
  ],
} as const;

/**
 * Submódulos del ERP de Kaiser: los items que cuelgan de un módulo en el
 * sidebar. Sin sembrarlos, un módulo con varias pantallas solo mostraba las que
 * el frontend añade por su cuenta (`extraItems` en sidebarMeta) — por eso
 * Compras enseñaba "Importaciones" pero no Proveedores ni Órdenes de compra, y
 * el Contabilidad → SIRE quedaba sin entrada en el menú aunque la ruta existe.
 *
 * Reglas para editar esta lista:
 *   · `codigo` debe existir en LEGACY_SUBMODULE_ROUTES o SUBMODULE_META del
 *     frontend, porque de ahí sale el `end` (resaltado activo) y las
 *     condiciones por rubro.
 *   · `ruta` se guarda en BD y tiene prioridad sobre el fallback del frontend.
 *   · NO agregar aquí lo que el módulo ya pone vía `extraItems`: se duplicaría.
 *     Casos actuales: `compras:importaciones`, y los tres items de `reportes`
 *     (Finanzas), que se definen solo en sidebarMeta.
 */
export const SUBMODULOS_KAISER = [
  // Inventario
  {
    modulo: 'kardex',
    codigo: 'kardex:dashboard',
    nombre: 'Dashboard',
    ruta: '/administrador/kardex/dashboard',
    orden: 1,
  },
  {
    modulo: 'kardex',
    codigo: 'kardex:productos',
    nombre: 'Productos',
    ruta: '/administrador/kardex/productos',
    orden: 2,
  },
  // Almacén lo llama "notas de ingreso" y "notas de salida"; llamarlo
  // "Movimientos" les hacía pensar que el ERP no lo tenía.
  {
    modulo: 'kardex',
    codigo: 'kardex:movimientos',
    nombre: 'Ingresos y salidas',
    ruta: '/administrador/kardex',
    orden: 3,
  },
  {
    modulo: 'kardex',
    codigo: 'kardex:traslados',
    nombre: 'Traslados',
    ruta: '/administrador/kardex/traslados',
    orden: 4,
  },
  {
    modulo: 'kardex',
    codigo: 'kardex:trazabilidad',
    nombre: 'Trazabilidad',
    ruta: '/administrador/kardex/trazabilidad',
    orden: 5,
  },
  {
    modulo: 'kardex',
    codigo: 'kardex:consolidado',
    nombre: 'Consolidado',
    ruta: '/administrador/kardex/consolidado',
    orden: 6,
  },
  // 'Kits / Packs' (kardex:combos) estuvo aquí y se quitó el 3-oct-2026: la ruta
  // /administrador/kardex/combos NO EXISTE en App.tsx y la pantalla nunca se
  // construyó —es herencia del monorepo—. El usuario la veía en el menú, la
  // pulsaba y el router lo devolvía al panel sin decir nada. Un menú que lleva
  // a ninguna parte se lee como un sistema roto. Si algún día se hace la
  // pantalla, se vuelve a sembrar junto con su ruta.

  // Facturación
  {
    modulo: 'comprobantes',
    codigo: 'comprobantes:lista',
    nombre: 'Comprobantes SUNAT',
    ruta: '/administrador/facturacion/comprobantes',
    orden: 1,
  },
  {
    modulo: 'comprobantes',
    codigo: 'comprobantes:emitir',
    nombre: 'Emitir comprobante',
    ruta: '/administrador/facturacion/nuevo',
    orden: 2,
  },
  {
    modulo: 'comprobantes',
    codigo: 'comprobantes:informales',
    nombre: 'Notas de venta',
    ruta: '/administrador/facturacion/comprobantes-informales',
    orden: 3,
  },

  // Cotizaciones
  {
    modulo: 'cotizaciones',
    codigo: 'cotizaciones:lista',
    nombre: 'Ver cotizaciones',
    ruta: '/administrador/facturacion/cotizaciones',
    orden: 1,
  },
  {
    modulo: 'cotizaciones',
    codigo: 'cotizaciones:nueva',
    nombre: 'Nueva cotización',
    ruta: '/administrador/facturacion/cotizaciones/nuevo',
    orden: 2,
  },
  // El nombre visible es "Cierre de cotizaciones": la pantalla muestra ganadas,
  // perdidas, abiertas y la tasa de cierre, no solo las pérdidas. La RUTA se queda
  // en /por-que-perdemos a propósito —cambiarla rompería los enlaces guardados y
  // no aporta nada—, igual que el `codigo` del submódulo.
  {
    modulo: 'cotizaciones',
    codigo: 'cotizaciones:perdidas',
    nombre: 'Cierre de cotizaciones',
    ruta: '/administrador/facturacion/cotizaciones/por-que-perdemos',
    orden: 3,
  },

  // Compras
  {
    modulo: 'compras',
    codigo: 'compras:gestion',
    nombre: 'Gestión de compras',
    ruta: '/administrador/compras',
    orden: 1,
  },
  {
    modulo: 'compras',
    codigo: 'compras:proveedores',
    nombre: 'Proveedores',
    ruta: '/administrador/compras/proveedores',
    orden: 2,
  },
  {
    modulo: 'compras',
    codigo: 'compras:ordenes',
    nombre: 'Órdenes de compra',
    ruta: '/administrador/compras/ordenes',
    orden: 3,
  },
  {
    modulo: 'compras',
    codigo: 'compras:solicitudes',
    nombre: 'Solicitudes de compra',
    ruta: '/administrador/compras/solicitudes',
    orden: 4,
  },
  // Importaciones existía como pantalla enrutada y con datos, pero sin entrada en
  // el menú: solo se llegaba escribiendo la URL. Es el punto 1 del pliego de
  // Karim (importaciones y liquidación aduanera), así que no puede estar oculto.
  {
    modulo: 'compras',
    codigo: 'compras:importaciones',
    nombre: 'Importaciones',
    ruta: '/administrador/compras/importaciones',
    orden: 5,
  },

  // Contabilidad — incluye los libros SIRE, que sin esto no tenían entrada en el menú
  // Producción no tenía submenú: era un enlace suelto a Recetas. Al añadir
  // Genealogía son tres pantallas, y el sidebar solo muestra las asignadas —una
  // asignación parcial escondería las otras dos—, así que van las tres.
  {
    modulo: 'produccion',
    codigo: 'produccion:recetas',
    nombre: 'Recetas',
    ruta: '/administrador/produccion/recetas',
    orden: 1,
  },
  {
    modulo: 'produccion',
    codigo: 'produccion:ordenes',
    nombre: 'Órdenes de producción',
    ruta: '/administrador/produccion/ordenes',
    orden: 2,
  },
  {
    modulo: 'produccion',
    codigo: 'produccion:genealogia',
    nombre: 'Genealogía',
    ruta: '/administrador/produccion/genealogia',
    orden: 3,
  },
  {
    modulo: 'contabilidad',
    codigo: 'contabilidad:reportes',
    nombre: 'Reporte contable',
    ruta: '/administrador/contabilidad/reporte',
    orden: 1,
  },
  {
    modulo: 'contabilidad',
    codigo: 'contabilidad:arqueo',
    nombre: 'Arqueo de caja',
    ruta: '/administrador/contabilidad/arqueo',
    orden: 2,
  },
  {
    modulo: 'contabilidad',
    codigo: 'contabilidad:sire-ventas',
    nombre: 'SIRE — Libro de ventas',
    ruta: '/administrador/sire/ventas',
    orden: 3,
  },
  {
    modulo: 'contabilidad',
    codigo: 'contabilidad:sire-compras',
    nombre: 'SIRE — Libro de compras',
    ruta: '/administrador/sire/compras',
    orden: 4,
  },
  {
    modulo: 'contabilidad',
    codigo: 'contabilidad:libro-diario',
    nombre: 'Libro Diario',
    ruta: '/administrador/contabilidad/libro-diario',
    orden: 5,
  },
  {
    modulo: 'contabilidad',
    codigo: 'contabilidad:libro-mayor',
    nombre: 'Libro Mayor',
    ruta: '/administrador/contabilidad/libro-mayor',
    orden: 6,
  },
  {
    modulo: 'contabilidad',
    codigo: 'contabilidad:planilla',
    nombre: 'Planilla',
    ruta: '/administrador/contabilidad/planilla',
    orden: 7,
  },
  {
    modulo: 'contabilidad',
    codigo: 'contabilidad:configuracion',
    nombre: 'Configuración contable',
    ruta: '/administrador/contabilidad/configuracion',
    orden: 8,
  },

  // Guías de remisión. Tampoco tenía submenú: al añadir el seguimiento de
  // despachos van los dos, o el sidebar esconde el listado de guías.
  {
    modulo: 'guias-remision',
    codigo: 'guias:lista',
    nombre: 'Guías de remisión',
    ruta: '/administrador/facturacion/guia-remision',
    orden: 1,
  },
  {
    modulo: 'guias-remision',
    codigo: 'guias:pendientes',
    nombre: 'Despachos pendientes',
    ruta: '/administrador/facturacion/guia-remision/pendientes',
    orden: 2,
  },
  {
    modulo: 'guias-remision',
    codigo: 'guias-remision:programacion',
    nombre: 'Programación de despacho',
    ruta: '/administrador/facturacion/guia-remision/programacion',
    orden: 4,
  },

  // Clientes. No tenía submenú: era un enlace suelto al listado. Al añadir el
  // panel de crédito van los DOS, porque el sidebar solo muestra los submódulos
  // asignados y dejar solo el de crédito escondería el listado de clientes.
  {
    modulo: 'clientes',
    codigo: 'clientes:lista',
    nombre: 'Clientes',
    ruta: '/administrador/clientes',
    orden: 1,
  },
  {
    modulo: 'clientes',
    codigo: 'clientes:credito',
    nombre: 'Crédito de clientes',
    ruta: '/administrador/clientes/credito',
    orden: 2,
  },
  {
    modulo: 'clientes',
    codigo: 'clientes:listas-precio',
    nombre: 'Listas de precio',
    ruta: '/administrador/clientes/listas-precio',
    orden: 3,
  },

  // OJO: Finanzas (módulo `reportes`) NO lleva submódulos aquí. Su submenú se
  // define en el frontend, en `sidebarMeta.ts` → `reportes.extraItems`, y los de
  // BD se SUMAN a esos: sembrarlos aquí duplicó el menú con dos entradas por la
  // misma ruta ("Panel financiero" y "Dashboard financiero" apuntaban las dos a
  // /administrador/finanzas/dashboard, y el sidebar encendía ambas). Si hay que
  // añadir una pantalla a Finanzas, va en `extraItems`, no en esta lista.

  // Usuarios
  {
    modulo: 'usuarios',
    codigo: 'usuarios:gestion',
    nombre: 'Usuarios del sistema',
    ruta: '/administrador/usuarios',
    orden: 1,
  },
  {
    modulo: 'usuarios',
    codigo: 'usuarios:clientes',
    nombre: 'Accesos de clientes',
    ruta: '/administrador/usuarios/clientes',
    orden: 2,
  },
] as const;

/**
 * Submódulos que NO le corresponden a Kaiser. Venían del seed genérico de la
 * plataforma que se arrastraba del monorepo MyPE (ya eliminado); se desactivan
 * aquí para limpiar las bases que alcanzaron a correrlo. Ejemplo: `reportes:formal`
 * colgaba de Finanzas apuntando al reporte de Contabilidad, duplicando la entrada.
 */
/**
 * Módulos que NO le corresponden a Kaiser y que pudieron quedar asignados al
 * plan por el seed genérico de la plataforma. `tienda` es el caso real: su
 * código se eliminó con la capa SaaS, así que el menú llevaría a una ruta que
 * ya no existe.
 */
export const MODULOS_NO_KAISER = [
  'tienda',
  'reseller',
  'marketing',
  'ecommerce',
  'mi-negocio',
  'vehiculos',
] as const;

export const SUBMODULOS_NO_KAISER = [
  // Sembrados por error: el submenú de Finanzas se define en el frontend
  // (`sidebarMeta.ts` → reportes.extraItems) y estos se le sumaban, dejando dos
  // entradas distintas para la misma ruta.
  'reportes:panel',
  'reportes:ventas',
  'reportes:mapa-consumo',
  'reportes:formal',
  'reportes:informal',
  'reportes:mi-negocio',
  'kardex:reservas',
  'kardex:series-garantias',
  'tienda:pedidos',
  'tienda:configuracion',
  'tienda:modificadores',
  'tienda:reviews',
  'tienda:blog',
  'tienda:template',
] as const;

/**
 * Las cinco cuentas que se siembran, una por área. Se declaran aquí (y no
 * dentro del seed) para que `sincronizarPermisosSeed()` pueda realinearlas en
 * cada arranque cuando cambien los presets de PERMISOS_POR_ROL.
 */
export const USUARIOS_KAISER = [
  {
    nombre: 'Gerencia Kaiser',
    dni: '00000001',
    celular: '999000001',
    email: 'gerencia@kaisercorp.com.pe',
    rol: 'ADMIN_EMPRESA',
    permisos: ['*'] as readonly string[],
  },
  {
    nombre: 'Ventas Kaiser',
    dni: '00000002',
    celular: '999000002',
    email: 'ventas@kaisercorp.com.pe',
    rol: 'USUARIO_EMPRESA',
    permisos: PERMISOS_POR_ROL.VENTAS as readonly string[],
  },
  {
    nombre: 'Almacén Kaiser',
    dni: '00000003',
    celular: '999000003',
    email: 'almacen@kaisercorp.com.pe',
    rol: 'USUARIO_EMPRESA',
    permisos: PERMISOS_POR_ROL.ALMACEN as readonly string[],
  },
  {
    nombre: 'Producción Kaiser',
    dni: '00000004',
    celular: '999000004',
    email: 'produccion@kaisercorp.com.pe',
    rol: 'USUARIO_EMPRESA',
    permisos: PERMISOS_POR_ROL.PRODUCCION as readonly string[],
  },
  {
    nombre: 'Contabilidad Kaiser',
    dni: '00000005',
    celular: '999000005',
    email: 'contabilidad@kaisercorp.com.pe',
    rol: 'USUARIO_EMPRESA',
    permisos: PERMISOS_POR_ROL.CONTABILIDAD as readonly string[],
  },
] as const;

/**
 * Realinea los permisos de las cinco cuentas sembradas con PERMISOS_POR_ROL.
 *
 * Corre en cada arranque, como el menú: si un preset cambia (p. ej. al separar
 * `kardex` de `kardex:escribir`), las bases ya creadas se quedarían con los
 * permisos viejos. Toca SOLO esas cinco cuentas, por email: los usuarios que
 * Kaiser cree desde la pantalla de Usuarios no se tocan nunca.
 */
export async function sincronizarPermisosSeed(prisma: PrismaService) {
  for (const u of USUARIOS_KAISER) {
    const actual = await prisma.usuario.findFirst({
      where: { email: u.email },
      select: { id: true, permisos: true },
    });
    if (!actual) continue;

    const esperado = JSON.stringify([...u.permisos]);
    if (actual.permisos === esperado) continue;

    await prisma.usuario.update({
      where: { id: actual.id },
      data: { permisos: esperado },
    });
    console.log(`   · permisos realineados: ${u.email}`);
  }
}

/**
 * Personas facultadas para autorizar pedidos (acta POSIGESA, marzo 2026).
 * Alimentan el campo "Autorizado por" de la Nota de Pedido.
 */
export const AUTORIZADORES_KAISER = [
  {
    nombre: 'Cecilia Kaiser',
    telefono: '989007725',
    email: 'cecilia@kaisercorp.com.pe',
  },
  {
    nombre: 'Karim Kaiser',
    telefono: '989007717',
    email: 'karim@kaisercorp.com.pe',
  },
  {
    nombre: 'Stefanie Kaiser',
    telefono: '925410210',
    email: 'stefanie@kaisercorp.com.pe',
  },
] as const;

/**
 * Catálogo de módulos del ERP de Kaiser. El sidebar se genera dinámicamente
 * desde `plan.modulosAsignados` (ver AdminLayout + sidebarMeta): estos son los
 * módulos que se siembran en la BD y se asignan al plan. `codigo` debe existir
 * en LEGACY_MODULE_ROUTES/MODULE_META del frontend; `ruta` apunta a una ruta
 * activa del ERP. Ajustar/ordenar aquí para cambiar el menú — nada en duro.
 */
export const MODULOS_KAISER = [
  // "Mi día" va PRIMERO y el Dashboard después: para un vendedor, el panel de la
  // empresa es el negocio de otro. Su trabajo del día es lo que tiene que ver al
  // entrar.
  //
  // El `orden` es ÚNICO en toda la lista y sin huecos. Cotizaciones y Facturación
  // compartían el 3 y Pagos compartía el 11 con Tienda Virtual: con el orden
  // empatado, el sidebar los colocaba según llegaran de la API y podía cambiar
  // entre recargas.
  {
    codigo: 'mi-dia',
    nombre: 'Mi día',
    icono: 'solar:sun-2-bold-duotone',
    ruta: '/administrador/mi-dia',
    orden: 0,
  },
  {
    codigo: 'dashboard',
    nombre: 'Dashboard',
    icono: 'solar:widget-5-bold-duotone',
    ruta: '/administrador',
    orden: 1,
  },
  {
    codigo: 'pedidos',
    nombre: 'Pedidos',
    icono: 'solar:clipboard-list-bold-duotone',
    ruta: '/administrador/pedidos',
    orden: 2,
  },
  {
    codigo: 'cotizaciones',
    nombre: 'Cotizaciones',
    icono: 'solar:document-text-bold-duotone',
    ruta: '/administrador/facturacion/cotizaciones',
    orden: 3,
  },
  {
    codigo: 'comprobantes',
    nombre: 'Facturación',
    icono: 'solar:bill-list-bold-duotone',
    ruta: '/administrador/facturacion/comprobantes',
    orden: 4,
  },
  {
    codigo: 'clientes',
    nombre: 'Clientes',
    icono: 'solar:users-group-rounded-bold-duotone',
    ruta: '/administrador/clientes',
    orden: 5,
  },
  {
    codigo: 'kardex',
    nombre: 'Inventario',
    icono: 'solar:box-bold-duotone',
    ruta: '/administrador/kardex/productos',
    orden: 6,
  },
  {
    codigo: 'compras',
    nombre: 'Compras',
    icono: 'solar:cart-large-2-bold-duotone',
    ruta: '/administrador/compras',
    orden: 7,
  },
  {
    codigo: 'produccion',
    nombre: 'Producción',
    icono: 'solar:settings-minimalistic-bold-duotone',
    ruta: '/administrador/produccion/recetas',
    orden: 8,
  },
  {
    codigo: 'ventas',
    nombre: 'Ventas y Despacho',
    icono: 'solar:delivery-bold-duotone',
    ruta: '/administrador/ventas',
    orden: 9,
  },
  {
    codigo: 'guias-remision',
    nombre: 'Guías de Remisión',
    icono: 'solar:file-check-bold-duotone',
    ruta: '/administrador/facturacion/guia-remision',
    orden: 10,
  },
  {
    codigo: 'caja',
    nombre: 'Caja',
    icono: 'solar:safe-2-bold-duotone',
    ruta: '/administrador/ventas/caja',
    orden: 11,
  },
  {
    codigo: 'pagos',
    nombre: 'Pagos y Cobros',
    icono: 'solar:wallet-money-bold-duotone',
    ruta: '/administrador/ventas/pagos',
    orden: 12,
  },
  {
    codigo: 'contabilidad',
    nombre: 'Contabilidad',
    icono: 'solar:notebook-bold-duotone',
    ruta: '/administrador/contabilidad/reporte',
    orden: 13,
  },
  {
    codigo: 'reportes',
    nombre: 'Finanzas',
    icono: 'solar:chart-2-bold-duotone',
    ruta: '/administrador/finanzas/dashboard',
    orden: 14,
  },
  {
    codigo: 'sedes',
    nombre: 'Sedes',
    icono: 'solar:map-point-bold-duotone',
    ruta: '/administrador/sedes',
    orden: 15,
  },
  {
    codigo: 'usuarios',
    nombre: 'Usuarios',
    icono: 'solar:users-group-two-rounded-bold-duotone',
    ruta: '/administrador/usuarios',
    orden: 16,
  },
  {
    codigo: 'notificaciones',
    nombre: 'Notificaciones',
    icono: 'solar:bell-bold-duotone',
    ruta: '/administrador/notificaciones',
    orden: 17,
  },
  // Solo gerencia: es la foto completa del negocio en un archivo. No entra en
  // PERMISOS_POR_ROL, así que los roles operativos no lo ven.
  {
    codigo: 'mis-datos',
    nombre: 'Mis datos',
    icono: 'solar:cloud-download-bold-duotone',
    ruta: '/administrador/mis-datos',
    orden: 18,
  },
] as const;

/**
 * Siembra el menú del ERP (módulos y submódulos) y lo asigna al plan.
 *
 * Corre en CADA arranque, antes del early-return de "ya inicializada": si solo
 * corriera en una base vacía, cualquier cambio al menú se quedaría fuera de las
 * instalaciones existentes — producción incluida. Todo es upsert, así que
 * repetirlo no duplica ni pisa datos de operación.
 */
export async function seedMenuKaiser(prisma: PrismaService) {
  const plan = await prisma.plan.findFirst();
  // Base recién creada: el plan aún no existe. El flujo de inicialización
  // vuelve a llamar aquí después de crearlo.
  if (!plan) return;

  // 1. Módulos del ERP y su asignación al plan.
  //    El sidebar del frontend se genera dinámicamente desde
  //    `plan.modulosAsignados` (NADA en duro en el layout): sembramos aquí
  //    todos los módulos del ERP y los asignamos al plan. Idempotente.
  for (const m of MODULOS_KAISER) {
    const modulo = await prisma.modulo.upsert({
      where: { codigo_producto: { codigo: m.codigo, producto: 'facturacion' } },
      update: {
        nombre: m.nombre,
        icono: m.icono,
        ruta: m.ruta,
        orden: m.orden,
        activo: true,
      },
      create: {
        codigo: m.codigo,
        producto: 'facturacion',
        nombre: m.nombre,
        icono: m.icono,
        ruta: m.ruta,
        orden: m.orden,
        activo: true,
      },
    });
    await prisma.planModulo.upsert({
      where: { planId_moduloId: { planId: plan.id, moduloId: modulo.id } },
      update: {},
      create: { planId: plan.id, moduloId: modulo.id },
    });
  }

  // 2. Submódulos (los items que cuelgan de un módulo en el sidebar).
  //    Se asignan TODOS al plan: cuando un módulo tiene alguna asignación, el
  //    frontend muestra solo las asignadas — una asignación parcial esconde el
  //    resto del submenú. Idempotente.
  for (const sub of SUBMODULOS_KAISER) {
    const modulo = await prisma.modulo.findFirst({
      where: { codigo: sub.modulo, producto: 'facturacion' },
      select: { id: true },
    });
    if (!modulo) continue;

    const subModulo = await prisma.subModulo.upsert({
      where: { codigo: sub.codigo },
      update: {
        moduloId: modulo.id,
        nombre: sub.nombre,
        ruta: sub.ruta,
        orden: sub.orden,
        activo: true,
      },
      create: {
        moduloId: modulo.id,
        codigo: sub.codigo,
        nombre: sub.nombre,
        ruta: sub.ruta,
        orden: sub.orden,
        activo: true,
      },
    });

    await prisma.planSubModulo.upsert({
      where: {
        planId_subModuloId: { planId: plan.id, subModuloId: subModulo.id },
      },
      update: {},
      create: { planId: plan.id, subModuloId: subModulo.id },
    });
  }

  // 3.a Módulos ajenos: se desasignan del plan. No se desactivan porque el
  //     catálogo de módulos es de la plataforma; lo que Kaiser no debe ver es
  //     lo que cuelga de SU plan.
  const modulosAjenos = await prisma.modulo.findMany({
    where: { codigo: { in: [...MODULOS_NO_KAISER] }, producto: 'facturacion' },
    select: { id: true },
  });
  if (modulosAjenos.length) {
    await prisma.planModulo.deleteMany({
      where: {
        planId: plan.id,
        moduloId: { in: modulosAjenos.map((m) => m.id) },
      },
    });
  }

  // 3.b Y se desactivan los submódulos ajenos a Kaiser, junto con su asignación
  //     al plan.
  const ajenos = await prisma.subModulo.findMany({
    where: { codigo: { in: [...SUBMODULOS_NO_KAISER] } },
    select: { id: true },
  });
  if (ajenos.length) {
    const ids = ajenos.map((s) => s.id);
    await prisma.planSubModulo.deleteMany({
      where: { subModuloId: { in: ids } },
    });
    await prisma.subModulo.updateMany({
      where: { id: { in: ids } },
      data: { activo: false },
    });
  }
}

export async function initializeDatabase(prisma: PrismaService) {
  try {
    // Seed SUNAT reference catalogs (UnidadMedida, TipoOperacion, MotivoNota,
    // TipoDocumento). Idempotent (upsert) and runs on EVERY boot — before the
    // "already initialized" early-return below — so existing databases get
    // backfilled, not only fresh ones.
    await seedCatalogosSunat(prisma);

    // Catálogo de Ubigeos (departamento/provincia/distrito). Se siembra una sola
    // vez (guardado por conteo) desde prisma/data/*.json — necesario para el
    // selector de ubicación al crear/editar empresas.
    await seedUbigeo(prisma);

    // Menú del ERP (módulos y submódulos). Idempotente y en cada arranque,
    // por la misma razón que los catálogos SUNAT: las bases existentes
    // también tienen que recibir los cambios al menú.
    await seedMenuKaiser(prisma);

    // Permisos de las cuentas sembradas: misma razón que el menú.
    await sincronizarPermisosSeed(prisma);

    // Plan de cuentas y mapeo contable por empresa. Idempotente y en cada
    // arranque, como el menú: si se añade una cuenta al seed, llega a todas.
    await seedPlanContable(prisma);

    // Try to count users - this will fail if tables don't exist
    let userCount = 0;
    try {
      userCount = await prisma.usuario.count();
      if (userCount > 0) return; // Already initialized
    } catch (tableError) {
      console.log('⚠️ Tables may not exist yet, attempting seeding anyway...');
    }

    console.log('🚀 Initializing database with default data...');

    // 1. Rubro industrial de Kaiser (nombre con "fabricación" habilita el módulo
    //    de Producción vía esRubroFabricacion()).
    let rubro = await prisma.rubro.findFirst();
    if (!rubro) {
      rubro = await prisma.rubro.create({
        data: { nombre: 'Industria y Fabricación' },
      });
    }

    // 2. Create Default Plan
    let plan = await prisma.plan.findFirst();
    if (!plan) {
      plan = await prisma.plan.create({
        data: {
          nombre: 'PRO',
          costo: 0,
          esPrueba: false,
          tipoFacturacion: 'ANUAL',
          tieneTienda: true,
          tieneBanners: true,
          tieneGaleria: true,
          tieneCulqi: true,
          tieneDeliveryGPS: true,
        },
      });
    }

    // 2.b Menú del ERP: módulos y submódulos asignados al plan.
    await seedMenuKaiser(prisma);

    // 3. TipoDocumento ya fue sembrado por seedCatalogosSunat() arriba.

    // 4. Empresa Kaiser Corporation
    const empresa = await prisma.empresa.create({
      data: {
        ruc: '20100000001', // RUC placeholder — reemplazar por el real de Kaiser
        razonSocial: 'KAISER CORPORATION S.A.',
        direccion: 'Jr. Francia 1028, La Victoria, Lima',
        fechaActivacion: new Date(),
        fechaExpiracion: new Date(
          new Date().setFullYear(new Date().getFullYear() + 10),
        ),
        planId: plan.id,
        rubroId: rubro.id,
        estado: 'ACTIVO',
        tipoEmpresa: 'FORMAL',
        colorPrimario: '#214878',
        aceptaEfectivo: true,
      },
    });

    // 4.b Sede principal de Kaiser (necesaria para el login multi-sede y para
    //     emitir comprobantes). permiteFacturacion=true para poder facturar.
    const sede = await prisma.sede.create({
      data: {
        empresaId: empresa.id,
        nombre: 'Sede Principal - La Victoria',
        direccion: 'Jr. Francia 1028, La Victoria, Lima',
        codigo: '0000',
        tipo: 'PUNTO_DE_VENTA',
        esPrincipal: true,
        permiteFacturacion: true,
        activo: true,
      },
    });

    // 4.c Autorizadores de pedidos (acta POSIGESA — personas facultadas para el
    //     campo "Autorizado por" en la Nota de Pedido).
    for (const a of AUTORIZADORES_KAISER) {
      await prisma.autorizadorPedido.upsert({
        where: {
          empresaId_nombre: { empresaId: empresa.id, nombre: a.nombre },
        },
        update: { telefono: a.telefono, email: a.email },
        create: {
          empresaId: empresa.id,
          nombre: a.nombre,
          telefono: a.telefono,
          email: a.email,
          activo: true,
        },
      });
    }

    // 5. Create Default "Varios" Client
    const tipoDocDNI = await prisma.tipoDocumento.findUnique({
      where: { codigo: '1' },
    });
    if (tipoDocDNI) {
      await prisma.cliente.create({
        data: {
          nombre: 'VARIOS',
          nroDoc: '00000000',
          direccion: '-',
          empresaId: empresa.id,
          tipoDocumentoId: tipoDocDNI.id,
          persona: 'CLIENTE',
          estado: 'ACTIVO',
        },
      });
      console.log('   ✅ Default client "VARIOS" created');
    }

    // 6. Usuarios Kaiser: gerencia (ADMIN_EMPRESA = ve todo) + roles operativos.
    //    Los roles operativos son USUARIO_EMPRESA acotados por `permisos[]`.
    //    (Presets de permisos por rol — ver PERMISOS_POR_ROL abajo.)
    const hashedPassword = await bcrypt.hash('kaiser123', 10);

    for (const u of USUARIOS_KAISER) {
      const creado = await prisma.usuario.create({
        data: {
          nombre: u.nombre,
          dni: u.dni,
          celular: u.celular,
          email: u.email,
          password: hashedPassword,
          rol: u.rol as any,
          empresaId: empresa.id,
          sedeId: sede.id,
          estado: 'ACTIVO',
          permisos: JSON.stringify(u.permisos),
        },
      });
      // Vincular cada usuario a la sede principal (ruta de login de staff).
      await prisma.usuarioSede.create({
        data: { usuarioId: creado.id, sedeId: sede.id },
      });
    }

    console.log('✅ Kaiser ERP: base de datos inicializada.');
    console.log('🔑 Gerencia: gerencia@kaisercorp.com.pe / kaiser123');
    console.log(
      '   Roles operativos: ventas | almacen | produccion | contabilidad @kaisercorp.com.pe (misma clave)',
    );

    // La empresa acaba de nacer: ahora sí tiene a quién sembrarle el plan.
    await seedPlanContable(prisma);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

/**
 * Siembra los catálogos de referencia SUNAT que las tablas de la BD necesitan
 * para operar: Tipos de Documento (cat. 06), Unidades de Medida (cat. 03),
 * Tipos de Operación (cat. 51), Motivos de Nota (cat. 09/10), Tipos de
 * Detracción (cat. 54) y Medios de Pago de Detracción. Es idempotente (upsert)
 * y se invoca en CADA arranque, antes del early-return de "ya inicializado",
 * para rellenar también bases de datos existentes que no tenían estos datos.
 *
 * Fuente canónica de los datos: prisma/seeds/seed-detracciones.ts.
 */
export async function seedCatalogosSunat(prisma: PrismaService) {
  try {
    // 1. Tipos de Documento (SUNAT Catálogo 06)
    const tiposDocumento = [
      { codigo: '0', descripcion: 'OTROS' },
      { codigo: '1', descripcion: 'DNI' },
      { codigo: '4', descripcion: 'CARNET DE EXTRANJERÍA' },
      { codigo: '6', descripcion: 'RUC' },
      { codigo: '7', descripcion: 'PASAPORTE' },
      { codigo: 'A', descripcion: 'CARNET DE IDENTIDAD' },
    ];
    for (const doc of tiposDocumento) {
      await prisma.tipoDocumento.upsert({
        where: { codigo: doc.codigo },
        update: {},
        create: doc,
      });
    }

    // 2. Unidades de Medida (SUNAT Catálogo 03)
    const unidadesMedida = [
      { codigo: 'NIU', nombre: 'UNIDAD' },
      { codigo: 'KGM', nombre: 'KILOGRAMO' },
      { codigo: 'LTR', nombre: 'LITRO' },
      { codigo: 'MTR', nombre: 'METRO' },
      { codigo: 'MTK', nombre: 'METRO CUADRADO' },
      { codigo: 'MTQ', nombre: 'METRO CÚBICO' },
      { codigo: 'GRM', nombre: 'GRAMO' },
      { codigo: 'TNE', nombre: 'TONELADA' },
      { codigo: 'GLN', nombre: 'GALÓN' },
      { codigo: 'BOX', nombre: 'CAJA' },
      { codigo: 'DZN', nombre: 'DOCENA' },
      { codigo: 'PAR', nombre: 'PAR' },
      { codigo: 'SET', nombre: 'JUEGO' },
      { codigo: 'ZZ', nombre: 'OTROS' },
    ];
    // El upsert va por CÓDIGO, así que sin la comprobación de nombre esta
    // siembra convivía con las unidades que crea el importador del catálogo de
    // Kaiser (`import-kaiser-catalog.ts`), que usa los códigos internos del
    // negocio: UND, KG, LT, M2, CJ, RLL, PZ, PQ. Resultado: cinco unidades
    // repetidas —UNIDAD, KILOGRAMO, LITRO, METRO CUADRADO y CAJA aparecían dos
    // veces en el selector, indistinguibles, porque la lista se pinta por
    // nombre.
    //
    // No pasa nada con SUNAT (`sunat-unidades.ts` traduce los códigos internos
    // al Catálogo 03 antes de armar el XML), pero el usuario tiene que elegir a
    // ciegas entre dos opciones idénticas. Si ya existe una unidad con ese
    // nombre, esta no se crea.
    for (const u of unidadesMedida) {
      const yaConEseNombre = await prisma.unidadMedida.findFirst({
        where: { nombre: u.nombre, codigo: { not: u.codigo } },
        select: { id: true },
      });
      if (yaConEseNombre) continue;
      await prisma.unidadMedida.upsert({
        where: { codigo: u.codigo },
        update: {},
        create: u,
      });
    }

    // 3. Tipos de Operación (SUNAT Catálogo 51). Lista alineada con
    // prisma/seeds/seed-detracciones.ts (fuente autoritativa en web).
    const tiposOperacion = [
      { codigo: '0101', descripcion: 'VENTA INTERNA' },
      { codigo: '0102', descripcion: 'EXPORTACIÓN' },
      { codigo: '0112', descripcion: 'VENTA INTERNA - ANTICIPOS' },
      { codigo: '0113', descripcion: 'EXPORTACIÓN - ANTICIPOS' },
      { codigo: '0121', descripcion: 'VENTA INTERNA SUJETA A IVAP' },
      {
        codigo: '0200',
        descripcion:
          'EXPORTACIÓN DE SERVICIOS - PRESTACIÓN DE SERVICIOS REALIZADOS EN EL PAÍS',
      },
      {
        codigo: '0201',
        descripcion:
          'EXPORTACIÓN DE SERVICIOS - PRESTACIÓN DE SERVICIOS REALIZADOS ÍNTEGRAMENTE EN EL EXTRANJERO',
      },
      {
        codigo: '0202',
        descripcion:
          'EXPORTACIÓN DE SERVICIOS - SERVICIOS DE HOSPEDAJE NO DOMICILIADOS',
      },
      {
        codigo: '0205',
        descripcion:
          'EXPORTACIÓN DE SERVICIOS - SERVICIOS A NAVES Y AERONAVES DE BANDERA EXTRANJERA',
      },
      {
        codigo: '0206',
        descripcion:
          'EXPORTACIÓN DE SERVICIOS - SERVICIOS COMPLEMENTARIOS AL TRANSPORTE DE CARGA',
      },
      { codigo: '0401', descripcion: 'OPERACIONES SUJETAS A DETRACCIÓN' },
    ];
    for (const op of tiposOperacion) {
      await prisma.tipoOperacion.upsert({
        where: { codigo: op.codigo },
        update: { descripcion: op.descripcion },
        create: op,
      });
    }

    // 4. Motivos de Nota de Crédito/Débito (SUNAT Catálogos 09 y 10)
    const motivosNota = [
      {
        tipo: 'CREDITO',
        codigo: '01',
        descripcion: 'ANULACIÓN DE LA OPERACIÓN',
      },
      {
        tipo: 'CREDITO',
        codigo: '02',
        descripcion: 'ANULACIÓN POR ERROR EN EL RUC',
      },
      {
        tipo: 'CREDITO',
        codigo: '03',
        descripcion: 'CORRECCIÓN POR ERROR EN LA DESCRIPCIÓN',
      },
      { tipo: 'CREDITO', codigo: '04', descripcion: 'DESCUENTO GLOBAL' },
      { tipo: 'CREDITO', codigo: '05', descripcion: 'DESCUENTO POR ÍTEM' },
      { tipo: 'CREDITO', codigo: '06', descripcion: 'DEVOLUCIÓN TOTAL' },
      { tipo: 'CREDITO', codigo: '07', descripcion: 'DEVOLUCIÓN POR ÍTEM' },
      { tipo: 'CREDITO', codigo: '08', descripcion: 'BONIFICACIÓN' },
      { tipo: 'CREDITO', codigo: '09', descripcion: 'DISMINUCIÓN EN EL VALOR' },
      { tipo: 'CREDITO', codigo: '10', descripcion: 'OTROS CONCEPTOS' },
      { tipo: 'CREDITO', codigo: '13', descripcion: 'AJUSTE MYPE' },
      { tipo: 'DEBITO', codigo: '01', descripcion: 'INTERESES POR MORA' },
      { tipo: 'DEBITO', codigo: '02', descripcion: 'AUMENTO EN EL VALOR' },
      {
        tipo: 'DEBITO',
        codigo: '03',
        descripcion: 'PENALIDADES/OTROS CONCEPTOS',
      },
    ];
    for (const m of motivosNota) {
      const existing = await prisma.motivoNota.findFirst({
        where: { tipo: m.tipo as any, codigo: m.codigo },
      });
      if (!existing) {
        await prisma.motivoNota.create({ data: m as any });
      }
    }

    // 5. Tipos de Detracción (SUNAT Catálogo 54 — Anexos 2 y 3)
    const tiposDetraccion = [
      // BIENES (Anexo 2)
      { codigo: '001', descripcion: 'Azúcar y melaza de caña', porcentaje: 10 },
      { codigo: '003', descripcion: 'Alcohol etílico', porcentaje: 4 },
      { codigo: '004', descripcion: 'Recursos hidrobiológicos', porcentaje: 4 },
      { codigo: '005', descripcion: 'Maíz amarillo duro', porcentaje: 4 },
      { codigo: '006', descripcion: 'Madera', porcentaje: 4 },
      { codigo: '007', descripcion: 'Arena y piedra', porcentaje: 10 },
      {
        codigo: '008',
        descripcion:
          'Residuos, subproductos, desechos, recortes y desperdicios',
        porcentaje: 15,
      },
      {
        codigo: '009',
        descripcion: 'Carnes y despojos comestibles',
        porcentaje: 4,
      },
      {
        codigo: '010',
        descripcion: 'Harina, polvo y pellets de pescado, crustáceos, moluscos',
        porcentaje: 4,
      },
      { codigo: '011', descripcion: 'Aceite de pescado', porcentaje: 10 },
      { codigo: '012', descripcion: 'Leche', porcentaje: 4 },
      {
        codigo: '014',
        descripcion: 'Bienes gravados con el IGV por renuncia a la exoneración',
        porcentaje: 10,
      },
      {
        codigo: '016',
        descripcion: 'Páprika y otros frutos del género capsicum o pimienta',
        porcentaje: 10,
      },
      { codigo: '017', descripcion: 'Espárragos', porcentaje: 10 },
      {
        codigo: '018',
        descripcion: 'Minerales metálicos no auríferos',
        porcentaje: 10,
      },
      { codigo: '023', descripcion: 'Plomo', porcentaje: 15 },
      { codigo: '029', descripcion: 'Minerales no metálicos', porcentaje: 10 },
      { codigo: '031', descripcion: 'Oro gravado con el IGV', porcentaje: 10 },
      {
        codigo: '034',
        descripcion: 'Oro y demás minerales metálicos exonerados del IGV',
        porcentaje: 1.5,
      },
      {
        codigo: '035',
        descripcion: 'Bienes exonerados del IGV',
        porcentaje: 1.5,
      },
      { codigo: '036', descripcion: 'Caña de azúcar', porcentaje: 10 },
      // SERVICIOS (Anexo 3)
      { codigo: '019', descripcion: 'Arrendamiento de bienes', porcentaje: 10 },
      {
        codigo: '020',
        descripcion: 'Mantenimiento y reparación de bienes muebles',
        porcentaje: 12,
      },
      { codigo: '021', descripcion: 'Movimiento de carga', porcentaje: 10 },
      {
        codigo: '022',
        descripcion: 'Otros servicios empresariales',
        porcentaje: 12,
      },
      { codigo: '024', descripcion: 'Comisión mercantil', porcentaje: 10 },
      {
        codigo: '025',
        descripcion: 'Fabricación de bienes por encargo',
        porcentaje: 10,
      },
      {
        codigo: '026',
        descripcion: 'Servicio de transporte de personas',
        porcentaje: 10,
      },
      {
        codigo: '027',
        descripcion: 'Servicio de transporte de carga',
        porcentaje: 4,
      },
      {
        codigo: '030',
        descripcion: 'Contratos de construcción',
        porcentaje: 4,
      },
      {
        codigo: '032',
        descripcion: 'Intermediación laboral y tercerización',
        porcentaje: 12,
      },
      {
        codigo: '037',
        descripcion: 'Demás servicios gravados con el IGV',
        porcentaje: 12,
      },
    ];
    for (const t of tiposDetraccion) {
      await prisma.tipoDetraccion.upsert({
        where: { codigo: t.codigo },
        update: { descripcion: t.descripcion, porcentaje: t.porcentaje },
        create: t,
      });
    }

    // 6. Medios de Pago para Detracción
    const mediosPagoDetraccion = [
      { codigo: '001', descripcion: 'Depósito en cuenta' },
      { codigo: '002', descripcion: 'Giro' },
      { codigo: '003', descripcion: 'Transferencia de fondos' },
      { codigo: '004', descripcion: 'Orden de pago' },
      { codigo: '005', descripcion: 'Tarjeta de débito' },
      {
        codigo: '006',
        descripcion:
          'Tarjeta de crédito emitida en el país por empresa del sistema financiero',
      },
      {
        codigo: '007',
        descripcion:
          'Cheques con la cláusula de "NO NEGOCIABLE", "INTRANSFERIBLES"',
      },
      {
        codigo: '008',
        descripcion: 'Efectivo, en operaciones en las que no supere S/ 500',
      },
      { codigo: '009', descripcion: 'Otros medios de pago' },
    ];
    for (const m of mediosPagoDetraccion) {
      await prisma.medioPagoDetraccion.upsert({
        where: { codigo: m.codigo },
        update: { descripcion: m.descripcion },
        create: m,
      });
    }

    console.log(
      '   ✅ Catálogos SUNAT (documento/unidad/operación/nota/detracción) OK',
    );
  } catch (error) {
    // No debe romper el arranque si las tablas aún no existen (pre-migración).
    console.log(
      '⚠️ No se pudieron sembrar los catálogos SUNAT todavía:',
      (error as Error)?.message,
    );
  }
}

/**
 * Siembra el catálogo de Ubigeos (departamento/provincia/distrito) desde los
 * JSON en prisma/data. Idempotente por conteo: solo inserta si la tabla está
 * vacía. Fuente canónica: prisma/seeds/seed-ubigeo.ts.
 */
async function seedUbigeo(prisma: PrismaService) {
  try {
    const count = await prisma.ubigeo.count();
    if (count > 0) return; // Ya sembrado

    const dataDir = join(process.cwd(), 'prisma', 'data');
    const deptPath = join(dataDir, 'departamentos.json');
    const provPath = join(dataDir, 'provincias.json');
    const distPath = join(dataDir, 'distritos.json');

    if (
      !existsSync(deptPath) ||
      !existsSync(provPath) ||
      !existsSync(distPath)
    ) {
      console.log('⚠️ Archivos de ubigeo no encontrados, se omite el seeding.');
      return;
    }

    const departamentos: { id: string; name: string }[] = JSON.parse(
      readFileSync(deptPath, 'utf-8'),
    );
    const provincias: { id: string; name: string }[] = JSON.parse(
      readFileSync(provPath, 'utf-8'),
    );
    const distritos: {
      id: string;
      name: string;
      province_id: string;
      department_id: string;
    }[] = JSON.parse(readFileSync(distPath, 'utf-8'));

    const deptMap = new Map(departamentos.map((d) => [d.id, d.name]));
    const provMap = new Map(provincias.map((p) => [p.id, p.name]));

    const ubigeoData = distritos.map((d) => ({
      codigo: d.id,
      departamento: deptMap.get(d.department_id) || '',
      provincia: provMap.get(d.province_id) || '',
      distrito: d.name,
    }));

    const batchSize = 500;
    for (let i = 0; i < ubigeoData.length; i += batchSize) {
      await prisma.ubigeo.createMany({
        data: ubigeoData.slice(i, i + batchSize),
        skipDuplicates: true,
      });
    }
    console.log(`   ✅ Ubigeos sembrados (${ubigeoData.length})`);
  } catch (error) {
    console.log(
      '⚠️ No se pudieron sembrar los ubigeos todavía:',
      (error as Error)?.message,
    );
  }
}
