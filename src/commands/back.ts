import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const back: Command = {
  data: new SlashCommandBuilder().setName('back').setDescription('Go back to the previous track'),
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

      if (!queue.history.previousTrack) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `There was no music played before ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      await queue.history.back();

      await interaction.reply({
        content: 'Playing the **previous** track ✅',
      });
    } catch (error) {
      logger.error(error, `Error from command: ${interaction.commandName}`);
    }
  },
};
