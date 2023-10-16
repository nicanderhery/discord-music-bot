import { NicaMusic } from '../../interfaces/nica-discord';
import { logger } from '../../utils/logger';

export const ready = (Nica: NicaMusic): void => {
  try {
    if (!Nica.user) {
      return;
    }
    logger.log(`Logged to the client ${Nica.user.username}!`);
    logger.log(
      `Ready on ${Nica.guilds.cache.size} servers for a total of ${Nica.users.cache.size} users`,
    );
  } catch (error) {
    logger.error(error, 'Error from function: ready');
  }
};
