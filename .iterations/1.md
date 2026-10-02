I want a complete re-design of this we app.

I want the technology to be used to be vite with typescript and react, as the frontend, and fastapi as the python backend.

I want the song database to be written in yaml, and to be human readable. You can compose the yaml files however you want, e.g. perhaps we should have only one yaml file, one master file, which point to different directories, where we have different files per Artist, or Producer, or Universe... Or perhaps it's easier to just have a flat list of all songs, and then we add metadata, so we can combine things in the app. Now when I think about it, let's used start with one yaml file, and a schema file so that we can valdiate our yaml.

The website should be in english, since It's easier for me to express searches, and words for the design aspect in english. But many songs will be in swedish, so we need to support swedish for labels, titles etc.

The Lyrics will be written in the lyrics field, and we have a separate description field for the song. Both of these fields are optional, but at least a title, and a video link or a lyric field is needed, according to the schema. I want to be able to modify the yaml whenever I want, an on page reload, or some other fetch event, the modified yaml is loaded, using the schema to validate it, and we can accept that the yaml format is wrong, and in that case, we just write on thr website that the song database couldn't be loaded due to invalid format, or something similar. If you can show the schema validation error, please do so in the web app.

I want the website to be very succint, with no unnecessary help text or elements, just the necessary pages and views.

Each page has a main content element that spans the whole verticle and horizontal space, except for a footer, which is the page navigation menu. In the home page to the left in the menu, we show a search bar at the top, which accepts normal substring search, accross all fields, but also support jira like SQL, e.g. artist = "Astrid Lindgren" AND universe ~= pippi, where spaces for operators are optional, but values need to be surrounded by double quotation marks. And you saw me using the similar operator, ~, and we can use in, as universe in ("Pippi Långstrump", Emil i Lönneberga), and we can use parentheses to group things, and we also have OR. And the fiels available and the possible operations for them is derived from the yaml schema.

When we search for song, we can view songs in either a table or as cards. In the top right, next to the search bar, we can toggle table vs card.

When clicking a song title in the table, you jump to another page, the Song page, where you see the song artcle created from the yaml entry, with descrpyion and lyrics being rendered as markdown, and the video link is embedded above the lyrics. You can assume that all video links are youtube links.

In the song page, if no song is selected, there is just a list of all songs, in a recycle list container. when a song is selected, we enter the song view, and in the top left corner, we have a back arrow, just like in iphone, to go babk to the song list view.

The third page should be playlist composer, where you can browse created playlists, create, modify and delete playlists. When you hit play on a playlist, you jump to the fourth page, where we have our own video playlist player, which plays all youtube videos one after each other, where single repeat, list repeat, and shuffle is supported. We also have play/pause, previous, next, and we should be able to seek in the video, and double tap i the left and right of the video to move back 10 sec vs forward 30 sec, or whatever is the default. Perhaps this feature is hard, due to youtube having comercials, and we don't know the song length, but if you can derive the song length and elapsed time, you should be able to automatically switch to the next song. When in the song view, clicking the youtube video will just play the youtube video from that place, without using our own player, or whatever you think is simnplest.

To test thing out, you can just invent your own song, or take somthing from the public domain, like Mozart.

Playlists can we composed either from the yaml, or from the website, so you need to treat that wile as a file database.

We don't need user accounts, since this is a hobby self hosted project, for 2 people to usr via tailscale.

## Implementation notes

- Implemented as a Vite/React/TypeScript single-page client in `frontend/`, served by FastAPI in `backend/`.
- `data/songs.yaml` is validated against `data/songs.schema.yaml` on every catalogue fetch; errors are returned to and rendered by the client.
- `data/playlists.yaml` is the shared file database for manually authored and UI-created playlists. API writes are atomic.
- Searchable fields come from the schema. Structured search supports `=`, `~=`, `in`, `AND`, `OR`, quoted values, and grouped expressions.
- YouTube playback uses the IFrame Player API. The player skips lyrics-only songs, advances on the ended event, and supports seek, previous/next, shuffle, and one/list repeat.
- Sample lyrics are public-domain or original; no copyrighted lyrics or recordings are stored.
