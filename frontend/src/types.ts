export type Song = {
  id: string;
  title: string;
  alternate_titles?: string[];
  description?: string;
  lyrics?: string;
  video?: string;
  artist?: string[];
  author?: string[];
  composer?: string[];
  universe?: string[];
  tags?: string[];
  year?: number;
};

export type Playlist = { id: string; name: string; description?: string; type?: 'manual' | 'dynamic'; song_ids?: string[]; query?: string };
export type Schema = { items: { properties: Record<string, { type?: string | string[]; enum?: string[]; description?: string }> } };
export type Page = 'library' | 'songs' | 'playlists' | 'player';
