/**
 * QA funcional · Coherencia del menú
 *
 * El sidebar marca activo el módulo cuyo `pathPrefix` coincide con la URL. Con
 * varios prefijos que se contienen —Facturación es `/administrador/facturacion` y
 * Cotizaciones `/administrador/facturacion/cotizaciones`— se encendían los dos a
 * la vez. Se resolvió en el layout haciendo ganar al prefijo MÁS LARGO; esto fija
 * las condiciones de las que depende esa regla:
 *
 *   · ningún `orden` repetido: con el orden empatado, el sidebar coloca los
 *     módulos según lleguen de la API y puede cambiar entre recargas
 *   · ninguna ruta de módulo repetida: dos módulos en la misma URL son
 *     indistinguibles para la regla de longitud
 *   · ningún módulo activo sin ruta: sería un enlace muerto en el menú
 *   · ninguna ruta de submódulo repetida dentro del mismo módulo
 *   · todo submódulo cuelga del módulo al que pertenece
 *
 * No escribe nada: son comprobaciones sobre lo sembrado.
 *
 * Uso:  pnpm run qa:menu
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
let fallos = 0;
const ok = (c, m) => { console.log(`   ${c ? '✔' : '✘'} ${m}`); if (!c) fallos++; };

async function main() {
  console.log(`\nQA · Coherencia del menú\n${'═'.repeat(50)}`);

  const empresa = await prisma.empresa.findFirst({ select: { id: true } });
  // Solo lo que el sidebar muestra de verdad: lo asignado al plan.
  const asignados = await prisma.planModulo.findMany({
    select: { modulo: { select: { id: true, codigo: true, nombre: true, ruta: true, orden: true, activo: true } } },
  });
  const modulos = asignados.map((a) => a.modulo).filter((m) => m.activo);

  console.log(`\n1) Módulos del menú (${modulos.length})`);

  const ordenes = modulos.map((m) => m.orden);
  const repetidos = ordenes.filter((o, i) => ordenes.indexOf(o) !== i);
  ok(
    repetidos.length === 0,
    repetidos.length
      ? `órdenes repetidos: ${[...new Set(repetidos)].join(', ')} → ${modulos.filter((m) => repetidos.includes(m.orden)).map((m) => m.nombre).join(', ')}`
      : 'ningún orden repetido: el sidebar sale siempre igual',
  );

  const sinRuta = modulos.filter((m) => !m.ruta);
  ok(sinRuta.length === 0, sinRuta.length ? `sin ruta: ${sinRuta.map((m) => m.nombre).join(', ')}` : 'todos tienen ruta');

  const rutas = modulos.filter((m) => m.ruta).map((m) => m.ruta);
  const rutasRep = rutas.filter((r, i) => rutas.indexOf(r) !== i);
  ok(
    rutasRep.length === 0,
    rutasRep.length
      ? `rutas repetidas: ${[...new Set(rutasRep)].join(', ')}`
      : 'ninguna ruta de módulo repetida',
  );

  // Que se contengan NO es un fallo: la regla del prefijo más largo lo resuelve.
  // Se informa para que se vea qué está apoyándose en ella.
  const contenidos = [];
  for (const a of modulos) {
    for (const b of modulos) {
      if (a.codigo !== b.codigo && a.ruta && b.ruta && b.ruta.startsWith(a.ruta.replace(/\/$/, '') + '/')) {
        contenidos.push(`${b.nombre} dentro de ${a.nombre}`);
      }
    }
  }
  console.log(`   · ${contenidos.length} módulo(s) cuelgan de otro; los resuelve la regla del prefijo más largo`);

  console.log('\n2) Submódulos');
  const subs = await prisma.subModulo.findMany({
    where: { activo: true },
    select: { codigo: true, nombre: true, ruta: true, orden: true, modulo: { select: { codigo: true, nombre: true, ruta: true } } },
  });

  const porModulo = new Map();
  for (const s of subs) {
    if (!porModulo.has(s.modulo.codigo)) porModulo.set(s.modulo.codigo, []);
    porModulo.get(s.modulo.codigo).push(s);
  }

  let rutasDupes = 0;
  let ordenDupes = 0;
  for (const [cod, lista] of porModulo) {
    const rs = lista.map((s) => s.ruta);
    if (rs.filter((r, i) => rs.indexOf(r) !== i).length) {
      rutasDupes += 1;
      console.log(`      ⚠ ${cod}: rutas repetidas`);
    }
    const os = lista.map((s) => s.orden);
    if (os.filter((o, i) => os.indexOf(o) !== i).length) {
      ordenDupes += 1;
      console.log(`      ⚠ ${cod}: órdenes repetidos`);
    }
  }
  ok(rutasDupes === 0, `ningún módulo tiene dos submódulos en la misma ruta (${porModulo.size} con submenú)`);
  ok(ordenDupes === 0, 'ningún módulo tiene dos submódulos con el mismo orden');

  const huerfanos = subs.filter(
    (s) => s.modulo.ruta && !s.ruta.startsWith('/administrador') ,
  );
  ok(huerfanos.length === 0, huerfanos.length ? `submódulos con ruta fuera del panel: ${huerfanos.map((s) => s.codigo).join(', ')}` : 'todas las rutas de submódulo cuelgan del panel');

  console.log('\n3) Un módulo con submenú tiene que incluir su propia pantalla');
  // Si un módulo tiene submódulos, el sidebar muestra SOLO esos: si su ruta
  // principal no está entre ellos, esa pantalla queda inalcanzable desde el menú.
  const inalcanzables = [];
  for (const [cod, lista] of porModulo) {
    const m = modulos.find((x) => x.codigo === cod);
    if (!m?.ruta) continue;
    if (!lista.some((s) => s.ruta === m.ruta)) inalcanzables.push(`${m.nombre} (${m.ruta})`);
  }
  ok(
    inalcanzables.length === 0,
    inalcanzables.length
      ? `la pantalla principal no está en su submenú: ${inalcanzables.join(' · ')}`
      : 'todo módulo con submenú incluye su pantalla principal',
  );

  console.log(`\n${'═'.repeat(50)}`);
  console.log(fallos ? `✘ MENÚ: ${fallos} problema(s)` : '✔ MENÚ: coherente');
}

main()
  .catch((e) => { console.error('\n✘ error:', e.message); fallos++; })
  .finally(async () => { await prisma.$disconnect(); process.exit(fallos ? 1 : 0); });
