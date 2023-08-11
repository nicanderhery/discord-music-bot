import dotenv from 'dotenv';
import { NicaMusic } from '../interfaces/nica-discord';
import { logger } from '../utils/logger';

dotenv.config();

/**
 * Validates the environment variables. But it does not check whether the token is valid.
 * @param Nica The NicaMusic instance.
 * @throws Error if the environment variables are not set correctly.
 */
export const validateEnv = (Nica: NicaMusic): void => {
    // Environment variables checking
    if (
        !process.env.DISCORD_TOKEN ||
        !process.env.DISCORD_BOT_ID ||
        !process.env.GENIUS_ACCESS_TOKEN ||
        !process.env.SERVER_ADDRESS
    ) {
        throw new Error('Environment variables are not set correctly. Exiting...');
    }

    // Set environment variables
    Nica.baseUrl = process.env.SERVER_ADDRESS;
    Nica.configs = {
        token: process.env.DISCORD_TOKEN,
        botId: process.env.DISCORD_BOT_ID,
        message: process.env.DISCORD_MESSAGE ?? 'commands',
        guild: process.env.DISCORD_GUILD,
        geniusAccessToken: process.env.GENIUS_ACCESS_TOKEN,
    };

    logger.log('Environment variables validated');
};
