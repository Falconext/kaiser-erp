/**
 * Opciones del "Reparto propio / motorizado": mismas etiquetas que acepta la
 * plantilla de carga masiva del courier de última milla. Compartidas por el
 * modal de coordinación del POS (EnvioModal) y el de Editar despacho.
 */
export const TIPOS_VENTA_REPARTO = [
    { value: 'CONTRAENTREGA', label: 'Contraentrega', hint: 'El motorizado cobra al entregar' },
    { value: 'SOLO_ENTREGA', label: 'Solo entrega', hint: 'Ya está pagado, no cobra' },
    { value: 'CAMBIO', label: 'Cambio', hint: 'Entrega y recoge un producto' },
    { value: 'CONTRAENTREGA_CAMBIO', label: 'Contraentrega + cambio', hint: 'Cobra y recoge' },
    { value: 'RECOJO', label: 'Recojo', hint: 'Solo recoge en la dirección' },
];
export const FORMAS_PAGO_COBRO = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'YAPE', label: 'Yape' },
    { value: 'PLIN', label: 'Plin' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
    { value: 'POS', label: 'POS (tarjeta)' },
    { value: 'NO_COBRAR', label: 'No cobrar' },
];

export const cobraEnDestinoReparto = (tipoVentaReparto?: string) =>
    tipoVentaReparto === 'CONTRAENTREGA' || tipoVentaReparto === 'CONTRAENTREGA_CAMBIO';

/** "WSP 9…" (alta solo con WhatsApp) y "CLIENTES VARIOS" no son nombres para el motorizado. */
export const esNombreGenericoCliente = (nombre?: string) =>
    /^WSP\s/i.test(String(nombre || '')) || /^CLIENTES?\s+VARIOS$/i.test(String(nombre || ''));

/**
 * Distritos que coinciden con lo tecleado (máx. 12), priorizando Lima/Callao
 * porque el reparto propio es de última milla.
 */
export const filtrarDistritos = (ubigeos: any[] | undefined, query: string) => {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) return [] as any[];
    const norm = (v: string) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const lista = (ubigeos || []).filter((u: any) => norm(u.distrito).includes(norm(q)));
    const peso = (u: any) => (norm(u.departamento) === 'lima' || norm(u.departamento) === 'callao' ? 0 : 1);
    return lista.sort((a: any, b: any) => peso(a) - peso(b) || String(a.distrito).localeCompare(String(b.distrito))).slice(0, 12);
};
