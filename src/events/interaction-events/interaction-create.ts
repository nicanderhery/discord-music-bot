import { EmbedBuilder, Interaction } from 'discord.js';
import { NicaMusic } from '../../interfaces/nica-discord';
import { logger } from '../../utils/logger';

export const interactionCreate = async (
  Nica: NicaMusic,
  interaction: Interaction,
): Promise<void> => {
  try {
    if (interaction.isChatInputCommand()) {
      const target = Nica.commands.find((command) => command.data.name === interaction.commandName);
      if (!target) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription('❌ | Error! Please contact Developers!')
              .setColor('#ff0000'),
          ],
          ephemeral: true,
        });
        return;
      }
      await target.run(Nica, interaction);
    } else if (interaction.isAutocomplete()) {
      const target = Nica.commands.find((command) => command.data.name === interaction.commandName);
      if (!target?.autocomplete) {
        return;
      }

      await target.autocomplete(Nica, interaction);
    }
  } catch (error) {
    logger.error(error, 'Error from function: interactionCreate');
  }
};
