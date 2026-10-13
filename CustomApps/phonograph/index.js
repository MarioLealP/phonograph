// Spike: can a custom app own the window and read now playing, queue and lyrics?
function render() {
  return Spicetify.React.createElement(Spike, null);
}

function Spike() {
  const R = Spicetify.React;
  const [state, setState] = R.useState({ track: null, queue: [], lyrics: null, err: [] });

  R.useEffect(() => {
    let alive = true;
    async function load() {
      const err = [];
      const item = Spicetify.Player.data?.item;
      let queue = [];
      try {
        const q = await Spicetify.Platform.PlayerAPI.getQueue();
        queue = (q.queued || []).concat(q.nextUp || []).slice(0, 8).map((t) => t.name || t.contextTrack?.metadata?.title);
      } catch (e) { err.push("queue: " + e); }
      let lyrics = null;
      if (item?.uri) {
        try {
          const id = item.uri.split(":")[2];
          const r = await Spicetify.CosmosAsync.get(
            `https://spclient.wg.spotify.com/color-lyrics/v2/track/${id}?format=json&vocalRemoval=false&market=from_token`);
          lyrics = (r.lyrics?.lines || []).slice(0, 6).map((l) => `${l.startTimeMs} ${l.words}`);
          if (!lyrics.length) lyrics = ["(no lines) syncType=" + r.lyrics?.syncType];
        } catch (e) { err.push("lyrics: " + e); }
      }
      if (alive) setState({ track: item, queue, lyrics, err });
    }
    load();
    Spicetify.Player.addEventListener("songchange", load);
    return () => { alive = false; Spicetify.Player.removeEventListener("songchange", load); };
  }, []);

  const h = R.createElement;
  const t = state.track;
  return h("div", { className: "phono-spike" },
    h("h1", null, "PHONOGRAPH SPIKE"),
    h("p", null, "now: " + (t ? `${t.name} — ${(t.artists || []).map((a) => a.name).join(", ")}` : "nothing playing")),
    h("h2", null, "queue"),
    h("ol", null, state.queue.map((n, i) => h("li", { key: i }, n))),
    h("h2", null, "lyrics"),
    h("pre", null, state.lyrics ? state.lyrics.join("\n") : "(none)"),
    state.err.length ? h("pre", { style: { color: "#d91e36" } }, state.err.join("\n")) : null);
}
