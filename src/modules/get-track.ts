import { Player, QueryType, SearchResult } from 'discord-player';
import { UserResolvable } from 'discord.js';
import { NicaMusic } from '../interfaces/nica-discord';
import { logger } from '../utils/logger';

/**
 * Search for a track and return the result
 * @param Nica NicaMusic instance
 * @param player discord-player instance
 * @param query the track to search for
 * @returns {Promise<SearchResult | undefined>} the search result or undefined if an error occurred
 */
export const getTrack = async (
  Nica: NicaMusic,
  player: Player,
  query: string,
): Promise<SearchResult | undefined> => {
  try {
    const searchResult = await player.search(query, {
      requestedBy: Nica.user as UserResolvable,
      searchEngine: QueryType.AUTO,
    });
    return searchResult;
  } catch (error) {
    logger.error('Error from function: getTrack');
    return undefined;
  }
};
