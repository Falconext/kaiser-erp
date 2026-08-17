import { useMemo } from 'react';
import { Icon } from '@iconify/react';
import ModalConfirm from '@/components/ModalConfirm';
import Loading from '@/components/Loading';
import Select from '@/components/Select';
import ModalUsuario from '../../../pages/admin/usuarios/ModalUsuario';
import { useUsersViewModel } from './useUsersViewModel';

// ── Gestión de Usuarios — estilo CRM claro (dashboard) ──────────────────────
const ACCENT = 'var(--accent, #7551FF)';
const PER_PAGE = [10, 25, 50];

export default function UsersView() {
    const {
        usuarios,
        totalUsuarios,
        limiteUsuarios,
        limiteAlcanzado,
        loading,
        currentPage,
        itemsPerPage,
        searchTerm,
        showUserModal,
        showConfirmModal,
        selectedUser,
        isEdit,
        handleCreateUser,
        handleEditUser,
        handleToggleState,
        confirmToggleState,
        handleCloseUserModal,
        handleCloseConfirmModal,
        handleSearchChange,
        handlePageChange,
        handleItemsPerPageChange,
        getPermisosData,
    } = useUsersViewModel();

    const totalPages = Math.max(1, Math.ceil(totalUsuarios / itemsPerPage));
    const fromRow = totalUsuarios === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const toRow = Math.min(currentPage * itemsPerPage, totalUsuarios);
    const disponibles = limiteUsuarios - totalUsuarios;

    const pageNumbers = useMemo(() => {
        const nums: number[] = [];
        const win = 2;
        for (let i = Math.max(1, currentPage - win); i <= Math.min(totalPages, currentPage + win); i++) nums.push(i);
        if (!nums.includes(1)) nums.unshift(1);
        if (!nums.includes(totalPages)) nums.push(totalPages);
        return [...new Set(nums)].sort((a, b) => a - b);
    }, [currentPage, totalPages]);

    const getPermisosCell = (permisos: string[] = [], rol?: string) => {
        const data = getPermisosData(permisos, rol);
        if (data.type === 'none') {
            return <span className="text-xs font-medium text-slate-400 dark:text-gray-400">{data.label}</span>;
        }
        if (data.type === 'full') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <Icon icon="solar:shield-check-bold" className="text-sm" /> {data.label}
                </span>
            );
        }
        return (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" title={data.tooltip}>
                {data.label}
            </span>
        );
    };

    if (loading && usuarios.length === 0) {
        return <Loading />;
    }

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Configuración</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Usuarios</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-sm text-slate-400 dark:text-gray-400 mt-0.5">Administra los usuarios y sus permisos del sistema.</p>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="relative flex-1 lg:w-72">
                        <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Buscar por nombre, email o DNI…"
                            className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
                        />
                        {searchTerm && (
                            <button onClick={() => handleSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-gray-600 hover:text-slate-500 dark:hover:text-gray-400">
                                <Icon icon="solar:close-circle-bold" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <button
                            onClick={handleCreateUser}
                            title={limiteAlcanzado ? `Límite del plan alcanzado (${limiteUsuarios} usuarios)` : 'Crear nuevo usuario'}
                            className={`h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                                limiteAlcanzado
                                    ? 'bg-slate-300 dark:bg-slate-600 cursor-not-allowed'
                                    : 'shadow-lg shadow-violet-500/30 hover:brightness-105'
                            }`}
                            style={limiteAlcanzado ? undefined : { background: ACCENT }}
                        >
                            <Icon icon={limiteAlcanzado ? 'solar:lock-keyhole-bold' : 'solar:user-plus-bold'} className="text-lg" />
                            <span className="hidden sm:inline">Nuevo Usuario</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Estadística rápida */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-400 dark:text-gray-400 uppercase tracking-wide">Total Usuarios</p>
                            <p className="text-3xl font-extrabold text-slate-800 dark:text-white mt-1">
                                {totalUsuarios}
                                {limiteUsuarios > 0 && <span className="text-lg font-bold text-slate-300 dark:text-gray-600"> / {limiteUsuarios}</span>}
                            </p>
                            {limiteUsuarios > 0 && (
                                <p className={`text-[11px] font-semibold mt-0.5 ${limiteAlcanzado ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-gray-400'}`}>
                                    {limiteAlcanzado
                                        ? 'Límite del plan alcanzado'
                                        : `${disponibles} disponible${disponibles !== 1 ? 's' : ''}`}
                                </p>
                            )}
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 grid place-items-center shrink-0">
                            <Icon icon="solar:users-group-rounded-bold" width={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Card contenedora */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 p-4 border-b border-slate-100 dark:border-slate-700">
                    <span className="h-9 px-3.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-sm font-bold flex items-center gap-1.5" style={{ color: ACCENT }}>
                        <Icon icon="solar:users-group-rounded-linear" /> {totalUsuarios.toLocaleString('es-PE')} usuario{totalUsuarios !== 1 ? 's' : ''}
                    </span>
                    {limiteAlcanzado && (
                        <span className="h-9 px-3.5 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 text-sm font-semibold flex items-center gap-1.5">
                            <Icon icon="solar:danger-triangle-linear" /> Alcanzaste el máximo de tu plan ({limiteUsuarios})
                        </span>
                    )}
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-gray-400 border-b border-slate-100 dark:border-slate-700">
                                <th className="py-3 pl-5 pr-3">Nombre</th>
                                <th className="py-3 px-3">Email</th>
                                <th className="py-3 px-3">DNI</th>
                                <th className="py-3 px-3">Celular</th>
                                <th className="py-3 px-3">Rol</th>
                                <th className="py-3 px-3">Permisos</th>
                                <th className="py-3 px-3">Estado</th>
                                <th className="py-3 px-3 pr-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                                        <td colSpan={8} className="py-3.5 px-5">
                                            <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : usuarios.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-16 text-center">
                                        <Icon icon="solar:users-group-rounded-linear" className="text-5xl text-slate-200 dark:text-gray-700 mx-auto mb-2" />
                                        <p className="text-slate-500 dark:text-gray-400 text-sm font-medium mb-1">No hay usuarios registrados</p>
                                        <p className="text-slate-400 dark:text-gray-400 text-xs mb-4">
                                            {searchTerm
                                                ? 'No se encontraron usuarios con ese criterio de búsqueda.'
                                                : 'Comienza creando tu primer usuario.'}
                                        </p>
                                        {!searchTerm && (
                                            <button
                                                onClick={handleCreateUser}
                                                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-white text-sm font-bold shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                                                style={{ background: ACCENT }}
                                            >
                                                <Icon icon="solar:user-plus-bold" className="text-lg" /> Crear primer usuario
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ) : usuarios.map((usuario) => {
                                const activo = usuario.estado === 'ACTIVO';
                                const esAdmin = usuario.rol === 'ADMIN_EMPRESA';
                                const nombre = usuario.nombre || 'Usuario';
                                return (
                                    <tr key={usuario.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-3 pl-5 pr-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                                                    {nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[180px]">{nombre}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400 truncate max-w-[200px]">{usuario.email?.toLowerCase() || '—'}</td>
                                        <td className="py-3 px-3 font-mono text-sm text-slate-600 dark:text-slate-300">{usuario.dni || '—'}</td>
                                        <td className="py-3 px-3 text-sm text-slate-500 dark:text-gray-400">{usuario.celular || '—'}</td>
                                        <td className="py-3 px-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${esAdmin ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                {esAdmin ? 'Admin' : 'Usuario'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3">{getPermisosCell(usuario.permisos, usuario.rol)}</td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${activo ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${activo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                {activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 pr-5">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleEditUser(usuario)}
                                                    title="Editar"
                                                    className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                                                >
                                                    <Icon icon="solar:pen-bold" width={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleState(usuario)}
                                                    title="Cambiar estado"
                                                    className="h-8 w-8 grid place-items-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                                >
                                                    <Icon icon="solar:power-bold" width={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {usuarios.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-sm text-slate-400 dark:text-gray-400">{fromRow}-{toRow} de {totalUsuarios.toLocaleString('es-PE')}</span>
                        <div className="flex items-center gap-1">
                            <button disabled={currentPage <= 1} onClick={() => handlePageChange(1)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-left-linear" /></button>
                            <button disabled={currentPage <= 1} onClick={() => handlePageChange(Math.max(1, currentPage - 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-left-linear" /></button>
                            {pageNumbers.map((n, i) => {
                                const prev = pageNumbers[i - 1];
                                const gap = prev && n - prev > 1;
                                return (
                                    <span key={n} className="flex items-center">
                                        {gap && <span className="px-1 text-slate-300 dark:text-gray-600">…</span>}
                                        <button onClick={() => handlePageChange(n)}
                                            className={`h-8 min-w-8 px-2 grid place-items-center rounded-lg text-sm font-semibold transition-colors ${n === currentPage ? 'text-white' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                            style={n === currentPage ? { background: ACCENT } : undefined}>
                                            {n}
                                        </button>
                                    </span>
                                );
                            })}
                            <button disabled={currentPage >= totalPages} onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-linear" /></button>
                            <button disabled={currentPage >= totalPages} onClick={() => handlePageChange(totalPages)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-right-linear" /></button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-400">
                            <span>Filas/pág</span>
                            <div className="w-24">
                                <Select
                                    label=""
                                    withLabel={false}
                                    name="itemsPerPage"
                                    error=""
                                    options={PER_PAGE.map((n) => ({ id: n, value: String(n) }))}
                                    value={String(itemsPerPage)}
                                    onChange={(id) => handleItemsPerPageChange(Number(id))}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modales */}
            {showUserModal && (
                <ModalUsuario
                    isOpen={showUserModal}
                    onClose={handleCloseUserModal}
                    user={selectedUser}
                    isEdit={isEdit}
                />
            )}

            {showConfirmModal && selectedUser && (
                <ModalConfirm
                    isOpenModal={showConfirmModal}
                    setIsOpenModal={handleCloseConfirmModal}
                    title="Cambiar Estado de Usuario"
                    information={`¿Estás seguro que deseas ${selectedUser.estado === 'ACTIVO' ? 'desactivar' : 'activar'} al usuario ${selectedUser.nombre}?`}
                    confirmSubmit={confirmToggleState}
                />
            )}
        </div>
    );
}
