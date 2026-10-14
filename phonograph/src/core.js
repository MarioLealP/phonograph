// EF core — shared tween engine, noise, contours, canvas helpers.
// Everything hangs off window.EF. Motion is rAF + performance.now(); no CSS transitions for main motion.
(() => {
  "use strict";
  const EF = (window.EF = window.EF || {});

  // ---- easing ----
  function bez(x1, y1, x2, y2) {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sx = (u) => ((ax * u + bx) * u + cx) * u;
    const sy = (u) => ((ay * u + by) * u + cy) * u;
    return (t) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      let lo = 0;
      let hi = 1;
      let u = t;
      for (let i = 0; i < 24; i++) {
        u = (lo + hi) / 2;
        if (sx(u) < t) lo = u;
        else hi = u;
      }
      return sy(u);
    };
  }
  EF.SNAP = bez(1, 0, 0.7, 1);
  EF.SETTLE = bez(0.16, 1, 0.3, 1);
  EF.SOFT = bez(0.4, 0, 0.2, 1);
  EF.LIN = (t) => t;

  // ---- maths ----
  EF.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  EF.lerp = (a, b, t) => a + (b - a) * t;
  EF.P = (e, start, dur, ease = EF.LIN) => ease(EF.clamp((e - start) / dur));
  EF.f4 = (v) => (Math.abs(v) < 1e-5 ? 0 : +v.toFixed(4));
  EF.esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---- DOM ----
  EF.D = (cls, parent, html) => {
    const e = document.createElement("div");
    e.className = cls;
    if (html) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  };
  EF.clear = (els, props) => els.forEach((el) => el && props.forEach((p) => (el.style[p] = "")));
  EF.sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---- tween (rAF + performance.now(); ?slow=N stretches every tween N x for mid-motion captures) ----
  const SLOW = Math.max(1, +new URLSearchParams(location.search).get("slow") || 1);
  EF.SLOW = SLOW;
  function tick(f) {
    let done = false;
    const g = () => {
      if (done) return;
      done = true;
      f();
    };
    requestAnimationFrame(g);
    setTimeout(g, 24);
  }
  // fn(elapsedMs) runs once synchronously at 0, then every frame until ms; alive() lets a newer tween take over
  EF.tween = (ms, fn, alive) =>
    new Promise((res) => {
      const t0 = performance.now();
      fn(0);
      const step = () => {
        if (alive && !alive()) return res(false);
        const e = Math.min(ms, (performance.now() - t0) / SLOW);
        fn(e);
        if (e < ms) tick(step);
        else res(true);
      };
      tick(step);
    });
  EF.claim = (o, k) => {
    o[k] = (o[k] || 0) + 1;
    const v = o[k];
    return () => o[k] === v;
  };

  // ---- noise / contours ----
  EF.rng = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  EF.noise2 = (seed) => {
    const h = (x, y) => {
      const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
      return s - Math.floor(s);
    };
    const sm = (t) => t * t * (3 - 2 * t);
    const n = (x, y) => {
      const ix = Math.floor(x);
      const iy = Math.floor(y);
      const fx = sm(x - ix);
      const fy = sm(y - iy);
      const a = h(ix, iy);
      const b = h(ix + 1, iy);
      const c = h(ix, iy + 1);
      const d = h(ix + 1, iy + 1);
      return EF.lerp(EF.lerp(a, b, fx), EF.lerp(c, d, fx), fy);
    };
    return (x, y, oct = 4) => {
      let v = 0;
      let amp = 0.5;
      let f = 1;
      for (let i = 0; i < oct; i++) {
        v += amp * n(x * f + i * 17.3, y * f - i * 9.1);
        f *= 2.03;
        amp *= 0.5;
      }
      return v;
    };
  };
  const MS = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [2, 1]], [[0, 2]], [[3, 0]], [[3, 0]], [[0, 2]], [[3, 2], [0, 1]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];
  // marching squares over a sampled field; cb(x1,y1,x2,y2,level,gx,gy)
  EF.contours = (w, h, cell, field, step, cb) => {
    const gw = Math.ceil(w / cell) + 1;
    const gh = Math.ceil(h / cell) + 1;
    const v = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) v[j * gw + i] = field(i * cell, j * cell);
    const pt = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let j = 0; j < gh - 1; j++)
      for (let i = 0; i < gw - 1; i++) {
        const a = v[j * gw + i];
        const b = v[j * gw + i + 1];
        const c = v[(j + 1) * gw + i + 1];
        const d = v[(j + 1) * gw + i];
        const lo = Math.min(a, b, c, d);
        const hi = Math.max(a, b, c, d);
        const x0 = i * cell;
        const y0 = j * cell;
        const gx = (b - a + c - d) / 2;
        const gy = (d - a + c - b) / 2;
        for (let k = Math.ceil(lo / step); k * step <= hi; k++) {
          const L = k * step;
          const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
          const segs = MS[idx];
          if (!segs.length) continue;
          pt[0] = x0 + (cell * (L - a)) / (b - a || 1e-9);
          pt[1] = y0;
          pt[2] = x0 + cell;
          pt[3] = y0 + (cell * (L - b)) / (c - b || 1e-9);
          pt[4] = x0 + (cell * (L - d)) / (c - d || 1e-9);
          pt[5] = y0 + cell;
          pt[6] = x0;
          pt[7] = y0 + (cell * (L - a)) / (d - a || 1e-9);
          for (const [e1, e2] of segs) cb(pt[e1 * 2], pt[e1 * 2 + 1], pt[e2 * 2], pt[e2 * 2 + 1], k, gx, gy);
        }
      }
  };

  // ---- canvas ----
  EF.canvas = (w, h) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  };
  EF.grainTexture = (a) => {
    const c = EF.canvas(220, 220);
    const g = c.getContext("2d");
    const d = g.createImageData(220, 220);
    const r = EF.rng(99);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = r() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = a;
    }
    g.putImageData(d, 0, 0);
    return c.toDataURL();
  };
  // faint topographic texture (data URL)
  EF.topoTexture = (color = "rgba(90,84,0,0.3)", seed = 23, w = 260, h = 180) => {
    const c = EF.canvas(w, h);
    const g = c.getContext("2d");
    const N = EF.noise2(seed);
    const p = new Path2D();
    const k = w / 260;
    EF.contours(
      w,
      h,
      3,
      (x, y) => N(x / (120 * k), y / (90 * k), 3) + 0.25 * Math.exp(-(((x - w * 0.58) / (60 * k)) ** 2) - ((y - h / 2) / (50 * k)) ** 2),
      0.045,
      (x1, y1, x2, y2) => {
        p.moveTo(x1, y1);
        p.lineTo(x2, y2);
      },
    );
    g.strokeStyle = color;
    g.lineWidth = 1.1;
    g.stroke(p);
    return c.toDataURL();
  };
})();
