import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Listas de precio con nombre.
 *
 * Es el hueco 3 frente a STARSOFT: ellos asignan una lista a cada cliente y el
 * vendedor cotiza con el precio de esa lista. Aquí existía `preciosMayorista`,
 * que es OTRA cosa —tramos por cantidad ("de 50 en adelante, a 9,80") que valen
 * para cualquiera— y no se puede asignar a nadie.
 *
 * Las dos conviven y el orden al resolver un precio es:
 *
 *   1. la lista del cliente, si tiene precio para ese producto
 *   2. el ajuste porcentual de la lista, si la lista lo define y el producto no
 *      está en ella
 *   3. el precio de lista del producto
 *
 * Los tramos por cantidad siguen aplicándose donde ya se aplicaban: son un
 * descuento por volumen, no un precio de cliente, y las dos cosas se suman.
 *
 * Los precios se guardan CON IGV, igual que `Producto.precioUnitario`, para que
 * nadie tenga que recordar en qué base está cada campo.
 */
@Injectable()
export class ListasPrecioService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(empresaId: number, incluirInactivas = false) {
    const listas = await this.prisma.listaPrecio.findMany({
      where: { empresaId, ...(incluirInactivas ? {} : { activa: true }) },
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { items: true, clientes: true } },
      },
    });
    return listas.map((l) => ({
      id: l.id,
      nombre: l.nombre,
      descripcion: l.descripcion,
      ajustePorcentaje:
        l.ajustePorcentaje === null ? null : Number(l.ajustePorcentaje),
      activa: l.activa,
      productos: l._count.items,
      clientes: l._count.clientes,
    }));
  }

  async obtener(empresaId: number, id: number) {
    const lista = await this.prisma.listaPrecio.findFirst({
      where: { id, empresaId },
      include: {
        items: {
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                descripcion: true,
                unidadVenta: true,
                precioUnitario: true,
              },
            },
          },
          orderBy: { producto: { codigo: 'asc' } },
        },
        clientes: { select: { id: true, nombre: true, nroDoc: true } },
      },
    });
    if (!lista) throw new NotFoundException('La lista de precios no existe');

    return {
      id: lista.id,
      nombre: lista.nombre,
      descripcion: lista.descripcion,
      ajustePorcentaje:
        lista.ajustePorcentaje === null
          ? null
          : Number(lista.ajustePorcentaje),
      activa: lista.activa,
      clientes: lista.clientes,
      items: lista.items.map((i) => {
        const precio = Number(i.precio);
        const deLista = Number(i.producto.precioUnitario);
        return {
          id: i.id,
          productoId: i.productoId,
          codigo: i.producto.codigo,
          descripcion: i.producto.descripcion,
          unidad: i.producto.unidadVenta,
          precio,
          precioDeLista: deLista,
          // Cuánto se aparta del precio de lista, que es la pregunta real al
          // revisar una lista: "¿a este cliente cuánto le estamos bajando?".
          diferenciaPorcentaje:
            deLista > 0 ? r2(((precio - deLista) / deLista) * 100) : null,
        };
      }),
    };
  }

  async crear(
    empresaId: number,
    data: { nombre: string; descripcion?: string; ajustePorcentaje?: number },
  ) {
    const nombre = (data.nombre ?? '').trim();
    if (!nombre) throw new BadRequestException('La lista necesita un nombre');

    const ya = await this.prisma.listaPrecio.findFirst({
      where: { empresaId, nombre },
      select: { id: true },
    });
    if (ya)
      throw new BadRequestException(`Ya existe una lista llamada "${nombre}"`);

    return this.prisma.listaPrecio.create({
      data: {
        empresaId,
        nombre,
        descripcion: data.descripcion?.trim() || null,
        ajustePorcentaje: data.ajustePorcentaje ?? null,
      },
    });
  }

  async actualizar(
    empresaId: number,
    id: number,
    data: {
      nombre?: string;
      descripcion?: string;
      ajustePorcentaje?: number | null;
      activa?: boolean;
    },
  ) {
    await this.ensure(empresaId, id);
    if (data.nombre !== undefined) {
      const nombre = data.nombre.trim();
      if (!nombre) throw new BadRequestException('La lista necesita un nombre');
      const ya = await this.prisma.listaPrecio.findFirst({
        where: { empresaId, nombre, id: { not: id } },
        select: { id: true },
      });
      if (ya)
        throw new BadRequestException(`Ya existe una lista llamada "${nombre}"`);
    }
    return this.prisma.listaPrecio.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre.trim() } : {}),
        ...(data.descripcion !== undefined
          ? { descripcion: data.descripcion?.trim() || null }
          : {}),
        ...(data.ajustePorcentaje !== undefined
          ? { ajustePorcentaje: data.ajustePorcentaje }
          : {}),
        ...(data.activa !== undefined ? { activa: data.activa } : {}),
      },
    });
  }

  /**
   * Una lista con clientes asignados NO se borra: se desactiva. Borrarla dejaría
   * a esos clientes sin lista de golpe y sin rastro de qué tenían.
   */
  async eliminar(empresaId: number, id: number) {
    await this.ensure(empresaId, id);
    const clientes = await this.prisma.cliente.count({
      where: { listaPrecioId: id },
    });
    if (clientes > 0) {
      throw new BadRequestException(
        `La lista está asignada a ${clientes} cliente(s). Desactívala o cámbiales la lista antes de borrarla.`,
      );
    }
    await this.prisma.listaPrecioItem.deleteMany({ where: { listaPrecioId: id } });
    await this.prisma.listaPrecio.delete({ where: { id } });
    return { id };
  }

  /** Pone o cambia el precio de un producto en la lista. */
  async fijarPrecio(
    empresaId: number,
    id: number,
    productoId: number,
    precio: number,
  ) {
    await this.ensure(empresaId, id);
    const prod = await this.prisma.producto.findFirst({
      where: { id: productoId, empresaId },
      select: { id: true },
    });
    if (!prod) throw new NotFoundException('El producto no existe');
    if (!(precio > 0))
      throw new BadRequestException('El precio tiene que ser mayor que cero');

    return this.prisma.listaPrecioItem.upsert({
      where: { listaPrecioId_productoId: { listaPrecioId: id, productoId } },
      update: { precio },
      create: { listaPrecioId: id, productoId, precio },
    });
  }

  async quitarPrecio(empresaId: number, id: number, productoId: number) {
    await this.ensure(empresaId, id);
    await this.prisma.listaPrecioItem.deleteMany({
      where: { listaPrecioId: id, productoId },
    });
    return { productoId };
  }

  /** Asigna la lista a un cliente, o se la quita con `listaPrecioId: null`. */
  async asignarACliente(
    empresaId: number,
    clienteId: number,
    listaPrecioId: number | null,
  ) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId },
      select: { id: true },
    });
    if (!cliente) throw new NotFoundException('El cliente no existe');
    if (listaPrecioId !== null) await this.ensure(empresaId, listaPrecioId);
    return this.prisma.cliente.update({
      where: { id: clienteId },
      data: { listaPrecioId },
      select: { id: true, nombre: true, listaPrecioId: true },
    });
  }

  /**
   * El precio que le toca a un cliente por un producto, con el porqué. El
   * `motivo` existe para que la pantalla pueda decir "precio de la lista
   * Distribuidor" en vez de soltar un número sin explicación.
   */
  async precioPara(empresaId: number, clienteId: number, productoId: number) {
    const [cliente, producto] = await Promise.all([
      this.prisma.cliente.findFirst({
        where: { id: clienteId, empresaId },
        select: {
          id: true,
          listaPrecioId: true,
          listaPrecio: {
            select: { id: true, nombre: true, activa: true, ajustePorcentaje: true },
          },
        },
      }),
      this.prisma.producto.findFirst({
        where: { id: productoId, empresaId },
        select: { id: true, precioUnitario: true },
      }),
    ]);
    if (!cliente) throw new NotFoundException('El cliente no existe');
    if (!producto) throw new NotFoundException('El producto no existe');

    const deLista = Number(producto.precioUnitario);
    const lista = cliente.listaPrecio;
    if (!lista || !lista.activa) {
      return {
        precio: deLista,
        precioDeLista: deLista,
        lista: null,
        motivo: 'precio de lista del producto',
      };
    }

    const item = await this.prisma.listaPrecioItem.findUnique({
      where: {
        listaPrecioId_productoId: { listaPrecioId: lista.id, productoId },
      },
      select: { precio: true },
    });

    if (item) {
      return {
        precio: Number(item.precio),
        precioDeLista: deLista,
        lista: { id: lista.id, nombre: lista.nombre },
        motivo: `precio de la lista ${lista.nombre}`,
      };
    }

    if (lista.ajustePorcentaje !== null) {
      const aj = Number(lista.ajustePorcentaje);
      return {
        precio: r2(deLista * (1 + aj / 100)),
        precioDeLista: deLista,
        lista: { id: lista.id, nombre: lista.nombre },
        motivo: `precio de lista ${aj >= 0 ? '+' : ''}${aj}% de la lista ${lista.nombre}`,
      };
    }

    return {
      precio: deLista,
      precioDeLista: deLista,
      lista: { id: lista.id, nombre: lista.nombre },
      motivo: `la lista ${lista.nombre} no fija precio para este producto`,
    };
  }

  /**
   * Los precios de una lista para un puñado de productos, en UNA consulta. Lo usa
   * el listado de productos: resolver producto a producto serían 50 consultas por
   * página.
   *
   * Devuelve `null` si el cliente no tiene lista, para que quien llama sepa que
   * no hay nada que sustituir y no confunda "sin lista" con "lista vacía".
   */
  async preciosDeCliente(
    empresaId: number,
    clienteId: number,
    productoIds: number[],
  ): Promise<{
    lista: { id: number; nombre: string; ajustePorcentaje: number | null };
    porProducto: Map<number, number>;
  } | null> {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId },
      select: {
        listaPrecio: {
          select: { id: true, nombre: true, activa: true, ajustePorcentaje: true },
        },
      },
    });
    const lista = cliente?.listaPrecio;
    if (!lista || !lista.activa) return null;

    const items = productoIds.length
      ? await this.prisma.listaPrecioItem.findMany({
          where: { listaPrecioId: lista.id, productoId: { in: productoIds } },
          select: { productoId: true, precio: true },
        })
      : [];

    return {
      lista: {
        id: lista.id,
        nombre: lista.nombre,
        ajustePorcentaje:
          lista.ajustePorcentaje === null
            ? null
            : Number(lista.ajustePorcentaje),
      },
      porProducto: new Map(items.map((i) => [i.productoId, Number(i.precio)])),
    };
  }

  private async ensure(empresaId: number, id: number) {
    const l = await this.prisma.listaPrecio.findFirst({
      where: { id, empresaId },
      select: { id: true },
    });
    if (!l) throw new NotFoundException('La lista de precios no existe');
    return l;
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100;
