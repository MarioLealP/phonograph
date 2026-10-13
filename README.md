# Spotify = the phonograph (ds-spotify-v2)

Approach (Mario 2026-10-14): the official Spotify client (spotify-launcher, installs under
~/.local/share/spotify-launcher, user-writable) + Spicetify. Our own page (custom app `phonograph`) takes the
whole window; the theme hides Spotify's own chrome; `phonograph-home.js` routes startup / home to it.
Scope: login, playlists, search, now playing, queue, lyrics. No social (friends, Jams, chat).

Spike result (2026-10-14, Spotify 1.3.4.258, Spicetify 2.45.3 - past its tested Linux range of 1.2.96, works):
- takeover: Root__globalNav / nav-bar / now-playing-bar / right-sidebar hidden, main view = whole window
- now playing: Spicetify.Player.data.item
- queue: Spicetify.Platform.PlayerAPI.getQueue() (queued + nextUp)
- lyrics: CosmosAsync GET spclient color-lyrics/v2/track/<id> -> LINE_SYNCED lines with startTimeMs
- cover: item.metadata.image_xlarge_url (spotify:image:<id> -> https://i.scdn.co/image/<id>, 640x640)
- playlists: Spicetify.Platform.RootlistAPI.getContents().items

Install: spicetify config spotify_path ~/.local/share/spotify-launcher/install/usr/share/spotify
prefs_path ~/.config/spotify/prefs current_theme clockmost color_scheme clockmost custom_apps phonograph
extensions phonograph-home.js inject_css 1 replace_colors 1; spicetify backup apply.
Gotchas: Spotify runs on XWayland (needs DISPLAY + XAUTHORITY when launched over ssh); prefs only exist after
the first login; spotify-launcher auto-updates on launch (a new Spotify can break Spicetify until re-apply).
Debug: run spotify with --remote-debugging-port=9222 and drive it over CDP.
