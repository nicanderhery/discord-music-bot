import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { Command } from '../interfaces/commands/command';
import { logger } from './logger';

/**
 * Loads all commands from the commands folder.
 * @param Nica The NicaMusic instance.
 * @returns An array of commands.
 */
export const loadCommands = async (): Promise<Command[]> => {
    try {
        const commands: Command[] = [];
        const folderNames: string = 'commands';
        const commandFiles = await readdir(join(process.cwd(), 'dist', folderNames), 'utf-8');

        // Read all files in the commands folder.
        for (const file of commandFiles) {
            const status = await stat(join(process.cwd(), 'dist', folderNames, file));
            if (status.isDirectory()) {
                continue;
            }

            const name = file.split('.')[0];
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
            const mod = (await import(
                join(process.cwd(), 'dist', folderNames, file)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            )) as any;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            commands.push(mod[kebabToCamel(name)] as Command);
        }

        logger.log(`Loaded ${commands.length} commands`);
        return commands;
    } catch (error) {
        logger.error('Error loading commands');
        return [];
    }
};

const kebabToCamel = (str: string): string => {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};
