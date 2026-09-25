/**
 * Siembra ventas históricas (Notas de venta) de junio a septiembre 2026 para
 * que los reportes de gerencia (por vendedor, cliente, producto, sector y
 * ubigeo) tengan datos en la demo. Usa el endpoint de importación de histórico
 * (`POST /comprobante/importar/nota-venta`), que NO toca stock ni caja y NO
 * envía nada a SUNAT — es el mismo mecanismo que se usará en la migración.
 *
 * El vendedor de cada venta es el usuario con el que se registra, por eso el
 * script alterna sesiones de ventas@ y gerencia@.
 *
 * Uso: node src/scripts/seed-demo-ventas.mjs [API_URL]
 * Idempotente: si la serie-correlativo ya existe, la salta.
 */
const API = process.argv[2] || process.env.API_URL || 'http://localhost:4201/api';
const PASSWORD = 'kaiser123';
const VENDEDORES = ['ventas@kaisercorp.com.pe', 'gerencia@kaisercorp.com.pe'];

const CLIENTES = {
  ICA: { ruc: '20530012345', nombre: 'AGROEXPORTADORA VALLE DE ICA S.A.C.' },
  NORTE: { ruc: '20481122334', nombre: 'AVÍCOLA NORTE VERDE S.A.C.' },
  OLMOS: { ruc: '20600998877', nombre: 'AGRÍCOLA OLMOS EXPORT S.A.' },
  SUR: { ruc: '20455667788', nombre: 'GRANJAS DEL SUR E.I.R.L.' },
  DOBLE_R: { ruc: '20612255963', nombre: 'DOBLE R SOLUTIONS S.A.C.' },
};
const P = {
  MODULO_AM_2P: ['10460GALI0001', 'MÓDULO MODELO AMERICANO/POSTURA 2 PISOS', 689.9],
  MODULO_LEV_2P: ['10461GALI0009', 'MÓDULO MODELO LEVANTE 2 PISOS', 419.14],
  ALAMBRE_250: ['20510GACC0003', 'ALAMBRE GALV. 3Z ACC 2.50 MM', 7.75],
  ALAMBRE_ACC: ['20110GACC0002', 'ALAMBRE GALV. ACC 2.50 MM', 7.19],
  ALAMBRE_NEG: ['10210ANEG0022', 'ALAMBRE ACERADO NEGRO 3.60 MM.', 14.69],
  RASCHEL_80: ['10830RASC0004', 'MALLA PLAST. RASCHEL 80% VERDE LISO 4.20X100 MTS', 520.43],
  ANTIPAJARO: ['22330ANTP0001', 'MALLA ANTIPAJARO EXTRUIDA 17 GR 16MMX19MM', 4810.05],
  REJA_MARINA: ['20150REJA0022', 'REJA DEACERO MARINA 2.40 MTS X 3.0 MTS', 445.31],
  POSTE_REJA_25: ['20450POST0002', 'POSTE VERDE PARA REJA - 2.50 MT', 134.13],
  ANCLAJE_38: ['10490VARI0026', 'ANCLAJE GALV. LISO DE 3/8', 14.49],
};
const item = (k, cantidad) => ({ productoCodigo: P[k][0], descripcion: P[k][1], cantidad, precioUnitario: P[k][2] });

// [fecha, cliente, vendedorIdx, medioPago, detalles]
const VENTAS = [
  ['2026-06-03', 'ICA', 0, 'TRANSFERENCIA', [item('RASCHEL_80', 12), item('ALAMBRE_250', 300)]],
  ['2026-06-05', 'NORTE', 1, 'TRANSFERENCIA', [item('MODULO_AM_2P', 6), item('ANCLAJE_38', 60)]],
  ['2026-06-10', 'OLMOS', 0, 'TRANSFERENCIA', [item('ANTIPAJARO', 2), item('POSTE_REJA_25', 40)]],
  ['2026-06-12', 'SUR', 1, 'EFECTIVO', [item('MODULO_LEV_2P', 4)]],
  ['2026-06-18', 'ICA', 0, 'TRANSFERENCIA', [item('REJA_MARINA', 10), item('POSTE_REJA_25', 24)]],
  ['2026-06-24', 'DOBLE_R', 1, 'YAPE', [item('ALAMBRE_NEG', 120)]],
  ['2026-06-27', 'NORTE', 0, 'TRANSFERENCIA', [item('ALAMBRE_ACC', 800)]],
  ['2026-07-02', 'OLMOS', 0, 'TRANSFERENCIA', [item('RASCHEL_80', 20)]],
  ['2026-07-07', 'ICA', 1, 'TRANSFERENCIA', [item('MODULO_AM_2P', 10), item('ANCLAJE_38', 100)]],
  ['2026-07-09', 'SUR', 0, 'EFECTIVO', [item('ALAMBRE_250', 150), item('ANCLAJE_38', 30)]],
  ['2026-07-14', 'NORTE', 0, 'TRANSFERENCIA', [item('MODULO_LEV_2P', 8)]],
  ['2026-07-17', 'ICA', 0, 'TRANSFERENCIA', [item('ANTIPAJARO', 3)]],
  ['2026-07-22', 'DOBLE_R', 1, 'TRANSFERENCIA', [item('REJA_MARINA', 4), item('POSTE_REJA_25', 10)]],
  ['2026-07-28', 'OLMOS', 1, 'TRANSFERENCIA', [item('ALAMBRE_ACC', 1200), item('ALAMBRE_NEG', 200)]],
  ['2026-08-04', 'ICA', 0, 'TRANSFERENCIA', [item('RASCHEL_80', 15), item('ALAMBRE_250', 400)]],
  ['2026-08-06', 'NORTE', 1, 'TRANSFERENCIA', [item('MODULO_AM_2P', 12)]],
  ['2026-08-11', 'SUR', 0, 'EFECTIVO', [item('MODULO_LEV_2P', 3), item('ANCLAJE_38', 24)]],
  ['2026-08-13', 'OLMOS', 0, 'TRANSFERENCIA', [item('REJA_MARINA', 16), item('POSTE_REJA_25', 40)]],
  ['2026-08-19', 'ICA', 1, 'TRANSFERENCIA', [item('ANTIPAJARO', 4), item('ALAMBRE_ACC', 500)]],
  ['2026-08-21', 'DOBLE_R', 0, 'YAPE', [item('ALAMBRE_NEG', 80)]],
  ['2026-08-26', 'NORTE', 0, 'TRANSFERENCIA', [item('ALAMBRE_250', 1000)]],
  ['2026-08-28', 'OLMOS', 1, 'TRANSFERENCIA', [item('RASCHEL_80', 30)]],
  ['2026-09-01', 'ICA', 0, 'TRANSFERENCIA', [item('MODULO_AM_2P', 8), item('ANCLAJE_38', 80)]],
  ['2026-09-03', 'SUR', 1, 'EFECTIVO', [item('ALAMBRE_250', 200)]],
  ['2026-09-05', 'NORTE', 0, 'TRANSFERENCIA', [item('MODULO_LEV_2P', 6), item('ALAMBRE_ACC', 300)]],
  ['2026-09-08', 'OLMOS', 0, 'TRANSFERENCIA', [item('ANTIPAJARO', 2), item('POSTE_REJA_25', 20)]],
  ['2026-09-10', 'ICA', 1, 'TRANSFERENCIA', [item('REJA_MARINA', 12)]],
  ['2026-09-11', 'DOBLE_R', 0, 'TRANSFERENCIA', [item('RASCHEL_80', 6)]],
];

async function api(token, method, path, body) {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.code === 0) throw new Error(`${method} ${path} → ${res.status} ${json.message || JSON.stringify(json)}`);
  return json.data ?? json;
}
const login = async (email) => (await api(null, 'POST', 'auth/login', { email, password: PASSWORD })).accessToken;

(async () => {
  const tokens = await Promise.all(VENDEDORES.map(login));
  const existentes = new Set();
  try {
    const d = await api(tokens[1], 'GET', 'comprobante?tipoDoc=NV&limit=500');
    const list = Array.isArray(d) ? d : d?.items ?? d?.data ?? d?.comprobantes ?? [];
    for (const c of list) existentes.add(`${c.serie}-${c.correlativo}`);
  } catch { /* si el listado tiene otra forma, se confía en el error de duplicado */ }

  let n = 0;
  for (const [fecha, cli, vIdx, medioPago, detalles] of VENTAS) {
    n += 1;
    const correlativo = String(n).padStart(6, '0');
    const key = `NV01-${correlativo}`;
    if (existentes.has(key)) { console.log('• ya existe', key); continue; }
    const c = CLIENTES[cli];
    try {
      await api(tokens[vIdx], 'POST', 'comprobante/importar/nota-venta', {
        tipoDoc: 'NV', serie: 'NV01', correlativo, fechaEmision: fecha,
        clienteTipoDoc: 'RUC', clienteNumDoc: c.ruc, clienteNombre: c.nombre,
        medioPago, estadoPago: 'PAGADO', detalles, afectarStock: false, afectarCaja: false,
      });
      const total = detalles.reduce((s, d) => s + d.cantidad * d.precioUnitario, 0);
      console.log('•', key, fecha, cli, VENDEDORES[vIdx].split('@')[0], 'S/', total.toFixed(2));
    } catch (e) {
      if (/ya existe|duplicad/i.test(e.message)) console.log('• ya existe', key);
      else throw e;
    }
  }
  console.log('\n✅ Ventas históricas sembradas.');
})().catch((e) => { console.error('❌', e.message); process.exit(1); });
