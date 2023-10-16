import { lyricsExtractor } from '@discord-player/extractor';
import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../interfaces/commands/command';
import { GeniusResponse } from '../interfaces/commands/lyrics/genius-response';
import { GeniusTrack } from '../interfaces/commands/lyrics/genius-track';
import { MatchRating } from '../interfaces/commands/lyrics/match-rating';
import { NicaMusic } from '../interfaces/nica-discord';
import { isInVoiceChannel } from '../modules/is-in-voice-channel';
import { logger } from '../utils/logger';

export const lyrics: Command = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Get the lyrics of the current track'),
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
      const lyricsFinder = lyricsExtractor(Nica.configs.geniusAccessToken);
      await interaction.deferReply();

      // Set the query to the track title + artist
      const query = `${track.title} ${track.author}`;

      // Find list of possible tracks that match the query on genius
      const possibleTracks = await searchTracks(query, Nica.configs.geniusAccessToken);

      // Put all possible tracks in data, then increase the match points for each track
      const data: MatchRating[] = [];
      for (const possibleTrack of possibleTracks) {
        // If the track is not already in data, add it
        if (!data.find((track) => track.geniusTrack.id === possibleTrack.id)) {
          data.push({ geniusTrack: possibleTrack, matchPoint: 0 });
        }

        // Increase the match point with query for the current track
        const point = calculateMatch(possibleTrack, query);
        const track = data.find((track) => track.geniusTrack.id === possibleTrack.id);
        if (track) {
          track.matchPoint += point;
        }
      }

      // Sort the data by match points
      data.sort((a, b) => b.matchPoint - a.matchPoint);

      // Prioritize lyrics that are from Genius and optionally romanized
      const highest10 = data.slice(0, 10);
      for (const track of highest10) {
        if (track.geniusTrack.artists.includes('Genius')) {
          track.matchPoint += 100;
        }

        if (track.geniusTrack.artists.includes('Romanization')) {
          track.matchPoint += 100;
        }
      }

      // Sort highest10 by match points
      highest10.sort((a, b) => b.matchPoint - a.matchPoint);

      // Get the track with the highest match points
      const mostOccurringTrack = highest10[0].geniusTrack;

      const lyrics = await lyricsFinder.search(mostOccurringTrack.title).catch(() => null);

      if (!lyrics) {
        await interaction.followUp({
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          content: `No lyrics found for ${track.title} ${interaction.member}... try again ? ❌`,
          ephemeral: true,
        });
        return;
      }

      const trimmedLyrics = lyrics.lyrics.substring(0, 1997);

      const lyricsEmbed = new EmbedBuilder()
        .setColor('#eb7434')
        .setDescription(trimmedLyrics)
        .setTimestamp()
        .setTitle(`Lyrics for ${lyrics.title}`)
        .setThumbnail(lyrics.thumbnail)
        .setFooter({
          text: 'Lyrics provided by Genius.com',
          iconURL: interaction.user.displayAvatarURL({
            size: 1024,
          }),
        });

      await interaction.editReply({ embeds: [lyricsEmbed] });
    } catch (error) {
      logger.error(error, `Error from command: ${interaction.commandName}`);
    }
  },
};

/**
 * Search for tracks on genius using the given query containing the track title and artist
 * the query is removed of all possible symbols, lowercased, split into words, then each word is searched on genius.
 * The results are then put into an array of GeniusTrack
 * @param query Query containing the track title and artist
 * @param accessToken Genius access token
 * @returns {Promise<GeniusTrack[]>} List of tracks that match the query
 */
const searchTracks = async (query: string, accessToken: string): Promise<GeniusTrack[]> => {
  try {
    // Regex to remove all symbols from the given query
    const symbols = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
    const regex = new RegExp(`[${symbols}]`, 'g');

    // Remove all symbols from the query, then convert it to lowercase
    const queryWithoutSymbols = query.replace(regex, '').toLowerCase();

    // Split the query into words without any spaces
    const querySplit = queryWithoutSymbols.split(' ').filter((word) => word !== '');

    const tracks: GeniusTrack[] = [];

    // Search through each word in the genius query
    while (querySplit.length > 0) {
      const response = await fetch(
        `https://api.genius.com/search?q=${encodeURIComponent(querySplit[0])}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const data = (await response.json()) as GeniusResponse;
      data.response.hits.forEach((hit) => {
        tracks.push({
          id: hit.result.id,
          title: hit.result.full_title,
          artists: hit.result.artist_names,
        });
      });
      querySplit.shift();
    }

    return tracks;
  } catch (error) {
    logger.error(error, 'Error from function: searchTracks');
    return [];
  }
};

/**
 * Calculate the match points between the given geniusTrack and the given query
 * the query is removed of all possible symbols, lowercased, split into words.
 * The geniusTrack's title and artist are lowercased.
 * The match points are calculated by counting the number of words
 * in the query that are in the geniusTrack's title and artist.
 * Any non matched word in the query will decrease the match points by 1.
 * @param geniusTrack GeniusTrack to compare with the query
 * @param query Query containing the track title and artist
 * @returns {number} Match points between the given geniusTrack and the given query
 */
const calculateMatch = (geniusTrack: GeniusTrack, query: string): number => {
  try {
    // Regex to remove all symbols from the given query
    const symbols = '!"#$%&\'()*+,./:;<=>?@[\\]^_`{|}~';
    const regex = new RegExp(`[${symbols}]`, 'g');
    let count = 0;

    // Remove all symbols from the query, then convert it to lowercase
    const queryWithoutSymbols = query.replace(regex, '').toLowerCase();

    // Split the query into words without any spaces
    const querySplit = queryWithoutSymbols.split(' ').filter((word) => word !== '');

    // Compare geniusTrack's title with the query
    for (const word of querySplit) {
      if (geniusTrack.title.toLowerCase().includes(word)) {
        count++;
      } else {
        count--;
      }
    }

    // Compare geniusTrack's artist with the query
    for (const word of querySplit) {
      if (geniusTrack.artists.toLowerCase().includes(word)) {
        count++;
      } else {
        count--;
      }
    }

    return count;
  } catch (error) {
    logger.error(error, 'Error from function: calculateMatch');
    return 0;
  }
};
