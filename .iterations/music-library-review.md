# Music library redesign

Implemented the requested Spotify-inspired browsing and playback model while
retaining Visor's Swedish interface, Catppuccin theme, YAML data, lyrics and chords.

- Desktop library sidebar and mobile navigation, unified search across songs,
  artists, albums and playlists, compact song rows, and collection artwork.
- Artist collections and album pages with ordered tracks. Optional `album` and
  `track_number` metadata are additive; existing and empty catalogues remain valid.
  The current catalogue has no explicit albums, so the real album view explains
  this instead of inventing album assignments or artwork attribution.
- Listening-first playlist detail, searchable/sortable library, manual and dynamic
  editors, add-to-playlist sheets, retained drafts, and shared SortableCollection
  integration with keyboard, hold/drag, cancellation and explicit move controls.
- Persistent contextual playback queue, desktop transport/seek/volume, mobile
  miniplayer and expanded player, lyrics, shuffle/repeat, queue removal/clearing,
  autoplay/error feedback, and player dismissal. Manual next advances even with
  repeat-one enabled. Provider failures do not trigger unlimited retry loops.
- The existing YouTube videos remain the media source. A visible video dock moves
  into the expanded player without remounting. Its viewport respects the
  [YouTube embed minimum](https://developers.google.com/youtube/iframe_api_reference#Requirements).

## Verification

- 26 frontend unit tests; 7 backend tests, including existing/empty catalogue
  compatibility and invalid album metadata. TypeScript/Vite production build.
- Shared agents checks: 68 browser tests passed, 2 documented WebKit skips.
- Chromium desktop (1440×1000) and emulated mobile (390×844): player transport,
  seek, volume/mute, automatic repeat versus manual next, shuffle, queue removal,
  autoplay-blocked feedback, lyrics, dismissal and persistent iframe across views.
  These deterministic checks use a YouTube API test double, not audio playback.
- A separate real YouTube smoke check loaded the first catalogue video and its
  playhead advanced to 13 seconds. No application page errors; aborted YouTube
  telemetry requests were observed. Audible output and physical mobile playback
  were not verified.
- Isolated development API: create/save manual playlist, reorder with keyboard and
  buttons, cancel keyboard drag without data changes, preserve/reopen drafts,
  convert to dynamic list with blank query, invalid-query validation, library search
  and global playlist search. Test playlists were removed from dev data.
- Intercepted catalogue fixtures: same album title under different artists,
  album track order, artist songs/discography, search/filter state and nested dialog
  focus restoration. No fixture records were written to production.
- Responsive layout and keyboard tab focus checked at 320, 390, 768, 1024 and
  1440px. Synthetic browser touch evidence does not establish native-device parity.

[Desktop](music-library/desktop.png) · [Mobile song list](music-library/mobile.png) ·
[Album page using an explicitly labelled test fixture](music-library/album-fixture.png).

Production song and playlist records are preserved. Backups precede the additive
schema update and normal delivery; no production restore is performed.
