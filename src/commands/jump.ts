import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const jump: Command = {
  data: new SlashCommandBuilder()
    .setName('jump')
    .setDescription('Jump to a specific track in the queue')
    .addIntegerOption((option) =>
      option
        .setName('position')
        .setDescription('The position of the track in the queue')
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

      const number = interaction.options.getInteger('position');
      if (number === null) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `Please provide a number ${interaction.member}... try again ? ❌`,
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

      if (number > queue.getSize() || number < 1) {
        await interaction.reply({
          content: `The number you provided is not in the queue ${
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            interaction.member
          }... try again ? ❌\nThe queue has ${queue.getSize()} tracks`,
          ephemeral: true,
        });
        return;
      }
      const index = number - 1;
      const track = queue.tracks.at(index);
      if (!track) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `Sorry, something went wrong ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        logger.debug('Track is null', `Debug from command: ${interaction.commandName}`);
        return;
      }
      queue.node.jump(track);
      await interaction.reply({
        content: `Jumped to **${track.title}** ✅`,
      });
    } catch (error) {
      logger.error(error, `Error from command: ${interaction.commandName}`);
    }
  },
};
