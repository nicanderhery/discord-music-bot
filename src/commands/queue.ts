import { GuildQueue } from 'discord-player';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const queue: Command = {
  data: new SlashCommandBuilder().setName('queue').setDescription('Show the current queue'),
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

      const length = queue.getSize();
      if (length === 0) {
        await interaction.reply({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `No music in the queue after the current one ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();
      let pageIndex = 0;
      const pages = generatePages(Nica, queue, interaction);

      const previousButton = new ButtonBuilder()
        .setLabel('Previous page')
        .setCustomId('previousPage')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageIndex === 0);

      const shuffleButton = new ButtonBuilder()
        .setLabel('Shuffle')
        .setCustomId('shuffle')
        .setStyle(ButtonStyle.Danger);

      const nextButton = new ButtonBuilder()
        .setLabel('Next page')
        .setCustomId('nextPage')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(pageIndex === pages.length - 1);

      const refreshButton = new ButtonBuilder()
        .setLabel('Refresh')
        .setCustomId('refresh')
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        previousButton,
        shuffleButton,
        nextButton,
        refreshButton,
      );

      const page = await interaction.editReply({
        embeds: [pages[pageIndex]],
        components: [row],
      });

      // Create a collector for the buttons
      const collector = page.createMessageComponentCollector({
        filter: (i) =>
          i.customId === 'previousPage' ||
          i.customId === 'shuffle' ||
          i.customId === 'nextPage' ||
          i.customId === 'refresh',
      });

      collector.on('collect', async (collectorInteraction: ButtonInteraction) => {
        let pages = generatePages(Nica, queue, collectorInteraction);
        const convertedInteraction =
          collectorInteraction as unknown as ChatInputCommandInteraction<CacheType>;
        convertedInteraction.commandName = collectorInteraction.customId;
        const shuffleCommand = Nica.commands.find(
          (command) => command.data.name === convertedInteraction.commandName,
        );
        switch (collectorInteraction.customId) {
          case 'previousPage':
            await collectorInteraction.deferUpdate();
            pageIndex <= 0 ? 0 : pageIndex--;
            break;

          case 'shuffle':
            if (shuffleCommand) {
              await shuffleCommand.run(Nica, convertedInteraction);
              pages = generatePages(Nica, queue, interaction);
            } else {
              await collectorInteraction.reply({
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                content: `Sorry, something went wrong ${collectorInteraction.member}... try again ? ❌`,
                ephemeral: true,
              });
              logger.debug(
                `${convertedInteraction.commandName} command was not found`,
                `Debug from command: ${interaction.commandName}`,
              );
            }
            break;

          case 'nextPage':
            await collectorInteraction.deferUpdate();
            pageIndex >= pages.length - 1 ? pages.length : pageIndex++;
            break;

          case 'refresh':
            await collectorInteraction.deferUpdate();
            break;
          default:
            break;
        }
        row.components[0].setDisabled(pageIndex === 0);
        row.components[2].setDisabled(pageIndex === pages.length - 1);
        await interaction.editReply({
          embeds: [pages[pageIndex]],
          components: [row],
        });
      });
    } catch (error) {
      logger.error(error, `Error from command: ${interaction.commandName}`);
    }
  },
};

const generatePages = (
  Nica: NicaMusic,
  queue: GuildQueue,
  interaction: ChatInputCommandInteraction | ButtonInteraction,
): EmbedBuilder[] => {
  try {
    const methods = ['', '🔁', '🔂'];
    const tracks: string[] = [];
    queue.tracks.map((track, index) => {
      tracks.push(
        `**${index + 1}**. ${track.title} - ${track.author} (requested by: ${
          track.requestedBy?.username ?? 'Unknown'
        })`,
      );
    });

    const maxPage = Math.ceil(tracks.length / 10);
    const pages: EmbedBuilder[] = [];

    // Create page for each message
    for (let i = 0; i < maxPage; i++) {
      const startIndex = i * 10;
      const embed = new EmbedBuilder()
        .setDescription(
          `Current ${queue.currentTrack?.title ?? 'Missing title'}\n\n${tracks
            .slice(startIndex, startIndex + 10)
            .join('\n')}`,
        )
        .setTimestamp()
        .setColor('#ff0000')
        .setThumbnail(
          interaction.guild?.iconURL({
            size: 2048,
          }) ?? null,
        )
        .setFooter({
          text: `Page ${i + 1}/${maxPage}`,
          iconURL: interaction.user.displayAvatarURL({
            size: 1024,
          }),
        })
        .setAuthor({
          name: `Server queue - ${interaction.guild?.name ?? 'Missing guild name'} ${
            methods[queue.repeatMode]
          }`,
          iconURL: Nica.user?.displayAvatarURL({
            size: 1024,
          }),
        });

      pages.push(embed);
    }

    if (pages.length === 0) {
      const embed = new EmbedBuilder()
        .setDescription('No tracks in the queue')
        .setTimestamp()
        .setColor('#ff0000')
        .setThumbnail(
          interaction.guild?.iconURL({
            size: 2048,
          }) ?? null,
        )
        .setFooter({
          text: 'Page 1/1',
          iconURL: interaction.user.displayAvatarURL({
            size: 1024,
          }),
        })
        .setAuthor({
          name: `Server queue - ${interaction.guild?.name ?? 'Missing guild name'} ${
            methods[queue.repeatMode]
          }`,
          iconURL: Nica.user?.displayAvatarURL({
            size: 1024,
          }),
        });

      pages.push(embed);
    }

    return pages;
  } catch (error) {
    logger.error(error, 'Error from function: generatePages');
    return [];
  }
};
