import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { resolveJwtSecret } from '../jwt-secret';

export type JwtPayload = {
  sub: number;
  rol: string;
  empresaId: number | null;
  sedeId?: number | null;
  sistemaNegocio?: string | null;
  sistemaProducto?: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(config),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        rol: true,
        estado: true,
        empresaId: true,
        permisos: true,
        sistemaNegocio: true,
        sistemaProducto: true,
        empresa: {
          select: {
            estado: true,
            fechaExpiracion: true,
          },
        },
      },
    });

    if (!user || user.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Sesion invalida');
    }

    const isSystemUser =
      user.rol === 'ADMIN_SISTEMA' || user.rol === 'RESELLER';
    if (!isSystemUser && user.empresaId) {
      if (!user.empresa || user.empresa.estado !== 'ACTIVO') {
        throw new UnauthorizedException('Empresa inactiva');
      }
      if (user.empresa.fechaExpiracion < new Date()) {
        throw new UnauthorizedException('Plan vencido');
      }
    }

    return {
      id: user.id,
      rol: user.rol,
      empresaId: user.empresaId ?? null,
      permisos: parsePermisos((user as any).permisos),
      sedeId: payload.sedeId ?? null,
      sistemaNegocio: user.sistemaNegocio ?? payload.sistemaNegocio ?? null,
      sistemaProducto: user.sistemaProducto ?? payload.sistemaProducto ?? null,
    };
  }
}

function parsePermisos(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return raw.split(',').map((x) => x.trim()).filter(Boolean);
  }
}
