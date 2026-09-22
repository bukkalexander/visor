import type { Playlist, Schema, Song } from './types';

const root = `${import.meta.env.BASE_URL}api`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${root}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const info = body?.detail ?? body;
    const error = new Error(typeof info === 'string' ? info : info?.error || `Request failed (${response.status})`) as Error & { details?: string[] };
    error.details = info?.details || body?.details;
    throw error;
  }
  return body as T;
}

export const api = {
  catalog: () => request<{ songs: Song[]; schema: Schema }>('/catalog'),
  playlists: () => request<{ playlists: Playlist[] }>('/playlists'),
  createPlaylist: (payload: Omit<Playlist, 'id'>) => request<Playlist>('/playlists', { method: 'POST', body: JSON.stringify(payload) }),
  updatePlaylist: (playlist: Playlist) => request<Playlist>(`/playlists/${playlist.id}`, { method: 'PUT', body: JSON.stringify(playlist) }),
  deletePlaylist: (id: string) => request<void>(`/playlists/${id}`, { method: 'DELETE' })
};
