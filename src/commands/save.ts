import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const save: Command = {
  data: new SlashCommandBuilder()
    .setName('save')
    .setDescription('Save the current track to your library'),
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
      if (!queue) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `No music currently playing ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      const user = interaction.user;
      if (user.bot) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `You're a bot ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`:arrow_forward: ${queue.currentTrack?.title ?? 'Missing title'}`)
        .setURL(queue.currentTrack?.url ?? 'Missing url')
        .setColor('Red')
        .setFooter({
          text: `From the server ${interaction.guild?.name ?? 'Missing guild name'}`,
          iconURL: interaction.guild?.iconURL() ?? undefined,
        })
        .setThumbnail(queue.currentTrack?.thumbnail ?? null)
        .addFields(
          {
            name: ':hourglass: Duration:',
            value: `\`${queue.currentTrack?.duration ?? '∞'}\``,
            inline: true,
          },
          {
            name: 'Track by:',
            value: `\`${queue.currentTrack?.author ?? 'Missing author'}\``,
            inline: true,
          },
          {
            name: 'Views :eyes:',
            value: `\`${Number(queue.currentTrack?.views).toLocaleString()}\``,
            inline: true,
          },
          {
            name: 'Track URL:',
            value: `\`${queue.currentTrack?.url ?? 'Missing url'}\``,
          },
        );

      user
        .send({ embeds: [embed] })
        .then(async () => {
          await interaction.reply({
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            content: `Track saved to your DMs ${interaction.member} ✅`,
            ephemeral: true,
          });
        })
        .catch(async (error) => {
          await interaction.reply({
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            content: `I can't send you a DM ${interaction.member}... try again ? ❌`,
            ephemeral: true,
          });
          logger.debug(error, `Error while sending PM from command ${interaction.commandName}`);
        });
    } catch (error) {
      logger.error(error, `Error from command: ${interaction.commandName}`);
    }
  },
};
