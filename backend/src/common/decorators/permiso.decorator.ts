import { SetMetadata } from '@nestjs/common';

export const PERMISO_KEY = 'permiso';
/**
 * Exige que el usuario tenga el permiso indicado en `Usuario.permisos[]`.
 * ADMIN_EMPRESA (permisos ['*']) y ADMIN_SISTEMA pasan siempre.
 */
export const RequierePermiso = (...permisos: string[]) =>
  SetMetadata(PERMISO_KEY, permisos);
