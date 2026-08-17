// Genera un acta de inspección vehicular imprimible (A4) y abre el diálogo de
// impresión del navegador — desde ahí el usuario puede imprimir o "Guardar como PDF"
// para que el cliente la firme. Sigue el patrón de impresión del proyecto
// (ventana nueva + window.print()), en documento autocontenido con estilos inline.

export interface ActaPrintChecklistItem {
    categoria: string;
    item: string;
    estado: string;
    nota?: string | null;
}

export interface ActaPrintData {
    tipo: 'INGRESO' | 'RETIRO';
    km?: number | null;
    nivelCombustible?: string | null;
    observaciones?: string | null;
    checklist?: ActaPrintChecklistItem[];
    fecha?: string; // ISO; por defecto la fecha/hora actual
    usuarioNombre?: string | null;
    vehiculo: {
        placa: string;
        marca?: string | null;
        modelo?: string | null;
        color?: string | null;
        anio?: number | null;
        cliente?: { nombre?: string | null; nroDoc?: string | null; telefono?: string | null } | null;
    };
    empresa?: {
        razonSocial?: string | null;
        nombreComercial?: string | null;
        ruc?: string | null;
        direccion?: string | null;
    } | null;
}

const esc = (v: unknown): string =>
    String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const fmtFecha = (iso?: string): string => {
    const d = iso ? new Date(iso) : new Date();
    return new Intl.DateTimeFormat('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(d);
};

export function buildActaHtml(data: ActaPrintData): string {
    const { vehiculo, empresa } = data;
    const tipoLabel = data.tipo === 'INGRESO' ? 'INGRESO' : 'RETIRO';
    const empresaNombre = empresa?.nombreComercial || empresa?.razonSocial || 'Empresa';
    const cliente = vehiculo.cliente;

    const novedades = (data.checklist ?? []).filter((c) => c.item && c.estado);
    const filasNovedades = novedades.length
        ? novedades
              .map(
                  (c, i) => `
        <tr>
          <td class="c">${i + 1}</td>
          <td>${esc(c.categoria)}</td>
          <td>${esc(c.item)}</td>
          <td>${esc(c.estado)}</td>
          <td>${esc(c.nota || '')}</td>
        </tr>`,
              )
              .join('')
        : `<tr><td colspan="5" class="empty">Sin novedades — el vehículo se ${data.tipo === 'INGRESO' ? 'recibe' : 'entrega'} en condiciones normales.</td></tr>`;

    const dato = (label: string, value: string) =>
        `<div class="dato"><span class="k">${esc(label)}</span><span class="v">${esc(value || '—')}</span></div>`;

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Acta de inspección ${esc(vehiculo.placa)} — ${tipoLabel}</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, Helvetica, sans-serif; color: #111827; font-size: 12px; line-height: 1.45; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm 14mm; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 10px; }
  .brand { max-width: 60%; }
  .brand .name { font-size: 16px; font-weight: 800; letter-spacing: .2px; }
  .brand .meta { color: #4b5563; font-size: 11px; margin-top: 2px; }
  .title { text-align: right; }
  .title h1 { font-size: 15px; font-weight: 800; margin: 0; text-transform: uppercase; }
  .title .tipo { display: inline-block; margin-top: 4px; border: 1.5px solid #111827; border-radius: 4px; padding: 2px 10px; font-weight: 700; font-size: 12px; letter-spacing: 1px; }
  .title .fecha { color: #4b5563; font-size: 11px; margin-top: 4px; }
  h2 { font-size: 11px; text-transform: uppercase; letter-spacing: .6px; color: #6b7280; margin: 16px 0 6px; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 14px; }
  .grid.g3 { grid-template-columns: repeat(3, 1fr); }
  .grid.g2 { grid-template-columns: repeat(2, 1fr); }
  .dato { display: flex; flex-direction: column; }
  .dato .k { font-size: 9.5px; text-transform: uppercase; letter-spacing: .4px; color: #6b7280; }
  .dato .v { font-size: 12.5px; font-weight: 600; }
  .placa { font-family: 'Courier New', monospace; font-weight: 700; letter-spacing: 3px; font-size: 18px; border: 1.5px solid #111827; border-radius: 5px; padding: 2px 10px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { border: 1px solid #d1d5db; padding: 5px 7px; text-align: left; vertical-align: top; font-size: 11px; }
  th { background: #f3f4f6; text-transform: uppercase; font-size: 9.5px; letter-spacing: .4px; color: #374151; }
  td.c { text-align: center; width: 26px; color: #6b7280; }
  td.empty { text-align: center; color: #6b7280; font-style: italic; }
  .obs { border: 1px solid #d1d5db; border-radius: 5px; padding: 8px 10px; min-height: 42px; margin-top: 4px; white-space: pre-wrap; }
  .decl { margin-top: 14px; font-size: 10.5px; color: #4b5563; line-height: 1.5; }
  .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 46px; }
  .firma { text-align: center; }
  .firma .linea { border-top: 1px solid #111827; margin: 0 8px 6px; padding-top: 6px; }
  .firma .rol { font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
  .firma .sub { color: #6b7280; font-size: 10px; margin-top: 2px; }
  .pie { margin-top: 22px; text-align: center; color: #9ca3af; font-size: 9.5px; border-top: 1px solid #e5e7eb; padding-top: 6px; }
  @media print {
    @page { size: A4; margin: 0; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { margin: 0; }
  }
</style>
</head>
<body>
  <div class="page">
    <div class="top">
      <div class="brand">
        <div class="name">${esc(empresaNombre)}</div>
        <div class="meta">${empresa?.ruc ? 'RUC: ' + esc(empresa.ruc) : ''}${empresa?.ruc && empresa?.direccion ? ' · ' : ''}${esc(empresa?.direccion || '')}</div>
      </div>
      <div class="title">
        <h1>Acta de inspección vehicular</h1>
        <div class="tipo">${tipoLabel}</div>
        <div class="fecha">Fecha: ${esc(fmtFecha(data.fecha))}</div>
      </div>
    </div>

    <h2>Datos del vehículo</h2>
    <div class="grid">
      <div class="dato"><span class="k">Placa</span><span class="placa">${esc(vehiculo.placa)}</span></div>
      ${dato('Marca', vehiculo.marca || '')}
      ${dato('Modelo', vehiculo.modelo || '')}
      ${dato('Color', vehiculo.color || '')}
      ${dato('Año', vehiculo.anio ? String(vehiculo.anio) : '')}
      ${dato('Kilometraje', data.km != null ? `${data.km.toLocaleString('es-PE')} km` : '')}
      ${dato('Combustible', data.nivelCombustible || '')}
      ${dato('Responsable', data.usuarioNombre || '')}
    </div>

    <h2>Propietario</h2>
    <div class="grid g3">
      ${dato('Nombre / Razón social', cliente?.nombre || '')}
      ${dato('Documento', cliente?.nroDoc || '')}
      ${dato('Teléfono', cliente?.telefono || '')}
    </div>

    <h2>Novedades detectadas (${novedades.length})</h2>
    <table>
      <thead>
        <tr><th>#</th><th>Categoría</th><th>Ítem</th><th>Estado</th><th>Nota</th></tr>
      </thead>
      <tbody>${filasNovedades}</tbody>
    </table>

    <h2>Observaciones</h2>
    <div class="obs">${esc(data.observaciones || '')}</div>

    <p class="decl">
      El cliente declara haber verificado el estado del vehículo descrito en la presente acta al momento de su
      ${data.tipo === 'INGRESO' ? 'ingreso' : 'retiro'}, manifestando su conformidad con lo registrado. Los ítems no
      listados como novedad se consideran en condiciones normales de conservación y funcionamiento.
    </p>

    <div class="firmas">
      <div class="firma">
        <div class="linea"></div>
        <div class="rol">Firma del cliente</div>
        <div class="sub">${esc(cliente?.nombre || '')}${cliente?.nroDoc ? ' · ' + esc(cliente.nroDoc) : ''}</div>
      </div>
      <div class="firma">
        <div class="linea"></div>
        <div class="rol">Firma del responsable</div>
        <div class="sub">${esc(data.usuarioNombre || empresaNombre)}</div>
      </div>
    </div>

    <div class="pie">Documento generado el ${esc(fmtFecha())} · ${esc(empresaNombre)}</div>
  </div>
</body>
</html>`;
}

/** Abre una ventana nueva con el acta y lanza el diálogo de impresión / guardar PDF. */
export function printActa(data: ActaPrintData): void {
    const html = buildActaHtml(data);
    const win = window.open('', '_blank', 'width=900,height=1000');
    if (!win) return; // pop-up bloqueado
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    // Imprime una sola vez, ya sea al cargar o por el fallback (documento ya cargado).
    let printed = false;
    const doPrint = () => {
        if (printed) return;
        printed = true;
        try { win.print(); } catch { /* noop */ }
    };
    win.onload = doPrint;
    setTimeout(doPrint, 500);
}
