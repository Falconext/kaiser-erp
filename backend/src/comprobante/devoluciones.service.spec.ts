import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DevolucionesService } from './devoluciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { KardexService } from '../kardex/kardex.service';

/**
 * Lo que estos tests protegen:
 *
 *  · Al confirmar una devolución, al stock vuelve solo lo aprovechable. Si se
 *    contara lo dañado, el inventario diría que hay mercadería vendible que no
 *    lo es.
 *  · No se puede confirmar dos veces. Antes el stock volvía automáticamente al
 *    emitir la nota de crédito; ahora vuelve al confirmar, así que una doble
 *    confirmación duplicaría el inventario.
 *  · Las cantidades se validan contra lo que dice la nota.
 */
describe('DevolucionesService', () => {
  let service: DevolucionesService;
  let registrarMovimiento: jest.Mock;

  const devolucionPendiente = {
    id: 1,
    empresaId: 1,
    sedeId: 1,
    comprobanteId: 50,
    estado: 'PENDIENTE',
    comprobante: { serie: 'FC01', correlativo: 7 },
    detalles: [
      { id: 10, productoId: 100, descripcion: 'MALLA RASCHEL 80%', cantidadEsperada: 12 },
    ],
  };

  const prismaMock: any = {
    devolucionMercaderia: {
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 1, estado: 'CONFIRMADA' }),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    detalleDevolucionMercaderia: { update: jest.fn().mockResolvedValue({}) },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    registrarMovimiento = jest.fn().mockResolvedValue({});
    const modulo: TestingModule = await Test.createTestingModule({
      providers: [
        DevolucionesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: KardexService, useValue: { registrarMovimiento } },
      ],
    }).compile();
    service = modulo.get(DevolucionesService);
    prismaMock.devolucionMercaderia.findFirst.mockResolvedValue({ ...devolucionPendiente });
  });

  describe('confirmar', () => {
    it('al stock solo vuelve lo que llegó en buen estado', async () => {
      await service.confirmar(1, 1, 9, {
        lineas: [{ detalleId: 10, cantidadRecibida: 12, cantidadDanada: 5 }],
      });

      expect(registrarMovimiento).toHaveBeenCalledTimes(1);
      const mov = registrarMovimiento.mock.calls[0][0];
      expect(mov.cantidad).toBe(7); // 12 recibidas − 5 dañadas
      expect(mov.tipoMovimiento).toBe('INGRESO');
      expect(mov.concepto).toContain('5 dañada(s) no reingresada(s)');
    });

    it('si todo llegó dañado no toca el kardex', async () => {
      await service.confirmar(1, 1, 9, {
        lineas: [{ detalleId: 10, cantidadRecibida: 4, cantidadDanada: 4 }],
      });
      expect(registrarMovimiento).not.toHaveBeenCalled();
    });

    it('rechaza recibir más de lo que dice la nota de crédito', async () => {
      await expect(
        service.confirmar(1, 1, 9, { lineas: [{ detalleId: 10, cantidadRecibida: 20 }] }),
      ).rejects.toThrow(BadRequestException);
      expect(registrarMovimiento).not.toHaveBeenCalled();
    });

    it('rechaza más dañado que recibido', async () => {
      await expect(
        service.confirmar(1, 1, 9, {
          lineas: [{ detalleId: 10, cantidadRecibida: 3, cantidadDanada: 8 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza una línea que no es de esta devolución', async () => {
      await expect(
        service.confirmar(1, 1, 9, { lineas: [{ detalleId: 999, cantidadRecibida: 1 }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('no se puede confirmar dos veces — duplicaría el stock', async () => {
      prismaMock.devolucionMercaderia.findFirst.mockResolvedValue({
        ...devolucionPendiente, estado: 'CONFIRMADA',
      });
      await expect(
        service.confirmar(1, 1, 9, { lineas: [{ detalleId: 10, cantidadRecibida: 1 }] }),
      ).rejects.toThrow(BadRequestException);
      expect(registrarMovimiento).not.toHaveBeenCalled();
    });

    it('valida las cantidades antes de mover nada', async () => {
      // La segunda línea es inválida: no debe haberse movido la primera.
      await expect(
        service.confirmar(1, 1, 9, {
          lineas: [
            { detalleId: 10, cantidadRecibida: 5 },
            { detalleId: 10, cantidadRecibida: 99 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(registrarMovimiento).not.toHaveBeenCalled();
    });
  });

  describe('rechazar', () => {
    it('exige un motivo', async () => {
      await expect(service.rechazar(1, 1, 9, 'no')).rejects.toThrow(BadRequestException);
    });

    it('no mueve stock', async () => {
      await service.rechazar(1, 1, 9, 'El cliente nunca envió la mercadería');
      expect(registrarMovimiento).not.toHaveBeenCalled();
    });
  });

  it('404 si la devolución no existe', async () => {
    prismaMock.devolucionMercaderia.findFirst.mockResolvedValue(null);
    await expect(
      service.confirmar(1, 1, 9, { lineas: [{ detalleId: 10, cantidadRecibida: 1 }] }),
    ).rejects.toThrow(NotFoundException);
  });
});
