import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { getTrack } from '../modules/get-track';
import { logger } from '../utils/logger';

export const play: Command = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a track from YouTube')
        .addStringOption((option) =>
            option.setName('track').setDescription('The track to play').setRequired(true),
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

            const query = interaction.options.getString('track');
            if (!query) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Please provide a track ${interaction.member}... try again ? ❌`,
                    ephemeral: true,
                });
                return;
            }
            if (
                query.startsWith('https://open.spotify.com/playlist/', 0) ||
                query.startsWith('open.spotify.com/playlist/', 0)
            ) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Please use /playlist for spotify playlist ${interaction.member} ❌`,
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
                content: `Loading your ${res.playlist ? 'playlist' : 'track'}... 🎧`,
            });
            res.playlist ? queue.addTrack(res.tracks) : queue.addTrack(res.tracks[0]);

            if (!queue.isPlaying()) {
                await queue.node.play();
            }
        } catch (error) {
            logger.error(error, `Error from command: ${interaction.commandName}`);
        }
    },
};
