import { tienePermiso } from './permisos.util';

describe('tienePermiso', () => {
  it('deja pasar a gerencia sin mirar la lista', () => {
    expect(tienePermiso({ rol: 'ADMIN_EMPRESA', permisos: [] }, 'compras')).toBe(true);
  });

  it('respeta el comodín', () => {
    expect(tienePermiso({ rol: 'USUARIO_EMPRESA', permisos: ['*'] }, 'compras')).toBe(true);
  });

  it('acepta con criterio OR, igual que PermisosGuard', () => {
    const u = { rol: 'USUARIO_EMPRESA', permisos: ['compras'] };
    expect(tienePermiso(u, 'clientes', 'compras')).toBe(true);
  });

  it('niega cuando no tiene ninguno de los pedidos', () => {
    const ventas = { rol: 'USUARIO_EMPRESA', permisos: ['pedidos', 'clientes'] };
    expect(tienePermiso(ventas, 'compras')).toBe(false);
  });

  it('no confunde un permiso de escritura con el de lectura', () => {
    const almacen = { rol: 'USUARIO_EMPRESA', permisos: ['kardex:escribir'] };
    expect(tienePermiso(almacen, 'kardex')).toBe(false);
  });

  it('sobrevive a permisos nulos o a un usuario ausente', () => {
    expect(tienePermiso({ rol: 'USUARIO_EMPRESA', permisos: null }, 'compras')).toBe(false);
    expect(tienePermiso(undefined, 'compras')).toBe(false);
  });
});
