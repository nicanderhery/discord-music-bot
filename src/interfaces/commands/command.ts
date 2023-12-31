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
   * Autocomplete function for the command.
   * @param Nica Nica's Discord instance.
   * @param interaction The interaction payload from Discord.
   */
  autocomplete?: (Nica: NicaMusic, interaction: AutocompleteInteraction) => Promise<void>;

  /**
   *
   * @param {NicaMusic} Nica Nica's Discord instance.
   * @param {ChatInputCommandInteraction} interaction The interaction payload from Discord.
   */
  run: (Nica: NicaMusic, interaction: ChatInputCommandInteraction) => Promise<void>;
}
