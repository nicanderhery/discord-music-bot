import { NicaMusic } from '../interfaces/nica-discord';
import { logger } from '../utils/logger';
import { ready } from './client-events/ready';
import { interactionCreate } from './interaction-events/interaction-create';
import { registerPlayerEvents } from './player-events/register-player-events';

export const handleEvents = (Nica: NicaMusic): void => {
    try {
        Nica.on('ready', () => ready(Nica));
        Nica.on(
            'interactionCreate',
            async (interaction) => await interactionCreate(Nica, interaction),
        );
        registerPlayerEvents(Nica, Nica.player);

        logger.log('Registered events');
    } catch (error) {
        logger.error(error, 'Error from function: handleEvents');
    }
};
