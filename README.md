# phonograph - the audio relay

`phonograph-audio` (Rust, `audio-relay/`): cava reads what you hear (the default pulse/PipeWire monitor) and sends
48 bars over `ws://127.0.0.1:47862`; cava runs only while a page is connected. User service
`phonograph-audio.service`. clockmost-shell's MEDIA tab draws its spectrum from it.

Until 0.2.0 this repo was also the **Spotify skin** (a Spicetify extension + theme over the official client, with
`spotify-refresh` keeping it applied). Removed 2026-11-11 (Mario: "remove the skins"); the code is in git history
(tag v0.1.5). Setup now takes our old `spotify-launcher.desktop` override back out; an applied skin comes off Spotify
with `spicetify restore` (or at the next Spotify update).

## Install (package: pkgs/phonograph, `[clockmost]` repo)

`pacman -S phonograph`, then `clockmost-desktop-setup` as your user (from clockmost-shell): it enables
`phonograph-audio`. Dev: `just check` (= CI), `cargo build --release`. Release: `release.sh X.Y.Z` -> tag -> CI.
