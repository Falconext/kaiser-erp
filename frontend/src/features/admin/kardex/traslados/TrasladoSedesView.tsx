import React, { useState, useEffect, useRef } from 'react';
import { BarcodeScannerInput } from '@/components/BarcodeScannerInput';
import { Icon } from '@iconify/react';
import InputPro from '@/components/InputPro';
import Select from '@/components/Select';
import { useAuthStore } from '@/zustand/auth';
import { useSedesStore } from '@/zustand/sedes';
import apiClient from '@/utils/apiClient';
import { get } from '@/utils/fetch';
import useAlertStore from '@/zustand/alert';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import TrasladoPrintPage from './TrasladoPrintPage';

const ACCENT = 'var(--accent, #7551FF)';

interface SelectedProduct {
    id: number;
    codigo: string;
    descripcion: string;
    stockActual: number;
    cantidad: number;
    unidadMedida: string;
    imagenUrl?: string;
}

export default function TrasladoSedesView() {
    const navigate = useNavigate();
    const { auth, sedeActiva } = useAuthStore();
    const { sedes, listarSedes } = useSedesStore();
    const { alert } = useAlertStore();

    const [destinationSedeId, setDestinationSedeId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [observacion, setObservacion] = useState('');

    const [isSuccess, setIsSuccess] = useState(false);
    const [transferData, setTransferData] = useState<any>(null);
    const printComponentRef = useRef<HTMLDivElement>(null);

    const [barcodeInput, setBarcodeInput] = useState('');
    const [barcodeLoading, setBarcodeLoading] = useState(false);
    const barcodeRef = useRef<HTMLInputElement>(null);

    const handleBarcodeScan = async (codigo: string) => {
        const trimmed = codigo.trim();
        if (!trimmed) return;
        setBarcodeLoading(true);
        try {
            const resp: any = await get(`productos/barcode/${encodeURIComponent(trimmed)}`);
            if (resp.code === 1 && resp.data) {
                addProduct(resp.data);
                setBarcodeInput('');
            } else {
                alert(`Producto no encontrado: ${trimmed}`, 'error');
                setBarcodeInput('');
            }
        } catch {
            alert(`Código de barras no encontrado: ${trimmed}`, 'error');
            setBarcodeInput('');
        } finally {
            setBarcodeLoading(false);
            barcodeRef.current?.focus();
        }
    };

    const handlePrint = useReactToPrint({
        // @ts-ignore
        contentRef: printComponentRef,
        pageStyle: `@media print {
            @page { size: A4; margin: 0; }
            body { background-color: #fff; }
        }`
    });

    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        listarSedes();
    }, [listarSedes]);

    useEffect(() => {
        const fetchProducts = async () => {
            if (searchTerm.length < 2) {
                setSearchResults([]);
                return;
            }
            try {
                setLoadingProducts(true);
                const { data } = await apiClient.get('/productos', {
                    params: {
                        search: searchTerm.trim(),
                        limit: 10,
                        sedeId: sedeActiva?.id
                    }
                });

                const payload = data?.data?.data ?? data?.data ?? data;
                const items = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.productos)
                        ? payload.productos
                        : Array.isArray(payload?.items)
                            ? payload.items
                            : [];

                setSearchResults(items);
            } catch (error) {
                console.error("Error searching products:", error);
                setSearchResults([]);
            } finally {
                setLoadingProducts(false);
            }
        };

        const timer = setTimeout(fetchProducts, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, sedeActiva?.id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setSearchResults([]);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addProduct = (p: any) => {
        if (selectedProducts.find(item => item.id === p.id)) {
            alert('El producto ya está en la lista', 'warning');
            return;
        }

        const stockSede = p.stocks?.find((s: any) => s.sedeId === sedeActiva?.id)?.stock ?? p.stock ?? 0;

        setSelectedProducts([...selectedProducts, {
            id: p.id,
            codigo: p.codigo,
            descripcion: p.descripcion,
            stockActual: stockSede,
            cantidad: 1,
            unidadMedida: p.unidadMedida?.nombre || '',
            imagenUrl: p.imagenUrl
        }]);
        setSearchTerm('');
        setSearchResults([]);
    };

    const removeProduct = (id: number) => {
        setSelectedProducts(selectedProducts.filter(p => p.id !== id));
    };

    const updateQuantity = (id: number, qty: number) => {
        setSelectedProducts(selectedProducts.map(p => {
            if (p.id === id) {
                return { ...p, cantidad: Math.max(1, qty) };
            }
            return p;
        }));
    };

    const handleTraslado = async () => {
        if (!destinationSedeId) {
            alert('Debe seleccionar una sede de destino', 'error');
            return;
        }
        if (selectedProducts.length === 0) {
            alert('Debe agregar al menos un producto', 'error');
            return;
        }

        for (const p of selectedProducts) {
            if (p.cantidad > p.stockActual) {
                alert(`Stock insuficiente para ${p.descripcion}. Disponible: ${p.stockActual}`, 'error');
                return;
            }
        }

        try {
            setIsSubmitting(true);
            await apiClient.post('/kardex/traslado', {
                sedeOrigenId: sedeActiva?.id,
                sedeDestinoId: destinationSedeId,
                observacion,
                items: selectedProducts.map(p => ({
                    productoId: p.id,
                    cantidad: p.cantidad
                }))
            });

            const sedeDestinoObj = sedes.find(s => s.id === destinationSedeId);
            setTransferData({
                company: auth,
                sedeOrigen: sedeActiva,
                sedeDestino: sedeDestinoObj,
                user: auth?.usuario,
                date: new Date(),
                products: [...selectedProducts],
                observacion
            });

            setIsSuccess(true);
            alert('Traslado guardado correctamente', 'success');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error al realizar el traslado', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const sedesDestino = sedes.filter(s => s.activo && s.id !== sedeActiva?.id);
    const sedeDestino = sedes.find(s => s.id === destinationSedeId);
    const totalUnidades = selectedProducts.reduce((sum, p) => sum + p.cantidad, 0);
    const hasStockIssues = selectedProducts.some(p => p.cantidad > p.stockActual);

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-slate-950 font-jakarta">

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Kardex</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Traslado entre Sedes</span>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300 grid place-items-center shrink-0">
                        <Icon icon="solar:transfer-horizontal-bold" width={22} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight truncate">Traslado entre Sedes</h1>
                        <p className="text-sm text-slate-400 mt-0.5">Mueve mercadería de forma segura entre sucursales</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/administrador/kardex')}
                    className="h-11 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors shrink-0"
                >
                    <Icon icon="solar:alt-arrow-left-linear" width={16} />
                    Volver al Kardex
                </button>
            </div>

            {isSuccess && transferData ? (
                <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-10 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-3xl flex items-center justify-center mb-5">
                        <Icon icon="solar:check-circle-bold" width={44} />
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">Traslado completado</h2>
                    <p className="text-sm text-slate-400 mb-8 text-center max-w-md">
                        Los productos han sido descontados de <span className="font-semibold text-slate-600 dark:text-slate-300">{transferData.sedeOrigen?.nombre}</span> y agregados a <span className="font-semibold text-slate-600 dark:text-slate-300">{transferData.sedeDestino?.nombre}</span>.
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => handlePrint()}
                            className="h-11 px-4 rounded-2xl text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all"
                            style={{ background: ACCENT }}
                        >
                            <Icon icon="solar:printer-minimalistic-bold" width={16} />
                            Imprimir Reporte
                        </button>
                        <button
                            onClick={() => {
                                setIsSuccess(false);
                                setSelectedProducts([]);
                                setDestinationSedeId(null);
                                setObservacion('');
                                setTransferData(null);
                            }}
                            className="h-11 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
                        >
                            Nuevo Traslado
                        </button>
                    </div>

                    <TrasladoPrintPage
                        componentRef={printComponentRef}
                        company={transferData.company}
                        sedeOrigen={transferData.sedeOrigen}
                        sedeDestino={transferData.sedeDestino}
                        user={transferData.user}
                        date={transferData.date}
                        products={transferData.products}
                        observacion={transferData.observacion}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                    {/* Panel Izquierdo */}
                    <div className="lg:col-span-1 space-y-5">

                        {/* Configuración */}
                        <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-5">
                            <div className="flex items-center gap-2.5 mb-4">
                                <span className="w-6 h-6 text-white text-[11px] font-bold rounded-full flex items-center justify-center shrink-0" style={{ background: ACCENT }}>1</span>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Configuración del Traslado</span>
                            </div>

                            {/* Route visualizer */}
                            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl mb-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Origen</p>
                                    <div className="px-2.5 py-1.5 bg-white border border-violet-200 dark:bg-slate-800 dark:border-violet-800 rounded-xl">
                                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate block">{sedeActiva?.nombre}</span>
                                    </div>
                                </div>

                                <div className="flex items-center pt-3 shrink-0">
                                    <div className={`w-4 h-px ${destinationSedeId ? 'bg-violet-400' : 'bg-slate-200 dark:bg-slate-700'} transition-colors`} />
                                    <Icon
                                        icon="solar:arrow-right-bold"
                                        width={13}
                                        className="transition-colors"
                                        style={{ color: destinationSedeId ? ACCENT : '#cbd5e1' }}
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Destino</p>
                                    <div className={`px-2.5 py-1.5 rounded-xl border transition-all duration-200 ${
                                        destinationSedeId
                                            ? 'bg-violet-50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800'
                                            : 'bg-white border-dashed border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                    }`}>
                                        <span className="text-xs font-semibold truncate block transition-colors" style={{ color: destinationSedeId ? ACCENT : '#94a3b8' }}>
                                            {sedeDestino?.nombre ?? 'Por seleccionar'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Select
                                    label="Sede de Destino"
                                    name="sedeDestino"
                                    options={sedesDestino.map(s => ({ id: s.id, value: s.nombre }))}
                                    onChange={(val) => setDestinationSedeId(Number(val))}
                                    error={!destinationSedeId ? "Selecciona destino" : ""}
                                />

                                <InputPro
                                    label="Observación (Opcional)"
                                    name="observacion"
                                    value={observacion}
                                    onChange={(e: any) => setObservacion(e.target.value)}
                                    isLabel
                                />
                            </div>
                        </div>

                        {/* Buscador */}
                        <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none p-5 relative" ref={searchRef}>
                            <div className="flex items-center gap-2.5 mb-4">
                                <span className="w-6 h-6 text-white text-[11px] font-bold rounded-full flex items-center justify-center shrink-0" style={{ background: ACCENT }}>2</span>
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Agregar Productos</span>
                            </div>

                            <BarcodeScannerInput
                                className="mb-3"
                                inputRef={barcodeRef}
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                onScan={handleBarcodeScan}
                                loading={barcodeLoading}
                                hideIcon={true}
                            />

                            <div className="relative">
                                <InputPro
                                    name="buscarProductos"
                                    placeholder="Buscar por nombre o código..."
                                    value={searchTerm}
                                    onChange={(e: any) => setSearchTerm(e.target.value)}
                                />
                                {loadingProducts && (
                                    <div className="absolute right-3 top-3">
                                        <Icon icon="line-md:loading-twotone-loop" style={{ color: ACCENT }} width={18} />
                                    </div>
                                )}
                            </div>

                            {searchResults.length > 0 && (
                                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 dark:bg-slate-800 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto mx-5">
                                    {searchResults.map((p) => {
                                        const stockOrigen = p.stocks?.find((s: any) => s.sedeId === sedeActiva?.id)?.stock ?? p.stock ?? 0;
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => addProduct(p)}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50/60 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700 last:border-0 text-left"
                                            >
                                                <div className="h-10 w-10 rounded-xl border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900 overflow-hidden flex items-center justify-center shrink-0">
                                                    {p.imagenUrl ? (
                                                        <img src={p.imagenUrl} alt={p.descripcion} className="h-full w-full object-cover" loading="lazy" />
                                                    ) : (
                                                        <Icon icon="solar:box-minimalistic-linear" className="text-slate-300" width={16} />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-sm font-semibold text-slate-800 truncate">{p.descripcion}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="font-mono text-[10px] font-bold" style={{ color: ACCENT }}>{p.codigo}</span>
                                                        <span className="text-[10px] text-slate-400">Stock: {stockOrigen} {p.unidadMedida?.nombre}</span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Panel Derecho: Lista */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden flex flex-col min-h-[460px]">

                            {/* Table header */}
                            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                    <span className="w-6 h-6 text-white text-[11px] font-bold rounded-full flex items-center justify-center shrink-0" style={{ background: ACCENT }}>3</span>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                        Productos a Trasladar
                                        {selectedProducts.length > 0 && (
                                            <span className="ml-1.5" style={{ color: ACCENT }}>({selectedProducts.length})</span>
                                        )}
                                    </span>
                                </div>
                                {selectedProducts.length > 0 && (
                                    <button
                                        onClick={() => setSelectedProducts([])}
                                        className="text-xs font-semibold text-rose-400 hover:text-rose-500 transition-colors"
                                    >
                                        Limpiar lista
                                    </button>
                                )}
                            </div>

                            {/* Table or empty state */}
                            <div className="flex-1 overflow-x-auto">
                                {selectedProducts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
                                        <div className="w-14 h-14 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center mb-4">
                                            <Icon icon="solar:box-minimalistic-linear" width={26} className="text-slate-300" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-400">Sin productos agregados</p>
                                        <p className="text-xs text-slate-300 mt-1 max-w-[220px]">Busca por nombre, código o escanea un código de barras</p>
                                    </div>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                                <th className="text-left px-5 py-3">Producto</th>
                                                <th className="text-center px-4 py-3">Disponible</th>
                                                <th className="text-center px-4 py-3 w-32">Cantidad</th>
                                                <th className="text-center px-4 py-3">Restante</th>
                                                <th className="px-4 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedProducts.map((p) => {
                                                const remaining = p.stockActual - p.cantidad;
                                                const isOver = p.cantidad > p.stockActual;
                                                const isLow = !isOver && remaining <= Math.ceil(p.stockActual * 0.2);

                                                return (
                                                    <tr
                                                        key={p.id}
                                                        className={`border-b border-slate-50 last:border-0 transition-colors ${
                                                            isOver
                                                                ? 'bg-rose-50/40'
                                                                : 'hover:bg-slate-50/60'
                                                        }`}
                                                    >
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl border border-slate-100 overflow-hidden bg-slate-50 shrink-0 flex items-center justify-center">
                                                                    {p.imagenUrl ? (
                                                                        <img src={p.imagenUrl} alt={p.descripcion} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Icon icon="solar:box-minimalistic-linear" className="text-slate-300" width={18} />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-semibold text-slate-800">{p.descripcion}</p>
                                                                    <p className="font-mono text-[10px] font-bold mt-0.5" style={{ color: ACCENT }}>{p.codigo}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-center">
                                                            <span className="text-sm font-medium text-slate-500">
                                                                {p.stockActual}
                                                                {p.unidadMedida && (
                                                                    <span className="text-[10px] text-slate-400 ml-0.5">{p.unidadMedida}</span>
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <input
                                                                type="number"
                                                                value={p.cantidad}
                                                                onChange={(e) => updateQuantity(p.id, Number(e.target.value))}
                                                                className={`w-full h-9 px-3 text-sm font-semibold border-2 rounded-xl outline-none transition-all text-center ${
                                                                    isOver
                                                                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                                                                        : 'border-slate-200 bg-white text-slate-900 focus:border-[var(--accent)]'
                                                                }`}
                                                                min={1}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3.5 text-center">
                                                            {isOver ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                    Sin stock
                                                                </span>
                                                            ) : (
                                                                <span className={`text-sm font-semibold ${isLow ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                                    {remaining}
                                                                    {p.unidadMedida && (
                                                                        <span className="text-[10px] font-normal text-slate-400 ml-0.5">{p.unidadMedida}</span>
                                                                    )}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <button
                                                                onClick={() => removeProduct(p.id)}
                                                                className="h-8 w-8 inline-flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                                            >
                                                                <Icon icon="solar:trash-bin-trash-linear" width={15} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t border-slate-100 bg-slate-50/40">
                                {selectedProducts.length > 0 && (
                                    <div className="flex items-center justify-between mb-3 px-0.5">
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <p className="text-lg font-extrabold text-slate-800 leading-none">{selectedProducts.length}</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">Productos</p>
                                            </div>
                                            <div className="w-px h-7 bg-slate-200" />
                                            <div>
                                                <p className="text-lg font-extrabold text-slate-800 leading-none">{totalUnidades}</p>
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">Unidades</p>
                                            </div>
                                        </div>
                                        {hasStockIssues && (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                Stock insuficiente
                                            </span>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleTraslado}
                                    disabled={isSubmitting || selectedProducts.length === 0}
                                    className="w-full h-12 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/30 hover:brightness-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                    style={{ background: ACCENT }}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Icon icon="line-md:loading-twotone-loop" width={16} />
                                            Procesando traslado...
                                        </>
                                    ) : (
                                        <>
                                            <Icon icon="solar:transfer-horizontal-bold" width={16} />
                                            Confirmar Traslado de Mercadería
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
