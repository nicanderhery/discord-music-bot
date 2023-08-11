import { Track } from 'discord-player';
import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { GuildMetadata } from '../interfaces/guild-metadata';
import { NicaMusic } from '../interfaces/nica-discord';
import { logger } from '../utils/logger';
import { sleep } from '../utils/sleep';

export const restart: Command = {
    data: new SlashCommandBuilder().setName('restart').setDescription('Restart the music bot'),
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

            const tracks: Track[] = [];

            const oldQueue = Nica.player.nodes.get(interaction.guildId);
            if (oldQueue) {
                const metadata = oldQueue.metadata as GuildMetadata;
                if (metadata.spotifySearching) {
                    await interaction.reply({
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        content: `Please wait for spotify playlist to finish ${interaction.member}... try again ? ❌`,
                        ephemeral: true,
                    });
                    return;
                }
                oldQueue.tracks.map((track) => tracks.push(track));
                const track = oldQueue.currentTrack;
                if (track) {
                    tracks.unshift(track);
                }
                oldQueue.delete();
            }

            await interaction.deferReply();
            await sleep(1000);

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

            if (tracks.length > 0) {
                queue.addTrack(tracks);
                if (!queue.isPlaying()) {
                    await queue.node.play();
                }
            }

            await interaction.editReply({
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                content: `Bot is successfully restarted ${interaction.member} ✅`,
            });
        } catch (error) {
            logger.error(error, `Error from command: ${interaction.commandName}`);
        }
    },
};
