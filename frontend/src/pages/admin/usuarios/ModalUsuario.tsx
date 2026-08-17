import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import { useUsersStore, IUsuario, IFormUsuario, MODULOS_SISTEMA } from '@/zustand/users';
import { useModulosStore, IModulo } from '@/zustand/modulos';
import useAlertStore from '@/zustand/alert';
import { useSedesStore } from '@/zustand/sedes';
import { useAuthStore } from '@/zustand/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: IUsuario | null;
  isEdit: boolean;
}

const ModalUsuario: React.FC<Props> = ({ isOpen, onClose, user, isEdit }) => {
  const { createUser, updateUser, loading } = useUsersStore();
  const { alert } = useAlertStore();
  const { sedes, listarSedes } = useSedesStore();
  const { modulos, getAllModulos } = useModulosStore();
  const { auth } = useAuthStore();
  const productoEmpresa = (auth?.empresa?.producto || 'facturacion') as 'facturacion' | 'hotel' | 'restaurante';

  const [formData, setFormData] = useState<IFormUsuario>({
    nombre: '',
    email: '',
    dni: '',
    celular: '',
    password: '',
    permisos: [],
    sedeIds: [],
    subModuloIds: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [expandedModulos, setExpandedModulos] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      listarSedes();
      getAllModulos(false, productoEmpresa);
    }
  }, [isOpen, listarSedes, getAllModulos, productoEmpresa]);

  useEffect(() => {
    if (user && isEdit) {
      setFormData({
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        dni: user.dni,
        celular: user.celular,
        password: '',
        permisos: user.rol === 'ADMIN_EMPRESA' ? ['*'] : (user.permisos || []),
        sedeIds: (user.sedes || []).map(s => s.id),
        subModuloIds: (user.subModulos || []).map(s => s.id),
        comisionGlobal: user.comisionGlobal || undefined,
        comisionGlobalFija: user.comisionGlobalFija || undefined,
        comisionGlobalVenta: user.comisionGlobalVenta || undefined,
      });
    } else {
      setFormData({
        nombre: '',
        email: '',
        dni: '',
        celular: '',
        password: '',
        permisos: [],
        sedeIds: [],
        subModuloIds: [],
        comisionGlobal: undefined,
        comisionGlobalFija: undefined,
        comisionGlobalVenta: undefined,
      });
    }
    setErrors({});
    setServerError('');
    setExpandedModulos(new Set());
  }, [user, isEdit, isOpen]);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePermisoToggle = (moduloId: string) => {
    setFormData(prev => {
      const nuevosPermisos = prev.permisos.includes(moduloId)
        ? prev.permisos.filter(p => p !== moduloId)
        : [...prev.permisos, moduloId];

      // Si se deselecciona el módulo, quitar también sus submódulos
      if (prev.permisos.includes(moduloId)) {
        const modulo = modulos.find(m => m.codigo === moduloId);
        const subIds = (modulo?.subModulos || []).map(s => s.id);
        return {
          ...prev,
          permisos: nuevosPermisos,
          subModuloIds: (prev.subModuloIds || []).filter(id => !subIds.includes(id)),
        };
      }

      return { ...prev, permisos: nuevosPermisos };
    });
  };

  const handleAccesoCompleto = () => {
    const tieneAccesoCompleto = formData.permisos.includes('*');
    if (tieneAccesoCompleto) {
      // Al quitar acceso completo, pre-seleccionar todos los módulos individualmente
      const todosLosCodigos = modulosParaPermisos
        .map((m: any) => m.codigo)
        .filter(Boolean) as string[];
      setFormData(prev => ({ ...prev, permisos: todosLosCodigos }));
    } else {
      setFormData(prev => ({ ...prev, permisos: ['*'], subModuloIds: prev.subModuloIds }));
    }
  };

  const handleSubModuloToggle = (subModuloId: number) => {
    setFormData(prev => {
      const current = prev.subModuloIds || [];
      return {
        ...prev,
        subModuloIds: current.includes(subModuloId)
          ? current.filter(id => id !== subModuloId)
          : [...current, subModuloId],
      };
    });
  };

  const handleSelectAllSubModulos = (modulo: IModulo) => {
    const subIds: number[] = submodulosDelPlan(modulo).map((s: any) => s.id as number);
    setFormData(prev => {
      const current = prev.subModuloIds || [];
      const allSelected = subIds.every(id => current.includes(id));
      return {
        ...prev,
        subModuloIds: allSelected
          ? current.filter(id => !subIds.includes(id))
          : [...new Set([...current, ...subIds])],
      };
    });
  };

  const handleSedeToggle = (sedeId: number) => {
    setFormData(prev => {
      const sedeIds = prev.sedeIds || [];
      const nuevos = sedeIds.includes(sedeId)
        ? sedeIds.filter(id => id !== sedeId)
        : [...sedeIds, sedeId];
      return { ...prev, sedeIds: nuevos };
    });
    if (errors.sedeIds) setErrors(prev => ({ ...prev, sedeIds: '' }));
  };

  const toggleModuloExpanded = (codigo: string) => {
    setExpandedModulos(prev => {
      const next = new Set(prev);
      next.has(codigo) ? next.delete(codigo) : next.add(codigo);
      return next;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
    if (!formData.email.trim()) newErrors.email = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'El email no es válido';
    if (formData.dni?.trim() && !/^\d{8}$/.test(formData.dni)) newErrors.dni = 'El DNI debe tener 8 dígitos';
    if (formData.celular?.trim() && !/^\d{9}$/.test(formData.celular)) newErrors.celular = 'El celular debe tener 9 dígitos';
    if (!isEdit && !formData.password) newErrors.password = 'La contraseña es obligatoria';
    else if (formData.password && formData.password.length < 6) newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    if (formData.permisos.length === 0) newErrors.permisos = 'Debe asignar al menos un permiso';
    if (!formData.sedeIds || formData.sedeIds.length === 0) newErrors.sedeIds = 'Debe asignar al menos una sede';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setServerError('');

    try {
      if (isEdit && user) {
        const updateData: Partial<IFormUsuario> = { ...formData };
        if (!formData.password) delete updateData.password;
        if (updateData.comisionGlobal === '' as any || updateData.comisionGlobal === undefined) {
          updateData.comisionGlobal = undefined;
        } else {
          updateData.comisionGlobal = Number(updateData.comisionGlobal);
        }
        if (updateData.comisionGlobalFija === '' as any || updateData.comisionGlobalFija === undefined) {
          updateData.comisionGlobalFija = undefined;
        } else {
          updateData.comisionGlobalFija = Number(updateData.comisionGlobalFija);
        }
        if (updateData.comisionGlobalVenta === '' as any || updateData.comisionGlobalVenta === undefined) {
          updateData.comisionGlobalVenta = undefined;
        } else {
          updateData.comisionGlobalVenta = Number(updateData.comisionGlobalVenta);
        }
        await updateUser(user.id, updateData);
      } else {
        const createData: IFormUsuario = { ...formData };
        if (createData.comisionGlobal === '' as any || createData.comisionGlobal === undefined) {
          createData.comisionGlobal = undefined;
        } else {
          createData.comisionGlobal = Number(createData.comisionGlobal);
        }
        if (createData.comisionGlobalFija === '' as any || createData.comisionGlobalFija === undefined) {
          createData.comisionGlobalFija = undefined;
        } else {
          createData.comisionGlobalFija = Number(createData.comisionGlobalFija);
        }
        if (createData.comisionGlobalVenta === '' as any || createData.comisionGlobalVenta === undefined) {
          createData.comisionGlobalVenta = undefined;
        } else {
          createData.comisionGlobalVenta = Number(createData.comisionGlobalVenta);
        }
        await createUser(createData);
      }
      onClose();
    } catch (error: any) {
      setServerError(error.message || 'Error al guardar usuario');
    }
  };

  const tieneAccesoCompleto = formData.permisos.includes('*');
  const sedesActivas = (sedes || []).filter(s => s.activo);

  // Módulos que tienen al menos un submódulo activo
  const modulosConSubs = modulos.filter(m => m.subModulos && m.subModulos.some(s => s.activo));

  // ── Alcance del plan de la empresa ──────────────────────────────────────────
  // Un USUARIO_EMPRESA solo puede recibir accesos a módulos/submódulos que el plan
  // de su empresa realmente incluye. Sin este filtro el modal mostraba TODO el
  // catálogo del sistema, dejando "asignar" módulos ajenos al plan.
  const planModuloCodigos = new Set<string>(
    (auth?.empresa?.plan?.modulosAsignados ?? [])
      .map((m: any) => m?.modulo?.codigo)
      .filter(Boolean),
  );
  const planSubModulosAsignados = (auth?.empresa?.plan?.subModulosAsignados ?? []) as any[];

  // Submódulos visibles para un módulo, respetando el plan. Espeja la lógica del
  // sidebar (getModuleSubItems): si el plan asigna submódulos para ese módulo,
  // solo esos; si no asigna ninguno, cae a todos los submódulos activos.
  const submodulosDelPlan = (modulo: any) => {
    const activos = (modulo.subModulos || []).filter((s: any) => s.activo);
    const asignados = planSubModulosAsignados.filter((psm: any) => psm?.subModulo?.moduloId === modulo.id);
    if (asignados.length > 0) {
      const codigos = new Set(asignados.map((psm: any) => psm.subModulo.codigo));
      return activos.filter((s: any) => codigos.has(s.codigo));
    }
    return activos;
  };

  // Determinar qué módulos mostrar en permisos: los del backend o fallback a hardcoded
  // IMPORTANTE: el fallback mapea `id` → `codigo` para que permisos.includes(modulo.codigo) funcione
  const modulosBase = modulos.length > 0
    ? modulos
    : MODULOS_SISTEMA.map(m => ({ ...m, codigo: m.id, id: 0, icono: '', orden: 0, subModulos: [] }));

  // Solo se filtra cuando la empresa tiene un plan con módulos definidos
  // (ADMIN_SISTEMA / casos sin plan ven el catálogo completo como fallback).
  const modulosParaPermisos = planModuloCodigos.size > 0
    ? modulosBase.filter((m: any) => planModuloCodigos.has(m.codigo))
    : modulosBase;

  return (
    <Modal
      isOpenModal={isOpen}
      closeModal={onClose}
      title={`${isEdit ? 'Editar' : 'Crear'} Usuario`}
      width="900px"
    >
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        {/* Información Personal */}
        <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-transparent p-5">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
            <Icon icon="solar:user-bold-duotone" className="text-blue-600 dark:text-blue-400" />
            Información Personal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputPro type="text" name="nombre" value={formData.nombre} onChange={handleInputChange} label="Nombre completo" isLabel error={errors.nombre} placeholder="Juan Pérez García" />
            <InputPro type="email" name="email" value={formData.email} onChange={handleInputChange} label="Correo electrónico" isLabel error={errors.email} placeholder="usuario@empresa.com" />
            <InputPro type="text" name="dni" value={formData.dni} onChange={handleInputChange} label="DNI" isLabel error={errors.dni} placeholder="12345678" maxLength={8} />
            <InputPro type="text" name="celular" value={formData.celular} onChange={handleInputChange} label="Celular" isLabel error={errors.celular} placeholder="987654321" maxLength={9} />
            <InputPro type="number" name="comisionGlobal" value={formData.comisionGlobal || ''} onChange={handleInputChange} label="Comisión Global (%)" isLabel placeholder="Ej: 5" min="0" max="100" />
            <InputPro type="number" name="comisionGlobalFija" value={formData.comisionGlobalFija || ''} onChange={handleInputChange} label="Comisión Fija por Unidad (S/)" isLabel placeholder="Ej: 10" min="0" />
            <InputPro type="number" name="comisionGlobalVenta" value={formData.comisionGlobalVenta || ''} onChange={handleInputChange} label="Comisión Fija por Venta/Ticket (S/)" isLabel placeholder="Ej: 5" min="0" />
          </div>
        </div>

        {/* Credenciales */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Icon icon="mdi:key" width={20} height={20} className="text-gray-400" />
            Credenciales de Acceso
          </h3>
          <div className="relative">
            <InputPro
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              label={isEdit ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
              isLabel
              error={errors.password}
              placeholder={isEdit ? "••••••••" : "Mínimo 6 caracteres"}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-600">
              <Icon icon={showPassword ? "mdi:eye-off" : "mdi:eye"} width={20} height={20} />
            </button>
          </div>
        </div>

        {/* Sedes Asignadas */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Icon icon="solar:city-bold-duotone" width={20} height={20} className="text-violet-500" />
            Sedes Asignadas
            <span className="ml-1 text-xs font-normal text-gray-400 dark:text-gray-500">(el usuario solo podrá acceder a las sedes seleccionadas)</span>
          </h3>

          {errors.sedeIds && (
            <p className="text-red-600 text-sm mb-3 flex items-center gap-1">
              <Icon icon="mdi:alert-circle" width={16} /> {errors.sedeIds}
            </p>
          )}

          {sedesActivas.length === 0 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
              <Icon icon="mdi:warning" width={18} />
              No hay sedes activas. Crea al menos una sede en el módulo de Sedes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {sedesActivas.map((sede) => {
                const isSelected = (formData.sedeIds || []).includes(sede.id);
                return (
                  <label
                    key={sede.id}
                    onClick={() => handleSedeToggle(sede.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-[#0A0D14] hover:border-indigo-200 dark:hover:border-indigo-800'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                      {isSelected && <Icon icon="mdi:check" className="text-white" width={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon icon={sede.esPrincipal ? "solar:buildings-bold-duotone" : "solar:city-bold-duotone"} className={isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600'} width={16} />
                        <span className="font-medium text-sm text-gray-900 dark:text-white">{sede.nombre}</span>
                        {sede.esPrincipal && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">Principal</span>
                        )}
                      </div>
                      {(sede as any).codigo && <p className="text-xs text-gray-400 ml-6">Código: {(sede as any).codigo}</p>}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Permisos de Módulos */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Icon icon="mdi:shield-account" width={20} height={20} className="text-blue-500" />
            Permisos de Acceso
          </h3>

          {errors.permisos && <p className="text-red-600 text-sm mb-4">{errors.permisos}</p>}

          {/* Acceso completo */}
          <div className="mb-4">
            <label className="flex items-center space-x-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800/50 rounded-xl cursor-pointer hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-colors shadow-sm">
              <input type="checkbox" checked={tieneAccesoCompleto} onChange={handleAccesoCompleto} className="w-5 h-5 text-green-600 bg-gray-100 dark:bg-slate-900 border-gray-300 dark:border-slate-700 rounded focus:ring-green-500 focus:ring-2" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Icon icon="mdi:key" width={20} height={20} className="text-green-600 dark:text-green-400" />
                  <span className="font-medium text-gray-900 dark:text-white">Acceso Completo</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Otorga acceso a todos los módulos y submódulos del sistema</p>
              </div>
            </label>
          </div>

          {/* Módulos específicos */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">O selecciona módulos y submódulos específicos:</h4>
            {modulosParaPermisos.map((modulo: any) => {
              const moduloCodigo = modulo.codigo;
              const tienePermiso = tieneAccesoCompleto || formData.permisos.includes(moduloCodigo);
              const subActivos = submodulosDelPlan(modulo);
              const isExpanded = expandedModulos.has(moduloCodigo);
              const subSeleccionados = (formData.subModuloIds || []).filter(id => subActivos.some((s: any) => s.id === id));
              const todosSubSel = subActivos.length > 0 && subActivos.every((s: any) => (formData.subModuloIds || []).includes(s.id));

              return (
                <div key={moduloCodigo} className={`border dark:border-slate-800 rounded-xl overflow-hidden transition-all ${tieneAccesoCompleto ? 'opacity-50' : ''}`}>
                  {/* Fila del módulo */}
                  <div className={`flex items-center gap-3 p-3 ${tienePermiso && !tieneAccesoCompleto ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50' : 'bg-white dark:bg-[#0A0D14]'}`}>
                    <input
                      type="checkbox"
                      checked={tienePermiso}
                      onChange={() => !tieneAccesoCompleto && handlePermisoToggle(moduloCodigo)}
                      disabled={tieneAccesoCompleto}
                      className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-slate-900 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
                    />
                    <Icon icon={modulo.icono || getModuleIcon(moduloCodigo)} width={18} className="text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{modulo.nombre}</span>
                      {modulo.descripcion && <p className="text-xs text-gray-500 dark:text-gray-400">{modulo.descripcion}</p>}
                    </div>
                    {subActivos.length > 0 && (
                      <div className="flex items-center gap-2">
                        {tienePermiso && !tieneAccesoCompleto && (
                          <span className="text-xs text-blue-600 font-medium">
                            {subSeleccionados.length}/{subActivos.length} submódulos
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleModuloExpanded(moduloCodigo)}
                          disabled={!tienePermiso || tieneAccesoCompleto}
                          className={`p-1 rounded transition-colors ${tienePermiso && !tieneAccesoCompleto ? 'text-blue-600 hover:bg-blue-100 cursor-pointer' : 'text-gray-300 cursor-not-allowed'}`}
                          title={tienePermiso ? "Ver submódulos" : "Selecciona el módulo primero"}
                        >
                          <Icon icon={isExpanded ? "mdi:chevron-up" : "mdi:chevron-down"} width={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Submódulos expandibles */}
                  {isExpanded && tienePermiso && !tieneAccesoCompleto && subActivos.length > 0 && (
                    <div className="border-t border-blue-100 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/10 px-4 py-3 space-y-2">
                      {/* Seleccionar todos */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Submódulos de {modulo.nombre}:</span>
                        <button
                          type="button"
                          onClick={() => handleSelectAllSubModulos(modulo as IModulo)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                        >
                          {todosSubSel ? 'Deseleccionar todos' : 'Seleccionar todos'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {subActivos.map((sub: any) => {
                          const isSubSelected = (formData.subModuloIds || []).includes(sub.id);
                          return (
                            <label
                              key={sub.id}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                                isSubSelected
                                  ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50'
                                  : 'bg-white dark:bg-[#0A0D14] border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSubSelected}
                                onChange={() => handleSubModuloToggle(sub.id)}
                                className="w-3.5 h-3.5 text-indigo-600 bg-gray-100 dark:bg-slate-900 border-gray-300 dark:border-slate-700 rounded focus:ring-indigo-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-white">{sub.nombre}</p>
                                {sub.descripcion && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub.descripcion}</p>}
                                <p className="text-[10px] font-mono text-gray-400 dark:text-gray-600">{sub.codigo}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error del servidor */}
        {serverError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-xl text-sm text-red-700 dark:text-red-400">
            <Icon icon="mdi:alert-circle" width={18} className="flex-shrink-0" />
            {serverError}
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <Button type="button" color="black" outline onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" color="secondary" disabled={loading}>
            {loading ? (
              <>
                <Icon icon="mdi:loading" width={20} height={20} className="animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Icon icon={isEdit ? "mdi:content-save" : "mdi:account-plus"} width={20} height={20} className="mr-2" />
                {isEdit ? 'Actualizar' : 'Crear'} Usuario
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const getModuleIcon = (moduleId: string): string => {
  const iconMap: Record<string, string> = {
    dashboard: 'mdi:view-dashboard',
    comprobantes: 'mdi:receipt',
    clientes: 'mdi:account-group',
    kardex: 'mdi:package-variant',
    reportes: 'mdi:chart-line',
    configuracion: 'mdi:cog',
    usuarios: 'mdi:account-multiple',
    caja: 'mdi:cash-register',
    pagos: 'mdi:credit-card-outline',
  };
  return iconMap[moduleId] || 'mdi:circle';
};

export default ModalUsuario;
