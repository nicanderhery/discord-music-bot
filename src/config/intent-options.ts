import { GatewayIntentBits } from 'discord.js';

/**
 * The intents that the bot will use.
 */
export const IntentOptions = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.MessageContent,
];
