import { hasPermission } from './permissions';

/**
 * El espejo del backend: si estas dos capas se desalinean, la UI muestra un botón
 * que la API va a rechazar con 403, y eso se ve como un sistema roto.
 *
 * El caso que interesa vigilar: tener la lectura de un área NO debe conceder su
 * escritura. Basta con que alguien añada un alias de `compras:escribir` → `compras`
 * en MODULE_ALIASES o PERM_MAP para abrir el agujero sin darse cuenta.
 */
const usuario = (permisos: string[]) =>
  ({ rol: 'USUARIO_EMPRESA', permisos }) as never;

describe('hasPermission · lectura frente a escritura', () => {
  it('contabilidad lee compras pero no las escribe', () => {
    const contabilidad = usuario(['dashboard', 'comprobantes', 'contabilidad', 'reportes', 'pagos', 'compras']);
    expect(hasPermission(contabilidad, 'compras')).toBe(true);
    expect(hasPermission(contabilidad, 'compras:escribir')).toBe(false);
  });

  it('almacén lee y escribe compras', () => {
    const almacen = usuario(['dashboard', 'kardex', 'kardex:escribir', 'compras', 'compras:escribir', 'guias-remision']);
    expect(hasPermission(almacen, 'compras')).toBe(true);
    expect(hasPermission(almacen, 'compras:escribir')).toBe(true);
  });

  it('ventas no ve compras en absoluto, pero sí consulta inventario', () => {
    const ventas = usuario(['dashboard', 'pedidos', 'cotizaciones', 'clientes', 'comprobantes', 'caja', 'pagos', 'guias-remision', 'kardex']);
    expect(hasPermission(ventas, 'compras')).toBe(false);
    expect(hasPermission(ventas, 'compras:escribir')).toBe(false);
    expect(hasPermission(ventas, 'kardex')).toBe(true);
    expect(hasPermission(ventas, 'kardex:escribir')).toBe(false);
  });

  it('gerencia pasa sin mirar la lista', () => {
    const gerencia = { rol: 'ADMIN_EMPRESA', permisos: [] } as never;
    expect(hasPermission(gerencia, 'compras:escribir')).toBe(true);
  });

  it('el comodín concede todo', () => {
    expect(hasPermission(usuario(['*']), 'compras:escribir')).toBe(true);
  });
});
