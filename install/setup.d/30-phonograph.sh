#!/bin/bash
# phonograph's per-user settings (see clockmost-desktop-setup): the spectrum relay clockmost-shell's MEDIA tab reads.
# The Spotify skin is gone (2026-11-11, Mario: "remove the skins"); this also takes our old launcher override back out.
set -eu

systemctl --user enable --now phonograph-audio.service >/dev/null 2>&1 && echo "   phonograph-audio running"

# older versions put a spotify-launcher.desktop override in ~/.local/share/applications (launches went through
# spotify-refresh, which is gone now) - remove it if it's ours, so Spotify's own entry is back
o="$HOME/.local/share/applications/spotify-launcher.desktop"
if [ -e "$o" ] && grep -qs spotify-refresh "$o"; then
    rm -f "$o"
    kbuildsycoca6 >/dev/null 2>&1 || true
    echo "   Spotify: our old launcher override removed (Spotify's own entry is back)"
fi
# a Spicetify skin applied by an older version stays on Spotify until `spicetify restore` (or a Spotify update)
