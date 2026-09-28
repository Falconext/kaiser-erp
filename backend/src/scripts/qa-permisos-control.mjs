/**
 * Control negativo de la matriz de permisos (QA funcional · Fase 0).
 *
 * La matriz sale igual en todas las pasadas, lo cual no prueba nada por sí solo:
 * una matriz que devolviera siempre lo mismo pase lo que pase también saldría
 * igual. Aquí se le quita un permiso a un usuario de verdad y se exige que las
 * casillas que dependen de él se pongan en rojo, y que vuelvan al verde al
 * devolverlo.
 *
 * El permiso se restaura en el `finally`, y al final se compara la cadena de
 * permisos con la de antes de empezar.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const API = 'http://localhost:4201/api';
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

async function token(email) {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'kaiser123' }),
  });
  const { data } = await r.json();
  if (!data?.requiresSedeSelection) return data.accessToken;
  const r2 = await fetch(`${API}/auth/select-sede`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.tempToken}` },
    body: JSON.stringify({ sedeId: 1 }),
  });
  const cuerpo = await r2.json();
  if (r2.status >= 400 || !cuerpo?.data?.accessToken) {
    throw new Error(`select-sede falló (HTTP ${r2.status}): ${cuerpo?.message ?? 'sin mensaje'}`);
  }
  return cuerpo.data.accessToken;
}
async function probe(metodo, ruta, tk) {
  const r = await fetch(`${API}/${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tk}` },
    body: metodo === 'GET' ? undefined : '{}',
  });
  return r.status;
}

const EMAIL = 'almacen@kaisercorp.com.pe';

async function main() {
  const antes = await prisma.usuario.findFirst({ where: { email: EMAIL }, select: { id: true, permisos: true } });
  console.log(`Control negativo de permisos · usuario almacén (${JSON.parse(antes.permisos).length} permisos)\n`);
  console.log('La capa de lectura y la de escritura se prueban por separado: quitar\nuna no debe afectar a la otra.\n');

  const tk = await token(EMAIL);

  console.log('1) Con los dos permisos de compras puestos');
  const compras0 = await probe('GET', 'compras?limit=1', tk);
  const cli0 = await probe('POST', 'clientes', tk);
  const nuevaCompra0 = await probe('POST', 'compras', tk);
  ok(compras0 === 200, `GET compras → ${compras0} (se espera 200)`);
  ok(cli0 === 400, `POST clientes → ${cli0} (se espera 400: pasa el guard, cuerpo vacío)`);
  ok(nuevaCompra0 === 400, `POST compras → ${nuevaCompra0} (se espera 400)`);

  console.log('\n2) Se le quita solo `compras:escribir` (la capa de escritura)');
  try {
    const sinEscritura = JSON.parse(antes.permisos).filter((p) => p !== 'compras:escribir');
    await prisma.usuario.update({ where: { id: antes.id }, data: { permisos: JSON.stringify(sinEscritura) } });

    const lee = await probe('GET', 'compras?limit=1', tk);
    const escribe = await probe('POST', 'compras', tk);
    const cli = await probe('POST', 'clientes', tk);
    ok(lee === 200, `sigue leyendo compras → ${lee} (la lectura no depende de la escritura)`);
    ok(escribe === 403, `ya no puede crear compras → ${escribe}`);
    ok(cli === 403, `ya no puede dar de alta proveedores → ${cli}`);
  } finally {
    await prisma.usuario.update({ where: { id: antes.id }, data: { permisos: antes.permisos } });
  }

  console.log('\n2b) Se le quita solo `compras` (la capa de lectura)');
  try {
    const sinLectura = JSON.parse(antes.permisos).filter((p) => p !== 'compras');
    await prisma.usuario.update({ where: { id: antes.id }, data: { permisos: JSON.stringify(sinLectura) } });

    const lee = await probe('GET', 'compras?limit=1', tk);
    ok(lee === 403, `deja de leer compras → ${lee}`);

    // Lo que no depende de compras debe seguir intacto.
    const kardex = await probe('GET', 'kardex', tk);
    const ajuste = await probe('POST', 'kardex/ajuste', tk);
    ok(kardex === 200, `GET kardex sigue en ${kardex} (no depende de compras)`);
    ok(ajuste === 400, `POST kardex/ajuste sigue en ${ajuste} (depende de kardex:escribir)`);
  } finally {
    await prisma.usuario.update({ where: { id: antes.id }, data: { permisos: antes.permisos } });
  }

  console.log('\n3) Devuelto el permiso');
  const compras2 = await probe('GET', 'compras?limit=1', tk);
  const cli2 = await probe('POST', 'clientes', tk);
  const nuevaCompra2 = await probe('POST', 'compras', tk);
  ok(compras2 === compras0, `GET compras → ${compras2} (como al principio)`);
  ok(cli2 === cli0, `POST clientes → ${cli2} (como al principio)`);
  ok(nuevaCompra2 === nuevaCompra0, `POST compras → ${nuevaCompra2} (como al principio)`);

  const despues = await prisma.usuario.findFirst({ where: { email: EMAIL }, select: { permisos: true } });
  ok(despues.permisos === antes.permisos, 'los permisos quedaron exactamente como estaban');

  console.log(fallos === 0
    ? '\n✔ La matriz de permisos es falsable: se pone en rojo cuando debe.'
    : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
