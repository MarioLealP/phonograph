#!/bin/bash
# phonograph's per-user settings (see clockmost-desktop-setup): Spicetify + the phonograph skin on Spotify.
set -eu
SKIN=/usr/share/phonograph
SPOTIFY="$HOME/.local/share/spotify-launcher/install/usr/share/spotify"
export PATH="$HOME/.local/bin:$PATH"

# the spectrum relay
systemctl --user enable --now phonograph-audio.service >/dev/null 2>&1 && echo "   phonograph-audio running"

# "spotify-skin" in ~/.config/clockmost/setup-off = plain Spotify: no launcher override, no Spicetify skin (the relay
# above stays - clockmost-shell's MEDIA tab uses it). It doesn't undo a skin already applied: `spicetify restore`.
if grep -qsx spotify-skin "${XDG_CONFIG_HOME:-$HOME/.config}/clockmost/setup-off"; then
    echo "   Spotify: skin off (setup-off) - left alone"
    exit 0
fi

# launches go through spotify-refresh (Spotify + Spicetify kept current) - this entry replaces the package's
install -Dm644 "$SKIN/spotify-launcher.desktop" "$HOME/.local/share/applications/spotify-launcher.desktop"
kbuildsycoca6 >/dev/null 2>&1 || true

# Spotify must have been installed + logged into once (its prefs file only exists after the first login)
if [ ! -f "$HOME/.config/spotify/prefs" ] || [ ! -d "$SPOTIFY" ]; then
    echo "   Spotify: start it once and log in, close it, then run clockmost-desktop-setup again"
    exit 0
fi

# Spicetify: a per-user install (not in Arch's repos; it updates itself - spotify-refresh relies on that)
if ! command -v spicetify >/dev/null; then
    echo "   installing Spicetify (upstream installer -> ~/.local/bin)"
    curl -fsSL https://raw.githubusercontent.com/spicetify/cli/main/install.sh | sh >/dev/null
    [ -x "$HOME/.spicetify/spicetify" ] && ln -sf "$HOME/.spicetify/spicetify" "$HOME/.local/bin/spicetify"
fi

# the skin, linked from the package (updates flow in; spotify-refresh re-applies when they change)
cfg=$(dirname "$(spicetify -c)")
mkdir -p "$cfg/Extensions" "$cfg/Themes"
ln -sfn "$SKIN/Extensions/phonograph.js" "$cfg/Extensions/phonograph.js"
if [ -d "$cfg/Themes/clockmost" ] && [ ! -L "$cfg/Themes/clockmost" ]; then
    mv "$cfg/Themes/clockmost" "$cfg/Themes/clockmost.bak-$(date +%Y%m%d%H%M)"
fi
ln -sfn "$SKIN/Themes/clockmost" "$cfg/Themes/clockmost"
spicetify config spotify_path "$SPOTIFY" prefs_path "$HOME/.config/spotify/prefs" \
    current_theme clockmost color_scheme clockmost inject_css 1 replace_colors 1 >/dev/null
spicetify config extensions phonograph.js >/dev/null 2>&1 || true   # already listed = fine

# apply now (same logic as every launch)
spotify-refresh && echo "   phonograph skin applied"
