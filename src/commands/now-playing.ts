import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const nowPlaying: Command = {
    data: new SlashCommandBuilder()
        .setName('nowplaying') // ! all lowercase are needed!
        .setDescription('Get the current track'),
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

            const track = queue.currentTrack;
            if (!track) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `No music currently playing ${interaction.member}... try again ? ❌`,
                    ephemeral: true,
                });
                return;
            }
            const methods = ['disabled', 'track', 'queue'];
            const trackDuration = track.duration;
            const progress = queue.node.createProgressBar();

            const embed = new EmbedBuilder()
                .setDescription(
                    `Volume **${queue.node.volume}%**\nDuration **${trackDuration}**\nProgress ${
                        progress ?? 'Unknown'
                    }\nLoop mode **${
                        methods[queue.repeatMode]
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    }**\nRequested by ${track.requestedBy}`,
                )
                .setTimestamp()
                .setColor('#ff0000')
                .setFooter({
                    text: 'I am a computer program, I do not have feelings',
                    iconURL: Nica.user?.displayAvatarURL({
                        size: 1024,
                    }),
                })
                .setThumbnail(track.thumbnail)
                .setAuthor({
                    name: Nica.user?.username ?? 'Missing bot name',
                    iconURL: Nica.user?.displayAvatarURL({
                        size: 1024,
                    }),
                });

            const saveButton = new ButtonBuilder()
                .setLabel('Save this track')
                .setCustomId('save')
                .setStyle(ButtonStyle.Danger);

            const volumeUpButton = new ButtonBuilder()
                .setLabel('Volume up')
                .setCustomId('volumeUp')
                .setStyle(ButtonStyle.Primary);

            const resumePauseButton = new ButtonBuilder()
                .setLabel('Resume & Pause')
                .setCustomId('resume&pause')
                .setStyle(ButtonStyle.Success);

            const volumeDownButton = new ButtonBuilder()
                .setLabel('Volume down')
                .setCustomId('volumeDown')
                .setStyle(ButtonStyle.Primary);

            const loopButton = new ButtonBuilder()
                .setLabel('Loop')
                .setCustomId('loop')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                saveButton,
                volumeUpButton,
                resumePauseButton,
                volumeDownButton,
                loopButton,
            );

            const page = await interaction.reply({
                embeds: [embed],
                components: [row],
            });

            const collector = page.createMessageComponentCollector({
                filter: (i) =>
                    i.customId === 'save' ||
                    i.customId === 'volumeUp' ||
                    i.customId === 'resume&pause' ||
                    i.customId === 'volumeDown' ||
                    i.customId === 'loop',
            });

            collector.on('collect', async (collectorInteraction: ButtonInteraction) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
                const convertedInteraction = collectorInteraction as any;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                convertedInteraction.commandName = collectorInteraction.customId;

                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                switch (convertedInteraction.commandName) {
                    case 'volumeUp':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        convertedInteraction.commandName = 'volume';
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        convertedInteraction.options = {
                            getInteger: (): number => {
                                let adjustedVolume = queue.node.volume + 10;
                                if (adjustedVolume > Nica.playerConfigs.volume) {
                                    adjustedVolume = Nica.playerConfigs.volume;
                                }
                                return adjustedVolume;
                            },
                        };
                        break;

                    case 'resume&pause':
                        if (!queue.node.isPaused()) {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            convertedInteraction.commandName = 'pause';
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        else {
                            convertedInteraction.commandName = 'resume';
                        }
                        break;

                    case 'volumeDown':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        convertedInteraction.commandName = 'volume';
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        convertedInteraction.options = {
                            getInteger: (): number => {
                                let adjustedVolume = queue.node.volume - 10;
                                if (adjustedVolume < 1) {
                                    adjustedVolume = 1;
                                }
                                return adjustedVolume;
                            },
                        };
                        break;

                    case 'loop':
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        convertedInteraction.options = {
                            getString: (): string => {
                                if (queue.repeatMode === 0) {
                                    return 'enableLoopTrack';
                                } else if (queue.repeatMode === 1) {
                                    return 'enableLoopQueue';
                                } else {
                                    return 'disableLoop';
                                }
                            },
                        };
                        break;

                    default:
                        break;
                }

                const command = Nica.commands.find(
                    (command) =>
                        command.data.name ===
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        convertedInteraction.commandName,
                );
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                if (command) {
                    await command.run(Nica, convertedInteraction);
                } else {
                    await collectorInteraction.reply({
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                        content: `Sorry, something went wrong ${collectorInteraction.member}... try again ? ❌`,
                        ephemeral: true,
                    });
                    logger.debug(
                        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
                        `${convertedInteraction.commandName} was not found`,
                        `Debug from command: ${interaction.commandName}`,
                    );
                }
            });
        } catch (error) {
            logger.error(error, `Error from command: ${interaction.commandName}`);
        }
    },
};
