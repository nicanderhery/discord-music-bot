import { TextBasedChannel, VoiceBasedChannel } from 'discord.js';

export interface GuildMetadata {
    channel: TextBasedChannel;
    voiceChannel: VoiceBasedChannel;
    manualPause: boolean;
    spotifySearching: boolean;
}
