import { ActivityType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { GuildMetadata } from '../interfaces/guild-metadata';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const pause: Command = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Pause the current track'),
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

      if (queue.node.isPaused()) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `The music is already paused ${interaction.member} ❌`,
          ephemeral: true,
        });
        return;
      }

      const success = queue.node.pause();
      const metadata = queue.metadata as GuildMetadata;
      metadata.manualPause = success;

      if (success) {
        Nica.user?.setActivity(Nica.configs.message, {
          type: ActivityType.Listening,
        });
      }

      await interaction.reply({
        content: success
          ? 'Music paused ✅'
          : // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            `Something went wrong ${interaction.member}... try again ? ❌`,
      });
    } catch (error) {
      logger.error(error, `Error from command: ${interaction.commandName}`);
    }
  },
};
