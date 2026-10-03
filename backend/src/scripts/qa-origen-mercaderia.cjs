/**
 * Comprueba que un ingreso por IMPORTACIÓN llegue al consolidado y a la
 * trazabilidad con su proveedor y su DUA, y no como "Ajuste manual" sin origen.
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
let ok = 0, mal = 0;
const check = (c, m) => { console.log((c ? '   ✔ ' : '   ✘ ') + m); c ? ok++ : mal++; };

(async () => {
  const empresaId = 1;
  const sede = await p.sede.findFirst({ where: { empresaId } });
  const prod = await p.producto.findFirst({ where: { empresaId } });
  const prov = await p.cliente.findFirst({ where: { empresaId } });
  let imp, mov;
  try {
    imp = await p.importacion.create({ data: {
      empresaId, sedeId: sede.id, proveedorId: prov.id,
      numero: 'IMP-QA0001', numeroDua: '235-2026-10-123456',
      numeroFactura: 'INV-QA-77', incoterm: 'FOB', moneda: 'USD',
      fechaLlegada: new Date('2026-09-20'), fechaNacionalizacion: new Date('2026-09-25'),
      estado: 'NACIONALIZADA',
    }});
    mov = await p.movimientoKardex.create({ data: {
      empresaId, productoId: prod.id, sedeId: sede.id,
      tipoMovimiento: 'INGRESO',
      concepto: `IMPORTACIÓN ${imp.numero} DUA ${imp.numeroDua}`,
      cantidad: 500, costoUnitario: 4.78, valorTotal: 2390,
      stockAnterior: 0, stockActual: 500,
      importacionId: imp.id, fecha: new Date('2026-09-25'),
    }});

    const { KardexService } = require('../../dist/src/kardex/kardex.service.js');
    const svc = new KardexService(p);

    console.log('\n1) Consolidado');
    const cons = await svc.consolidadoMovimientos(empresaId, { productoId: prod.id });
    const f = (cons.movimientos || cons.filas || []).find(x => x.id === mov.id);
    check(!!f, 'el movimiento aparece');
    check(f?.contraparte === prov.nombre, `trae el proveedor: ${f?.contraparte}`);
    check(f?.documentoTipo === 'Importación · DUA', `documento: ${f?.documentoTipo}`);
    check(f?.documentoNumero === imp.numeroDua, `número = la DUA: ${f?.documentoNumero}`);
    check(!!f?.documentoFecha, `con fecha de nacionalización: ${f?.documentoFecha?.toISOString?.().slice(0,10)}`);

    console.log('\n2) Trazabilidad del producto');
    const tz = await svc.trazabilidadProducto(empresaId, { productoId: prod.id });
    const t = (tz.lineaDeTiempo || []).find(x => x.id === mov.id);
    check(!!t, 'el movimiento aparece');
    check(t?.contraparte === prov.nombre, `trae el proveedor: ${t?.contraparte}`);
    check(t?.documento?.numero === imp.numeroDua, `y la DUA: ${t?.documento?.numero}`);
  } catch (e) {
    console.error('   ✘ error:', e.message); mal++;
  } finally {
    if (mov) await p.movimientoKardex.delete({ where: { id: mov.id } }).catch(()=>{});
    if (imp) await p.importacion.delete({ where: { id: imp.id } }).catch(()=>{});
    const quedan = await p.importacion.count({ where: { numero: 'IMP-QA0001' } });
    console.log(`\n3) Limpieza\n   ${quedan === 0 ? '✔' : '✘'} sin datos de prueba sueltos`);
    quedan === 0 ? ok++ : mal++;
    console.log(`\n${mal ? '✘' : '✔'} ${ok} comprobaciones correctas, ${mal} fallidas`);
    await p.$disconnect();
    process.exit(mal ? 1 : 0);
  }
})();
