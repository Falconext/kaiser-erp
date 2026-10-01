/**
 * La memoria de imágenes tiene que devolver TODAS las opciones, no solo la
 * aprobada.
 *
 * El fallo que motiva esto: `buscarImagenMemorizada` devolvía `{ url }` y el
 * controlador respondía `candidates: [url]`. La primera vez que buscabas la
 * imagen de un producto veías 4 o 5 opciones; a partir de la segunda, UNA —la
 * aprobada— y ya no había forma de cambiarla desde el formulario. En
 * falconext-mype está resuelto guardando las opciones junto a la aprobada
 * (`ImagenProductoAprobadaIa.candidatos`).
 *
 * Aquí se fija la forma del dato, que es lo que se rompió: el filtro de URLs
 * válidas y que un registro viejo —sin candidatos— no reviente.
 */
import { ProductoService } from './producto.service';

describe('buscarImagenMemorizada · opciones guardadas', () => {
  const build = (match: any) => {
    const prisma = {
      imagenProductoAprobadaIa: {
        findUnique: jest.fn().mockResolvedValue(match),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;
    const svc = Object.create(ProductoService.prototype) as ProductoService;
    (svc as any).prisma = prisma;
    return { svc, prisma };
  };

  it('devuelve la aprobada junto a las opciones que se vieron la primera vez', async () => {
    const { svc } = build({
      id: 1,
      imagenUrl: 'https://cdn.test/aprobada.jpg',
      candidatos: [
        'https://cdn.test/aprobada.jpg',
        'https://cdn.test/otra-1.jpg',
        'https://cdn.test/otra-2.jpg',
      ],
    });
    const r = await svc.buscarImagenMemorizada(1, 'MALLA RASCHEL 95%');
    expect(r?.url).toBe('https://cdn.test/aprobada.jpg');
    expect(r?.candidatos).toHaveLength(3);
  });

  it('un registro viejo sin candidatos no revienta: devuelve la lista vacía', async () => {
    const { svc } = build({
      id: 2,
      imagenUrl: 'https://cdn.test/sola.jpg',
      candidatos: null,
    });
    const r = await svc.buscarImagenMemorizada(1, 'ANCLAJE GALVANIZADO');
    expect(r?.url).toBe('https://cdn.test/sola.jpg');
    expect(r?.candidatos).toEqual([]);
  });

  it('descarta lo que no sea una URL http(s): el JSON no está tipado', async () => {
    const { svc } = build({
      id: 3,
      imagenUrl: 'https://cdn.test/ok.jpg',
      candidatos: [
        'https://cdn.test/ok.jpg',
        'javascript:alert(1)',
        'data:image/png;base64,AAAA',
        42,
        null,
        'http://cdn.test/tambien-ok.png',
      ],
    });
    const r = await svc.buscarImagenMemorizada(1, 'PRODUCTO');
    expect(r?.candidatos).toEqual([
      'https://cdn.test/ok.jpg',
      'http://cdn.test/tambien-ok.png',
    ]);
  });

  it('sin coincidencia en memoria devuelve null', async () => {
    const { svc } = build(null);
    const r = await svc.buscarImagenMemorizada(1, 'LO QUE SEA');
    expect(r).toBeNull();
  });
});
