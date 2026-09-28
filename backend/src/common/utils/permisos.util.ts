/**
 * Comprobación de permisos fuera de la cadena de guards.
 *
 * `PermisosGuard` decide si una ruta se abre o no. Esto es para cuando la ruta
 * está abierta pero **parte de la respuesta** no debería estarlo: mismo criterio,
 * mismo OR, para no acabar con dos reglas distintas de lo mismo.
 */

/** La forma de `req.user` que deja `JwtStrategy`. */
export interface UsuarioPeticion {
  rol?: string;
  permisos?: string[] | null;
}

/**
 * ¿Este usuario tiene alguno de los permisos pedidos?
 *
 * Gerencia (`ADMIN_EMPRESA`) y el comodín `*` pasan siempre, igual que en
 * `PermisosGuard`.
 */
export function tienePermiso(
  user: UsuarioPeticion | undefined | null,
  ...codigos: string[]
): boolean {
  if (!user) return false;
  if (user.rol === 'ADMIN_SISTEMA' || user.rol === 'ADMIN_EMPRESA') return true;
  const permisos = Array.isArray(user.permisos) ? user.permisos : [];
  if (permisos.includes('*')) return true;
  return codigos.some((c) => permisos.includes(c));
}
