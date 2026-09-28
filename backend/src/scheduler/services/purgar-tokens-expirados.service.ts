import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Borra los refresh tokens que ya caducaron.
 *
 * Por qué hacía falta: un refresh token se borra cuando se usa (al rotar) o al
 * cerrar sesión, pero nadie limpiaba los que simplemente caducan sin usarse —y
 * eso es lo normal: el usuario cierra el navegador y no vuelve a esa sesión. La
 * tabla crecía una fila por login, para siempre. En la base de la demo había 527
 * filas, 98 de ellas caducadas desde hacía más de un mes.
 *
 * Funcionalmente eran inofensivas (`refresh()` comprueba `expiresAt` y rechaza la
 * caducada), pero es una tabla de credenciales que nunca se poda: crece sin
 * límite y agranda lo que se llevaría alguien que accediera a la base.
 */
@Injectable()
export class PurgarTokensExpiradosService {
  private readonly logger = new Logger(PurgarTokensExpiradosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** De madrugada, que es cuando nadie está trabajando. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgar(): Promise<number> {
    try {
      const { count } = await this.prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (count > 0) {
        this.logger.log(`Refresh tokens caducados eliminados: ${count}`);
      }
      return count;
    } catch (error) {
      // Es limpieza: si falla, se reintenta mañana y no rompe nada.
      this.logger.error(`No se pudieron purgar los tokens caducados: ${error}`);
      return 0;
    }
  }
}
