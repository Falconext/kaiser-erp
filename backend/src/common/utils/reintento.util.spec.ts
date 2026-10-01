import { reintentarSiChocaNumeracion } from './reintento.util';

const p2002 = () => Object.assign(new Error('unique'), { code: 'P2002' });

describe('reintentarSiChocaNumeracion', () => {
  it('devuelve el resultado si no hay choque', async () => {
    await expect(reintentarSiChocaNumeracion(async () => 'ok')).resolves.toBe(
      'ok',
    );
  });

  it('reintenta mientras choque y acaba pasando', async () => {
    let intentos = 0;
    const r = await reintentarSiChocaNumeracion(async () => {
      intentos++;
      if (intentos < 3) throw p2002();
      return intentos;
    });
    expect(r).toBe(3);
  });

  it('no reintenta un error que no sea de índice único', async () => {
    let intentos = 0;
    await expect(
      reintentarSiChocaNumeracion(async () => {
        intentos++;
        throw Object.assign(new Error('otra cosa'), { code: 'P2025' });
      }),
    ).rejects.toThrow('otra cosa');
    expect(intentos).toBe(1);
  });

  it('acaba propagando el P2002 si nunca deja de chocar', async () => {
    let intentos = 0;
    await expect(
      reintentarSiChocaNumeracion(async () => {
        intentos++;
        throw p2002();
      }, 3),
    ).rejects.toMatchObject({ code: 'P2002' });
    expect(intentos).toBe(3);
  });

  it('espera entre intentos, para no quedarse en lockstep', async () => {
    const t0 = Date.now();
    let intentos = 0;
    await reintentarSiChocaNumeracion(async () => {
      intentos++;
      if (intentos < 3) throw p2002();
      return 'ok';
    });
    expect(Date.now() - t0).toBeGreaterThanOrEqual(10);
  });
});
