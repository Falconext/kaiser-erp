import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import useEmpresasStore from '@/zustand/empresas';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';
import ComprobantePrintPage from '@/pages/admin/facturacion/comprobanteImprimir';
import { COTIZ_ELEMENTOS, CotizConfig, elemCfg } from './cotizFormatoElementos';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  auth: any;
  /** Campo de la empresa donde se guarda el formato. Por defecto cotización. */
  configKey?: 'cotizFormatoConfig' | 'notaVentaFormatoConfig';
  /** Tipo de comprobante para la vista previa. */
  previewReceipt?: string;
  /** Título del modal. */
  title?: string;
  /** Mensaje al guardar. */
  savedMsg?: string;
}

const numberToWords = (n: number) =>
  `${Math.floor(n)} CON ${Math.round((n % 1) * 100).toString().padStart(2, '0')}/100`;

// Datos de ejemplo para el preview del formato
const SAMPLE_PRODUCTS = [
  { cantidad: 1, unidad: 'UNIDAD', descripcion: 'Distribuidor 12V (ejemplo)', codigoBarras: '7501234567890', codigo: 'PROD-001', precioUnitario: 630, total: 630, imagenUrl: null },
  { cantidad: 1, unidad: 'SERVICIO', descripcion: 'Servicio de reparación (ejemplo)', precioUnitario: 259.6, total: 259.6, imagenUrl: null },
];
const SAMPLE_CLIENT = { nombre: 'CLIENTE DE EJEMPLO S.A.C.', nroDoc: '20123456789', email: 'cliente@correo.com', telefono: '999 888 777', direccion: 'AV. EJEMPLO 123, LIMA' };
const SAMPLE_INVOICE = {
  serie: 'COT1', correlativo: '1', fechaEmision: new Date().toISOString(),
  mtoOperGravadas: 753.9, subTotal: 753.9, mtoIGV: 135.7, mtoImpVenta: 889.6, discount: 0,
  observaciones: 'TIEMPO DE ENTREGA 1 DÍA DESPUÉS DE CONFIRMADA LA OC',
  cotizVigencia: 7, cotizTipoPago: 'CONTADO', cotizTerminos: '',
  tipoDetraccion: { codigo: '001', descripcion: 'Azúcar y melaza de caña', porcentaje: 10 },
  montoDetraccion: 88.96,
};

export default function ModalConfigCotizacion({
  isOpen,
  onClose,
  auth,
  configKey = 'cotizFormatoConfig',
  previewReceipt = 'COTIZACIÓN',
  title = 'Configurar formato de cotización',
  savedMsg = 'Formato de cotización guardado',
}: Props) {
  const alertStore = useAlertStore();
  const [config, setConfig] = useState<CotizConfig>({});
  const [textos, setTextos] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = (auth?.empresa?.[configKey] as any) || {};
      const { textos: t, ...rest } = cfg;
      setConfig({ ...(rest as CotizConfig) });
      setTextos({ ...(t || {}) });
    }
  }, [isOpen, auth, configKey]);

  const setVisible = (key: string, visible: boolean) =>
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], visible } }));
  const setSize = (key: string, size: number) =>
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], size } }));
  const setTexto = (key: string, value: string) =>
    setTextos((prev) => ({ ...prev, [key]: value }));

  const mergedConfig = useMemo(() => ({ ...config, textos } as any), [config, textos]);

  const previewCompany = useMemo(
    () => ({ ...auth, empresa: { ...auth?.empresa, [configKey]: mergedConfig } }),
    [auth, mergedConfig, configKey],
  );

  const guardar = async () => {
    setSaving(true);
    try {
      await useEmpresasStore.getState().actualizarMiEmpresa({ [configKey]: mergedConfig } as any);
      useAuthStore.setState((state) => ({
        auth: state.auth ? { ...state.auth, empresa: { ...(state.auth as any).empresa, [configKey]: mergedConfig } } : state.auth,
      }));
      alertStore.alert(savedMsg, 'success');
      onClose();
    } catch (e: any) {
      alertStore.alert(e?.message || 'No se pudo guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const grupos = ['Encabezado', 'Cuerpo', 'Pie'] as const;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 p-2 md:p-4">
      <div className="bg-white dark:bg-[#111827] rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Icon icon="solar:tuning-square-bold-duotone" width={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Muestra/oculta y ajusta el tamaño de cada elemento. Aplica a la vista previa y al PDF.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <Icon icon="solar:close-circle-bold" width={26} />
          </button>
        </div>

        {/* Body: controles + preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Controles */}
          <div className="w-full md:w-[380px] shrink-0 overflow-y-auto p-4 border-r border-gray-100 dark:border-slate-800">
            {grupos.map((g) => (
              <div key={g} className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{g}</p>
                <div className="space-y-2">
                  {COTIZ_ELEMENTOS.filter((e) => e.grupo === g).map((el) => {
                    const cur = elemCfg(config, el.key);
                    return (
                      <div key={el.key} className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-100 dark:border-transparent bg-gray-50/50 dark:bg-slate-900/40">
                        {el.hasVisible ? (
                          <button
                            onClick={() => setVisible(el.key, !cur.visible)}
                            className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cur.visible ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-200 text-gray-400 dark:bg-slate-700'}`}
                            title={cur.visible ? 'Visible' : 'Oculto'}
                          >
                            <Icon icon={cur.visible ? 'solar:eye-bold' : 'solar:eye-closed-bold'} width={16} />
                          </button>
                        ) : (
                          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 dark:text-gray-600"><Icon icon="solar:lock-keyhole-minimalistic-bold" width={14} /></div>
                        )}
                        <span className={`flex-1 text-sm ${cur.visible ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500 line-through'}`}>{el.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => setSize(el.key, Math.max(el.min, cur.size - 1))} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-600"><Icon icon="solar:minus-square-bold" width={14} /></button>
                          <span className="w-11 text-center text-xs font-mono text-gray-600 dark:text-gray-300">{cur.size}{el.unit || 'px'}</span>
                          <button onClick={() => setSize(el.key, Math.min(el.max, cur.size + 1))} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-600"><Icon icon="solar:add-square-bold" width={14} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Textos del documento (bloque "Autorizado por" y avisos) */}
            <div className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Textos del documento</p>
              <div className="space-y-2">
                {[
                  { key: 'autorizadoNombre', label: 'Autorizado por (nombre)', ph: 'CECILIA KAISER POLO' },
                  { key: 'autorizadoCargo', label: 'Cargo', ph: 'Gerente Comercial' },
                  { key: 'autorizadoTelefono', label: 'Teléfono', ph: '989007725' },
                  { key: 'autorizadoEmail', label: 'Email', ph: 'ckp@kaisercorp.com.pe' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">{f.label}</label>
                    <input
                      type="text"
                      value={textos[f.key] ?? ''}
                      placeholder={f.ph}
                      onChange={(e) => setTexto(f.key, e.target.value)}
                      className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Horario de atención</label>
                  <textarea
                    rows={3}
                    value={textos.horario ?? ''}
                    placeholder={'HORARIO DE ATENCIÓN – PLANTA COMAS (CHACRACERRO):\nLUNES A VIERNES: ...'}
                    onChange={(e) => setTexto('horario', e.target.value)}
                    className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Aviso de observaciones</label>
                  <textarea
                    rows={2}
                    value={textos.avisoObservaciones ?? ''}
                    placeholder={'LAS OBSERVACIONES DEL PRODUCTO SE RECIBIRÁN HASTA 7 DÍAS CALENDARIO...'}
                    onChange={(e) => setTexto('avisoObservaciones', e.target.value)}
                    className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-500 dark:text-gray-400 mb-0.5">Nota de condiciones (bajo condiciones de venta)</label>
                  <textarea
                    rows={2}
                    value={textos.condicionNota ?? ''}
                    placeholder={'PRECIO SUJETO A VARIACIÓN, POR LAS CONSTANTES ALZAS...'}
                    onChange={(e) => setTexto('condicionNota', e.target.value)}
                    className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Si dejas un campo vacío se usa el valor por defecto de Kaiser.</p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="hidden md:flex flex-1 bg-gray-100 dark:bg-slate-950 overflow-auto p-6 justify-center">
            <div style={{ width: 794, transform: 'scale(0.68)', transformOrigin: 'top center' }}>
              <div className="bg-white shadow-xl">
                <ComprobantePrintPage
                  company={previewCompany}
                  formValues={SAMPLE_INVOICE}
                  size="A4"
                  serie="COT1"
                  correlative="1"
                  productsInvoice={SAMPLE_PRODUCTS}
                  total={SAMPLE_INVOICE.mtoImpVenta.toFixed(2)}
                  mode="preview"
                  receipt={previewReceipt}
                  selectedClient={SAMPLE_CLIENT}
                  totalInWords={numberToWords(SAMPLE_INVOICE.mtoImpVenta) + ' SOLES'}
                  observation={SAMPLE_INVOICE.observaciones}
                  includeProductImages={false}
                  quotationValidity={SAMPLE_INVOICE.cotizVigencia}
                  quotationTerms={SAMPLE_INVOICE.cotizTerminos}
                  quotationPaymentType={SAMPLE_INVOICE.cotizTipoPago}
                  quotationAdvance={0}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-slate-800">
          <button onClick={() => { setConfig({}); setTextos({}); }} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
            <Icon icon="solar:restart-bold" width={14} /> Restablecer a valores por defecto
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800">Cancelar</button>
            <button onClick={guardar} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold btn-accent flex items-center gap-2 disabled:opacity-60">
              <Icon icon={saving ? 'svg-spinners:180-ring' : 'solar:diskette-bold'} width={16} />
              {saving ? 'Guardando…' : 'Guardar formato'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
