import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermisosGuard } from './permisos.guard';
import { PERMISOS_POR_ROL } from '../utils/init-db';

/** Contexto mínimo: el guard solo necesita el handler, la clase y request.user. */
function contexto(user: unknown) {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as never;
}

function guardQueExige(...permisos: string[]) {
  const reflector = new Reflector();
  jest
    .spyOn(reflector, 'getAllAndOverride')
    .mockReturnValue(permisos.length ? permisos : undefined);
  return new PermisosGuard(reflector);
}

describe('PermisosGuard', () => {
  it('deja pasar cuando la ruta no exige permisos', () => {
    expect(guardQueExige().canActivate(contexto(undefined))).toBe(true);
  });

  it('rechaza si no hay usuario en la request', () => {
    expect(guardQueExige('contabilidad').canActivate(contexto(undefined))).toBe(
      false,
    );
  });

  it('deja pasar a ADMIN_EMPRESA sin mirar permisos[]', () => {
    const user = { rol: 'ADMIN_EMPRESA', permisos: [] };
    expect(guardQueExige('contabilidad').canActivate(contexto(user))).toBe(
      true,
    );
  });

  it('deja pasar a quien tiene el comodín "*"', () => {
    const user = { rol: 'USUARIO_EMPRESA', permisos: ['*'] };
    expect(guardQueExige('contabilidad').canActivate(contexto(user))).toBe(
      true,
    );
  });

  it('basta con uno de los permisos exigidos', () => {
    const user = { rol: 'USUARIO_EMPRESA', permisos: ['reportes'] };
    expect(
      guardQueExige('contabilidad', 'reportes').canActivate(contexto(user)),
    ).toBe(true);
  });

  it('lanza Forbidden cuando el permiso no está en permisos[]', () => {
    const user = { rol: 'USUARIO_EMPRESA', permisos: ['kardex'] };
    expect(() =>
      guardQueExige('contabilidad').canActivate(contexto(user)),
    ).toThrow(ForbiddenException);
  });

  it('tolera permisos[] ausente o no-array', () => {
    for (const permisos of [undefined, null, 'contabilidad', 42]) {
      expect(() =>
        guardQueExige('contabilidad').canActivate(
          contexto({ rol: 'USUARIO_EMPRESA', permisos }),
        ),
      ).toThrow(ForbiddenException);
    }
  });

  describe('presets de rol de Kaiser', () => {
    const casos: Array<[keyof typeof PERMISOS_POR_ROL, string, boolean]> = [
      ['VENTAS', 'contabilidad', false],
      ['VENTAS', 'caja', true],
      ['ALMACEN', 'contabilidad', false],
      ['PRODUCCION', 'produccion', true],
      ['CONTABILIDAD', 'contabilidad', true],
      ['CONTABILIDAD', 'reportes', true],

      // Separación de funciones en compras: contabilidad lleva el Registro de
      // Compras y necesita ABRIR la factura del proveedor para cuadrar el
      // crédito fiscal, pero no debe poder modificarla. Almacén la registra.
      // Ventas y producción no ven compras: el precio al que Kaiser compra es
      // información comercial, no operativa.
      ['CONTABILIDAD', 'compras', true],
      ['CONTABILIDAD', 'compras:escribir', false],
      ['ALMACEN', 'compras', true],
      ['ALMACEN', 'compras:escribir', true],
      ['VENTAS', 'compras', false],
      ['VENTAS', 'compras:escribir', false],
      ['PRODUCCION', 'compras', false],
      ['PRODUCCION', 'compras:escribir', false],

      // El mismo criterio que ya regía en inventario.
      ['VENTAS', 'kardex', true],
      ['VENTAS', 'kardex:escribir', false],
      ['ALMACEN', 'kardex:escribir', true],
    ];

    it.each(casos)('%s sobre "%s" → %s', (rol, permiso, esperado) => {
      const user = {
        rol: 'USUARIO_EMPRESA',
        permisos: [...PERMISOS_POR_ROL[rol]],
      };
      const guard = guardQueExige(permiso);
      if (esperado) {
        expect(guard.canActivate(contexto(user))).toBe(true);
      } else {
        expect(() => guard.canActivate(contexto(user))).toThrow(
          ForbiddenException,
        );
      }
    });
  });
});
