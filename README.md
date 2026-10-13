# Phonograph — Spotify skin (Spicetify theme "Endfield")

A Spicetify theme approximating the approved phonograph mockup
(`ref/mocks/components/ds-spotify-v2.html`, house style `ref/mocks/components/ds-shell.css`,
rules `ref/mocks/orders/STYLE.md`). Dark ground `#0F0F10`, fixed light-lavender accent `#CFC6F4`,
playlist rows like the mock's list panel, mono labels everywhere small.

**Spotify's layout is NOT the mockup's layout.** Everything here restyles; nothing restructures.
Where the mockup shows something the real app cannot do, it is listed under **Could not match**
below instead of being faked with invented settings.

> **Accent caveat (read this first):** in the mockup the lavender accent *follows the album art*
> (the featured slab is tinted per album: `#e8e2fa → #d3c7f3 → #b6a8e8`, hue-rotated per album).
> Spicetify `color.ini` is static per scheme and cannot sample album art, so the accent here is the
> fixed house lavender `#CFC6F4`. The only art-following colour Spotify does natively is the
> playlist-page header gradient, which comes from Spotify itself and is not themed.

## Files and where they install

| File | Installs to (Linux, this machine) |
|---|---|
| `Endfield/color.ini` | `~/.config/spicetify/Themes/Endfield/color.ini` |
| `Endfield/user.css` | `~/.config/spicetify/Themes/Endfield/user.css` |
| `README.md` | stays with the skin (this folder) — not installed |

Target: CachyOS (Arch), KDE Plasma 6.8, Wayland. Spotify + Spicetify paths on Arch are the same
standard `~/.config/spicetify/` tree (Spicetify CLI, not Marketplace). The theme folder name must
be exactly `Endfield` (that is the theme name).

## Apply / reload

```sh
# one-time install of the theme files
mkdir -p ~/.config/spicetify/Themes/Endfield
cp color.ini user.css ~/.config/spicetify/Themes/Endfield/

# select it (scheme name = the section name in color.ini)
spicetify config current_theme Endfield color_scheme Endfield

# first time on a machine (backs up Spotify, injects the theme)
spicetify backup apply

# after every later edit of color.ini / user.css
spicetify apply
```

- `spicetify apply` is the reload: no need to restart Spotify.
- After a Spotify update run `spicetify backup apply` again (the update restores stock files).
- If the theme does not show up, check the folder is `Themes/Endfield` and the section in
  `color.ini` is `[Endfield]`.

## Fonts needed (install separately — no downloads here)

| Role | Font (suggested) | Used for | Stack fallback |
|---|---|---|---|
| mono | **JetBrains Mono** | titles/labels/micro print, all metadata, timers, search | Consolas, Cascadia Mono |
| body | **Inter** | track titles, track names, descriptions | Segoe UI, system-ui |

On Arch: `ttf-jetbrains-mono` (official repos) and Inter (`inter-font` in the AUR, or the upstream
release). Without them the stacks fall back to Consolas/Segoe-like fonts and the look shifts.
These are the real-app stand-ins for the mockup's `Consolas` / `Segoe UI` (`ds-shell.css`
`--mono` / `--body`), per the order.

## Mapping table (mockup element → real setting)

Colors are exact mockup/house hex.

| Mockup element | Mockup value | Real setting |
|---|---|---|
| Page ground | `#0F0F10` | `color.ini` `main` = `#0F0F10`; `user.css` `body` |
| List panel gradient | `rgba(23,24,28,.93) → rgba(14,15,18,.95)` over ground + 48px top highlight `rgba(255,255,255,.05)` | `user.css` `.Root__main-view` background stack (exact mock recipe) |
| Panel dotted bottom edge | 9px dot grid `rgba(255,255,255,.13)`, 14px, fade up | `user.css` `.Root__main-view::after` |
| Now-playing bar | 96px, `linear-gradient(180deg,#151619,#0C0C0E)`, top hairline `rgba(255,255,255,.08)` | `color.ini` `player` = `#0C0C0E` (solid base); `user.css` `.main-nowPlayingBar-nowPlayingBar` (exact gradient + border-top) |
| Faint visualizer as bar top edge | 72 bars, fill `rgba(214,204,255,.22)`, animated, glow | `user.css` playbar `::before` — **static** 3-strip bar skyline, same fill hex, **no glow** (see "Could not match") |
| Black timer tag (pause + `00:08 / 02:02`) | `#000` tag, 13px mono ls .08em | Time text styled mono 13px ls .08em (`user.css` `.playback-bar__progress-time`); the tag itself could not be matched |
| Bar title / sub | 600 17px Segoe ink / 12px mono ls .12em `#7D8089` | `user.css` `.main-trackInfo-name` / `.main-trackInfo-artists` → Inter 17px 600 / JetBrains Mono 12px |
| Light pill (`Current Room Vinyl`, sort pill) | `#E8E9EE` bg, `#111`, 600 12px mono ls .14em, radius 20px | `color.ini` `button` = `#E8E9EE`; `user.css` `.main-dropDown-dropDown` (sort dropdown gets the pill look) |
| Transport icons | ink `#F1F1F4`, 22px, centre 30px | `user.css` `.player-controls__buttons` |
| Big play control | (mock shows glyphs only) | `user.css` `.main-playButton-PlayButton` → `#E8E9EE` plate `#111` glyph, hover `#FFFA00` |
| Volume slider | 4px track `rgba(255,255,255,.14)`, fill `#D6CCFF`, 12px **square** knob `#F1F1F4` | `user.css` `.progress-bar__bg/__fg/__slider` (shared by progress + volume) |
| Search field | 44px, 6px radius, `rgba(20,21,24,.55)`, border `rgba(255,255,255,.22)`, inset shadow, 13px mono ls .14em `#8A8E96` | `user.css` `[class*="searchInputInput"]` |
| Search prompt `›››` | `#FFFA00`, 700 | `user.css` `.x-searchInput-searchInput::before` (injected — see live checks) |
| Top title `PHONOGRAPH MKV-I` | 600 18px mono ls .2em, `MKV-I` in `#7D8089` | could not match (no text slot) — topbar forced to 86px + hairline only |
| Window buttons min/max/close | rule-18 glyphs in 30px plates, 6px radius | not Spotify — those are KDE decorations (KWin order S-kwin) |
| Track row title | 600 20px Segoe `#F1F1F4` | `user.css` `.main-trackList-rowTitle` → Inter 20px 600 |
| Track row artist | 13px mono ls .12em `#7D8089` | `user.css` `.main-trackList-rowSubTitle` / `.main-trackList-rowMeta` |
| Track row length | 16px mono `#F1F1F4` | `user.css` `.main-trackList-rowDuration` |
| Track row date added | 12px mono ls .1em `#7D8089` | falls out of `.main-trackList-rowColumn` default (column only exists when Spotify shows it) |
| Track row index `01` | 11px mono ls .12em `#55575E`, yellow when on | `user.css` `.main-trackList-rowMarker`; playing/selected → `#FFFA00` |
| Row rule | 1px `rgba(255,255,255,.08)`, row padding 16px | `user.css` `.main-trackList-trackListRow` |
| Selected row | bg `rgba(207,198,244,.12)` | `color.ini` `selected-row` = `#2D2D36` (that wash flattened over panel mid `#17181C` — `color.ini` takes no alpha); `user.css` re-applies the exact rgba wash on selected rows |
| Hover row | (mock lightens minis) | `user.css` row hover `#26282D` (`--field`) |
| Sidebar labels (`PREVIOUS`, `UP NEXT`) | 11px mono ls .22em `#55575E` | `user.css` library/nav labels |
| Sidebar item names (`Liked Songs`…) | 12px mono ls .1em `#F1F1F4` | `user.css` library item names |
| Sidebar sub-line (artist in minis) | 11px mono ls .14em `#7D8089` | `user.css` library sub-titles |
| Mini underbar | `rgba(207,198,244,.95)` fade 3px | could not match (needs a bar under every cover — no per-row bar slot; covers are Spotify's) |
| Chamfered covers (TR/BL cut, 10px) | `clip-path` polygon | `user.css` on the now-playing cover only (grid/sidebar covers left square — see live checks) |
| Feature title 36px / artist ls .24em / description 17px rgba ink .52 | `.fext` block | `user.css` `.main-entityHeader-*` (playlist page header) |
| Light-surface slab lavender wash | `#e8e2fa→#b6a8e8` etc. | not themed — only exists in the mock's left deck (see below) |
| Micro print (`42ms UID: 6349456094`, barcodes) | 9px mono ls .16em `#55575E` | playbar `::after` carries the exact mock string; barcodes/rulers skipped |
| Corner brackets / tick ruler on panel | 2px `rgba(241,241,244,.22)` L-brackets, 9px tick ruler | could not match (furniture needs the mock's 660px panel box; the real main view is full-bleed) |
| Focus / active | `#FFFA00` structural yellow | `color.ini` `button-active`, `notification` uses `#FF9E2C` (house notify diamond), `notification-error` = `#D91E36` |
| Accent | lavender follows album art | `color.ini` `accent` = `#CFC6F4` (fixed — see caveat at top) |
| Scrollbars | (house palette) | `user.css` webkit scrollbar: `#33363C` thumb, square |
| Avatars | circles (house rule) | `user.css` user-widget avatar `border-radius: 50%` |

## Could not match (honest list)

1. **Accent following album art** — the mock's slab/art tint is per-album (hue-rotated topo art,
   `#e8e2fa→#b6a8e8` gradient). Spicetify cannot read the playing art for colours; the scheme is a
   fixed lavender `#CFC6F4`. (Spotify's own playlist-header gradient still shifts with art; that is
   stock behaviour, not ours.)
2. **Left album deck** (prev mini, 400px featured album slab with topo art, up-next minis, lyric
   lines with yellow marker bar, tri-band foot) — this is a custom panel that does not exist in
   Spotify. Rebuilding it would be restructuring the app (and needs Spicetify CustomApps/JS).
   Skipped entirely; only the typography of titles/artists/descriptions is mapped onto Spotify's
   own playlist header.
3. **Lyric lines block** (`Oh please don't let me go…` with the yellow 3px marker) — Spotify's
   lyrics are a separate right-side panel with its own DOM; not restyled to the mock's block.
4. **Animated visualizer** as the bar's top edge — a theme is CSS only: no audio access, and the
   house rules say no glows (the mock's viz uses `shadowBlur`). Replaced by a **static** lavender
   bar skyline in the same fill colour (`rgba(214,204,255,.22)`).
5. **Black timer tag on the seam** (clip-path tag with pause bars + `00:08 / 02:02`) — Spotify's
   time sits inside the playback bar and there is no seam tag to style. Time text is restyled mono;
   the tag shape is dropped.
6. **Top-bar text `PHONOGRAPH MKV-I`** — Spotify's top bar has nav/search/upgrade/user slots and no
   title text node to recolour. Cannot be added by CSS without covering real controls. (Window
   buttons in the mock are KDE's — see the KWin skin order.)
7. **Sort pill label `SORT BY ▾`** — Spotify's sort dropdown has its own fixed text (`Custom order`,
   `Title`…). Only the light-pill look (`#E8E9EE`, mono, 20px radius) is applied.
8. **Playlist/folder strip** (88px chamfered covers row at the top of the list panel) — mock-only
   furniture; Spotify has filter chips / card shelves in different places.
9. **Panel furniture**: corner brackets (TL/BR), tick ruler, barcodes, micro readouts
   (`RL-08 · 08 TRACKS · 32:27`, `LP-02 · A3 · 00.101`) — they need the mock's fixed 660px panel
   box; the real main view is a full-bleed scroll area, so they would land wrong. Only the dotted
   bottom edge and the playbar micro line were kept.
10. **Tri-band stripe** (`#FFFA00 / #21E6E6 / #E621C8`, once per screen) — no natural slot in the
    real UI (mock has it at the deck foot). Skipped rather than stuck on at random.
11. **Two-line rows** (title over artist in one column) — Spotify's track list is columnar
    (title | album | date | duration). Rows are restyled per-column instead; title is 20px, so rows
    will be taller than stock Spotify.
12. **`Current Room Vinyl` pill** (bottom right of the bar) — mock-only control, no real equivalent
    (Spotify has icon buttons there).
13. **Motion** (entrance fade-slides, album swap, ambient breathe) — Spicetify themes are CSS
    (plus optional JS); house rules for skins say static. Real app motion unchanged.
14. **Chamfer on grid/sidebar covers** — only the now-playing cover is chamfered; the rest use
    Spotify's own rounded image containers and varying class names (kept square-ish 2px where a
    card selector matched).
15. **`42ms UID: 6349456094`** is kept as static texture on the bar (the mock's exact string); it is
    not real telemetry.

## Needs a live check (I cannot see the running app)

- **Every selector name**: Spotify's DOM class names shift between versions. Rules that silently do
  nothing after an update just need the new class name swapped in — check with devtools
  (Spicetify: `spicetify enable-devtools`). Especially fragile families:
  `[class*="searchInputInput"]`, `.x-searchInput-searchInput::before` (the `›››` prompt),
  `.main-trackList-rowSubTitle` / `.main-trackList-rowMeta` / `.main-trackList-rowDuration`,
  `.main-yourLibraryX-*`, `[class*="dropDown"]` (may over-match — narrow it if it pills something
  it should not), `[class*="coverArt"]`.
- `color.ini` keys `accent` and `highlight` need a Spicetify new enough to know them (they are in
  the current docs); if the CLI errors on them, delete those two lines — `user.css` carries the look.
- Playbar micro line vs. the cover/title block at `left: 28px; bottom: 6px` — may collide at small
  window widths; nudge or delete the `::after` rule if so.
- The static visualizer strip sits 18px above the bar edge and may overlap the bottom of the track
  list; it is `pointer-events: none`, but check it does not look wrong on the queue page.
- Row heights with 20px titles; sidebar label treatment on the new Your Library layout (icons,
  collapsed mode).
- `selected-row` flattened hex `#2D2D36` vs the exact `rgba(207,198,244,.12)` (user.css paints the
  exact wash on track rows; the flattened value shows wherever Spicetify paints rows from the
  scheme alone).

## Syntax checks done

- `color.ini`: structural check via grep — one `[Endfield]` section, 17 key lines, every value
  matches `#RRGGBB`, nothing else outside comments. (Python `configparser` was requested by the
  work order but `python3` is blocked in the build sandbox, so no interpreter-level parse ran.)
- `user.css`: braces balanced (54/54) and comment markers paired (39/39) via grep/wc. No CSS
  validator is installed here; selector names need the live check above.
