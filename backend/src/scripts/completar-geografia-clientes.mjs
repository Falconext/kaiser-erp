/**
 * Completa `departamento` / `provincia` / `distrito` de los clientes a partir de su
 * `ubigeo`, contra la tabla Ubigeo que siembra init-db (1.874 distritos).
 *
 * Existe porque el reporte de ventas por zona agrupa por esos tres campos y un
 * cliente sin ellos cae en "SIN UBICACIÓN": la venta se cuenta en el total pero no
 * en ningún departamento, así que el mapa y la matriz mienten por debajo. El ubigeo
 * sí suele venir (lo trae la consulta RUC de apiperu), de modo que en la mayoría de
 * los casos no hay nada que teclear, solo que derivar.
 *
 * Normaliza además lo que ya estaba escrito a mano: "LIMA" y "Lima" se agrupaban
 * como dos zonas distintas en el groupBy de Prisma.
 *
 *   node src/scripts/completar-geografia-clientes.mjs            # en seco
 *   node src/scripts/completar-geografia-clientes.mjs --aplicar  # escribe
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');

// Se compara sin tildes ni mayúsculas: el ubigeo trae "Áncash" y a mano se escribe
// "ANCASH". Sin esto, el mismo departamento sale dos veces en el reporte.
const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase();

async function main() {
  const ubigeos = await prisma.ubigeo.findMany();
  const porCodigo = new Map(ubigeos.map((u) => [u.codigo, u]));
  // Índice por nombre de departamento para arreglar los que se escribieron a mano.
  const deptosCanonicos = new Map();
  for (const u of ubigeos) {
    const k = norm(u.departamento);
    if (!deptosCanonicos.has(k)) deptosCanonicos.set(k, u.departamento);
  }

  const clientes = await prisma.cliente.findMany({
    select: {
      id: true, nombre: true, nroDoc: true, ubigeo: true,
      departamento: true, provincia: true, distrito: true,
    },
  });

  const cambios = [];
  let sinUbigeoNiZona = 0;

  for (const c of clientes) {
    const u = c.ubigeo ? porCodigo.get(String(c.ubigeo).padStart(6, '0')) : null;
    const data = {};

    if (u) {
      // El ubigeo manda: es el dato oficial, no una cadena tecleada. La comparación
      // es EXACTA, no normalizada: "LIMA" y "Lima" describen la misma zona pero son
      // dos claves distintas para el groupBy de Prisma, y el reporte las separa en
      // dos filas. Normalizar solo al comparar dejaría pasar justo ese caso.
      // Con trim(): la tabla Ubigeo sembrada trae valores con espacios al final
      // ("Lima "), y copiarlos tal cual crearía exactamente la duplicación de claves
      // que este script viene a eliminar.
      const dep = u.departamento.trim();
      const pro = u.provincia.trim();
      const dis = u.distrito.trim();
      if (c.departamento !== dep) data.departamento = dep;
      if (c.provincia !== pro) data.provincia = pro;
      if (c.distrito !== dis) data.distrito = dis;
    } else if (c.departamento) {
      // Sin ubigeo: al menos se unifica la grafía del departamento escrito a mano.
      const canon = deptosCanonicos.get(norm(c.departamento));
      if (canon && canon !== c.departamento) data.departamento = canon;
    } else {
      sinUbigeoNiZona++;
    }

    if (Object.keys(data).length) cambios.push({ cliente: c, data });
  }

  console.log(`\nClientes: ${clientes.length}`);
  console.log(`Sin ubigeo ni zona (hay que completarlos a mano): ${sinUbigeoNiZona}`);
  console.log(`Con algo que corregir: ${cambios.length}\n`);

  for (const { cliente, data } of cambios) {
    const antes = [cliente.departamento, cliente.provincia, cliente.distrito]
      .filter(Boolean).join(' / ') || '(vacío)';
    const despues = [
      data.departamento ?? cliente.departamento,
      data.provincia ?? cliente.provincia,
      data.distrito ?? cliente.distrito,
    ].filter(Boolean).join(' / ');
    console.log(`  ${cliente.nroDoc ?? '-'} ${String(cliente.nombre).slice(0, 34).padEnd(34)} ${antes}  →  ${despues}`);
  }

  if (!APLICAR) {
    console.log(`\nEn seco. Repite con --aplicar para escribir.\n`);
  } else {
    for (const { cliente, data } of cambios) {
      await prisma.cliente.update({ where: { id: cliente.id }, data });
    }
    console.log(`\n${cambios.length} cliente(s) actualizado(s).\n`);
  }

  // Cómo queda el reparto, que es lo que verá el reporte.
  const final = await prisma.cliente.groupBy({
    by: ['departamento'], _count: true,
    orderBy: { _count: { departamento: 'desc' } },
  });
  console.log('Reparto por departamento:');
  for (const d of final) console.log(`  ${(d.departamento ?? '(sin zona)').padEnd(20)} ${d._count}`);
  console.log();
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
