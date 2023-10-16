import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { getTrack } from '../modules/get-track';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const playNext: Command = {
  data: new SlashCommandBuilder()
    .setName('playnext') // ! all lowercase are needed!
    .setDescription('Set a track to be the next one in the queue')
    .addStringOption((option) =>
      option.setName('track').setDescription('The track to play next').setRequired(true),
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

      const query = interaction.options.getString('track');
      if (!query) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `You need to provide a track ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const res = await getTrack(Nica, Nica.player, query);

      if (!res?.tracks.length) {
        await interaction.editReply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `No results found ${interaction.member}... try again ? ❌`,
        });
        return;
      }

      if (res.hasPlaylist()) {
        await interaction.editReply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `This is a playlist ${interaction.member}... try again ? ❌`,
        });
        return;
      }

      const track = res.tracks[0];
      queue.insertTrack(track, 0);

      await interaction.editReply({
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        content: `Track added to the queue ${interaction.member}, it will play next ✅`,
      });
    } catch (error) {
      logger.error(error, `Error from command: ${interaction.commandName}`);
    }
  },
};
