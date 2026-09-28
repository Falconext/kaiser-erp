import { PurgarTokensExpiradosService } from './purgar-tokens-expirados.service';

describe('PurgarTokensExpiradosService', () => {
  const deleteMany = jest.fn();
  const prisma = { refreshToken: { deleteMany } } as never;
  const servicio = new PurgarTokensExpiradosService(prisma);

  beforeEach(() => deleteMany.mockReset());

  it('borra solo los que ya caducaron', async () => {
    deleteMany.mockResolvedValue({ count: 98 });
    const antes = Date.now();
    await expect(servicio.purgar()).resolves.toBe(98);

    const [args] = deleteMany.mock.calls[0];
    const corte = args.where.expiresAt.lt as Date;
    // El filtro es "caducó antes de ahora": nunca toca uno vivo.
    expect(corte.getTime()).toBeGreaterThanOrEqual(antes);
    expect(Object.keys(args.where)).toEqual(['expiresAt']);
  });

  it('no revienta si la base falla: es limpieza, se reintenta mañana', async () => {
    deleteMany.mockRejectedValue(new Error('conexión caída'));
    await expect(servicio.purgar()).resolves.toBe(0);
  });
});
