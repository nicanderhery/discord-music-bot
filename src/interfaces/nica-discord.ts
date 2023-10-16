import { Player } from 'discord-player';
import { Client } from 'discord.js';
import { Command } from './commands/command';

/**
 * The NicaMusic interface.
 */
export interface NicaMusic extends Client {
  configs: {
    token: string;
    botId: string;
    message: string;
    guild?: string;
    geniusAccessToken: string;
  };
  commands: Command[];
  player: Player;
  playerConfigs: {
    //* For discord-player configuration
    volume: number;
    leaveOnEmpty: boolean;
    leaveOnEnd: boolean;
    leaveOnStop: boolean;
    selfDeaf: boolean;
    //* For NicaMusic configuration
    loopMessage: boolean;
  };
  baseUrl: string;
}
