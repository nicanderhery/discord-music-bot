import { Player, QueueRepeatMode } from 'discord-player';
import {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  VoiceState,
} from 'discord.js';
import { GuildMetadata } from '../../interfaces/guild-metadata';
import { NicaMusic } from '../../interfaces/nica-discord';
import { logger } from '../../utils/logger';

export const registerPlayerEvents = (Nica: NicaMusic, player: Player): void => {
  try {
    player.events.on('connection', (queue) => {
      logger.debug(`Connection in ${queue.guild.name}`, 'Debug from player event: connection');
    });

    player.events.on('error', (queue, error) => {
      logger.error(error, 'Error from player event: error');
      logger.error(error, `Error with player in ${queue.guild.name}`);
    });

    player.events.on('playerError', (queue, error, track) => {
      logger.error(queue, error, track, 'Error from player event: playerError');
    });

    player.events.on('playerStart', async (queue, track) => {
      // Type checking against null
      if (!queue.connection) {
        logger.debug(
          `No connection in ${queue.guild.name} | ${track.title}`,
          'Debug from event: playerStart',
        );
        return;
      }

      // If it is currently in loop mode, or repeat mode is set to 1 (repeat track), then return
      if (!Nica.playerConfigs.loopMessage && queue.repeatMode !== QueueRepeatMode.OFF) {
        return;
      }
      Nica.user?.setActivity(track.title, {
        type: ActivityType.Listening,
      });

      const metadata = queue.metadata as GuildMetadata;

      const embed = new EmbedBuilder().setColor('#13f857').setAuthor({
        name: `Started playing ${track.title} in ${metadata.voiceChannel.name} 🎧`,
        iconURL: track.requestedBy?.avatarURL() ?? Nica.user?.avatarURL() ?? undefined,
      });

      const backButton = new ButtonBuilder()
        .setLabel('Back')
        .setCustomId('back')
        .setStyle(ButtonStyle.Primary);

      const lyricsButton = new ButtonBuilder()
        .setLabel('Lyrics')
        .setCustomId('lyrics')
        .setStyle(ButtonStyle.Secondary);

      const resumePauseButton = new ButtonBuilder()
        .setLabel('Resume & Pause')
        .setCustomId('resume&pause')
        .setStyle(ButtonStyle.Danger);

      const queueButton = new ButtonBuilder()
        .setLabel('Queue')
        .setCustomId('queue')
        .setStyle(ButtonStyle.Secondary);

      const skipButton = new ButtonBuilder()
        .setLabel('Skip')
        .setCustomId('skip')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        backButton,
        lyricsButton,
        resumePauseButton,
        queueButton,
        skipButton,
      );

      const message = await metadata.channel.send({
        embeds: [embed],
        components: [row],
      });

      const collector = message.createMessageComponentCollector({
        filter: (i) =>
          (i.customId === 'back' ||
            i.customId === 'lyrics' ||
            i.customId === 'resume&pause' ||
            i.customId === 'queue' ||
            i.customId === 'skip') &&
          track === queue.currentTrack,
      });

      collector.on('collect', async (collectorInteraction: ButtonInteraction) => {
        const convertedInteraction =
          collectorInteraction as unknown as ChatInputCommandInteraction<CacheType>;
        convertedInteraction.commandName = collectorInteraction.customId;

        // If the track is paused, then the resume button is pressed, and vice versa
        if (convertedInteraction.commandName === 'resume&pause') {
          if (!queue.node.isPaused()) {
            convertedInteraction.commandName = 'pause';
          } else {
            convertedInteraction.commandName = 'resume';
          }
        }

        const command = Nica.commands.find(
          (command) => command.data.name === convertedInteraction.commandName,
        );
        if (command) {
          await command.run(Nica, convertedInteraction);
        } else {
          await collectorInteraction.reply({
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            content: `Sorry, something went wrong ${collectorInteraction.member}... try again ? ❌`,
            ephemeral: true,
          });
          logger.debug(
            `${convertedInteraction.commandName} command was not found from player event playerStart (collector)`,
            'Debug from event: playerStart',
          );
        }
      });
    });

    player.events.on('audioTrackAdd', (queue, track) => {
      const metadata = queue.metadata as GuildMetadata;
      metadata.channel.send(`Track ${track.title} added in the queue ✅`).catch((error) => {
        logger.error(error, 'Error from event: audioTrackAdd');
      });
    });

    player.events.on('audioTracksAdd', (queue) => {
      const metadata = queue.metadata as GuildMetadata;
      if (!metadata.spotifySearching) {
        metadata.channel
          .send('All the tracks in playlist added into the queue ✅')
          .catch((error) => {
            logger.error(error, 'Error from event: audioTracksAdd');
          });
      }
    });

    player.events.on('disconnect', (queue) => {
      const metadata = queue.metadata as GuildMetadata;
      metadata.channel
        .send('I was manually disconnected from the voice channel, clearing queue... 🗑️')
        .catch((error) => {
          logger.error(error, 'Error from event: disconnect');
        });
      Nica.user?.setActivity(Nica.configs.message, {
        type: ActivityType.Listening,
      });

      logger.debug(queue, `Player event disconnect in ${queue.guild.name}`);
    });

    player.events.on('emptyChannel', (queue) => {
      const metadata = queue.metadata as GuildMetadata;
      if (Nica.playerConfigs.leaveOnEmpty) {
        // Only show this if leave on Empty is true.
        metadata.channel
          .send('Nobody is in the voice channel, leaving the voice channel... ❌')
          .catch((error) => {
            logger.error(error, 'Error from event: emptyChannel');
          });
      }
    });

    player.events.on('emptyQueue', (queue) => {
      const metadata = queue.metadata as GuildMetadata;
      metadata.channel.send('I finished reading the whole queue ✅').catch((error) => {
        logger.error(error, 'Error from event: emptyQueue');
      });
      Nica.user?.setActivity(Nica.configs.message, {
        type: ActivityType.Listening,
      });
    });

    let currentlyPaused = false;
    Nica.on('voiceStateUpdate', (oldState, newState) => {
      const channels: VoiceState[] = [oldState, newState];
      let guildId: string | undefined;
      while (channels.length) {
        guildId = channels.shift()?.guild.id;
        if (guildId) {
          break;
        }
      }
      if (!guildId) {
        return;
      }
      const queue = player.nodes.get(guildId);
      if (!queue) {
        return;
      }
      const metadata = queue.metadata as GuildMetadata;
      if (metadata.manualPause) {
        return;
      }
      const memberSize: number = metadata.voiceChannel.members.size;

      // If at least one member is in the bot's voice channel, unpause the music
      if (memberSize > 1) {
        queue.node.resume();
        if (currentlyPaused) {
          metadata.channel.send('Continuing the music ✅').catch((error) => {
            logger.error(error, 'Error from event: voiceStateUpdate');
          });
          Nica.user?.setActivity(queue.currentTrack?.title ?? 'Missing title', {
            type: ActivityType.Listening,
          });
          currentlyPaused = false;
        }
      } else {
        queue.node.pause();
        if (!currentlyPaused) {
          metadata.channel
            .send(
              `Nobody is in voice channel ${metadata.voiceChannel.name}, pausing the music... ❌`,
            )
            .catch((error) => {
              logger.error(error, 'Error from event: voiceStateUpdate');
            });
          Nica.user?.setActivity(Nica.configs.message, {
            type: ActivityType.Listening,
          });
          currentlyPaused = true;
        }
      }
    });

    logger.log('Player events registered');
  } catch (error) {
    logger.error(error, 'Error from function: registerPlayerEvents');
  }
};
