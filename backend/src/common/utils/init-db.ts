import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { existsSync, copyFileSync, unlinkSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Presets de permisos por rol operativo de Kaiser. El control de accesos del ERP
 * es por ROL: la gerencia (ADMIN_EMPRESA) ve todo; cada rol operativo es un
 * USUARIO_EMPRESA acotado a estos códigos de módulo (ver utils/permissions en el
 * frontend). Ajustar aquí para cambiar qué ve cada área.
 */
export const PERMISOS_POR_ROL = {
  VENTAS: ['dashboard', 'pedidos', 'cotizaciones', 'clientes', 'comprobantes', 'caja', 'pagos', 'guias-remision'],
  ALMACEN: ['dashboard', 'kardex', 'compras', 'guias-remision'],
  PRODUCCION: ['dashboard', 'kardex', 'produccion'],
  CONTABILIDAD: ['dashboard', 'comprobantes', 'contabilidad', 'reportes', 'pagos'],
} as const;

/**
 * Personas facultadas para autorizar pedidos (acta POSIGESA, marzo 2026).
 * Alimentan el campo "Autorizado por" de la Nota de Pedido.
 */
export const AUTORIZADORES_KAISER = [
  { nombre: 'Cecilia Kaiser', telefono: '989007725' },
  { nombre: 'Karim Kaiser', telefono: '989007717' },
  { nombre: 'Stefanie Kaiser', telefono: '925410210' },
] as const;

/**
 * Catálogo de módulos del ERP de Kaiser. El sidebar se genera dinámicamente
 * desde `plan.modulosAsignados` (ver AdminLayout + sidebarMeta): estos son los
 * módulos que se siembran en la BD y se asignan al plan. `codigo` debe existir
 * en LEGACY_MODULE_ROUTES/MODULE_META del frontend; `ruta` apunta a una ruta
 * activa del ERP. Ajustar/ordenar aquí para cambiar el menú — nada en duro.
 */
export const MODULOS_KAISER = [
  { codigo: 'dashboard', nombre: 'Dashboard', icono: 'solar:widget-5-bold-duotone', ruta: '/administrador', orden: 1 },
  { codigo: 'pedidos', nombre: 'Pedidos', icono: 'solar:clipboard-list-bold-duotone', ruta: '/administrador/pedidos', orden: 2 },
  { codigo: 'cotizaciones', nombre: 'Cotizaciones', icono: 'solar:document-text-bold-duotone', ruta: '/administrador/facturacion/cotizaciones', orden: 3 },
  { codigo: 'comprobantes', nombre: 'Facturación', icono: 'solar:bill-list-bold-duotone', ruta: '/administrador/facturacion/comprobantes', orden: 3 },
  { codigo: 'clientes', nombre: 'Clientes', icono: 'solar:users-group-rounded-bold-duotone', ruta: '/administrador/clientes', orden: 4 },
  { codigo: 'kardex', nombre: 'Inventario', icono: 'solar:box-bold-duotone', ruta: '/administrador/kardex/productos', orden: 5 },
  { codigo: 'compras', nombre: 'Compras', icono: 'solar:cart-large-2-bold-duotone', ruta: '/administrador/compras', orden: 6 },
  { codigo: 'produccion', nombre: 'Producción', icono: 'solar:settings-minimalistic-bold-duotone', ruta: '/administrador/produccion/recetas', orden: 7 },
  { codigo: 'ventas', nombre: 'Ventas y Despacho', icono: 'solar:delivery-bold-duotone', ruta: '/administrador/ventas', orden: 8 },
  { codigo: 'guias-remision', nombre: 'Guías de Remisión', icono: 'solar:file-check-bold-duotone', ruta: '/administrador/facturacion/guia-remision', orden: 9 },
  { codigo: 'caja', nombre: 'Caja', icono: 'solar:safe-2-bold-duotone', ruta: '/administrador/ventas/caja', orden: 10 },
  { codigo: 'pagos', nombre: 'Pagos y Cobros', icono: 'solar:wallet-money-bold-duotone', ruta: '/administrador/ventas/pagos', orden: 11 },
  { codigo: 'contabilidad', nombre: 'Contabilidad', icono: 'solar:notebook-bold-duotone', ruta: '/administrador/contabilidad/reporte', orden: 12 },
  { codigo: 'reportes', nombre: 'Finanzas', icono: 'solar:chart-2-bold-duotone', ruta: '/administrador/finanzas/dashboard', orden: 13 },
  { codigo: 'sedes', nombre: 'Sedes', icono: 'solar:map-point-bold-duotone', ruta: '/administrador/sedes', orden: 14 },
  { codigo: 'usuarios', nombre: 'Usuarios', icono: 'solar:users-group-two-rounded-bold-duotone', ruta: '/administrador/usuarios', orden: 15 },
  { codigo: 'notificaciones', nombre: 'Notificaciones', icono: 'solar:bell-bold-duotone', ruta: '/administrador/notificaciones', orden: 16 },
] as const;

export async function initializeDatabase(prisma: PrismaService) {
  try {
    // For desktop deployments: handle SQLite database initialization
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.startsWith('file:')) {
      const dbPath = dbUrl.replace('file:', '');
      const templatePath = join(
        process.cwd(),
        'prisma',
        'nephi_pos_template.db',
      );

      // Check if we need to copy the template
      let needsCopy = false;

      if (!existsSync(dbPath)) {
        console.log('📦 Database not found, will copy template...');
        needsCopy = true;
      } else {
        // Database exists - check if it's empty/too small (corrupted)
        try {
          const stats = statSync(dbPath);
          // Template is ~438KB, if user db is much smaller, it's likely empty
          if (stats.size < 10000) {
            console.log(
              '📦 Database appears empty/corrupted, replacing with template...',
            );
            unlinkSync(dbPath);
            needsCopy = true;
          }
        } catch (e) {
          needsCopy = true;
        }
      }

      if (needsCopy && existsSync(templatePath)) {
        try {
          copyFileSync(templatePath, dbPath);
          console.log('✅ Database template copied successfully!');
        } catch (copyError) {
          console.error(
            '❌ Error copying template database:',
            copyError.message,
          );
        }
      } else if (needsCopy) {
        console.log('⚠️ No template database found, tables may be missing');
      }
    }

    // Seed SUNAT reference catalogs (UnidadMedida, TipoOperacion, MotivoNota,
    // TipoDocumento). Idempotent (upsert) and runs on EVERY boot — before the
    // "already initialized" early-return below — so existing databases get
    // backfilled, not only fresh ones.
    await seedCatalogosSunat(prisma);

    // Catálogo de Ubigeos (departamento/provincia/distrito). Se siembra una sola
    // vez (guardado por conteo) desde prisma/data/*.json — necesario para el
    // selector de ubicación al crear/editar empresas.
    await seedUbigeo(prisma);

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

    // 2.b Catálogo de módulos del ERP y su asignación al plan de Kaiser.
    //     El sidebar del frontend se genera dinámicamente desde
    //     `plan.modulosAsignados` (NADA en duro en el layout): sembramos aquí
    //     todos los módulos del ERP y los asignamos al plan. Idempotente.
    for (const m of MODULOS_KAISER) {
      const modulo = await prisma.modulo.upsert({
        where: { codigo_producto: { codigo: m.codigo, producto: 'facturacion' } },
        update: { nombre: m.nombre, icono: m.icono, ruta: m.ruta, orden: m.orden, activo: true },
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
        where: { empresaId_nombre: { empresaId: empresa.id, nombre: a.nombre } },
        update: { telefono: a.telefono },
        create: { empresaId: empresa.id, nombre: a.nombre, telefono: a.telefono, activo: true },
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

    const usuariosKaiser = [
      { nombre: 'Gerencia Kaiser', dni: '00000001', celular: '999000001',
        email: 'gerencia@kaisercorp.com.pe', rol: 'ADMIN_EMPRESA',
        permisos: ['*'] },
      { nombre: 'Ventas Kaiser', dni: '00000002', celular: '999000002',
        email: 'ventas@kaisercorp.com.pe', rol: 'USUARIO_EMPRESA',
        permisos: PERMISOS_POR_ROL.VENTAS },
      { nombre: 'Almacén Kaiser', dni: '00000003', celular: '999000003',
        email: 'almacen@kaisercorp.com.pe', rol: 'USUARIO_EMPRESA',
        permisos: PERMISOS_POR_ROL.ALMACEN },
      { nombre: 'Producción Kaiser', dni: '00000004', celular: '999000004',
        email: 'produccion@kaisercorp.com.pe', rol: 'USUARIO_EMPRESA',
        permisos: PERMISOS_POR_ROL.PRODUCCION },
      { nombre: 'Contabilidad Kaiser', dni: '00000005', celular: '999000005',
        email: 'contabilidad@kaisercorp.com.pe', rol: 'USUARIO_EMPRESA',
        permisos: PERMISOS_POR_ROL.CONTABILIDAD },
    ];

    for (const u of usuariosKaiser) {
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
    console.log('   Roles operativos: ventas | almacen | produccion | contabilidad @kaisercorp.com.pe (misma clave)');
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
 * Fuente canónica de los datos: prisma/desktop-seed.ts y
 * prisma/seeds/seed-detracciones.ts.
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
    for (const u of unidadesMedida) {
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
      { codigo: '0200', descripcion: 'EXPORTACIÓN DE SERVICIOS - PRESTACIÓN DE SERVICIOS REALIZADOS EN EL PAÍS' },
      { codigo: '0201', descripcion: 'EXPORTACIÓN DE SERVICIOS - PRESTACIÓN DE SERVICIOS REALIZADOS ÍNTEGRAMENTE EN EL EXTRANJERO' },
      { codigo: '0202', descripcion: 'EXPORTACIÓN DE SERVICIOS - SERVICIOS DE HOSPEDAJE NO DOMICILIADOS' },
      { codigo: '0205', descripcion: 'EXPORTACIÓN DE SERVICIOS - SERVICIOS A NAVES Y AERONAVES DE BANDERA EXTRANJERA' },
      { codigo: '0206', descripcion: 'EXPORTACIÓN DE SERVICIOS - SERVICIOS COMPLEMENTARIOS AL TRANSPORTE DE CARGA' },
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
      { tipo: 'CREDITO', codigo: '01', descripcion: 'ANULACIÓN DE LA OPERACIÓN' },
      { tipo: 'CREDITO', codigo: '02', descripcion: 'ANULACIÓN POR ERROR EN EL RUC' },
      { tipo: 'CREDITO', codigo: '03', descripcion: 'CORRECCIÓN POR ERROR EN LA DESCRIPCIÓN' },
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
      { tipo: 'DEBITO', codigo: '03', descripcion: 'PENALIDADES/OTROS CONCEPTOS' },
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
      { codigo: '008', descripcion: 'Residuos, subproductos, desechos, recortes y desperdicios', porcentaje: 15 },
      { codigo: '009', descripcion: 'Carnes y despojos comestibles', porcentaje: 4 },
      { codigo: '010', descripcion: 'Harina, polvo y pellets de pescado, crustáceos, moluscos', porcentaje: 4 },
      { codigo: '011', descripcion: 'Aceite de pescado', porcentaje: 10 },
      { codigo: '012', descripcion: 'Leche', porcentaje: 4 },
      { codigo: '014', descripcion: 'Bienes gravados con el IGV por renuncia a la exoneración', porcentaje: 10 },
      { codigo: '016', descripcion: 'Páprika y otros frutos del género capsicum o pimienta', porcentaje: 10 },
      { codigo: '017', descripcion: 'Espárragos', porcentaje: 10 },
      { codigo: '018', descripcion: 'Minerales metálicos no auríferos', porcentaje: 10 },
      { codigo: '023', descripcion: 'Plomo', porcentaje: 15 },
      { codigo: '029', descripcion: 'Minerales no metálicos', porcentaje: 10 },
      { codigo: '031', descripcion: 'Oro gravado con el IGV', porcentaje: 10 },
      { codigo: '034', descripcion: 'Oro y demás minerales metálicos exonerados del IGV', porcentaje: 1.5 },
      { codigo: '035', descripcion: 'Bienes exonerados del IGV', porcentaje: 1.5 },
      { codigo: '036', descripcion: 'Caña de azúcar', porcentaje: 10 },
      // SERVICIOS (Anexo 3)
      { codigo: '019', descripcion: 'Arrendamiento de bienes', porcentaje: 10 },
      { codigo: '020', descripcion: 'Mantenimiento y reparación de bienes muebles', porcentaje: 12 },
      { codigo: '021', descripcion: 'Movimiento de carga', porcentaje: 10 },
      { codigo: '022', descripcion: 'Otros servicios empresariales', porcentaje: 12 },
      { codigo: '024', descripcion: 'Comisión mercantil', porcentaje: 10 },
      { codigo: '025', descripcion: 'Fabricación de bienes por encargo', porcentaje: 10 },
      { codigo: '026', descripcion: 'Servicio de transporte de personas', porcentaje: 10 },
      { codigo: '027', descripcion: 'Servicio de transporte de carga', porcentaje: 4 },
      { codigo: '030', descripcion: 'Contratos de construcción', porcentaje: 4 },
      { codigo: '032', descripcion: 'Intermediación laboral y tercerización', porcentaje: 12 },
      { codigo: '037', descripcion: 'Demás servicios gravados con el IGV', porcentaje: 12 },
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
      { codigo: '006', descripcion: 'Tarjeta de crédito emitida en el país por empresa del sistema financiero' },
      { codigo: '007', descripcion: 'Cheques con la cláusula de "NO NEGOCIABLE", "INTRANSFERIBLES"' },
      { codigo: '008', descripcion: 'Efectivo, en operaciones en las que no supere S/ 500' },
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

    if (!existsSync(deptPath) || !existsSync(provPath) || !existsSync(distPath)) {
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
