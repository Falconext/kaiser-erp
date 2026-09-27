/**
 * QA funcional de la trazabilidad por código.
 *
 * Almacén lo pidió con tres requisitos textuales:
 *   1. "Historial de transacciones por usuario: nombre de la persona que creó,
 *      modificó o anuló cualquier movimiento de stock."
 *   2. "Línea de tiempo del producto: un reporte cronológico que ordene de
 *      forma consecutiva cada ingreso, transferencia, despacho y ajuste."
 *   3. "Sello de tiempo: fecha y hora exacta del registro en el sistema, para
 *      compararla con la fecha física del documento."
 *
 * El tercero es el que de verdad sirve: si una factura del día 3 se registró el
 * 12, el stock estuvo nueve días mintiendo. Esta prueba fabrica ese caso y el
 * de un descuadre, y verifica que el reporte los caza.
 *
 *   pnpm run qa:trazabilidad
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
const SEDE = 1;

let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

async function api(ruta, { token, ...init } = {}) {
  const r = await fetch(API + ruta, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j, data: j?.data };
}
async function login(email = 'gerencia@kaisercorp.com.pe') {
  const { data } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: 'kaiser123' }) });
  if (!data?.requiresSedeSelection) return data.accessToken;
  const { data: sel } = await api('/auth/select-sede', {
    token: data.tempToken || data.accessToken || data.token,
    method: 'POST', body: JSON.stringify({ sedeId: SEDE }),
  });
  return sel.accessToken;
}

async function main() {
  const token = await login();
  const producto = await prisma.producto.findFirst({
    where: { empresaId: 1 },
    orderBy: { id: 'desc' },
    select: { id: true, codigo: true, descripcion: true },
  });
  const usuario = await prisma.usuario.findFirst({ where: { email: { startsWith: 'almacen' } }, select: { id: true, nombre: true } });
  console.log(`Producto de prueba: ${producto.codigo} (id ${producto.id})\n`);

  const dia = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(10, 0, 0, 0); return d; };
  const creados = [];

  const mover = async (datos) => {
    const m = await prisma.movimientoKardex.create({ data: { productoId: producto.id, empresaId: 1, sedeId: SEDE, ...datos } });
    creados.push(m.id);
    return m;
  };

  // Tres movimientos encadenados. El segundo se "registró" 9 días tarde y el
  // tercero arranca de un saldo que no coincide con el anterior.
  await mover({
    tipoMovimiento: 'INGRESO', concepto: 'QA · compra inicial', cantidad: 100,
    stockAnterior: 0, stockActual: 100,
    fecha: dia(-20), creadoEn: dia(-20), usuarioId: usuario.id,
  });
  await mover({
    tipoMovimiento: 'SALIDA', concepto: 'QA · despacho registrado tarde', cantidad: 30,
    stockAnterior: 100, stockActual: 70,
    fecha: dia(-15), creadoEn: dia(-6), usuarioId: usuario.id,   // 9 días de desfase
  });
  await mover({
    tipoMovimiento: 'AJUSTE', concepto: 'QA · parte de un saldo que no cuadra', cantidad: 5,
    stockAnterior: 62, stockActual: 67,                           // 70 ≠ 62 → descuadre
    fecha: dia(-3), creadoEn: dia(-3), usuarioId: null,
  });

  const r = await api(`/kardex/trazabilidad/${producto.codigo}`, { token });
  ok(r.status === 200, `el reporte responde (HTTP ${r.status})`);
  const d = r.data ?? {};
  const linea = d.lineaDeTiempo ?? [];
  const mios = linea.filter((m) => String(m.concepto).startsWith('QA ·'));

  console.log('\n1) Línea de tiempo cronológica');
  mios.forEach((m) =>
    console.log(`   ${String(m.fecha).slice(0, 10)}  ${m.tipoMovimiento.padEnd(8)} ${String(m.cantidad).padStart(6)}  ${m.stockAnterior} → ${m.stockActual}  · ${m.concepto}`));
  ok(mios.length === 3, `están los 3 movimientos (${mios.length})`);
  const fechas = mios.map((m) => new Date(m.fecha).getTime());
  ok(fechas.every((f, i) => i === 0 || f >= fechas[i - 1]), 'salen en orden cronológico');

  console.log('\n2) Sello de tiempo · detectar lo registrado tarde');
  const tarde = mios.find((m) => /tarde/.test(m.concepto));
  ok(tarde?.diasDeDesfase === null || tarde?.diasDeDesfase >= 0, 'calcula el desfase');
  ok((d.resumen?.registradosTarde ?? 0) >= 1, `el resumen cuenta ${d.resumen?.registradosTarde} registro(s) tardío(s)`);
  ok((d.resumen?.mayorDesfaseEnDias ?? 0) >= 9, `el mayor desfase es de ${d.resumen?.mayorDesfaseEnDias} días (el despacho se tecleó 9 días después)`);
  console.log(`   fecha del documento ${String(tarde?.fecha).slice(0,10)} · registrado el ${String(tarde?.registradoEn).slice(0,10)}`);

  console.log('\n3) Descuadres · alguien tocó el stock por fuera');
  const desc = (d.descuadres ?? []);
  ok(desc.length >= 1, `detecta ${desc.length} descuadre(s)`);
  const mio = desc.find((x) => Math.abs(x.esperado - 70) < 0.001 && Math.abs(x.encontrado - 62) < 0.001);
  ok(!!mio, mio ? `esperaba ${mio.esperado} y encontró ${mio.encontrado}` : 'no encontró el descuadre fabricado');

  console.log('\n4) Historial por usuario');
  (d.porUsuario ?? []).forEach((u) => console.log(`   ${u.usuario.padEnd(36)} ${u.movimientos} mov · +${u.ingresos} / -${u.salidas}`));
  const almacen = (d.porUsuario ?? []).find((u) => u.usuario === usuario.nombre);
  ok(!!almacen, `aparece ${usuario.nombre} con sus movimientos`);
  ok((d.porUsuario ?? []).some((u) => /Sin usuario/.test(u.usuario)), 'los movimientos sin usuario se agrupan aparte, no se ocultan');

  console.log('\n5) Documento vinculado');
  const conDoc = linea.filter((m) => m.documento?.numero);
  ok(conDoc.length >= 1, `${conDoc.length} movimiento(s) enlazan con su documento`);
  if (conDoc.length) console.log(`   ejemplo: ${conDoc[0].documento.tipo} ${conDoc[0].documento.numero}`);

  console.log('\n6) Se puede pedir por id y por código');
  const porId = await api(`/kardex/trazabilidad/${producto.id}`, { token });
  ok(porId.status === 200 && porId.data?.producto?.codigo === producto.codigo, 'el id devuelve el mismo producto');

  console.log('\n7) Producto inexistente');
  const noExiste = await api('/kardex/trazabilidad/CODIGO-QUE-NO-EXISTE', { token });
  ok(noExiste.status === 404, `HTTP ${noExiste.status}`);

  console.log('\n8) Limpieza');
  await prisma.movimientoKardex.deleteMany({ where: { id: { in: creados } } });
  const tras = await api(`/kardex/trazabilidad/${producto.codigo}`, { token });
  ok(!(tras.data?.lineaDeTiempo ?? []).some((m) => String(m.concepto).startsWith('QA ·')), 'los movimientos de prueba ya no están');

  console.log(`\n${fallos === 0 ? '✔ QA COMPLETO: todo correcto' : `✘ ${fallos} comprobación(es) fallaron`}`);
  process.exitCode = fallos ? 1 : 0;
}

main().catch((e) => { console.error('✖', String(e?.message ?? e).slice(0, 300)); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
