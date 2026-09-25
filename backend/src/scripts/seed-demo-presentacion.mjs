/**
 * Siembra el caso demo para la presentación a Kaiser a través de la API real
 * (no toca Prisma directamente) para que kardex, costos y estados queden igual
 * que si se hubieran registrado desde la pantalla.
 *
 * Caso: Alambre galvanizado → PISO soldado (nivel 1) → MÓDULO AMERICANO/POSTURA
 * 2 PISOS (nivel 2), con merma y costo real en cada nivel. Además: compras de
 * alambre con historial de precio (última a S/ 4.50 para que al comprar a 5.10
 * salte la alerta +13.33%), una compra en dólares, proveedores y clientes
 * agroexportadores con ubigeo y varias direcciones.
 *
 * Uso: node src/scripts/seed-demo-presentacion.mjs [API_URL]
 *      (API_URL por defecto http://localhost:4201/api)
 * Idempotente: cada bloque verifica si ya existe antes de crear.
 */

const API = process.argv[2] || process.env.API_URL || 'http://localhost:4201/api';
const EMAIL = process.env.SEED_EMAIL || 'gerencia@kaisercorp.com.pe';
const PASSWORD = process.env.SEED_PASSWORD || 'kaiser123';

// ---- Productos existentes en el catálogo Kaiser importado (ids estables del import) ----
const ALAMBRE_250 = 9; // ALAMBRE GALV. 3Z ACC 2.50 MM (KG)
const ALAMBRE_300 = 10; // ALAMBRE GALV. 3Z ACC 3.00 MM (KG)
const PISO_AMERICANO = 366; // PISO M. AMERICANO ELEC 2X1 III ZINC
const RECETA_MODULO_AMERICANO_2P = 5; // MÓDULO MODELO AMERICANO/POSTURA 2 PISOS
const IMPLEMENTOS_MODULO = [
  { id: 367, cantidad: 30 }, // TECHO/PUERTA FRENTE M.AMERICANO
  { id: 368, cantidad: 30 }, // DIVISION M. AMERICANO
  { id: 369, cantidad: 30 }, // PUERTA M. AMERICANO
  { id: 370, cantidad: 40 }, // SOPORTE POSTURA 2 PISOS MAG-CENTRAL
  { id: 371, cantidad: 40 }, // SOPORTE POSTURA 2 PISOS MAG-ESTANDAR
];
const USUARIO_PRODUCCION = 4;
const SEDE = 1;

let token = '';
const log = (...a) => console.log('•', ...a);

async function api(method, path, body) {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.code === 0) {
    throw new Error(`${method} ${path} → ${res.status} ${json.message || JSON.stringify(json)}`);
  }
  return json.data ?? json;
}
const unwrapList = (d) => (Array.isArray(d) ? d : d?.items ?? d?.data ?? d?.clientes ?? d?.compras ?? []);

async function login() {
  const d = await api('POST', 'auth/login', { email: EMAIL, password: PASSWORD });
  token = d.accessToken || d.access_token;
  if (!token) throw new Error('Login sin token');
  log('Login OK como', EMAIL);
}

// ---------------------------------------------------------------- proveedores
const PROVEEDORES = [
  {
    nombre: 'ACEROS Y ALAMBRES DEL PACÍFICO S.A.C.',
    tipoDoc: 'RUC', nroDoc: '20512345678',
    direccion: 'Av. Argentina 2450, Callao', email: 'ventas@acerospacifico.pe', telefono: '014512345',
    ubigeo: '070101', departamento: 'Callao', provincia: 'Callao', distrito: 'Callao',
    persona: 'PROVEEDOR', contactoNombre: 'Luis Paredes', contactoTelefono: '987654321', contactoEmail: 'lparedes@acerospacifico.pe',
  },
  {
    nombre: 'SIDERÚRGICA ANDINA IMPORT S.A.',
    tipoDoc: 'RUC', nroDoc: '20487654321',
    direccion: 'Jr. Zorritos 1203, Lima', email: 'compras@siderandina.pe', telefono: '013301122',
    ubigeo: '150101', departamento: 'Lima', provincia: 'Lima', distrito: 'Lima',
    persona: 'PROVEEDOR', contactoNombre: 'Rosa Quispe', contactoTelefono: '998877665', contactoEmail: 'rquispe@siderandina.pe',
  },
];

async function findClienteByDoc(nroDoc) {
  const d = await api('GET', `clientes?search=${nroDoc}&limit=5`).catch(() => null);
  const list = unwrapList(d);
  return list.find((c) => c.nroDoc === nroDoc) || null;
}

async function seedProveedores() {
  const out = [];
  for (const p of PROVEEDORES) {
    let c = await findClienteByDoc(p.nroDoc);
    if (!c) { c = await api('POST', 'clientes', p); log('Proveedor creado:', p.nombre); }
    else log('Proveedor ya existe:', p.nombre);
    out.push(c);
  }
  return out;
}

// -------------------------------------------------------------------- compras
async function compraExiste(serie, numero) {
  const d = await api('GET', `compras?search=${numero}&limit=20`).catch(() => null);
  return unwrapList(d).some((c) => c.serie === serie && String(c.numero) === String(numero));
}

async function seedCompras([provA, provB]) {
  const compras = [
    // Historial de alambre 2.50 mm: 4.20 → 4.35 → 4.50 (la demo compra a 5.10 ⇒ +13.33 %)
    { proveedorId: provA.id, serie: 'F001', numero: '000245', fechaEmision: '2026-06-10', moneda: 'PEN',
      detalles: [{ productoId: ALAMBRE_250, descripcion: 'ALAMBRE GALV. 3Z ACC 2.50 MM', cantidad: 2000, precioUnitario: 4.2 }],
      formaPago: 'CONTADO', montoPagadoInicial: 2000 * 4.2 * 1.18, metodoPagoInicial: 'TRANSFERENCIA' },
    { proveedorId: provA.id, serie: 'F001', numero: '000318', fechaEmision: '2026-07-22', moneda: 'PEN',
      detalles: [{ productoId: ALAMBRE_250, descripcion: 'ALAMBRE GALV. 3Z ACC 2.50 MM', cantidad: 1500, precioUnitario: 4.35 }],
      formaPago: 'CONTADO', montoPagadoInicial: 1500 * 4.35 * 1.18, metodoPagoInicial: 'TRANSFERENCIA' },
    { proveedorId: provA.id, serie: 'F001', numero: '000402', fechaEmision: '2026-08-28', fechaVencimiento: '2026-09-27', moneda: 'PEN',
      detalles: [{ productoId: ALAMBRE_250, descripcion: 'ALAMBRE GALV. 3Z ACC 2.50 MM', cantidad: 2000, precioUnitario: 4.5 }],
      formaPago: 'CREDITO', cuotas: [{ monto: +(2000 * 4.5 * 1.18).toFixed(2), fechaVencimiento: '2026-09-27' }],
      observaciones: 'Crédito 30 días' },
    // Compra en dólares: valida conversión a soles en el costo del kardex.
    { proveedorId: provB.id, serie: 'E001', numero: '000077', fechaEmision: '2026-08-15', moneda: 'USD', tipoCambio: 3.52,
      detalles: [{ productoId: ALAMBRE_300, descripcion: 'ALAMBRE GALV. 3Z ACC 3.00 MM', cantidad: 1000, precioUnitario: 1.55 }],
      formaPago: 'CONTADO', montoPagadoInicial: 1000 * 1.55 * 1.18, metodoPagoInicial: 'TRANSFERENCIA',
      observaciones: 'Compra en USD, TC 3.52' },
  ];
  for (const c of compras) {
    if (await compraExiste(c.serie, c.numero)) { log('Compra ya existe:', c.serie, c.numero); continue; }
    await api('POST', 'compras', { tipoDoc: 'FACTURA', sedeId: SEDE, ...c });
    log('Compra registrada:', c.serie, c.numero, c.moneda);
  }
}

// ----------------------------------------------------------------- producción
async function seedRecetaPiso() {
  const recetas = unwrapList(await api('GET', 'produccion/recetas'));
  let receta = recetas.find((r) => r.codigo === 'REC-PISO-AM-2X1');
  if (receta) { log('Receta piso ya existe'); return receta; }
  receta = await api('POST', 'produccion/recetas', {
    productoFinalId: PISO_AMERICANO,
    codigo: 'REC-PISO-AM-2X1',
    nombre: 'PISO M. AMERICANO ELEC 2X1 III ZINC (soldado desde alambre)',
    rendimientoObjetivo: 1,
    unidadRendimiento: 'UND',
    mermaObjetivoPorcentaje: 4,
    observaciones: 'Piso electrosoldado 2x1 m. Merma esperada por corte y puntas de alambre.',
    componentes: [
      { productoInsumoId: ALAMBRE_250, cantidadBase: 3.2, unidadBase: 'KG', mermaEsperadaPorcentaje: 4, orden: 1 },
      { productoInsumoId: ALAMBRE_300, cantidadBase: 0.6, unidadBase: 'KG', mermaEsperadaPorcentaje: 3, orden: 2 },
    ],
  });
  log('Receta piso creada (id', receta.id + ')');
  return receta;
}

async function setMermaObjetivoRecetas() {
  const recetas = unwrapList(await api('GET', 'produccion/recetas'));
  for (const r of recetas) {
    if (Number(r.mermaObjetivoPorcentaje || 0) > 0) continue;
    await api('PATCH', `produccion/recetas/${r.id}`, { mermaObjetivoPorcentaje: 3 });
  }
  log('Merma objetivo 3 % fijada en recetas sin objetivo');
}

async function ordenExiste(lote) {
  const d = await api('GET', 'produccion/ordenes');
  return unwrapList(d).find((o) => o.loteProduccion === lote) || null;
}

async function seedOrdenPisos(recetaPiso) {
  const lote = 'OP-2026-0001';
  let orden = await ordenExiste(lote);
  if (!orden) {
    orden = await api('POST', 'produccion/ordenes', {
      recetaId: recetaPiso.id, loteProduccion: lote, cantidadObjetivo: 40,
      fechaProgramada: '2026-09-01', usuarioResponsableId: USUARIO_PRODUCCION,
      observaciones: 'Lote de pisos para módulos americanos (pedido agroexportadoras)',
    });
    log('Orden', lote, 'creada');
  }
  if (orden.estado !== 'FINALIZADA') {
    await api('POST', `produccion/ordenes/${orden.id}/ejecutar`, {
      fechaInicio: '2026-09-02', fechaFin: '2026-09-04', cantidadProducida: 40,
      observaciones: 'Ejecución real de planta. Merma por puntas de alambre y 1 paño rechazado en control de calidad.',
      componentes: [
        { productoInsumoId: ALAMBRE_250, cantidadConsumida: 128, mermaCantidad: 5.4, observacion: 'Puntas de corte + paño rechazado' },
        { productoInsumoId: ALAMBRE_300, cantidadConsumida: 24, mermaCantidad: 0.8 },
      ],
    });
    log('Orden', lote, 'ejecutada: 40 pisos, merma 5.4 kg + 0.8 kg');
  } else log('Orden', lote, 'ya estaba finalizada');
}

async function seedStockImplementos() {
  for (const imp of IMPLEMENTOS_MODULO) {
    const st = await api('GET', `kardex/stock-actual/${imp.id}?sedeId=${SEDE}`).catch(() => null);
    const stock = Number(st?.stock ?? st?.stockActual ?? st ?? 0);
    if (stock > 0) { log('Implemento', imp.id, 'ya tiene stock', stock); continue; }
    await api('POST', 'kardex/ajuste', {
      productoId: imp.id, sedeId: SEDE, tipoAjuste: 'POSITIVO', cantidad: imp.cantidad,
      motivo: 'Saldo inicial implementos fabricados', observacion: 'Carga inicial demo (producción previa a la migración)',
    });
    log('Saldo inicial implemento', imp.id, '=', imp.cantidad);
  }
}

async function seedOrdenModulos() {
  const lote = 'OP-2026-0002';
  let orden = await ordenExiste(lote);
  if (!orden) {
    orden = await api('POST', 'produccion/ordenes', {
      recetaId: RECETA_MODULO_AMERICANO_2P, loteProduccion: lote, cantidadObjetivo: 10,
      fechaProgramada: '2026-09-08', usuarioResponsableId: USUARIO_PRODUCCION,
      observaciones: 'Módulos americanos/postura 2 pisos para AGROEXPORTADORA VALLE DE ICA',
    });
    log('Orden', lote, 'creada');
  }
  if (orden.estado !== 'FINALIZADA') {
    await api('POST', `produccion/ordenes/${orden.id}/ejecutar`, {
      fechaInicio: '2026-09-09', fechaFin: '2026-09-11', cantidadProducida: 10,
      observaciones: 'Armado y galvanizado. 1 piso dañado durante el ensamble.',
      componentes: [
        { productoInsumoId: PISO_AMERICANO, cantidadConsumida: 20, mermaCantidad: 1, observacion: 'Piso deformado en prensa' },
        { productoInsumoId: 367, cantidadConsumida: 10, mermaCantidad: 0 },
        { productoInsumoId: 368, cantidadConsumida: 10, mermaCantidad: 0 },
        { productoInsumoId: 369, cantidadConsumida: 10, mermaCantidad: 0 },
        { productoInsumoId: 370, cantidadConsumida: 20, mermaCantidad: 0 },
        { productoInsumoId: 371, cantidadConsumida: 20, mermaCantidad: 0 },
      ],
    });
    log('Orden', lote, 'ejecutada: 10 módulos, 1 piso de merma');
  } else log('Orden', lote, 'ya estaba finalizada');
}

// ------------------------------------------------------------------- clientes
const CLIENTES = [
  {
    nombre: 'AGROEXPORTADORA VALLE DE ICA S.A.C.', tipoDoc: 'RUC', nroDoc: '20530012345',
    direccion: 'Av. Conde de Nieva 450, Ica', email: 'logistica@valledeica.pe', telefono: '056234567',
    ubigeo: '110101', departamento: 'Ica', provincia: 'Ica', distrito: 'Ica', persona: 'CLIENTE',
    contactoNombre: 'María Fernanda Gálvez', contactoTelefono: '956123456', contactoEmail: 'mgalvez@valledeica.pe',
    direcciones: [
      { alias: 'Oficina Ica', direccion: 'Av. Conde de Nieva 450', departamento: 'Ica', provincia: 'Ica', distrito: 'Ica', ubigeo: '110101', esPrincipal: true },
      { alias: 'Fundo La Venta', direccion: 'Carretera Panamericana Sur km 285, Salas', departamento: 'Ica', provincia: 'Ica', distrito: 'Salas', ubigeo: '110108', referencia: 'Portón azul, garita 2' },
      { alias: 'Almacén Lurín', direccion: 'Av. Industrial Mz. C Lt. 12, Lurín', departamento: 'Lima', provincia: 'Lima', distrito: 'Lurin', ubigeo: '150119' },
    ],
  },
  {
    nombre: 'AVÍCOLA NORTE VERDE S.A.C.', tipoDoc: 'RUC', nroDoc: '20481122334',
    direccion: 'Av. América Sur 1580, Trujillo', email: 'compras@norteverde.pe', telefono: '044201122',
    ubigeo: '130101', departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Trujillo', persona: 'CLIENTE',
    contactoNombre: 'Jorge Alva', contactoTelefono: '949887766', contactoEmail: 'jalva@norteverde.pe',
    direcciones: [
      { alias: 'Sede Trujillo', direccion: 'Av. América Sur 1580', departamento: 'La Libertad', provincia: 'Trujillo', distrito: 'Trujillo', ubigeo: '130101', esPrincipal: true },
      { alias: 'Granja Virú', direccion: 'Sector San José, Virú', departamento: 'La Libertad', provincia: 'Virú', distrito: 'Viru', ubigeo: '131201', referencia: 'Ingreso por el canal Chavimochic' },
    ],
  },
  {
    nombre: 'AGRÍCOLA OLMOS EXPORT S.A.', tipoDoc: 'RUC', nroDoc: '20600998877',
    direccion: 'Km 12 Carretera Olmos - Motupe', email: 'proyectos@olmosexport.pe', telefono: '074512233',
    ubigeo: '140308', departamento: 'Lambayeque', provincia: 'Lambayeque', distrito: 'Olmos', persona: 'CLIENTE',
    contactoNombre: 'Carla Benites', contactoTelefono: '979001122', contactoEmail: 'cbenites@olmosexport.pe',
    direcciones: [
      { alias: 'Fundo Olmos', direccion: 'Km 12 Carretera Olmos - Motupe', departamento: 'Lambayeque', provincia: 'Lambayeque', distrito: 'Olmos', ubigeo: '140308', esPrincipal: true },
      { alias: 'Oficina Chiclayo', direccion: 'Calle San José 320, Of. 402', departamento: 'Lambayeque', provincia: 'Chiclayo', distrito: 'Chiclayo', ubigeo: '140101' },
    ],
  },
  {
    nombre: 'GRANJAS DEL SUR E.I.R.L.', tipoDoc: 'RUC', nroDoc: '20455667788',
    direccion: 'Irrigación La Joya, Lote 45', email: 'granjasdelsur@gmail.com', telefono: '054332211',
    ubigeo: '040108', departamento: 'Arequipa', provincia: 'Arequipa', distrito: 'La Joya', persona: 'CLIENTE',
    contactoNombre: 'Pedro Huamaní', contactoTelefono: '958443322',
    direcciones: [
      { alias: 'Granja La Joya', direccion: 'Irrigación La Joya, Lote 45', departamento: 'Arequipa', provincia: 'Arequipa', distrito: 'La Joya', ubigeo: '040108', esPrincipal: true },
    ],
  },
];

async function seedClientes() {
  for (const { direcciones, ...c } of CLIENTES) {
    let cli = await findClienteByDoc(c.nroDoc);
    if (!cli) { cli = await api('POST', 'clientes', c); log('Cliente creado:', c.nombre); }
    else log('Cliente ya existe:', c.nombre);
    const existentes = unwrapList(await api('GET', `clientes/${cli.id}/direcciones`).catch(() => []));
    for (const d of direcciones) {
      if (existentes.some((e) => e.alias === d.alias)) continue;
      await api('POST', `clientes/${cli.id}/direcciones`, d);
      log('  dirección', d.alias);
    }
  }
}

// ----------------------------------------------------------------------- main
(async () => {
  await login();
  const proveedores = await seedProveedores();
  await seedCompras(proveedores);
  await setMermaObjetivoRecetas();
  const recetaPiso = await seedRecetaPiso();
  await seedOrdenPisos(recetaPiso);
  await seedStockImplementos();
  await seedOrdenModulos();
  await seedClientes();
  console.log('\n✅ Caso demo sembrado.');
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
