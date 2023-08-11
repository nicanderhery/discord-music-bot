import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const volume: Command = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjust the volume of the music player')
        .addIntegerOption((option) =>
            option.setName('volume').setDescription('The volume to set').setRequired(true),
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
            if (!queue) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `No music currently playing ${interaction.member}... try again ? ❌`,
                    ephemeral: true,
                });
                return;
            }

            const volume = interaction.options.getInteger('volume', true);
            if (volume < 1 || volume > Nica.playerConfigs.volume) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Volume must be between 1 and ${Nica.playerConfigs.volume} ${interaction.member}... try again ? ❌`,
                    ephemeral: true,
                });
                return;
            }

            if (queue.node.volume === volume) {
                await interaction.reply({
                    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    content: `Volume is already set to ${volume} ${interaction.member}... try again ? ❌`,
                    ephemeral: true,
                });
                return;
            }

            const success = queue.node.setVolume(volume);

            await interaction.reply({
                content: success ? `Volume set to ${volume} ✅` : 'Failed to set volume ❌',
            });
        } catch (error) {
            logger.error(error, `Error from command: ${interaction.commandName}`);
        }
    },
};
