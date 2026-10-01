import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISO_KEY } from '../decorators/permiso.decorator';

/**
 * Segunda capa de acceso (además de RolesGuard): verifica `permisos[]` del
 * usuario, que es como se acotan los roles operativos de Kaiser
 * (VENTAS, ALMACEN, PRODUCCION, CONTABILIDAD). Ver PERMISOS_POR_ROL en init-db.
 */
@Injectable()
export class PermisosGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<string[]>(PERMISO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requeridos || requeridos.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;
    if (user.rol === 'ADMIN_SISTEMA' || user.rol === 'ADMIN_EMPRESA')
      return true;

    const permisos: string[] = Array.isArray(user.permisos)
      ? user.permisos
      : [];
    if (permisos.includes('*')) return true;
    const ok = requeridos.some((p) => permisos.includes(p));
    if (!ok) {
      throw new ForbiddenException(
        'No tienes permiso para acceder a este módulo.',
      );
    }
    return true;
  }
}
