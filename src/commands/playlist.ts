import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { SpotifyPlaylist } from '../interfaces/commands/playlist/playlist';
import { GuildMetadata } from '../interfaces/guild-metadata';
import { NicaMusic } from '../interfaces/nica-discord';
import { getTrack } from '../modules/get-track';
import { logger } from '../utils/logger';

export const playlist: Command = {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Play your spotify playlist')
        .addStringOption((option) =>
            option
                .setName('playlist')
                .setDescription('The playlist url you want to play')
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
            interaction.member = interaction.member as GuildMember;
            if (!interaction.member.voice.channel) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `You need to be in a voice channel ${interaction.member}... try again ? ❌`,
                    ephemeral: true,
                });
                return;
            }

            const query = interaction.options.getString('playlist');
            if (!query) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Please provide a playlist ${interaction.member}... try again ? ❌`,
                    ephemeral: true,
                });
                return;
            }

            // Check if it is a spotify playlist, if not, return
            if (
                !query.startsWith('https://open.spotify.com/playlist/', 0) &&
                !query.startsWith('open.spotify.com/playlist/', 0)
            ) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Please provide a valid spotify playlist ${interaction.member}... try again ? ❌`,
                    ephemeral: true,
                });
                return;
            }

            // Get the playlist's id
            const playlistId = query.split('/').pop();
            if (!playlistId) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Please provide a valid spotify playlist ${interaction.member}... try again ? ❌`,
                    ephemeral: true,
                });
                return;
            }

            // Check for existing queue's metadata, whether another spotify playlist is currently being searched, if so, return
            if (Nica.player.nodes.get(interaction.guildId)) {
                const queue = Nica.player.nodes.get(interaction.guildId);
                const metadata = queue?.metadata as GuildMetadata;
                if (metadata.spotifySearching) {
                    await interaction.reply({
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        content: `I'm currently searching for a spotify playlist ${interaction.member}... try again ? ❌`,
                        ephemeral: true,
                    });
                    return;
                }
            }

            await interaction.deferReply({ ephemeral: true });
            const tracksUrl = new URL(playlistId, `${Nica.baseUrl}/api/spotify/v1/get/tracks/`);
            const tracksResponse = await fetch(tracksUrl.toString()).catch(async () => {
                await interaction.editReply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Sorry, something went wrong ${interaction.member}... try again ? ❌`,
                });
                logger.debug('Database is down', `Debug from command: ${interaction.commandName}`);
            });
            if (!tracksResponse) {
                return;
            }
            if (!tracksResponse.ok) {
                await interaction.editReply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Playlist not found ${interaction.member}... try again ? ❌`,
                });
                logger.debug(
                    'Error while getting spotify tracks',
                    `Debug from command: ${interaction.commandName}`,
                );
                return;
            }
            const trackUris = (await tracksResponse.json()) as string[];
            if (!trackUris.length) {
                await interaction.editReply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Playlist contains 0 tracks ${interaction.member}... try again ? ❌`,
                });
                logger.debug(
                    'Error while getting spotify tracks',
                    `Debug from command: ${interaction.commandName}`,
                );
                return;
            }
            const trackUrisSplit = splitIntoHundreds(trackUris);

            const queue = Nica.player.nodes.create(interaction.guildId, {
                metadata: {
                    channel: interaction.channel,
                    voiceChannel: interaction.member.voice.channel,
                    manualPause: false,
                    spotifySearching: false,
                },
                leaveOnEnd: Nica.playerConfigs.leaveOnEnd,
                leaveOnEmpty: Nica.playerConfigs.leaveOnEmpty,
                leaveOnStop: Nica.playerConfigs.leaveOnStop,
                selfDeaf: Nica.playerConfigs.selfDeaf,
                volume: Nica.playerConfigs.volume,
            });

            try {
                if (!queue.connection) {
                    await queue.connect(interaction.member.voice.channel);
                }
            } catch {
                Nica.player.nodes.delete(interaction.guildId);
                await interaction.editReply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `I can't join the voice channel ${interaction.member}... try again ? ❌`,
                });
                return;
            }

            await interaction.editReply({
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                content: `Loading your spotify playlist ${interaction.member}... ✅`,
            });

            const metadata = queue.metadata as GuildMetadata;
            metadata.spotifySearching = true;
            for (const uris of trackUrisSplit) {
                // Generate a random playlist to be used as a temporary playlist
                // To add the tracks to, if the playlist is not generated, we continue to the next iteration
                const generatedPlaylistUrl = new URL(
                    `${Nica.baseUrl}/api/spotify/v1/playlist/create`,
                );
                const generatedPlaylistData = await fetch(generatedPlaylistUrl.toString()).catch(
                    async () => {
                        await interaction.editReply({
                            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                            content: `Sorry, something went wrong ${interaction.member}... try again ? ❌`,
                        });
                        logger.debug(
                            'Database is down',
                            `Debug from command: ${interaction.commandName}`,
                        );
                    },
                );
                if (!generatedPlaylistData) {
                    return;
                }
                if (!generatedPlaylistData.ok) {
                    continue;
                }
                const generatedPlaylist = (await generatedPlaylistData.json()) as SpotifyPlaylist;

                // Add the tracks to the temporary playlist
                const insertUrl = new URL(
                    generatedPlaylist.id,
                    `${Nica.baseUrl}/api/spotify/v1/playlist/insert/`,
                );
                const insertOptions: RequestInit = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        uris: uris,
                    }),
                };
                const insertResponse = await fetch(insertUrl.toString(), insertOptions).catch(
                    async () => {
                        await interaction.editReply({
                            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                            content: `Sorry, something went wrong ${interaction.member}... try again ? ❌`,
                        });
                        logger.debug(
                            'Database is down',
                            `Debug from command: ${interaction.commandName}`,
                        );
                    },
                );
                if (!insertResponse) {
                    return;
                }

                // If the tracks were not added to the temporary playlist, continue to the next iteration
                if (!insertResponse.ok) {
                    continue;
                }

                // Search the tracks in the temporary playlist using discord-player
                // Continue to the next iteration if the tracks were not found
                const res = await getTrack(Nica, Nica.player, generatedPlaylist.url);
                if (!res?.tracks.length) {
                    continue;
                }

                // Remove the tracks from the temporary playlist
                const removeUrl = new URL(
                    generatedPlaylist.id,
                    `${Nica.baseUrl}/api/spotify/v1/playlist/remove/`,
                );
                const removeOptions: RequestInit = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        uris: uris,
                    }),
                };
                await fetch(removeUrl.toString(), removeOptions).catch(() => {
                    logger.debug(
                        'Database is down',
                        `Debug from command: ${interaction.commandName}`,
                    );
                });

                // If it is the last iteration, set spotifySearching to false
                if (uris === trackUrisSplit[trackUrisSplit.length - 1]) {
                    metadata.spotifySearching = false;
                }
                // Add the tracks to the queue
                queue.addTrack(res.tracks);

                // Play the queue if it is not playing
                if (!queue.isPlaying()) {
                    await queue.node.play();
                }
            }
            // Set spotifySearching to false incase the loop was not executed until the end
            metadata.spotifySearching = false;

            // If the queue is empty, delete the queue
            if (!queue.getSize()) {
                Nica.player.nodes.delete(interaction.guildId);
                await interaction.editReply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Sorry, something went wrong ${interaction.member}... try again ? ❌`,
                });
            }
        } catch (error) {
            logger.error(error, `Error from command: ${interaction.commandName}`);
        }
    },
};

/**
 * Split the array into chunks of 100
 * @param tracks the array to split
 * @returns the array split into chunks of 100
 */
const splitIntoHundreds = (tracks: string[]): string[][] => {
    try {
        const result = [];
        while (tracks.length) {
            result.push(tracks.splice(0, 100));
        }

        return result;
    } catch (error) {
        logger.error(error, 'Error from function: splitIntoHundreds');
        return [];
    }
};
