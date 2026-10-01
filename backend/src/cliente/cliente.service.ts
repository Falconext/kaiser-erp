import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PersonaType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as XLSX from 'xlsx';

@Injectable()
export class ClienteService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly tipoDocCodigo: Record<string, string> = {
    DNI: '1',
    RUC: '6',
    CE: '4',
    PASAPORTE: '7',
    OTRO: '0',
  };

  private readonly tipoDocDescripcion: Record<string, string> = {
    DNI: 'DNI',
    RUC: 'RUC',
    CE: 'CARNET DE EXTRANJERÍA',
    PASAPORTE: 'PASAPORTE',
    OTRO: 'OTROS',
  };

  private normalizarNumeroDocumento(tipoDoc: string, nroDoc: string) {
    const raw = String(nroDoc || '')
      .trim()
      .toUpperCase();
    if (tipoDoc === 'DNI' || tipoDoc === 'RUC') return raw.replace(/\D/g, '');
    if (tipoDoc === 'CE' || tipoDoc === 'PASAPORTE') {
      return raw
        .replace(/^(NRO\.?|NO\.?|NUMERO|NÚMERO|N\.?[°º]?)\s*/i, '')
        .replace(/[^A-Z0-9]/g, '');
    }
    return raw;
  }

  private validarDocumento(tipoDoc: string, nroDoc: string) {
    if (tipoDoc === 'DNI' && nroDoc.length !== 8)
      throw new BadRequestException('El DNI debe tener 8 dígitos');
    if (tipoDoc === 'RUC' && nroDoc.length !== 11)
      throw new BadRequestException('El RUC debe tener 11 dígitos');
    if (
      (tipoDoc === 'CE' || tipoDoc === 'PASAPORTE') &&
      !/^[A-Za-z0-9]{6,12}$/.test(nroDoc)
    )
      throw new BadRequestException(
        'El documento debe contener entre 6 y 12 caracteres alfanuméricos',
      );
  }

  private async obtenerTipoDocumento(tipoDoc: string) {
    const codigo = this.tipoDocCodigo[tipoDoc];
    if (!codigo) throw new BadRequestException('Tipo de documento no válido');
    const existente = await this.prisma.tipoDocumento.findFirst({
      where: { codigo },
    });
    if (existente) return existente;

    try {
      return await this.prisma.tipoDocumento.create({
        data: {
          codigo,
          descripcion: this.tipoDocDescripcion[tipoDoc] || tipoDoc,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const creadoPorOtraPeticion = await this.prisma.tipoDocumento.findFirst(
          { where: { codigo } },
        );
        if (creadoPorOtraPeticion) return creadoPorOtraPeticion;
      }
      throw error;
    }
  }

  private async asegurarTiposDocumentoBase() {
    await Promise.all(
      Object.entries(this.tipoDocCodigo).map(async ([tipoDoc, codigo]) => {
        const existente = await this.prisma.tipoDocumento.findFirst({
          where: { codigo },
        });
        if (existente) return;
        try {
          await this.prisma.tipoDocumento.create({
            data: {
              codigo,
              descripcion: this.tipoDocDescripcion[tipoDoc] || tipoDoc,
            },
          });
        } catch (error) {
          if (
            !(
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === 'P2002'
            )
          )
            throw error;
        }
      }),
    );
  }

  async seedTiposDocumentoBase() {
    await this.asegurarTiposDocumentoBase();
    return { ok: true };
  }

  async crear(data: {
    nombre: string;
    tipoDoc: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | 'OTRO';
    nroDoc: string;
    direccion?: string;
    email?: string;
    telefono?: string;
    empresaId: number;
    ubigeo: string;
    departamento: string;
    provincia: string;
    distrito: string;
    persona?: string;
    contactoNombre?: string;
    contactoEmail?: string;
    contactoTelefono?: string;
    contactoDireccion?: string;
    sector?: string;
    limiteCredito?: number;
    diasCredito?: number;
    listaPrecioId?: number;
  }) {
    const { tipoDoc } = data;
    const nroDoc = this.normalizarNumeroDocumento(tipoDoc, data.nroDoc);

    this.validarDocumento(tipoDoc, nroDoc);
    const tipoDocumento = await this.obtenerTipoDocumento(tipoDoc);

    // Cliente "sin documento" (tipo Otros con número placeholder): se permite tener
    // varios (p. ej. distintos colegios sin RUC), por eso NO se deduplica por nroDoc.
    const esSinDocumento =
      tipoDoc === 'OTRO' && (!nroDoc || /^0+$/.test(nroDoc));
    const existe = esSinDocumento
      ? null
      : await this.prisma.cliente.findFirst({
          where: { nroDoc, empresaId: data.empresaId },
        });
    const nuevaPersona = (data.persona as PersonaType) || PersonaType.CLIENTE;
    if (existe) {
      if (
        existe.persona !== nuevaPersona &&
        existe.persona !== 'CLIENTE_PROVEEDOR'
      ) {
        // Upgrading from CLIENTE to PROVEEDOR or vice-versa
        return this.prisma.cliente.update({
          where: { id: existe.id },
          data: { persona: 'CLIENTE_PROVEEDOR' },
        });
      }
      throw new BadRequestException(
        `Ya existe un ${existe.persona.toLowerCase()} con ese documento`,
      );
    }

    return this.prisma.cliente.create({
      data: {
        nombre: data.nombre,
        nroDoc,
        direccion: data.direccion,
        email: data.email,
        telefono: data.telefono,
        empresaId: data.empresaId,
        tipoDocumentoId: tipoDocumento.id,
        persona: (data.persona as PersonaType) || PersonaType.CLIENTE,
        departamento: data.departamento,
        provincia: data.provincia,
        distrito: data.distrito,
        ubigeo: data.ubigeo,
        contactoNombre: data.contactoNombre,
        contactoEmail: data.contactoEmail,
        contactoTelefono: data.contactoTelefono,
        contactoDireccion: data.contactoDireccion,
        sector: data.sector || null,
        limiteCredito: data.limiteCredito ?? null,
        diasCredito: data.diasCredito ?? null,
        listaPrecioId: data.listaPrecioId ?? null,
      },
    });
  }

  async listar(params: {
    empresaId: number;
    search?: string;
    page?: number;
    limit?: number;
    sort?: 'id' | 'nombre' | 'nroDoc';
    order?: 'asc' | 'desc';
    persona?: PersonaType;
  }) {
    const {
      empresaId,
      search,
      page = 1,
      limit = 10,
      sort = 'id',
      order = 'desc',
      persona,
    } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      empresaId,
      ...(persona ? { persona } : {}),
      ...(search
        ? {
            OR: [
              { nombre: { contains: search, mode: 'insensitive' } },
              { nroDoc: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [clientes, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          tipoDocumento: true,
          contactos: {
            where: { activo: true },
            orderBy: [{ esPrincipal: 'desc' }, { id: 'asc' }],
          },
        },
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return { clientes, total, page, limit };
  }

  async obtenerPorId(id: number, empresaId: number) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, empresaId },
      include: {
        tipoDocumento: true,
        direcciones: {
          where: { activo: true },
          orderBy: [{ esPrincipal: 'desc' }, { id: 'asc' }],
        },
        contactos: {
          where: { activo: true },
          orderBy: [{ esPrincipal: 'desc' }, { id: 'asc' }],
        },
      },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  // ─── Direcciones del cliente (sedes/sucursales) ────────────────────────────
  private async ensureClienteEmpresa(clienteId: number, empresaId: number) {
    const c = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId },
    });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    return c;
  }

  async listarDirecciones(clienteId: number, empresaId: number) {
    await this.ensureClienteEmpresa(clienteId, empresaId);
    return this.prisma.clienteDireccion.findMany({
      where: { clienteId, activo: true },
      orderBy: [{ esPrincipal: 'desc' }, { id: 'asc' }],
    });
  }

  async crearDireccion(
    clienteId: number,
    empresaId: number,
    data: {
      alias?: string;
      direccion: string;
      departamento?: string;
      provincia?: string;
      distrito?: string;
      ubigeo?: string;
      referencia?: string;
      esPrincipal?: boolean;
    },
  ) {
    await this.ensureClienteEmpresa(clienteId, empresaId);
    if (!data?.direccion?.trim())
      throw new BadRequestException('La dirección es obligatoria');
    // Si es la primera dirección, o se marca principal, ajustar el flag.
    const count = await this.prisma.clienteDireccion.count({
      where: { clienteId, activo: true },
    });
    const esPrincipal = data.esPrincipal || count === 0;
    if (esPrincipal) {
      await this.prisma.clienteDireccion.updateMany({
        where: { clienteId },
        data: { esPrincipal: false },
      });
    }
    return this.prisma.clienteDireccion.create({
      data: {
        clienteId,
        alias: data.alias?.trim() || null,
        direccion: data.direccion.trim(),
        departamento: data.departamento || null,
        provincia: data.provincia || null,
        distrito: data.distrito || null,
        ubigeo: data.ubigeo || null,
        referencia: data.referencia?.trim() || null,
        esPrincipal,
      },
    });
  }

  async actualizarDireccion(
    clienteId: number,
    direccionId: number,
    empresaId: number,
    data: {
      alias?: string;
      direccion?: string;
      departamento?: string;
      provincia?: string;
      distrito?: string;
      ubigeo?: string;
      referencia?: string;
      esPrincipal?: boolean;
    },
  ) {
    await this.ensureClienteEmpresa(clienteId, empresaId);
    const dir = await this.prisma.clienteDireccion.findFirst({
      where: { id: direccionId, clienteId },
    });
    if (!dir) throw new NotFoundException('Dirección no encontrada');
    if (data.esPrincipal) {
      await this.prisma.clienteDireccion.updateMany({
        where: { clienteId },
        data: { esPrincipal: false },
      });
    }
    return this.prisma.clienteDireccion.update({
      where: { id: direccionId },
      data: {
        ...(data.alias !== undefined
          ? { alias: data.alias?.trim() || null }
          : {}),
        ...(data.direccion !== undefined
          ? { direccion: data.direccion.trim() }
          : {}),
        ...(data.departamento !== undefined
          ? { departamento: data.departamento || null }
          : {}),
        ...(data.provincia !== undefined
          ? { provincia: data.provincia || null }
          : {}),
        ...(data.distrito !== undefined
          ? { distrito: data.distrito || null }
          : {}),
        ...(data.ubigeo !== undefined ? { ubigeo: data.ubigeo || null } : {}),
        ...(data.referencia !== undefined
          ? { referencia: data.referencia?.trim() || null }
          : {}),
        ...(data.esPrincipal !== undefined
          ? { esPrincipal: data.esPrincipal }
          : {}),
      },
    });
  }

  async eliminarDireccion(
    clienteId: number,
    direccionId: number,
    empresaId: number,
  ) {
    await this.ensureClienteEmpresa(clienteId, empresaId);
    const dir = await this.prisma.clienteDireccion.findFirst({
      where: { id: direccionId, clienteId },
    });
    if (!dir) throw new NotFoundException('Dirección no encontrada');
    await this.prisma.clienteDireccion.delete({ where: { id: direccionId } });
    // Si era la principal, promover otra.
    if (dir.esPrincipal) {
      const otra = await this.prisma.clienteDireccion.findFirst({
        where: { clienteId, activo: true },
        orderBy: { id: 'asc' },
      });
      if (otra)
        await this.prisma.clienteDireccion.update({
          where: { id: otra.id },
          data: { esPrincipal: true },
        });
    }
    return { ok: true };
  }

  /**
   * Reemplaza el set completo de direcciones de un cliente (usado por el modal:
   * guarda la lista editada de una vez). Marca una principal.
   */
  async sincronizarDirecciones(
    clienteId: number,
    empresaId: number,
    direcciones: Array<{
      id?: number;
      alias?: string;
      direccion: string;
      departamento?: string;
      provincia?: string;
      distrito?: string;
      ubigeo?: string;
      referencia?: string;
      esPrincipal?: boolean;
    }>,
  ) {
    await this.ensureClienteEmpresa(clienteId, empresaId);
    const validas = (direcciones || []).filter((d) => d?.direccion?.trim());
    // Borrar las que ya no están, upsert el resto.
    const idsQueQuedan = validas.filter((d) => d.id).map((d) => d.id as number);
    await this.prisma.clienteDireccion.deleteMany({
      where: {
        clienteId,
        id: { notIn: idsQueQuedan.length ? idsQueQuedan : [-1] },
      },
    });
    let principalAsignada = false;
    for (const [i, d] of validas.entries()) {
      const esPrincipal = d.esPrincipal
        ? !principalAsignada && (principalAsignada = true)
        : false;
      const payload = {
        alias: d.alias?.trim() || null,
        direccion: d.direccion.trim(),
        departamento: d.departamento || null,
        provincia: d.provincia || null,
        distrito: d.distrito || null,
        ubigeo: d.ubigeo || null,
        referencia: d.referencia?.trim() || null,
        esPrincipal,
      };
      if (d.id) {
        await this.prisma.clienteDireccion.update({
          where: { id: d.id },
          data: payload,
        });
      } else {
        await this.prisma.clienteDireccion.create({
          data: { clienteId, ...payload },
        });
      }
    }
    // Garantizar una principal.
    const hayPrincipal = await this.prisma.clienteDireccion.findFirst({
      where: { clienteId, esPrincipal: true },
    });
    if (!hayPrincipal) {
      const primera = await this.prisma.clienteDireccion.findFirst({
        where: { clienteId },
        orderBy: { id: 'asc' },
      });
      if (primera)
        await this.prisma.clienteDireccion.update({
          where: { id: primera.id },
          data: { esPrincipal: true },
        });
    }
    return this.listarDirecciones(clienteId, empresaId);
  }

  // ─── Contactos del cliente (comprador, jefe de planta, logística...) ──────
  private limpiarContacto(data: {
    nombre?: string;
    cargo?: string;
    telefono?: string;
    email?: string;
    area?: string;
    observacion?: string;
  }) {
    return {
      nombre: String(data.nombre || '').trim(),
      cargo: data.cargo?.trim() || null,
      telefono: data.telefono?.trim() || null,
      email: data.email?.trim() || null,
      area: data.area?.trim() || null,
      observacion: data.observacion?.trim() || null,
    };
  }

  /**
   * Copia el contacto principal (activo) a los campos legacy Cliente.contacto*
   * que siguen usando el PDF de cotización y la vista de impresión. Si el
   * cliente ya no tiene contactos activos, los campos se limpian.
   */
  private async sincronizarContactoPrincipal(clienteId: number) {
    const principal =
      (await this.prisma.clienteContacto.findFirst({
        where: { clienteId, activo: true, esPrincipal: true },
      })) ||
      (await this.prisma.clienteContacto.findFirst({
        where: { clienteId, activo: true },
        orderBy: { id: 'asc' },
      }));
    if (principal && !principal.esPrincipal) {
      await this.prisma.clienteContacto.update({
        where: { id: principal.id },
        data: { esPrincipal: true },
      });
    }
    await this.prisma.cliente.update({
      where: { id: clienteId },
      data: {
        contactoNombre: principal?.nombre ?? null,
        contactoEmail: principal?.email ?? null,
        contactoTelefono: principal?.telefono ?? null,
      },
    });
    return principal;
  }

  async listarContactos(clienteId: number, empresaId: number) {
    await this.ensureClienteEmpresa(clienteId, empresaId);
    return this.prisma.clienteContacto.findMany({
      where: { clienteId, activo: true },
      orderBy: [{ esPrincipal: 'desc' }, { id: 'asc' }],
    });
  }

  async crearContacto(
    clienteId: number,
    empresaId: number,
    data: {
      nombre: string;
      cargo?: string;
      telefono?: string;
      email?: string;
      area?: string;
      observacion?: string;
      esPrincipal?: boolean;
    },
  ) {
    await this.ensureClienteEmpresa(clienteId, empresaId);
    const limpio = this.limpiarContacto(data);
    if (!limpio.nombre)
      throw new BadRequestException('El nombre del contacto es obligatorio');
    const count = await this.prisma.clienteContacto.count({
      where: { clienteId, activo: true },
    });
    const esPrincipal = !!data.esPrincipal || count === 0;
    if (esPrincipal) {
      await this.prisma.clienteContacto.updateMany({
        where: { clienteId },
        data: { esPrincipal: false },
      });
    }
    const creado = await this.prisma.clienteContacto.create({
      data: { clienteId, ...limpio, esPrincipal },
    });
    if (esPrincipal) await this.sincronizarContactoPrincipal(clienteId);
    return creado;
  }

  async actualizarContacto(
    clienteId: number,
    contactoId: number,
    empresaId: number,
    data: {
      nombre?: string;
      cargo?: string;
      telefono?: string;
      email?: string;
      area?: string;
      observacion?: string;
      esPrincipal?: boolean;
      activo?: boolean;
    },
  ) {
    await this.ensureClienteEmpresa(clienteId, empresaId);
    const contacto = await this.prisma.clienteContacto.findFirst({
      where: { id: contactoId, clienteId },
    });
    if (!contacto) throw new NotFoundException('Contacto no encontrado');
    if (data.nombre !== undefined && !String(data.nombre).trim()) {
      throw new BadRequestException('El nombre del contacto es obligatorio');
    }
    if (data.esPrincipal) {
      await this.prisma.clienteContacto.updateMany({
        where: { clienteId },
        data: { esPrincipal: false },
      });
    }
    const actualizado = await this.prisma.clienteContacto.update({
      where: { id: contactoId },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre.trim() } : {}),
        ...(data.cargo !== undefined
          ? { cargo: data.cargo?.trim() || null }
          : {}),
        ...(data.telefono !== undefined
          ? { telefono: data.telefono?.trim() || null }
          : {}),
        ...(data.email !== undefined
          ? { email: data.email?.trim() || null }
          : {}),
        ...(data.area !== undefined ? { area: data.area?.trim() || null } : {}),
        ...(data.observacion !== undefined
          ? { observacion: data.observacion?.trim() || null }
          : {}),
        ...(data.esPrincipal !== undefined
          ? { esPrincipal: data.esPrincipal }
          : {}),
        ...(data.activo !== undefined ? { activo: data.activo } : {}),
      },
    });
    // Si tocó al principal (o lo marcó/desmarcó), reflejarlo en Cliente.contacto*.
    if (
      actualizado.esPrincipal ||
      contacto.esPrincipal ||
      data.activo === false
    ) {
      await this.sincronizarContactoPrincipal(clienteId);
    }
    return actualizado;
  }

  /** Baja lógica (activo=false). Si era el principal, promueve otro y sincroniza. */
  async eliminarContacto(
    clienteId: number,
    contactoId: number,
    empresaId: number,
  ) {
    await this.ensureClienteEmpresa(clienteId, empresaId);
    const contacto = await this.prisma.clienteContacto.findFirst({
      where: { id: contactoId, clienteId },
    });
    if (!contacto) throw new NotFoundException('Contacto no encontrado');
    await this.prisma.clienteContacto.update({
      where: { id: contactoId },
      data: { activo: false, esPrincipal: false },
    });
    if (contacto.esPrincipal)
      await this.sincronizarContactoPrincipal(clienteId);
    return { ok: true };
  }

  /**
   * Reemplaza el set completo de contactos de un cliente (usado por el modal).
   * Los que ya no vienen se dan de baja (activo=false); el resto se upsertea.
   * Garantiza un principal y lo sincroniza a Cliente.contacto*.
   */
  async sincronizarContactos(
    clienteId: number,
    empresaId: number,
    contactos: Array<{
      id?: number;
      nombre: string;
      cargo?: string;
      telefono?: string;
      email?: string;
      area?: string;
      observacion?: string;
      esPrincipal?: boolean;
    }>,
  ) {
    await this.ensureClienteEmpresa(clienteId, empresaId);
    const validos = (contactos || []).filter((c) =>
      String(c?.nombre || '').trim(),
    );
    const idsQueQuedan = validos.filter((c) => c.id).map((c) => c.id as number);
    await this.prisma.clienteContacto.updateMany({
      where: {
        clienteId,
        activo: true,
        id: { notIn: idsQueQuedan.length ? idsQueQuedan : [-1] },
      },
      data: { activo: false, esPrincipal: false },
    });
    let principalAsignado = false;
    for (const c of validos) {
      const esPrincipal = c.esPrincipal
        ? !principalAsignado && (principalAsignado = true)
        : false;
      const payload = { ...this.limpiarContacto(c), esPrincipal, activo: true };
      if (c.id) {
        const existe = await this.prisma.clienteContacto.findFirst({
          where: { id: c.id, clienteId },
        });
        if (existe) {
          await this.prisma.clienteContacto.update({
            where: { id: c.id },
            data: payload,
          });
          continue;
        }
      }
      await this.prisma.clienteContacto.create({
        data: { clienteId, ...payload },
      });
    }
    await this.sincronizarContactoPrincipal(clienteId);
    return this.listarContactos(clienteId, empresaId);
  }

  async actualizar(data: {
    id: number;
    empresaId: number;
    nombre?: string;
    direccion?: string;
    email?: string;
    telefono?: string;
    ubigeo?: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    persona?: string;
    tipoDoc?: 'DNI' | 'RUC' | 'CE' | 'PASAPORTE' | 'OTRO';
    nroDoc?: string;
    contactoNombre?: string;
    contactoEmail?: string;
    contactoTelefono?: string;
    contactoDireccion?: string;
    sector?: string;
    limiteCredito?: number;
    diasCredito?: number;
    listaPrecioId?: number;
  }) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: data.id, empresaId: data.empresaId },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    const nroDoc =
      data.tipoDoc && data.nroDoc
        ? this.normalizarNumeroDocumento(data.tipoDoc, data.nroDoc)
        : data.nroDoc;
    const tipoDocumento = data.tipoDoc
      ? await this.obtenerTipoDocumento(data.tipoDoc)
      : null;
    if (data.tipoDoc && nroDoc) this.validarDocumento(data.tipoDoc, nroDoc);
    if (nroDoc && nroDoc !== cliente.nroDoc) {
      const existe = await this.prisma.cliente.findFirst({
        where: { empresaId: data.empresaId, nroDoc, NOT: { id: data.id } },
      });
      if (existe)
        throw new BadRequestException(
          `Ya existe un ${existe.persona.toLowerCase()} con ese documento`,
        );
    }

    return this.prisma.cliente.update({
      where: { id: data.id },
      data: {
        nombre: data.nombre,
        nroDoc,
        tipoDocumentoId: tipoDocumento?.id,
        direccion: data.direccion,
        email: data.email,
        telefono: data.telefono,
        ubigeo: data.ubigeo,
        departamento: data.departamento,
        provincia: data.provincia,
        distrito: data.distrito,
        persona: data.persona as PersonaType,
        contactoNombre: data.contactoNombre,
        contactoEmail: data.contactoEmail,
        contactoTelefono: data.contactoTelefono,
        contactoDireccion: data.contactoDireccion,
        ...(data.sector !== undefined ? { sector: data.sector || null } : {}),
        ...(data.limiteCredito !== undefined
          ? { limiteCredito: data.limiteCredito }
          : {}),
        ...(data.diasCredito !== undefined
          ? { diasCredito: data.diasCredito }
          : {}),
        ...(data.listaPrecioId !== undefined
          ? { listaPrecioId: data.listaPrecioId || null }
          : {}),
      },
    });
  }

  async cambiarEstado(
    id: number,
    empresaId: number,
    estado: 'ACTIVO' | 'INACTIVO',
  ) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, empresaId },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return this.prisma.cliente.update({ where: { id }, data: { estado } });
  }

  // Eliminación con candado: solo permite borrar si el cliente/proveedor no tiene
  // historial asociado (compras, comprobantes, detalles o vehículos). En caso
  // contrario se conserva y se sugiere desactivar, para no romper la trazabilidad.
  async eliminar(id: number, empresaId: number) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, empresaId },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    const [compras, comprobantes, detalles, vehiculos] = await Promise.all([
      this.prisma.compra.count({ where: { proveedorId: id } }),
      this.prisma.comprobante.count({ where: { clienteId: id } }),
      this.prisma.detalleComprobante.count({ where: { pacienteId: id } }),
      this.prisma.vehiculo.count({ where: { clienteId: id } }),
    ]);

    const motivos: string[] = [];
    if (compras > 0) motivos.push(`${compras} compra(s)`);
    if (comprobantes > 0) motivos.push(`${comprobantes} comprobante(s)`);
    if (vehiculos > 0) motivos.push(`${vehiculos} vehículo(s)`);
    if (detalles > 0) motivos.push('documentos asociados');

    if (motivos.length) {
      throw new ConflictException(
        `No se puede eliminar: tiene ${motivos.join(', ')}. Usa "Desactivar" para conservar el historial.`,
      );
    }

    await this.prisma.cliente.delete({ where: { id } });
    return { id };
  }

  async consultarDocumento(numero: string, tipo: string) {
    const cleanTipo = String(tipo || '').toUpperCase();
    if (cleanTipo !== 'DNI' && cleanTipo !== 'RUC') {
      throw new BadRequestException(
        'La consulta automática solo está disponible para DNI y RUC',
      );
    }
    const cleanNumero = this.normalizarNumeroDocumento(cleanTipo, numero);
    if (cleanTipo === 'DNI' && cleanNumero.length !== 8)
      throw new BadRequestException('El DNI debe tener 8 dígitos');
    if (cleanTipo === 'RUC' && cleanNumero.length !== 11)
      throw new BadRequestException('El RUC debe tener 11 dígitos');

    const url =
      cleanTipo === 'DNI'
        ? 'https://apiperu.dev/api/dni'
        : 'https://apiperu.dev/api/ruc';
    const body =
      cleanTipo === 'DNI' ? { dni: cleanNumero } : { ruc: cleanNumero };
    const token = process.env.RENIEC_TOKEN;

    try {
      const response = await axios.post(url, body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data?.data;
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new BadRequestException(
          error.response?.data?.message ||
            error.message ||
            'Error al consultar la API externa',
        );
      }
      throw error;
    }
  }

  async exportar(empresaId: number, search?: string): Promise<Buffer> {
    const where: any = {
      empresaId,
      estado: { in: ['ACTIVO', 'INACTIVO'] },
      OR: search
        ? [
            { nombre: { contains: search, mode: 'insensitive' } },
            { nroDoc: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const clientes = await this.prisma.cliente.findMany({
      where,
      orderBy: { id: 'desc' },
    });

    const datosExcel = clientes.map((c) => ({
      'NOMBRE O RAZON SOCIAL': c.nombre,
      'NUM. DOC': c.nroDoc,
      DIRECCION: c.direccion || '',
      CORREO: c.email || '',
      PERSONA: c.persona?.toString().replace('_', '-') || 'CLIENTE',
      CELULAR: c.telefono || '',
      SECTOR: c.sector || '',
      DEPARTAMENTO: c.departamento || '',
      PROVINCIA: c.provincia || '',
      DISTRITO: c.distrito || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');
    // Ajuste de anchos de columna aproximados
    (worksheet as any)['!cols'] = [
      { wch: 40 }, // NOMBRE O RAZON SOCIAL
      { wch: 15 }, // NUM. DOC
      { wch: 35 }, // DIRECCION
      { wch: 28 }, // CORREO
      { wch: 18 }, // PERSONA
      { wch: 15 }, // CELULAR
      { wch: 18 }, // SECTOR
      { wch: 16 }, // DEPARTAMENTO
      { wch: 16 }, // PROVINCIA
      { wch: 16 }, // DISTRITO
    ];

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    return buffer;
  }

  async cargaMasiva(fileBuffer: Buffer, empresaId: number) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: null });
    if (rows.length === 0)
      throw new BadRequestException('El archivo Excel está vacío');

    const resultados: { cliente?: any; error?: string }[] = [];

    const normalizarPersona = (valor: any): string => {
      const v = (valor || '').toString().trim().toUpperCase();
      if (v === 'CLIENTE') return 'CLIENTE';
      if (v === 'PROVEEDOR') return 'PROVEEDOR';
      if (v === 'CLIENTE-PROVEEDOR' || v === 'CLIENTE_PROVEEDOR')
        return 'CLIENTE_PROVEEDOR';
      return 'CLIENTE';
    };

    const SECTORES = [
      'AGROEXPORTACION',
      'AVICOLA',
      'PECUARIO',
      'MINERIA',
      'CONSTRUCCION',
      'INDUSTRIA',
      'COMERCIO',
      'OTRO',
    ];
    const normalizarSector = (valor: any): string | undefined => {
      const v = (valor || '')
        .toString()
        .trim()
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (!v) return undefined;
      if (SECTORES.includes(v)) return v;
      if (v.startsWith('AGRO')) return 'AGROEXPORTACION';
      if (v.startsWith('AVI')) return 'AVICOLA';
      if (v.startsWith('PECU') || v.startsWith('GANAD')) return 'PECUARIO';
      if (v.startsWith('MIN')) return 'MINERIA';
      if (v.startsWith('CONSTR')) return 'CONSTRUCCION';
      if (v.startsWith('INDUS')) return 'INDUSTRIA';
      if (v.startsWith('COMER')) return 'COMERCIO';
      return 'OTRO';
    };

    for (const [index, row] of rows.entries()) {
      try {
        const nombre =
          row['NOMBRE O RAZON SOCIAL'] ||
          row['Nombre o Razon social'] ||
          row['NOMBRE'] ||
          row['Nombre'] ||
          null;
        const nroDoc =
          row['NUM. DOC'] ||
          row['Num. doc'] ||
          row['Documento'] ||
          row['NroDoc'] ||
          row['nroDoc'] ||
          null;
        const direccion =
          row['DIRECCION'] || row['Direccion'] || row['direccion'] || '';
        const email = row['CORREO'] || row['Correo'] || row['correo'] || '';
        const persona = normalizarPersona(
          row['PERSONA'] || row['Persona'] || row['persona'],
        );
        const telefono =
          row['CELULAR'] || row['Celular'] || row['celular'] || '';
        const sector = normalizarSector(
          row['SECTOR'] || row['Sector'] || row['sector'],
        );

        if (!nombre)
          throw new BadRequestException(
            `Nombre/Razón social no proporcionado en la fila ${index + 1}`,
          );
        if (!nroDoc)
          throw new BadRequestException(
            `Número de documento no proporcionado en la fila ${index + 1}`,
          );

        const docStr = nroDoc.toString();
        const tipoDoc: 'DNI' | 'RUC' =
          docStr.length === 8
            ? 'DNI'
            : docStr.length === 11
              ? 'RUC'
              : (() => {
                  throw new BadRequestException(
                    `Número de documento inválido en la fila ${index + 1}`,
                  );
                })();

        const cliente = await this.crear({
          nombre: nombre.toString(),
          tipoDoc,
          nroDoc: docStr,
          direccion: direccion?.toString() || undefined,
          email: email?.toString() || undefined,
          telefono: telefono?.toString() || undefined,
          empresaId,
          ubigeo: '',
          departamento: '',
          provincia: '',
          distrito: '',
          persona,
          sector,
        });
        resultados.push({ cliente });
      } catch (e: any) {
        resultados.push({ error: e?.message || 'Error desconocido' });
      }
    }

    return {
      total: rows.length,
      exitosos: resultados.filter((r) => r.cliente).length,
      fallidos: resultados.filter((r) => r.error).length,
      detalles: resultados,
    };
  }
}
