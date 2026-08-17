import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import InputPro from '@/components/InputPro';
import { Icon } from '@iconify/react';
import Button from '@/components/Button';
import { Calendar } from '@/components/Date';
import moment from 'moment';
import apiClient from '@/utils/apiClient';
import useAlertStore from '@/zustand/alert';
import { useProductsStore } from '@/zustand/products';

interface IProps {
    isOpen: boolean;
    onClose: () => void;
    formValues: any;
    isEdit: boolean;
    creationLote: any;
    setCreationLote: (value: any) => void;
}

const emptyLoteForm = { lote: '', fechaVencimiento: '', stockInicial: '', costoUnitario: '', proveedor: '' };

const ModalLotes = ({ isOpen, onClose, formValues, isEdit, creationLote, setCreationLote }: IProps) => {
    const [lotes, setLotes] = useState<any[]>([]);
    const [showLoteForm, setShowLoteForm] = useState(false);
    const [loteForm, setLoteForm] = useState(emptyLoteForm);
    const [loteErrors, setLoteErrors] = useState<Record<string, string>>({});

    // Edición inline
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<{ lote: string; fechaVencimiento: string; costoUnitario: string; proveedor: string; nuevoStock: string }>({ lote: '', fechaVencimiento: '', costoUnitario: '', proveedor: '', nuevoStock: '' });
    const [stockOriginalEdit, setStockOriginalEdit] = useState<number>(0);

    // Confirmación eliminación
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        if (isOpen && isEdit && formValues?.productoId) {
            cargarLotes(Number(formValues.productoId));
        }
    }, [isOpen, isEdit, formValues?.productoId]);

    const cargarLotes = async (productoId: number) => {
        try {
            const { data } = await apiClient.get(`/productos/${productoId}/lotes`);
            const lista: any[] = data?.data || data || [];
            setLotes(lista);
            // Propaga al store global para que la tabla de productos refleje los
            // cambios de lote (stock total + lotes vigentes) sin recargar la página.
            // Se replica el filtro de la lista: solo lotes activos con stock > 0,
            // ordenados FEFO (vencimiento asc) tal como los espera la columna "Lotes".
            const lotesVigentes = lista
                .filter((l) => l?.activo !== false && Number(l?.stockActual) > 0)
                .sort((a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime());
            const stockTotal = lotesVigentes.reduce((s, l) => s + Number(l.stockActual || 0), 0);
            useProductsStore.getState().upsertProductLocal({
                id: productoId,
                stock: stockTotal,
                stockBase: stockTotal,
                lotes: lotesVigentes,
            } as any);
        } catch {
            // silencioso
        }
    };

    // ── Nuevo lote ──────────────────────────────────────────────
    const handleLoteFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setLoteForm(prev => ({ ...prev, [name]: value }));
        setLoteErrors(prev => ({ ...prev, [name]: '' }));
    };

    const validateLoteForm = () => {
        const errors: Record<string, string> = {};
        if (!loteForm.lote.trim()) errors.lote = 'El código de lote es obligatorio';
        if (!loteForm.fechaVencimiento) errors.fechaVencimiento = 'La fecha de vencimiento es obligatoria';
        if (!loteForm.stockInicial || Number(loteForm.stockInicial) <= 0) errors.stockInicial = 'El stock inicial debe ser mayor a 0';
        setLoteErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAgregarLote = async () => {
        if (!validateLoteForm() || !formValues.productoId) return;
        try {
            await apiClient.post('/productos/lotes', {
                productoId: Number(formValues.productoId),
                lote: loteForm.lote,
                fechaVencimiento: loteForm.fechaVencimiento,
                stockInicial: Number(loteForm.stockInicial),
                costoUnitario: loteForm.costoUnitario ? Number(loteForm.costoUnitario) : undefined,
                proveedor: loteForm.proveedor || undefined,
            });
            useAlertStore.getState().alert('Lote agregado correctamente', 'success');
            setLoteForm(emptyLoteForm);
            setShowLoteForm(false);
            await cargarLotes(Number(formValues.productoId));
        } catch (error: any) {
            useAlertStore.getState().alert(error.response?.data?.message || 'Error al agregar lote', 'error');
        }
    };

    // ── Editar lote ─────────────────────────────────────────────
    const startEdit = (lote: any) => {
        setEditingId(lote.id);
        setStockOriginalEdit(Number(lote.stockActual));
        setEditForm({
            lote: lote.lote,
            fechaVencimiento: lote.fechaVencimiento ? moment(lote.fechaVencimiento).format('YYYY-MM-DD') : '',
            costoUnitario: lote.costoUnitario != null ? String(lote.costoUnitario) : '',
            proveedor: lote.proveedor || '',
            nuevoStock: String(lote.stockActual),
        });
        setDeletingId(null);
    };

    const cancelEdit = () => setEditingId(null);

    const handleGuardarEdicion = async () => {
        if (!editingId) return;
        try {
            // 1. Actualizar metadatos
            await apiClient.patch(`/productos/lotes/${editingId}`, {
                lote: editForm.lote,
                fechaVencimiento: editForm.fechaVencimiento || undefined,
                costoUnitario: editForm.costoUnitario ? Number(editForm.costoUnitario) : undefined,
                proveedor: editForm.proveedor || undefined,
            });

            // 2. Ajustar stock si cambió
            const nuevoStock = Number(editForm.nuevoStock);
            const delta = nuevoStock - stockOriginalEdit;
            if (delta !== 0 && !isNaN(nuevoStock) && nuevoStock >= 0) {
                await apiClient.patch(`/productos/lotes/${editingId}/ajustar-stock`, {
                    productoId: Number(formValues.productoId),
                    cantidad: Math.abs(delta),
                    tipo: delta > 0 ? 'INCREMENTO' : 'DECREMENTO',
                    motivo: 'Ajuste manual desde gestión de lotes',
                });
            }

            useAlertStore.getState().alert('Lote actualizado', 'success');
            setEditingId(null);
            await cargarLotes(Number(formValues.productoId));
        } catch (error: any) {
            useAlertStore.getState().alert(error.response?.data?.message || 'Error al actualizar lote', 'error');
        }
    };

    // ── Eliminar (desactivar) lote ───────────────────────────────
    const handleEliminarLote = async (loteId: number) => {
        setDeleteLoading(true);
        try {
            await apiClient.patch(`/productos/lotes/${loteId}/desactivar`);
            useAlertStore.getState().alert('Lote eliminado correctamente', 'success');
            setDeletingId(null);
            await cargarLotes(Number(formValues.productoId));
        } catch (error: any) {
            useAlertStore.getState().alert(error.response?.data?.message || 'Error al eliminar lote', 'error');
        } finally {
            setDeleteLoading(false);
        }
    };

    const calcularDiasParaVencer = (fechaVencimiento: string) => {
        const diferencia = new Date(fechaVencimiento).getTime() - Date.now();
        return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
    };

    return (
        <Modal
            isOpenModal={isOpen}
            closeModal={onClose}
            title="Gestión de Lotes"
            position="right"
            width="600px"
            icon="solar:box-minimalistic-bold-duotone"
            height="auto"
            backdropClassName="bg-transparent"
            style={{ marginRight: '510px' }}
        >
            <div className="pt-2">
                {isEdit && formValues.productoId ? (
                    <div className="space-y-4 px-4 pb-4">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-800 dark:text-white">Historial de Lotes</h4>
                            <Button color="black" onClick={() => { setShowLoteForm(!showLoteForm); setEditingId(null); setDeletingId(null); }} className="text-xs py-2">
                                <Icon icon={showLoteForm ? "solar:close-circle-bold" : "solar:add-circle-bold"} width={16} className="mr-1" />
                                {showLoteForm ? 'Cancelar' : 'Nuevo Lote'}
                            </Button>
                        </div>

                        {/* Formulario Nuevo Lote */}
                        {showLoteForm && (
                            <div className="bg-gray-50 dark:bg-[#111c44]/60 p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/10 mb-4">
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <InputPro name="lote" value={loteForm.lote} onChange={handleLoteFormChange} error={loteErrors.lote} label="Código de Lote" placeholder="L2024-001" isLabel />
                                    <div className="relative">
                                        <Calendar portal text="Vencimiento *" value={loteForm.fechaVencimiento ? moment(loteForm.fechaVencimiento).format('DD/MM/YYYY') : ''} onChange={(date: string) => {
                                            const [day, month, year] = date.split('/');
                                            setLoteForm(prev => ({ ...prev, fechaVencimiento: `${year}-${month}-${day}` }));
                                            setLoteErrors(prev => ({ ...prev, fechaVencimiento: '' }));
                                        }} name="fechaVencimiento" />
                                        {loteErrors.fechaVencimiento && <p className="text-xs text-red-500 mt-1">{loteErrors.fechaVencimiento}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <InputPro type="number" name="stockInicial" value={loteForm.stockInicial} onChange={handleLoteFormChange} error={loteErrors.stockInicial} label="Stock Inicial" placeholder="100" isLabel />
                                    <InputPro type="number" step="0.01" name="costoUnitario" value={loteForm.costoUnitario} onChange={handleLoteFormChange} label="Costo (Opcional)" placeholder="0.00" isLabel />
                                </div>
                                <div className="mt-4 flex justify-end">
                                    <Button outline color="black" onClick={handleAgregarLote}>Guardar Lote</Button>
                                </div>
                            </div>
                        )}

                        {/* Lista de Lotes */}
                        <div className="space-y-3">
                            {lotes.length > 0 ? lotes.map((lote: any) => {
                                const diasRestantes = calcularDiasParaVencer(lote.fechaVencimiento);
                                const isVencido = diasRestantes < 0;
                                const isPorVencer = diasRestantes >= 0 && diasRestantes <= 30;
                                const isEditingThis = editingId === lote.id;
                                const isDeletingThis = deletingId === lote.id;

                                return (
                                    <div key={lote.id} className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#111c44]/70 dark:backdrop-blur-xl shadow-sm dark:shadow-none">
                                        {/* Cabecera del lote */}
                                        <div className="flex justify-between items-start p-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-gray-800 dark:text-gray-200">{lote.lote}</span>
                                                    {isVencido ? (
                                                        <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-full font-bold">VENCIDO</span>
                                                    ) : isPorVencer ? (
                                                        <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-amber-900/20 dark:text-amber-400 rounded-full font-bold">{diasRestantes} DÍAS</span>
                                                    ) : (
                                                        <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-full font-bold">VIGENTE</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Vence: {moment(lote.fechaVencimiento).format('DD/MM/YYYY')}</p>
                                                {lote.proveedor && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Prov: {lote.proveedor}</p>}
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="text-right">
                                                    <div className="font-bold text-lg text-gray-900 dark:text-white">{lote.stockActual}</div>
                                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-medium">Stock</div>
                                                </div>
                                                {/* Botones editar / eliminar */}
                                                {!isEditingThis && !isDeletingThis && (
                                                    <div className="flex gap-1 mt-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(lote)}
                                                            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-500 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <Icon icon="solar:pen-bold" width={15} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setDeletingId(lote.id); setEditingId(null); }}
                                                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-400 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Icon icon="solar:trash-bin-trash-bold" width={15} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Formulario edición inline */}
                                        {isEditingThis && (() => {
                                            const delta = Number(editForm.nuevoStock) - stockOriginalEdit;
                                            const deltaValido = !isNaN(Number(editForm.nuevoStock)) && Number(editForm.nuevoStock) >= 0;
                                            return (
                                                <div className="border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#111c44]/60 p-4">
                                                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-3">Editar Lote</p>
                                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                                        <InputPro
                                                            name="lote"
                                                            value={editForm.lote}
                                                            onChange={e => setEditForm(f => ({ ...f, lote: e.target.value }))}
                                                            label="Código de Lote"
                                                            isLabel
                                                        />
                                                        <div>
                                                            <Calendar
                                                                text="Vencimiento"
                                                                value={editForm.fechaVencimiento ? moment(editForm.fechaVencimiento).format('DD/MM/YYYY') : ''}
                                                                onChange={(date: string) => {
                                                                    const [day, month, year] = date.split('/');
                                                                    setEditForm(f => ({ ...f, fechaVencimiento: `${year}-${month}-${day}` }));
                                                                }}
                                                                name="editFechaVencimiento"
                                                                portal
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                                        <InputPro
                                                            type="number"
                                                            step="0.01"
                                                            name="costoUnitario"
                                                            value={editForm.costoUnitario}
                                                            onChange={e => setEditForm(f => ({ ...f, costoUnitario: e.target.value }))}
                                                            label="Costo Unitario"
                                                            placeholder="0.00"
                                                            isLabel
                                                        />
                                                        <InputPro
                                                            name="proveedor"
                                                            value={editForm.proveedor}
                                                            onChange={e => setEditForm(f => ({ ...f, proveedor: e.target.value }))}
                                                            label="Proveedor"
                                                            isLabel
                                                        />
                                                    </div>

                                                    {/* Stock editable */}
                                                    <div className="mb-3 p-3 rounded-lg bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-white/10">
                                                        <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Ajuste de Stock</p>
                                                        <div className="flex items-end gap-3">
                                                            <div className="flex-1">
                                                                <InputPro
                                                                    type="number"
                                                                    name="nuevoStock"
                                                                    value={editForm.nuevoStock}
                                                                    onChange={e => setEditForm(f => ({ ...f, nuevoStock: e.target.value }))}
                                                                    label={`Stock actual: ${stockOriginalEdit}`}
                                                                    placeholder="0"
                                                                    isLabel
                                                                />
                                                            </div>
                                                            {deltaValido && delta !== 0 && (
                                                                <div className={`text-sm font-bold px-3 py-2 rounded-lg mb-0.5 ${delta > 0 ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                                    {delta > 0 ? `+${delta}` : delta}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {deltaValido && delta !== 0 && (
                                                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                                                                Se registrará {delta > 0 ? 'un ingreso' : 'una salida'} de <strong>{Math.abs(delta)}</strong> unidades en el kardex.
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="flex justify-end gap-2">
                                                        <button type="button" onClick={cancelEdit} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                                                        <button type="button" onClick={handleGuardarEdicion} className="text-xs px-3 py-1.5 rounded-lg btn-accent transition-colors">Guardar cambios</button>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Confirmación eliminación */}
                                        {isDeletingThis && (
                                            <div className="border-t border-red-100 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-4">
                                                <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">¿Eliminar este lote?</p>
                                                <p className="text-xs text-red-500 dark:text-red-400/80 mb-3">
                                                    {lote.stockActual > 0
                                                        ? `Se registrará una salida de ${lote.stockActual} unidades en el kardex.`
                                                        : 'El lote está sin stock y se desactivará.'}
                                                </p>
                                                <div className="flex gap-2 justify-end">
                                                    <button type="button" onClick={() => setDeletingId(null)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">Cancelar</button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEliminarLote(lote.id)}
                                                        disabled={deleteLoading}
                                                        className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                                                    >
                                                        {deleteLoading ? 'Eliminando...' : 'Sí, eliminar'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                    <Icon icon="solar:box-minimalistic-linear" width={48} className="mx-auto mb-2 opacity-30" />
                                    No hay lotes registrados
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className='px-4 pt-2'>
                        <div className="p-6 rounded-xl border border-dashed border-indigo-200 dark:border-indigo-900/30 bg-[#FCFDFD] dark:bg-indigo-950/10">
                            <h5 className="font-bold text-gray-900 dark:text-white mb-2">Lote Inicial</h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Registra el primer lote junto con la creación del producto.</p>
                            <div className="space-y-4">
                                <InputPro
                                    name="lote"
                                    value={creationLote.lote}
                                    onChange={(e) => setCreationLote({ ...creationLote, lote: e.target.value })}
                                    label="Código Lote"
                                    placeholder="Ej: L2024-001"
                                    isLabel
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <Calendar
                                            portal
                                            text="Fecha Vencimiento"
                                            value={creationLote.fechaVencimiento ? moment(creationLote.fechaVencimiento).format('DD/MM/YYYY') : ''}
                                            onChange={(date: string) => {
                                                const [day, month, year] = date.split('/');
                                                setCreationLote({ ...creationLote, fechaVencimiento: `${year}-${month}-${day}` });
                                            }}
                                            name="fechaVencimiento"
                                        />
                                    </div>
                                    <InputPro
                                        type="number"
                                        name="stockInicial"
                                        value={creationLote.stockInicial}
                                        onChange={(e) => setCreationLote({ ...creationLote, stockInicial: e.target.value })}
                                        label="Cantidad Inicial"
                                        placeholder="Ej: 100"
                                        isLabel
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end pb-4">
                            <Button color="black" className="w-full" onClick={onClose}>Confirmar Lote Inicial</Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ModalLotes;
