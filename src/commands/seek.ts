import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import ms from 'ms';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const seek: Command = {
  data: new SlashCommandBuilder()
    .setName('seek')
    .setDescription('Skip to a specific time in the track')
    .addStringOption((option) =>
      option.setName('time').setDescription('Time to skip to').setRequired(true),
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
      if (!queue?.isPlaying() || !queue.currentTrack) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `No music currently playing ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      const timeToMs = ms(interaction.options.getString('time') ?? '9999');

      if (timeToMs > queue.currentTrack.durationMS) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `Time is too long ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      await queue.node.seek(timeToMs);

      await interaction.reply({
        content: `Time set on the current track **${ms(timeToMs, {
          long: true,
        })}** ✅`,
      });
    } catch (error) {
      logger.error(error, `Error from command: ${interaction.commandName}`);
    }
  },
};
