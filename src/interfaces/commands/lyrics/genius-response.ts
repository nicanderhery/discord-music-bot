export interface GeniusResponse {
  response: {
    hits: {
      result: {
        id: number;
        full_title: string;
        artist_names: string;
      };
    }[];
  };
}
