/**
 * QA funcional del aviso de mercadería por llegar.
 *
 * Almacén lo pidió así: "no puedo recibir la alerta en el ERP sobre la
 * mercadería que está por llegar". El aviso sale de la `fechaEntrega` que la
 * orden de compra ya guardaba.
 *
 *   pnpm run qa:por-llegar
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AvisarMercaderiaPorLlegarService } from '../scheduler/services/avisar-mercaderia-por-llegar.service';
import { PrismaService } from '../prisma/prisma.service';

let fallos = 0;
const ok = (c: boolean, m: string) => {
  console.log(`   ${c ? '✔' : '✘'} ${m}`);
  if (!c) fallos++;
};

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const svc = app.get(AvisarMercaderiaPorLlegarService);
  const prisma = app.get(PrismaService);

  const proveedor = await prisma.cliente.findFirst({ where: { empresaId: 1 }, select: { id: true } });
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const dia = (n: number) => { const d = new Date(hoy); d.setDate(d.getDate() + n); return d; };

  const max = await prisma.ordenCompra.aggregate({ _max: { numero: true } });
  let num = max._max.numero ?? 0;

  // Cinco escenarios: dentro de la ventana, fuera, vencida y ya recibida.
  const casos: [string, number, string][] = [
    ['llega hoy', 0, 'EMITIDA'],
    ['llega en 2 días', 2, 'EMITIDA'],
    ['llega en 10 días', 10, 'EMITIDA'],
    ['entrega vencida', -4, 'EMITIDA'],
    ['ya recibida', 1, 'RECIBIDA'],
  ];
  const creadas: { id: number; numero: number }[] = [];
  for (const [, dias, estado] of casos) {
    const o = await prisma.ordenCompra.create({
      data: {
        empresaId: 1, proveedorId: proveedor!.id, numero: ++num, estado: estado as any,
        fechaEmision: hoy, fechaEntrega: dia(dias),
        subtotal: 100 as any, igv: 18 as any, total: 118 as any,
      },
      select: { id: true, numero: true },
    });
    creadas.push(o);
  }
  const mios = creadas.map((c) => `OC-${String(c.numero).padStart(6, '0')}`);

  const previas = new Set((await prisma.notificacion.findMany({ select: { id: true } })).map((n) => n.id));
  await svc.ejecutar();
  const nuevas = (
    await prisma.notificacion.findMany({
      where: { empresaId: 1 },
      select: { id: true, titulo: true, mensaje: true, tipo: true, usuarioId: true },
    })
  ).filter((n) => !previas.has(n.id) && mios.some((t) => n.titulo.startsWith(t)));

  const titulos = [...new Set(nuevas.map((n) => n.titulo))];
  console.log('\navisos de las órdenes de prueba:');
  titulos.forEach((t) => {
    const n = nuevas.find((x) => x.titulo === t)!;
    console.log(`   [${n.tipo}] ${n.mensaje}`);
  });
  console.log('');

  ok(titulos.length === 3, `avisa de 3 de las 5 órdenes creadas (avisó de ${titulos.length})`);
  ok(!nuevas.some((n) => /en 10 día/.test(n.mensaje)), 'la que llega en 10 días queda fuera de la ventana');
  ok(nuevas.some((n) => /llega hoy/.test(n.mensaje)), 'avisa de la que llega hoy');
  ok(nuevas.some((n) => n.tipo === 'WARNING' && /venció/.test(n.mensaje)), 'la vencida sale como WARNING');

  const users = await prisma.usuario.findMany({
    where: { id: { in: [...new Set(nuevas.map((n) => n.usuarioId))] } },
    select: { email: true },
  });
  const quienes = users.map((u) => u.email.split('@')[0]).sort();
  console.log(`   destinatarios: ${quienes.join(', ')}`);
  ok(quienes.includes('almacen'), 'le llega a almacén, que es quien recibe');
  ok(quienes.includes('gerencia'), 'le llega a gerencia');
  ok(!quienes.includes('produccion'), 'NO a producción: mueve stock pero no recibe compras');
  ok(!quienes.includes('ventas'), 'NO a ventas');

  const n1 = nuevas.length;
  await svc.ejecutar();
  const n2 = (
    await prisma.notificacion.findMany({ where: { empresaId: 1 }, select: { id: true, titulo: true } })
  ).filter((n) => !previas.has(n.id) && mios.some((t) => n.titulo.startsWith(t))).length;
  ok(n2 === n1, `no insiste si el aviso anterior sigue sin leer (${n1} → ${n2})`);

  for (const t of titulos) await prisma.notificacion.deleteMany({ where: { titulo: t } });
  await prisma.ordenCompra.deleteMany({ where: { id: { in: creadas.map((c) => c.id) } } });
  console.log('\n   órdenes y avisos de prueba eliminados');
  console.log(`\n${fallos === 0 ? '✔ QA COMPLETO: todo correcto' : `✘ ${fallos} comprobación(es) fallaron`}`);

  await app.close();
  process.exitCode = fallos ? 1 : 0;
}

main().catch((e) => {
  console.error('✖', String(e?.message ?? e).slice(0, 400));
  process.exit(1);
});
