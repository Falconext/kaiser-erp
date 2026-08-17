import { Icon } from '@iconify/react';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { useDoctorsViewModel } from './useDoctorsViewModel';
import { ESPECIALIDADES } from './DoctorsModel';

const ACCENT = 'var(--accent, #7551FF)';

interface Props {
  hideHeader?: boolean;
  embedded?: boolean;   // usa la misma card y toolbar que ClientsView
}

export default function DoctorsView({ hideHeader, embedded }: Props = {}) {
  const vm = useDoctorsViewModel();

  // ── Tabla de médicos (compartida entre modos) ────────────────────────
  const tableContent = (
    <>
      {vm.isLoading ? (
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left border-collapse">
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                <td className="py-3.5 px-5">
                  <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      ) : vm.doctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon icon="solar:stethoscope-linear" width={48} className="mb-3 text-slate-200 dark:text-slate-700" />
          <p className="font-semibold text-slate-500 dark:text-slate-400">No hay médicos registrados</p>
          <p className="text-sm text-slate-400 mt-1">Agrega el primer médico con el botón de arriba</p>
        </div>
      ) : (
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left border-collapse text-sm">
          <thead>
            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="py-3 pl-5 pr-3">Médico</th>
              <th className="py-3 px-3">CMP</th>
              <th className="py-3 px-3">Especialidad</th>
              <th className="py-3 px-3">Contacto</th>
              <th className="py-3 px-3">Estado</th>
              <th className="py-3 px-3 pr-5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {vm.doctors.map(doc => (
              <tr key={doc.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors group">
                <td className="py-3 pl-5 pr-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center shrink-0">
                      <Icon icon="solar:stethoscope-bold-duotone" width={16} />
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">Dr. {doc.nombre}</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{doc.cmp || '—'}</td>
                <td className="py-3 px-3">
                  {doc.especialidad
                    ? <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300">{doc.especialidad}</span>
                    : <span className="text-slate-400">—</span>}
                </td>
                <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                  {doc.telefono && <div>{doc.telefono}</div>}
                  {doc.email && <div className="text-xs text-slate-400">{doc.email}</div>}
                  {!doc.telefono && !doc.email && '—'}
                </td>
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    doc.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${doc.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {doc.estado === 'ACTIVO' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="py-3 px-3 pr-5">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => vm.openEdit(doc)}
                      className="h-8 w-8 grid place-items-center rounded-lg text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                      title="Editar"
                    >
                      <Icon icon="solar:pen-bold-duotone" width={16} />
                    </button>
                    <button
                      onClick={() => vm.confirmDelete(doc.id)}
                      className="h-8 w-8 grid place-items-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                      title="Desactivar"
                    >
                      <Icon icon="solar:trash-bin-trash-bold-duotone" width={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </>
  );

  // ── Modales (compartidos) ────────────────────────────────────────────
  const modals = (
    <>
      {vm.isModalOpen && (
        <Modal
          width="520px"
          height="auto"
          position="right"
          isOpenModal={vm.isModalOpen}
          closeModal={vm.closeModal}
          title={vm.isEdit ? 'Editar médico' : 'Nuevo médico'}
          icon="solar:stethoscope-bold-duotone"
        >
          <div className="md:px-6 mt-5 space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Nombre completo <span className="text-rose-500">*</span>
              </label>
              <input
                value={vm.form.nombre}
                onChange={e => vm.handleChange('nombre', e.target.value)}
                className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="Ej: Juan Pérez García"
              />
            </div>
            {/* CMP + Especialidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">CMP</label>
                <input
                  value={vm.form.cmp ?? ''}
                  onChange={e => vm.handleChange('cmp', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="Ej: 12345"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Especialidad</label>
                <select
                  value={vm.form.especialidad ?? ''}
                  onChange={e => vm.handleChange('especialidad', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="">Seleccionar...</option>
                  {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
            </div>
            {/* Teléfono + Correo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Teléfono</label>
                <input
                  value={vm.form.telefono ?? ''}
                  onChange={e => vm.handleChange('telefono', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="+51 999 999 999"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Correo</label>
                <input
                  type="email"
                  value={vm.form.email ?? ''}
                  onChange={e => vm.handleChange('email', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[var(--accent)] transition-colors"
                  placeholder="doctor@clinica.pe"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-4 justify-end mt-8 mb-5 md:pr-5">
            <Button color="gray" onClick={vm.closeModal}>Cancelar</Button>
            <Button color="secondary" onClick={vm.handleSubmit}>
              {vm.isEdit ? 'Guardar cambios' : 'Registrar médico'}
            </Button>
          </div>
        </Modal>
      )}

      {vm.deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.15)] w-full max-w-sm p-6 space-y-4 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                <Icon icon="solar:trash-bin-trash-bold-duotone" width={20} className="text-rose-500" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">¿Desactivar médico?</h3>
                <p className="text-sm text-slate-400">Esta acción lo ocultará del directorio.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={vm.cancelDelete} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={vm.handleDelete} className="px-4 py-2 text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors">
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ── Modo EMBEDDED: encaja dentro de la card de ClientsView ───────────
  if (embedded) {
    return (
      <div className="font-jakarta">
        {/* Toolbar: igual al de ClientsView */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-xs w-full">
            <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, CMP o especialidad..."
              value={vm.search}
              onChange={e => vm.setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-sm rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
          <button
            onClick={vm.openCreate}
            className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
            style={{ background: ACCENT }}
          >
            <Icon icon="solar:add-circle-bold" width={18} />
            Nuevo médico
          </button>
        </div>
        {/* Tabla */}
        <div className="min-h-[450px]">
          {tableContent}
        </div>
        {modals}
      </div>
    );
  }

  // ── Modo STANDALONE: página propia con header y card ─────────────────
  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-slate-950 font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Farmacia</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Médicos</span>
      </div>

      {/* Header */}
      {!hideHeader && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Médicos</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Directorio de doctores vinculados a recetas y dispensación
            </p>
          </div>
          <button
            onClick={vm.openCreate}
            className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all shrink-0"
            style={{ background: ACCENT }}
          >
            <Icon icon="solar:add-circle-bold" width={18} />
            Nuevo médico
          </button>
        </div>
      )}

      {/* Card contenedora */}
      <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative max-w-xs w-full">
            <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width={16} />
            <input
              type="text"
              placeholder="Buscar por nombre, CMP o especialidad..."
              value={vm.search}
              onChange={e => vm.setSearch(e.target.value)}
              className="w-full h-11 pl-10 pr-4 text-sm rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>
        </div>
        {tableContent}
      </div>
      {modals}
    </div>
  );
}
