// Utilidades para manejo de permisos de usuarios

export interface IUserPermissions {
  permisos?: string[];
  rol?: 'ADMIN_SISTEMA' | 'ADMIN_EMPRESA' | 'USUARIO_EMPRESA' | 'RESELLER';
  subModulos?: { id: number; codigo: string; nombre: string; moduloId: number; ruta?: string | null; orden?: number }[];
  empresa?: {
    plan?: {
      [key: string]: any;
      modulosAsignados?: { modulo: { id?: number; codigo: string; nombre?: string; icono?: string | null; ruta?: string | null; orden?: number } }[];
      subModulosAsignados?: { subModulo: { id: number; codigo: string; nombre?: string; moduloId: number; ruta?: string | null; orden?: number } }[];
    }
  }
}

const PERM_MAP: Record<string, string> = {};

const MODULE_ALIASES: Record<string, string[]> = {
  reportes: ['reportes', 'contabilidad'],
  contabilidad: ['contabilidad', 'reportes'],
};

const SUBMODULE_ALIASES: Record<string, string[]> = {
  'reportes:formal': ['reportes:formal', 'contabilidad:reportes'],
  'contabilidad:reportes': ['contabilidad:reportes', 'reportes:formal'],
};

const getModuleCandidates = (modulo: string): string[] =>
  MODULE_ALIASES[modulo] ?? [modulo];

const getSubModuleCandidates = (subModuloCodigo: string): string[] =>
  SUBMODULE_ALIASES[subModuloCodigo] ?? [subModuloCodigo];

const normalizePerms = (perms: string[] = []): string[] => {
  const mapped = perms.map((p) => PERM_MAP[p] ?? p);
  return Array.from(new Set(mapped));
};

/**
 * Verifica si un usuario tiene permiso para acceder a un módulo específico
 */
export const hasPermission = (user: IUserPermissions | null, modulo: string): boolean => {
  if (!user) return false;
  // Kaiser ERP es mono-empresa: NO hay gating por plan. La gerencia (ADMIN_*)
  // ve todo; el staff (USUARIO_EMPRESA) se controla por `permisos[]`.
  if (user.rol === 'ADMIN_SISTEMA' || user.rol === 'ADMIN_EMPRESA') return true;

  const moduloCandidates = getModuleCandidates(modulo);

  // Validar permisos individuales de usuario
  if (!user.permisos || user.permisos.length === 0) return false;
  if (user.permisos.includes('*')) return true;

  const normalized = normalizePerms(user.permisos);
  return moduloCandidates.some((candidate) => normalized.includes(candidate));
};

export const hasPlanFeature = (user: IUserPermissions | null, featureKey: string): boolean => {
  if (!user) return false;
  if (user.rol === 'ADMIN_SISTEMA') return true;
  const plan = user.empresa?.plan;
  const features = plan?.features;
  if (features && typeof features === 'object' && !Array.isArray(features)) {
    return Boolean(features[featureKey]);
  }
  return Boolean(plan?.[featureKey]);
};

/**
 * Verifica si un usuario tiene acceso a un submódulo específico.
 *
 * Lógica de dos capas:
 * 1. Capa Plan: si subModulosAsignados es un array (incluso vacío), se aplica la restricción.
 *    Si es undefined (plan antiguo sin configuración), no se restringe (backward compat).
 * 2. Capa Usuario: si el usuario tiene subModulos propios, debe incluir el solicitado.
 *    Si el usuario no tiene subModulos configurados y es ADMIN_EMPRESA, accede a todos los del plan.
 */
export const hasSubPermission = (user: IUserPermissions | null, subModuloCodigo: string): boolean => {
  if (!user) return false;
  // Kaiser ERP mono-empresa: sin capa de plan. La gerencia (ADMIN_*) ve todo.
  if (user.rol === 'ADMIN_SISTEMA' || user.rol === 'ADMIN_EMPRESA') return true;

  const subModuloCandidates = getSubModuleCandidates(subModuloCodigo);

  // Restricción por submódulos del usuario (si no tiene ninguno configurado,
  // no se restringe a este nivel — el control efectivo es `permisos[]`).
  const userSubModulos = user.subModulos?.map((s) => s.codigo);
  if (!userSubModulos || userSubModulos.length === 0) {
    return true;
  }

  return subModuloCandidates.some((candidate) => userSubModulos.includes(candidate));
};

/**
 * Obtiene los módulos disponibles según los permisos del usuario
 */
export const getAvailableModules = (user: IUserPermissions | null): string[] => {
  if (!user) return [];

  const allModules = [
    'dashboard',
    'comprobantes',
    'clientes',
    'kardex',
    'reportes',
    'configuracion',
    'usuarios',
    'caja',
    'pagos',
    'cotizaciones',
    'guias-remision',
    'compras',
    'sedes',
    'notificaciones',
    'contabilidad',
  ];

  if (user.rol === 'ADMIN_SISTEMA') return allModules;

  return allModules.filter((moduleCode) => hasPermission(user, moduleCode));
};

/**
 * Filtra elementos del sidebar según permisos
 */
export const filterSidebarItems = (items: any[], user: IUserPermissions | null) => {
  if (!user) return [];
  return items.filter(item => {
    if (!item.module) return true;
    return hasPermission(user, item.module);
  });
};

/**
 * Redirige a una página permitida si el usuario no tiene acceso
 */
export const getRedirectPath = (user: IUserPermissions | null, intendedPath: string): string => {
  if (!user) return '/login';

  const availableModules = getAvailableModules(user);

  if (availableModules.includes('dashboard')) return '/administrador';

  if (availableModules.length > 0) {
    const firstModule = availableModules[0];
    const moduleRoutes: Record<string, string> = {
      comprobantes: '/administrador/facturacion/comprobantes',
      clientes: '/administrador/clientes',
      kardex: '/administrador/kardex',
      reportes: '/administrador/contabilidad/arqueo',
      contabilidad: '/administrador/contabilidad/reporte',
      configuracion: '/administrador/configuracion',
      usuarios: '/administrador/usuarios',
      caja: '/administrador/ventas/caja',
      pagos: '/administrador/ventas/pagos',
      cotizaciones: '/administrador/facturacion/cotizaciones',
      'guias-remision': '/administrador/facturacion/guia-remision',
      compras: '/administrador/compras',
      sedes: '/administrador/sedes',
      notificaciones: '/administrador/notificaciones',
      dashboard: '/administrador'
    };
    return moduleRoutes[firstModule] || '/administrador';
  }

  return user ? '/administrador' : '/login';
};
