// The phonograph's data layer: everything it reads from / does to the Spotify client, in one place, so the UI never
// touches Spicetify directly. All of it was probed live on Spotify 1.3.4 (see ../../README.md).
(() => {
  "use strict";
  const EF = (window.EF = window.EF || {});
  const S = () => window.Spicetify;

  // spotify:image:<id> / spotify:mosaic:a:b:c:d / https -> a loadable URL
  function img(u, size = 300) {
    if (!u) return "";
    if (u.startsWith("spotify:image:")) return "https://i.scdn.co/image/" + u.slice(14);
    // mosaic = the four album image ids run together (no separators)
    if (u.startsWith("spotify:mosaic:")) return "https://mosaic.scdn.co/" + size + "/" + u.slice(15).split(":").join("");
    return u;
  }
  const id = (uri) => (uri || "").split(":").pop();
  const mmss = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };

  // a queue / player track (contextTrack metadata) -> the deck's shape
  function fromMeta(uri, md) {
    md = md || {};
    return {
      uri,
      title: md.title || "",
      artist: md.artist_name || "",
      album: md.album_title || "",
      albumUri: md.album_uri || "",
      cover: img(md.image_xlarge_url || md.image_large_url || md.image_url, 640),
      ms: +md.duration || 0,
    };
  }

  const sp = {
    img,
    mmss,
    now() {
      const it = S().Player.data?.item;
      return it ? fromMeta(it.uri, it.metadata) : null;
    },
    prev() {
      const p = S().Queue?.prevTracks || [];
      const t = p[p.length - 1];
      return t ? fromMeta(t.contextTrack.uri, t.contextTrack.metadata) : null;
    },
    next(n = 2) {
      return (S().Queue?.nextTracks || [])
        .filter((t) => t.contextTrack?.metadata?.title && !t.contextTrack.uri.startsWith("spotify:delimiter"))
        .slice(0, n)
        .map((t) => fromMeta(t.contextTrack.uri, t.contextTrack.metadata));
    },
    queueDepth() {
      return { prev: (S().Queue?.prevTracks || []).length, next: (S().Queue?.nextTracks || []).length };
    },
    contextUri() {
      const d = S().Player.data;
      return d?.context?.uri || d?.context_uri || "";
    },

    // the cover's main colour, as Spotify extracted it ("#4D8162"); "" if unknown
    async color(albumUri) {
      if (!albumUri) return "";
      try {
        const G = S().GraphQL;
        const r = await G.Request(G.Definitions.fetchExtractedColorForAlbumEntity, { uri: albumUri });
        return r.data?.albumUnion?.coverArt?.extractedColors?.colorDark?.hex || "";
      } catch (e) {
        return "";
      }
    },

    // synced lyrics: [{ms, text}] or [] (instrumental / none)
    async lyrics(uri) {
      try {
        const r = await S().CosmosAsync.get(
          "https://spclient.wg.spotify.com/color-lyrics/v2/track/" + id(uri) + "?format=json&vocalRemoval=false&market=from_token");
        const lines = r?.lyrics?.lines || [];
        const synced = r?.lyrics?.syncType === "LINE_SYNCED";
        return lines.filter((l) => l.words && l.words !== "♪").map((l, i) => ({ ms: synced ? +l.startTimeMs : i * 1e9, text: l.words }));
      } catch (e) {
        return [];
      }
    },

    // the library as the strip shows it: Liked Songs first, then playlists (folders flattened)
    async playlists() {
      const out = [{ uri: "spotify:collection:tracks", name: "Liked Songs", cover: "", liked: true }];
      const walk = (items) => {
        for (const p of items || []) {
          if (p.type === "folder") walk(p.items);
          else if (p.type === "playlist") out.push({ uri: p.uri, name: p.name, cover: img(p.images?.[0]?.url) });
        }
      };
      walk((await S().Platform.RootlistAPI.getContents()).items);
      return out;
    },
    // the rootlist arrives without images; metadata has them (mosaics for user playlists)
    async cover(uri) {
      try {
        const m = await S().Platform.PlaylistAPI.getMetadata(uri);
        return img(m.images?.[0]?.url);
      } catch (e) {
        return "";
      }
    },

    // a context's tracks -> rows {uri, title, artist, added, ms, ctx}
    async tracks(uri) {
      const rows = [];
      let name = "";
      if (uri === "spotify:collection:tracks") {
        name = "Liked Songs";
        const r = await S().Platform.LibraryAPI.getTracks({ limit: 2000, offset: 0 });
        for (const t of r.items || [])
          rows.push({ uri: t.uri, title: t.name, artist: (t.artists || []).map((a) => a.name).join(", "),
            added: (t.addedAt || "").slice(0, 10), ms: t.duration?.milliseconds || 0 });
      } else if (uri.startsWith("spotify:playlist:")) {
        const [meta, c] = await Promise.all([S().Platform.PlaylistAPI.getMetadata(uri),
          S().Platform.PlaylistAPI.getContents(uri, { limit: 2000, offset: 0 })]);
        name = meta?.name || "";
        for (const t of c.items || [])
          if (t.type === "track" || t.type === "episode")
            rows.push({ uri: t.uri, title: t.name, artist: (t.artists || []).map((a) => a.name).join(", ") || t.album?.artist?.name || "",
              added: (t.addedAt || "").slice(0, 10), ms: t.duration?.milliseconds || 0 });
      } else if (uri.startsWith("spotify:artist:")) {
        // an artist opens like a playlist (Mario): top tracks (playable in the artist's context), then the albums
        const G = S().GraphQL;
        const r = await G.Request(G.Definitions.queryArtistOverview, { uri, locale: "", includePrerelease: false });
        const a = r.data?.artistUnion;
        name = a?.profile?.name || "";
        for (const it of a?.discography?.topTracks?.items || []) {
          const t = it.track;
          rows.push({ uri: t.uri, title: t.name, artist: (t.artists?.items || []).map((x) => x.profile?.name).join(", "),
            added: "TOP TRACK", ms: t.duration?.totalMilliseconds || 0 });
        }
        rows.forEach((r) => (r.ctx = uri));
        for (const it of a?.discography?.albums?.items || []) {
          const al = it.releases?.items?.[0];
          if (al?.uri) rows.push({ uri: al.uri, title: al.name, artist: name, added: "ALBUM " + (al.date?.year || ""), open: true });
        }
        return { name, rows };
      } else if (uri.startsWith("spotify:album:")) {
        const G = S().GraphQL;
        const r = await G.Request(G.Definitions.getAlbum, { uri, locale: "", offset: 0, limit: 300 });
        const a = r.data?.albumUnion;
        name = a?.name || "";
        const date = (a?.date?.isoString || "").slice(0, 10);
        for (const it of a?.tracksV2?.items || a?.tracks?.items || []) {
          const t = it.track;
          rows.push({ uri: t.uri, title: t.name, artist: (t.artists?.items || []).map((x) => x.profile?.name).join(", "),
            added: date, ms: t.duration?.totalMilliseconds || 0 });
        }
      }
      rows.forEach((r) => (r.ctx = uri));
      return { name, rows };
    },

    // search: Spotify's own search query (the old searchDesktop is gone in 1.3) -> mixed rows
    async search(q) {
      const G = S().GraphQL;
      const r = await G.Request(G.Definitions.searchModalResults, { searchTerm: q, offset: 0, limit: 30, numberOfTopResults: 30,
        includeAudiobooks: false, includeAuthors: false, includePreReleases: false });
      const rows = [];
      for (const x of r.data?.searchV2?.topResultsV2?.itemsV2 || []) {
        const d = x.item?.data;
        if (!d?.uri) continue;
        const kind = d.__typename;
        if (kind === "Track")
          rows.push({ uri: d.uri, title: d.name, artist: (d.artists?.items || []).map((a) => a.profile?.name).join(", "),
            added: "TRACK", ms: d.duration?.totalMilliseconds || 0, ctx: "" });
        else if (kind === "Album")
          rows.push({ uri: d.uri, title: d.name, artist: (d.artists?.items || []).map((a) => a.profile?.name).join(", "),
            added: "ALBUM", open: true });
        else if (kind === "Artist")
          rows.push({ uri: d.uri, title: d.profile?.name || "", artist: "", added: "ARTIST", open: true });
        else if (kind === "Playlist")
          rows.push({ uri: d.uri, title: d.name, artist: d.ownerV2?.data?.name || "", added: "PLAYLIST", open: true });
      }
      return rows;
    },

    // playing: a track inside its context (playlist / album / liked) or on its own
    play(row) {
      const P = S().Player;
      if (row.ctx) P.playUri(row.ctx, {}, { skipTo: { uri: row.uri } });
      else P.playUri(row.uri);
    },
    toggle: () => S().Player.togglePlay(),
    back: () => S().Player.back(),
    skip: () => S().Player.next(),
    playing: () => S().Player.isPlaying(),
    progress: () => S().Player.getProgress(),
    duration: () => S().Player.getDuration(),
    seek: (ms) => S().Player.seek(ms),
    shuffle: () => S().Player.getShuffle(),
    toggleShuffle: () => S().Player.toggleShuffle(),
    repeat: () => S().Player.getRepeat(), // 0 off, 1 context, 2 track
    toggleRepeat: () => S().Player.toggleRepeat(),
    volume: () => S().Player.getVolume(),
    setVolume: (v) => S().Player.setVolume(v),
    // Spotify Connect: [{id, name, type, active, local}]; transfer plays on that device
    devices() {
      const st = S().Platform.ConnectAPI.state || {};
      return (st.devices || []).map((d) => ({ id: d.id, name: d.name, type: d.type, active: d.isActive, local: d.isLocal }));
    },
    transfer(d) {
      const C = S().Platform.ConnectAPI;
      return d.local ? C.pullToLocal() : C.transferPlayback(d.id, {});
    },
    on: (ev, fn) => S().Player.addEventListener(ev, fn),
    off: (ev, fn) => S().Player.removeEventListener(ev, fn),
  };

  EF.spotify = sp;
})();
