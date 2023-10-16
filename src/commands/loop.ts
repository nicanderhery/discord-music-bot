import { QueueRepeatMode } from 'discord-player';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const loop: Command = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Loop the current track or the queue')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('The type of loop')
        .addChoices(
          { name: 'Disable', value: 'disableLoop' },
          { name: 'Track', value: 'enableLoopTrack' },
          { name: 'Queue', value: 'enableLoopQueue' },
        )
        .setRequired(true),
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

      const type = interaction.options.getString('type');
      if (type === null) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `Please provide a type ${interaction.member}... try again ? ❌`,
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

      switch (type) {
        case 'disableLoop':
          try {
            queue.setRepeatMode(QueueRepeatMode.OFF);
            await interaction.reply({
              content: 'Repeat mode **disabled** ✅',
            });
          } catch (error) {
            await interaction.reply({
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              content: `Something went wrong ${interaction.member}... try again ? ❌`,
              ephemeral: true,
            });

            logger.debug(
              error,
              'Disable loop failed',
              `Debug from command: ${interaction.commandName}`,
            );
          }
          break;

        case 'enableLoopTrack':
          try {
            queue.setRepeatMode(QueueRepeatMode.TRACK);
            await interaction.reply({
              content: 'Repeat mode **enabled** one track will be repeated endlessly 🔁',
            });
          } catch (error) {
            await interaction.reply({
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              content: `Something went wrong ${interaction.member}... try again ? ❌`,
              ephemeral: true,
            });

            logger.debug(
              error,
              'Enable loop track failed',
              `Debug from command: ${interaction.commandName}`,
            );
          }
          break;

        case 'enableLoopQueue':
          try {
            queue.setRepeatMode(QueueRepeatMode.QUEUE);
            await interaction.reply({
              content: 'Repeat mode **enabled** the whole queue will be repeated endlessly 🔁',
            });
          } catch (error) {
            await interaction.reply({
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              content: `Something went wrong ${interaction.member}... try again ? ❌`,
              ephemeral: true,
            });

            logger.debug(
              error,
              'Enable loop queue failed',
              `Debug from command: ${interaction.commandName}`,
            );
          }
          break;
      }
    } catch (error) {
      logger.error(error, `Error from command: ${interaction.commandName}`);
    }
  },
};
