import { APIInteractionGuildMember, GuildMember } from 'discord.js';

export const isInVoiceChannel = (member: GuildMember | APIInteractionGuildMember | null) => {
  member = member as GuildMember;
  return member.voice.channel;
};
