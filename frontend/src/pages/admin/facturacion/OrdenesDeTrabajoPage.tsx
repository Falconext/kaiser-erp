import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import useAlertStore from '@/zustand/alert';
import TableSkeleton from '@/components/Skeletons/table';
import { IInvoicesState, useInvoiceStore } from '@/zustand/invoices';
import { IInvoices } from '@/interfaces/invoices';
import moment from 'moment';
import { numberToWords } from '@/utils/numberToLetters';
import { useAuthStore } from '@/zustand/auth';
import QRCode from 'qrcode';
import { Calendar } from '@/components/Date';
import Select from '@/components/Select';
import ModalConfirm from '@/components/ModalConfirm';
import { useDebounce } from '@/hooks/useDebounce';
import ComprobantePrintPage from './comprobanteImprimir';
import { useReactToPrint } from 'react-to-print';
import { buildComprobantePrintPageStyle } from '@/utils/printStyles';
import { usePaymentFlow, PaymentType } from '@/hooks/usePaymentFlow';
import ModalPaymentUnified from '@/components/ModalPaymentUnified';
import PaymentReceipt from '@/components/PaymentReceipt';
import { useThemeStore, SIDEBAR_COLOR_HEX } from '@/zustand/theme';

const print = [{ id: 1, value: 'TICKET' }, { id: 2, value: 'A5' }, { id: 3, value: 'A4' }];

// Pill de estado de pago — punto de color + texto, estilo CRM claro.
const estadoPill = (estado?: string) => {
  const e = String(estado ?? '').toUpperCase();
  if (['COMPLETADO', 'PAGADO'].includes(e)) return { label: 'Completado', dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (['PENDIENTE_PAGO', 'PENDIENTE'].includes(e)) return { label: 'Pendiente', dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
  if (['PARCIAL'].includes(e)) return { label: 'Parcial', dot: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50' };
  if (['ANULADO', 'BAJA'].includes(e)) return { label: 'Anulado', dot: 'bg-rose-500', text: 'text-rose-600', bg: 'bg-rose-50' };
  return { label: e ? e.charAt(0) + e.slice(1).toLowerCase().replace(/_/g, ' ') : '—', dot: 'bg-violet-500', text: 'text-violet-600', bg: 'bg-violet-50' };
};

const OrdenesDeTrabajoPage = () => {
  const sidebarColor = useThemeStore((s) => s.sidebarColor);
  const ACCENT = SIDEBAR_COLOR_HEX[sidebarColor] ?? '#7551FF';
  const { auth } = useAuthStore();
  const { getAllInvoices, totalInvoices, invoices, getInvoice, invoice, resetInvoice, cancelInvoice, completePay }: IInvoicesState = useInvoiceStore();
  const { success } = useAlertStore();
  const paymentFlow = usePaymentFlow();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchClient, setSearchClient] = useState<string>('');
  const [formValues, setFormValues] = useState<any>({});
  const [isOpenModalConfirm, setIsOpenModalConfirm] = useState(false);
  const [isOpenModalPayment, setIsOpenModalPayment] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>('PAGO_PARCIAL');
  const [fechaInicio, setFechaInicio] = useState<string>(moment(new Date()).format('YYYY-MM-DD'));
  const [fechaFin, setFechaFin] = useState<string>(moment(new Date()).format('YYYY-MM-DD'));
  const [stateOT, setStateOT] = useState<string>('TODOS');
  const [printSize, setPrintSize] = useState('TICKET');
  const [shouldPrint, setShouldPrint] = useState(false);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const pages = [];
  for (let i = 1; i <= Math.ceil(totalInvoices / itemsPerPage); i++) {
    pages.push(i);
  }

  const debounce = useDebounce(searchClient, 1000);

  useEffect(() => {
    if (success === true) {
      setIsOpenModalPayment(false);
    }
  }, [success]);

  const productsTable = invoices?.map((item: IInvoices) => ({
    id: item?.id,
    fechaEmisión: moment(item?.fechaEmision).format('DD/MM/YYYY HH:mm:ss'),
    serie: item.serie,
    correlativo: item.correlativo,
    numeroOT: item.numeroOrdenTrabajo,
    cliente: item?.cliente?.nombre,
    total: `S/ ${item.mtoImpVenta.toFixed(2)}`,
    saldo: `S/ ${item?.saldo?.toFixed(2) || (0).toFixed(2)}`,
    estado: item.estadoPago,
  }));

  useEffect(() => {
    resetInvoice();
    return () => {
      resetInvoice();
    };
  }, []);

  const handleGetReceipt = async (data: any) => {
    setShouldPrint(true);
    await getInvoice(data.id);
  };

  const handleAnular = (data: any) => {
    setFormValues(data);
    setIsOpenModalConfirm(true);
  };

  const handleInitiatePayment = (data: any, type: PaymentType) => {
    setFormValues(data);
    setPaymentType(type);
    const saldoActual = parseFloat(data?.saldo?.replace('S/ ', '') || 0);
    paymentFlow.initiatePayment(type, data, saldoActual);
    setIsOpenModalPayment(true);
  };

  const handleAdelanto = (data: any) => handleInitiatePayment(data, 'ADELANTO');
  const handlePagoParcial = (data: any) => handleInitiatePayment(data, 'PAGO_PARCIAL');
  const handlePagoTotal = (data: any) => handleInitiatePayment(data, 'PAGO_TOTAL');

  const handleConfirmPago = async (monto: number, medioPago: string, observacion?: string, referencia?: string, cuentaBancariaId?: number) => {
    try {
      const result = await paymentFlow.processPayment(
        { tipo: paymentType, monto, medioPago: medioPago as any, observacion, referencia, cuentaBancariaId },
        formValues,
        (data, medioPago, monto, _obs, _ref, _cbId) => completePay(data, medioPago, monto)
      );

      if (result.success) {
        setIsOpenModalPayment(false);
        setTimeout(() => {
          getAllInvoices({
            tipoComprobante: 'ORDEN_TRABAJO',
            page: currentPage,
            limit: itemsPerPage,
            search: debounce,
            fechaInicio: fechaInicio,
            fechaFin: fechaFin,
            estadoPago: stateOT !== 'TODOS' ? stateOT : '',
          });

  useEffect(() => {
    if (!shouldPrint || !invoice) return;

    const timer = setTimeout(() => {
      if (componentRef?.current) {
        printFn();
      }
      setShouldPrint(false);
      resetInvoice();
    }, 500);

    return () => clearTimeout(timer);
  }, [invoice, shouldPrint, resetInvoice]);
          paymentFlow.closeReceipt();
        }, 500);
      }
    } catch (error) {
      console.error('Error al procesar pago:', error);
    }
  };

  const actions: any = [
    {
      onClick: handleGetReceipt,
      className: 'edit',
      icon: <Icon color="#3BAED9" icon="mingcute:print-line" />,
      tooltip: 'Imprimir',
    },
    {
      onClick: handleAdelanto,
      className: 'adelanto',
      icon: <Icon icon="tabler:coin" width="21" height="21" color="#FFA500" />,
      tooltip: 'Adelanto',
      condition: (row: any) => {
        const saldo = parseFloat(row.saldo.replace('S/ ', '')) || 0;
        return saldo > 0 && row.estado !== 'ANULADO' && row.estado !== 'COMPLETADO';
      },
    },
    {
      onClick: handlePagoParcial,
      className: 'pago-parcial',
      icon: <Icon icon="tdesign:money" width="21" height="21" color="#42A5F5" />,
      tooltip: 'Pago Parcial',
      condition: (row: any) => {
        const saldo = parseFloat(row.saldo.replace('S/ ', '')) || 0;
        return saldo > 0 && row.estado !== 'ANULADO' && row.estado !== 'COMPLETADO';
      },
    },
    {
      onClick: handlePagoTotal,
      className: 'pago-total',
      icon: <Icon icon="tabler:check-circle" width="21" height="21" color="#10B981" />,
      tooltip: 'Pago Total',
      condition: (row: any) => {
        const saldo = parseFloat(row.saldo.replace('S/ ', '')) || 0;
        return saldo > 0 && row.estado !== 'ANULADO' && row.estado !== 'COMPLETADO';
      },
    },
    {
      onClick: handleAnular,
      className: 'anular',
      icon: <Icon icon="line-md:file-cancel-filled" width="21" height="21" color="#FF8F6B" />,
      tooltip: 'Anular',
      condition: (row: any) => {
        return row.estado !== 'ANULADO' && row.estado !== 'COMPLETADO';
      },
    },
  ];

  useEffect(() => {
    const params: any = {
      tipoComprobante: 'ORDEN_TRABAJO',
      page: currentPage,
      limit: itemsPerPage,
      search: debounce,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
    };
    if (stateOT !== 'TODOS') {
      params.estadoPago = stateOT;
    }
    getAllInvoices(params);
  }, [debounce, currentPage, itemsPerPage, fechaInicio, fechaFin, stateOT]);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const dataUrl = await QRCode.toDataURL('204812192919', {
          width: 90,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
          errorCorrectionLevel: 'H',
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('Error al generar QR:', err);
      }
    };
    generateQR();
  }, []);

  const [dimensions, setDimensions] = useState({ width: 80, height: 297 });

  useEffect(() => {
    switch (printSize) {
      case 'TICKET':
        setDimensions({ width: 80, height:300 });
        break;
      case 'A5':
        setDimensions({ width: 148, height: 210 });
        break;
      case 'A4':
        setDimensions({ width: 210, height: 297 });
        break;
      default:
        setDimensions({ width: 210, height: 297 });
    }
  }, [printSize]);

  const componentRef = useRef(null);
  const printFn = useReactToPrint({
    contentRef: componentRef as any,
    pageStyle: buildComprobantePrintPageStyle(dimensions),
    // Nombre sugerido al "Guardar como PDF": serie-correlativo de la OT
    documentTitle: (invoice as any)?.serie ? `${(invoice as any).serie}-${(invoice as any).correlativo}` : undefined,
  });

  const handleDate = (date: string, name: string) => {
    if (!moment(date, 'DD/MM/YYYY', true).isValid()) return;
    if (name === 'fechaInicio') {
      setFechaInicio(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
    } else if (name === 'fechaFin') {
      setFechaFin(moment(date, 'DD/MM/YYYY').format('YYYY-MM-DD'));
    }
  };

  const handleSelectState = (_id: string, value: string) => {
    setStateOT(value);
  };

  const handleSelectPrint = (value: any) => {
    setPrintSize(value);
  };

  const handleChangeSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchClient(e.target.value);
  };

  const confirmCancelInvoice = () => {
    cancelInvoice(formValues?.id);
    setIsOpenModalConfirm(false);
  };

  const estadosOT = [
    { id: 1, value: 'TODOS' },
    { id: 2, value: 'COMPLETADO' },
    { id: 3, value: 'PENDIENTE_PAGO' },
    { id: 4, value: 'ANULADO' },
  ];

  const refreshList = () => {
    const params: any = {
      tipoComprobante: 'ORDEN_TRABAJO',
      page: currentPage,
      limit: itemsPerPage,
      search: debounce,
      fechaInicio,
      fechaFin,
    };
    if (stateOT !== 'TODOS') params.estadoPago = stateOT;
    getAllInvoices(params);
  };

  // Paginación derivada (misma data/estado, solo presentación).
  const totalPages = Math.max(1, Math.ceil(totalInvoices / itemsPerPage));
  const fromRow = totalInvoices === 0 ? 0 : indexOfFirstItem + 1;
  const toRow = Math.min(indexOfLastItem, totalInvoices);
  const pageNumbers = (() => {
    const nums: number[] = [];
    const win = 2;
    for (let i = Math.max(1, currentPage - win); i <= Math.min(totalPages, currentPage + win); i++) nums.push(i);
    if (!nums.includes(1)) nums.unshift(1);
    if (!nums.includes(totalPages)) nums.push(totalPages);
    return [...new Set(nums)].sort((a, b) => a - b);
  })();

  return (
    <div className="min-h-screen -m-5 p-5 bg-[#F7F8FB] font-jakarta">
      <ComprobantePrintPage
        company={auth}
        componentRef={componentRef}
        formValues={invoice}
        size={printSize}
        serie={invoice?.serie}
        correlative={invoice?.correlativo}
        productsInvoice={invoice?.detalles}
        total={Number(invoice?.mtoImpVenta).toFixed(2)}
        mode="off"
        qrCodeDataUrl={qrCodeDataUrl}
        discount={invoice?.discount}
        receipt={invoice?.comprobante}
        selectedClient={invoice?.cliente}
        totalInWords={numberToWords(parseFloat(invoice?.mtoImpVenta)) + ' SOLES'}
        observation={invoice?.observaciones}
      />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-5">
        <Icon icon="solar:home-smile-linear" className="text-base" />
        <span>Panel</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span>Facturación</span>
        <Icon icon="solar:alt-arrow-right-linear" className="text-xs" />
        <span className="font-semibold" style={{ color: ACCENT }}>Órdenes de Trabajo</span>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold text-slate-800 tracking-tight">Órdenes de Trabajo</h1>
          <p className="text-sm text-slate-400 mt-0.5">Gestiona pagos, adelantos e impresión de tus órdenes de trabajo.</p>
        </div>
        <div className="relative flex-1 lg:w-80">
          <Icon icon="solar:magnifer-linear" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchClient}
            onChange={handleChangeSearch}
            placeholder="Buscar OT, cliente, nro…"
            className="w-full h-11 pl-10 pr-9 rounded-2xl border-2 border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          {searchClient && (
            <button onClick={() => setSearchClient('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <Icon icon="solar:close-circle-bold" />
            </button>
          )}
        </div>
      </div>

      {/* Card contenedora */}
      <div className="bg-white rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        {/* Toolbar / filtros */}
        <div className="flex flex-wrap items-end gap-3 p-4 border-b border-slate-100">
          <button onClick={refreshList} className="h-9 px-3.5 rounded-xl border-2 text-sm font-bold flex items-center gap-1.5 transition-colors self-center"
            style={{ borderColor: `${ACCENT}55`, color: ACCENT }}>
            <Icon icon="solar:refresh-linear" /> Actualizar
          </button>
          <div className="w-full sm:w-40">
            <Calendar text="Fecha inicio" name="fechaInicio" onChange={handleDate} />
          </div>
          <div className="w-full sm:w-40">
            <Calendar text="Fecha Fin" name="fechaFin" onChange={handleDate} />
          </div>
          <div className="w-full sm:w-44">
            <Select onChange={handleSelectState} label="Estado" name="" options={estadosOT} error="" />
          </div>
          <div className="w-full sm:w-40">
            <Select onChange={handleSelectPrint} label="Tamaño" name="" defaultValue={printSize} options={print} error="" />
          </div>
          <span className="text-sm text-slate-400 font-medium px-1 ml-auto self-center">{totalInvoices.toLocaleString('es-PE')} resultados</span>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="py-3 pl-5 pr-3">Fecha</th>
                <th className="py-3 px-3">Serie</th>
                <th className="py-3 px-3">Nro.</th>
                <th className="py-3 px-3">OT</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Importe</th>
                <th className="py-3 px-3">Saldo</th>
                <th className="py-3 px-3">Estado</th>
                <th className="py-3 px-3 pr-5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productsTable?.length > 0 ? (
                productsTable.map((row: any) => {
                  const pill = estadoPill(row.estado);
                  const cliente = row.cliente || 'Cliente varios';
                  return (
                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 pl-5 pr-3 text-sm text-slate-500 whitespace-nowrap">{row.fechaEmisión}</td>
                      <td className="py-3 px-3 font-mono text-sm text-slate-600">{row.serie}</td>
                      <td className="py-3 px-3 font-mono text-sm text-slate-600">{row.correlativo}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-600">{row.numeroOT || '—'}</span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-white grid place-items-center text-xs font-bold shrink-0">
                            {String(cliente).charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-700 text-sm truncate max-w-[180px]">{cliente}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800 text-sm whitespace-nowrap">{row.total}</td>
                      <td className="py-3 px-3 font-bold text-slate-800 text-sm whitespace-nowrap">{row.saldo}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${pill.bg} ${pill.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} /> {pill.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          {actions.map((action: any, idx: number) => {
                            if (action.condition && !action.condition(row)) return null;
                            return (
                              <button
                                key={idx}
                                title={action.tooltip}
                                onClick={() => action.onClick(row)}
                                className="h-8 w-8 grid place-items-center rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                              >
                                {action.icon}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-4 px-2">
                    <TableSkeleton arrayData={productsTable} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {productsTable?.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100">
            <span className="text-sm text-slate-400">{fromRow}-{toRow} de {totalInvoices.toLocaleString('es-PE')}</span>
            <div className="flex items-center gap-1">
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage(1)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-left-linear" /></button>
              <button disabled={currentPage <= 1} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:alt-arrow-left-linear" /></button>
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
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:alt-arrow-right-linear" /></button>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(totalPages)} className="h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30"><Icon icon="solar:double-alt-arrow-right-linear" /></button>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Filas/pág</span>
              <div className="w-24">
                <Select
                  label=""
                  name="itemsPerPage"
                  error=""
                  options={[10, 20, 50, 100].map((n) => ({ id: n, value: String(n) }))}
                  value={String(itemsPerPage)}
                  onChange={(id) => { setItemsPerPage(Number(id)); setCurrentPage(1); }}
                />
              </div>
            </div>
          </div>
        )}
        {isOpenModalConfirm && (
          <ModalConfirm
            confirmSubmit={confirmCancelInvoice}
            information="¿Estás seguro que deseas anular esta orden?"
            isOpenModal
            setIsOpenModal={() => setIsOpenModalConfirm(false)}
            title="Anular Orden de Trabajo"
          />
        )}
        {isOpenModalPayment && (
          <ModalPaymentUnified
            isOpen={isOpenModalPayment}
            isLoading={paymentFlow.isLoading}
            paymentType={paymentType}
            saldoPendiente={parseFloat(formValues?.saldo?.replace('S/ ', '') || 0)}
            totalComprobante={parseFloat(formValues?.total?.replace('S/ ', '') || 0)}
            comprobanteInfo={{
              id: formValues.id,
              serie: formValues.serie,
              correlativo: formValues.correlativo,
              cliente: formValues.cliente,
              total: parseFloat(formValues?.total?.replace('S/ ', '') || 0),
            }}
            onConfirm={handleConfirmPago}
            onCancel={() => {
              setIsOpenModalPayment(false);
              paymentFlow.reset();
            }}
            error={paymentFlow.error || ''}
          />
        )}
        {paymentFlow.showReceipt && paymentFlow.receiptData && (
          <PaymentReceipt
            comprobante={formValues}
            saldo={formValues?.saldo}
            payment={paymentFlow.payment!}
            numeroRecibo={paymentFlow.receiptData.numeroRecibo}
            nuevoSaldo={paymentFlow.receiptData.nuevoSaldo}
            company={auth}
            onClose={() => {
              paymentFlow.reset();
              setIsOpenModalPayment(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default OrdenesDeTrabajoPage;
