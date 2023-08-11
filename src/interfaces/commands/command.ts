import { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from '@discordjs/builders';
import { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import { NicaMusic } from '../nica-discord';

/**
 * Interface for a command.
 */
export interface Command {
    data:
        | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
        | SlashCommandSubcommandsOnlyBuilder;

    /**
     *
     * @param {NicaMusic} Nica Nica's Discord instance.
     * @param {ChatInputCommandInteraction} interaction The interaction payload from Discord.
     */
    run: (Nica: NicaMusic, interaction: ChatInputCommandInteraction) => Promise<void>;

    autocomplete?: (Nica: NicaMusic, interaction: AutocompleteInteraction) => Promise<void>;
}
