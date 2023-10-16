import { Player, QueueRepeatMode } from 'discord-player';
import {
  ActionRowBuilder,
  ActivityType,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  EmbedBuilder,
  Message,
  VoiceState,
} from 'discord.js';
import { GuildMetadata } from '../../interfaces/guild-metadata';
import { NicaMusic } from '../../interfaces/nica-discord';
import { logger } from '../../utils/logger';

export const registerPlayerEvents = (Nica: NicaMusic, player: Player): void => {
  try {
    player.events.on('connection', (queue) => {
      // ! temp fix for the voice connection issue with discord and discordjs/voice
      queue.dispatcher?.voiceConnection.on('stateChange', (oldState, newState) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const oldNetworking = Reflect.get(oldState, 'networking');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const newNetworking = Reflect.get(newState, 'networking');

        const networkStateChangeHandler = (
          _oldNetworkState: VoiceState,
          newNetworkState: VoiceState,
        ) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const newUdp = Reflect.get(newNetworkState, 'udp');
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          clearInterval(newUdp?.keepAliveInterval);
        };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        oldNetworking?.off('stateChange', networkStateChangeHandler);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        newNetworking?.on('stateChange', networkStateChangeHandler);
      });

      logger.debug(`Connection in ${queue.guild.name}`, 'Debug from player event: connection');
    });

    player.events.on('error', (queue, error) => {
      logger.error(error, 'Error from player event: error');
      logger.error(error, `Error with player in ${queue.guild.name}`);
    });

    // ! Only for debugging purposes
    // Player.events.on("debug", (queue, message) => {
    //     Logger(
    //         NicaLogType.DEBUG,
    //         `Debug in ${queue.guild.name} | ${message}`
    //     );
    // });

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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      const message: Message = await (metadata.channel as any).send({
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        const convertedInteraction = collectorInteraction as any;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        convertedInteraction.commandName = collectorInteraction.customId;

        // If the track is paused, then the resume button is pressed, and vice versa
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (convertedInteraction.commandName === 'resume&pause') {
          if (!queue.node.isPaused()) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            convertedInteraction.commandName = 'pause';
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            convertedInteraction.commandName = 'resume';
          }
        }

        const command = Nica.commands.find(
          (command) =>
            command.data.name ===
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            convertedInteraction.commandName,
        );
        if (command) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          await command.run(Nica, convertedInteraction);
        } else {
          await collectorInteraction.reply({
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            content: `Sorry, something went wrong ${collectorInteraction.member}... try again ? ❌`,
            ephemeral: true,
          });
          logger.debug(
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
            `${convertedInteraction.commandName} command was not found from player event playerStart (collector)`,
            'Debug from event: playerStart',
          );
        }
      });
    });

    player.events.on('audioTrackAdd', (queue, track) => {
      const metadata = queue.metadata as GuildMetadata;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (metadata.channel as any).send(`Track ${track.title} added in the queue ✅`);
    });

    player.events.on('audioTracksAdd', (queue) => {
      const metadata = queue.metadata as GuildMetadata;
      if (!metadata.spotifySearching) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        (metadata.channel as any).send('All the tracks in playlist added into the queue ✅');
      }
    });

    player.events.on('disconnect', (queue) => {
      const metadata = queue.metadata as GuildMetadata;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (metadata.channel as any).send(
        'I was manually disconnected from the voice channel, clearing queue... 🗑️',
      );
      Nica.user?.setActivity(Nica.configs.message, {
        type: ActivityType.Listening,
      });

      logger.debug(queue, `Player event disconnect in ${queue.guild.name}`);
    });

    player.events.on('emptyChannel', (queue) => {
      const metadata = queue.metadata as GuildMetadata;
      if (Nica.playerConfigs.leaveOnEmpty) {
        // Only show this if leave on Empty is true.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
        (metadata.channel as any).send(
          'Nobody is in the voice channel, leaving the voice channel... ❌',
        );
      }
    });

    player.events.on('emptyQueue', (queue) => {
      const metadata = queue.metadata as GuildMetadata;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
      (metadata.channel as any).send('I finished reading the whole queue ✅');
      Nica.user?.setActivity(Nica.configs.message, {
        type: ActivityType.Listening,
      });
    });

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
        if (!queue.node.resume()) {
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
        (metadata.channel as any).send('Continuing the music ✅');
        Nica.user?.setActivity(queue.currentTrack?.title ?? 'Missing title', {
          type: ActivityType.Listening,
        });
      } else {
        if (!queue.node.pause()) {
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
        (metadata.channel as any).send(
          `Nobody is in voice channel ${metadata.voiceChannel.name}, pausing the music... ❌`,
        );
        Nica.user?.setActivity(Nica.configs.message, {
          type: ActivityType.Listening,
        });
      }
    });

    logger.log('Player events registered');
  } catch (error) {
    logger.error(error, 'Error from function: registerPlayerEvents');
  }
};
