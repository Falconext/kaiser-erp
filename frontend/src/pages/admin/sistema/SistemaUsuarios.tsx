import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useAuthStore } from '@/zustand/auth';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import Button from '@/components/Button';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

type SistemaNegocio = string;
type SistemaProducto = 'FACTURACION' | 'HOTEL' | 'RESTAURANTE' | '';

interface SistemaUser {
  id: number;
  nombre: string;
  email: string;
  dni: string;
  celular: string;
  rol: string;
  estado: string;
  sistemaNegocio?: string | null;
  sistemaProducto?: string | null;
}

interface FormData {
  nombre: string;
  email: string;
  dni: string;
  celular: string;
  password: string;
  sistemaNegocio: SistemaNegocio;
  sistemaProducto: SistemaProducto;
}

const EMPTY_FORM: FormData = {
  nombre: '', email: '', dni: '', celular: '', password: '', sistemaNegocio: '', sistemaProducto: '',
};

export default function SistemaUsuarios() {
  const sidebarColor = useThemeStore((s) => s.sidebarColor);
  const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
  const authUser = useAuthStore(s => s.auth);
  // Si el admin logueado tiene alcance configurado, solo puede crear/editar dentro de ese scope
  const miSistemaNegocio = authUser?.sistemaNegocio ?? null;
  const miSistemaProducto = authUser?.sistemaProducto ?? null;
  const esSuperAdmin = !miSistemaNegocio && !miSistemaProducto;

  const [users, setUsers] = useState<SistemaUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SistemaUser | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SistemaUser | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const load = async (q = search) => {
    try {
      setLoading(true);
      const res = await apiClient.get('/usuario/sistema', { params: { search: q || undefined, limit: 50 } });
      const data = res.data?.data ?? res.data;
      setUsers(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      useAlertStore.getState().alert('Error al cargar administradores', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (modalOpen) setTimeout(() => firstInputRef.current?.focus(), 100); }, [modalOpen]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(val), 500);
  };

  const openCreate = () => {
    setEditTarget(null);
    setForm({
      ...EMPTY_FORM,
      sistemaNegocio: esSuperAdmin ? '' : (miSistemaNegocio as SistemaNegocio),
      sistemaProducto: esSuperAdmin ? '' : (miSistemaProducto as SistemaProducto),
    });
    setErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (u: SistemaUser) => {
    setEditTarget(u);
    setForm({
      nombre: u.nombre,
      email: u.email,
      dni: u.dni,
      celular: u.celular,
      password: '',
      sistemaNegocio: (u.sistemaNegocio as SistemaNegocio) ?? '',
      sistemaProducto: (u.sistemaProducto as SistemaProducto) ?? '',
    });
    setErrors({});
    setShowPassword(false);
    setModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!form.email.trim()) errs.email = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email inválido';
    if (!form.dni.trim()) errs.dni = 'El DNI es obligatorio';
    else if (!/^\d{8}$/.test(form.dni)) errs.dni = 'DNI debe tener 8 dígitos';
    if (!form.celular.trim()) errs.celular = 'El celular es obligatorio';
    else if (!/^\d{9}$/.test(form.celular)) errs.celular = 'Celular debe tener 9 dígitos';
    if (!editTarget && !form.password) errs.password = 'La contraseña es obligatoria';
    else if (form.password && form.password.length < 6) errs.password = 'Mínimo 6 caracteres';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: any = {
        nombre: form.nombre,
        email: form.email,
        dni: form.dni,
        celular: form.celular,
        sistemaNegocio: form.sistemaNegocio || null,
        sistemaProducto: form.sistemaProducto || null,
      };
      if (!editTarget) payload.password = form.password;
      if (editTarget) {
        await apiClient.put(`/usuario/sistema/${editTarget.id}`, payload);
        useAlertStore.getState().alert('Administrador actualizado correctamente', 'success');
      } else {
        await apiClient.post('/usuario/sistema', payload);
        useAlertStore.getState().alert('Administrador creado exitosamente', 'success');
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Error al guardar';
      useAlertStore.getState().alert(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleState = async (u: SistemaUser) => {
    const nuevoEstado = u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await apiClient.patch(`/usuario/sistema/${u.id}/estado`, { estado: nuevoEstado });
      useAlertStore.getState().alert(`Administrador ${nuevoEstado === 'ACTIVO' ? 'activado' : 'desactivado'}`, 'success');
      load();
    } catch {
      useAlertStore.getState().alert('Error al cambiar estado', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await apiClient.delete(`/usuario/sistema/${confirmDelete.id}`);
      useAlertStore.getState().alert('Administrador eliminado', 'success');
      setConfirmDelete(null);
      load();
    } catch {
      useAlertStore.getState().alert('Error al eliminar', 'error');
    }
  };

  const activeCount = users.filter(u => u.estado === 'ACTIVO').length;
  const inactiveCount = users.filter(u => u.estado === 'INACTIVO').length;

  // Sistema unificado (marca única): todos los admins ven todo, sin scope de negocio.
  const NegocioBadge = ({ sn: _sn }: { sn?: string | null }) => (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-50 text-violet-600">
      <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
      Todos los sistemas
    </span>
  );

  const ProductoBadge = ({ sp }: { sp?: string | null }) => {
    if (!sp) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          Todos los productos
        </span>
      );
    }
    if (sp === 'HOTEL') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Hotel
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-600">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        Facturación
      </span>
    );
  };

  const SistemaBtn = ({ value, label, icon, desc, activeColor }: {
    value: SistemaNegocio; label: string; icon: string; desc: string; activeColor: 'violet' | 'blue';
  }) => {
    const active = form.sistemaNegocio === value;
    const colorActive = activeColor === 'violet'
      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
      : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    const iconColor = active ? (activeColor === 'violet' ? 'text-violet-600' : 'text-blue-600') : 'text-gray-400';
    const textColor = active ? (activeColor === 'violet' ? 'text-violet-700 dark:text-violet-300' : 'text-blue-700 dark:text-blue-300') : 'text-gray-500 dark:text-gray-400';
    return (
      <button
        type="button"
        onClick={() => setForm(prev => ({ ...prev, sistemaNegocio: value }))}
        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${active ? colorActive : 'border-gray-100 dark:border-slate-700 hover:border-gray-200'}`}
      >
        <Icon icon={icon} width={22} className={iconColor} />
        <span className={`text-[11px] font-bold ${textColor}`}>{label}</span>
        <span className="text-[10px] text-gray-400">{desc}</span>
      </button>
    );
  };

  const SistemaProductoBtn = ({ value, label, icon, desc, activeColor }: {
    value: SistemaProducto; label: string; icon: string; desc: string; activeColor: 'sky' | 'amber' | 'emerald';
  }) => {
    const active = form.sistemaProducto === value;
    const colorMap = {
      sky: { border: 'border-sky-500 bg-sky-50 dark:bg-sky-900/20', icon: 'text-sky-600', text: 'text-sky-700 dark:text-sky-300' },
      amber: { border: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20', icon: 'text-amber-600', text: 'text-amber-700 dark:text-amber-300' },
      emerald: { border: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600', text: 'text-emerald-700 dark:text-emerald-300' },
    } as const;
    const colorActive = colorMap[activeColor].border;
    const iconColor = active ? colorMap[activeColor].icon : 'text-gray-400';
    const textColor = active ? colorMap[activeColor].text : 'text-gray-500 dark:text-gray-400';
    return (
      <button
        type="button"
        onClick={() => setForm(prev => ({ ...prev, sistemaProducto: value }))}
        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${active ? colorActive : 'border-gray-100 dark:border-slate-700 hover:border-gray-200'}`}
      >
        <Icon icon={icon} width={22} className={iconColor} />
        <span className={`text-[11px] font-bold ${textColor}`}>{label}</span>
        <span className="text-[10px] text-gray-400">{desc}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Sistema</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Administradores</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Administradores del Sistema</h1>
          <p className="text-sm text-slate-400 mt-0.5">Socios y admins con acceso a la plataforma</p>
        </div>
        <button
          onClick={openCreate}
          className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all active:scale-95 shrink-0"
          style={{ background: ACCENT }}
        >
          <Icon icon="solar:user-plus-bold" width={18} />
          Nuevo Admin
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Admins', value: total, icon: 'solar:users-group-two-rounded-bold-duotone', chip: 'bg-violet-50 text-violet-600' },
          { label: 'Activos', value: activeCount, icon: 'solar:check-circle-bold-duotone', chip: 'bg-emerald-50 text-emerald-600' },
          { label: 'Inactivos', value: inactiveCount, icon: 'solar:close-circle-bold-duotone', chip: 'bg-rose-50 text-rose-600' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${card.chip}`}>
              <Icon icon={card.icon} width={24} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{card.label}</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Card contenedora */}
      <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width={17} />
            <input
              type="text"
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Buscar por nombre, email o DNI..."
              className="w-full h-11 pl-10 pr-4 text-sm bg-white text-slate-700 rounded-2xl border-2 border-slate-200 outline-none focus:border-[var(--accent)] placeholder:text-slate-400 transition-colors"
            />
          </div>
          <span className="text-sm text-slate-400 font-medium px-1">{total.toLocaleString('es-PE')} resultados</span>
          <button
            onClick={() => load()}
            className="ml-auto h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors"
            style={{ borderColor: `${ACCENT}55`, color: ACCENT }}
          >
            <Icon icon="solar:refresh-linear" className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="py-3 pl-5 pr-3">Nombre</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">DNI</th>
                <th className="py-3 px-3">Celular</th>
                {esSuperAdmin && <th className="py-3 px-3">Sistema de negocio</th>}
                {esSuperAdmin && <th className="py-3 px-3">Sistema de producto</th>}
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 pr-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: esSuperAdmin ? 8 : 6 }).map((_, j) => (
                      <td key={j} className="py-3.5 px-3 first:pl-5 last:pr-5">
                        <div className="h-4 bg-slate-100 rounded-lg animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={esSuperAdmin ? 8 : 6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Icon icon="solar:shield-user-linear" width={52} className="text-slate-200" />
                      <p className="text-slate-400 text-sm">{search ? 'No se encontraron administradores.' : 'No hay administradores creados aún.'}</p>
                      {!search && (
                        <button onClick={openCreate} className="mt-1 px-4 py-2 text-white text-xs font-bold rounded-xl hover:brightness-105 transition-all" style={{ background: ACCENT }}>
                          Crear primer administrador
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-700">{u.nombre}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{u.email}</td>
                    <td className="py-3 px-3 text-slate-500">{u.dni}</td>
                    <td className="py-3 px-3 text-slate-600">{u.celular}</td>
                    {esSuperAdmin && <td className="py-3 px-3"><NegocioBadge sn={u.sistemaNegocio} /></td>}
                    {esSuperAdmin && <td className="py-3 px-3"><ProductoBadge sp={u.sistemaProducto} /></td>}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleState(u)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${u.estado === 'ACTIVO'
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {u.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>
                    <td className="py-3 px-3 pr-5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(u)} className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors" title="Editar">
                          <Icon icon="solar:pen-bold" width={16} />
                        </button>
                        <button onClick={() => setConfirmDelete(u)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Deshabilitar">
                          <Icon icon="solar:trash-bin-trash-bold" width={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      <Modal
        isOpenModal={modalOpen}
        closeModal={() => setModalOpen(false)}
        title={editTarget ? 'Editar Administrador' : 'Nuevo Administrador'}
        icon={editTarget ? 'solar:pen-bold' : 'solar:user-plus-bold'}
        iconClass="bg-violet-50 text-violet-600"
        width="480px"
        height="auto"
      >
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            {/* Sistema scope */}
            {esSuperAdmin ? (
              <div className="space-y-4">
                {/* Selector "Sistema de negocio" (plataforma múltiple) eliminado:
                    sistema unificado en una sola marca neutra. */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sistema de producto</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <SistemaProductoBtn value="" label="Todos" icon="solar:layers-bold-duotone" desc="Todos los productos" activeColor="sky" />
                    <SistemaProductoBtn value="FACTURACION" label="Facturación" icon="solar:bill-list-bold-duotone" desc="Solo facturación" activeColor="sky" />
                    <SistemaProductoBtn value="HOTEL" label="Hotel" icon="solar:bed-bold-duotone" desc="Solo hotel" activeColor="amber" />
                    <SistemaProductoBtn value="RESTAURANTE" label="Restaurante" icon="solar:cup-hot-bold-duotone" desc="Solo restaurante" activeColor="emerald" />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {form.sistemaProducto === '' ? 'Sin asignar → ve todos los productos' : `Solo verá el producto ${form.sistemaProducto === 'HOTEL' ? 'Hotel' : form.sistemaProducto === 'RESTAURANTE' ? 'Restaurante' : 'Facturación'}`}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                <Icon icon="solar:layers-bold-duotone" className="text-blue-600 dark:text-blue-400 flex-shrink-0" width={18} />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Se creará con producto <span className="font-bold">{miSistemaProducto || 'todos'}</span>
                </p>
              </div>
            )}

            <InputPro
              isLabel
              label="Nombre completo *"
              name="nombre"
              value={form.nombre}
              onChange={handleChange as any}
              placeholder="Ej. Carlos Mendoza"
              error={errors.nombre}
              reference={firstInputRef as any}
            />

            <InputPro
              isLabel
              label="Email *"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange as any}
              placeholder="admin@vendify.pe"
              error={errors.email}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputPro
                isLabel
                label="DNI *"
                name="dni"
                value={form.dni}
                onChange={handleChange as any}
                placeholder="12345678"
                maxLength={8}
                error={errors.dni}
              />
              <InputPro
                isLabel
                label="Celular *"
                name="celular"
                value={form.celular}
                onChange={handleChange as any}
                placeholder="987654321"
                maxLength={9}
                error={errors.celular}
              />
            </div>

            {/* Password with show/hide toggle */}
            <div>
              <label className="block text-sm font-[400] text-gray-900 dark:!text-gray-300 mb-2">
                {editTarget ? 'Nueva contraseña (vacío = sin cambios)' : 'Contraseña *'}
              </label>
              <div className="relative">
                <InputPro
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange as any}
                  placeholder={editTarget ? '••••••••' : 'Mínimo 6 caracteres'}
                  className="pr-11"
                  error={errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[9px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <Icon icon={showPassword ? 'solar:eye-closed-bold' : 'solar:eye-bold'} width={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-5 pb-5">
            <Button type="button" onClick={() => setModalOpen(false)} color="default" className="flex-1">Cancelar</Button>
            <Button type="submit" color="primary" disabled={saving} className="flex-1">
              {saving && <Icon icon="svg-spinners:ring-resize" width={15} className="mr-1.5" />}
              {editTarget ? 'Guardar Cambios' : 'Crear Administrador'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Eliminar */}
      <Modal
        isOpenModal={!!confirmDelete}
        closeModal={() => setConfirmDelete(null)}
        title="Deshabilitar administrador"
        icon="solar:shield-user-bold-duotone"
        iconClass="bg-red-50 text-red-500"
        width="360px"
        height="auto"
      >
        <div className="px-5 py-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-200">{confirmDelete?.nombre}</span> será marcado como inactivo y no podrá iniciar sesión.
          </p>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <Button type="button" onClick={() => setConfirmDelete(null)} color="default" className="flex-1">Cancelar</Button>
          <Button type="button" onClick={handleDelete} color="danger" className="flex-1">Deshabilitar</Button>
        </div>
      </Modal>
    </div>
  );
}
