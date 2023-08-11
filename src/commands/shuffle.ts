import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const shuffle: Command = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the tracks in the queue'),
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

            if (!queue.getSize()) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `No tracks in the queue ${interaction.member}... try again ? ❌`,
                    ephemeral: true,
                });
                return;
            }

            queue.tracks.shuffle();
            await interaction.reply({
                content: `Queue shuffled **${queue.getSize()}** track(s) ! ✅`,
            });
        } catch (error) {
            logger.error(error, `Error from command: ${interaction.commandName}`);
        }
    },
};
