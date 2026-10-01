/**
 * Rótulo compacto para etiqueta adhesiva de 80×50 mm (impresora etiquetera).
 * Mismos datos que el rótulo de ticket, pero con alto fijo y tipografía en mm
 * para que quepa siempre en una etiqueta: referencia + courier + orden arriba,
 * destinatario grande, DNI/celular, y destino (agencia) grande.
 */
export interface RotuloEtiquetaDatos {
    referencia?: string;
    courier?: string;
    nroOrden?: string | null;
    claveEnvio?: string | null;
    nombreDestinatario?: string;
    dniDestinatario?: string;
    celular?: string;
    ubicacion?: string;
    agenciaNombre?: string;
    direccion?: string;
}

export default function RotuloEtiqueta({ d, saltoDePagina }: { d: RotuloEtiquetaDatos; saltoDePagina?: boolean }) {
    const cabecera = [d.referencia, d.courier, d.nroOrden ? `Orden ${d.nroOrden}` : ''].filter(Boolean).join(' · ');
    const nombre = d.nombreDestinatario || '-';
    // Nombres largos (apellidos compuestos) bajan un punto para caber en 2 líneas.
    const nombreFont = nombre.length > 26 ? '4.4mm' : '5.4mm';
    const identidad = [d.dniDestinatario ? `DNI ${d.dniDestinatario}` : '', d.celular ? `CEL ${d.celular}` : '', d.claveEnvio ? `CLAVE ${d.claveEnvio}` : ''].filter(Boolean).join(' · ') || 'DNI -';
    return (
        <div
            data-testid="rotulo-etiqueta"
            style={{
                width: '80mm',
                height: '50mm',
                padding: '2.5mm 3mm',
                boxSizing: 'border-box',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: "'Inter', Arial, sans-serif",
                color: '#000',
                lineHeight: 1.15,
                pageBreakAfter: saltoDePagina ? 'always' : 'auto',
            }}
        >
            {cabecera && (
                <div style={{ fontSize: '2.9mm', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cabecera}</div>
            )}
            <div style={{ fontSize: '2.4mm', color: '#666', marginTop: '1mm', letterSpacing: '0.2mm' }}>DESTINATARIO</div>
            <div style={{ fontSize: nombreFont, fontWeight: 800, overflow: 'hidden', maxHeight: '12.6mm' }}>{nombre}</div>
            <div style={{ fontSize: '3.4mm', marginTop: '0.5mm' }}>{identidad}</div>
            <div style={{ fontSize: '2.4mm', color: '#666', marginTop: '1.6mm', letterSpacing: '0.2mm' }}>DESTINO</div>
            <div style={{ fontSize: '5mm', fontWeight: 800, overflow: 'hidden', maxHeight: '11.8mm' }}>{d.agenciaNombre || d.direccion || '-'}</div>
            {d.ubicacion && (
                <div style={{ fontSize: '3.2mm', color: '#222', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.ubicacion}</div>
            )}
            {d.agenciaNombre && d.direccion && (
                <div style={{ fontSize: '2.6mm', color: '#555', overflow: 'hidden', maxHeight: '6.4mm', lineHeight: 1.2 }}>{d.direccion}</div>
            )}
        </div>
    );
}
