/**
 * Shalom solo acepta DNI para el destinatario de una guía.
 *
 * Su propia API lo dice: `params/dni must NOT have more than 8 characters`.
 * Y es coherente con el negocio — el destinatario es la PERSONA que retira el
 * paquete en la agencia y se identifica con su DNI en el mostrador, no la
 * empresa que compró.
 *
 * El caso importa en Kaiser más que en falconext-mype: aquí casi toda venta es
 * factura a empresa, así que el documento del cliente es un RUC de 11 dígitos.
 * Antes se mandaba igual y Shalom devolvía un error de validación que no decía
 * qué hacer; ahora se corta antes con una instrucción concreta.
 */

/** Misma regla que aplica `shalom.service` al resolver el destinatario. */
const esDni = (v?: string | null) => /^\d{8}$/.test(String(v ?? '').trim());

const resolverDni = (
  dtoDni?: string,
  dniDespacho?: string,
  docCliente?: string,
) => {
  const doc = String(docCliente ?? '').trim();
  return (
    [dtoDni, dniDespacho, esDni(doc) ? doc : ''].find(
      (v) => String(v ?? '').trim().length > 0,
    ) ?? ''
  );
};

describe('destinatario de la guía Shalom · solo DNI', () => {
  it('acepta un DNI de 8 dígitos', () => {
    expect(esDni('47065472')).toBe(true);
  });

  it('rechaza un RUC de 11 dígitos', () => {
    expect(esDni('20600998877')).toBe(false);
  });

  it('rechaza documentos con letras o con espacios de más', () => {
    expect(esDni('4706547A')).toBe(false);
    expect(esDni('470654721')).toBe(false);
    expect(esDni('')).toBe(false);
    expect(esDni(null)).toBe(false);
  });

  it('un DNI con espacios alrededor sigue valiendo', () => {
    expect(esDni('  47065472  ')).toBe(true);
  });

  it('cuando el cliente es EMPRESA no se hereda su RUC', () => {
    // Factura a empresa sin DNI de destinatario: no hay a quién mandar, y eso
    // tiene que verse ANTES de llamar a Shalom.
    expect(resolverDni(undefined, undefined, '20600998877')).toBe('');
  });

  it('cuando el cliente es PERSONA sí se hereda su DNI', () => {
    expect(resolverDni(undefined, undefined, '47065472')).toBe('47065472');
  });

  it('el DNI del despacho manda sobre el documento del cliente', () => {
    // El caso normal en Kaiser: se factura a la empresa y recoge una persona.
    expect(resolverDni(undefined, '10203040', '20600998877')).toBe('10203040');
  });

  it('lo que se pasa al generar la guía manda sobre todo lo demás', () => {
    expect(resolverDni('11223344', '10203040', '47065472')).toBe('11223344');
  });
});
