export type Song = {
  id: string;
  title: string;
  alternate_titles?: string[];
  language: string;
  description?: string;
  lyrics?: string;
  video?: string;
  artist?: string[];
  author?: string[];
  composer?: string[];
  universe?: string[];
  source?: string;
  tags?: string[];
  year?: number;
  rights?: 'public-domain' | 'copyrighted' | 'original' | 'unknown';
};

export type Playlist = { id: string; name: string; description?: string; song_ids: string[] };
export type Schema = { properties: { songs: { items: { properties: Record<string, { type?: string | string[]; enum?: string[] }> } } } };
export type Page = 'library' | 'songs' | 'playlists' | 'player';
