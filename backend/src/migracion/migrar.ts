/**
 * Migrador del histórico de Kaiser.
 *
 * Carga un Excel con las hojas definidas en `esquema.ts`. Dos garantías que
 * hacen que se pueda correr en producción sin miedo:
 *
 *   · `--dry-run` valida todo y no escribe nada. Se repite hasta que el
 *     archivo sale limpio; recién ahí se corre de verdad.
 *   · Es idempotente: cada fila se busca por su clave natural (documento,
 *     código, serie+número) y se actualiza en vez de duplicarse. Volver a
 *     correrlo sobre datos ya migrados no rompe nada.
 *
 * Los comprobantes históricos se migran como documentos YA emitidos y NO se
 * envían a SUNAT: el sistema anterior ya los declaró. Se marcan con el origen
 * `[migracion]` para poder distinguirlos siempre de lo emitido por el ERP.
 *
 * Uso:
 *   npx ts-node -r tsconfig-paths/register src/migracion/migrar.ts <archivo.xlsx> [--dry-run] [--solo=VENTAS,COMPRAS]
 *
 * Y si algo sale mal, se deshace todo lo cargado:
 *   npx ts-node -r tsconfig-paths/register src/migracion/migrar.ts --revertir
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { ESQUEMA } from './esquema';
import { leerYValidar, validarReferencias, ErrorFila, HojaLeida } from './validar';

const prisma = new PrismaClient();

/** Marca el origen de todo lo migrado, para poder auditarlo o revertirlo. */
export const ORIGEN = '[migracion]';
const IGV = 0.18;
const r2 = (n: number) => Math.round(n * 100) / 100;

const args = process.argv.slice(2);
const ARCHIVO = args.find((a) => !a.startsWith('--'));
const DRY_RUN = args.includes('--dry-run');
const REVERTIR = args.includes('--revertir');
const SOLO = (args.find((a) => a.startsWith('--solo=')) || '')
  .replace('--solo=', '')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean);

interface Resumen {
  hoja: string;
  leidas: number;
  creadas: number;
  actualizadas: number;
  omitidas: number;
  nota?: string;
}

const TIPO_DOC_SUNAT: Record<string, string> = {
  RUC: '6', DNI: '1', CE: '4', PASAPORTE: '7', OTROS: '0',
};
const TIPO_COMPROBANTE: Record<string, string> = {
  FACTURA: '01', BOLETA: '03', NOTA_VENTA: 'NV',
};

async function main() {
  if (REVERTIR) {
    await revertir();
    return;
  }

  if (!ARCHIVO || !existsSync(ARCHIVO)) {
    console.error('✖ Indica el archivo Excel de migración.');
    console.error('  npx ts-node -r tsconfig-paths/register src/migracion/migrar.ts <archivo.xlsx> [--dry-run]');
    process.exitCode = 1;
    return;
  }

  const empresa = await prisma.empresa.findFirst();
  if (!empresa) throw new Error('No hay empresa creada. Arranca el backend una vez para que se siembre.');

  console.log(`\n${DRY_RUN ? '🔍 SIMULACIÓN (no se escribe nada)' : '▶ MIGRACIÓN'} — ${ARCHIVO}\n`);

  // ── 1. Leer y validar ─────────────────────────────────────────────────────
  const leidas = leerYValidar(ARCHIVO);
  const errores: ErrorFila[] = [
    ...leidas.flatMap((l) => l.errores),
    ...validarReferencias(leidas),
  ];

  for (const l of leidas) {
    const estado = l.ausente
      ? l.hoja.opcional ? 'no incluida (opcional)' : '⚠ NO INCLUIDA (obligatoria)'
      : `${l.filas.length} fila(s)`;
    console.log(`  ${l.hoja.hoja.padEnd(16)} ${estado}`);
  }

  const faltanObligatorias = leidas.filter((l) => l.ausente && !l.hoja.opcional);
  if (faltanObligatorias.length) {
    console.log(`\n⚠ Faltan hojas obligatorias: ${faltanObligatorias.map((l) => l.hoja.hoja).join(', ')}`);
  }

  if (errores.length) {
    console.log(`\n✖ ${errores.length} error(es). No se escribe nada hasta corregirlos.\n`);
    for (const e of errores.slice(0, 25)) {
      console.log(`  ${e.hoja} fila ${String(e.fila).padStart(4)} · ${e.columna}: ${e.motivo}${e.valor ? ` (venía "${e.valor}")` : ''}`);
    }
    if (errores.length > 25) console.log(`  … y ${errores.length - 25} más (ver el reporte)`);
  } else {
    console.log('\n✔ Sin errores de validación.');
  }

  const resumenes: Resumen[] = [];

  // ── 2. Cargar, si procede ─────────────────────────────────────────────────
  if (!DRY_RUN && !errores.length) {
    const quiere = (h: string) => !SOLO.length || SOLO.includes(h);
    const de = (n: string) => leidas.find((l) => l.hoja.hoja === n)!;

    if (quiere('CLIENTES')) resumenes.push(await cargarClientes(de('CLIENTES'), empresa.id));
    if (quiere('PRODUCTOS')) resumenes.push(await cargarProductos(de('PRODUCTOS'), empresa.id));
    if (quiere('INVENTARIO')) resumenes.push(await cargarInventario(de('INVENTARIO'), empresa.id));
    if (quiere('VENTAS')) resumenes.push(await cargarVentas(de('VENTAS'), de('VENTAS_DETALLE'), empresa.id));
    if (quiere('COMPRAS')) resumenes.push(await cargarCompras(de('COMPRAS'), empresa.id));

    console.log('');
    for (const r of resumenes) {
      console.log(`  ${r.hoja.padEnd(16)} ${String(r.creadas).padStart(5)} creadas  ${String(r.actualizadas).padStart(5)} actualizadas  ${String(r.omitidas).padStart(5)} omitidas${r.nota ? `  — ${r.nota}` : ''}`);
    }
  } else if (!DRY_RUN) {
    console.log('\n⏸ No se cargó nada: corrige los errores y vuelve a correrlo.');
  }

  // ── 3. Reporte ────────────────────────────────────────────────────────────
  const ruta = join(process.cwd(), `reporte-migracion-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(ruta, construirReporte(leidas, errores, resumenes), 'utf-8');
  console.log(`\n📄 Reporte: ${ruta}\n`);
}

/**
 * Deshace todo lo que cargó el migrador.
 *
 * Es posible porque cada registro migrado queda marcado con `[migracion]` en
 * observaciones. Solo toca lo que trae esa marca: lo que el ERP haya emitido
 * después queda intacto. Es la red de seguridad de la puesta en marcha — si el
 * corte sale mal, se revierte y se vuelve a cargar sin rehacer la base.
 */
async function revertir() {
  const empresa = await prisma.empresa.findFirst();
  if (!empresa) throw new Error('No hay empresa.');
  const empresaId = empresa.id;

  const comprobantes = await prisma.comprobante.findMany({
    where: { empresaId, observaciones: { contains: ORIGEN } }, select: { id: true },
  });
  const ids = comprobantes.map((c) => c.id);

  let detalles = 0;
  if (ids.length) {
    await prisma.comisionVendedor.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.pago.deleteMany({ where: { comprobanteId: { in: ids } } });
    await prisma.leyenda.deleteMany({ where: { comprobanteId: { in: ids } } });
    detalles = (await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: { in: ids } } })).count;
    await prisma.comprobante.deleteMany({ where: { id: { in: ids } } });
  }

  const compras = await prisma.compra.findMany({
    where: { empresaId, observaciones: { contains: ORIGEN } }, select: { id: true },
  });
  if (compras.length) {
    const cids = compras.map((c) => c.id);
    await prisma.detalleCompra.deleteMany({ where: { compraId: { in: cids } } });
    await prisma.compra.deleteMany({ where: { id: { in: cids } } });
  }

  const kardex = await prisma.movimientoKardex.deleteMany({
    where: { empresaId, observacion: { contains: ORIGEN } },
  });

  console.log('\n↺ Reversión de la migración\n');
  console.log(`  Comprobantes ..... ${ids.length} (con ${detalles} línea(s) de detalle)`);
  console.log(`  Compras .......... ${compras.length}`);
  console.log(`  Movimientos kardex ${kardex.count}`);
  console.log('');
  console.log('  Los clientes y productos NO se borran: son datos maestros que');
  console.log('  pueden estar ya en uso. Si hay que quitarlos, se hace a mano.');
  console.log('  El stock queda como estaba: vuelve a cargarse con la hoja INVENTARIO.\n');
}

// ─── Cargadores ───────────────────────────────────────────────────────────────

async function cargarClientes(l: HojaLeida, empresaId: number): Promise<Resumen> {
  const res: Resumen = { hoja: 'CLIENTES', leidas: l.filas.length, creadas: 0, actualizadas: 0, omitidas: 0 };
  if (l.ausente) return { ...res, nota: 'hoja no incluida' };

  const tipos = await prisma.tipoDocumento.findMany();
  const idTipo = (t: string) =>
    tipos.find((x) => x.codigo === TIPO_DOC_SUNAT[t])?.id ?? null;

  for (const f of l.filas) {
    const persona =
      f.rol === 'AMBOS' ? 'CLIENTE_PROVEEDOR' : f.rol === 'PROVEEDOR' ? 'PROVEEDOR' : 'CLIENTE';
    const datos = {
      nombre: f.nombre,
      direccion: f.direccion || null,
      email: f.email || null,
      telefono: f.telefono || null,
      ubigeo: f.ubigeo || null,
      departamento: f.departamento || null,
      provincia: f.provincia || null,
      distrito: f.distrito || null,
      sector: f.sector || null,
      persona: persona as any,
      tipoDocumentoId: idTipo(f.tipo_doc),
    };

    const existente = await prisma.cliente.findFirst({
      where: { empresaId, nroDoc: String(f.num_doc) },
      select: { id: true },
    });
    if (existente) {
      await prisma.cliente.update({ where: { id: existente.id }, data: datos });
      res.actualizadas++;
    } else {
      await prisma.cliente.create({
        data: { ...datos, nroDoc: String(f.num_doc), empresaId },
      });
      res.creadas++;
    }
  }
  return res;
}

async function cargarProductos(l: HojaLeida, empresaId: number): Promise<Resumen> {
  const res: Resumen = { hoja: 'PRODUCTOS', leidas: l.filas.length, creadas: 0, actualizadas: 0, omitidas: 0 };
  if (l.ausente) return { ...res, nota: 'catálogo ya cargado con import:kaiser' };

  const unidades = await prisma.unidadMedida.findMany();
  const unidadPorDefecto = unidades[0];

  for (const f of l.filas) {
    const codigo = String(f.codigo).toUpperCase();
    const unidad =
      unidades.find((u: any) => String(u.codigo || '').toUpperCase() === String(f.unidad).toUpperCase()) ||
      unidadPorDefecto;

    let categoriaId: number | undefined;
    if (f.categoria) {
      const cat = await prisma.categoria.findFirst({ where: { empresaId, nombre: f.categoria } });
      categoriaId = cat?.id ?? (await prisma.categoria.create({ data: { nombre: f.categoria, empresaId } })).id;
    }

    const precio = f.precio_venta ?? 0;
    const datos: any = {
      descripcion: f.descripcion,
      precioUnitario: new Prisma.Decimal(precio),
      valorUnitario: new Prisma.Decimal(r2(precio / (1 + IGV))),
      // El costo real va solo en costoPromedio: el análisis financiero suma
      // costoPromedio + costoFijo, y duplicarlo infla el costo de mercadería.
      costoPromedio: new Prisma.Decimal(f.costo ?? 0),
      costoFijo: new Prisma.Decimal(0),
      ...(categoriaId ? { categoriaId } : {}),
      ...(f.codigo_barras ? { codigoBarras: String(f.codigo_barras) } : {}),
    };

    const existente = await prisma.producto.findFirst({ where: { empresaId, codigo }, select: { id: true } });
    if (existente) {
      await prisma.producto.update({ where: { id: existente.id }, data: datos });
      res.actualizadas++;
    } else {
      await prisma.producto.create({
        data: { ...datos, codigo, empresaId, unidadMedidaId: unidad.id },
      });
      res.creadas++;
    }
  }
  return res;
}

async function cargarInventario(l: HojaLeida, empresaId: number): Promise<Resumen> {
  const res: Resumen = { hoja: 'INVENTARIO', leidas: l.filas.length, creadas: 0, actualizadas: 0, omitidas: 0 };
  if (l.ausente) return { ...res, nota: 'hoja no incluida' };

  const sedes = await prisma.sede.findMany({ where: { empresaId } });

  for (const f of l.filas) {
    const producto = await prisma.producto.findFirst({
      where: { empresaId, codigo: String(f.codigo_producto).toUpperCase() },
      select: { id: true },
    });
    if (!producto) { res.omitidas++; continue; }

    const sede =
      sedes.find((s) => s.nombre.toUpperCase() === String(f.almacen).toUpperCase()) || sedes[0];
    if (!sede) { res.omitidas++; continue; }

    // Un solo movimiento de apertura por producto+sede: si ya existe, se ajusta
    // en vez de agregar otro ingreso (si no, reimportar duplicaría el stock).
    const yaAbierto = await prisma.movimientoKardex.findFirst({
      where: { empresaId, productoId: producto.id, sedeId: sede.id, observacion: { contains: `${ORIGEN} apertura` } },
      select: { id: true },
    });

    await prisma.producto.update({
      where: { id: producto.id },
      data: { stock: new Prisma.Decimal(f.cantidad) },
    });

    const stockSede = await prisma.productoStock.findFirst({
      where: { productoId: producto.id, sedeId: sede.id }, select: { id: true },
    });
    if (stockSede) {
      await prisma.productoStock.update({ where: { id: stockSede.id }, data: { stock: new Prisma.Decimal(f.cantidad) } });
    } else {
      await prisma.productoStock.create({
        data: { productoId: producto.id, sedeId: sede.id, stock: new Prisma.Decimal(f.cantidad) },
      });
    }

    const costo = f.costo_unitario ?? 0;
    if (yaAbierto) {
      await prisma.movimientoKardex.update({
        where: { id: yaAbierto.id },
        data: {
          cantidad: new Prisma.Decimal(f.cantidad),
          stockActual: new Prisma.Decimal(f.cantidad),
          costoUnitario: new Prisma.Decimal(costo),
          valorTotal: new Prisma.Decimal(r2(costo * f.cantidad)),
        },
      });
      res.actualizadas++;
    } else {
      await prisma.movimientoKardex.create({
        data: {
          empresaId, sedeId: sede.id, productoId: producto.id,
          tipoMovimiento: 'INGRESO',
          concepto: 'Saldo inicial migrado',
          cantidad: new Prisma.Decimal(f.cantidad),
          stockAnterior: new Prisma.Decimal(0),
          stockActual: new Prisma.Decimal(f.cantidad),
          costoUnitario: new Prisma.Decimal(costo),
          valorTotal: new Prisma.Decimal(r2(costo * f.cantidad)),
          fecha: f.fecha_corte,
          ...(f.lote ? { lote: String(f.lote) } : {}),
          observacion: `${ORIGEN} apertura de inventario al ${new Date(f.fecha_corte).toISOString().slice(0, 10)}`,
        } as any,
      });
      res.creadas++;
    }
  }
  return res;
}

async function cargarVentas(l: HojaLeida, det: HojaLeida, empresaId: number): Promise<Resumen> {
  const res: Resumen = { hoja: 'VENTAS', leidas: l.filas.length, creadas: 0, actualizadas: 0, omitidas: 0 };
  if (l.ausente) return { ...res, nota: 'hoja no incluida' };

  const sede = await prisma.sede.findFirst({ where: { empresaId } });
  const usuarios = await prisma.usuario.findMany({ where: { empresaId }, select: { id: true, email: true } });

  // Detalle agrupado por comprobante, para no recorrer la hoja por cada venta.
  const detallePorDoc = new Map<string, Record<string, any>[]>();
  if (det && !det.ausente) {
    for (const d of det.filas) {
      const k = `${d.tipo_doc}|${d.serie}|${d.numero}`.toUpperCase();
      if (!detallePorDoc.has(k)) detallePorDoc.set(k, []);
      detallePorDoc.get(k)!.push(d);
    }
  }

  for (const f of l.filas) {
    const cliente = await prisma.cliente.findFirst({
      where: { empresaId, nroDoc: String(f.cliente_doc) }, select: { id: true },
    });
    if (!cliente) { res.omitidas++; continue; }

    const tipoDoc = TIPO_COMPROBANTE[f.tipo_doc];
    const correlativo = Number(String(f.numero).replace(/\D/g, '')) || 0;
    const saldo = f.saldo_pendiente ?? 0;
    const vendedor = f.vendedor_email
      ? usuarios.find((u) => u.email?.toLowerCase() === String(f.vendedor_email).toLowerCase())
      : undefined;

    const datos: any = {
      clienteId: cliente.id,
      usuarioId: vendedor?.id ?? null,
      fechaEmision: f.fecha_emision,
      tipoMoneda: f.moneda,
      tipoCambio: new Prisma.Decimal(f.moneda === 'USD' ? f.tipo_cambio ?? 1 : 1),
      formaPagoMoneda: f.moneda,
      formaPagoTipo: saldo > 0 ? 'Credito' : 'Contado',
      tipoOperacionId: 1,
      mtoOperGravadas: new Prisma.Decimal(f.gravado),
      mtoIGV: new Prisma.Decimal(f.igv),
      valorVenta: new Prisma.Decimal(f.gravado),
      totalImpuestos: new Prisma.Decimal(f.igv),
      subTotal: new Prisma.Decimal(f.total),
      mtoImpVenta: new Prisma.Decimal(f.total),
      saldo: new Prisma.Decimal(saldo),
      estadoPago: saldo > 0 ? 'PENDIENTE_PAGO' : 'COMPLETADO',
      // Ya declarado por el sistema anterior: no se reenvía a SUNAT.
      estadoEnvioSunat: 'NO_APLICA',
      observaciones: `${ORIGEN}${f.observaciones ? ` ${f.observaciones}` : ''}`,
      sedeId: sede?.id ?? null,
    };

    const existente = await prisma.comprobante.findFirst({
      where: { empresaId, tipoDoc, serie: String(f.serie), correlativo },
      select: { id: true },
    });

    let comprobanteId: number;
    if (existente) {
      await prisma.comprobante.update({ where: { id: existente.id }, data: datos });
      await prisma.detalleComprobante.deleteMany({ where: { comprobanteId: existente.id } });
      comprobanteId = existente.id;
      res.actualizadas++;
    } else {
      const creado = await prisma.comprobante.create({
        data: { ...datos, empresaId, tipoDoc, serie: String(f.serie), correlativo },
      });
      comprobanteId = creado.id;
      res.creadas++;
    }

    const lineas = detallePorDoc.get(`${f.tipo_doc}|${f.serie}|${f.numero}`.toUpperCase()) ?? [];
    for (const d of lineas) {
      const prod = await prisma.producto.findFirst({
        where: { empresaId, codigo: String(d.codigo_producto).toUpperCase() },
        select: { id: true, descripcion: true, unidadVenta: true },
      });
      if (!prod) continue;
      const precio = d.precio_unitario;
      const valorUnit = r2(precio / (1 + IGV));
      const valorVenta = r2(valorUnit * d.cantidad);
      await prisma.detalleComprobante.create({
        data: {
          comprobanteId, productoId: prod.id,
          unidad: prod.unidadVenta || 'NIU',
          descripcion: prod.descripcion,
          cantidad: new Prisma.Decimal(d.cantidad),
          mtoValorUnitario: new Prisma.Decimal(valorUnit),
          mtoValorVenta: new Prisma.Decimal(valorVenta),
          mtoBaseIgv: new Prisma.Decimal(valorVenta),
          porcentajeIgv: new Prisma.Decimal(18),
          igv: new Prisma.Decimal(r2(valorVenta * IGV)),
          tipAfeIgv: 10,
          totalImpuestos: new Prisma.Decimal(r2(valorVenta * IGV)),
          mtoPrecioUnitario: new Prisma.Decimal(precio),
          mtoDescuento: new Prisma.Decimal(0),
        } as any,
      });
    }
  }

  res.nota = detallePorDoc.size ? `${detallePorDoc.size} con detalle` : 'solo cabeceras';
  return res;
}

async function cargarCompras(l: HojaLeida, empresaId: number): Promise<Resumen> {
  const res: Resumen = { hoja: 'COMPRAS', leidas: l.filas.length, creadas: 0, actualizadas: 0, omitidas: 0 };
  if (l.ausente) return { ...res, nota: 'hoja no incluida' };

  for (const f of l.filas) {
    const proveedor = await prisma.cliente.findFirst({
      where: { empresaId, nroDoc: String(f.proveedor_doc) }, select: { id: true },
    });
    if (!proveedor) { res.omitidas++; continue; }

    const saldo = f.saldo_pendiente ?? 0;
    const datos: any = {
      proveedorId: proveedor.id,
      fechaEmision: f.fecha_emision,
      fechaVencimiento: f.fecha_vencimiento ?? null,
      moneda: f.moneda,
      tipoCambio: new Prisma.Decimal(f.moneda === 'USD' ? f.tipo_cambio ?? 1 : 1),
      subtotal: new Prisma.Decimal(f.subtotal),
      igv: new Prisma.Decimal(f.igv),
      total: new Prisma.Decimal(f.total),
      saldo: new Prisma.Decimal(saldo),
      estadoPago: saldo > 0 ? 'PENDIENTE_PAGO' : 'COMPLETADO',
      // El stock entra por la hoja INVENTARIO: si estas compras movieran
      // kardex, el inventario quedaría contado dos veces.
      observaciones: `${ORIGEN} histórico — no mueve stock`,
    };

    const existente = await prisma.compra.findFirst({
      where: { empresaId, proveedorId: proveedor.id, serie: String(f.serie), numero: String(f.numero) },
      select: { id: true },
    });
    if (existente) {
      await prisma.compra.update({ where: { id: existente.id }, data: datos });
      res.actualizadas++;
    } else {
      await prisma.compra.create({
        data: { ...datos, empresaId, serie: String(f.serie), numero: String(f.numero), tipoDoc: 'FACTURA' },
      });
      res.creadas++;
    }
  }
  return res;
}

// ─── Reporte ──────────────────────────────────────────────────────────────────

function construirReporte(leidas: HojaLeida[], errores: ErrorFila[], resumenes: Resumen[]): string {
  const L: string[] = [];
  L.push(`# Reporte de migración — ${new Date().toLocaleString('es-PE')}`, '');
  L.push(`Archivo: \`${ARCHIVO}\``);
  L.push(`Modo: **${DRY_RUN ? 'simulación (no se escribió nada)' : 'carga real'}**`, '');

  L.push('## Hojas leídas', '');
  L.push('| Hoja | Estado | Filas |', '|---|---|---|');
  for (const l of leidas) {
    const estado = l.ausente ? (l.hoja.opcional ? 'no incluida (opcional)' : '**falta (obligatoria)**') : 'leída';
    L.push(`| ${l.hoja.hoja} | ${estado} | ${l.ausente ? '—' : l.filas.length} |`);
  }
  L.push('');

  if (resumenes.length) {
    L.push('## Cargado', '');
    L.push('| Hoja | Creadas | Actualizadas | Omitidas | Nota |', '|---|---|---|---|---|');
    for (const r of resumenes) {
      L.push(`| ${r.hoja} | ${r.creadas} | ${r.actualizadas} | ${r.omitidas} | ${r.nota ?? ''} |`);
    }
    L.push('');
  }

  L.push(`## Errores (${errores.length})`, '');
  if (!errores.length) {
    L.push('Ninguno. El archivo está listo para cargarse.', '');
  } else {
    L.push('Corrige estas filas en el Excel y vuelve a correr la simulación.', '');
    L.push('| Hoja | Fila | Columna | Valor | Motivo |', '|---|---|---|---|---|');
    for (const e of errores) {
      L.push(`| ${e.hoja} | ${e.fila} | ${e.columna} | ${e.valor || '—'} | ${e.motivo} |`);
    }
    L.push('');
  }

  L.push('## Qué revisar después de cargar', '');
  L.push('- Inventario → Productos: que el stock cuadre con la toma física del corte.');
  L.push('- Facturación → Comprobantes: que el conteo y los totales cuadren con el sistema anterior.');
  L.push('- Finanzas → Cuentas por cobrar: que el saldo total cuadre con el reporte de deuda de clientes.');
  L.push('- Compras: que el saldo por pagar cuadre con el reporte de deuda a proveedores.');
  L.push('');
  L.push(`Todo lo migrado queda marcado con \`${ORIGEN}\` en observaciones.`);
  return L.join('\n');
}

main()
  .catch((e) => { console.error('✖', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
