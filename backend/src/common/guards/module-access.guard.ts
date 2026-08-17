import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  // Kaiser ERP es mono-empresa: no existe gating por plan/módulos. El control de
  // acceso se hace por ROL (RolesGuard) y por permisos de usuario (`permisos[]`).
  // Este guard se mantiene por compatibilidad con `@RequiresModule(...)` pero
  // siempre permite el acceso a nivel de plan.
  async canActivate(_context: ExecutionContext): Promise<boolean> {
    return true;
  }
}
