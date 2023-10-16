import { AudioFilters } from 'discord-player';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const filter: Command = {
  data: new SlashCommandBuilder()
    .setName('filter')
    .setDescription('Filter your music')
    .addStringOption((option) =>
      option
        .setName('filter')
        .setDescription('The filter you want to use')
        .setRequired(true)
        .addChoices(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          ...Object.keys(AudioFilters.filters)
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            .map((m) => Object({ name: m, value: m }))
            .splice(0, 25),
        ),
    ),
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

      // ! check if user is in a voice channel
      if (!isInVoiceChannel(interaction.member)) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `You need to be in a voice channel ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      const queue = Nica.player.nodes.get(interaction.guildId);

      if (!queue?.isPlaying()) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `No music currently playing ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      const selectedFilter = interaction.options.getString('filter');
      if (!selectedFilter) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `No filter provided ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      try {
        const enabled = await queue.filters.ffmpeg.toggle(selectedFilter as keyof AudioFilters);
        await interaction.reply({
          content: `Filter ${selectedFilter} is now ${enabled ? 'enabled' : 'disabled'}`,
        });
      } catch (error) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `Something went wrong ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        logger.debug(error, `Debug from command: ${interaction.commandName}`);
        return;
      }
    } catch (error) {
      logger.error(error, `Error from command: ${interaction.commandName}`);
    }
  },
};
