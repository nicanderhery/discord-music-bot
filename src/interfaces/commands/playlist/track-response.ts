import { SpotifyTrack } from './track';

export interface SpotifyTrackResponse {
  tracks: {
    total: number;
    items: {
      track: SpotifyTrack;
    }[];
    next: string;
  };
  items: {
    track: SpotifyTrack;
  }[];
  next: string;
}
