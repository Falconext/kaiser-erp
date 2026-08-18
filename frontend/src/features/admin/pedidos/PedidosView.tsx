import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { get, post } from "@/utils/fetch";
import apiClient from "@/utils/apiClient";
import useAlertStore from "@/zustand/alert";
import { useAuthStore } from "@/zustand/auth";
import DataTable from "@/components/Datatable";
import Modal from "@/components/Modal";
import ModalConfirm from "@/components/ModalConfirm";
import Select from "@/components/Select";

/**
 * Nota de Pedido — flujo comercial de Kaiser (acta POSIGESA, marzo 2026).
 * Consulta de pedidos por estado con las acciones del ciclo:
 * PENDIENTE → AUTORIZADO → ENTREGADO → FACTURADO, o ANULADO (revierte stock).
 *
 * Usa los componentes compartidos del ERP (DataTable, Modal, Select) y la misma
 * estructura de tarjeta que Cotizaciones/Facturación para mantener consistencia.
 */

const ACCENT = 'var(--accent, #7551FF)';

type Estado = "PENDIENTE" | "AUTORIZADO" | "ANULADO" | "ENTREGADO" | "FACTURADO";

interface Autorizador { id: number; nombre: string; telefono?: string | null; email?: string | null }
interface DireccionCliente { id: number; alias?: string; direccion: string; distrito?: string }

interface Pedido {
  id: number;
  serie: string;
  correlativo: number;
  tipoDoc: string;
  fechaEmision: string;
  mtoImpVenta: number | string;
  estadoPedido: Estado | null;
  autorizadoPor?: { id: number; nombre: string } | null;
  cliente?: { id?: number; nombre?: string; nroDoc?: string } | null;
}

const ESTADOS: { key: string; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "PENDIENTE", label: "Pendientes" },
  { key: "AUTORIZADO", label: "Autorizados" },
  { key: "ENTREGADO", label: "Entregados" },
  { key: "FACTURADO", label: "Facturados" },
  { key: "ANULADO", label: "Anulados" },
];

// Colores del resumen y del chip de estado (mismo lenguaje visual que los badges del DataTable).
const ESTADO_STYLE: Record<Estado, { chip: string; label: string; dot: string }> = {
  PENDIENTE:  { chip: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300", label: "Pendiente",  dot: "bg-amber-500" },
  AUTORIZADO: { chip: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300",     label: "Autorizado", dot: "bg-blue-500" },
  ENTREGADO:  { chip: "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300", label: "Entregado", dot: "bg-indigo-500" },
  FACTURADO:  { chip: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300", label: "Facturado", dot: "bg-emerald-500" },
  ANULADO:    { chip: "bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-300",      label: "Anulado",    dot: "bg-rose-500" },
};

const ACCIONES: Record<Estado, { key: string; label: string; icon: string; danger?: boolean }[]> = {
  PENDIENTE:  [
    { key: "autorizar", label: "Autorizar", icon: "solar:check-circle-bold-duotone" },
    { key: "anular", label: "Anular", icon: "solar:close-circle-bold-duotone", danger: true },
  ],
  AUTORIZADO: [
    { key: "entregar", label: "Entregar", icon: "solar:box-bold-duotone" },
    { key: "facturar", label: "Facturar", icon: "solar:bill-list-bold-duotone" },
    { key: "anular", label: "Anular", icon: "solar:close-circle-bold-duotone", danger: true },
  ],
  ENTREGADO:  [
    { key: "facturar", label: "Facturar", icon: "solar:bill-list-bold-duotone" },
    { key: "anular", label: "Anular", icon: "solar:close-circle-bold-duotone", danger: true },
  ],
  FACTURADO:  [],
  ANULADO:    [],
};

const money = (v: number | string) =>
  `S/ ${Number(v || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PedidosView() {
  const { alert } = useAlertStore();
  const sedeActiva = useAuthStore((s) => s.sedeActiva);
  const rol = useAuthStore((s) => s.auth?.rol);
  // Solo gerencia (ADMIN_EMPRESA/ADMIN_SISTEMA) autoriza/entrega/factura/anula.
  // El resto (ventas, etc.) solo ve y puede "Enviar correo" al autorizador.
  const esGerencia = rol === "ADMIN_EMPRESA" || rol === "ADMIN_SISTEMA";

  const [estado, setEstado] = useState("TODOS");
  const [search, setSearch] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [autorizadores, setAutorizadores] = useState<Autorizador[]>([]);
  const [autorizarPara, setAutorizarPara] = useState<Pedido | null>(null);
  const [autorizadorSel, setAutorizadorSel] = useState<number | "">("");
  const [confirmar, setConfirmar] = useState<{ pedido: Pedido; accion: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // Modal "Enviar correo" al autorizador
  const [correoPara, setCorreoPara] = useState<Pedido | null>(null);
  const [correoForm, setCorreoForm] = useState<{ destinatario: string; nroOperacion: string; banco: string; direccionEntrega: string; clienteDireccionId: number | ""; nota: string }>({ destinatario: "", nroOperacion: "", banco: "", direccionEntrega: "", clienteDireccionId: "", nota: "" });
  const [dirsCliente, setDirsCliente] = useState<DireccionCliente[]>([]);
  const [voucher, setVoucher] = useState<File | null>(null);

  const sedeId = sedeActiva?.id;

  const fetchPedidos = useCallback(async () => {
    if (!sedeId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tipoComprobante: "COTIZACION", estadoPedido: estado, sedeId: String(sedeId), page: "1", limit: "100",
      });
      if (search) params.set("search", search);
      const resp = await get<{ comprobantes: Pedido[]; total: number }>(`comprobante/listar?${params}`);
      setPedidos(resp?.data?.comprobantes ?? []);
      setTotal(resp?.data?.total ?? 0);
    } catch {
      alert("No se pudieron cargar los pedidos", "error");
    } finally {
      setLoading(false);
    }
  }, [sedeId, estado, search, alert]);

  const fetchCounts = useCallback(async () => {
    if (!sedeId) return;
    const results: Record<string, number> = {};
    await Promise.all(
      ESTADOS.map(async (e) => {
        const params = new URLSearchParams({
          tipoComprobante: "COTIZACION", estadoPedido: e.key, sedeId: String(sedeId), page: "1", limit: "1",
        });
        try { const r = await get<{ total: number }>(`comprobante/listar?${params}`); results[e.key] = r?.data?.total ?? 0; }
        catch { results[e.key] = 0; }
      })
    );
    setCounts(results);
  }, [sedeId]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);
  useEffect(() => { fetchCounts(); }, [fetchCounts, pedidos.length]);
  useEffect(() => {
    get<Autorizador[]>("flujo-comercial/autorizadores").then((r) => setAutorizadores(r?.data ?? [])).catch(() => {});
  }, []);

  const ejecutarAccion = async (pedido: Pedido, accion: string, autorizadoPorId?: number) => {
    setBusy(true);
    try {
      const body = accion === "autorizar" ? { autorizadoPorId } : {};
      const resp = await post(`flujo-comercial/pedidos/${pedido.id}/${accion}`, body);
      if (resp?.code === 1 || (resp as any)?.data) {
        alert(
          accion === "anular" ? "Pedido anulado y stock revertido"
          : accion === "autorizar" ? "Pedido autorizado"
          : accion === "entregar" ? "Pedido marcado como entregado" : "Pedido facturado",
          "success"
        );
        setAutorizarPara(null); setAutorizadorSel(""); setConfirmar(null);
        await fetchPedidos();
      } else {
        alert((resp as any)?.message || "No se pudo completar la acción", "error");
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || "No se pudo completar la acción", "error");
    } finally { setBusy(false); }
  };

  const onAccion = (pedido: Pedido, accion: string) => {
    // Autorizar tiene su propio modal (elegir "Autorizado por").
    if (accion === "autorizar") { setAutorizarPara(pedido); setAutorizadorSel(autorizadores[0]?.id ?? ""); return; }
    // El resto (entregar / facturar / anular) pide confirmación antes de ejecutar.
    setConfirmar({ pedido, accion });
  };

  // Abrir modal "Enviar correo": precarga destinatario y las direcciones del cliente
  // (dirección base "como cliente" + sus sedes registradas, sin duplicar).
  const abrirEnviarCorreo = async (pedido: Pedido) => {
    const primerEmail = autorizadores.find((a) => a.email)?.email || "";
    setCorreoForm({ destinatario: primerEmail, nroOperacion: "", banco: "", direccionEntrega: "", clienteDireccionId: "", nota: "" });
    setDirsCliente([]);
    setVoucher(null);
    setCorreoPara(pedido);
    const cid = (pedido.cliente as any)?.id;
    if (!cid) return;
    try {
      // Cliente (para su dirección base) + sedes registradas.
      const [cliRes, dirRes] = await Promise.all([
        get<any>(`clientes/${cid}`),
        get<DireccionCliente[]>(`clientes/${cid}/direcciones`),
      ]);
      const cliente = (cliRes?.data as any) || {};
      const sedes = (dirRes?.data as any[]) ?? [];
      const opciones: DireccionCliente[] = [];
      // 1) Dirección base del cliente (id 0 = "principal / como cliente").
      if (cliente.direccion?.trim()) {
        opciones.push({ id: 0, alias: "Dirección del cliente", direccion: cliente.direccion, distrito: cliente.distrito });
      }
      // 2) Sedes, evitando repetir la que sea idéntica a la base.
      for (const s of sedes) {
        if (opciones.some((o) => o.direccion.trim().toUpperCase() === String(s.direccion).trim().toUpperCase())) continue;
        opciones.push(s);
      }
      setDirsCliente(opciones);
      // Preseleccionar: sede principal, o la dirección base.
      const inicial = sedes.find((d: any) => d.esPrincipal) || opciones[0];
      if (inicial) setCorreoForm((f) => ({ ...f, clienteDireccionId: inicial.id, direccionEntrega: inicial.direccion }));
    } catch { /* sin direcciones */ }
  };

  const enviarCorreo = async () => {
    if (!correoPara) return;
    if (!correoForm.destinatario.trim()) { alert("Indica el correo del autorizador", "error"); return; }
    setBusy(true);
    try {
      // multipart: campos + voucher (imagen/PDF del pago).
      const fd = new FormData();
      fd.append("destinatarios", correoForm.destinatario.trim());
      fd.append("nroOperacion", correoForm.nroOperacion || "");
      fd.append("banco", correoForm.banco || "");
      fd.append("direccionEntrega", correoForm.direccionEntrega || "");
      if (correoForm.clienteDireccionId !== "" && Number(correoForm.clienteDireccionId) > 0) {
        fd.append("clienteDireccionId", String(correoForm.clienteDireccionId));
      }
      fd.append("nota", correoForm.nota || "");
      if (voucher) fd.append("comprobantePago", voucher);
      const resp: any = await apiClient.post(`flujo-comercial/pedidos/${correoPara.id}/enviar-correo`, fd);
      const d = resp?.data;
      if (d?.code === 1 || d?.data) {
        alert("Pedido enviado al autorizador por correo", "success");
        setCorreoPara(null);
        await fetchPedidos();
      } else {
        alert(d?.message || "No se pudo enviar el correo", "error");
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || "No se pudo enviar el correo", "error");
    } finally { setBusy(false); }
  };

  // Textos del modal de confirmación según la acción.
  const CONFIRM_META: Record<string, { title: string; info: string; confirmText: string; color: string }> = {
    entregar: { title: "Marcar como entregado", info: "El pedido pasará a ENTREGADO. Confirma que la mercadería salió del almacén con su guía de remisión.", confirmText: "Marcar entregado", color: "primary" },
    facturar: { title: "Facturar pedido", info: "El pedido pasará a FACTURADO. Esta acción cierra el ciclo comercial del pedido.", confirmText: "Facturar", color: "primary" },
    anular:   { title: "Anular pedido", info: "El pedido pasará a ANULADO y se revertirá el stock reservado. Esta acción no se puede deshacer.", confirmText: "Sí, anular", color: "danger" },
  };
  const cMeta = confirmar ? CONFIRM_META[confirmar.accion] : null;

  // Filas de la tabla (DataTable compartido): estado y acciones como JSX.
  const bodyData = pedidos.map((p) => {
    const st = ESTADO_STYLE[(p.estadoPedido || "PENDIENTE") as Estado];
    const estadoActual = (p.estadoPedido || "PENDIENTE") as Estado;
    // Ventas no ve las acciones de estado; solo gerencia.
    const acciones = esGerencia ? (ACCIONES[estadoActual] || []) : [];
    // "Enviar correo" disponible mientras el pedido esté vivo (no facturado/anulado).
    const puedeEnviarCorreo = estadoActual !== "FACTURADO" && estadoActual !== "ANULADO";
    const sinAcciones = acciones.length === 0 && !puedeEnviarCorreo;
    return {
      id: p.id,
      numero: `${p.serie}-${p.correlativo}`,
      cliente: p.cliente?.nombre || "—",
      fecha: new Date(p.fechaEmision).toLocaleDateString("es-PE"),
      importe: money(p.mtoImpVenta),
      estadoUI: (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${st.chip}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
        </span>
      ),
      autorizado: p.autorizadoPor?.nombre || <span className="text-slate-300 dark:text-slate-600">—</span>,
      acciones: sinAcciones
        ? <span className="text-slate-300 dark:text-slate-600 text-[12px]">—</span>
        : (
          <div className="flex items-center justify-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {puedeEnviarCorreo && (
              <button
                type="button"
                disabled={busy}
                onClick={() => abrirEnviarCorreo(p)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition disabled:opacity-50 border bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
              >
                <Icon icon="solar:letter-bold-duotone" width={15} /> Enviar correo
              </button>
            )}
            {acciones.map((a) => (
              <button
                key={a.key}
                type="button"
                disabled={busy}
                onClick={() => onAccion(p, a.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold transition disabled:opacity-50 border
                  ${a.danger
                    ? "bg-rose-50 text-rose-500 hover:bg-rose-100 border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-900/40"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900/40"}`}
              >
                <Icon icon={a.icon} width={15} />{a.label}
              </button>
            ))}
          </div>
        ),
    };
  });

  return (
    <div className="p-4 sm:p-6">
      {/* Encabezado de página */}
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
          <Icon icon="solar:clipboard-list-bold-duotone" style={{ color: ACCENT }} width={24} />
          Nota de Pedido
        </h1>
        <p className="text-sm text-slate-500 dark:text-gray-400 mt-0.5">
          Flujo comercial: autoriza, entrega, factura o anula los pedidos de venta.
        </p>
      </div>

      {/* Resumen por estado */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        {ESTADOS.filter((e) => e.key !== "TODOS").map((e) => {
          const st = ESTADO_STYLE[e.key as Estado];
          const active = estado === e.key;
          return (
            <button
              key={e.key}
              onClick={() => setEstado(e.key)}
              className={`text-left rounded-2xl border p-3.5 transition bg-white dark:bg-slate-800 ${active ? "border-transparent ring-2" : "border-slate-100 dark:border-slate-700 hover:border-slate-200"}`}
              style={active ? { boxShadow: `0 0 0 2px ${ACCENT}` } : undefined}
            >
              <div className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${st.chip}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
              </div>
              <div className="text-2xl font-extrabold text-slate-800 dark:text-white mt-1.5 tabular-nums">{counts[e.key] ?? "—"}</div>
            </button>
          );
        })}
      </div>

      {/* Tarjeta principal */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-[0_2px_20px_rgba(15,23,42,0.05)] dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
        {/* Filtros */}
        <div className="border-b border-slate-100 dark:border-slate-700 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="shrink-0 pr-1 text-base font-extrabold text-slate-800 dark:text-white">Pedidos</h3>
            <div className="relative min-w-[200px] flex-1 sm:max-w-md">
              <Icon icon="solar:magnifer-linear" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente o N°"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-[var(--accent)] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
          </div>
          {/* Tabs por estado */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {ESTADOS.map((e) => {
              const active = estado === e.key;
              return (
                <button
                  key={e.key}
                  onClick={() => setEstado(e.key)}
                  className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold transition ${active ? "text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-slate-600"}`}
                  style={active ? { background: ACCENT } : undefined}
                >
                  {e.label}
                  {e.key !== "TODOS" && counts[e.key] != null ? <span className="ml-1.5 opacity-70">{counts[e.key]}</span> : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tabla */}
        <div className="p-4">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando…</div>
          ) : bodyData.length > 0 ? (
            <div className="overflow-x-auto">
              <DataTable
                bodyData={bodyData as any}
                headerColumns={[
                  { key: "numero", label: "N°" },
                  { key: "cliente", label: "Cliente" },
                  { key: "fecha", label: "Fecha" },
                  { key: "importe", label: "Total" },
                  { key: "estadoUI", label: "Estado" },
                  { key: "autorizado", label: "Autorizado por" },
                  { key: "acciones", label: "Acciones" },
                ] as any}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-slate-400">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-full mb-3">
                <Icon icon="solar:inbox-linear" width={34} />
              </div>
              No hay pedidos en este estado
            </div>
          )}
          <div className="mt-3 text-[12px] text-slate-400">Mostrando {pedidos.length} de {total} pedidos</div>
        </div>
      </div>

      {/* Modal: Autorizar */}
      <Modal
        isOpenModal={!!autorizarPara}
        closeModal={() => !busy && setAutorizarPara(null)}
        title={autorizarPara ? `Autorizar pedido ${autorizarPara.serie}-${autorizarPara.correlativo}` : ""}
        width="440px"
        height="auto"
        icon="solar:check-circle-bold-duotone"
      >
        <div className="p-5">
          <p className="text-[13px] text-slate-500 dark:text-gray-400 mb-4">
            Selecciona quién autoriza. Confirma que el cliente abonó o emitió su orden de compra.
          </p>
          <label className="block text-[12px] font-semibold text-slate-600 dark:text-gray-300 mb-1.5">Autorizado por</label>
          <Select
            name="autorizador"
            label=""
            withLabel={false}
            value={autorizadores.find((a) => a.id === autorizadorSel)?.nombre ?? ""}
            options={autorizadores.map((a) => ({ id: a.id, value: a.nombre }))}
            onChange={(id: any) => setAutorizadorSel(id === "" ? "" : Number(id))}
            error=""
          />
          <div className="flex justify-end gap-2 mt-5">
            <button
              disabled={busy}
              onClick={() => setAutorizarPara(null)}
              className="px-3.5 py-2 rounded-xl text-[13px] font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              disabled={busy || !autorizadorSel}
              onClick={() => autorizarPara && ejecutarAccion(autorizarPara, "autorizar", Number(autorizadorSel))}
              className="px-4 py-2 rounded-xl text-[13px] font-bold text-white disabled:opacity-50"
              style={{ background: ACCENT }}
            >
              {busy ? "Autorizando…" : "Autorizar"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación para entregar / facturar / anular */}
      <ModalConfirm
        isOpenModal={!!confirmar}
        setIsOpenModal={(v) => { if (!v) setConfirmar(null); }}
        title={cMeta?.title ?? ""}
        information={
          cMeta && confirmar
            ? `${cMeta.info}\n\nPedido ${confirmar.pedido.serie}-${confirmar.pedido.correlativo} · ${confirmar.pedido.cliente?.nombre ?? ""}`
            : ""
        }
        confirmText={cMeta?.confirmText ?? "Confirmar"}
        confirmColor={cMeta?.color ?? "danger"}
        confirmLoading={busy}
        confirmSubmit={() => {
          if (confirmar) ejecutarAccion(confirmar.pedido, confirmar.accion);
        }}
      />

      {/* Modal: Enviar correo al autorizador (ventas adjunta pago + entrega) */}
      <Modal
        isOpenModal={!!correoPara}
        closeModal={() => !busy && setCorreoPara(null)}
        title={correoPara ? `Enviar pedido ${correoPara.serie}-${correoPara.correlativo} al autorizador` : ""}
        width="460px"
        height="auto"
        icon="solar:letter-bold-duotone"
      >
        <div className="p-5 space-y-3.5">
          <p className="text-[13px] text-slate-500 dark:text-gray-400">
            Se enviará un correo al encargado de autorizar con el comprobante adjunto y los datos del pago.
          </p>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 dark:text-gray-300 mb-1">Correo del autorizador</label>
            {autorizadores.some((a) => a.email) ? (
              <Select
                name="destinatario"
                label=""
                withLabel={false}
                value={correoForm.destinatario}
                options={autorizadores.filter((a) => a.email).map((a) => ({ id: a.email as any, value: `${a.nombre} — ${a.email}` }))}
                onChange={(id: any) => setCorreoForm((f) => ({ ...f, destinatario: String(id) }))}
                error=""
              />
            ) : (
              <input
                value={correoForm.destinatario}
                onChange={(e) => setCorreoForm((f) => ({ ...f, destinatario: e.target.value }))}
                placeholder="correo@kaisercorp.com.pe"
                className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-[14px] outline-none focus:border-[var(--accent)]"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 dark:text-gray-300 mb-1">N° operación banco</label>
              <input value={correoForm.nroOperacion} onChange={(e) => setCorreoForm((f) => ({ ...f, nroOperacion: e.target.value }))} placeholder="Ej. 00123456" className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-[14px] outline-none focus:border-[var(--accent)]" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-600 dark:text-gray-300 mb-1">Banco</label>
              <input value={correoForm.banco} onChange={(e) => setCorreoForm((f) => ({ ...f, banco: e.target.value }))} placeholder="Ej. BCP" className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-[14px] outline-none focus:border-[var(--accent)]" />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 dark:text-gray-300 mb-1">Dirección de entrega</label>
            {dirsCliente.length > 0 ? (
              <>
                <Select
                  name="clienteDireccionId"
                  label=""
                  withLabel={false}
                  value={dirsCliente.find((d) => d.id === correoForm.clienteDireccionId)?.direccion || (correoForm.clienteDireccionId === -1 ? "Otra dirección…" : "")}
                  options={[
                    ...dirsCliente.map((d) => ({ id: d.id, value: `${d.alias ? d.alias + ' — ' : ''}${d.direccion}` })),
                    { id: -1, value: "Otra dirección…" },
                  ]}
                  onChange={(id: any) => {
                    if (Number(id) === -1) { setCorreoForm((f) => ({ ...f, clienteDireccionId: -1, direccionEntrega: "" })); return; }
                    const d = dirsCliente.find((x) => String(x.id) === String(id));
                    setCorreoForm((f) => ({ ...f, clienteDireccionId: Number(id), direccionEntrega: d?.direccion || f.direccionEntrega }));
                  }}
                  error=""
                />
                {/* Campo manual solo si eligió "Otra dirección" */}
                {correoForm.clienteDireccionId === -1 && (
                  <input
                    value={correoForm.direccionEntrega}
                    onChange={(e) => setCorreoForm((f) => ({ ...f, direccionEntrega: e.target.value }))}
                    placeholder="Escribe la dirección de entrega"
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-[14px] outline-none focus:border-[var(--accent)]"
                  />
                )}
              </>
            ) : (
              <>
                <input
                  value={correoForm.direccionEntrega}
                  onChange={(e) => setCorreoForm((f) => ({ ...f, direccionEntrega: e.target.value }))}
                  placeholder="Dirección de entrega"
                  className="h-10 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-[14px] outline-none focus:border-[var(--accent)]"
                />
                <p className="text-[11px] text-slate-400 mt-1">El cliente no tiene direcciones registradas; escríbela manualmente.</p>
              </>
            )}
          </div>

          {/* Comprobante de pago (voucher) */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-600 dark:text-gray-300 mb-1">Comprobante de pago</label>
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2.5 hover:border-[var(--accent)] transition">
              <Icon icon="solar:upload-square-bold-duotone" width={20} className="text-[var(--accent)]" />
              <span className="text-[13px] text-slate-600 dark:text-gray-300 truncate">
                {voucher ? voucher.name : "Adjuntar voucher (imagen o PDF)"}
              </span>
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setVoucher(e.target.files?.[0] || null)} />
            </label>
            {voucher && (
              <button type="button" onClick={() => setVoucher(null)} className="mt-1 text-[11px] text-rose-500 hover:text-rose-600">Quitar archivo</button>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-600 dark:text-gray-300 mb-1">Nota (opcional)</label>
            <textarea rows={2} value={correoForm.nota} onChange={(e) => setCorreoForm((f) => ({ ...f, nota: e.target.value }))} placeholder="Comentario para el autorizador…" className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[14px] outline-none focus:border-[var(--accent)] resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button disabled={busy} onClick={() => setCorreoPara(null)} className="px-3.5 py-2 rounded-xl text-[13px] font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700">Cancelar</button>
            <button disabled={busy} onClick={enviarCorreo} className="px-4 py-2 rounded-xl text-[13px] font-bold text-white disabled:opacity-50" style={{ background: ACCENT }}>
              {busy ? "Enviando…" : "Enviar correo"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
