# Spotify = the phonograph (ds-spotify-v2)

The official Spotify client (spotify-launcher; installs under ~/.local/share/spotify-launcher, user-writable) +
Spicetify. Our phonograph (the mock's markup + CSS, live) is a Spicetify **extension** that mounts over the whole
window; the `clockmost` theme hides Spotify's own chrome. Scope (Mario 2026-10-14): login, playlists, search,
player, queue, lyrics, Connect devices - no social (friends, Jams, chat).

Layout (Mario): left = the deck (previous / featured card with synced lyrics / up next); right = every playlist as a
horizontal cover strip, and one list below it that shows what's playing (default), a playlist / album / artist you
opened (artists open like a playlist: top tracks, then albums), or search results; bottom = timer, track, transport,
devices, volume, and the visualizer strip which is also the seek bar.
Live touches beyond the static mock (Mario): the mock's violet takes the cover's main colour (every violet remapped as
hsl(cover hue + offset, sat x factor, the mock's lightness)); the background glows are drifting "fairy lights" that
dance to the music (bass swells the glows, each mote follows its own band); barcodes are generated from the
track / album / list name.
Spotify's own Settings: the gear top-right (or Ctrl+,) steps aside onto Spotify's settings page - the theme hides
Spotify's top bar, its only way in; "‹ PHONOGRAPH" (or Escape) comes back.

## Layout of this repo
- `phonograph/src/` - `core.js` + `phonograph.css` copied from the mock (unchanged), `live.css` (additions),
  `spotify.js` (data layer: every Spicetify call), `app.js` (the UI). `phonograph/build.py` bundles them into
  `Extensions/phonograph.js` (fonts mapped Consolas -> JetBrains Mono, Segoe UI -> Inter; SVGs inlined).
- `Themes/clockmost/` - hides Spotify's chrome.
- `audio-relay/` - `phonograph-audio` (Rust, the repo's one Cargo workspace member): cava (pulse input = what you hear) -> 48 bars over
  ws://127.0.0.1:47862, cava running only while a page is connected. User service `phonograph-audio.service`.

## Install (package: pkgs/phonograph, `[clockmost]` repo)

`pacman -S phonograph`, start Spotify once and log in, then `clockmost-desktop-setup` as your user (from
clockmost-shell): it enables `phonograph-audio` (user service), puts the `spotify-launcher.desktop` override in
`~/.local/share/applications` (launches go through `spotify-refresh`), installs Spicetify per-user if missing (upstream
installer -> `~/.local/bin`; not in Arch's repos, and it must be able to update itself), links the extension + theme
from `/usr/share/phonograph` into Spicetify's config, sets the config and applies. Package updates reach Spotify at its
next launch: `spotify-refresh` re-applies when `/usr/share/phonograph`'s files changed since the last apply.

## Data (probed live on Spotify 1.3.4.258 + Spicetify 2.45.3 - past its tested Linux range of 1.2.96)
now playing Player.data.item; prev/next Spicetify.Queue; queue PlayerAPI.getQueue; lyrics spclient color-lyrics/v2
(LINE_SYNCED); cover colour GraphQL fetchExtractedColorForAlbumEntity; playlists RootlistAPI + PlaylistAPI.getMetadata
(images; mosaic = mosaic.scdn.co/<size>/<4 ids joined>); playlist / album / artist contents PlaylistAPI.getContents,
GraphQL getAlbum, queryArtistOverview; liked LibraryAPI.getTracks; search GraphQL searchModalResults (searchDesktop is
gone in 1.3); devices ConnectAPI.state + transferPlayback / pullToLocal; play Player.playUri(ctx, {}, {skipTo}).
Dead: Spotify's audio-analysis (hence the cava relay), Spicetify.colorExtractor (returns null).

## Gotchas
- A custom app crashed Spotify's UI on some starts (Spicetify renders its nav links before React is ready on 1.3.4)
  - hence the extension.
- Spotify runs on XWayland: launching over ssh needs DISPLAY + XAUTHORITY. Prefs exist only after the first login.
- Updates are automatic (Mario 2026-10-14: "let it update", never touch Spicetify by hand): `spotify-refresh`
  (/usr/bin) runs at every launch via `spotify-launcher.desktop` (setup copies it to ~/.local/share/applications,
  overriding spotify-launcher's entry; the dock / drawer / menu all launch through it). It updates Spotify; fresh files (Apps/xpui.spa
  still packed) -> `spicetify -q -n update` (updates Spicetify AND re-applies; without -n it starts Spotify and the
  launch hangs), fallback `spicetify -n restore backup apply`. Still packed = Spicetify can't do this Spotify yet:
  starts bare (Mario: fine), one low notification per version, the next launch retries. Plain `backup apply` on fresh
  files refuses ("A backup is available ... restore first"). Costs ~20s on the first launch after an update. Log:
  `journalctl -t spotify-refresh`. Tested by `spotify-launcher --force-update --no-exec` (same version, fresh files). It also re-applies (`spicetify -n
  apply`) when `/usr/share/phonograph`'s files changed since the last apply (a phonograph package update).
- The "..." top-left is drawn natively by Spotify, not in the page - CSS can't hide it (left as is, Mario 2026-10-14).
- Dev loop (VM): `spot-debug` relaunches Spotify with --remote-debugging-port=9222; drive the page over CDP; hot
  deploy = copy the bundle into Apps/xpui/extensions/ + reload the page (playback keeps going).
