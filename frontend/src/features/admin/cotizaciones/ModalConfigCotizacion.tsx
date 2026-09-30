import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import useEmpresasStore from '@/zustand/empresas';
import { useAuthStore } from '@/zustand/auth';
import useAlertStore from '@/zustand/alert';
import ComprobantePrintPage from '@/pages/admin/facturacion/comprobanteImprimir';
import {
  COTIZ_ELEMENTOS,
  CotizConfig,
  elemCfg,
  OVERRIDE_POR_FORMATO,
  sizeOverride,
  ticketPx,
  type FormatoImpresionKey,
} from './cotizFormatoElementos';
import { FORMATOS_IMPRESION_INFO, PREVIEW_DIMS, type FormatoImpresion } from '@/utils/formatoImpresion';

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

  /**
   * Formato que se está configurando. A4 es el tamaño GENERAL; en A5 y Ticket los
   * «+/−» crean un tamaño PROPIO para ese formato, desvinculado del general, y el
   * candado lo vuelve a enlazar.
   *
   * Hacía falta porque el ticket se imprime con fuente térmica a 16px de base:
   * subir un título pensando en A4 lo dejaba ilegible en el ticket, y no había
   * forma de arreglarlo sin estropear el A4.
   */
  const [previewFmt, setPreviewFmt] = useState<FormatoImpresion>('A4');

  const setVisible = (key: string, visible: boolean) =>
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], visible } }));
  const setSize = (key: string, size: number) =>
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], size } }));

  const setSizePropio = (key: string, formato: FormatoImpresionKey, size: number) => {
    const ov = OVERRIDE_POR_FORMATO[formato];
    if (!ov) return setSize(key, size);
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], [ov]: { size } } }));
  };

  /** Vuelve a enlazar el elemento al tamaño general en ese formato. */
  const quitarSizePropio = (key: string, formato: FormatoImpresionKey) => {
    const ov = OVERRIDE_POR_FORMATO[formato];
    if (!ov) return;
    setConfig((prev) => {
      const { [ov]: _fuera, ...resto } = (prev[key] || {}) as any;
      return { ...prev, [key]: resto };
    });
  };
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
            {/* Qué formato se está ajustando. A4 es el general; A5 y Ticket pueden
                llevar tamaños propios por elemento. */}
            <div className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Formato</p>
              <div className="grid grid-cols-3 gap-2">
                {FORMATOS_IMPRESION_INFO.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setPreviewFmt(f.value)}
                    className={`rounded-xl border px-2 py-2 text-left transition ${
                      previewFmt === f.value
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                        : 'border-gray-200 dark:border-slate-700 hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Icon icon={f.icon} width={15} className={previewFmt === f.value ? 'text-[var(--accent)]' : 'text-gray-400'} />
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{f.label}</span>
                    </span>
                    <span className="block text-[10px] text-gray-400">{f.sub}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                {previewFmt === 'A4'
                  ? 'A4 fija el tamaño general; A5 y Ticket lo siguen salvo que los desvincules.'
                  : `Los ajustes que hagas aquí valen solo para ${previewFmt}. El icono ámbar lo devuelve al tamaño general.`}
              </p>
            </div>

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
                        {(() => {
                          const fmt = previewFmt as FormatoImpresionKey;
                          const esOverride = fmt === 'A5' || fmt === 'TICKET';
                          const propio = esOverride ? sizeOverride(config, el.key, fmt) : undefined;
                          // En el ticket se enseña el px REAL del térmico, no el de A4.
                          const mostrado = fmt === 'TICKET' && !el.unit ? ticketPx(config, el.key) : (propio ?? cur.size);
                          // Los límites del elemento están en px de A4: en ticket se escalan.
                          const factor = fmt === 'TICKET' && !el.unit ? (el.ticketBase ?? 16) / (el.defaultSize || 12) : 1;
                          const lim = { min: Math.round(el.min * factor), max: Math.round(el.max * factor) };
                          const aplicar = (v: number) =>
                            esOverride
                              ? setSizePropio(el.key, fmt, Math.min(lim.max, Math.max(lim.min, v)))
                              : setSize(el.key, Math.min(el.max, Math.max(el.min, v)));
                          return (
                            <div className="flex items-center gap-1 shrink-0">
                              {esOverride && propio !== undefined && (
                                <button
                                  onClick={() => quitarSizePropio(el.key, fmt)}
                                  title={`Volver a seguir el tamaño general (A4)`}
                                  className="w-6 h-6 rounded-md bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 flex items-center justify-center"
                                >
                                  <Icon icon="solar:link-broken-bold" width={13} />
                                </button>
                              )}
                              <button onClick={() => aplicar(mostrado - 1)} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-600"><Icon icon="solar:minus-square-bold" width={14} /></button>
                              <span
                                className={`w-11 text-center text-xs font-mono ${propio !== undefined ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-gray-600 dark:text-gray-300'}`}
                                title={propio !== undefined ? `Tamaño propio de ${fmt}` : 'Sigue al tamaño general'}
                              >
                                {mostrado}{el.unit || 'px'}
                              </span>
                              <button onClick={() => aplicar(mostrado + 1)} className="w-6 h-6 rounded-md bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-600"><Icon icon="solar:add-square-bold" width={14} /></button>
                            </div>
                          );
                        })()}
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
                  { key: 'gracias', label: 'Mensaje de agradecimiento', ph: 'Vacío = mensaje por defecto' },
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
            <div
              style={{
                width: PREVIEW_DIMS[previewFmt].width,
                transform: `scale(${PREVIEW_DIMS[previewFmt].scale})`,
                transformOrigin: 'top center',
              }}
            >
              <div className="bg-white shadow-xl">
                <ComprobantePrintPage
                  company={previewCompany}
                  formValues={SAMPLE_INVOICE}
                  size={previewFmt}
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
