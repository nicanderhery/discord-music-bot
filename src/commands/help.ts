import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { NicaMusic } from '../interfaces/nica-discord';
import { logger } from '../utils/logger';

/**
 * The help command. Shows all commands.
 */
export const help: Command = {
    data: new SlashCommandBuilder().setName('help').setDescription('Get help with a command'),
    run: async (Nica: NicaMusic, interaction: ChatInputCommandInteraction) => {
        try {
            const commands = Nica.commands.filter((command) => command.data.name !== 'help');

            // If there are no commands, return
            if (commands.length === 0) {
                await interaction.reply({
                    content: 'No commands found',
                    ephemeral: true,
                });

                return;
            }

            const message = commands.map((x) => `\`${x.data.name}\``).join(' | ');

            const embed = new EmbedBuilder()
                .setDescription(
                    `**${Nica.user?.username ?? 'Missing bot name'}** is a bot made by **Nic**`,
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
                    name: Nica.user?.username ?? 'Missing bot name',
                    iconURL: Nica.user?.displayAvatarURL({
                        size: 1024,
                    }),
                })
                .addFields([
                    {
                        name: `Enabled - ${commands.length}`,
                        value: message,
                    },
                ]);

            await interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        } catch (error) {
            logger.error(error, `Error from command: ${interaction.commandName}`);
        }
    },
};
