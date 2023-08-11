import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const remove: Command = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a track from the queue')
        .addIntegerOption((option) =>
            option.setName('index').setDescription('The track index to remove').setRequired(true),
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

            const queue = Nica.player.nodes.get(interaction.guildId);
            if (!queue?.isPlaying()) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `No music currently playing ${interaction.member}... try again ? ❌`,
                    ephemeral: true,
                });
                return;
            }

            const index = interaction.options.getInteger('index');

            const length = queue.getSize();

            if (index === null || index < 1 || index > length) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Please provide a valid index ${interaction.member}... try again ? ❌\nThe queue has ${length} tracks`,
                    ephemeral: true,
                });
                return;
            }

            queue.tracks.removeOne((_, i) => i === index - 1);

            await interaction.reply({
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                content: `Track removed ${interaction.member} ! ✅`,
            });
        } catch (error) {
            logger.error(error, `Error from command: ${interaction.commandName}`);
        }
    },
};
