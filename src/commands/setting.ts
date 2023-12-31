import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { logger } from '../utils/logger';

export const setting: Command = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Change the bot settings')
    .addStringOption((option) =>
      option
        .setName('setting')
        .setDescription('The setting to change')
        .setAutocomplete(true)
        .setRequired(true),
    ),

  autocomplete: async (Nica: NicaMusic, interaction: AutocompleteInteraction) => {
    try {
      const options: { name: string; value: string }[] = [];
      options.push(
        ...Object.entries(Nica.playerConfigs)
          .filter(([, value]) => typeof value === 'boolean')
          .map(([key, value]) => {
            return { name: `${key} - currently ${value}`, value: key };
          }),
      );
      await interaction.respond(options.slice(0, 25));
    } catch (error) {
      logger.error(error, `Error from autocomplete: ${interaction.commandName}`);
    }
  },

  run: async (Nica: NicaMusic, interaction: ChatInputCommandInteraction) => {
    try {
      // ! check if guildId is null
      if (interaction.guildId === null) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `Sorry, something went wrong ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        logger.debug('Missing guild id', `Debug from command: ${interaction.commandName}`);
        return;
      }

      const setting = interaction.options.getString('setting');
      if (setting === null) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `Please provide a setting ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      // It shows number, but it will not be a number, because it is already filtered
      const currentValue = Nica.playerConfigs[setting as keyof NicaMusic['playerConfigs']];
      Object.assign(Nica.playerConfigs, { [setting]: !currentValue });
      logger.debug(
        `Setting ${setting} to ${!currentValue}`,
        `Debug from command: ${interaction.commandName}`,
      );
      logger.debug(Nica.playerConfigs, `Debug from command: ${interaction.commandName}`);

      await interaction.reply({
        content: `Setting ${setting} to ${!currentValue}, the bot needs to be restarted for the changes to take effect ${
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          interaction.member
        } ✅`,
        ephemeral: true,
      });
    } catch (error) {
      logger.error(error, `Error from command: ${interaction.commandName}`);
    }
  },
};
