/**
 * Enlaza las guías de remisión ya emitidas con el comprobante que despachan.
 *
 * `GuiaRemision.comprobanteId` es nuevo. Antes el vínculo era una frase en
 * `observaciones` —"Traslado por venta F0A1-00000005", "Ref. FACTURA
 * B0A1-00000012"— que sirve para que la lea una persona y para nada más. Sin el
 * enlace, el aviso de despacho pendiente daría por NO despachado todo lo que se
 * despachó antes de este cambio, y nacería inservible.
 *
 * Este script recupera el enlace leyendo esa frase. Es seguro porque
 * serie+correlativo es único por empresa: o encuentra un comprobante exacto o no
 * toca la guía. No inventa nada y no pisa enlaces que ya existan.
 *
 *   pnpm run enlazar:guias              # en seco, dice qué haría
 *   pnpm run enlazar:guias -- --aplicar
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APLICAR = process.argv.includes('--aplicar');

/**
 * Serie y correlativo dentro de un texto libre. La serie de Kaiser son cuatro
 * caracteres alfanuméricos (F0A1, B0A1, NV01) y el correlativo va con ceros a la
 * izquierda, pero se acepta sin ellos por si alguien lo escribió a mano.
 */
const SERIE_CORRELATIVO = /\b([A-Z][A-Z0-9]{3})-0*(\d{1,8})\b/g;

async function main() {
  const guias = await prisma.guiaRemision.findMany({
    where: { comprobanteId: null },
    select: { id: true, empresaId: true, serie: true, correlativo: true, observaciones: true, tipoTraslado: true },
    orderBy: { id: 'asc' },
  });

  console.log(`\nGuías sin enlazar: ${guias.length}\n`);

  let enlazadas = 0;
  let sinReferencia = 0;
  let noEncontrado = 0;
  let ambiguas = 0;

  for (const g of guias) {
    const texto = g.observaciones ?? '';
    const propia = `${g.serie}-${String(g.correlativo).padStart(8, '0')}`;
    const refs = [...texto.matchAll(SERIE_CORRELATIVO)]
      // La propia serie de la guía no es una referencia a un comprobante.
      .filter((m) => `${m[1]}-${String(Number(m[2])).padStart(8, '0')}` !== propia)
      .map((m) => ({ serie: m[1], correlativo: Number(m[2]) }));

    if (!refs.length) {
      sinReferencia += 1;
      console.log(`  ${propia}  sin referencia en observaciones · «${texto.slice(0, 44) || '(vacío)'}»`);
      continue;
    }

    const candidatos = [];
    for (const r of refs) {
      const c = await prisma.comprobante.findFirst({
        where: { empresaId: g.empresaId, serie: r.serie, correlativo: r.correlativo },
        select: { id: true, serie: true, correlativo: true, tipoDoc: true },
      });
      if (c) candidatos.push(c);
    }

    const unicos = [...new Map(candidatos.map((c) => [c.id, c])).values()];
    if (!unicos.length) {
      noEncontrado += 1;
      console.log(`  ${propia}  referencia a ${refs.map((r) => `${r.serie}-${r.correlativo}`).join(', ')} pero ese comprobante no existe`);
      continue;
    }
    if (unicos.length > 1) {
      // No se adivina: una guía que menciona dos comprobantes se revisa a mano.
      ambiguas += 1;
      console.log(`  ${propia}  menciona ${unicos.length} comprobantes (${unicos.map((c) => `${c.serie}-${c.correlativo}`).join(', ')}) — se deja a mano`);
      continue;
    }

    const c = unicos[0];
    console.log(`  ${propia}  →  ${c.tipoDoc} ${c.serie}-${String(c.correlativo).padStart(8, '0')}`);
    if (APLICAR) {
      await prisma.guiaRemision.update({ where: { id: g.id }, data: { comprobanteId: c.id } });
    }
    enlazadas += 1;
  }

  console.log(`\n  enlazadas ........... ${enlazadas}`);
  console.log(`  sin referencia ...... ${sinReferencia}`);
  console.log(`  referencia inexistente ${noEncontrado}`);
  console.log(`  ambiguas ............ ${ambiguas}`);
  console.log(APLICAR ? '\n✔ Aplicado.\n' : '\n(en seco — añade -- --aplicar para escribir)\n');
}

main().finally(() => prisma.$disconnect());
