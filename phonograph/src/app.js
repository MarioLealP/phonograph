// The phonograph, live: the mock's EF.phonograph (src/apps/phonograph.js, ported 1:1 from ds-spotify-v2) with its
// markup and motion kept, the sample data replaced by the Spotify client (EF.spotify). Layout per Mario 2026-10-14:
//   left    the deck - previous track, the featured card (cover, title, synced lyrics), up next
//   right   top: every playlist as a horizontal strip of covers (wheel scrolls it sideways)
//           below: ONE list - what's playing (default), a playlist / album you clicked, or search results;
//           click a track to play it in that context
//   top     search (Enter / typing searches into the list, Esc returns to what's playing)
//   bottom  timer, the lyric line, transport, volume; the visualizer strip doubles as the seek bar
// Mounted at 1920x1080 design size and zoomed to the window (the mock is fixed-pixel).
(() => {
  "use strict";
  const EF = (window.EF = window.EF || {});
  const sp = EF.spotify;
  const esc = EF.esc;
  const pad = (n) => String(n).padStart(2, "0");
  const clock = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return pad(Math.floor(s / 60)) + ":" + pad(s % 60);
  };
  // the mock's catalogue codes ("SR-1415"): two consonants of the artist + four digits from the uri
  const code = (artist, uri) => {
    const c = (artist || "XX").toUpperCase().replace(/[^A-Z]/g, "");
    const k = c.charAt(0) + ((c.slice(1).match(/[BCDFGHJKLMNPQRSTVWXZ]/) || [c.charAt(1) || "X"])[0]);
    let h = 0;
    for (const ch of uri || "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return k + "-" + pad(h % 10000).padStart(4, "0");
  };

  // a barcode from any text (Mario): seeded bar / gap runs, rendered as the mock's hard-stop gradient
  const hash = (t) => {
    let h = 2166136261;
    for (const ch of t || "") h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return h;
  };
  function barcode(text, width, color) {
    const r = EF.rng(hash(text));
    const stops = [];
    let x = 0;
    while (x < width) {
      const bar = 1 + Math.floor(r() * 3), gap = 1 + Math.floor(r() * 3);
      const e = Math.min(width, x + bar);
      stops.push(color + " " + x + "px " + e + "px", "transparent " + e + "px " + Math.min(width, e + gap) + "px");
      x = e + gap;
    }
    return "linear-gradient(90deg, " + stops.join(", ") + ")";
  }
  // "#4D8162" -> [hue deg, saturation 0..1]
  function hexHS(hex) {
    const n = parseInt((hex || "").slice(1), 16);
    if (!hex || isNaN(n)) return null;
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [254, 0];
    const sat = d / (1 - Math.abs(2 * l - 1));
    let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, sat];
  }

  function phonograph(ART) {
    const el = EF.D("ef-phonograph");
    const $ = (s) => el.querySelector(s);
    const $$ = (s) => [...el.querySelectorAll(s)];

    el.innerHTML =
      '<div class="bg-dot"></div><div class="bg-rings"></div><canvas class="bg-lights"></canvas>'
      + '<div class="top"><div class="title">PHONOGRAPH <span>MKV-I</span></div>'
      + '<label class="search"><b>›››</b><input class="q" spellcheck="false" placeholder="SEARCH"></label></div>'
      + '<div class="main">'
      + '<div class="col">'
      + '<div class="lblrow"><span class="lbl">PREVIOUS</span><i class="hr"></i><span class="micro2 qprev">QUEUE.00</span></div>'
      + '<div class="mini m-prev"></div>'
      + '<div class="feat"><div class="fslot"><div class="fcard">'
      + '<img class="cover" alt=""><img class="topo" src="' + ART + '" alt="">'
      + '<div class="dots"></div><div class="grain"></div><div class="scrim"></div><div class="barcode"></div>'
      + '<div class="mcode"></div>'
      + '</div></div><div class="fext">'
      + '<div class="tri"><div class="tri-in">'
      + '<svg viewBox="0 0 360 280" fill="none" stroke="rgba(241,241,244,.30)" stroke-width="1.5">'
      + '<path d="M14 84 L74 132 L14 180 Z"/><path d="M88 64 L162 132 L88 200 Z"/>'
      + '<path d="M158 44 L246 132 L158 220 Z"/><path d="M228 24 L330 132 L228 240 Z"/>'
      + '</svg></div></div>'
      + '<div class="ft"></div><div class="fa"></div><div class="frule"></div>'
      + '<div class="flyr"></div>'
      + '<div class="fbot"><span class="triband"><i></i><i></i><i></i></span><span class="barcode2"></span>'
      + '<span class="micro2 fmicro"></span></div>'
      + '</div></div>'
      + '<div class="lblrow"><span class="lbl">UP NEXT</span><i class="hr"></i><span class="micro2 qnext">0 TRACKS</span></div>'
      + '<div class="mini m-next1"></div>'
      + '<div class="mini small m-next2"></div>'
      + '</div>'
      + '<div class="list"><div class="pmark"><i class="bk tl"></i><i class="bk br"></i><div class="ruler"></div>'
      + '<div class="mb"></div><div class="mc lreadout"></div></div>'
      + '<div class="strip"></div>'
      + '<div class="lhead"><span class="lmode"></span><span class="lname"></span><b class="lback" title="Back to what\'s playing">×</b>'
      + '<label class="sort">SORT BY'
      + '<span class="pill-sel"><select><option value="">Default</option>'
      + '<option value="added:-1">Date added · newest</option><option value="added:1">Date added · oldest</option>'
      + '<option value="title:1">Title · A–Z</option><option value="title:-1">Title · Z–A</option>'
      + '<option value="artist:1">Artist · A–Z</option><option value="artist:-1">Artist · Z–A</option>'
      + '<option value="ms:1">Length · shortest</option><option value="ms:-1">Length · longest</option></select><b>▾</b></span>'
      + '</label></div>'
      + '<div class="rows"></div></div>'
      + '</div>'
      + '<div class="bar"><canvas class="viz"></canvas>'
      + '<div class="timer"><span class="pp"><i></i><i></i></span><span class="tm">00:00 / 00:00</span></div>'
      + '<div class="ctrls">'
      + '<svg class="shuf" viewBox="0 0 24 24"><path d="M3 6h3l9 12h3M3 18h3l9-12h3M15 6h6M18 3l3 3-3 3M18 15l3 3-3 3"/></svg>'
      + '<svg class="fill prev" viewBox="0 0 24 24"><path d="M6 5h2v14H6zM19 5 9 12l10 7z"/></svg>'
      + '<svg class="fill big play" viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>'
      + '<svg class="fill next" viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM5 5l10 7-10 7z"/></svg>'
      + '<svg class="rep" viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 4v5h-5M4 20v-5h5"/></svg>'
      + '</div>'
      + '<div class="vol">'
      + '<svg class="device" viewBox="0 0 24 24" aria-label="Devices"><rect x="3" y="4" width="13" height="10" rx="1"/><path d="M7 20h5M9.5 14v6"/><rect x="18" y="8" width="4" height="10" rx="1"/></svg>'
      + '<svg class="spk" viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>'
      + '<input type="range" min="0" max="100" value="70" aria-label="Volume">'
      + '</div>'
      + '<div class="devs"><div class="dh">PLAYING ON</div><div class="dl"></div></div>'
      + '</div>'
      + '<div class="bg-hatch"></div>';

    /* ---- handles ---- */
    const fcard = $(".fcard"), fext = $(".fext");
    const cover = fcard.querySelector(".cover");
    const ftitle = fext.querySelector(".ft"), fartist = fext.querySelector(".fa"), frule = fext.querySelector(".frule");
    const flyr = fext.querySelector(".flyr"), ftri = fext.querySelector(".tri"), fbot = fext.querySelector(".fbot");
    const fmcode = fcard.querySelector(".mcode"), fbarcode = fcard.querySelector(".barcode");
    const mPrev = $(".m-prev"), mNext1 = $(".m-next1"), mNext2 = $(".m-next2");
    const rowsEl = $(".rows"), strip = $(".strip"), q = $(".q"), sortSel = $(".sort select");
    const timeEl = $(".tm"), vol = $(".vol input");

    /* ---- the mock's motion helpers, unchanged ---- */
    const wait = (ms, fn) => setTimeout(fn, ms * EF.SLOW);
    const tween = (dur, ease, step) => EF.tween(dur, (e) => step(ease(e / dur), e / dur));
    const SNAP = EF.SNAP, SETTLE = EF.SETTLE;
    function enterAt(elm, dx, dy, delay) {
      elm.style.opacity = "0";
      elm.style.transform = "translate(" + dx + "px, " + dy + "px)";
      wait(delay, () => tween(280, SETTLE, (v) => {
        elm.style.opacity = String(0.25 + 0.75 * v);
        elm.style.transform = "translate(" + dx * (1 - v) + "px, " + dy * (1 - v) + "px)";
      }));
    }
    function detail(elm, delay) {
      elm.style.opacity = "0";
      wait(delay, () => tween(600, SETTLE, (v) => { elm.style.opacity = String(v); }));
    }
    const leaveAt = (elm) => tween(120, SNAP, (v) => { elm.style.opacity = String(1 - v); });
    const FINE = [fbarcode, fmcode, ftri, fbot];

    /* ---- accent: the mock's violet takes the cover's main colour (Mario). Every violet in the CSS is
       hsl(var(--h) + its own hue offset, its saturation * var(--s), its exact lightness) - the mock's base hue is
       254. --h / --s ease toward the new cover over ~1.2s (shortest way round the hue circle). ---- */
    const acc = { h: 254, s: 1, th: 254, ts: 1 };
    async function retint(t) {
      const hs = hexHS(t ? await sp.color(t.albumUri) : "");
      if (!hs) return;
      acc.th = hs[0];
      acc.ts = Math.max(0.18, Math.min(1, hs[1] / 0.45)); // grey covers -> a quiet tint, not neon
    }
    function stepAccent(dt) {
      const k = 1 - Math.exp(-dt / 400);
      const dh = ((acc.th - acc.h + 540) % 360) - 180;
      acc.h = (acc.h + dh * k + 360) % 360;
      acc.s += (acc.ts - acc.s) * k;
      el.style.setProperty("--h", acc.h.toFixed(2));
      el.style.setProperty("--s", acc.s.toFixed(3));
    }
    const hsl = (dh, sat, l, a) => "hsla(" + (acc.h + dh).toFixed(1) + ", " + (sat * acc.s).toFixed(1) + "%, " + l + "%, " + a + ")";

    /* ---- the deck ---- */
    let now = null, lyrics = [], lyricIdx = -1;
    function miniHTML(t) {
      if (!t) return '<div class="tx"><div class="ms">—</div></div>';
      return '<div class="mc"><img src="' + esc(t.cover || ART) + '" alt=""></div>'
        + '<div class="tx"><div class="mt">' + esc(t.title) + '</div><div class="ms">' + esc(t.artist.toUpperCase()) + '</div>'
        + '<div class="mc2">' + esc(code(t.artist, t.uri) + " · " + clock(t.ms)) + '</div></div><div class="badge"></div>';
    }
    function renderLyrics(force) {
      const p = sp.progress();
      let i = -1;
      for (let k = 0; k < lyrics.length && lyrics[k].ms <= p + 150; k++) i = k;
      if (i === lyricIdx && !force) return;
      lyricIdx = i;
      if (!lyrics.length) {
        flyr.innerHTML = '<div class="cur dim">' + esc(now ? now.album : "") + '</div><div>INSTRUMENTAL · NO LYRICS</div>';
        return;
      }
      const at = Math.max(0, i);
      flyr.innerHTML = lyrics.slice(at, at + 3)
        .map((l, k) => '<div' + (k === 0 && i >= 0 ? ' class="cur"' : "") + '>' + esc(l.text) + '</div>').join("");
    }
    function renderDeck() {
      now = sp.now();
      const d = sp.queueDepth();
      $(".qprev").textContent = "QUEUE." + pad(Math.min(99, d.prev));
      const nx = sp.next(2);
      $(".qnext").textContent = nx.length + " TRACKS";
      mPrev.innerHTML = miniHTML(sp.prev());
      mNext1.innerHTML = miniHTML(nx[0]);
      mNext2.innerHTML = miniHTML(nx[1]);
      if (!now) {
        ftitle.textContent = "Nothing playing";
        fartist.textContent = "";
        flyr.innerHTML = "";
        cover.removeAttribute("src");
        return;
      }
      cover.src = now.cover;
      ftitle.textContent = now.title;
      // artist and album open in the list, like a playlist (Mario)
      fartist.innerHTML = '<a class="lnk ar">' + esc(now.artist.toUpperCase()) + '</a>'
        + (now.album ? '<i class="sep">·</i><a class="lnk al">' + esc(now.album.toUpperCase()) + '</a>' : "");
      fmcode.textContent = code(now.artist, now.uri) + " · 33 RPM · SIDE A";
      fbarcode.style.background = barcode(now.title, 116, "#f1f1f4");
      $(".barcode2").style.background = barcode(now.album || now.title, 84, "var(--acc-bc2)");
      $(".fmicro").textContent = "LP-" + pad(d.prev % 100) + " · " + clock(now.ms) + " · " + (now.album || "").toUpperCase().slice(0, 18);
      renderLyrics(true);
    }
    // a new track: the mock's swapTo (old fades in place, new fade-slides home)
    async function songChange() {
      const out = [cover, ftitle, fartist, frule, flyr, ...FINE];
      out.forEach(leaveAt);
      const t = sp.now();
      retint(t);
      lyrics = t ? await sp.lyrics(t.uri) : [];
      wait(130, () => {
        renderDeck();
        tween(90, SNAP, (v) => { cover.style.opacity = String(v); });
        [ftitle, fartist, frule, flyr].forEach((elm, i) => enterAt(elm, 0, 12, 30 + i * 35));
        FINE.forEach((elm, i) => detail(elm, 200 + i * 60));
        [mPrev, mNext1, mNext2].forEach((elm, i) => enterAt(elm, -10, 0, 50 + i * 40));
        markPlaying();
      });
    }
    fartist.addEventListener("click", (e) => {
      if (!now) return;
      if (e.target.closest(".ar") && now.artistUri) openContext(now.artistUri);
      if (e.target.closest(".al") && now.albumUri) openContext(now.albumUri);
    });
    mPrev.addEventListener("click", () => sp.back());
    mNext1.addEventListener("click", () => sp.skip());
    mNext2.addEventListener("click", () => { sp.skip(); setTimeout(() => sp.skip(), 250); });

    /* ---- the right side: playlist strip ---- */
    async function renderStrip() {
      const pls = await sp.playlists();
      strip.innerHTML = pls.map((p, i) => '<div class="pl" data-i="' + i + '"><div class="pc' + (p.liked ? " liked" : "") + '">'
        + (p.liked ? '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>'
          : '<img src="' + esc(p.cover || ART) + '" alt="" onerror="this.onerror=null;this.src=\'' + ART + '\'">')
        + '</div><div class="pn">' + esc(p.name) + '</div></div>').join("");
      strip.querySelectorAll(".pl").forEach((elm) => elm.addEventListener("click", () => openContext(pls[+elm.dataset.i].uri)));
      // covers arrive afterwards (the rootlist has none)
      pls.forEach(async (p, i) => {
        if (p.liked || p.cover) return;
        const c = await sp.cover(p.uri);
        const im = strip.querySelector('.pl[data-i="' + i + '"] img');
        if (c && im) im.src = c;
      });
    }
    strip.addEventListener("wheel", (e) => {
      strip.scrollLeft += e.deltaY + e.deltaX;
      e.preventDefault();
    }, { passive: false });

    /* ---- the right side: the one list ---- */
    // mode: "now" (what's playing), "ctx" (a playlist / album you opened), "search"
    let mode = "now", rows = [], listName = "";
    const modeLabel = { now: "NOW PLAYING", ctx: "OPEN", search: "SEARCH" };
    function sorted() {
      // both directions for every key (Mario: newest and oldest added, ...): value = "key:1" ascending / "key:-1"
      const [k, dir] = sortSel.value.split(":");
      if (!k) return rows;
      const d = +dir || 1;
      return rows.slice().sort((a, b) => d * (k === "ms" ? (a.ms || 0) - (b.ms || 0)
        : String(a[k] || "").localeCompare(String(b[k] || ""), undefined, { numeric: true, sensitivity: "base" })));
    }
    function renderList() {
      $(".lmode").textContent = modeLabel[mode];
      $(".lname").textContent = listName;
      $(".lback").style.display = mode === "now" ? "none" : "";
      const list = sorted();
      rowsEl.innerHTML = list.map((r, i) => '<div class="row" data-i="' + i + '" data-uri="' + esc(r.uri) + '">'
        + '<i class="rn">' + pad(i + 1) + '</i><div class="rt">' + esc(r.title) + '</div>'
        + '<div class="ra">' + esc((r.artist || "").toUpperCase()) + '</div><div class="rd">' + esc(r.added || "") + '</div>'
        + '<div class="rl">' + (r.ms ? sp.mmss(r.ms) : r.open ? "›" : "") + '</div></div>').join("");
      rowsEl.querySelectorAll(".row").forEach((elm) => elm.addEventListener("click", () => {
        const r = list[+elm.dataset.i];
        if (r.open) openContext(r.uri);
        else sp.play(r);
      }));
      const total = list.reduce((s, r) => s + (r.ms || 0), 0);
      $(".pmark .mb").style.background = barcode(modeLabel[mode] + listName, 88, "rgba(241,241,244,.5)");
      $(".lreadout").textContent = "RL-" + pad(list.length % 100) + " · " + pad(list.length) + " TRACKS · " + clock(total);
      markPlaying(true);
    }
    function markPlaying(scroll) {
      const uri = now?.uri;
      let on = null;
      rowsEl.querySelectorAll(".row").forEach((elm) => {
        const hit = elm.dataset.uri === uri;
        elm.classList.toggle("on", hit);
        if (hit) on = elm;
      });
      if (scroll && on && mode === "now") on.scrollIntoView({ block: "center" });
    }
    async function load(m, fn) {
      const my = (load.token = (load.token || 0) + 1);
      rowsEl.style.opacity = ".35";
      try {
        const r = await fn();
        if (my !== load.token) return;
        mode = m;
        rows = r.rows;
        listName = r.name;
        sortSel.value = "";
        renderList();
        rowsEl.scrollTop = mode === "now" ? rowsEl.scrollTop : 0;
      } finally {
        if (my === load.token) rowsEl.style.opacity = "";
      }
    }
    const showNow = () => {
      const c = sp.contextUri();
      return load("now", () => (c ? sp.tracks(c) : Promise.resolve({ name: "", rows: [] })));
    };
    const openContext = (uri) => load("ctx", () => sp.tracks(uri));
    const runSearch = (text) => load("search", async () => ({ name: text.toUpperCase(), rows: await sp.search(text) }));
    sortSel.addEventListener("change", () => {
      renderList();
      rowsEl.scrollTop = 0; // a new order starts at its top (Mario)
    });
    $(".lback").addEventListener("click", () => {
      q.value = "";
      showNow();
    });

    /* ---- middle-click autoscroll (Mario; Windows-style - Linux Chromium has none): middle-click in the list or the
       strip drops an anchor; the view scrolls toward the pointer, faster the further away (dead zone around the
       anchor). Click-release = stays on until the next click; middle-held + moved = stops on release; Esc stops. ---- */
    const anchor = EF.D("ph-anchor", el,
      '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13"/><path class="up" d="M11 11l5-5 5 5"/>'
      + '<path class="dn" d="M11 21l5 5 5-5"/><path class="lf" d="M11 11l-5 5 5 5"/><path class="rt" d="M21 11l5 5-5 5"/>'
      + '<circle class="dot" cx="16" cy="16" r="2"/></svg>');
    const auto = { on: false, box: null, axis: "y", x: 0, y: 0, px: 0, py: 0, moved: false, held: false, carry: 0 };
    function zoomOf() {
      return parseFloat(el.parentNode?.style.getPropertyValue("--z")) || 1;
    }
    function stopAuto() {
      auto.on = false;
      anchor.classList.remove("on");
      el.classList.remove("autoscrolling");
    }
    el.addEventListener("mousedown", (e) => {
      if (auto.on) { // any click ends it (and doesn't also click what's under the pointer)
        e.preventDefault();
        e.stopPropagation();
        stopAuto();
        return;
      }
      if (e.button !== 1) return;
      const box = e.target.closest(".rows, .strip");
      if (!box) return;
      e.preventDefault(); // no primary-selection paste / native behaviour
      const z = zoomOf(), hr = el.getBoundingClientRect();
      Object.assign(auto, { on: true, box, axis: box.classList.contains("strip") ? "x" : "y", x: e.clientX, y: e.clientY,
        px: e.clientX, py: e.clientY, moved: false, held: true, carry: 0 });
      anchor.style.left = (e.clientX - hr.left) / z + "px";
      anchor.style.top = (e.clientY - hr.top) / z + "px";
      anchor.dataset.axis = auto.axis;
      anchor.classList.add("on");
      el.classList.add("autoscrolling");
    }, true);
    el.addEventListener("mousemove", (e) => {
      if (!auto.on) return;
      auto.px = e.clientX;
      auto.py = e.clientY;
      if (Math.hypot(e.clientX - auto.x, e.clientY - auto.y) > 12) auto.moved = true;
    });
    addEventListener("mouseup", (e) => {
      if (auto.on && e.button === 1) {
        if (auto.moved) stopAuto(); // held + dragged = stop on release; plain click = keep going
        auto.held = false;
      }
    });
    el.addEventListener("click", (e) => { if (e.button === 1) e.preventDefault(); });
    el.addEventListener("auxclick", (e) => { if (e.button === 1) e.preventDefault(); });
    addEventListener("keydown", (e) => { if (auto.on && e.key === "Escape") stopAuto(); });
    function stepAuto(dt) {
      if (!auto.on) return;
      const d = auto.axis === "y" ? auto.py - auto.y : auto.px - auto.x, dead = 12;
      anchor.classList.toggle("fwd", d > dead);
      anchor.classList.toggle("back", d < -dead);
      if (Math.abs(d) <= dead) return;
      // px per second grows faster than the distance: fine control near the anchor, fast far away
      const speed = Math.sign(d) * Math.pow(Math.abs(d) - dead, 1.35) * 4.5;
      auto.carry += (speed * dt) / 1000 / zoomOf();
      const step = Math.trunc(auto.carry);
      auto.carry -= step;
      if (auto.axis === "y") auto.box.scrollTop += step;
      else auto.box.scrollLeft += step;
    }

    /* ---- search ---- */
    let typing = 0;
    q.addEventListener("input", () => {
      clearTimeout(typing);
      const v = q.value.trim();
      typing = setTimeout(() => (v ? runSearch(v) : showNow()), 300);
    });
    q.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && q.value.trim()) {
        clearTimeout(typing);
        runSearch(q.value.trim());
      } else if (e.key === "Escape") {
        q.value = "";
        q.blur();
        showNow();
      }
      e.stopPropagation(); // keep Spotify's own shortcuts out of the search box
    });

    /* ---- the bar: transport, volume ---- */
    const playBtn = $(".ctrls .play"), shuf = $(".ctrls .shuf"), rep = $(".ctrls .rep");
    const PAUSE = '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>', PLAY = '<path d="M7 4.5v15L19.5 12z"/>';
    function renderTransport() {
      const p = sp.playing();
      playBtn.innerHTML = p ? PAUSE : PLAY;
      $(".timer .pp").classList.toggle("paused", !p);
      shuf.classList.toggle("on", !!sp.shuffle());
      rep.classList.toggle("on", sp.repeat() > 0);
      rep.classList.toggle("one", sp.repeat() === 2);
    }
    playBtn.addEventListener("click", sp.toggle);
    $(".timer").addEventListener("click", sp.toggle);
    $(".ctrls .prev").addEventListener("click", sp.back);
    $(".ctrls .next").addEventListener("click", sp.skip);
    shuf.addEventListener("click", () => { sp.toggleShuffle(); setTimeout(renderTransport, 150); });
    rep.addEventListener("click", () => { sp.toggleRepeat(); setTimeout(renderTransport, 150); });
    function paintVol() {
      vol.style.background = "linear-gradient(90deg, var(--acc-vol) " + vol.value + "%, rgba(255,255,255,.14) " + vol.value + "%)";
    }
    vol.addEventListener("input", () => {
      sp.setVolume(+vol.value / 100);
      paintVol();
    });
    let unmute = 0.7;
    $(".vol .spk").addEventListener("click", () => {
      const v = sp.volume();
      if (v > 0) {
        unmute = v;
        sp.setVolume(0);
      } else sp.setVolume(unmute);
      setTimeout(() => {
        vol.value = String(Math.round(sp.volume() * 100));
        paintVol();
      }, 120);
    });
    /* ---- Spotify Connect: the mock's devices glyph opens a small picker above it ---- */
    const devs = $(".devs");
    function renderDevices() {
      const list = sp.devices();
      $(".devs .dl").innerHTML = list.map((d, i) => '<div class="dv' + (d.active ? " on" : "") + '" data-i="' + i + '">'
        + '<i class="dt">' + esc((d.type || "").slice(0, 3).toUpperCase()) + '</i><span>' + esc(d.name) + '</span>'
        + (d.active ? '<b>ACTIVE</b>' : "") + '</div>').join("") || '<div class="dv"><span>NO DEVICES</span></div>';
      $(".devs .dl").querySelectorAll(".dv[data-i]").forEach((elm) => elm.addEventListener("click", async () => {
        await sp.transfer(list[+elm.dataset.i]);
        setTimeout(renderDevices, 600);
      }));
      $(".vol .device").classList.toggle("remote", list.some((d) => d.active && !d.local));
    }
    $(".vol .device").addEventListener("click", (e) => {
      e.stopPropagation();
      renderDevices();
      devs.classList.toggle("open");
    });
    el.addEventListener("click", (e) => {
      if (!devs.contains(e.target)) devs.classList.remove("open");
    });


    /* ---- visualizer = seek bar: the mock's soft bars, the played part brighter; click / drag seeks ---- */
    const canvas = $(".viz"), g = canvas.getContext("2d");
    const BARS = 72;
    function size() {
      const dpr = devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    let level = 1; // eases to 0 while paused, so the bars settle instead of freezing mid-wave
    function drawViz(t) {
      const w = canvas.clientWidth, h = canvas.clientHeight, gap = w / BARS, bw = gap * 0.42;
      const frac = sp.duration() ? sp.progress() / sp.duration() : 0;
      g.clearRect(0, 0, w, h);
      g.shadowColor = hsl(0, 100, 83, 0.35); // mock rgba(190,170,255,.35)
      g.shadowBlur = 8;
      for (let i = 0; i < BARS; i++) {
        let v;
        if (live()) {
          // the real spectrum, 48 bands stretched over the mock's 72 bars
          const p = (i / (BARS - 1)) * 47, i0 = Math.floor(p), k = p - i0;
          v = 0.08 + 0.92 * (audio.bars[i0] * (1 - k) + audio.bars[Math.min(47, i0 + 1)] * k);
        } else {
          const a = 0.5 + 0.5 * Math.sin(t * 0.0016 + i * 0.37);
          const b = 0.5 + 0.5 * Math.sin(t * 0.0009 * (1 + (i % 5)) + i * 1.9);
          v = 0.18 + 0.82 * (a * 0.6 + b * 0.4) * (0.25 + 0.75 * level);
        }
        const bh = v * h;
        g.fillStyle = hsl(-2, 100, 90, (i + 0.5) / BARS <= frac ? 0.55 : 0.22); // mock rgba(214,204,255,.22)
        g.fillRect(i * gap + (gap - bw) / 2, h - bh, bw, bh);
      }
    }
    let seeking = false;
    const seekAt = (e) => {
      const r = canvas.getBoundingClientRect();
      sp.seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * sp.duration());
    };
    canvas.addEventListener("pointerdown", (e) => {
      seeking = true;
      canvas.setPointerCapture(e.pointerId);
      seekAt(e);
    });
    canvas.addEventListener("pointermove", (e) => seeking && seekAt(e));
    canvas.addEventListener("pointerup", () => (seeking = false));

    /* ---- the music itself: phonograph-audio (cava on PipeWire, ws://127.0.0.1:47862) sends 48 bars 0..255 per
       frame. Auto-gain keeps quiet and loud tracks equally lively; bands drive the lights; no feed = the mock's
       synthetic wave. ---- */
    const audio = { bars: new Float32Array(48), peak: 40, at: 0, level: 0, bass: 0, mid: 0, high: 0 };
    const live = () => performance.now() - audio.at < 400;
    function listen() {
      if (!alive) return;
      let ws;
      try {
        ws = new WebSocket("ws://127.0.0.1:47862");
      } catch (e) {
        return setTimeout(listen, 3000);
      }
      ws.binaryType = "arraybuffer";
      ws.onmessage = (e) => {
        const f = new Uint8Array(e.data);
        let mx = 0;
        for (let i = 0; i < f.length; i++) mx = Math.max(mx, f[i]);
        audio.peak = Math.max(24, mx, audio.peak * 0.995);
        for (let i = 0; i < 48; i++) {
          const v = Math.min(1, (f[i] || 0) / audio.peak);
          audio.bars[i] += (v - audio.bars[i]) * (v > audio.bars[i] ? 0.6 : 0.18); // fast attack, soft release
        }
        const avg = (a, b) => {
          let t = 0;
          for (let i = a; i < b; i++) t += audio.bars[i];
          return t / (b - a);
        };
        audio.bass = avg(0, 6);
        audio.mid = avg(6, 22);
        audio.high = avg(22, 48);
        audio.level = avg(0, 48);
        audio.at = performance.now();
      };
      ws.onclose = () => alive && setTimeout(listen, 3000);
    }

    /* ---- fairy lights (Mario: the mock's background glows were meant to move): the mock's four glows, now
       drifting slowly around their spots and breathing, plus small motes rising and twinkling around the deck.
       All in the cover's colour; brighter while music plays. Drawn under everything (.bg-lights). ---- */
    const lc = $(".bg-lights"), lg = lc.getContext("2d");
    // the mock's radial glows: centre (fraction of the page), radii (fraction), alpha, hue offset / sat / light
    const GLOWS = [
      { x: 0.04, y: 0.44, rx: 0.30, ry: 0.38, a: 0.34, dh: 5, sat: 100, l: 81, px: 17, py: 23 },
      { x: 0.30, y: 0.30, rx: 0.16, ry: 0.16, a: 0.24, dh: 2, sat: 100, l: 77, px: 29, py: 19 },
      { x: 0.22, y: 0.70, rx: 0.22, ry: 0.12, a: 0.20, dh: 10, sat: 100, l: 85, px: 23, py: 31 },
      { x: 0.34, y: 0.55, rx: 0.12, ry: 0.18, a: 0.18, dh: 1, sat: 80, l: 71, px: 37, py: 27 },
    ];
    const rnd = EF.rng(7);
    let lightsPhase = 0;
    const MOTES = Array.from({ length: 34 }, () => ({
      x: rnd() * 0.5, y: rnd(), r: 0.8 + rnd() * 2.4, v: 0.006 + rnd() * 0.014, sway: rnd() * 6.28,
      tw: 0.6 + rnd() * 1.6, ph: rnd() * 6.28, band: Math.floor(rnd() * 48),
    }));
    function drawLights(t, dt) {
      // the host's zoom is an inline style - cheap to read every frame, unlike getComputedStyle
      const dpr = (devicePixelRatio || 1) * (parseFloat(el.parentNode?.style.getPropertyValue("--z")) || 1);
      const w = lc.clientWidth, h = lc.clientHeight;
      if (lc.width !== Math.round(w * dpr) || lc.height !== Math.round(h * dpr)) {
        lc.width = Math.round(w * dpr);
        lc.height = Math.round(h * dpr);
      }
      lg.setTransform(dpr, 0, 0, dpr, 0, 0);
      lg.clearRect(0, 0, w, h);
      const s = t / 1000, lift = 0.75 + 0.25 * level;
      const on = live(), bass = on ? audio.bass : 0, mid = on ? audio.mid : 0, high = on ? audio.high : 0;
      // dancing (Mario): the glows swell on the bass, the motes sway with the mids and flare on the highs
      lightsPhase += (dt / 1000) * (1 + 2.5 * mid);
      for (const [gi, gl] of GLOWS.entries()) {
        const ph = lightsPhase;
        const cx = (gl.x + 0.035 * Math.sin((ph / gl.px) * 6.28)) * w, cy = (gl.y + 0.045 * Math.sin((ph / gl.py) * 6.28 + 1.3)) * h;
        const breathe = (0.85 + 0.15 * Math.sin((s / (gl.px * 0.7)) * 6.28)) * (1 + 0.9 * bass * (gi === 0 ? 1 : 0.7));
        const swell = 1 + 0.18 * bass;
        lg.save();
        lg.translate(cx, cy);
        lg.scale(gl.rx * w * swell, gl.ry * h * swell);
        const gr = lg.createRadialGradient(0, 0, 0, 0, 0, 1);
        gr.addColorStop(0, hsl(gl.dh, gl.sat, gl.l, gl.a * breathe * lift));
        gr.addColorStop(0.7, hsl(gl.dh, gl.sat, gl.l, 0)); // "transparent 70%" in the mock
        lg.fillStyle = gr;
        lg.fillRect(-1, -1, 2, 2);
        lg.restore();
      }
      // motes read as background (Mario: they looked on top): soft out-of-focus bokeh - no hard core - and dimmed
      // where the translucent slab sits in front of them
      if (!drawLights.slab || t - drawLights.at > 500) { // a layout read; twice a second is plenty
        const fr = el.querySelector(".feat").getBoundingClientRect(), hr = el.getBoundingClientRect();
        const zz = parseFloat(el.parentNode?.style.getPropertyValue("--z")) || 1;
        drawLights.slab = { x: (fr.left - hr.left) / zz, y: (fr.top - hr.top) / zz, w: fr.width / zz, h: fr.height / zz };
        drawLights.at = t;
      }
      const slab = drawLights.slab;
      lg.globalCompositeOperation = "lighter";
      for (const m of MOTES) {
        m.y -= m.v * (dt / 1000) * (0.4 + 0.6 * level);
        if (m.y < -0.05) {
          m.y = 1.05;
          m.x = rnd() * 0.5;
        }
        const b = on ? audio.bars[m.band] : 0; // this mote's own frequency band
        const x = (m.x + (0.01 + 0.025 * mid) * Math.sin(lightsPhase * 1.6 + m.sway)) * w, y = m.y * h - 14 * b;
        const behind = x > slab.x && x < slab.x + slab.w && y > slab.y && y < slab.y + slab.h ? 0.3 : 1;
        const a = Math.min(1, (0.2 + 0.4 * (0.5 + 0.5 * Math.sin(s * m.tw + m.ph))) * lift + 0.8 * b * (0.4 + high)) * behind;
        const R = m.r * 7 * (1 + 0.5 * b);
        const gr = lg.createRadialGradient(x, y, 0, x, y, R);
        gr.addColorStop(0, hsl(4, 100, 85, 0.32 * a));
        gr.addColorStop(0.45, hsl(4, 100, 82, 0.2 * a));
        gr.addColorStop(1, hsl(4, 100, 80, 0));
        lg.fillStyle = gr;
        lg.fillRect(x - R, y - R, R * 2, R * 2);
      }
      lg.globalCompositeOperation = "source-over";
    }

    let alive = true;
    const t0 = performance.now();
    let vt = 0, last = t0;
    function frame(nowT) {
      if (!alive) return;
      const dpr = devicePixelRatio || 1;
      if (canvas.width !== Math.round(canvas.clientWidth * dpr) || canvas.height !== Math.round(canvas.clientHeight * dpr)) size();
      const playing = sp.playing();
      level += ((playing ? 1 : 0) - level) * 0.06;
      const dt = Math.min(100, nowT - last);
      vt += dt * (0.2 + 0.8 * level); // the wave slows down with the music
      last = nowT;
      stepAccent(dt);
      stepAuto(dt);
      drawLights(nowT, dt);
      timeEl.textContent = clock(sp.progress()) + " / " + clock(sp.duration());
      drawViz(vt);
      renderLyrics(false);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    const triIn = ftri.querySelector(".tri-in");
    (function amb(t) {
      if (!alive) return;
      triIn.style.opacity = String(0.82 + 0.18 * Math.sin(t * 0.0007));
      requestAnimationFrame(amb);
    })(0);

    /* ---- events ---- */
    const onSong = () => {
      songChange();
      if (mode === "now" && sp.contextUri() && sp.contextUri() !== showNow.last) {
        showNow.last = sp.contextUri();
        showNow();
      }
    };
    const onPlay = () => renderTransport();
    sp.on("songchange", onSong);
    sp.on("onplaypause", onPlay);
    const poll = setInterval(() => {
      renderTransport(); // shuffle / repeat / volume changed elsewhere
      $(".vol .device").classList.toggle("remote", sp.devices().some((d) => d.active && !d.local));
    }, 1500);

    /* ---- boot (the mock's playIn) ---- */
    el.enter = async () => {
      listen();
      vol.value = String(Math.round(sp.volume() * 100));
      paintVol();
      renderTransport();
      const t = sp.now();
      retint(t);
      lyrics = t ? await sp.lyrics(t.uri) : [];
      renderDeck();
      enterAt(fcard, 0, 22, 0);
      [ftitle, fartist, frule, flyr].forEach((elm, i) => enterAt(elm, 0, 14, 40 + i * 35));
      [mPrev, mNext1, mNext2].forEach((elm, i) => enterAt(elm, -14, 0, 80 + i * 45));
      $$(".lblrow").forEach((elm, i) => detail(elm, 300 + i * 80));
      FINE.forEach((elm, i) => detail(elm, 280 + i * 70));
      showNow.last = sp.contextUri();
      renderStrip();
      showNow();
    };
    el.destroy = () => {
      alive = false;
      clearInterval(poll);
      sp.off("songchange", onSong);
      sp.off("onplaypause", onPlay);
    };
    return el;
  }

  EF.livePhonograph = phonograph;
})();
