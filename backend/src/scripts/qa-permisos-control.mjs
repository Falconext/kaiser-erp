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
  return (await r2.json()).data.accessToken;
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

  const tk = await token(EMAIL);

  console.log('1) Con el permiso `compras` puesto');
  const compras0 = await probe('GET', 'compras?limit=1', tk);
  const cli0 = await probe('POST', 'clientes', tk);
  ok(compras0 === 200, `GET compras → ${compras0} (se espera 200)`);
  ok(cli0 === 400, `POST clientes → ${cli0} (se espera 400: pasa el guard, cuerpo vacío)`);

  console.log('\n2) Se le quita `compras` en base de datos');
  try {
    const sin = JSON.parse(antes.permisos).filter((p) => p !== 'compras');
    await prisma.usuario.update({ where: { id: antes.id }, data: { permisos: JSON.stringify(sin) } });

    // El mismo token de antes: el guard lee los permisos de base en cada
    // petición, así que revocar debe surtir efecto sin volver a entrar.
    const compras1 = await probe('GET', 'compras?limit=1', tk);
    const cli1 = await probe('POST', 'clientes', tk);
    ok(compras1 === 403, `GET compras → ${compras1} (se espera 403)`);
    ok(cli1 === 403, `POST clientes → ${cli1} (se espera 403)`);
    ok(compras1 !== compras0 && cli1 !== cli0, 'la matriz se movió: está atada a los permisos reales');

    // Lo que NO depende de `compras` debe seguir intacto.
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
  ok(compras2 === compras0, `GET compras → ${compras2} (como al principio)`);
  ok(cli2 === cli0, `POST clientes → ${cli2} (como al principio)`);

  const despues = await prisma.usuario.findFirst({ where: { email: EMAIL }, select: { permisos: true } });
  ok(despues.permisos === antes.permisos, 'los permisos quedaron exactamente como estaban');

  console.log(fallos === 0
    ? '\n✔ La matriz de permisos es falsable: se pone en rojo cuando debe.'
    : `\n✘ ${fallos} comprobaciones fallidas`);
  await prisma.$disconnect();
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
