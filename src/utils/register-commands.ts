import { REST } from '@discordjs/rest';
import {
    RESTPostAPIApplicationCommandsJSONBody,
    RESTPostAPIChatInputApplicationCommandsJSONBody,
    Routes,
} from 'discord-api-types/v10';

import { NicaMusic } from '../interfaces/nica-discord';

import { logger } from './logger';

/**
 * Takes commands, parses the `data` properties as needed,
 * and builds an array of all command data. Then, posts the data to the Discord endpoint
 * for registering commands.
 *
 * Will register commands globally if in a production environment, otherwise defaults to the
 * home guild only.
 * @param Nica The NicaMusic instance.
 * @returns A promise that resolves when the commands are registered.
 * @throws An error if the commands fail to register.
 */
export const registerCommands = async (Nica: NicaMusic): Promise<void> => {
    try {
        const rest = new REST({ version: '10' }).setToken(Nica.configs.token);

        const commandData: (
            | RESTPostAPIApplicationCommandsJSONBody
            | RESTPostAPIChatInputApplicationCommandsJSONBody
        )[] = [];

        Nica.commands.forEach((command) => {
            const data = command.data.toJSON() as RESTPostAPIApplicationCommandsJSONBody;

            commandData.push(data);
        });
        if (Nica.configs.guild) {
            await rest.put(
                Routes.applicationGuildCommands(Nica.configs.botId, Nica.configs.guild),
                { body: commandData },
            );
            logger.log(`Registering commands only to guild ${Nica.configs.guild}`);
        } else {
            await rest.put(Routes.applicationCommands(Nica.configs.botId), {
                body: commandData,
            });
        }

        logger.log(`Registered ${commandData.length} commands`);
    } catch (error) {
        throw new Error('Failed to register commands. Exiting...');
    }
};
