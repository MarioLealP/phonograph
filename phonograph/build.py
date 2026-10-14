#!/usr/bin/env python3
"""Bundle the phonograph into a Spicetify extension: ../Extensions/phonograph.js.

An extension, not a custom app: with a custom app, Spicetify 2.45.3 renders its nav links before React is ready on
Spotify 1.3.4 and Spotify's UI crashes on some starts ("Something went wrong"). The extension waits until the
client is ready and mounts the phonograph as a full-window layer over Spotify's (hidden) UI.

The mock's files stay as copied (src/core.js, src/phonograph.css); at build time the CSS's Windows fonts become our
Linux ones (Consolas -> JetBrains Mono, Segoe UI -> Inter) and the SVG assets are inlined as data URIs.
"""

import base64
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "src"
OUT = HERE.parent / "Extensions" / "phonograph.js"


def data_uri(name: str) -> str:
    return "data:image/svg+xml;base64," + base64.b64encode((HERE / "assets" / name).read_bytes()).decode()


css = (SRC / "phonograph.css").read_text() + "\n" + (SRC / "live.css").read_text()
css = (
    css.replace("Consolas, monospace", '"JetBrains Mono", monospace')
    .replace('"Segoe UI", system-ui, sans-serif', "Inter, system-ui, sans-serif")
    .replace("url(../assets/topo-floor-strip.svg)", f'url("{data_uri("topo-floor-strip.svg")}")')
)

js = "\n".join((SRC / f).read_text() for f in ("core.js", "spotify.js", "app.js"))

host = """
// ---- Spicetify extension entry: once the client is ready, mount the phonograph over the whole window ----
(function mount() {
  const S = window.Spicetify;
  if (!S?.Player?.data || !S?.Platform?.PlayerAPI || !S?.GraphQL?.Definitions || !S?.CosmosAsync || !document.body) {
    return setTimeout(mount, 250);
  }
  if (document.querySelector(".ph-host")) return;
  const PH_ART = %s;
  const css = document.createElement("style");
  css.id = "ph-css";
  css.textContent = %s;
  document.head.appendChild(css);
  const host = document.createElement("div");
  host.className = "ph-host";
  const fit = () => host.style.setProperty("--z", String(Math.min(innerWidth / 1920, innerHeight / 1080)));
  fit();
  addEventListener("resize", fit);
  document.body.appendChild(host);
  const ph = EF.livePhonograph(PH_ART);
  host.appendChild(ph);
  ph.enter();
})();
""" % (json.dumps(data_uri("ds-topo-card.svg")), json.dumps(css))

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("// built by phonograph/build.py - edit phonograph/src, not this file\n" + js + host)
print(f"{OUT} {OUT.stat().st_size // 1024} KiB")
