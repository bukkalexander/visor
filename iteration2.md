Can we make the song.yaml have the list of songs, without being inside the songs fiels, to make the document flatter?

I have added chords to lyrics, so can we render that as the chord being above that word, perhaps with a tooltip when clicked, that shows the guitar strings and the piano chord, if this is something that there already exist libraries for. If we need to encode the chords differently in markdown to support some chord parsing library, than please convert the notation to allow for that.

When playing songs in the playlist, we have some problems.
- When the current song is finished, the next song doesn't start playing automatically.
- Somethimes, the youtube play/pause gets out of sync of our playlist player play/pause.
For both these problems, I want you to carefully consider how to make this stable, and have a few safeguards, like timers/timeouts to valdiate the states, and reset to the correct state when possible.

I would like to be able to create playlists from the home page, so that I can select all rows that I want to be included. So I would like to click some button so enable selecting songs, and there should be some top selection box, which when clicked selects/deselects all songs. It should both be possible to add the songs to a new playlist, or to an already existing playlist.

Let's remove the card view, and focus on only making the table experience good. We would also have some left hamburger menu to filter and sort the table. You can look inside my other app, work/sidb, to see hoe we built the wine table for filtering and sorting, and it also has a card view, so if you can find a nice way of making similar cards for songs, you can actually keep the card view.

## Implementation notes

- `songs.yaml` is now a top-level list and the schema validates that flat shape directly.
- Chords use the existing ChordPro-style `[C]word` notation. They render above lyrics and open lightweight built-in guitar and piano diagrams without adding a large music dependency.
- The catalogue defaults to table view and borrows SIDB's filter-drawer pattern. Card view remains available, with selection supported in both layouts.
- Selection mode supports individual or all-visible selection and can add songs to a new or existing YAML-backed playlist.
- YouTube playback now keeps one player instance, treats player events as observed state, and tracks intended playback separately. Timed retries, periodic reconciliation, and a near-end fallback supplement the normal ended event so transitions recover from missed or delayed YouTube events.
