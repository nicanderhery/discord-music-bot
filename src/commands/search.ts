import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    GuildMember,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuInteraction,
} from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { getTrack } from '../modules/get-track';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const search: Command = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for track you want to play')
        .addStringOption((option) =>
            option
                .setName('track')
                .setDescription('The track you want to search')
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

            const query = interaction.options.getString('track');
            if (!query) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Please provide something ${interaction.member}... try again ? ❌`,
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

            const maxTracks = res.tracks.slice(0, 10);

            const embed = new EmbedBuilder()
                .setDescription(
                    `${maxTracks
                        .map((track, i) => `**${i + 1}**. ${track.title} | ${track.author}`)
                        .join('\n')}`,
                )
                .setTimestamp()
                .setColor('#ff0000')
                .setFooter({
                    text: 'I am a computer program, I do not have feelings',
                    iconURL: Nica.user?.displayAvatarURL({
                        size: 1024,
                    }),
                })
                .setAuthor({
                    name: `Results for ${query}`,
                    iconURL: Nica.user?.displayAvatarURL({
                        size: 1024,
                    }),
                });

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('search')
                    .setPlaceholder('Select a track')
                    .addOptions(
                        maxTracks.map((track, i) => ({
                            label: `${track.title} | ${track.author}`.slice(0, 100),
                            value: `${i + 1}`,
                        })),
                    )
                    .addOptions({
                        label: 'Cancel',
                        value: 'cancel',
                    }),
            );

            const reply = await interaction.editReply({
                embeds: [embed],
                components: [row],
            });

            const collector = reply.createMessageComponentCollector({
                filter: (i) => i.user.id === interaction.user.id,
                time: 15000,
            });

            collector.on('collect', async (collectorInteraction: StringSelectMenuInteraction) => {
                if (collectorInteraction.customId !== 'search') {
                    return;
                }

                // Stop detecting interaction and clear the message
                collector.stop();
                await interaction.editReply({
                    content: 'Loading... ✅',
                    embeds: [],
                    components: [],
                });

                // If user select cancel, then return
                if (collectorInteraction.values[0] === 'cancel') {
                    await interaction.editReply({
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        content: `Cancelled ${interaction.member} ❌`,
                    });
                    return;
                }

                // ! check if guildId is null
                if (collectorInteraction.guildId === null) {
                    await interaction.editReply({
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        content: `Sorry, something went wrong ${interaction.member}... try again ? ❌`,
                    });
                    logger.debug(
                        'Missing guild id (collector)',
                        `Debug from command: ${interaction.commandName}`,
                    );
                    return;
                }

                // ! check if user is in a voice channel
                collectorInteraction.member = collectorInteraction.member as GuildMember;
                if (!collectorInteraction.member.voice.channel) {
                    await interaction.editReply({
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        content: `You need to be in a voice channel ${interaction.member}... try again ? ❌`,
                    });
                    return;
                }

                const track = maxTracks[Number(collectorInteraction.values[0])];

                const queue = Nica.player.nodes.create(collectorInteraction.guildId, {
                    metadata: {
                        channel: interaction.channel,
                        voiceChannel: collectorInteraction.member.voice.channel,
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
                        await queue.connect(collectorInteraction.member.voice.channel);
                    }
                } catch {
                    Nica.player.nodes.delete(collectorInteraction.guildId);
                    await interaction.editReply({
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        content: `I can't join the voice channel ${interaction.member}... try again ? ❌`,
                    });
                    return;
                }

                await interaction.editReply({
                    content: 'Loading your track... 🎧',
                });

                queue.addTrack(track);

                if (!queue.isPlaying()) {
                    await queue.node.play();
                }
            });

            collector.on('end', async (_collectorInteraction: StringSelectMenuBuilder, reason) => {
                if (reason === 'messageDelete') {
                    return;
                }
                await interaction.editReply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `You didn't select a track ${interaction.member}... try again ? ❌`,
                    embeds: [],
                    components: [],
                });
            });
        } catch (error) {
            logger.error(error, `Error from command: ${interaction.commandName}`);
        }
    },
};
