import { useEffect, useState } from 'react';
import { usePagosStore, IPagosState } from '../../../zustand/pagos';
import { Calendar } from '../../../components/Date';
import Input from '../../../components/Input';
import DataTable from '../../../components/Datatable';
import Pagination from '../../../components/Pagination';
import TableSkeleton from '../../../components/Skeletons/table';
import moment from 'moment';
import { Icon } from '@iconify/react';
import { useDebounce } from '@/hooks/useDebounce';
import Select from '@/components/Select';
import PaymentReceipt from '@/components/PaymentReceipt';
import { useAuthStore } from '@/zustand/auth';
import InputPro from '@/components/InputPro';
import { usePaymentFlow } from '@/hooks/usePaymentFlow';
import { NavLink } from 'react-router-dom';

const ACCENT = 'var(--accent, #7551FF)';

const tabs = [
  { label: 'Historial de Pagos', to: '/administrador/pagos', icon: 'solar:wallet-money-bold-duotone' },
  { label: 'Cuentas por Cobrar', to: '/administrador/pagos/cuentas-cobrar', icon: 'solar:bill-list-bold-duotone' },
];

const DIRIGIDO_LABEL: Record<string, string> = {
  ADMINISTRADOR: 'Administrador',
  EMPRESA: 'Empresa',
  VENDEDOR: 'Vendedor',
};

const Pagos = () => {
  const { auth } = useAuthStore();
  const { getAllPagos, pagos, totalPagos, loading, eliminarPago }: IPagosState = usePagosStore();
  const paymentFlow = usePaymentFlow();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaInicio, setFechaInicio] = useState(moment().format('YYYY-MM-DD'));
  const [fechaFin, setFechaFin] = useState(moment().format('YYYY-MM-DD'));
  const [medioPago, setMedioPago] = useState('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPago, setSelectedPago] = useState<any>(null);
  const [comprobanteDetalles, setComprobanteDetalles] = useState<any>(null);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [comprobantePreview, setComprobantePreview] = useState('');

  const debounce = useDebounce(searchTerm, 1000);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const pages = Array.from(
    { length: Math.ceil(totalPagos / itemsPerPage) },
    (_, i) => i + 1
  );

  useEffect(() => {
    const params: any = {
      page: currentPage,
      limit: itemsPerPage,
      search: debounce,
      fechaInicio,
      fechaFin,
    };
    if (medioPago) params.medioPago = medioPago;
    getAllPagos(params);
  }, [debounce, currentPage, itemsPerPage, fechaInicio, fechaFin, medioPago]);

  const cobranzaCampo = Boolean((auth as any)?.empresa?.cobranzaCampo);

  const pagosTable = pagos?.map((pago) => ({
    id: pago.id,
    fecha: moment(pago.fecha).format('DD/MM/YYYY HH:mm:ss'),
    serie: (pago.comprobante as any)?.serie,
    correlativo: (pago.comprobante as any)?.correlativo,
    comprobanteId: pago.comprobanteId,
    cliente: pago.comprobante?.cliente?.nombre || '',
    monto: `S/ ${pago.monto.toFixed(2)}`,
    medioPago: pago.medioPago,
    observacion: pago.observacion || '-',
    referencia: pago.referencia ? pago.referencia.toUpperCase() : '-',
    dirigidoA: (pago as any).dirigidoA ? (DIRIGIDO_LABEL[(pago as any).dirigidoA] || (pago as any).dirigidoA) : '-',
    vendedor: (pago as any).vendedorNombre || '-',
    comprobanteUrl: (pago as any).comprobanteUrl || '',
  }));

  const handleDeletePago = (row: any) => {
    if (confirm('¿Estás seguro de eliminar este pago?')) {
      eliminarPago(row.id);
    }
  };

  const handleImprimirRecibo = async (row: any) => {
    const original = pagos?.find((p: any) => p.id === row.id);
    if (!original) return;

    setSelectedPago(original);
    setLoadingDetalles(true);

    try {
      // Usar el comprobanteId del pago para cargar los detalles completos
      const comprobanteId = original.comprobanteId;
      if (comprobanteId) {
        const detalles = await paymentFlow.loadComprobanteDetails(comprobanteId);
        setComprobanteDetalles(detalles?.comprobanteDetails || null);
      }
    } catch (error) {
      console.error('Error cargando detalles del comprobante:', error);
    } finally {
      setLoadingDetalles(false);
      setShowReceipt(true);
    }
  };

  const actions = [
    {
      onClick: (row: any) => setComprobantePreview(row.comprobanteUrl),
      condition: (row: any) => !!row.comprobanteUrl,
      className: 'print',
      icon: <Icon icon="solar:gallery-bold" width="20" height="20" color="#7c3aed" />,
      tooltip: 'Ver comprobante',
    },
    {
      onClick: handleImprimirRecibo,
      className: 'print',
      icon: <Icon icon="mingcute:print-line" width="20" height="20" color="#3BAED9" />,
      tooltip: 'Imprimir Recibo',
    },
    {
      onClick: handleDeletePago,
      className: 'delete',
      icon: <Icon icon="tabler:trash" width="20" height="20" color="#ff6b6b" />,
      tooltip: 'Eliminar',
    },
  ];

  const handleDate = (date: string, name: string) => {
    if (!moment(date, 'DD/MM/YYYY', true).isValid()) {
      return;
    }
    if (name === 'fechaInicio') {
      setFechaInicio(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
    } else if (name === 'fechaFin') {
      setFechaFin(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
    }
  };

  const handleSelect = (_idValue: any, value: string) => {
    setMedioPago(value === "TODOS" ? "" : value);
  };


  const activeFilterCount = [
    searchTerm.trim(),
    fechaInicio,
    fechaFin,
    medioPago,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] dark:bg-[#0A0D14] font-jakarta">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Facturación</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Pagos</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-11 w-11 grid place-items-center rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shrink-0">
            <Icon icon="solar:wallet-money-bold-duotone" className="text-2xl" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold text-slate-800 dark:text-white tracking-tight">Gestión de Pagos</h1>
            <p className="text-sm text-slate-400 mt-0.5">Administra cobros y cuentas pendientes</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 mb-5">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/administrador/pagos'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all ${isActive
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

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none overflow-hidden">
        {/* Filters Section */}
        <div className="border-b border-slate-100 dark:border-slate-700 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="h-8 w-8 grid place-items-center rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 shrink-0">
                <Icon icon="solar:filter-bold-duotone" className="text-lg" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 dark:text-white">Filtros</h3>
                <p className="truncate text-xs text-slate-400 md:hidden">
                  {activeFilterCount} activos · {moment(fechaInicio).format('DD/MM')} - {moment(fechaFin).format('DD/MM')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen((value) => !value)}
              className="inline-flex h-10 items-center gap-2 rounded-2xl px-3.5 text-xs font-bold text-white shadow-lg shadow-violet-500/30 md:hidden"
              style={{ background: ACCENT }}
            >
              {isMobileFiltersOpen ? 'Ocultar' : 'Ver filtros'}
              <Icon icon={isMobileFiltersOpen ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} className="text-base" />
            </button>
          </div>
          <div className={`${isMobileFiltersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-4 md:grid md:grid-cols-2 lg:grid-cols-5`}>
            <div className="lg:col-span-2">
              <InputPro
                name="search"
                onChange={(e: any) => setSearchTerm(e.target.value)}
                label="Buscar por cliente, comprobante o referencia"
                isLabel
              />
            </div>
            <div>
              <Calendar text="Fecha inicio" name="fechaInicio" onChange={handleDate} className="admin-date-filter" portal />
            </div>
            <div>
              <Calendar text="Fecha Fin" name="fechaFin" onChange={handleDate} className="admin-date-filter" portal />
            </div>
            <div>
              <Select
                error={''}
                label="Medio de pago"
                name="medioPago"
                onChange={handleSelect}
                options={[
                  { value: 'TODOS', label: 'Todos los medios' },
                  { value: 'EFECTIVO', label: 'Efectivo' },
                  { value: 'YAPE', label: 'Yape' },
                  { value: 'PLIN', label: 'Plin' },
                  { value: 'TRANSFERENCIA', label: 'Transferencia' },
                  { value: 'TARJETA', label: 'Tarjeta' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="p-4 relative z-0">
          {loading ? (
            <TableSkeleton />
          ) : pagosTable?.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <DataTable
                  actions={actions}
                  bodyData={pagosTable}
                  headerColumns={[
                    'Fecha',
                    'Serie',
                    'Nro.',
                    'Cliente',
                    'Monto',
                    'Medio Pago',
                    ...(cobranzaCampo ? ['Dirigido a', 'Vendedor'] : []),
                    'Observación',
                    'Referencia',
                  ]}
                />
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <Pagination
                  data={pagosTable}
                  optionSelect
                  currentPage={currentPage}
                  indexOfFirstItem={indexOfFirstItem}
                  indexOfLastItem={indexOfLastItem}
                  setcurrentPage={setCurrentPage}
                  setitemsPerPage={setItemsPerPage}
                  pages={pages}
                  total={totalPagos}
                />
              </div>
            </>
          ) : (
            <div className="py-16 text-center relative z-0">
              <Icon icon="solar:wallet-money-linear" className="text-5xl text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No se encontraron pagos</p>
              <p className="text-sm text-slate-400 mt-1">Ajusta los filtros o selecciona un rango de fechas diferente</p>
            </div>
          )}
        </div>
      </div>

      {showReceipt && selectedPago && (
        <PaymentReceipt
          saldo={comprobanteDetalles?.saldo ?? selectedPago.comprobante?.saldo ?? 0}
          comprobante={comprobanteDetalles || selectedPago.comprobante}
          payment={{
            tipo: (comprobanteDetalles?.saldo ?? selectedPago.comprobante?.saldo ?? 0) <= 0 ? 'PAGO_TOTAL' : 'PAGO_PARCIAL',
            monto: selectedPago.monto,
            medioPago: selectedPago.medioPago,
            observacion: selectedPago.observacion,
            referencia: selectedPago.referencia,
            dirigidoA: selectedPago.dirigidoA,
            vendedorNombre: selectedPago.vendedorNombre,
          }}
          numeroRecibo={`REC-${selectedPago.id}`}
          nuevoSaldo={comprobanteDetalles?.saldo ?? selectedPago.comprobante?.saldo ?? 0}
          detalles={comprobanteDetalles?.detalles || []}
          cliente={comprobanteDetalles?.cliente || selectedPago.comprobante?.cliente}
          company={auth}
          onClose={() => {
            setShowReceipt(false);
            setSelectedPago(null);
            setComprobanteDetalles(null);
          }}
        />
      )}

      {comprobantePreview && (
        <div
          className="fixed inset-0 z-[9999999] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setComprobantePreview('')}
        >
          <img src={comprobantePreview} alt="Comprobante" className="max-h-[90vh] max-w-full rounded-lg shadow-2xl" />
          <button onClick={() => setComprobantePreview('')} className="absolute top-4 right-4 text-white/80 hover:text-white">
            <Icon icon="mdi:close" className="text-3xl" />
          </button>
        </div>
      )}

      {loadingDetalles && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center font-jakarta">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: ACCENT }}></div>
              <span className="text-slate-600 dark:text-slate-300 text-sm font-medium">Cargando detalles del comprobante...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default Pagos;
