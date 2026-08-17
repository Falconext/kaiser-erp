import { useEffect, useState, useMemo, useRef } from 'react';
import { Icon } from '@iconify/react';
import { NavLink } from 'react-router-dom';
import moment from 'moment';
import Select from '@/components/Select';
import { Calendar } from '../../../components/Date';
import { useDebounce } from '@/hooks/useDebounce';
import { usePagosStore } from '@/zustand/pagos';
import ModalRegistrarPago from './ModalRegistrarPago';
import ModalHistorialPagos from './ModalHistorialPagos';
import ModalDetalleCuenta from './ModalDetalleCuenta';
import ModalConfirm from '../../../components/ModalConfirm';
import TableActionMenu from "@/components/TableActionMenu";
import { useReactToPrint } from "react-to-print";
import { useInvoiceStore } from '@/zustand/invoices';
import { useAuthStore } from '@/zustand/auth';
import ComprobantePrintPage from "./comprobanteImprimir";
import { buildComprobantePrintPageStyle } from "@/utils/printStyles";

const ACCENT = 'var(--accent, #7551FF)';

// Pill de estado de cobro — punto de color + texto, estilo CRM claro.
const estadoPill = (label: string) => {
    const e = String(label ?? '').toUpperCase();
    if (e.includes('PARCIAL')) return { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' };
    if (e.includes('VENCID')) return { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/20' };
    return { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };
};

const PER_PAGE = [10, 25, 50];

const CuentasPorCobrar = () => {
    const { getCuentasPorCobrar, cuentasPorCobrar, loadingCuentas } = usePagosStore();
    const { getInvoice, invoice } = useInvoiceStore();
    const { auth } = useAuthStore();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [searchTerm, setSearchTerm] = useState('');
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [estadoPago, setEstadoPago] = useState('');
    const [clienteFilter, setClienteFilter] = useState('');
    const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
    const [selectedComprobante, setSelectedComprobante] = useState<any>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showHistorialModal, setShowHistorialModal] = useState(false);
    const [showDetalleModal, setShowDetalleModal] = useState(false);
    const [showNoPhoneModal, setShowNoPhoneModal] = useState(false);
    const [noPhoneClientName, setNoPhoneClientName] = useState('');
    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
    const [selectedMenuRow, setSelectedMenuRow] = useState<any>(null);
    const [shouldPrint, setShouldPrint] = useState(false);
    const componentRef = useRef(null);

    const printFn = useReactToPrint({
        // @ts-ignore
        contentRef: componentRef,
        pageStyle: buildComprobantePrintPageStyle({ width: 80, height: 330 }),
    });

    useEffect(() => {
        if (!invoice) return;
        if (shouldPrint && invoice) {
            const timer = setTimeout(() => {
                printFn();
                setShouldPrint(false);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [invoice, shouldPrint]);

    const debounce = useDebounce(searchTerm, 500);

    const tabs = [
        { label: 'Historial de Pagos', to: '/administrador/pagos', icon: 'solar:wallet-money-bold-duotone' },
        { label: 'Cuentas por Cobrar', to: '/administrador/pagos/cuentas-cobrar', icon: 'solar:bill-list-bold-duotone' },
    ];

    useEffect(() => {
        const params: any = {
            page: currentPage,
            limit: itemsPerPage,
            search: debounce,
        };
        if (estadoPago) params.estadoPago = estadoPago;
        if (fechaInicio) params.fechaInicio = fechaInicio;
        if (fechaFin) params.fechaFin = fechaFin;
        getCuentasPorCobrar(params);
    }, [debounce, currentPage, itemsPerPage, fechaInicio, fechaFin, estadoPago]);

    // Ya vienen filtrados del store
    const pendientes = cuentasPorCobrar;

    const calcularDiasVencidos = (fechaEmision: string) => {
        const emision = moment(fechaEmision);
        const hoy = moment();
        return hoy.diff(emision, 'days');
    };

    const tableData = pendientes?.map((inv: any) => {
        const diasVencidos = calcularDiasVencidos(inv.fechaEmision);
        const tipoLabel = inv.tipoDoc === 'NP' ? 'NOTA PEDIDO' : inv.tipoDoc === 'OT' ? 'ORDEN TRABAJO' : inv.comprobante || inv.tipoDoc;

        // Mapear estado de pago a etiqueta clara
        let estadoLabel = 'PENDIENTE';
        if (inv.estadoPago === 'PAGO_PARCIAL') estadoLabel = 'PAGO PARCIAL';
        else if (inv.estadoPago === 'PENDIENTE_PAGO') estadoLabel = 'PENDIENTE DE PAGO';
        else if (inv.estadoPago) estadoLabel = inv.estadoPago;

        return {
            id: inv.id,
            fecha: moment(inv.fechaEmision).format('DD/MM/YYYY'),
            comprobante: `${inv.serie}-${String(inv.correlativo).padStart(8, '0')}`.toUpperCase(),
            tipoDocumento: tipoLabel,
            cliente: inv.cliente?.nombre || 'Sin cliente',
            rucDni: inv.cliente?.nroDoc || '-',
            total: `S/ ${Number(inv.mtoImpVenta || 0).toFixed(2)}`,
            saldo: `S/ ${Number(inv.saldo || 0).toFixed(2)}`,
            dias: diasVencidos,
            estadoCobro: estadoLabel,
            celular: inv.cliente?.telefono || '-',
            _raw: inv,
        };
    }) || [];

    const handleCloseMenu = () => {
        setMenuAnchor(null);
        setSelectedMenuRow(null);
    };

    const handleGenerarOrdenDePago = async () => {
        if (selectedMenuRow) {
            setShouldPrint(true);
            await getInvoice(selectedMenuRow.id);
            handleCloseMenu();
        }
    };

    const handleRegistrarPago = () => {
        if (selectedMenuRow) {
            setSelectedComprobante(selectedMenuRow._raw);
            setShowPaymentModal(true);
            handleCloseMenu();
        }
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        setSelectedComprobante(null);
        getCuentasPorCobrar({
            page: currentPage,
            limit: itemsPerPage,
            search: debounce || undefined,
            estadoPago: estadoPago || undefined,
            fechaInicio: fechaInicio || undefined,
            fechaFin: fechaFin || undefined,
        });
    };

    const handleVerHistorial = () => {
        if (selectedMenuRow) {
            setSelectedComprobante(selectedMenuRow._raw);
            setShowHistorialModal(true);
            handleCloseMenu();
        }
    };

    const handleVerDetalle = () => {
        if (selectedMenuRow) {
            setSelectedComprobante(selectedMenuRow._raw);
            setShowDetalleModal(true);
            handleCloseMenu();
        }
    };

    const handleWhatsApp = () => {
        if (selectedMenuRow) {
            const row = selectedMenuRow;
            const phone = row._raw.cliente?.telefono;
            if (!phone || phone === '-') {
                setNoPhoneClientName(row.cliente);
                setShowNoPhoneModal(true);
                handleCloseMenu();
                return;
            }
            const message = `Estimado(a) ${row.cliente}, le escribimos para recordarle cordialmente que tiene una cuenta pendiente de pago correspondiente al comprobante ${row.comprobante}. El saldo actual es de ${row.saldo}. Agradeceremos pueda regularizar este pago a la brevedad posible. Quedamos a su disposición por cualquier consulta.`;
            const whatsappUrl = `https://wa.me/51${phone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
            handleCloseMenu();
        }
    };

    // Obtener lista única de clientes para el filtro
    const clienteOptions = useMemo(() => {
        const clientes = new Map();
        cuentasPorCobrar?.forEach((inv: any) => {
            if (inv.cliente?.id && !clientes.has(inv.cliente.id)) {
                clientes.set(inv.cliente.id, {
                    id: inv.cliente.id,
                    value: inv.cliente.nombre || 'Sin nombre',
                });
            }
        });
        return [{ id: '', value: 'Todos los clientes' }, ...Array.from(clientes.values())];
    }, [cuentasPorCobrar]);

    // Filtrar por cliente si está seleccionado
    const pendientesFiltrados = useMemo(() => {
        if (!clienteFilter) return pendientes;
        return pendientes?.filter((inv: any) => inv.cliente?.id === Number(clienteFilter));
    }, [pendientes, clienteFilter]);

    const handleDate = (date: string, name: string) => {
        if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
        if (name === 'fechaInicio') {
            setFechaInicio(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
        } else if (name === 'fechaFin') {
            setFechaFin(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
        }
    };

    const activeFilterCount = [
        searchTerm.trim(),
        clienteFilter,
        fechaInicio,
        fechaFin,
        estadoPago,
    ].filter(Boolean).length;

    // ── Métricas ─────────────────────────────────────────────────────
    const totalPorCobrar = pendientes?.reduce((sum: number, inv: any) => sum + (inv.saldo || 0), 0) || 0;
    const vencidos30 = pendientes?.filter((inv: any) => calcularDiasVencidos(inv.fechaEmision) > 30).length || 0;

    // ── Paginación ───────────────────────────────────────────────────
    const totalItems = pendientes?.length || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const fromRow = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const toRow = Math.min(currentPage * itemsPerPage, totalItems);
    const pageNumbers = useMemo(() => {
        const nums: number[] = [];
        const win = 2;
        for (let i = Math.max(1, currentPage - win); i <= Math.min(totalPages, currentPage + win); i++) nums.push(i);
        if (!nums.includes(1)) nums.unshift(1);
        if (!nums.includes(totalPages)) nums.push(totalPages);
        return [...new Set(nums)].sort((a, b) => a - b);
    }, [currentPage, totalPages]);

    return (
        <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
                <Icon icon="solar:home-smile-linear" className="text-base" />
                <span>Panel</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span>Pagos</span>
                <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
                <span className="font-semibold" style={{ color: ACCENT }}>Cuentas por Cobrar</span>
            </div>

            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
                <div className="min-w-0">
                    <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Gestión de Pagos</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Administra cobros y cuentas pendientes</p>
                </div>
                <div className="relative flex-1 lg:w-80">
                    <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar cliente o comprobante…"
                        className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                            <Icon icon="solar:close-circle-bold" />
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-2.5 mb-5">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.to}
                        to={tab.to}
                        end={tab.to === '/administrador/pagos'}
                        className={({ isActive }) =>
                            `flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${isActive
                                ? 'text-white shadow-lg shadow-violet-500/30'
                                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                            }`
                        }
                        style={({ isActive }: any) => (isActive ? { background: ACCENT } : undefined)}
                    >
                        <Icon icon={tab.icon} className="text-lg" />
                        {tab.label}
                    </NavLink>
                ))}
            </div>

            {/* KPI Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                {/* KPI 1 */}
                <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-5 flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 uppercase tracking-wide text-xs font-bold">Comprobantes Pendientes</p>
                        <h2 className="text-[28px] leading-none font-extrabold text-slate-800 dark:text-white mt-2">{totalItems}</h2>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 grid place-items-center shrink-0">
                        <Icon icon="solar:bill-list-bold-duotone" className="text-2xl" />
                    </div>
                </div>
                {/* KPI 2 */}
                <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-5 flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 uppercase tracking-wide text-xs font-bold">Total por Cobrar</p>
                        <h2 className="text-[28px] leading-none font-extrabold text-slate-800 dark:text-white mt-2">S/ {totalPorCobrar.toFixed(2)}</h2>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 grid place-items-center shrink-0">
                        <Icon icon="solar:money-bag-bold-duotone" className="text-2xl" />
                    </div>
                </div>
                {/* KPI 3 */}
                <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] p-5 flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 uppercase tracking-wide text-xs font-bold">Vencidos (+30 días)</p>
                        <h2 className="text-[28px] leading-none font-extrabold text-slate-800 dark:text-white mt-2">{vencidos30}</h2>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 grid place-items-center shrink-0">
                        <Icon icon="solar:calendar-bold-duotone" className="text-2xl" />
                    </div>
                </div>
            </div>

            {/* Card contenedora */}
            <div className="bg-white dark:bg-[#111827] rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                {/* Filtros */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                            <div className="h-9 w-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 grid place-items-center">
                                <Icon icon="solar:filter-bold-duotone" className="text-lg" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-slate-800 dark:text-white text-sm">Filtros</h3>
                                <p className="truncate text-xs text-slate-400 md:hidden">{activeFilterCount} activos</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsMobileFiltersOpen((value) => !value)}
                            className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold text-white shadow-lg shadow-violet-500/30 md:hidden"
                            style={{ background: ACCENT }}
                        >
                            {isMobileFiltersOpen ? 'Ocultar' : 'Ver filtros'}
                            <Icon icon={isMobileFiltersOpen ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} className="text-base" />
                        </button>
                    </div>
                    <div className={`${isMobileFiltersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-4 md:grid md:grid-cols-2 lg:grid-cols-4`}>
                        <div>
                            <Select
                                error=""
                                label="Cliente"
                                name="clienteFilter"
                                onChange={(id: any, value: string) => setClienteFilter(id)}
                                options={clienteOptions}
                            />
                        </div>
                        <div>
                            <Calendar text="Desde" name="fechaInicio" onChange={handleDate} className="admin-date-filter" portal />
                        </div>
                        <div>
                            <Calendar text="Hasta" name="fechaFin" onChange={handleDate} className="admin-date-filter" portal />
                        </div>
                        <div>
                            <Select
                                error=""
                                label="Estado"
                                name="estadoPago"
                                onChange={(id: any, value: string) => setEstadoPago(value === 'TODOS' ? '' : value)}
                                options={[
                                    { value: 'TODOS', label: 'Todos' },
                                    { value: 'PENDIENTE_PAGO', label: 'Pendiente' },
                                    { value: 'PAGO_PARCIAL', label: 'Pago Parcial' },
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                <th className="py-3 pl-5 pr-3">Fecha</th>
                                <th className="py-3 px-3">Comprobante</th>
                                <th className="py-3 px-3">Tipo</th>
                                <th className="py-3 px-3">Cliente</th>
                                <th className="py-3 px-3">RUC/DNI</th>
                                <th className="py-3 px-3">Celular</th>
                                <th className="py-3 px-3">Total</th>
                                <th className="py-3 px-3">Saldo</th>
                                <th className="py-3 px-3">Días</th>
                                <th className="py-3 px-3">Estado</th>
                                <th className="py-3 px-3 pr-5 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingCuentas ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800">
                                        <td colSpan={11} className="py-3.5 px-5">
                                            <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : tableData.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-16 text-center">
                                        <Icon icon="solar:check-circle-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                                        <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">¡No hay cuentas pendientes!</p>
                                        <p className="text-slate-400 text-xs mt-1">Todos los comprobantes están al día</p>
                                    </td>
                                </tr>
                            ) : tableData.map((row: any) => {
                                const pill = estadoPill(row.estadoCobro);
                                const diasClass = row.dias > 30
                                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                                    : row.dias > 0
                                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
                                return (
                                    <tr key={row.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors">
                                        <td className="py-3 pl-5 pr-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.fecha}</td>
                                        <td className="py-3 px-3">
                                            <span className="font-mono text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{row.comprobante}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{row.tipoDocumento}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                                                    {String(row.cliente).charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm truncate max-w-[180px]">{row.cliente}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.rucDni}</td>
                                        <td className="py-3 px-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{row.celular}</td>
                                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-white text-sm whitespace-nowrap">{row.total}</td>
                                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-white text-sm whitespace-nowrap">{row.saldo}</td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${diasClass}`}>{row.dias}</span>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${pill.bg} ${pill.text}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {row.estadoCobro}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 pr-5 text-right">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setSelectedMenuRow(row); }}
                                                className="h-9 w-9 grid place-items-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <Icon icon="solar:menu-dots-bold" width={18} height={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                {tableData.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100">
                        <span className="text-sm text-slate-400">{fromRow}-{toRow} de {totalItems.toLocaleString('es-PE')}</span>
                        <div className="flex items-center gap-1">
                            <button disabled={currentPage <= 1} onClick={() => setCurrentPage(1)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-left-linear" /></button>
                            <button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:alt-arrow-left-linear" /></button>
                            {pageNumbers.map((n, i) => {
                                const prev = pageNumbers[i - 1];
                                const gap = prev && n - prev > 1;
                                return (
                                    <span key={n} className="flex items-center">
                                        {gap && <span className="px-1 text-slate-300">…</span>}
                                        <button onClick={() => setCurrentPage(n)}
                                            className={`h-8 min-w-8 px-2 grid place-items-center rounded-lg text-sm font-semibold transition-colors ${n === currentPage ? 'text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                            style={n === currentPage ? { background: ACCENT } : undefined}>
                                            {n}
                                        </button>
                                    </span>
                                );
                            })}
                            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-linear" /></button>
                            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-right-linear" /></button>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span>Filas/pág</span>
                            <Select
                                error=""
                                label=""
                                name="itemsPerPage"
                                value={String(itemsPerPage)}
                                options={PER_PAGE.map((n) => ({ id: n, value: String(n) }))}
                                onChange={(id: any) => { setItemsPerPage(Number(id)); setCurrentPage(1); }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Registrar Pago */}
            {showPaymentModal && selectedComprobante && (
                <ModalRegistrarPago
                    comprobante={selectedComprobante}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setSelectedComprobante(null);
                    }}
                    onSuccess={handlePaymentSuccess}
                />
            )}

            {/* Modal Historial de Pagos */}
            {showHistorialModal && selectedComprobante && (
                <ModalHistorialPagos
                    comprobante={selectedComprobante}
                    onClose={() => {
                        setShowHistorialModal(false);
                        setSelectedComprobante(null);
                    }}
                />
            )}

            {/* Modal Detalle de Cuenta por Cobrar */}
            {showDetalleModal && selectedComprobante && (
                <ModalDetalleCuenta
                    comprobante={selectedComprobante}
                    onClose={() => {
                        setShowDetalleModal(false);
                        setSelectedComprobante(null);
                    }}
                />
            )}

            {/* Dropdown de acciones (TableActionMenu) */}
            <TableActionMenu
                isOpen={Boolean(menuAnchor)}
                anchorEl={menuAnchor}
                onClose={handleCloseMenu}
                className="w-44"
            >
                {selectedMenuRow && (
                    <>
                        <button onClick={handleVerDetalle} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                            <Icon icon="solar:document-text-bold-duotone" width={16} height={16} color="#8b5cf6" />
                            <span>Ver Detalle</span>
                        </button>
                        <button onClick={handleVerHistorial} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                            <Icon icon="solar:history-bold-duotone" width={16} height={16} color="#6366f1" />
                            <span>Ver Historial</span>
                        </button>
                        <button onClick={handleRegistrarPago} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                            <Icon icon="solar:hand-money-bold-duotone" width={16} height={16} color="#10b981" />
                            <span>Registrar Pago</span>
                        </button>
                        <button onClick={handleWhatsApp} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                            <Icon icon="ic:baseline-whatsapp" width={16} height={16} color="#25D366" />
                            <span>WhatsApp</span>
                        </button>
                        <hr className="my-1 border-slate-100" />
                        <button onClick={handleGenerarOrdenDePago} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-violet-700 hover:bg-violet-50 transition-colors">
                            <Icon icon="solar:printer-minimalistic-bold-duotone" width={16} height={16} />
                            <span>Generar orden de pago</span>
                        </button>
                    </>
                )}
            </TableActionMenu>

            <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', visibility: 'hidden', pointerEvents: 'none', zIndex: -1 }}>
                <ComprobantePrintPage
                    id="print-root"
                    company={auth}
                    componentRef={componentRef}
                    formValues={{
                        ...invoice,
                        fechaVencimientoCredito: invoice?.fechaVencimientoCredito || invoice?.fechaVencimiento || (invoice?.cuotas?.length > 0 ? invoice.cuotas[0].fechaVencimiento : null)
                    }}
                    size="TICKET"
                    serie={invoice?.serie}
                    correlative={invoice?.correlativo}
                    productsInvoice={invoice?.detalles}
                    total={Number(invoice?.mtoImpVenta || 0).toFixed(2)}
                    mode="off"
                    discount={invoice?.discount}
                    receipt="ORDEN DE PAGO"
                    selectedClient={invoice?.cliente}
                />
            </div>


            {/* Modal de Información - Sin Teléfono */}
            <ModalConfirm
                isOpenModal={showNoPhoneModal}
                setIsOpenModal={setShowNoPhoneModal}
                title="Información"
                information={`El cliente ${noPhoneClientName} no tiene un número de celular registrado en el sistema. No es posible enviar un mensaje de WhatsApp.`}
                confirmText="Entendido"
                confirmSubmit={() => setShowNoPhoneModal(false)}
            />
        </div>
    );
};

export default CuentasPorCobrar;
