import { Player } from 'discord-player';
import { ActivityType, Client } from 'discord.js';
import { IntentOptions } from './config/intent-options';
import { handleEvents } from './events/handle-events';
import { NicaMusic } from './interfaces/nica-discord';
import { validateEnv } from './modules/validate-env';
import { loadCommands } from './utils/load-commands';
import { logger } from './utils/logger';
import { registerCommands } from './utils/register-commands';

void (async () => {
  const Nica = new Client({
    intents: IntentOptions,
  }) as NicaMusic;

  // Read environment variables
  logger.log('Loading environment variables...');
  validateEnv(Nica);

  // Initialize player
  Nica.player = new Player(Nica);
  await Nica.player.extractors.loadDefault();

  // Initialize player config
  Nica.playerConfigs = {
    volume: 100,
    leaveOnEmpty: false,
    leaveOnEnd: false,
    leaveOnStop: false,
    selfDeaf: true,
    loopMessage: false,
  };

  logger.log('Loading commands...');
  const commands = await loadCommands();
  Nica.commands = commands;

  logger.log('Registering commands...');
  await registerCommands(Nica);

  logger.log('Registering events...');
  handleEvents(Nica);

  await Nica.login(Nica.configs.token);

  Nica.user?.setActivity(Nica.configs.message, {
    type: ActivityType.Listening,
  });
})();
